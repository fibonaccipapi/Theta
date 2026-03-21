
import { NeuralEnvironment, SoundscapeLayer, AudioProfile, BinauralBeatConfig } from '../types';

export class ThetaAudioEngine {
  private static instance: ThetaAudioEngine;
  public ctx: AudioContext | null = null;
  
  private mainGain: GainNode | null = null;
  private padGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private biometricGain: GainNode | null = null;
  private neuralGain: GainNode | null = null;
  private backgroundGain: GainNode | null = null;
  private oceanGain: GainNode | null = null;

  private voiceBuffer: AudioBuffer | null = null;
  private backgroundBuffer: AudioBuffer | null = null;
  private biometricSource: AudioBufferSourceNode | null = null;
  private previewSource: AudioBufferSourceNode | null = null;
  private backgroundSource: AudioBufferSourceNode | null = null;
  private scheduledSources: AudioBufferSourceNode[] = [];
  private padOscs: OscillatorNode[] = [];
  private noiseSource: AudioBufferSourceNode | null = null;
  private oceanSource: AudioBufferSourceNode | null = null;
  private oceanLFO: OscillatorNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private oscL: OscillatorNode | null = null;
  private oscR: OscillatorNode | null = null;
  private alchemyStopTimeout: any = null;
  private oceanStopTimeout: any = null;
  private rainStopTimeout: any = null;
  
  public analyser: AnalyserNode | null = null;

  constructor() {}

  public static getInstance(): ThetaAudioEngine {
    if (!ThetaAudioEngine.instance) ThetaAudioEngine.instance = new ThetaAudioEngine();
    return ThetaAudioEngine.instance;
  }

