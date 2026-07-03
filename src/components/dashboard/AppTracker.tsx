'use client';

import React, { useState, useEffect } from 'react';
import { dbManager, Application, ApplicationStatus } from '@/lib/db';
import { LayoutGrid, Table, Calendar as CalendarIcon, MapPin, DollarSign, Bookmark, ArrowRight, Trash2, Plus, Edit2, CheckSquare } from 'lucide-react';

const COLUMNS: { id: ApplicationStatus; label: string; bg: string; text: string }[] = [
  { id: 'saved', label: 'Saved', bg: 'bg-slate-100 dark:bg-zinc-800/40', text: 'text-slate-700 dark:text-slate-300' },
  { id: 'applied', label: 'Applied', bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-700 dark:text-blue-300' },
  { id: 'assessment', label: 'Assessment', bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-700 dark:text-purple-300' },
  { id: 'interview', label: 'Interview', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-300' },
  { id: 'offer', label: 'Offer', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300' },
  { id: 'rejected', label: 'Rejected', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-300' },
  { id: 'accepted', label: 'Accepted', bg: 'bg-deepsea-50 dark:bg-deepsea-950/20', text: 'text-deepsea-700 dark:text-deepsea-300' },
  { id: 'archived', label: 'Archived', bg: 'bg-neutral-100 dark:bg-neutral-900/40', text: 'text-neutral-600' }
];

export const AppTracker: React.FC = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [view, setView] = useState<'kanban' | 'table' | 'calendar'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Detail overlay / Form state
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Application inputs
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [remote, setRemote] = useState('remote');
  const [status, setStatus] = useState<ApplicationStatus>('saved');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function loadApps() {
      const list = await dbManager.getApplications();
      setApps(list);
    }
    loadApps();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim()) return;

    const newApp: Application = {
      id: `app-${Date.now()}`,
      title: title.trim(),
      company: company.trim(),
      location: location.trim() || 'Remote',
      salary: salary.trim() || 'Negotiable',
      remote,
      status,
      dateApplied: status !== 'saved' ? Date.now() : undefined,
      notes: notes.trim()
    };

    await dbManager.saveApplication(newApp);
    const list = await dbManager.getApplications();
    setApps(list);
    setShowAddForm(false);
    resetForm();
  };

  const handleUpdateStatus = async (app: Application, nextStatus: ApplicationStatus) => {
    const updated = {
      ...app,
      status: nextStatus,
      dateApplied: (nextStatus !== 'saved' && !app.dateApplied) ? Date.now() : app.dateApplied
    };
    await dbManager.saveApplication(updated);
    const list = await dbManager.getApplications();
    setApps(list);
    if (activeApp?.id === app.id) {
      setActiveApp(updated);
    }
  };

  const handleSaveNotes = async () => {
    if (!activeApp) return;
    await dbManager.saveApplication(activeApp);
    const list = await dbManager.getApplications();
    setApps(list);
    alert("Application saved!");
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this application?")) return;
    
    await dbManager.deleteApplication(id);
    const list = await dbManager.getApplications();
    setApps(list);
    if (activeApp?.id === id) {
      setActiveApp(null);
    }
  };

  const resetForm = () => {
    setTitle('');
    setCompany('');
    setLocation('');
    setSalary('');
    setRemote('remote');
    setStatus('saved');
    setNotes('');
  };

  // Filtered applications based on search query
  const filteredApps = apps.filter(app => 
    app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <LayoutGrid className="h-5 w-5 text-deepsea-600 dark:text-deepsea-400" />
            Application Tracker
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitor status pipelines (Kanban board, table, calendar planner) and follow-up alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Views Toggles */}
          <div className="flex rounded-xl border border-border bg-muted/40 p-1">
            <button
              onClick={() => setView('kanban')}
              className={`rounded-lg p-1.5 transition-all cursor-pointer ${
                view === 'kanban' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Kanban Board"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('table')}
              className={`rounded-lg p-1.5 transition-all cursor-pointer ${
                view === 'table' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Table Spread"
            >
              <Table className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`rounded-lg p-1.5 transition-all cursor-pointer ${
                view === 'calendar' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Calendar grid"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-deepsea-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-deepsea-700 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Application
          </button>
        </div>
      </div>

      {/* Search Filter bar */}
      <div className="flex gap-2 max-w-sm">
        <input
          type="text"
          placeholder="Filter by role or company..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
        />
      </div>

      {/* Tracker View Panels */}
      <div>
        {view === 'kanban' && renderKanbanView()}
        {view === 'table' && renderTableView()}
        {view === 'calendar' && renderCalendarView()}
      </div>

      {/* Add Application Modal Overlay */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4 shadow-lg animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-foreground">Add New Job Application</h3>
            
            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-muted-foreground">Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Executive, Frontend Developer"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-muted-foreground">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stripe, Salesforce"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-muted-foreground">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. New York, Remote"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-muted-foreground">Salary</label>
                  <input
                    type="text"
                    placeholder="e.g. $90k - $120k"
                    value={salary}
                    onChange={e => setSalary(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-muted-foreground">Workplace Style</label>
                  <select
                    value={remote}
                    onChange={e => setRemote(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                  >
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-Site</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-muted-foreground">Pipeline Stage</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                  >
                    <option value="saved">Saved (Bookmarked)</option>
                    <option value="applied">Applied</option>
                    <option value="assessment">Assessment</option>
                    <option value="interview">Interview scheduled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-muted-foreground">Initial Notes / Comments</label>
                <textarea
                  placeholder="Notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500 h-16 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-deepsea-600 py-2 text-xs font-semibold text-white hover:bg-deepsea-700 cursor-pointer"
                >
                  Create Application
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 rounded-lg border border-border bg-card py-2 text-xs font-semibold text-foreground hover:bg-accent cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Slide-out Overlay */}
      {activeApp && (
        <div className="fixed inset-y-0 right-0 w-[380px] bg-card border-l border-border h-full flex flex-col z-40 shadow-xl animate-in slide-in-from-right duration-250 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">{activeApp.title}</h3>
              <p className="text-xs text-deepsea-600 font-semibold">{activeApp.company}</p>
            </div>
            <button
              onClick={() => setActiveApp(null)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer font-bold border border-border rounded px-2 py-0.5"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 text-xs">
            <div>
              <label className="block font-bold text-muted-foreground mb-1">Status</label>
              <select
                value={activeApp.status}
                onChange={e => handleUpdateStatus(activeApp, e.target.value as any)}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
              >
                {COLUMNS.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-muted-foreground mb-1">Location</label>
                <p className="p-2 border border-border/50 rounded-lg bg-muted/20 text-[11px] font-semibold text-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {activeApp.location}</p>
              </div>
              <div>
                <label className="block font-bold text-muted-foreground mb-1">Salary</label>
                <p className="p-2 border border-border/50 rounded-lg bg-muted/20 text-[11px] font-semibold text-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> {activeApp.salary}</p>
              </div>
            </div>

            <div>
              <label className="block font-bold text-muted-foreground mb-1">Notes & Follow-ups</label>
              <textarea
                value={activeApp.notes}
                onChange={e => setActiveApp({ ...activeApp, notes: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500 h-28 resize-none"
              />
            </div>

            {activeApp.jobDesc && (
              <div>
                <label className="block font-bold text-muted-foreground mb-1">Job Description</label>
                <div className="p-2.5 border border-border bg-muted/10 rounded-lg text-[10px] text-muted-foreground h-32 overflow-y-auto leading-relaxed">
                  {activeApp.jobDesc}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4 flex gap-2">
            <button
              onClick={handleSaveNotes}
              className="flex-1 rounded-lg bg-deepsea-600 py-2 text-xs font-semibold text-white hover:bg-deepsea-700 cursor-pointer"
            >
              Save Notes
            </button>
            <button
              onClick={() => handleDelete(activeApp.id)}
              className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-2 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/40 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  function renderKanbanView() {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 max-h-[580px] min-h-[440px] snap-x scrollbar-thin">
        {COLUMNS.map(col => {
          const colApps = filteredApps.filter(a => a.status === col.id);
          return (
            <div
              key={col.id}
              className={`w-72 shrink-0 rounded-xl p-3 border border-border/80 flex flex-col justify-between ${col.bg}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
                <span className="text-xs font-bold text-foreground tracking-wide flex items-center gap-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${
                    col.id === 'offer' ? 'bg-emerald-500' :
                    col.id === 'interview' ? 'bg-amber-500' :
                    col.id === 'applied' ? 'bg-blue-500' : 'bg-slate-400'
                  }`} />
                  {col.label}
                </span>
                <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                  {colApps.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[400px]">
                {colApps.map(app => (
                  <div
                    key={app.id}
                    onClick={() => setActiveApp(app)}
                    className="rounded-lg border border-border bg-card p-3 shadow-sm hover:border-deepsea-400 cursor-pointer transition-all duration-150 relative group"
                  >
                    <h4 className="text-xs font-bold text-foreground pr-4 truncate">{app.title}</h4>
                    <p className="text-[10px] text-deepsea-600 dark:text-deepsea-400 font-semibold truncate mt-0.5">{app.company}</p>
                    
                    <div className="flex items-center gap-x-2 text-[9px] text-muted-foreground mt-2">
                      <span className="flex items-center gap-0.5 truncate max-w-[100px]"><MapPin className="h-2.5 w-2.5 shrink-0" /> {app.location}</span>
                      <span>•</span>
                      <span className="capitalize">{app.remote}</span>
                    </div>

                    {/* Move columns triggers */}
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <select
                        onClick={e => e.stopPropagation()}
                        value={app.status}
                        onChange={e => handleUpdateStatus(app, e.target.value as any)}
                        className="text-[9px] border border-border rounded bg-muted text-muted-foreground focus:outline-none p-0.5"
                      >
                        {COLUMNS.map(c => <option key={c.id} value={c.id}>Move: {c.label}</option>)}
                      </select>
                    </div>
                  </div>
                ))}

                {colApps.length === 0 && (
                  <div className="py-12 text-center text-[10px] text-muted-foreground border border-dashed border-border/40 rounded-lg">
                    No applications
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderTableView() {
    return (
      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm overflow-x-auto max-h-[500px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border">
            <tr>
              <th className="p-3">Company</th>
              <th className="p-3">Role</th>
              <th className="p-3">Location</th>
              <th className="p-3">Salary</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredApps.map(app => {
              const col = COLUMNS.find(c => c.id === app.status);
              return (
                <tr
                  key={app.id}
                  onClick={() => setActiveApp(app)}
                  className="hover:bg-accent/30 cursor-pointer transition-colors"
                >
                  <td className="p-3 font-semibold text-foreground">{app.company}</td>
                  <td className="p-3 font-medium text-muted-foreground">{app.title}</td>
                  <td className="p-3 text-[11px] text-muted-foreground capitalize">{app.location} ({app.remote})</td>
                  <td className="p-3 text-[11px] text-muted-foreground">{app.salary}</td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      app.status === 'offer' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-200' :
                      app.status === 'interview' ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-200' :
                      app.status === 'applied' ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-200' :
                      'bg-slate-100 border-border text-slate-700 dark:bg-zinc-800/40 dark:text-slate-300'
                    }`}>
                      {col?.label}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={(e) => handleDelete(app.id, e)}
                      className="p-1 rounded hover:bg-red-50 hover:text-red-600 text-muted-foreground cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredApps.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No applications found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderCalendarView() {
    // Generate a simple mock calendar layout showing days of current month (July 2026)
    // 31 days starting on Wednesday (Index 3 of calendar row)
    const daysInMonth = 31;
    const startDayOffset = 3; // July 1, 2026 was Wednesday
    const totalSlots = 35; // 5 weeks grid

    const slots = Array.from({ length: totalSlots }, (_, i) => {
      const dayNumber = i - startDayOffset + 1;
      return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
    });

    // Mock link some application dates to calendar days
    // e.g. July 2 applied, July 15 interview
    return (
      <div className="border border-border bg-card rounded-xl shadow-sm p-4 max-w-xl mx-auto space-y-4">
        <div className="flex justify-between items-center border-b border-border pb-2.5">
          <h3 className="text-xs font-bold text-foreground">July 2026</h3>
          <span className="text-[10px] text-muted-foreground">Monthly Pipeline View</span>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-7 gap-1 border-t border-border/40 pt-2 text-[10px]">
          {slots.map((day, idx) => {
            const hasAppliedEvent = day === 2 || day === 10;
            const hasInterviewEvent = day === 15;
            
            return (
              <div
                key={idx}
                className={`min-h-[50px] p-1 border border-border/20 rounded flex flex-col justify-between ${
                  day ? 'bg-muted/10' : 'bg-transparent'
                }`}
              >
                <span className="text-muted-foreground font-semibold">{day || ''}</span>
                {day && (
                  <div className="space-y-0.5">
                    {hasAppliedEvent && (
                      <span className="block bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 rounded-[2px] px-1 text-[8px] font-bold truncate">
                        Applied
                      </span>
                    )}
                    {hasInterviewEvent && (
                      <span className="block bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 rounded-[2px] px-1 text-[8px] font-bold truncate">
                        Interview
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
};
