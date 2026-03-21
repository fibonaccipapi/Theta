
import React, { useState, useEffect, useRef } from 'react';
import { BeliefAnalysis, Affirmation, UserVoiceData, NeuralEnvironment, SynthesisEngine, VocalArchetype, CustomSoundscape, AffirmationLayer, IntensityMode } from '../types';
import { ThetaAudioEngine } from '../services/audioEngine';
import HeroCard from './HeroCard';
import CollapsibleSection from './CollapsibleSection';
import MixStudio from './MixStudio';

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
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

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

  const handleExportMix = async (
    selectedAffirmations: Affirmation[],
    durationMinutes: number
  ) => {
    setIsExporting(true);
    setExportProgress({ current: 0, total: durationMinutes * 60 });

    try {
      const blob = await engine.exportMix(
        selectedAffirmations,
        { left: customHz, right: rightHz },
        binauralVolume,
        durationMinutes,
        (current, total) => {
          setExportProgress({ current, total });
        }
      );

      // Download the file
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `theta-hemisync-${timestamp}-${durationMinutes}min.wav`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      setExportProgress(null);
      setIsExporting(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
      setExportProgress(null);
      setIsExporting(false);
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
      <header className="mb-12 flex flex-col gap-8">
        {/* Title Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative">
            <div className="absolute -left-8 top-0 w-1 h-full bg-gradient-to-b from-neon-green to-transparent opacity-50"></div>
            <p className="text-neon-green text-[10px] uppercase tracking-[0.5em] font-black mb-4 flex items-center">
              <span className="w-2 h-2 bg-neon-green rounded-full mr-3 animate-pulse"></span>
              Neural Status: Optimized
            </p>
            <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tighter leading-tight text-white">
              SYSTEM <span className="neon-text-pink italic font-serif font-normal">MAP</span>
            </h1>
            <p className="text-slate-500 text-sm mt-4 font-light tracking-wide flex items-center flex-wrap gap-4">
              <span>Active Map: <span className="text-white font-bold uppercase tracking-widest text-[11px] ml-2">{activeSessionLabel || 'Primary'}</span></span>
            </p>
          </div>

          {/* Utility Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onIdentityLockIn}
              className="px-4 py-2 rounded-full border border-hot-pink/20 bg-hot-pink/5 hover:bg-hot-pink/10 transition-all text-[10px] uppercase tracking-[0.2em] font-bold text-hot-pink flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Daily Protocol</span>
            </button>

            <button
              onClick={onAudioEngine}
              className="px-4 py-2 rounded-full border border-neon-green/20 bg-neon-green/5 hover:bg-neon-green/10 transition-all text-[10px] uppercase tracking-[0.2em] font-bold text-neon-green flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span>Sonic DNA</span>
            </button>

            <button
              onClick={onFrequencyMap}
              className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 hover:text-white flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A2 2 0 013 15.487V6.513a2 2 0 011.553-1.943L9 2l5.447 2.724A2 2 0 0116 6.667v8.82a2 2 0 01-1.553 1.943L9 20z" />
              </svg>
              <span>Neural Atlas</span>
            </button>

            <button
              onClick={onStartNewAnalysis}
              className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 hover:text-white flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Analysis</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {/* Neural Imprints Card */}
        <HeroCard
          title="Neural Imprints"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          }
          description="Record affirmations in your own voice to bypass subconscious resistance"
          count={affirmations.length}
          primaryAction={{
            label: "Record New",
            onClick: () => onRecordAffirmation({ id: `new-${Date.now()}`, text: '', layer: 'identity' as any, intensity: 'calibrated' as any })
          }}
        >
          <div className="space-y-4">
            {affirmations.slice(0, 5).map((aff) => (
              <div key={aff.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-hot-pink/30 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-[8px] uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                        {aff.layer}
                      </span>
                      <div className={`w-1.5 h-1.5 rounded-full ${aff.userRecording ? 'bg-neon-green shadow-[0_0_8px_rgba(0,255,159,0.8)]' : 'bg-slate-700'}`}></div>
                    </div>
                    <p className="text-white text-sm font-light italic leading-relaxed">"{aff.text}"</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {aff.userRecording && (
                      <button
                        onClick={() => handlePlayVoice(aff.userRecording!, aff.id)}
                        className={`p-3 rounded-xl transition-all ${playingId === aff.id ? 'bg-hot-pink/20 text-hot-pink' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                      >
                        {playingId === aff.id ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => onRecordAffirmation(aff)}
                      className={`p-3 rounded-xl transition-all ${aff.userRecording ? 'bg-neon-green/10 text-neon-green border border-neon-green/30' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </HeroCard>

        {/* Soundscape Architect Card */}
        <HeroCard
          title="Soundscape Architect"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          }
          description="Layer affirmations with binaural beats and atmospheric sounds"
          count={customSoundscapes.length}
          primaryAction={{
            label: "Create New",
            onClick: onOpenSoundscapeEditor
          }}
        >
          <div className="space-y-3">
            {customSoundscapes.slice(0, 3).map((ss) => (
              <div key={ss.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between hover:border-neon-green/30 transition-all">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-white text-sm font-bold truncate">{ss.name}</p>
                  <p className="text-slate-500 text-[9px] uppercase tracking-widest mt-1">
                    {ss.layers.length} Layers · {Math.floor(ss.duration / 60)}:{(ss.duration % 60).toString().padStart(2, '0')}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePlaySoundscape(ss)}
                    className={`p-3 rounded-xl transition-all ${playingSoundscapeId === ss.id ? 'bg-neon-green/20 text-neon-green' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                  >
                    {playingSoundscapeId === ss.id ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>
                  <button
                    onClick={() => onDeleteSoundscape(ss.id)}
                    className="p-3 rounded-xl bg-white/5 text-slate-500 hover:text-hot-pink hover:bg-white/10 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </HeroCard>

        {/* Neural Alchemy Lab Card */}
        <HeroCard
          title="Neural Alchemy Lab"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          description="Generate custom binaural frequencies with hemisync audio"
          isActive={isAlchemyLive}
          primaryAction={{
            label: isAlchemyLive ? "Stop Synthesis" : "Start Synthesis",
            onClick: handleAlchemyToggle
          }}
        >
          <div className="space-y-6">
            {/* Presets */}
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

            {/* Controls */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex justify-between mb-3">
                  <label className="text-[9px] uppercase tracking-[0.3em] text-slate-500 font-bold">Left Ear</label>
                  <span className="text-neon-green font-display font-bold text-xs tracking-widest">{customHz}Hz</span>
                </div>
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

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex justify-between mb-3">
                  <label className="text-[9px] uppercase tracking-[0.3em] text-slate-500 font-bold">Right Ear</label>
                  <span className="text-hot-pink font-display font-bold text-xs tracking-widest">{rightHz}Hz</span>
                </div>
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

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex justify-between mb-2">
                  <label className="text-[8px] uppercase tracking-[0.3em] text-slate-500 font-bold">Volume</label>
                  <span className="text-white font-display font-bold text-[10px] tracking-widest">{Math.round(binauralVolume * 100)}%</span>
                </div>
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

            {/* Atmospheric Overlays */}
            <div className="space-y-3">
              <p className="text-[9px] uppercase tracking-[0.4em] text-slate-600 font-black text-center">Atmospheric Overlays</p>
              <div className="flex space-x-3">
                <button
                  onClick={handleOceanToggle}
                  className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center space-x-2 ${isOceanLive ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10'}`}
                >
                  <span>{isOceanLive ? 'Stop' : 'Ocean'}</span>
                </button>
                <button
                  onClick={handleRainToggle}
                  className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center space-x-2 ${isRainLive ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10'}`}
                >
                  <span>{isRainLive ? 'Stop' : 'Rain'}</span>
                </button>
              </div>

              {(isOceanLive || isRainLive) && (
                <div className="space-y-2">
                  {isOceanLive && (
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="flex justify-between mb-1">
                        <label className="text-[8px] uppercase tracking-[0.3em] text-cyan-400 font-bold">Ocean</label>
                        <span className="text-cyan-400 font-display font-bold text-[9px] tracking-widest">{Math.round(oceanVolume * 100)}%</span>
                      </div>
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
                  )}

                  {isRainLive && (
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="flex justify-between mb-1">
                        <label className="text-[8px] uppercase tracking-[0.3em] text-blue-400 font-bold">Rain</label>
                        <span className="text-blue-400 font-display font-bold text-[9px] tracking-widest">{Math.round(rainVolume * 100)}%</span>
                      </div>
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
                  )}
                </div>
              )}
            </div>

            {/* Oscilloscope */}
            <div className="bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden h-48">
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
              {!isAlchemyLive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-12 h-[1px] bg-white/10 mb-4"></div>
                  <p className="text-[8px] uppercase tracking-[0.5em] text-slate-700 font-black">Offline</p>
                </div>
              )}
            </div>

            {/* Mix Studio */}
            <MixStudio
              affirmations={affirmations}
              currentBinauralHz={{ left: customHz, right: rightHz }}
              currentBinauralVolume={binauralVolume}
              onExport={handleExportMix}
              isExporting={isExporting}
              exportProgress={exportProgress}
            />
          </div>
        </HeroCard>
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-6">
        <CollapsibleSection title="Frequency Analysis" defaultOpen={false}>
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
        </CollapsibleSection>

        <CollapsibleSection title="Alignment Tracker (RAS Amplifier)" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analysis.evidenceTasks?.map((task, idx) => (
              <div key={task.id} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-neon-green/30 transition-all group">
                <p className="text-neon-green text-[10px] font-black mb-3">TASK 0{idx + 1}</p>
                <p className="text-white text-sm font-bold mb-2">{task.title}</p>
                <p className="text-slate-500 text-xs font-light leading-relaxed">{task.description}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
};

export default Dashboard;
