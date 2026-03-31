export type ItemType = "Task" | "Reminder" | "Calendar Event" | "Note";

export type FolderKey =
  | "calendar"
  | "tasks"
  | "notes"
  | "reminders"
  | "business"
  | "marketing"
  | "ideas"
  | "personal";

export interface FolderDef {
  key: string;
  label: string;
  emoji: string;
}

export const DEFAULT_FOLDERS: FolderDef[] = [
  { key: "calendar", label: "Calendar", emoji: "📅" },
  { key: "tasks", label: "Tasks", emoji: "✅" },
  { key: "notes", label: "Notes", emoji: "📝" },
  { key: "reminders", label: "Reminders", emoji: "⏰" },
  { key: "business", label: "Business", emoji: "💼" },
  { key: "marketing", label: "Marketing", emoji: "📢" },
  { key: "ideas", label: "Ideas", emoji: "💡" },
  { key: "personal", label: "Personal", emoji: "👤" },
];

export interface ExtractedItem {
  id: string;
  type: ItemType;
  folder: string;
  title: string;
  content: string;
  datetime?: string;
  confirmed: boolean;
  dismissed: boolean;
}

export interface SavedItem extends ExtractedItem {
  savedAt: string;
}

export interface AppSettings {
  apiKey: string;
  model: string;
  customFolders: FolderDef[];
}
