'use client';

import React, { useState, useEffect } from 'react';
import { dbManager, CoverLetter } from '@/lib/db';
import { streamChat } from '@/lib/llm';
import { Mail, Trash2, Copy, Printer, Save, Sparkles, Loader2, CheckCircle } from 'lucide-react';

const STYLES = [
  { value: 'technical',   label: 'Technical',    desc: 'Skills-focused, precise' },
  { value: 'startup',     label: 'Startup',      desc: 'Dynamic, passionate' },
  { value: 'enterprise',  label: 'Enterprise',   desc: 'Formal, structured' },
  { value: 'executive',   label: 'Executive',    desc: 'Leadership emphasis' },
  { value: 'internship',  label: 'Internship',   desc: 'Academic, eager' },
];

const TONES = ['Confident', 'Professional', 'Enthusiastic', 'Humble'];

export function CoverLetterStudio() {
  const [letters, setLetters]   = useState<CoverLetter[]>([]);
  const [active, setActive]     = useState<CoverLetter | null>(null);
  const [content, setContent]   = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [saved, setSaved]       = useState(false);

  // Form
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany]   = useState('');
  const [jobDesc, setJobDesc]   = useState('');
  const [highlight, setHighlight] = useState('');
  const [style, setStyle]       = useState('technical');
  const [tone, setTone]         = useState('Confident');

  useEffect(() => {
    dbManager.getCoverLetters().then(list => {
      setLetters(list);
      if (list.length > 0) { setActive(list[0]); setContent(list[0].content); }
    });
  }, []);

  const generate = async () => {
    if (!jobTitle.trim() || !company.trim()) { alert('Fill in Job Title and Company.'); return; }
    setGenerating(true); setContent('');

    const config = await dbManager.getSetting('llm_config', { provider: 'sandbox' });
    const prompt = `Write a ${style} cover letter for a ${jobTitle} position at ${company}.
Tone: ${tone}.
Personal highlight: ${highlight || 'Experienced engineer with solid full-stack skills.'}.
Job context: ${jobDesc || 'Software engineering role requiring strong technical fundamentals.'}.
Keep it under 300 words. Include date, salutation, 3 body paragraphs, and closing.`;

    let acc = '';
    await streamChat(
      [{ role: 'user', content: prompt }],
      config as any,
      chunk => { acc += chunk; setContent(acc); },
      async () => {
        const letter: CoverLetter = { id: `cl-${Date.now()}`, title: `${jobTitle} @ ${company}`, jobTitle, company, content: acc, style, createdAt: Date.now() };
        await dbManager.saveCoverLetter(letter);
        const list = await dbManager.getCoverLetters();
        setLetters(list); setActive(letter); setGenerating(false);
      },
      err => { setContent(`Error: ${err.message}`); setGenerating(false); },
    );
  };

  const saveEdit = async () => {
    if (!active) return;
    const updated = { ...active, content };
    await dbManager.saveCoverLetter(updated);
    setLetters(prev => prev.map(l => l.id === updated.id ? updated : l));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const deleteLetter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await dbManager.deleteCoverLetter(id);
    const list = await dbManager.getCoverLetters();
    setLetters(list);
    if (active?.id === id) {
      if (list.length > 0) { setActive(list[0]); setContent(list[0].content); }
      else { setActive(null); setContent(''); }
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Mail className="h-5 w-5 text-deepsea-600 dark:text-deepsea-400" />
          Cover Letter Studio
        </h2>
        <p className="text-sm text-muted-foreground">Generate tailored cover letters in multiple styles and export to PDF.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Left: Form + saved list */}
        <div className="lg:col-span-2 space-y-4">

          {/* Saved letters */}
          {letters.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saved Letters</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {letters.map(l => (
                  <div key={l.id} onClick={() => { setActive(l); setContent(l.content); setJobTitle(l.jobTitle); setCompany(l.company); }}
                    className={`group flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all ${
                      active?.id === l.id ? 'border-deepsea-500 bg-deepsea-50 dark:bg-deepsea-950/20 text-deepsea-800 dark:text-deepsea-200 font-medium' : 'border-border text-foreground hover:bg-accent'}`}>
                    <span className="truncate">{l.title}</span>
                    <button onClick={e => deleteLetter(l.id, e)} className="ml-2 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 cursor-pointer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generator form */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <p className="text-sm font-semibold text-foreground">Blueprint</p>

            <div className="space-y-3">
              <div>
                <label className="block mb-1 text-xs font-semibold text-muted-foreground">Job Title *</label>
                <input type="text" placeholder="Senior Frontend Engineer" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-deepsea-500/40 focus:border-deepsea-500" />
              </div>

              <div>
                <label className="block mb-1 text-xs font-semibold text-muted-foreground">Company *</label>
                <input type="text" placeholder="Google" value={company} onChange={e => setCompany(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-deepsea-500/40 focus:border-deepsea-500" />
              </div>

              {/* Style selector */}
              <div>
                <label className="block mb-2 text-xs font-semibold text-muted-foreground">Letter Style</label>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {STYLES.map(s => (
                    <button key={s.value} onClick={() => setStyle(s.value)}
                      className={`rounded-lg border px-2 py-1.5 text-left transition-all cursor-pointer ${
                        style === s.value ? 'border-deepsea-500 bg-deepsea-50 dark:bg-deepsea-950/20' : 'border-border hover:bg-accent'}`}>
                      <p className={`text-xs font-semibold ${style === s.value ? 'text-deepsea-700 dark:text-deepsea-300' : 'text-foreground'}`}>{s.label}</p>
                      <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div>
                <label className="block mb-1 text-xs font-semibold text-muted-foreground">Tone</label>
                <div className="flex flex-wrap gap-1.5">
                  {TONES.map(t => (
                    <button key={t} onClick={() => setTone(t)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium cursor-pointer transition-all ${
                        tone === t ? 'border-deepsea-500 bg-deepsea-600 text-white' : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Highlight */}
              <div>
                <label className="block mb-1 text-xs font-semibold text-muted-foreground">Personal highlight (optional)</label>
                <textarea placeholder="Specific achievement to mention…" value={highlight} onChange={e => setHighlight(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-deepsea-500/40 focus:border-deepsea-500 resize-none h-20" />
              </div>
            </div>

            <button onClick={generate} disabled={generating}
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl bg-deepsea-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-deepsea-700 disabled:opacity-60 cursor-pointer">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? 'Generating…' : 'Generate with AI'}
            </button>
          </div>
        </div>

        {/* Right: Document editor */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Document</span>
              {content && (
                <div className="flex items-center gap-2">
                  <button onClick={copy} className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer">
                    {copied ? <><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                  </button>
                  <button onClick={saveEdit} className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer">
                    {saved ? <><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Saved!</> : <><Save className="h-3.5 w-3.5" /> Save</>}
                  </button>
                  <button onClick={() => window.print()} className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer">
                    <Printer className="h-3.5 w-3.5" /> Print
                  </button>
                </div>
              )}
            </div>

            {generating ? (
              <div className="flex flex-col items-center justify-center py-32 text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-deepsea-500" />
                <p className="text-sm font-semibold text-foreground">Writing your letter…</p>
                <p className="text-xs text-muted-foreground">Applying {style} style with {tone.toLowerCase()} tone.</p>
              </div>
            ) : content ? (
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full min-h-[540px] resize-none bg-background p-6 font-serif text-sm text-foreground leading-relaxed focus:outline-none"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center space-y-3">
                <Mail className="h-12 w-12 text-border" />
                <p className="text-sm font-semibold text-foreground">No document yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">Fill in the blueprint on the left and click "Generate with AI" to draft your letter.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
