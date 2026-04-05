import { useState, useCallback, useMemo } from "react";
import { toggleItemDone, saveItems, updateItem } from "@/lib/storage";
import { useSyncedItems } from "@/hooks/useSyncedItems";
import { format, parseISO, isBefore, isToday, startOfDay, isAfter } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [newTask, setNewTask] = useState({ title: "", content: "", dueDate: format(new Date(), "yyyy-MM-dd"), dueTime: "09:00" });
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [subTaskInputs, setSubTaskInputs] = useState<Record<string, string>>({});
  const [editingTask, setEditingTask] = useState<SavedItem | null>(null);
  const [editForm, setEditForm] = useState({ title: "", content: "", dueDate: "", dueTime: "" });

  const now = new Date();
  const todayStart = startOfDay(now);

  const tasks = useMemo(() => history.filter((i) => i.type === "Task" && !(i as any).parent_id), [history]);
  const allTasks = useMemo(() => history.filter((i) => i.type === "Task"), [history]);
  const pending = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const completed = useMemo(() => tasks.filter((t) => t.done), [tasks]);

  const getSubTasks = useCallback(
    (parentId: string) => allTasks.filter((t) => (t as any).parent_id === parentId),
    [allTasks]
  );

  const filtered = useMemo(() => {
    return pending.filter((t) => {
      if (!t.datetime) return filter === "today"; // Show dateless tasks in Today so they don't get lost
      const dt = parseISO(t.datetime);
      if (filter === "overdue") return isBefore(dt, todayStart);
      if (filter === "today") return isToday(dt);
      return isAfter(dt, startOfDay(now)) && !isToday(dt);
    }).sort((a, b) => {
      if (!a.datetime) return -1; // Dateless tasks stay at top of Today
      if (!b.datetime) return 1;
      return parseISO(a.datetime).getTime() - parseISO(b.datetime).getTime();
    });
  }, [pending, filter, todayStart]);

  const counts = useMemo(() => ({
    overdue: pending.filter((t) => t.datetime && isBefore(parseISO(t.datetime), todayStart)).length,
    today: pending.filter((t) => !t.datetime || isToday(parseISO(t.datetime))).length,
    future: pending.filter((t) => t.datetime && isAfter(parseISO(t.datetime), startOfDay(now)) && !isToday(parseISO(t.datetime))).length,
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
    setNewTask({ title: "", content: "", dueDate: format(new Date(), "yyyy-MM-dd"), dueTime: "09:00" });
    refresh();
  };

  const openEdit = (task: SavedItem) => {
    const dt = task.datetime ? parseISO(task.datetime) : null;
    setEditForm({
      title: task.title,
      content: task.content || "",
      dueDate: dt ? format(dt, "yyyy-MM-dd") : "",
      dueTime: dt ? format(dt, "HH:mm") : "",
    });
    setEditingTask(task);
  };

  const handleSaveEdit = async () => {
    if (!editingTask || !editForm.title.trim()) return;
    let datetime: string | null = null;
    if (editForm.dueDate) {
      datetime = editForm.dueTime
        ? `${editForm.dueDate}T${editForm.dueTime}:00`
        : `${editForm.dueDate}T23:59:00`;
    }
    await updateItem(editingTask.id, {
      title: editForm.title.trim(),
      content: editForm.content,
      datetime,
    });
    toast.success("Task updated");
    setEditingTask(null);
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

  const renderTaskCard = (task: SavedItem, isOverdue: boolean, showSubTasks = true) => {
    const isExpanded = expandedTask === task.id;
    const subTasks = getSubTasks(task.id);
    return (
      <motion.div key={task.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
        className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-3 flex items-start gap-3">
          <button onClick={() => handleToggle(task.id)}
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors flex items-center justify-center ${
              task.done ? "bg-primary/20 border-primary" : "border-primary/50 hover:border-primary"
            }`}>
            {task.done && <Check className="w-3 h-3 text-primary" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${task.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
            {task.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.content}</p>}
            {task.datetime && (
              <span className={`inline-block text-[10px] mt-1.5 px-2 py-0.5 rounded-full ${
                isOverdue ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
              }`}>
                {format(parseISO(task.datetime), "MMM d, h:mm a")}
              </span>
            )}
          </div>
          <button onClick={() => openEdit(task)} className="mt-0.5 p-1 rounded hover:bg-secondary transition-colors">
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {showSubTasks && (
            <button onClick={() => setExpandedTask(isExpanded ? null : task.id)}
              className="mt-0.5 p-1 rounded hover:bg-secondary transition-colors">
              {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
          )}
        </div>

        {showSubTasks && (
          <AnimatePresence>
            {isExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="border-t border-border/50">
                <div className="px-3 py-2 pl-11 space-y-1.5">
                  {subTasks.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2">
                      <button onClick={() => handleToggle(sub.id)}
                        className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${
                          sub.done ? "bg-primary/20 border-primary" : "border-muted-foreground/40 hover:border-primary"
                        }`}>
                        {sub.done && <Check className="w-3 h-3 text-primary" />}
                      </button>
                      <span className={`text-xs ${sub.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{sub.title}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-1">
                    <input value={subTaskInputs[task.id] || ""}
                      onChange={(e) => setSubTaskInputs((prev) => ({ ...prev, [task.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSubTask(task.id)}
                      placeholder="+ Add sub-task"
                      className="flex-1 text-xs bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 py-1" />
                    {subTaskInputs[task.id]?.trim() && (
                      <button onClick={() => handleAddSubTask(task.id)} className="text-xs text-primary font-medium">Add</button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    );
  };

  return (
    <div className="px-4 pt-4 pb-36 space-y-4">
      <h1 className="text-xl font-bold text-foreground pr-10">Tasks</h1>

      <div className="flex bg-secondary rounded-lg p-0.5">
        {(["overdue", "today", "future"] as TaskFilter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 px-2 py-2 text-xs font-medium rounded-md transition-colors capitalize ${
              filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground/50 text-center py-6">No {filter} tasks</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((task) => renderTaskCard(task, filter === "overdue"))}
          </div>
        )}
      </AnimatePresence>

      {completed.length > 0 && (
        <div className="space-y-2">
          <button onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {showCompleted ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Completed ({completed.length})
          </button>
          {showCompleted && completed.map((task) => renderTaskCard(task, false, false))}
        </div>
      )}

      {/* FAB */}
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowForm(true)}
        className="fixed bottom-36 right-4 z-40 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
        <Plus className="w-5 h-5 text-primary-foreground" />
      </motion.button>

      {/* New Task Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader><DialogTitle className="text-foreground">New Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-foreground text-xs mb-1.5 block">Title</Label>
              <Input value={newTask.title} onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                placeholder="Task title" className="bg-secondary/50 border-border text-foreground" />
            </div>
            <div>
              <Label className="text-foreground text-xs mb-1.5 block">Description</Label>
              <Input value={newTask.content} onChange={(e) => setNewTask((p) => ({ ...p, content: e.target.value }))}
                placeholder="Optional" className="bg-secondary/50 border-border text-foreground" />
            </div>
            <div>
              <Label className="text-foreground text-xs mb-1.5 block">Due date</Label>
              <Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask((p) => ({ ...p, dueDate: e.target.value }))}
                className="bg-secondary/50 border-border text-foreground" />
            </div>
            <div>
              <Label className="text-foreground text-xs mb-1.5 block">Time</Label>
              <Input type="time" value={newTask.dueTime} onChange={(e) => setNewTask((p) => ({ ...p, dueTime: e.target.value }))}
                className="bg-secondary/50 border-border text-foreground" />
            </div>
            <Button onClick={handleCreate} className="w-full">Create Task</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader><DialogTitle className="text-foreground">Edit Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-foreground text-xs mb-1.5 block">Title</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                className="bg-secondary/50 border-border text-foreground" />
            </div>
            <div>
              <Label className="text-foreground text-xs mb-1.5 block">Description</Label>
              <Input value={editForm.content} onChange={(e) => setEditForm((p) => ({ ...p, content: e.target.value }))}
                className="bg-secondary/50 border-border text-foreground" />
            </div>
            <div>
              <Label className="text-foreground text-xs mb-1.5 block">Due date</Label>
              <Input type="date" value={editForm.dueDate} onChange={(e) => setEditForm((p) => ({ ...p, dueDate: e.target.value }))}
                className="bg-secondary/50 border-border text-foreground" />
            </div>
            <div>
              <Label className="text-foreground text-xs mb-1.5 block">Time</Label>
              <Input type="time" value={editForm.dueTime} onChange={(e) => setEditForm((p) => ({ ...p, dueTime: e.target.value }))}
                className="bg-secondary/50 border-border text-foreground" />
            </div>
            <Button onClick={handleSaveEdit} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
