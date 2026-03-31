import { Mic, Square } from "lucide-react";
import { motion } from "framer-motion";

interface MicButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  onToggle: () => void;
}

export function MicButton({ isRecording, isProcessing, onToggle }: MicButtonProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <motion.button
        onClick={onToggle}
        disabled={isProcessing}
        className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-50 ${
          isRecording
            ? "bg-recording/20 border-2 border-recording"
            : "bg-primary/20 border-2 border-primary"
        }`}
        style={{
          animation: isRecording
            ? "mic-recording 1.5s ease-in-out infinite"
            : "mic-pulse 2s ease-in-out infinite",
        }}
        whileTap={{ scale: 0.95 }}
      >
        {isRecording ? (
          <Square className="w-8 h-8 text-recording" />
        ) : (
          <Mic className="w-10 h-10 text-primary" />
        )}
      </motion.button>

      {isRecording && <WaveAnimation />}

      <p className="text-sm text-muted-foreground">
        {isProcessing
          ? "Processing..."
          : isRecording
          ? "Listening... Tap to stop"
          : "Tap to speak"}
      </p>
    </div>
  );
}

function WaveAnimation() {
  return (
    <div className="flex items-center gap-1 h-8">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-recording"
          animate={{
            height: [8, 24, 8],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.08,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
