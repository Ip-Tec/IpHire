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
  try {
    const db = getDbPool();
    const body = await req.json();
    const { autopilotJobId, action } = body;

    if (!autopilotJobId) {
      return NextResponse.json({ success: false, error: "Missing autopilotJobId" }, { status: 400 });
    }

    // Fetch the autopilot job and associated saved job
    const [autoJobRows]: any = await db.query(
      "SELECT aj.*, sj.description, sj.url as jobUrl, sj.location, sj.salary, sj.remote FROM autopilot_jobs aj JOIN saved_jobs sj ON aj.jobId = sj.id WHERE aj.id = ?",
      [autopilotJobId]
    );

    const autoJob = autoJobRows?.[0];
    if (!autoJob) {
      return NextResponse.json({ success: false, error: "Autopilot job not found" }, { status: 404 });
    }

    if (action === "skip") {
      await db.query("UPDATE autopilot_jobs SET status = 'skipped' WHERE id = ?", [autopilotJobId]);
      return NextResponse.json({ success: true, status: "skipped" });
    }

    if (action === "submit") {
      // 1. Mark as applied
      await db.query("UPDATE autopilot_jobs SET status = 'applied' WHERE id = ?", [autopilotJobId]);

      // 2. Insert into applications
      const appId = crypto.randomUUID();
      await db.query(
        "INSERT INTO applications (id, jobId, title, company, location, salary, remote, status, dateApplied, notes, followUps, jobDesc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          appId,
          autoJob.jobId,
          autoJob.title,
          autoJob.company,
          autoJob.location || "Remote",
          autoJob.salary || "$90,000 - $120,000 (Estimated)",
          autoJob.remote || "remote",
          "applied",
          Date.now(),
          "Applied automatically via Auto-Pilot job application assistant.",
          0, // followUps: false
          autoJob.description
        ]
      );

      // Increment runs count
      await db.query(
        "UPDATE autopilot_runs SET jobsApplied = jobsApplied + 1 WHERE id = ?",
        [autoJob.runId]
      );

      return NextResponse.json({ success: true, status: "applied", applicationId: appId });
    }

    if (action === "draft") {
      // Fetch settings map
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

      // Fetch resume
      const [resumeRows]: any = await db.query("SELECT * FROM resumes ORDER BY createdAt DESC LIMIT 1");
      const resume = resumeRows?.[0];
      const resumeContent = resume ? resume.content : "";

      let formFields: Record<string, string> = {
        fullName: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        linkedin: profile.linkedin || "",
        github: profile.github || "",
        portfolio: profile.portfolio || "",
        expectedSalary: profile.salaryExpectations || "$100,000",
        whyWorkHere: `I am very excited about the opportunity to join the team at ${autoJob.company} as a ${autoJob.title}. Based on my background, I believe I can make an immediate contribution.`,
        coverLetterParagraph: `I am writing to express my interest in the ${autoJob.title} role at ${autoJob.company}. With my experience, I am confident in my ability to help the team succeed.`
      };

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
                  content: `Generate professional application form responses for this candidate for the following job.
                  
Candidate Profile:
- Name: ${profile.name}
- Skills: ${JSON.stringify(profile.skills || [])}
- Experience Level: ${profile.experience || "Not specified"}

Resume content:
${resumeContent}

Job details:
- Title: ${autoJob.title}
- Company: ${autoJob.company}
- Description: ${autoJob.description.slice(0, 1000)}

Your output MUST be a JSON object ONLY on a single line containing exactly these keys:
{
  "whyWorkHere": "<1-2 sentences explain why candidate wants to work at this company based on their profile>",
  "coverLetterParagraph": "<a short professional cover letter opening paragraph (3-4 sentences)>",
  "expectedSalary": "<expected salary from profile or suggested estimated number>"
}`
                }
              ],
              config: {
                ...llmConfig,
                temperature: 0.5,
                maxTokens: 300
              }
            })
          });

          if (chatRes.ok && chatRes.body) {
            const rawText = await getChatResponseText(chatRes.body);
            const jsonMatch = rawText.match(/\{.*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              formFields.whyWorkHere = parsed.whyWorkHere || formFields.whyWorkHere;
              formFields.coverLetterParagraph = parsed.coverLetterParagraph || formFields.coverLetterParagraph;
              formFields.expectedSalary = parsed.expectedSalary || formFields.expectedSalary;
            }
          }
        } catch (err: any) {
          console.error("AI drafting error:", err);
        }
      }

      // Save form fields JSON back to the autopilot job row
      await db.query("UPDATE autopilot_jobs SET formFields = ? WHERE id = ?", [
        JSON.stringify(formFields),
        autopilotJobId
      ]);

      return NextResponse.json({ success: true, formFields });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Autopilot Apply API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
