import { useState } from "react";
import { getAllFolders, getHistory } from "@/lib/storage";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";

export function FoldersTab() {
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const folders = getAllFolders();
  const history = getHistory();

  if (activeFolder) {
    const folder = folders.find((f) => f.key === activeFolder);
    const items = history.filter((i) => i.folder === activeFolder);

    return (
      <div className="px-4 pt-4 pb-36 space-y-4">
        <button
          onClick={() => setActiveFolder(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-bold text-foreground">
          {folder?.emoji} {folder?.label}
        </h1>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground/50 text-center py-8">No items yet</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-border p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                    {item.type}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                {item.content && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.content}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-36 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Folders</h1>
      <div className="grid grid-cols-2 gap-3">
        {folders.map((f) => {
          const count = history.filter((i) => i.folder === f.key).length;
          return (
            <motion.button
              key={f.key}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveFolder(f.key)}
              className="bg-card rounded-2xl border border-border p-4 text-left hover:border-primary/30 transition-colors"
            >
              <span className="text-2xl">{f.emoji}</span>
              <p className="text-sm font-semibold text-foreground mt-2">{f.label}</p>
              <p className="text-xs text-muted-foreground">{count} items</p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
