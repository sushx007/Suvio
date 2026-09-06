'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Brain, Send, Sparkles, Loader2, Plus, MessageSquare, Trash2, CheckCircle2, Mic, MicOff, Square, Volume2, VolumeX, Copy, RefreshCw, Pencil, Search, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

const SUGGESTIONS = [
  'Plan my day based on my tasks',
  'Log a ₹500 lunch expense',
  'Add a task to call mom tomorrow',
  'Log 500ml water',
  'How is my spending trending this month?',
];

const VOICE_PREF_KEY = 'suvio.ai.voiceOutput';
const VOICE_RATE_KEY = 'suvio.ai.voiceRate';
const VOICE_NAME_KEY = 'suvio.ai.voiceName';
const STT_LANG_KEY = 'suvio.ai.sttLang';

// Common speech-recognition languages. Users can pick 'Auto' (browser default)
// or one of these to force a specific language for voice input.
const STT_LANGS = [
  { code: '', label: 'Auto (browser default)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml-IN', label: 'മലയാളം (Malayalam)' },
  { code: 'mr-IN', label: 'मराठी (Marathi)' },
  { code: 'bn-IN', label: 'বাংলা (Bengali)' },
  { code: 'gu-IN', label: 'ગુજરાતી (Gujarati)' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'es-ES', label: 'Español' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'pt-BR', label: 'Português (BR)' },
  { code: 'ja-JP', label: '日本語 (Japanese)' },
  { code: 'zh-CN', label: '中文 (Chinese)' },
  { code: 'ar-SA', label: 'العربية (Arabic)' },
];

// Simple copy-to-clipboard helper — falls back for older browsers.
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard) { await navigator.clipboard.writeText(text); return true; }
  } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    return true;
  } catch { return false; }
}

// Custom renderer for markdown code blocks — adds copy button.
function extractText(children) {
  if (children == null) return '';
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (typeof children === 'object' && children.props) return extractText(children.props.children);
  return '';
}

function CodeBlock({ inline, className, children, node, ...props }) {
  const rawCode = (node?.children?.[0]?.value ?? extractText(children)).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);
  if (inline) {
    return <code className="bg-white/10 rounded px-1.5 py-0.5 text-[0.85em] text-sky-200 font-mono" {...props}>{children}</code>;
  }
  const lang = /language-(\w+)/.exec(className || '')?.[1];
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-white/10 bg-black/50 group">
      <div className="flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/40 bg-white/5 border-b border-white/5">
        <span>{lang || 'code'}</span>
        <button
          onClick={async () => { if (await copyToClipboard(rawCode)) { setCopied(true); setTimeout(() => setCopied(false), 1500); } }}
          className="flex items-center gap-1 hover:text-white transition opacity-0 group-hover:opacity-100"
          data-testid="code-copy-btn"
        >
          {copied ? <><Check className="w-3 h-3"/> Copied</> : <><Copy className="w-3 h-3"/> Copy</>}
        </button>
      </div>
      <pre className="p-3 text-xs overflow-x-auto scrollbar-thin"><code className={className} {...props}>{children}</code></pre>
    </div>
  );
}

const mdComponents = {
  code: CodeBlock,
  table: ({node, ...p}) => <div className="my-3 overflow-x-auto"><table className="min-w-full text-xs border border-white/10 rounded" {...p}/></div>,
  thead: (p) => <thead className="bg-white/5" {...p}/>,
  th: (p) => <th className="text-left px-3 py-2 border-b border-white/10 font-medium" {...p}/>,
  td: (p) => <td className="px-3 py-2 border-b border-white/5 align-top" {...p}/>,
  a: (p) => <a target="_blank" rel="noreferrer" className="text-sky-400 hover:underline" {...p}/>,
  ul: (p) => <ul className="list-disc pl-5 my-2 space-y-1" {...p}/>,
  ol: (p) => <ol className="list-decimal pl-5 my-2 space-y-1" {...p}/>,
  p: (p) => <p className="my-2 leading-relaxed" {...p}/>,
  h1: (p) => <h1 className="text-lg font-semibold mt-3 mb-2" {...p}/>,
  h2: (p) => <h2 className="text-base font-semibold mt-3 mb-2" {...p}/>,
  h3: (p) => <h3 className="text-sm font-semibold mt-2 mb-1" {...p}/>,
  blockquote: (p) => <blockquote className="border-l-2 border-sky-400/50 pl-3 my-2 text-white/70 italic" {...p}/>,
};

