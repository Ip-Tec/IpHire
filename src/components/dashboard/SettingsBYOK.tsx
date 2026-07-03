'use client';

import React, { useEffect, useState } from 'react';
import { dbManager } from '@/lib/db';
import { testConnection, AVAILABLE_MODELS, LLMConfig } from '@/lib/llm';
import { Key, Sliders, Play, Save, Eye, EyeOff, CheckCircle, AlertTriangle, Loader2, Database, RefreshCw, Cloud } from 'lucide-react';

const PROVIDERS = [
  { value: 'sandbox',     label: 'Sandbox',         desc: 'Simulated · no key needed' },
  { value: 'openai',      label: 'OpenAI',           desc: 'GPT-4o, o1, GPT-4-turbo' },
  { value: 'anthropic',   label: 'Anthropic Claude', desc: 'Claude 3.5 Sonnet/Haiku' },
  { value: 'gemini',      label: 'Google Gemini',    desc: 'Gemini 1.5/2.0' },
  { value: 'deepseek',    label: 'DeepSeek',         desc: 'deepseek-chat, coder' },
  { value: 'nvidia',      label: 'NVIDIA NIM (Free)', desc: 'Llama 3.3, DeepSeek R1, Nemotron' },
  { value: 'openrouter',  label: 'OpenRouter',       desc: 'Many models via one key' },
  { value: 'local',       label: 'Local (Ollama / LM Studio)', desc: 'Run on your machine' },
];

