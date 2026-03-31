import { useState } from "react";
import { getSettings, saveSettings, clearHistory } from "@/lib/storage";
import { FolderDef } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface SettingsViewProps {
  onBack: () => void;
}

export function SettingsView({ onBack }: SettingsViewProps) {
  const [settings, setSettings] = useState(getSettings);
  const [newFolderLabel, setNewFolderLabel] = useState("");
  const [newFolderEmoji, setNewFolderEmoji] = useState("📁");

  const save = (updated: typeof settings) => {
    setSettings(updated);
    saveSettings(updated);
  };

  const addFolder = () => {
    if (!newFolderLabel.trim()) return;
    const key = newFolderLabel.toLowerCase().replace(/\s+/g, "-");
    const folder: FolderDef = { key, label: newFolderLabel.trim(), emoji: newFolderEmoji };
    save({ ...settings, customFolders: [...settings.customFolders, folder] });
    setNewFolderLabel("");
    setNewFolderEmoji("📁");
    toast.success("Folder added");
  };

  const removeFolder = (key: string) => {
    save({ ...settings, customFolders: settings.customFolders.filter((f) => f.key !== key) });
    toast.success("Folder removed");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={onBack} className="p-2 rounded-md hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* API Key */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">OpenRouter API Key</label>
          <Input
            type="password"
            value={settings.apiKey}
            onChange={(e) => save({ ...settings, apiKey: e.target.value })}
            placeholder="sk-or-..."
            className="bg-secondary/50 border-border text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Get your key at{" "}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-accent underline">
              openrouter.ai/keys
            </a>
          </p>
        </div>

        {/* Model */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Model</label>
          <Input
            value={settings.model}
            onChange={(e) => save({ ...settings, model: e.target.value })}
            className="bg-secondary/50 border-border text-foreground"
          />
        </div>

        {/* Custom Folders */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Custom Folders</label>
          {settings.customFolders.map((f) => (
            <div key={f.key} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
              <span className="text-sm text-foreground">{f.emoji} {f.label}</span>
              <button onClick={() => removeFolder(f.key)} className="text-destructive hover:text-destructive/80">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newFolderEmoji}
              onChange={(e) => setNewFolderEmoji(e.target.value)}
              className="w-14 bg-secondary/50 border-border text-foreground text-center"
              maxLength={2}
            />
            <Input
              value={newFolderLabel}
              onChange={(e) => setNewFolderLabel(e.target.value)}
              placeholder="Folder name"
              className="flex-1 bg-secondary/50 border-border text-foreground"
              onKeyDown={(e) => e.key === "Enter" && addFolder()}
            />
            <Button size="icon" onClick={addFolder} className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Clear Data */}
        <div className="pt-4 border-t border-border">
          <Button
            variant="destructive"
            onClick={() => {
              clearHistory();
              toast.success("All data cleared");
            }}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Data
          </Button>
        </div>
      </div>
    </div>
  );
}
