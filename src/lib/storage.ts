import { supabase } from "@/integrations/supabase/client";
import { SavedItem, AppSettings, FolderDef, DEFAULT_FOLDERS } from "./types";

const SETTINGS_KEY = "declutter_settings";
const SYNC_KEY_KEY = "declutter_sync_key";

// ─── Sync Key ────────────────────────────────────────────

export function getSyncKey(): string {
  let key = localStorage.getItem(SYNC_KEY_KEY);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(SYNC_KEY_KEY, key);
  }
  return key;
}

export function setSyncKey(key: string) {
  localStorage.setItem(SYNC_KEY_KEY, key);
}

// ─── Items (Supabase) ────────────────────────────────────

export async function getHistory(): Promise<SavedItem[]> {
  const syncKey = getSyncKey();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("sync_key", syncKey)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch items:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    type: row.type,
    folder: row.folder || "",
    title: row.title,
    content: row.content || "",
    datetime: row.datetime || undefined,
    end_datetime: row.end_datetime || undefined,
    event_color: row.event_color || undefined,
    google_calendar_event_id: row.google_calendar_event_id || undefined,
    parent_id: row.parent_id || undefined,
    confirmed: row.confirmed,
    dismissed: false,
    savedAt: row.created_at,
    done: row.done || false,
  }));
}
// ─── Timezone helper ─────────────────────────────────────
// Supabase timestamptz columns: if we save "2026-05-02T09:00:00" with no offset,
// Postgres assumes UTC — which makes 9 AM show as 2:30 PM in IST (UTC+5:30).
// This helper stamps the LOCAL timezone offset onto bare datetime strings.
export function localDatetimeToISO(datetime: string | null | undefined): string | null {
  if (!datetime) return null;
  // Already has timezone info (Z, +HH:MM, -HH:MM) — leave unchanged
  if (/Z$|[+-]\d{2}:\d{2}$/.test(datetime)) return datetime;
  // No offset — add local offset so Postgres stores the right UTC equivalent
  const offsetMin = new Date().getTimezoneOffset(); // e.g. -330 for IST
  const sign = offsetMin <= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${datetime}${sign}${hh}:${mm}`;
}


export async function saveItems(items: SavedItem[]) {
  const syncKey = getSyncKey();
  const rows = items.map((item) => ({
    id: item.id,
    sync_key: syncKey,
    type: item.type,
    folder: item.type === "Note" ? (item.folder || null) : null,
    title: item.title,
    content: item.content || "",
    datetime: localDatetimeToISO(item.datetime),
    end_datetime: localDatetimeToISO(item.end_datetime),
    event_color: item.event_color || null,
    done: item.done || false,
    confirmed: true,
  }));

  const { error } = await supabase.from("items").upsert(rows);
  if (error) console.error("Failed to save items:", error);
  else window.dispatchEvent(new CustomEvent("items-updated"));
}

export async function toggleItemDone(id: string) {
  const { data } = await supabase.from("items").select("done").eq("id", id).single();
  if (!data) return;

  const { error } = await supabase
    .from("items")
    .update({ done: !data.done })
    .eq("id", id);
  if (error) console.error("Failed to toggle item:", error);
  else window.dispatchEvent(new CustomEvent("items-updated"));
}

export async function updateItem(id: string, updates: Record<string, any>) {
  // Fix timezone for any datetime fields in updates
  const sanitized = { ...updates };
  if ("datetime" in sanitized) sanitized.datetime = localDatetimeToISO(sanitized.datetime);
  if ("end_datetime" in sanitized) sanitized.end_datetime = localDatetimeToISO(sanitized.end_datetime);
  const { error } = await supabase.from("items").update(sanitized).eq("id", id);
  if (error) console.error("Failed to update item:", error);
  else window.dispatchEvent(new CustomEvent("items-updated"));
}

export async function deleteItem(id: string) {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) console.error("Failed to delete item:", error);
  else window.dispatchEvent(new CustomEvent("items-updated"));
}

export async function clearHistory() {
  const syncKey = getSyncKey();
  const { error } = await supabase.from("items").delete().eq("sync_key", syncKey);
  if (error) console.error("Failed to clear history:", error);
  else window.dispatchEvent(new CustomEvent("items-updated"));
}

// ─── Settings (localStorage only — device-specific) ─────

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    apiKey: "",
    model: "gemini-2.0-flash",
    customFolders: [],
  };
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function getAllFolders(): FolderDef[] {
  const settings = getSettings();
  const deletedFolders: string[] = JSON.parse(localStorage.getItem("declutter_deleted_folders") || "[]");
  const defaults = DEFAULT_FOLDERS
    .filter((df) => !deletedFolders.includes(df.key))
    .map((df) => {
      const override = settings.customFolders.find((f) => f.key === df.key);
      return override ? { ...df, ...override } : df;
    });
  const customKeys = new Set(DEFAULT_FOLDERS.map((f) => f.key));
  const custom = settings.customFolders.filter((f) => !customKeys.has(f.key) && !deletedFolders.includes(f.key));
  return [...defaults, ...custom];
}

export function getFolderColor(folderKey: string): string {
  const folders = getAllFolders();
  const folder = folders.find((f) => f.key === folderKey);
  return folder?.color || "#6366f1";
}

// ─── Recent notes per folder (for AI context) ────────────
export async function getRecentNotesByFolder(): Promise<Record<string, string[]>> {
  const syncKey = getSyncKey();
  const { data, error } = await supabase
    .from("items")
    .select("folder, title")
    .eq("sync_key", syncKey)
    .eq("type", "Note")
    .eq("confirmed", true)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) return {};

  const result: Record<string, string[]> = {};
  for (const row of data) {
    const folder = row.folder || "personal";
    if (!result[folder]) result[folder] = [];
    if (result[folder].length < 10) result[folder].push(row.title);
  }
  return result;
}
