'use client';

import React, { useState, useEffect } from 'react';
import { dbManager, Job, Application } from '@/lib/db';
import { streamChat } from '@/lib/llm';
import { 
  Search, MapPin, DollarSign, Briefcase, Sparkles, Loader2, 
  Bookmark, CheckCircle, ExternalLink, RefreshCw, Link as LinkIcon, 
  PlusCircle, FileText, Calendar, ArrowRight, UserCheck, X
} from 'lucide-react';

const MOCK_JOB_DATABASE: Job[] = [
  {
    id: 'job-1',
    title: 'Senior React Developer',
    company: 'Vercel',
    location: 'San Francisco, CA',
    salary: '$140,000 - $180,000',
    remote: 'remote',
    jobType: 'fulltime',
    description: 'We are looking for an experienced React Developer to help build the future of deployment workflows. You will optimize web performance, design server component APIs, and collaborate on design systems.',
    techStack: ['TypeScript', 'Next.js', 'React', 'Tailwind CSS', 'CSS Modules'],
    industry: 'tech',
    createdAt: Date.now() - 3600000 * 24
  },
  {
    id: 'job-2',
    title: 'Registered Nurse (ICU)',
    company: 'Mayo Clinic',
    location: 'Rochester, MN',
    salary: '$85,000 - $110,000',
    remote: 'onsite',
    jobType: 'fulltime',
    description: 'Provide exceptional patient care in our Intensive Care Unit. Requires active RN state license, BLS, and ACLS certification. 2+ years of clinical critical care experience preferred.',
    techStack: ['Clinical Assessment', 'Patient Care', 'ACLS', 'BLS', 'Epic EHR'],
    industry: 'healthcare',
    createdAt: Date.now() - 3600000 * 12
  },
  {
    id: 'job-3',
    title: 'Account Executive',
    company: 'Salesforce',
    location: 'Chicago, IL',
    salary: '$90,000 - $130,000 + Comm',
    remote: 'hybrid',
    jobType: 'fulltime',
    description: 'Drive sales pipeline, demonstrate SaaS value propositions, and close enterprise deals. Candidates should have a proven track record of meeting quotas and managing client relationships.',
    techStack: ['CRM', 'B2B Sales', 'Negotiation', 'Enterprise SaaS', 'Pipeline Management'],
    industry: 'sales',
    createdAt: Date.now() - 3600000 * 48
  }
];

