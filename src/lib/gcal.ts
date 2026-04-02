import { supabase } from "@/integrations/supabase/client";
import { getSyncKey } from "./storage";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FUNCTIONS_URL = `https://${PROJECT_ID}.supabase.co/functions/v1`;

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

  const res = await fetch(`${FUNCTIONS_URL}/google-calendar-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "get_auth_url",
      sync_key: syncKey,
      redirect_uri: redirectUri,
    }),
  });

  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data.error || "Failed to get auth URL");
  }
}

export async function exchangeGCalCode(code: string) {
  const syncKey = getSyncKey();
  const redirectUri = `${window.location.origin}/`;

  const res = await fetch(`${FUNCTIONS_URL}/google-calendar-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "exchange_code",
      code,
      sync_key: syncKey,
      redirect_uri: redirectUri,
    }),
  });

  return await res.json();
}

export async function disconnectGCal() {
  const syncKey = getSyncKey();
  await fetch(`${FUNCTIONS_URL}/google-calendar-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "disconnect",
      sync_key: syncKey,
    }),
  });
}

export async function fetchGCalEvents() {
  const syncKey = getSyncKey();
  const res = await fetch(`${FUNCTIONS_URL}/google-calendar-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "list_events",
      sync_key: syncKey,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.events || [];
}

export async function createGCalEvent(event: {
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime?: string;
}) {
  const syncKey = getSyncKey();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const res = await fetch(`${FUNCTIONS_URL}/google-calendar-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create_event",
      sync_key: syncKey,
      event: { ...event, timezone: tz },
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.google_event_id;
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
  const res = await fetch(`${FUNCTIONS_URL}/google-calendar-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "update_event",
      sync_key: syncKey,
      event: { ...event, timezone: tz },
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
}

export async function deleteGCalEvent(googleEventId: string) {
  const syncKey = getSyncKey();
  const res = await fetch(`${FUNCTIONS_URL}/google-calendar-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "delete_event",
      sync_key: syncKey,
      event: { google_event_id: googleEventId },
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
}
