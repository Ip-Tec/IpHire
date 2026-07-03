'use client';

import React, { useState, useEffect } from 'react';
import { dbManager, Resume } from '@/lib/db';
import { streamChat } from '@/lib/llm';
import { Cpu, Terminal, Copy, Check, Play, Loader2, Sparkles, AlertCircle } from 'lucide-react';

type WorkflowType = 'linkedin' | 'cold_email' | 'followup';

interface WorkflowTemplate {
  id: WorkflowType;
  name: string;
  desc: string;
  steps: string[];
}

const TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn Outreach Agent',
    desc: 'Drafts high-conversion connection messages under 300 characters to hiring managers or teams.',
    steps: [
      'Initializing LinkedIn Outreach Agent...',
      'Reading active resume profile details...',
      'Extracting top core competencies...',
      'Mapping mutual industry skills to target company profile...',
      'Synthesizing pitch under 300 character constraint...',
      'Agent complete. Streaming connection message...'
    ]
  },
  {
    id: 'cold_email',
    name: 'Cold Referral Email Agent',
    desc: 'Generates structured cold introduction and referral request emails for target roles.',
    steps: [
      'Initializing Cold Referral Email Agent...',
      'Loading personal experience list...',
      'Matching experience highlights to job description keywords...',
      'Writing compelling subject line variations...',
      'Drafting body paragraphs using the PAR framework (Problem, Action, Result)...',
      'Agent complete. Streaming email body...'
    ]
  },
  {
    id: 'followup',
    name: 'Application Check-In Agent',
    desc: 'Drafts polite, professional check-in follow-up emails for applications awaiting response.',
    steps: [
      'Initializing Application Check-In Agent...',
      'Querying Application Tracker pipeline...',
      'Identifying target role context and submission dates...',
      'Formulating polite inquiry on hiring timelines...',
      'Mapping follow-up check-in keywords...',
      'Agent complete. Streaming check-in draft...'
    ]
  }
];

