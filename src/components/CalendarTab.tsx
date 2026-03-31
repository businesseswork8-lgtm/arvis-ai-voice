import { useState, useMemo } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  isSameMonth, startOfWeek, endOfWeek, parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSyncedItems } from "@/hooks/useSyncedItems";
import { motion, AnimatePresence } from "framer-motion";

export function CalendarTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { items: history, loading } = useSyncedItems();

  const eventDates = useMemo(() => {
    const dates = new Set<string>();
    history.forEach((item) => {
      if (item.datetime) dates.add(format(parseISO(item.datetime), "yyyy-MM-dd"));
    });
    return dates;
  }, [history]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const selectedEvents = useMemo(() => {
    return history.filter(
      (item) => item.datetime && isSameDay(parseISO(item.datetime), selectedDate)
    );
  }, [history, selectedDate]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="px-4 pt-4 pb-36 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Calendar</h1>
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h2 className="text-base font-semibold text-foreground">{format(currentMonth, "MMMM yyyy")}</h2>
        <button onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const hasEvent = eventDates.has(dateKey);
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          return (
            <button key={dateKey} onClick={() => setSelectedDate(day)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all ${
                !isCurrentMonth ? "text-muted-foreground/30"
                : isSelected ? "bg-primary text-primary-foreground"
                : isToday ? "bg-secondary text-foreground font-semibold"
                : "text-foreground hover:bg-secondary/50"
              }`}>
              {format(day, "d")}
              {hasEvent && !isSelected && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-accent" />}
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{format(selectedDate, "EEEE, MMM d")}</h3>
        <AnimatePresence mode="wait">
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground/50 text-center py-6">No items on this day</p>
          ) : selectedEvents.map((item) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-3">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">{item.type}</span>
              <p className="text-sm font-medium text-foreground mt-1">{item.title}</p>
              {item.datetime && <p className="text-xs text-muted-foreground mt-1">{format(parseISO(item.datetime), "h:mm a")}</p>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
