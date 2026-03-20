
import React, { useState, useEffect, useRef } from 'react';
import { BeliefAnalysis, Affirmation, UserVoiceData, NeuralEnvironment, SynthesisEngine, VocalArchetype, CustomSoundscape, AffirmationLayer, IntensityMode } from '../types';
import { ThetaAudioEngine } from '../services/audioEngine';

interface DashboardProps {
  analysis: BeliefAnalysis;
  voiceLibrary: UserVoiceData[];
  customSoundscapes: CustomSoundscape[];
  selectedEnv: NeuralEnvironment;
  vocalArchetype: VocalArchetype;
  onEnvChange: (env: NeuralEnvironment) => void;
  onStartSession: () => void;
  onRecordVoice: () => void;
  onRecordAffirmation: (aff: Affirmation) => void;
  onDeleteVoice: (id: string) => void;
  onUpdateAnalysis: (analysis: BeliefAnalysis) => void;
  onOpenSoundscapeEditor: () => void;
  onDeleteSoundscape: (id: string) => void;
  onStartNewAnalysis: () => void;
  onIdentityLockIn: () => void;
  onAudioEngine: () => void;
  onFrequencyMap: () => void;
  activeSessionLabel?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  analysis, voiceLibrary, customSoundscapes, selectedEnv, vocalArchetype,
  onEnvChange, onStartSession, onRecordVoice, onRecordAffirmation, onDeleteVoice, 
  onUpdateAnalysis, onOpenSoundscapeEditor, onDeleteSoundscape, onStartNewAnalysis,
  onIdentityLockIn, onAudioEngine, onFrequencyMap, activeSessionLabel
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingSoundscapeId, setPlayingSoundscapeId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const [customHz, setCustomHz] = useState(432);
  const [rightHz, setRightHz] = useState(436.5);
  const [isAlchemyLive, setIsAlchemyLive] = useState(false);
  const [isOceanLive, setIsOceanLive] = useState(false);
  const [isRainLive, setIsRainLive] = useState(false);
  const [synthesisEngine, setSynthesisEngine] = useState<SynthesisEngine>(SynthesisEngine.GEMINI);
  const [binauralVolume, setBinauralVolume] = useState(0.35);
  const [oceanVolume, setOceanVolume] = useState(0.4);
  const [rainVolume, setRainVolume] = useState(0.3);

  const engine = ThetaAudioEngine.getInstance();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wakeLockRef = useRef<any>(null);

