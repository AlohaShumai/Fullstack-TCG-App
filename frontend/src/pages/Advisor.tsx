import { useRef, useEffect, useState } from 'react';
import { useChat } from '../context/ChatContext';

export default function Advisor() {
  const { messages, loading, loadingStatus, sendMessage, clearChat } = useChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text?: string) => {
    const message = text ?? input.trim();
    if (!message || loading) return;
    void sendMessage(message);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col">

      <div className="container mx-auto p-4 sm:p-8 flex flex-col flex-1" style={{ maxWidth: '800px' }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">Professor AI</h2>
          <button
            onClick={clearChat}
            className="text-sm text-slate-400 hover:text-red-400 transition"
          >
            Clear Chat
          </button>
        </div>

        {/* Chat Window */}
        <div className="flex-1 bg-slate-800 rounded-lg p-4 mb-4 overflow-y-auto space-y-4" style={{ minHeight: '400px', maxHeight: '60vh' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                {msg.role === 'assistant' && (
                  <p className="text-xs text-violet-400 mb-1 font-semibold">Professor AI</p>
                )}
                <div
                  className={`rounded-lg px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm sm:text-base">{msg.content}</p>
                </div>

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-1 mb-1">
                    {msg.sources.includes('web') ? (
                      <p className="text-xs text-slate-500">Searched the web</p>
                    ) : (
                      <p className="text-xs text-slate-500">Answered from knowledge</p>
                    )}
                  </div>
                )}

                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.suggestions.map((s, j) => (
                      <button
                        key={j}
                        onClick={() => handleSend(s)}
                        className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 text-xs px-3 py-1 rounded-full transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-700 rounded-lg px-4 py-3">
                <div className="flex gap-2 items-center">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-xs text-slate-400 ml-1">{loadingStatus}</span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Professor AI anything about Pokemon TCG..."
            rows={2}
            className="flex-1 p-3 rounded-lg bg-slate-700 text-slate-100 border border-slate-600 focus:border-indigo-500 focus:outline-none resize-none text-sm sm:text-base"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition font-bold self-end"
          >
            Send
          </button>
        </div>
        <p className="text-slate-500 text-xs mt-2">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
}
