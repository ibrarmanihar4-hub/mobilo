import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AuthScreen from "../screens/AuthScreen";
import HomeScreen from "../screens/HomeScreen";
import MobilityOptionsScreen from "../screens/MobilityOptionsScreen";
import RideDetailScreen from "../screens/RideDetailScreen";
import ShuttleBookingScreen from "../screens/ShuttleBookingScreen";
import ShuttleSeatScreen from "../screens/ShuttleSeatScreen";
import ShuttleSuccessScreen from "../screens/ShuttleSuccessScreen";
import DirectRideBookingScreen from "../screens/DirectRideBookingScreen";
import DirectRideStatusScreen from "../screens/DirectRideStatusScreen";
import PaymentScreen from "../screens/PaymentScreen";
import HelpScreen from "../screens/HelpScreen";
import HistoryScreen from "../screens/HistoryScreen";
import ProfileScreen from "../screens/ProfileScreen";

import { DirectRideId } from "../constants/rideCatalog";
import { PickupCandidate, RoutePlan } from "../utils/routePlanner";
import { RouteStop, SearchableStop } from "../constants/routeNetwork";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/theme";

export type PaymentMethodId = "upi" | "card" | "wallet" | "cash";

export type ShuttlePaymentIntent = {
  kind: "shuttle";
  pickupNode: PickupCandidate;
  dropNode: RouteStop;
  routePlan: RoutePlan;
  fare: number;
  departureTime: string;
  departureKey: string;
  seatNumbers: number[];
  bookingCode: string;
};

export type DirectPaymentIntent = {
  kind: "direct";
  selectedRide: DirectRideId;
  sourceLocation: SearchableStop;
  destinationLocation: SearchableStop;
  fare: number;
  bookingCode: string;
  etaMinutes: number;
};

export type PaymentIntent = ShuttlePaymentIntent | DirectPaymentIntent;

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  MobilityOptions: {
    routePlan: RoutePlan;
    sourceLocation: SearchableStop;
    destinationLocation: SearchableStop;
  };
  RideDetail: {
    selectedRide: "shuttle" | "cab" | "auto" | "moto";
    routePlan: RoutePlan;
    sourceLocation: SearchableStop;
    destinationLocation: SearchableStop;
  };
  ShuttleBooking: {
    pickupNode: PickupCandidate;
    dropNode: RouteStop;
    routePlan: RoutePlan;
  };
  ShuttleSeat: {
    departureTime: string;
    departureEpoch: number;
    pickupNode: PickupCandidate;
    dropNode: RouteStop;
    routePlan: RoutePlan;
    fare: number;
  };
  ShuttleSuccess: {
    bookingCode: string;
    seatNumbers: number[];
    departureTime: string;
    pickupNode: PickupCandidate;
    dropNode: RouteStop;
    routePlan: RoutePlan;
    fare: number;
    paymentMethod: PaymentMethodId;
    paymentReference: string;
  };
  DirectRideBooking: {
    selectedRide: DirectRideId;
    sourceLocation: SearchableStop;
    destinationLocation: SearchableStop;
  };
  DirectRideStatus: {
    tripId: string;
    selectedRide: DirectRideId;
    sourceLocation: SearchableStop;
    destinationLocation: SearchableStop;
    fare: number;
    paymentMethod: PaymentMethodId;
    paymentReference: string;
    bookingCode: string;
    otp: string;
  };
  Payment: {
    intent: PaymentIntent;
  };
  Help: undefined;
  History: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loaderText}>Restoring your Mobilo session</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="MobilityOptions" component={MobilityOptionsScreen} />
          <Stack.Screen name="RideDetail" component={RideDetailScreen} />
          <Stack.Screen name="ShuttleBooking" component={ShuttleBookingScreen} />
          <Stack.Screen name="ShuttleSeat" component={ShuttleSeatScreen} />
          <Stack.Screen name="ShuttleSuccess" component={ShuttleSuccessScreen} />
          <Stack.Screen name="DirectRideBooking" component={DirectRideBookingScreen} />
          <Stack.Screen name="DirectRideStatus" component={DirectRideStatusScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    marginTop: 12,
    color: colors.inkMuted,
    fontSize: 14,
    fontWeight: "600",
  },
});
