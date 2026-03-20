import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  Mic, 
  Zap, 
  Waves, 
  Activity, 
  Save, 
  Play, 
  Pause, 
  Trash2, 
  Settings, 
  Volume2, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  Plus,
  ArrowLeft,
  Headphones,
  Moon,
  Target,
  Sun,
  Wind,
  CloudMoon,
  Palette,
  Eye
} from 'lucide-react';
import { ThetaAudioEngine } from '../services/audioEngine';
import { ProcessedAudio, AudioProfile, BinauralBeatConfig } from '../types';
import { BINAURAL_PRESETS } from '../constants';

interface AudioEngineDashboardProps {
  onBack: () => void;
  onSaveAudio: (audio: ProcessedAudio) => void;
  savedAudios: ProcessedAudio[];
  onDeleteAudio: (id: string) => void;
}

export const AudioEngineDashboard: React.FC<AudioEngineDashboardProps> = ({
  onBack,
  onSaveAudio,
  savedAudios,
  onDeleteAudio
}) => {
  const [activeTab, setActiveTab] = useState<'analyzer' | 'generator' | 'mixer' | 'library'>('analyzer');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<AudioProfile | null>(null);
  const [currentBuffer, setCurrentBuffer] = useState<AudioBuffer | null>(null);
  const [currentName, setCurrentName] = useState('');

  const [binauralConfig, setBinauralConfig] = useState<BinauralBeatConfig>({
    carrierHz: 200,
    targetHz: 4.5,
    brainwaveRange: 'theta',
    volume: 0.3
  });
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const [reverbLevel, setReverbLevel] = useState<'off' | 'subtle' | 'deep'>('subtle');
  const [voiceBuffer, setVoiceBuffer] = useState<AudioBuffer | null>(null);
  const [musicBuffer, setMusicBuffer] = useState<AudioBuffer | null>(null);

  const audioEngine = ThetaAudioEngine.getInstance();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatus('Analyzing audio spectrum...');
    setCurrentName(file.name.split('.')[0]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      await audioEngine.init();
      const buffer = await audioEngine.ctx!.decodeAudioData(arrayBuffer);
      setCurrentBuffer(buffer);
      
      const analysis = await audioEngine.analyzeAudio(buffer);
      setCurrentAnalysis(analysis);
      setStatus('Analysis complete.');
    } catch (err) {
      console.error(err);
      setStatus('Error analyzing audio.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateBinaural = async () => {
    setIsProcessing(true);
    setStatus(`Generating ${binauralConfig.brainwaveRange} binaural beat...`);
    try {
      await audioEngine.init();
      const buffer = await audioEngine.generateBinauralBeat(binauralConfig);
      setCurrentBuffer(buffer);
      setCurrentName(`${binauralConfig.brainwaveRange.toUpperCase()} Beat - ${binauralConfig.carrierHz}Hz`);
      
      const analysis = await audioEngine.analyzeAudio(buffer);
      setCurrentAnalysis({
        ...analysis,
        isBinaural: true,
        binauralConfig
      });
      setStatus('Binaural beat generated.');
    } catch (err) {
      console.error(err);
      setStatus('Error generating tones.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCleanVoice = async () => {
    if (!currentBuffer) return;
    setIsProcessing(true);
    setStatus('Removing noise and optimizing vocal clarity...');
    try {
      const cleaned = await audioEngine.cleanVoice(currentBuffer);
      setCurrentBuffer(cleaned);
      setStatus('Voice cleaned and normalized.');
    } catch (err) {
      console.error(err);
      setStatus('Error cleaning voice.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOptimizeTheta = async () => {
    if (!currentBuffer) return;
    setIsProcessing(true);
    setStatus('Smoothing frequencies and layering Theta pulse...');
    try {
      const optimized = await audioEngine.optimizeForTheta(currentBuffer);
      setCurrentBuffer(optimized);
      setStatus('Audio optimized for subconscious depth.');
    } catch (err) {
      console.error(err);
      setStatus('Error optimizing audio.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoMix = async () => {
    if (!voiceBuffer || !musicBuffer) {
      setStatus('Please load both voice and music tracks.');
      return;
    }
    setIsProcessing(true);
    setStatus('Balancing tracks and applying ducking...');
    try {
      const mixed = await audioEngine.autoMix(voiceBuffer, musicBuffer, reverbLevel);
      setCurrentBuffer(mixed);
      setCurrentName('Neural Auto-Mix');
      setStatus('Tracks blended seamlessly.');
    } catch (err) {
      console.error(err);
      setStatus('Error mixing tracks.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!currentBuffer || !currentAnalysis) return;
    
    setIsProcessing(true);
    setStatus('Encoding and saving to library...');
    try {
      // @ts-ignore - bufferToWav is private but we can use it for now or move it to public
      const blob = audioEngine.bufferToWav(currentBuffer);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const processed: ProcessedAudio = {
          id: Math.random().toString(36).substr(2, 9),
          name: currentName || 'Untitled Track',
          processedData: base64,
          profile: currentAnalysis,
          timestamp: Date.now(),
          type: currentAnalysis.isBinaural ? 'binaural' : 'music' // Simplified
        };
        onSaveAudio(processed);
        setStatus('Saved to library.');
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error(err);
      setStatus('Error saving audio.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playPreview = () => {
    if (!currentBuffer) return;
    audioEngine.setVoiceBuffer(currentBuffer);
    audioEngine.playPreview();
  };

  const stopPreview = () => {
    audioEngine.stopPreview();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Audio Engine</h1>
            <p className="text-white/40 text-sm">Studio-grade processing for neural sessions</p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl">
          {[
            { id: 'analyzer', label: 'Analyzer', icon: Activity },
            { id: 'generator', label: 'Binaural', icon: Waves },
            { id: 'mixer', label: 'Auto-Mix', icon: Zap },
            { id: 'library', label: 'Library', icon: FileAudio },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
                activeTab === tab.id ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Controls */}
          <div className="md:col-span-2 space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === 'analyzer' && (
                <motion.div
                  key="analyzer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/5 rounded-2xl p-6 border border-white/10"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <Activity className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-semibold">Spectrum Analyzer</h2>
                  </div>

                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-xl p-10 text-center hover:border-white/20 transition-colors cursor-pointer"
                  >
                    <FileAudio className="w-10 h-10 text-white/20 mx-auto mb-4" />
                    <p className="text-sm text-white/60">Drop audio file or click to upload</p>
                    <p className="text-xs text-white/30 mt-2">WAV, MP3, M4A supported</p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      accept="audio/*"
                    />
                  </div>

                  {currentAnalysis && (
                    <div className="mt-8 grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-xl">
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">BPM</p>
                        <p className="text-2xl font-mono">{currentAnalysis.bpm}</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl">
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Musical Key</p>
                        <p className="text-2xl font-mono">{currentAnalysis.key}</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl">
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Energy</p>
                        <p className="text-lg font-medium capitalize">{currentAnalysis.energy}</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl">
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Theta Score</p>
                        <p className="text-2xl font-mono text-emerald-400">{currentAnalysis.thetaCompatibility}%</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'generator' && (
                <motion.div
                  key="generator"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/5 rounded-2xl p-6 border border-white/10"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Waves className="w-5 h-5 text-blue-400" />
                    </div>
                    <h2 className="text-lg font-semibold">Neural Alchemy Lab</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Presets Grid */}
                    <div>
                      <label className="text-xs text-white/40 uppercase tracking-wider mb-3 block">Alchemy Presets</label>
                      <div className="grid grid-cols-3 gap-3">
                        {BINAURAL_PRESETS.map(preset => {
                          const Icon = {
                            Moon, Sparkles, Zap, Target, Sun, Wind, CloudMoon, Palette, Eye
                          }[preset.icon] || Waves;
                          
                          return (
                            <button
                              key={preset.id}
                              onClick={() => {
                                setSelectedPresetId(preset.id);
                                setBinauralConfig({
                                  ...binauralConfig,
                                  carrierHz: preset.carrierHz,
                                  targetHz: preset.targetHz,
                                  brainwaveRange: preset.brainwaveRange
                                });
                              }}
                              className={`p-3 rounded-xl border transition-all text-left group ${
                                selectedPresetId === preset.id 
                                  ? 'bg-blue-500/20 border-blue-500/50 text-white' 
                                  : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <Icon className={`w-4 h-4 ${selectedPresetId === preset.id ? 'text-blue-400' : 'text-white/20 group-hover:text-white/40'}`} />
                                <span className="text-[10px] font-mono opacity-60">{preset.targetHz}Hz</span>
                              </div>
                              <p className="text-xs font-bold leading-tight mb-1">{preset.name}</p>
                              <p className="text-[9px] opacity-50 line-clamp-1">{preset.brainwave}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    <div>
                      <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Carrier Frequency (Hz)</label>
                      <input 
                        type="range" min="100" max="900" step="1"
                        value={binauralConfig.carrierHz}
                        onChange={(e) => {
                          setBinauralConfig({...binauralConfig, carrierHz: parseInt(e.target.value)});
                          setSelectedPresetId(null);
                        }}
                        className="w-full accent-blue-500"
                      />
                      <div className="flex justify-between mt-1 text-xs font-mono text-white/40">
                        <span>100Hz</span>
                        <span className="text-white">{binauralConfig.carrierHz}Hz</span>
                        <span>900Hz</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Manual Tuning (Hz Gap)</label>
                      <input 
                        type="range" min="0.5" max="50" step="0.5"
                        value={binauralConfig.targetHz}
                        onChange={(e) => {
                          setBinauralConfig({...binauralConfig, targetHz: parseFloat(e.target.value)});
                          setSelectedPresetId(null);
                        }}
                        className="w-full accent-blue-500"
                      />
                      <div className="flex justify-between mt-1 text-xs font-mono text-white/40">
                        <span>0.5Hz</span>
                        <span className="text-white">{binauralConfig.targetHz}Hz</span>
                        <span>50Hz</span>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateBinaural}
                      disabled={isProcessing}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                    >
                      <Zap className="w-5 h-5" />
                      Generate Neural Tones
                    </button>

                    <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <Headphones className="w-4 h-4 text-blue-400" />
                      <p className="text-xs text-blue-300">Headphones required for binaural effect</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'mixer' && (
                <motion.div
                  key="mixer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/5 rounded-2xl p-6 border border-white/10"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Zap className="w-5 h-5 text-purple-400" />
                    </div>
                    <h2 className="text-lg font-semibold">Smart Auto-Mix</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs text-white/40 uppercase tracking-wider">Voice Track</p>
                        <div className={`p-4 rounded-xl border ${voiceBuffer ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'} text-center`}>
                          {voiceBuffer ? <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" /> : <Mic className="w-6 h-6 text-white/20 mx-auto" />}
                          <p className="text-xs mt-2">{voiceBuffer ? 'Loaded' : 'Empty'}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-white/40 uppercase tracking-wider">Music Track</p>
                        <div className={`p-4 rounded-xl border ${musicBuffer ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'} text-center`}>
                          {musicBuffer ? <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" /> : <Music className="w-6 h-6 text-white/20 mx-auto" />}
                          <p className="text-xs mt-2">{musicBuffer ? 'Loaded' : 'Empty'}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Reverb Depth</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['off', 'subtle', 'deep'].map(level => (
                          <button
                            key={level}
                            onClick={() => setReverbLevel(level as any)}
                            className={`py-2 rounded-lg border transition-all text-sm capitalize ${
                              reverbLevel === level 
                                ? 'bg-purple-500/20 border-purple-500/50 text-white' 
                                : 'bg-white/5 border-white/10 text-white/40'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleAutoMix}
                      disabled={isProcessing || !voiceBuffer || !musicBuffer}
                      className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-5 h-5" />
                      Auto-Mix Session
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'library' && (
                <motion.div
                  key="library"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/5 rounded-2xl p-6 border border-white/10"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <FileAudio className="w-5 h-5 text-amber-400" />
                    </div>
                    <h2 className="text-lg font-semibold">Processed Library</h2>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {savedAudios.length === 0 ? (
                      <div className="text-center py-10 text-white/20">
                        <FileAudio className="w-12 h-12 mx-auto mb-2 opacity-10" />
                        <p>No tracks saved yet</p>
                      </div>
                    ) : (
                      savedAudios.map(audio => (
                        <div key={audio.id} className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-lg">
                              {audio.type === 'binaural' ? <Waves className="w-4 h-4 text-blue-400" /> : <Music className="w-4 h-4 text-emerald-400" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{audio.name}</p>
                              <p className="text-[10px] text-white/40">{new Date(audio.timestamp).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setCurrentBuffer(null); // Clear current
                                // Logic to load from base64 would go here
                              }}
                              className="p-2 hover:bg-white/10 rounded-lg"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => onDeleteAudio(audio.id)}
                              className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar / Status */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="text-xs text-white/40 uppercase tracking-wider mb-4">Engine Status</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <p className="text-sm">{isProcessing ? 'Processing...' : 'Ready'}</p>
                </div>
                {status && (
                  <p className="text-xs text-white/60 leading-relaxed italic">
                    "{status}"
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            {currentBuffer && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-3"
              >
                <h3 className="text-xs text-white/40 uppercase tracking-wider mb-2">Quick Actions</h3>
                <button 
                  onClick={handleCleanVoice}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <Mic className="w-4 h-4 text-emerald-400" />
                  Clean My Voice
                </button>
                <button 
                  onClick={handleOptimizeTheta}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  Optimize for Theta
                </button>
                <div className="h-px bg-white/10 my-2" />
                <div className="flex gap-2">
                  <button 
                    onClick={playPreview}
                    className="flex-1 py-3 bg-white text-black rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Preview
                  </button>
                  <button 
                    onClick={stopPreview}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-xl"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={handleSave}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  Save to Library
                </button>
              </motion.div>
            )}

            {/* Mix Preparation */}
            {activeTab === 'mixer' && (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
                <h3 className="text-xs text-white/40 uppercase tracking-wider">Mix Preparation</h3>
                <button 
                  onClick={() => {
                    if (currentBuffer) setVoiceBuffer(currentBuffer);
                  }}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs"
                >
                  Use Current as Voice
                </button>
                <button 
                  onClick={() => {
                    if (currentBuffer) setMusicBuffer(currentBuffer);
                  }}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs"
                >
                  Use Current as Music
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
