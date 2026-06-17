import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import ScreenBackground from "../components/ScreenBackground";
import ScreenHeader from "../components/ScreenHeader";
import GradientButton from "../components/GradientButton";
import RouteMap, { RouteMapStop } from "../components/RouteMap";

import {
  DirectRideId,
  formatCurrency,
  rideConfigs,
} from "../constants/rideCatalog";
import { RootStackParamList } from "../navigation/RootNavigator";
import { colors, radii, shadows } from "../theme/theme";
import { getLayoutMetrics } from "../utils/responsive";

type RideDetailRouteProp = RouteProp<RootStackParamList, "RideDetail">;

export default function RideDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RideDetailRouteProp>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const layout = getLayoutMetrics(width, height);

  const { selectedRide, routePlan, sourceLocation, destinationLocation } =
    route.params;
  const ride = rideConfigs[selectedRide];
  const isShuttle = selectedRide === "shuttle";
  const pickupPointDistance = Math.round(routePlan.pickupNode.distance);
  const boardingAtSource =
    routePlan.pickupNode.stop.id === sourceLocation.id;

  const tripEta = isShuttle
    ? `${routePlan.estimatedRideMinutes} min`
    : `${Math.max(8, routePlan.estimatedRideMinutes - 2)} min`;

  const mapHeight = layout.isTablet
    ? Math.min(Math.max(height * 0.32, 300), 380)
    : Math.min(Math.max(height * 0.3, 240), 300);

  const mapStops: RouteMapStop[] = [
    {
      id: sourceLocation.id,
      name: sourceLocation.isCurrentLocation
        ? "Current location"
        : sourceLocation.name,
      latitude: sourceLocation.lat,
      longitude: sourceLocation.lng,
      highlight: "source",
    },
  ];
  if (isShuttle) {
    if (!boardingAtSource) {
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
  mapStops.push({
    id: destinationLocation.id,
    name: destinationLocation.name,
    latitude: destinationLocation.lat,
    longitude: destinationLocation.lng,
    highlight: "dest",
  });

  const polylineStops = isShuttle
    ? routePlan.coveredStops.map((s) => ({
        id: s.id,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
      }))
    : [
        {
          id: "src",
          name: sourceLocation.name,
          latitude: sourceLocation.lat,
          longitude: sourceLocation.lng,
        },
        {
          id: "dest",
          name: destinationLocation.name,
          latitude: destinationLocation.lat,
          longitude: destinationLocation.lng,
        },
      ];

  const walkPath =
    isShuttle && !boardingAtSource
      ? {
          from: {
            id: "src",
            name: sourceLocation.name,
            latitude: sourceLocation.lat,
            longitude: sourceLocation.lng,
          },
          to: {
            id: "pickup",
            name: routePlan.pickupNode.stop.name,
            latitude: routePlan.pickupNode.stop.latitude,
            longitude: routePlan.pickupNode.stop.longitude,
          },
        }
      : null;

  const infoRows = isShuttle
    ? [
        { label: "Pickup point", value: routePlan.pickupNode.stop.name },
        {
          label: "Pickup access",
          value: boardingAtSource
            ? "Board directly from selected source"
            : `${pickupPointDistance} m · ${routePlan.pickupNode.walkMinutes} min`,
        },
        { label: "Destination", value: destinationLocation.name },
        { label: "Ride ETA", value: tripEta },
      ]
    : [
        {
          label: "Pickup",
          value: sourceLocation.isCurrentLocation
            ? "Current location"
            : sourceLocation.name,
        },
        { label: "Vehicle arrival", value: `${ride.etaMinutes} min` },
        { label: "Destination", value: destinationLocation.name },
        { label: "Estimated fare", value: formatCurrency(ride.baseFare) },
      ];

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScreenHeader
          step={2}
          title={ride.title}
          subtitle={ride.serviceTag}
        />

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.content,
              {
                maxWidth: layout.contentMaxWidth,
                alignSelf: "center",
                width: "100%",
              },
            ]}
          >
            <RouteMap
              stops={mapStops}
              walkPath={walkPath}
              polylineStops={polylineStops}
              height={mapHeight}
              badge={tripEta}
            />

            <View style={styles.rideRow}>
              <View style={styles.rideIcon}>
                <MaterialCommunityIcons
                  name={ride.icon}
                  size={22}
                  color={colors.ink}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rideTitle}>{ride.title}</Text>
                <Text style={styles.rideSub}>{ride.capacity}</Text>
              </View>
              <Text style={styles.ridePrice}>
                {formatCurrency(ride.baseFare)}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <Stat label="Ride ETA" value={tripEta} />
              <Stat label="Vehicle" value={`${ride.etaMinutes} min`} />
            </View>

            <View style={styles.infoCard}>
              {infoRows.map((row, idx) => (
                <View
                  key={row.label}
                  style={[
                    styles.infoRow,
                    idx === infoRows.length - 1 && {
                      borderBottomWidth: 0,
                    },
                  ]}
                >
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue} numberOfLines={2}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
        >
          {isShuttle ? (
            <GradientButton
              label="Continue to schedule"
              icon="arrow-forward"
              onPress={() =>
                navigation.navigate("ShuttleBooking", {
                  pickupNode: routePlan.pickupNode,
                  dropNode: routePlan.dropNode,
                  routePlan,
                })
              }
            />
          ) : (
            <GradientButton
              label={`Book ${ride.title}`}
              icon="arrow-forward"
              onPress={() =>
                navigation.navigate("DirectRideBooking", {
                  selectedRide: selectedRide as DirectRideId,
                  sourceLocation,
                  destinationLocation,
                })
              }
            />
          )}
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  content: { paddingHorizontal: 22 },
  rideRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 14,
  },
  rideIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rideTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  rideSub: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  ridePrice: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  statValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  infoLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  infoValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 6,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    paddingHorizontal: 22,
    ...shadows.floating,
  },
});