  const affirmations = analysis.affirmations;

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      // Release wake lock on component unmount
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);

  const handlePlayVoice = async (audioData: string, id: string) => {
    if (playingId === id) {
      engine.stopPreview();
      setPlayingId(null);
      return;
    }
    try {
      setPlayingId(id);
      await engine.init();
      await engine.loadVoiceFromBase64(audioData);
      const source = engine.playPreview();
      if (source) source.onended = () => setPlayingId(null);
      else setPlayingId(null);
    } catch (e) { setPlayingId(null); }
  };

  const handleAlchemyToggle = async () => {
    const nextState = !isAlchemyLive;
    setIsAlchemyLive(nextState);
    if (!nextState) {
      engine.stopEntrainment();
      // Release wake lock when stopping
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } else {
      await engine.init();
      engine.startCustomTrack(customHz, rightHz, 0.5, binauralVolume);
      drawScope();

      // Request wake lock to keep screen on
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('Wake Lock activated - screen will stay on');
        }
      } catch (err) {
        console.warn('Wake Lock not supported:', err);
      }
    }
  };

  const handleOceanToggle = async () => {
    const nextState = !isOceanLive;
    setIsOceanLive(nextState);
    if (!nextState) {
      engine.stopOceanSound();
    } else {
      await engine.init();
      engine.startOceanSound(oceanVolume);
    }
  };

  const handleRainToggle = async () => {
    const nextState = !isRainLive;
    setIsRainLive(nextState);
    if (!nextState) {
      engine.stopRainSound();
    } else {
      await engine.init();
      engine.startRainSound(rainVolume);
    }
  };

  const handlePlaySoundscape = async (soundscape: CustomSoundscape) => {
    if (playingSoundscapeId === soundscape.id) {
      engine.stopBackground();
      engine.stopAllScheduled();
      if (timerRef.current) window.clearInterval(timerRef.current);
      setPlayingSoundscapeId(null);
      return;
    }

    try {
      setPlayingSoundscapeId(soundscape.id);
      await engine.init();
      
      if (soundscape.backgroundAudioData) {
        await engine.loadBackgroundAudio(soundscape.backgroundAudioData);
        engine.startBackgroundLoop(0.5);
      }

      const scheduleLayers = () => {
        soundscape.layers.forEach(layer => {
          const aff = analysis.affirmations.find(a => a.id === layer.affirmationId);
          const audio = aff?.userRecording || aff?.audioData;
          if (audio) {
            engine.scheduleAffirmation(audio, layer.startTime, layer.volume);
          }
        });
      };

      scheduleLayers();

      if (soundscape.loop) {
        timerRef.current = window.setInterval(() => {
          engine.stopAllScheduled();
          scheduleLayers();
        }, soundscape.duration * 1000);
      }
    } catch (e) {
      setPlayingSoundscapeId(null);
    }
  };

  const handleDownloadSoundscape = async (ss: CustomSoundscape) => {
    setDownloadingId(ss.id);
    try {
      const blob = await engine.renderSoundscape(ss.backgroundAudioData, ss.layers, affirmations);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ss.name.replace(/\s+/g, '_')}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed", e);
      alert("Failed to render soundscape for download.");
    } finally {
      setDownloadingId(null);
    }
  };

  const drawScope = () => {
    if (!canvasRef.current || !engine.analyser) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const bufferLength = engine.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const render = () => {
      if (!isAlchemyLive) return;
      engine.analyser!.getByteTimeDomainData(dataArray);
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      
      // Create gradient for oscilloscope
      const gradient = ctx.createLinearGradient(0, 0, canvasRef.current!.width, 0);
      gradient.addColorStop(0, '#00FF9F');
      gradient.addColorStop(0.5, '#FF2D9A');
      gradient.addColorStop(1, '#00FF9F');
      
      ctx.lineWidth = 3;
      ctx.strokeStyle = gradient;
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(0, 255, 159, 0.5)';
      
      ctx.beginPath();
      const sliceWidth = canvasRef.current!.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvasRef.current!.height) / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
      requestAnimationFrame(render);
    };
    render();
  };

  const pairingLevel = affirmations.length > 0 ? Math.round(((voiceLibrary.length > 0 ? 40 : 0) + (affirmations.filter(a => !!a.userRecording).length / affirmations.length) * 60)) : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 pb-40 relative">
      <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div className="relative">
          <div className="absolute -left-8 top-0 w-1 h-full bg-gradient-to-b from-neon-green to-transparent opacity-50"></div>
          <p className="text-neon-green text-[10px] uppercase tracking-[0.5em] font-black mb-4 flex items-center">
            <span className="w-2 h-2 bg-neon-green rounded-full mr-3 animate-pulse"></span>
            Neural Status: Optimized
          </p>
          <h1 className="text-6xl md:text-7xl font-display font-bold tracking-tighter leading-tight text-white">
            SYSTEM <span className="neon-text-pink italic font-serif font-normal">MAP</span>
          </h1>
          <p className="text-slate-500 text-sm mt-4 font-light tracking-wide flex items-center">
            Current Archetype: <span className="text-neon-green font-bold uppercase tracking-widest text-[11px] ml-2">The {vocalArchetype}</span>
            <span className="mx-4 w-1 h-1 bg-slate-800 rounded-full"></span>
            Active Map: <span className="text-white font-bold uppercase tracking-widest text-[11px] ml-2">{activeSessionLabel || 'Primary'}</span>
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          <button 
            onClick={onIdentityLockIn}
            className="glass-panel p-6 rounded-3xl flex items-center space-x-8 min-w-[240px] border border-hot-pink/30 bg-hot-pink/5 hover:bg-hot-pink/10 transition-all group"
          >
             <div className="text-right flex-1">
               <p className="text-[10px] text-hot-pink uppercase tracking-[0.3em] font-bold mb-1">Daily Protocol</p>
               <p className="text-xl font-display font-bold text-white group-hover:neon-text-pink transition-all">Identity Lock-In</p>
             </div>
             <div className="w-12 h-12 rounded-full bg-hot-pink/20 flex items-center justify-center text-hot-pink group-hover:scale-110 transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
             </div>
          </button>

          <button 
            onClick={onAudioEngine}
            className="glass-panel p-6 rounded-3xl flex items-center space-x-8 min-w-[240px] border border-neon-green/30 bg-neon-green/5 hover:bg-neon-green/10 transition-all group"
          >
             <div className="text-right flex-1">
               <p className="text-[10px] text-neon-green uppercase tracking-[0.3em] font-bold mb-1">Sonic DNA</p>
               <p className="text-xl font-display font-bold text-white group-hover:neon-text-green transition-all">Audio Engine</p>
             </div>
             <div className="w-12 h-12 rounded-full bg-neon-green/20 flex items-center justify-center text-neon-green group-hover:scale-110 transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
             </div>
          </button>

          <button 
            onClick={onFrequencyMap}
            className="glass-panel p-6 rounded-3xl flex items-center space-x-8 min-w-[240px] border border-white/10 bg-white/5 hover:bg-white/10 transition-all group"
          >
             <div className="text-right flex-1">
               <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold mb-1">Neural Atlas</p>
               <p className="text-xl font-display font-bold text-white group-hover:neon-text-green transition-all">Frequency Map</p>
             </div>
             <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:text-neon-green transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A2 2 0 013 15.487V6.513a2 2 0 011.553-1.943L9 2l5.447 2.724A2 2 0 0116 6.667v8.82a2 2 0 01-1.553 1.943L9 20z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20V9" /></svg>
             </div>
          </button>

          <div className="glass-panel p-6 rounded-3xl flex items-center space-x-8 min-w-[240px] neon-border-green">
             <div className="text-right flex-1">
               <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold mb-1">Frequency Shift</p>
               <p className="text-xl font-display font-bold text-white truncate max-w-[200px]">{analysis.desiredFrequency?.pattern || 'Optimizing'}</p>
             </div>
             <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-white/5"></div>
                <div 
                  className="absolute inset-0 rounded-full border-2 border-neon-green border-t-transparent animate-spin" 
                  style={{ animationDuration: '2s', boxShadow: '0 0 15px rgba(0,255,159,0.2)' }} 
                />
                <div className="w-8 h-8 bg-neon-green/10 rounded-full blur-md animate-pulse"></div>
             </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Control Panel */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* Frequency Analysis Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-8 rounded-[40px] border border-white/5">
              <h4 className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-bold mb-6">Current Pattern</h4>
              <p className="text-white font-display text-2xl font-bold mb-2">{analysis.currentFrequency?.pattern}</p>
              <p className="text-slate-400 text-xs font-light leading-relaxed">{analysis.currentFrequency?.description}</p>
            </div>
            <div className="glass-panel p-8 rounded-[40px] border border-neon-green/20 bg-neon-green/[0.02]">
              <h4 className="text-[10px] uppercase tracking-[0.4em] text-neon-green font-bold mb-6">Target Frequency</h4>
              <p className="text-white font-display text-2xl font-bold mb-2">{analysis.desiredFrequency?.pattern}</p>
              <p className="text-slate-400 text-xs font-light leading-relaxed">{analysis.desiredFrequency?.description}</p>
            </div>
          </div>

          {/* Alignment Tracker (RAS Amplifier) */}
          <div className="glass-panel p-10 rounded-[48px] border border-white/5">
            <div className="flex items-center space-x-4 mb-10">
              <div className="w-2 h-8 bg-neon-green rounded-full"></div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-white">Alignment Tracker</h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">RAS / Attention Amplifier</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {analysis.evidenceTasks?.map((task, idx) => (
                <div key={idx} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-neon-green/30 transition-all group">
                  <p className="text-neon-green text-[10px] font-black mb-3">TASK 0{idx + 1}</p>
                  <p className="text-white text-sm font-bold mb-2">{task.title}</p>
                  <p className="text-slate-500 text-xs font-light leading-relaxed">{task.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Soundscape Architect - NEW PROMINENT SECTION */}
          <div className="glass-panel p-10 rounded-[48px] relative overflow-hidden group border-2 border-neon-green/30 bg-neon-green/[0.02]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-neon-green/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 relative z-10">
              <div>
                <div className="flex items-center space-x-4 mb-2">
                  <div className="w-2 h-8 bg-neon-green rounded-full shadow-[0_0_10px_rgba(0,255,159,0.5)]"></div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-white">Soundscape Architect</h3>
                </div>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest font-medium ml-6">Design custom neural environments for deep sleep & integration</p>
              </div>
              
              <button 
                onClick={onOpenSoundscapeEditor}
                className="neon-button-green px-10 py-4 text-[10px] tracking-[0.3em]"
              >
                Launch Editor
              </button>
            </div>

            {customSoundscapes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                {customSoundscapes.map((ss) => (
                  <div key={ss.id} className="glass-panel p-6 rounded-3xl border border-white/10 flex items-center justify-between bg-black/20 hover:border-neon-green/50 transition-all duration-500">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-white text-sm font-bold truncate">{ss.name}</p>
                      <p className="text-slate-500 text-[9px] uppercase tracking-widest mt-1">
                        {ss.layers.length} Layers · {Math.floor(ss.duration / 60)}:{(ss.duration % 60).toString().padStart(2, '0')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handlePlaySoundscape(ss)} 
                        className={`p-4 rounded-2xl transition-all duration-300 ${playingSoundscapeId === ss.id ? 'bg-neon-green/20 text-neon-green border border-neon-green/30 animate-pulse' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                      >
                        {playingSoundscapeId === ss.id ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                      </button>
                      <button 
                        onClick={() => handleDownloadSoundscape(ss)}
                        disabled={downloadingId === ss.id}
                        className="p-4 rounded-2xl bg-white/5 text-slate-500 hover:text-neon-green hover:bg-white/10 transition-all duration-300 disabled:opacity-50"
                        title="Download Soundscape"
                      >
                        {downloadingId === ss.id ? (
                          <div className="w-5 h-5 border-2 border-neon-green border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        )}
                      </button>
                      <button 
                        onClick={() => onDeleteSoundscape(ss.id)}
                        className="p-4 rounded-2xl bg-white/5 text-slate-500 hover:text-hot-pink hover:bg-white/10 transition-all duration-300"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 border border-dashed border-white/10 rounded-[32px] relative z-10">
                <p className="text-slate-600 text-[9px] uppercase tracking-[0.4em] font-black mb-4">No custom soundscapes found</p>
                <button onClick={onOpenSoundscapeEditor} className="text-neon-green text-[10px] uppercase tracking-widest font-bold hover:underline">Create your first</button>
              </div>
            )}
          </div>

          {/* Neural Alchemy Lab */}
          <div className="glass-panel p-10 rounded-[48px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-green/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-neon-green/10 transition-all duration-700"></div>
            
            <div className="space-y-6 mb-12 relative z-10">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-8 bg-neon-green rounded-full"></div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-white">Neural Alchemy Lab</h3>
                </div>
                <button
                  onClick={handleAlchemyToggle}
                  className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${isAlchemyLive ? 'bg-hot-pink/20 text-hot-pink border border-hot-pink/40 shadow-[0_0_20px_rgba(255,45,154,0.2)]' : 'neon-button-green'}`}
                >
                  {isAlchemyLive ? 'STOP SYNTHESIS' : 'START SYNTHESIS'}
                </button>
              </div>

              {isAlchemyLive && (
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-cyan-400 text-[8px] uppercase tracking-[0.2em] font-bold">Screen Lock Active</p>
                    <span className="text-slate-500 text-[8px]">•</span>
                    <p className="text-slate-400 text-[8px]">Audio will continue with screen on</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
              <div className="space-y-10">
                <div className="space-y-3">
                  <p className="text-[9px] uppercase tracking-[0.4em] text-slate-600 font-black text-center">Quick Presets</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setCustomHz(200);
                        setRightHz(204);
                        if(isAlchemyLive) engine.startCustomTrack(200, 204, 0.5, binauralVolume);
                      }}
                      className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-neon-green/30 hover:bg-neon-green/5 transition-all text-center"
                    >
                      <p className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Deep Med</p>
                      <p className="text-[9px] text-neon-green font-mono">4Hz θ</p>
                    </button>
                    <button
                      onClick={() => {
                        setCustomHz(220);
                        setRightHz(228);
                        if(isAlchemyLive) engine.startCustomTrack(220, 228, 0.5, binauralVolume);
                      }}
                      className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-hot-pink/30 hover:bg-hot-pink/5 transition-all text-center"
                    >
                      <p className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Manifest</p>
                      <p className="text-[9px] text-hot-pink font-mono">8Hz α</p>
                    </button>
                    <button
                      onClick={() => {
                        setCustomHz(300);
                        setRightHz(310);
                        if(isAlchemyLive) engine.startCustomTrack(300, 310, 0.5, binauralVolume);
                      }}
                      className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition-all text-center"
                    >
                      <p className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Focus</p>
                      <p className="text-[9px] text-cyan-400 font-mono">10Hz α</p>
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                  <div className="flex justify-between mb-6">
                    <label className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold">Left Ear Frequency</label>
                    <span className="text-neon-green font-display font-bold text-sm tracking-widest">{customHz}Hz</span>
                  </div>
                  <div className="relative h-12 flex items-center">
                    <input
                      type="range" min="100" max="999" value={customHz}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCustomHz(val);
                        if(isAlchemyLive) engine.startCustomTrack(val, rightHz, 0.5, binauralVolume);
                      }}
                      className="w-full h-[2px] bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-green"
                    />
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                  <div className="flex justify-between mb-6">
                    <label className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold">Right Ear Frequency</label>
                    <span className="text-hot-pink font-display font-bold text-sm tracking-widest">{rightHz}Hz</span>
                  </div>
                  <div className="relative h-12 flex items-center">
                    <input
                      type="range" min="100" max="999" value={rightHz}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setRightHz(val);
                        if(isAlchemyLive) engine.startCustomTrack(customHz, val, 0.5, binauralVolume);
                      }}
                      className="w-full h-[2px] bg-white/10 rounded-lg appearance-none cursor-pointer accent-hot-pink"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex justify-between mb-2">
                    <label className="text-[9px] uppercase tracking-[0.3em] text-slate-500 font-bold">Binaural Volume</label>
                    <span className="text-white font-display font-bold text-xs tracking-widest">{Math.round(binauralVolume * 100)}%</span>
                  </div>
                  <div className="relative h-6 flex items-center">
                    <input
                      type="range" min="0" max="100" value={binauralVolume * 100}
                      onChange={(e) => {
                        const val = Number(e.target.value) / 100;
                        setBinauralVolume(val);
                        if(isAlchemyLive) engine.setBinauralVolume(val);
                      }}
                      className="w-full h-[2px] bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-slate-600 font-black text-center mb-2">Atmospheric Overlays</p>
                  <div className="flex space-x-4">
                    <button 
                      onClick={handleOceanToggle}
                      className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 flex items-center justify-center space-x-3 ${isOceanLive ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10'}`}
                    >
                      <svg className={`w-4 h-4 ${isOceanLive ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      </svg>
                      <span>{isOceanLive ? 'STOP OCEAN' : 'START OCEAN'}</span>
                    </button>
                    <button 
                      onClick={handleRainToggle}
                      className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 flex items-center justify-center space-x-3 ${isRainLive ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10'}`}
                    >
                      <svg className={`w-4 h-4 ${isRainLive ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      <span>{isRainLive ? 'STOP RAIN' : 'START RAIN'}</span>
                    </button>
                  </div>

                  <div className="space-y-2 mt-4">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex justify-between mb-2">
                        <label className="text-[8px] uppercase tracking-[0.3em] text-cyan-400 font-bold">Ocean Volume</label>
                        <span className="text-cyan-400 font-display font-bold text-[10px] tracking-widest">{Math.round(oceanVolume * 100)}%</span>
                      </div>
                      <div className="relative h-4 flex items-center">
                        <input
                          type="range" min="0" max="100" value={oceanVolume * 100}
                          onChange={(e) => {
                            const val = Number(e.target.value) / 100;
                            setOceanVolume(val);
                            if(isOceanLive) engine.setOceanVolume(val);
                          }}
                          className="w-full h-[2px] bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex justify-between mb-2">
                        <label className="text-[8px] uppercase tracking-[0.3em] text-blue-400 font-bold">Rain Volume</label>
                        <span className="text-blue-400 font-display font-bold text-[10px] tracking-widest">{Math.round(rainVolume * 100)}%</span>
                      </div>
                      <div className="relative h-4 flex items-center">
                        <input
                          type="range" min="0" max="100" value={rainVolume * 100}
                          onChange={(e) => {
                            const val = Number(e.target.value) / 100;
                            setRainVolume(val);
                            if(isRainLive) engine.setRainVolume(val);
                          }}
                          className="w-full h-[2px] bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 rounded-[32px] border border-white/5 relative overflow-hidden h-full min-h-[300px] shadow-inner">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                {!isAlchemyLive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-12 h-[1px] bg-white/10 mb-4"></div>
                    <p className="text-[9px] uppercase tracking-[0.5em] text-slate-700 font-black">Oscilloscope Offline</p>
                  </div>
                )}
                {isAlchemyLive && (
                  <div className="absolute top-4 right-4 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
                    <span className="text-[8px] uppercase tracking-widest text-neon-green font-bold">Live Stream</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Imprint Tracks */}
          <div className="glass-panel p-10 rounded-[48px]">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-8 bg-hot-pink rounded-full"></div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-white">Neural Imprints</h3>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Identity Rehearsal Layers</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {affirmations.map((aff) => (
                <div key={aff.id} className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between group hover:border-hot-pink/30 hover:bg-white/[0.03] transition-all duration-500 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                        {aff.layer}
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                        aff.intensity === IntensityMode.DOMINANT ? 'bg-hot-pink/10 text-hot-pink border-hot-pink/20' :
                        aff.intensity === IntensityMode.POWERFUL ? 'bg-neon-green/10 text-neon-green border-neon-green/20' :
                        'bg-white/5 text-slate-500 border-white/10'
                      }`}>
                        {aff.intensity}
                      </span>
                    </div>
                    <p className="text-white text-lg font-light italic leading-relaxed">"{aff.text}"</p>
                    <div className="flex items-center mt-3">
                      <div className={`w-1.5 h-1.5 rounded-full mr-2 ${aff.userRecording ? 'bg-neon-green shadow-[0_0_8px_rgba(0,255,159,0.8)]' : 'bg-slate-700'}`}></div>
                      <span className={`text-[8px] uppercase tracking-[0.2em] font-bold ${aff.userRecording ? 'text-neon-green' : 'text-slate-600'}`}>
                        {aff.userRecording ? 'Vocal Pairing: Active' : 'Vocal Pairing: Required'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {aff.userRecording && (
                      <button 
                        onClick={() => handlePlayVoice(aff.userRecording!, aff.id)} 
                        className={`p-4 rounded-2xl transition-all duration-300 ${playingId === aff.id ? 'bg-hot-pink/20 text-hot-pink border border-hot-pink/30 animate-pulse' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                      >
                        {playingId === aff.id ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                      </button>
                    )}
                    <button 
                      onClick={() => onRecordAffirmation(aff)} 
                      className={`p-4 rounded-2xl transition-all duration-300 ${aff.userRecording ? 'bg-neon-green/10 text-neon-green border border-neon-green/30 shadow-[0_0_15px_rgba(0,255,159,0.1)]' : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-10">
           {/* Visualization Module */}
           <div className="glass-panel p-10 rounded-[48px] border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/5 rounded-full blur-3xl"></div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.5em] text-slate-400 mb-8 text-center">Already Normal</h3>
            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-medium text-center mb-6 leading-relaxed">
              Stabilize the desired identity through non-effort visualization
            </p>
            <button 
              onClick={() => alert(analysis.visualizationPrompt)}
              className="w-full py-6 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-white hover:bg-white/10 transition-all"
            >
              Launch Visualization
            </button>
          </div>

          {/* Interruption Cue */}
          <div className="glass-panel p-10 rounded-[48px] border border-hot-pink/20 bg-hot-pink/[0.02]">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.5em] text-hot-pink mb-6 text-center">Interruption Cue</h3>
            <div className="p-6 rounded-3xl bg-black/20 border border-hot-pink/10 text-center">
              <p className="text-white font-display text-xl font-bold mb-2 tracking-widest uppercase">{analysis.interruptionCue}</p>
              <p className="text-slate-500 text-[9px] uppercase tracking-widest font-medium">Use this to snap out of old patterns instantly</p>
            </div>
          </div>

           {/* Vocal Synthesis Control */}
           <div className="glass-panel p-10 rounded-[48px] neon-border-pink relative overflow-hidden">
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-hot-pink/5 rounded-full blur-3xl"></div>
            
            <h3 className="text-[10px] font-bold uppercase tracking-[0.5em] text-slate-400 mb-10 text-center">Synthesis Module</h3>
            
            <div className="flex bg-black/40 p-1.5 rounded-2xl mb-10 border border-white/5 shadow-inner">
              {[SynthesisEngine.GEMINI, SynthesisEngine.ELEVEN_LABS].map(engine => (
                <button
                  key={engine}
                  onClick={() => setSynthesisEngine(engine)}
                  className={`flex-1 py-4 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-500 ${synthesisEngine === engine ? 'bg-hot-pink text-white shadow-[0_0_20px_rgba(255,45,154,0.4)]' : 'text-slate-600 hover:text-slate-300'}`}
                >
                  {engine === SynthesisEngine.ELEVEN_LABS ? 'ElevenLabs' : 'Neural Core'}
                </button>
              ))}
            </div>

            <div className="space-y-4 mb-12">
              <label className="text-[9px] uppercase tracking-[0.3em] text-slate-600 font-bold block text-center">Resonance Archetype</label>
              <div className="flex flex-wrap gap-2 justify-center">
                {Object.values(VocalArchetype).map(arch => (
                  <button
                    key={arch}
                    onClick={() => {}} // In a real app, this would update the archetype
                    className={`px-5 py-2.5 rounded-full border text-[10px] font-bold transition-all duration-300 ${vocalArchetype === arch ? 'bg-white/10 border-hot-pink text-hot-pink shadow-[0_0_15px_rgba(255,45,154,0.1)]' : 'border-white/5 text-slate-500 hover:border-white/20 hover:text-slate-300'}`}
                  >
                    {arch}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-8 border-t border-white/5">
              <button 
                onClick={onStartSession} 
                className="neon-button-pink w-full py-6 text-xs tracking-[0.4em]"
              >
                INITIATE IMMERSION
              </button>
            </div>
          </div>

          {/* Biometric Seed */}
          <div className="glass-panel p-10 rounded-[48px] group">
             <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 mb-8">Biometric Seed</h3>
             {voiceLibrary.length > 0 ? (
                <div className="p-6 bg-neon-green/5 border border-neon-green/20 rounded-3xl flex items-center justify-between group-hover:bg-neon-green/10 transition-all duration-500">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center mr-4">
                      <div className="w-4 h-4 bg-neon-green rounded-full animate-ping"></div>
                    </div>
                    <div>
                      <p className="text-xs text-neon-green font-bold uppercase tracking-widest">Active</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Biometric Sync: 100%</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handlePlayVoice(voiceLibrary[0].audioData, voiceLibrary[0].id)} 
                      className={`p-2 transition-colors duration-300 ${playingId === voiceLibrary[0].id ? 'text-hot-pink animate-pulse' : 'text-slate-600 hover:text-neon-green'}`}
                    >
                      {playingId === voiceLibrary[0].id ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      )}
                    </button>
                    <button onClick={() => onDeleteVoice(voiceLibrary[0].id)} className="p-2 text-slate-600 hover:text-hot-pink transition-colors duration-300">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
             ) : (
                <button 
                  onClick={onRecordVoice} 
                  className="w-full py-12 border-2 border-dashed border-white/5 rounded-[32px] text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600 hover:text-neon-green hover:border-neon-green/30 hover:bg-neon-green/5 transition-all duration-500 group"
                >
                  <div className="mb-4 flex justify-center">
                    <svg className="w-8 h-8 opacity-20 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  Capture Biometric Seed
                </button>
             )}
          </div>
          <button 
            onClick={onStartNewAnalysis}
            className="w-full py-4 rounded-xl border border-white/5 text-[10px] uppercase tracking-[0.2em] text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            Start New Analysis
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
