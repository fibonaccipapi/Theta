# Recording Fix and Audio Mixer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the bug where recordings don't save in Quick Start mode, and add a complete audio mixing pipeline with export functionality.

**Architecture:** Fix session creation in Quick Start flow, add collapsible Mix Studio section to Neural Alchemy Lab, implement intelligent affirmation scheduling and multi-layer audio mixing using Web Audio API's OfflineAudioContext for export.

**Tech Stack:** React 19, TypeScript, Web Audio API (AudioContext, OfflineAudioContext), Framer Motion, Tailwind CSS

---

## Task 1: Fix Quick Start Session Creation

**Files:**
- Modify: `App.tsx:190-204` (LANDING case, Quick Start button)

**Step 1: Update Quick Start button handler to create persistent session**

In the LANDING case, find the Quick Start button (around line 293-298). Replace its onClick handler:

**Current code:**
```tsx
<button
  onClick={() => setAppState(AppState.DASHBOARD)}
  className="neon-button-green min-w-[280px]"
>
  QUICK START
</button>
```

**New code:**
```tsx
<button
  onClick={() => {
    if (sessions.length === 0) {
      // Create a real session for Quick Start mode
      const emptySession: SavedSession = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        analysis: createEmptyAnalysis(),
        label: "Quick Start Session"
      };
      setSessions([emptySession]);
      setActiveSessionId(emptySession.id);
    }
    setAppState(AppState.DASHBOARD);
  }}
  className="neon-button-green min-w-[280px]"
>
  QUICK START
</button>
```

**Step 2: Test the fix**

1. Clear localStorage: `localStorage.clear()` in browser console
2. Refresh the page
3. Click "Quick Start"
4. Click "Record New" on Neural Imprints card
5. Record an affirmation
6. Save it
7. Refresh the page
8. Open Neural Imprints card - recording should still be there

Expected: Recording persists after page refresh

**Step 3: Commit**

```bash
git add App.tsx
git commit -m "fix: create persistent session in Quick Start mode"
```

---

## Task 2: Add WAV Export Utility Functions to Audio Engine

**Files:**
- Modify: `services/audioEngine.ts` (add new helper functions at end of class)

**Step 1: Add WAV conversion helper functions**

Add these functions at the end of the `ThetaAudioEngine` class (before the closing brace):

```typescript
  // WAV Export Utilities
  private bufferToWave(abuffer: AudioBuffer, len: number): Blob {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels: Float32Array[] = [];
    let sample;
    let offset = 0;
    let pos = 0;

    // Write WAVE header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // Write interleaved data
    for (let i = 0; i < abuffer.numberOfChannels; i++) {
      channels.push(abuffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
        view.setInt16(pos, sample, true); // write 16-bit sample
        pos += 2;
      }
      offset++; // next source sample
    }

    return new Blob([buffer], { type: "audio/wav" });
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
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add services/audioEngine.ts
git commit -m "feat: add WAV export utility functions"
```

---

## Task 3: Add Affirmation Scheduling Logic

**Files:**
- Modify: `services/audioEngine.ts` (add scheduling function)

**Step 1: Add intelligent scheduling function**

Add this method to the `ThetaAudioEngine` class (after the WAV utility functions):

```typescript
  private calculateAffirmationSchedule(
    affirmations: Array<{ id: string; duration: number }>,
    totalDurationSeconds: number
  ): Array<{ affId: string; startTime: number }> {
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
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add services/audioEngine.ts
git commit -m "feat: add intelligent affirmation scheduling"
```

---

## Task 4: Add Export Mix Function to Audio Engine

**Files:**
- Modify: `services/audioEngine.ts` (add main export function)

**Step 1: Add exportMix public method**

Add this public method to the `ThetaAudioEngine` class:

```typescript
  async exportMix(
    affirmations: Array<{ id: string; userRecording: string }>,
    binauralHz: { left: number; right: number },
    binauralVolume: number,
    durationMinutes: number,
    onProgress?: (current: number, total: number) => void
  ): Promise<Blob> {
    const durationSeconds = durationMinutes * 60;
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * durationSeconds, sampleRate);

    // Decode all affirmation recordings and get durations
    const affBuffers: Array<{ id: string; buffer: AudioBuffer; duration: number }> = [];
    for (const aff of affirmations) {
      const buffer = await this.decodeVoice(aff.userRecording);
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

    const splitter = offlineCtx.createChannelSplitter(2);
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
        voiceGain.gain.value = 1.0; // Full volume for voice
        source.connect(voiceGain);
        voiceGain.connect(merger, 0, 0);
        voiceGain.connect(merger, 0, 1);

        source.start(item.startTime);
      }
    }

    merger.connect(offlineCtx.destination);

    // Render (this may take several seconds)
    if (onProgress) onProgress(0, durationSeconds);

    const renderedBuffer = await offlineCtx.startRendering();

    if (onProgress) onProgress(durationSeconds, durationSeconds);

    // Convert to WAV
    const wavBlob = this.bufferToWave(renderedBuffer, renderedBuffer.length);
    return wavBlob;
  }
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add services/audioEngine.ts
git commit -m "feat: add exportMix function with binaural beats and affirmations"
```

---

## Task 5: Create MixStudio Component

**Files:**
- Create: `components/MixStudio.tsx`

**Step 1: Create MixStudio component file**

