import React, { useState } from 'react';
import { ONBOARDING_QUESTIONS, CATEGORIES } from '../constants';
import { BeliefAnalysis, BeliefCategory } from '../types';
import { analyzeGuidedBeliefs } from '../services/gemini';

interface OnboardingGuidedProps {
  onComplete: (analysis: BeliefAnalysis) => void;
  onBack: () => void;
}

const OnboardingGuided: React.FC<OnboardingGuidedProps> = ({ onComplete, onBack }) => {
  const [selectedCategory, setSelectedCategory] = useState<BeliefCategory | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategorySelect = (category: BeliefCategory) => {
    setSelectedCategory(category);
    setCurrentStep(0);
    setError(null);
  };

  const currentQuestions = selectedCategory ? ONBOARDING_QUESTIONS.filter(q => q.category === selectedCategory) : [];

  const handleAnswerSelect = async (answer: string) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setError(null);

    if (currentStep < currentQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsAnalyzing(true);
      try {
        const analysis = await analyzeGuidedBeliefs(selectedCategory!, newAnswers);
        onComplete(analysis);
      } catch (error) {
        console.error(error);
        setError("Neural mapping failed. The connection to the core intelligence was interrupted.");
        setIsAnalyzing(false);
      }
    }
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-16 h-16 border-2 border-neon-green/20 border-t-neon-green rounded-full animate-spin mb-8" />
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
            onClick={() => handleAnswerSelect(answers[answers.length - 1])}
            className="neon-button-green flex-1"
          >
            RETRY SYNTHESIS
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

  if (!selectedCategory) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 tracking-tight">
            Pinpoint the <span className="neon-text-green">Domain.</span>
          </h2>
          <p className="text-slate-500 tracking-widest uppercase text-[10px]">Select the area of your life that requires reprogramming</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className="glass-panel group p-8 rounded-2xl border border-white/5 hover:border-neon-green/30 transition-all duration-500 text-center"
            >
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{cat.icon}</div>
              <h3 className="text-sm font-display font-bold text-white uppercase tracking-widest">{cat.label}</h3>
            </button>
          ))}
        </div>

        <button
          onClick={onBack}
          className="mt-16 text-[10px] uppercase tracking-[0.4em] text-slate-600 hover:text-white transition-colors"
        >
          Return to Selection
        </button>
      </div>
    );
  }

  const currentQ = currentQuestions[currentStep];

  if (!currentQ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <h2 className="text-xl font-display text-slate-300 tracking-widest uppercase">Initializing Neural Sequence...</h2>
        <button onClick={() => setSelectedCategory(null)} className="mt-8 neon-button-green">Return to Selection</button>
      </div>
    );
  }

  const progress = currentQuestions.length > 0 ? ((currentStep + 1) / currentQuestions.length) * 100 : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-2xl mx-auto px-6 pb-20 relative">
      <div className="w-full mb-16 relative">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => {
              if (currentStep === 0) setSelectedCategory(null);
              else {
                setCurrentStep(currentStep - 1);
                setAnswers(answers.slice(0, -1));
              }
            }}
            className="flex items-center text-[10px] uppercase tracking-[0.3em] text-slate-500 hover:text-neon-green transition-all duration-300"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous Stage
          </button>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold">
            Layer <span className="text-neon-green ml-2">{currentStep + 1} / {currentQuestions.length || 1}</span>
          </p>
        </div>
        <div className="h-[2px] bg-white/5 rounded-full overflow-hidden relative">
          <div 
            className="h-full bg-gradient-to-r from-neon-green to-hot-pink transition-all duration-700 ease-out shadow-[0_0_10px_rgba(0,255,159,0.5)]" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="relative w-full text-center mb-12">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-neon-green/5 rounded-full blur-2xl animate-pulse"></div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight tracking-tight relative z-10">
          {currentQ?.text || "Initializing..."}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 w-full relative z-10">
        <textarea
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (e.currentTarget.value.trim()) {
                handleAnswerSelect(e.currentTarget.value);
                e.currentTarget.value = "";
              }
            }
          }}
          placeholder="Type your response and press Enter..."
          className="glass-panel p-8 rounded-2xl border border-white/5 text-lg text-slate-300 placeholder:text-slate-700 focus:ring-0 resize-none h-32 font-light"
        />
        <p className="text-[9px] text-center text-slate-600 uppercase tracking-widest mt-4">Press Enter to Confirm Response</p>
      </div>
    </div>
  );
};

export default OnboardingGuided;
