
import React, { useState, useRef, useEffect } from 'react';
import { Affirmation, CustomSoundscape, SoundscapeLayer } from '../types';
import { ThetaAudioEngine } from '../services/audioEngine';

interface SoundscapeEditorProps {
  affirmations: Affirmation[];
  onSave: (soundscape: CustomSoundscape) => void;
  onBack: () => void;
}

const SoundscapeEditor: React.FC<SoundscapeEditorProps> = ({ affirmations, onSave, onBack }) => {
  const [bgAudio, setBgAudio] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [layers, setLayers] = useState<SoundscapeLayer[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [name, setName] = useState("My Sleep Mix");
  const [loop, setLoop] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const engine = ThetaAudioEngine.getInstance();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setBgAudio(base64);
      const dur = await engine.loadBackgroundAudio(base64);
      setDuration(dur);
    };
    reader.readAsDataURL(file);
  };

  const addLayer = (affId: string) => {
    const newLayer: SoundscapeLayer = {
      id: Math.random().toString(36).substr(2, 9),
      affirmationId: affId,
      startTime: currentTime,
      volume: 0.8
    };
    setLayers([...layers, newLayer]);
  };

  const removeLayer = (id: string) => {
    setLayers(layers.filter(l => l.id !== id));
  };

  const updateLayerTime = (id: string, time: number) => {
    setLayers(layers.map(l => l.id === id ? { ...l, startTime: Math.max(0, Math.min(duration, time)) } : l));
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      engine.stopBackground();
      engine.stopAllScheduled();
      setIsPlaying(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
    } else {
      if (!bgAudio) return;
      setIsPlaying(true);
      engine.startBackgroundLoop(0.5);
      
      // Schedule all layers from current time
      const scheduleLayers = (offset: number) => {
        layers.forEach(layer => {
          if (layer.startTime >= offset) {
            const aff = affirmations.find(a => a.id === layer.affirmationId);
            const audio = aff?.userRecording || aff?.audioData;
            if (audio) {
              engine.scheduleAffirmation(audio, layer.startTime - offset, layer.volume);
            }
          }
        });
      };

      scheduleLayers(currentTime);

      const start = Date.now() - (currentTime * 1000);
      timerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        if (elapsed >= duration) {
          if (loop) {
            setCurrentTime(0);
            engine.stopAllScheduled();
            scheduleLayers(0);
            // Reset the interval start time to now
            // This is a bit tricky with setInterval, but for simplicity:
            // (In a real app we'd use a better timing mechanism)
          } else {
            togglePlayback();
            setCurrentTime(0);
          }
        } else {
          setCurrentTime(elapsed);
        }
      }, 100);
    }
  };

  const handleDownload = async () => {
    if (!bgAudio) return;
    setIsDownloading(true);
    try {
      const blob = await engine.renderSoundscape(bgAudio, layers, affirmations);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s+/g, '_')}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed", e);
      alert("Failed to render soundscape for download.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSave = () => {
    if (!bgAudio) return;
    onSave({
      id: Math.random().toString(36).substr(2, 9),
      name,
      backgroundAudioData: bgAudio,
      layers,
      loop,
      duration
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 pb-40">
      <header className="flex justify-between items-center mb-12">
        <div>
          <button onClick={onBack} className="text-slate-500 hover:text-white mb-4 flex items-center text-[10px] uppercase tracking-widest font-bold transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7" /></svg>
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-display font-bold text-white tracking-tight">SOUNDSCAPE <span className="neon-text-pink italic font-serif font-normal">ARCHITECT</span></h1>
        </div>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Loop</span>
            <button 
              onClick={() => setLoop(!loop)}
              className={`w-10 h-5 rounded-full relative transition-colors ${loop ? 'bg-neon-green' : 'bg-slate-800'}`}
            >
              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${loop ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-hot-pink/50 transition-colors w-48"
          />
          <button 
            onClick={handleDownload} 
            disabled={!bgAudio || isDownloading}
            className="px-6 py-3 rounded-xl border border-white/10 text-[10px] tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
          >
            {isDownloading ? 'RENDERING...' : 'DOWNLOAD'}
          </button>
          <button onClick={handleSave} className="neon-button-pink px-8 py-3 text-[10px] tracking-widest">SAVE MASTER</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Affirmation Library */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-panel p-6 rounded-[32px] border border-white/5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Neural Assets</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {affirmations.map(aff => (
                <button 
                  key={aff.id}
                  onClick={() => addLayer(aff.id)}
                  className="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-neon-green/30 hover:bg-white/10 transition-all group"
                >
                  <p className="text-xs text-slate-300 italic truncate mb-2">"{aff.text}"</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-[8px] uppercase tracking-widest font-bold ${aff.userRecording ? 'text-neon-green' : 'text-slate-600'}`}>
                      {aff.userRecording ? 'Biological' : 'Synthetic'}
                    </span>
                    <svg className="w-4 h-4 text-slate-600 group-hover:text-neon-green transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Editor */}
        <div className="lg:col-span-9 space-y-8">
          {!bgAudio ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[21/9] border-2 border-dashed border-white/5 rounded-[48px] flex flex-col items-center justify-center cursor-pointer hover:border-hot-pink/30 hover:bg-hot-pink/5 transition-all group"
            >
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*" className="hidden" />
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-slate-500 group-hover:text-hot-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm text-slate-400 font-medium tracking-wide">Upload Background Frequency</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-[0.3em] mt-2">MP3, WAV, M4A supported</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Timeline Controls */}
              <div className="flex items-center space-x-6 glass-panel p-4 rounded-3xl border border-white/5">
                <button 
                  onClick={togglePlayback}
                  className="w-14 h-14 rounded-2xl bg-hot-pink flex items-center justify-center shadow-[0_0_20px_rgba(255,45,154,0.3)] hover:scale-105 transition-transform"
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  ) : (
                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-mono text-hot-pink font-bold">
                      {Math.floor(currentTime / 60)}:{(Math.floor(currentTime) % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-600">
                      {Math.floor(duration / 60)}:{(Math.floor(duration) % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full relative">
                    <div 
                      className="absolute top-0 left-0 h-full bg-hot-pink shadow-[0_0_10px_rgba(255,45,154,0.5)]"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Timeline Track */}
              <div className="relative glass-panel rounded-[40px] border border-white/5 p-10 min-h-[400px] overflow-hidden bg-black/20">
                {/* Time Grid */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex-1 border-r border-white/5 h-full" />
                  ))}
                </div>

                {/* Playhead */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-hot-pink z-20 shadow-[0_0_15px_rgba(255,45,154,0.8)] pointer-events-none"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                />

                {/* Layers */}
                <div className="relative z-10 space-y-4">
                  {layers.map(layer => {
                    const aff = affirmations.find(a => a.id === layer.affirmationId);
                    return (
                      <div 
                        key={layer.id}
                        className="absolute h-16 bg-neon-green/10 border border-neon-green/30 rounded-2xl p-3 flex items-center group cursor-move"
                        style={{ 
                          left: `${(layer.startTime / duration) * 100}%`,
                          width: '200px',
                          top: `${layers.indexOf(layer) * 80}px`
                        }}
                        onMouseDown={(e) => {
                          const startX = e.clientX;
                          const initialTime = layer.startTime;
                          const onMouseMove = (moveE: MouseEvent) => {
                            const deltaX = moveE.clientX - startX;
                            const deltaTime = (deltaX / e.currentTarget.parentElement!.clientWidth) * duration;
                            updateLayerTime(layer.id, initialTime + deltaTime);
                          };
                          const onMouseUp = () => {
                            window.removeEventListener('mousemove', onMouseMove);
                            window.removeEventListener('mouseup', onMouseUp);
                          };
                          window.addEventListener('mousemove', onMouseMove);
                          window.addEventListener('mouseup', onMouseUp);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] text-white font-bold truncate">"{aff?.text}"</p>
                          <p className="text-[8px] text-neon-green/60 uppercase tracking-widest mt-1">
                            {Math.floor(layer.startTime / 60)}:{(Math.floor(layer.startTime) % 60).toString().padStart(2, '0')}
                          </p>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                          className="w-6 h-6 rounded-lg bg-black/40 text-slate-500 hover:text-hot-pink flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {layers.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-700">
                    <p className="text-[10px] uppercase tracking-[0.4em] font-black">Drag Neural Assets onto Timeline</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SoundscapeEditor;
