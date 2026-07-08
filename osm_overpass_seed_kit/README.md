# OSM / Overpass Seed Kit for Dietary Travel Food App

Generated: 2026-07-08

## Purpose

This package gives you a clean starting point to seed restaurant POIs in Hanoi from OpenStreetMap/Overpass, then review them before importing into the app database.

Pilot scope:

- City: Hà Nội
- Areas: Hoàn Kiếm, Ba Đình, Tây Hồ
- Goal: 100 restaurants/cafes/fast-food POIs
- Profiles: allergy, halal, Hindu/no beef, weight-loss diet, picky eater

## Why OSM / Overpass

- OpenStreetMap data can be used commercially under ODbL, with attribution and share-alike obligations.
- Overpass API can query OSM data without an API key.
- OSM POIs can include `amenity=restaurant`, `amenity=cafe`, `amenity=fast_food`, `cuisine=*`, `website=*`, `website:menu=*`, and `diet:*` tags.

## Important limitations

OSM is good for restaurant discovery, not allergy verification.

It may provide:

- restaurant/cafe/fast-food name
- coordinates
- cuisine tag
- website or phone in some cases
- official menu URL via `website:menu=*` in rare cases
- vegetarian/vegan/halal hints via `diet:*` in rare cases

It usually does NOT provide:

- full menu
- dish ingredients
- allergen data
- cross-contact risk
- halal certification details
- Hindu-specific constraints
- calorie/macros

So use OSM as the **restaurant discovery layer**, not the trust layer. Because apparently the universe still refuses to hand us a perfect allergy-safe restaurant database for free.

## Files

```text
schemas/restaurants_schema.csv
schemas/dishes_schema.csv
schemas/ingredients_schema.csv
schemas/dish_ingredients_schema.csv
schemas/menu_items_schema.csv
schemas/risk_rules_schema.csv
schemas/profiles.csv
queries/01_hanoi_food_poi_bbox.overpassql
queries/02_hanoi_food_with_menu_url.overpassql
queries/03_hanoi_food_with_diet_tags.overpassql
scripts/fetch_osm_overpass_restaurants.py
outputs/restaurants_osm_raw.csv
```

`outputs/restaurants_osm_raw.csv` currently contains headers only. Run the script to fetch live rows.

## How to fetch restaurants

```bash
cd osm_overpass_seed_kit
pip install requests
python scripts/fetch_osm_overpass_restaurants.py --out outputs/restaurants_osm_raw.csv --limit 100 --user-agent "your-app-name/0.1 (contact: you@example.com)"
```

Notes:

- `--user-agent` is required with a real contact; the script refuses to run with the placeholder (Overpass acceptable-use).
- Only the official endpoint (`overpass-api.de`) is used by default, with retry + backoff. Add `--mirror` to opt in to the community mirror `overpass.private.coffee` as a fallback (it has its own ToS/privacy).
- The CSV is written as UTF-8 with BOM (`utf-8-sig`) so Excel on Windows shows Vietnamese names correctly.
- If an area fails after retries, rows already fetched are still written (partial) and the script exits non-zero.

## Recommended review workflow

1. Run script and export 100 rows.
2. Remove duplicates and non-food places.
3. Mark `review_status=approved` for usable restaurants.
4. For rows with `website_menu`, add them to the menu-observed queue.
5. For high-priority restaurants, manually contact the restaurant and move `verification_status` from `unverified` to `restaurant_confirmed`.
6. Never infer allergy safety from OSM alone.

## Attribution

When using OSM-derived data publicly, include attribution such as:

```text
© OpenStreetMap contributors
```

And maintain license/source metadata in your database.

## Source references

- OSM license FAQ: https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ
- OSM license use cases: https://wiki.openstreetmap.org/wiki/License/Use_Cases
- Overpass API docs: https://wiki.openstreetmap.org/wiki/Overpass_API
- amenity=restaurant: https://wiki.openstreetmap.org/wiki/Tag:amenity%3Drestaurant
- amenity=fast_food: https://wiki.openstreetmap.org/wiki/Tag:amenity%3Dfast_food
- website:menu: https://wiki.openstreetmap.org/wiki/Key:website:menu
- diet:vegetarian: https://wiki.openstreetmap.org/wiki/Key:diet:vegetarian
```
