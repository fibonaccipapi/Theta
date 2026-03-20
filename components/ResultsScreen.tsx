import React from 'react';
import { BeliefAnalysis } from '../types';
import { CATEGORIES } from '../constants';

interface ResultsScreenProps {
  analysis: BeliefAnalysis;
  onConfirm: () => void;
  onBack: () => void;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ analysis, onConfirm, onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-4xl mx-auto px-6 pb-20">
      <div className="text-center mb-16">
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-neon-green/20 bg-neon-green/5 text-[10px] uppercase tracking-[0.3em] text-neon-green font-bold mb-6">
          <span>Neural Mapping Complete</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 tracking-tight">
          Your Subconscious <span className="neon-text-pink">Architecture.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-16">
        {/* Left Column: Analysis */}
        <div className="space-y-8">
          <div className="glass-panel p-8 rounded-3xl border border-white/5">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold mb-6">Neural Input (Transcribed)</h3>
            <p className="text-slate-300 italic leading-relaxed font-light">"{analysis.userIssue}"</p>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-white/5">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold mb-6">Surface Pattern</h3>
            <p className="text-xl text-white font-light leading-relaxed">{analysis.surfacePattern}</p>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-white/5">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold mb-6">Core Limiting Beliefs</h3>
            <div className="space-y-4">
              {analysis.coreBeliefs.map((belief, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <div className="w-6 h-6 rounded-full bg-hot-pink/10 border border-hot-pink/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-1.5 h-1.5 bg-hot-pink rounded-full"></div>
                  </div>
                  <p className="text-slate-300 font-light italic">"{belief}"</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-white/5">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold mb-6">Defense Pattern</h3>
            <p className="text-slate-300 font-light">{analysis.defensePattern}</p>
          </div>
        </div>

        {/* Right Column: Affirmations & Session */}
        <div className="space-y-8">
          <div className="glass-panel p-8 rounded-3xl border border-white/5">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-neon-green font-bold mb-6">Neural Reprogramming Set</h3>
            <div className="space-y-3">
              {analysis.affirmations.slice(0, 6).map((aff, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 text-sm text-slate-300 font-light">
                  {aff.text}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-neon-green/20 bg-neon-green/5">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-neon-green font-bold mb-6">Frequency Shift</h3>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Current</span>
                <span className="text-sm text-white font-bold">{analysis.currentFrequency?.pattern}</span>
              </div>
              <div className="flex items-center justify-center py-2">
                <svg className="w-4 h-4 text-neon-green animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Desired</span>
                <span className="text-sm text-white font-bold">{analysis.desiredFrequency?.pattern}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-white/5">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-neon-green font-bold mb-6">Recommended Protocol</h3>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-400">Session Length</span>
              <span className="text-sm text-white font-bold">{analysis.recommendedSession.lengthMinutes} Minutes</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-400">Neural Environment</span>
              <span className="text-sm text-white font-bold">{analysis.recommendedSession.musicLayer}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Vocal Archetype</span>
              <span className="text-sm text-white font-bold">{analysis.recommendedSession.vocalArchetype || 'Solaris'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl mb-12">
        <button
          onClick={onConfirm}
          className="neon-button-green flex-1"
        >
          ACCEPT NEURAL MAP
        </button>
        <button
          onClick={onBack}
          className="px-10 py-4 rounded-full border border-white/10 text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-white/5 transition-all text-slate-400"
        >
          RE-MAP SUBCONSCIOUS
        </button>
      </div>

      <button 
        onClick={onConfirm}
        className="text-[10px] uppercase tracking-[0.5em] text-slate-600 hover:text-neon-green transition-all font-black flex items-center group"
      >
        <div className="w-8 h-[1px] bg-slate-800 group-hover:bg-neon-green/30 mr-4 transition-all"></div>
        Skip to Soundscape Architect
        <div className="w-8 h-[1px] bg-slate-800 group-hover:bg-neon-green/30 ml-4 transition-all"></div>
      </button>
    </div>
  );
};

export default ResultsScreen;
