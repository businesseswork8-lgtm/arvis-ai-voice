import { useState } from "react";
import { getSettings, saveSettings, clearHistory, getSyncKey, setSyncKey } from "@/lib/storage";
import { FolderDef } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface SettingsViewProps {
  onBack: () => void;
}

export function SettingsView({ onBack }: SettingsViewProps) {
  const [settings, setSettings] = useState(getSettings);
  const [syncKey, setSyncKeyState] = useState(getSyncKey);
  const [editSyncKey, setEditSyncKey] = useState("");
  const [showEditSync, setShowEditSync] = useState(false);
  const [newFolderLabel, setNewFolderLabel] = useState("");
  const [newFolderEmoji, setNewFolderEmoji] = useState("📁");

  const save = (updated: typeof settings) => {
    setSettings(updated);
    saveSettings(updated);
  };

  const copySyncKey = () => {
    navigator.clipboard.writeText(syncKey);
    toast.success("Sync key copied!");
  };

  const applySyncKey = () => {
    const trimmed = editSyncKey.trim();
    if (!trimmed) return;
    // Basic UUID validation
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      toast.error("Invalid sync key format. Must be a UUID.");
      return;
    }
    setSyncKey(trimmed);
    setSyncKeyState(trimmed);
    setShowEditSync(false);
    setEditSyncKey("");
    toast.success("Sync key updated! Data will sync from the new key.");
    // Reload to fetch data with new key
    window.location.reload();
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
    <div className="flex flex-col h-full min-h-screen bg-background">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={onBack} className="p-2 rounded-md hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Sync Key */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Sync Key</label>
          <p className="text-xs text-muted-foreground">
            Use this key on any device to see your data. Copy it and paste in the other device's Settings.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-secondary/50 rounded-lg px-3 py-2.5 text-foreground font-mono break-all select-all border border-border">
              {syncKey}
            </code>
            <Button size="icon" variant="outline" onClick={copySyncKey} title="Copy sync key">
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          {!showEditSync ? (
            <Button variant="ghost" size="sm" onClick={() => setShowEditSync(true)} className="text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Use a different sync key
            </Button>
          ) : (
            <div className="space-y-2 bg-secondary/30 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Paste a sync key from another device:</p>
              <div className="flex gap-2">
                <Input
                  value={editSyncKey}
                  onChange={(e) => setEditSyncKey(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="flex-1 bg-secondary/50 border-border text-foreground font-mono text-xs"
                />
                <Button size="sm" onClick={applySyncKey}>Apply</Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowEditSync(false)} className="text-xs text-muted-foreground">
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Google Gemini API Key</label>
          <Input
            type="password"
            value={settings.apiKey}
            onChange={(e) => save({ ...settings, apiKey: e.target.value })}
            placeholder="AIza..."
            className="bg-secondary/50 border-border text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Get your key at{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-accent underline">
              aistudio.google.com/apikey
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
            <Input value={newFolderEmoji} onChange={(e) => setNewFolderEmoji(e.target.value)}
              className="w-14 bg-secondary/50 border-border text-foreground text-center" maxLength={2} />
            <Input value={newFolderLabel} onChange={(e) => setNewFolderLabel(e.target.value)}
              placeholder="Folder name" className="flex-1 bg-secondary/50 border-border text-foreground"
              onKeyDown={(e) => e.key === "Enter" && addFolder()} />
            <Button size="icon" onClick={addFolder} className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Clear Data */}
        <div className="pt-4 border-t border-border">
          <Button variant="destructive" onClick={async () => { await clearHistory(); toast.success("All data cleared"); }} className="w-full">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Synced Data
          </Button>
        </div>
      </div>
    </div>
  );
}
