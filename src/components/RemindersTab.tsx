import { useState, useMemo, useCallback } from "react";
import { format, parseISO, isToday, isBefore, startOfDay } from "date-fns";
import { useSyncedItems } from "@/hooks/useSyncedItems";
import { toggleItemDone, saveItems } from "@/lib/storage";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Undo2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SavedItem } from "@/lib/types";
import { toast } from "sonner";

type ReminderFilter = "active" | "completed";

export function RemindersTab() {
  const { items: history, loading, refresh } = useSyncedItems();
  const [filter, setFilter] = useState<ReminderFilter>("active");
  const [showForm, setShowForm] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: "", date: "", time: "" });
  const now = new Date();
  const todayStart = startOfDay(now);

  const reminders = useMemo(() => history.filter((i) => i.type === "Reminder"), [history]);
  const active = useMemo(() => reminders.filter((r) => !r.done), [reminders]);
  const completed = useMemo(() => reminders.filter((r) => r.done).sort((a, b) =>
    new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  ), [reminders]);

  const grouped = useMemo(() => {
    const overdue: typeof active = [];
    const today: typeof active = [];
    const upcoming: typeof active = [];

    active.forEach((r) => {
      if (!r.datetime) { upcoming.push(r); return; }
      const dt = parseISO(r.datetime);
      if (isBefore(dt, todayStart)) overdue.push(r);
      else if (isToday(dt)) today.push(r);
      else upcoming.push(r);
    });

    return { overdue, today, upcoming };
  }, [active, todayStart]);

  const handleToggle = useCallback(async (id: string) => {
    await toggleItemDone(id);
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!newReminder.title.trim() || !newReminder.date || !newReminder.time) return;
    const datetime = `${newReminder.date}T${newReminder.time}:00`;
    const item: SavedItem = {
      id: crypto.randomUUID(),
      type: "Reminder",
      folder: "",
      title: newReminder.title.trim(),
      content: "",
      datetime,
      confirmed: true,
      dismissed: false,
      savedAt: new Date().toISOString(),
      done: false,
    };
    await saveItems([item]);
    toast.success("Reminder created");
    setShowForm(false);
    setNewReminder({ title: "", date: "", time: "" });
    refresh();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="px-4 pt-4 pb-36 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Reminders</h1>

      {/* Filter tabs */}
      <div className="flex bg-secondary rounded-lg p-0.5">
        {(["active", "completed"] as ReminderFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
              filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f} ({f === "active" ? active.length : completed.length})
          </button>
        ))}
      </div>

      {filter === "active" ? (
        <div className="space-y-4">
          <ReminderGroup title="Overdue" items={grouped.overdue} isOverdue onToggle={handleToggle} />
          <ReminderGroup title="Today" items={grouped.today} onToggle={handleToggle} />
          <ReminderGroup title="Upcoming" items={grouped.upcoming} onToggle={handleToggle} />
          {active.length === 0 && (
            <p className="text-sm text-muted-foreground/50 text-center py-8">No active reminders</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {completed.length === 0 ? (
            <p className="text-sm text-muted-foreground/50 text-center py-8">No completed reminders</p>
          ) : completed.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card/50 rounded-xl border border-border/50 p-3 flex items-center gap-3"
            >
              <Bell className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground line-through truncate">{r.title}</p>
                {r.datetime && <p className="text-xs text-muted-foreground/50">{format(parseISO(r.datetime), "MMM d, h:mm a")}</p>}
              </div>
              <button
                onClick={() => handleToggle(r.id)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors flex-shrink-0"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Undo
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowForm(true)}
        className="fixed bottom-36 right-4 z-40 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg"
      >
        <Plus className="w-5 h-5 text-primary-foreground" />
      </motion.button>

      {/* New Reminder Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">New Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={newReminder.title} onChange={(e) => setNewReminder((p) => ({ ...p, title: e.target.value }))}
              placeholder="Reminder title" className="bg-secondary/50 border-border text-foreground" />
            <Input type="date" value={newReminder.date} onChange={(e) => setNewReminder((p) => ({ ...p, date: e.target.value }))}
              className="bg-secondary/50 border-border text-foreground" />
            <Input type="time" value={newReminder.time} onChange={(e) => setNewReminder((p) => ({ ...p, time: e.target.value }))}
              className="bg-secondary/50 border-border text-foreground" />
            <Button onClick={handleCreate} className="w-full">Create Reminder</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReminderGroup({
  title, items, isOverdue, onToggle,
}: {
  title: string;
  items: any[];
  isOverdue?: boolean;
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
        {title} ({items.length})
      </h3>
      <AnimatePresence>
        {items.map((r) => (
          <motion.div
            key={r.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="bg-card rounded-xl border border-border p-3 flex items-center gap-3"
          >
            <Bell className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
              {r.datetime && (
                <p className={`text-xs mt-0.5 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                  {format(parseISO(r.datetime), "MMM d, h:mm a")}
                </p>
              )}
            </div>
            <button
              onClick={() => onToggle(r.id)}
              className="w-8 h-8 rounded-full border-2 border-primary/50 flex items-center justify-center hover:bg-primary/20 transition-colors flex-shrink-0"
            >
              <Check className="w-4 h-4 text-primary" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
