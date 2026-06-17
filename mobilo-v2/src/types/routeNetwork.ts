export interface RouteStopInput {
  name: string;
  latitude: number;
  longitude: number;
  mapUrl?: string;
}

export interface RawShuttleRoute {
  id?: string;
  name: string;
  direction: string;
  stops: RouteStopInput[];
}

export interface RouteStop {
  id: string;
  routeId: string;
  routeName: string;
  pointLabel: string;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
  mapUrl?: string;
  searchText: string;
}

export interface ShuttleRoute {
  id: string;
  name: string;
  direction: string;
  stops: RouteStop[];
}

export interface SearchableStop {
  id: string;
  name: string;
  displayName: string;
  routeId: string;
  routeName: string;
  pointLabel: string;
  lat: number;
  lng: number;
  order: number;
  mapUrl?: string;
  searchText: string;
  isCurrentLocation?: boolean;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildStop(
  routeId: string,
  routeName: string,
  order: number,
  stop: RouteStopInput
): RouteStop {
  const pointLabel = `Point ${order}`;

  return {
    id: `${routeId}-${order}`,
    routeId,
    routeName,
    pointLabel,
    name: stop.name,
    latitude: Number(stop.latitude),
    longitude: Number(stop.longitude),
    order,
    mapUrl: stop.mapUrl || undefined,
    searchText: `${stop.name} ${routeName} ${pointLabel}`.toLowerCase(),
  };
}

export function normalizeRoutes(rawRoutes: RawShuttleRoute[]): ShuttleRoute[] {
  return rawRoutes.map((route, routeIndex) => {
    const routeId =
      slugify(route.id || "") ||
      slugify(route.name || "") ||
      `route-${routeIndex + 1}`;

    return {
      id: routeId,
      name: route.name.trim(),
      direction: route.direction.trim(),
      stops: route.stops.map((stop, stopIndex) =>
        buildStop(routeId, route.name.trim(), stopIndex + 1, stop)
      ),
    };
  });
}

export function buildAllRouteStops(
  routes: ShuttleRoute[]
): SearchableStop[] {
  return routes.flatMap((route) =>
    route.stops.map((stop) => ({
      id: stop.id,
      name: stop.name,
      displayName: `${stop.name} - ${route.name} - ${stop.pointLabel}`,
      routeId: route.id,
      routeName: route.name,
      pointLabel: stop.pointLabel,
      lat: stop.latitude,
      lng: stop.longitude,
      order: stop.order,
      mapUrl: stop.mapUrl,
      searchText: stop.searchText,
    }))
  );
}

export function createCurrentLocationStop(
  latitude: number,
  longitude: number
): SearchableStop {
  return {
    id: "current-location",
    name: "Current Location",
    displayName: "Current Location - Live",
    routeId: "current-location",
    routeName: "Live",
    pointLabel: "Nearby",
    lat: latitude,
    lng: longitude,
    order: 0,
    searchText: "current location nearby live source",
    isCurrentLocation: true,
  };
}
