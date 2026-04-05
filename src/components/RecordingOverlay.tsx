import { useState, useEffect } from "react";
import { X, Square, Send } from "lucide-react";
import { motion } from "framer-motion";

interface RecordingOverlayProps {
  isRecording: boolean;
  isProcessing: boolean;
  finalTranscript: string;
  interimTranscript: string;
  onStop: () => void;
  onCancel: () => void;
  onProcess: (text: string) => void;
}

export function RecordingOverlay({
  isRecording,
  isProcessing,
  finalTranscript,
  interimTranscript,
  onStop,
  onCancel,
  onProcess,
}: RecordingOverlayProps) {
  const [editedTranscript, setEditedTranscript] = useState("");

  // Update the text box continuously while recording
  useEffect(() => {
    if (isRecording) {
      setEditedTranscript(finalTranscript);
    }
  }, [finalTranscript, isRecording]);

  const fullText = (finalTranscript + " " + interimTranscript).trim();

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onCancel} className="p-2 rounded-full hover:bg-secondary transition-colors" disabled={isProcessing}>
          <X className="w-6 h-6 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium text-muted-foreground">
          {isProcessing ? "Organizing..." : isRecording ? "Listening" : "Review"}
        </span>
        <div className="w-10" />
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {/* Waveform */}
        {isRecording && <WaveformVisualizer />}

        {isProcessing && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
          </div>
        )}

        {/* Transcript / Edit Box */}
        <div className="w-full max-w-md bg-secondary/30 rounded-2xl overflow-hidden relative">
          {isRecording ? (
            <div className="min-h-[160px] p-5">
              {!finalTranscript && !interimTranscript ? (
                <p className="text-muted-foreground text-center text-sm pt-8">Listening...</p>
              ) : (
                <p className="text-sm leading-relaxed">
                  {finalTranscript && <span className="text-foreground">{finalTranscript} </span>}
                  {interimTranscript && <span className="text-muted-foreground">{interimTranscript}</span>}
                </p>
              )}
            </div>
          ) : (
            <div className="min-h-[160px] flex flex-col p-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2 px-3 pt-2">Edit before organizing</p>
              <textarea
                value={editedTranscript || fullText}
                onChange={(e) => setEditedTranscript(e.target.value)}
                disabled={isProcessing}
                className="w-full flex-1 min-h-[120px] bg-transparent text-foreground text-sm leading-relaxed resize-none focus:outline-none p-3 border border-border/50 rounded-xl"
                placeholder="Type here..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center pb-12 gap-6">
        {isRecording ? (
          <button
            onClick={onStop}
            className="w-16 h-16 rounded-full bg-recording flex items-center justify-center glow-recording transition-transform active:scale-95"
          >
            <Square className="w-6 h-6 text-foreground fill-foreground" />
          </button>
        ) : (
          <button
            onClick={() => onProcess(editedTranscript || fullText)}
            disabled={isProcessing || !(editedTranscript || fullText).trim()}
            className="h-14 px-8 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-3 shadow-lg glow-primary disabled:opacity-50 transition-transform active:scale-95"
          >
            <Send className="w-5 h-5" />
            Organize
          </button>
        )}
      </div>
    </motion.div>
  );
}

function WaveformVisualizer() {
  return (
    <div className="flex items-center gap-[3px] h-16">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-primary"
          animate={{
            height: [8, Math.random() * 48 + 12, 8],
          }}
          transition={{
            duration: 0.5 + Math.random() * 0.4,
            repeat: Infinity,
            delay: i * 0.04,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
