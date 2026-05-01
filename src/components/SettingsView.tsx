import { useState, useEffect } from "react";
import { getUserSettings, saveUserSettings, clearHistory } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { getGCalConnection, startGCalAuth, disconnectGCal } from "@/lib/gcal";
import { FolderManager } from "@/components/FolderManager";
import { ArrowLeft, Trash2, FolderOpen, Calendar, Unlink, Key, Cpu, Link2, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SettingsViewProps { onBack: () => void; }

export function SettingsView({ onBack }: SettingsViewProps) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.0-flash");
  const [loading, setLoading] = useState(true);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [gcalEmail, setGcalEmail] = useState<string | null>(null);
  const [gcalLoading, setGcalLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    (async () => {
      const s = await getUserSettings();
      setApiKey(s.apiKey);
      setModel(s.model);
      setLoading(false);
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
    })();
    getGCalConnection().then((conn) => { if (conn?.google_email) setGcalEmail(conn.google_email); });
  }, []);

  const persist = async (nextKey: string, nextModel: string) => {
    setApiKey(nextKey); setModel(nextModel);
    await saveUserSettings(nextKey, nextModel);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
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
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
          </div>
        ) : (
        <>
        {/* Account */}
        <Section label="ACCOUNT">
          <Row icon={<LogOut className="w-4 h-4" />} title={userEmail || "Signed in"} sub="Sign out of this device">
            <button onClick={handleSignOut}
              className="mt-2 flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </Row>
        </Section>

        {/* AI Configuration */}
        <Section label="AI CONFIGURATION">
          <Row icon={<Key className="w-4 h-4" />} title="Gemini API Key" sub="Required for AI extraction">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => persist(e.target.value, model)}
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
              value={model}
              onChange={(e) => persist(apiKey, e.target.value)}
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
        </>
        )}
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
