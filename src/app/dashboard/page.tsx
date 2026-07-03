'use client';

import React, { useState, useEffect } from 'react';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { GlobalChat } from '@/components/chat/GlobalChat';
import { ResumeStudio } from '@/components/dashboard/ResumeStudio';
import { CoverLetterStudio } from '@/components/dashboard/CoverLetterStudio';
import { JobAnalyzer } from '@/components/dashboard/JobAnalyzer';
import { SettingsBYOK } from '@/components/dashboard/SettingsBYOK';
import { JobDiscovery } from '@/components/dashboard/JobDiscovery';
import { AppTracker } from '@/components/dashboard/AppTracker';
import { SkillGapAnalyzer } from '@/components/dashboard/SkillGapAnalyzer';
import { InterviewCoach } from '@/components/dashboard/InterviewCoach';
import { InterviewScheduler } from '@/components/dashboard/InterviewScheduler';
import { AutoFillStudio } from '@/components/dashboard/AutoFillStudio';
import { AgentWorkflows } from '@/components/dashboard/AgentWorkflows';
import { PortfolioBuilder } from '@/components/dashboard/PortfolioBuilder';
import { CareerAnalytics } from '@/components/dashboard/CareerAnalytics';
import { UserProfileStudio } from '@/components/dashboard/UserProfileStudio';
import { dbManager, Resume, UserProfile } from '@/lib/db';
import {
  LayoutDashboard, FileText, Briefcase, Settings,
  Award, CheckCircle2, TrendingUp, Sparkles, BookOpen,
  Mail, Search, LayoutGrid, Calendar,
  MousePointer, Cpu, Globe, BarChart2, User, MessageSquare,
  Bell, X
} from 'lucide-react';

type ActivePage = 'dashboard' | 'profile' | 'resume' | 'cover' | 'analyzer' | 'discovery' | 'tracker' | 'gap' | 'coach' | 'scheduler' | 'autofill' | 'workflows' | 'portfolio' | 'analytics' | 'settings';

const NAV_LINKS = [
  { id: 'dashboard', label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'profile',   label: 'My Profile',      icon: User },
  { id: 'resume',    label: 'Resume Studio',   icon: FileText },
  { id: 'cover',     label: 'Cover Letters',   icon: Mail },
  { id: 'analyzer',  label: 'Job Analyzer',    icon: Briefcase },
  { id: 'discovery', label: 'Job Discovery',   icon: Search },
  { id: 'tracker',   label: 'App Tracker',     icon: LayoutGrid },
  { id: 'gap',       label: 'Skill Gap',       icon: BookOpen },
  { id: 'coach',     label: 'Interview Coach', icon: MessageSquare },
  { id: 'scheduler', label: 'Scheduler',       icon: Calendar },
  { id: 'autofill',  label: 'Auto-Fill Tools', icon: MousePointer },
  { id: 'workflows', label: 'AI Workflows',    icon: Cpu },
  { id: 'portfolio', label: 'Web Builder',     icon: Globe },
  { id: 'analytics', label: 'Analytics',       icon: BarChart2 },
  { id: 'settings',  label: 'BYOK Settings',   icon: Settings },
];

