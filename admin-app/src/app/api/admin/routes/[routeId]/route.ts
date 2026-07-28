import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/apiGuard';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

interface StopInput {
  name: string;
  latitude: number;
  longitude: number;
  mapUrl?: string | null;
}

function validateStops(stops: unknown): stops is StopInput[] {
  if (!Array.isArray(stops) || stops.length < 2) return false;
  return stops.every(
    (s) =>
      s &&
      typeof s.name === 'string' &&
      s.name.trim().length > 0 &&
      typeof s.latitude === 'number' &&
      Number.isFinite(s.latitude) &&
      typeof s.longitude === 'number' &&
      Number.isFinite(s.longitude)
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ routeId: string }> }
) {
  const denied = await requireAdminSession();
  if (denied) return denied;

  const { routeId } = await params;
  const body = await request.json().catch(() => null);
  const name = String(body?.name || '').trim();
  const direction = String(body?.direction || '').trim();
  const stops = body?.stops;

  if (!name || !direction) {
    return NextResponse.json({ message: 'Route name and direction are required.' }, { status: 400 });
  }

  if (!validateStops(stops)) {
    return NextResponse.json(
      { message: 'A route needs at least two valid stops (name, latitude, longitude).' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { error: routeError } = await supabase
    .from('routes')
    .update({ name, direction })
    .eq('id', routeId);

  if (routeError) {
    return NextResponse.json({ message: routeError.message }, { status: 500 });
  }

  const { error: deleteError } = await supabase.from('route_stops').delete().eq('route_id', routeId);

  if (deleteError) {
    return NextResponse.json({ message: deleteError.message }, { status: 500 });
  }

  const stopRows = (stops as StopInput[]).map((stop, index) => ({
    route_id: routeId,
    stop_order: index + 1,
    name: stop.name.trim(),
    latitude: stop.latitude,
    longitude: stop.longitude,
    map_url: stop.mapUrl?.trim() || null,
  }));

  const { error: stopsError } = await supabase.from('route_stops').insert(stopRows);

  if (stopsError) {
    return NextResponse.json({ message: stopsError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ routeId: string }> }
) {
  const denied = await requireAdminSession();
  if (denied) return denied;

  const { routeId } = await params;
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('routes').delete().eq('id', routeId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
