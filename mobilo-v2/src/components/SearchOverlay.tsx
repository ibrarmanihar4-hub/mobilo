import React, { useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { SearchableStop } from "../constants/routeNetwork";
import { useRouteData } from "../hooks/useRouteData";
import ScreenBackground from "./ScreenBackground";
import { colors, radii } from "../theme/theme";

interface Props {
  type: "from" | "to";
  onSelect: (location: SearchableStop) => void;
  onClose: () => void;
  currentLocation?: SearchableStop | null;
}

export default function SearchOverlay({
  type,
  onSelect,
  onClose,
  currentLocation,
}: Props) {
  const [query, setQuery] = useState("");
  const { allStops, loading, usingFallback } = useRouteData();

  const filteredStops = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allStops;
    return allStops.filter((stop) => stop.searchText.includes(q));
  }, [allStops, query]);

  return (
    <View style={styles.overlay}>
      <ScreenBackground>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>
                  {type === "from" ? "Pickup" : "Where to?"}
                </Text>
                <Text style={styles.subtitle}>
                  {usingFallback
                    ? "Built-in shuttle stops"
                    : "Live shuttle stops"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons
                name="search"
                size={18}
                color={colors.inkMuted}
                style={{ marginRight: 10 }}
              />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={
                  type === "from"
                    ? "Search source stop"
                    : "Search destination"
                }
                placeholderTextColor={colors.inkFaint}
                autoFocus
                style={styles.input}
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.inkFaint}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.helperText}>
              {loading ? "Loading stops" : "Available stops"}
            </Text>

            <FlatList
              data={filteredStops}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                type === "from" && currentLocation ? (
                  <TouchableOpacity
                    onPress={() => {
                      onSelect(currentLocation);
                      onClose();
                    }}
                    activeOpacity={0.85}
                    style={styles.currentCard}
                  >
                    <View style={styles.currentIcon}>
                      <Ionicons name="locate" size={16} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.currentTitle}>
                        Use current location
                      </Text>
                      <Text style={styles.currentMeta}>
                        Live coordinates from your device
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.inkFaint}
                    />
                  </TouchableOpacity>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.stopRow}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.stopIcon}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={colors.ink}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stopTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.stopMeta} numberOfLines={1}>
                      {item.routeName} · {item.pointLabel}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.inkFaint}
                  />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No stop found</Text>
                  <Text style={styles.emptyText}>
                    {loading
                      ? "Route network is still syncing."
                      : "Try part of the stop name or route number."}
                  </Text>
                </View>
              }
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ScreenBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkMuted,
    marginTop: 4,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 22,
    marginTop: 6,
    paddingHorizontal: 14,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
  },
  helperText: {
    marginHorizontal: 22,
    marginTop: 16,
    marginBottom: 8,
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  listContent: {
    paddingHorizontal: 22,
    paddingBottom: 32,
  },
  currentCard: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  currentIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  currentTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  currentMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  stopIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stopTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  stopMeta: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
    fontWeight: "600",
  },
  empty: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
  },
  emptyText: {
    marginTop: 6,
    color: colors.inkMuted,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
