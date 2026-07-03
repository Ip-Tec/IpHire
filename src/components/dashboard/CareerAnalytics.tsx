'use client';

import React, { useState, useEffect } from 'react';
import { dbManager, Application } from '@/lib/db';
import { BarChart2, TrendingUp, Compass, Award, CheckCircle, Plus, Sparkles, RefreshCw } from 'lucide-react';

export const CareerAnalytics: React.FC = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const list = await dbManager.getApplications();
    setApps(list);
    setLoading(false);
  }

  // Populate mock data into DB for demonstration
  const handleLoadMockData = async () => {
    const mockApps: Application[] = [
      { id: 'app-mock-1', title: 'Senior React Developer', company: 'Vercel', location: 'San Francisco, CA', salary: '$160,000', remote: 'remote', status: 'offer', notes: 'Offer received! 150k base + equity.' },
      { id: 'app-mock-2', title: 'Frontend Engineer', company: 'Stripe', location: 'Remote', salary: '$145,000', remote: 'remote', status: 'interview', notes: 'Technical round scheduled.' },
      { id: 'app-mock-3', title: 'Product Designer', company: 'Linear', location: 'New York, NY', salary: '$130,000', remote: 'hybrid', status: 'applied', notes: 'Submitted resume via referral.' },
      { id: 'app-mock-4', title: 'Software Engineer', company: 'Goldman Sachs', location: 'New York, NY', salary: '$110,000', remote: 'onsite', status: 'assessment', notes: 'Completed Hackerrank coding test.' },
      { id: 'app-mock-5', title: 'Growth Marketer', company: 'HubSpot', location: 'Boston, MA', salary: '$85,000', remote: 'remote', status: 'saved', notes: 'Bookmarked to apply next Tuesday.' },
      { id: 'app-mock-6', title: 'DevOps Specialist', company: 'Netflix', location: 'Los Gatos, CA', salary: '$180,000', remote: 'onsite', status: 'rejected', notes: 'Resume screen rejected.' },
      { id: 'app-mock-7', title: 'Fullstack Intern', company: 'Supabase', location: 'Remote', salary: '$60,000', remote: 'remote', status: 'accepted', notes: 'Signed!' },
      { id: 'app-mock-8', title: 'Technical Writer', company: 'GitHub', location: 'Remote', salary: '$100,000', remote: 'remote', status: 'saved', notes: 'Need to write custom cover letter.' }
    ];

    for (const app of mockApps) {
      await dbManager.saveApplication(app);
    }
    await loadData();
  };

  const handleClearMockData = async () => {
    if (!confirm("Clear all mock applications?")) return;
    const list = await dbManager.getApplications();
    const mockIds = list.filter(a => a.id.startsWith('app-mock-')).map(a => a.id);
    for (const id of mockIds) {
      await dbManager.deleteApplication(id);
    }
    await loadData();
  };

  // Pipeline math summary
  const getCount = (status: string) => apps.filter(a => a.status === status).length;
  
  const total = apps.length;
  const saved = getCount('saved');
  const applied = getCount('applied');
  const assessment = getCount('assessment');
  const interview = getCount('interview');
  const offer = getCount('offer');
  const accepted = getCount('accepted');
  const rejected = getCount('rejected');
  const archived = getCount('archived');

  // Funnel calculations
  const funnelSteps = [
    { label: 'Bookmarked', val: saved + applied + assessment + interview + offer + accepted },
    { label: 'Applied', val: applied + assessment + interview + offer + accepted },
    { label: 'Assessments', val: assessment + interview + offer + accepted },
    { label: 'Interviews', val: interview + offer + accepted },
    { label: 'Offers', val: offer + accepted }
  ];

  const maxFunnelVal = funnelSteps[0].val || 1;

  // Status distributions list
  const statusSummary = [
    { label: 'Saved', val: saved, color: 'bg-slate-400 dark:bg-slate-600' },
    { label: 'Applied', val: applied, color: 'bg-blue-500' },
    { label: 'Assessment', val: assessment, color: 'bg-purple-500' },
    { label: 'Interview', val: interview, color: 'bg-amber-500' },
    { label: 'Offer', val: offer, color: 'bg-emerald-500' },
    { label: 'Rejected', val: rejected, color: 'bg-red-500' },
    { label: 'Accepted', val: accepted, color: 'bg-deepsea-600 dark:bg-deepsea-400' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <BarChart2 className="h-5 w-5 text-deepsea-600 dark:text-deepsea-400" />
            Career Analytics Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Visual metrics mapping conversion pipelines, interview ratios, and upskilling milestones.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
            title="Refresh Charts"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {total === 0 ? (
            <button
              onClick={handleLoadMockData}
              className="flex items-center gap-1.5 rounded-lg bg-deepsea-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-deepsea-700 cursor-pointer shadow-sm active:scale-95 transition-all"
            >
              <Sparkles className="h-4 w-4" /> Load Mock Metrics
            </button>
          ) : (
            <button
              onClick={handleClearMockData}
              className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/40 cursor-pointer transition-all"
            >
              Clear Mock Metrics
            </button>
          )}
        </div>
      </div>

      {total === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-16 text-center space-y-3">
          <BarChart2 className="h-10 w-10 text-border" />
          <h3 className="text-sm font-bold text-foreground">Analytics Matrix Empty</h3>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            No pipeline items detected in your application tracker. Add applications in the tracker panel or click **Load Mock Metrics** to populate dashboard previews.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left Funnel + Metric summary */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Top overview statistics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Active</span>
                <p className="text-2xl font-extrabold text-foreground mt-1">{total}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center font-bold">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Interviews</span>
                <p className="text-2xl font-extrabold text-amber-500 mt-1">{interview}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Offers</span>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{offer + accepted}</p>
              </div>
            </div>

            {/* Custom Responsive SVG Funnel Chart */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><TrendingUp className="h-4 w-4 text-deepsea-600" /> Pipeline Conversion Funnel</h3>
              
              <div className="space-y-3.5 pt-2">
                {funnelSteps.map((step, idx) => {
                  const widthPct = Math.max(10, (step.val / maxFunnelVal) * 100);
                  
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-medium">
                        <span className="text-foreground">{step.label}</span>
                        <span className="text-muted-foreground font-bold">{step.val} <span className="text-[10px] font-normal">({Math.round((step.val / maxFunnelVal) * 100)}%)</span></span>
                      </div>
                      
                      {/* SVG Bar with deepsea gradient fill */}
                      <svg className="w-full h-5 rounded overflow-hidden" style={{ minWidth: '100px' }}>
                        <defs>
                          <linearGradient id="funnelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="var(--color-deepsea-500)" />
                            <stop offset="100%" stopColor="var(--color-deepsea-700)" />
                          </linearGradient>
                        </defs>
                        <rect
                          width={`${widthPct}%`}
                          height="100%"
                          fill="url(#funnelGradient)"
                          rx="4"
                          ry="4"
                          className="transition-all duration-500 ease-out"
                        />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Status Chart + Gaps log */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Status distribution bar chart */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><BarChart2 className="h-4 w-4 text-deepsea-600" /> Status Distribution</h3>

              <div className="space-y-3 pt-2">
                {statusSummary.map((item, idx) => {
                  const percentage = total > 0 ? (item.val / total) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="text-foreground">{item.label}</span>
                        <span className="text-muted-foreground font-bold">{item.val}</span>
                      </div>
                      
                      <div className="w-full bg-muted/40 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${item.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upskill & preparation log */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Compass className="h-4 w-4 text-deepsea-600" /> Upskill Readiness</h3>
              
              <div className="space-y-3 pt-1 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Master resume audit rating</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Resume score stands at stable **75/100**.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-border pt-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-deepsea-50 dark:bg-deepsea-950/20 text-deepsea-600 dark:text-deepsea-400">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Interview readiness level</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Prep drills completed: **3 technical, 2 behavioral**.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
