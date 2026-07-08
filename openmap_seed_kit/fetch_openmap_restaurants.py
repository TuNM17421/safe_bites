#!/usr/bin/env python3
"""
Fetch restaurant POIs from OpenMap.vn Nearby API and write a discovery CSV.
Usage:
  export OPENMAP_API_KEY="your_key_here"
  python fetch_openmap_restaurants.py --out restaurants_openmap_live.csv

Notes:
- Do not hardcode API keys.
- This creates a discovery seed, not verified menu/allergy data.
- Review OpenMap.vn terms/plan before production use (DB storage + in-app display + caching).
- Field names below were verified against a live Nearby response (Hoàn Kiếm, 2026-07).
"""
import argparse, csv, os, time, requests
from datetime import date

BASE_URL = "https://mapapis.openmap.vn/v1/nearby"
SOURCE_URL = "https://docs.openmap.vn/en/docs/rest-apis/nearby/"

# Seed points for Hoàn Kiếm, Ba Đình, Tây Hồ.
# Live test confirmed boundary.circle.radius is in KILOMETRES (Pelias-style): radius=1
# returned a ~2.2km bbox. 2km comfortably covers a district around each point; overlapping
# circles are de-duplicated below. `size` caps results per call (max effective ~50).
SEED_POINTS = [
    {"area": "Hoàn Kiếm", "lat": 21.0265361, "lon": 105.852484, "radius": 2},
    {"area": "Hoàn Kiếm", "lat": 21.0338000, "lon": 105.850300, "radius": 2},
    {"area": "Ba Đình", "lat": 21.0358000, "lon": 105.834200, "radius": 2},
    {"area": "Ba Đình", "lat": 21.0430000, "lon": 105.823000, "radius": 2},
    {"area": "Tây Hồ", "lat": 21.0603000, "lon": 105.817200, "radius": 2},
    {"area": "Tây Hồ", "lat": 21.0759510, "lon": 105.812662, "radius": 2},
]

# CSV columns map 1:1 to the phase-14 OpenMap importer -> Prisma Restaurant mapping.
HEADERS = [
    'restaurant_id', 'external_source', 'external_id', 'sid',
    'canonical_name', 'name_vi', 'name_en',
    'housenumber', 'street', 'short_address', 'full_address',
    'area', 'ward', 'city', 'country',
    'lat', 'lon', 'categories', 'cuisine_normalized',
    'phone', 'website', 'opening_hours', 'zipcode',
    'source_url', 'source_observed_at',
    'discovery_status', 'menu_status', 'verification_status',
    'confidence_discovery', 'data_quality_notes',
]

# Generic category tokens carry no cuisine signal -> dropped from cuisine_normalized.
CATEGORY_STOPWORDS = {"restaurant", "food", "poi", "point_of_interest"}


def normalize_categories(cats):
    """OpenMap 'category' is a multi-value array mixing snake_case slugs and Vietnamese
    display tokens (e.g. ['vietnamese_restaurant','pho_restaurant','Phở','restaurant']).
    Return (raw_join, cuisine_normalized): the raw join for audit, and a de-duplicated
    cuisine list with generic tokens dropped and '_restaurant'/'_bar'/... suffixes stripped.
    """
    if not cats:
        return '', ''
    if isinstance(cats, str):
        cats = [cats]
    raw = ','.join(str(c).strip() for c in cats if str(c).strip())
    norm = []
    for c in cats:
        t = str(c).strip().lower().replace(' ', '_')
        for suf in ('_restaurant', '_bar', '_shop', '_place', '_cuisine'):
            if t.endswith(suf):
                t = t[: -len(suf)]
        if t and t not in CATEGORY_STOPWORDS and t not in norm:
            norm.append(t)
    return raw, ','.join(norm)


def feature_to_row(feature, fallback_area):
    props = feature.get('properties', {}) or {}
    geom = feature.get('geometry', {}) or {}
    coords = geom.get('coordinates') or ['', '']
    lon, lat = coords[0], coords[1]

    sid = props.get('sid', '') or ''
    external_id = props.get('id', '') or ''
    name = props.get('name', '') or ''

    # OpenMap returns a clean Vietnamese administrative hierarchy -- prefer it directly
    # (OSM tags are far sparser; the OSM script has to infer district from a bbox).
    county = props.get('county', '') or ''            # e.g. "quận Hoàn Kiếm"
    area = county.replace('quận ', '').replace('Quận ', '').strip() or fallback_area
    ward = (props.get('locality', '') or '').replace('phường ', '').replace('Phường ', '').strip()
    region = props.get('region', '') or ''            # e.g. "thành phố Hà Nội"
    city = (region.replace('thành phố ', '').replace('Thành phố ', '')
                  .replace('tỉnh ', '').replace('Tỉnh ', '').strip())

    categories_raw, cuisine_norm = normalize_categories(props.get('category', []))

    # Stable short id (sid) is the internal key; long opaque id kept as external_id.
    key = sid or external_id
    return [
        f"rest_openmap_{key}" if key else '',
        'openmapvn',
        external_id,
        sid,
        name,
        name,
        '',
        props.get('housenumber', '') or '',
        props.get('street', '') or '',
        props.get('short_address', '') or '',
        props.get('label', '') or '',
        area,
        ward,
        city or 'Hà Nội',
        props.get('country', '') or 'Việt Nam',
        lat,
        lon,
        categories_raw,
        cuisine_norm,
        props.get('phone', '') or '',
        props.get('website', '') or '',
        props.get('opening_hours', '') or '',
        props.get('zipcode', '') or '',
        SOURCE_URL,
        str(date.today()),
        'seeded_from_openmap_live',
        'not_observed',
        'unverified',
        '0.70',
        'Live pull from OpenMap Nearby API. Discovery only -- not menu/allergy verified.',
    ]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', default='restaurants_openmap_live.csv')
    parser.add_argument('--size', type=int, default=50)
    parser.add_argument('--categories', default='restaurant',
                        help="OpenMap category filter. 'restaurant' matches the restaurant "
                             "family. Broaden (cafe/fast_food/coffee_shop) only after checking "
                             "the OpenMap category taxonomy for the correct filter values.")
    parser.add_argument('--sleep', type=float, default=0.2)
    args = parser.parse_args()

    api_key = os.getenv('OPENMAP_API_KEY')
    if not api_key:
        raise SystemExit('Missing OPENMAP_API_KEY environment variable.')

    seen = set()
    rows = []
    for p in SEED_POINTS:
        params = {
            'apikey': api_key,
            'size': args.size,
            'categories': args.categories,
            'point.lon': p['lon'],
            'point.lat': p['lat'],
            'boundary.circle.radius': p['radius'],
        }
        r = requests.get(BASE_URL, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        for feature in data.get('features', []):
            props = feature.get('properties', {}) or {}
            # De-dup within the pull by stable sid, falling back to id/label/name.
            dedup_key = props.get('sid') or props.get('id') or props.get('label') or props.get('name')
            if not dedup_key or dedup_key in seen:
                continue
            seen.add(dedup_key)
            rows.append(feature_to_row(feature, p['area']))
        time.sleep(args.sleep)

    with open(args.out, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f)
        w.writerow(HEADERS)
        w.writerows(rows)
    print(f'Wrote {len(rows)} rows to {args.out}')


if __name__ == '__main__':
    main()
