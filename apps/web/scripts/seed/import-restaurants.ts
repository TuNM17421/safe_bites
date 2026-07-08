import { Prisma } from '@prisma/client';
import { field, orNull, requireColumns, splitList, toNumber, type CsvRow } from './csv';
import { normalizeReview, normalizeSource } from './enums';
import { newCounts, type Counts } from './types';

function parseDate(v: string | undefined): Date | null {
  const s = (v ?? '').trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseJson(v: string | undefined): Prisma.InputJsonValue | typeof Prisma.DbNull {
  const s = (v ?? '').trim();
  if (!s) return Prisma.DbNull;
  try {
    return JSON.parse(s) as Prisma.InputJsonValue;
  } catch {
    return Prisma.DbNull;
  }
}

// OSM restaurants CSV (43-col schema) -> Restaurant. Discovery-only: verificationStatus
// is FORCED to "unverified"; license/attribution preserved (§6.6). Header-only file is
// handled by the orchestrator (0 rows -> skipped) before this runs.
export async function importRestaurants(db: Prisma.TransactionClient, rows: CsvRow[]): Promise<Counts> {
  requireColumns(rows, ['restaurant_id', 'canonical_name', 'city']);
  const counts = newCounts();
  for (const row of rows) {
    counts.read++;
    const id = field(row, 'restaurant_id');
    if (!id) {
      counts.skipped++;
      continue;
    }
    const data = {
      externalSource: normalizeSource(field(row, 'external_source')),
      osmType: orNull(row['osm_type']),
      osmId: orNull(row['osm_id']),
      externalId: orNull(row['external_id']),
      canonicalName: field(row, 'canonical_name'),
      nameVi: orNull(row['name_vi']),
      nameEn: orNull(row['name_en']),
      amenity: orNull(row['amenity']),
      cuisineRaw: orNull(row['cuisine_raw']),
      cuisineNormalized: splitList(row['cuisine_normalized']),
      fullAddress: orNull(row['full_address']),
      street: orNull(row['street']),
      housenumber: orNull(row['housenumber']),
      ward: orNull(row['ward']),
      district: orNull(row['district']),
      city: field(row, 'city'),
      country: field(row, 'country') || 'Vietnam',
      lat: toNumber(row['lat']),
      lon: toNumber(row['lon']),
      phone: orNull(row['phone']),
      website: orNull(row['website']),
      websiteMenu: orNull(row['website_menu']),
      openingHours: orNull(row['opening_hours']),
      sourceUrl: orNull(row['source_url']),
      sourceObservedAt: parseDate(row['source_observed_at']),
      dataLicense: orNull(row['data_license']),
      attributionRequired: field(row, 'attribution_required') === 'true',
      discoveryConfidence: toNumber(row['discovery_confidence']),
      menuStatus: field(row, 'menu_status') || 'not_observed',
      verificationStatus: 'unverified',
      reviewStatus: normalizeReview(field(row, 'review_status')),
      rawTagsJson: parseJson(row['raw_tags_json']),
      notes: orNull(row['notes']),
    };
    const exists = await db.restaurant.findUnique({ where: { id } });
    await db.restaurant.upsert({ where: { id }, update: data, create: { id, ...data } });
    if (exists) counts.updated++;
    else counts.inserted++;
  }
  return counts;
}
