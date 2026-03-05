import React, { createContext, useContext, useState, ReactNode } from "react";
import { Message } from "@/types/lambda";

interface ChatContextType {
  messages: Message[];
  sessionId: string;
  loading: boolean;
  lowBandwidthMode: boolean;
  addMessage: (msg: Message) => void;
  setLoading: (v: boolean) => void;
  setLowBandwidthMode: (v: boolean) => void;
  clearChat: () => void;
  startNewConversation: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "नमस्ते! मैं कृषि सहायक हूँ। आप मुझसे खेती, फसल, या सरकारी योजनाओं के बारे में पूछ सकते हैं।",
      timestamp: Date.now(),
    },
  ]);
  const [sessionId, setSessionId] = useState(() => "session_" + Date.now());
  const [loading, setLoading] = useState(false);
  const [lowBandwidthMode, setLowBandwidthMode] = useState(false);

  const addMessage = (msg: Message) => setMessages((prev) => [...prev, msg]);
  const clearChat = () => setMessages([]);
  
  const startNewConversation = () => {
    // Generate new session ID for new conversation
    setSessionId("session_" + Date.now());
    // Clear messages and show welcome message
    setMessages([
      {
        id: "welcome_" + Date.now(),
        sender: "bot",
        text: "नमस्ते! मैं कृषि सहायक हूँ। आप मुझसे खेती, फसल, या सरकारी योजनाओं के बारे में पूछ सकते हैं।",
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <ChatContext.Provider value={{
      messages, sessionId, loading, lowBandwidthMode,
      addMessage, setLoading, setLowBandwidthMode, clearChat, startNewConversation,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
