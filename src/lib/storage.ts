import { SavedItem, AppSettings, FolderDef, DEFAULT_FOLDERS } from "./types";

const HISTORY_KEY = "declutter_history";
const SETTINGS_KEY = "declutter_settings";

export function getHistory(): SavedItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveItems(items: SavedItem[]) {
  const existing = getHistory();
  localStorage.setItem(HISTORY_KEY, JSON.stringify([...items, ...existing]));
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    apiKey: "",
    model: "openai/gpt-oss-120b:free",
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
