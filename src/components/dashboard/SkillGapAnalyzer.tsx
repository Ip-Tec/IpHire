'use client';

import React, { useState, useEffect } from 'react';
import { dbManager, Resume, Job } from '@/lib/db';
import { streamChat } from '@/lib/llm';
import { CheckSquare, AlertTriangle, Sparkles, Loader2, BookOpen, Clock, Award, Hammer, Lightbulb } from 'lucide-react';

export const SkillGapAnalyzer: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  
  // Selection states
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('custom');

  // Input states
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescText, setJobDescText] = useState('');

  // Report output states
  const [analyzing, setAnalyzing] = useState(false);
  const [matchScore, setMatchScore] = useState(0);
  const [reportText, setReportText] = useState('');

  useEffect(() => {
    async function loadData() {
      const resumeList = await dbManager.getResumes();
      setResumes(resumeList);
      if (resumeList.length > 0) setSelectedResumeId(resumeList[0].id);

      const jobsList = await dbManager.getSavedJobs();
      setSavedJobs(jobsList);
    }
    loadData();
  }, []);

  const handleJobSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedJobId(val);

    if (val === 'custom') {
      setJobTitle('');
      setCompany('');
      setJobDescText('');
    } else {
      const selected = savedJobs.find(j => j.id === val);
      if (selected) {
        setJobTitle(selected.title);
        setCompany(selected.company);
        setJobDescText(selected.description);
      }
    }
  };

  const handleRunAnalysis = async () => {
    if (!jobTitle.trim() || !jobDescText.trim()) {
      alert("Please enter a job title and description.");
      return;
    }

    setAnalyzing(true);
    setReportText('');
    setMatchScore(0);

    const activeResume = resumes.find(r => r.id === selectedResumeId);
    const resumeText = activeResume?.content || 'No resume content available.';
    const config = await dbManager.getSetting('llm_config', { provider: 'sandbox' });

    const prompt = `Perform a comprehensive career Skill Gap Analysis.
User Resume:
${resumeText}

Target Role: ${jobTitle} at ${company}
Target Job Description:
${jobDescText}

Analyze gaps.
First line: "SCORE: [0-100]" (calculated overall match compatibility percentage).
Then write detailed markdown blocks for:
## Missing Skills
## Missing Certifications & Experience
## Recommended Projects (Provide 2 concrete ideas with tech stack)
## Learning Roadmap (Provide a Week 1 to Week 4 study timeline)
## Portfolio Improvements
## Estimated Time (Write e.g. "TIME: 6 weeks" on its own line, followed by explanation)`;

    let accumulated = '';
    try {
      await streamChat(
        [{ role: 'user', content: prompt }],
        config as any,
        (chunk) => {
          accumulated += chunk;
          setReportText(accumulated);

          // Parse score dynamically
          const scoreMatch = accumulated.match(/SCORE:\s*(\d+)/i);
          if (scoreMatch) {
            setMatchScore(parseInt(scoreMatch[1]));
          }
        },
        () => {
          setAnalyzing(false);
        },
        (err) => {
          setReportText(`Analysis failed: ${err.message}`);
          setAnalyzing(false);
        }
      );
    } catch (err: any) {
      setReportText(`Error starting analysis: ${err.message}`);
      setAnalyzing(false);
    }
  };

  // Helper parser for formatting AI output sections
  const renderAnalysisSegments = () => {
    if (!reportText) return null;
    const lines = reportText.split('\n');
    let timeEstimation = '';
    let processedReport: React.ReactNode[] = [];

    // Filter out specific tokens like SCORE and TIME, formatting sections
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('SCORE:')) return;
      
      if (trimmed.startsWith('TIME:')) {
        timeEstimation = trimmed.slice(5).trim();
        return;
      }

      if (trimmed.startsWith('## ')) {
        processedReport.push(
          <h3 key={i} className="mt-6 mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-deepsea-700 dark:text-deepsea-400 border-b border-border pb-1">
            {trimmed.slice(3)}
          </h3>
        );
      } else if (trimmed.startsWith('### ')) {
        processedReport.push(
          <h4 key={i} className="mt-3.5 mb-1 text-sm font-semibold text-foreground">
            {trimmed.slice(4)}
          </h4>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        processedReport.push(
          <li key={i} className="ml-4 list-disc text-muted-foreground text-xs leading-relaxed mt-0.5">
            {trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')}
          </li>
        );
      } else if (trimmed) {
        processedReport.push(
          <p key={i} className="text-xs text-muted-foreground leading-relaxed mt-1">
            {trimmed.replace(/\*\*(.*?)\*\*/g, '$1')}
          </p>
        );
      }
    });

    return (
      <div className="space-y-4">
        {timeEstimation && (
          <div className="flex items-center gap-2 bg-deepsea-50 border border-deepsea-200 rounded-lg p-3 text-xs text-deepsea-900 dark:bg-deepsea-950/20 dark:border-deepsea-900/50 dark:text-deepsea-200">
            <Clock className="h-4.5 w-4.5 shrink-0" />
            <div>
              <span className="font-bold">Estimated Upskilling Time: </span>
              <span>{timeEstimation}</span>
            </div>
          </div>
        )}
        <div className="prose dark:prose-invert">{processedReport}</div>
      </div>
    );
  };

  const dialColor = matchScore >= 85 ? 'border-emerald-500 text-emerald-600' :
    matchScore >= 60 ? 'border-amber-500 text-amber-500' : 'border-red-500 text-red-500';

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <BookOpen className="h-5 w-5 text-deepsea-600 dark:text-deepsea-400" />
          Skill Gap Analyzer
        </h2>
        <p className="text-sm text-muted-foreground">
          Compare active resumes against target role descriptions to calculate match indexes, list keyword gaps, and map out roadmaps.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Blueprint Inputs form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3.5">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1"><Hammer className="h-4 w-4" /> Config Parameters</p>

            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">Active Resume Profile</label>
              <select
                value={selectedResumeId}
                onChange={e => setSelectedResumeId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
              >
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>{r.name} (v{r.version})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">Target Job Description Source</label>
              <select
                value={selectedJobId}
                onChange={handleJobSelectChange}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
              >
                <option value="custom">Paste Custom Description</option>
                {savedJobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title} @ {j.company}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">Job Title *</label>
              <input
                type="text"
                placeholder="e.g. Sales Manager, UI/UX Designer"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                disabled={selectedJobId !== 'custom'}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">Company</label>
              <input
                type="text"
                placeholder="e.g. HubSpot, Mayo Clinic"
                value={company}
                onChange={e => setCompany(e.target.value)}
                disabled={selectedJobId !== 'custom'}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">Full Job Requirements *</label>
              <textarea
                placeholder="Requirements text..."
                value={jobDescText}
                onChange={e => setJobDescText(e.target.value)}
                disabled={selectedJobId !== 'custom'}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500 h-40 resize-none disabled:opacity-60"
              />
            </div>

            <button
              onClick={handleRunAnalysis}
              disabled={analyzing}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-deepsea-600 py-2.5 text-xs font-semibold text-white hover:bg-deepsea-700 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {analyzing ? 'Evaluating Skill Matrix...' : 'Run Gap Analysis'}
            </button>
          </div>
        </div>

        {/* Right Report Panel */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden min-h-[480px]">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Analysis Output</span>
              {matchScore > 0 && (
                <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${
                  matchScore >= 80 ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-200' :
                  matchScore >= 60 ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-200' :
                  'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-200'
                }`}>
                  Match Score: {matchScore}%
                </span>
              )}
            </div>

            <div className="p-5 overflow-y-auto max-h-[500px]">
              {analyzing ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-2.5">
                  <Loader2 className="h-8 w-8 animate-spin text-deepsea-500" />
                  <p className="text-sm font-semibold text-foreground">Mapping Gap Matrix...</p>
                  <p className="text-xs text-muted-foreground max-w-xs">AI is cross-referencing experience listings, skill tags, and upskilling roadmaps.</p>
                </div>
              ) : reportText ? (
                renderAnalysisSegments()
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground">
                    <Award className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Audit Pending</p>
                  <p className="text-xs text-muted-foreground max-w-xs">Fill in your target role description, select a resume version, and trigger the analyzer.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
