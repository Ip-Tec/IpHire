'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { dbManager, ChatSession, ChatMessage, UserProfile } from '@/lib/db';
import { streamChat } from '@/lib/llm';
import {
  Send, Sparkles, X, Loader2, Bot, ArrowRight, CheckCircle,
  Sidebar as SidebarIcon, PanelRight, ChevronDown
} from 'lucide-react';

// Navigation route map matching ActivePage ids in page.tsx
const ROUTE_MAP: Record<string, string> = {
  'dashboard': 'dashboard',
  'resume-studio': 'resume',
  'cover-letters': 'cover',
  'job-analyzer': 'analyzer',
  'job-discovery': 'discovery',
  'app-tracker': 'tracker',
  'skill-gap': 'gap',
  'interview-coach': 'coach',
  'scheduler': 'scheduler',
  'profile': 'profile',
  'auto-fill': 'autofill',
  'ai-workflows': 'workflows',
  'web-builder': 'portfolio',
  'analytics': 'analytics',
  'settings': 'settings',
};

// Reverse map for context display
const PAGE_LABELS: Record<string, string> = {
  'dashboard': 'Dashboard',
  'profile': 'My Profile',
  'resume': 'Resume Studio',
  'cover': 'Cover Letters',
  'analyzer': 'Job Analyzer',
  'discovery': 'Job Discovery',
  'tracker': 'App Tracker',
  'gap': 'Skill Gap',
  'coach': 'Interview Coach',
  'scheduler': 'Scheduler',
  'autofill': 'Auto-Fill Tools',
  'workflows': 'AI Workflows',
  'portfolio': 'Web Builder',
  'analytics': 'Analytics',
  'settings': 'BYOK Settings',
};

