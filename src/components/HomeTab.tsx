import { useState, useEffect, useMemo, useCallback } from "react";
import { format, isToday, isBefore, parseISO, startOfDay, formatDistanceToNow } from "date-fns";
import { toggleItemDone } from "@/lib/storage";
import { useSyncedItems } from "@/hooks/useSyncedItems";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, ListTodo, Bell, BookOpen, Zap, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export function HomeTab() {
  const { items: history, loading } = useSyncedItems();
  const [aiSummary, setAiSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const now = new Date();

  const todayEvents = useMemo(() =>
    history.filter((i) => i.type === "Calendar Event" && i.datetime && isToday(parseISO(i.datetime)))
      .sort((a, b) => parseISO(a.datetime!).getTime() - parseISO(b.datetime!).getTime()),
    [history]);

  const pendingTasks = useMemo(() =>
    history.filter((i) => i.type === "Task" && !i.done), [history]);

  const todayTasks = useMemo(() =>
    pendingTasks.filter((i) => !i.datetime || isToday(parseISO(i.datetime!))), [pendingTasks]);

  const overdueTasks = useMemo(() =>
    pendingTasks.filter((i) => i.datetime && isBefore(parseISO(i.datetime), startOfDay(now)) && !isToday(parseISO(i.datetime))),
    [pendingTasks]);

  const todayReminders = useMemo(() =>
    history.filter((i) => i.type === "Reminder" && !i.done && i.datetime && isToday(parseISO(i.datetime))),
    [history]);

  const overdueReminders = useMemo(() =>
    history.filter((i) => i.type === "Reminder" && !i.done && i.datetime && isBefore(parseISO(i.datetime), startOfDay(now)) && !isToday(parseISO(i.datetime))),
    [history]);

  const allNotes = useMemo(() => history.filter((i) => i.type === "Note"), [history]);

  const nextEvent = todayEvents[0] ?? null;
  const urgentTask = overdueTasks[0] ?? todayTasks[0] ?? null;
  const nextReminder = overdueReminders[0] ?? todayReminders[0] ?? null;

  // AI Brief — cached per day
  useEffect(() => {
    if (loading || history.length === 0) return;
    const todayStr = format(now, "yyyy-MM-dd");
    const BRIEF_KEY = "declutter_brief_cache";
    try {
      const cached = localStorage.getItem(BRIEF_KEY);
      if (cached) {
        const { date, summary } = JSON.parse(cached);
        if (date === todayStr && summary) { setAiSummary(summary); return; }
      }
    } catch {}
    const events = todayEvents.map((e) => ({ title: e.title, time: e.datetime ? format(parseISO(e.datetime), "h:mm a") : "all day" }));
    const tasks = [...overdueTasks, ...todayTasks].map((t) => ({ title: t.title }));
    const reminders = [...overdueReminders, ...todayReminders].map((r) => ({ title: r.title, time: r.datetime ? format(parseISO(r.datetime), "h:mm a") : "" }));
    setSummaryLoading(true);
    const timeout = setTimeout(() => setSummaryLoading(false), 10000);
    supabase.functions.invoke("daily-brief", { body: { events, tasks, reminders } })
      .then(({ data }) => {
        if (data?.summary) {
          setAiSummary(data.summary);
          try { localStorage.setItem(BRIEF_KEY, JSON.stringify({ date: todayStr, summary: data.summary })); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timeout); setSummaryLoading(false); });
  }, [loading]);

  const handleToggle = useCallback(async (id: string) => { await toggleItemDone(id); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#ff00ff", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const greeting = getGreeting();
  const totalActive = todayTasks.length + overdueTasks.length;
  const totalReminders = todayReminders.length + overdueReminders.length;

  return (
    <div className="pb-36 pt-2">
      {/* Header */}
      <div className="px-5 pt-4 pb-6 flex items-start justify-between">
        <div>
          <p className="label-caps mb-1">DECLUTTER</p>
          <h1 className="text-2xl font-bold text-white">{greeting}</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{format(now, "EEEE, MMMM d")}</p>
        </div>
        <div className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center" style={{ background: "#0d0d0d" }}>
          <Bell className="w-4 h-4 text-zinc-400" />
        </div>
      </div>

      {/* AI Brief */}
      <div className="mx-4 mb-5 rounded-2xl p-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg,#0d0d0d,#130013)", border: "1px solid rgba(255,0,255,0.15)" }}>
        {/* Shimmer top bar */}
        <div className="absolute top-0 left-0 right-0 h-[1px] shimmer-line" />
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-3.5 h-3.5" style={{ color: "#ff00ff" }} />
          <span className="label-caps" style={{ color: "#ff00ff" }}>INTEL BRIEF</span>
          {summaryLoading && <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin ml-auto" style={{ borderColor: "#ff00ff", borderTopColor: "transparent" }} />}
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">
          {summaryLoading ? "Generating your brief…" :
           aiSummary ? aiSummary :
           history.length === 0
             ? "Start speaking to capture tasks, events & reminders."
             : `${todayEvents.length} events · ${totalActive} tasks · ${totalReminders} reminders today.`}
        </p>
      </div>

      {/* 2×2 Widget Grid */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-5">
        {/* TIMELINE */}
        <Widget
          label="TIMELINE"
          icon={<CalendarDays className="w-3.5 h-3.5" />}
          accentColor="#ff00ff"
          dot={todayEvents.length > 0}
        >
          {nextEvent ? (
            <>
              <p className="text-sm font-semibold text-white leading-tight line-clamp-2 mb-1">{nextEvent.title}</p>
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                <span>🕐</span>
                {nextEvent.datetime && format(parseISO(nextEvent.datetime), "h:mm")}
                {nextEvent.end_datetime && ` – ${format(parseISO(nextEvent.end_datetime), "h:mm a")}`}
              </p>
            </>
          ) : (
            <p className="text-xs text-zinc-600">No events today</p>
          )}
        </Widget>

        {/* TASKS (MATRIX) */}
        <Widget label="TASKS" icon={<ListTodo className="w-3.5 h-3.5" />} accentColor="#3b82f6">
          {urgentTask ? (
            <>
              <p className="text-sm font-semibold text-white leading-tight line-clamp-2 mb-1">{urgentTask.title}</p>
              <div className="flex items-center gap-1.5">
                {overdueTasks.length > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}>
                    {overdueTasks.length} overdue
                  </span>
                )}
                {totalActive > 0 && (
                  <span className="text-[10px] text-zinc-500">{totalActive} pending</span>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-600">All tasks done ✓</p>
          )}
        </Widget>

        {/* REMINDERS (QUEUE) */}
        <Widget label="QUEUE" icon={<Bell className="w-3.5 h-3.5" />} accentColor="#ff00ff">
          {nextReminder ? (
            <>
              <p className="text-sm font-semibold text-white leading-tight line-clamp-2 mb-1">{nextReminder.title}</p>
              {nextReminder.datetime && (
                <p className="text-[11px] font-medium" style={{ color: overdueReminders.includes(nextReminder) ? "#ef4444" : "#ff00ff" }}>
                  ● {overdueReminders.includes(nextReminder)
                    ? formatDistanceToNow(parseISO(nextReminder.datetime), { addSuffix: true })
                    : format(parseISO(nextReminder.datetime), "h:mm a")}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-zinc-600">No reminders</p>
          )}
        </Widget>

        {/* NOTES (FOLDERS) */}
        <Widget label="NOTES" icon={<BookOpen className="w-3.5 h-3.5" />} accentColor="#3b82f6">
          <p className="text-2xl font-bold text-white mono mb-0.5">{allNotes.length}</p>
          <p className="text-xs text-zinc-500">Saved notes</p>
        </Widget>
      </div>

      {/* Today section list */}
      {(todayEvents.length > 0 || totalActive > 0 || totalReminders > 0) && (
        <div className="px-4 space-y-2">
          <p className="label-caps mb-3">TODAY AT A GLANCE</p>

          {/* Events */}
          {todayEvents.map((ev) => (
            <motion.div key={ev.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
              <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: ev.event_color || "#ff00ff" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{ev.title}</p>
                {ev.datetime && <p className="text-xs text-zinc-500">{format(parseISO(ev.datetime), "h:mm a")}{ev.end_datetime && ` – ${format(parseISO(ev.end_datetime), "h:mm a")}`}</p>}
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-700 flex-shrink-0" />
            </motion.div>
          ))}

          {/* Tasks */}
          {[...overdueTasks, ...todayTasks].slice(0, 3).map((task) => {
            const isOv = task.datetime && isBefore(parseISO(task.datetime), startOfDay(now)) && !isToday(parseISO(task.datetime));
            return (
              <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
                <button onClick={() => handleToggle(task.id)}
                  className="w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors hover:border-[#ff00ff]"
                  style={{ borderColor: isOv ? "#ef4444" : "#333" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{task.title}</p>
                  {isOv && <span className="text-[10px] text-red-500 font-semibold">OVERDUE</span>}
                </div>
              </motion.div>
            );
          })}

          {/* Reminders */}
          {[...overdueReminders, ...todayReminders].slice(0, 2).map((r) => {
            const isOv = r.datetime && isBefore(parseISO(r.datetime), startOfDay(now));
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
                <Bell className="w-4 h-4 flex-shrink-0" style={{ color: isOv ? "#ef4444" : "#ff00ff" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{r.title}</p>
                  {r.datetime && <p className="text-xs" style={{ color: isOv ? "#ef4444" : "#71717a" }}>{format(parseISO(r.datetime), "h:mm a")}{isOv ? " · Overdue" : ""}</p>}
                </div>
                <button onClick={() => handleToggle(r.id)}
                  className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center hover:border-[#ff00ff]/50 transition-colors">
                  <span className="text-xs text-zinc-500">✓</span>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {history.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center" style={{ background: "rgba(255,0,255,0.08)", border: "1px solid rgba(255,0,255,0.15)" }}>
            <span className="text-2xl">🎙️</span>
          </div>
          <p className="text-white font-semibold mb-1">Nothing here yet</p>
          <p className="text-zinc-500 text-sm">Tap the mic below to capture your first thought</p>
        </div>
      )}
    </div>
  );
}

function Widget({ label, icon, accentColor, dot, children }: {
  label: string; icon: React.ReactNode; accentColor: string; dot?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", minHeight: "110px" }}>
      <div className="flex items-center gap-1.5">
        <span style={{ color: accentColor }}>{icon}</span>
        <span className="label-caps" style={{ color: accentColor }}>{label}</span>
        {dot && <span className="w-1.5 h-1.5 rounded-full ml-auto live-dot" style={{ backgroundColor: accentColor }} />}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
