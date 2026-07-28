import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { fetchMyDriver } from "./src/services/driverRepo";
import { fetchKycRecord } from "./src/services/kycRepo";
import { isSupabaseConfigured } from "./src/services/supabase";
import AuthScreen from "./src/screens/AuthScreen";
import DriverSetupScreen from "./src/screens/DriverSetupScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ActiveTripScreen from "./src/screens/ActiveTripScreen";
import KycFlow from "./src/kyc/KycFlow";
import type { DriverRow, TripRow } from "./src/types";
import { colors } from "./src/theme";

type Screen = "loading" | "setup" | "kyc" | "home" | "trip";

function Root() {
  const { user, loading } = useAuth();
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [screen, setScreen] = useState<Screen>("loading");
  const [activeTrip, setActiveTrip] = useState<TripRow | null>(null);

  const loadDriver = useCallback(async () => {
    setScreen("loading");
    const d = await fetchMyDriver();
    if (d) {
      setDriver(d);
      // Check Supabase for an existing KYC submission.
      // If a driver_kyc row already exists (any status), skip the KYC flow.
      const kyc = await fetchKycRecord();
      if (kyc) {
        setScreen("home");
      } else {
        setScreen("kyc");
      }
    } else {
      setScreen("setup");
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setDriver(null);
      setActiveTrip(null);
      return;
    }
    void loadDriver();
  }, [user, loading, loadDriver]);

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.center}>
        <Text style={styles.warn}>
          Supabase is not configured. Copy .env.example to .env and set your
          project URL and anon key (same project as the rider app).
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
    );
  }

  if (!user) return <AuthScreen />;

  if (screen === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
    );
  }

  if (screen === "setup") {
    return <DriverSetupScreen onDone={loadDriver} />;
  }

  if (screen === "kyc" && driver) {
    return (
      <KycFlow
        onComplete={() => {
          // KYC data is now persisted in Supabase (driver_kyc table).
          // Simply move to the home screen.
          setScreen("home");
        }}
      />
    );
  }

  if (screen === "trip" && activeTrip) {
    return (
      <ActiveTripScreen
        trip={activeTrip}
        onDone={() => {
          setActiveTrip(null);
          setScreen("home");
        }}
      />
    );
  }

  if (driver) {
    return (
      <HomeScreen
        driver={driver}
        onOpenTrip={(trip) => {
          setActiveTrip(trip);
          setScreen("trip");
        }}
        onLogout={() => {
          setDriver(null);
          setScreen("loading");
        }}
      />
    );
  }

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.ink} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: 32,
  },
  warn: {
    color: colors.inkMuted,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
  },
});