export function GlobalChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'drawer' | 'sidebar'>('drawer');

  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Context awareness
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Listen for page changes from the dashboard
  useEffect(() => {
    const handlePageChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.page) setCurrentPage(detail.page);
    };
    window.addEventListener('page_changed', handlePageChange);
    return () => window.removeEventListener('page_changed', handlePageChange);
  }, []);

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
            content: '👋 Hi! I\'m your **Global AI Career Agent**.\n\nI follow you across every page! Ask me to navigate you around, update your profile, or help with any career task.',
            timestamp: Date.now(),
          }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await dbManager.saveChat(s);
      }
      setSession(s);
      setMessages(s.messages);

      const p = await dbManager.getSetting<UserProfile>('user_profile', {} as any);
      setProfile(p);
    }
    init();

    const handleProfileUpdate = async () => {
      const p = await dbManager.getSetting<UserProfile>('user_profile', {} as any);
      setProfile(p);
    };
    window.addEventListener('profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('profile_updated', handleProfileUpdate);
  }, []);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const navigateToPage = useCallback((target: string) => {
    const pageId = ROUTE_MAP[target];
    if (pageId) {
      window.dispatchEvent(new CustomEvent('navigate_to', { detail: { page: pageId } }));
    }
  }, []);

  const send = async () => {
    const content = input.trim();
    if (!content || generating || !session) return;
    setInput('');
    setIsOpen(true);

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content, timestamp: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);

    // Build context-enriched messages for the AI
    const contextLabel = PAGE_LABELS[currentPage] || currentPage;
    const systemContext = `[SYSTEM CONTEXT: User is currently viewing "${contextLabel}". User profile: ${JSON.stringify(profile || {})}]`;
    const messagesForApi = [
      ...next.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: `${systemContext}\n\n${content}` }
    ];

    const updSession = { ...session, messages: next, updatedAt: Date.now() };
    await dbManager.saveChat(updSession);

    setGenerating(true);
    const asstId = `a-${Date.now()}`;
    setMessages(prev => [...prev, { id: asstId, role: 'assistant', content: '', timestamp: Date.now() }]);

    const config = await dbManager.getSetting('llm_config', { provider: 'sandbox' });
    let acc = '';

    await streamChat(
      messagesForApi,
      config as any,
      chunk => {
        acc += chunk;
        setMessages(prev => prev.map(m => m.id === asstId ? { ...m, content: acc } : m));
      },
      async () => {
        // Parse and execute NAVIGATE actions
        const navMatch = acc.match(/\[ACTION:\s*(\{[^}]*"type"\s*:\s*"NAVIGATE"[^}]*\})\s*\]/);
        if (navMatch) {
          try {
            const action = JSON.parse(navMatch[1]);
            if (action.target) navigateToPage(action.target);
          } catch (e) {
            console.error('Failed to parse NAVIGATE action', e);
          }
        }

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

  const handleApproveProfileUpdate = async (msgId: string, payload: Record<string, any>) => {
    const current = profile || ({} as UserProfile);
    const updatedProfile = { ...current, ...payload };
    await dbManager.setSetting('user_profile', updatedProfile);
    setProfile(updatedProfile as UserProfile);
    window.dispatchEvent(new Event('profile_updated'));

    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return { ...m, content: m.content.replace(/\[ACTION:[^\]]*UPDATE_PROFILE[^\]]*\]/, '\n\n✅ *Profile update applied successfully!*') };
      }
      return m;
    }));
  };

  const renderMarkdown = (text: string): string => {
    return text
      // Code blocks (``` ... ```)
      .replace(/```([\s\S]*?)```/g, '<pre class="my-2 rounded-lg bg-muted p-3 text-[11px] overflow-x-auto font-mono"><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-[11px] font-mono text-pink-500">$1</code>')
      // H3 headers
      .replace(/^### (.+)$/gm, '<h3 class="mt-3 mb-1 text-[13px] font-bold text-foreground">$1</h3>')
      // H2 headers
      .replace(/^## (.+)$/gm, '<h2 class="mt-3 mb-1 text-[14px] font-bold text-foreground">$1</h2>')
      // H1 headers
      .replace(/^# (.+)$/gm, '<h1 class="mt-3 mb-1 text-[15px] font-bold text-foreground">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      // Numbered lists
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-[13px] text-muted-foreground my-0.5">$2</li>')
      // Bullet lists
      .replace(/^[-•] (.+)$/gm, '<li class="ml-4 list-disc text-[13px] text-muted-foreground my-0.5">$1</li>')
      // Wrap consecutive <li> items in <ul>
      .replace(/(<li[^>]*>.*<\/li>\n?)+/g, m => `<ul class="my-1 space-y-0.5">${m}</ul>`)
      // Double newlines → paragraph breaks
      .replace(/\n\n/g, '<br/><br/>')
      // Single newlines → <br>
      .replace(/\n/g, '<br/>');
  };

  const renderContent = (text: string, msgId: string, isStreaming = false) => {
    let cleanText = text;
    let actionBlock: any = null;

    const actionMatch = text.match(/\[ACTION:\s*(\{.*?\})\s*\]/);
    if (actionMatch) {
      cleanText = text.replace(actionMatch[0], '');
      try {
        actionBlock = JSON.parse(actionMatch[1]);
      } catch {}
    }

    const html = renderMarkdown(cleanText);

    return (
      <div className="space-y-2">
        <div
          dangerouslySetInnerHTML={{ __html: html + (isStreaming ? '<span class="inline-block w-2 h-3 ml-0.5 bg-deepsea-500 animate-pulse rounded-sm align-middle"></span>' : '') }}
          className="text-[13px] leading-relaxed"
        />

        {actionBlock && actionBlock.type === 'UPDATE_PROFILE' && (
          <div className="mt-3 rounded-lg border border-deepsea-200 bg-deepsea-50 dark:border-deepsea-900/50 dark:bg-deepsea-900/20 p-3">
            <p className="text-xs font-semibold text-deepsea-700 dark:text-deepsea-300 mb-2">📝 Requested Profile Update:</p>
            <pre className="text-[10px] text-muted-foreground mb-3 overflow-x-auto">{JSON.stringify(actionBlock.payload, null, 2)}</pre>
            <button
              onClick={() => handleApproveProfileUpdate(msgId, actionBlock.payload)}
              className="flex items-center gap-1.5 rounded-md bg-deepsea-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-deepsea-700 cursor-pointer"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Approve Update
            </button>
          </div>
        )}
        {actionBlock && actionBlock.type === 'NAVIGATE' && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <ArrowRight className="h-3 w-3" /> Navigating to {actionBlock.target}...
          </div>
        )}
      </div>
    );
  };

  // Strip system context prefix from displayed user messages
  const displayContent = (text: string) => {
    return text.replace(/\[SYSTEM CONTEXT:[\s\S]*?\]\n\n/, '');
  };

  const contextLabel = PAGE_LABELS[currentPage] || 'Dashboard';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    
    // Clear the input so the same file can be uploaded again if needed
    e.target.value = '';
    
    // Show uploading message
    const msgId = `u-${Date.now()}`;
    const uploadingMsg: ChatMessage = { 
      id: msgId, 
      role: 'user', 
      content: `[Uploading file: ${file.name}...]`, 
      timestamp: Date.now() 
    };
    const next = [...messages, uploadingMsg];
    setMessages(next);
    setGenerating(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/parse-file', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to parse file');
      }

      // Replace uploading message with actual file content context
      const fileContextMsg: ChatMessage = {
        id: msgId,
        role: 'user',
        content: `I have uploaded a file named "${file.name}". Here is its extracted text:\n\n${data.text}\n\nPlease acknowledge receipt.`,
        timestamp: Date.now()
      };
      
      const updatedMessages = [...messages, fileContextMsg];
      setMessages(updatedMessages);
      
      const updSession = { ...session, messages: updatedMessages, updatedAt: Date.now() };
      await dbManager.saveChat(updSession);
      
      // Auto-trigger send to have AI acknowledge
      setInput(`I just uploaded ${file.name}.`);
      setGenerating(false);
      // Let the user press send manually, or we can auto-send. We'll auto-send.
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as any;
        document.getElementById('ai-chat-send-btn')?.click();
      }, 100);

    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: `⚠️ Error uploading ${file.name}: ${err.message}` } : m));
      setGenerating(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-deepsea-600 text-white shadow-xl hover:bg-deepsea-700 transition-transform hover:scale-105 cursor-pointer"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className={
          mode === 'drawer'
            ? "fixed bottom-6 right-6 z-50 flex h-[600px] max-h-[80vh] w-[380px] flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            : "fixed top-0 right-0 z-40 flex h-screen w-[380px] flex-col border-l border-border bg-card shadow-2xl"
        }>
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-deepsea-500/15">
                <Sparkles className="h-3.5 w-3.5 text-deepsea-600 dark:text-deepsea-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Global Career Agent</p>
                <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">📍 {contextLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMode(mode === 'drawer' ? 'sidebar' : 'drawer')}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                title={mode === 'drawer' ? 'Dock to Sidebar' : 'Float as Drawer'}
              >
                {mode === 'drawer' ? <PanelRight className="h-4 w-4" /> : <SidebarIcon className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => {
              // The last assistant message while generating = streaming in progress
              const isStreamingMsg = generating && msg.role === 'assistant' && idx === messages.length - 1;
              // Show the spinner bubble only if content is still empty (AI hasn't sent first chunk yet)
              const isWaitingForFirstChunk = isStreamingMsg && msg.content === '';
              if (isWaitingForFirstChunk) return null; // Will be replaced by spinner below
              return (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-xl px-4 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-deepsea-600 text-white shadow-sm'
                      : 'border border-border bg-background text-foreground shadow-sm'
                  }`}>
                    {msg.role === 'user' ? (
                      <p className="text-[13px] whitespace-pre-wrap">{displayContent(msg.content)}</p>
                    ) : (
                      renderContent(msg.content, msg.id, isStreamingMsg)
                    )}
                  </div>
                </div>
              );
            })}
            {/* Spinner: shown only while waiting for the very first token */}
            {generating && messages[messages.length - 1]?.content === '' && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-deepsea-500" />
                  <span className="text-[13px] text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border bg-background p-4">
            <div className="relative flex items-center gap-2">
              <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileUpload} disabled={generating} />
              </label>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask me anything or say 'take me to Resume Studio'..."
                className="w-full resize-none rounded-xl border border-border bg-card pl-4 pr-12 py-3 text-[13px] text-foreground focus:border-deepsea-500 focus:outline-none focus:ring-1 focus:ring-deepsea-500 min-h-[46px] max-h-[120px]"
                rows={1}
              />
              <button
                id="ai-chat-send-btn"
                onClick={() => send()}
                disabled={!input.trim() || generating}
                className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-deepsea-600 text-white transition-all hover:bg-deepsea-700 disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 text-center">
              <span className="text-[10px] text-muted-foreground">Enter to send · Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
