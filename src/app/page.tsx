'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  ArrowRight, Sparkles, FileText, Briefcase, Key, CheckCircle2,
  MessageSquare, ChevronDown, Cpu, Shield, Zap
} from 'lucide-react';

const FEATURES = [
  {
    icon: Sparkles, label: 'AI Career Agent',
    desc: 'Persistent chat assistant with memory of your skills, goals, and target companies. Drafts materials, prepares interview answers, and builds roadmaps.',
    accent: 'from-deepsea-500 to-deepsea-700',
  },
  {
    icon: FileText, label: 'ATS Resume Studio',
    desc: 'Markdown editor with live ATS scoring. Pick from modern, technical, or minimal templates, then export to PDF or Markdown.',
    accent: 'from-emerald-500 to-emerald-700',
  },
  {
    icon: MessageSquare, label: 'Cover Letter Builder',
    desc: 'Generate tailored letters for any style — startup, enterprise, technical, or executive. Edit inline and export with one click.',
    accent: 'from-teal-500 to-teal-700',
  },
  {
    icon: Briefcase, label: 'Job Analyzer',
    desc: 'Paste any job posting. Get an instant match score, skill gap breakdown, and ATS keywords to add to your resume.',
    accent: 'from-cyan-600 to-cyan-800',
  },
  {
    icon: Key, label: 'Bring Your Own Key',
    desc: 'Connect OpenAI, Claude, Gemini, DeepSeek, OpenRouter, or run local models with Ollama. Your data never leaves your browser.',
    accent: 'from-deepsea-600 to-deepsea-900',
  },
];

const STEPS = [
  { n: '01', title: 'Connect your key', body: 'Plug in any OpenAI-compatible API key, or use Sandbox Mode for free simulated responses immediately.' },
  { n: '02', title: 'Build your materials', body: 'Upload or write your resume in Markdown. Run an ATS audit, pick a template, and generate tailored cover letters.' },
  { n: '03', title: 'Analyze & apply', body: 'Paste job descriptions to get alignment scores and missing skill lists. Use the AI coach to prepare for interviews.' },
];

const FAQS = [
  { q: 'How does BYOK work?', a: 'You enter your own API key from any supported provider. IpHire proxies requests through a secure server route and streams responses back. Your key is stored only in your browser\'s IndexedDB — never on our servers.' },
  { q: 'Is my data private?', a: 'Yes. IpHire AI is local-first. All resumes, cover letters, chats, and settings are stored in your browser\'s IndexedDB. Nothing is logged or stored on external servers.' },
  { q: 'What is Sandbox Mode?', a: 'Sandbox Mode runs without an API key. The app responds with simulated, context-aware career guidance so you can explore all features before committing to a provider.' },
  { q: 'Can I export my documents?', a: 'Yes. Resumes can be exported as Markdown files or printed to PDF directly from the browser. Cover letters have the same options.' },
  { q: 'What AI providers are supported?', a: 'OpenAI, Anthropic Claude, Google Gemini, DeepSeek, OpenRouter, and local models via Ollama or LM Studio.' },
];

