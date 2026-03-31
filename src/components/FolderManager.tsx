import { useState } from "react";
import { FolderDef, DEFAULT_FOLDERS, FOLDER_COLORS } from "@/lib/types";
import { getSettings, saveSettings, getAllFolders } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X, Pencil, Trash2, Plus, Check } from "lucide-react";
import { toast } from "sonner";

const EMOJI_OPTIONS = [
  "📅", "✅", "📝", "⏰", "💼", "📢", "💡", "👤",
  "🎯", "🚀", "📊", "🎨", "🏠", "❤️", "⭐", "🔥",
  "📱", "💻", "🎵", "📸", "🍽️", "✈️", "🏋️", "📚",
  "🛒", "💰", "🔧", "🎮", "🌍", "🤝", "📦", "🎉",
];

interface FolderManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFoldersChanged: () => void;
}

export function FolderManager({ open, onOpenChange, onFoldersChanged }: FolderManagerProps) {
  const [editingFolder, setEditingFolder] = useState<FolderDef | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("📁");
  const [color, setColor] = useState(FOLDER_COLORS[0]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const folders = getAllFolders();

  const startEdit = (folder: FolderDef) => {
    setEditingFolder(folder);
    setLabel(folder.label);
    setEmoji(folder.emoji);
    setColor(folder.color || FOLDER_COLORS[0]);
    setIsCreating(false);
    setShowEmojiPicker(false);
  };

  const startCreate = () => {
    setEditingFolder(null);
    setLabel("");
    setEmoji("📁");
    setColor(FOLDER_COLORS[0]);
    setIsCreating(true);
    setShowEmojiPicker(false);
  };

  const saveFolder = () => {
    if (!label.trim()) return;
    const settings = getSettings();

    if (isCreating) {
      const key = label.toLowerCase().replace(/\s+/g, "-");
      const newFolder: FolderDef = { key, label: label.trim(), emoji, color };
      saveSettings({ ...settings, customFolders: [...settings.customFolders, newFolder] });
      toast.success("Folder created");
    } else if (editingFolder) {
      const isDefault = DEFAULT_FOLDERS.some((d) => d.key === editingFolder.key);
      if (isDefault) {
        // For default folders, store as override in customFolders
        const existing = settings.customFolders.filter((f) => f.key !== editingFolder.key);
        saveSettings({
          ...settings,
          customFolders: [...existing, { key: editingFolder.key, label: label.trim(), emoji, color }],
        });
      } else {
        const updated = settings.customFolders.map((f) =>
          f.key === editingFolder.key ? { ...f, label: label.trim(), emoji, color } : f
        );
        saveSettings({ ...settings, customFolders: updated });
      }
      toast.success("Folder updated");
    }

    setEditingFolder(null);
    setIsCreating(false);
    onFoldersChanged();
  };

  const removeFolder = (key: string) => {
    const settings = getSettings();
    const isDefault = DEFAULT_FOLDERS.some((d) => d.key === key);
    if (isDefault) {
      // Remove override and mark as deleted by adding a special flag
      const updated = settings.customFolders.filter((f) => f.key !== key);
      // We'll just remove the override - default folders can't truly be deleted
      // but we'll allow it by storing a "deleted" list
      const deletedFolders = JSON.parse(localStorage.getItem("declutter_deleted_folders") || "[]");
      deletedFolders.push(key);
      localStorage.setItem("declutter_deleted_folders", JSON.stringify(deletedFolders));
      saveSettings({ ...settings, customFolders: updated });
    } else {
      saveSettings({ ...settings, customFolders: settings.customFolders.filter((f) => f.key !== key) });
    }
    toast.success("Folder deleted");
    onFoldersChanged();
  };

  const isEditing = isCreating || editingFolder;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl bg-background border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground">Manage Folders</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(85vh-120px)] pb-6">
          {isEditing ? (
            <div className="space-y-4 bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">
                {isCreating ? "New Folder" : "Edit Folder"}
              </h3>

              {/* Emoji picker */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Emoji</label>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl hover:bg-secondary/80 transition-colors"
                >
                  {emoji}
                </button>
                {showEmojiPicker && (
                  <div className="grid grid-cols-8 gap-1 bg-secondary/50 rounded-xl p-2">
                    {EMOJI_OPTIONS.map((e) => (
                      <button
                        key={e}
                        onClick={() => { setEmoji(e); setShowEmojiPicker(false); }}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg hover:bg-secondary transition-colors ${
                          emoji === e ? "bg-primary/20 ring-1 ring-primary" : ""
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Name</label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Folder name"
                  className="bg-secondary/50 border-border text-foreground"
                />
              </div>

              {/* Color picker */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Color</label>
                <div className="flex gap-2">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveFolder} className="flex-1">Save</Button>
                <Button
                  variant="ghost"
                  onClick={() => { setEditingFolder(null); setIsCreating(false); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {folders.map((folder) => {
                const deleted = JSON.parse(localStorage.getItem("declutter_deleted_folders") || "[]");
                if (deleted.includes(folder.key)) return null;
                return (
                  <div
                    key={folder.key}
                    className="flex items-center justify-between bg-card rounded-xl border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${folder.color || "#6366f1"}20` }}
                      >
                        {folder.emoji}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{folder.label}</p>
                        <div className="w-3 h-3 rounded-full mt-0.5" style={{ backgroundColor: folder.color || "#6366f1" }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(folder)}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => removeFolder(folder.key)}
                        className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <Button onClick={startCreate} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Folder
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
