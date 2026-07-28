import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/apiGuard';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const denied = await requireAdminSession();
  if (denied) return denied;

  const supabase = getSupabaseAdmin();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'rider')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const { data: tripCounts } = await supabase
    .from('trips')
    .select('rider_id')
    .eq('status', 'completed');

  const countMap: Record<string, number> = {};
  (tripCounts || []).forEach((t: { rider_id: string }) => {
    countMap[t.rider_id] = (countMap[t.rider_id] || 0) + 1;
  });

  const rows = (profiles || []).map((p) => ({
    ...p,
    tripCount: countMap[p.id] || 0,
  }));

  return NextResponse.json({ rows });
}
