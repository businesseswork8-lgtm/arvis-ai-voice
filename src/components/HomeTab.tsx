import { useState, useMemo, useCallback } from "react";
import { format, isToday, isBefore, parseISO, startOfDay } from "date-fns";
import { getAllFolders, getFolderColor, toggleItemDone } from "@/lib/storage";
import { useSyncedItems } from "@/hooks/useSyncedItems";
import { CalendarDays, ListTodo, Bell, Lightbulb, Pencil, Check } from "lucide-react";
import { FolderManager } from "./FolderManager";
import { motion, AnimatePresence } from "framer-motion";

export function HomeTab() {
  const { items: history, loading, refresh } = useSyncedItems();
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [, forceUpdate] = useState(0);
  const now = new Date();
  const greeting = getGreeting();

  const tasks = history.filter((i) => i.type === "Task" && !i.done);
  const todayEvents = history.filter(
    (i) => i.type === "Calendar Event" && i.datetime && isToday(parseISO(i.datetime))
  );
  const todayReminders = history.filter(
    (i) => i.type === "Reminder" && !i.done && i.datetime && (isToday(parseISO(i.datetime)) || isBefore(parseISO(i.datetime), startOfDay(now)))
  );
  const overdueReminders = history.filter(
    (i) => i.type === "Reminder" && !i.done && i.datetime && isBefore(parseISO(i.datetime), startOfDay(now)) && !isToday(parseISO(i.datetime))
  );
  const allActiveReminders = [...overdueReminders, ...todayReminders.filter((r) => !overdueReminders.find((o) => o.id === r.id))];

  const nextEvent = useMemo(() => {
    const upcoming = history
      .filter((i) => i.type === "Calendar Event" && i.datetime)
      .filter((i) => !isBefore(parseISO(i.datetime!), now))
      .sort((a, b) => parseISO(a.datetime!).getTime() - parseISO(b.datetime!).getTime());
    return upcoming[0] || null;
  }, [history]);

  const folders = getAllFolders();
  const deletedFolders = JSON.parse(localStorage.getItem("declutter_deleted_folders") || "[]");
  const visibleFolders = folders.filter((f) => !deletedFolders.includes(f.key));

  const handleReminderDone = useCallback(async (id: string) => {
    await toggleItemDone(id);
    refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-36 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          <span className="text-primary">De</span>
          <span className="text-foreground">clutter</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {greeting} · {format(now, "EEE, MMM d")}
        </p>
      </div>

      {/* Summary */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Today's Summary</h2>
        <div className="grid grid-cols-2 gap-3">
          <SummaryChip icon={<ListTodo className="w-4 h-4" />} label="Tasks" value={tasks.length} />
          <SummaryChip icon={<CalendarDays className="w-4 h-4" />} label="Events today" value={todayEvents.length} />
          <SummaryChip icon={<Bell className="w-4 h-4" />} label="Reminders" value={history.filter((i) => i.type === "Reminder" && !i.done).length} />
          <SummaryChip icon={<Lightbulb className="w-4 h-4" />} label="Notes" value={history.filter((i) => i.type === "Note").length} />
        </div>
        {nextEvent && (
          <div className="bg-secondary/50 rounded-xl p-3 mt-2">
            <p className="text-xs text-muted-foreground">Next up</p>
            <p className="text-sm font-medium text-foreground">{nextEvent.title}</p>
            {nextEvent.datetime && (
              <p className="text-xs text-primary mt-0.5">{format(parseISO(nextEvent.datetime), "MMM d, h:mm a")}</p>
            )}
          </div>
        )}
      </div>

      {/* Reminders Section */}
      {allActiveReminders.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Reminders</h2>
          <AnimatePresence>
            {allActiveReminders.slice(0, 5).map((reminder) => {
              const isOverdue = reminder.datetime && isBefore(parseISO(reminder.datetime), startOfDay(now)) && !isToday(parseISO(reminder.datetime));
              return (
                <motion.div
                  key={reminder.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  className="bg-card rounded-xl border border-border p-3 flex items-center gap-3"
                >
                  <Bell className="w-4 h-4 text-muted-foreground flex-shrink-0" style={{ color: getFolderColor(reminder.folder) }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{reminder.title}</p>
                    {reminder.datetime && (
                      <p className={`text-xs mt-0.5 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                        {format(parseISO(reminder.datetime), "MMM d, h:mm a")}
                        {isOverdue && " · Overdue"}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleReminderDone(reminder.id)}
                    className="w-8 h-8 rounded-full border-2 border-primary/50 flex items-center justify-center hover:bg-primary/20 transition-colors flex-shrink-0"
                  >
                    <Check className="w-4 h-4 text-primary" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pending Tasks */}
      {tasks.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending Tasks</h2>
          {tasks.slice(0, 3).map((task) => (
            <div key={task.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-primary/50 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                {task.datetime && <p className="text-xs text-muted-foreground">{format(parseISO(task.datetime), "MMM d")}</p>}
              </div>
              {task.folder && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: `${getFolderColor(task.folder)}20`, color: getFolderColor(task.folder) }}
                >
                  {task.folder}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Folders */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Folders</h2>
          <button
            onClick={() => setShowFolderManager(true)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {visibleFolders.slice(0, 8).map((f) => {
            const count = history.filter((i) => i.folder === f.key).length;
            const folderColor = f.color || "#6366f1";
            return (
              <div
                key={f.key}
                className="rounded-xl border border-border p-3 flex items-center gap-3"
                style={{ backgroundColor: `${folderColor}08`, borderColor: `${folderColor}30` }}
              >
                <span className="text-xl">{f.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{count} items</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <FolderManager
        open={showFolderManager}
        onOpenChange={setShowFolderManager}
        onFoldersChanged={() => { forceUpdate((n) => n + 1); }}
      />
    </div>
  );
}

function SummaryChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2.5">
      <div className="text-primary">{icon}</div>
      <div>
        <p className="text-lg font-bold text-foreground leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
