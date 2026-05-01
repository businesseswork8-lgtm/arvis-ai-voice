import { Home, CalendarDays, ListTodo, Bell, BookOpen } from "lucide-react";

export type TabKey = "home" | "calendar" | "tasks" | "reminders" | "notes";

interface BottomNavProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "home",      label: "Home",      icon: <Home      className="w-5 h-5" /> },
  { key: "calendar",  label: "Calendar",  icon: <CalendarDays className="w-5 h-5" /> },
  { key: "tasks",     label: "Tasks",     icon: <ListTodo  className="w-5 h-5" /> },
  { key: "reminders", label: "Reminders", icon: <Bell      className="w-5 h-5" /> },
  { key: "notes",     label: "Notes",     icon: <BookOpen  className="w-5 h-5" /> },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(24px)" }}>
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="flex flex-col items-center gap-1 flex-1 py-2 relative group transition-all duration-200"
            >
              {/* Active indicator line */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full"
                  style={{ background: "linear-gradient(90deg,#ff00ff,#bf00ff)", boxShadow: "0 0 8px rgba(255,0,255,0.8)" }} />
              )}

              <span className={`transition-all duration-200 ${isActive ? "text-[#ff00ff] drop-shadow-[0_0_6px_rgba(255,0,255,0.8)]" : "text-zinc-600 group-hover:text-zinc-400"}`}>
                {tab.icon}
              </span>
              <span className={`text-[9px] font-semibold tracking-wider uppercase transition-colors duration-200 ${isActive ? "text-[#ff00ff]" : "text-zinc-600 group-hover:text-zinc-500"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
