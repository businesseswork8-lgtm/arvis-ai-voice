import { useState, useMemo } from "react";
import { useSyncedItems } from "@/hooks/useSyncedItems";
import { getAllFolders } from "@/lib/storage";
import { deleteItem } from "@/lib/storage";
import { FolderManager } from "@/components/FolderManager";
import { ChevronLeft, Search, Settings2, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { SavedItem } from "@/lib/types";
import { toast } from "sonner";

export function NotesTab() {
  const { items, loading } = useSyncedItems();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<SavedItem | null>(null);
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
    return filtered.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }, [notes, selectedFolder, search]);

  const handleDelete = async (id: string) => {
    await deleteItem(id);
    toast.success("Note deleted");
    if (selectedNote?.id === id) setSelectedNote(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#ff00ff", borderTopColor: "transparent" }} />
      </div>
    );
  }

  // Full note detail view
  if (selectedNote) {
    const folder = folders.find((f) => f.key === selectedNote.folder);
    return (
      <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
        className="flex flex-col min-h-screen pb-36" style={{ background: "#000" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-12 pb-4 border-b" style={{ borderColor: "#111" }}>
          <button onClick={() => setSelectedNote(null)}
            className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#111", border: "1px solid #222" }}>
            <ChevronLeft className="w-4 h-4 text-zinc-400" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-base">{folder?.emoji}</span>
            <span className="text-sm text-zinc-400">{folder?.label}</span>
          </div>
          <button onClick={() => handleDelete(selectedNote.id)}
            className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1a0505", border: "1px solid rgba(239,68,68,0.2)" }}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>

        {/* Note content */}
        <div className="flex-1 px-5 pt-6 space-y-4">
          <p className="text-[11px] text-zinc-600 tracking-widest uppercase">
            {format(parseISO(selectedNote.savedAt), "EEEE, MMMM d · h:mm a")}
          </p>
          <h1 className="text-2xl font-bold text-white leading-tight">{selectedNote.title}</h1>
          {selectedNote.content && (
            <div className="pt-2">
              <div className="w-full h-px mb-5" style={{ background: "#1a1a1a" }} />
              <p className="text-base text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {selectedNote.content}
              </p>
            </div>
          )}
          {!selectedNote.content && (
            <p className="text-zinc-600 italic text-sm">No additional content</p>
          )}
        </div>
      </motion.div>
    );
  }

  // Folder note list view
  if (selectedFolder) {
    const folder = folders.find((f) => f.key === selectedFolder);
    const folderColor = folder?.color || "#ff00ff";
    return (
      <div className="pb-36 pt-2">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-5 pb-4">
          <button onClick={() => { setSelectedFolder(null); setSearch(""); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#111", border: "1px solid #222" }}>
            <ChevronLeft className="w-4 h-4 text-zinc-400" />
          </button>
          <span className="text-xl">{folder?.emoji}</span>
          <div className="flex-1">
            <p className="label-caps mb-0.5">NOTES</p>
            <h1 className="text-xl font-bold text-white">{folder?.label}</h1>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${folderColor}15`, color: folderColor }}>
            {folderNotes.length}
          </span>
        </div>

        {/* Search */}
        <div className="mx-4 mb-4 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
          <Search className="w-4 h-4 text-zinc-600 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="flex-1 bg-transparent text-white placeholder-zinc-600 focus:outline-none"
            style={{ fontSize: "16px" }}
          />
          {search && (
            <button onClick={() => setSearch("")}><X className="w-4 h-4 text-zinc-600" /></button>
          )}
        </div>

        {/* Notes list */}
        <div className="px-4 space-y-2">
          <AnimatePresence>
            {folderNotes.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <span className="text-3xl mb-3">{folder?.emoji}</span>
                <p className="text-zinc-400 font-medium">{search ? "No matching notes" : "No notes yet"}</p>
                <p className="text-zinc-600 text-sm mt-1">Use the mic to capture a note</p>
              </div>
            ) : (
              folderNotes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => setSelectedNote(note)}
                  className="rounded-xl px-4 py-4 cursor-pointer active:scale-[0.98] transition-transform relative overflow-hidden"
                  style={{ background: "#0a0a0a", border: `1px solid ${folderColor}18` }}
                >
                  {/* Left accent bar */}
                  <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full" style={{ backgroundColor: folderColor }} />

                  <div className="pl-3">
                    <p className="text-sm font-semibold text-white mb-1 leading-tight">{note.title}</p>
                    {note.content && (
                      <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-2">{note.content}</p>
                    )}
                    <p className="text-[10px] text-zinc-700">
                      {format(parseISO(note.savedAt), "MMM d, yyyy · h:mm a")}
                    </p>
                  </div>

                  {/* Tap hint */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <ChevronLeft className="w-4 h-4 text-zinc-700 rotate-180" />
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Folder grid view (main)
  return (
    <div className="pb-36 pt-2">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <div>
          <p className="label-caps mb-1">NOTES</p>
          <h1 className="text-2xl font-bold text-white">Folders</h1>
        </div>
        <button onClick={() => setShowFolderManager(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#111", border: "1px solid #222" }}>
          <Settings2 className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      {/* Folder grid */}
      <div className="px-4 grid grid-cols-2 gap-3">
        {folders.map((f) => {
          const count = notes.filter((n) => n.folder === f.key).length;
          const folderColor = f.color || "#6366f1";
          const recent = notes.filter((n) => n.folder === f.key)
            .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0];
          return (
            <button
              key={f.key}
              onClick={() => setSelectedFolder(f.key)}
              className="rounded-2xl p-4 flex flex-col items-start gap-3 text-left transition-all active:scale-[0.96] relative overflow-hidden"
              style={{ background: "#0a0a0a", border: `1px solid ${folderColor}22`, minHeight: "130px" }}
            >
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${folderColor}, transparent)` }} />

              <span className="text-2xl">{f.emoji}</span>
              <div className="flex-1 w-full">
                <p className="text-sm font-semibold text-white">{f.label}</p>
                <p className="text-xs mt-0.5" style={{ color: folderColor }}>
                  {count} {count === 1 ? "note" : "notes"}
                </p>
                {recent && (
                  <p className="text-[10px] text-zinc-600 mt-1.5 line-clamp-1">{recent.title}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {notes.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center px-8 mt-4">
          <p className="text-zinc-400 font-medium">No notes yet</p>
          <p className="text-zinc-600 text-sm mt-1">Tap the mic and say something like "Note: remember to…"</p>
        </div>
      )}

      <FolderManager open={showFolderManager} onOpenChange={setShowFolderManager} onFoldersChanged={() => {}} />
    </div>
  );
}