export default function SuvioAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionTitle, setSessionTitle] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [voiceOn, setVoiceOn] = useState(false);
  const [rate, setRate] = useState(1);
  const [preferredVoice, setPreferredVoice] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [sttLang, setSttLang] = useState('');
  const [supportsSpeech, setSupportsSpeech] = useState(false);
  const [retries, setRetries] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState(-1);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const abortRef = useRef(null);
  const currentUtteranceRef = useRef(null);
  const silenceTimerRef = useRef(null);

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages, loading, interim]);

  // Hydrate voice preferences & voice list
  useEffect(() => {
    try {
      setVoiceOn(localStorage.getItem(VOICE_PREF_KEY) === '1');
      const r = parseFloat(localStorage.getItem(VOICE_RATE_KEY) || '1');
      if (!Number.isNaN(r)) setRate(r);
      setPreferredVoice(localStorage.getItem(VOICE_NAME_KEY) || '');
      setSttLang(localStorage.getItem(STT_LANG_KEY) || '');
    } catch {}
    setSupportsSpeech(typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition));
    // Voices load asynchronously in some browsers.
    function loadVoices() {
      try {
        const v = window.speechSynthesis?.getVoices?.() || [];
        setAvailableVoices(v);
      } catch {}
    }
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  async function loadSessions() {
    try {
      const r = await fetch('/api/ai/history');
      if (r.ok) { const d = await r.json(); setSessions(d.sessions || []); }
    } catch (e) { /* silent */ }
  }
  async function loadSession(sid) {
    setSessionId(sid);
    try {
      const r = await fetch(`/api/ai/history?sessionId=${sid}`);
      const d = await r.json();
      setMessages((d.items || []).map(m => ({ role: m.role, content: m.content, actions: m.actions })));
      setSessionTitle(d.title || null);
    } catch { toast.error('Could not load conversation'); }
  }
  async function deleteSession(sid, e) {
    e.stopPropagation();
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    await fetch(`/api/ai/history?sessionId=${sid}`, { method: 'DELETE' });
    if (sid === sessionId) newChat();
    loadSessions();
    toast.success('Conversation deleted');
  }
  async function renameSession(sid) {
    const clean = renameValue.trim();
    if (!clean) { setRenamingId(null); return; }
    try {
      const r = await fetch('/api/ai/history', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, title: clean }),
      });
      if (!r.ok) throw new Error('rename failed');
      setSessions(list => list.map(s => s._id === sid ? { ...s, title: clean } : s));
      if (sid === sessionId) setSessionTitle(clean);
      toast.success('Renamed');
    } catch { toast.error('Could not rename'); }
    setRenamingId(null);
  }
  function newChat() { stopSpeaking(); stopListening(); setSessionId(null); setSessionTitle(null); setMessages([]); setInput(''); setRetries(0); }

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(s => ((s.title || s.first || '').toLowerCase()).includes(q));
  }, [sessions, searchQuery]);

  // ---- Speech synthesis (TTS) ----
  function speak(text) {
    if (!voiceOn || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new window.SpeechSynthesisUtterance(text);
      u.rate = rate;
      const voices = window.speechSynthesis.getVoices();
      const lang = document.documentElement.lang || 'en-US';
      const byName = preferredVoice ? voices.find(v => v.name === preferredVoice) : null;
      u.voice = byName || voices.find(v => v.lang.startsWith(lang.split('-')[0])) || voices[0];
      currentUtteranceRef.current = u;
      window.speechSynthesis.speak(u);
    } catch {}
  }
  function stopSpeaking() { try { window.speechSynthesis?.cancel(); } catch {} currentUtteranceRef.current = null; }
  function toggleVoiceOn() {
    setVoiceOn(v => {
      const next = !v;
      try { localStorage.setItem(VOICE_PREF_KEY, next ? '1' : '0'); } catch {}
      if (!next) stopSpeaking();
      return next;
    });
  }

  // ---- Speech recognition (STT via Web Speech API) ----
  function startListening() {
    if (!supportsSpeech) {
      toast.error("Voice input isn't supported in this browser. Please type your message in the chat box below.");
      inputRef.current?.focus();
      return;
    }
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = true;
      // Pick the STT language: user's saved override → browser preference → auto.
      const savedLang = (typeof localStorage !== 'undefined' && localStorage.getItem(STT_LANG_KEY)) || '';
      const nav = typeof navigator !== 'undefined' ? (navigator.language || (navigator.languages && navigator.languages[0]) || '') : '';
      rec.lang = savedLang || nav || '';
      rec.onresult = (e) => {
        let final = '';
        let interimTxt = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += t; else interimTxt += t;
        }
        setInterim(interimTxt);
        if (final) setInput(prev => (prev ? prev + ' ' : '') + final.trim());
        // Auto-stop after silence — reset a debounce each time we get audio.
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => { try { rec.stop(); } catch {} }, 1500);
      };
      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          toast.error('Microphone access denied. Please enable it in your browser settings, or type your message in the chat box below.');
          inputRef.current?.focus();
        } else if (e.error === 'audio-capture') {
          toast.error("No microphone detected. Please connect one — or type your message in the chat box below.");
          inputRef.current?.focus();
        } else if (e.error === 'no-speech') {
          if (retries < 1) {
            setRetries(r => r + 1);
            toast("I didn't catch that. Please try again — or type your message in the chat box below.");
            setTimeout(() => startListening(), 400);
            return;
          } else {
            toast("I still couldn't hear you. Please kindly type your message in the chat box below.", { duration: 5000 });
            inputRef.current?.focus();
            setRetries(0);
          }
        } else if (e.error === 'language-not-supported') {
          toast("Your voice language isn't supported here — falling back to English. You can also type your message.", { duration: 5000 });
          try { localStorage.setItem(STT_LANG_KEY, 'en-US'); } catch {}
        } else if (e.error === 'network') {
          toast.error("Voice couldn't reach the network. Please kindly type your message in the chat box below.");
          inputRef.current?.focus();
        } else if (e.error) {
          toast.error(`Voice input error (${e.error}). Please kindly type your message in the chat box below.`);
          inputRef.current?.focus();
        }
        setListening(false);
        setInterim('');
      };
      rec.onend = () => { clearTimeout(silenceTimerRef.current); setListening(false); setInterim(''); };
      recognitionRef.current = rec;
      rec.start();
      setListening(true);
      setRetries(0);
    } catch (e) {
      toast.error('Could not start voice input: ' + e.message);
      inputRef.current?.focus();
    }
  }
  function stopListening() {
    clearTimeout(silenceTimerRef.current);
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  }
  function toggleMic() { listening ? stopListening() : startListening(); }

  // ---- Streaming send / regenerate ----
  const send = useCallback(async (text, opts = {}) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    if (!opts.regenerate) {
      setInput(''); setInterim(''); stopListening();
      setMessages(m => [...m, { role: 'user', content: msg }, { role: 'assistant', content: '', streaming: true }]);
    } else {
      setMessages(m => [...m, { role: 'assistant', content: '', streaming: true }]);
    }
    setLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        let errMsg = 'Suvio AI is temporarily unavailable. Please try again in a moment.';
        try { const j = await res.json(); errMsg = j.error || errMsg; } catch {}
        throw new Error(errMsg);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let assembled = '';
      let sid = sessionId;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const evt = buf.slice(0, idx); buf = buf.slice(idx + 2);
          const lines = evt.split('\n');
          const event = (lines.find(l => l.startsWith('event:')) || '').replace('event:', '').trim();
          const dataLine = lines.find(l => l.startsWith('data:')) || 'data: {}';
          let data = {};
          try { data = JSON.parse(dataLine.replace('data:', '').trim() || '{}'); } catch {}
          if (event === 'sid') { sid = data.sessionId; setSessionId(sid); }
          else if (event === 'delta') {
            assembled += data.text || '';
            setMessages(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], content: assembled }; return c; });
          } else if (event === 'action') {
            setMessages(m => {
              const c = [...m];
              const last = c[c.length - 1];
              const acts = last.actions ? [...last.actions, data] : [data];
              c[c.length - 1] = { ...last, actions: acts };
              return c;
            });
          } else if (event === 'done') { /* finalize */ }
          else if (event === 'error') { throw new Error(data.error || 'stream error'); }
        }
      }
      setMessages(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], streaming: false }; return c; });
      if (assembled) speak(assembled);
      loadSessions();
    } catch (e) {
      if (e.name === 'AbortError') {
        setMessages(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], streaming: false, content: (c[c.length - 1].content || '') + '\n\n_[Stopped]_' }; return c; });
      } else {
        toast.error(e.message || 'AI error');
        // Leave the user's message but remove the empty assistant placeholder.
        setMessages(m => { const c = [...m]; if (c.length && c[c.length-1].role === 'assistant' && !c[c.length-1].content) c.pop(); return c; });
      }
    } finally { setLoading(false); abortRef.current = null; }
  }, [input, loading, sessionId, voiceOn, rate, preferredVoice]);

  function stopGeneration() { try { abortRef.current?.abort(); } catch {} }

  async function copyMessage(idx, content) {
    if (await copyToClipboard(content)) {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(-1), 1500);
      toast.success('Copied to clipboard');
    } else toast.error("Couldn't copy");
  }

  function regenerate(idx) {
    if (loading) return;
    // Find the last user message before idx.
    let userIdx = -1;
    for (let i = idx - 1; i >= 0; i--) { if (messages[i].role === 'user') { userIdx = i; break; } }
    if (userIdx === -1) { toast.error('No previous prompt to regenerate'); return; }
    const prompt = messages[userIdx].content;
    // Drop the current assistant message + any subsequent messages, then stream a fresh one.
    setMessages(m => m.slice(0, idx));
    send(prompt, { regenerate: true });
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden" data-testid="suvio-ai-root">
      <div className="w-64 border-r border-white/5 p-3 hidden md:flex flex-col">
        <button onClick={newChat} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm transition" data-testid="new-conversation">
          <Plus className="w-4 h-4" /> New conversation
        </button>

        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search chats…"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-2 py-1.5 text-xs outline-none focus:border-sky-400/60"
            data-testid="conversation-search"
          />
        </div>

        <div className="mt-4 text-xs uppercase tracking-wider text-white/40 px-2">Recent</div>
        <div className="mt-2 space-y-1 overflow-y-auto scrollbar-thin flex-1">
          {filteredSessions.map(s => {
            const label = s.title || s.first || 'Chat';
            const isActive = sessionId === s._id;
            const isRenaming = renamingId === s._id;
            return (
              <div key={s._id} className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'}`}>
                <MessageSquare className="w-3 h-3 text-sky-400 shrink-0" />
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') renameSession(s._id); if (e.key === 'Escape') setRenamingId(null); }}
                    onBlur={() => renameSession(s._id)}
                    className="flex-1 bg-black/40 border border-white/20 rounded px-1.5 py-0.5 text-xs outline-none"
                    data-testid={`rename-input-${s._id}`}
                  />
                ) : (
                  <button onClick={() => loadSession(s._id)} className="truncate flex-1 text-left cursor-pointer" data-testid={`chat-${s._id}`}>{label.slice(0, 32)}</button>
                )}
                {!isRenaming && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={(e)=>{e.stopPropagation(); setRenamingId(s._id); setRenameValue(s.title || s.first || 'Chat');}} className="text-white/30 hover:text-sky-400" data-testid={`rename-${s._id}`} title="Rename">
                      <Pencil className="w-3 h-3"/>
                    </button>
                    <button onClick={(e)=>deleteSession(s._id, e)} className="text-white/30 hover:text-rose-400" data-testid={`delete-${s._id}`} title="Delete">
                      <Trash2 className="w-3 h-3"/>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {sessions.length === 0 && <div className="text-xs text-white/30 px-3 py-4">No conversations yet</div>}
          {sessions.length > 0 && filteredSessions.length === 0 && <div className="text-xs text-white/30 px-3 py-4">No matches</div>}
        </div>

        <div className="mt-2 border-t border-white/5 pt-3 space-y-2 text-xs text-white/50">
          <div className="flex items-center justify-between gap-2">
            <button onClick={toggleVoiceOn} className="flex items-center gap-2 hover:text-white transition" data-testid="voice-output-toggle" title="Toggle spoken replies">
              {voiceOn ? <Volume2 className="w-3.5 h-3.5 text-emerald-400"/> : <VolumeX className="w-3.5 h-3.5"/>}
              <span>{voiceOn ? 'Voice on' : 'Voice off'}</span>
            </button>
            {voiceOn && (
              <select value={rate} onChange={e => { const r = Number(e.target.value); setRate(r); try { localStorage.setItem(VOICE_RATE_KEY, String(r)); } catch {} }} className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[10px]" data-testid="voice-rate">
                <option value={0.85}>Slow</option><option value={1}>Normal</option><option value={1.2}>Fast</option>
              </select>
            )}
          </div>
          {voiceOn && availableVoices.length > 0 && (
            <select
              value={preferredVoice}
              onChange={e => { setPreferredVoice(e.target.value); try { localStorage.setItem(VOICE_NAME_KEY, e.target.value); } catch {} }}
              className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-[10px]"
              data-testid="voice-picker"
            >
              <option value="">System default</option>
              {availableVoices.map(v => <option key={v.name} value={v.name}>{v.name} · {v.lang}</option>)}
            </select>
          )}
          {supportsSpeech && (
            <div className="flex items-center gap-2">
              <Mic className="w-3 h-3 text-white/40 shrink-0"/>
              <select
                value={sttLang}
                onChange={e => { setSttLang(e.target.value); try { localStorage.setItem(STT_LANG_KEY, e.target.value); } catch {} }}
                className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-[10px]"
                data-testid="stt-lang-picker"
                title="Language for voice input"
              >
                {STT_LANGS.map(l => <option key={l.code || 'auto'} value={l.code}>{l.label}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="h-16 border-b border-white/5 px-6 flex items-center gap-3 shrink-0 z-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{sessionTitle || 'Suvio AI'}</div>
            <div className="text-xs text-white/40">Can see & modify everything in Suvio</div>
          </div>
          {loading && (
            <button onClick={stopGeneration} className="ml-auto flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg px-3 py-1.5 transition" data-testid="stop-generation">
              <Square className="w-3 h-3"/> Stop
            </button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-6 pt-8 pb-40">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-16">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center mb-6">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-gradient">How can I help?</h2>
                <p className="text-white/50 mt-2 text-sm">Speak or type. I know your data and can create things for you.</p>
                <div className="mt-8 grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={()=>send(s)} className="text-left glass rounded-xl px-4 py-3 text-sm hover:bg-white/10 transition" data-testid={`suggestion-${s.slice(0,10).replace(/\s/g,'-')}`}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 group ${m.role==='user'?'justify-end':''}`}>
                {m.role==='assistant' && <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center shrink-0"><Brain className={`w-4 h-4 text-white ${m.streaming ? 'animate-pulse' : ''}`}/></div>}
                <div className="max-w-[80%] min-w-0">
                  <div className={`rounded-2xl px-4 py-3 text-sm ${m.role==='user'?'bg-sky-500 text-white whitespace-pre-wrap':'glass text-white/90'}`}>
                    {m.role === 'assistant' ? (
                      m.content ? (
                        <div className="prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={mdComponents}>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        m.streaming && (
                          <div className="flex items-center gap-1.5 text-white/50" data-testid="thinking-indicator">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                            <span className="ml-1 text-xs">Thinking</span>
                          </div>
                        )
                      )
                    ) : (
                      m.content
                    )}
                  </div>
                  {m.role === 'assistant' && !m.streaming && m.content && (
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-white/40 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => copyMessage(i, m.content)} className="flex items-center gap-1 hover:text-white transition" data-testid={`copy-msg-${i}`}>
                        {copiedIdx === i ? <><Check className="w-3 h-3"/> Copied</> : <><Copy className="w-3 h-3"/> Copy</>}
                      </button>
                      <button onClick={() => regenerate(i)} disabled={loading} className="flex items-center gap-1 hover:text-white transition disabled:opacity-50" data-testid={`regen-msg-${i}`}>
                        <RefreshCw className="w-3 h-3"/> Regenerate
                      </button>
                    </div>
                  )}
                  {m.actions?.filter(a=>a.summary).map((a,ii)=>(
                    <div key={ii} className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5"/> {a.summary}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating composer — hovers above the scrollable messages, ChatGPT-style */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 pb-4">
          {/* Fade gradient so messages softly disappear behind the composer */}
          <div className="pointer-events-none h-16 -mt-16 bg-gradient-to-t from-[var(--suvio-bg,#0a0a0f)] via-[var(--suvio-bg,#0a0a0f)]/80 to-transparent" />

          {listening && (
            <div className="pointer-events-auto max-w-3xl mx-auto px-4 mb-2">
              <div className="glass-strong rounded-2xl px-4 py-3 flex items-center gap-3 border border-sky-500/30 shadow-2xl shadow-black/40" data-testid="listening-indicator">
                <div className="flex items-end gap-0.5 h-6">
                  {[0,1,2,3,4,5,6].map(i => (
                    <span key={i} className="w-1 rounded-full bg-gradient-to-t from-sky-500 to-purple-400 animate-pulse" style={{ height: `${12 + ((i*7) % 20) + 4}px`, animationDelay: `${i * 90}ms`, animationDuration: '0.9s' }} />
                  ))}
                </div>
                <div className="text-sm flex-1">
                  <div className="font-medium">Listening…</div>
                  <div className="text-xs text-white/60 min-h-[16px]">{interim || 'Speak now — I stop automatically after a pause.'}</div>
                </div>
              </div>
            </div>
          )}

          <div className="pointer-events-auto max-w-3xl mx-auto px-4">
            <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2 items-center bg-[#1a1a24]/95 backdrop-blur-xl border border-white/10 rounded-full pl-2 pr-2 py-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] focus-within:border-sky-400/60 transition">
              <button
                type="button"
                onClick={toggleMic}
                disabled={loading}
                title={supportsSpeech ? (listening ? 'Stop listening' : 'Voice input') : 'Voice not supported in this browser'}
                className={`shrink-0 w-10 h-10 rounded-full grid place-items-center transition ${listening ? 'bg-gradient-to-br from-sky-500 to-purple-500 text-white animate-pulse' : 'text-white/60 hover:bg-white/10 hover:text-white'} disabled:opacity-40`}
                data-testid="voice-input-toggle"
              >
                {listening ? <MicOff className="w-4 h-4"/> : <Mic className="w-4 h-4"/>}
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={e=>setInput(e.target.value)}
                placeholder={listening ? 'Listening…' : 'Ask Suvio anything or tell it what to create…'}
                className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-white/40"
                data-testid="ai-input"
              />
              <button
                disabled={loading || !input.trim()}
                className="shrink-0 w-10 h-10 rounded-full bg-white text-black grid place-items-center hover:bg-white/90 transition disabled:opacity-30 disabled:bg-white/20 disabled:text-white/60"
                data-testid="ai-send"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="mt-2 text-[10px] text-white/30 text-center px-4">
              {supportsSpeech ? "Speak in any language, or type above. If Suvio can't understand your voice, please type your message instead." : "Voice input isn't available in this browser — please type your message above."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
