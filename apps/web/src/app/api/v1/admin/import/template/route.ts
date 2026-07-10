import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEADERS = [
  'restaurant_id',
  'canonical_name',
  'city',
  'name_vi',
  'name_en',
  'district',
  'lat',
  'lon',
  'cuisine_normalized',
  'review_status',
  'notes',
];
const EXAMPLE = [
  'rest_example_01',
  'Quán Ví Dụ',
  'hanoi',
  'Quán Ví Dụ',
  'Example Eatery',
  'Hoàn Kiếm',
  '21.0285',
  '105.8542',
  'vietnamese',
  'needs_review',
  'Imported example',
];

// Restaurant import template (CSV attachment). Admin-only.
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const csv = `${HEADERS.join(',')}\n${EXAMPLE.join(',')}\n`;
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="restaurants-template.csv"',
    },
  });
}
