import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import ScreenBackground from "../components/ScreenBackground";
import ScreenHeader from "../components/ScreenHeader";
import GradientButton from "../components/GradientButton";
import RouteMap, { RouteMapStop } from "../components/RouteMap";

import { RootStackParamList } from "../navigation/RootNavigator";
import {
  formatCurrency,
  rideConfigs,
  rideOptionIds,
  RideOptionId,
} from "../constants/rideCatalog";
import { colors, radii, shadows } from "../theme/theme";
import { getLayoutMetrics } from "../utils/responsive";

type MobilityOptionsRouteProp = RouteProp<
  RootStackParamList,
  "MobilityOptions"
>;

const rideOptions = rideOptionIds.map((id) => ({
  id,
  ...rideConfigs[id],
}));

export default function MobilityOptionsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<MobilityOptionsRouteProp>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const layout = getLayoutMetrics(width, height);

  const { routePlan, sourceLocation, destinationLocation } = route.params;
  const [selectedRideId, setSelectedRideId] = useState<RideOptionId>("shuttle");

  const pickupPointDistance = Math.round(routePlan.pickupNode.distance);
  const boardingAtSource =
    routePlan.pickupNode.stop.id === sourceLocation.id;
  const selectedRide =
    rideOptions.find((option) => option.id === selectedRideId) ||
    rideOptions[0];

  const mapHeight = layout.isTablet
    ? Math.min(Math.max(height * 0.28, 240), 320)
    : Math.min(Math.max(height * 0.24, 200), 240);

  const mapStops: RouteMapStop[] = [];
  mapStops.push({
    id: sourceLocation.id,
    name: sourceLocation.isCurrentLocation
      ? "Current location"
      : sourceLocation.name,
    latitude: sourceLocation.lat,
    longitude: sourceLocation.lng,
    highlight: "source",
  });
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
    if (s.id !== routePlan.pickupNode.stop.id && s.id !== routePlan.dropNode.id) {
      mapStops.push({
        id: s.id,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        highlight: "via",
      });
    }
  });
  mapStops.push({
    id: destinationLocation.id,
    name: destinationLocation.name,
    latitude: destinationLocation.lat,
    longitude: destinationLocation.lng,
    highlight: "dest",
  });

  const walkPath = !boardingAtSource
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

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScreenHeader
          step={1}
          title="Choose a ride"
          subtitle={`${routePlan.route.name} · ${routePlan.route.direction}`}
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
              polylineStops={routePlan.coveredStops.map((s) => ({
                id: s.id,
                name: s.name,
                latitude: s.latitude,
                longitude: s.longitude,
              }))}
              height={mapHeight}
              badge={`${routePlan.estimatedRideMinutes} min`}
            />

            <View style={styles.pickupCard}>
              <Ionicons
                name="walk"
                size={18}
                color={colors.ink}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.pickupLabel}>NEAREST PICKUP</Text>
                <Text style={styles.pickupValue} numberOfLines={1}>
                  {routePlan.pickupNode.stop.name}
                </Text>
              </View>
              <View style={styles.pickupMeta}>
                <Text style={styles.pickupMetaValue}>
                  {pickupPointDistance} m
                </Text>
                <Text style={styles.pickupMetaLabel}>
                  {routePlan.pickupNode.walkMinutes} min walk
                </Text>
              </View>
            </View>

            <Text style={styles.sectionEyebrow}>OPTIONS</Text>

            <View style={styles.optionsList}>
              {rideOptions.map((option) => {
                const isSelected = option.id === selectedRideId;
                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => setSelectedRideId(option.id)}
                    activeOpacity={0.85}
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.optionIcon,
                        { backgroundColor: colors.surfaceMuted },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={option.icon}
                        size={22}
                        color={colors.ink}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.optionTitleRow}>
                        <Text style={styles.optionTitle}>{option.title}</Text>
                        {option.id === "shuttle" ? (
                          <View style={styles.greenBadge}>
                            <Text style={styles.greenBadgeText}>BEST</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.optionSupport} numberOfLines={1}>
                        {option.supportText} · {option.etaMinutes} min
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.optionPrice}>
                        {formatCurrency(option.baseFare)}
                      </Text>
                      <View
                        style={[
                          styles.radio,
                          isSelected && styles.radioActive,
                        ]}
                      >
                        {isSelected ? (
                          <View style={styles.radioDot} />
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
        >
          <GradientButton
            label={`Continue with ${selectedRide.title}`}
            icon="arrow-forward"
            onPress={() =>
              navigation.navigate("RideDetail", {
                selectedRide: selectedRideId,
                routePlan,
                sourceLocation,
                destinationLocation,
              })
            }
          />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  content: { paddingHorizontal: 22 },
  pickupCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 14,
  },
  pickupLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  pickupValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  pickupMeta: { alignItems: "flex-end" },
  pickupMetaValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  pickupMetaLabel: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.inkMuted,
    letterSpacing: 1,
    marginTop: 22,
    marginBottom: 10,
  },
  optionsList: { gap: 10 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionCardSelected: {
    borderColor: colors.ink,
    borderWidth: 2,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  greenBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  greenBadgeText: {
    color: colors.accentDeep,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  optionSupport: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  optionPrice: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  radioActive: {
    borderColor: colors.ink,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.ink,
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
