import {
  RouteStop,
  SearchableStop,
  ShuttleRoute,
} from "../constants/routeNetwork";
import { haversineDistance } from "./haversine";

export interface PickupCandidate {
  stop: RouteStop;
  distance: number;
  walkMinutes: number;
}

export interface RoutePlan {
  route: ShuttleRoute;
  pickupCandidates: PickupCandidate[];
  pickupNode: PickupCandidate;
  dropNode: RouteStop;
  coveredStops: RouteStop[];
  rideDistance: number;
  estimatedRideMinutes: number;
}

export interface RoutePlanResult {
  plan: RoutePlan | null;
  error: string | null;
}

function estimateWalkMinutes(distance: number) {
  return Math.max(1, Math.round(distance / 75));
}

function sumRouteDistance(stops: RouteStop[]) {
  if (stops.length < 2) {
    return 0;
  }

  let total = 0;

  for (let index = 1; index < stops.length; index += 1) {
    const previousStop = stops[index - 1];
    const currentStop = stops[index];

    total += haversineDistance(
      previousStop.latitude,
      previousStop.longitude,
      currentStop.latitude,
      currentStop.longitude
    );
  }

  return total;
}

export function buildRoutePlan(
  source: SearchableStop,
  destination: SearchableStop,
  routes: ShuttleRoute[]
): RoutePlanResult {
  if (source.id === destination.id) {
    return {
      plan: null,
      error: "Source and destination cannot be the same stop.",
    };
  }

  const route = routes.find((item) => item.id === destination.routeId);

  if (!route) {
    return {
      plan: null,
      error: "Selected destination route is unavailable.",
    };
  }

  const eligiblePickupStops = route.stops.filter(
    (stop) => stop.order < destination.order
  );

  if (eligiblePickupStops.length === 0) {
    return {
      plan: null,
      error: "No pickup stop is available before this destination.",
    };
  }

  const pickupCandidates = eligiblePickupStops
    .map((stop) => {
      const distance = haversineDistance(
        source.lat,
        source.lng,
        stop.latitude,
        stop.longitude
      );

      return {
        stop,
        distance,
        walkMinutes: estimateWalkMinutes(distance),
      };
    })
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 3);

  const pickupNode = pickupCandidates[0];

  const coveredStops = route.stops.filter(
    (stop) =>
      stop.order >= pickupNode.stop.order &&
      stop.order <= destination.order
  );

  const rideDistance = sumRouteDistance(coveredStops);
  const estimatedRideMinutes = Math.max(
    6,
    Math.round(rideDistance / 300)
  );

  return {
    plan: {
      route,
      pickupCandidates,
      pickupNode,
      dropNode:
        route.stops.find((stop) => stop.id === destination.id) ||
        route.stops[route.stops.length - 1],
      coveredStops,
      rideDistance,
      estimatedRideMinutes,
    },
    error: null,
  };
}
