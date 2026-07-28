import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/apiGuard';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const denied = await requireAdminSession();
  if (denied) return denied;

  const supabase = getSupabaseAdmin();

  const { count, error } = await supabase
    .from('driver_kyc')
    .select('driver_id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count || 0 });
}
