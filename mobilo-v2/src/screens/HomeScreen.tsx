import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import BrandMark from "../components/BrandMark";
import GradientButton from "../components/GradientButton";
import GlassCard from "../components/GlassCard";
import RouteMap, { RouteMapStop } from "../components/RouteMap";
import ScreenBackground from "../components/ScreenBackground";
import SearchOverlay from "../components/SearchOverlay";

import {
  createCurrentLocationStop,
  SearchableStop,
} from "../constants/routeNetwork";
import { useRouteData } from "../hooks/useRouteData";
import { useAuth } from "../context/AuthContext";
import { buildRoutePlan, RoutePlan } from "../utils/routePlanner";
import { colors, radii, shadows } from "../theme/theme";
import { getLayoutMetrics } from "../utils/responsive";

type HomeTab = "home" | "history" | "help" | "profile";

const bottomTabs: Array<{
  id: HomeTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: "home", label: "Home", icon: "home-outline", activeIcon: "home" },
  {
    id: "history",
    label: "Trips",
    icon: "receipt-outline",
    activeIcon: "receipt",
  },
  {
    id: "help",
    label: "Help",
    icon: "help-circle-outline",
    activeIcon: "help-circle",
  },
  {
    id: "profile",
    label: "Profile",
    icon: "person-outline",
    activeIcon: "person",
  },
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { width, height } = useWindowDimensions();
  const layout = getLayoutMetrics(width, height);
  const {
    routes,
    loading: routesLoading,
    error: routesError,
    usingFallback,
    refreshRoutes,
  } = useRouteData();

  const mapHeight = layout.isTablet
    ? Math.min(Math.max(height * 0.32, 280), 380)
    : Math.min(Math.max(height * 0.28, 220), 280);

  const [hasLocation, setHasLocation] = useState(false);
  const [currentLocationOption, setCurrentLocationOption] =
    useState<SearchableStop | null>(null);
  const [fromLocation, setFromLocation] = useState<SearchableStop | null>(
    null
  );
  const [toLocation, setToLocation] = useState<SearchableStop | null>(null);
  const [activeSearch, setActiveSearch] = useState<"from" | "to" | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<HomeTab>("home");
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) {
          setHasLocation(true);
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        const cur = createCurrentLocationStop(
          location.coords.latitude,
          location.coords.longitude
        );
        setCurrentLocationOption(cur);
        setFromLocation((prev) => prev || cur);
        setHasLocation(true);
      } catch {
        setHasLocation(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setRoutePlan(null);
    setRouteError(null);
    if (!fromLocation || !toLocation) return;
    if (routes.length === 0) return;
    const result = buildRoutePlan(fromLocation, toLocation, routes);
    if (!result.plan) {
      setRouteError(result.error || "Route not feasible");
      return;
    }
    setRoutePlan(result.plan);
  }, [fromLocation, routes, toLocation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshRoutes();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshRoutes]);

  if (!hasLocation || (routesLoading && routes.length === 0)) {
    return (
      <ScreenBackground>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>
            {!hasLocation ? "Getting ready" : "Loading routes"}
          </Text>
        </View>
      </ScreenBackground>
    );
  }

  const canViewOptions = Boolean(routePlan);
  const greeting = user?.fullName?.split(" ")[0] || "there";

  // Build the stop list for the map.
  const mapStops: RouteMapStop[] = [];
  if (fromLocation) {
    mapStops.push({
      id: fromLocation.id,
      name: fromLocation.isCurrentLocation
        ? "Current location"
        : fromLocation.name,
      latitude: fromLocation.lat,
      longitude: fromLocation.lng,
      highlight: "source",
    });
  }
  if (routePlan) {
    if (
      !fromLocation ||
      routePlan.pickupNode.stop.id !== fromLocation.id
    ) {
      mapStops.push({
        id: routePlan.pickupNode.stop.id,
        name: routePlan.pickupNode.stop.name,
        latitude: routePlan.pickupNode.stop.latitude,
        longitude: routePlan.pickupNode.stop.longitude,
        highlight: "pickup",
      });
    }
    routePlan.coveredStops.forEach((s) => {
      if (
        s.id !== routePlan.pickupNode.stop.id &&
        s.id !== routePlan.dropNode.id
      ) {
        mapStops.push({
          id: s.id,
          name: s.name,
          latitude: s.latitude,
          longitude: s.longitude,
          highlight: "via",
        });
      }
    });
  }
  if (toLocation) {
    mapStops.push({
      id: toLocation.id,
      name: toLocation.name,
      latitude: toLocation.lat,
      longitude: toLocation.lng,
      highlight: "dest",
    });
  }

  const walkPath =
    routePlan && fromLocation && routePlan.pickupNode.stop.id !== fromLocation.id
      ? {
          from: {
            id: "src",
            name: fromLocation.name,
            latitude: fromLocation.lat,
            longitude: fromLocation.lng,
          },
          to: {
            id: "pickup",
            name: routePlan.pickupNode.stop.name,
            latitude: routePlan.pickupNode.stop.latitude,
            longitude: routePlan.pickupNode.stop.longitude,
          },
        }
      : null;

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: 110 + insets.bottom },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.container,
              {
                maxWidth: layout.contentMaxWidth,
                width: "100%",
                alignSelf: "center",
              },
            ]}
          >
            <View style={styles.topBar}>
              <BrandMark size="md" />
              <TouchableOpacity
                style={styles.profileChip}
                onPress={() => navigation.navigate("Profile")}
                activeOpacity={0.85}
              >
                <Text style={styles.avatarText}>
                  {(user?.fullName || "M").charAt(0).toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.greetTitle}>Hi {greeting},</Text>
            <Text style={styles.greetSub}>where to today?</Text>

            <RouteMap
              stops={mapStops}
              walkPath={walkPath}
              polylineStops={
                routePlan
                  ? routePlan.coveredStops.map((s) => ({
                      id: s.id,
                      name: s.name,
                      latitude: s.latitude,
                      longitude: s.longitude,
                    }))
                  : []
              }
              height={mapHeight}
              badge={
                routePlan
                  ? `${routePlan.estimatedRideMinutes} min`
                  : undefined
              }
              style={{ marginTop: 6 }}
            />

            <GlassCard padding={0} style={{ marginTop: 14 }}>
              <TouchableOpacity
                style={styles.locRow}
                onPress={() => setActiveSearch("from")}
                activeOpacity={0.85}
              >
                <View
                  style={[styles.locDot, { backgroundColor: colors.ink }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locLabel}>FROM</Text>
                  <Text style={styles.locValue} numberOfLines={1}>
                    {fromLocation
                      ? fromLocation.isCurrentLocation
                        ? "Current location"
                        : fromLocation.name
                      : "Choose source"}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.inkMuted}
                />
              </TouchableOpacity>

              <View style={styles.locDivider} />

              <TouchableOpacity
                style={styles.locRow}
                onPress={() => setActiveSearch("to")}
                activeOpacity={0.85}
              >
                <View
                  style={[styles.locDot, { backgroundColor: colors.hot }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locLabel}>TO</Text>
                  <Text
                    style={[
                      styles.locValue,
                      !toLocation && {
                        color: colors.inkMuted,
                        fontWeight: "600",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {toLocation ? toLocation.name : "Choose destination"}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.inkMuted}
                />
              </TouchableOpacity>
            </GlassCard>

            {routeError ? (
              <View style={styles.warnBanner}>
                <Ionicons
                  name="alert-circle"
                  size={14}
                  color={colors.warning}
                />
                <Text style={styles.warnText}>{routeError}</Text>
              </View>
            ) : null}

            {routesError ? (
              <View style={styles.syncBanner}>
                <Ionicons
                  name={
                    usingFallback
                      ? "cloud-offline-outline"
                      : "cloud-done-outline"
                  }
                  size={14}
                  color={colors.inkMuted}
                />
                <Text style={styles.syncText} numberOfLines={2}>
                  {routesError}
                </Text>
              </View>
            ) : null}

            <GradientButton
              label="See ride options"
              icon="arrow-forward"
              disabled={!canViewOptions}
              onPress={() => {
                if (!routePlan || !fromLocation || !toLocation) return;
                setActiveTab("home");
                navigation.navigate("MobilityOptions", {
                  routePlan,
                  sourceLocation: fromLocation,
                  destinationLocation: toLocation,
                });
              }}
              style={{ marginTop: 14 }}
            />

            <Text style={styles.sectionEyebrow}>SAVED PLACES</Text>
            <GlassCard padding={0}>
              <SavedPlace icon="briefcase-outline" label="Work" hint="Add" />
              <View style={styles.locDivider} />
              <SavedPlace icon="home-outline" label="Home" hint="Add" />
            </GlassCard>

            <View style={styles.promo}>
              <View style={styles.promoIcon}>
                <Ionicons name="gift" size={18} color={colors.accentDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.promoTitle}>
                  Use code{" "}
                  <Text style={{ fontWeight: "900" }}>MOBILO50</Text>
                </Text>
                <Text style={styles.promoSub}>
                  50% off your first shuttle ride
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.inkMuted}
              />
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomNav,
            { paddingBottom: Math.max(insets.bottom, 12) + 6 },
          ]}
        >
          <View
            style={[
              styles.bottomNavInner,
              { maxWidth: layout.contentMaxWidth },
            ]}
          >
            {bottomTabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={styles.bottomNavItem}
                  onPress={() => {
                    if (tab.id === "profile") {
                      navigation.navigate("Profile");
                      return;
                    }
                    if (tab.id === "help") {
                      navigation.navigate("Help");
                      return;
                    }
                    if (tab.id === "history") {
                      navigation.navigate("History");
                      return;
                    }
                    setActiveTab(tab.id);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={isActive ? tab.activeIcon : tab.icon}
                    size={22}
                    color={isActive ? colors.ink : colors.inkMuted}
                  />
                  <Text
                    style={[
                      styles.bottomNavLabel,
                      isActive && styles.bottomNavLabelActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </SafeAreaView>

      {activeSearch && (
        <SearchOverlay
          type={activeSearch}
          currentLocation={currentLocationOption}
          onSelect={(location) => {
            if (activeSearch === "from") setFromLocation(location);
            else setToLocation(location);
          }}
          onClose={() => setActiveSearch(null)}
        />
      )}
    </ScreenBackground>
  );
}

function SavedPlace({
  icon,
  label,
  hint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
}) {
  return (
    <TouchableOpacity style={styles.savedRow} activeOpacity={0.85}>
      <View style={styles.savedIcon}>
        <Ionicons name={icon} size={18} color={colors.ink} />
      </View>
      <Text style={styles.savedLabel}>{label}</Text>
      <Text style={styles.savedHint}>{hint}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  container: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    color: colors.inkMuted,
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  profileChip: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 14,
  },
  greetTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.6,
  },
  greetSub: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.inkMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  locDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 42,
  },
  locDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 14,
  },
  locLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.inkMuted,
    letterSpacing: 0.8,
  },
  locValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 2,
  },
  warnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.warningSoft,
    padding: 10,
    borderRadius: radii.sm,
    marginTop: 12,
  },
  warnText: {
    flex: 1,
    color: colors.warning,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  syncBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    padding: 10,
    borderRadius: radii.sm,
    marginTop: 8,
  },
  syncText: {
    flex: 1,
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
    lineHeight: 16,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.inkMuted,
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 10,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  savedIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  savedLabel: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  savedHint: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    marginRight: 8,
  },
  promo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    padding: 14,
    borderRadius: radii.md,
    marginTop: 18,
  },
  promoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accentDeep,
  },
  promoSub: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accentDeep,
    marginTop: 2,
    opacity: 0.85,
  },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingHorizontal: 22,
    ...shadows.soft,
  },
  bottomNavInner: {
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bottomNavItem: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 6,
  },
  bottomNavLabel: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  bottomNavLabelActive: { color: colors.ink },
});
