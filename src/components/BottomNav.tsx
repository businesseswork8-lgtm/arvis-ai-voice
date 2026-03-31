import { Home, CalendarDays, ListTodo, FolderOpen, Bell } from "lucide-react";

export type TabKey = "home" | "calendar" | "tasks" | "folders" | "reminders";

interface BottomNavProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "home", label: "Home", icon: <Home className="w-5 h-5" /> },
  { key: "calendar", label: "Calendar", icon: <CalendarDays className="w-5 h-5" /> },
  { key: "tasks", label: "Tasks", icon: <ListTodo className="w-5 h-5" /> },
  { key: "reminders", label: "Reminders", icon: <Bell className="w-5 h-5" /> },
  { key: "folders", label: "Folders", icon: <FolderOpen className="w-5 h-5" /> },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-lg border-t border-border">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-colors ${
              active === tab.key
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
