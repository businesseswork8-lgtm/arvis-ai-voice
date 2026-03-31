import { X, Square } from "lucide-react";
import { motion } from "framer-motion";

interface RecordingOverlayProps {
  isRecording: boolean;
  isProcessing: boolean;
  finalTranscript: string;
  interimTranscript: string;
  onStop: () => void;
  onCancel: () => void;
}

export function RecordingOverlay({
  isRecording,
  isProcessing,
  finalTranscript,
  interimTranscript,
  onStop,
  onCancel,
}: RecordingOverlayProps) {
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
        <button onClick={onCancel} className="p-2 rounded-full hover:bg-secondary transition-colors">
          <X className="w-6 h-6 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium text-muted-foreground">
          {isProcessing ? "Processing..." : "Recording"}
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

        {/* Transcript */}
        <div className="w-full max-w-md min-h-[120px] bg-secondary/30 rounded-2xl p-5">
          {!finalTranscript && !interimTranscript ? (
            <p className="text-muted-foreground text-center text-sm">Listening...</p>
          ) : (
            <p className="text-sm leading-relaxed">
              {finalTranscript && <span className="text-foreground">{finalTranscript} </span>}
              {interimTranscript && <span className="text-muted-foreground">{interimTranscript}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Stop button */}
      <div className="flex justify-center pb-12">
        <button
          onClick={onStop}
          disabled={isProcessing}
          className="w-16 h-16 rounded-full bg-recording flex items-center justify-center glow-recording disabled:opacity-50 transition-all"
        >
          <Square className="w-6 h-6 text-foreground fill-foreground" />
        </button>
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
