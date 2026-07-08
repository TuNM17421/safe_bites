#!/usr/bin/env python3
"""
Fetch food POIs from OpenStreetMap Overpass API for Hanoi pilot areas.

Target areas:
- Hoàn Kiếm
- Ba Đình
- Tây Hồ

This script does NOT need an API key. It uses public Overpass instances, so be polite:
- identify your app with a User-Agent
- keep queries small
- cache raw outputs
- do not hammer public servers

Usage:
    pip install requests
    python fetch_osm_overpass_restaurants.py --out outputs/restaurants_osm_raw.csv --limit 100
"""

import argparse
import csv
import datetime as dt
import json
import sys
import time
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import requests

# Windows consoles default to cp1252; force UTF-8 so Vietnamese area names in print() don't crash.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# Official OSMF-run Overpass instance is the only endpoint used by default.
OFFICIAL_ENDPOINT = "https://overpass-api.de/api/interpreter"
# Community mirror: opt-in via --mirror only. It has its own ToS/privacy and would
# receive your contact email (in the User-Agent), so we never fall back to it silently.
COMMUNITY_MIRROR = "https://overpass.private.coffee/api/interpreter"

AREAS = [
    # name, south, west, north, east
    ("Hoàn Kiếm", 21.0180, 105.8400, 21.0415, 105.8725),
    ("Ba Đình", 21.0270, 105.8030, 21.0535, 105.8420),
    ("Tây Hồ", 21.0500, 105.7900, 21.0905, 105.8425),
]

CSV_FIELDS = [
    "restaurant_id", "external_source", "osm_type", "osm_id", "canonical_name", "name_vi", "name_en",
    "amenity", "cuisine_raw", "cuisine_normalized", "brand", "operator", "full_address", "street",
    "housenumber", "ward", "district", "city", "country", "lat", "lon", "phone", "website",
    "website_menu", "opening_hours", "takeaway", "delivery", "diet_vegetarian", "diet_vegan", "diet_halal",
    "diet_kosher", "outdoor_seating", "wheelchair", "source_url", "source_observed_at", "data_license",
    "attribution_required", "discovery_confidence", "menu_status", "verification_status", "review_status",
    "raw_tags_json", "notes",
]


def build_query(area: Tuple[str, float, float, float, float]) -> str:
    name, south, west, north, east = area
    bbox = f"({south},{west},{north},{east})"
    return f"""[out:json][timeout:60];
(
  node["amenity"~"restaurant|cafe|fast_food"]["name"]{bbox};
  way["amenity"~"restaurant|cafe|fast_food"]["name"]{bbox};
  relation["amenity"~"restaurant|cafe|fast_food"]["name"]{bbox};
);
out center tags;"""


def normalize_cuisine(raw: str) -> str:
    if not raw:
        return ""
    return raw.replace(";", ",").replace(" ", "_").lower()


def compose_address(tags: Dict[str, str]) -> str:
    parts = []
    # House number + street form one line, space-joined ("21 Phố Hàng Gai"), matching
    # the schema example; only the remaining components are comma-separated.
    house = (tags.get("addr:housenumber") or "").strip()
    street = (tags.get("addr:street") or "").strip()
    line1 = " ".join(p for p in (house, street) if p)
    if line1:
        parts.append(line1)
    for key in ["addr:suburb", "addr:district", "addr:city"]:
        val = tags.get(key)
        if val and val not in parts:
            parts.append(val)
    return ", ".join(parts)


def infer_district(lat: float, lon: float) -> str:
    for name, south, west, north, east in AREAS:
        if south <= lat <= north and west <= lon <= east:
            return name
    return "Hà Nội"


def element_to_row(el: Dict, observed_at: str) -> Dict[str, str]:
    tags = el.get("tags", {}) or {}
    lat = el.get("lat") or (el.get("center") or {}).get("lat")
    lon = el.get("lon") or (el.get("center") or {}).get("lon")
    if lat is None or lon is None:
        raise ValueError(f"Element has no coordinate: {el.get('type')}/{el.get('id')}")
    osm_type = el.get("type", "")
    osm_id = str(el.get("id", ""))
    name = tags.get("name") or tags.get("name:vi") or tags.get("name:en") or ""
    amenity = tags.get("amenity", "")
    website_menu = tags.get("website:menu", "")
    menu_status = "menu_url_available" if website_menu else "not_observed"
    return {
        "restaurant_id": f"rest_osm_{osm_type}_{osm_id}",
        "external_source": "openstreetmap",
        "osm_type": osm_type,
        "osm_id": osm_id,
        "canonical_name": name,
        "name_vi": tags.get("name:vi", name),
        "name_en": tags.get("name:en", ""),
        "amenity": amenity,
        "cuisine_raw": tags.get("cuisine", ""),
        "cuisine_normalized": normalize_cuisine(tags.get("cuisine", "")),
        "brand": tags.get("brand", ""),
        "operator": tags.get("operator", ""),
        "full_address": compose_address(tags),
        "street": tags.get("addr:street", ""),
        "housenumber": tags.get("addr:housenumber", ""),
        "ward": tags.get("addr:suburb", tags.get("addr:ward", "")),
        "district": tags.get("addr:district", infer_district(float(lat), float(lon))),
        "city": tags.get("addr:city", "Hà Nội"),
        "country": tags.get("addr:country", "Vietnam"),
        "lat": f"{float(lat):.7f}",
        "lon": f"{float(lon):.7f}",
        "phone": tags.get("phone", tags.get("contact:phone", "")),
        "website": tags.get("website", tags.get("contact:website", "")),
        "website_menu": website_menu,
        "opening_hours": tags.get("opening_hours", ""),
        "takeaway": tags.get("takeaway", ""),
        "delivery": tags.get("delivery", ""),
        "diet_vegetarian": tags.get("diet:vegetarian", ""),
        "diet_vegan": tags.get("diet:vegan", ""),
        "diet_halal": tags.get("diet:halal", ""),
        "diet_kosher": tags.get("diet:kosher", ""),
        "outdoor_seating": tags.get("outdoor_seating", ""),
        "wheelchair": tags.get("wheelchair", ""),
        "source_url": f"https://www.openstreetmap.org/{osm_type}/{osm_id}",
        "source_observed_at": observed_at,
        "data_license": "ODbL-1.0",
        "attribution_required": "true",
        "discovery_confidence": "0.85" if amenity == "restaurant" else "0.75",
        "menu_status": menu_status,
        "verification_status": "unverified",
        "review_status": "needs_review",
        "raw_tags_json": json.dumps(tags, ensure_ascii=False, sort_keys=True),
        "notes": "",
    }


