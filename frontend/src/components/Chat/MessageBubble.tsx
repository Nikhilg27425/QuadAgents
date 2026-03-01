import React from "react";
import { formatTime } from "@/utils/helpers";
import { Message } from "@/context/ChatContext";
import { Volume2, RefreshCw } from "lucide-react";

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.sender === "user";
  const [playing, setPlaying] = React.useState(false);
  const [audioError, setAudioError] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const playAudio = () => {
    if (!message.audioUrl) return;
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(message.audioUrl);
        audioRef.current.onended = () => setPlaying(false);
        audioRef.current.onerror = () => {
          setAudioError(true);
          setPlaying(false);
        };
      }
      audioRef.current.play();
      setPlaying(true);
    } catch {
      setAudioError(true);
    }
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 animate-fade-in`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-2 mt-1 flex-shrink-0">
          <span className="text-xs text-primary-foreground font-bold">KS</span>
        </div>
      )}
      <div className="max-w-[75%]">
        <div className={isUser ? "chat-bubble-user" : "chat-bubble-bot"}>
          <p className="text-base leading-relaxed">{message.text}</p>

          {/* Audio playback */}
          {!isUser && message.audioUrl && (
            <div className="mt-2 flex items-center gap-2">
              {audioError ? (
                <span className="text-xs text-destructive flex items-center gap-1">
                  <RefreshCw size={12} /> ऑडियो लोड नहीं हुआ
                </span>
              ) : (
                <button
                  onClick={playAudio}
                  className="flex items-center gap-1 text-xs text-primary bg-primary-light px-2 py-1 rounded-lg hover:opacity-80 transition-opacity"
                >
                  <Volume2 size={14} />
                  {playing ? "चल रहा है..." : "सुनें"}
                </button>
              )}
            </div>
          )}
        </div>
        <span className={`text-xs text-muted-foreground mt-1 block ${isUser ? "text-right" : "text-left"}`}>
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
