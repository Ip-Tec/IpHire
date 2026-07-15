import { NextRequest } from 'next/server';

// System prompt that aligns the AI agent as IpHire's career expert
const SYSTEM_PROMPT = `You are Antigravity, the elite Career AI Agent for IpHire. Your goal is to guide the user in securing jobs, polishing resumes, writing cover letters, and passing interviews.
CRITICAL RULES:
1. Keep your answers EXTREMELY concise, friendly, and conversational. Do not write long paragraphs or over-explain.
2. If the user asks about setting up their account, giving you their information, or saving details, tell them they can fill out their details in the "My Profile" tab in the dashboard! Let them know that IpHire will save it locally so you (the AI) can use it to auto-fill applications, build their portfolio, and write cover letters. Do NOT say you cannot store information.
3. Use short bullet points only when absolutely necessary.
4. Output any generated documents (resumes/cover letters) in clean Markdown.
5. You have the ability to navigate the user and execute actions in the database. To do this, output a special JSON block EXACTLY on its own line like this:
\`\`\`json
[ACTION: {"type": "NAVIGATE", "target": "resume-studio"}]
\`\`\`
Valid NAVIGATE targets: 'dashboard', 'resume-studio', 'cover-letters', 'job-analyzer', 'job-discovery', 'app-tracker', 'skill-gap', 'interview-coach', 'scheduler', 'profile', 'auto-fill', 'ai-workflows', 'web-builder', 'analytics'.
To update the user's profile metadata, output:
\`\`\`json
[ACTION: {"type": "UPDATE_PROFILE", "payload": {"name": "User Name", "experience": "Senior", "skills": ["React"], "location": "Remote"}}]
\`\`\`
(Only include fields that actually need updating).`;

