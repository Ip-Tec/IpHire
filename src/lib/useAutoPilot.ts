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
    await dbManager.saveSetting('auto_pilot_enabled', enabled);
  };

  const runAutoPilotCycle = async () => {
    try {
      setLastAction('Searching for matching jobs on Jooble...');
      const joobleKey = await dbManager.getSetting<string>('jooble_api_key', '');
      const profile = await dbManager.getSetting<any>('user_profile', {});
      
      let query = profile.title || 'Developer';
      const params = new URLSearchParams();
      params.append('category', query);
      if (joobleKey) params.append('jooble_key', joobleKey);

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      const jobs: Job[] = data.results || [];

      if (jobs.length === 0) {
        setLastAction('No new jobs found in this cycle.');
        return;
      }

      // Find a job we haven't applied to
      const applied = await dbManager.getSavedJobs();
      const appliedIds = applied.map(a => a.id);
      const newJobs = jobs.filter(j => !appliedIds.includes(j.id) && j.url);

      if (newJobs.length > 0) {
        const targetJob = newJobs[0];
        setLastAction(`Triggering auto-apply for: ${targetJob.title} at ${targetJob.company}`);
        
        // Save it so we don't apply again
        await dbManager.saveJob(targetJob);
        
        // Trigger the extension or Tauri bridge to open the tab
        window.postMessage({ action: 'TRIGGER_AUTO_APPLY', source: 'iphire-web', url: targetJob.url }, '*');
      } else {
        setLastAction('No unapplied jobs matched the criteria.');
      }
    } catch (e) {
      console.error(e);
      setLastAction('Error during auto-pilot cycle.');
    }
  };

  return { isAutoPilotActive, toggleAutoPilot, lastAction };
}
