import { ExtractedItem } from "@/lib/types";
import { getAllFolders } from "@/lib/storage";
import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_COLORS } from "@/lib/types";

interface ExtractedCardProps {
  item: ExtractedItem;
  index: number;
  onUpdate: (id: string, updates: Partial<ExtractedItem>) => void;
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  Task: "bg-accent/20 text-accent",
  Reminder: "bg-yellow-500/20 text-yellow-400",
  "Calendar Event": "bg-primary/20 text-primary",
  Note: "bg-emerald-500/20 text-emerald-400",
};

export function ExtractedCard({ item, index, onUpdate, onConfirm, onDismiss }: ExtractedCardProps) {
  const folders = getAllFolders();
  const folder = folders.find((f) => f.key === item.folder);
  const isNote = item.type === "Note";
  const isCalEvent = item.type === "Calendar Event";
  const isLowConfidence = isNote && item.confidence === "low";

  const previewText = isCalEvent && item.datetime
    ? `Will create a calendar event ${new Date(item.datetime).toLocaleString()}`
    : isNote
    ? `Will save to ${folder?.emoji || "📁"} ${folder?.label || item.folder} folder`
    : `Will save as ${item.type}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      className="rounded-lg border border-border bg-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[item.type] || "bg-muted text-muted-foreground"}`}>
            {item.type}
          </span>
          {isNote && folder && (
            <span className="text-xs text-muted-foreground">
              {folder.emoji} {folder.label}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={() => onConfirm(item.id)} className="p-1.5 rounded-md hover:bg-accent/20 text-accent transition-colors">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => onDismiss(item.id)} className="p-1.5 rounded-md hover:bg-destructive/20 text-destructive transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Input
        value={item.title}
        onChange={(e) => onUpdate(item.id, { title: e.target.value })}
        className="bg-secondary/50 border-border text-foreground text-sm font-medium"
      />

      <Textarea
        value={item.content}
        onChange={(e) => onUpdate(item.id, { content: e.target.value })}
        rows={2}
        className="bg-secondary/50 border-border text-foreground text-sm resize-none"
      />

      {item.datetime && (
        <Input
          type="datetime-local"
          value={item.datetime.slice(0, 16)}
          onChange={(e) => onUpdate(item.id, { datetime: new Date(e.target.value).toISOString() })}
          className="bg-secondary/50 border-border text-foreground text-sm"
        />
      )}

      {/* Folder picker for low-confidence notes */}
      {isNote && isLowConfidence && (
        <div className="space-y-1">
          <p className="text-xs text-yellow-400">Which folder for this note?</p>
          <div className="flex gap-1.5 flex-wrap">
            {folders.map((f) => (
              <button
                key={f.key}
                onClick={() => onUpdate(item.id, { folder: f.key, confidence: "high" })}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                  item.folder === f.key ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
                }`}
                style={{ backgroundColor: `${f.color || "#6366f1"}20`, color: f.color || "#6366f1" }}
              >
                {f.emoji} {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color picker for calendar events */}
      {isCalEvent && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Event color</p>
          <div className="flex gap-1.5">
            {EVENT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onUpdate(item.id, { event_color: c })}
                className="w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                style={{ backgroundColor: c }}
              >
                {(item.event_color || "#6366f1") === c && <Check className="w-3 h-3 text-white" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground italic">{previewText}</p>
    </motion.div>
  );
}