export function SettingsBYOK() {
  const [config, setConfig] = useState<LLMConfig>({
    provider: 'sandbox', model: 'IpHire Sandbox Expert',
    apiKey: '', temperature: 0.7, maxTokens: 2000,
  });
  const [showKey, setShowKey]   = useState(false);
  const [testing, setTesting]   = useState(false);
  const [testResult, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saved, setSaved]       = useState(false);
  const [joobleKey, setJoobleKey] = useState('');
  const [joobleSaved, setJoobleSaved] = useState(false);

  // DB Sync states
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [dbMessage, setDbMessage] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResultMsg, setSyncResultMsg] = useState<{ success: boolean; message: string } | null>(null);
 
  useEffect(() => {
    dbManager.getSetting<LLMConfig>('llm_config', {
      provider: 'sandbox', model: 'IpHire Sandbox Expert', apiKey: '', temperature: 0.7, maxTokens: 2000,
    }).then(setConfig);
    dbManager.getSetting<string>('jooble_api_key', '').then(setJoobleKey);
    checkDbConnection();
  }, []);

  const checkDbConnection = async () => {
    try {
      const res = await fetch('/api/db/sync');
      const data = await res.json();
      if (data.success) {
        setDbConnected(true);
        setDbMessage('Connected to TiDB Cloud (AWS East). Schema initialized.');
      } else {
        setDbConnected(false);
        setDbMessage(data.message || 'Could not reach server database.');
      }
    } catch (e: any) {
      setDbConnected(false);
      setDbMessage(e.message || 'Failed to ping database.');
    }
  };

  const handleSyncCloud = async () => {
    setSyncing(true);
    setSyncResultMsg(null);
    const res = await dbManager.syncCloud();
    setSyncResultMsg(res);
    setSyncing(false);
    if (res.success) {
      // Re-trigger profile update if settings changed
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('profile_updated'));
      }
    }
  };

  const setProvider = (provider: string) => {
    const models = AVAILABLE_MODELS[provider] ?? [];
    setConfig(c => ({ ...c, provider: provider as any, model: models[0] ?? '' }));
    setResult(null);
  };

  const save = async () => {
    await dbManager.setSetting('llm_config', config);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const saveJooble = async () => {
    await dbManager.setSetting('jooble_api_key', joobleKey);
    setJoobleSaved(true); setTimeout(() => setJoobleSaved(false), 2000);
  };

  const test = async () => {
    setTesting(true); setResult(null);
    const res = await testConnection(config);
    setResult(res); setTesting(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">
          BYOK Settings <span className="text-sm font-normal text-muted-foreground ml-1">Bring Your Own Key</span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your own AI API keys. All keys are stored locally in your browser — never sent to our servers.
        </p>
      </div>

      {/* Provider selector */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-5">
        <div>
          <label className="block mb-3 text-sm font-semibold text-foreground">Select AI Provider</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PROVIDERS.map(p => (
              <button key={p.value} onClick={() => setProvider(p.value)}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  config.provider === p.value
                    ? 'border-deepsea-500 bg-deepsea-50 dark:bg-deepsea-950/20'
                    : 'border-border hover:bg-accent'}`}>
                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  config.provider === p.value ? 'border-deepsea-600 bg-deepsea-600' : 'border-border'}`}>
                  {config.provider === p.value && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${config.provider === p.value ? 'text-deepsea-700 dark:text-deepsea-300' : 'text-foreground'}`}>{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div>
          <label className="block mb-1.5 text-sm font-semibold text-foreground">Model</label>
          {config.provider === 'local' ? (
            <input type="text" placeholder="e.g. llama3, mistral, or custom URL"
              value={config.model} onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-deepsea-500/40 focus:border-deepsea-500" />
          ) : (
            <select value={config.model} onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-deepsea-500/40 focus:border-deepsea-500">
              {(AVAILABLE_MODELS[config.provider] ?? []).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>

        {/* API Key */}
        {config.provider !== 'sandbox' && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">API Key</label>
              <button type="button" onClick={() => setShowKey(v => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type={showKey ? 'text' : 'password'} placeholder={config.provider === 'local' ? 'Not required for local models' : `Your ${config.provider} API key`}
                value={config.apiKey} onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-deepsea-500/40 focus:border-deepsea-500" />
            </div>
          </div>
        )}

        {/* Hyperparams */}
        <div className="border-t border-border pt-4 space-y-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sliders className="h-3.5 w-3.5" /> Hyperparameters
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Temperature</span>
                <span className="rounded bg-deepsea-50 dark:bg-deepsea-950/30 px-2 py-0.5 text-xs font-bold text-deepsea-700 dark:text-deepsea-300">{config.temperature}</span>
              </div>
              <input type="range" min="0" max="1.2" step="0.1" value={config.temperature}
                onChange={e => setConfig(c => ({ ...c, temperature: parseFloat(e.target.value) }))}
                className="w-full cursor-pointer accent-deepsea-600" />
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>Focused</span><span>Creative</span>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Max Tokens</span>
                <span className="rounded bg-deepsea-50 dark:bg-deepsea-950/30 px-2 py-0.5 text-xs font-bold text-deepsea-700 dark:text-deepsea-300">{config.maxTokens}</span>
              </div>
              <input type="range" min="256" max="4096" step="128" value={config.maxTokens}
                onChange={e => setConfig(c => ({ ...c, maxTokens: parseInt(e.target.value) }))}
                className="w-full cursor-pointer accent-deepsea-600" />
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>Short</span><span>Long</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 border-t border-border pt-4">
          <button onClick={save}
            className="btn-primary flex items-center gap-2 rounded-xl bg-deepsea-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-deepsea-700 cursor-pointer">
            <Save className="h-4 w-4" />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
          {config.provider !== 'sandbox' && (
            <button onClick={test} disabled={testing}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-60 cursor-pointer transition-all">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 text-deepsea-600 dark:text-deepsea-400" />}
              {testing ? 'Testing…' : 'Test Connection'}
            </button>
          )}
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`flex items-start gap-3 rounded-xl border p-4 ${testResult.success
            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
            : 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20'}`}>
            {testResult.success
              ? <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />}
            <div>
              <p className={`text-sm font-semibold ${testResult.success ? 'text-emerald-900 dark:text-emerald-200' : 'text-red-900 dark:text-red-200'}`}>
                {testResult.success ? 'Connected successfully!' : 'Connection failed'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{testResult.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Jooble Search Integration Card */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Key className="h-4 w-4 text-deepsea-500" /> Jooble Job Board Integration
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enable live postings from Jooble.org by inputting your Jooble API Key. (Get your key at <a href="https://jooble.org/api/about" target="_blank" rel="noreferrer" className="text-deepsea-600 underline font-semibold">Jooble Developer Portal</a>).
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Jooble API Key</label>
          <input
            type="password"
            placeholder="e.g. 50bb-4a5f-8d9e-12345..."
            value={joobleKey}
            onChange={e => setJoobleKey(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-deepsea-500/40 focus:border-deepsea-500"
          />
        </div>

        <div className="flex justify-start">
          <button
            onClick={saveJooble}
            className="btn-primary flex items-center gap-2 rounded-xl bg-deepsea-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-deepsea-700 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {joobleSaved ? 'Saved!' : 'Save Jooble Key'}
          </button>
        </div>
      </div>

      {/* TiDB Cloud Database Integration Card */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Database className="h-4 w-4 text-deepsea-500" /> TiDB Cloud Database Synchronization
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Keep your settings, profile, resumes, chats, and application pipelines securely backed up and synchronized on the cloud.
          </p>
        </div>

        {/* DB Connection Status */}
        <div className={`rounded-lg border p-3 flex items-start gap-2.5 text-xs ${
          dbConnected === null
            ? 'border-border bg-accent/40'
            : dbConnected
              ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/10'
              : 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/10'
        }`}>
          {dbConnected === null ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-0.5" />
          ) : dbConnected ? (
            <Cloud className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">TiDB Server Status:</span>
              <span className={`font-semibold uppercase tracking-wider text-[10px] ${
                dbConnected === null ? 'text-muted-foreground' : dbConnected ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
              }`}>
                {dbConnected === null ? 'Checking…' : dbConnected ? 'Online (Active)' : 'Offline / Error'}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 leading-relaxed">{dbMessage}</p>
          </div>
        </div>

        {/* Sync Controls */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex gap-2">
            <button
              onClick={handleSyncCloud}
              disabled={syncing || dbConnected === false}
              className="btn-primary flex items-center gap-2 rounded-xl bg-deepsea-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-deepsea-700 disabled:opacity-50 cursor-pointer"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? 'Synchronizing…' : 'Sync Offline Storage Now'}
            </button>
            <button
              onClick={checkDbConnection}
              disabled={syncing}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent cursor-pointer"
            >
              Retry Connection
            </button>
          </div>

          {syncResultMsg && (
            <div className={`mt-2 flex items-start gap-2.5 rounded-lg border p-3 text-xs ${
              syncResultMsg.success
                ? 'border-emerald-200 bg-emerald-50/35 dark:border-emerald-900/30'
                : 'border-red-200 bg-red-50/35 dark:border-red-900/30'
            }`}>
              {syncResultMsg.success ? (
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-foreground">
                  {syncResultMsg.success ? 'Sync Completed' : 'Sync Interrupted'}
                </p>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">{syncResultMsg.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
        <p className="text-sm font-semibold text-foreground">💡 Tips</p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Sandbox:</strong> No key needed. Great for testing the UI and workflows.</li>
          <li><strong className="text-foreground">OpenAI / Anthropic:</strong> Pay-as-you-go accounts work. Typical career sessions cost under $0.05.</li>
          <li><strong className="text-foreground">Local models:</strong> Start Ollama (<code className="rounded bg-background border border-border px-1 text-xs">ollama run llama3</code>) then select the Local provider above.</li>
          <li><strong className="text-foreground">OpenRouter:</strong> Gives access to many models with a single key, including free tiers.</li>
        </ul>
      </div>
    </div>
  );
}
