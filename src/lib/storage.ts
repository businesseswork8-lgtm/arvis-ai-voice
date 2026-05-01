import { supabase } from "@/integrations/supabase/client";
import { SavedItem, AppSettings, FolderDef, DEFAULT_FOLDERS } from "./types";

const SETTINGS_KEY = "declutter_settings";

// ─── Auth helper ─────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ─── Items (Supabase) ────────────────────────────────────

export async function getHistory(): Promise<SavedItem[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", userId)
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
export function localDatetimeToISO(datetime: string | null | undefined): string | null {
  if (!datetime) return null;
  if (/Z$|[+-]\d{2}:\d{2}$/.test(datetime)) return datetime;
  const offsetMin = new Date().getTimezoneOffset();
  const sign = offsetMin <= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${datetime}${sign}${hh}:${mm}`;
}

export async function saveItems(items: SavedItem[]) {
  const userId = await getUserId();
  if (!userId) {
    console.error("saveItems: no user");
    return;
  }
  const rows = items.map((item) => ({
    id: item.id,
    user_id: userId,
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

  const { error } = await supabase.from("items").upsert(rows as any);
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
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase.from("items").delete().eq("user_id", userId);
  if (error) console.error("Failed to clear history:", error);
  else window.dispatchEvent(new CustomEvent("items-updated"));
}

// ─── User Settings (Supabase) ────────────────────────────

export async function getUserSettings(): Promise<{ apiKey: string; model: string }> {
  const userId = await getUserId();
  if (!userId) return { apiKey: "", model: "gemini-2.0-flash" };
  const { data } = await supabase
    .from("user_settings")
    .select("api_key, model")
    .eq("user_id", userId)
    .maybeSingle();
  return { apiKey: data?.api_key || "", model: data?.model || "gemini-2.0-flash" };
}

export async function saveUserSettings(apiKey: string, model: string) {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, api_key: apiKey, model }, { onConflict: "user_id" });
  if (error) console.error("Failed to save user settings:", error);
}

// ─── Local app settings (folders only — device-specific) ─

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
  const userId = await getUserId();
  if (!userId) return {};
  const { data, error } = await supabase
    .from("items")
    .select("folder, title")
    .eq("user_id", userId)
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
