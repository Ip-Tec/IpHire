'use client';

import React, { useState, useEffect } from 'react';
import { dbManager, Interview } from '@/lib/db';
import { streamChat } from '@/lib/llm';
import { Calendar, MailOpen, Clock, Globe, Link as LinkIcon, User, CheckSquare, Download, Loader2, Sparkles, Plus, Trash2 } from 'lucide-react';

export const InterviewScheduler: React.FC = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [emailText, setEmailText] = useState('');
  const [parsing, setParsing] = useState(false);
  
  // Parsed outputs / manual form fields
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [dateStr, setDateStr] = useState(''); // e.g. 2026-07-15T14:00
  const [timeZone, setTimeZone] = useState('EST');
  const [meetingLink, setMeetingLink] = useState('');
  const [interviewer, setInterviewer] = useState('');
  const [checklist, setChecklist] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const [activeInterview, setActiveInterview] = useState<Interview | null>(null);

  useEffect(() => {
    async function loadInterviews() {
      const list = await dbManager.getInterviews();
      setInterviews(list);
    }
    loadInterviews();
  }, []);

  // Parse Raw Invitation Email Text using AI
  const handleParseEmail = async () => {
    if (!emailText.trim()) return;
    setParsing(true);
    resetForm();

    const config = await dbManager.getSetting('llm_config', { provider: 'sandbox' });
    const prompt = `Read this interview invitation email and extract key variables.
Email Invitation:
"${emailText}"

Extract and format in standard text. Return EXACTLY:
COMPANY: [Company Name]
POSITION: [Job Title]
DATETIME: [YYYY-MM-DDTHH:MM format, e.g. 2026-07-15T14:30]
TIMEZONE: [e.g. EST, PST, GMT]
LINK: [Meeting Link URL, or 'Onsite']
INTERVIEWER: [Interviewer Name or 'Hiring Team']
CHECKLIST: [Bullet points of suggested prep checklist items separated by commas]`;

    let accumulated = '';
    try {
      await streamChat(
        [{ role: 'user', content: prompt }],
        config as any,
        (chunk) => {
          accumulated += chunk;
        },
        async () => {
          // Parse lines
          parseEmailVars(accumulated);
          setParsing(false);
        },
        (err) => {
          console.error("AI invitation parsing failed:", err);
          alert(`Parsing failed: ${err.message}`);
          setParsing(false);
        }
      );
    } catch (e: any) {
      console.error("AI stream error:", e);
      setParsing(false);
    }
  };

  const parseEmailVars = (text: string) => {
    try {
      const companyMatch = text.match(/COMPANY:\s*(.*)/i);
      const positionMatch = text.match(/POSITION:\s*(.*)/i);
      const dateMatch = text.match(/DATETIME:\s*(.*)/i);
      const tzMatch = text.match(/TIMEZONE:\s*(.*)/i);
      const linkMatch = text.match(/LINK:\s*(.*)/i);
      const interviewerMatch = text.match(/INTERVIEWER:\s*(.*)/i);
      const listMatch = text.match(/CHECKLIST:\s*(.*)/i);

      if (companyMatch) setCompany(companyMatch[1].trim());
      if (positionMatch) setPosition(positionMatch[1].trim());
      if (dateMatch) setDateStr(dateMatch[1].trim());
      if (tzMatch) setTimeZone(tzMatch[1].trim());
      if (linkMatch) setMeetingLink(linkMatch[1].trim());
      if (interviewerMatch) setInterviewer(interviewerMatch[1].trim());
      
      if (listMatch) {
        setChecklist(listMatch[1].split(',').map(s => s.trim()).filter(Boolean));
      } else {
        setChecklist(['Research company values', 'Prepare behavioral STAR questions', 'Review target portfolio specs']);
      }
    } catch (e) {
      console.error("Error splitting parsed email items", e);
    }
  };

  const handleSaveInterview = async () => {
    if (!company.trim() || !position.trim()) return;

    // Convert date string input to Unix timestamp
    const unixTimestamp = dateStr ? new Date(dateStr).getTime() : Date.now();

    const newInterview: Interview = {
      id: `int-${Date.now()}`,
      company: company.trim(),
      position: position.trim(),
      dateTime: unixTimestamp,
      timeZone: timeZone.trim() || 'EST',
      meetingLink: meetingLink.trim() || 'Onsite',
      interviewer: interviewer.trim() || 'Hiring Manager',
      checklist,
      createdAt: Date.now()
    };

    await dbManager.saveInterview(newInterview);
    const list = await dbManager.getInterviews();
    setInterviews(list);
    setActiveInterview(newInterview);
    resetForm();
    setEmailText('');
  };

  const handleDeleteInterview = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Remove this scheduled interview?")) return;
    await dbManager.deleteInterview(id);
    const list = await dbManager.getInterviews();
    setInterviews(list);
    if (activeInterview?.id === id) {
      setActiveInterview(null);
    }
  };

  // Generate and download standard .ics calendar file
  const handleExportICS = (int: Interview) => {
    try {
      const date = new Date(int.dateTime);
      const formatICSDate = (d: Date) => {
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const start = formatICSDate(date);
      // End defaults to 1 hour later
      const endDate = new Date(date.getTime() + 60 * 60 * 1000);
      const end = formatICSDate(endDate);

      const icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//IpHire//Career OS Schedulers//EN',
        'BEGIN:VEVENT',
        `UID:uid-${int.id}@iphire.ai`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:Interview with ${int.company} for ${int.position}`,
        `DESCRIPTION:Interview preparation with interviewer ${int.interviewer}. Check meeting link.`,
        `LOCATION:${int.meetingLink || 'Onsite'}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ];

      const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Interview_${int.company.replace(/\s+/g, '_')}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Failed to generate ICS file", e);
    }
  };

  const handleToggleChecklist = async (int: Interview, index: number) => {
    // Custom toggle inside checklists (represented with a suffix '[x]')
    const updated = { ...int };
    const item = updated.checklist[index];
    if (item.endsWith(' [x]')) {
      updated.checklist[index] = item.slice(0, -4);
    } else {
      updated.checklist[index] = item + ' [x]';
    }
    await dbManager.saveInterview(updated);
    const list = await dbManager.getInterviews();
    setInterviews(list);
    setActiveInterview(updated);
  };

  const handleAddChecklistItem = async (int: Interview) => {
    if (!newChecklistItem.trim()) return;
    const updated = { ...int };
    updated.checklist = [...updated.checklist, newChecklistItem.trim()];
    await dbManager.saveInterview(updated);
    const list = await dbManager.getInterviews();
    setInterviews(list);
    setActiveInterview(updated);
    setNewChecklistItem('');
  };

  const resetForm = () => {
    setCompany('');
    setPosition('');
    setDateStr('');
    setTimeZone('EST');
    setMeetingLink('');
    setInterviewer('');
    setChecklist([]);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Calendar className="h-5 w-5 text-deepsea-600 dark:text-deepsea-400" />
          Interview Scheduler
        </h2>
        <p className="text-sm text-muted-foreground">
          Paste invitation email notifications, let AI extract details automatically, and generate Google/Outlook calendar events.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left invitation parser Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3.5">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1"><MailOpen className="h-4 w-4" /> Invitation Parser</p>

            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">Paste Invitation Email Text</label>
              <textarea
                placeholder="Paste email content here (e.g. Hi, we would like to invite you for an interview on Wednesday July 15th at 2pm EST...)"
                value={emailText}
                onChange={e => setEmailText(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500 h-28 resize-none"
              />
            </div>

            <button
              onClick={handleParseEmail}
              disabled={parsing || !emailText.trim()}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-deepsea-600 py-2.5 text-xs font-semibold text-white hover:bg-deepsea-700 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
            >
              {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {parsing ? 'Parsing invite details...' : 'Parse Email Invite with AI'}
            </button>
          </div>

          {/* Form edit preview */}
          {(company || position || dateStr) && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3 animate-in fade-in duration-200 text-xs">
              <p className="text-sm font-semibold text-foreground">Confirm Extracted Details</p>

              <div>
                <label className="block mb-1 text-muted-foreground">Target Company *</label>
                <input
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>

              <div>
                <label className="block mb-1 text-muted-foreground">Position *</label>
                <input
                  type="text"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-muted-foreground">Date / Time (Local)</label>
                  <input
                    type="datetime-local"
                    value={dateStr}
                    onChange={e => setDateStr(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-muted-foreground">Time Zone</label>
                  <input
                    type="text"
                    value={timeZone}
                    onChange={e => setTimeZone(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-muted-foreground">Meeting Link / Location</label>
                <input
                  type="text"
                  value={meetingLink}
                  onChange={e => setMeetingLink(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>

              <div>
                <label className="block mb-1 text-muted-foreground">Interviewer Name</label>
                <input
                  type="text"
                  value={interviewer}
                  onChange={e => setInterviewer(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveInterview}
                  className="flex-grow rounded-lg bg-deepsea-600 py-2 font-semibold text-white hover:bg-deepsea-700 cursor-pointer"
                >
                  Schedule Event
                </button>
                <button
                  onClick={resetForm}
                  className="rounded-lg border border-border bg-card px-4 py-2 font-semibold text-foreground hover:bg-accent cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Active Schedule Grid */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Scheduled list */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upcoming Schedules</h3>
            
            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
              {interviews.map(int => (
                <div
                  key={int.id}
                  onClick={() => setActiveInterview(int)}
                  className={`border rounded-xl p-3 flex justify-between items-center cursor-pointer transition-all ${
                    activeInterview?.id === int.id 
                      ? 'border-deepsea-500 bg-deepsea-50/20 dark:bg-deepsea-950/10' 
                      : 'border-border bg-card hover:border-deepsea-300'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-xs font-bold text-foreground truncate">{int.position}</h4>
                    <p className="text-[10px] text-deepsea-600 dark:text-deepsea-400 font-semibold">{int.company}</p>
                    
                    <div className="flex flex-wrap items-center gap-x-3 text-[9px] text-muted-foreground pt-1">
                      <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {new Date(int.dateTime).toLocaleString()}</span>
                      <span className="flex items-center gap-0.5"><Globe className="h-2.5 w-2.5" /> {int.timeZone}</span>
                    </div>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportICS(int);
                      }}
                      className="p-1.5 rounded border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      title="Export ICS Calendar file"
                    >
                      <Download className="h-3.5 w-3.5 text-deepsea-600 dark:text-deepsea-400" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteInterview(int.id, e)}
                      className="p-1.5 rounded border border-border bg-card hover:bg-red-50 text-muted-foreground hover:text-red-600 cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {interviews.length === 0 && (
                <div className="py-12 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground">
                  No interviews scheduled. Use the parser to extract details and populate items.
                </div>
              )}
            </div>
          </div>

          {/* Active Interview Checklist Display */}
          {activeInterview && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-border pb-2.5 flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Interview Checklist: {activeInterview.position}</h4>
                  <p className="text-[10px] text-deepsea-600 dark:text-deepsea-400 font-semibold">{activeInterview.company} · {activeInterview.interviewer}</p>
                </div>
                {activeInterview.meetingLink && activeInterview.meetingLink !== 'Onsite' && (
                  <a
                    href={activeInterview.meetingLink.startsWith('http') ? activeInterview.meetingLink : `https://${activeInterview.meetingLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-deepsea-600 dark:text-deepsea-400 font-bold border border-deepsea-200/50 hover:bg-deepsea-50/50 px-2 py-0.5 rounded"
                  >
                    <LinkIcon className="h-3 w-3" /> Meet
                  </a>
                )}
              </div>

              {/* Checklist list */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {activeInterview.checklist.map((item, index) => {
                  const isDone = item.endsWith(' [x]');
                  const label = isDone ? item.slice(0, -4) : item;
                  
                  return (
                    <div
                      key={index}
                      onClick={() => handleToggleChecklist(activeInterview, index)}
                      className="flex items-start gap-2.5 cursor-pointer text-xs group"
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        readOnly
                        className="rounded border-border text-deepsea-600 focus:ring-deepsea-500 mt-0.5 cursor-pointer"
                      />
                      <span className={`leading-tight select-none group-hover:text-foreground ${
                        isDone ? 'line-through text-muted-foreground' : 'text-muted-foreground'
                      }`}>
                        {label}
                      </span>
                    </div>
                  );
                })}

                {activeInterview.checklist.length === 0 && (
                  <p className="text-[10px] text-muted-foreground italic">No checklist items.</p>
                )}
              </div>

              {/* Add checklist item */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom checklist item..."
                  value={newChecklistItem}
                  onChange={e => setNewChecklistItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem(activeInterview)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
                <button
                  onClick={() => handleAddChecklistItem(activeInterview)}
                  className="rounded-lg bg-deepsea-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-deepsea-700 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
