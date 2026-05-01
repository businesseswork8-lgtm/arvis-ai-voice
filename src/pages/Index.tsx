import { useState, useCallback, useEffect, useRef } from "react";
import { BottomNav, TabKey } from "@/components/BottomNav";
import { HomeTab } from "@/components/HomeTab";
import { CalendarTab } from "@/components/CalendarTab";
import { TasksTab } from "@/components/TasksTab";
import { RemindersTab } from "@/components/RemindersTab";
import { NotesTab } from "@/components/NotesTab";
import { RecordingOverlay } from "@/components/RecordingOverlay";
import { ExtractedCard } from "@/components/ExtractedCard";
import { SettingsView } from "@/components/SettingsView";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { extractItems, transcribeAudioFile } from "@/lib/ai";
import { getSettings, saveItems, updateItem } from "@/lib/storage";
import { ExtractedItem, SavedItem } from "@/lib/types";
import { exchangeGCalCode, createGCalEvent, getGCalConnection, syncGCalToLocal } from "@/lib/gcal";
import { registerPushSubscription } from "@/lib/push";
import { Mic, Settings, CheckCheck, Upload } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

export default function Index() {
  const [tab, setTab] = useState<TabKey>("home");
  const [showSettings, setShowSettings] = useState(false);
  const [showRecording, setShowRecording] = useState(false);
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [uploadedTranscript, setUploadedTranscript] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isRecording, interimTranscript, finalTranscript, startRecording, stopRecording, cancelRecording, resetTranscript } = useVoiceRecording();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      window.history.replaceState({}, "", "/");
      exchangeGCalCode(code).then((result) => {
        if (result.error) toast.error("Failed to connect Google Calendar");
        else { toast.success(`Google Calendar connected: ${result.email}`); syncGCalToLocal(); }
      }).catch(() => toast.error("Failed to connect Google Calendar"));
    } else {
      syncGCalToLocal().catch(() => {});
    }
  }, []);

  useEffect(() => { registerPushSubscription(); }, []);

  const handleMicPress = () => { setUploadedTranscript(null); setShowRecording(true); startRecording(); };
  const handleUploadPress = () => fileInputRef.current?.click();

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    (e.target as HTMLInputElement).value = "";
    if (!file) return;
    const settings = getSettings();
    if (!settings.apiKey) { toast.error("Add your Gemini API key in Settings first"); return; }
    setUploadedTranscript(null); setIsTranscribing(true); setShowRecording(true);
    try {
      toast.info(`Transcribing "${file.name}"…`);
      const transcript = await transcribeAudioFile(file, settings.apiKey, settings.model);
      setUploadedTranscript(transcript);
    } catch (err: any) {
      toast.error(err.message || "Transcription failed");
      setShowRecording(false);
    } finally { setIsTranscribing(false); }
  };

  const handleCancel = () => { cancelRecording(); setShowRecording(false); setUploadedTranscript(null); setIsTranscribing(false); };
  const handleStop = useCallback(() => { stopRecording(); }, [stopRecording]);

  const handleProcess = useCallback(async (textToProcess: string) => {
    if (!textToProcess?.trim()) { toast.error("No text detected. Try again."); setShowRecording(false); return; }
    const settings = getSettings();
    if (!settings.apiKey) { toast.error("Add your Gemini API key in Settings."); setShowRecording(false); return; }
    setIsProcessing(true);
    try {
      const extracted = await extractItems(textToProcess, settings.apiKey, settings.model);
      if (extracted.length === 0) { toast.error("Nothing actionable found. Try rephrasing."); return; }
      setItems(extracted);
      resetTranscript(); setUploadedTranscript(null); setShowRecording(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to process. Try again.");
    } finally { setIsProcessing(false); }
  }, [resetTranscript]);

  const updateItemState = (id: string, updates: Partial<ExtractedItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));

  const syncToGCal = async (item: SavedItem) => {
    try {
      const conn = await getGCalConnection();
      if (!conn || item.type !== "Calendar Event" || !item.datetime) return;
      const gcalId = await createGCalEvent({ title: item.title, description: item.content, start_datetime: item.datetime, end_datetime: item.end_datetime });
      if (gcalId) await updateItem(item.id, { google_calendar_event_id: gcalId });
    } catch {}
  };

  const confirmItem = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const saved: SavedItem = { ...item, confirmed: true, savedAt: new Date().toISOString() };
    await saveItems([saved]);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success(`Saved: ${item.title}`);
    syncToGCal(saved);
  };

  const dismissItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const confirmAll = async () => {
    const saved: SavedItem[] = items.map((i) => ({ ...i, confirmed: true, savedAt: new Date().toISOString() }));
    await saveItems(saved);
    setItems([]);
    toast.success(`${saved.length} item${saved.length !== 1 ? "s" : ""} saved`);
    saved.forEach((s) => syncToGCal(s));
  };

  if (showSettings) return <SettingsView onBack={() => setShowSettings(false)} />;

  const activeItems = items.filter((i) => !i.dismissed);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#000000" }}>
      {/* Settings button */}
      <div className="fixed top-4 right-4 z-30">
        <button onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: "#111", border: "1px solid #222" }}>
          <Settings className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      {/* Extracted items overlay */}
      <AnimatePresence>
        {activeItems.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 overflow-y-auto"
            style={{ background: "rgba(0,0,0,0.96)", backdropFilter: "blur(20px)" }}>
            <div className="max-w-md mx-auto px-4 pt-16 pb-28 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="label-caps mb-0.5" style={{ color: "#ff00ff" }}>EXTRACTED</p>
                  <p className="text-white font-bold">{activeItems.length} item{activeItems.length !== 1 ? "s" : ""} found</p>
                </div>
                <button onClick={confirmAll}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 0 20px rgba(34,197,94,0.3)" }}>
                  <CheckCheck className="w-4 h-4" />
                  Save All
                </button>
              </div>

              <AnimatePresence>
                {activeItems.map((item, i) => (
                  <ExtractedCard key={item.id} item={item} index={i} onUpdate={updateItemState} onConfirm={confirmItem} onDismiss={dismissItem} />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab content — always mounted */}
      <div className="flex-1">
        <div style={{ display: tab === "home" ? "block" : "none" }}><HomeTab /></div>
        <div style={{ display: tab === "calendar" ? "block" : "none" }}><CalendarTab /></div>
        <div style={{ display: tab === "tasks" ? "block" : "none" }}><TasksTab /></div>
        <div style={{ display: tab === "reminders" ? "block" : "none" }}><RemindersTab /></div>
        <div style={{ display: tab === "notes" ? "block" : "none" }}><NotesTab /></div>
      </div>

      {/* FAB: Upload + Mic */}
      <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
        {/* Upload */}
        <motion.button whileTap={{ scale: 0.88 }} onClick={handleUploadPress}
          title="Upload voice memo"
          className="w-11 h-11 rounded-2xl flex items-center justify-center transition-colors"
          style={{ background: "#111", border: "1px solid #333" }}>
          <Upload className="w-4 h-4 text-zinc-500" />
        </motion.button>

        {/* Main mic — large neon pink */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleMicPress}
          title="Record voice note"
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#ff00ff,#bf00ff)", animation: "mic-pulse 2.5s ease-in-out infinite" }}>
          <Mic className="w-7 h-7 text-white" />
        </motion.button>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="audio/*,.m4a,.mp3,.wav,.ogg,.flac,.aiff,.3gp,.webm" className="hidden" onChange={handleAudioFileChange} />

      <BottomNav active={tab} onChange={setTab} />

      {/* Recording overlay */}
      <AnimatePresence>
        {showRecording && (
          <RecordingOverlay
            isRecording={isRecording} isProcessing={isProcessing}
            isTranscribing={isTranscribing} uploadedTranscript={uploadedTranscript}
            finalTranscript={finalTranscript} interimTranscript={interimTranscript}
            onStop={handleStop} onCancel={handleCancel} onProcess={handleProcess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
