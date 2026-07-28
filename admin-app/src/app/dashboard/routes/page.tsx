'use client';

import React, { useEffect, useState, useContext, useCallback, useMemo } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { DashboardRefreshContext } from '../layout';
import { RouteRow, RouteStopRow } from '@/lib/types';
import MetricCard from '@/components/MetricCard';
import {
  Route as RouteIcon,
  MapPin,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Save,
  X,
} from 'lucide-react';

interface StopDraft {
  name: string;
  latitude: string;
  longitude: string;
  mapUrl: string;
}

interface RouteDraft {
  name: string;
  direction: string;
  stops: StopDraft[];
}

function emptyStop(): StopDraft {
  return { name: '', latitude: '', longitude: '', mapUrl: '' };
}

function emptyDraft(): RouteDraft {
  return { name: '', direction: '', stops: [emptyStop(), emptyStop()] };
}

function draftFromRoute(route: RouteRow): RouteDraft {
  const stops = [...(route.route_stops || [])].sort((a, b) => a.stop_order - b.stop_order);
  return {
    name: route.name,
    direction: route.direction,
    stops: stops.length
      ? stops.map((s) => ({
          name: s.name,
          latitude: String(s.latitude),
          longitude: String(s.longitude),
          mapUrl: s.map_url || '',
        }))
      : [emptyStop(), emptyStop()],
  };
}

