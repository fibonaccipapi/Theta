import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface HeroCardProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  count?: number;
  primaryAction: { label: string; onClick: () => void };
  isActive?: boolean;
  children?: React.ReactNode;
  expandable?: boolean;
}

const HeroCard: React.FC<HeroCardProps> = ({
  title,
  icon,
  description,
  count,
  primaryAction,
  isActive = false,
  children,
  expandable = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`glass-panel rounded-[32px] border transition-all duration-500 ${
      isActive
        ? 'border-neon-green/30 bg-neon-green/[0.02]'
        : 'border-white/5 hover:border-white/10'
    }`}>
      <div className="p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              isActive ? 'bg-neon-green/20 text-neon-green' : 'bg-white/5 text-slate-400'
            }`}>
              {icon}
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-white tracking-tight">{title}</h3>
              {count !== undefined && (
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">
                  {count} {count === 1 ? 'item' : 'items'}
                </p>
              )}
            </div>
          </div>
          {isActive && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
              <span className="text-[8px] uppercase tracking-widest text-neon-green font-bold">Active</span>
            </div>
          )}
        </div>

        <p className="text-slate-400 text-sm mb-6 leading-relaxed">{description}</p>

        <div className="flex items-center space-x-4">
          <button
            onClick={primaryAction.onClick}
            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all ${
              isActive
                ? 'bg-hot-pink/20 text-hot-pink border border-hot-pink/40'
                : 'neon-button-green'
            }`}
          >
            {primaryAction.label}
          </button>

          {expandable && children && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-6 py-4 rounded-2xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-[0.3em]"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="p-8">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeroCard;
