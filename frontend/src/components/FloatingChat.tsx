import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';

export default function FloatingChat() {
  const { user } = useAuth();
  const location = useLocation();
  const { messages, loading, loadingStatus, sendMessage, clearChat } = useChat();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [panelSize, setPanelSize] = useState({ width: 384, height: 460 });
  const isResizing = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Hide on the full Advisor page (has its own chat UI) and on auth pages
  const hidden = ['/advisor', '/login', '/register'].includes(location.pathname);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  if (!user || hidden) return null;

  const handleSend = () => {
    if (!input.trim() || loading) return;
    void sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Drag-to-resize handler — attaches mousemove/mouseup to window so the drag
  // continues even if the cursor leaves the drag handle element
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = panelSize.width;
    const startHeight = panelSize.height;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      // Panel grows left/up as the handle is dragged top-left; clamp to min/max bounds
      const newWidth = Math.max(280, Math.min(700, startWidth - (e.clientX - startX)));
      const newHeight = Math.max(300, Math.min(820, startHeight - (e.clientY - startY)));
      setPanelSize({ width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      isResizing.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <>
      {open && (
        <div
          className="fixed bottom-20 right-4 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 flex flex-col"
          style={{ width: panelSize.width, height: panelSize.height }}
        >
          {/* Drag handle */}
          <div
            onMouseDown={startResize}
            className="absolute top-0 left-0 w-4 h-4 rounded-tl-xl cursor-nw-resize z-10"
            title="Drag to resize"
          />

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 rounded-t-xl border-b border-slate-700 select-none">
            <div className="flex items-center gap-2">
              <span className="text-violet-400 font-bold text-sm">Professor AI</span>
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/advisor"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-100 text-xs transition"
                title="Open full chat"
              >
                ↗
              </Link>
              <button
                onClick={() => { clearChat(); }}
                className="text-slate-500 hover:text-red-400 text-xs transition"
                title="Clear chat"
              >
                Clear
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-100 transition text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 rounded-lg px-3 py-2 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-xs text-slate-400 ml-1">{loadingStatus}</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-700 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Professor AI..."
              className="flex-1 bg-slate-700 text-slate-100 text-xs rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-xs px-3 py-2 rounded-lg transition font-bold"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 h-10 px-4 bg-violet-600 hover:bg-violet-500 text-white rounded-full shadow-lg z-50 flex items-center justify-center transition text-sm font-semibold"
        title="Professor AI"
      >
        {open ? '×' : 'Prof AI'}
      </button>
    </>
  );
}
