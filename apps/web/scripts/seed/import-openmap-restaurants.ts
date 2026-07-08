import { Prisma, ReviewStatus, SourceType } from '@prisma/client';
import { field, orNull, requireColumns, splitList, toNumber, type CsvRow } from './csv';
import { newCounts, type Counts } from './types';

// OpenMap.vn Nearby POIs (30-col CSV) -> Restaurant. ADR-007: a second discovery source
// feeding the SAME table, tagged externalSource=openmapvn / externalId=sid. DISCOVERY-ONLY:
// verificationStatus/reviewStatus/menuStatus are FORCED (never read from the CSV), and
// license/attribution are stamped so a Phase-2 display can honor OpenMap's terms (§6.6, R14).

function parseDate(value: string | undefined): Date | null {
  const s = (value ?? '').trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// The fetch script already strips Vietnamese admin prefixes; do it again defensively so a
// raw/older CSV ("quận Hoàn Kiếm") still lands a clean value.
function stripAdminPrefix(value: string): string {
  return value.replace(/^(thành phố|thị xã|thị trấn|quận|huyện|phường|tỉnh|xã)\s+/i, '').trim();
}
function stripAdminOrNull(value: string | undefined): string | null {
  const v = orNull(value);
  return v === null ? null : stripAdminPrefix(v);
}

/** Pure mapper (DB-free, unit-tested): one CSV row -> a Restaurant create input. */
export function mapOpenmapRow(row: CsvRow): Prisma.RestaurantUncheckedCreateInput {
  const source = field(row, 'external_source');
  if (source !== 'openmapvn') {
    throw new Error(`Unexpected external_source "${source}" (expected "openmapvn")`);
  }
  const id = field(row, 'restaurant_id');
  if (!id) throw new Error('Missing restaurant_id');

  const rawTagsJson: Prisma.InputJsonObject = {
    external_id: orNull(row['external_id']),
    sid: orNull(row['sid']),
    short_address: orNull(row['short_address']),
    zipcode: orNull(row['zipcode']),
    categories: orNull(row['categories']),
    discovery_status: orNull(row['discovery_status']),
  };

  return {
    id,
    externalSource: SourceType.openmapvn,
    osmType: null,
    osmId: null,
    amenity: null,
    websiteMenu: null,
    externalId: orNull(row['sid']), // stable, source-scoped short id
    canonicalName: field(row, 'canonical_name'),
    nameVi: orNull(row['name_vi']),
    nameEn: orNull(row['name_en']),
    cuisineRaw: orNull(row['categories']),
    cuisineNormalized: splitList(row['cuisine_normalized']),
    fullAddress: orNull(row['full_address']),
    street: orNull(row['street']),
    housenumber: orNull(row['housenumber']),
    ward: stripAdminOrNull(row['ward']),
    district: stripAdminOrNull(row['area']),
    city: stripAdminPrefix(field(row, 'city')),
    country: field(row, 'country') || 'Vietnam',
    lat: toNumber(row['lat']),
    lon: toNumber(row['lon']),
    phone: orNull(row['phone']),
    website: orNull(row['website']),
    openingHours: orNull(row['opening_hours']),
    sourceUrl: orNull(row['source_url']),
    sourceObservedAt: parseDate(row['source_observed_at']),
    dataLicense: 'openmapvn-terms',
    attributionRequired: true,
    discoveryConfidence: toNumber(row['confidence_discovery']),
    menuStatus: field(row, 'menu_status') || 'not_observed',
    verificationStatus: 'unverified', // FORCED — never trust the CSV's value
    reviewStatus: ReviewStatus.needs_review, // FORCED
    rawTagsJson,
    notes: orNull(row['data_quality_notes']),
  };
}

/** Upsert OpenMap rows by restaurant_id (idempotent re-runs). */
export async function importOpenmapRestaurants(db: Prisma.TransactionClient, rows: CsvRow[]): Promise<Counts> {
  requireColumns(rows, ['restaurant_id', 'external_source', 'canonical_name', 'city', 'lat', 'lon']);
  const counts = newCounts();
  for (const row of rows) {
    counts.read++;
    if (!field(row, 'restaurant_id')) {
      counts.skipped++;
      continue;
    }
    const data = mapOpenmapRow(row);
    const exists = await db.restaurant.findUnique({ where: { id: data.id } });
    await db.restaurant.upsert({ where: { id: data.id }, update: data, create: data });
    if (exists) counts.updated++;
    else counts.inserted++;
  }
  return counts;
}
