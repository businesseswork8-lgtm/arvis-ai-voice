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
    confirmed: row.confirmed,
    dismissed: false,
    savedAt: row.created_at,
    done: row.done || false,
  }));
}

export async function saveItems(items: SavedItem[]) {
  const syncKey = getSyncKey();
  const rows = items.map((item) => ({
    id: item.id,
    sync_key: syncKey,
    type: item.type,
    folder: item.folder || null,
    title: item.title,
    content: item.content || "",
    datetime: item.datetime || null,
    done: item.done || false,
    confirmed: true,
  }));

  const { error } = await supabase.from("items").upsert(rows);
  if (error) console.error("Failed to save items:", error);
}

export async function toggleItemDone(id: string) {
  // First get current state
  const { data } = await supabase.from("items").select("done").eq("id", id).single();
  if (!data) return;

  const { error } = await supabase
    .from("items")
    .update({ done: !data.done })
    .eq("id", id);
  if (error) console.error("Failed to toggle item:", error);
}

export async function clearHistory() {
  const syncKey = getSyncKey();
  const { error } = await supabase.from("items").delete().eq("sync_key", syncKey);
  if (error) console.error("Failed to clear history:", error);
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
  return [...DEFAULT_FOLDERS, ...settings.customFolders];
}
