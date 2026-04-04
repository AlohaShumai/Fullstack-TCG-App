import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import api from '../services/api';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  sources?: string[];
}

interface ChatContextType {
  messages: Message[];
  loading: boolean;
  loadingStatus: string;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: "Hello! I'm Professor AI, your Pokemon TCG advisor. Ask me about deck building, the current meta, card strategies, or how to improve your collection.",
  suggestions: [
    "What are the best meta decks right now?",
    "What fire type Pokemon should I add to my deck?",
    "How can I counter water decks?",
    "Build me a beginner-friendly deck",
  ],
};

const STORAGE_KEY = 'professorAiChatHistory';

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Message[]) : [INITIAL_MESSAGE];
    } catch {
      return [INITIAL_MESSAGE];
    }
  });
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Thinking...');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setLoadingStatus('Thinking...');

    const searchTimer = setTimeout(() => setLoadingStatus('Searching the web...'), 3000);

    try {
      const history = messages
        .filter((_, i) => i > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await api.post('/ai/chat', { message: text, history });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.response,
          suggestions: response.data.suggestions,
          sources: response.data.sources,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I ran into an error. Please make sure your OpenAI API key is set up and has billing enabled.',
        },
      ]);
    } finally {
      clearTimeout(searchTimer);
      setLoading(false);
      setLoadingStatus('Thinking...');
    }
  }, [messages, loading]);

  const clearChat = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ChatContext.Provider value={{ messages, loading, loadingStatus, sendMessage, clearChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
