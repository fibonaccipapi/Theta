
import React, { useState, useRef, useEffect } from 'react';
import { ThetaAudioEngine } from '../services/audioEngine';

interface VoiceManagerProps {
  onSave: (base64Data: string, label: string, customText?: string) => void;
  onBack: () => void;
  targetAffirmation: string;
  allowCustomText?: boolean;
}

const VoiceManager: React.FC<VoiceManagerProps> = ({ onSave, onBack, targetAffirmation = "", allowCustomText = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [status, setStatus] = useState<'idle' | 'recording' | 'review' | 'synthesizing'>('idle');
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [customAffirmationText, setCustomAffirmationText] = useState(targetAffirmation || '');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engine = ThetaAudioEngine.getInstance();
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const drawVisualizer = (analyser: AnalyserNode) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (status === 'recording' || isRecording) {
        requestAnimationFrame(() => draw());
      }
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        
        // Gradient for bars
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, '#00FF9F');
        gradient.addColorStop(1, '#FF2D9A');
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00FF9F';
        
        // Rounded bars
        const radius = barWidth / 2;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth, barHeight, [radius, radius, 0, 0]);
        ctx.fill();
        
        x += barWidth + 4;
      }
    };
    draw();
  };

  const startRecording = async () => {
    try {
      await engine.init();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const source = engine.ctx!.createMediaStreamSource(stream);
      const analyser = engine.ctx!.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        // Pre-decode for instant playback
        const buffer = await engine.decodeVoice(blob);
        engine.setVoiceBuffer(buffer);
        setStatus('review');
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('recording');
      setRecordingTime(0);
      drawVisualizer(analyser);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic Error", err);
      // alert("Microphone required for neural calibration.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const playPreview = async () => {
    await engine.resume();
    const source = engine.playPreview();
    if (source) {
      setPreviewPlaying(true);
      source.onended = () => setPreviewPlaying(false);
      previewSourceRef.current = source;
    }
  };

  const handleFinalize = async () => {
    if (audioBlob) {
      setStatus('synthesizing');

      // Simulate Neural Synthesis/Voice Cloning Analysis
      await new Promise(r => setTimeout(r, 2000));

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        onSave(base64data, 'Neural Imprint', allowCustomText ? customAffirmationText : undefined);
      };
    }
  };

  const isMultiLine = (targetAffirmation || "").includes('\n');

  return (
    <div className="max-w-xl mx-auto px-6 py-12 flex flex-col items-center">
      <header className="text-center mb-10">
        <h2 className="text-4xl font-display neon-text-green mb-2">NEURAL CALIBRATION</h2>
        <p className="text-white/40 text-[10px] tracking-[0.5em] uppercase font-bold">Vocal Imprint Required</p>
      </header>

      {/* Custom Affirmation Input */}
      {allowCustomText && (
        <div className="mb-8 w-full">
          <label className="block text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-3">
            Your Affirmation
          </label>
          <input
            type="text"
            value={customAffirmationText}
            onChange={(e) => setCustomAffirmationText(e.target.value)}
            placeholder="Type your affirmation (e.g., I am confident and capable)"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-neon-green/50 transition-colors"
            disabled={status !== 'idle'}
          />
          <p className="text-[10px] text-slate-600 mt-2">
            You'll record audio of yourself saying this affirmation
          </p>
        </div>
      )}

      {!allowCustomText && targetAffirmation && (
        <div className="glass-panel w-full p-10 rounded-[40px] mb-12 border-neon-green/20 relative overflow-hidden flex flex-col items-center min-h-[280px] justify-center">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" />

          {status === 'synthesizing' ? (
            <div className="flex flex-col items-center z-10">
              <div className="w-16 h-16 border-2 border-neon-green border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_20px_rgba(0,255,159,0.4)]" />
              <p className="neon-text-green text-[10px] uppercase tracking-[0.4em] font-bold animate-pulse">Cloning Imprint...</p>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col items-center w-full">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse shadow-[0_0_8px_#00FF9F]" />
                <p className="text-[10px] uppercase tracking-[0.4em] text-neon-green font-black">Neural Target</p>
              </div>
              <p className={`font-display text-center text-white leading-relaxed px-4 whitespace-pre-line drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] ${isMultiLine ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'}`}>
                "{targetAffirmation}"
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-center space-y-10 w-full">
        {status === 'idle' || status === 'recording' ? (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-28 h-28 rounded-full flex items-center justify-center transition-all relative group ${
              isRecording 
                ? 'bg-hot-pink shadow-[0_0_40px_rgba(255,45,154,0.6)] scale-110' 
                : 'bg-neon-green shadow-[0_0_40px_rgba(0,255,159,0.4)] hover:scale-105'
            }`}
          >
            {isRecording && (
              <>
                <div className="absolute inset-0 rounded-full border-4 border-white/40 animate-ping" />
                <div className="absolute -inset-4 rounded-full border border-hot-pink/20 animate-pulse" />
              </>
            )}
            {isRecording ? (
              <div className="w-10 h-10 bg-white rounded-sm shadow-inner" />
            ) : (
              <svg className="w-12 h-12 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" />
                <path d="M4 9a1 1 0 00-1 1v1a7 7 0 007 7h1v2h2v-2h1a7 7 0 007-7V10a1 1 0 00-1-1h-1a1 1 0 00-1 1v1a5 5 0 01-10 0V10a1 1 0 00-1-1H4z" />
              </svg>
            )}
          </button>
        ) : (
          <div className="flex flex-col items-center w-full space-y-8">
             <div className="flex items-center space-x-10">
               <button
                onClick={() => { setStatus('idle'); setAudioBlob(null); setRecordingTime(0); }}
                className="w-16 h-16 rounded-full glass-panel border border-white/10 flex items-center justify-center transition-all hover:border-hot-pink/50 group active:scale-90"
              >
                <svg className="w-8 h-8 text-white/40 group-hover:text-hot-pink transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
              <button
                onClick={playPreview}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                  previewPlaying 
                    ? 'bg-neon-green shadow-[0_0_30px_rgba(0,255,159,0.6)] animate-pulse' 
                    : 'bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105'
                }`}
              >
                {previewPlaying ? (
                  <div className="flex space-x-1.5">
                    <div className="w-1.5 h-6 bg-black animate-bounce" style={{animationDelay: '0s'}} />
                    <div className="w-1.5 h-6 bg-black animate-bounce" style={{animationDelay: '0.2s'}} />
                    <div className="w-1.5 h-6 bg-black animate-bounce" style={{animationDelay: '0.4s'}} />
                  </div>
                ) : (
                  <svg className="w-12 h-12 text-black ml-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="text-center">
          <p className="font-mono text-[10px] neon-text-green font-black uppercase tracking-[0.5em]">
            {status === 'recording' ? `Recording: 0:${recordingTime.toString().padStart(2, '0')}` : status === 'review' ? "Sample Captured" : "Awaiting Frequency"}
          </p>
        </div>

        <div className="flex space-x-6 w-full px-4">
          <button 
            onClick={onBack}
            className="flex-1 py-5 rounded-2xl glass-panel border border-white/5 text-white/40 font-bold uppercase tracking-[0.3em] text-[10px] hover:border-white/20 transition-all active:scale-95"
          >
            Abort
          </button>
          <button 
            disabled={status !== 'review'}
            onClick={handleFinalize}
            className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all flex items-center justify-center ${
              status === 'review'
                ? 'neon-button-green active:scale-95' 
                : 'bg-white/5 text-white/10 cursor-not-allowed border border-white/5'
            }`}
          >
            Finalize Calibration
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceManager;
