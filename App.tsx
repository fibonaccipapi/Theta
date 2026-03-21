import React, { useState, useEffect } from 'react';
import { AppState, BeliefAnalysis, UserVoiceData, NeuralEnvironment, VocalArchetype, InputMode, Affirmation, CustomSoundscape, SavedSession, AppData, ProcessedAudio } from './types';
import OnboardingGuided from './components/OnboardingGuided';
import OnboardingVoice from './components/OnboardingVoice';
import OnboardingAdaptive from './components/OnboardingAdaptive';
import ModeSelection from './components/ModeSelection';
import ResultsScreen from './components/ResultsScreen';
import Dashboard from './components/Dashboard';
import SessionPlayer from './components/SessionPlayer';
import VoiceManager from './components/VoiceManager';
import SoundscapeEditor from './components/SoundscapeEditor';
import VersionSelected from './components/VersionSelected';
import IdentityLockIn from './components/IdentityLockIn';
import FrequencyMap from './components/FrequencyMap';
import { AudioEngineDashboard } from './components/AudioEngineDashboard';
import { analyzeGuidedBeliefs, analyzeVoiceConfession, generateAffirmationAudio } from './services/gemini';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [voiceLibrary, setVoiceLibrary] = useState<UserVoiceData[]>([]);
  const [customSoundscapes, setCustomSoundscapes] = useState<CustomSoundscape[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<NeuralEnvironment>(NeuralEnvironment.INNER_PEACE);
  const [vocalArchetype, setVocalArchetype] = useState<VocalArchetype>(VocalArchetype.SOLARIS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeRecordingAff, setActiveRecordingAff] = useState<Affirmation | null>(null);
  const [processedAudios, setProcessedAudios] = useState<ProcessedAudio[]>([]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const beliefAnalysis = activeSession?.analysis || null;

  // Auto-save effect
  useEffect(() => {
    if (sessions.length > 0 || voiceLibrary.length > 0 || customSoundscapes.length > 0 || processedAudios.length > 0) {
      try {
        const data: AppData = {
          activeAnalysisId: activeSessionId,
          sessions,
          voiceLibrary,
          processedAudios,
          selectedEnv,
          vocalArchetype,
          customSoundscapes
        };
        localStorage.setItem('theta_app_v4_data', JSON.stringify(data));
      } catch (e) { console.warn("Save failed", e); }
    }
  }, [sessions, activeSessionId, voiceLibrary, selectedEnv, vocalArchetype, customSoundscapes, processedAudios]);

  useEffect(() => {
    const saved = localStorage.getItem('theta_app_v4_data');
    if (saved) {
      try {
        const parsed: AppData = JSON.parse(saved);
        if (parsed.sessions) setSessions(parsed.sessions);
        if (parsed.activeAnalysisId) setActiveSessionId(parsed.activeAnalysisId);
        if (parsed.voiceLibrary) setVoiceLibrary(parsed.voiceLibrary);
        if (parsed.processedAudios) setProcessedAudios(parsed.processedAudios);
        if (parsed.selectedEnv) setSelectedEnv(parsed.selectedEnv);
        if (parsed.vocalArchetype) setVocalArchetype(parsed.vocalArchetype);
        if (parsed.customSoundscapes) setCustomSoundscapes(parsed.customSoundscapes);
        
        if (parsed.activeAnalysisId) setAppState(AppState.DASHBOARD);
      } catch (e) { console.error("Load failed", e); }
    }
  }, []);

  const handleAnalysisComplete = (analysis: BeliefAnalysis) => {
    const newSession: SavedSession = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      analysis,
      label: `Session ${sessions.length + 1}`
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    setAppState(AppState.RESULTS);
  };

  const handleVoiceSave = (audioData: string) => {
    if (activeRecordingAff) {
      if (activeSessionId) {
        setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
            const updatedAffirmations = s.analysis.affirmations.map(aff => 
              aff.id === activeRecordingAff.id ? { ...aff, userRecording: audioData } : aff
            );
            return { ...s, analysis: { ...s.analysis, affirmations: updatedAffirmations } };
          }
          return s;
        }));
      }
      setActiveRecordingAff(null);
    } else {
      const newVoice: UserVoiceData = { id: Date.now().toString(), audioData, label: "Biometric Seed", calibrated: true, timestamp: Date.now() };
      setVoiceLibrary([newVoice, ...voiceLibrary.slice(0, 1)]);
    }
    setAppState(AppState.DASHBOARD);
  };

  const handleSaveSoundscape = (soundscape: CustomSoundscape) => {
    setCustomSoundscapes([...customSoundscapes, soundscape]);
    setAppState(AppState.DASHBOARD);
  };

  const handleSaveAudio = (audio: ProcessedAudio) => {
    setProcessedAudios(prev => [audio, ...prev]);
  };

  const handleDeleteAudio = (id: string) => {
    setProcessedAudios(prev => prev.filter(a => a.id !== id));
  };

  const renderContent = () => {
    if (isAnalyzing) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <div className="w-16 h-16 border-2 border-neon-green/20 border-t-neon-green rounded-full animate-spin mb-8" />
          <h2 className="text-xl font-display text-slate-300 tracking-widest uppercase">Synthesizing Neural Map...</h2>
          <p className="text-slate-500 mt-4 font-mono text-xs animate-pulse">Accessing Subconscious Architecture</p>
        </div>
      );
    }

    switch (appState) {
      case AppState.LANDING:
        return (
          <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-green/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-neon-green/20 bg-neon-green/5 text-[10px] uppercase tracking-[0.3em] text-neon-green font-bold mb-8 animate-pulse">
                <span>Neural Interface v5.0.1</span>
              </div>

              <h1 className="text-6xl md:text-8xl font-display font-bold mb-8 tracking-tighter leading-[0.9] text-white">
                REPROGRAM <br />
                <span className="neon-text-pink italic font-serif font-normal">Subconscious.</span>
              </h1>

              <p className="text-slate-400 max-w-2xl mx-auto text-lg md:text-xl mb-12 leading-relaxed font-light">
                Record affirmations in your voice. Layer with hemisync frequencies.
                Reprogram your subconscious while you sleep.
              </p>

              {sessions.length > 0 ? (
                <>
                  <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-12">
                    <button
                      onClick={() => setAppState(AppState.DASHBOARD)}
                      className="neon-button-green min-w-[280px]"
                    >
                      RESUME LATEST SESSION
                    </button>
                    <button
                      onClick={() => setAppState(AppState.MODE_SELECTION)}
                      className="px-10 py-4 rounded-full border border-white/10 text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-white/5 transition-all text-slate-400 min-w-[280px]"
                    >
                      NEW AI ANALYSIS
                    </button>
                  </div>

                  {sessions.length > 1 && (
                    <div className="mt-12 max-w-md mx-auto">
                      <h4 className="text-[10px] uppercase tracking-[0.4em] text-slate-600 font-black mb-6">Archived Sessions</h4>
                      <div className="space-y-3">
                        {sessions.slice(1, 4).map(s => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setActiveSessionId(s.id);
                              setAppState(AppState.DASHBOARD);
                            }}
                            className="w-full p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-all flex items-center justify-between group"
                          >
                            <div className="text-left">
                              <p className="text-white text-xs font-bold group-hover:text-neon-green transition-colors">{s.label}</p>
                              <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">{new Date(s.timestamp).toLocaleDateString()}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-slate-500 group-hover:border-neon-green/30 group-hover:text-neon-green transition-all">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                  <button
                    onClick={() => setAppState(AppState.DASHBOARD)}
                    className="neon-button-green min-w-[280px]"
                  >
                    QUICK START
                  </button>
                  <button
                    onClick={() => setAppState(AppState.MODE_SELECTION)}
                    className="px-10 py-4 rounded-full border border-white/10 text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-white/5 transition-all text-slate-400 min-w-[280px]"
                  >
                    AI ANALYSIS
                  </button>
                </div>
              )}

              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-2xl mb-2">🎙️</div>
                  <p className="text-xs text-slate-400">Record in your voice</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-2xl mb-2">🌊</div>
                  <p className="text-xs text-slate-400">Hemisync frequencies</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-2xl mb-2">🧠</div>
                  <p className="text-xs text-slate-400">Subconscious reprogramming</p>
                </div>
              </div>
            </div>
          </div>
        );
      case AppState.MODE_SELECTION:
        return <ModeSelection onSelect={(mode) => {
          if (mode === InputMode.GUIDED) setAppState(AppState.ONBOARDING_GUIDED);
          else if (mode === InputMode.VOICE) setAppState(AppState.ONBOARDING_VOICE);
          else if (mode === InputMode.ADAPTIVE) setAppState(AppState.ONBOARDING_ADAPTIVE);
        }} onBack={() => setAppState(sessions.length > 0 ? AppState.DASHBOARD : AppState.LANDING)} />;

      case AppState.ONBOARDING_GUIDED:
        return <OnboardingGuided onComplete={handleAnalysisComplete} onBack={() => setAppState(AppState.MODE_SELECTION)} />;
      
      case AppState.ONBOARDING_VOICE:
        return <OnboardingVoice onComplete={handleAnalysisComplete} onBack={() => setAppState(AppState.MODE_SELECTION)} />;
      
      case AppState.ONBOARDING_ADAPTIVE:
        return <OnboardingAdaptive onComplete={handleAnalysisComplete} onBack={() => setAppState(AppState.MODE_SELECTION)} />;

      case AppState.RESULTS:
        return beliefAnalysis ? (
          <ResultsScreen 
            analysis={beliefAnalysis} 
            onConfirm={() => setAppState(AppState.VERSION_SELECTED)} 
            onBack={() => setAppState(AppState.MODE_SELECTION)} 
          />
        ) : null;

      case AppState.VERSION_SELECTED:
        return beliefAnalysis ? (
          <VersionSelected 
            analysis={beliefAnalysis} 
            onProceed={() => setAppState(AppState.IDENTITY_LOCK_IN)} 
          />
        ) : null;

      case AppState.IDENTITY_LOCK_IN:
        return beliefAnalysis ? (
          <IdentityLockIn 
            analysis={beliefAnalysis} 
            onLockIn={() => setAppState(AppState.DASHBOARD)} 
          />
        ) : null;

      case AppState.DASHBOARD: 
        return beliefAnalysis ? (
          <Dashboard 
            analysis={beliefAnalysis} 
            voiceLibrary={voiceLibrary} 
            customSoundscapes={customSoundscapes}
            selectedEnv={selectedEnv}
            vocalArchetype={vocalArchetype}
            onEnvChange={(e) => setSelectedEnv(e)} 
            onStartSession={() => setAppState(AppState.SESSION)} 
            onRecordVoice={() => { setActiveRecordingAff(null); setAppState(AppState.VOICE_CALIBRATION); }}
            onRecordAffirmation={(aff) => { setActiveRecordingAff(aff); setAppState(AppState.VOICE_CALIBRATION); }}
            onOpenSoundscapeEditor={() => setAppState(AppState.SOUNDSCAPE_EDITOR)}
            onDeleteVoice={(id) => setVoiceLibrary(voiceLibrary.filter(v=>v.id!==id))}
            onDeleteSoundscape={(id) => setCustomSoundscapes(prev => prev.filter(s => s.id !== id))}
            onUpdateAnalysis={(a) => {
              setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, analysis: a } : s));
            }}
            onStartNewAnalysis={() => {
              setAppState(AppState.MODE_SELECTION);
            }}
            onIdentityLockIn={() => setAppState(AppState.IDENTITY_LOCK_IN)}
            onAudioEngine={() => setAppState(AppState.AUDIO_ENGINE)}
            onFrequencyMap={() => setAppState(AppState.FREQUENCY_MAP)}
            activeSessionLabel={activeSession?.label}
          />
        ) : null;

      case AppState.AUDIO_ENGINE:
        return (
          <AudioEngineDashboard 
            onSaveAudio={handleSaveAudio}
            onDeleteAudio={handleDeleteAudio}
            savedAudios={processedAudios}
            onBack={() => setAppState(AppState.DASHBOARD)}
          />
        );

      case AppState.FREQUENCY_MAP:
        return <FrequencyMap onBack={() => setAppState(AppState.DASHBOARD)} />;

      case AppState.VOICE_CALIBRATION: 
        return <VoiceManager 
          targetAffirmation={(activeRecordingAff && activeRecordingAff.text) ? activeRecordingAff.text : "I AM now calibrating my unique neural biometric seed. I AM safe to be heard. I AM safe to be seen."} 
          onSave={handleVoiceSave} 
          onBack={() => { setActiveRecordingAff(null); setAppState(AppState.DASHBOARD); }} 
        />;

      case AppState.SOUNDSCAPE_EDITOR:
        return beliefAnalysis ? (
          <SoundscapeEditor 
            affirmations={beliefAnalysis.affirmations}
            onSave={handleSaveSoundscape}
            onBack={() => setAppState(AppState.DASHBOARD)}
          />
        ) : null;

      case AppState.SESSION: 
        return beliefAnalysis ? (
          <SessionPlayer 
            affirmations={beliefAnalysis.affirmations} 
            voiceData={voiceLibrary[0] || null} 
            env={selectedEnv} 
            vocalArchetype={vocalArchetype}
            onEnd={() => setAppState(AppState.DASHBOARD)} 
          />
        ) : null;

      default: return null;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-deep-black text-slate-100 font-sans">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-green/10 rounded-full blur-[120px] animate-glow-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-hot-pink/10 rounded-full blur-[120px] animate-glow-pulse" style={{ animationDelay: '-2s' }}></div>
        <div className="absolute inset-0 bg-grain mix-blend-overlay opacity-20"></div>
      </div>

      <nav className="relative z-50 flex items-center justify-between px-8 py-8 md:px-12">
        <div 
          className="flex items-center space-x-4 cursor-pointer group" 
          onClick={() => setAppState(AppState.LANDING)}
        >
          <div className="relative">
            <div className="w-10 h-10 bg-neon-green rounded-full blur-[4px] group-hover:blur-[8px] transition-all duration-500"></div>
            <div className="absolute inset-0 w-10 h-10 border-2 border-white/20 rounded-full"></div>
          </div>
          <span className="font-display text-2xl font-bold tracking-tighter neon-text-green">THETA</span>
        </div>
        
        <div className="hidden md:flex items-center space-x-12">
          <button className="text-[11px] uppercase tracking-[0.3em] text-slate-400 font-bold hover:text-neon-green transition-colors duration-300">Neural Resynthesis</button>
          <button className="text-[11px] uppercase tracking-[0.3em] text-slate-400 font-bold hover:text-hot-pink transition-colors duration-300">Entrainment</button>
          <div className="h-4 w-[1px] bg-white/10"></div>
          <button className="px-6 py-2 rounded-full border border-white/10 text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-white/5 transition-all">Protocol v5.0</button>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto">
        {renderContent()}
      </main>
      
      <footer className="fixed bottom-8 left-8 right-8 z-50 flex justify-between items-end pointer-events-none opacity-40">
        <div className="text-[9px] font-mono tracking-widest uppercase">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-1 h-1 bg-neon-green rounded-full animate-pulse"></div>
            <span>System Active</span>
          </div>
          <div className="text-slate-500">Neural Link: Stable</div>
        </div>
        <div className="text-[9px] font-mono tracking-widest uppercase text-right">
          <div className="text-slate-500">Biometric Sync</div>
          <div>{new Date().toLocaleTimeString()} UTC</div>
        </div>
      </footer>
    </div>
  );
};

export default App;
