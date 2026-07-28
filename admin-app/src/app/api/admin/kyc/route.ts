import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/apiGuard';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const denied = await requireAdminSession();
  if (denied) return denied;

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('driver_kyc')
    .select('*, drivers(full_name, phone, ride_type, vehicle_plate, status)')
    .order('submitted_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data || [] });
}
