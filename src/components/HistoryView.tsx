import { useState } from "react";
import { getHistory } from "@/lib/storage";
import { getAllFolders } from "@/lib/storage";
import { SavedItem } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";

interface HistoryViewProps {
  onBack: () => void;
}

export function HistoryView({ onBack }: HistoryViewProps) {
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const history = getHistory();
  const folders = getAllFolders();

  const filtered = activeFolder
    ? history.filter((i) => i.folder === activeFolder)
    : history;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={onBack} className="p-2 rounded-md hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">History</h2>
      </div>

      {/* Folder chips */}
      <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar">
        <Chip label="All" active={!activeFolder} onClick={() => setActiveFolder(null)} />
        {folders.map((f) => (
          <Chip
            key={f.key}
            label={`${f.emoji} ${f.label}`}
            active={activeFolder === f.key}
            onClick={() => setActiveFolder(f.key)}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        <AnimatePresence>
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground mt-12">No items yet</p>
          )}
          {filtered.map((item, i) => (
            <HistoryCard key={item.id} item={item} index={i} folders={folders} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
      }`}
    >
      {label}
    </button>
  );
}

function HistoryCard({ item, index, folders }: { item: SavedItem; index: number; folders: any[] }) {
  const folder = folders.find((f) => f.key === item.folder);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-lg border border-border bg-card p-3 space-y-1"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-accent font-medium">{item.type}</span>
        <span className="text-xs text-muted-foreground">
          {folder?.emoji} {folder?.label}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground">{item.title}</p>
      <p className="text-xs text-muted-foreground line-clamp-2">{item.content}</p>
      {item.datetime && (
        <p className="text-xs text-primary">{new Date(item.datetime).toLocaleString()}</p>
      )}
      <p className="text-xs text-muted-foreground/60">
        Saved {new Date(item.savedAt).toLocaleDateString()}
      </p>
    </motion.div>
  );
}
