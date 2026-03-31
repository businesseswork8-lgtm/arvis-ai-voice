import { useState, useCallback } from "react";
import { MicButton } from "@/components/MicButton";
import { ExtractedCard } from "@/components/ExtractedCard";
import { HistoryView } from "@/components/HistoryView";
import { SettingsView } from "@/components/SettingsView";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { extractItems } from "@/lib/ai";
import { getSettings, saveItems } from "@/lib/storage";
import { ExtractedItem, SavedItem } from "@/lib/types";
import { History, Settings, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

type View = "main" | "history" | "settings";

export default function Index() {
  const [view, setView] = useState<View>("main");
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isRecording, transcript, startRecording, stopRecording, resetTranscript } =
    useVoiceRecording();

  const handleToggle = useCallback(async () => {
    if (isRecording) {
      stopRecording();
      // Give a moment for final transcript
      setTimeout(async () => {
        const currentTranscript = document.getElementById("live-transcript")?.textContent;
        if (!currentTranscript?.trim()) {
          toast.error("No speech detected. Try again.");
          return;
        }
        const settings = getSettings();
        if (!settings.apiKey) {
          toast.error("Please add your OpenRouter API key in Settings.");
          return;
        }
        setIsProcessing(true);
        try {
          const extracted = await extractItems(currentTranscript, settings.apiKey, settings.model);
          setItems(extracted);
          resetTranscript();
        } catch (e: any) {
          toast.error(e.message || "Failed to process. Try again.");
        } finally {
          setIsProcessing(false);
        }
      }, 500);
    } else {
      setItems([]);
      startRecording();
    }
  }, [isRecording, stopRecording, startRecording, resetTranscript]);

  const updateItem = (id: string, updates: Partial<ExtractedItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const confirmItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const saved: SavedItem = { ...item, confirmed: true, savedAt: new Date().toISOString() };
    saveItems([saved]);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success(`Saved: ${item.title}`);
  };

  const dismissItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const confirmAll = () => {
    const saved: SavedItem[] = items.map((i) => ({
      ...i,
      confirmed: true,
      savedAt: new Date().toISOString(),
    }));
    saveItems(saved);
    setItems([]);
    toast.success(`Saved ${saved.length} items`);
  };

  if (view === "history") return <HistoryView onBack={() => setView("main")} />;
  if (view === "settings") return <SettingsView onBack={() => setView("main")} />;

  const activeItems = items.filter((i) => !i.dismissed);

  return (
    <div className={`min-h-screen flex flex-col relative ${isRecording ? "scanline-overlay" : ""}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-primary">De</span>
          <span className="text-foreground">clutter</span>
        </h1>
        <div className="flex gap-1">
          <button
            onClick={() => setView("history")}
            className="p-2 rounded-md hover:bg-secondary transition-colors"
          >
            <History className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setView("settings")}
            className="p-2 rounded-md hover:bg-secondary transition-colors"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        {activeItems.length === 0 ? (
          <>
            <MicButton
              isRecording={isRecording}
              isProcessing={isProcessing}
              onToggle={handleToggle}
            />

            {/* Live transcript */}
            {(isRecording || transcript) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 w-full max-w-md"
              >
                <p
                  id="live-transcript"
                  className="text-sm text-muted-foreground text-center leading-relaxed bg-secondary/30 rounded-lg p-4 min-h-[60px]"
                >
                  {transcript || "Listening..."}
                </p>
              </motion.div>
            )}
          </>
        ) : (
          <div className="w-full max-w-md space-y-3 overflow-y-auto flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                {activeItems.length} item{activeItems.length !== 1 ? "s" : ""} extracted
              </p>
              <Button
                size="sm"
                onClick={confirmAll}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Confirm All
              </Button>
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
        )}
      </div>
    </div>
  );
}
