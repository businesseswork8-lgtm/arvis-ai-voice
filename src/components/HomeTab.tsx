import { useMemo } from "react";
import { format, isToday, isBefore, parseISO, startOfDay } from "date-fns";
import { getHistory, getAllFolders } from "@/lib/storage";
import { SavedItem } from "@/lib/types";
import { CalendarDays, ListTodo, Bell, Lightbulb } from "lucide-react";

export function HomeTab() {
  const history = getHistory();
  const folders = getAllFolders();
  const now = new Date();
  const greeting = getGreeting();

  const tasks = history.filter((i) => i.type === "Task" && !i.done);
  const todayEvents = history.filter(
    (i) => i.type === "Calendar Event" && i.datetime && isToday(parseISO(i.datetime))
  );
  const reminders = history.filter((i) => i.type === "Reminder" && !i.done);
  const nextEvent = useMemo(() => {
    const upcoming = history
      .filter((i) => i.type === "Calendar Event" && i.datetime)
      .filter((i) => !isBefore(parseISO(i.datetime!), now))
      .sort((a, b) => parseISO(a.datetime!).getTime() - parseISO(b.datetime!).getTime());
    return upcoming[0] || null;
  }, [history]);

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

      {/* Today's Summary */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Today's Summary
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <SummaryChip icon={<ListTodo className="w-4 h-4" />} label="Tasks" value={tasks.length} />
          <SummaryChip icon={<CalendarDays className="w-4 h-4" />} label="Events today" value={todayEvents.length} />
          <SummaryChip icon={<Bell className="w-4 h-4" />} label="Reminders" value={reminders.length} />
          <SummaryChip icon={<Lightbulb className="w-4 h-4" />} label="Notes" value={history.filter((i) => i.type === "Note").length} />
        </div>
        {nextEvent && (
          <div className="bg-secondary/50 rounded-xl p-3 mt-2">
            <p className="text-xs text-muted-foreground">Next up</p>
            <p className="text-sm font-medium text-foreground">{nextEvent.title}</p>
            {nextEvent.datetime && (
              <p className="text-xs text-primary mt-0.5">
                {format(parseISO(nextEvent.datetime), "MMM d, h:mm a")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pending Tasks Preview */}
      {tasks.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Pending Tasks
          </h2>
          {tasks.slice(0, 3).map((task) => (
            <div key={task.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-primary/50 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                {task.datetime && (
                  <p className="text-xs text-muted-foreground">{format(parseISO(task.datetime), "MMM d")}</p>
                )}
              </div>
              {task.folder && (
                <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                  {task.folder}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Folders */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Folders</h2>
        <div className="grid grid-cols-2 gap-2">
          {folders.slice(0, 8).map((f) => {
            const count = history.filter((i) => i.folder === f.key).length;
            return (
              <div key={f.key} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
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