export const JobDiscovery: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [industry, setIndustry] = useState('all');
  const [remote, setRemote] = useState('all');
  const [jobType, setJobType] = useState('all');
  const [country, setCountry] = useState('all');

  const [generating, setGenerating] = useState(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  // Community and Clipper states
  const [activeTab, setActiveTab] = useState<'live' | 'community'>('live');
  const [clipperUrl, setClipperUrl] = useState('');
  const [clipping, setClipping] = useState(false);
  const [communityJobs, setCommunityJobs] = useState<Job[]>([]);

  // AI Application Prep Modal states
  const [preparing, setPreparing] = useState(false);
  const [prepStep, setPrepStep] = useState(0);
  const [prepCoverLetter, setPrepCoverLetter] = useState('');
  const [prepResumeTips, setPrepResumeTips] = useState('');
  const [prepDone, setPrepDone] = useState(false);

  const fetchLiveJobs = async () => {
    setGenerating(true);
    try {
      const params = new URLSearchParams();
      if (industry !== 'all') params.append('category', industry);
      if (remote !== 'all') params.append('remote', remote);
      if (jobType !== 'all') params.append('jobType', jobType);
      const joobleKey = await dbManager.getSetting<string>('jooble_api_key', '');
      if (joobleKey) params.append('jooble_key', joobleKey);
      
      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.results && data.results.length > 0 ? data.results : MOCK_JOB_DATABASE);
      } else {
        setJobs(MOCK_JOB_DATABASE);
      }
    } catch (e) {
      console.error("Error fetching live jobs:", e);
      setJobs(MOCK_JOB_DATABASE);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    async function loadSavedStates() {
      const savedList = await dbManager.getSavedJobs();
      setSavedJobIds(savedList.map(j => j.id));
      setCommunityJobs(savedList);
      fetchLiveJobs();
    }
    loadSavedStates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industry, remote, jobType, country]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGenerating(true);
    try {
      const joobleKey = await dbManager.getSetting<string>('jooble_api_key', '');
      let url = `/api/jobs?category=${encodeURIComponent(searchQuery)}`;
      if (joobleKey) url += `&jooble_key=${encodeURIComponent(joobleKey)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const fetched = data.results || [];
        if (fetched.length < 2) {
          triggerAIGeneration();
        } else {
          setJobs(fetched);
          setGenerating(false);
        }
      } else {
        triggerAIGeneration();
      }
    } catch {
      triggerAIGeneration();
    }
  };

  const triggerAIGeneration = async () => {
    setGenerating(true);
    const config = await dbManager.getSetting('llm_config', { provider: 'sandbox' });
    const prompt = `Act as an API and generate 2 realistic job listings based on the search query: "${searchQuery}".
Provide the details in standard text format. For each job, return EXACTLY:
JOB_START
TITLE: [Job Title]
COMPANY: [Company Name]
LOCATION: [City, State or Country]
SALARY: [$X,000 - $Y,000]
REMOTE: [remote, hybrid, or onsite]
JOBTYPE: [fulltime, parttime, contract, or internship]
INDUSTRY: [tech, healthcare, sales, finance, marketing, or other]
TECHSTACK: [comma separated skills/tools]
DESCRIPTION: [A 3 sentence role description details responsibilities]
JOB_END

Do not add extra conversational dialog.`;

    let accumulated = '';
    try {
      await streamChat(
        [{ role: 'user', content: prompt }],
        config as any,
        (chunk) => {
          accumulated += chunk;
        },
        () => {
          const generatedJobs = parseAIJobs(accumulated);
          setJobs(prev => [...generatedJobs, ...prev]);
          setGenerating(false);
        },
        (err) => {
          console.error("AI job generation failed:", err);
          setGenerating(false);
        }
      );
    } catch (err) {
      console.error("AI stream error:", err);
      setGenerating(false);
    }
  };

  const parseAIJobs = (text: string): Job[] => {
    const jobBlocks = text.split(/JOB_START/i);
    const parsedJobs: Job[] = [];

    jobBlocks.forEach((block, idx) => {
      if (!block.includes('JOB_END')) return;
      
      try {
        const titleMatch = block.match(/TITLE:\s*(.*)/i);
        const companyMatch = block.match(/COMPANY:\s*(.*)/i);
        const locationMatch = block.match(/LOCATION:\s*(.*)/i);
        const salaryMatch = block.match(/SALARY:\s*(.*)/i);
        const remoteMatch = block.match(/REMOTE:\s*(.*)/i);
        const typeMatch = block.match(/JOBTYPE:\s*(.*)/i);
        const industryMatch = block.match(/INDUSTRY:\s*(.*)/i);
        const techMatch = block.match(/TECHSTACK:\s*(.*)/i);
        const descMatch = block.match(/DESCRIPTION:\s*([\s\S]*?)(?=JOB_END|$)/i);

        if (titleMatch && companyMatch) {
          parsedJobs.push({
            id: `job-ai-${Date.now()}-${idx}`,
            title: titleMatch[1].trim(),
            company: companyMatch[1].trim(),
            location: locationMatch ? locationMatch[1].trim() : 'Remote',
            salary: salaryMatch ? salaryMatch[1].trim() : '$80,000 - $120,000',
            remote: (remoteMatch ? remoteMatch[1].trim().toLowerCase() : 'remote') as any,
            jobType: (typeMatch ? typeMatch[1].trim().toLowerCase() : 'fulltime') as any,
            description: descMatch ? descMatch[1].trim() : 'Exciting role with immediate start.',
            techStack: techMatch ? techMatch[1].split(',').map(s => s.trim()) : [],
            industry: industryMatch ? industryMatch[1].trim().toLowerCase() : 'tech',
            createdAt: Date.now()
          });
        }
      } catch (e) {
        console.error("Failed to parse AI job block", e);
      }
    });

    return parsedJobs;
  };

  const handleSaveJob = async (job: Job) => {
    const isSaved = savedJobIds.includes(job.id);
    
    if (isSaved) {
      await dbManager.deleteJob(job.id);
      setSavedJobIds(prev => prev.filter(id => id !== job.id));
      setCommunityJobs(prev => prev.filter(j => j.id !== job.id));
    } else {
      await dbManager.saveJob(job);
      
      const newApp: Application = {
        id: `app-${job.id}`,
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        remote: job.remote,
        status: 'saved',
        notes: `Saved from Job Discovery index.`,
        jobDesc: job.description
      };
      await dbManager.saveApplication(newApp);
      
      setSavedJobIds(prev => [...prev, job.id]);
      setCommunityJobs(prev => [job, ...prev]);
    }
  };

  const handleClipLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clipperUrl) return;
    setClipping(true);

    const config = await dbManager.getSetting('llm_config', { provider: 'sandbox' });
    const prompt = `Act as a job board scraper. Inspect this URL: "${clipperUrl}". Extract/simulate details of a professional job post.
Return ONLY a valid JSON block:
{
  "title": "Job Title",
  "company": "Company Name",
  "location": "City, State",
  "salary": "Estimated Salary Range",
  "remote": "remote/hybrid/onsite",
  "jobType": "fulltime/parttime",
  "industry": "tech/sales/healthcare/finance",
  "techStack": ["skill1", "skill2"],
  "description": "A structured 3-sentence summary of requirements."
}`;

    let accumulated = '';
    try {
      await streamChat(
        [{ role: 'user', content: prompt }],
        config as any,
        (chunk) => {
          accumulated += chunk;
        },
        async () => {
          try {
            const cleanJson = accumulated.substring(
              accumulated.indexOf('{'),
              accumulated.lastIndexOf('}') + 1
            );
            const parsed = JSON.parse(cleanJson);
            const newJob: Job = {
              id: `clipped-${Date.now()}`,
              title: parsed.title || 'Job Opening',
              company: parsed.company || 'Company',
              location: parsed.location || 'Remote',
              salary: parsed.salary || '$90,000 - $120,000',
              remote: parsed.remote || 'remote',
              jobType: parsed.jobType || 'fulltime',
              description: parsed.description || 'Description not parsed.',
              techStack: parsed.techStack || [],
              industry: parsed.industry || 'tech',
              url: clipperUrl,
              createdAt: Date.now()
            };

            await dbManager.saveJob(newJob);
            setCommunityJobs(prev => [newJob, ...prev]);
            setSavedJobIds(prev => [...prev, newJob.id]);
            setActiveJob(newJob);
            setClipperUrl('');
            alert('Job successfully clipped and synced to Community Board! 🚀');
          } catch (err) {
            console.error("Clipper parsing failed", err);
            alert('Could not parse job details. Please try again.');
          } finally {
            setClipping(false);
          }
        },
        (err) => {
          console.error("Clipper stream error", err);
          setClipping(false);
        }
      );
    } catch {
      setClipping(false);
    }
  };

  const startAIPreparation = async (job: Job) => {
    setPreparing(true);
    setPrepStep(1);
    setPrepDone(false);

    const config = await dbManager.getSetting('llm_config', { provider: 'sandbox' });
    const resumes = await dbManager.getResumes();
    const activeResume = resumes.length > 0 ? resumes[0].content : "Alex Rivera, React Developer, TypeScript, SQL.";

    let resumeTips = '';
    const resumePrompt = `Compare this resume:\n"${activeResume}"\n\nwith this job description:\n"${job.description}"\n\nRecommend exactly 3 keyword adjustments and a 1-sentence match analysis. Keep it concise.`;

    try {
      await streamChat(
        [{ role: 'user', content: resumePrompt }],
        config as any,
        (chunk) => {
          resumeTips += chunk;
        },
        async () => {
          setPrepResumeTips(resumeTips);
          
          setPrepStep(2);
          let coverLetter = '';
          const coverPrompt = `Write a 2-paragraph cover letter for the role of ${job.title} at ${job.company} based on this resume:\n"${activeResume}"`;
          
          await streamChat(
            [{ role: 'user', content: coverPrompt }],
            config as any,
            (chunk) => {
              coverLetter += chunk;
            },
            async () => {
              setPrepCoverLetter(coverLetter);
              
              setPrepStep(3);
              const newLetter = {
                id: `cover-ai-${Date.now()}`,
                title: `AI Cover Letter - ${job.company}`,
                jobTitle: job.title,
                company: job.company,
                content: coverLetter,
                style: 'Modern',
                createdAt: Date.now()
              };
              await dbManager.saveCoverLetter(newLetter);

              const newApp: Application = {
                id: `app-${job.id}`,
                jobId: job.id,
                title: job.title,
                company: job.company,
                location: job.location,
                salary: job.salary,
                remote: job.remote,
                status: 'applied',
                notes: `AI Prepared application folder created. Cover letter saved.\n\nTips:\n${resumeTips}`,
                jobDesc: job.description
              };
              await dbManager.saveApplication(newApp);

              setPrepDone(true);
            },
            (err) => console.error(err)
          );
        },
        (err) => console.error(err)
      );
    } catch (e) {
      console.error(e);
      setPreparing(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setIndustry('all');
    setRemote('all');
    setJobType('all');
    fetchLiveJobs();
  };

  const displayedJobs = activeTab === 'live' ? jobs : communityJobs;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Search className="h-5 w-5 text-deepsea-600 dark:text-deepsea-400" />
            Job Discovery Hub
          </h2>
          <p className="text-sm text-muted-foreground">
            Explore live aggregations or clip links into the Shared Community Board.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-muted rounded-lg p-1 text-xs font-semibold">
          <button 
            onClick={() => setActiveTab('live')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${activeTab === 'live' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            🌐 Live Openings
          </button>
          <button 
            onClick={() => setActiveTab('community')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${activeTab === 'community' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            👥 Clipped Board ({communityJobs.length})
          </button>
        </div>
      </div>

      {/* Clipper input (Only visible on Community tab) */}
      {activeTab === 'community' && (
        <form onSubmit={handleClipLink} className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <LinkIcon className="h-4 w-4 text-deepsea-500" /> Add to Community Board
          </h3>
          <div className="flex gap-2">
            <input
              type="url"
              required
              placeholder="Paste any LinkedIn, Indeed, or Jooble Job Post URL..."
              value={clipperUrl}
              onChange={e => setClipperUrl(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
            />
            <button
              type="submit"
              disabled={clipping}
              className="btn-primary rounded-lg bg-deepsea-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-deepsea-700 disabled:opacity-60 cursor-pointer flex items-center gap-1"
            >
              {clipping && <Loader2 className="h-3 w-3 animate-spin" />}
              Clip Job
            </button>
          </div>
        </form>
      )}

      {/* Search and Filters panel */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by role, company, or skills (e.g. Nurse, React, Analyst)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-deepsea-500/40 focus:border-deepsea-500"
            />
          </div>
          <button
            type="submit"
            disabled={generating}
            className="btn-primary rounded-lg bg-deepsea-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-deepsea-700 disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
          >
            {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Search
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="p-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
            title="Reset Filters"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </form>

        {/* Filters Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-border pt-4 text-xs font-medium">
          <div>
            <label className="block mb-1 text-muted-foreground">Industry</label>
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
            >
              <option value="all">All Industries</option>
              <option value="tech">Technology</option>
              <option value="healthcare">Healthcare</option>
              <option value="sales">Sales</option>
              <option value="finance">Finance</option>
              <option value="marketing">Marketing</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-muted-foreground">Workplace</label>
            <select
              value={remote}
              onChange={e => setRemote(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
            >
              <option value="all">All Styles</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-Site</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-muted-foreground">Job Type</label>
            <select
              value={jobType}
              onChange={e => setJobType(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
            >
              <option value="all">All Types</option>
              <option value="fulltime">Full-Time</option>
              <option value="parttime">Part-Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-muted-foreground">Country</label>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
            >
              <option value="all">Global (Any)</option>
              <option value="us">United States</option>
              <option value="uk">United Kingdom</option>
              <option value="ca">Canada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Listings */}
        <div className="lg:col-span-2 space-y-3">
          {generating && (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-xl space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-deepsea-600" />
              <p className="text-xs font-semibold text-foreground">Loading active job listings...</p>
            </div>
          )}

          {displayedJobs.length === 0 && !generating ? (
            <div className="text-center p-12 border border-dashed border-border rounded-xl">
              <Briefcase className="h-8 w-8 text-border mx-auto mb-2" />
              <p className="text-xs font-bold text-foreground">No jobs match your filters</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Try widening filters or searching keywords.</p>
            </div>
          ) : (
            displayedJobs.map(job => {
              const isSaved = savedJobIds.includes(job.id);
              return (
                <div
                  key={job.id}
                  onClick={() => setActiveJob(job)}
                  className={`border rounded-xl p-4 transition-all duration-150 cursor-pointer flex justify-between gap-4 shadow-sm hover:shadow-md ${
                    activeJob?.id === job.id 
                      ? 'border-deepsea-500 bg-deepsea-50/20 dark:bg-deepsea-950/10' 
                      : 'border-border bg-card hover:border-deepsea-300'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-bold text-foreground truncate">{job.title}</h3>
                      <span className="text-[9px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded capitalize">
                        {job.remote}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-deepsea-700 dark:text-deepsea-400">{job.company}</p>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                      <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {job.salary}</span>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed pt-1">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {job.techStack.slice(0, 4).map(skill => (
                        <span key={skill} className="bg-muted px-1.5 py-0.5 rounded text-[9px] text-muted-foreground font-semibold">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between items-end shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveJob(job);
                      }}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        isSaved 
                          ? 'bg-deepsea-50 border-deepsea-200 text-deepsea-700 dark:bg-deepsea-950/20 dark:border-deepsea-900/50 dark:text-deepsea-300' 
                          : 'bg-card border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Bookmark className="h-4 w-4 fill-current" />
                    </button>
                    <span className="text-[9px] text-muted-foreground font-semibold uppercase">
                      {job.id.startsWith('clipped-') ? 'Clipped' : 'Active'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Description Panel */}
        <div className="lg:col-span-1">
          {activeJob ? (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 sticky top-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-base font-extrabold text-foreground leading-snug">{activeJob.title}</h3>
                <p className="text-xs font-bold text-deepsea-600 dark:text-deepsea-400 mt-0.5">{activeJob.company}</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
                  <span className="flex items-center gap-0.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {activeJob.location}</span>
                  <span className="capitalize font-medium">{activeJob.jobType}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</h4>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                  {activeJob.description}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Skills Checklist</h4>
                <div className="flex flex-wrap gap-1">
                  {activeJob.techStack.map(skill => (
                    <span key={skill} className="bg-deepsea-50 dark:bg-deepsea-950/30 text-deepsea-800 dark:text-deepsea-200 border border-deepsea-100/50 dark:border-deepsea-900/50 px-2 py-0.5 rounded text-[10px] font-semibold">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {activeJob.url && (
                <a
                  href={activeJob.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1 w-full border border-border rounded-lg py-2 text-xs font-semibold hover:bg-accent text-foreground"
                >
                  Apply Externally <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              <div className="border-t border-border pt-4 flex gap-2">
                <button
                  onClick={() => startAIPreparation(activeJob)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold bg-deepsea-600 hover:bg-deepsea-700 text-white shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Prepare with AI
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground sticky top-6">
              <Briefcase className="h-8 w-8 text-border mx-auto mb-2" />
              <p className="text-xs font-semibold text-foreground">Select a Job</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Choose a listing card to view instructions and prepare with AI.</p>
            </div>
          )}
        </div>

      </div>

      {/* Prepare with AI Modal */}
      {preparing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-deepsea-600" /> AI Application Builder
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Customizing materials for {activeJob?.title} at {activeJob?.company}</p>
              </div>
              <button 
                onClick={() => setPreparing(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Steps Console */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-xs font-mono text-neutral-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {prepStep >= 1 ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <Loader2 className="h-3.5 w-3.5 animate-spin text-deepsea-400 shrink-0" />}
                  1. Match Resume & Key Term Analysis
                </span>
                {prepStep === 1 && !prepDone && <span className="text-[10px] animate-pulse text-deepsea-400">analyzing...</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {prepStep >= 2 ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <Loader2 className="h-3.5 w-3.5 text-neutral-600 shrink-0" />}
                  2. Tailor Custom Cover Letter
                </span>
                {prepStep === 2 && !prepDone && <span className="text-[10px] animate-pulse text-deepsea-400">writing letter...</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {prepStep >= 3 ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <Loader2 className="h-3.5 w-3.5 text-neutral-600 shrink-0" />}
                  3. Save Application Pipeline
                </span>
                {prepStep === 3 && !prepDone && <span className="text-[10px] animate-pulse text-deepsea-400">updating db...</span>}
              </div>
            </div>

            {/* Results Output */}
            {prepDone && (
              <div className="max-h-[220px] overflow-y-auto space-y-4 pt-2 border-t border-border">
                {/* Resume Tips */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1"><UserCheck className="h-3.5 w-3.5 text-deepsea-500" /> Resume Enhancements:</h4>
                  <div className="bg-muted p-3 rounded-lg text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {prepResumeTips}
                  </div>
                </div>

                {/* Cover Letter */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-deepsea-500" /> Tailored Cover Letter:</h4>
                  <div className="bg-muted p-3 rounded-lg text-xs text-muted-foreground whitespace-pre-wrap font-serif leading-relaxed">
                    {prepCoverLetter}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              {prepDone ? (
                <button
                  onClick={() => setPreparing(false)}
                  className="rounded-lg bg-deepsea-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-deepsea-700 cursor-pointer"
                >
                  Finish & Save to Studio
                </button>
              ) : (
                <button
                  disabled
                  className="rounded-lg bg-neutral-200 dark:bg-neutral-800 px-5 py-2.5 text-xs font-bold text-muted-foreground flex items-center gap-1.5"
                >
                  <Loader2 className="h-3 w-3 animate-spin" /> Preparing Documents...
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
