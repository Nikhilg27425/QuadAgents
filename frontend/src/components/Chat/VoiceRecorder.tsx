import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Square } from "lucide-react";

interface Props {
  onRecordingComplete: (blob: Blob) => void;
  disabled?: boolean;
}

const MAX_SECONDS = 15;

export default function VoiceRecorder({ onRecordingComplete, disabled }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordingComplete(blob);
        stream.getTracks().forEach((t) => t.stop());
        setSeconds(0);
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stopRecording();
            return MAX_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setPermissionDenied(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  if (permissionDenied) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
        <MicOff size={18} />
        <span>माइक की अनुमति नहीं</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <div className="flex items-center gap-2 bg-destructive/10 rounded-xl px-3 py-2">
          {/* Waveform animation */}
          <div className="flex items-end gap-0.5 h-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="waveform-bar"
                style={{
                  height: "100%",
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${0.4 + i * 0.08}s`,
                }}
              />
            ))}
          </div>
          <span className="text-sm text-destructive font-medium">{MAX_SECONDS - seconds}s</span>
          <button
            onClick={stopRecording}
            className="w-8 h-8 rounded-full bg-destructive text-primary-foreground flex items-center justify-center hover:opacity-80"
          >
            <Square size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={startRecording}
          disabled={disabled}
          className="w-11 h-11 rounded-xl bg-primary-light text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40"
          title="बोलकर पूछें"
        >
          <Mic size={20} />
        </button>
      )}
    </div>
  );
}
