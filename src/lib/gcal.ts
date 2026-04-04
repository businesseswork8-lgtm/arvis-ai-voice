import { supabase } from "@/integrations/supabase/client";
import { getSyncKey } from "./storage";

export async function getGCalConnection() {
  const syncKey = getSyncKey();
  const { data } = await supabase
    .from("google_calendar_connections")
    .select("google_email")
    .eq("sync_key", syncKey)
    .single();
  return data;
}

export async function startGCalAuth() {
  const syncKey = getSyncKey();
  const redirectUri = `${window.location.origin}/`;

  const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
    body: {
      action: "get_auth_url",
      sync_key: syncKey,
      redirect_uri: redirectUri,
    },
  });

  if (error) throw new Error(error.message || "Failed to start auth");
  if (data?.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data?.error || "No URL returned from auth function");
  }
}

export async function exchangeGCalCode(code: string) {
  const syncKey = getSyncKey();
  const redirectUri = `${window.location.origin}/`;
  const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
    body: { action: "exchange_code", code, sync_key: syncKey, redirect_uri: redirectUri },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function disconnectGCal() {
  const syncKey = getSyncKey();
  await supabase.functions.invoke("google-calendar-auth", {
    body: { action: "disconnect", sync_key: syncKey },
  });
}

export async function fetchGCalEvents() {
  const syncKey = getSyncKey();
  const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
    body: { action: "list_events", sync_key: syncKey },
  });
  if (error) throw new Error(error.message);
  return data?.events || [];
}

export async function createGCalEvent(event: {
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime?: string;
}) {
  const syncKey = getSyncKey();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
    body: { action: "create_event", sync_key: syncKey, event: { ...event, timezone: tz } },
  });
  if (error) throw new Error(error.message);
  return data?.google_event_id;
}

export async function updateGCalEvent(event: {
  google_event_id: string;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime?: string;
}) {
  const syncKey = getSyncKey();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
    body: { action: "update_event", sync_key: syncKey, event: { ...event, timezone: tz } },
  });
  if (error) throw new Error(error.message);
}

export async function deleteGCalEvent(googleEventId: string) {
  const syncKey = getSyncKey();
  const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
    body: { action: "delete_event", sync_key: syncKey, event: { google_event_id: googleEventId } },
  });
  if (error) throw new Error(error.message);
}

// Converts a GCal event ID string into a deterministic valid UUID (no schema migration needed)
async function gcalIdToUUID(gcalEventId: string): Promise<string> {
  const data = new TextEncoder().encode("declutter:gcal:" + gcalEventId);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const h = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${
    ["8", "9", "a", "b"][parseInt(h[16], 16) & 3]
  }${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// Syncs Google Calendar ↔ Supabase:
// - Upserts current GCal events into items table (deterministic UUID = no duplicates)
// - Deletes items that were removed from Google Calendar
export async function syncGCalToLocal(): Promise<number> {
  try {
    const syncKey = getSyncKey();
    const events = await fetchGCalEvents();

    // Upsert current GCal events
    if (events && events.length > 0) {
      const rows = await Promise.all(
        events
          .filter((e: any) => e.start?.dateTime || e.start?.date)
          .map(async (e: any) => ({
            id: await gcalIdToUUID(e.id),
            sync_key: syncKey,
            type: "Calendar Event",
            folder: null,
            title: e.summary || "(No title)",
            content: e.description || "",
            datetime: e.start?.dateTime || `${e.start?.date}T00:00:00`,
            end_datetime: e.end?.dateTime || null,
            event_color: "#4285f4",
            google_calendar_event_id: e.id,
            done: false,
            confirmed: true,
          }))
      );
      const { error } = await supabase.from("items").upsert(rows, { onConflict: "id" });
      if (error) console.error("Failed to upsert GCal events:", error);
    }

    // Delete items that no longer exist in Google Calendar
    const { data: storedGCalItems } = await supabase
      .from("items")
      .select("id, google_calendar_event_id")
      .eq("sync_key", syncKey)
      .not("google_calendar_event_id", "is", null);

    if (storedGCalItems && storedGCalItems.length > 0) {
      const liveIds = new Set((events || []).map((e: any) => e.id));
      const toDelete = storedGCalItems
        .filter((row: any) => !liveIds.has(row.google_calendar_event_id))
        .map((row: any) => row.id);
      if (toDelete.length > 0) {
        await supabase.from("items").delete().in("id", toDelete);
      }
    }

    return events?.length || 0;
  } catch (e) {
    console.error("GCal sync error:", e);
    return 0;
  }
}
