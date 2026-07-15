'use client';

import { useEffect, useState, useRef } from 'react';
import { dbManager, Job } from './db';

export function useAutoPilot() {
  const [isAutoPilotActive, setIsAutoPilotActive] = useState(false);
  const [lastAction, setLastAction] = useState<string>('Idle');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check initial setting
    dbManager.getSetting('auto_pilot_enabled', false).then(val => {
      setIsAutoPilotActive(val as boolean);
    });
  }, []);

  useEffect(() => {
    if (isAutoPilotActive) {
      setLastAction('Auto-pilot engaged. Waiting for next cycle...');
      // Run every 10 minutes
      timerRef.current = setInterval(runAutoPilotCycle, 10 * 60 * 1000);
      // Run once immediately
      runAutoPilotCycle();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setLastAction('Auto-pilot disabled.');
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAutoPilotActive]);

  const toggleAutoPilot = async (enabled: boolean) => {
    setIsAutoPilotActive(enabled);
    await dbManager.setSetting('auto_pilot_enabled', enabled);
  };

  const runAutoPilotCycle = async () => {
    try {
      setLastAction('Auto-Pilot triggered: Initiating multi-board job search & scoring...');
      
      // 1. Trigger search and AI scoring
      const searchRes = await fetch('/api/autopilot/search', { method: 'POST' });
      if (!searchRes.ok) throw new Error(`Search failed with status ${searchRes.status}`);
      const searchData = await searchRes.json();
      
      if (!searchData.success) {
        setLastAction(`Scan cycle completed: ${searchData.error || 'No results'}`);
        return;
      }
      
      setLastAction(`Search completed. Found new matches.`);
      
      // 2. Fetch matched jobs pending review
      const fetchRes = await fetch('/api/autopilot/search');
      if (!fetchRes.ok) throw new Error('Failed to fetch matched jobs');
      const fetchData = await fetchRes.json();
      
      const pendingJobs = (fetchData.jobs || []).filter((j: any) => j.status === 'pending_review');
      
      if (pendingJobs.length === 0) {
        setLastAction('No high-matching jobs found to apply in this cycle.');
        return;
      }
      
      // 3. Auto-draft and auto-submit applications for top matches (limit to 2 per cycle to be safe)
      const jobsToApply = pendingJobs.slice(0, 2);
      setLastAction(`Preparing auto-application submissions for ${jobsToApply.length} high-match roles...`);
      
      for (const job of jobsToApply) {
        try {
          setLastAction(`Drafting custom AI responses for ${job.title} at ${job.company}...`);
          
          // Generate draft
          const draftRes = await fetch('/api/autopilot/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ autopilotJobId: job.id, action: 'draft' })
          });
          
          if (!draftRes.ok) {
            console.error(`Drafting failed for job ${job.id}`);
            continue;
          }
          
          setLastAction(`Submitting application form answers for ${job.title} at ${job.company}...`);
          
          // Submit application
          const submitRes = await fetch('/api/autopilot/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ autopilotJobId: job.id, action: 'submit' })
          });
          
          if (!submitRes.ok) {
            console.error(`Submission failed for job ${job.id}`);
            continue;
          }
          
          setLastAction(`Successfully applied to ${job.title} at ${job.company}!`);
        } catch (jobErr: any) {
          console.error(`Failed to auto-apply for job ${job.id}:`, jobErr);
        }
      }
      
      setLastAction(`Auto-pilot cycle complete. Applied to ${jobsToApply.length} jobs.`);
    } catch (e: any) {
      console.error(e);
      setLastAction(`Error during auto-pilot cycle: ${e.message}`);
    }
  };

  return { isAutoPilotActive, toggleAutoPilot, lastAction };
}
