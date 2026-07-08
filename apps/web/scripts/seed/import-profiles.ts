import type { Prisma, ProfileType, Strictness } from '@prisma/client';
import { field, orNull, requireColumns, type CsvRow } from './csv';
import { newCounts, type Counts } from './types';

// profiles.csv -> ProfileTemplate (§6.3). Upsert by profile_id.
export async function importProfiles(db: Prisma.TransactionClient, rows: CsvRow[]): Promise<Counts> {
  requireColumns(rows, ['profile_id', 'profile_name_vi', 'profile_name_en', 'profile_type', 'strictness_default']);
  const counts = newCounts();
  for (const row of rows) {
    counts.read++;
    const id = field(row, 'profile_id');
    if (!id) {
      counts.skipped++;
      continue;
    }
    const data = {
      nameVi: field(row, 'profile_name_vi'),
      nameEn: field(row, 'profile_name_en'),
      profileType: field(row, 'profile_type') as ProfileType,
      strictness: field(row, 'strictness_default') as Strictness,
      descriptionVi: orNull(row['description_vi']),
      descriptionEn: orNull(row['description_en']),
    };
    const exists = await db.profileTemplate.findUnique({ where: { id } });
    await db.profileTemplate.upsert({ where: { id }, update: data, create: { id, ...data } });
    if (exists) counts.updated++;
    else counts.inserted++;
  }
  return counts;
}
