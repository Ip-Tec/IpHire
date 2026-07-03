'use client';

import React, { useState, useEffect, useRef } from 'react';
import { dbManager, ChatSession, ChatMessage, AIMemory, Resume } from '@/lib/db';
import { streamChat } from '@/lib/llm';
import { parseResumeFile, SUPPORTED_EXTENSIONS, SUPPORTED_LABEL } from '@/lib/fileParser';
import {
  Send, Sparkles, Brain, Trash2, X, Loader2, Paperclip, FileText, CheckCircle
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  'Review my resume',
  'Write a cover letter for a startup role',
  'Mock interview for Senior Dev',
  'What projects should I build to get hired?',
];

export function ChatWorkspace() {
  const [session, setSession]     = useState<ChatSession | null>(null);
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState('');
  const [generating, setGenerating] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [memory, setMemory] = useState<AIMemory>({
    skills: ['TypeScript', 'Next.js', 'Tailwind CSS'],
    goals: ['Senior Full Stack Engineer', 'Remote-first startup'],
    companies: ['Stripe', 'Vercel', 'Linear'],
    facts: ['4 years experience', 'Based in SF', 'Prefers async culture'],
  });
  const [newItems, setNewItems] = useState({ skills: '', goals: '', companies: '', facts: '' });
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSaved, setUploadSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const list = await dbManager.getChats();
      let s: ChatSession;
      if (list.length > 0) {
        s = list[0];
      } else {
        s = {
          id: `chat-${Date.now()}`,
          title: 'Career Session',
          messages: [{
            id: 'welcome',
            role: 'assistant',
            content: `👋 Hi! I'm your **IpHire AI Career Agent**.\n\nI can help you:\n- Rewrite and score your resume\n- Draft tailored cover letters\n- Practice mock interviews\n- Build your learning roadmap\n\nWhat would you like to work on today?`,
            timestamp: Date.now(),
          }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await dbManager.saveChat(s);
      }
      setSession(s);
      setMessages(s.messages);

      const saved = await dbManager.getSetting<AIMemory>('ai_memory', memory);
      setMemory(saved);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadSaved(false);
    try {
      const text = await parseResumeFile(file);
      setUploadedFile({ name: file.name, content: text });

      // Auto-save to Resume Studio
      const resume: Resume = {
        id: `res-upload-${Date.now()}`,
        name: file.name.replace(/\.[^.]+$/, ''),
        content: text,
        score: 0,
        atsFeedback: '',
        version: 1,
        createdAt: Date.now(),
      };
      await dbManager.saveResume(resume);
      setUploadSaved(true);
    } catch (err: any) {
      alert(`Failed to parse file: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const send = async (text?: string) => {
    let content = (text ?? input).trim();

    // If a file is attached, prepend its content as context
    if (uploadedFile) {
      const fileContext = `[Uploaded resume: ${uploadedFile.name}]\n\n${uploadedFile.content}`;
      content = content
        ? `${content}\n\n---\n${fileContext}`
        : `Please review my resume and provide feedback.\n\n---\n${fileContext}`;
      setUploadedFile(null);
      setUploadSaved(false);
    }

    if (!content || generating || !session) return;
    setInput('');

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content, timestamp: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);

    const updSession = { ...session, messages: next, updatedAt: Date.now() };
    await dbManager.saveChat(updSession);

    setGenerating(true);
    const asstId = `a-${Date.now()}`;
    setMessages(prev => [...prev, { id: asstId, role: 'assistant', content: '', timestamp: Date.now() }]);

    const config = await dbManager.getSetting('llm_config', { provider: 'sandbox' });
    let acc = '';

    await streamChat(
      next.map(m => ({ role: m.role, content: m.content })),
      config as any,
      chunk => {
        acc += chunk;
        setMessages(prev => prev.map(m => m.id === asstId ? { ...m, content: acc } : m));
      },
      async () => {
        const final = [...next, { id: asstId, role: 'assistant' as const, content: acc, timestamp: Date.now() }];
        const finalSession = { ...session, messages: final, updatedAt: Date.now() };
        await dbManager.saveChat(finalSession);
        setGenerating(false);
      },
      err => {
        setMessages(prev => prev.map(m => m.id === asstId ? { ...m, content: `⚠️ ${err.message}` } : m));
        setGenerating(false);
      },
    );
  };

  const clearHistory = async () => {
    if (!session) return;
    const cleared: ChatSession = {
      ...session,
      messages: [{ id: `clr-${Date.now()}`, role: 'assistant', content: 'Chat cleared. What would you like to work on?', timestamp: Date.now() }],
      updatedAt: Date.now(),
    };
    await dbManager.saveChat(cleared);
    setMessages(cleared.messages);
  };

  const saveMemory = async (m: AIMemory) => {
    setMemory(m);
    await dbManager.setSetting('ai_memory', m);
  };
  const addItem = (type: keyof AIMemory) => {
    const val = newItems[type].trim();
    if (!val) return;
    saveMemory({ ...memory, [type]: [...memory[type], val] });
    setNewItems(p => ({ ...p, [type]: '' }));
  };
  const removeItem = (type: keyof AIMemory, idx: number) => {
    saveMemory({ ...memory, [type]: memory[type].filter((_, i) => i !== idx) });
  };

  const renderContent = (text: string) => {
    // Convert markdown to readable HTML
    let html = text
      // Code blocks
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
        const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
        return `<pre class="my-2 rounded-lg bg-neutral-900 p-3 text-xs font-mono text-neutral-100 overflow-x-auto whitespace-pre-wrap"><code>${escapedCode}</code></pre>`;
      })
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="rounded bg-deepsea-50 dark:bg-deepsea-950/40 px-1.5 py-0.5 text-[11px] font-mono text-deepsea-700 dark:text-deepsea-300">$1</code>')
      // Headings (### > ## > #)
      .replace(/^####\s+(.+)$/gm, '<h4 class="text-sm font-bold text-foreground mt-3 mb-1">$1</h4>')
      .replace(/^###\s+(.+)$/gm, '<h3 class="text-sm font-bold text-foreground mt-3 mb-1">$1</h3>')
      .replace(/^##\s+(.+)$/gm, '<h3 class="text-base font-bold text-foreground mt-4 mb-1.5">$1</h3>')
      .replace(/^#\s+(.+)$/gm, '<h2 class="text-lg font-bold text-foreground mt-4 mb-2">$1</h2>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr class="my-3 border-border/60" />')
      // Bold + italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-semibold"><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Numbered lists
      .replace(/^(\d+)\.\s+(.+)$/gm, '<li class="ml-5 list-decimal text-foreground/90 leading-relaxed">$2</li>')
      // Unordered lists (bullet + dash)
      .replace(/^[\-\*]\s+(.+)$/gm, '<li class="ml-5 list-disc text-foreground/90 leading-relaxed">$1</li>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-deepsea-600 dark:text-deepsea-400 underline hover:text-deepsea-700">$1</a>');

    // Wrap consecutive <li> in <ul>/<ol>
    html = html.replace(/(<li class="ml-5 list-disc[^"]*">[\s\S]*?<\/li>(?:\s*<li class="ml-5 list-disc[^"]*">[\s\S]*?<\/li>)*)/g, '<ul class="my-1.5 space-y-0.5">$1</ul>');
    html = html.replace(/(<li class="ml-5 list-decimal[^"]*">[\s\S]*?<\/li>(?:\s*<li class="ml-5 list-decimal[^"]*">[\s\S]*?<\/li>)*)/g, '<ol class="my-1.5 space-y-0.5">$1</ol>');

    // Convert remaining newlines to <br> (but not inside <pre> blocks)
    html = html.replace(/\n/g, '<br />');
    // Clean up excessive <br /> around block elements
    html = html.replace(/<br \/>(\s*<(?:h[2-4]|pre|ul|ol|hr|li))/g, '$1');
    html = html.replace(/(<\/(?:h[2-4]|pre|ul|ol|hr|li)>)\s*<br \/>/g, '$1');

    return html;
  };

  const totalMemory = Object.values(memory).flat().length;

  return (
    <div className="relative flex h-full flex-col">

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-deepsea-500/15">
            <Sparkles className="h-3.5 w-3.5 text-deepsea-600 dark:text-deepsea-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">AI Career Agent</p>
            <p className="text-[10px] text-muted-foreground">Sandbox mode · ready</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowMemory(v => !v)}
            className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <Brain className="h-3.5 w-3.5" />
            Memory ({totalMemory})
          </button>
          <button onClick={clearHistory} className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-deepsea-500/15">
                <Sparkles className="h-3 w-3 text-deepsea-600 dark:text-deepsea-400" />
              </div>
            )}
            <div className={[
              'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              m.role === 'user'
                ? 'rounded-tr-sm bg-deepsea-600 text-white'
                : 'rounded-tl-sm bg-muted/60 text-foreground border border-border/50',
            ].join(' ')}>
              {m.role === 'assistant' ? (
              m.content
                ? <div className="prose-chat" dangerouslySetInnerHTML={{ __html: renderContent(m.content) }} />
                : <div className="flex items-center gap-2 py-1">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-deepsea-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-deepsea-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-deepsea-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-muted-foreground text-xs">Thinking…</span>
                  </div>
            ) : (
              <p className="whitespace-pre-wrap">{m.content}</p>
            )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Prompt chips */}
      <div className="shrink-0 flex flex-wrap gap-1.5 border-t border-border/50 px-4 py-2">
        {SUGGESTED_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => send(p)}
            disabled={generating}
            className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground hover:border-deepsea-400 hover:text-deepsea-700 dark:hover:text-deepsea-300 hover:bg-accent transition-all cursor-pointer disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      {/* File attachment badge */}
      {uploadedFile && (
        <div className="shrink-0 flex items-center gap-2 border-t border-border/50 px-4 py-1.5 bg-deepsea-50/50 dark:bg-deepsea-950/20">
          <FileText className="h-3.5 w-3.5 text-deepsea-600 dark:text-deepsea-400" />
          <span className="text-[11px] font-semibold text-deepsea-700 dark:text-deepsea-300 truncate flex-1">{uploadedFile.name}</span>
          {uploadSaved && <span className="flex items-center gap-0.5 text-[9px] text-emerald-600"><CheckCircle className="h-3 w-3" />Saved to Resume Studio</span>}
          <button onClick={() => { setUploadedFile(null); setUploadSaved(false); }} className="text-muted-foreground hover:text-red-500 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Generating indicator */}
      {generating && (
        <div className="shrink-0 flex items-center gap-2 border-t border-deepsea-200 dark:border-deepsea-900/50 bg-deepsea-50/50 dark:bg-deepsea-950/20 px-4 py-1.5">
          <Loader2 className="h-3 w-3 animate-spin text-deepsea-600 dark:text-deepsea-400" />
          <span className="text-[11px] text-deepsea-700 dark:text-deepsea-300 font-medium">AI is generating a response…</span>
          <div className="flex-1" />
          <div className="h-1 w-24 rounded-full bg-deepsea-200 dark:bg-deepsea-900 overflow-hidden">
            <div className="h-full w-full rounded-full bg-deepsea-500 animate-pulse" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 flex gap-2 border-t border-border bg-card/80 px-4 py-3">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_EXTENSIONS}
          onChange={handleFileUpload}
          className="hidden"
        />
        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={generating || uploading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-deepsea-600 hover:border-deepsea-400 hover:bg-deepsea-50 dark:hover:bg-deepsea-950/20 transition-all disabled:opacity-50 cursor-pointer"
          title={`Upload resume (${SUPPORTED_LABEL})`}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </button>
        <input
          type="text"
          placeholder={uploadedFile ? 'Add instructions for the AI…' : 'Ask anything career-related…'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          disabled={generating}
          className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-deepsea-500/40 focus:border-deepsea-500 transition-all disabled:opacity-60"
        />
        <button
          onClick={() => send()}
          disabled={generating || (!input.trim() && !uploadedFile)}
          className="btn-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-deepsea-600 text-white shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>

      {/* Memory Drawer */}
      {showMemory && (
        <div className="absolute inset-0 z-20 flex flex-col bg-card shadow-xl">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-deepsea-600 dark:text-deepsea-400" />
              <span className="text-sm font-semibold text-foreground">AI Memory</span>
            </div>
            <button onClick={() => setShowMemory(false)} className="rounded-lg p-1.5 hover:bg-accent text-muted-foreground cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {(Object.keys(memory) as (keyof AIMemory)[]).map(type => {
              const labels: Record<keyof AIMemory, string> = {
                skills: '🛠 Skills', goals: '🎯 Goals', companies: '🏢 Target Companies', facts: '📝 Bio Facts'
              };
              return (
                <div key={type}>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{labels[type]}</h4>
                  <div className="space-y-1.5">
                    {memory[type].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-1.5">
                        <span className="text-xs text-foreground">{item}</span>
                        <button onClick={() => removeItem(type, idx)} className="text-muted-foreground hover:text-red-500 cursor-pointer text-xs font-bold ml-2">✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <input
                      type="text"
                      value={newItems[type]}
                      onChange={e => setNewItems(p => ({ ...p, [type]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addItem(type)}
                      placeholder={`Add ${type.slice(0,-1)}…`}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                    />
                    <button
                      onClick={() => addItem(type)}
                      className="rounded-lg bg-deepsea-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-deepsea-700 cursor-pointer"
                    >+</button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => saveMemory({ skills: [], goals: [], companies: [], facts: [] })}
              className="w-full rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-2 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/40 cursor-pointer"
            >
              Clear All Memory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
