import React, { useState } from 'react';
import { Affirmation } from '../types';

interface MixStudioProps {
  affirmations: Affirmation[];
  currentBinauralHz: { left: number; right: number };
  currentBinauralVolume: number;
  onExport: (
    selectedAffirmations: Affirmation[],
    durationMinutes: number
  ) => void;
  isExporting: boolean;
  exportProgress: { current: number; total: number } | null;
}

const MixStudio: React.FC<MixStudioProps> = ({
  affirmations,
  currentBinauralHz,
  currentBinauralVolume,
  onExport,
  isExporting,
  exportProgress
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAffIds, setSelectedAffIds] = useState<Set<string>>(
    new Set(affirmations.filter(a => a.userRecording).map(a => a.id))
  );
  const [durationMinutes, setDurationMinutes] = useState(30);

  const recordedAffirmations = affirmations.filter(a => a.userRecording);
  const selectedAffirmations = recordedAffirmations.filter(a => selectedAffIds.has(a.id));

  const toggleAffirmation = (id: string) => {
    const newSet = new Set(selectedAffIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedAffIds(newSet);
  };

  const handleQuickExport = () => {
    if (recordedAffirmations.length === 0) return;
    onExport(recordedAffirmations, 30);
  };

  const handleAdvancedExport = () => {
    if (selectedAffirmations.length === 0) return;
    onExport(selectedAffirmations, durationMinutes);
  };

  const beatFrequency = Math.abs(currentBinauralHz.right - currentBinauralHz.left);
  const brainwaveType = beatFrequency < 4 ? 'δ' : beatFrequency < 8 ? 'θ' : beatFrequency < 12 ? 'α' : beatFrequency < 30 ? 'β' : 'γ';

  return (
    <div className="mt-8 border-t border-white/5 pt-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between group hover:opacity-80 transition-opacity mb-6"
      >
        <h4 className="text-xs font-bold uppercase tracking-[0.4em] text-slate-400 group-hover:text-neon-green transition-colors">
          Mix Studio
        </h4>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Simple Mode (Collapsed) */}
      {!isExpanded && (
        <div className="space-y-4">
          {isExporting && exportProgress ? (
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-neon-green/30">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full animate-spin"></div>
                <p className="text-neon-green text-sm font-bold">Rendering Mix...</p>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-neon-green h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-slate-500 text-xs text-center mt-2">
                {Math.floor(exportProgress.current / 60)}:{(exportProgress.current % 60).toString().padStart(2, '0')} / {Math.floor(exportProgress.total / 60)}:00
              </p>
            </div>
          ) : (
            <button
              onClick={handleQuickExport}
              disabled={recordedAffirmations.length === 0 || isExporting}
              className="w-full neon-button-green py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {recordedAffirmations.length === 0
                ? 'Record Affirmations First'
                : 'Export Hemisync Session (30 min)'}
            </button>
          )}
        </div>
      )}

      {/* Advanced Mode (Expanded) */}
      {isExpanded && (
        <div className="space-y-6">
          {/* Affirmation Selection */}
          <div>
            <h5 className="text-[9px] uppercase tracking-[0.4em] text-slate-600 font-black mb-3">
              Affirmations ({recordedAffirmations.length} recorded)
            </h5>
            {recordedAffirmations.length === 0 ? (
              <p className="text-slate-500 text-xs italic">No recorded affirmations yet</p>
            ) : (
              <div className="space-y-2">
                {recordedAffirmations.map(aff => (
                  <label key={aff.id} className="flex items-center space-x-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-neon-green/30 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={selectedAffIds.has(aff.id)}
                      onChange={() => toggleAffirmation(aff.id)}
                      className="w-4 h-4 accent-neon-green"
                    />
                    <span className="text-white text-sm flex-1">"{aff.text}"</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Binaural Settings Display */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <h5 className="text-[9px] uppercase tracking-[0.4em] text-slate-600 font-black mb-2">
              Binaural Settings
            </h5>
            <p className="text-white text-sm">
              Left: <span className="text-neon-green font-mono">{currentBinauralHz.left} Hz</span> |
              Right: <span className="text-hot-pink font-mono">{currentBinauralHz.right} Hz</span>
              {' '}({beatFrequency}Hz {brainwaveType})
            </p>
          </div>

          {/* Duration Slider */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="flex justify-between mb-2">
              <h5 className="text-[9px] uppercase tracking-[0.4em] text-slate-600 font-black">Duration</h5>
              <span className="text-white font-display font-bold text-xs">{durationMinutes} min</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full h-[2px] bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-green"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-slate-600">10 min</span>
              <span className="text-[8px] text-slate-600">60 min</span>
            </div>
          </div>

          {/* Spacing Info */}
          <div className="p-3 rounded-xl bg-neon-green/5 border border-neon-green/20">
            <p className="text-neon-green text-xs">
              <span className="font-bold">Auto-spacing:</span> Affirmations will be intelligently spaced based on their duration
            </p>
          </div>

          {/* Export Button */}
          {isExporting && exportProgress ? (
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-neon-green/30">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full animate-spin"></div>
                <p className="text-neon-green text-sm font-bold">Rendering Mix...</p>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-neon-green h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-slate-500 text-xs text-center mt-2">
                {Math.floor(exportProgress.current / 60)}:{(exportProgress.current % 60).toString().padStart(2, '0')} / {Math.floor(durationMinutes)}:00
              </p>
            </div>
          ) : (
            <button
              onClick={handleAdvancedExport}
              disabled={selectedAffirmations.length === 0 || isExporting}
              className="w-full neon-button-green py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedAffirmations.length === 0
                ? 'Select Affirmations to Export'
                : `Export Mix (${durationMinutes} min)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MixStudio;
