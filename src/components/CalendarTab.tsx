import { useState, useMemo, useEffect } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  isSameMonth, startOfWeek, endOfWeek, parseISO, addDays,
  setHours,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil } from "lucide-react";
import { useSyncedItems } from "@/hooks/useSyncedItems";
import { syncGCalToLocal, createGCalEvent, deleteGCalEvent } from "@/lib/gcal";
import { saveItems, updateItem, deleteItem } from "@/lib/storage";
import { SavedItem, EVENT_COLORS } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";

type CalView = "M" | "W" | "D";

const DEFAULT_EVENT_COLOR = "#6366f1";

export function CalendarTab() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<CalView>("M");
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SavedItem | null>(null);
  const [editingEvent, setEditingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "", content: "", date: "", startTime: "09:00", endTime: "10:00", color: DEFAULT_EVENT_COLOR,
  });
  const { items: history, loading, refresh } = useSyncedItems();

  // Sync Google Calendar events on mount
  useEffect(() => {
    syncGCalToLocal().then((count) => {
      if (count > 0) refresh();
    });
  }, []);

  const events = useMemo(() => history.filter((i) => i.type === "Calendar Event" && i.datetime), [history]);

  const getEventColor = (event: SavedItem) => event.event_color || DEFAULT_EVENT_COLOR;

  const openNewEvent = (date?: Date, hour?: number) => {
    const d = date || selectedDate;
    const h = hour ?? 9;
    setNewEvent({
      title: "", content: "",
      date: format(d, "yyyy-MM-dd"),
      startTime: `${String(h).padStart(2, "0")}:00`,
      endTime: `${String(Math.min(h + 1, 23)).padStart(2, "0")}:00`,
      color: DEFAULT_EVENT_COLOR,
    });
    setEditingEvent(false);
    setShowEventModal(true);
  };

  const openEditEvent = () => {
    if (!selectedEvent) return;
    const dt = selectedEvent.datetime ? parseISO(selectedEvent.datetime) : new Date();
    const endDt = selectedEvent.end_datetime ? parseISO(selectedEvent.end_datetime) : new Date(dt.getTime() + 3600000);
    setNewEvent({
      title: selectedEvent.title,
      content: selectedEvent.content,
      date: format(dt, "yyyy-MM-dd"),
      startTime: format(dt, "HH:mm"),
      endTime: format(endDt, "HH:mm"),
      color: selectedEvent.event_color || DEFAULT_EVENT_COLOR,
    });
    setEditingEvent(true);
    setShowDetailModal(false);
    setShowEventModal(true);
  };

  const handleSaveEvent = async () => {
    if (!newEvent.title.trim()) return;
    const datetime = `${newEvent.date}T${newEvent.startTime}:00`;
    const end_datetime = `${newEvent.date}T${newEvent.endTime}:00`;

    if (editingEvent && selectedEvent) {
      await updateItem(selectedEvent.id, {
        title: newEvent.title.trim(),
        content: newEvent.content,
        datetime,
        end_datetime,
        event_color: newEvent.color,
      });
      toast.success("Event updated");
    } else {
      const item: SavedItem = {
        id: crypto.randomUUID(),
        type: "Calendar Event",
        folder: "",
        title: newEvent.title.trim(),
        content: newEvent.content,
        datetime,
        end_datetime,
        event_color: newEvent.color,
        confirmed: true,
        dismissed: false,
        savedAt: new Date().toISOString(),
        done: false,
      };
      await saveItems([item]);
      toast.success("Event created");
      // Push to Google Calendar in background
      createGCalEvent({
        title: item.title,
        description: item.content,
        start_datetime: datetime,
        end_datetime,
      }).catch((err) => console.error("GCal push failed:", err));
    }
    setShowEventModal(false);
    refresh();
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    await deleteItem(selectedEvent.id);
    // Also delete from Google Calendar if it was synced there
    if (selectedEvent.google_calendar_event_id) {
      deleteGCalEvent(selectedEvent.google_calendar_event_id).catch(() => {});
    }
    toast.success("Event deleted");
    setShowDetailModal(false);
    refresh();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="px-4 pt-4 pb-36 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Calendar</h1>
        <div className="flex bg-secondary rounded-lg p-0.5">
          {(["M", "W", "D"] as CalView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h2 className="text-base font-semibold text-foreground">{getHeaderText()}</h2>
        <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Views */}
      {view === "M" && <MonthView />}
      {view === "W" && <WeekView />}
      {view === "D" && <DayView />}

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => openNewEvent()}
        className="fixed bottom-36 right-4 z-40 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg"
      >
        <Plus className="w-5 h-5 text-primary-foreground" />
      </motion.button>

      {/* New/Edit Event Modal */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingEvent ? "Edit Event" : "New Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={newEvent.title} onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))} placeholder="Event title" className="bg-secondary/50 border-border text-foreground" />
            <Input value={newEvent.content} onChange={(e) => setNewEvent((p) => ({ ...p, content: e.target.value }))} placeholder="Description (optional)" className="bg-secondary/50 border-border text-foreground" />
            <Input type="date" value={newEvent.date} onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))} className="bg-secondary/50 border-border text-foreground" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Start</label>
                <Input type="time" value={newEvent.startTime} onChange={(e) => setNewEvent((p) => ({ ...p, startTime: e.target.value }))} className="bg-secondary/50 border-border text-foreground" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">End</label>
                <Input type="time" value={newEvent.endTime} onChange={(e) => setNewEvent((p) => ({ ...p, endTime: e.target.value }))} className="bg-secondary/50 border-border text-foreground" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Color</label>
              <div className="flex gap-2 mt-1">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewEvent((p) => ({ ...p, color: c }))}
                    className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                    style={{ backgroundColor: c }}
                  >
                    {newEvent.color === c && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleSaveEvent} className="w-full">{editingEvent ? "Update" : "Create"} Event</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground">{selectedEvent.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {selectedEvent.content && <p className="text-sm text-muted-foreground">{selectedEvent.content}</p>}
                {selectedEvent.datetime && (
                  <p className="text-sm text-foreground">{format(parseISO(selectedEvent.datetime), "EEEE, MMM d · h:mm a")}</p>
                )}
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: getEventColor(selectedEvent) }} />
                <div className="flex gap-2 pt-2">
                  <Button onClick={openEditEvent} variant="outline" className="flex-1">
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button onClick={handleDeleteEvent} variant="destructive" className="flex-1">
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  function navigate(dir: number) {
    if (view === "M") setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1));
    else if (view === "W") setCurrentDate((d) => addDays(d, dir * 7));
    else setCurrentDate((d) => addDays(d, dir));
  }

  function getHeaderText() {
    if (view === "M") return format(currentDate, "MMMM yyyy");
    if (view === "W") {
      const ws = startOfWeek(currentDate);
      const we = endOfWeek(currentDate);
      return `${format(ws, "MMM d")} – ${format(we, "MMM d")}`;
    }
    return format(currentDate, "EEEE, MMM d");
  }

  function MonthView() {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    const selectedEvents = events.filter((e) => isSameDay(parseISO(e.datetime!), selectedDate));

    return (
      <>
        <div className="grid grid-cols-7 gap-1">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayEvents = events.filter((e) => isSameDay(parseISO(e.datetime!), day));
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentDate);
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
                {dayEvents.length > 0 && !isSelected && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((e, i) => (
                      <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: getEventColor(e) }} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">{format(selectedDate, "EEEE, MMM d")}</h3>
            <button onClick={() => openNewEvent(selectedDate)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <Plus className="w-4 h-4 text-primary" />
            </button>
          </div>
          <AnimatePresence mode="wait">
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground/50 text-center py-6">No events. Tap + to add one.</p>
            ) : selectedEvents.map((item) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => { setSelectedEvent(item); setShowDetailModal(true); }}
                className="w-full text-left rounded-xl border border-border p-3"
                style={{ backgroundColor: `${getEventColor(item)}10`, borderColor: `${getEventColor(item)}30` }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: getEventColor(item) }} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    {item.datetime && <p className="text-xs text-muted-foreground">{format(parseISO(item.datetime), "h:mm a")}</p>}
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </>
    );
  }

  function WeekView() {
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 18 }, (_, i) => i + 6);

    return (
      <div className="overflow-x-auto">
        <div className="grid grid-cols-[50px_repeat(7,1fr)] sticky top-0 bg-background z-10 border-b border-border">
          <div />
          {weekDays.map((d) => (
            <div key={d.toISOString()} className={`text-center py-2 text-xs ${isSameDay(d, new Date()) ? "text-primary font-bold" : "text-muted-foreground"}`}>
              <div>{format(d, "EEE")}</div>
              <div className={`text-sm ${isSameDay(d, new Date()) ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center mx-auto" : ""}`}>
                {format(d, "d")}
              </div>
            </div>
          ))}
        </div>

        <div className="relative" style={{ height: `${hours.length * 48}px` }}>
          {hours.map((h) => (
            <div key={h} className="grid grid-cols-[50px_repeat(7,1fr)] absolute w-full border-b border-border/30" style={{ top: `${(h - 6) * 48}px`, height: "48px" }}>
              <div className="text-[10px] text-muted-foreground pr-2 text-right pt-0.5">{format(setHours(new Date(), h), "ha")}</div>
              {weekDays.map((d) => (
                <button
                  key={d.toISOString()}
                  onClick={() => openNewEvent(d, h)}
                  className="border-l border-border/20 hover:bg-secondary/30 transition-colors"
                />
              ))}
            </div>
          ))}

          {events.map((event) => {
            const dt = parseISO(event.datetime!);
            const dayIdx = weekDays.findIndex((d) => isSameDay(d, dt));
            if (dayIdx === -1) return null;
            const hour = dt.getHours();
            const min = dt.getMinutes();
            if (hour < 6) return null;
            const top = (hour - 6) * 48 + (min / 60) * 48;
            const colWidth = `calc((100% - 50px) / 7)`;
            const left = `calc(50px + ${dayIdx} * ${colWidth})`;
            return (
              <button
                key={event.id}
                onClick={() => { setSelectedEvent(event); setShowDetailModal(true); }}
                className="absolute rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white truncate z-10"
                style={{
                  top: `${top}px`, left, width: colWidth, height: "46px",
                  backgroundColor: getEventColor(event),
                }}
              >
                {event.title}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function DayView() {
    const hours = Array.from({ length: 18 }, (_, i) => i + 6);
    const dayEvents = events.filter((e) => isSameDay(parseISO(e.datetime!), currentDate));

    return (
      <div className="relative">
        {hours.map((h) => (
          <button
            key={h}
            onClick={() => openNewEvent(currentDate, h)}
            className="w-full flex border-b border-border/30 hover:bg-secondary/30 transition-colors"
            style={{ height: "56px" }}
          >
            <div className="w-14 text-[10px] text-muted-foreground text-right pr-2 pt-1 flex-shrink-0">
              {format(setHours(new Date(), h), "h a")}
            </div>
            <div className="flex-1 relative" />
          </button>
        ))}

        {dayEvents.map((event) => {
          const dt = parseISO(event.datetime!);
          const hour = dt.getHours();
          const min = dt.getMinutes();
          if (hour < 6) return null;
          const top = (hour - 6) * 56 + (min / 60) * 56;
          return (
            <button
              key={event.id}
              onClick={() => { setSelectedEvent(event); setShowDetailModal(true); }}
              className="absolute left-14 right-2 rounded-lg px-3 py-1.5 text-white text-sm font-medium z-10"
              style={{ top: `${top}px`, height: "54px", backgroundColor: getEventColor(event) }}
            >
              <p className="truncate">{event.title}</p>
              <p className="text-xs text-white/80">{format(dt, "h:mm a")}</p>
            </button>
          );
        })}
      </div>
    );
  }
}
