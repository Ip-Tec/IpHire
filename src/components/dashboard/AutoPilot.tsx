"use client";

import React, { useState, useEffect } from "react";
import { useAutoPilot } from "@/lib/useAutoPilot";
import {
  Play, Pause, RefreshCw, Check, X, AlertTriangle, Info,
  Eye, FileText, Calendar, DollarSign, MapPin, Briefcase, Zap, HelpCircle
} from "lucide-react";

interface AutopilotJob {
  id: string;
  runId: string;
  jobId: string;
  title: string;
  company: string;
  score: number;
  matchReasoning: string;
  status: "pending_review" | "applied" | "skipped";
  formFields: any;
  location: string;
  salary: string;
  remote: string;
  jobType: string;
  description: string;
  techStack: string[];
  url?: string;
}

interface AutopilotRun {
  id: string;
  status: "running" | "completed" | "failed";
  jobsFound: number;
  jobsApplied: number;
  logs: string[];
  createdAt: number;
}

export function AutoPilot() {
  const { isAutoPilotActive, toggleAutoPilot, lastAction } = useAutoPilot();
  const [runs, setRuns] = useState<AutopilotRun[]>([]);
  const [jobs, setJobs] = useState<AutopilotJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningSearch, setRunningSearch] = useState(false);
  const [selectedJob, setSelectedJob] = useState<AutopilotJob | null>(null);
  const [draftingFields, setDraftingFields] = useState(false);
  const [submittingApply, setSubmittingApply] = useState(false);
  
  // Custom edited form fields in preview modal
  const [editedFields, setEditedFields] = useState<any>({});

  const fetchData = async () => {
    try {
      const res = await fetch("/api/autopilot/search");
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Error fetching autopilot data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunSearchNow = async () => {
    setRunningSearch(true);
    try {
      const res = await fetch("/api/autopilot/search", { method: "POST" });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Search execution failed:", err);
    } finally {
      setRunningSearch(false);
    }
  };

  const handleOpenDraftPreview = async (job: AutopilotJob) => {
    setSelectedJob(job);
    setDraftingFields(true);
    
    try {
      // Trigger draft pre-filling if fields aren't already generated
      const res = await fetch("/api/autopilot/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autopilotJobId: job.id, action: "draft" })
      });
      if (res.ok) {
        const data = await res.json();
        setEditedFields(data.formFields || {});
      }
    } catch (err) {
      console.error("Draft generation failed:", err);
    } finally {
      setDraftingFields(false);
    }
  };

  const handleSkipJob = async (jobId: string) => {
    try {
      const res = await fetch("/api/autopilot/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autopilotJobId: jobId, action: "skip" })
      });
      if (res.ok) {
        setSelectedJob(null);
        await fetchData();
      }
    } catch (err) {
      console.error("Skip action failed:", err);
    }
  };

  const handleApproveAndSubmit = async (jobId: string) => {
    setSubmittingApply(true);
    try {
      const res = await fetch("/api/autopilot/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autopilotJobId: jobId, action: "submit", formFields: editedFields })
      });
      if (res.ok) {
        setSelectedJob(null);
        await fetchData();
      }
    } catch (err) {
      console.error("Apply action failed:", err);
    } finally {
      setSubmittingApply(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 75) return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background text-foreground">
      {/* Upper Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-card border border-border rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${isAutoPilotActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`} />
            <h2 className="text-xl font-bold">Auto-Pilot Job Search</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Status: {isAutoPilotActive ? "Engaged (Scanning matches every 10 min)" : "Idle"}
          </p>
          <p className="text-xs font-mono text-muted-foreground/80">
            Last Activity: {lastAction}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleAutoPilot(!isAutoPilotActive)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md cursor-pointer ${
              isAutoPilotActive
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-deepsea-600 hover:bg-deepsea-500 text-white"
            }`}
          >
            {isAutoPilotActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isAutoPilotActive ? "Disengage Agent" : "Engage Auto-Pilot"}
          </button>
          
          <button
            onClick={handleRunSearchNow}
            disabled={runningSearch}
            className="flex items-center justify-center h-10 w-10 bg-muted hover:bg-accent border border-border rounded-xl text-foreground transition-all disabled:opacity-40 cursor-pointer"
            title="Scan Jobs Now"
          >
            <RefreshCw className={`h-4 w-4 ${runningSearch ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Recommended Matches column (2/3 width) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              AI Matched Jobs ({jobs.length})
            </h3>
            <span className="text-xs text-muted-foreground">Scored relative to your profile & resume</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl">
              <RefreshCw className="h-8 w-8 animate-spin text-deepsea-500 mb-2" />
              <p className="text-sm text-muted-foreground">Scanning matched items...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl text-center px-4">
              <AlertTriangle className="h-10 w-10 text-amber-500/50 mb-3" />
              <p className="font-semibold text-lg">No pending job recommendations</p>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Engage the autopilot or hit refresh above to fetch and score new jobs matching your profile keywords.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-5 bg-card border border-border hover:border-deepsea-500/40 rounded-2xl transition-all shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="space-y-2 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 border rounded-full font-bold ${getScoreColor(job.score)}`}>
                        {job.score}% Compatibility Match
                      </span>
                      <span className="text-xs px-2.5 py-1 bg-muted text-muted-foreground rounded-full font-medium capitalize">
                        {job.remote}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-foreground leading-snug">{job.title}</h4>
                      <p className="text-sm text-deepsea-600 dark:text-deepsea-400 font-medium">{job.company}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
                      <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {job.salary}</span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/40 p-2.5 rounded-lg border border-border">
                      <span className="font-bold text-foreground block mb-0.5">AI Reasoning:</span>
                      {job.matchReasoning}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-1">
                      {job.techStack.slice(0, 5).map((tech, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 bg-muted text-deepsea-600 dark:text-deepsea-300 rounded border border-border">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex md:flex-col items-stretch gap-2 shrink-0 md:w-36 justify-end">
                    <button
                      onClick={() => handleOpenDraftPreview(job)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-deepsea-600 hover:bg-deepsea-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" /> Review & Apply
                    </button>
                    <button
                      onClick={() => handleSkipJob(job.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-muted hover:bg-accent border border-border text-muted-foreground hover:text-foreground rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" /> Skip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Runs Log Column (1/3 width) */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-deepsea-600 dark:text-deepsea-400" />
            Agent Run Logs
          </h3>

          <div className="bg-card border border-border rounded-2xl p-4 h-[450px] flex flex-col justify-between shadow-sm">
            <div className="overflow-y-auto space-y-3 pr-1 max-h-[380px] text-xs font-mono">
              {runs.length === 0 ? (
                <p className="text-muted-foreground italic text-center py-10">No execution logs registered yet</p>
              ) : (
                runs.map((run) => (
                  <div key={run.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-deepsea-600 dark:text-deepsea-400 text-[10px]">
                        {new Date(run.createdAt).toLocaleString()}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                        run.status === "completed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                        run.status === "failed" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" :
                        "bg-deepsea-500/10 text-deepsea-600 dark:text-deepsea-400 border border-deepsea-500/20"
                      }`}>
                        {run.status}
                      </span>
                    </div>
                    <div className="space-y-1 pl-1 border-l border-border mt-1">
                      {run.logs.map((logLine, idx) => (
                        <p key={idx} className="text-muted-foreground leading-normal text-[11px] truncate" title={logLine}>
                          {logLine}
                        </p>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 pl-1">
                      Found: {run.jobsFound} | Applied: {run.jobsApplied}
                    </p>
                  </div>
                ))
              )}
            </div>
            
            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Showing last 10 execution cycles</span>
              <button onClick={fetchData} className="hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer">
                <RefreshCw className="h-3 w-3" /> Refresh logs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Review & Apply Modal Overlay */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-6 border-b border-border flex items-start justify-between">
              <div className="space-y-1">
                <span className={`text-[10px] px-2 py-0.5 border rounded-full font-bold ${getScoreColor(selectedJob.score)}`}>
                  {selectedJob.score}% Compatibility Score
                </span>
                <h3 className="text-lg font-bold text-foreground">{selectedJob.title}</h3>
                <p className="text-sm text-deepsea-600 dark:text-deepsea-400 font-medium">{selectedJob.company}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="h-8 w-8 hover:bg-muted rounded-xl flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* AI Auto-Fill Draft form */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-deepsea-600 dark:text-deepsea-450 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  AI Application Pre-Fill Answers
                </h4>

                {draftingFields ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <RefreshCw className="h-6 w-6 animate-spin text-deepsea-500 mb-2" />
                    <p className="text-xs text-muted-foreground">AI is drafting professional custom answers...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-semibold">Full Name</label>
                      <input
                        type="text"
                        value={editedFields.fullName || ""}
                        onChange={(e) => setEditedFields({ ...editedFields, fullName: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-deepsea-500 focus:ring-1 focus:ring-deepsea-500"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-semibold">Email Address</label>
                      <input
                        type="email"
                        value={editedFields.email || ""}
                        onChange={(e) => setEditedFields({ ...editedFields, email: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-deepsea-500 focus:ring-1 focus:ring-deepsea-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-semibold">Phone Number</label>
                      <input
                        type="text"
                        value={editedFields.phone || ""}
                        onChange={(e) => setEditedFields({ ...editedFields, phone: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-deepsea-500 focus:ring-1 focus:ring-deepsea-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-semibold">Expected Salary</label>
                      <input
                        type="text"
                        value={editedFields.expectedSalary || ""}
                        onChange={(e) => setEditedFields({ ...editedFields, expectedSalary: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-deepsea-500 focus:ring-1 focus:ring-deepsea-500"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs text-muted-foreground font-semibold">Why do you want to work at {selectedJob.company}?</label>
                      <textarea
                        value={editedFields.whyWorkHere || ""}
                        onChange={(e) => setEditedFields({ ...editedFields, whyWorkHere: e.target.value })}
                        rows={3}
                        className="w-full resize-none bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-deepsea-500 focus:ring-1 focus:ring-deepsea-500"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs text-muted-foreground font-semibold">Cover Letter Paragraph (AI Drafted)</label>
                      <textarea
                        value={editedFields.coverLetterParagraph || ""}
                        onChange={(e) => setEditedFields({ ...editedFields, coverLetterParagraph: e.target.value })}
                        rows={4}
                        className="w-full resize-none bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-deepsea-500 focus:ring-1 focus:ring-deepsea-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Job Details Section */}
              <div className="space-y-2 border-t border-border pt-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Job Description Overview</h4>
                <p className="text-xs text-muted-foreground leading-relaxed max-h-40 overflow-y-auto bg-background p-4 rounded-xl border border-border">
                  {selectedJob.description}
                </p>
              </div>

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex items-center justify-between gap-4">
              <a
                href={selectedJob.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-deepsea-600 dark:text-deepsea-400 hover:underline font-semibold"
              >
                Open Original Listing URL
              </a>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSkipJob(selectedJob.id)}
                  disabled={submittingApply || draftingFields}
                  className="px-4 py-2 bg-muted hover:bg-accent border border-border text-muted-foreground hover:text-foreground rounded-xl text-xs font-semibold transition-all disabled:opacity-40 cursor-pointer"
                >
                  Skip
                </button>
                <button
                  onClick={() => handleApproveAndSubmit(selectedJob.id)}
                  disabled={submittingApply || draftingFields}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  {submittingApply ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
                  {submittingApply ? "Applying..." : "Approve & Submit"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
