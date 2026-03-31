import { useState, useCallback } from "react";
import { BottomNav, TabKey } from "@/components/BottomNav";
import { HomeTab } from "@/components/HomeTab";
import { CalendarTab } from "@/components/CalendarTab";
import { TasksTab } from "@/components/TasksTab";
import { FoldersTab } from "@/components/FoldersTab";
import { RecordingOverlay } from "@/components/RecordingOverlay";
import { ExtractedCard } from "@/components/ExtractedCard";
import { SettingsView } from "@/components/SettingsView";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { extractItems } from "@/lib/ai";
import { getSettings, saveItems } from "@/lib/storage";
import { ExtractedItem, SavedItem } from "@/lib/types";
import { Mic, Settings, CheckCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

export default function Index() {
  const [tab, setTab] = useState<TabKey>("home");
  const [showSettings, setShowSettings] = useState(false);
  const [showRecording, setShowRecording] = useState(false);
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    isRecording,
    interimTranscript,
    finalTranscript,
    fullTranscript,
    startRecording,
    stopRecording,
    cancelRecording,
    resetTranscript,
  } = useVoiceRecording();

  const handleMicPress = () => {
    setShowRecording(true);
    startRecording();
  };

  const handleCancel = () => {
    cancelRecording();
    setShowRecording(false);
  };

  const handleStop = useCallback(async () => {
    stopRecording();
    const text = fullTranscript;
    if (!text?.trim()) {
      toast.error("No speech detected. Try again.");
      setShowRecording(false);
      return;
    }
    const settings = getSettings();
    if (!settings.apiKey) {
      toast.error("Please add your Gemini API key in Settings.");
      setShowRecording(false);
      return;
    }
    setIsProcessing(true);
    try {
      const extracted = await extractItems(text, settings.apiKey, settings.model);
      setItems(extracted);
      resetTranscript();
      setShowRecording(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to process. Try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [fullTranscript, stopRecording, resetTranscript]);

  const updateItem = (id: string, updates: Partial<ExtractedItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const confirmItem = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const saved: SavedItem = { ...item, confirmed: true, savedAt: new Date().toISOString() };
    await saveItems([saved]);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success(`Saved: ${item.title}`);
  };

  const dismissItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const confirmAll = async () => {
    const saved: SavedItem[] = items.map((i) => ({
      ...i,
      confirmed: true,
      savedAt: new Date().toISOString(),
    }));
    await saveItems(saved);
    setItems([]);
    toast.success(`Saved ${saved.length} items`);
  };

  if (showSettings) return <SettingsView onBack={() => setShowSettings(false)} />;

  const activeItems = items.filter((i) => !i.dismissed);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Settings icon */}
      <div className="fixed top-3 right-3 z-30">
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Extracted items overlay */}
      <AnimatePresence>
        {activeItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-30 bg-background/95 backdrop-blur-sm overflow-y-auto"
          >
            <div className="max-w-md mx-auto px-4 pt-6 pb-24 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  {activeItems.length} item{activeItems.length !== 1 ? "s" : ""} extracted
                </p>
                <button
                  onClick={confirmAll}
                  className="flex items-center gap-1 text-sm font-medium bg-accent text-accent-foreground px-3 py-1.5 rounded-lg hover:bg-accent/90 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  Confirm All
                </button>
              </div>
              <AnimatePresence>
                {activeItems.map((item, i) => (
                  <ExtractedCard
                    key={item.id}
                    item={item}
                    index={i}
                    onUpdate={updateItem}
                    onConfirm={confirmItem}
                    onDismiss={dismissItem}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab content */}
      <div className="flex-1">
        {tab === "home" && <HomeTab />}
        {tab === "calendar" && <CalendarTab />}
        {tab === "tasks" && <TasksTab />}
        {tab === "folders" && <FoldersTab />}
      </div>

      {/* FAB mic button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleMicPress}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg glow-primary"
        style={{ animation: "mic-pulse 2s ease-in-out infinite" }}
      >
        <Mic className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      {/* Bottom nav */}
      <BottomNav active={tab} onChange={setTab} />

      {/* Recording overlay */}
      <AnimatePresence>
        {showRecording && (
          <RecordingOverlay
            isRecording={isRecording}
            isProcessing={isProcessing}
            finalTranscript={finalTranscript}
            interimTranscript={interimTranscript}
            onStop={handleStop}
            onCancel={handleCancel}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
