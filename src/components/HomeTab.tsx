import { useState, useEffect, useMemo, useCallback } from "react";
import { format, isToday, isBefore, parseISO, startOfDay } from "date-fns";
import { toggleItemDone } from "@/lib/storage";
import { useSyncedItems } from "@/hooks/useSyncedItems";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, ListTodo, Bell, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function HomeTab() {
  const { items: history, loading, refresh } = useSyncedItems();
  const [aiSummary, setAiSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const now = new Date();

  const todayEvents = useMemo(
    () => history.filter((i) => i.type === "Calendar Event" && i.datetime && isToday(parseISO(i.datetime)))
      .sort((a, b) => parseISO(a.datetime!).getTime() - parseISO(b.datetime!).getTime()),
    [history]
  );

  const todayTasks = useMemo(
    () => history.filter((i) => i.type === "Task" && !i.done && i.datetime && isToday(parseISO(i.datetime))),
    [history]
  );

  const overdueTasks = useMemo(
    () => history.filter((i) => i.type === "Task" && !i.done && i.datetime && isBefore(parseISO(i.datetime), startOfDay(now)) && !isToday(parseISO(i.datetime))),
    [history]
  );

  const todayReminders = useMemo(
    () => history.filter((i) => i.type === "Reminder" && !i.done && i.datetime && isToday(parseISO(i.datetime))),
    [history]
  );

  const overdueReminders = useMemo(
    () => history.filter((i) => i.type === "Reminder" && !i.done && i.datetime && isBefore(parseISO(i.datetime), startOfDay(now)) && !isToday(parseISO(i.datetime))),
    [history]
  );

  // Fetch AI daily brief — cached per day in localStorage
  useEffect(() => {
    if (loading || history.length === 0) return;

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const BRIEF_KEY = "declutter_brief_cache";
    try {
      const cached = localStorage.getItem(BRIEF_KEY);
      if (cached) {
        const { date, summary } = JSON.parse(cached);
        if (date === todayStr && summary) {
          setAiSummary(summary);
          return; // Use cached brief for today
        }
      }
    } catch {}

    const events = todayEvents.map((e) => ({
      title: e.title,
      time: e.datetime ? format(parseISO(e.datetime), "h:mm a") : "all day",
    }));
    const tasks = [...overdueTasks, ...todayTasks].map((t) => ({ title: t.title }));
    const reminders = [...overdueReminders, ...todayReminders].map((r) => ({
      title: r.title,
      time: r.datetime ? format(parseISO(r.datetime), "h:mm a") : "",
    }));

    setSummaryLoading(true);
    const timeout = setTimeout(() => setSummaryLoading(false), 10000); // 10s max
    supabase.functions
      .invoke("daily-brief", { body: { events, tasks, reminders } })
      .then(({ data }) => {
        if (data?.summary) {
          setAiSummary(data.summary);
          try {
            localStorage.setItem(BRIEF_KEY, JSON.stringify({ date: todayStr, summary: data.summary }));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timeout); setSummaryLoading(false); });
  }, [loading]); // Only re-run when loading state changes, not on every item update

  const handleToggle = useCallback(async (id: string) => {
    await toggleItemDone(id);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const greeting = getGreeting();

  return (
    <div className="px-4 pt-4 pb-36 space-y-5">
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

      {/* AI Daily Brief */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">Daily Brief</h2>
        </div>
        {summaryLoading ? (
          <div className="flex items-center gap-2 py-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Generating your brief...</span>
          </div>
        ) : aiSummary ? (
          <p className="text-sm text-foreground leading-relaxed">{aiSummary}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {history.length === 0
              ? "No items yet. Use the mic to add events, tasks, and reminders."
              : `${greeting}! You have ${todayEvents.length} events, ${todayTasks.length + overdueTasks.length} tasks, and ${todayReminders.length + overdueReminders.length} reminders today.`}
          </p>
        )}
      </div>

      {/* Today's Events */}
      {todayEvents.length > 0 && (
        <Section title="Today's Events" icon={<CalendarDays className="w-4 h-4" />} count={todayEvents.length}>
          {todayEvents.map((event) => (
            <div key={event.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
              <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: event.event_color || "#6366f1" }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                {event.datetime && (
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(event.datetime), "h:mm a")}
                    {event.end_datetime && ` – ${format(parseISO(event.end_datetime), "h:mm a")}`}
                  </p>
                )}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Due Today — Tasks */}
      {(todayTasks.length > 0 || overdueTasks.length > 0) && (
        <Section title="Due Today" icon={<ListTodo className="w-4 h-4" />} count={todayTasks.length + overdueTasks.length}>
          {[...overdueTasks, ...todayTasks].map((task) => {
            const isOverdue = task.datetime && isBefore(parseISO(task.datetime), startOfDay(now)) && !isToday(parseISO(task.datetime));
            return (
              <div key={task.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                <button
                  onClick={() => handleToggle(task.id)}
                  className="w-5 h-5 rounded-full border-2 border-primary/50 flex-shrink-0 hover:border-primary transition-colors flex items-center justify-center"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  {isOverdue && <span className="text-[10px] text-destructive">Overdue</span>}
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {/* Due Today — Reminders */}
      {(todayReminders.length > 0 || overdueReminders.length > 0) && (
        <Section title="Reminders" icon={<Bell className="w-4 h-4" />} count={todayReminders.length + overdueReminders.length}>
          {[...overdueReminders, ...todayReminders].map((reminder) => {
            const isOverdue = reminder.datetime && isBefore(parseISO(reminder.datetime), startOfDay(now)) && !isToday(parseISO(reminder.datetime));
            return (
              <div key={reminder.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                <Bell className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{reminder.title}</p>
                  <p className={`text-xs mt-0.5 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                    {reminder.datetime && format(parseISO(reminder.datetime), "h:mm a")}
                    {isOverdue && " · Overdue"}
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(reminder.id)}
                  className="w-8 h-8 rounded-full border-2 border-primary/50 flex items-center justify-center hover:bg-primary/20 transition-colors flex-shrink-0"
                >
                  <Check className="w-4 h-4 text-primary" />
                </button>
              </div>
            );
          })}
        </Section>
      )}

      {/* Empty state */}
      {todayEvents.length === 0 && todayTasks.length === 0 && overdueTasks.length === 0 && todayReminders.length === 0 && overdueReminders.length === 0 && (
        <p className="text-sm text-muted-foreground/50 text-center py-8">
          Nothing due today. Enjoy your day! 🎉
        </p>
      )}
    </div>
  );
}

function Section({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
      {children}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
