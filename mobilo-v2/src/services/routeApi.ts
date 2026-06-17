import { normalizeRoutes, ShuttleRoute } from "../types/routeNetwork";
import { API_BASE_URL } from "./api";

interface RouteResponse {
  routes?: ShuttleRoute[];
}

export async function fetchRoutesFromApi(
  signal?: AbortSignal
): Promise<ShuttleRoute[]> {
  const requestUrl = `${API_BASE_URL}/routes?ts=${Date.now()}`;

  const response = await fetch(requestUrl, {
    method: "GET",
    signal,
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  });

  const data = (await response.json()) as RouteResponse & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.message || "Unable to fetch route network.");
  }

  return normalizeRoutes(data.routes || []);
}
