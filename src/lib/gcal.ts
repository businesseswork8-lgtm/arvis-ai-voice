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

// Pulls events from Google Calendar and upserts them into Supabase items table
// Note: skips getGCalConnection() pre-check since anon client may be blocked by RLS
// The edge function handles auth validation using service role key
export async function syncGCalToLocal(): Promise<number> {
  try {
    const events = await fetchGCalEvents();
    if (!events.length) return 0;

    const syncKey = getSyncKey();
    const rows = events
      .filter((e: any) => e.start?.dateTime || e.start?.date)
      .map((e: any) => ({
        id: `gcal_${e.id}`,
        sync_key: syncKey,
        type: "Calendar Event",
        folder: null,
        title: e.summary || "(No title)",
        content: e.description || "",
        datetime: e.start?.dateTime || `${e.start?.date}T00:00:00`,
        end_datetime: e.end?.dateTime || null,
        event_color: "#4285f4",
        done: false,
        confirmed: true,
      }));

    const { error } = await supabase.from("items").upsert(rows, { onConflict: "id" });
    if (error) console.error("Failed to sync GCal events:", error);
    return rows.length;
  } catch (e) {
    console.error("GCal sync error:", e);
    return 0;
  }
}
