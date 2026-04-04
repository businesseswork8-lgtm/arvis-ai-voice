import { useState, useMemo } from "react";
import { useSyncedItems } from "@/hooks/useSyncedItems";
import { getAllFolders } from "@/lib/storage";
import { FolderManager } from "@/components/FolderManager";
import { ChevronLeft, Search, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

export function NotesTab() {
  const { items, loading } = useSyncedItems();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showFolderManager, setShowFolderManager] = useState(false);

  const folders = getAllFolders();
  const notes = useMemo(() => items.filter((i) => i.type === "Note"), [items]);

  const folderNotes = useMemo(() => {
    if (!selectedFolder) return [];
    let filtered = notes.filter((n) => n.folder === selectedFolder);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [notes, selectedFolder, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (selectedFolder) {
    const folder = folders.find((f) => f.key === selectedFolder);
    return (
      <div className="px-4 pt-4 pb-36 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedFolder(null); setSearch(""); }} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">{folder?.emoji}</span>
            <h1 className="text-xl font-bold text-foreground">{folder?.label}</h1>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="pl-9 bg-secondary/50 border-border text-foreground"
          />
        </div>

        <AnimatePresence mode="wait">
          {folderNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground/50 text-center py-8">
              {search ? "No matching notes" : "No notes in this folder"}
            </p>
          ) : (
            <div className="space-y-2">
              {folderNotes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-xl border border-border p-3"
                >
                  <p className="text-sm font-medium text-foreground">{note.title}</p>
                  {note.content && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.content}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-36 space-y-4">
      <div className="flex items-center justify-between pr-10">
        <h1 className="text-xl font-bold text-foreground">Notes</h1>
        <button onClick={() => setShowFolderManager(true)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {folders.map((f) => {
          const count = notes.filter((n) => n.folder === f.key).length;
          const folderColor = f.color || "#6366f1";
          return (
            <button
              key={f.key}
              onClick={() => setSelectedFolder(f.key)}
              className="rounded-xl border border-border p-4 flex flex-col items-start gap-2 text-left transition-colors hover:bg-secondary/30"
              style={{ backgroundColor: `${folderColor}08`, borderColor: `${folderColor}30` }}
            >
              <span className="text-2xl">{f.emoji}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground">{count} notes</p>
              </div>
            </button>
          );
        })}
      </div>

      <FolderManager
        open={showFolderManager}
        onOpenChange={setShowFolderManager}
        onFoldersChanged={() => {}}
      />
    </div>
  );
}
