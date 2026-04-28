import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const CHATBOT_URL = (import.meta as any).env?.VITE_CHATBOT_URL ?? 'http://localhost:8000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sourceType?: 'mongo' | 'api' | 'rag';
  apiLabel?: string;
  type?: 'menu';
}

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  mongo: { label: '🍃 MongoDB',    color: 'text-green-600 bg-green-50' },
  api:   { label: '🌐 REST API',   color: 'text-blue-600 bg-blue-50'  },
  rag:   { label: '📚 Knowledge Base', color: 'text-purple-600 bg-purple-50' },
};

const SUGGESTED = [
  'How many events are available?',
  'Show me all vendors',
  'Pending vendor payouts?',
  'Total revenue this month',
  'How many users are registered?',
  'Show pending events',
  'menu',
];

const MENU_QUESTIONS: Record<string, string[]> = {
  '📊 Live Data': [
    'How many events are pending approval?',
    'Total revenue this month',
    'Show me all pending vendor payouts',
    'How many users are registered?',
    'List all active vendors',
    'Show recent orders',
  ],
  '💰 Payouts & Commission': [
    'How does the payout system work?',
    'How does the commission system work?',
    'How do I process a vendor payout?',
    'What is the minimum payout amount?',
    'How does Stripe Connect work for vendor payouts?',
  ],
  '🧭 Admin Navigation': [
    'How do I navigate the admin panel?',
    'How does vendor approval work?',
    'How does event management work for admins?',
    'How do employee accounts work?',
    'How does the review and moderation system work?',
  ],
  '🎟️ Platform Features': [
    'How does the booking system work?',
    'How do coupon or discount codes work?',
    'How does the QR code check-in system work?',
    'How does the affiliate system work?',
    'How do banners, announcements, and popups work?',
  ],
};

// ── Icons ──────────────────────────────────────────────────────────────────────

const BotIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.7-1.416 2.7H4.21c-1.447 0-2.416-1.7-1.416-2.7L4.2 15.3" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// ── Typing indicator ───────────────────────────────────────────────────────────

const TypingDots = () => (
  <div className="flex items-center gap-1 px-1 py-0.5">
    {[0, 150, 300].map(delay => (
      <span
        key={delay}
        className="block w-2 h-2 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: `${delay}ms` }}
      />
    ))}
  </div>
);

// ── Menu message ───────────────────────────────────────────────────────────────

