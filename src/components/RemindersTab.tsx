import { useState, useMemo, useCallback } from "react";
import { format, parseISO, isToday, isBefore, startOfDay, formatDistanceToNow } from "date-fns";
import { useSyncedItems } from "@/hooks/useSyncedItems";
import { toggleItemDone, saveItems, updateItem, deleteItem } from "@/lib/storage";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Plus, Pencil, Trash2, X } from "lucide-react";
import { SavedItem } from "@/lib/types";
import { toast } from "sonner";

type Filter = "active" | "completed";

export function RemindersTab() {
  const { items: history, loading } = useSyncedItems();
  const [filter, setFilter] = useState<Filter>("active");
  const [showForm, setShowForm] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: "", date: format(new Date(), "yyyy-MM-dd"), time: "" });
  const [editingReminder, setEditingReminder] = useState<SavedItem | null>(null);
  const [editForm, setEditForm] = useState({ title: "", date: "", time: "" });
  const now = new Date();
  const todayStart = startOfDay(now);

  const reminders = useMemo(() => history.filter((i) => i.type === "Reminder"), [history]);
  const active = useMemo(() => reminders.filter((r) => !r.done), [reminders]);
  const completed = useMemo(() => reminders.filter((r) => r.done)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()), [reminders]);

  const grouped = useMemo(() => {
    const overdue: typeof active = [], today: typeof active = [], upcoming: typeof active = [];
    active.forEach((r) => {
      if (!r.datetime) { upcoming.push(r); return; }
      const dt = parseISO(r.datetime);
      if (isBefore(dt, todayStart)) overdue.push(r);
      else if (isToday(dt)) today.push(r);
      else upcoming.push(r);
    });
    return { overdue, today, upcoming };
  }, [active, todayStart]);

  const handleToggle = useCallback(async (id: string) => { await toggleItemDone(id); }, []);
  const handleDelete = async (id: string) => { await deleteItem(id); toast.success("Deleted"); };

  const handleCreate = async () => {
    if (!newReminder.title.trim()) { toast.error("Enter a reminder title"); return; }
    const datetime = newReminder.date && newReminder.time
      ? `${newReminder.date}T${newReminder.time}:00`
      : newReminder.date ? `${newReminder.date}T09:00:00` : undefined;
    await saveItems([{ id: crypto.randomUUID(), type: "Reminder", folder: "", title: newReminder.title.trim(), content: "", datetime, confirmed: true, dismissed: false, savedAt: new Date().toISOString(), done: false }]);
    toast.success("Reminder created");
    setShowForm(false);
    setNewReminder({ title: "", date: format(new Date(), "yyyy-MM-dd"), time: "" });
  };

  const openEdit = (r: SavedItem) => {
    const dt = r.datetime ? parseISO(r.datetime) : null;
    setEditForm({ title: r.title, date: dt ? format(dt, "yyyy-MM-dd") : "", time: dt ? format(dt, "HH:mm") : "" });
    setEditingReminder(r);
  };

  const handleSaveEdit = async () => {
    if (!editingReminder || !editForm.title.trim()) return;
    const datetime = editForm.date && editForm.time ? `${editForm.date}T${editForm.time}:00` : editForm.date ? `${editForm.date}T09:00:00` : null;
    await updateItem(editingReminder.id, { title: editForm.title.trim(), datetime });
    toast.success("Updated");
    setEditingReminder(null);
  };

  if (loading) return <LoadingSpinner />;

  const displayList = filter === "active" ? active : completed;

  return (
    <div className="pb-36 pt-2">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <div>
          <p className="label-caps mb-1">REMINDERS</p>
          <h1 className="text-2xl font-bold text-white">Queue</h1>
        </div>
        <button onClick={() => setShowForm(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: "rgba(255,0,255,0.1)", border: "1px solid rgba(255,0,255,0.2)" }}>
          <Plus className="w-4 h-4" style={{ color: "#ff00ff" }} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mx-5 mb-5 flex rounded-xl overflow-hidden" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
        {(["active", "completed"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex-1 py-2.5 text-xs font-semibold tracking-widest uppercase transition-all"
            style={filter === f
              ? { background: "rgba(255,0,255,0.12)", color: "#ff00ff", borderBottom: "2px solid #ff00ff" }
              : { color: "#555", borderBottom: "2px solid transparent" }}>
            {f} ({f === "active" ? active.length : completed.length})
          </button>
        ))}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mx-4 mb-4 rounded-2xl p-4 space-y-3" style={{ background: "#0d0d0d", border: "1px solid #222" }}>
            <div className="flex items-center justify-between">
              <p className="label-caps" style={{ color: "#ff00ff" }}>NEW REMINDER</p>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-zinc-600" /></button>
            </div>
            <input value={newReminder.title} onChange={(e) => setNewReminder((p) => ({ ...p, title: e.target.value }))}
              placeholder="What do you need to remember?" autoFocus
              className="w-full bg-transparent text-white text-sm placeholder-zinc-600 focus:outline-none border-b border-zinc-800 pb-2" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="label-caps mb-1.5">DATE</p>
                <input type="date" value={newReminder.date} onChange={(e) => setNewReminder((p) => ({ ...p, date: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#ff00ff]/50" />
              </div>
              <div>
                <p className="label-caps mb-1.5">TIME (OPTIONAL)</p>
                <input type="time" value={newReminder.time} onChange={(e) => setNewReminder((p) => ({ ...p, time: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#ff00ff]/50" />
              </div>
            </div>
            <button onClick={handleCreate}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg,#ff00ff,#bf00ff)", boxShadow: "0 0 20px rgba(255,0,255,0.3)" }}>
              Create Reminder
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grouped lists (active) */}
      {filter === "active" ? (
        <div className="px-4 space-y-5">
          {grouped.overdue.length > 0 && (
            <ReminderGroup label="OVERDUE" accentColor="#ef4444" items={grouped.overdue} onToggle={handleToggle} onEdit={openEdit} onDelete={handleDelete} />
          )}
          {grouped.today.length > 0 && (
            <ReminderGroup label="TODAY" accentColor="#ff00ff" items={grouped.today} onToggle={handleToggle} onEdit={openEdit} onDelete={handleDelete} />
          )}
          {grouped.upcoming.length > 0 && (
            <ReminderGroup label="UPCOMING" accentColor="#3b82f6" items={grouped.upcoming} onToggle={handleToggle} onEdit={openEdit} onDelete={handleDelete} />
          )}
          {active.length === 0 && (
            <EmptyState icon="🔔" title="No reminders" sub="Tap + or use the mic to add one" />
          )}
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {completed.length === 0 && <EmptyState icon="✓" title="No completed reminders" sub="" />}
          {completed.map((r) => (
            <ReminderRow key={r.id} item={r} done onToggle={handleToggle} onEdit={openEdit} onDelete={handleDelete} accentColor="#333" />
          ))}
        </div>
      )}

      {/* Edit modal */}
      <AnimatePresence>
        {editingReminder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}>
            <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              className="w-full max-w-md rounded-2xl p-5 space-y-4" style={{ background: "#0d0d0d", border: "1px solid #222" }}>
              <div className="flex items-center justify-between">
                <p className="label-caps" style={{ color: "#ff00ff" }}>EDIT REMINDER</p>
                <button onClick={() => setEditingReminder(null)}><X className="w-4 h-4 text-zinc-600" /></button>
              </div>
              <input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Title" autoFocus
                className="w-full bg-transparent text-white text-sm placeholder-zinc-600 focus:outline-none border-b border-zinc-800 pb-2" />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={editForm.date} onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none" />
                <input type="time" value={editForm.time} onChange={(e) => setEditForm((p) => ({ ...p, time: e.target.value }))}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none" />
              </div>
              <button onClick={handleSaveEdit}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm"
                style={{ background: "linear-gradient(135deg,#ff00ff,#bf00ff)" }}>
                Save Changes
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReminderGroup({ label, accentColor, items, onToggle, onEdit, onDelete }: {
  label: string; accentColor: string; items: SavedItem[];
  onToggle: (id: string) => void; onEdit: (r: SavedItem) => void; onDelete: (id: string) => void;
}) {
  return (
    <div>
      <p className="label-caps mb-2" style={{ color: accentColor }}>{label}</p>
      <div className="space-y-2">
        {items.map((r) => (
          <ReminderRow key={r.id} item={r} accentColor={accentColor} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function ReminderRow({ item, accentColor, done, onToggle, onEdit, onDelete }: {
  item: SavedItem; accentColor: string; done?: boolean;
  onToggle: (id: string) => void; onEdit: (r: SavedItem) => void; onDelete: (id: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl px-4 py-3 flex items-center gap-3 relative"
      style={{ background: "#0a0a0a", border: `1px solid ${showActions ? accentColor + "33" : "#1a1a1a"}` }}>
      {/* Checkbox */}
      <button onClick={() => onToggle(item.id)}
        className="w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
        style={{ borderColor: done ? "#333" : accentColor, backgroundColor: done ? "#333" : "transparent" }}>
        {done && <Check className="w-3 h-3 text-zinc-600" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0" onClick={() => setShowActions((s) => !s)}>
        <p className={`text-sm font-medium truncate ${done ? "text-zinc-600 line-through" : "text-white"}`}>{item.title}</p>
        {item.datetime && (
          <p className="text-xs mt-0.5" style={{ color: accentColor }}>
            {format(parseISO(item.datetime), "MMM d · h:mm a")}
          </p>
        )}
      </div>

      {/* Actions */}
      <AnimatePresence>
        {showActions && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-1">
            <button onClick={() => { onEdit(item); setShowActions(false); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#1a1a1a" }}>
              <Pencil className="w-3.5 h-3.5 text-zinc-400" />
            </button>
            <button onClick={() => onDelete(item.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#1a0505" }}>
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-3xl mb-3">{icon}</span>
      <p className="text-zinc-400 font-medium">{title}</p>
      {sub && <p className="text-zinc-600 text-sm mt-1">{sub}</p>}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#ff00ff", borderTopColor: "transparent" }} />
    </div>
  );
}
