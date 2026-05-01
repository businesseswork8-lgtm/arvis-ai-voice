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
  isRecording, isProcessing, isTranscribing, uploadedTranscript,
  finalTranscript, interimTranscript, onStop, onCancel, onProcess,
}: RecordingOverlayProps) {
  const [editedTranscript, setEditedTranscript] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const wasRecordingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  // Capture transcript on stop (including interim)
  useEffect(() => {
    if (isRecording) {
      setEditedTranscript(finalTranscript);
      wasRecordingRef.current = true;
    } else if (wasRecordingRef.current) {
      setEditedTranscript((finalTranscript + " " + interimTranscript).trim());
      wasRecordingRef.current = false;
    }
  }, [finalTranscript, interimTranscript, isRecording]);

  // Populate from uploaded file
  useEffect(() => {
    if (uploadedTranscript) setEditedTranscript(uploadedTranscript);
  }, [uploadedTranscript]);

  const displayText = editedTranscript || uploadedTranscript || (finalTranscript + " " + interimTranscript).trim();
  const canOrganize = !isProcessing && !isTranscribing && displayText.trim();

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#000000" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button onClick={onCancel} disabled={isProcessing || isTranscribing}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-40"
          style={{ background: "#1a1a1a" }}>
          <X className="w-4 h-4 text-zinc-400" />
        </button>

        {/* LIVE badge + timer */}
        <div className="flex items-center gap-3">
          {isRecording && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "#1a0505", border: "1px solid rgba(239,68,68,0.3)" }}>
              <span className="w-2 h-2 rounded-full bg-red-500 live-dot" />
              <span className="text-[11px] font-bold text-red-400 tracking-widest">LIVE</span>
            </div>
          )}
          {isRecording && (
            <span className="mono text-4xl font-bold text-white tracking-tight">{formatTime(elapsedSeconds)}</span>
          )}
          {isTranscribing && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: "#0a0a1a", border: "1px solid rgba(59,130,246,0.3)" }}>
              <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              <span className="text-[11px] font-bold text-blue-400 tracking-widest">TRANSCRIBING</span>
            </div>
          )}
          {isProcessing && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: "#130013", border: "1px solid rgba(255,0,255,0.3)" }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#ff00ff" }} />
              <span className="text-[11px] font-bold tracking-widest" style={{ color: "#ff00ff" }}>ORGANIZING</span>
            </div>
          )}
        </div>

        <div className="w-9" />
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {/* Waveform (recording only) */}
        {isRecording && <WaveformVisualizer />}

        {/* Transcript area */}
        {isRecording ? (
          <div className="w-full max-w-sm text-center">
            {(!finalTranscript && !interimTranscript) ? (
              <p className="text-zinc-600 text-lg">Listening…</p>
            ) : (
              <p className="text-white text-xl font-medium leading-relaxed text-center">
                "{finalTranscript}<span className="text-zinc-500">{interimTranscript}</span>"
              </p>
            )}
          </div>
        ) : !isTranscribing ? (
          <div className="w-full max-w-md">
            <p className="label-caps mb-3 text-center">
              {uploadedTranscript ? "TRANSCRIBED — EDIT IF NEEDED" : "REVIEW & EDIT"}
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ background: "#0d0d0d", border: "1px solid #222" }}>
              <textarea
                value={editedTranscript}
                onChange={(e) => setEditedTranscript(e.target.value)}
                disabled={isProcessing}
                autoFocus
                rows={6}
                className="w-full bg-transparent text-white text-sm leading-relaxed resize-none focus:outline-none p-5"
                placeholder="Your transcript will appear here…"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              />
            </div>
            {uploadedTranscript && (
              <p className="text-center text-xs text-zinc-600 mt-2">✦ Transcribed from uploaded audio</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
            </div>
            <p className="text-zinc-500 text-sm">Processing audio…</p>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-center gap-5 pb-16 px-6">
        {isRecording ? (
          // Stop button — large blue circle like reference
          <button onClick={onStop}
            className="w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-90 glow-recording"
            style={{ background: "#3b82f6" }}>
            <Square className="w-7 h-7 text-white fill-white" />
          </button>
        ) : !isTranscribing && (
          // Organize button
          <button
            onClick={() => onProcess(displayText)}
            disabled={!canOrganize}
            className="h-14 px-10 rounded-full font-bold text-white flex items-center gap-3 text-base transition-all active:scale-95 disabled:opacity-40"
            style={{
              background: canOrganize ? "linear-gradient(135deg,#ff00ff,#bf00ff)" : "#222",
              boxShadow: canOrganize ? "0 0 30px rgba(255,0,255,0.4), 0 0 60px rgba(255,0,255,0.15)" : "none",
            }}>
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {isProcessing ? "Organizing…" : "Organize"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function WaveformVisualizer() {
  const bars = 24;
  return (
    <div className="flex items-end gap-[3px] h-14">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-full"
          style={{ background: i % 3 === 0 ? "#3b82f6" : i % 3 === 1 ? "#60a5fa" : "#1d4ed8", minHeight: "4px" }}
          animate={{ height: ["6px", `${Math.random() * 40 + 8}px`, "6px"] }}
          transition={{ duration: 0.45 + Math.random() * 0.35, repeat: Infinity, delay: i * 0.035, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
