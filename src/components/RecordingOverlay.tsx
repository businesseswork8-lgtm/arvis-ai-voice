import { useState, useEffect, useRef } from "react";
import { X, Square, Send, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface RecordingOverlayProps {
  isRecording: boolean;
  isProcessing: boolean;
  isTranscribing: boolean;
  uploadedTranscript: string | null;
  finalTranscript: string;
  interimTranscript: string;
  onStop: () => void;
  onCancel: () => void;
  onProcess: (text: string) => void;
}

export function RecordingOverlay({
  isRecording,
  isProcessing,
  isTranscribing,
  uploadedTranscript,
  finalTranscript,
  interimTranscript,
  onStop,
  onCancel,
  onProcess,
}: RecordingOverlayProps) {
  const [editedTranscript, setEditedTranscript] = useState("");
  const wasRecordingRef = useRef(false);

  // Live update while recording; capture full text (including interim) when recording stops
  useEffect(() => {
    if (isRecording) {
      setEditedTranscript(finalTranscript);
      wasRecordingRef.current = true;
    } else if (wasRecordingRef.current) {
      // Just stopped — grab everything including any uncommitted interim words
      const fullCapture = (finalTranscript + " " + interimTranscript).trim();
      setEditedTranscript(fullCapture);
      wasRecordingRef.current = false;
    }
  }, [finalTranscript, interimTranscript, isRecording]);

  // When an uploaded audio file is transcribed, populate the textarea
  useEffect(() => {
    if (uploadedTranscript) {
      setEditedTranscript(uploadedTranscript);
    }
  }, [uploadedTranscript]);

  const fullText = (finalTranscript + " " + interimTranscript).trim();
  const textForOrganize = editedTranscript || uploadedTranscript || fullText;

  // Determine what state we're in
  const isInReviewMode = !isRecording && !isTranscribing && !isProcessing && (editedTranscript || uploadedTranscript || fullText);
  const headerLabel = isProcessing ? "Organizing…"
    : isTranscribing ? "Transcribing…"
    : isRecording ? "Listening"
    : "Review";

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
        <button
          onClick={onCancel}
          disabled={isProcessing || isTranscribing}
          className="p-2 rounded-full hover:bg-secondary transition-colors disabled:opacity-40"
        >
          <X className="w-6 h-6 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium text-muted-foreground">{headerLabel}</span>
        <div className="w-10" />
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">

        {/* Waveform while recording */}
        {isRecording && <WaveformVisualizer />}

        {/* Spinning indicator while processing or transcribing */}
        {(isProcessing || isTranscribing) && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">
              {isTranscribing ? "Transcribing your audio…" : "Organizing your items…"}
            </p>
          </div>
        )}

        {/* Transcript display / editable textarea */}
        <div className="w-full max-w-md bg-secondary/30 rounded-2xl overflow-hidden">
          {isRecording ? (
            // Live transcript view while recording
            <div className="min-h-[160px] p-5">
              {!finalTranscript && !interimTranscript ? (
                <p className="text-muted-foreground text-center text-sm pt-8">Start speaking…</p>
              ) : (
                <p className="text-sm leading-relaxed">
                  {finalTranscript && <span className="text-foreground">{finalTranscript} </span>}
                  {interimTranscript && <span className="text-muted-foreground italic">{interimTranscript}</span>}
                </p>
              )}
            </div>
          ) : !isTranscribing ? (
            // Review / edit mode
            <div className="min-h-[160px] flex flex-col p-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2 px-3 pt-2">
                {uploadedTranscript && !editedTranscript ? "Transcribed — edit if needed" : "Review & edit before organizing"}
              </p>
              <textarea
                value={editedTranscript}
                onChange={(e) => setEditedTranscript(e.target.value)}
                disabled={isProcessing}
                autoFocus={!isRecording && !isTranscribing}
                className="w-full flex-1 min-h-[120px] bg-transparent text-foreground text-sm leading-relaxed resize-none focus:outline-none p-3 border border-border/50 rounded-xl"
                placeholder="Your transcript will appear here…"
              />
            </div>
          ) : (
            // Blank placeholder while transcribing
            <div className="min-h-[160px] flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Processing audio file…</p>
            </div>
          )}
        </div>

        {/* Source label for uploads */}
        {uploadedTranscript && !isTranscribing && (
          <p className="text-xs text-muted-foreground/60 -mt-2">
            ✦ Transcribed from uploaded audio
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-center pb-12 gap-4">
        {isRecording ? (
          // Stop recording button
          <button
            onClick={onStop}
            className="w-16 h-16 rounded-full bg-recording flex items-center justify-center glow-recording transition-transform active:scale-95"
          >
            <Square className="w-6 h-6 text-foreground fill-foreground" />
          </button>
        ) : !isTranscribing ? (
          // Organize button
          <button
            onClick={() => onProcess(textForOrganize)}
            disabled={isProcessing || !textForOrganize.trim()}
            className="h-14 px-8 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-3 shadow-lg glow-primary disabled:opacity-40 transition-transform active:scale-95"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {isProcessing ? "Organizing…" : "Organize"}
          </button>
        ) : null}
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
          animate={{ height: [8, Math.random() * 48 + 12, 8] }}
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
