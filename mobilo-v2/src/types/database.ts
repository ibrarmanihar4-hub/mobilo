export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          accent: string
          booking_code: string
          created_at: string
          fare: string
          icon: string
          id: string
          ride_type: string
          route: string
          status: string
          time: string
          title: string
          user_id: string
        }
        Insert: {
          accent: string
          booking_code: string
          created_at?: string
          fare: string
          icon: string
          id: string
          ride_type: string
          route: string
          status: string
          time: string
          title: string
          user_id: string
        }
        Update: {
          accent?: string
          booking_code?: string
          created_at?: string
          fare?: string
          icon?: string
          id?: string
          ride_type?: string
          route?: string
          status?: string
          time?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string
          current_lat: number | null
          current_lng: number | null
          full_name: string
          heading: number | null
          id: string
          location: unknown
          location_at: string | null
          phone: string | null
          rating: number
          ride_type: string
          status: string
          updated_at: string
          vehicle_label: string
          vehicle_plate: string
        }
        Insert: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          full_name?: string
          heading?: number | null
          id: string
          location?: unknown
          location_at?: string | null
          phone?: string | null
          rating?: number
          ride_type?: string
          status?: string
          updated_at?: string
          vehicle_label?: string
          vehicle_plate?: string
        }
        Update: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          full_name?: string
          heading?: number | null
          id?: string
          location?: unknown
          location_at?: string | null
          phone?: string | null
          rating?: number
          ride_type?: string
          status?: string
          updated_at?: string
          vehicle_label?: string
          vehicle_plate?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_code: string
          created_at: string
          currency: string
          gateway: string
          gateway_order_id: string | null
          gateway_payment_id: string | null
          id: string
          method: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_code: string
          created_at?: string
          currency?: string
          gateway?: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          method: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_code?: string
          created_at?: string
          currency?: string
          gateway?: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          method?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      seat_reservations: {
        Row: {
          booking_code: string | null
          created_at: string
          departure_key: string
          id: string
          seat_number: number
          user_id: string
        }
        Insert: {
          booking_code?: string | null
          created_at?: string
          departure_key: string
          id?: string
          seat_number: number
          user_id: string
        }
        Update: {
          booking_code?: string | null
          created_at?: string
          departure_key?: string
          id?: string
          seat_number?: number
          user_id?: string
        }
        Relationships: []
      }
      trip_offers: {
        Row: {
          distance_m: number | null
          driver_id: string
          expires_at: string
          id: string
          offered_at: string
          responded_at: string | null
          status: string
          trip_id: string
        }
        Insert: {
          distance_m?: number | null
          driver_id: string
          expires_at?: string
          id?: string
          offered_at?: string
          responded_at?: string | null
          status?: string
          trip_id: string
        }
        Update: {
          distance_m?: number | null
          driver_id?: string
          expires_at?: string
          id?: string
          offered_at?: string
          responded_at?: string | null
          status?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_offers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_offers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          booking_code: string
          cancelled_by: string | null
          created_at: string
          driver_id: string | null
          drop_lat: number
          drop_lng: number
          drop_name: string
          fare: number
          id: string
          otp: string
          payment_status: string
          pickup_lat: number
          pickup_lng: number
          pickup_location: unknown
          pickup_name: string
          ride_type: string
          rider_id: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_code: string
          cancelled_by?: string | null
          created_at?: string
          driver_id?: string | null
          drop_lat: number
          drop_lng: number
          drop_name: string
          fare: number
          id?: string
          otp: string
          payment_status?: string
          pickup_lat: number
          pickup_lng: number
          pickup_location?: unknown
          pickup_name: string
          ride_type: string
          rider_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_code?: string
          cancelled_by?: string | null
          created_at?: string
          driver_id?: string | null
          drop_lat?: number
          drop_lng?: number
          drop_name?: string
          fare?: number
          id?: string
          otp?: string
          payment_status?: string
          pickup_lat?: number
          pickup_lng?: number
          pickup_location?: unknown
          pickup_name?: string
          ride_type?: string
          rider_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dispatch_find_drivers: {
        Args: { p_limit?: number; p_radius_m?: number; p_trip_id: string }
        Returns: {
          distance_m: number
          driver_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
