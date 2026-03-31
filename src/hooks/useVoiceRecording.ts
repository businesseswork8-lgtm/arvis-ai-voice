import { useState, useRef, useCallback } from "react";

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  interimTranscript: string;
  finalTranscript: string;
  fullTranscript: string;
  startRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
  resetTranscript: () => void;
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const startRecording = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    setFinalTranscript("");
    setInterimTranscript("");

    let accumulatedFinal = "";

    recognition.onresult = (event: any) => {
      clearSilenceTimer();
      let interim = "";
      let finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          finalText += r[0].transcript + " ";
        } else {
          interim += r[0].transcript;
        }
      }
      if (finalText) {
        accumulatedFinal += finalText;
        setFinalTranscript(accumulatedFinal.trim());
      }
      setInterimTranscript(interim);

      // 1-second silence detection: restart timer on each result
      silenceTimerRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 1500);
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error:", e.error);
      if (e.error !== "no-speech") {
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      clearSilenceTimer();
      // With continuous=false, restart to keep listening until user stops
      if (recognitionRef.current && isRecordingRef.current) {
        try {
          recognition.start();
        } catch {
          setIsRecording(false);
        }
      }
    };

    recognitionRef.current = recognition;
    isRecordingRef.current = true;
    recognition.start();
    setIsRecording(true);
  }, []);

  const isRecordingRef = useRef(false);

  const stopRecording = useCallback(() => {
    clearSilenceTimer();
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const cancelRecording = useCallback(() => {
    clearSilenceTimer();
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setFinalTranscript("");
    setInterimTranscript("");
  }, []);

  const resetTranscript = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
  }, []);

  const fullTranscript = (finalTranscript + " " + interimTranscript).trim();

  return {
    isRecording,
    interimTranscript,
    finalTranscript,
    fullTranscript,
    startRecording,
    stopRecording,
    cancelRecording,
    resetTranscript,
  };
}