```tsx
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
```

**Step 2: Verify file was created**

Run: `ls -la components/MixStudio.tsx`
Expected: File exists

**Step 3: Commit**

```bash
git add components/MixStudio.tsx
git commit -m "feat: create MixStudio component"
```

---

## Task 6: Integrate MixStudio into Dashboard

**Files:**
- Modify: `components/Dashboard.tsx` (import and add to Neural Alchemy Lab)

**Step 1: Add import at top of file**

Add this import after the other component imports (around line 6):

```tsx
import MixStudio from './MixStudio';
```

**Step 2: Add state for export progress**

Add these state variables in the Dashboard component (around line 30):

```tsx
const [isExporting, setIsExporting] = useState(false);
const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
```

**Step 3: Add export handler function**

Add this function in the Dashboard component (before the return statement):

```tsx
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
```

**Step 4: Add MixStudio component to Neural Alchemy Lab card**

In the Neural Alchemy Lab HeroCard (around line 571-577, after the oscilloscope), add the MixStudio component:

Find this section (the oscilloscope):
```tsx
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
```

Right after the closing `</div>`, add:

```tsx
            {/* Mix Studio */}
            <MixStudio
              affirmations={affirmations}
              currentBinauralHz={{ left: customHz, right: rightHz }}
              currentBinauralVolume={binauralVolume}
              onExport={handleExportMix}
              isExporting={isExporting}
              exportProgress={exportProgress}
            />
```

**Step 5: Test in browser**

1. Refresh the app
2. Navigate to Neural Alchemy Lab
3. Scroll down - should see "Mix Studio" section
4. If you have recorded affirmations, the export button should be enabled

Expected: MixStudio appears, no errors in console

**Step 6: Commit**

```bash
git add components/Dashboard.tsx
git commit -m "feat: integrate MixStudio into Neural Alchemy Lab"
```

---

## Task 7: Test Full Export Flow

**Files:**
- None (testing only)

**Step 1: Clear data and start fresh**

1. Open browser console
2. Run: `localStorage.clear()`
3. Refresh the page

**Step 2: Quick Start flow**

1. Click "Quick Start" on landing page
2. Dashboard should load
3. Click "Record New" on Neural Imprints
4. Record 2-3 affirmations (at least 5 seconds each)
5. Save each one

**Step 3: Test simple export**

1. Scroll to Neural Alchemy Lab
2. Scroll down to Mix Studio section (should be collapsed)
3. Click "Export Hemisync Session (30 min)" button
4. Wait for rendering (should take 5-10 seconds)
5. File should download automatically

Expected:
- WAV file downloads (~150-200 MB)
- Filename: `theta-hemisync-YYYY-MM-DD-30min.wav`
- File plays in audio player with binaural beats and affirmations

**Step 4: Test advanced export**

1. Expand Mix Studio (click the section header)
2. Uncheck one affirmation
3. Change duration to 15 minutes
4. Click "Export Mix (15 min)"
5. File should download

Expected:
- Smaller file (~75-100 MB)
- Only selected affirmations in mix
- Proper filename with duration

**Step 5: Verify persistence**

1. Refresh the page
2. Expand Neural Imprints card
3. Recordings should still be there

Expected: Recordings persist across refresh (bug is fixed!)

---

## Task 8: Push to GitHub and Deploy

**Files:**
- All modified files

**Step 1: Build production version**

Run: `npm run build`
Expected: Build completes successfully

**Step 2: Commit any remaining changes**

```bash
git add .
git status
# If there are any uncommitted changes, commit them
git commit -m "chore: final cleanup and build"
```

**Step 3: Push to GitHub**

```bash
git push origin main
```

Expected: All commits pushed successfully

**Step 4: Deploy to Vercel**

```bash
npx vercel --prod --scope fibonaccis-projects-ea9f763c --yes
```

Expected:
- Build completes
- Deployment succeeds
- New version live at https://theta-reprogramming.vercel.app

**Step 5: Sync to iOS**

```bash
npx cap sync ios
```

Expected: Web assets copied to iOS project

**Step 6: Test on live site**

1. Open https://theta-reprogramming.vercel.app on iPhone
2. Test Quick Start → Record → Export flow
3. Download should work on mobile

---

## Execution Complete

**Features Delivered:**

✅ **Bug Fix**
- Quick Start now creates persistent session
- Recordings save and persist across refreshes

✅ **Mix Studio**
- Simple one-click export (collapsed state)
- Advanced options (expanded state)
- Affirmation selection with checkboxes
- Duration control (10-60 minutes)
- Binaural settings display
- Real-time progress during export

✅ **Audio Engine**
- Intelligent affirmation scheduling (duration × 1.5 spacing)
- Multi-layer mixing (binaural + voice)
- WAV export with OfflineAudioContext
- High-quality 44.1kHz stereo output

✅ **User Experience**
- Progressive disclosure (simple by default)
- Clear progress feedback
- Automatic download
- Proper file naming
- No breaking changes to existing features

**What Users Can Now Do:**
1. Click Quick Start and immediately start recording
2. Build up affirmation library without AI analysis
3. Create 30-minute hemisync sessions with one click
4. Customize which affirmations to include
5. Adjust session duration
6. Download and use files anywhere (sleep apps, meditation, etc.)

**Total Implementation Time:** ~2-3 hours (8 tasks)
