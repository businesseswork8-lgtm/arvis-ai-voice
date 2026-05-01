import { useState, useEffect } from "react";
import { getSettings, saveSettings, clearHistory, getSyncKey, setSyncKey } from "@/lib/storage";
import { getGCalConnection, startGCalAuth, disconnectGCal } from "@/lib/gcal";
import { FolderManager } from "@/components/FolderManager";
import { ArrowLeft, Trash2, Copy, RefreshCw, FolderOpen, Calendar, Unlink, Key, Cpu, Link2 } from "lucide-react";
import { toast } from "sonner";

interface SettingsViewProps { onBack: () => void; }

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
    getGCalConnection().then((conn) => { if (conn?.google_email) setGcalEmail(conn.google_email); });
  }, []);

  const save = (updated: typeof settings) => { setSettings(updated); saveSettings(updated); };
  const copySyncKey = () => { navigator.clipboard.writeText(syncKey); toast.success("Sync key copied!"); };

  const applySyncKey = () => {
    const trimmed = editSyncKey.trim();
    if (!trimmed) return;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      toast.error("Invalid sync key format (must be a UUID)");
      return;
    }
    setSyncKey(trimmed); setSyncKeyState(trimmed); setShowEditSync(false); setEditSyncKey("");
    toast.success("Sync key updated — reloading…");
    window.location.reload();
  };

  const handleConnectGCal = async () => {
    setGcalLoading(true);
    try { await startGCalAuth(); } catch (e: any) { toast.error(e.message || "Failed to start auth"); setGcalLoading(false); }
  };

  const handleDisconnectGCal = async () => {
    setGcalLoading(true);
    try { await disconnectGCal(); setGcalEmail(null); toast.success("Disconnected"); } catch { toast.error("Failed to disconnect"); }
    finally { setGcalLoading(false); }
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#000000" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-5 border-b" style={{ borderColor: "#111" }}>
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#111", border: "1px solid #222" }}>
          <ArrowLeft className="w-4 h-4 text-zinc-400" />
        </button>
        <div>
          <p className="label-caps mb-0.5">SETTINGS</p>
          <h1 className="text-xl font-bold text-white">Preferences</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-16">
        {/* AI Configuration */}
        <Section label="AI CONFIGURATION">
          <Row icon={<Key className="w-4 h-4" />} title="Gemini API Key" sub="Required for AI extraction">
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => save({ ...settings, apiKey: e.target.value })}
              placeholder="AIza…"
              className="w-full bg-transparent text-white text-sm placeholder-zinc-700 focus:outline-none mt-2"
            />
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
              className="text-[10px] mt-1 inline-block" style={{ color: "#3b82f6" }}>
              Get your key at aistudio.google.com/apikey →
            </a>
          </Row>

          <Row icon={<Cpu className="w-4 h-4" />} title="AI Model" sub="Default: gemini-2.0-flash">
            <input
              value={settings.model}
              onChange={(e) => save({ ...settings, model: e.target.value })}
              className="w-full bg-transparent text-white text-sm placeholder-zinc-700 focus:outline-none mt-2"
            />
          </Row>
        </Section>

        {/* Integrations */}
        <Section label="INTEGRATIONS">
          <Row icon={<Calendar className="w-4 h-4 text-blue-400" />} title="Google Calendar" sub={gcalEmail ? `Connected: ${gcalEmail}` : "Sync events to your calendar"}>
            {gcalEmail ? (
              <button onClick={handleDisconnectGCal} disabled={gcalLoading}
                className="mt-2 flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
                <Unlink className="w-3.5 h-3.5" />
                {gcalLoading ? "Disconnecting…" : "Disconnect"}
              </button>
            ) : (
              <button onClick={handleConnectGCal} disabled={gcalLoading}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-95"
                style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6" }}>
                <Link2 className="w-4 h-4" />
                {gcalLoading ? "Connecting…" : "Connect"}
              </button>
            )}
          </Row>

          <Row icon={<FolderOpen className="w-4 h-4" style={{ color: "#ff00ff" }} />} title="Note Folders" sub="Manage folder categories">
            <button onClick={() => setShowFolderManager(true)}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95"
              style={{ background: "rgba(255,0,255,0.08)", border: "1px solid rgba(255,0,255,0.2)", color: "#ff00ff" }}>
              <FolderOpen className="w-4 h-4" />
              Manage Folders
            </button>
          </Row>
        </Section>

        {/* Sync */}
        <Section label="SYNC & DEVICES">
          <Row icon={<RefreshCw className="w-4 h-4 text-zinc-400" />} title="Sync Key" sub="Use this key on any device to access your data">
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 text-xs rounded-lg px-3 py-2.5 font-mono break-all select-all"
                style={{ background: "#111", border: "1px solid #222", color: "#aaa" }}>
                {syncKey}
              </code>
              <button onClick={copySyncKey}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#111", border: "1px solid #222" }}>
                <Copy className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
            {!showEditSync ? (
              <button onClick={() => setShowEditSync(true)}
                className="mt-2 text-xs text-zinc-600 hover:text-zinc-400 flex items-center gap-1.5 transition-colors">
                <RefreshCw className="w-3 h-3" /> Use a different sync key
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-zinc-600">Paste a sync key from another device:</p>
                <div className="flex gap-2">
                  <input value={editSyncKey} onChange={(e) => setEditSyncKey(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-blue-500/40" />
                  <button onClick={applySyncKey}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ background: "#3b82f6" }}>Apply</button>
                </div>
                <button onClick={() => setShowEditSync(false)} className="text-xs text-zinc-700 hover:text-zinc-500">Cancel</button>
              </div>
            )}
          </Row>
        </Section>

        {/* Danger zone */}
        <div className="mx-4 mt-4 mb-4">
          <p className="label-caps text-red-900 mb-3">DANGER ZONE</p>
          <button
            onClick={async () => {
              if (!window.confirm("Permanently delete ALL tasks, reminders, events, and notes? This cannot be undone.")) return;
              await clearHistory();
              toast.success("All data cleared");
            }}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-red-500 text-sm transition-all active:scale-95"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <Trash2 className="w-4 h-4" />
            Delete All Data
          </button>
        </div>
      </div>

      <FolderManager open={showFolderManager} onOpenChange={setShowFolderManager} onFoldersChanged={() => forceUpdate((n) => n + 1)} />
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 px-4">
      <p className="label-caps mb-3">{label}</p>
      <div className="rounded-2xl overflow-hidden divide-y divide-white/5" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#111" }}>
          <span className="text-zinc-500">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