class OverpassSoftError(RuntimeError):
    """HTTP 200 but Overpass returned a 'remark' error (timeout/rate-limit) and no data."""


# Transient statuses worth retrying rather than aborting on.
RETRYABLE_STATUS = {429, 502, 503, 504}


def fetch_query(
    query: str,
    user_agent: str,
    endpoints: List[str] = None,
    max_retries: int = 3,
) -> Dict:
    if endpoints is None:
        endpoints = [OFFICIAL_ENDPOINT]
    headers = {"User-Agent": user_agent}
    last_error = None
    for endpoint in endpoints:
        for attempt in range(1, max_retries + 1):
            try:
                # allow_redirects=False: the official endpoint answers 200 directly; a
                # redirect would mean an unexpected host, which we do not want to follow.
                r = requests.post(
                    endpoint, data={"data": query}, headers=headers,
                    timeout=90, allow_redirects=False,
                )
                if r.status_code in RETRYABLE_STATUS:
                    raise RuntimeError(f"HTTP {r.status_code} (transient) from {endpoint}")
                r.raise_for_status()
                data = r.json()
                # Overpass soft-failure: 200 OK with a 'remark' and no elements. Treat as
                # an error so an area does not silently seed zero rows as if it succeeded.
                remark = data.get("remark")
                if remark and not data.get("elements"):
                    raise OverpassSoftError(f"Overpass remark: {remark}")
                return data
            except Exception as exc:
                last_error = exc
                if attempt < max_retries:
                    backoff = min(2 ** attempt, 30)
                    print(f"  {endpoint} attempt {attempt}/{max_retries} failed: {exc}; retry in {backoff}s")
                    time.sleep(backoff)
        print(f"  Giving up on {endpoint} after {max_retries} attempts")
    raise RuntimeError(f"All Overpass endpoints failed: {last_error}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="outputs/restaurants_osm_raw.csv")
    parser.add_argument("--raw-dir", default="outputs/raw_overpass")
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--user-agent", default="dietary-travel-app-seed/0.1 (contact: replace-with-your-email)")
    parser.add_argument(
        "--mirror",
        action="store_true",
        help="Also try the community mirror (overpass.private.coffee) if the official endpoint fails. "
             "Off by default: the mirror has its own ToS/privacy and receives your User-Agent contact.",
    )
    args = parser.parse_args()

    if "replace-with-your-email" in args.user_agent:
        parser.error(
            "Pass a real --user-agent with a contact, e.g. "
            "'my-app/0.1 (contact: you@example.com)'. Overpass acceptable-use requires identifying your client."
        )

    endpoints = [OFFICIAL_ENDPOINT]
    if args.mirror:
        endpoints.append(COMMUNITY_MIRROR)

    observed_at = dt.date.today().isoformat()
    out_path = Path(args.out)
    raw_dir = Path(args.raw_dir)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    raw_dir.mkdir(parents=True, exist_ok=True)

    rows: Dict[str, Dict[str, str]] = {}
    failed_area = None
    for area in AREAS:
        area_name = area[0]
        query = build_query(area)
        print(f"Fetching {area_name}...")
        try:
            data = fetch_query(query, args.user_agent, endpoints)
        except Exception as exc:
            # Do not discard areas already fetched: stop, then write what we have.
            failed_area = area_name
            print(f"ERROR fetching {area_name}: {exc}")
            break
        (raw_dir / f"{area_name.replace(' ', '_')}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        for el in data.get("elements", []):
            try:
                row = element_to_row(el, observed_at)
            except Exception as exc:
                print(f"Skipping element: {exc}")
                continue
            key = row["restaurant_id"]
            rows[key] = row
        time.sleep(2)

    sorted_rows = sorted(rows.values(), key=lambda r: (r["district"], r["amenity"], r["canonical_name"]))
    if args.limit and args.limit > 0:
        sorted_rows = sorted_rows[: args.limit]

    # utf-8-sig writes a BOM so Excel on Windows detects UTF-8 and does not mojibake
    # Vietnamese names during the manual review workflow.
    with out_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(sorted_rows)

    if failed_area:
        print(f"Wrote {len(sorted_rows)} PARTIAL rows to {out_path} (stopped at '{failed_area}').")
        sys.exit(1)
    print(f"Wrote {len(sorted_rows)} rows to {out_path}")


if __name__ == "__main__":
    main()
