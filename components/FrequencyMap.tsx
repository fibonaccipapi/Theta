import React from 'react';
import { motion } from 'framer-motion';

interface FrequencyInfo {
  hz: number;
  label: string;
  spiritual: string;
  brain: string;
  color: string;
}

const FREQUENCIES: FrequencyInfo[] = [
  { hz: 174, label: "The Foundation", spiritual: "Relieving pain and stress. Connects you to the Earth's grounding energy.", brain: "Reduces cortisol and stabilizes the autonomic nervous system.", color: "bg-slate-800" },
  { hz: 285, label: "Quantum Cognition", spiritual: "Healing tissue and organs. Restructuring the energetic blueprint.", brain: "Accelerates cellular regeneration and enhances spatial awareness.", color: "bg-zinc-800" },
  { hz: 396, label: "Liberation", spiritual: "Liberating guilt and fear. Turning grief into joy.", brain: "Decreases activity in the amygdala, quieting the survival instinct.", color: "bg-red-900" },
  { hz: 417, label: "Change", spiritual: "Undoing situations and facilitating change. Clearing traumatic experiences.", brain: "Promotes neuroplasticity and breaks repetitive thought loops.", color: "bg-orange-900" },
  { hz: 528, label: "The Love Frequency", spiritual: "Transformation and miracles. DNA repair and universal love.", brain: "Increases UV light absorption in DNA and boosts oxytocin levels.", color: "bg-emerald-900" },
  { hz: 639, label: "Connection", spiritual: "Harmonizing relationships and connecting with the spiritual family.", brain: "Enhances communication between the left and right hemispheres.", color: "bg-teal-900" },
  { hz: 741, label: "Expression", spiritual: "Solving problems and expressions. Awakening intuition.", brain: "Cleanses the cells from electromagnetic radiation and toxins.", color: "bg-blue-900" },
  { hz: 852, label: "Spiritual Order", spiritual: "Returning to spiritual order. Awakening inner strength.", brain: "Stimulates the pineal gland and enhances deep meditative states.", color: "bg-indigo-900" },
  { hz: 963, label: "Divine Consciousness", spiritual: "The 'God Frequency'. Connection to the Light and the All.", brain: "Activates the higher cortex and facilitates non-dual awareness.", color: "bg-purple-900" },
];

const FrequencyMap: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 py-12 max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-4 tracking-tighter">
          NEURAL <span className="neon-text-green italic font-serif font-normal">MAP.</span>
        </h2>
        <p className="text-slate-500 tracking-[0.4em] uppercase text-[10px] font-black">The Frequency Architecture of the Soul</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {FREQUENCIES.map((f, i) => (
          <motion.div
            key={f.hz}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-8 rounded-[32px] border border-white/5 hover:border-neon-green/30 transition-all duration-500 group relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${f.color} opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:opacity-20 transition-opacity`}></div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <span className="text-3xl font-display font-bold text-white group-hover:neon-text-green transition-all">{f.hz}</span>
                <span className="text-xs text-slate-500 ml-2 font-mono uppercase tracking-widest">Hz</span>
              </div>
              <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
                <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
              </div>
            </div>

            <h3 className="text-lg font-display font-bold text-white uppercase tracking-widest mb-4">{f.label}</h3>
            
            <div className="space-y-6 relative z-10">
              <div>
                <h4 className="text-[9px] uppercase tracking-[0.3em] text-neon-green font-black mb-2">Spiritual Resonance</h4>
                <p className="text-slate-400 text-sm leading-relaxed font-light">{f.spiritual}</p>
              </div>
              <div>
                <h4 className="text-[9px] uppercase tracking-[0.3em] text-hot-pink font-black mb-2">Neural Impact</h4>
                <p className="text-slate-400 text-sm leading-relaxed font-light">{f.brain}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <button
        onClick={onBack}
        className="mt-20 px-12 py-4 rounded-full border border-white/10 text-[11px] uppercase tracking-[0.4em] font-bold hover:bg-white/5 transition-all text-slate-500"
      >
        Return to Dashboard
      </button>
    </div>
  );
};

export default FrequencyMap;
