'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LifeBuoy, Send, X, Sparkles, Loader2, MessageSquare, BookOpen, Bug, Minus } from 'lucide-react';

// Suvio Support — a floating, self-contained support widget. Completely
// separate from the user's personal Suvio AI. Never touches user data.
export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hi — I'm **Suvio Support**. I can explain features, help you troubleshoot, and point you to the right settings. What can I help you with?",
      articles: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const suggestions = [
    'How do I upgrade to Premium?',
    'My OTP isn\'t arriving',
    "How do AI reminder calls work?",
    'How do I install the app?',
  ];

  async function send(text) {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: msg }]);
    setSending(true);
    try {
      const r = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Support is temporarily unavailable');
      setSessionId(d.sessionId);
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: d.reply, articles: d.articles || [] },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `⚠️ ${e.message}\n\nPlease try again in a moment, or open **Help Center → Contact** to file a bug.`,
          articles: [],
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function newChat() {
    setMessages([
      {
        role: 'assistant',
        content: "Fresh chat. What do you need help with?",
        articles: [],
      },
    ]);
    setSessionId(null);
  }

  return (
    <>
      {/* Floating button — always visible over the app (except on public pages). */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed z-40 bottom-5 right-5 md:bottom-6 md:right-6 w-14 h-14 rounded-full shadow-2xl shadow-purple-500/30 bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center text-black hover:scale-105 active:scale-95 transition"
        aria-label="Open Suvio Support"
        data-testid="support-widget-toggle"
      >
        {open ? <X className="w-6 h-6" /> : <LifeBuoy className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed z-40 bottom-24 right-5 md:right-6 w-[min(96vw,420px)] rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        } ${minimized ? 'max-h-[120px]' : 'max-h-[75vh]'}`}
        style={{ background: 'var(--suvio-surface-strong, #0d0f14)', borderColor: 'var(--suvio-border, rgba(255,255,255,0.08))' }}
        data-testid="support-widget-panel"
      >
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Suvio Support</div>
            <div className="text-[11px] text-white/40">Help & troubleshooting · not your personal AI</div>
          </div>
          <button
            onClick={newChat}
            className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition px-2 py-1 rounded"
            data-testid="support-new-chat"
          >
            New
          </button>
          <button
            onClick={() => setMinimized((m) => !m)}
            className="text-white/40 hover:text-white transition p-1 rounded"
            title={minimized ? 'Expand' : 'Minimize'}
            aria-label={minimized ? 'Expand' : 'Minimize'}
            data-testid="support-minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition" data-testid="support-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!minimized && (
          <>
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3 text-sm">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 whitespace-pre-wrap break-words ${
                  m.role === 'user' ? 'bg-white/10 text-white' : 'bg-black/40 border border-white/5 text-white/90'
                }`}
              >
                {m.role === 'assistant' ? renderInline(m.content) : m.content}
                {!!m.articles?.length && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.articles.map((a) => (
                      <Link
                        key={a.slug}
                        href={`/dashboard/help/${a.slug}`}
                        className="inline-flex items-center gap-1 text-[11px] bg-sky-500/10 border border-sky-500/30 text-sky-300 hover:bg-sky-500/20 rounded-full px-2 py-0.5"
                        onClick={() => setOpen(false)}
                      >
                        <BookOpen className="w-3 h-3" /> {a.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Suvio Support is typing…
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-2.5 py-1 transition"
                data-testid="support-suggestion"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="p-2 border-t border-white/5 flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Suvio Support…"
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:accent-border"
            data-testid="support-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="accent-bg rounded-lg px-3 py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            data-testid="support-send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="px-3 py-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
          <Link href="/dashboard/help" className="hover:text-white inline-flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Help Center
          </Link>
          <Link href="/dashboard/help/contact" className="hover:text-white inline-flex items-center gap-1">
            <Bug className="w-3 h-3" /> Report a bug
          </Link>
        </div>
          </>
        )}

        {minimized && (
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="w-full px-4 py-3 text-xs text-white/60 hover:text-white transition text-left"
            data-testid="support-restore"
          >
            Chat is minimized — tap to expand.
          </button>
        )}
      </div>
    </>
  );
}

// Ultra-lightweight inline renderer — bold + inline code + line breaks.
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <b key={i}>{p.slice(2, -2)}</b>;
    if (/^`[^`]+`$/.test(p)) return <code key={i} className="bg-white/10 rounded px-1 text-[12px] font-mono">{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  });
}