// Mock text responses for Sandbox Mode
const MOCK_RESPONSES = {
  default: `👋 Welcome to the **IpHire AI Career Sandbox**! 

I'm currently running in **Sandbox Mode** (no API key configured). I can still assist you with career guidance, mock reviews, and workflow simulations! 

Here are some quick things we can do:
1. **Analyze a Resume**: Paste a resume or switch to the **Resume Studio** to run an ATS check.
2. **Review a Job**: Go to the **Job Analyzer** to check alignment with a role.
3. **Draft a Cover Letter**: Generate letters for Enterprise, Startups, or Executive jobs.

*To enable live AI generation, click on **BYOK Settings** in the sidebar and enter your API key.*`,

  resume: `### 📊 Sandbox ATS Resume Analysis

I've analyzed your resume content. Here is a simulated report:

* **Overall ATS Score**: **74/100**
* **Readability**: Excellent (Clean structure)
* **Keyword Matching**: Moderate (Missing key technologies like React Query, Prisma, and Redis)

#### 🔍 Critical Recommendations:
1. **Highlight Projects**: Under your experience section, make sure to detail results quantitatively (e.g., *"improved load times by 30% using caching"*).
2. **Inject Missing Keywords**: Add Tailwind v4 and Next.js App Router explicitly into your Skills index.
3. **Format Layout**: Use the **Modern Executive** template in the Resume Studio for better parsed spacing.

*Tip: Use the **Resume Studio** on the left to edit and apply templates!*`,

  cover: `### ✉️ Generated Cover Letter (Enterprise Style)

Here is a tailored cover letter draft generated based on your profile details:

\`\`\`markdown
[Your Name]
[Your Contact Info]

Dear Hiring Team,

I am writing to express my strong interest in the Software Engineer position. With my background in TypeScript, Next.js, and modern CSS architectures, I am confident in my ability to deliver immediate value to your engineering department.

Throughout my career, I have focused on building scalable, client-first web applications. I pride myself on clean code, responsive layouts, and close collaboration with UI/UX designers to deliver premium user experiences. 

I look forward to discussing how my experience aligns with your upcoming projects. Thank you for your time and consideration.

Sincerely,
[Your Name]
\`\`\`

*Tip: You can export this letter as a PDF or Markdown directly in the **Cover Letter Studio**!*`,

  analyzer: `### 🔍 Sandbox Job Analyzer Report

Based on the job requirements, here is your compatibility breakdown:

* **Role Alignment**: **82% Match**
* **Strengths**: Front-end state management, custom layouts, TypeScript typing, and Next.js App routing.
* **Skill Gaps**: Back-end DB indexing, Redis caching, and CI/CD pipelines.

#### 💡 Action Plan:
- **Resume Adjustments**: Emphasize any Full-stack experience you have.
- **Preparation**: Review SQL query optimization and Redis data structures for the technical interview.
`
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, config, systemPrompt } = body;
    
    const provider = config?.provider || 'sandbox';
    const model = config?.model || '';
    const apiKey = config?.apiKey || '';
    const temp = config?.temperature ?? 0.7;
    const maxTokens = config?.maxTokens ?? 2000;

    // Sandbox / Mock Mode
    if (provider === 'sandbox' || !apiKey) {
      return handleSandboxResponse(messages);
    }

    // Format message history with System Prompt
    const activeSystemPrompt = systemPrompt !== undefined ? systemPrompt : SYSTEM_PROMPT;
    const apiMessages = [
      ...(activeSystemPrompt ? [{ role: 'system', content: activeSystemPrompt }] : []),
      ...messages.map((m: any) => ({
        role: m.role,
        content: m.content
      }))
    ];

    if (provider === 'openai' || provider === 'deepseek' || provider === 'openrouter' || provider === 'nvidia' || provider === 'local') {
      let baseURL = 'https://api.openai.com/v1';
      if (provider === 'deepseek') baseURL = 'https://api.deepseek.com';
      if (provider === 'openrouter') baseURL = 'https://openrouter.ai/api/v1';
      if (provider === 'nvidia') baseURL = 'https://integrate.api.nvidia.com/v1';
      if (provider === 'local') {
        // Ollama or LM Studio local endpoints
        baseURL = model.includes('localhost:11434') || model.includes('ollama')
          ? 'http://localhost:11434/v1'
          : 'http://localhost:1234/v1';
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };

      // OpenRouter requirements
      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://iphire.ai';
        headers['X-Title'] = 'IpHire AI';
      }

      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: provider === 'local' ? (model.replace(/.*?(localhost:\d+|ollama)\/?/i, '') || 'local-model') : model,
          messages: apiMessages,
          temperature: temp,
          max_tokens: maxTokens,
          stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(JSON.stringify({ error: `Provider error: ${errorText}` }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(response.body, {
        headers: { 'Content-Type': 'text/event-stream' }
      });
    }

    if (provider === 'anthropic') {
      // Anthropic does not use standard OpenAI format, map roles accordingly
      const anthropicMessages = messages.map((m: any) => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model,
          system: activeSystemPrompt || '',
          messages: anthropicMessages,
          max_tokens: maxTokens,
          temperature: temp,
          stream: true
        })
      });

      if (!response.ok) {
        const err = await response.text();
        return new Response(JSON.stringify({ error: `Anthropic error: ${err}` }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Convert Anthropic stream events to OpenAI-like stream chunks for front-end compatibility
      const stream = transformAnthropicStream(response.body!);
      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' }
      });
    }

    if (provider === 'gemini') {
      // Google Gemini content model structure
      const geminiContents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      // Add system instruction inside contents (for older models) or header (newer)
      if (activeSystemPrompt) {
        geminiContents.unshift({
          role: 'user',
          parts: [{ text: `INSTRUCTION: ${activeSystemPrompt}` }]
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiContents,
            generationConfig: {
              temperature: temp,
              maxOutputTokens: maxTokens
            }
          })
        }
      );

      if (!response.ok) {
        const err = await response.text();
        return new Response(JSON.stringify({ error: `Gemini error: ${err}` }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const stream = transformGeminiStream(response.body!);
      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' }
      });
    }

    return new Response(JSON.stringify({ error: `Unsupported provider: ${provider}` }), { status: 400 });
  } catch (err: any) {
    console.error('Error handling chat API request:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// Sandbox streaming generator
function handleSandboxResponse(messages: any[]) {
  const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
  let responseText = MOCK_RESPONSES.default;
  
  if (lastMsg.includes('resume') || lastMsg.includes('cv') || lastMsg.includes('ats')) {
    responseText = MOCK_RESPONSES.resume;
  } else if (lastMsg.includes('cover letter') || lastMsg.includes('coverletter') || lastMsg.includes('enterprise')) {
    responseText = MOCK_RESPONSES.cover;
  } else if (lastMsg.includes('analyze') || lastMsg.includes('job') || lastMsg.includes('score')) {
    responseText = MOCK_RESPONSES.analyzer;
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Stream in small blocks to simulate actual typing speed
      const words = responseText.split(' ');
      let currentIdx = 0;
      
      const interval = setInterval(() => {
        if (currentIdx >= words.length) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          clearInterval(interval);
          return;
        }
        
        // Emulate chunks
        const chunkText = words[currentIdx] + ' ';
        const chunk = {
          choices: [
            {
              delta: {
                content: chunkText
              }
            }
          ]
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        currentIdx++;
      }, 35); // 35ms per word
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}

// Transform Anthropic events stream to OpenAI compatible client chunk formatting
function transformAnthropicStream(rawStream: ReadableStream) {
  const reader = rawStream.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data:')) continue;
          try {
            const dataStr = line.slice(5).trim();
            if (dataStr === '[DONE]') continue;
            
            const dataObj = JSON.parse(dataStr);
            let textDelta = '';
            
            if (dataObj.type === 'content_block_delta' && dataObj.delta?.text) {
              textDelta = dataObj.delta.text;
            } else if (dataObj.type === 'message_start' && dataObj.message?.content?.[0]?.text) {
              textDelta = dataObj.message.content[0].text;
            }

            if (textDelta) {
              const formattedChunk = {
                choices: [{ delta: { content: textDelta } }]
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(formattedChunk)}\n\n`));
            }
          } catch (e) {
            // Ignore parsing errors of partial lines
          }
        }
      }
    }
  });
}

// Transform Google Gemini streaming payload structures
function transformGeminiStream(rawStream: ReadableStream) {
  const reader = rawStream.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Gemini returns JSON chunks separated by commas in a stream list or raw strings
        // We look for parts: [{"text": "..."}] pattern in JSON blocks
        let match;
        let lastIndex = 0;
        // Regex to pull texts from gemini chunks
        const regex = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
        while ((match = regex.exec(buffer)) !== null) {
          try {
            // Unescape Unicode & JSON chars
            const textDelta = JSON.parse(`"${match[1]}"`);
            const formattedChunk = {
              choices: [{ delta: { content: textDelta } }]
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(formattedChunk)}\n\n`));
            lastIndex = regex.lastIndex;
          } catch {
            // parsing fallback
          }
        }
        
        // Remove processed matches from buffer to prevent quadratic duplication
        buffer = buffer.slice(lastIndex);
        
        // Keep buffer small to avoid memory overflow from malformed data
        if (buffer.length > 5000) {
          buffer = buffer.slice(-2000);
        }
      }
    }
  });
}
