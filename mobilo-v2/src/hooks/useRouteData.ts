import { useContext } from "react";
import { RouteDataContext } from "../context/RouteDataContext";

export function useRouteData() {
  const context = useContext(RouteDataContext);

  if (!context) {
    throw new Error("useRouteData must be used inside RouteDataProvider.");
  }

  return context;
}
