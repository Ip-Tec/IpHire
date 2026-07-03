'use client';

import React, { useEffect, useState, useRef } from 'react';
import { dbManager, Resume } from '@/lib/db';
import { streamChat } from '@/lib/llm';
import { FileText, Plus, Trash2, Layout, Award, Download, Printer, Edit3, Loader2, CheckCircle } from 'lucide-react';

const STARTER = `# ALEX RIVERA
alex.rivera@example.com | (555) 019-2834 | San Francisco, CA | github.com/alexr | linkedin.com/in/alex-rivera

## PROFESSIONAL SUMMARY
Passionate Software Engineer with 4+ years designing, building, and optimizing modern web applications. Specialized in TypeScript, React, Next.js, and CSS architectures.

## TECHNICAL SKILLS
- **Languages**: TypeScript, JavaScript (ES6+), HTML5, CSS3, SQL
- **Frameworks**: React, Next.js (App Router), Node.js, Express
- **Styling**: Tailwind CSS v4, CSS Modules, Framer Motion
- **Tooling**: Git, Webpack, ESLint, Jest, Vite

## PROFESSIONAL EXPERIENCE
### Senior Frontend Engineer | TechSpire Apps | 2024 – Present
- Architected next-generation customer dashboard using Next.js App Router, increasing load speeds by 40%.
- Established Tailwind CSS design token system, standardizing component library across 3 domains.
- Led 3-developer team migrating legacy React to TypeScript, reducing runtime bugs by 25%.

### Software Developer | OceanWeb Labs | 2022 – 2024
- Built React-based SaaS dashboards, integrating RESTful API hooks.
- Implemented micro-animations with CSS transitions, improving session length by 15%.
- Maintained 85% test coverage using Jest end-to-end suites.

## EDUCATION
**B.S. Computer Science** | University of California, Berkeley | 2018 – 2022
`;

type Tab = 'editor' | 'preview';
type Template = 'modern' | 'technical' | 'minimal';

