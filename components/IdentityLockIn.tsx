import React, { useState } from 'react';
import { BeliefAnalysis, AffirmationLayer } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface IdentityLockInProps {
  analysis: BeliefAnalysis;
  onLockIn: () => void;
}

const IdentityLockIn: React.FC<IdentityLockInProps> = ({ analysis, onLockIn }) => {
  const [step, setStep] = useState(0);

  const detachmentAffirmations = analysis.affirmations.filter(a => a.layer === AffirmationLayer.DETACHMENT).slice(0, 1);
  const identityAffirmations = analysis.affirmations.filter(a => a.layer === AffirmationLayer.IDENTITY).slice(0, 2);
  const lockInAffirmations = [...detachmentAffirmations, ...identityAffirmations];
  const lockInAction = analysis.evidenceTasks?.[0] || { title: "Operate as New Identity", description: "Move through today as the version of you that already has your desired result." };

  const steps = [
    {
      title: "Identity Reference",
      content: (
        <div className="space-y-12">
          <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] opacity-40 grayscale">
            <h4 className="text-[10px] uppercase tracking-[0.4em] text-slate-600 font-black mb-4">Past Version</h4>
            <h3 className="text-2xl font-display mb-2 text-slate-400">{analysis.oldIdentity.title}</h3>
            <p className="text-sm text-slate-500 italic">"{analysis.oldIdentity.coreBelief}"</p>
          </div>
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="p-10 rounded-3xl border border-neon-green/40 bg-neon-green/5 shadow-[0_0_60px_rgba(0,255,153,0.15)]"
          >
            <h4 className="text-[10px] uppercase tracking-[0.4em] text-neon-green font-black mb-4">Active Version</h4>
            <h3 className="text-4xl md:text-5xl font-display mb-4 text-white neon-text-green">{analysis.newIdentity.title}</h3>
            <p className="text-lg text-slate-200 font-medium">"{analysis.newIdentity.coreBelief}"</p>
          </motion.div>
        </div>
      )
    },
    {
      title: "Neural Anchors",
      content: (
        <div className="space-y-6">
          <h4 className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-black mb-8">Identity Affirmations</h4>
          {lockInAffirmations.map((aff, idx) => (
            <motion.div 
              key={aff.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.2 }}
              className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center space-x-6 group hover:border-neon-green/30 transition-all"
            >
              <div className="w-10 h-10 rounded-full border border-neon-green/20 flex items-center justify-center text-neon-green font-mono text-xs">
                0{idx + 1}
              </div>
              <p className="text-xl text-white font-medium tracking-tight leading-tight group-hover:neon-text-green transition-all">
                {aff.text}
              </p>
            </motion.div>
          ))}
        </div>
      )
    },
    {
      title: "Immediate Operation",
      content: (
        <div className="space-y-12">
          <div className="p-10 rounded-3xl border border-hot-pink/30 bg-hot-pink/5">
            <h4 className="text-[10px] uppercase tracking-[0.4em] text-hot-pink font-black mb-6">Today's Evidence Task</h4>
            <h3 className="text-3xl font-display mb-4 text-white">{lockInAction.title}</h3>
            <p className="text-slate-400 text-lg leading-relaxed">{lockInAction.description}</p>
          </div>

          <div className="pt-12 border-t border-white/5">
            <h2 className="text-4xl font-display font-bold mb-6 tracking-tighter text-white">
              MOVE THROUGH TODAY <br />
              <span className="neon-text-pink italic font-serif font-normal">As this version.</span>
            </h2>
            <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.5em]">No negotiation. No rehearsal.</p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-hot-pink/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="relative z-10 max-w-3xl w-full">
        <div className="mb-12 flex justify-center space-x-3">
          {steps.map((_, idx) => (
            <div 
              key={idx}
              className={`h-1 rounded-full transition-all duration-500 ${idx === step ? 'w-12 bg-neon-green shadow-[0_0_10px_rgba(0,255,153,0.5)]' : 'w-4 bg-white/10'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.02, y: -10 }}
            transition={{ duration: 0.4 }}
            className="min-h-[400px] flex flex-col justify-center"
          >
            {steps[step].content}
          </motion.div>
        </AnimatePresence>

        <div className="mt-16 flex justify-center space-x-6">
          {step > 0 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="px-8 py-4 rounded-full border border-white/10 text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-white/5 transition-all text-slate-400"
            >
              Back
            </button>
          )}
          
          {step < steps.length - 1 ? (
            <button 
              onClick={() => setStep(step + 1)}
              className="neon-button-green px-12"
            >
              Next Phase
            </button>
          ) : (
            <button 
              onClick={onLockIn}
              className="neon-button-pink px-16 shadow-[0_0_30px_rgba(255,0,153,0.2)]"
            >
              LOCK IN IDENTITY
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IdentityLockIn;
