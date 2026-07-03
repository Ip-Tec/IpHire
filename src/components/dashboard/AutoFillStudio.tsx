'use client';

import React, { useState, useEffect } from 'react';
import { dbManager, Resume } from '@/lib/db';
import { Sparkles, Copy, Check, MousePointer, Info, ExternalLink, HelpCircle, FileText } from 'lucide-react';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  skills: string;
  summary: string;
}

export const AutoFillStudio: React.FC = () => {
  const [activeResume, setActiveResume] = useState<Resume | null>(null);
  const [profile, setProfile] = useState<ProfileData>({
    name: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    phone: '(555) 019-2834',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/alex-rivera',
    github: 'github.com/alexr',
    portfolio: 'alexr.dev',
    skills: 'TypeScript, React, Next.js, Tailwind CSS, SQL',
    summary: 'Senior Frontend Developer with 4 years experience designing and building responsive web apps.'
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    async function loadActiveResume() {
      const list = await dbManager.getResumes();
      if (list.length > 0) {
        const active = list[0];
        setActiveResume(active);
        
        // Attempt to parse info from markdown
        const parsed = parseResumeMarkdown(active.content);
        setProfile(prev => ({ ...prev, ...parsed }));
      }
    }
    loadActiveResume();
  }, []);

  const parseResumeMarkdown = (md: string): Partial<ProfileData> => {
    const lines = md.split('\n');
    const parsed: Partial<ProfileData> = {};

    try {
      // First line is usually header with name
      const firstLine = lines.find(l => l.trim().startsWith('# '));
      if (firstLine) {
        parsed.name = firstLine.replace('# ', '').trim();
      }

      // Try to find email, phone, location, links
      const contactLine = lines.find(l => l.includes('@') || l.includes('|') || l.includes('linkedin.com'));
      if (contactLine) {
        const parts = contactLine.split('|').map(p => p.trim());
        parts.forEach(part => {
          if (part.includes('@')) parsed.email = part;
          else if (part.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)) parsed.phone = part;
          else if (part.toLowerCase().includes('github.com')) parsed.github = part;
          else if (part.toLowerCase().includes('linkedin.com')) parsed.linkedin = part;
          else if (part.includes(',') && !part.includes('@')) parsed.location = part;
        });
      }

      // Extract skills
      const skillIdx = lines.findIndex(l => l.toLowerCase().includes('skills'));
      if (skillIdx !== -1) {
        const skillLines: string[] = [];
        for (let i = skillIdx + 1; i < lines.length; i++) {
          const l = lines[i].trim();
          if (l.startsWith('## ') || l.startsWith('### ')) break;
          if (l.startsWith('- ') || l.startsWith('* ')) {
            skillLines.push(l.slice(2).replace(/\*\*/g, '').replace(/:/g, ''));
          }
        }
        if (skillLines.length > 0) {
          parsed.skills = skillLines.join(', ');
        }
      }

      // Extract Summary
      const summaryIdx = lines.findIndex(l => l.toLowerCase().includes('summary'));
      if (summaryIdx !== -1) {
        const summaryLines: string[] = [];
        for (let i = summaryIdx + 1; i < lines.length; i++) {
          const l = lines[i].trim();
          if (l.startsWith('## ') || l.startsWith('### ')) break;
          if (l && !l.startsWith('- ') && !l.startsWith('* ')) {
            summaryLines.push(l);
          }
        }
        if (summaryLines.length > 0) {
          parsed.summary = summaryLines.join(' ');
        }
      }

    } catch (e) {
      console.error("Error parsing resume markdown variables:", e);
    }

    return parsed;
  };

  const handleCopy = (key: keyof ProfileData, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Compile Dynamic Bookmarklet JavaScript String
  const getBookmarkletCode = () => {
    const minifiedJs = `javascript:(function(){
      const data = {
        name: ${JSON.stringify(profile.name)},
        email: ${JSON.stringify(profile.email)},
        phone: ${JSON.stringify(profile.phone)},
        location: ${JSON.stringify(profile.location)},
        linkedin: ${JSON.stringify(profile.linkedin)},
        github: ${JSON.stringify(profile.github)},
        website: ${JSON.stringify(profile.portfolio)},
        skills: ${JSON.stringify(profile.skills)}
      };
      const inputs = document.querySelectorAll('input, textarea');
      inputs.forEach(el => {
        const name = (el.name || el.placeholder || el.id || '').toLowerCase();
        if (name.includes('name') || name.includes('fullname')) el.value = data.name;
        else if (name.includes('email')) el.value = data.email;
        else if (name.includes('phone') || name.includes('tel')) el.value = data.phone;
        else if (name.includes('linkedin')) el.value = data.linkedin;
        else if (name.includes('github')) el.value = data.github;
        else if (name.includes('website') || name.includes('portfolio') || name.includes('homepage')) el.value = data.website;
        else if (name.includes('skill')) el.value = data.skills;
        
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      alert('IpHire: Autofilled matching form elements!');
    })();`.replace(/\s+/g, ' '); // Compress whitespace
    
    return minifiedJs;
  };

  const clipboardCards: { key: keyof ProfileData; label: string; value: string; multiline?: boolean }[] = [
    { key: 'name', label: 'Full Name', value: profile.name },
    { key: 'email', label: 'Email Address', value: profile.email },
    { key: 'phone', label: 'Phone Number', value: profile.phone },
    { key: 'location', label: 'Location / City', value: profile.location },
    { key: 'linkedin', label: 'LinkedIn URL', value: profile.linkedin },
    { key: 'github', label: 'GitHub Link', value: profile.github },
    { key: 'portfolio', label: 'Portfolio Website', value: profile.portfolio },
    { key: 'skills', label: 'Core Skills List', value: profile.skills, multiline: true },
    { key: 'summary', label: 'Professional Summary', value: profile.summary, multiline: true },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <MousePointer className="h-5 w-5 text-deepsea-600 dark:text-deepsea-400" />
          Auto-Fill Studio
        </h2>
        <p className="text-sm text-muted-foreground">
          Accelerate your applications. Auto-fill application forms instantly with browser bookmarklets or quick-copy values.
        </p>
      </div>

      {/* Bookmarklet Section */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Sparkles className="h-4.5 w-4.5 text-deepsea-600 dark:text-deepsea-400" />
          AI Form Auto-Fill Bookmarklet
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          {/* Explanation */}
          <div className="md:col-span-2 space-y-3 text-xs leading-relaxed text-muted-foreground">
            <p>
              A **bookmarklet** is a bookmark stored in a web browser that contains JavaScript code to extend the browser's capabilities.
            </p>
            <div className="bg-muted/30 border border-border p-3.5 rounded-lg space-y-2">
              <p className="font-bold text-foreground flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Drag & Install Instructions:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Make sure your browser's **Bookmarks Bar** is visible (<kbd className="bg-background border px-1 rounded">Ctrl+Shift+B</kbd> or <kbd className="bg-background border px-1 rounded">Cmd+Shift+B</kbd>).</li>
                <li>Click and drag the green **IpHire Auto-Fill** button below onto your bookmarks bar.</li>
                <li>Open any job application page (e.g. Lever, Greenhouse).</li>
                <li>Click the bookmark from your bookmarks bar. The page's text inputs will automatically fill using your resume details.</li>
              </ol>
            </div>
          </div>

          {/* Draggable Button card */}
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl text-center space-y-3 bg-muted/10">
            <a
              href={getBookmarkletCode()}
              onClick={(e) => e.preventDefault()} // Prevent clicking directly on dashboard
              className="btn-primary select-none flex items-center gap-2 rounded-xl bg-deepsea-600 px-6 py-3 text-sm font-bold text-white shadow-md cursor-grab active:cursor-grabbing"
              title="Drag this button to your browser bookmarks bar"
            >
              <MousePointer className="h-4.5 w-4.5" />
              IpHire Auto-Fill
            </a>
            <p className="text-[10px] text-muted-foreground font-semibold">Drag this button to Bookmarks Bar</p>
          </div>

        </div>
      </div>

      {/* Copy-paste Deck */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Quick-Copy Dashboard ({activeResume ? activeResume.name : 'Sample Details'})
          </h3>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" /> Auto-synced from master resume
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clipboardCards.map(card => (
            <div
              key={card.key}
              onClick={() => handleCopy(card.key, card.value)}
              className="rounded-xl border border-border bg-card p-4 hover:border-deepsea-400 cursor-pointer shadow-sm hover:shadow-md transition-all duration-150 relative group"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</span>
                <button className="text-muted-foreground group-hover:text-deepsea-600 transition-colors">
                  {copiedKey === card.key ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className={`mt-2 font-medium text-foreground text-xs leading-relaxed ${
                card.multiline ? 'line-clamp-3 text-[11px]' : 'truncate'
              }`}>
                {card.value || 'Not configured'}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