export default function LandingPage() {
  const [mounted, setMounted]     = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">

      {/* ── Navigation ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="btn-primary flex items-center gap-2 rounded-xl bg-deepsea-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-deepsea-700"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-24 sm:pt-32 sm:pb-32">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-deepsea-500/8 to-transparent" />
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-deepsea-500/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl px-6 text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-deepsea-200 dark:border-deepsea-800/60 bg-deepsea-50/10 dark:bg-deepsea-950/30 px-4 py-1.5 text-xs font-semibold text-deepsea-700 dark:text-deepsea-300">
            <Cpu className="h-3.5 w-3.5" />
            Open source · Local-first · BYOK
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Your Personal{' '}
            <span className="text-gradient">AI Career Agent</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-xl leading-relaxed">
            Find jobs, tailor resumes, prepare for interviews, identify skill gaps, and manage your career all powered by AI. Works with any LLM provider.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="btn-primary flex items-center gap-2 rounded-xl bg-deepsea-600 px-8 py-3.5 text-base font-bold text-white shadow-lg hover:bg-deepsea-700"
            >
              Launch Career OS <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-8 py-3.5 text-base font-semibold text-foreground hover:bg-accent transition-all"
            >
              Explore features <ChevronDown className="h-4 w-4" />
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-deepsea-500" /> Local-first data</span>
            <span className="flex items-center gap-1.5"><Key className="h-4 w-4 text-deepsea-500" /> Your keys, your control</span>
            <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-deepsea-500" /> No subscriptions</span>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section id="features" className="border-t border-border bg-muted/20 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Everything you need to land the job</h2>
            <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">A ChatGPT-style workspace merged with specialized career tools — all in one place.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-deepsea-300 dark:hover:border-deepsea-700">
                  <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-base font-bold text-foreground group-hover:text-deepsea-600 dark:group-hover:text-deepsea-400 transition-colors">{f.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────── */}
      <section className="border-t border-border py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Get started in three steps</h2>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={i} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="absolute left-8 top-10 hidden h-px w-full bg-border sm:block" />
                )}
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-deepsea-600 text-white shadow-md">
                  <span className="text-lg font-extrabold">{s.n}</span>
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────── */}
      <section className="border-t border-border bg-muted/20 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Simple, honest pricing</h2>
            <p className="mt-3 text-base text-muted-foreground">Zero markups. You pay your LLM provider directly at raw API rates.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
            {/* Sandbox */}
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sandbox</p>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-4xl font-extrabold text-foreground">$0</span>
                <span className="mb-1 text-sm text-muted-foreground">/ month</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Explore all features with simulated AI responses. No account needed.</p>
              <ul className="mt-6 space-y-2.5">
                {['Simulated AI responses', 'Full Resume Studio', 'All 3 templates', 'Export to Markdown / PDF'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-deepsea-500" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/dashboard" className="mt-8 flex w-full items-center justify-center rounded-xl border border-border bg-background py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-all">
                Try Sandbox
              </Link>
            </div>

            {/* BYOK */}
            <div className="relative rounded-2xl border border-deepsea-500 bg-card p-8 shadow-md">
              <span className="absolute -top-3.5 right-5 rounded-full bg-deepsea-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                Recommended
              </span>
              <p className="text-xs font-bold uppercase tracking-widest text-deepsea-600 dark:text-deepsea-400">BYOK Unlimited</p>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-4xl font-extrabold text-foreground">$0</span>
                <span className="mb-1 text-sm text-muted-foreground">/ month</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Use your own API key. Pay providers directly at raw cost per token.</p>
              <ul className="mt-6 space-y-2.5">
                {['OpenAI, Claude, Gemini, DeepSeek', 'OpenRouter multi-model access', 'Local models (Ollama / LM Studio)', 'Live ATS scoring & cover letters', 'Full AI memory & context'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-deepsea-500" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/dashboard" className="btn-primary mt-8 flex w-full items-center justify-center rounded-xl bg-deepsea-600 py-2.5 text-sm font-semibold text-white hover:bg-deepsea-700 shadow-sm">
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section className="border-t border-border py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Frequently asked questions</h2>
          </div>

          <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden shadow-sm">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-card">
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <span className="text-sm font-semibold text-foreground pr-4">{faq.q}</span>
                  <span className={`shrink-0 text-lg font-light text-muted-foreground transition-transform duration-200 ${activeFaq === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {activeFaq === i && (
                  <div className="border-t border-border/50 bg-muted/20 px-6 py-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-gradient-to-br from-deepsea-700 to-deepsea-950 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Ready to upgrade your career?</h2>
          <p className="mt-4 text-base text-deepsea-200">Start free in Sandbox Mode — no account or API key required.</p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-deepsea-700 shadow-lg hover:bg-deepsea-50 transition-all"
          >
            Launch IpHire AI <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Logo />
          <p className="text-xs text-muted-foreground">© 2026 IpHire AI. Built with Next.js 16 · Local-first · Deepsea Green.</p>
          <div className="flex gap-4 text-xs font-semibold text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
