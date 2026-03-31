import { useState, useCallback } from "react";
import { getHistory, toggleItemDone } from "@/lib/storage";
import { format, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

export function TasksTab() {
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const history = getHistory();
  const tasks = history.filter((i) => i.type === "Task" || i.type === "Reminder");
  const pending = tasks.filter((t) => !t.done);
  const completed = tasks.filter((t) => t.done);

  const handleToggle = (id: string) => {
    toggleItemDone(id);
    refresh();
  };

  return (
    <div className="px-4 pt-4 pb-36 space-y-6">
      <h1 className="text-xl font-bold text-foreground">Tasks</h1>

      {/* Pending */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Pending ({pending.length})
        </h2>
        <AnimatePresence>
          {pending.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card rounded-xl border border-border p-3 flex items-start gap-3"
            >
              <button
                onClick={() => handleToggle(task.id)}
                className="mt-0.5 w-5 h-5 rounded-full border-2 border-primary/50 flex-shrink-0 hover:border-primary transition-colors flex items-center justify-center"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{task.title}</p>
                {task.content && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.content}</p>
                )}
                <div className="flex gap-2 mt-1.5">
                  {task.datetime && (
                    <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                      {format(parseISO(task.datetime), "MMM d")}
                    </span>
                  )}
                  {task.folder && (
                    <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                      {task.folder}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {pending.length === 0 && (
          <p className="text-sm text-muted-foreground/50 text-center py-6">No pending tasks ✨</p>
        )}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Completed ({completed.length})
          </h2>
          {completed.map((task) => (
            <div
              key={task.id}
              className="bg-card/50 rounded-xl border border-border/50 p-3 flex items-start gap-3"
            >
              <button
                onClick={() => handleToggle(task.id)}
                className="mt-0.5 w-5 h-5 rounded-full bg-primary/20 border-2 border-primary flex-shrink-0 flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-primary" />
              </button>
              <p className="text-sm text-muted-foreground line-through">{task.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
