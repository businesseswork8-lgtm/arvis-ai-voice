import { ExtractedItem } from "@/lib/types";
import { getAllFolders } from "@/lib/storage";
import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { EVENT_COLORS } from "@/lib/types";

interface ExtractedCardProps {
  item: ExtractedItem;
  index: number;
  onUpdate: (id: string, updates: Partial<ExtractedItem>) => void;
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
}

const TYPE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  Task: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", label: "TASK" },
  Reminder: { color: "#ff00ff", bg: "rgba(255,0,255,0.1)", label: "REMINDER" },
  "Calendar Event": { color: "#a855f7", bg: "rgba(168,85,247,0.1)", label: "EVENT" },
  Note: { color: "#22c55e", bg: "rgba(34,197,94,0.1)", label: "NOTE" },
};

export function ExtractedCard({ item, index, onUpdate, onConfirm, onDismiss }: ExtractedCardProps) {
  const folders = getAllFolders();
  const folder = folders.find((f) => f.key === item.folder);
  const config = TYPE_CONFIG[item.type] || { color: "#888", bg: "rgba(255,255,255,0.05)", label: item.type.toUpperCase() };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -80 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "#0a0a0a", border: `1px solid ${config.color}22` }}
    >
      {/* Top accent bar */}
      <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${config.color}, transparent)` }} />

      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest px-2 py-1 rounded-md"
              style={{ background: config.bg, color: config.color }}>
              {config.label}
            </span>
            {item.type === "Note" && folder && (
              <span className="text-xs text-zinc-500">{folder.emoji} {folder.label}</span>
            )}
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => onConfirm(item.id)}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <Check className="w-4 h-4 text-green-400" />
            </button>
            <button onClick={() => onDismiss(item.id)}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>

        {/* Editable title */}
        <input
          value={item.title}
          onChange={(e) => onUpdate(item.id, { title: e.target.value })}
          className="w-full bg-transparent text-white font-semibold text-sm focus:outline-none border-b border-zinc-800 pb-1.5 placeholder-zinc-600"
          placeholder="Title"
        />

        {/* Editable content */}
        <textarea
          value={item.content}
          onChange={(e) => onUpdate(item.id, { content: e.target.value })}
          rows={2}
          className="w-full bg-transparent text-zinc-400 text-xs focus:outline-none resize-none placeholder-zinc-700"
          placeholder="Notes (optional)"
        />

        {/* Datetime picker */}
        {item.datetime && (
          <input
            type="datetime-local"
            value={item.datetime.slice(0, 16)}
            onChange={(e) => onUpdate(item.id, { datetime: new Date(e.target.value).toISOString() })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
            style={{ color: config.color }}
          />
        )}

        {/* Low confidence folder picker */}
        {item.type === "Note" && item.confidence === "low" && (
          <div>
            <p className="text-[10px] text-yellow-500 mb-2 font-semibold tracking-wider">CHOOSE FOLDER</p>
            <div className="flex gap-1.5 flex-wrap">
              {folders.map((f) => (
                <button key={f.key}
                  onClick={() => onUpdate(item.id, { folder: f.key, confidence: "high" })}
                  className="text-xs px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: item.folder === f.key ? `${f.color || "#6366f1"}20` : "#111",
                    border: `1px solid ${item.folder === f.key ? f.color || "#6366f1" : "#222"}`,
                    color: item.folder === f.key ? f.color || "#6366f1" : "#666",
                  }}>
                  {f.emoji} {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color picker for calendar events */}
        {item.type === "Calendar Event" && (
          <div>
            <p className="text-[10px] text-zinc-600 mb-2 font-semibold tracking-wider">EVENT COLOR</p>
            <div className="flex gap-2">
              {EVENT_COLORS.map((c) => (
                <button key={c} onClick={() => onUpdate(item.id, { event_color: c })}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                  style={{ backgroundColor: c, boxShadow: item.event_color === c ? `0 0 8px ${c}` : "none" }}>
                  {item.event_color === c && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer label */}
        <p className="text-[10px] text-zinc-700">
          {item.type === "Calendar Event" && item.datetime
            ? `📅 ${new Date(item.datetime).toLocaleString()}`
            : item.type === "Note"
            ? `📁 Saving to ${folder?.label || item.folder}`
            : `✦ Will save as ${item.type}`}
        </p>
      </div>
    </motion.div>
  );
}
