import { ExtractedItem } from "@/lib/types";
import { getAllFolders } from "@/lib/storage";
import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  const previewText = item.type === "Calendar Event" && item.datetime
    ? `Will create a calendar event ${new Date(item.datetime).toLocaleString()}`
    : `Will save to ${folder?.emoji || "📁"} ${folder?.label || item.folder} folder`;

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
          <span className="text-xs text-muted-foreground">
            {folder?.emoji} {folder?.label}
          </span>
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

      <p className="text-xs text-muted-foreground italic">{previewText}</p>
    </motion.div>
  );
}
