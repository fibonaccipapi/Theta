import React from 'react';
import { BeliefAnalysis } from '../types';
import { motion } from 'motion/react';

interface VersionSelectedProps {
  analysis: BeliefAnalysis;
  onProceed: () => void;
}

const VersionSelected: React.FC<VersionSelectedProps> = ({ analysis, onProceed }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-neon-green/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 max-w-4xl w-full"
      >
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-neon-green/20 bg-neon-green/5 text-[10px] uppercase tracking-[0.3em] text-neon-green font-bold mb-12">
          <span>Quantum Identity Shift Complete</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-display font-bold mb-16 tracking-tighter leading-none text-white">
          VERSION <br />
          <span className="neon-text-green italic font-serif font-normal">Selected.</span>
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          {/* Old Version */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 0.4, x: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] relative grayscale"
          >
            <div className="absolute -top-3 left-8 px-3 py-1 bg-slate-800 border border-white/10 rounded-full text-[9px] uppercase tracking-widest text-slate-500">
              Decommissioned
            </div>
            <h3 className="text-xl font-display mb-4 text-slate-400">{analysis.oldIdentity.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed italic">
              "{analysis.oldIdentity.coreBelief}"
            </p>
            <div className="mt-6 pt-6 border-t border-white/5 text-[10px] uppercase tracking-widest text-slate-600">
              Pattern: {analysis.oldIdentity.behavioralPattern}
            </div>
          </motion.div>

          {/* New Version */}
          <motion.div 
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.8, type: "spring" }}
            className="p-8 rounded-3xl border border-neon-green/30 bg-neon-green/5 relative shadow-[0_0_50px_rgba(0,255,153,0.1)]"
          >
            <div className="absolute -top-3 left-8 px-3 py-1 bg-neon-green text-black rounded-full text-[9px] uppercase tracking-widest font-bold">
              Active Version
            </div>
            <h3 className="text-2xl font-display mb-4 text-white neon-text-green">{analysis.newIdentity.title}</h3>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              "{analysis.newIdentity.coreBelief}"
            </p>
            <div className="mt-6 pt-6 border-t border-neon-green/20 text-[10px] uppercase tracking-widest text-neon-green font-bold">
              Operating State: {analysis.newIdentity.behavioralPattern}
            </div>
          </motion.div>
        </div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-slate-400 font-mono text-xs uppercase tracking-[0.4em] mb-12"
        >
          Old version decommissioned. New version installed.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          onClick={onProceed}
          className="neon-button-green px-16"
        >
          INITIALIZE OPERATION
        </motion.button>
      </motion.div>
    </div>
  );
};

export default VersionSelected;