const MenuMessage: React.FC<{ onSelect: (q: string) => void }> = ({ onSelect }) => (
  <div className="flex flex-col gap-3">
    <p className="text-xs text-gray-500">Pick a category or tap any question:</p>
    {Object.entries(MENU_QUESTIONS).map(([category, questions]) => (
      <div key={category}>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          {category}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {questions.map(q => (
            <button
              key={q}
              onClick={() => onSelect(q)}
              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full px-2.5 py-1 transition-colors text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ── Message bubble ─────────────────────────────────────────────────────────────

const MessageBubble: React.FC<{ msg: Message; onSelect?: (q: string) => void }> = ({ msg, onSelect }) => {
  const isUser = msg.role === 'user';
  const badge  = msg.sourceType ? SOURCE_BADGE[msg.sourceType] : null;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center mr-2 mt-0.5">
          <span className="text-xs">🤖</span>
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : 'bg-gray-100 text-gray-800 rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <p>{msg.content}</p>
          ) : msg.type === 'menu' ? (
            <MenuMessage onSelect={onSelect ?? (() => {})} />
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {badge && msg.apiLabel && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
            {badge.label}
            {msg.apiLabel && msg.apiLabel !== badge.label
              ? ` · ${msg.apiLabel.replace('MongoDB → ', '').replace(/^\/api\//, '')}`
              : ''}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export const AIChatbot: React.FC = () => {
  const [isOpen,    setIsOpen]    = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([{
    role: 'assistant',
    content: 'Hi! I have live access to platform data.\n\nAsk me about **users**, **events**, **vendors**, **revenue**, **payouts**, or any platform question.',
  }]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [serverOk,  setServerOk]  = useState<boolean | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const abortRef   = useRef<AbortController | null>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  // Health check
  useEffect(() => {
    fetch(`${CHATBOT_URL}/api/chatbot/health`, { credentials: 'include' })
      .then(r => r.ok ? setServerOk(true) : setServerOk(false))
      .catch(() => setServerOk(false));
  }, []);

  const getToken = () => localStorage.getItem('token') ?? '';

  const sendMessage = useCallback(async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    // Intercept "menu" — render clickable question list, no API call
    if (/^menu$/i.test(question)) {
      setInput('');
      setMessages(prev => [
        ...prev,
        { role: 'user', content: question },
        { role: 'assistant', content: '', type: 'menu' },
      ]);
      return;
    }

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    // Add empty assistant bubble for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${CHATBOT_URL}/api/chatbot/stream`, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ question, history, token: getToken() }),
        signal:      abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error(`Server error: ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const evt = JSON.parse(raw);
            if (evt.type === 'meta') {
              setMessages(prev => {
                const upd = [...prev];
                upd[upd.length - 1] = {
                  ...upd[upd.length - 1],
                  sourceType: evt.source_type,
                  apiLabel:   evt.api_label,
                };
                return upd;
              });
            } else if (evt.type === 'chunk') {
              setMessages(prev => {
                const upd = [...prev];
                upd[upd.length - 1] = {
                  ...upd[upd.length - 1],
                  content: (upd[upd.length - 1].content ?? '') + evt.text,
                };
                return upd;
              });
            } else if (evt.type === 'error') {
              setMessages(prev => {
                const upd = [...prev];
                upd[upd.length - 1] = {
                  ...upd[upd.length - 1],
                  content: `⚠️ ${evt.text}`,
                };
                return upd;
              });
            }
          } catch { /* ignore malformed SSE lines */ }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setMessages(prev => {
          const upd = [...prev];
          const last = upd[upd.length - 1];
          if (last?.role === 'assistant' && last.content === '') {
            upd[upd.length - 1] = {
              role: 'assistant',
              content: '⚠️ Could not connect to AI server. Make sure it\'s running:\n```\ncd ai-doc-chatbot && uvicorn server:app --port 8000\n```',
            };
          }
          return upd;
        });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, messages, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: 'Chat cleared. What would you like to know?',
    }]);
  };

  return (
    <>
      {/* Floating toggle button */}
      <motion.button
        onClick={() => setIsOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        title="AI Assistant"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span key="close"
              initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <CloseIcon />
            </motion.span>
          ) : (
            <motion.span key="bot"
              initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <BotIcon />
            </motion.span>
          )}
        </AnimatePresence>
        {/* Unread dot when closed */}
        {!isOpen && serverOk === false && (
          <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-24 right-6 z-50 w-[400px] h-[560px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center justify-between flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-sm">🤖</span>
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">Kidrove AI Assistant</div>
                  <div className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${serverOk === false ? 'bg-red-400' : serverOk ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    <span className="text-indigo-200 text-xs">
                      {serverOk === false ? 'Server offline' : serverOk ? 'Live data' : 'Connecting…'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearChat}
                  className="text-indigo-200 hover:text-white p-1 rounded transition-colors"
                  title="Clear chat"
                >
                  <TrashIcon />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-indigo-200 hover:text-white p-1 rounded transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            {/* Server offline banner */}
            {serverOk === false && (
              <div className="bg-red-50 border-b border-red-100 px-3 py-2 text-xs text-red-600 flex-shrink-0">
                ⚠️ Chatbot server not running. Start it with:{' '}
                <code className="bg-red-100 px-1 rounded">uvicorn server:app --port 8000</code>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} onSelect={sendMessage} />
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center mr-2 mt-0.5">
                    <span className="text-xs">🤖</span>
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggested questions — shown only when 1 message (greeting) */}
            {messages.length === 1 && !loading && (
              <div className="px-3 pb-2 flex-shrink-0">
                <p className="text-xs text-gray-400 mb-1.5">Try asking:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full px-2.5 py-1 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t bg-gray-50 px-3 py-2.5 flex gap-2 flex-shrink-0">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about events, revenue, vendors…"
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl px-3 py-2 transition-colors flex items-center gap-1"
              >
                <SendIcon />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatbot;