export default function RoutesPage() {
  const { toast } = useAdminAuth();
  const { refreshKey, triggerRefresh } = useContext(DashboardRefreshContext);

  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(true);
  const [draft, setDraft] = useState<RouteDraft>(emptyDraft());
  const [isSaving, setIsSaving] = useState(false);

  // Fetches the route list only. It never touches selection state, so it's
  // safe to call on mount/refresh without stomping on an in-progress "New
  // route" draft. Selection defaults are applied once, right after the
  // initial load (see the effect below), not on every fetch.
  const fetchRoutes = useCallback(async (): Promise<RouteRow[]> => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/routes');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load routes.');

      const rows = (data.rows || []) as RouteRow[];
      setRoutes(rows);
      return rows;
    } catch (err: any) {
      toast(err.message || 'Failed to load routes.', 'error');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Initial load + refresh-triggered reloads: keep the current selection if
  // it still exists, otherwise fall back to the first route. Does NOT run
  // when the user merely clicks "New" (that only changes selectedRouteId,
  // which is intentionally not a dependency here).
  useEffect(() => {
    fetchRoutes().then((rows) => {
      setSelectedRouteId((current) => {
        if (current && rows.some((r) => r.id === current)) {
          return current;
        }
        return rows[0]?.id ?? null;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRoutes, refreshKey]);

  // Keep the editor draft in sync with whichever route is selected.
  useEffect(() => {
    if (isCreating) return;
    const route = routes.find((r) => r.id === selectedRouteId);
    if (route) setDraft(draftFromRoute(route));
  }, [selectedRouteId, routes, isCreating]);

  const filteredRoutes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return routes;

    return routes.filter((route) => {
      const haystack = `${route.name} ${route.direction} ${(route.route_stops || [])
        .map((s) => s.name)
        .join(' ')}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [routes, searchQuery]);

  const totalStops = useMemo(
    () => routes.reduce((sum, r) => sum + (r.route_stops?.length || 0), 0),
    [routes]
  );
  const averageStops = routes.length ? (totalStops / routes.length).toFixed(1) : '0';

  function createNewRoute() {
    setIsCreating(true);
    setSelectedRouteId(null);
    setDraft(emptyDraft());
  }

  function selectRoute(route: RouteRow) {
    setIsCreating(false);
    setSelectedRouteId(route.id);
    setDraft(draftFromRoute(route));
  }

  function updateDraft<K extends keyof RouteDraft>(field: K, value: RouteDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateStop(index: number, field: keyof StopDraft, value: string) {
    setDraft((current) => ({
      ...current,
      stops: current.stops.map((stop, i) => (i === index ? { ...stop, [field]: value } : stop)),
    }));
  }

  function addStop() {
    setDraft((current) => ({ ...current, stops: [...current.stops, emptyStop()] }));
  }

  function removeStop(index: number) {
    setDraft((current) => ({
      ...current,
      stops: current.stops.filter((_, i) => i !== index),
    }));
  }

  function moveStop(index: number, direction: -1 | 1) {
    setDraft((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.stops.length) return current;
      const stops = [...current.stops];
      const [item] = stops.splice(index, 1);
      stops.splice(target, 0, item);
      return { ...current, stops };
    });
  }

  async function saveRoute(event: React.FormEvent) {
    event.preventDefault();

    const trimmedName = draft.name.trim();
    const trimmedDirection = draft.direction.trim();

    if (!trimmedName || !trimmedDirection) {
      toast('Route name and direction are required.', 'error');
      return;
    }

    if (draft.stops.length < 2) {
      toast('A route needs at least two stops.', 'error');
      return;
    }

    for (const stop of draft.stops) {
      if (!stop.name.trim() || stop.latitude.trim() === '' || stop.longitude.trim() === '') {
        toast('Every stop needs a name, latitude, and longitude.', 'error');
        return;
      }
      if (Number.isNaN(Number(stop.latitude)) || Number.isNaN(Number(stop.longitude))) {
        toast('Stop latitude and longitude must be numbers.', 'error');
        return;
      }
    }

    setIsSaving(true);

    const payload = {
      name: trimmedName,
      direction: trimmedDirection,
      stops: draft.stops.map((stop) => ({
        name: stop.name.trim(),
        latitude: Number(stop.latitude),
        longitude: Number(stop.longitude),
        mapUrl: stop.mapUrl.trim() || null,
      })),
    };

    try {
      const isNewRoute = isCreating || !selectedRouteId;
      const endpoint = isNewRoute
        ? '/api/admin/routes'
        : `/api/admin/routes/${selectedRouteId}`;
      const method = isNewRoute ? 'POST' : 'PUT';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to save route.');

      const routeId = isNewRoute ? data.id : selectedRouteId;

      toast(isCreating ? 'Route created successfully.' : 'Route updated successfully.', 'success');
      setIsCreating(false);
      setSelectedRouteId(routeId);

      // Refresh the list, then make sure the just-saved route stays selected.
      const rows = await fetchRoutes();
      setSelectedRouteId(rows.some((r) => r.id === routeId) ? routeId : rows[0]?.id ?? null);
      triggerRefresh();
    } catch (err: any) {
      toast(err.message || 'Unable to save route.', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteRoute() {
    if (!selectedRouteId) return;
    if (!confirm('Delete this route? This removes all of its stops too.')) return;

    setIsSaving(true);

    try {
      const res = await fetch(`/api/admin/routes/${selectedRouteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to delete route.');

      toast('Route deleted.', 'info');

      const rows = await fetchRoutes();
      if (rows.length === 0) {
        setIsCreating(true);
        setSelectedRouteId(null);
        setDraft(emptyDraft());
      } else {
        setIsCreating(false);
        setSelectedRouteId(rows[0].id);
      }
      triggerRefresh();
    } catch (err: any) {
      toast(err.message || 'Unable to delete route.', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">Route Network</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Publish and manage shuttle routes and their ordered stops. Changes here reach the rider
          app immediately.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Total Routes"
          value={routes.length}
          subtext="Published to the network"
          color="indigo"
          icon={<RouteIcon className="w-5 h-5" />}
        />
        <MetricCard
          label="Total Stops"
          value={totalStops}
          subtext="Across all routes"
          color="sky"
          icon={<MapPin className="w-5 h-5" />}
        />
        <MetricCard
          label="Avg. Stops / Route"
          value={averageStops}
          subtext="Route density"
          color="emerald"
          icon={<RouteIcon className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Route List Panel */}
        <div className="rounded-xl border border-white/10 bg-[#111120] shadow-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-white">Route Library</span>
              <button
                onClick={createNewRoute}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3 h-3" /> New
              </button>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search routes or stops..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#181830] border border-white/10 text-white text-xs font-medium outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[320px] lg:max-h-[560px]">
            {isLoading ? (
              [1, 2, 3].map((n) => (
                <div key={n} className="h-16 rounded-lg bg-white/5 animate-pulse" />
              ))
            ) : filteredRoutes.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 space-y-2">
                <RouteIcon className="w-8 h-8 mx-auto opacity-30" />
                <div className="text-xs font-semibold">No routes found</div>
              </div>
            ) : (
              filteredRoutes.map((route) => {
                const isActive = selectedRouteId === route.id && !isCreating;
                return (
                  <button
                    key={route.id}
                    onClick={() => selectRoute(route)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isActive
                        ? 'bg-indigo-500/15 border-indigo-500/30'
                        : 'bg-[#181830] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="font-semibold text-sm text-white truncate">{route.name}</div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {route.direction}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-zinc-300">
                      {route.route_stops?.length || 0} stops
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Editor Panel */}
        <div className="rounded-xl border border-white/10 bg-[#111120] shadow-xl p-4 sm:p-6 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                {isCreating ? 'Create' : 'Edit'}
              </div>
              <h2 className="text-lg font-extrabold text-white mt-0.5">
                {isCreating ? 'New Route' : draft.name || 'Route Details'}
              </h2>
            </div>
            {!isCreating && (
              <button
                onClick={deleteRoute}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Route
              </button>
            )}
          </div>

          <form onSubmit={saveRoute} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1.5 block">
                <span className="text-[11px] font-semibold text-zinc-400">Route Name</span>
                <input
                  value={draft.name}
                  onChange={(e) => updateDraft('name', e.target.value)}
                  placeholder="Route 5"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#181830] border border-white/10 text-white text-sm outline-none focus:border-indigo-500"
                />
              </label>
              <label className="space-y-1.5 block">
                <span className="text-[11px] font-semibold text-zinc-400">Direction</span>
                <input
                  value={draft.direction}
                  onChange={(e) => updateDraft('direction', e.target.value)}
                  placeholder="Source to destination"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#181830] border border-white/10 text-white text-sm outline-none focus:border-indigo-500"
                />
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Stops
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">Stop Sequencing</div>
                </div>
                <button
                  type="button"
                  onClick={addStop}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-semibold flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3 h-3" /> Add Stop
                </button>
              </div>

              <div className="space-y-3">
                {draft.stops.map((stop, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-white/10 bg-[#181830] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-400 text-[11px] font-bold flex items-center justify-center border border-indigo-500/20">
                          {index + 1}
                        </span>
                        <span className="text-xs font-semibold text-white">
                          {stop.name || 'Untitled stop'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => moveStop(index, -1)}
                          disabled={index === 0}
                          className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 disabled:opacity-30 transition-all"
                          title="Move up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStop(index, 1)}
                          disabled={index === draft.stops.length - 1}
                          className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 disabled:opacity-30 transition-all"
                          title="Move down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStop(index)}
                          disabled={draft.stops.length <= 2}
                          className="p-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 disabled:opacity-30 transition-all"
                          title="Remove stop"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <label className="space-y-1 block sm:col-span-2 lg:col-span-2">
                        <span className="text-[10px] font-semibold text-zinc-400">Stop name</span>
                        <input
                          value={stop.name}
                          onChange={(e) => updateStop(index, 'name', e.target.value)}
                          placeholder="Bus stop name"
                          required
                          className="w-full px-2.5 py-1.5 rounded-md bg-[#0d0d1a] border border-white/10 text-white text-xs outline-none focus:border-indigo-500"
                        />
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-[10px] font-semibold text-zinc-400">Latitude</span>
                        <input
                          value={stop.latitude}
                          onChange={(e) => updateStop(index, 'latitude', e.target.value)}
                          placeholder="16.6972082"
                          required
                          className="w-full px-2.5 py-1.5 rounded-md bg-[#0d0d1a] border border-white/10 text-white text-xs outline-none focus:border-indigo-500"
                        />
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-[10px] font-semibold text-zinc-400">Longitude</span>
                        <input
                          value={stop.longitude}
                          onChange={(e) => updateStop(index, 'longitude', e.target.value)}
                          placeholder="74.2324979"
                          required
                          className="w-full px-2.5 py-1.5 rounded-md bg-[#0d0d1a] border border-white/10 text-white text-xs outline-none focus:border-indigo-500"
                        />
                      </label>
                      <label className="space-y-1 block sm:col-span-2 lg:col-span-4">
                        <span className="text-[10px] font-semibold text-zinc-400">Map URL (optional)</span>
                        <input
                          value={stop.mapUrl}
                          onChange={(e) => updateStop(index, 'mapUrl', e.target.value)}
                          placeholder="https://maps.app.goo.gl/..."
                          className="w-full px-2.5 py-1.5 rounded-md bg-[#0d0d1a] border border-white/10 text-white text-xs outline-none focus:border-indigo-500"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : isCreating ? 'Create Route' : 'Save Changes'}
              </button>
              {!isCreating && selectedRouteId && (
                <button
                  type="button"
                  onClick={() => {
                    const route = routes.find((r) => r.id === selectedRouteId);
                    if (route) setDraft(draftFromRoute(route));
                  }}
                  className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all"
                >
                  Reset Form
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
