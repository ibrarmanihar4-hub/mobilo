import React, {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { DEFAULT_SHUTTLE_ROUTES } from "../data/defaultRoutes";
import { fetchRoutesFromApi } from "../services/routeApi";
import { isSupabaseConfigured } from "../services/supabase";
import {
  buildAllRouteStops,
  SearchableStop,
  ShuttleRoute,
} from "../types/routeNetwork";

interface RouteDataContextValue {
  routes: ShuttleRoute[];
  allStops: SearchableStop[];
  loading: boolean;
  error: string | null;
  usingFallback: boolean;
  refreshRoutes: () => Promise<void>;
}

const RouteDataContext = createContext<RouteDataContextValue | undefined>(
  undefined
);

// Only attempt the live route sync when Supabase is configured. Without
// it, the bundled routes are the source of truth and the "Live route sync
// unavailable" banner is just noise.
const HAS_BACKEND = isSupabaseConfigured;

export function RouteDataProvider({ children }: { children: ReactNode }) {
  const [routes, setRoutes] = useState<ShuttleRoute[]>(DEFAULT_SHUTTLE_ROUTES);
  const [loading, setLoading] = useState(HAS_BACKEND);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(true);
  const hasLoadedRoutesRef = useRef(false);

  const loadRoutes = useCallback(
    async (options?: { signal?: AbortSignal; silent?: boolean }) => {
      if (!HAS_BACKEND) {
        // No backend configured: the bundled routes are authoritative.
        // Skip the fetch silently so the user never sees a sync banner.
        setRoutes(DEFAULT_SHUTTLE_ROUTES);
        setUsingFallback(true);
        setError(null);
        setLoading(false);
        hasLoadedRoutesRef.current = true;
        return;
      }

      const signal = options?.signal;
      const shouldShowLoader = !options?.silent && !hasLoadedRoutesRef.current;

      if (shouldShowLoader) {
        setLoading(true);
      }

      try {
        const nextRoutes = await fetchRoutesFromApi(signal);

        if (nextRoutes.length > 0) {
          setRoutes(nextRoutes);
        } else {
          setRoutes(DEFAULT_SHUTTLE_ROUTES);
        }

        setError(null);
        setUsingFallback(false);
        hasLoadedRoutesRef.current = true;
      } catch {
        if (signal?.aborted) {
          return;
        }

        setRoutes(DEFAULT_SHUTTLE_ROUTES);
        setUsingFallback(true);
        setError(
          "Live route sync is unavailable right now. Built-in routes are being shown instead."
        );
        hasLoadedRoutesRef.current = true;
      } finally {
        if (!signal?.aborted && shouldShowLoader) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadRoutes({ signal: controller.signal });

    const appStateSubscription = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void loadRoutes({ silent: true });
      }
    });

    return () => {
      controller.abort();
      appStateSubscription.remove();
    };
  }, [loadRoutes]);

  const value = useMemo(
    () => ({
      routes,
      allStops: buildAllRouteStops(routes),
      loading,
      error,
      usingFallback,
      refreshRoutes: async () => loadRoutes({ silent: true }),
    }),
    [error, loadRoutes, loading, routes, usingFallback]
  );

  return (
    <RouteDataContext.Provider value={value}>
      {children}
    </RouteDataContext.Provider>
  );
}

export { RouteDataContext };