export default function DashboardPage() {
  const [activePage, setActivePage]   = useState<ActivePage>('dashboard');
  const [activeResume, setActiveResume] = useState<Resume | null>(null);
  
  // Dynamic profile metadata
  const [profileName, setProfileName] = useState('Alex Rivera');
  const [profileInitials, setProfileInitials] = useState('AR');

  // Notification state
  type Notif = { id: string; type: 'job' | 'reminder' | 'system'; title: string; body: string; time: string; read: boolean };
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchProfile = () => {
    dbManager.getSetting<Partial<UserProfile>>('user_profile', { name: 'Alex Rivera' }).then(prof => {
      const name = prof.name || 'Alex Rivera';
      setProfileName(name);
      
      const initials = name
        .split(' ')
        .map(p => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      setProfileInitials(initials || 'AR');
    });
  };

  useEffect(() => {
    fetchProfile();
    
    // Listen for custom profile update events
    if (typeof window !== 'undefined') {
      window.addEventListener('profile_updated', fetchProfile);

      // Listen for AI navigation commands from GlobalChat
      const handleNavigateTo = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail?.page) {
          setActivePage(detail.page as ActivePage);
        }
      };
      window.addEventListener('navigate_to', handleNavigateTo);

      return () => {
        window.removeEventListener('profile_updated', fetchProfile);
        window.removeEventListener('navigate_to', handleNavigateTo);
      };
    }
  }, []);

  // Notify GlobalChat of current page context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('page_changed', { detail: { page: activePage } }));
    }
  }, [activePage]);

  useEffect(() => {
    dbManager.getResumes().then(list => {
      if (list.length > 0) setActiveResume(list[0]);
    });
  }, [activePage]);

  // Seed demo notifications once
  useEffect(() => {
    setNotifications([
      { id: 'n1', type: 'job',      title: '12 new jobs matched',   body: 'Frontend roles on Jooble match your profile keywords.', time: 'Just now', read: false },
      { id: 'n2', type: 'reminder', title: 'Interview in 2 hours',  body: 'Mock session: Senior Engineer at Acme Corp.', time: '1h ago', read: false },
      { id: 'n3', type: 'system',   title: 'ATS Score improved',   body: 'Your resume score rose to 82/100 after last edit.', time: '3h ago', read: true },
      { id: 'n4', type: 'job',      title: 'Community clip added', body: 'A user clipped a Staff Engineer role at Stripe.', time: 'Yesterday', read: true },
    ]);
  }, []);

  const renderPanel = () => {
    switch (activePage) {
      case 'profile':   return <UserProfileStudio />;
      case 'resume':    return <ResumeStudio />;
      case 'cover':     return <CoverLetterStudio />;
      case 'analyzer':  return <JobAnalyzer />;
      case 'discovery': return <JobDiscovery />;
      case 'tracker':   return <AppTracker />;
      case 'gap':       return <SkillGapAnalyzer />;
      case 'coach':     return <InterviewCoach />;
      case 'scheduler': return <InterviewScheduler />;
      case 'autofill':  return <AutoFillStudio />;
      case 'workflows': return <AgentWorkflows />;
      case 'portfolio': return <PortfolioBuilder />;
      case 'analytics': return <CareerAnalytics />;
      case 'settings':  return <SettingsBYOK />;
      default:          return <DashboardOverview resumeScore={activeResume?.score ?? 75} resumeName={activeResume?.name ?? 'Master Resume'} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="no-print flex w-56 shrink-0 flex-col border-r border-border bg-card">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border px-4">
          <Logo />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {NAV_LINKS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActivePage(id as ActivePage)}
              className={[
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer',
                activePage === id
                  ? 'bg-deepsea-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              ].join(' ')}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* User + Theme */}
        <div className="border-t border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-deepsea-500/15 text-xs font-bold text-deepsea-700 dark:text-deepsea-300">
                {profileInitials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">{profileName}</p>
                <p className="text-[10px] text-muted-foreground">Active User</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────────── */}
      <main className="flex flex-1 overflow-hidden">

        {/* Workspace panel */}
        <section className="flex flex-1 flex-col overflow-hidden">
          {/* Topbar */}
          <header className="no-print flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-sm">
            <div>
              <h1 className="text-base font-semibold text-foreground">
                {NAV_LINKS.find(n => n.id === activePage)?.label ?? 'Dashboard'}
              </h1>
            </div>
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifs(v => !v); setNotifications(ns => ns.map(n => ({ ...n, read: true }))); }}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-accent transition-all cursor-pointer"
                title="Notifications"
              >
                <Bell className="h-4 w-4 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-deepsea-600 text-[9px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                    <span className="text-xs font-bold text-foreground">Notifications</span>
                    <button onClick={() => setShowNotifs(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">No notifications</p>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 text-xs hover:bg-accent transition-colors ${ !n.read ? 'bg-deepsea-500/5' : '' }`}>
                        <div className="flex items-start gap-2">
                          <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${ n.type === 'job' ? 'bg-deepsea-500' : n.type === 'reminder' ? 'bg-amber-500' : 'bg-emerald-500' }`} />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{n.title}</p>
                            <p className="text-muted-foreground leading-relaxed mt-0.5">{n.body}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-border text-center">
                    <button onClick={() => setNotifications([])} className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer">Clear all</button>
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {renderPanel()}
            </div>
          </div>
        </section>
      </main>

      {/* Global AI Agent */}
      <GlobalChat />
    </div>
  );
}

/* ─── Dashboard Overview Component ───────────────────────────────────── */
function DashboardOverview({ resumeScore, resumeName }: { resumeScore: number; resumeName: string }) {
  const metrics = [
    { label: 'Career Index',        value: '78', unit: '/100', sub: 'Top 15% of candidates',      icon: TrendingUp,   color: 'text-deepsea-600 dark:text-deepsea-400', bg: 'bg-deepsea-500/10' },
    { label: 'Resume Score',        value: String(resumeScore), unit: '/100', sub: resumeName,    icon: Award,        color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Interview Readiness', value: '85', unit: '%',    sub: 'Technical metrics aligned',   icon: CheckCircle2, color: 'text-amber-600',   bg: 'bg-amber-500/10'   },
  ];

  const priorities = [
    { num: 1, title: 'Inject missing keywords', body: 'Your resume is missing Next.js 16 App Router patterns. Run the Job Analyzer to extract target keywords.' },
    { num: 2, title: 'Refine your cover letter tone', body: 'Try generating a Startup-style cover letter for high-growth tech positions in the Cover Letter Studio.' },
    { num: 3, title: 'Practice mock interviews', body: 'Use the AI Career Agent on the right to run through technical interview questions for your target roles.' },
  ];

  const skills = [
    { name: 'Advanced React Hooks & Concurrent Rendering', type: 'Free · Intermediate' },
    { name: 'Tailwind CSS v4 Engine Fundamentals',          type: 'Free · Beginner' },
    { name: 'Full Stack Architecture: Prisma & SQLite',     type: 'Paid · Intermediate' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <Sparkles className="h-6 w-6 text-deepsea-600 dark:text-deepsea-400" />
          Career Overview
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor your resume quality, ATS compatibility, and get personalized recommendations.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.label}</p>
                <p className="mt-1 text-3xl font-extrabold text-foreground">
                  {m.value}<span className="text-sm font-normal text-muted-foreground ml-0.5">{m.unit}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-[140px]">{m.sub}</p>
              </div>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${m.bg}`}>
                <Icon className={`h-6 w-6 ${m.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Priorities */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-deepsea-600 dark:text-deepsea-400" />
            Career Priorities
          </h3>
          <ol className="space-y-4">
            {priorities.map((p) => (
              <li key={p.num} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-deepsea-600 text-[11px] font-bold text-white">
                  {p.num}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Upskilling */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookOpen className="h-4 w-4 text-deepsea-600 dark:text-deepsea-400" />
            Recommended Learning Paths
          </h3>
          <div className="space-y-3">
            {skills.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.type}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-deepsea-600 dark:text-deepsea-400">Start →</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
