'use client';

import React, { useState, useEffect } from 'react';
import { dbManager, Resume } from '@/lib/db';
import { Globe, Palette, Download, ExternalLink, RefreshCw, Layers, FileText, CheckCircle, Code } from 'lucide-react';

type PortfolioTheme = 'modern' | 'creative' | 'minimal';

interface ThemeConfig {
  primary: string;
  background: string;
  font: string;
}

export const PortfolioBuilder: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [activeResume, setActiveResume] = useState<Resume | null>(null);

  // Customizer
  const [theme, setTheme] = useState<PortfolioTheme>('modern');
  const [primaryColor, setPrimaryColor] = useState('#006d77');
  const [backgroundColor, setBackgroundColor] = useState('#fafbfc');
  const [fontFamily, setFontFamily] = useState('system-ui, sans-serif');

  // Preview code
  const [htmlCode, setHtmlCode] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function init() {
      const list = await dbManager.getResumes();
      setResumes(list);
      if (list.length > 0) {
        setSelectedResumeId(list[0].id);
        setActiveResume(list[0]);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (activeResume) {
      generatePortfolioHtml();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeResume, theme, primaryColor, backgroundColor, fontFamily]);

  const handleResumeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedResumeId(id);
    const found = resumes.find(r => r.id === id) || null;
    setActiveResume(found);
  };

  const handleThemePresets = (t: PortfolioTheme) => {
    setTheme(t);
    if (t === 'modern') {
      setPrimaryColor('#006d77');
      setBackgroundColor('#fafbfc');
      setFontFamily('system-ui, -apple-system, sans-serif');
    } else if (t === 'creative') {
      setPrimaryColor('#228f96');
      setBackgroundColor('#0f172a'); // Dark slate slate
      setFontFamily('"Fira Code", monospace');
    } else {
      setPrimaryColor('#1c1c1c');
      setBackgroundColor('#ffffff');
      setFontFamily('Georgia, serif');
    }
  };

  // Compile full index.html code template using user resume details
  const generatePortfolioHtml = () => {
    if (!activeResume) return;

    // Parse simple headers & lists from resume markdown
    const lines = activeResume.content.split('\n');
    let name = 'Alex Rivera';
    let contactInfo = 'alex.rivera@example.com | San Francisco, CA';
    let summary = 'Software Engineer specializing in front-end development.';
    const experience: { title: string; company: string; date: string; bullet: string }[] = [];
    const skills: string[] = [];

    try {
      const nameLine = lines.find(l => l.trim().startsWith('# '));
      if (nameLine) name = nameLine.replace('# ', '').trim();

      const contactLine = lines.find(l => l.includes('@') || l.includes('|'));
      if (contactLine) contactInfo = contactLine.trim();

      const summaryIdx = lines.findIndex(l => l.toLowerCase().includes('summary'));
      if (summaryIdx !== -1) {
        const temp: string[] = [];
        for (let i = summaryIdx + 1; i < lines.length; i++) {
          const l = lines[i].trim();
          if (l.startsWith('## ')) break;
          if (l) temp.push(l);
        }
        if (temp.length > 0) summary = temp.join(' ');
      }

      // Parse experiences (### Title | Company | Dates)
      lines.forEach((line, idx) => {
        const t = line.trim();
        if (t.startsWith('### ')) {
          const parts = t.slice(4).split(' | ');
          const title = parts[0] || 'Role';
          const company = parts[1] || '';
          const date = parts[2] || '';
          
          // Get next bullet
          let bullet = '';
          for (let i = idx + 1; i < lines.length; i++) {
            const nextL = lines[i].trim();
            if (nextL.startsWith('###') || nextL.startsWith('##')) break;
            if (nextL.startsWith('- ') || nextL.startsWith('* ')) {
              bullet = nextL.slice(2);
              break;
            }
          }
          experience.push({ title, company, date, bullet });
        }
      });

      // Parse skills
      const skillIdx = lines.findIndex(l => l.toLowerCase().includes('skills'));
      if (skillIdx !== -1) {
        for (let i = skillIdx + 1; i < lines.length; i++) {
          const l = lines[i].trim();
          if (l.startsWith('## ')) break;
          if (l.startsWith('- ') || l.startsWith('* ')) {
            skills.push(l.slice(2).replace(/\*\*/g, '').replace(/:/g, ''));
          }
        }
      } else {
        skills.push('TypeScript', 'React', 'Tailwind CSS', 'Next.js', 'SQL');
      }

    } catch (e) {
      console.error("Failed to parse portfolio HTML compilation components", e);
    }

    const compiledCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} | Career Portfolio</title>
  <style>
    :root {
      --primary: ${primaryColor};
      --bg: ${backgroundColor};
      --text: ${theme === 'creative' ? '#f8fafc' : '#334155'};
      --headings: ${theme === 'creative' ? '#ffffff' : '#0f172a'};
      --border: ${theme === 'creative' ? '#1e293b' : '#e2e8f0'};
      --card-bg: ${theme === 'creative' ? '#1e293b/40' : '#ffffff'};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: ${fontFamily};
      line-height: 1.6;
      padding: 40px 20px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    header { border-bottom: 2px solid var(--border); padding-bottom: 24px; margin-bottom: 32px; }
    h1 { font-size: 2.5rem; color: var(--headings); font-weight: 800; letter-spacing: -0.5px; }
    .contact { font-size: 0.9rem; color: var(--primary); font-weight: 500; margin-top: 8px; }
    h2 { font-size: 1.25rem; font-weight: 700; color: var(--headings); margin: 32px 0 16px; border-left: 4px solid var(--primary); padding-left: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    p { margin-bottom: 12px; }
    .skills-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .skill-badge { background-color: var(--primary); color: white; padding: 6px 12px; border-radius: 99px; font-size: 0.75rem; font-weight: 600; text-decoration: none; }
    .exp-item { border-bottom: 1px solid var(--border); padding: 16px 0; }
    .exp-item:last-child { border-bottom: none; }
    .exp-header { display: flex; justify-content: space-between; align-items: center; font-weight: 700; color: var(--headings); }
    .exp-date { font-size: 0.8rem; color: var(--primary); font-weight: 600; }
    .exp-desc { font-size: 0.875rem; margin-top: 6px; }
    footer { text-align: center; font-size: 0.75rem; margin-top: 64px; border-t: 1px solid var(--border); padding-top: 24px; color: var(--primary); font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${name}</h1>
      <div class="contact">${contactInfo}</div>
    </header>

    <section>
      <h2>About Me</h2>
      <p>${summary}</p>
    </section>

    <section>
      <h2>Skills & Expertise</h2>
      <div class="skills-grid">
        ${skills.map(s => `<span class="skill-badge">${s}</span>`).join('\n        ')}
      </div>
    </section>

    <section>
      <h2>Professional Experience</h2>
      <div class="exp-list">
        ${experience.map(exp => `
        <div class="exp-item">
          <div class="exp-header">
            <span>${exp.title} | ${exp.company}</span>
            <span class="exp-date">${exp.date}</span>
          </div>
          <p class="exp-desc">${exp.bullet}</p>
        </div>`).join('')}
      </div>
    </section>

    <footer>
      Generated via IpHire AI Career OS.
    </footer>
  </div>
</body>
</html>`;

    setHtmlCode(compiledCode);
  };

  const handleDownload = () => {
    if (!htmlCode) return;
    const blob = new Blob([htmlCode], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Globe className="h-5 w-5 text-deepsea-600 dark:text-deepsea-400" />
          Personal Career Website Builder
        </h2>
        <p className="text-sm text-muted-foreground">
          Generate a single-file responsive website from your active resume. Customize elements, view live drafts, and export html code.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left Config Panel */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Active resume select */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
            <label className="block text-sm font-semibold text-foreground flex items-center gap-1.5"><FileText className="h-4 w-4" /> 1. Select CV Database Source</label>
            <select
              value={selectedResumeId}
              onChange={handleResumeChange}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
            >
              {resumes.map(r => (
                <option key={r.id} value={r.id}>{r.name} (v{r.version})</option>
              ))}
            </select>
          </div>

          {/* Theme Presets */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3.5">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Palette className="h-4.5 w-4.5" /> 2. Pick Web Design Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {(['modern', 'creative', 'minimal'] as PortfolioTheme[]).map(t => (
                <button
                  key={t}
                  onClick={() => handleThemePresets(t)}
                  className={`rounded-lg border py-2 text-xs font-semibold capitalize transition-all cursor-pointer ${
                    theme === t 
                      ? 'bg-deepsea-600 border-deepsea-600 text-white shadow-sm' 
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Custom Palette adjustments */}
            <div className="border-t border-border pt-3 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-muted-foreground">Primary Accent Color</span>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="w-8 h-6 cursor-pointer border rounded"
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="font-semibold text-muted-foreground">Canvas Background</span>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={e => setBackgroundColor(e.target.value)}
                  className="w-8 h-6 cursor-pointer border rounded"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-muted-foreground">Font Family</label>
                <select
                  value={fontFamily}
                  onChange={e => setFontFamily(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-none"
                >
                  <option value="system-ui, sans-serif">Modern Sans-Serif</option>
                  <option value="Georgia, serif">Classic Serif (Georgia)</option>
                  <option value='"Fira Code", monospace'>Developer Monospace</option>
                </select>
              </div>
            </div>
          </div>

          {/* Download Action */}
          <button
            onClick={handleDownload}
            disabled={!htmlCode}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-deepsea-600 py-2.5 text-xs font-semibold text-white hover:bg-deepsea-700 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
          >
            <Download className="h-4 w-4" /> Download index.html Code
          </button>
        </div>

        {/* Right Iframe Live Sandbox Preview */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col min-h-[480px]">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-deepsea-600" /> Live Render Preview
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><CheckCircle className="h-3 w-3 text-emerald-500" /> Sandboxed</span>
            </div>

            {/* Sandbox Iframe */}
            {htmlCode ? (
              <iframe
                srcDoc={htmlCode}
                title="Live Portfolio Website Preview"
                sandbox="allow-scripts"
                className="w-full flex-grow min-h-[420px] bg-white border-none"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-28 text-center text-muted-foreground space-y-2.5 flex-grow">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border">
                  <Globe className="h-5 w-5 text-border" />
                </div>
                <p className="text-sm font-semibold text-foreground">Waiting for Resume Data</p>
                <p className="text-xs max-w-xs mt-0.5 leading-relaxed">Select a resume file from the list, customize design variables, and click generate to render preview sheets.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
