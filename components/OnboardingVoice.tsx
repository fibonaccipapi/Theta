import React, { useState, useRef, useEffect } from 'react';
import { BeliefAnalysis } from '../types';
import { analyzeVoiceConfession } from '../services/gemini';

interface OnboardingVoiceProps {
  onComplete: (analysis: BeliefAnalysis) => void;
  onBack: () => void;
}

const OnboardingVoice: React.FC<OnboardingVoiceProps> = ({ onComplete, onBack }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      stopRecording();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, timeLeft]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        setAudioMimeType(mediaRecorder.mimeType);
        
        // Convert blob to base64 for Gemini
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const base64 = base64data.split(',')[1];
          setAudioBase64(base64);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTimeLeft(60);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Microphone access is required for voice confession.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlayback = () => {
    if (!audioBlob) return;
    
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(URL.createObjectURL(audioBlob));
        audioRef.current.onended = () => setIsPlaying(false);
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleConfirm = async () => {
    if (!audioBase64) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const analysis = await analyzeVoiceConfession(audioBase64, audioMimeType);
      onComplete(analysis);
    } catch (error) {
      console.error(error);
      setError("Vocal analysis failed. The neural link was interrupted.");
      setIsAnalyzing(false);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-16 h-16 border-2 border-hot-pink/20 border-t-hot-pink rounded-full animate-spin mb-8" />
        <h2 className="text-xl font-display text-slate-300 tracking-widest uppercase">Analyzing Vocal Patterns...</h2>
        <p className="text-slate-500 mt-4 font-mono text-xs animate-pulse">Extracting Hidden Beliefs</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-xl mx-auto text-center px-6">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-8">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-2xl font-display font-bold text-white mb-4 uppercase tracking-widest">Neural Link Interrupted</h2>
        <p className="text-slate-400 mb-12 font-light leading-relaxed">{error}</p>
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <button 
            onClick={handleConfirm}
            className="neon-button-pink flex-1"
          >
            RETRY ANALYSIS
          </button>
          <button 
            onClick={() => { setError(null); onBack(); }}
            className="px-10 py-4 rounded-full border border-white/10 text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-white/5 transition-all text-slate-500"
          >
            ABORT MISSION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-2xl mx-auto px-6 pb-20 relative">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 tracking-tight">
          Speak Your <span className="neon-text-pink">Truth.</span>
        </h2>
        <p className="text-slate-500 tracking-widest uppercase text-[10px]">Express your current struggle naturally for 60 seconds</p>
      </div>

      {!audioBlob ? (
        <div className="flex flex-col items-center w-full">
          <div className="relative mb-12">
            <div className={`w-48 h-48 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${isRecording ? 'border-hot-pink animate-pulse shadow-[0_0_50px_rgba(255,51,153,0.2)]' : 'border-white/10'}`}>
              <div className={`w-40 h-40 rounded-full bg-hot-pink/5 flex flex-col items-center justify-center transition-all duration-500 ${isRecording ? 'scale-110' : ''}`}>
                <span className="text-4xl font-display font-bold text-white mb-2">{timeLeft}s</span>
                <span className="text-[10px] uppercase tracking-widest text-slate-500">{isRecording ? 'Recording...' : 'Ready'}</span>
              </div>
            </div>
            {isRecording && (
              <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-hot-pink/10 rounded-full blur-3xl animate-ping"></div>
              </div>
            )}
          </div>

          {!isRecording ? (
            <button
              onClick={startRecording}
              className="neon-button-pink min-w-[240px]"
            >
              START CONFESSION
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="px-10 py-4 rounded-full border border-white/20 text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-white/5 transition-all"
            >
              STOP RECORDING
            </button>
          )}
        </div>
      ) : (
        <div className="w-full">
          <div className="glass-panel p-8 rounded-3xl border border-white/5 mb-8 relative group">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-[10px] uppercase tracking-[0.3em] text-hot-pink font-bold">Vocal Pattern Captured</h3>
              {audioBlob && (
                <button 
                  onClick={togglePlayback}
                  className={`p-3 rounded-2xl transition-all duration-300 ${isPlaying ? 'bg-hot-pink/20 text-hot-pink animate-pulse' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>
              )}
            </div>
            <p className="text-slate-300 italic leading-relaxed font-light">Your voice has been captured. Gemini will now analyze the frequency and content of your confession to map your neural architecture.</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={handleConfirm}
              className="neon-button-pink flex-1"
            >
              ANALYZE NEURAL PATTERNS
            </button>
            <button
              onClick={() => { setAudioBlob(null); setAudioBase64(null); }}
              className="px-10 py-4 rounded-full border border-white/10 text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-white/5 transition-all"
            >
              RE-RECORD
            </button>
          </div>
        </div>
      )}

      <button
        onClick={onBack}
        className="mt-16 text-[10px] uppercase tracking-[0.4em] text-slate-600 hover:text-white transition-colors"
      >
        Return to Selection
      </button>
    </div>
  );
};

export default OnboardingVoice;
