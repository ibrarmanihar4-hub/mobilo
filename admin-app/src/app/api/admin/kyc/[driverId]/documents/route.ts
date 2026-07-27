import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/apiGuard';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const DOC_FIELDS = [
  'aadhaar_front_url',
  'aadhaar_back_url',
  'pan_url',
  'license_front_url',
  'license_back_url',
  'selfie_url',
  'rc_front_url',
  'rc_back_url',
  'insurance_url',
  'puc_url',
  'passbook_url',
] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ driverId: string }> }
) {
  const denied = await requireAdminSession();
  if (denied) return denied;

  const { driverId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: kycRow, error } = await supabase
    .from('driver_kyc')
    .select(DOC_FIELDS.join(','))
    .eq('driver_id', driverId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (!kycRow) {
    return NextResponse.json({ urls: {} });
  }

  const urls: Record<string, string> = {};
  const record = kycRow as unknown as Record<string, string | null>;

  await Promise.all(
    DOC_FIELDS.map(async (field) => {
      const filePath = record[field];
      if (!filePath) return;

      const { data } = await supabase.storage
        .from('driver-kyc')
        .createSignedUrl(filePath, 3600);

      if (data?.signedUrl) {
        urls[field] = data.signedUrl;
      }
    })
  );

  return NextResponse.json({ urls });
}
