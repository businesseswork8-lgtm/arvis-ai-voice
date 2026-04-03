import { supabase } from "@/integrations/supabase/client";
import { getSyncKey } from "./storage";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const callFunction = async (name: string, body: object) => {
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
      "apikey": ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Function error: ${res.status}`);
  return res.json();
};

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
  const data = await callFunction("google-calendar-auth", {
    action: "get_auth_url",
    sync_key: syncKey,
    redirect_uri: redirectUri,
  });
  if (data?.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data?.error || "Failed to get auth URL");
  }
}

export async function exchangeGCalCode(code: string) {
  const syncKey = getSyncKey();
  const redirectUri = `${window.location.origin}/`;
  return callFunction("google-calendar-auth", {
    action: "exchange_code",
    code,
    sync_key: syncKey,
    redirect_uri: redirectUri,
  });
}

export async function disconnectGCal() {
  const syncKey = getSyncKey();
  await callFunction("google-calendar-auth", {
    action: "disconnect",
    sync_key: syncKey,
  });
}

export async function fetchGCalEvents() {
  const syncKey = getSyncKey();
  const data = await callFunction("google-calendar-sync", {
    action: "list_events",
    sync_key: syncKey,
  });
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
  const data = await callFunction("google-calendar-sync", {
    action: "create_event",
    sync_key: syncKey,
    event: { ...event, timezone: tz },
  });
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
  const data = await callFunction("google-calendar-sync", {
    action: "update_event",
    sync_key: syncKey,
    event: { ...event, timezone: tz },
  });
  if (data.error) throw new Error(data.error);
}

export async function deleteGCalEvent(googleEventId: string) {
  const syncKey = getSyncKey();
  const data = await callFunction("google-calendar-sync", {
    action: "delete_event",
    sync_key: syncKey,
    event: { google_event_id: googleEventId },
  });
  if (data.error) throw new Error(data.error);
}