  async init() {
    if (!this.ctx) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass({
        sampleRate: 24000,
        latencyHint: 'playback'
      });

      // iOS compatibility: Add visibility change listener to resume audio
      document.addEventListener('visibilitychange', async () => {
        if (!document.hidden && this.ctx && this.ctx.state === 'suspended') {
          await this.ctx.resume();
          console.log('Audio context resumed after visibility change');
        }
      });

      // iOS compatibility: Resume on user interaction
      const resumeOnInteraction = async () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          await this.ctx.resume();
        }
      };
      document.addEventListener('touchstart', resumeOnInteraction, { once: true });
      document.addEventListener('touchend', resumeOnInteraction, { once: true });
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    
    if (!this.mainGain) {
      this.mainGain = this.ctx.createGain();
      this.mainGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.mainGain.connect(this.ctx.destination);
      
      this.padGain = this.ctx.createGain();
      this.padGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.padGain.connect(this.ctx.destination);

      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.noiseGain.connect(this.ctx.destination);

      this.biometricGain = this.ctx.createGain();
      this.biometricGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.biometricGain.connect(this.ctx.destination);

      this.neuralGain = this.ctx.createGain();
      this.neuralGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.neuralGain.connect(this.ctx.destination);

      this.backgroundGain = this.ctx.createGain();
      this.backgroundGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.backgroundGain.connect(this.ctx.destination);

      this.oceanGain = this.ctx.createGain();
      this.oceanGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.oceanGain.connect(this.ctx.destination);

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.rainGain.connect(this.ctx.destination);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      [this.mainGain, this.padGain, this.biometricGain, this.neuralGain, this.noiseGain, this.backgroundGain, this.oceanGain, this.rainGain].forEach(n => n.connect(this.analyser!));
    }
  }

  async resume() { if (this.ctx) await this.ctx.resume(); }

  private decodeBase64(base64: string): Uint8Array {
    const binaryString = window.atob(base64.split(',')[1] || base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }

  private async decodeRawPCM(data: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = this.ctx!.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  async loadVoiceFromBase64(base64: string) {
    await this.init();
    try {
      const bytes = this.decodeBase64(base64);
      try { this.voiceBuffer = await this.ctx!.decodeAudioData(bytes.buffer); }
      catch (e) { this.voiceBuffer = await this.decodeRawPCM(bytes); }
    } catch (e) { console.error(e); }
  }

  // Fixed: Updated to handle both raw PCM (from Gemini) and encoded audio (from user recordings)
  async playNeuralAffirmation(base64: string) {
    await this.init();
    try {
      const bytes = this.decodeBase64(base64);
      let buffer: AudioBuffer;
      try {
        // Try decoding as standard container first (for user recordings)
        buffer = await this.ctx!.decodeAudioData(bytes.buffer);
      } catch (e) {
        // Fallback to raw PCM (for Gemini TTS output)
        buffer = await this.decodeRawPCM(bytes);
      }
      const source = this.ctx!.createBufferSource();
      source.buffer = buffer;
      source.connect(this.neuralGain!);
      source.start();
    } catch (e) { console.error(e); }
  }

  async decodeVoice(blob: Blob): Promise<AudioBuffer> {
    await this.init();
    const arrayBuffer = await blob.arrayBuffer();
    return await this.ctx!.decodeAudioData(arrayBuffer);
  }

  async loadBackgroundAudio(base64: string): Promise<number> {
    await this.init();
    try {
      const bytes = this.decodeBase64(base64);
      this.backgroundBuffer = await this.ctx!.decodeAudioData(bytes.buffer);
      return this.backgroundBuffer.duration;
    } catch (e) {
      console.error("Failed to load background audio", e);
      return 0;
    }
  }

  startBackgroundLoop(volume: number = 0.5) {
    if (!this.ctx || !this.backgroundBuffer || !this.backgroundGain) return;
    this.stopBackground();
    this.backgroundSource = this.ctx.createBufferSource();
    this.backgroundSource.buffer = this.backgroundBuffer;
    this.backgroundSource.loop = true;
    this.backgroundSource.connect(this.backgroundGain);
    this.backgroundSource.start();
    this.backgroundGain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 2);
  }

  stopBackground() {
    if (this.backgroundSource) {
      try { this.backgroundSource.stop(); } catch (e) {}
      this.backgroundSource = null;
    }
    if (this.backgroundGain) {
      this.backgroundGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  async scheduleAffirmation(base64: string, startTime: number, volume: number = 1.0) {
    if (!this.ctx || !this.neuralGain) return;
    try {
      const bytes = this.decodeBase64(base64);
      let buffer: AudioBuffer;
      try {
        buffer = await this.ctx.decodeAudioData(bytes.buffer);
      } catch (e) {
        buffer = await this.decodeRawPCM(bytes);
      }
      
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      
      const localGain = this.ctx.createGain();
      localGain.gain.value = volume;
      
      source.connect(localGain).connect(this.neuralGain);
      source.start(this.ctx.currentTime + startTime);
      this.scheduledSources.push(source);
    } catch (e) { console.error(e); }
  }

  stopAllScheduled() {
    this.scheduledSources.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    this.scheduledSources = [];
  }

  setVoiceBuffer(buffer: AudioBuffer) { this.voiceBuffer = buffer; }

  playPreview() {
    if (!this.ctx || !this.voiceBuffer) return null;
    this.stopPreview();
    this.previewSource = this.ctx.createBufferSource();
    this.previewSource.buffer = this.voiceBuffer;
    this.previewSource.connect(this.ctx.destination);
    this.previewSource.start();
    return this.previewSource;
  }

  stopPreview() {
    if (this.previewSource) {
      try { this.previewSource.stop(); } catch (e) {}
      this.previewSource = null;
    }
  }

  private createNoiseBuffer() {
    // Longer buffer (10 seconds) for smoother looping and less repetitive artifacts
    const bufferSize = 10 * this.ctx!.sampleRate;
    const noiseBuffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  // ALCHEMICAL TRACK COMPOSER
  startCustomTrack(leftHz: number, rightHz: number, textureIntensity: number, volume: number = 0.35) {
    if (!this.ctx || !this.mainGain || !this.noiseGain) return;

    const now = this.ctx.currentTime;

    // Cancel any pending stop
    if (this.alchemyStopTimeout) {
      clearTimeout(this.alchemyStopTimeout);
      this.alchemyStopTimeout = null;
    }

    // If already running, just update frequencies for a smooth transition
    if (this.oscL && this.oscR) {
      this.oscL.frequency.exponentialRampToValueAtTime(leftHz, now + 0.2);
      this.oscR.frequency.exponentialRampToValueAtTime(rightHz, now + 0.2);

      this.mainGain.gain.cancelScheduledValues(now);
      this.mainGain.gain.linearRampToValueAtTime(volume, now + 1);

      this.noiseGain.gain.cancelScheduledValues(now);
      this.noiseGain.gain.linearRampToValueAtTime(textureIntensity * 0.15, now + 1);
      return;
    }

    // 1. PRIMARY BINAURAL CARRIER
    this.oscL = this.ctx.createOscillator();
    this.oscR = this.ctx.createOscillator();
    const pL = this.ctx.createStereoPanner();
    const pR = this.ctx.createStereoPanner();
    this.oscL.frequency.setValueAtTime(leftHz, now);
    this.oscR.frequency.setValueAtTime(rightHz, now);
    if (pL.pan) pL.pan.value = -1; if (pR.pan) pR.pan.value = 1;
    this.oscL.connect(pL).connect(this.mainGain);
    this.oscR.connect(pR).connect(this.mainGain);

    // 2. ATMOSPHERIC TEXTURE (Brown Noise Filtered)
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 400;
    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = this.createNoiseBuffer();
    this.noiseSource.loop = true;
    this.noiseSource.connect(noiseFilter).connect(this.noiseGain);

    this.oscL.start(); this.oscR.start(); this.noiseSource.start();

    this.mainGain.gain.cancelScheduledValues(now);
    this.mainGain.gain.setValueAtTime(this.mainGain.gain.value, now);
    this.mainGain.gain.linearRampToValueAtTime(volume, now + 4);

    this.noiseGain.gain.cancelScheduledValues(now);
    this.noiseGain.gain.setValueAtTime(this.noiseGain.gain.value, now);
    this.noiseGain.gain.linearRampToValueAtTime(textureIntensity * 0.15, now + 6);
  }

  startOceanSound(volume: number = 0.4) {
    if (!this.ctx || !this.oceanGain) return;
    
    const now = this.ctx.currentTime;

    // Cancel any pending stop
    if (this.oceanStopTimeout) {
      clearTimeout(this.oceanStopTimeout);
      this.oceanStopTimeout = null;
    }

    if (this.oceanSource) {
      this.oceanGain.gain.cancelScheduledValues(now);
      this.oceanGain.gain.linearRampToValueAtTime(volume, now + 2);
      return;
    }

    this.oceanSource = this.ctx.createBufferSource();
    this.oceanSource.buffer = this.createNoiseBuffer();
    this.oceanSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 4);
    filter.frequency.exponentialRampToValueAtTime(400, now + 8);

    this.oceanLFO = this.ctx.createOscillator();
    this.oceanLFO.type = 'sine';
    this.oceanLFO.frequency.value = 0.125; // 8 second cycle
    
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.2;
    
    this.oceanLFO.connect(lfoGain).connect(this.oceanGain.gain);
    this.oceanLFO.start();

    this.oceanSource.connect(filter).connect(this.oceanGain);
    this.oceanSource.start();
    
    this.oceanGain.gain.cancelScheduledValues(now);
    this.oceanGain.gain.setValueAtTime(0, now);
    this.oceanGain.gain.linearRampToValueAtTime(volume, now + 3);
  }

  stopOceanSound() {
    if (this.oceanGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.oceanGain.gain.cancelScheduledValues(now);
      this.oceanGain.gain.linearRampToValueAtTime(0, now + 2);
    }
    
    if (this.oceanStopTimeout) clearTimeout(this.oceanStopTimeout);
    
    this.oceanStopTimeout = setTimeout(() => {
      try {
        if (this.oceanGain && this.oceanGain.gain.value < 0.05) {
          this.oceanSource?.stop();
          this.oceanSource = null;
          this.oceanLFO?.stop();
          this.oceanLFO = null;
          this.oceanStopTimeout = null;
        }
      } catch (e) {}
    }, 2100);
  }

  startRainSound(volume: number = 0.3) {
    if (!this.ctx || !this.rainGain) return;
    
    const now = this.ctx.currentTime;

    if (this.rainStopTimeout) {
      clearTimeout(this.rainStopTimeout);
      this.rainStopTimeout = null;
    }

    if (this.rainSource) {
      this.rainGain.gain.cancelScheduledValues(now);
      this.rainGain.gain.linearRampToValueAtTime(volume, now + 2);
      return;
    }

    this.rainSource = this.ctx.createBufferSource();
    this.rainSource.buffer = this.createNoiseBuffer();
    this.rainSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    this.rainSource.connect(filter).connect(this.rainGain);
    this.rainSource.start();
    
    this.rainGain.gain.cancelScheduledValues(now);
    this.rainGain.gain.setValueAtTime(0, now);
    this.rainGain.gain.linearRampToValueAtTime(volume, now + 3);
  }

  stopRainSound() {
    if (this.rainGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.rainGain.gain.cancelScheduledValues(now);
      this.rainGain.gain.linearRampToValueAtTime(0, now + 2);
    }

    if (this.rainStopTimeout) clearTimeout(this.rainStopTimeout);

    this.rainStopTimeout = setTimeout(() => {
      try {
        if (this.rainGain && this.rainGain.gain.value < 0.05) {
          this.rainSource?.stop();
          this.rainSource = null;
          this.rainStopTimeout = null;
        }
      } catch (e) {}
    }, 2100);
  }

  // Volume control methods for real-time adjustment
  setBinauralVolume(volume: number) {
    if (this.mainGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.mainGain.gain.cancelScheduledValues(now);
      this.mainGain.gain.linearRampToValueAtTime(volume, now + 0.1);
    }
  }

  setOceanVolume(volume: number) {
    if (this.oceanGain && this.ctx && this.oceanSource) {
      const now = this.ctx.currentTime;
      this.oceanGain.gain.cancelScheduledValues(now);
      this.oceanGain.gain.linearRampToValueAtTime(volume, now + 0.1);
    }
  }

  setRainVolume(volume: number) {
    if (this.rainGain && this.ctx && this.rainSource) {
      const now = this.ctx.currentTime;
      this.rainGain.gain.cancelScheduledValues(now);
      this.rainGain.gain.linearRampToValueAtTime(volume, now + 0.1);
    }
  }

  // Fixed: Added startEntrainment method to map NeuralEnvironment to frequencies and fix error in SessionPlayer.tsx
  startEntrainment(env: NeuralEnvironment) {
    let baseHz = 528;
    const envStr = env as string;
    if (envStr.includes('432')) baseHz = 432;
    else if (envStr.includes('888')) baseHz = 888;
    else if (envStr.includes('221')) baseHz = 221;
    else if (envStr.includes('396')) baseHz = 396;
    else if (envStr.includes('417')) baseHz = 417;
    
    // Default theta entrainment offset of 4.5Hz
    this.startCustomTrack(baseHz, baseHz + 4.5, 0.5);
  }

  startBiometricLoop(volume: number = 0.3) {
    if (!this.ctx || !this.voiceBuffer || !this.biometricGain) return;
    if (this.biometricSource) { try { this.biometricSource.stop(); } catch(e) {} }
    this.biometricSource = this.ctx.createBufferSource();
    this.biometricSource.buffer = this.voiceBuffer;
    this.biometricSource.loop = true;
    this.biometricSource.connect(this.biometricGain);
    this.biometricSource.start();
    this.biometricGain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 3);
  }

  stopEntrainment() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Stop alchemy specific nodes
    [this.mainGain, this.noiseGain].forEach(g => {
      if (g) {
        g.gain.cancelScheduledValues(now);
        g.gain.linearRampToValueAtTime(0, now + 2);
      }
    });

    this.stopAllScheduled();
    
    if (this.alchemyStopTimeout) clearTimeout(this.alchemyStopTimeout);
    
    this.alchemyStopTimeout = setTimeout(() => {
      try {
        if (this.mainGain && this.mainGain.gain.value < 0.05) {
          this.oscL?.stop(); this.oscL = null;
          this.oscR?.stop(); this.oscR = null;
          this.noiseSource?.stop(); this.noiseSource = null;
          this.alchemyStopTimeout = null;
        }
      } catch(e) {}
    }, 2100);
  }

  stopAllAudio() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [this.mainGain, this.padGain, this.noiseGain, this.biometricGain, this.backgroundGain, this.oceanGain].forEach(g => {
      if (g) {
        g.gain.cancelScheduledValues(now);
        g.gain.linearRampToValueAtTime(0, now + 1);
      }
    });
    this.stopEntrainment();
    this.stopOceanSound();
    this.stopBackground();
    this.stopAllScheduled();
    this.stopPreview();
    
    setTimeout(() => {
      this.padOscs.forEach(o => { try { o.stop(); } catch(e) {} });
      this.padOscs = [];
      this.biometricSource?.stop(); this.biometricSource = null;
    }, 1100);
  }

  async renderSoundscape(backgroundBase64: string, layers: SoundscapeLayer[], affirmations: any[]): Promise<Blob> {
    const bytes = this.decodeBase64(backgroundBase64);
    const bgBuffer = await this.ctx!.decodeAudioData(bytes.buffer);
    const duration = bgBuffer.duration;
    const sampleRate = this.ctx!.sampleRate;
    
    const offlineCtx = new OfflineAudioContext(2, duration * sampleRate, sampleRate);
    
    // Background
    const bgSource = offlineCtx.createBufferSource();
    bgSource.buffer = bgBuffer;
    bgSource.connect(offlineCtx.destination);
    bgSource.start(0);
    
    // Layers
    for (const layer of layers) {
      const aff = affirmations.find(a => a.id === layer.affirmationId);
      const audio = aff?.userRecording || aff?.audioData;
      if (audio) {
        const affBytes = this.decodeBase64(audio);
        let affBuffer: AudioBuffer;
        try {
          affBuffer = await offlineCtx.decodeAudioData(affBytes.buffer);
        } catch (e) {
          // Fallback for raw PCM
          const dataInt16 = new Int16Array(affBytes.buffer);
          const frameCount = dataInt16.length;
          affBuffer = offlineCtx.createBuffer(1, frameCount, 24000);
          const channelData = affBuffer.getChannelData(0);
          for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i] / 32768.0;
          }
        }
        
        const affSource = offlineCtx.createBufferSource();
        affSource.buffer = affBuffer;
        const gain = offlineCtx.createGain();
        gain.gain.value = layer.volume;
        affSource.connect(gain).connect(offlineCtx.destination);
        affSource.start(layer.startTime);
      }
    }
    
    const renderedBuffer = await offlineCtx.startRendering();
    return this.bufferToWav(renderedBuffer);
  }

  private bufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // write WAVE header
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"

    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // length = 16
    setUint16(1);                                  // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);  // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit (hardcoded)

    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    // write interleaved data
    for (i = 0; i < buffer.numberOfChannels; i++)
      channels.push(buffer.getChannelData(i));

    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {             // interleave channels
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0; // scale to 16-bit signed int
        view.setInt16(pos, sample, true);          // write 16-bit sample
        pos += 2;
      }
      offset++;                                     // next sample index
    }

    return new Blob([bufferArr], { type: "audio/wav" });
  }

  private downloadBlob(blob: Blob, filename: string) {
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
  }

  private calculateAffirmationSchedule(
    affirmations: Array<{ id: string; duration: number }>,
    totalDurationSeconds: number
  ): Array<{ affId: string; startTime: number }> {
    // Validate inputs
    if (!affirmations || affirmations.length === 0) {
      return [];
    }

    if (totalDurationSeconds <= 0) {
      console.warn('calculateAffirmationSchedule: Invalid total duration', totalDurationSeconds);
      return [];
    }

    // Validate all affirmations have valid data
    const invalidAff = affirmations.find(aff =>
      !aff.id || typeof aff.duration !== 'number' || aff.duration <= 0
    );
    if (invalidAff) {
      console.error('Invalid affirmation data:', invalidAff);
      return [];
    }

    const schedule: Array<{ affId: string; startTime: number }> = [];
    let currentTime = 0;
    let affIndex = 0;

    while (currentTime < totalDurationSeconds) {
      const aff = affirmations[affIndex % affirmations.length];

      // Intelligent spacing: 150% of affirmation duration, capped at 3 minutes
      const gap = Math.min(aff.duration * 1.5, 180);

      schedule.push({
        affId: aff.id,
        startTime: currentTime
      });

      currentTime += aff.duration + gap;
      affIndex++;
    }

    return schedule;
  }

  // AUDIO INTELLIGENCE & AUTO MIXING ENGINE
  async analyzeAudio(buffer: AudioBuffer): Promise<AudioProfile> {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    
    // 1. BPM Estimation (Peak Detection)
    let peaks = [];
    const threshold = 0.8;
    for (let i = 0; i < data.length; i += Math.floor(sampleRate / 10)) {
      let max = 0;
      for (let j = i; j < i + Math.floor(sampleRate / 10) && j < data.length; j++) {
        if (Math.abs(data[j]) > max) max = Math.abs(data[j]);
      }
      if (max > threshold) peaks.push(i);
    }
    let bpm = 0;
    if (peaks.length > 1) {
      const intervals = [];
      for (let i = 1; i < peaks.length; i++) intervals.push(peaks[i] - peaks[i-1]);
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      bpm = Math.round(60 / (avgInterval / sampleRate));
    }
    if (bpm < 40 || bpm > 200) bpm = 72; // Default fallback

    // 2. Frequency Analysis (Spectrum Estimation)
    const getBandEnergy = async (low: number, high: number) => {
      const filterCtx = new OfflineAudioContext(1, buffer.length, sampleRate);
      const fSource = filterCtx.createBufferSource();
      fSource.buffer = buffer;
      const filter = filterCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = (low + high) / 2;
      filter.Q.value = filter.frequency.value / (high - low);
      fSource.connect(filter).connect(filterCtx.destination);
      fSource.start(0);
      const filtered = await filterCtx.startRendering();
      const fData = filtered.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < fData.length; i++) sum += fData[i] * fData[i];
      return Math.sqrt(sum / fData.length);
    };

    const bass = await getBandEnergy(20, 250);
    const mids = await getBandEnergy(250, 4000);
    const highs = await getBandEnergy(4000, 12000);
    const total = bass + mids + highs || 0.001;

    const energy = total > 0.3 ? 'high' : total > 0.1 ? 'medium' : 'low';
    const tone = highs / (bass + 0.01) > 1.5 ? 'bright' : bass / (highs + 0.01) > 1.5 ? 'warm' : 'neutral';
    const impact = bpm > 100 || energy === 'high' ? 'stimulating' : bpm < 70 ? 'calming' : 'neutral';
    
    // Theta Compatibility Score (0-100)
    let score = 100;
    if (bpm > 90) score -= (bpm - 90);
    if (highs > mids) score -= 20;
    if (energy === 'high') score -= 15;
    score = Math.max(0, Math.min(100, score));

    return {
      bpm,
      key: "C Major", // Simplified key detection for now
      energy,
      frequencyDistribution: {
        bass: Math.round((bass / total) * 100),
        mids: Math.round((mids / total) * 100),
        highs: Math.round((highs / total) * 100)
      },
      tone,
      nervousSystemImpact: impact,
      thetaCompatibility: score
    };
  }

  async generateBinauralBeat(config: BinauralBeatConfig, durationSeconds: number = 60): Promise<AudioBuffer> {
    const sampleRate = this.ctx?.sampleRate || 24000;
    const offlineCtx = new OfflineAudioContext(2, durationSeconds * sampleRate, sampleRate);
    
    const oscL = offlineCtx.createOscillator();
    const oscR = offlineCtx.createOscillator();
    const pL = offlineCtx.createStereoPanner();
    const pR = offlineCtx.createStereoPanner();
    const gain = offlineCtx.createGain();
    
    oscL.frequency.value = config.carrierHz;
    oscR.frequency.value = config.carrierHz + config.targetHz;
    pL.pan.value = -1;
    pR.pan.value = 1;
    gain.gain.value = config.volume;
    
    oscL.connect(pL).connect(gain).connect(offlineCtx.destination);
    oscR.connect(pR).connect(gain).connect(offlineCtx.destination);
    
    oscL.start(0);
    oscR.start(0);
    
    return await offlineCtx.startRendering();
  }

  async cleanVoice(buffer: AudioBuffer): Promise<AudioBuffer> {
    const sampleRate = buffer.sampleRate;
    const offlineCtx = new OfflineAudioContext(1, buffer.length, sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;

    // 1. High Pass Filter (Remove rumble/pops)
    const hp = offlineCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 100;

    // 2. De-esser (Notch at 7kHz)
    const deesser = offlineCtx.createBiquadFilter();
    deesser.type = 'peaking';
    deesser.frequency.value = 7000;
    deesser.Q.value = 2;
    deesser.gain.value = -6;

    // 3. Compressor (Consistency)
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    // 4. Normalization (Gain)
    const gain = offlineCtx.createGain();
    gain.gain.value = 1.2; // Slight boost

    source.connect(hp).connect(deesser).connect(compressor).connect(gain).connect(offlineCtx.destination);
    source.start(0);

    return await offlineCtx.startRendering();
  }

  async optimizeForTheta(buffer: AudioBuffer): Promise<AudioBuffer> {
    const sampleRate = buffer.sampleRate;
    const offlineCtx = new OfflineAudioContext(2, buffer.length, sampleRate);
    
    // Original Audio
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    
    // Subtle Low Pass (Smoothing)
    const lp = offlineCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 10000;
    
    source.connect(lp).connect(offlineCtx.destination);
    source.start(0);

    // Theta Binaural Pulse (4.5Hz)
    const oscL = offlineCtx.createOscillator();
    const oscR = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();
    gain.gain.value = 0.08; // Very subtle

    const pL = offlineCtx.createStereoPanner();
    const pR = offlineCtx.createStereoPanner();
    oscL.frequency.value = 200;
    oscR.frequency.value = 204.5;
    pL.pan.value = -1;
    pR.pan.value = 1;

    oscL.connect(pL).connect(gain).connect(offlineCtx.destination);
    oscR.connect(pR).connect(gain).connect(offlineCtx.destination);
    oscL.start(0);
    oscR.start(0);

    return await offlineCtx.startRendering();
  }

  private createReverb(ctx: BaseAudioContext, duration: number = 2, decay: number = 2): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let i = 0; i < 2; i++) {
      const channelData = impulse.getChannelData(i);
      for (let j = 0; j < length; j++) {
        channelData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, decay);
      }
    }
    return impulse;
  }

  async autoMix(voiceBuffer: AudioBuffer, bgBuffer: AudioBuffer, reverbLevel: 'off' | 'subtle' | 'deep' = 'subtle'): Promise<AudioBuffer> {
    const duration = Math.max(voiceBuffer.duration, bgBuffer.duration);
    const sampleRate = voiceBuffer.sampleRate;
    const offlineCtx = new OfflineAudioContext(2, duration * sampleRate, sampleRate);

    // Background Music
    const bgSource = offlineCtx.createBufferSource();
    bgSource.buffer = bgBuffer;
    bgSource.loop = true;
    const bgGain = offlineCtx.createGain();
    bgGain.gain.value = 0.4;
    
    // Voice
    const vSource = offlineCtx.createBufferSource();
    vSource.buffer = voiceBuffer;
    const vGain = offlineCtx.createGain();
    vGain.gain.value = 1.0;
    
    // Reverb
    if (reverbLevel !== 'off') {
      const convolver = offlineCtx.createConvolver();
      convolver.buffer = this.createReverb(offlineCtx, reverbLevel === 'deep' ? 4 : 2, reverbLevel === 'deep' ? 3 : 2);
      const reverbGain = offlineCtx.createGain();
      reverbGain.gain.value = reverbLevel === 'deep' ? 0.3 : 0.15;
      vSource.connect(convolver).connect(reverbGain).connect(offlineCtx.destination);
    }

    // Ducking (Volume automation)
    bgGain.gain.setValueAtTime(0.4, 0);
    bgGain.gain.linearRampToValueAtTime(0.15, 0.1);
    bgGain.gain.setValueAtTime(0.15, voiceBuffer.duration - 0.1);
    bgGain.gain.linearRampToValueAtTime(0.4, voiceBuffer.duration);

    bgSource.connect(bgGain).connect(offlineCtx.destination);
    vSource.connect(vGain).connect(offlineCtx.destination);
    
    bgSource.start(0);
    vSource.start(0);

    return await offlineCtx.startRendering();
  }

  async layerAudio(layers: { buffer: AudioBuffer, volume: number }[]): Promise<AudioBuffer> {
    const duration = Math.max(...layers.map(l => l.buffer.duration));
    const sampleRate = layers[0]?.buffer.sampleRate || 24000;
    const offlineCtx = new OfflineAudioContext(2, duration * sampleRate, sampleRate);

    for (const layer of layers) {
      const source = offlineCtx.createBufferSource();
      source.buffer = layer.buffer;
      const gain = offlineCtx.createGain();
      gain.gain.value = layer.volume;
      source.connect(gain).connect(offlineCtx.destination);
      source.start(0);
    }

    return await offlineCtx.startRendering();
  }

  async exportMix(
    affirmations: Array<{ id: string; userRecording: string }>,
    binauralHz: { left: number; right: number },
    binauralVolume: number,
    durationMinutes: number,
    options?: {
      vocalVolume?: number;
      oceanVolume?: number;
      rainVolume?: number;
    },
    onProgress?: (current: number, total: number) => void
  ): Promise<Blob> {
    const durationSeconds = durationMinutes * 60;
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * durationSeconds, sampleRate);

    // Extract options with defaults
    const vocalVolume = options?.vocalVolume ?? 1.0;
    const oceanVolume = options?.oceanVolume ?? 0;
    const rainVolume = options?.rainVolume ?? 0;

    // Decode all affirmation recordings and get durations
    const affBuffers: Array<{ id: string; buffer: AudioBuffer; duration: number }> = [];
    for (const aff of affirmations) {
      // IMPORTANT: userRecording is base64 string, decode it first
      const affBytes = this.decodeBase64(aff.userRecording);
      const buffer = await offlineCtx.decodeAudioData(affBytes.buffer);
      affBuffers.push({
        id: aff.id,
        buffer: buffer,
        duration: buffer.duration
      });
    }

    // Create binaural beats (stereo)
    const leftOsc = offlineCtx.createOscillator();
    leftOsc.frequency.value = binauralHz.left;
    leftOsc.type = 'sine';

    const rightOsc = offlineCtx.createOscillator();
    rightOsc.frequency.value = binauralHz.right;
    rightOsc.type = 'sine';

    const leftGain = offlineCtx.createGain();
    leftGain.gain.value = binauralVolume * 0.5; // Reduce to not overpower voice

    const rightGain = offlineCtx.createGain();
    rightGain.gain.value = binauralVolume * 0.5;

    const merger = offlineCtx.createChannelMerger(2);

    leftOsc.connect(leftGain);
    rightOsc.connect(rightGain);

    leftGain.connect(merger, 0, 0); // left channel
    rightGain.connect(merger, 0, 1); // right channel

    leftOsc.start(0);
    rightOsc.start(0);

    // Calculate affirmation schedule
    const schedule = this.calculateAffirmationSchedule(affBuffers, durationSeconds);

    // Schedule all affirmations
    for (const item of schedule) {
      const affBuffer = affBuffers.find(a => a.id === item.affId);
      if (affBuffer) {
        const source = offlineCtx.createBufferSource();
        source.buffer = affBuffer.buffer;

        // Voice goes to both channels (center)
        const voiceGain = offlineCtx.createGain();
        voiceGain.gain.value = vocalVolume;
        source.connect(voiceGain);
        voiceGain.connect(merger, 0, 0);
        voiceGain.connect(merger, 0, 1);

        source.start(item.startTime);
      }
    }

    // Add ocean soundscape layer if requested
    if (oceanVolume > 0) {
      // Create noise buffer for ocean (10 seconds for smoother looping)
      const noiseBufferSize = 10 * sampleRate;
      const oceanNoiseBuffer = offlineCtx.createBuffer(1, noiseBufferSize, sampleRate);
      const noiseData = oceanNoiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBufferSize; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }

      // Calculate how many loops needed to cover full duration
      const loopsNeeded = Math.ceil(durationSeconds / 10);

      for (let loopIndex = 0; loopIndex < loopsNeeded; loopIndex++) {
        const oceanSource = offlineCtx.createBufferSource();
        oceanSource.buffer = oceanNoiseBuffer;

        // Apply lowpass filter for ocean sound
        const oceanFilter = offlineCtx.createBiquadFilter();
        oceanFilter.type = 'lowpass';
        oceanFilter.frequency.value = 800; // Simplified: average between 400-1200Hz

        const oceanGain = offlineCtx.createGain();
        oceanGain.gain.value = oceanVolume;

        oceanSource.connect(oceanFilter);
        oceanFilter.connect(oceanGain);
        oceanGain.connect(merger, 0, 0); // both channels
        oceanGain.connect(merger, 0, 1);

        oceanSource.start(loopIndex * 10);
      }
    }

    // Add rain soundscape layer if requested
    if (rainVolume > 0) {
      // Create noise buffer for rain (10 seconds for smoother looping)
      const noiseBufferSize = 10 * sampleRate;
      const rainNoiseBuffer = offlineCtx.createBuffer(1, noiseBufferSize, sampleRate);
      const noiseData = rainNoiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBufferSize; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }

      // Calculate how many loops needed to cover full duration
      const loopsNeeded = Math.ceil(durationSeconds / 10);

      for (let loopIndex = 0; loopIndex < loopsNeeded; loopIndex++) {
        const rainSource = offlineCtx.createBufferSource();
        rainSource.buffer = rainNoiseBuffer;

        // Apply lowpass filter for rain sound
        const rainFilter = offlineCtx.createBiquadFilter();
        rainFilter.type = 'lowpass';
        rainFilter.frequency.value = 800;

        const rainGain = offlineCtx.createGain();
        rainGain.gain.value = rainVolume;

        rainSource.connect(rainFilter);
        rainFilter.connect(rainGain);
        rainGain.connect(merger, 0, 0); // both channels
        rainGain.connect(merger, 0, 1);

        rainSource.start(loopIndex * 10);
      }
    }

    merger.connect(offlineCtx.destination);

    // Render (this may take several seconds)
    if (onProgress) onProgress(0, durationSeconds);

    const renderedBuffer = await offlineCtx.startRendering();

    if (onProgress) onProgress(durationSeconds, durationSeconds);

    // Convert to WAV
    const wavBlob = this.bufferToWav(renderedBuffer);
    return wavBlob;
  }

  // Preview playback state
  private previewOscL: OscillatorNode | null = null;
  private previewOscR: OscillatorNode | null = null;
  private previewGainL: GainNode | null = null;
  private previewGainR: GainNode | null = null;
  private previewVoiceSources: AudioBufferSourceNode[] = [];
  private previewOceanSource: AudioBufferSourceNode | null = null;
  private previewRainSource: AudioBufferSourceNode | null = null;
  private previewStartTime: number = 0;
  private previewVoiceGain: GainNode | null = null;
  private previewOceanGain: GainNode | null = null;
  private previewRainGain: GainNode | null = null;

  async playMixPreview(
    affirmations: Array<{ id: string; userRecording: string }>,
    binauralHz: { left: number; right: number },
    binauralVolume: number,
    options: {
      vocalVolume: number;
      oceanVolume: number;
      rainVolume: number;
    }
  ) {
    await this.init();
    if (!this.ctx) return;

    // Stop any existing preview
    this.stopMixPreview();

    const now = this.ctx.currentTime;
    this.previewStartTime = now;

    // Create stereo merger for mixing all layers
    const merger = this.ctx.createChannelMerger(2);

    // 1. BINAURAL BEATS LAYER
    this.previewOscL = this.ctx.createOscillator();
    this.previewOscL.frequency.value = binauralHz.left;
    this.previewOscL.type = 'sine';

    this.previewOscR = this.ctx.createOscillator();
    this.previewOscR.frequency.value = binauralHz.right;
    this.previewOscR.type = 'sine';

    this.previewGainL = this.ctx.createGain();
    this.previewGainL.gain.value = binauralVolume * 0.5;

    this.previewGainR = this.ctx.createGain();
    this.previewGainR.gain.value = binauralVolume * 0.5;

    this.previewOscL.connect(this.previewGainL);
    this.previewOscR.connect(this.previewGainR);

    this.previewGainL.connect(merger, 0, 0); // left channel
    this.previewGainR.connect(merger, 0, 1); // right channel

    this.previewOscL.start(now);
    this.previewOscR.start(now);

    // 2. VOICE AFFIRMATIONS LAYER
    // Create master voice gain node for real-time control
    this.previewVoiceGain = this.ctx.createGain();
    this.previewVoiceGain.gain.value = options.vocalVolume;
    this.previewVoiceGain.connect(merger, 0, 0); // both channels
    this.previewVoiceGain.connect(merger, 0, 1);

    // Decode all affirmations
    const affBuffers: Array<{ id: string; buffer: AudioBuffer; duration: number }> = [];
    for (const aff of affirmations) {
      const affBytes = this.decodeBase64(aff.userRecording);
      const buffer = await this.ctx.decodeAudioData(affBytes.buffer);
      affBuffers.push({
        id: aff.id,
        buffer: buffer,
        duration: buffer.duration
      });
    }

    // For preview, play first 60 seconds of schedule
    const schedule = this.calculateAffirmationSchedule(affBuffers, 60);

    // Schedule affirmations - all connect to master voice gain
    for (const item of schedule) {
      const affBuffer = affBuffers.find(a => a.id === item.affId);
      if (affBuffer) {
        const source = this.ctx.createBufferSource();
        source.buffer = affBuffer.buffer;

        source.connect(this.previewVoiceGain);
        source.start(now + item.startTime);
        this.previewVoiceSources.push(source);
      }
    }

    // 3. OCEAN SOUNDSCAPE LAYER (if enabled)
    if (options.oceanVolume > 0) {
      this.previewOceanSource = this.ctx.createBufferSource();
      this.previewOceanSource.buffer = this.createNoiseBuffer();
      this.previewOceanSource.loop = true;

      const oceanFilter = this.ctx.createBiquadFilter();
      oceanFilter.type = 'lowpass';
      oceanFilter.frequency.value = 800;

      this.previewOceanGain = this.ctx.createGain();
      this.previewOceanGain.gain.value = options.oceanVolume;

      this.previewOceanSource.connect(oceanFilter);
      oceanFilter.connect(this.previewOceanGain);
      this.previewOceanGain.connect(merger, 0, 0);
      this.previewOceanGain.connect(merger, 0, 1);

      this.previewOceanSource.start(now);
    }

    // 4. RAIN SOUNDSCAPE LAYER (if enabled)
    if (options.rainVolume > 0) {
      this.previewRainSource = this.ctx.createBufferSource();
      this.previewRainSource.buffer = this.createNoiseBuffer();
      this.previewRainSource.loop = true;

      const rainFilter = this.ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.value = 800;

      this.previewRainGain = this.ctx.createGain();
      this.previewRainGain.gain.value = options.rainVolume;

      this.previewRainSource.connect(rainFilter);
      rainFilter.connect(this.previewRainGain);
      this.previewRainGain.connect(merger, 0, 0);
      this.previewRainGain.connect(merger, 0, 1);

      this.previewRainSource.start(now);
    }

    // Connect to output
    merger.connect(this.ctx.destination);
  }

  stopMixPreview() {
    try {
      if (this.previewOscL) {
        this.previewOscL.stop();
        this.previewOscL = null;
      }
      if (this.previewOscR) {
        this.previewOscR.stop();
        this.previewOscR = null;
      }
      this.previewVoiceSources.forEach(source => {
        try {
          source.stop();
        } catch (e) {
          // Already stopped
        }
      });
      this.previewVoiceSources = [];

      if (this.previewOceanSource) {
        this.previewOceanSource.stop();
        this.previewOceanSource = null;
      }
      if (this.previewRainSource) {
        this.previewRainSource.stop();
        this.previewRainSource = null;
      }
      this.previewVoiceGain = null;
      this.previewOceanGain = null;
      this.previewRainGain = null;
    } catch (e) {
      console.error('Error stopping preview:', e);
    }
  }

  updatePreviewVolumes(vocalVolume: number, oceanVolume: number, rainVolume: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.previewVoiceGain) {
      this.previewVoiceGain.gain.cancelScheduledValues(now);
      this.previewVoiceGain.gain.linearRampToValueAtTime(vocalVolume, now + 0.05);
    }
    if (this.previewOceanGain) {
      this.previewOceanGain.gain.cancelScheduledValues(now);
      this.previewOceanGain.gain.linearRampToValueAtTime(oceanVolume, now + 0.05);
    }
    if (this.previewRainGain) {
      this.previewRainGain.gain.cancelScheduledValues(now);
      this.previewRainGain.gain.linearRampToValueAtTime(rainVolume, now + 0.05);
    }
  }

  isPreviewPlaying(): boolean {
    return this.previewOscL !== null;
  }

  // Looping session state
  private loopOscL: OscillatorNode | null = null;
  private loopOscR: OscillatorNode | null = null;
  private loopGainL: GainNode | null = null;
  private loopGainR: GainNode | null = null;
  private loopOceanSource: AudioBufferSourceNode | null = null;
  private loopRainSource: AudioBufferSourceNode | null = null;
  private loopAffBuffers: Array<{ id: string; buffer: AudioBuffer; duration: number }> = [];
  private loopScheduleInterval: number | null = null;
  private loopOptions: { vocalVolume: number; oceanVolume: number; rainVolume: number } | null = null;
  private loopMerger: ChannelMergerNode | null = null;
  private loopScheduledUntil: number = 0; // Track how far ahead we've scheduled
  private loopAnimationFrame: number | null = null;
  private loopVoiceGain: GainNode | null = null;
  private loopOceanGain: GainNode | null = null;
  private loopRainGain: GainNode | null = null;

  async playLoopingSession(
    affirmations: Array<{ id: string; userRecording: string }>,
    binauralHz: { left: number; right: number },
    binauralVolume: number,
    options: {
      vocalVolume: number;
      oceanVolume: number;
      rainVolume: number;
    }
  ) {
    await this.init();
    if (!this.ctx) return;

    // Stop any existing loop
    this.stopLoopingSession();

    const now = this.ctx.currentTime;
    this.loopOptions = options;

    // Create stereo merger for mixing all layers
    const merger = this.ctx.createChannelMerger(2);

    // 1. BINAURAL BEATS LAYER (continuous)
    this.loopOscL = this.ctx.createOscillator();
    this.loopOscL.frequency.value = binauralHz.left;
    this.loopOscL.type = 'sine';

    this.loopOscR = this.ctx.createOscillator();
    this.loopOscR.frequency.value = binauralHz.right;
    this.loopOscR.type = 'sine';

    this.loopGainL = this.ctx.createGain();
    this.loopGainL.gain.value = binauralVolume * 0.5;

    this.loopGainR = this.ctx.createGain();
    this.loopGainR.gain.value = binauralVolume * 0.5;

    this.loopOscL.connect(this.loopGainL);
    this.loopOscR.connect(this.loopGainR);

    this.loopGainL.connect(merger, 0, 0);
    this.loopGainR.connect(merger, 0, 1);

    this.loopOscL.start(now);
    this.loopOscR.start(now);

    // 2. CREATE MASTER VOICE GAIN (for real-time control)
    this.loopVoiceGain = this.ctx.createGain();
    this.loopVoiceGain.gain.value = options.vocalVolume;
    this.loopVoiceGain.connect(merger, 0, 0);
    this.loopVoiceGain.connect(merger, 0, 1);

    // DECODE AFFIRMATIONS (once, then reuse buffers)
    this.loopAffBuffers = [];
    for (const aff of affirmations) {
      const affBytes = this.decodeBase64(aff.userRecording);
      const buffer = await this.ctx.decodeAudioData(affBytes.buffer);
      this.loopAffBuffers.push({
        id: aff.id,
        buffer: buffer,
        duration: buffer.duration
      });
    }

    // 3. OCEAN SOUNDSCAPE LAYER (if enabled)
    if (options.oceanVolume > 0) {
      this.loopOceanSource = this.ctx.createBufferSource();
      this.loopOceanSource.buffer = this.createNoiseBuffer();
      this.loopOceanSource.loop = true;

      const oceanFilter = this.ctx.createBiquadFilter();
      oceanFilter.type = 'lowpass';
      oceanFilter.frequency.value = 800;

      this.loopOceanGain = this.ctx.createGain();
      this.loopOceanGain.gain.value = options.oceanVolume;

      this.loopOceanSource.connect(oceanFilter);
      oceanFilter.connect(this.loopOceanGain);
      this.loopOceanGain.connect(merger, 0, 0);
      this.loopOceanGain.connect(merger, 0, 1);

      this.loopOceanSource.start(now);
    }

    // 4. RAIN SOUNDSCAPE LAYER (if enabled)
    if (options.rainVolume > 0) {
      this.loopRainSource = this.ctx.createBufferSource();
      this.loopRainSource.buffer = this.createNoiseBuffer();
      this.loopRainSource.loop = true;

      const rainFilter = this.ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.value = 800;

      this.loopRainGain = this.ctx.createGain();
      this.loopRainGain.gain.value = options.rainVolume;

      this.loopRainSource.connect(rainFilter);
      rainFilter.connect(this.loopRainGain);
      this.loopRainGain.connect(merger, 0, 0);
      this.loopRainGain.connect(merger, 0, 1);

      this.loopRainSource.start(now);
    }

    // Connect to output
    merger.connect(this.ctx.destination);
    this.loopMerger = merger;

    // 5. START LOOPING AFFIRMATIONS
    // Use requestAnimationFrame for precise continuous scheduling
    this.loopScheduledUntil = now;

    const scheduleAhead = () => {
      if (!this.ctx || !this.loopMerger || !this.loopOptions) return;

      // Only schedule if we have affirmations
      if (this.loopAffBuffers.length === 0) {
        // No affirmations, just keep checking
        this.loopAnimationFrame = requestAnimationFrame(scheduleAhead);
        return;
      }

      const currentTime = this.ctx.currentTime;
      const scheduleAheadTime = 30; // Keep 30 seconds of audio scheduled ahead
      const targetScheduleTime = currentTime + scheduleAheadTime;

      // If we need to schedule more audio
      if (this.loopScheduledUntil < targetScheduleTime) {
        const chunkDuration = 60; // Schedule in 60-second chunks
        const schedule = this.calculateAffirmationSchedule(this.loopAffBuffers, chunkDuration);

        for (const item of schedule) {
          const affBuffer = this.loopAffBuffers.find(a => a.id === item.affId);
          if (affBuffer && this.loopVoiceGain) {
            const source = this.ctx.createBufferSource();
            source.buffer = affBuffer.buffer;

            // Connect to master voice gain (for real-time volume control)
            source.connect(this.loopVoiceGain);

            // Schedule relative to where we've already scheduled
            source.start(this.loopScheduledUntil + item.startTime);
          }
        }

        this.loopScheduledUntil += chunkDuration;
      }

      // Continue checking and scheduling
      this.loopAnimationFrame = requestAnimationFrame(scheduleAhead);
    };

    scheduleAhead();
  }

  stopLoopingSession() {
    try {
      if (this.loopOscL) {
        this.loopOscL.stop();
        this.loopOscL = null;
      }
      if (this.loopOscR) {
        this.loopOscR.stop();
        this.loopOscR = null;
      }
      if (this.loopOceanSource) {
        this.loopOceanSource.stop();
        this.loopOceanSource = null;
      }
      if (this.loopRainSource) {
        this.loopRainSource.stop();
        this.loopRainSource = null;
      }
      if (this.loopScheduleInterval) {
        clearTimeout(this.loopScheduleInterval);
        this.loopScheduleInterval = null;
      }
      if (this.loopAnimationFrame) {
        cancelAnimationFrame(this.loopAnimationFrame);
        this.loopAnimationFrame = null;
      }
      this.loopAffBuffers = [];
      this.loopOptions = null;
      this.loopMerger = null;
      this.loopScheduledUntil = 0;
      this.loopVoiceGain = null;
      this.loopOceanGain = null;
      this.loopRainGain = null;
    } catch (e) {
      console.error('Error stopping loop:', e);
    }
  }

  updateLoopVolumes(vocalVolume: number, oceanVolume: number, rainVolume: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Update stored options for future scheduling
    if (this.loopOptions) {
      this.loopOptions.vocalVolume = vocalVolume;
      this.loopOptions.oceanVolume = oceanVolume;
      this.loopOptions.rainVolume = rainVolume;
    }

    // Update currently playing gain nodes
    if (this.loopVoiceGain) {
      this.loopVoiceGain.gain.cancelScheduledValues(now);
      this.loopVoiceGain.gain.linearRampToValueAtTime(vocalVolume, now + 0.05);
    }
    if (this.loopOceanGain) {
      this.loopOceanGain.gain.cancelScheduledValues(now);
      this.loopOceanGain.gain.linearRampToValueAtTime(oceanVolume, now + 0.05);
    }
    if (this.loopRainGain) {
      this.loopRainGain.gain.cancelScheduledValues(now);
      this.loopRainGain.gain.linearRampToValueAtTime(rainVolume, now + 0.05);
    }
  }

  isLoopPlaying(): boolean {
    return this.loopOscL !== null;
  }
}