export const AgentWorkflows: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  
  // Workflow config
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType>('linkedin');
  const [jobTitle, setJobTitle] = useState('Senior React Developer');
  const [company, setCompany] = useState('Vercel');
  const [contactName, setContactName] = useState('Sarah Jenkins (Hiring Manager)');
  const [tone, setTone] = useState('Warm & Professional');

  // Execution states
  const [running, setRunning] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [activeLogIndex, setActiveLogIndex] = useState(0);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadResumes() {
      const list = await dbManager.getResumes();
      setResumes(list);
      if (list.length > 0) setSelectedResumeId(list[0].id);
    }
    loadResumes();
  }, []);

  const handleRunWorkflow = async () => {
    setRunning(true);
    setTerminalLogs([]);
    setOutput('');
    setCopied(false);

    const template = TEMPLATES.find(t => t.id === selectedWorkflow);
    if (!template) return;

    // 1. Simulate agent step logging in a terminal UI
    for (let i = 0; i < template.steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600)); // Delay between logs
      setTerminalLogs(prev => [...prev, `[AGENT] ${template.steps[i]}`]);
    }

    // 2. Perform the actual AI stream completion
    const config = await dbManager.getSetting('llm_config', { provider: 'sandbox' });
    const resume = resumes.find(r => r.id === selectedResumeId);
    const resumeText = resume?.content || 'No resume selected';

    let prompt = '';
    if (selectedWorkflow === 'linkedin') {
      prompt = `Draft a high-conversion LinkedIn connection request message to ${contactName || 'a recruiter'} at ${company} for a ${jobTitle} position.
Tone: ${tone}.
Resume context:
${resumeText}
Constraint: Must be STRICTLY under 300 characters. Do not include subject lines or greetings like "Subject:" or salutations that exceed the limit. Just return the message itself.`;
    } else if (selectedWorkflow === 'cold_email') {
      prompt = `Write a cold email to ${contactName || 'a Hiring Manager'} at ${company} pitch for a ${jobTitle} position.
Tone: ${tone}.
Resume context:
${resumeText}
Structure: Subject line, Warm greeting, Hook showing interest in ${company}, 2 sentence value proposition, Call to action asking for a brief call, Professional closing.`;
    } else {
      prompt = `Write a follow-up check-in email to ${contactName || 'the recruitment team'} at ${company} regarding my application for the ${jobTitle} role.
Tone: ${tone}.
Keep it concise, polite, and express continued enthusiasm for the team.`;
    }

    let accumulated = '';
    try {
      await streamChat(
        [{ role: 'user', content: prompt }],
        config as any,
        (chunk) => {
          accumulated += chunk;
          setOutput(accumulated);
        },
        () => {
          setRunning(false);
        },
        (err) => {
          setOutput(`Workflow execution failed: ${err.message}`);
          setRunning(false);
        }
      );
    } catch (e: any) {
      setOutput(`Error starting workflow agent: ${e.message}`);
      setRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Cpu className="h-5 w-5 text-deepsea-600 dark:text-deepsea-400" />
          AI Agent Workflows
        </h2>
        <p className="text-sm text-muted-foreground">
          Trigger multi-step background agents. Draft outbound pitches, follow-ups, and review pipeline items.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left Config Panel */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Workflow template picker */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3.5">
            <p className="text-sm font-semibold text-foreground">1. Select Agent Template</p>
            <div className="space-y-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedWorkflow(t.id)}
                  className={`w-full rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                    selectedWorkflow === t.id
                      ? 'border-deepsea-500 bg-deepsea-50 dark:bg-deepsea-950/20'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <p className={`text-xs font-bold ${
                    selectedWorkflow === t.id ? 'text-deepsea-700 dark:text-deepsea-300' : 'text-foreground'
                  }`}>{t.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Variables form */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3.5">
            <p className="text-sm font-semibold text-foreground">2. Configuration Parameters</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-muted-foreground">Resume profile context</label>
                <select
                  value={selectedResumeId}
                  onChange={e => setSelectedResumeId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                >
                  {resumes.map(r => (
                    <option key={r.id} value={r.id}>{r.name} (v{r.version})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-muted-foreground">Target Role Title *</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-muted-foreground">Target Company *</label>
                <input
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-muted-foreground">Contact Name (optional)</label>
                <input
                  type="text"
                  placeholder="Hiring Manager, Recruiter"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-muted-foreground">Outreach Tone</label>
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                >
                  <option value="Warm & Professional">Warm & Professional</option>
                  <option value="Technical & Precise">Technical & Precise</option>
                  <option value="Assertive & Direct">Assertive & Direct</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRunWorkflow}
              disabled={running}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-deepsea-600 py-2.5 text-xs font-semibold text-white hover:bg-deepsea-700 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? 'Agent running...' : 'Run Outreach Agent'}
            </button>
          </div>

        </div>

        {/* Right Terminal + Copy Output */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Retro Agent Terminal Console */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-md font-mono text-[11px] text-zinc-400 space-y-2 h-44 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1.5"><Terminal className="h-3.5 w-3.5" /> AGENT LOG CONSOLE</span>
              <span>online</span>
            </div>
            
            {terminalLogs.map((log, idx) => (
              <p key={idx} className="animate-in fade-in slide-in-from-left-1 duration-150">
                {log}
              </p>
            ))}

            {running && terminalLogs.length === TEMPLATES.find(t => t.id === selectedWorkflow)?.steps.length && (
              <p className="text-deepsea-400 animate-pulse flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                [LLM] Streaming completion output...
              </p>
            )}

            {terminalLogs.length === 0 && (
              <p className="text-zinc-600 italic">Terminal idle. Click "Run Outreach Agent" to launch thread traces.</p>
            )}
          </div>

          {/* Final Outreach Output Panel */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col min-h-[280px]">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Generated Pitch Output</span>
              {output && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded border border-border bg-card px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

            <div className="p-5 flex-grow">
              {output ? (
                <textarea
                  value={output}
                  readOnly
                  className="w-full h-full min-h-[200px] bg-transparent resize-none focus:outline-none text-xs text-foreground leading-relaxed"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-2.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border">
                    <Sparkles className="h-5 w-5 text-border" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Waiting for Agent Execution</p>
                  <p className="text-xs max-w-xs mt-0.5 leading-relaxed">Pitches, connection invites, and check-ins will render here once the agent workflows finish compiling logs.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
