import React, { useState, useRef, useEffect } from "react";
import { Send, Wifi, WifiOff, Mic, Keyboard } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { useUser } from "@/context/UserContext";
import { Message } from "@/types/lambda";
import { askLambda } from "@/api/lambda";
import MessageBubble from "@/components/Chat/MessageBubble";
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
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'hi-IN'; // Hindi language

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);
        
        // If final result, send to Lambda
        if (event.results[current].isFinal) {
          setIsListening(false);
          sendTextMessage(transcriptText);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setError('वॉयस पहचान में त्रुटि। कृपया दोबारा कोशिश करें।');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendTextMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || loading) return;
    
    setInputText("");
    setTranscript("");
    setError("");

    const userMsg: Message = { 
      id: generateId(), 
      sender: "user", 
      text: messageText, 
      timestamp: Date.now() 
    };
    addMessage(userMsg);
    setLoading(true);

    try {
      // Call Lambda API with session ID
      const response = await askLambda(messageText, sessionId);
      
      // Handle different response types
      let botText = "";
      // Audio is available for any response type where Lambda returns audio_base64 or audio_url
      const audioUrl = response.audio_base64 || response.audio_url;
      let metadata = undefined;
      
      console.log('Lambda response:', response);
      console.log('Audio URL:', audioUrl);
      
      if (response.onboarding) {
        // Onboarding question
        botText = response.question || "कृपया जवाब दें।";
      } else if (response.onboarding_completed) {
        // Onboarding completed
        botText = response.message || "धन्यवाद! अब मैं आपकी मदद कर सकता हूं।";
      } else {
        // Regular RAG response with extra metadata
        botText = response.answer || "माफ़ कीजिए, मुझे समझ नहीं आया।";
        metadata = {
          language: response.detected_language,
          intent: response.intent,
          similarityScore: response.similarity_score,
          farmerProfile: response.farmer_profile,
        };
      }
      
      const botMsg: Message = {
        id: generateId(),
        sender: "bot",
        text: botText,
        timestamp: Date.now(),
        audioUrl: audioUrl,
        metadata: metadata,
      };
      addMessage(botMsg);
    } catch (err) {
      setError(getErrorMessage(err));
      // Add error response
      addMessage({
        id: generateId(),
        sender: "bot",
        text: "माफ़ करें, अभी सर्वर से जुड़ नहीं पा रहे। कृपया दोबारा कोशिश करें।",
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const startVoiceRecognition = () => {
    if (!recognitionRef.current) {
      setError('आपका ब्राउज़र वॉयस पहचान का समर्थन नहीं करता।');
      return;
    }

    try {
      setTranscript("");
      setError("");
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error('Error starting recognition:', err);
      setError('वॉयस पहचान शुरू नहीं हो सका।');
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen pt-16 bg-background">
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
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-48 space-y-1">
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
          /* Voice input mode with Web Speech API */
          <div className="flex flex-col gap-2">
            {isListening && transcript && (
              <div className="bg-primary-light rounded-xl px-4 py-2">
                <p className="text-sm text-primary">{transcript}</p>
              </div>
            )}
            <div className="flex items-center justify-center bg-primary-light rounded-2xl px-4 py-4 gap-4">
              <p className="text-sm text-primary font-medium flex-1 text-center">
                {loading 
                  ? "जवाब तैयार हो रहा है..." 
                  : isListening 
                  ? "सुन रहे हैं... बोलें" 
                  : "माइक बटन दबाकर बोलें"}
              </p>
              <button
                onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                disabled={loading}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 ${
                  isListening 
                    ? "bg-destructive text-primary-foreground animate-pulse" 
                    : "bg-primary text-primary-foreground hover:opacity-80"
                }`}
              >
                <Mic size={20} />
              </button>
            </div>
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
