import { useState, useCallback, useMemo } from "react";
import { toggleItemDone, saveItems } from "@/lib/storage";
import { useSyncedItems } from "@/hooks/useSyncedItems";
import { format, parseISO, isBefore, isToday, startOfDay, isAfter } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SavedItem } from "@/lib/types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSyncKey } from "@/lib/storage";

type TaskFilter = "overdue" | "today" | "future";

export function TasksTab() {
  const { items: history, loading, refresh } = useSyncedItems();
  const [filter, setFilter] = useState<TaskFilter>("today");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", content: "", dueDate: "", dueTime: "" });
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [subTaskInputs, setSubTaskInputs] = useState<Record<string, string>>({});

  const now = new Date();
  const todayStart = startOfDay(now);

  // Only show parent tasks (no parent_id)
  const tasks = useMemo(() => history.filter((i) => i.type === "Task" && !(i as any).parent_id), [history]);
  const allTasks = useMemo(() => history.filter((i) => i.type === "Task"), [history]);
  const pending = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const completed = useMemo(() => tasks.filter((t) => t.done), [tasks]);

  // Get sub-tasks for a parent
  const getSubTasks = useCallback(
    (parentId: string) => allTasks.filter((t) => (t as any).parent_id === parentId),
    [allTasks]
  );

  const filtered = useMemo(() => {
    return pending.filter((t) => {
      if (!t.datetime) return filter === "future";
      const dt = parseISO(t.datetime);
      if (filter === "overdue") return isBefore(dt, todayStart);
      if (filter === "today") return isToday(dt);
      return isAfter(dt, startOfDay(now)) && !isToday(dt);
    }).sort((a, b) => {
      if (!a.datetime) return 1;
      if (!b.datetime) return -1;
      return parseISO(a.datetime).getTime() - parseISO(b.datetime).getTime();
    });
  }, [pending, filter, todayStart]);

  const counts = useMemo(() => ({
    overdue: pending.filter((t) => t.datetime && isBefore(parseISO(t.datetime), todayStart)).length,
    today: pending.filter((t) => t.datetime && isToday(parseISO(t.datetime))).length,
    future: pending.filter((t) => !t.datetime || (isAfter(parseISO(t.datetime), startOfDay(now)) && !isToday(parseISO(t.datetime)))).length,
  }), [pending, todayStart]);

  const handleToggle = useCallback(async (id: string) => {
    await toggleItemDone(id);
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!newTask.title.trim()) return;
    let datetime: string | null = null;
    if (newTask.dueDate) {
      datetime = newTask.dueTime
        ? `${newTask.dueDate}T${newTask.dueTime}:00`
        : `${newTask.dueDate}T23:59:00`;
    }
    const item: SavedItem = {
      id: crypto.randomUUID(),
      type: "Task",
      folder: "",
      title: newTask.title.trim(),
      content: newTask.content,
      datetime: datetime || undefined,
      confirmed: true,
      dismissed: false,
      savedAt: new Date().toISOString(),
      done: false,
    };
    await saveItems([item]);
    toast.success("Task created");
    setShowForm(false);
    setNewTask({ title: "", content: "", dueDate: "", dueTime: "" });
    refresh();
  };

  const handleAddSubTask = async (parentId: string) => {
    const title = subTaskInputs[parentId]?.trim();
    if (!title) return;
    const syncKey = getSyncKey();
    const { error } = await supabase.from("items").insert({
      id: crypto.randomUUID(),
      sync_key: syncKey,
      type: "Task",
      title,
      parent_id: parentId,
      done: false,
      confirmed: true,
    });
    if (error) {
      console.error("Failed to create sub-task:", error);
      return;
    }
    setSubTaskInputs((prev) => ({ ...prev, [parentId]: "" }));
    toast.success("Sub-task added");
    refresh();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="px-4 pt-4 pb-36 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Tasks</h1>

      {/* Filter tabs */}
      <div className="flex bg-secondary rounded-lg p-0.5">
        {(["overdue", "today", "future"] as TaskFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 px-2 py-2 text-xs font-medium rounded-md transition-colors capitalize ${
              filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Task list */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground/50 text-center py-6">No {filter} tasks</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((task) => {
              const isOverdue = filter === "overdue";
              const isExpanded = expandedTask === task.id;
              const subTasks = getSubTasks(task.id);
              return (
                <motion.div key={task.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="p-3 flex items-start gap-3">
                    <button onClick={() => handleToggle(task.id)}
                      className="mt-0.5 w-5 h-5 rounded-full border-2 border-primary/50 flex-shrink-0 hover:border-primary transition-colors flex items-center justify-center" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      {task.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.content}</p>}
                      {task.datetime && (
                        <span className={`inline-block text-[10px] mt-1.5 px-2 py-0.5 rounded-full ${
                          isOverdue ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
                        }`}>
                          {format(parseISO(task.datetime), "MMM d")}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                      className="mt-0.5 p-1 rounded hover:bg-secondary transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>

                  {/* Sub-tasks */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border/50"
                      >
                        <div className="px-3 py-2 pl-11 space-y-1.5">
                          {subTasks.map((sub) => (
                            <div key={sub.id} className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggle(sub.id)}
                                className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${
                                  sub.done ? "bg-primary/20 border-primary" : "border-muted-foreground/40 hover:border-primary"
                                }`}
                              >
                                {sub.done && <Check className="w-3 h-3 text-primary" />}
                              </button>
                              <span className={`text-xs ${sub.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {sub.title}
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              value={subTaskInputs[task.id] || ""}
                              onChange={(e) => setSubTaskInputs((prev) => ({ ...prev, [task.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === "Enter" && handleAddSubTask(task.id)}
                              placeholder="+ Add sub-task"
                              className="flex-1 text-xs bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 py-1"
                            />
                            {subTaskInputs[task.id]?.trim() && (
                              <button onClick={() => handleAddSubTask(task.id)} className="text-xs text-primary font-medium">Add</button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Completed section */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <button onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {showCompleted ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Completed ({completed.length})
          </button>
          {showCompleted && completed.map((task) => (
            <div key={task.id} className="bg-card/50 rounded-xl border border-border/50 p-3 flex items-start gap-3">
              <button onClick={() => handleToggle(task.id)}
                className="mt-0.5 w-5 h-5 rounded-full bg-primary/20 border-2 border-primary flex-shrink-0 flex items-center justify-center">
                <Check className="w-3 h-3 text-primary" />
              </button>
              <p className="text-sm text-muted-foreground line-through">{task.title}</p>
            </div>
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

      {/* New Task Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={newTask.title} onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
              placeholder="Task title" className="bg-secondary/50 border-border text-foreground" />
            <Input value={newTask.content} onChange={(e) => setNewTask((p) => ({ ...p, content: e.target.value }))}
              placeholder="Description (optional)" className="bg-secondary/50 border-border text-foreground" />
            <Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask((p) => ({ ...p, dueDate: e.target.value }))}
              className="bg-secondary/50 border-border text-foreground" />
            <Input type="time" value={newTask.dueTime} onChange={(e) => setNewTask((p) => ({ ...p, dueTime: e.target.value }))}
              placeholder="Due time (optional)" className="bg-secondary/50 border-border text-foreground" />
            <Button onClick={handleCreate} className="w-full">Create Task</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
