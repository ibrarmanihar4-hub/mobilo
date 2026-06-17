// Realtime Broadcast channel for live driver location (Phase 2).
//
// Why broadcast instead of DB writes:
//   The old approach wrote driver GPS to the `drivers` table every few
//   seconds and every rider subscribed via postgres_changes. That puts the
//   full live-tracking load on Postgres + replication - it does not scale.
//
//   Supabase Realtime Broadcast sends messages peer-to-peer through the
//   Realtime server WITHOUT touching the database. We use a per-trip channel
//   so only the rider on that trip receives the driver's position.
//
// We still persist a LOW-frequency snapshot to the `drivers` table (handled
// by the caller) for two reasons:
//   1. dispatch_find_drivers needs a roughly-fresh drivers.location.
//   2. If the rider app (re)opens mid-trip, it can seed the initial marker
//      from the DB before the next broadcast arrives.

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";

export interface LocationPayload {
  lat: number;
  lng: number;
  heading: number | null;
  at: number; // epoch ms, for staleness checks on the rider side
}

const LOC_EVENT = "loc";

export function tripLocationTopic(tripId: string): string {
  return `trip-loc:${tripId}`;
}

/**
 * Driver-side broadcaster. Joins the trip's location channel and exposes a
 * `send` to push the latest position. Call `close()` when the trip ends.
 */
export class DriverLocationBroadcaster {
  private channel: RealtimeChannel | null = null;
  private ready = false;

  constructor(private readonly tripId: string) {}

  start(): void {
    if (!isSupabaseConfigured || this.channel) return;
    const client = getSupabase();
    this.channel = client.channel(tripLocationTopic(this.tripId), {
      // private:true gates the channel by the realtime.messages RLS policies
      // (only the assigned driver may send). Requires "Allow public access"
      // to be disabled in Realtime Settings to be enforced.
      config: { private: true, broadcast: { ack: false, self: false } },
    });
    this.channel.subscribe((status) => {
      this.ready = status === "SUBSCRIBED";
    });
  }

  send(payload: LocationPayload): void {
    if (!this.channel || !this.ready) return;
    void this.channel.send({
      type: "broadcast",
      event: LOC_EVENT,
      payload,
    });
  }

  close(): void {
    if (this.channel) {
      void getSupabase().removeChannel(this.channel);
      this.channel = null;
      this.ready = false;
    }
  }
}

export { LOC_EVENT };