export function ResumeStudio() {
  const [resumes, setResumes]       = useState<Resume[]>([]);
  const [active, setActive]         = useState<Resume | null>(null);
  const [nameInput, setNameInput]   = useState('');
  const [tab, setTab]               = useState<Tab>('editor');
  const [template, setTemplate]     = useState<Template>('modern');
  const [scoring, setScoring]       = useState(false);
  const [scoreFeedback, setFeedback] = useState('');

  useEffect(() => {
    dbManager.getResumes().then(async list => {
      if (list.length === 0) {
        const r: Resume = { id: 'res-default', name: 'My Master Resume', content: STARTER, score: 75, atsFeedback: '', version: 1, createdAt: Date.now() };
        await dbManager.saveResume(r);
        setResumes([r]);
        setActive(r);
      } else {
        setResumes(list);
        setActive(list[0]);
      }
    });
  }, []);

  const update = async (content: string) => {
    if (!active) return;
    const r = { ...active, content };
    setActive(r);
    setResumes(prev => prev.map(x => x.id === r.id ? r : x));
    await dbManager.saveResume(r);
  };

  const createVersion = async () => {
    if (!nameInput.trim()) return;
    const r: Resume = { id: `res-${Date.now()}`, name: nameInput.trim(), content: active?.content ?? STARTER, score: 0, atsFeedback: '', version: (active?.version ?? 1) + 1, createdAt: Date.now() };
    await dbManager.saveResume(r);
    const list = await dbManager.getResumes();
    setResumes(list); setActive(r); setNameInput('');
  };

  const deleteResume = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (resumes.length <= 1) { alert('Keep at least one resume.'); return; }
    await dbManager.deleteResume(id);
    const list = await dbManager.getResumes();
    setResumes(list);
    if (active?.id === id) setActive(list[0]);
  };

  const runAts = async () => {
    if (!active) return;
    setScoring(true); setFeedback('');
    const config = await dbManager.getSetting('llm_config', { provider: 'sandbox' });
    let acc = '';
    await streamChat(
      [{ role: 'user', content: `Analyze this resume for ATS quality. First line: "SCORE: X". Then detailed analysis.\n\n${active.content}` }],
      config as any,
      chunk => { acc += chunk; setFeedback(acc); },
      async () => {
        const scoreMatch = acc.match(/SCORE:\s*(\d+)/i);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : active.score;
        const r = { ...active, score, atsFeedback: acc };
        setActive(r);
        setResumes(prev => prev.map(x => x.id === r.id ? r : x));
        await dbManager.saveResume(r);
        setScoring(false);
      },
      err => { setFeedback(`Error: ${err.message}`); setScoring(false); },
    );
  };

  const downloadMd = () => {
    if (!active) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([active.content], { type: 'text/markdown' }));
    a.download = `${active.name.replace(/\s+/g, '_')}_v${active.version}.md`;
    a.click();
  };

  const exportPdf = () => {
    if (!active) return;
    const html = toHtml(active.content);
    const css = templateCss[template];
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>${active.name}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            @page { size: A4; margin: 0; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            ${css}
          </style>
        </head>
        <body>
          <div class="no-print" style="background:#f0f0f0;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;font-family:system-ui,sans-serif;font-size:13px;">
            <span>💡 Use <strong>Ctrl+P</strong> / <strong>⌘P</strong> and set destination to <strong>Save as PDF</strong> for best results.</span>
            <button onclick="window.print()" style="background:#1b737a;color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;">🖨️ Print / Save PDF</button>
          </div>
          <div class="resume">${html}</div>
        </body>
      </html>
    `);
    win.document.close();
  };

  const downloadDocx = () => {
    if (!active) return;
    const html = toHtml(active.content);
    const css = templateCss[template];
    // Creates an HTML file that Word can open and convert cleanly
    const content = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8"/>
          <title>${active.name}</title>
          <style>${css}</style>
        </head>
        <body>
          <div class="resume">${html}</div>
        </body>
      </html>
    `;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'application/msword' }));
    a.download = `${active.name.replace(/\s+/g, '_')}_v${active.version}.doc`;
    a.click();
  };

  // Lightweight markdown → HTML renderer
  const toHtml = (md: string) => {
    const lines = md.split('\n');
    let html = ''; let inUl = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { if (inUl) { html += '</ul>'; inUl = false; } continue; }
      if (t.startsWith('# '))   { html += `<h1>${esc(t.slice(2))}</h1>`; }
      else if (t.startsWith('## ')) { html += `<h2>${esc(t.slice(3))}</h2>`; }
      else if (t.startsWith('### ')) {
        const parts = t.slice(4).split(' | ');
        html += `<h3><span class="jobtitle">${esc(parts[0])}</span>${parts[1] ? ` <span class="company">| ${esc(parts[1])}</span>` : ''}${parts[2] ? `<span class="date">${esc(parts[2])}</span>` : ''}</h3>`;
      }
      else if (t.startsWith('- ')) {
        if (!inUl) { html += '<ul>'; inUl = true; }
        html += `<li>${inlineMd(t.slice(2))}</li>`;
      } else {
        if (inUl) { html += '</ul>'; inUl = false; }
        html += `<p>${inlineMd(t)}</p>`;
      }
    }
    if (inUl) html += '</ul>';
    return html;
  };
  const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inlineMd = (s: string) => esc(s).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  const templateCss: Record<Template, string> = {
    modern: `
      .resume{font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:40px;color:#111;background:#fff;line-height:1.5}
      h1{font-size:22px;font-weight:800;text-align:center;letter-spacing:-.5px;margin-bottom:4px}
      h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;border-bottom:2px solid #1b737a;color:#1b737a;margin:20px 0 8px;padding-bottom:4px}
      h3{display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin:12px 0 4px}
      .date{font-weight:400;color:#666;font-size:12px;white-space:nowrap}
      .company{color:#555}
      p{font-size:12px;color:#444;margin:4px 0}
      ul{margin:4px 0 4px 16px;padding:0}
      li{font-size:12px;color:#444;margin:2px 0}
      strong{color:#111;font-weight:600}
    `,
    technical: `
      .resume{font-family:'Courier New',monospace;max-width:720px;margin:0 auto;padding:40px;color:#1a1a1a;background:#fff;line-height:1.6}
      h1{font-size:20px;font-weight:700;border-bottom:1px solid #1b737a;padding-bottom:6px;margin-bottom:4px}
      h2{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:18px 0 6px;color:#1b737a}
      h3{font-size:13px;font-weight:600;display:flex;justify-content:space-between;margin:10px 0 3px}
      .date{font-weight:400;color:#666;font-size:11px}
      .company{color:#444}
      p,li{font-size:11.5px;color:#333;margin:3px 0}
      ul{margin:3px 0 3px 14px;padding:0}
      strong{font-weight:700}
    `,
    minimal: `
      .resume{font-family:Georgia,serif;max-width:680px;margin:0 auto;padding:48px;color:#1c1c1c;background:#fff;line-height:1.7}
      h1{font-size:26px;font-weight:400;letter-spacing:1px;margin-bottom:2px}
      h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#888;margin:24px 0 8px;border:none}
      h3{font-size:14px;font-weight:600;display:flex;justify-content:space-between;margin:14px 0 4px}
      .date{font-weight:400;font-style:italic;color:#888;font-size:13px}
      .company{color:#555}
      p{font-size:13px;color:#444;margin:5px 0}
      ul{margin:5px 0 5px 18px;padding:0}
      li{font-size:13px;color:#444;margin:3px 0}
    `,
  };

  const score = active?.score ?? 0;
  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <FileText className="h-5 w-5 text-deepsea-600 dark:text-deepsea-400" />
            Resume Studio
          </h2>
          <p className="text-sm text-muted-foreground">Edit in Markdown · ATS scoring · Export to PDF</p>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-xl border border-border bg-muted/40 p-1">
          {(['editor','preview'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-all cursor-pointer ${
                tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t === 'editor' ? <><Edit3 className="mr-1.5 inline h-3.5 w-3.5" />Editor</> : <><Layout className="mr-1.5 inline h-3.5 w-3.5" />Preview</>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">

        {/* Sidebar: versions + ATS score */}
        <div className="lg:col-span-1 space-y-4">

          {/* Version list */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Versions</p>
            <div className="space-y-1.5">
              {resumes.map(r => (
                <div key={r.id} onClick={() => setActive(r)}
                  className={`group flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all ${
                    active?.id === r.id
                      ? 'border-deepsea-500 bg-deepsea-50 dark:bg-deepsea-950/20 text-deepsea-800 dark:text-deepsea-200 font-medium'
                      : 'border-border text-foreground hover:bg-accent'}`}
                >
                  <span className="truncate">{r.name}</span>
                  <button onClick={e => deleteResume(r.id, e)}
                    className="ml-2 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 cursor-pointer transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* New version */}
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              <input type="text" placeholder="Version name…"
                value={nameInput} onChange={e => setNameInput(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-deepsea-500/40 focus:border-deepsea-500"
              />
              <button onClick={createVersion}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-deepsea-600 py-2 text-sm font-semibold text-white hover:bg-deepsea-700 active:scale-95 transition-all cursor-pointer">
                <Plus className="h-4 w-4" /> Save Version
              </button>
            </div>
          </div>

          {/* ATS Score card */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">ATS Score</p>
            <p className={`text-5xl font-extrabold ${scoreColor}`}>
              {score > 0 ? score : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{score > 0 ? 'out of 100' : 'Run audit below'}</p>

            <button onClick={runAts} disabled={scoring}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-deepsea-600 py-2 text-sm font-semibold text-white hover:bg-deepsea-700 disabled:opacity-60 active:scale-95 transition-all cursor-pointer">
              {scoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
              {scoring ? 'Analyzing…' : 'Run ATS Audit'}
            </button>

            <div className="mt-3 flex flex-col gap-2">
              <button onClick={exportPdf} className="flex w-full items-center justify-center gap-1 rounded-lg border border-border py-2 text-xs font-semibold text-foreground hover:bg-accent cursor-pointer">
                <Download className="h-3.5 w-3.5" /> Export PDF
              </button>
              <div className="flex gap-2">
                <button onClick={downloadMd} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border py-1.5 text-xs text-muted-foreground hover:bg-accent cursor-pointer">
                  <Download className="h-3.5 w-3.5" /> .md
                </button>
                <button onClick={downloadDocx} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border py-1.5 text-xs text-muted-foreground hover:bg-accent cursor-pointer">
                  <FileText className="h-3.5 w-3.5" /> .doc
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main panel */}
        <div className="lg:col-span-3">
          {tab === 'editor' ? (
            /* Editor */
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Markdown Editor</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-emerald-500" /> Auto-saved
                </span>
              </div>
              <textarea
                value={active?.content ?? ''}
                onChange={e => update(e.target.value)}
                placeholder="Paste or write your resume in Markdown…"
                className="w-full min-h-[520px] resize-none bg-background p-5 font-mono text-sm text-foreground focus:outline-none leading-relaxed"
              />
            </div>
          ) : (
            /* Preview + ATS feedback */
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

              {/* Preview */}
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Layout className="h-3.5 w-3.5 text-muted-foreground" />
                    <select value={template} onChange={e => setTemplate(e.target.value as Template)}
                      className="rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground focus:outline-none">
                      <option value="modern">Modern</option>
                      <option value="technical">Technical</option>
                      <option value="minimal">Minimal Serif</option>
                    </select>
                  </div>
                  <button onClick={() => window.print()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                    <Printer className="h-3.5 w-3.5" /> Print
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[560px] bg-slate-100 dark:bg-zinc-900 p-4">
                  <style>{templateCss[template]}</style>
                  <div className="resume print-container" dangerouslySetInnerHTML={{ __html: toHtml(active?.content ?? '') }} />
                </div>
              </div>

              {/* ATS Feedback */}
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="border-b border-border bg-muted/30 px-4 py-2.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ATS Feedback</span>
                </div>
                <div className="overflow-y-auto max-h-[560px] p-4">
                  {scoring ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin text-deepsea-500" />
                      <p className="text-sm font-semibold text-foreground">Analyzing…</p>
                      <p className="text-xs text-muted-foreground">Checking keywords, formatting, and impact words.</p>
                    </div>
                  ) : scoreFeedback ? (
                    <div className="prose prose-sm dark:prose-invert text-xs space-y-1">
                      {scoreFeedback.split('\n').map((line, i) => {
                        const t = line.trim();
                        if (t.match(/^SCORE:/i)) return null;
                        if (t.startsWith('### ')) return <h4 key={i} className="font-bold text-foreground mt-3">{t.slice(4)}</h4>;
                        if (t.startsWith('## '))  return <h3 key={i} className="font-bold text-deepsea-600 dark:text-deepsea-400 mt-4 text-xs uppercase tracking-wide">{t.slice(3)}</h3>;
                        if (t.startsWith('- ') || t.startsWith('* '))
                          return <li key={i} className="ml-3 list-disc text-muted-foreground">{t.slice(2)}</li>;
                        return <p key={i} className="text-muted-foreground">{t}</p>;
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
                      <Award className="h-10 w-10 text-border" />
                      <p className="text-sm font-semibold text-foreground">No analysis yet</p>
                      <p className="text-xs text-muted-foreground">Run the ATS Audit from the sidebar to get keyword and formatting feedback.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
