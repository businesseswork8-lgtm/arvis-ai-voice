import { useState, useCallback, useMemo } from "react";
import { toggleItemDone, saveItems, updateItem, deleteItem } from "@/lib/storage";
import { useSyncedItems } from "@/hooks/useSyncedItems";
import { format, parseISO, isBefore, isToday, startOfDay, isAfter } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Check } from "lucide-react";
import { SavedItem } from "@/lib/types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type TaskFilter = "overdue" | "today" | "future";

export function TasksTab() {
  const { items: history, loading } = useSyncedItems();
  const [filter, setFilter] = useState<TaskFilter>("today");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", content: "", dueDate: format(new Date(), "yyyy-MM-dd"), dueTime: "" });
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

  const getSubTasks = useCallback((parentId: string) => allTasks.filter((t) => (t as any).parent_id === parentId), [allTasks]);

  const filtered = useMemo(() => pending.filter((t) => {
    if (!t.datetime) return filter === "today";
    const dt = parseISO(t.datetime);
    if (filter === "overdue") return isBefore(dt, todayStart);
    if (filter === "today") return isToday(dt);
    return isAfter(dt, startOfDay(now)) && !isToday(dt);
  }).sort((a, b) => {
    if (!a.datetime) return -1;
    if (!b.datetime) return 1;
    return parseISO(a.datetime).getTime() - parseISO(b.datetime).getTime();
  }), [pending, filter, todayStart]);

  const counts = useMemo(() => ({
    overdue: pending.filter((t) => t.datetime && isBefore(parseISO(t.datetime), todayStart)).length,
    today: pending.filter((t) => !t.datetime || isToday(parseISO(t.datetime))).length,
    future: pending.filter((t) => t.datetime && isAfter(parseISO(t.datetime), startOfDay(now)) && !isToday(parseISO(t.datetime))).length,
  }), [pending, todayStart]);

  const handleToggle = useCallback(async (id: string) => { await toggleItemDone(id); }, []);
  const handleDelete = async (id: string) => { await deleteItem(id); toast.success("Deleted"); };

  const handleCreate = async () => {
    if (!newTask.title.trim()) { toast.error("Enter a task title"); return; }
    let datetime: string | undefined;
    if (newTask.dueDate) datetime = newTask.dueTime ? `${newTask.dueDate}T${newTask.dueTime}:00` : `${newTask.dueDate}T23:59:00`;
    await saveItems([{ id: crypto.randomUUID(), type: "Task", folder: "", title: newTask.title.trim(), content: newTask.content, datetime, confirmed: true, dismissed: false, savedAt: new Date().toISOString(), done: false }]);
    toast.success("Task created");
    setShowForm(false);
    setNewTask({ title: "", content: "", dueDate: format(new Date(), "yyyy-MM-dd"), dueTime: "" });
  };

  const openEdit = (task: SavedItem) => {
    const dt = task.datetime ? parseISO(task.datetime) : null;
    setEditForm({ title: task.title, content: task.content || "", dueDate: dt ? format(dt, "yyyy-MM-dd") : "", dueTime: dt ? format(dt, "HH:mm") : "" });
    setEditingTask(task);
  };

  const handleSaveEdit = async () => {
    if (!editingTask || !editForm.title.trim()) return;
    const datetime = editForm.dueDate ? (editForm.dueTime ? `${editForm.dueDate}T${editForm.dueTime}:00` : `${editForm.dueDate}T23:59:00`) : null;
    await updateItem(editingTask.id, { title: editForm.title.trim(), content: editForm.content, datetime });
    toast.success("Task updated");
    setEditingTask(null);
  };

  const handleAddSubTask = async (parentId: string) => {
    const title = subTaskInputs[parentId]?.trim();
    if (!title) return;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) { toast.error("Not signed in"); return; }
    const { error } = await supabase.from("items").insert({ id: crypto.randomUUID(), user_id: userId, type: "Task", title, parent_id: parentId, done: false, confirmed: true });
    if (error) { console.error(error); return; }
    setSubTaskInputs((prev) => ({ ...prev, [parentId]: "" }));
    toast.success("Sub-task added");
    window.dispatchEvent(new CustomEvent("items-updated"));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="pb-36 pt-2">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <div>
          <p className="label-caps mb-1">TASKS</p>
          <h1 className="text-2xl font-bold text-white">Matrix</h1>
        </div>
        <button onClick={() => setShowForm(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
          <Plus className="w-4 h-4 text-blue-400" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mx-5 mb-5 flex rounded-xl overflow-hidden" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
        {([["overdue", "Overdue"], ["today", "Today"], ["future", "Future"]] as [TaskFilter, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className="flex-1 py-2.5 text-xs font-semibold tracking-widest uppercase transition-all relative"
            style={filter === key
              ? { background: "rgba(59,130,246,0.1)", color: "#3b82f6", borderBottom: "2px solid #3b82f6" }
              : { color: "#555", borderBottom: "2px solid transparent" }}>
            {label}
            {counts[key] > 0 && (
              <span className="ml-1 text-[9px] px-1 rounded-full" style={{ background: filter === key ? "#3b82f6" : "#222", color: filter === key ? "#fff" : "#555" }}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mx-4 mb-4 rounded-2xl p-4 space-y-3" style={{ background: "#0d0d0d", border: "1px solid #222" }}>
            <div className="flex items-center justify-between">
              <p className="label-caps text-blue-400">NEW TASK</p>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-zinc-600" /></button>
            </div>
            <input value={newTask.title} onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
              placeholder="What needs to get done?" autoFocus
              className="w-full bg-transparent text-white text-sm placeholder-zinc-600 focus:outline-none border-b border-zinc-800 pb-2" />
            <input value={newTask.content} onChange={(e) => setNewTask((p) => ({ ...p, content: e.target.value }))}
              placeholder="Notes (optional)"
              className="w-full bg-transparent text-zinc-400 text-xs placeholder-zinc-700 focus:outline-none" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="label-caps mb-1.5">DUE DATE</p>
                <input type="date" value={newTask.dueDate} onChange={(e) => setNewTask((p) => ({ ...p, dueDate: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <p className="label-caps mb-1.5">TIME (OPT)</p>
                <input type="time" value={newTask.dueTime} onChange={(e) => setNewTask((p) => ({ ...p, dueTime: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500/50" />
              </div>
            </div>
            <button onClick={handleCreate}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm"
              style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", boxShadow: "0 0 20px rgba(59,130,246,0.3)" }}>
              Create Task
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task list */}
      <div className="px-4 space-y-2">
        <AnimatePresence>
          {filtered.map((task) => {
            const subTasks = getSubTasks(task.id);
            const isExpanded = expandedTask === task.id;
            const isOverdue = task.datetime && isBefore(parseISO(task.datetime), todayStart);
            return (
              <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="rounded-xl overflow-hidden" style={{ background: "#0a0a0a", border: `1px solid ${isOverdue ? "rgba(239,68,68,0.2)" : "#1a1a1a"}` }}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Checkbox */}
                    <button onClick={() => handleToggle(task.id)}
                      className="w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all hover:scale-110"
                      style={{ borderColor: isOverdue ? "#ef4444" : "#3b82f6" }} />

                    {/* Content */}
                    <div className="flex-1 min-w-0" onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
                      <p className="text-sm font-medium text-white truncate">{task.title}</p>
                      {task.datetime && (
                        <p className="text-xs mt-0.5" style={{ color: isOverdue ? "#ef4444" : "#555" }}>
                          {isOverdue ? "⚠ " : ""}{format(parseISO(task.datetime), "MMM d · h:mm a")}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {subTasks.length > 0 && (
                        <button onClick={() => setExpandedTask(isExpanded ? null : task.id)} className="text-zinc-600">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      )}
                      <button onClick={() => openEdit(task)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#1a1a1a" }}>
                        <Pencil className="w-3 h-3 text-zinc-500" />
                      </button>
                      <button onClick={() => handleDelete(task.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#1a0505" }}>
                        <Trash2 className="w-3 h-3 text-red-500/70" />
                      </button>
                    </div>
                  </div>

                  {/* Sub-tasks */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/5">
                        {subTasks.map((sub) => (
                          <div key={sub.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0" style={{ background: "#060606" }}>
                            <button onClick={() => handleToggle(sub.id)}
                              className="w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center"
                              style={{ borderColor: sub.done ? "#333" : "#3b82f6", backgroundColor: sub.done ? "#333" : "transparent" }}>
                              {sub.done && <Check className="w-2.5 h-2.5 text-zinc-600" />}
                            </button>
                            <p className={`text-xs flex-1 ${sub.done ? "line-through text-zinc-600" : "text-zinc-400"}`}>{sub.title}</p>
                          </div>
                        ))}
                        {/* Add sub-task input */}
                        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#060606" }}>
                          <div className="w-4 h-4 rounded-full border border-dashed border-zinc-700 flex-shrink-0" />
                          <input
                            value={subTaskInputs[task.id] || ""}
                            onChange={(e) => setSubTaskInputs((p) => ({ ...p, [task.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && handleAddSubTask(task.id)}
                            placeholder="Add sub-task…"
                            className="flex-1 bg-transparent text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="text-3xl mb-3">✓</span>
            <p className="text-zinc-400 font-medium">
              {filter === "overdue" ? "No overdue tasks" : filter === "future" ? "No future tasks" : "All caught up!"}
            </p>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div className="pt-2">
            <button onClick={() => setShowCompleted((s) => !s)}
              className="flex items-center gap-2 py-2 w-full">
              <span className="label-caps text-zinc-600">COMPLETED ({completed.length})</span>
              {showCompleted ? <ChevronDown className="w-3.5 h-3.5 text-zinc-700" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />}
            </button>
            <AnimatePresence>
              {showCompleted && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="space-y-1.5 overflow-hidden">
                  {completed.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#060606", border: "1px solid #111" }}>
                      <button onClick={() => handleToggle(task.id)}
                        className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ background: "#1a1a1a" }}>
                        <Check className="w-3 h-3 text-zinc-600" />
                      </button>
                      <p className="text-sm text-zinc-600 line-through truncate flex-1">{task.title}</p>
                      <button onClick={() => handleDelete(task.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-zinc-700 hover:text-red-500 transition-colors" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editingTask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}>
            <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              className="w-full max-w-md rounded-2xl p-5 space-y-4" style={{ background: "#0d0d0d", border: "1px solid #222" }}>
              <div className="flex items-center justify-between">
                <p className="label-caps text-blue-400">EDIT TASK</p>
                <button onClick={() => setEditingTask(null)}><X className="w-4 h-4 text-zinc-600" /></button>
              </div>
              <input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Task title" autoFocus
                className="w-full bg-transparent text-white text-sm placeholder-zinc-600 focus:outline-none border-b border-zinc-800 pb-2" />
              <input value={editForm.content} onChange={(e) => setEditForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="Notes (optional)"
                className="w-full bg-transparent text-zinc-400 text-xs placeholder-zinc-700 focus:outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={editForm.dueDate} onChange={(e) => setEditForm((p) => ({ ...p, dueDate: e.target.value }))}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none" />
                <input type="time" value={editForm.dueTime} onChange={(e) => setEditForm((p) => ({ ...p, dueTime: e.target.value }))}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none" />
              </div>
              <button onClick={handleSaveEdit}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm"
                style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}>
                Save Changes
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#3b82f6", borderTopColor: "transparent" }} />
    </div>
  );
}
