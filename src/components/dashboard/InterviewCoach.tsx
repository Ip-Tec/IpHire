'use client';

import React, { useState, useEffect } from 'react';
import { dbManager } from '@/lib/db';
import { streamChat } from '@/lib/llm';
import { MessageSquare, ShieldAlert, Sparkles, Loader2, Play, Award, Code, Compass, HelpCircle, Mic, MicOff, Volume2 } from 'lucide-react';

type CoachMode = 'hr' | 'tech' | 'coding' | 'mock';

export const InterviewCoach: React.FC = () => {
  const [mode, setMode] = useState<CoachMode>('hr');
  const [roleTitle, setRoleTitle] = useState('Frontend Developer');
  const [company, setCompany] = useState('Stripe');
  
  // Interactive Mock Interview states
  const [mockActive, setMockActive] = useState(false);
  const [mockHistory, setMockHistory] = useState<{ role: 'interviewer' | 'candidate'; text: string }[]>([]);
  const [candidateInput, setCandidateInput] = useState('');
  const [mockGenerating, setMockGenerating] = useState(false);

  // Q&A / Review states
  const [question, setQuestion] = useState('');
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [answerInput, setAnswerInput] = useState('');
  const [reviewResult, setReviewResult] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Voice Mode states
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsSupported] = useState(typeof window !== 'undefined' && 'speechSynthesis' in window);
  const [srSupported] = useState(typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window));

  const speak = (text: string) => {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ''));
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const startListening = (onResult: (transcript: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    setIsListening(true);
    recognition.start();
  };

  // Pre-configured coding challenge template
  const defaultCodingPrompt = `Write a function in JavaScript/TypeScript that takes an array of numbers and returns the second largest number. Avoid using built-in sort libraries.
Example input: [12, 35, 1, 10, 34, 1]
Expected output: 34`;

  useEffect(() => {
    if (mode === 'coding') {
      setAnswerInput(`function getSecondLargest(arr) {
  // Write your code here
  
}`);
    } else {
      setAnswerInput('');
    }
    setQuestion('');
    setReviewResult('');
    setMockActive(false);
    setMockHistory([]);
  }, [mode]);

  // Trigger next question (HR/Tech Q&A)
  const handleFetchQuestion = async () => {
    setLoadingQuestion(true);
    setQuestion('');
    setReviewResult('');
    setAnswerInput('');

    const config = await dbManager.getSetting('llm_config', { provider: 'sandbox' });
    const prompt = `Generate ONE realistic ${mode === 'hr' ? 'HR behavioral' : 'technical'} interview question for a ${roleTitle} position at ${company}. 
Just return the question itself inside double quotes. Do not add other chat context.`;

    let accumulated = '';
    try {
      await streamChat(
        [{ role: 'user', content: prompt }],
        config as any,
        (chunk) => {
          accumulated += chunk;
          setQuestion(accumulated);
        },
        () => {
          setLoadingQuestion(false);
        },
        (err) => {
          setQuestion(`Failed to load question: ${err.message}`);
          setLoadingQuestion(false);
        }
      );
    } catch (e: any) {
      setQuestion(`Error: ${e.message}`);
      setLoadingQuestion(false);
    }
  };

  // Submit Answer/Code Review
  const handleSubmitReview = async () => {
    if (!answerInput.trim()) return;
    setReviewing(true);
    setReviewResult('');

    const config = await dbManager.getSetting('llm_config', { provider: 'sandbox' });
    const prompt = mode === 'coding'
      ? `Verify this code submission for the challenge:
Challenge prompt:
${defaultCodingPrompt}

Candidate Code:
${answerInput}

Review syntax correctness, logic flaws, time complexity, and suggest improvements.`
      : `Cross reference my response against the interview question:
Question: ${question}
My Response: ${answerInput}

Grade my response from 1 to 5. Rate impact and STAR framework adherence (for HR), and technical accuracy (for Tech). Provide actionable tips to improve.`;

    let accumulated = '';
    try {
      await streamChat(
        [{ role: 'user', content: prompt }],
        config as any,
        (chunk) => {
          accumulated += chunk;
          setReviewResult(accumulated);
        },
        () => {
          setReviewing(false);
        },
        (err) => {
          setReviewResult(`Evaluation error: ${err.message}`);
          setReviewing(false);
        }
      );
    } catch (e: any) {
      setReviewResult(`Error triggering AI review: ${e.message}`);
      setReviewing(false);
    }
  };

  // --- Mock Interview Simulator ---
  const handleStartMock = async () => {
    setMockActive(true);
    setMockHistory([]);
    setMockGenerating(true);

    const config = await dbManager.getSetting('llm_config', { provider: 'sandbox' });
    const prompt = `Act as an interviewer for a ${roleTitle} role at ${company}.
Welcomes the candidate warmly, introduces yourself, and asks the FIRST question. Keep it concise (under 2 sentences).`;

    let accumulated = '';
    try {
      await streamChat(
        [{ role: 'user', content: prompt }],
        config as any,
        (chunk) => {
          accumulated += chunk;
        },
        () => {
          const greeting = accumulated;
          setMockHistory([{ role: 'interviewer', text: greeting }]);
          setMockGenerating(false);
          if (voiceMode) speak(greeting);
        },
        (err) => {
          setMockHistory([{ role: 'interviewer', text: `Connection failed: ${err.message}` }]);
          setMockGenerating(false);
        }
      );
    } catch (e: any) {
      setMockHistory([{ role: 'interviewer', text: `Error starting session: ${e.message}` }]);
      setMockGenerating(false);
    }
  };

  const handleSendMockResponse = async () => {
    const text = candidateInput.trim();
    if (!text || mockGenerating) return;

    setCandidateInput('');
    const updatedHistory = [...mockHistory, { role: 'candidate' as const, text }];
    setMockHistory(updatedHistory);
    setMockGenerating(true);

    const config = await dbManager.getSetting('llm_config', { provider: 'sandbox' });
    
    // Construct prompt containing previous interview context
    const isSessionClosing = updatedHistory.filter(h => h.role === 'interviewer').length >= 3;
    const prompt = isSessionClosing
      ? `We have reached the end of the interview. Review our chat history:
${updatedHistory.map(h => `${h.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${h.text}`).join('\n')}

Provide a final Assessment Evaluation report card. Rate communication, tech alignment, and score out of 100.`
      : `Context: You are interviewing a candidate for a ${roleTitle} position at ${company}.
Chat history:
${updatedHistory.map(h => `${h.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${h.text}`).join('\n')}

Read the candidate's last answer, acknowledge briefly, and ask the next follow-up question. Keep it under 2 sentences.`;

    let accumulated = '';
    try {
      await streamChat(
        [{ role: 'user', content: prompt }],
        config as any,
        (chunk) => {
          accumulated += chunk;
        },
        async () => {
          const finalHistory = [...updatedHistory, { role: 'interviewer' as const, text: accumulated }];
          setMockHistory(finalHistory);
          setMockGenerating(false);
          if (voiceMode) speak(accumulated);
        },
        (err) => {
          setMockHistory([...updatedHistory, { role: 'interviewer', text: `Session interrupted: ${err.message}` }]);
          setMockGenerating(false);
        }
      );
    } catch (e: any) {
      setMockHistory([...updatedHistory, { role: 'interviewer', text: `Error: ${e.message}` }]);
      setMockGenerating(false);
    }
  };

  const handleCloseMock = () => {
    setMockActive(false);
    setMockHistory([]);
    window.speechSynthesis?.cancel();
    setIsListening(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <MessageSquare className="h-5 w-5 text-deepsea-600 dark:text-deepsea-400" />
          AI Interview Coach
        </h2>
        <p className="text-sm text-muted-foreground">
          Drill technical questions, behavioral scenarios, coding challenges, and run full interactive mock interviews.
        </p>
      </div>

      {/* Mode Selectors */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {(['hr', 'tech', 'coding', 'mock'] as CoachMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
              mode === m 
                ? 'bg-deepsea-600 border-deepsea-600 text-white' 
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {m === 'hr' && <><HelpCircle className="h-3.5 w-3.5 inline mr-1" /> HR Drill</>}
            {m === 'tech' && <><Compass className="h-3.5 w-3.5 inline mr-1" /> Technical Q&A</>}
            {m === 'coding' && <><Code className="h-3.5 w-3.5 inline mr-1" /> Coding / Tech Challenge</>}
            {m === 'mock' && <><Sparkles className="h-3.5 w-3.5 inline mr-1" /> Mock Interview</>}
          </button>
        ))}
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Config Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3.5">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1"><Play className="h-4 w-4" /> Role Profile</p>
            
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">Target Position</label>
              <input
                type="text"
                placeholder="e.g. Frontend Engineer, Product Manager"
                value={roleTitle}
                onChange={e => setRoleTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">Target Company</label>
              <input
                type="text"
                placeholder="e.g. Stripe, Mayo Clinic"
                value={company}
                onChange={e => setCompany(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
              />
            </div>

            {mode === 'mock' && !mockActive && (
              <button
                onClick={handleStartMock}
                className="w-full flex items-center justify-center gap-1 rounded-lg bg-deepsea-600 py-2.5 text-xs font-semibold text-white hover:bg-deepsea-700 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="h-4 w-4" /> Start Mock Interview
              </button>
            )}

            {mode !== 'mock' && (
              <button
                onClick={handleFetchQuestion}
                disabled={loadingQuestion}
                className="w-full flex items-center justify-center gap-1 rounded-lg bg-deepsea-600 py-2.5 text-xs font-semibold text-white hover:bg-deepsea-700 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
              >
                {loadingQuestion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {mode === 'coding' ? 'Load Challenge' : 'Load Random Question'}
              </button>
            )}
          </div>
        </div>

        {/* Right Active Training Panel */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* MOCK INTERVIEW MODE VIEW */}
          {mode === 'mock' && (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden min-h-[480px] flex flex-col justify-between">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-deepsea-600" />
                  Live Simulator
                </span>
                <div className="flex items-center gap-2">
                  {(ttsSupported || srSupported) && (
                    <button
                      onClick={() => setVoiceMode(v => !v)}
                      title={voiceMode ? 'Disable Voice Mode' : 'Enable Voice Mode'}
                      className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border transition-all cursor-pointer ${
                        voiceMode
                          ? 'bg-deepsea-50 border-deepsea-200 text-deepsea-700 dark:bg-deepsea-950/20 dark:border-deepsea-900/50 dark:text-deepsea-300'
                          : 'border-border text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      <Volume2 className="h-3 w-3" /> {voiceMode ? 'Voice ON' : 'Voice OFF'}
                    </button>
                  )}
                  {mockActive && (
                    <button
                      onClick={handleCloseMock}
                      className="text-[10px] bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300 border border-red-200/50 rounded px-2 py-0.5 hover:bg-red-100 cursor-pointer"
                    >
                      Terminate Session
                    </button>
                  )}
                </div>
              </div>

              {/* Chat flow window */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[360px] min-h-[300px]">
                {mockActive ? (
                  mockHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex ${item.role === 'candidate' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        item.role === 'candidate'
                          ? 'bg-deepsea-600 text-white'
                          : 'bg-muted/70 text-foreground border border-border/50'
                      }`}>
                        {item.role === 'interviewer' && item.text.includes('Evaluation') ? (
                          <div className="prose dark:prose-invert">
                            {item.text.split('\n').map((line, i) => (
                              <p key={i} className="mt-1">{line}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{item.text}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground space-y-2">
                    <MessageSquare className="h-10 w-10 text-border" />
                    <p className="text-sm font-semibold text-foreground">Interactive Simulation Ready</p>
                    <p className="text-xs max-w-xs leading-relaxed">Click "Start Mock Interview" in the panel to launch a conversational 4-stage AI interview simulation.</p>
                  </div>
                )}
                {mockGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-muted/50 rounded-xl px-3.5 py-1.5 border border-border/40 text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Interviewer thinking...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              {mockActive && (
                <div className="p-3 border-t border-border bg-muted/10 flex gap-2">
                  {srSupported && voiceMode && (
                    <button
                      onClick={() => startListening(t => setCandidateInput(t))}
                      disabled={isListening || mockGenerating}
                      title="Speak your answer"
                      className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-all cursor-pointer shrink-0 ${
                        isListening
                          ? 'bg-red-500 border-red-600 text-white animate-pulse'
                          : 'bg-card border-border text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  )}
                  <input
                    type="text"
                    placeholder={voiceMode && srSupported ? "Press mic or type your response..." : "Type your response to the interviewer..."}
                    value={candidateInput}
                    onChange={e => setCandidateInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMockResponse()}
                    disabled={mockGenerating}
                    className="flex-grow rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                  />
                  <button
                    onClick={handleSendMockResponse}
                    disabled={mockGenerating}
                    className="rounded-lg bg-deepsea-600 px-4 text-xs font-semibold text-white hover:bg-deepsea-700 cursor-pointer"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Q&A / CODING CHALLENGE DRIVER VIEW */}
          {mode !== 'mock' && (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col min-h-[480px]">
              
              {/* Header */}
              <div className="border-b border-border bg-muted/30 px-4 py-2.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Practice Board
                </span>
              </div>

              {/* Content Panel */}
              <div className="flex-1 p-4 space-y-4">
                
                {/* Active Question / Prompt Box */}
                {(question || mode === 'coding') && (
                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-1.5">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                      <HelpCircle className="h-4 w-4 text-deepsea-600" />
                      {mode === 'coding' ? 'Coding Challenge Prompt' : 'Question Prompt'}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-medium">
                      {mode === 'coding' ? defaultCodingPrompt : question.replace(/"/g, '')}
                    </p>
                  </div>
                )}

                {/* Answer Inputs Textarea */}
                {(question || mode === 'coding') && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-muted-foreground">
                      {mode === 'coding' ? 'Type your code solution' : 'Type your answer response'}
                    </label>
                    <textarea
                      value={answerInput}
                      onChange={e => setAnswerInput(e.target.value)}
                      placeholder={mode === 'coding' ? '// TypeScript/JavaScript code...' : 'Enter your verbal STAR-method response...'}
                      className={`w-full rounded-xl border border-border bg-background p-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500 h-40 resize-none ${
                        mode === 'coding' ? 'font-mono' : 'font-sans'
                      }`}
                    />
                    <button
                      onClick={handleSubmitReview}
                      disabled={reviewing || !answerInput.trim()}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-deepsea-600 px-4 py-2 text-xs font-semibold text-white hover:bg-deepsea-700 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
                    >
                      {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                      {reviewing ? 'Analyzing response...' : 'Submit to AI Coach Review'}
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!question && mode !== 'coding' && (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                    <Compass className="h-10 w-10 text-border mb-2" />
                    <p className="text-sm font-semibold text-foreground">Practice Deck Idle</p>
                    <p className="text-xs max-w-xs mt-0.5">Click "Load Random Question" in the left config panel to pull a specialized practice prompt.</p>
                  </div>
                )}

                {/* Evaluation Feedback report */}
                {reviewResult && (
                  <div className="border-t border-border pt-4 mt-2 space-y-2">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                      <Award className="h-4 w-4 text-deepsea-600" />
                      AI Coach Feedback Report
                    </h4>
                    <div className="p-3.5 border border-border/50 bg-muted/10 rounded-xl text-xs text-muted-foreground leading-relaxed h-44 overflow-y-auto font-sans">
                      {reviewResult.split('\n').map((line, idx) => (
                        <p key={idx} className="mt-1">{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
