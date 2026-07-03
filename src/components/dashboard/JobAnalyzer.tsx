'use client';

import React, { useState, useEffect } from 'react';
import { dbManager, Resume } from '@/lib/db';
import { streamChat } from '@/lib/llm';
import { Briefcase, Sparkles, Loader2, Award, AlertCircle } from 'lucide-react';

export function JobAnalyzer() {
  const [resumes, setResumes]   = useState<Resume[]>([]);
  const [resumeId, setResumeId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany]   = useState('');
  const [jobDesc, setJobDesc]   = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport]     = useState('');
  const [score, setScore]       = useState(0);

  useEffect(() => {
    dbManager.getResumes().then(list => {
      setResumes(list);
      if (list.length > 0) setResumeId(list[0].id);
    });
  }, []);

  const analyze = async () => {
    if (!jobTitle.trim() || !jobDesc.trim()) { alert('Fill in Job Title and Job Description.'); return; }
    setAnalyzing(true); setReport(''); setScore(0);

    const resume = resumes.find(r => r.id === resumeId);
    const resumeText = resume?.content ?? 'No resume provided.';
    const config = await dbManager.getSetting('llm_config', { provider: 'sandbox' });

    const prompt = `Analyze this job description against the resume.

Job: ${jobTitle}${company ? ` at ${company}` : ''}
Job Description:
${jobDesc}

Resume:
${resumeText}

First line: "SCORE: X" (0-100 match).
Then provide:
## Extracted Key Requirements
## Your Matching Strengths  
## Skill Gaps
## ATS Keywords to Add
## Resume Optimization Tips`;

    let acc = '';
    await streamChat(
      [{ role: 'user', content: prompt }],
      config as any,
      chunk => {
        acc += chunk;
        setReport(acc);
        const m = acc.match(/SCORE:\s*(\d+)/i);
        if (m) setScore(parseInt(m[1]));
      },
      () => setAnalyzing(false),
      err => { setReport(`Error: ${err.message}`); setAnalyzing(false); },
    );
  };

  const scoreColor = score >= 80 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
    : score >= 60 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
    : 'text-red-600 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Briefcase className="h-5 w-5 text-deepsea-600 dark:text-deepsea-400" />
          Job Analyzer
        </h2>
        <p className="text-sm text-muted-foreground">Compare a job description against your resume — get a match score, gap analysis, and ATS keywords.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Input form */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <p className="text-sm font-semibold text-foreground">Job Details</p>

            <div>
              <label className="block mb-1 text-xs font-semibold text-muted-foreground">Resume to compare</label>
              <select value={resumeId} onChange={e => setResumeId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-deepsea-500/40 focus:border-deepsea-500">
                {resumes.map(r => <option key={r.id} value={r.id}>{r.name} (v{r.version})</option>)}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-xs font-semibold text-muted-foreground">Job Title *</label>
              <input type="text" placeholder="Frontend Engineer" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-deepsea-500/40 focus:border-deepsea-500" />
            </div>

            <div>
              <label className="block mb-1 text-xs font-semibold text-muted-foreground">Company (optional)</label>
              <input type="text" placeholder="Stripe" value={company} onChange={e => setCompany(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-deepsea-500/40 focus:border-deepsea-500" />
            </div>

            <div>
              <label className="block mb-1 text-xs font-semibold text-muted-foreground">Job Description *</label>
              <textarea
                placeholder="Paste the full job posting here…"
                value={jobDesc}
                onChange={e => setJobDesc(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-deepsea-500/40 focus:border-deepsea-500 resize-none h-48"
              />
            </div>

            <button onClick={analyze} disabled={analyzing}
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl bg-deepsea-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-deepsea-700 disabled:opacity-60 cursor-pointer">
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {analyzing ? 'Analyzing…' : 'Analyze Alignment'}
            </button>
          </div>
        </div>

        {/* Report */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">

            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Compatibility Report</span>
              {score > 0 && (
                <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${scoreColor}`}>
                  Match: {score}%
                </span>
              )}
            </div>

            <div className="min-h-[480px] p-5">
              {analyzing ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-deepsea-500" />
                  <p className="text-sm font-semibold text-foreground">Evaluating alignment…</p>
                  <p className="text-xs text-muted-foreground">Parsing job requirements and mapping your competencies.</p>
                </div>
              ) : report ? (
                <div className="space-y-1 text-sm">
                  {report.split('\n').map((line, i) => {
                    const t = line.trim();
                    if (!t || t.match(/^SCORE:/i)) return null;
                    if (t.startsWith('## ')) return (
                      <h3 key={i} className="mt-5 mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-deepsea-700 dark:text-deepsea-400 border-b border-border pb-1">
                        {t.slice(3)}
                      </h3>
                    );
                    if (t.startsWith('### ')) return <h4 key={i} className="mt-3 mb-1 text-sm font-semibold text-foreground">{t.slice(4)}</h4>;
                    if (t.startsWith('- ') || t.startsWith('* '))
                      return <li key={i} className="ml-4 list-disc text-muted-foreground text-sm">{t.slice(2)}</li>;
                    return <p key={i} className="text-muted-foreground text-sm">{t}</p>;
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border">
                    <Award className="h-8 w-8 text-border" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No report yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs">Fill in the job details and click "Analyze Alignment" to get a compatibility report.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
