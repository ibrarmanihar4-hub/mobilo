import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { fetchBookings, saveBooking } from "../services/bookingsRepo";
import { isSupabaseConfigured } from "../services/supabase";

export type BookingRideType = "shuttle" | "cab" | "auto" | "moto";

export type BookingHistoryItem = {
  id: string;
  bookingCode: string;
  rideType: BookingRideType;
  title: string;
  route: string;
  time: string;
  fare: string;
  status: "Completed" | "Ongoing";
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  accent: string;
  createdAt: number;
};

type AddBookingInput = Omit<BookingHistoryItem, "id" | "createdAt">;

interface BookingHistoryContextValue {
  bookings: BookingHistoryItem[];
  addBooking: (booking: AddBookingInput) => void;
  clearBookings: () => Promise<void>;
}

const STORAGE_KEY = "@mobilo-v2/booking-history";

const BookingHistoryContext = createContext<BookingHistoryContextValue | undefined>(
  undefined
);

export function BookingHistoryProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<BookingHistoryItem[]>([]);

  // Hydrate from AsyncStorage so trips survive app restarts. If Supabase
  // is configured, also pull the latest from the cloud and merge.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const local = raw ? (JSON.parse(raw) as BookingHistoryItem[]) : [];

        let merged = local;
        if (isSupabaseConfigured) {
          try {
            const remote = await fetchBookings();
            const seen = new Set<string>();
            merged = [...remote, ...local].filter((item) => {
              if (seen.has(item.bookingCode)) return false;
              seen.add(item.bookingCode);
              return true;
            });
          } catch {
            // ignore cloud failure, keep local
          }
        }

        if (cancelled) return;
        setBookings(
          merged.sort((left, right) => right.createdAt - left.createdAt)
        );
      } catch {
        // ignore corrupt storage
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (list: BookingHistoryItem[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // best effort
    }
  }, []);

  const addBooking = useCallback(
    (booking: AddBookingInput) => {
      setBookings((current) => {
        const alreadyExists = current.some(
          (item) => item.bookingCode === booking.bookingCode
        );

        if (alreadyExists) {
          return current;
        }

        const next: BookingHistoryItem = {
          ...booking,
          id: `history-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          createdAt: Date.now(),
        };

        const sorted = [next, ...current].sort(
          (left, right) => right.createdAt - left.createdAt
        );
        void persist(sorted);
        if (isSupabaseConfigured) {
          void saveBooking(next).catch(() => undefined);
        }
        return sorted;
      });
    },
    [persist]
  );

  const clearBookings = useCallback(async () => {
    setBookings([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ bookings, addBooking, clearBookings }),
    [addBooking, bookings, clearBookings]
  );

  return (
    <BookingHistoryContext.Provider value={value}>
      {children}
    </BookingHistoryContext.Provider>
  );
}

export function useBookingHistory() {
  const context = useContext(BookingHistoryContext);

  if (!context) {
    throw new Error("useBookingHistory must be used within BookingHistoryProvider.");
  }

  return context;
}
