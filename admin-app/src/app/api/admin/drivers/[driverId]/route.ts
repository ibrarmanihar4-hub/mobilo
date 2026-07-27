import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/apiGuard';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ driverId: string }> }
) {
  const denied = await requireAdminSession();
  if (denied) return denied;

  const { driverId } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status as string | undefined;

  if (!status || !['offline', 'online', 'on_trip'].includes(status)) {
    return NextResponse.json({ message: 'Invalid status.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('drivers').update({ status }).eq('id', driverId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
