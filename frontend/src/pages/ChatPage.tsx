import React, { useState, useRef, useEffect } from "react";
import { Send, Wifi, WifiOff, Mic, Keyboard } from "lucide-react";
import { useChat, Message } from "@/context/ChatContext";
import { useUser } from "@/context/UserContext";
import apiClient from "@/api/apiClient";
import MessageBubble from "@/components/Chat/MessageBubble";
import VoiceRecorder from "@/components/Chat/VoiceRecorder";
import { generateId, getErrorMessage } from "@/utils/helpers";

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-2 flex-shrink-0">
        <span className="text-xs text-primary-foreground font-bold">KS</span>
      </div>
      <div className="chat-bubble-bot flex items-center gap-1 py-4">
        <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground inline-block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground inline-block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground inline-block" />
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { messages, sessionId, loading, lowBandwidthMode, addMessage, setLoading, setLowBandwidthMode } = useChat();
  const { token } = useUser();
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState("");
  const [voiceMode, setVoiceMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendTextMessage = async () => {
    const text = inputText.trim();
    if (!text || loading) return;
    setInputText("");
    setError("");

    const userMsg: Message = { id: generateId(), sender: "user", text, timestamp: Date.now() };
    addMessage(userMsg);
    setLoading(true);

    try {
      const res = await apiClient.post("/chat", {
        message: text,
        session_id: sessionId,
        low_bandwidth: lowBandwidthMode,
      });
      const { text: botText, audio_url, follow_up_required } = res.data;
      const botMsg: Message = {
        id: generateId(),
        sender: "bot",
        text: botText || "माफ़ कीजिए, मुझे समझ नहीं आया।",
        timestamp: Date.now(),
        audioUrl: audio_url,
      };
      addMessage(botMsg);

      if (follow_up_required) {
        setTimeout(() => {
          addMessage({
            id: generateId(),
            sender: "bot",
            text: "क्या आप और जानकारी चाहते हैं?",
            timestamp: Date.now(),
          });
        }, 800);
      }
    } catch (err) {
      setError(getErrorMessage(err));
      // Add mock response for demo
      addMessage({
        id: generateId(),
        sender: "bot",
        text: "माफ़ करें, अभी सर्वर से जुड़ नहीं पा रहे। कृपया दोबारा कोशिश करें। (Demo मोड में: API कनेक्शन उपलब्ध नहीं)",
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceComplete = async (blob: Blob) => {
    setError("");
    const userMsg: Message = {
      id: generateId(),
      sender: "user",
      text: "🎙️ वॉयस संदेश भेजा",
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("session_id", sessionId);
      formData.append("low_bandwidth", String(lowBandwidthMode));

      const res = await apiClient.post("/voice-chat", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { text: botText, audio_url } = res.data;
      addMessage({
        id: generateId(),
        sender: "bot",
        text: botText || "आपकी आवाज़ सुन ली।",
        timestamp: Date.now(),
        audioUrl: audio_url,
      });
    } catch (err) {
      setError(getErrorMessage(err));
      addMessage({
        id: generateId(),
        sender: "bot",
        text: "वॉयस प्रोसेस नहीं हो सका। कृपया टेक्स्ट में लिखें।",
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen pt-16 pb-20 bg-background">
      {/* Low bandwidth toggle */}
      <div className="px-4 py-2 bg-card border-b border-border flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">
          {lowBandwidthMode ? "धीमा नेटवर्क मोड" : "सामान्य मोड"}
        </span>
        <button
          onClick={() => setLowBandwidthMode(!lowBandwidthMode)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
            lowBandwidthMode
              ? "bg-secondary-light text-secondary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {lowBandwidthMode ? <WifiOff size={14} /> : <Wifi size={14} />}
          {lowBandwidthMode ? "धीमा नेटवर्क" : "Low Bandwidth"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {loading && <TypingIndicator />}
        {error && (
          <div className="flex justify-center">
            <span className="bg-destructive/10 text-destructive text-sm px-4 py-2 rounded-xl">
              {error}
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 bg-card border-t border-border fixed bottom-16 left-0 right-0 max-w-lg mx-auto">
        {/* Mode toggle */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setVoiceMode(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
              !voiceMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <Keyboard size={14} /> टाइप करें
          </button>
          <button
            onClick={() => setVoiceMode(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
              voiceMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <Mic size={14} /> बोलें
          </button>
        </div>

        {voiceMode ? (
          /* Voice input mode */
          <div className="flex items-center justify-center bg-primary-light rounded-2xl px-4 py-4 gap-4">
            <p className="text-sm text-primary font-medium flex-1 text-center">
              {loading ? "जवाब तैयार हो रहा है..." : "माइक बटन दबाकर बोलें"}
            </p>
            <VoiceRecorder onRecordingComplete={handleVoiceComplete} disabled={loading} />
          </div>
        ) : (
          /* Text input mode */
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="अपना सवाल टाइप करें..."
                rows={1}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary max-h-28"
                style={{ minHeight: "48px" }}
              />
            </div>
            <button
              onClick={sendTextMessage}
              disabled={!inputText.trim() || loading}
              className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
