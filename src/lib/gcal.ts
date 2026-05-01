import { supabase } from "@/integrations/supabase/client";

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getGCalConnection() {
  const userId = await getUserId();
  if (!userId) return null;
  const { data } = await supabase
    .from("google_calendar_connections")
    .select("google_email")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function startGCalAuth() {
  const userId = await getUserId();
  if (!userId) throw new Error("Not signed in");
  const redirectUri = `${window.location.origin}/`;

  const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
    body: {
      action: "get_auth_url",
      user_id: userId,
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
  const userId = await getUserId();
  if (!userId) throw new Error("Not signed in");
  const redirectUri = `${window.location.origin}/`;
  const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
    body: { action: "exchange_code", code, user_id: userId, redirect_uri: redirectUri },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function disconnectGCal() {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.functions.invoke("google-calendar-auth", {
    body: { action: "disconnect", user_id: userId },
  });
}

export async function fetchGCalEvents() {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
    body: { action: "list_events", user_id: userId },
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
  const userId = await getUserId();
  if (!userId) return null;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
    body: { action: "create_event", user_id: userId, event: { ...event, timezone: tz } },
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
  const userId = await getUserId();
  if (!userId) return;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { error } = await supabase.functions.invoke("google-calendar-sync", {
    body: { action: "update_event", user_id: userId, event: { ...event, timezone: tz } },
  });
  if (error) throw new Error(error.message);
}

export async function deleteGCalEvent(googleEventId: string) {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase.functions.invoke("google-calendar-sync", {
    body: { action: "delete_event", user_id: userId, event: { google_event_id: googleEventId } },
  });
  if (error) throw new Error(error.message);
}

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

export async function syncGCalToLocal(): Promise<number> {
  try {
    const userId = await getUserId();
    if (!userId) return 0;
    const events = await fetchGCalEvents();

    if (events && events.length > 0) {
      const rows = await Promise.all(
        events
          .filter((e: any) => e.start?.dateTime || e.start?.date)
          .map(async (e: any) => ({
            id: await gcalIdToUUID(e.id),
            user_id: userId,
            type: "Calendar Event",
            folder: null,
            title: e.summary || "(No title)",
            content: e.description || "",
            datetime: e.start?.dateTime || `${e.start?.date}T00:00:00`,
            end_datetime: e.end?.dateTime || null,
            event_color: "#93c5fd",
            google_calendar_event_id: e.id,
            done: false,
            confirmed: true,
          }))
      );
      const { error } = await supabase.from("items").upsert(rows as any, { onConflict: "id" });
      if (error) {
        console.error("Failed to upsert GCal events:", error.message, error.details, error.hint);
      } else {
        // Notify all tabs to re-fetch so GCal events appear immediately
        window.dispatchEvent(new CustomEvent("items-updated"));
      }
    }

    const { data: storedGCalItems } = await supabase
      .from("items")
      .select("id, google_calendar_event_id")
      .eq("user_id", userId)
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
