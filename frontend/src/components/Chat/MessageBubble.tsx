import React from "react";
import { formatTime } from "@/utils/helpers";
import { Message } from "@/types/lambda";
import { Volume2, RefreshCw, Info } from "lucide-react";

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.sender === "user";
  const [playing, setPlaying] = React.useState(false);
  const [audioError, setAudioError] = React.useState(false);
  const [showMetadata, setShowMetadata] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  
  // Debug logging
  if (!isUser) {
    console.log('Bot message:', message);
    console.log('Has audioUrl:', !!message.audioUrl);
  }

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

          {/* Metadata toggle */}
          {!isUser && message.metadata && (
            <div className="mt-2">
              <button
                onClick={() => setShowMetadata(!showMetadata)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Info size={12} />
                {showMetadata ? "विवरण छुपाएं" : "विवरण देखें"}
              </button>
              
              {showMetadata && (
                <div className="mt-2 p-2 bg-muted/50 rounded-lg text-xs space-y-1">
                  {message.metadata.language && (
                    <div>
                      <span className="font-semibold">भाषा:</span> {message.metadata.language}
                    </div>
                  )}
                  {message.metadata.intent && (
                    <div>
                      <span className="font-semibold">इरादा:</span> {message.metadata.intent}
                    </div>
                  )}
                  {message.metadata.similarityScore !== undefined && (
                    <div>
                      <span className="font-semibold">समानता स्कोर:</span>{" "}
                      {(message.metadata.similarityScore * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
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
