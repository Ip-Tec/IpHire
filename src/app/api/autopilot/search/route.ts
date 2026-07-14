import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/tidb";
import crypto from "crypto";

async function getChatResponseText(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;

      const dataStr = trimmed.slice(5).trim();
      if (dataStr === "[DONE]") break;

      try {
        const parsed = JSON.parse(dataStr);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (delta) {
          text += delta;
        }
      } catch {
        // chunk partial, skip
      }
    }
  }
  return text;
}

export async function POST(req: NextRequest) {
  const db = getDbPool();
  const runId = crypto.randomUUID();
  const logs: string[] = [];

  const log = (msg: string) => {
    console.log(`[Autopilot Search] ${msg}`);
    logs.push(`[${new Date().toISOString()}] ${msg}`);
  };

  try {
    log("Starting Auto-Pilot job search run.");
    
    // 1. Fetch user profile, llm config and jooble key from settings
    const [settingsRows]: any = await db.query("SELECT * FROM settings");
    const settingsMap = (settingsRows || []).reduce((acc: any, row: any) => {
      try {
        acc[row.key] = JSON.parse(row.value);
      } catch {
        acc[row.key] = row.value;
      }
      return acc;
    }, {});

    const profile = settingsMap.user_profile || {};
    const llmConfig = settingsMap.llm_config || { provider: "sandbox" };
    const joobleKey = settingsMap.jooble_api_key || process.env.JOOBLE_KEY || "";

    log(`Loaded user profile: ${profile.name || "Default Name"}`);
    log(`Loaded LLM config provider: ${llmConfig.provider}`);

    // 2. Fetch the latest resume
    const [resumeRows]: any = await db.query("SELECT * FROM resumes ORDER BY createdAt DESC LIMIT 1");
    const resume = resumeRows?.[0];
    const resumeContent = resume ? resume.content : "No resume uploaded yet.";
    if (!resume) {
      log("Warning: No resume found. Scoring might be less accurate.");
    } else {
      log(`Using resume: "${resume.name}"`);
    }

    // Insert initial run status
    await db.query(
      "INSERT INTO autopilot_runs (id, status, jobsFound, jobsApplied, logs, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
      [runId, "running", 0, 0, JSON.stringify(logs), Date.now()]
    );

    // 3. Search for jobs
    const keywords = (profile.preferredRoles && profile.preferredRoles.length > 0)
      ? profile.preferredRoles[0]
      : (profile.title || "Software Developer");
    const location = profile.location || "Remote";

    log(`Searching for "${keywords}" in "${location}"`);

    let jobsList: any[] = [];

    // Attempt Jooble search first
    if (joobleKey) {
      log("Using Jooble API key for search");
      try {
        const joobleRes = await fetch(`https://jooble.org/api/v2/jobs/${joobleKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keywords,
            location,
            page: "1"
          })
        });

        if (joobleRes.ok) {
          const joobleData = await joobleRes.json();
          jobsList = (joobleData.jobs || []).map((item: any) => {
            const desc = item.snippet || "";
            const techStack: string[] = [];
            const commonKeywords = [
              "React", "TypeScript", "Next.js", "Tailwind", "JavaScript", "Node.js", "Python", "SQL",
              "Sales", "Marketing", "CRM", "Excel", "RN", "ACLS", "BLS", "Patient Care", "SaaS", "Finance"
            ];
            commonKeywords.forEach(k => {
              if (new RegExp(`\\b${k}\\b`, "i").test(desc)) {
                techStack.push(k);
              }
            });

            return {
              id: `jooble-${item.id}`,
              title: item.title || "Job Opening",
              company: item.company || "Company",
              location: item.location || "Remote",
              salary: item.salary || "$90,000 - $120,000 (Estimated)",
              remote: item.location?.toLowerCase().includes("remote") ? "remote" : "hybrid",
              jobType: "fulltime",
              description: desc.replace(/<[^>]*>/g, ""),
              techStack: techStack.length > 0 ? techStack : ["Communication", "Teamwork"],
              industry: keywords,
              url: item.link || ""
            };
          });
          log(`Jooble search completed. Found ${jobsList.length} jobs.`);
        } else {
          log(`Jooble search failed with status ${joobleRes.status}. Trying fallback search...`);
        }
      } catch (err: any) {
        log(`Jooble search encountered an error: ${err.message}. Trying fallback search...`);
      }
    }

    // Fallback: The Muse API
    if (jobsList.length === 0) {
      log("Executing fallback search via The Muse API");
      try {
        let museCategory = "";
        const catLower = keywords.toLowerCase();
        if (catLower.includes("tech") || catLower.includes("software") || catLower.includes("dev")) {
          museCategory = "Software Engineering";
        } else if (catLower.includes("health") || catLower.includes("nurse") || catLower.includes("medical")) {
          museCategory = "Healthcare";
        } else if (catLower.includes("sales") || catLower.includes("business dev")) {
          museCategory = "Sales";
        } else if (catLower.includes("finance") || catLower.includes("analyst") || catLower.includes("accounting")) {
          museCategory = "Accounting and Finance";
        } else if (catLower.includes("marketing") || catLower.includes("social media")) {
          museCategory = "Marketing";
        }

        let url = "https://www.themuse.com/api/public/jobs?page=1";
        if (museCategory) {
          url += `&category=${encodeURIComponent(museCategory)}`;
        }
        if (location) {
          url += `&location=${encodeURIComponent(location)}`;
        }

        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (res.ok) {
          const data = await res.json();
          jobsList = (data.results || []).map((item: any) => {
            const desc = item.contents || "";
            const techStack: string[] = [];
            const commonKeywords = [
              "React", "TypeScript", "Next.js", "Tailwind", "JavaScript", "Node.js", "Python", "SQL",
              "Sales", "Marketing", "CRM", "Excel", "RN", "ACLS", "BLS", "Patient Care", "SaaS", "Finance"
            ];
            commonKeywords.forEach(k => {
              if (new RegExp(`\\b${k}\\b`, "i").test(desc)) {
                techStack.push(k);
              }
            });

            return {
              id: `muse-${item.id}`,
              title: item.name || "Job Opening",
              company: item.company?.name || "Company",
              location: item.locations?.[0]?.name || "Remote",
              salary: "$90,000 - $120,000 (Estimated)",
              remote: item.locations?.[0]?.name?.toLowerCase().includes("remote") ? "remote" : "hybrid",
              jobType: "fulltime",
              description: desc.replace(/<[^>]*>/g, ""),
              techStack: techStack.length > 0 ? techStack : ["Communication", "Teamwork"],
              industry: keywords,
              url: item.refs?.landing_page || ""
            };
          });
          log(`The Muse search completed. Found ${jobsList.length} jobs.`);
        } else {
          log(`The Muse search failed with status ${res.status}`);
        }
      } catch (err: any) {
        log(`Fallback search error: ${err.message}`);
      }
    }

    if (jobsList.length === 0) {
      log("No jobs found from any source.");
      await db.query("UPDATE autopilot_runs SET status = ?, logs = ? WHERE id = ?", [
        "completed",
        JSON.stringify(logs),
        runId
      ]);
      return NextResponse.json({ success: true, runId, jobsFound: 0 });
    }

    // 4. Filter jobs already evaluated
    const [existingAutopilotJobs]: any = await db.query("SELECT jobId FROM autopilot_jobs");
    const evaluatedIds = new Set((existingAutopilotJobs || []).map((j: any) => j.jobId));
    
    const unexaminedJobs = jobsList.filter(j => !evaluatedIds.has(j.id));
    log(`Filtered out already-evaluated jobs. ${unexaminedJobs.length} new jobs to process.`);

    let matchCount = 0;

    // Process top 5 unexamined jobs to keep duration reasonable
    const jobsToProcess = unexaminedJobs.slice(0, 5);
    log(`Scoring top ${jobsToProcess.length} jobs using AI...`);

    for (const job of jobsToProcess) {
      log(`Evaluating: "${job.title}" at "${job.company}"`);

      let score = 50;
      let reasoning = "Simulated evaluation score in Sandbox/Mock mode.";

      if (llmConfig.provider !== "sandbox" && llmConfig.apiKey) {
        try {
          const chatUrl = new URL("/api/chat", req.url).toString();
          const chatRes = await fetch(chatUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [
                {
                  role: "user",
                  content: `Please evaluate how well this job description matches the candidate's resume/profile.
                  
Candidate Profile:
- Skills: ${JSON.stringify(profile.skills || [])}
- Preferred Roles: ${JSON.stringify(profile.preferredRoles || [])}
- Experience: ${profile.experience || "Not specified"}

Resume content:
${resumeContent}

Job details:
- Title: ${job.title}
- Company: ${job.company}
- Description: ${job.description.slice(0, 1000)}

Your output MUST be a JSON object ONLY on a single line containing exactly:
{"score": <integer from 0 to 100>, "reasoning": "<short sentence matching rationale>"}`
                }
              ],
              config: {
                ...llmConfig,
                temperature: 0.1,
                maxTokens: 150
              }
            })
          });

          if (chatRes.ok && chatRes.body) {
            const rawText = await getChatResponseText(chatRes.body);
            const jsonMatch = rawText.match(/\{.*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              score = typeof parsed.score === "number" ? parsed.score : 50;
              reasoning = parsed.reasoning || "AI analyzed match.";
            } else {
              log(`Failed to parse AI response JSON: "${rawText}"`);
            }
          } else {
            log(`AI chat call failed with status ${chatRes.status}`);
          }
        } catch (err: any) {
          log(`AI scoring error for ${job.title}: ${err.message}`);
        }
      } else {
        // Fallback scoring for Sandbox Mode based on simple keyword search
        let matchScore = 40;
        const lowerDesc = job.description.toLowerCase();
        const lowerTitle = job.title.toLowerCase();
        
        // Boost if title matches candidate's desired role
        const targetRole = keywords.toLowerCase();
        if (lowerTitle.includes(targetRole)) matchScore += 20;

        // Boost for matching skills
        const skills: string[] = profile.skills || [];
        let skillMatches = 0;
        skills.forEach(skill => {
          if (lowerDesc.includes(skill.toLowerCase())) {
            skillMatches++;
            matchScore += 8;
          }
        });
        score = Math.min(matchScore, 100);
        reasoning = `Sandbox analysis: matched ${skillMatches} skill keywords (${skills.filter(s => lowerDesc.includes(s.toLowerCase())).join(", ")}).`;
      }

      log(`Scored: ${score}/100. Reasoning: ${reasoning}`);

      // Save job in saved_jobs first so references work
      await db.query(
        "INSERT INTO saved_jobs (id, title, company, location, salary, remote, jobType, description, techStack, industry, url, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title)",
        [
          job.id,
          job.title,
          job.company,
          job.location,
          job.salary,
          job.remote,
          job.jobType,
          job.description,
          JSON.stringify(job.techStack),
          job.industry,
          job.url || null,
          Date.now()
        ]
      );

      // Save evaluation in autopilot_jobs
      const autoJobId = crypto.randomUUID();
      await db.query(
        "INSERT INTO autopilot_jobs (id, runId, jobId, title, company, score, matchReasoning, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          autoJobId,
          runId,
          job.id,
          job.title,
          job.company,
          score,
          reasoning,
          score >= 75 ? "pending_review" : "skipped", // Auto-recommend jobs with score >= 75
          Date.now()
        ]
      );

      if (score >= 75) {
        matchCount++;
      }
    }

    log(`Autopilot search completed successfully. Found ${matchCount} matches above recommended score threshold.`);

    // 5. Update run status in DB
    await db.query(
      "UPDATE autopilot_runs SET status = ?, jobsFound = ?, logs = ? WHERE id = ?",
      ["completed", matchCount, JSON.stringify(logs), runId]
    );

    return NextResponse.json({
      success: true,
      runId,
      jobsFound: matchCount
    });

  } catch (error: any) {
    log(`Critical run failure: ${error.message}`);
    // Attempt update status
    try {
      await db.query("UPDATE autopilot_runs SET status = ?, logs = ? WHERE id = ?", [
        "failed",
        JSON.stringify(logs),
        runId
      ]);
    } catch {}

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const db = getDbPool();
    
    // Fetch runs history
    const [runs]: any = await db.query(
      "SELECT * FROM autopilot_runs ORDER BY createdAt DESC LIMIT 10"
    );

    // Fetch matched autopilot jobs that are pending review
    const [jobs]: any = await db.query(
      `SELECT aj.*, sj.location, sj.salary, sj.remote, sj.jobType, sj.description, sj.techStack, sj.url 
       FROM autopilot_jobs aj 
       JOIN saved_jobs sj ON aj.jobId = sj.id 
       WHERE aj.status = 'pending_review' 
       ORDER BY aj.score DESC`
    );

    const parsedJobs = (jobs || []).map((j: any) => {
      try {
        j.techStack = JSON.parse(j.techStack);
      } catch {
        j.techStack = [];
      }
      try {
        j.formFields = j.formFields ? JSON.parse(j.formFields) : null;
      } catch {
        j.formFields = null;
      }
      return j;
    });

    const parsedRuns = (runs || []).map((r: any) => {
      try {
        r.logs = JSON.parse(r.logs);
      } catch {
        r.logs = [];
      }
      return r;
    });

    return NextResponse.json({
      success: true,
      runs: parsedRuns,
      jobs: parsedJobs
    });
  } catch (error: any) {
    console.error("Autopilot GET API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

