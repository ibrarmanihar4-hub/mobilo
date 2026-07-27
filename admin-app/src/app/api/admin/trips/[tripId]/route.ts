import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/apiGuard';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const denied = await requireAdminSession();
  if (denied) return denied;

  const { tripId } = await params;
  const body = await request.json().catch(() => null);

  if (body?.action !== 'cancel') {
    return NextResponse.json({ message: 'Unsupported action.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('trips')
    .update({ status: 'cancelled', cancelled_by: 'admin' })
    .eq('id', tripId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
