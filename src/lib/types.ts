export type ItemType = "Task" | "Reminder" | "Calendar Event" | "Note";

export type FolderKey =
  | "notes"
  | "business"
  | "marketing"
  | "ideas"
  | "personal";

export const FOLDER_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
] as const;

export const EVENT_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
] as const;

export interface FolderDef {
  key: string;
  label: string;
  emoji: string;
  color?: string;
}

export const DEFAULT_FOLDERS: FolderDef[] = [
  { key: "notes", label: "Notes", emoji: "📝", color: "#eab308" },
  { key: "business", label: "Business", emoji: "💼", color: "#6366f1" },
  { key: "marketing", label: "Marketing", emoji: "📢", color: "#ec4899" },
  { key: "ideas", label: "Ideas", emoji: "💡", color: "#8b5cf6" },
  { key: "personal", label: "Personal", emoji: "👤", color: "#ef4444" },
];

export interface ExtractedItem {
  id: string;
  type: ItemType;
  folder: string;
  title: string;
  content: string;
  datetime?: string;
  end_datetime?: string;
  event_color?: string;
  confidence?: string;
  confirmed: boolean;
  dismissed: boolean;
}

export interface SavedItem extends ExtractedItem {
  savedAt: string;
  done?: boolean;
}

export interface AppSettings {
  apiKey: string;
  model: string;
  customFolders: FolderDef[];
}
