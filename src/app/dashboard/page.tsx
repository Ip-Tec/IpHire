'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
import { AutoPilot } from '@/components/dashboard/AutoPilot';
import { dbManager, Resume, UserProfile } from '@/lib/db';
import {
  LayoutDashboard, FileText, Briefcase, Settings,
  BookOpen, Mail, Search, LayoutGrid, Calendar,
  MousePointer, Cpu, Globe, BarChart2, User, MessageSquare,
  Bell, X, LogOut, Zap, Award, CheckCircle2, TrendingUp, Sparkles
} from 'lucide-react';

type ActivePage = 'dashboard' | 'autopilot' | 'resume' | 'interviews' | 'tools' | 'settings';

const NAV_LINKS = [
  { id: 'dashboard',  label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'autopilot',  label: 'Auto-Pilot & Jobs',  icon: Zap },
  { id: 'resume',     label: 'Resume & Profile',   icon: FileText },
  { id: 'interviews', label: 'Interview Prep',     icon: MessageSquare },
  { id: 'tools',      label: 'AI Tools',           icon: Cpu },
  { id: 'settings',   label: 'BYOK Settings',      icon: Settings },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activePage, setActivePage]   = useState<ActivePage>('dashboard');
  const [activeResume, setActiveResume] = useState<Resume | null>(null);

  // Sub-tabs states
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'analytics'>('overview');
  const [jobsTab, setJobsTab] = useState<'autopilot' | 'tracker' | 'discovery' | 'analyzer'>('autopilot');
  const [resumeTab, setResumeTab] = useState<'resume' | 'cover' | 'profile' | 'portfolio'>('resume');
  const [interviewTab, setInterviewTab] = useState<'coach' | 'scheduler'>('coach');
  const [toolsTab, setToolsTab] = useState<'gap' | 'autofill' | 'workflows'>('gap');
  
  // Dynamic profile metadata — prefer session data, fallback to local profile
  const [profileName, setProfileName] = useState('Loading...');
  const [profileInitials, setProfileInitials] = useState('?');

  // Client-side auth guard
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  // Notification state
  type Notif = { id: string; type: 'job' | 'reminder' | 'system'; title: string; body: string; time: string; read: boolean };
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchProfile = () => {
    // Use session name first, then fall back to stored profile
    const sessionName = session?.user?.name;
    dbManager.getSetting<Partial<UserProfile>>('user_profile', { name: sessionName || 'User' }).then(prof => {
      const name = prof.name || sessionName || 'User';
      setProfileName(name);
      const initials = name
        .split(' ')
        .map((p: string) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      setProfileInitials(initials || 'U');
    });
  };

  useEffect(() => {
    fetchProfile();
    // Auto-sync on load to pull any remote cloud settings/resumes from TiDB
    dbManager.syncCloud().then((syncRes) => {
      if (syncRes.success) {
        fetchProfile();
      }
    }).catch(err => console.error("Initial load sync failed:", err));
    
    // Listen for custom profile update events
    if (typeof window !== 'undefined') {
      window.addEventListener('profile_updated', fetchProfile);

      // Listen for AI navigation commands from GlobalChat (with backward-compatible mapping)
      const handleNavigateTo = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        const page = detail?.page;
        if (!page) return;

        if (page === 'dashboard') {
          setActivePage('dashboard');
          setDashboardTab('overview');
        } else if (page === 'analytics') {
          setActivePage('dashboard');
          setDashboardTab('analytics');
        } else if (page === 'profile') {
          setActivePage('resume');
          setResumeTab('profile');
        } else if (page === 'resume') {
          setActivePage('resume');
          setResumeTab('resume');
        } else if (page === 'cover') {
          setActivePage('resume');
          setResumeTab('cover');
        } else if (page === 'portfolio') {
          setActivePage('resume');
          setResumeTab('portfolio');
        } else if (page === 'autopilot') {
          setActivePage('autopilot');
          setJobsTab('autopilot');
        } else if (page === 'tracker') {
          setActivePage('autopilot');
          setJobsTab('tracker');
        } else if (page === 'discovery') {
          setActivePage('autopilot');
          setJobsTab('discovery');
        } else if (page === 'analyzer') {
          setActivePage('autopilot');
          setJobsTab('analyzer');
        } else if (page === 'coach') {
          setActivePage('interviews');
          setInterviewTab('coach');
        } else if (page === 'scheduler') {
          setActivePage('interviews');
          setInterviewTab('scheduler');
        } else if (page === 'gap') {
          setActivePage('tools');
          setToolsTab('gap');
        } else if (page === 'autofill') {
          setActivePage('tools');
          setToolsTab('autofill');
        } else if (page === 'workflows') {
          setActivePage('tools');
          setToolsTab('workflows');
        } else if (page === 'settings') {
          setActivePage('settings');
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
    if (status === 'loading' || status === 'unauthenticated') {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-deepsea-500 border-t-transparent" />
            <p className="text-sm">Loading your workspace...</p>
          </div>
        </div>
      );
    }
    switch (activePage) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="flex border-b border-border pb-2 gap-4">
              <button
                onClick={() => setDashboardTab('overview')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${dashboardTab === 'overview' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setDashboardTab('analytics')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${dashboardTab === 'analytics' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Analytics
              </button>
            </div>
            <div className="pt-4">
              {dashboardTab === 'overview' ? (
                <DashboardOverview resumeScore={activeResume?.score ?? 75} resumeName={activeResume?.name ?? 'Master Resume'} />
              ) : (
                <CareerAnalytics />
              )}
            </div>
          </div>
        );
      case 'autopilot':
        return (
          <div className="space-y-6">
            <div className="flex border-b border-border pb-2 gap-4">
              <button
                onClick={() => setJobsTab('autopilot')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${jobsTab === 'autopilot' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Auto-Pilot Agent
              </button>
              <button
                onClick={() => setJobsTab('tracker')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${jobsTab === 'tracker' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Application Tracker
              </button>
              <button
                onClick={() => setJobsTab('discovery')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${jobsTab === 'discovery' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Job Search & Discovery
              </button>
              <button
                onClick={() => setJobsTab('analyzer')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${jobsTab === 'analyzer' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Job Description Analyzer
              </button>
            </div>
            <div className="pt-4">
              {jobsTab === 'autopilot' && <AutoPilot />}
              {jobsTab === 'tracker' && <AppTracker />}
              {jobsTab === 'discovery' && <JobDiscovery />}
              {jobsTab === 'analyzer' && <JobAnalyzer />}
            </div>
          </div>
        );
      case 'resume':
        return (
          <div className="space-y-6">
            <div className="flex border-b border-border pb-2 gap-4">
              <button
                onClick={() => setResumeTab('resume')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${resumeTab === 'resume' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Resume Studio
              </button>
              <button
                onClick={() => setResumeTab('cover')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${resumeTab === 'cover' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Cover Letters
              </button>
              <button
                onClick={() => setResumeTab('profile')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${resumeTab === 'profile' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                My Profile Details
              </button>
              <button
                onClick={() => setResumeTab('portfolio')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${resumeTab === 'portfolio' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                CV Web Builder
              </button>
            </div>
            <div className="pt-4">
              {resumeTab === 'resume' && <ResumeStudio />}
              {resumeTab === 'cover' && <CoverLetterStudio />}
              {resumeTab === 'profile' && <UserProfileStudio />}
              {resumeTab === 'portfolio' && <PortfolioBuilder />}
            </div>
          </div>
        );
      case 'interviews':
        return (
          <div className="space-y-6">
            <div className="flex border-b border-border pb-2 gap-4">
              <button
                onClick={() => setInterviewTab('coach')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${interviewTab === 'coach' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                AI Interview Coach
              </button>
              <button
                onClick={() => setInterviewTab('scheduler')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${interviewTab === 'scheduler' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Scheduler
              </button>
            </div>
            <div className="pt-4">
              {interviewTab === 'coach' && <InterviewCoach />}
              {interviewTab === 'scheduler' && <InterviewScheduler />}
            </div>
          </div>
        );
      case 'tools':
        return (
          <div className="space-y-6">
            <div className="flex border-b border-border pb-2 gap-4">
              <button
                onClick={() => setToolsTab('gap')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${toolsTab === 'gap' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Skill Gap Analyzer
              </button>
              <button
                onClick={() => setToolsTab('autofill')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${toolsTab === 'autofill' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Auto-Fill Setup
              </button>
              <button
                onClick={() => setToolsTab('workflows')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${toolsTab === 'workflows' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Agent Workflows
              </button>
            </div>
            <div className="pt-4">
              {toolsTab === 'gap' && <SkillGapAnalyzer />}
              {toolsTab === 'autofill' && <AutoFillStudio />}
              {toolsTab === 'workflows' && <AgentWorkflows />}
            </div>
          </div>
        );
      case 'settings':
        return <SettingsBYOK />;
      default:
        return (
          <div className="space-y-6">
            <div className="flex border-b border-border pb-2 gap-4">
              <button
                onClick={() => setDashboardTab('overview')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${dashboardTab === 'overview' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setDashboardTab('analytics')}
                className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[10px] ${dashboardTab === 'analytics' ? 'border-deepsea-600 text-deepsea-600 dark:text-deepsea-400 dark:border-deepsea-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Analytics
              </button>
            </div>
            <div className="pt-4">
              <DashboardOverview resumeScore={activeResume?.score ?? 75} resumeName={activeResume?.name ?? 'Master Resume'} />
            </div>
          </div>
        );
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

        {/* User + Theme + Sign Out */}
        <div className="border-t border-border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-deepsea-500/15 text-xs font-bold text-deepsea-700 dark:text-deepsea-300">
                {profileInitials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">{profileName}</p>
                <p className="truncate text-[10px] text-muted-foreground">{session?.user?.email ?? 'Signed in'}</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
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
