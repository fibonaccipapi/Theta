import React from 'react';
import { InputMode } from '../types';

interface ModeSelectionProps {
  onSelect: (mode: InputMode) => void;
  onBack: () => void;
}

const ModeSelection: React.FC<ModeSelectionProps> = ({ onSelect, onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-4xl mx-auto px-6">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 tracking-tight">
          Select Your <span className="neon-text-green">Entry Path.</span>
        </h2>
        <p className="text-slate-500 tracking-widest uppercase text-[10px]">Choose the depth of your neural mapping session</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        {/* Path A: Guided Deep-Dive */}
        <button
          onClick={() => onSelect(InputMode.GUIDED)}
          className="glass-panel group p-10 rounded-3xl border border-white/5 hover:border-neon-green/30 transition-all duration-500 text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-neon-green/10 transition-all"></div>
          <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Guided Deep-Dive</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 font-light">
            Layered diagnostic questions to pinpoint emotional patterns and reveal core identity beliefs.
          </p>
          <div className="flex items-center text-[10px] uppercase tracking-[0.2em] text-neon-green font-bold">
            <span>Initiate Protocol</span>
            <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </button>

        {/* Path B: Voice Confession */}
        <button
          onClick={() => onSelect(InputMode.VOICE)}
          className="glass-panel group p-10 rounded-3xl border border-white/5 hover:border-hot-pink/30 transition-all duration-500 text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-hot-pink/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-hot-pink/10 transition-all"></div>
          <div className="w-12 h-12 rounded-2xl bg-hot-pink/10 border border-hot-pink/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-hot-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Voice Confession</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 font-light">
            Speak naturally. AI analyzes language, tone, and avoidance to extract hidden subconscious truths.
          </p>
          <div className="flex items-center text-[10px] uppercase tracking-[0.2em] text-hot-pink font-bold">
            <span>Initiate Protocol</span>
            <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </button>

        {/* Path C: Adaptive Mode */}
        <button
          onClick={() => onSelect(InputMode.ADAPTIVE)}
          className="glass-panel group p-10 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all duration-500 text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-all"></div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Adaptive Mode</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 font-light">
            State one core issue. AI asks targeted, adaptive questions based on your specific responses.
          </p>
          <div className="flex items-center text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold">
            <span>Initiate Protocol</span>
            <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </button>
      </div>

      <button
        onClick={onBack}
        className="mt-16 text-[10px] uppercase tracking-[0.4em] text-slate-600 hover:text-white transition-colors"
      >
        Return to Core
      </button>
    </div>
  );
};

export default ModeSelection;
