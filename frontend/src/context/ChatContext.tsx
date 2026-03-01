import React, { createContext, useContext, useState, ReactNode } from "react";

export interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: number;
  audioUrl?: string;
}

interface ChatContextType {
  messages: Message[];
  sessionId: string;
  loading: boolean;
  lowBandwidthMode: boolean;
  addMessage: (msg: Message) => void;
  setLoading: (v: boolean) => void;
  setLowBandwidthMode: (v: boolean) => void;
  clearChat: () => void;
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
  const [sessionId] = useState(() => "session_" + Date.now());
  const [loading, setLoading] = useState(false);
  const [lowBandwidthMode, setLowBandwidthMode] = useState(false);

  const addMessage = (msg: Message) => setMessages((prev) => [...prev, msg]);
  const clearChat = () => setMessages([]);

  return (
    <ChatContext.Provider value={{
      messages, sessionId, loading, lowBandwidthMode,
      addMessage, setLoading, setLowBandwidthMode, clearChat,
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
