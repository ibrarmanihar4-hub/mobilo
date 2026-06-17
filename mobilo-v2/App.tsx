import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { BookingHistoryProvider } from "./src/context/BookingHistoryContext";
import { RouteDataProvider } from "./src/context/RouteDataContext";
import ErrorBoundary from "./src/components/ErrorBoundary";
import { colors } from "./src/theme/theme";

const NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.ink,
    border: colors.border,
    primary: colors.primary,
    notification: colors.accent,
  },
};

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <BookingHistoryProvider>
            <RouteDataProvider>
              <NavigationContainer theme={NavTheme}>
                <StatusBar style="dark" />
                <RootNavigator />
              </NavigationContainer>
            </RouteDataProvider>
          </BookingHistoryProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
