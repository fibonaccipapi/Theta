import React, { useState } from 'react';
import { BeliefAnalysis } from '../types';
import { analyzeAdaptiveBeliefs } from '../services/gemini';

interface OnboardingAdaptiveProps {
  onComplete: (analysis: BeliefAnalysis) => void;
  onBack: () => void;
}

const OnboardingAdaptive: React.FC<OnboardingAdaptiveProps> = ({ onComplete, onBack }) => {
  const [step, setStep] = useState(0);
  const [issue, setIssue] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!issue.trim()) return;
    setIsGeneratingQuestion(true);
    setError(null);
    try {
      // For the first question, we just send the issue
      const nextQ = await analyzeAdaptiveBeliefs(issue, []);
      if (typeof nextQ === 'string') {
        setCurrentQuestion(nextQ);
        setStep(1);
      } else {
        // If it somehow returns the analysis immediately (unlikely for first step)
        onComplete(nextQ);
      }
    } catch (error) {
      console.error(error);
      setError("Neural mapping failed. The connection to the core intelligence was interrupted.");
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    const newAnswers = [...answers, { question: currentQuestion, answer }];
    setAnswers(newAnswers);
    setError(null);
    
    if (newAnswers.length >= 3) {
      setIsAnalyzing(true);
      try {
        const analysis = await analyzeAdaptiveBeliefs(issue, newAnswers);
        if (typeof analysis !== 'string') {
          onComplete(analysis);
        }
      } catch (error) {
        console.error(error);
        setError("Neural mapping failed. The final synthesis was interrupted.");
        setIsAnalyzing(false);
      }
    } else {
      setIsGeneratingQuestion(true);
      try {
        const nextQ = await analyzeAdaptiveBeliefs(issue, newAnswers);
        if (typeof nextQ === 'string') {
          setCurrentQuestion(nextQ);
        }
      } catch (error) {
        console.error(error);
        setError("Neural mapping failed. The next diagnostic probe could not be generated.");
      } finally {
        setIsGeneratingQuestion(false);
      }
    }
  };

  const handleRetry = async () => {
    setError(null);
    if (step === 0) {
      handleStart();
    } else if (answers.length >= 3) {
      setIsAnalyzing(true);
      try {
        const analysis = await analyzeAdaptiveBeliefs(issue, answers);
        if (typeof analysis !== 'string') {
          onComplete(analysis);
        }
      } catch (error) {
        console.error(error);
        setError("Neural mapping failed. The final synthesis was interrupted.");
        setIsAnalyzing(false);
      }
    } else {
      setIsGeneratingQuestion(true);
      try {
        const nextQ = await analyzeAdaptiveBeliefs(issue, answers);
        if (typeof nextQ === 'string') {
          setCurrentQuestion(nextQ);
        }
      } catch (error) {
        console.error(error);
        setError("Neural mapping failed. The next diagnostic probe could not be generated.");
      } finally {
        setIsGeneratingQuestion(false);
      }
    }
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-16 h-16 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-8" />
        <h2 className="text-xl font-display text-slate-300 tracking-widest uppercase">Synthesizing Neural Map...</h2>
        <p className="text-slate-500 mt-4 font-mono text-xs animate-pulse">Extracting Subconscious Truths</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-xl mx-auto text-center px-6">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-8">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-2xl font-display font-bold text-white mb-4 uppercase tracking-widest">Neural Link Interrupted</h2>
        <p className="text-slate-400 mb-12 font-light leading-relaxed">{error}</p>
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <button 
            onClick={handleRetry}
            className="neon-button-blue flex-1"
          >
            RETRY PROBE
          </button>
          <button 
            onClick={() => { setError(null); onBack(); }}
            className="px-10 py-4 rounded-full border border-white/10 text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-white/5 transition-all text-slate-500"
          >
            ABORT MISSION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-2xl mx-auto px-6 pb-20 relative">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 tracking-tight">
          Adaptive <span className="neon-text-blue">Mapping.</span>
        </h2>
        <p className="text-slate-500 tracking-widest uppercase text-[10px]">A targeted diagnostic tailored to your specific issue</p>
      </div>

      {step === 0 ? (
        <div className="w-full">
          <div className="glass-panel p-10 rounded-3xl border border-white/5 mb-8">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-blue-400 font-bold mb-6">State Your Core Issue</h3>
            <textarea
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="e.g., I struggle to charge what I'm worth in my business..."
              className="w-full bg-transparent border-none text-xl text-white placeholder:text-slate-700 focus:ring-0 resize-none h-32 font-light"
            />
          </div>
          <button
            onClick={handleStart}
            disabled={isGeneratingQuestion || !issue.trim()}
            className="neon-button-blue w-full"
          >
            {isGeneratingQuestion ? 'INITIALIZING...' : 'START ADAPTIVE DIAGNOSIS'}
          </button>
        </div>
      ) : (
        <div className="w-full">
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold">
                Adaptive Probe <span className="text-blue-400 ml-2">{answers.length + 1} / 3</span>
              </p>
            </div>
            <div className="h-[2px] bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                style={{ width: `${((answers.length + 1) / 3) * 100}%` }}
              />
            </div>
          </div>

          <div className="relative w-full text-center mb-12">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl animate-pulse"></div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white leading-tight tracking-tight relative z-10">
              {isGeneratingQuestion ? 'Generating Next Probe...' : (currentQuestion || "Initializing...")}
            </h2>
          </div>

          {!isGeneratingQuestion && (
            <div className="grid grid-cols-1 gap-4 w-full">
              <textarea
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAnswer(e.currentTarget.value);
                    e.currentTarget.value = "";
                  }
                }}
                placeholder="Type your response and press Enter..."
                className="glass-panel p-8 rounded-2xl border border-white/5 text-lg text-slate-300 placeholder:text-slate-700 focus:ring-0 resize-none h-32 font-light"
              />
              <p className="text-[9px] text-center text-slate-600 uppercase tracking-widest mt-4">Press Enter to Confirm Response</p>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onBack}
        className="mt-16 text-[10px] uppercase tracking-[0.4em] text-slate-600 hover:text-white transition-colors"
      >
        Return to Selection
      </button>
    </div>
  );
};

export default OnboardingAdaptive;
