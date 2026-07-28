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
  const status = body?.status as 'approved' | 'rejected' | undefined;
  const rejectionReason = body?.rejectionReason as string | undefined;

  if (status !== 'approved' && status !== 'rejected') {
    return NextResponse.json({ message: 'status must be approved or rejected.' }, { status: 400 });
  }

  if (status === 'rejected' && !rejectionReason?.trim()) {
    return NextResponse.json({ message: 'rejectionReason is required when rejecting.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('driver_kyc')
    .update({
      status,
      rejection_reason: status === 'approved' ? null : rejectionReason!.trim(),
    })
    .eq('driver_id', driverId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
