import { useState, useEffect } from "react";
import { getSettings, saveSettings, clearHistory, getSyncKey, setSyncKey } from "@/lib/storage";
import { getGCalConnection, startGCalAuth, disconnectGCal } from "@/lib/gcal";
import { FolderManager } from "@/components/FolderManager";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Copy, RefreshCw, FolderOpen, Calendar, Unlink } from "lucide-react";
import { toast } from "sonner";

interface SettingsViewProps {
  onBack: () => void;
}

export function SettingsView({ onBack }: SettingsViewProps) {
  const [settings, setSettings] = useState(getSettings);
  const [syncKey, setSyncKeyState] = useState(getSyncKey);
  const [editSyncKey, setEditSyncKey] = useState("");
  const [showEditSync, setShowEditSync] = useState(false);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [gcalEmail, setGcalEmail] = useState<string | null>(null);
  const [gcalLoading, setGcalLoading] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    getGCalConnection().then((conn) => {
      if (conn?.google_email) setGcalEmail(conn.google_email);
    });
  }, []);

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
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      toast.error("Invalid sync key format. Must be a UUID.");
      return;
    }
    setSyncKey(trimmed);
    setSyncKeyState(trimmed);
    setShowEditSync(false);
    setEditSyncKey("");
    toast.success("Sync key updated! Data will sync from the new key.");
    window.location.reload();
  };

  const handleConnectGCal = async () => {
    setGcalLoading(true);
    try {
      await startGCalAuth();
    } catch (e: any) {
      toast.error(e.message || "Failed to start Google Calendar auth");
      setGcalLoading(false);
    }
  };

  const handleDisconnectGCal = async () => {
    setGcalLoading(true);
    try {
      await disconnectGCal();
      setGcalEmail(null);
      toast.success("Google Calendar disconnected");
    } catch (e: any) {
      toast.error("Failed to disconnect");
    } finally {
      setGcalLoading(false);
    }
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
        {/* Google Calendar */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Google Calendar</label>
          {gcalEmail ? (
            <div className="bg-secondary/30 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">{gcalEmail}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleDisconnectGCal} disabled={gcalLoading} className="text-destructive">
                <Unlink className="w-3.5 h-3.5 mr-1.5" />
                Disconnect
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Connect to sync calendar events, tasks, and reminders with Google Calendar.
              </p>
              <Button variant="outline" onClick={handleConnectGCal} disabled={gcalLoading} className="w-full">
                <Calendar className="w-4 h-4 mr-2" />
                {gcalLoading ? "Connecting..." : "Connect Google Calendar"}
              </Button>
            </>
          )}
        </div>

        {/* Sync Key */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Sync Key</label>
          <p className="text-xs text-muted-foreground">
            Use this key on any device to see your data.
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
                <Input value={editSyncKey} onChange={(e) => setEditSyncKey(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="flex-1 bg-secondary/50 border-border text-foreground font-mono text-xs" />
                <Button size="sm" onClick={applySyncKey}>Apply</Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowEditSync(false)} className="text-xs text-muted-foreground">Cancel</Button>
            </div>
          )}
        </div>

        {/* Folder Management */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Note Folders</label>
          <p className="text-xs text-muted-foreground">Manage folders for organizing your notes.</p>
          <Button variant="outline" onClick={() => setShowFolderManager(true)} className="w-full">
            <FolderOpen className="w-4 h-4 mr-2" />
            Manage Folders
          </Button>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Google Gemini API Key</label>
          <Input type="password" value={settings.apiKey} onChange={(e) => save({ ...settings, apiKey: e.target.value })}
            placeholder="AIza..." className="bg-secondary/50 border-border text-foreground" />
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
          <Input value={settings.model} onChange={(e) => save({ ...settings, model: e.target.value })}
            className="bg-secondary/50 border-border text-foreground" />
        </div>

        {/* Clear Data */}
        <div className="pt-4 border-t border-border">
          <Button variant="destructive" onClick={async () => { await clearHistory(); toast.success("All data cleared"); }} className="w-full">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Synced Data
          </Button>
        </div>
      </div>

      <FolderManager
        open={showFolderManager}
        onOpenChange={setShowFolderManager}
        onFoldersChanged={() => forceUpdate((n) => n + 1)}
      />
    </div>
  );
}
