
import React, { useEffect, useState, useRef } from 'react';
import { ThetaAudioEngine } from '../services/audioEngine';
import { Affirmation, UserVoiceData, NeuralEnvironment, VocalArchetype } from '../types';

import { generateAffirmationAudio } from '../services/gemini';

interface SessionPlayerProps {
  affirmations: Affirmation[];
  onEnd: () => void;
  voiceData?: UserVoiceData | null;
  env: NeuralEnvironment;
  vocalArchetype: VocalArchetype;
}

const SessionPlayer: React.FC<SessionPlayerProps> = ({ affirmations, onEnd, voiceData, env, vocalArchetype }) => {
  const [phase, setPhase] = useState<'induction' | 'lock-in' | 'affirmation' | 'integration'>('induction');
  const [timer, setTimer] = useState(0);
  const [currentAffIndex, setCurrentAffIndex] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [audioCache, setAudioCache] = useState<Record<string, string>>({});
  const engine = ThetaAudioEngine.getInstance();
  const lastAffRef = useRef<number>(-1);
  const wakeLockRef = useRef<any>(null);

  const initialize = async () => {
    await engine.init();
    if (voiceData) await engine.loadVoiceFromBase64(voiceData.audioData);
    engine.startEntrainment(env);

    // Request wake lock to keep screen on during session
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('Wake Lock activated - screen will stay on');
      }
    } catch (err) {
      console.warn('Wake Lock not supported or failed:', err);
    }

    setIsUnlocked(true);
  };

  useEffect(() => {
    if (!isUnlocked) return;
    const interval = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => {
      clearInterval(interval);
      engine.stopEntrainment();
      // Release wake lock when session ends
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake Lock released');
      }
    };
  }, [isUnlocked]);

  useEffect(() => {
    if (!isUnlocked) return;

    if (timer < 60) setPhase('induction');
    else if (timer < 120) {
      if (phase !== 'lock-in') {
        setPhase('lock-in');
        engine.startBiometricLoop(0.12); // Subliminal identity seeding
      }
    } else if (timer < 240) {
       if (phase !== 'affirmation') setPhase('affirmation');
       
       const index = Math.floor((timer - 120) / 15) % affirmations.length;
       if (index !== lastAffRef.current) {
         lastAffRef.current = index;
         setCurrentAffIndex(index);
         
         const currentAff = affirmations[index];
         
         const playAff = async () => {
           if (currentAff.userRecording) {
              engine.playNeuralAffirmation(currentAff.userRecording);
           } else if (audioCache[currentAff.id]) {
              engine.playNeuralAffirmation(audioCache[currentAff.id]);
           } else if (currentAff.audioData) {
              engine.playNeuralAffirmation(currentAff.audioData);
           } else {
              // Generate on the fly if missing
              try {
                const audio = await generateAffirmationAudio(currentAff.text, vocalArchetype);
                setAudioCache(prev => ({ ...prev, [currentAff.id]: audio }));
                engine.playNeuralAffirmation(audio);
              } catch (e) { console.error("Audio generation failed", e); }
           }
         };
         playAff();
       }
    } else if (timer < 300) setPhase('integration');
    else onEnd();
  }, [timer, affirmations, onEnd, phase, isUnlocked, audioCache, vocalArchetype]);

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center relative">
        <button onClick={onEnd} className="absolute top-8 left-8 text-slate-500 hover:text-neon-green flex items-center text-[10px] uppercase tracking-[0.3em] font-bold transition-all duration-300 group">
          <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7" /></svg>
          Exit Protocol
        </button>
        
        <div className="relative mb-16">
          <div className="w-32 h-32 bg-neon-green/5 rounded-full flex items-center justify-center relative z-10 border border-neon-green/20">
             <div className="absolute inset-0 rounded-full border border-neon-green/30 animate-ping opacity-20" />
             <svg className="w-12 h-12 text-neon-green drop-shadow-[0_0_10px_rgba(0,255,159,0.5)]" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-neon-green/10 rounded-full blur-3xl animate-pulse"></div>
        </div>
        
        <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 tracking-tighter text-white">
          INITIALIZE <span className="neon-text-green italic font-serif font-normal">IMMERSION</span>
        </h2>
        <p className="text-slate-500 mb-8 text-[10px] uppercase tracking-[0.5em] font-black">Carrier Frequency: <span className="text-neon-green">{env}</span></p>

        <div className="mb-8 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 max-w-md mx-auto">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-cyan-400 text-[9px] uppercase tracking-[0.2em] font-bold mb-1">Mobile Optimization</p>
              <p className="text-slate-400 text-xs leading-relaxed">Screen will stay on during your session. For best results, keep app in foreground.</p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={initialize} 
          className="neon-button-green min-w-[320px] py-6 text-xs tracking-[0.4em]"
        >
          BEGIN NEURAL RESYNTHESIS
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] relative overflow-hidden px-6">
      <button onClick={onEnd} className="absolute top-8 left-8 z-50 text-slate-500 hover:text-hot-pink flex items-center text-[10px] uppercase tracking-[0.3em] font-bold transition-all duration-300 group">
        <svg className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        Abort Protocol
      </button>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[800px] h-[800px] bg-neon-green/5 rounded-full blur-[160px] animate-glow-pulse" />
        <div className="w-[600px] h-[600px] bg-hot-pink/5 rounded-full blur-[140px] animate-glow-pulse" style={{ animationDelay: '-2s' }} />
      </div>

      <div className="text-center z-10 w-full max-w-4xl">
        <div className="mb-20">
          <div className="inline-flex items-center space-x-3 px-6 py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-md mb-6">
            <div className={`w-2 h-2 rounded-full animate-pulse ${phase === 'affirmation' ? 'bg-hot-pink shadow-[0_0_10px_rgba(255,45,154,0.8)]' : 'bg-neon-green shadow-[0_0_10px_rgba(0,255,159,0.8)]'}`}></div>
            <p className={`text-[10px] tracking-[0.4em] uppercase font-black ${phase === 'affirmation' ? 'text-hot-pink' : 'text-neon-green'}`}>
              {phase.toUpperCase()} PHASE ACTIVE
            </p>
          </div>
          
          {phase === 'affirmation' && (
            <p className="text-slate-500 text-[9px] uppercase tracking-[0.3em] font-bold animate-pulse">
              BIOMETRIC MIRRORING: <span className="text-white ml-2">{affirmations[currentAffIndex].userRecording ? 'BIOLOGICAL SEED' : 'NEURAL CORE BACKUP'}</span>
            </p>
          )}
        </div>
        
        <div className="min-h-[300px] flex items-center justify-center relative">
          {phase === 'affirmation' ? (
            <div className="relative">
              <div className="absolute -inset-12 bg-hot-pink/5 rounded-full blur-3xl animate-pulse"></div>
              <h2 className="text-5xl md:text-7xl font-serif italic text-white leading-[1.3] animate-fade-in tracking-tight px-4 relative z-10 drop-shadow-2xl">
                "{affirmations[currentAffIndex].text}"
              </h2>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-64 h-64 border border-white/5 rounded-full flex items-center justify-center mb-16 relative group">
                <div className="absolute inset-0 border border-neon-green/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-4 border border-hot-pink/10 rounded-full animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
                <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
              </div>
              <p className="text-slate-500 text-[10px] uppercase tracking-[0.6em] font-black animate-pulse">Synchronizing Neural Oscillations</p>
            </div>
          )}
        </div>

        <div className="mt-32 relative">
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 glass-panel py-4 px-10 rounded-full inline-flex items-center space-x-6 border border-white/10">
            <div className="text-slate-500 font-mono text-[11px] tracking-[0.4em] uppercase">
              {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')} <span className="mx-2 opacity-30">/</span> 5:00
            </div>
            <div className="w-32 h-[2px] bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-neon-green to-hot-pink transition-all duration-1000"
                style={{ width: `${(timer / 300) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dynamic Waveform Visualizer */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end space-x-1 h-32 opacity-30 pointer-events-none">
        {Array.from({ length: 80 }).map((_, i) => (
          <div 
            key={i} 
            className={`w-1 rounded-t-full transition-all duration-500 ease-out ${phase === 'affirmation' ? 'bg-hot-pink shadow-[0_0_10px_rgba(255,45,154,0.3)]' : 'bg-neon-green shadow-[0_0_10px_rgba(0,255,159,0.3)]'}`} 
            style={{ 
              height: `${15 + Math.random() * (phase === 'affirmation' ? 85 : 40)}%`,
              transitionDelay: `${i * 10}ms`
            }} 
          />
        ))}
      </div>
    </div>
  );
};

export default SessionPlayer;
