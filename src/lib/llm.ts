export interface LLMConfig {
  provider: 'sandbox' | 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'openrouter' | 'nvidia' | 'local';
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
}

export async function streamChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  config: LLMConfig,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: any) => void
): Promise<void> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, config }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = `Server responded with ${response.status}`;
      try {
        const parsed = JSON.parse(errText);
        errorMsg = parsed.error || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No readable stream available in response.');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (!trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (delta) {
            onChunk(delta);
          }
        } catch {
          // Partial JSON chunk, ignore and let buffering combine it
        }
      }
    }
    onDone();
  } catch (err: any) {
    onError(err);
  }
}

export async function testConnection(config: LLMConfig): Promise<{ success: boolean; message: string }> {
  try {
    const testMessages = [{ role: 'user' as const, content: 'Ping connection test. Reply with word SUCCESS' }];
    const testConfig = { ...config, maxTokens: 10, temperature: 0.1 };

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: testMessages, config: testConfig }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = 'Connection failed';
      try {
        const parsed = JSON.parse(errText);
        errorMsg = parsed.error || errorMsg;
      } catch {}
      return { success: false, message: errorMsg };
    }

    // Try reading one chunk to ensure data flows
    const reader = response.body?.getReader();
    if (reader) {
      const { value } = await reader.read();
      reader.releaseLock();
      if (!value) {
        return { success: false, message: 'Connection returned empty payload' };
      }
    }

    return { success: true, message: 'Connected and authenticated successfully!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error' };
  }
}
export const AVAILABLE_MODELS: Record<string, string[]> = {
  sandbox: ['IpHire Sandbox Expert'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'o1-mini', 'gpt-4-turbo'],
  anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-20240229'],
  gemini: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  deepseek: ['deepseek-chat', 'deepseek-coder'],
  openrouter: ['google/gemini-2.0-flash-exp:free', 'meta-llama/llama-3.3-70b-instruct', 'deepseek/deepseek-chat'],
  nvidia: ['meta/llama-3.3-70b-instruct', 'meta/llama-3.1-405b-instruct', 'mistralai/mistral-large-2-instruct', 'deepseek-ai/deepseek-r1', 'google/gemma-2-27b-it', 'nvidia/llama-3.1-nemotron-70b-instruct'],
  local: ['localhost:11434 (Ollama)', 'localhost:1234 (LM Studio)']
};
