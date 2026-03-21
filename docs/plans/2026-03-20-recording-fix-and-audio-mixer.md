# Recording Fix and Audio Mixer Design

**Date:** 2026-03-20
**Status:** Approved
**Author:** Claude Sonnet 4.5

## Overview

Fix the bug where voice recordings don't save in Quick Start mode, and add a complete audio mixing pipeline that allows users to create downloadable 30-minute hemisync sessions with their recorded affirmations, binaural beats, and optional soundscape backgrounds.

## Goals

1. **Fix recording bug** - Recordings must persist in Quick Start mode
2. **Audio mixing pipeline** - Recorded affirmations → binaural beats → optional soundscape → exportable file
3. **Simple by default, powerful when needed** - One-click export + advanced mixing options
4. **No breaking changes** - Existing sessions and data structures remain compatible

## Problems Solved

### Problem 1: Recordings Don't Save in Quick Start
When users choose "Quick Start" (skip onboarding), the app creates a temporary `createEmptyAnalysis()` object but doesn't save it as a real session. When users record affirmations, the `handleVoiceSave` function tries to update a session that doesn't exist in the `sessions` array, so recordings are lost.

### Problem 2: No Way to Create Final Audio Mix
Users can record affirmations and generate binaural beats, but there's no pipeline to combine them into a downloadable file. The Soundscape Architect exists but doesn't integrate with the binaural generator.

## Design Principles

- **Progressive disclosure** - Simple one-click export by default, advanced options when expanded
- **Intelligent defaults** - Auto-spacing between affirmations based on duration
- **Real-time + Export** - Can preview in real-time AND download as file
- **Consistent with dashboard simplification** - Uses same collapsible section pattern

---

## Solution Architecture

### Part 1: Recording Bug Fix

**Root Cause:** Quick Start doesn't create a persistent session.

**Fix:** When user clicks "Quick Start" and no sessions exist:
1. Create a new `SavedSession` object with `createEmptyAnalysis()` as the analysis
2. Generate a unique session ID
3. Add to `sessions` array in state
4. Set as `activeSessionId`
5. Save to localStorage (automatic via state persistence)
6. Navigate to dashboard

**Code Location:** `App.tsx`, in the LANDING case button handler for "Quick Start"

**Impact:**
- Recordings now save to a real session
- Session persists across page refreshes
- Users can build up affirmation library in Quick Start mode
- No changes to existing session management logic

---

### Part 2: Mix Studio UI Enhancement

**Location:** Neural Alchemy Lab hero card, below the oscilloscope

**New Section: "Mix Studio" (Collapsible)**

#### Collapsed State (Default):
```
┌─────────────────────────────────────────────┐
│ ▸ Mix Studio                                │
│                                             │
│ [Export Hemisync Session (30 min)]         │
└─────────────────────────────────────────────┘
```

- Single button: "Export Hemisync Session (30 min)"
- One click uses current settings:
  - All recorded affirmations (with userRecording data)
  - Current binaural Hz from sliders (left/right)
  - Ocean/rain layers if active (at current volume)
  - 30-minute duration
- Shows progress: "Rendering... 00:00 / 30:00" → "Download Ready!"

#### Expanded State (Advanced Options):
```
┌─────────────────────────────────────────────┐
│ ▾ Mix Studio                                │
│                                             │
│ AFFIRMATIONS (3 recorded)                   │
│ ☑ "I am confident and capable"             │
│ ☑ "Money flows to me easily"               │
│ ☑ "I am worthy of success"                 │
│                                             │
│ BINAURAL SETTINGS                           │
│ Left: 200 Hz | Right: 204 Hz (4Hz θ)       │
│                                             │
│ SOUNDSCAPE LAYER (Optional)                 │
│ [Select Soundscape ▾] None                  │
│ [Upload Audio File...]                      │
│ Volume: ████████░░ 40%                      │
│                                             │
│ DURATION                                    │
│ ████████████████░░░░░░ 30 minutes           │
│                                             │
│ SPACING                                     │
│ Auto: ~8 sec between affirmations          │
│                                             │
│ [▶ Play Preview] [⬇ Export Mix (30 min)]   │
└─────────────────────────────────────────────┘
```

**Components:**
1. **Affirmation Selection**
   - List all affirmations that have `userRecording` data
   - Checkboxes to include/exclude (all checked by default)
   - Show count: "3 recorded"

2. **Binaural Settings**
   - Read-only display of current Hz from sliders above
   - Shows calculated beat frequency: "(4Hz θ)"

3. **Soundscape Layer**
   - Dropdown populated from `customSoundscapes` array
   - "Or Upload Audio File" button (accepts .mp3, .wav, .m4a)
   - Volume slider: 0-100%, default 40%
   - When "None" selected, this layer is disabled

4. **Duration Slider**
   - Range: 10-60 minutes
   - Default: 30 minutes
   - Step: 5 minutes

5. **Spacing Display**
   - Auto-calculated, not editable
   - Shows average gap between affirmations
   - Formula: `affirmationDuration × 1.5`

6. **Action Buttons**
   - "Play Preview" → Real-time playback in browser
   - "Export Mix (30 min)" → Renders full file and downloads

---

### Part 3: Audio Mixing Engine

#### Intelligent Spacing Algorithm

```typescript
function calculateAffirmationSchedule(
  affirmations: Array<{duration: number}>,
  totalDuration: number
): Array<{startTime: number}> {
  const schedule: Array<{affId: string, startTime: number}> = [];
  let currentTime = 0;
  let affIndex = 0;

  while (currentTime < totalDuration) {
    const aff = affirmations[affIndex % affirmations.length];
    const gap = aff.duration * 1.5; // 50% extra for processing

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

**Logic:**
- Each affirmation plays, then silence for 150% of its duration
- Affirmations loop continuously until total duration is reached
- Example: 5-second affirmation → 7.5 seconds gap → next affirmation

#### Audio Layering (Web Audio API)

**Three Layers:**

1. **Binaural Beats (Base Layer)**
   - Two continuous oscillators (OscillatorNode)
   - Left ear: `customHz` (e.g., 200 Hz)
   - Right ear: `rightHz` (e.g., 204 Hz)
   - Brain perceives difference: 4 Hz theta wave
   - Volume: `binauralVolume` from slider

2. **Voice Affirmations (Loop Layer)**
   - Scheduled AudioBufferSourceNodes
   - Each affirmation's `userRecording` decoded to AudioBuffer
   - Scheduled at calculated times from schedule
   - Volume: 100% (affirmations are primary content)

3. **Soundscape Background (Optional Layer)**
   - Looped background audio (ocean, rain, or uploaded file)
   - Repeats for entire duration
   - Volume: User-adjustable (default 40%)

#### Real-Time Playback

**Uses existing AudioContext:**
```typescript
async playMixPreview(
  affirmations: Affirmation[],
  binauralHz: {left: number, right: number},
  soundscape?: string,
  duration: number = 30 * 60 // seconds
) {
  await this.init();

  // Start binaural beats
  this.startBinauralBeats(binauralHz.left, binauralHz.right);

  // Load and schedule affirmations
  const schedule = calculateAffirmationSchedule(affirmations, duration);
  for (const item of schedule) {
    const buffer = await this.decodeVoice(affirmation.userRecording);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    source.start(this.ctx.currentTime + item.startTime);
  }

  // Optionally add soundscape
  if (soundscape) {
    this.loadAndLoopSoundscape(soundscape, duration);
  }
}
```

#### Export/Download (OfflineAudioContext)

**Pre-renders full mix:**
```typescript
async exportMix(
  affirmations: Affirmation[],
  binauralHz: {left: number, right: number},
  soundscape?: string,
  duration: number = 30 * 60
): Promise<Blob> {
  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  // Create binaural beats
  const leftOsc = offlineCtx.createOscillator();
  leftOsc.frequency.value = binauralHz.left;
  const leftGain = offlineCtx.createGain();
  leftGain.gain.value = this.binauralVolume;
  leftOsc.connect(leftGain);

  const splitter = offlineCtx.createChannelSplitter(2);
  const merger = offlineCtx.createChannelMerger(2);
  leftGain.connect(splitter);
  splitter.connect(merger, 0, 0); // left to left

  // Similar for right ear...

  // Schedule affirmations
  const schedule = calculateAffirmationSchedule(affirmations, duration);
  for (const item of schedule) {
    const buffer = await this.decodeVoice(affirmation.userRecording);
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(merger);
    source.start(item.startTime);
  }

  // Add soundscape if provided
  if (soundscape) {
    // Load, loop, and mix in at 40% volume
  }

  merger.connect(offlineCtx.destination);

  // Render
  const renderedBuffer = await offlineCtx.startRendering();

  // Convert to WAV
  const wavBlob = bufferToWave(renderedBuffer, renderedBuffer.length);
  return wavBlob;
}
```

**Download:**
```typescript
function downloadMix(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `theta-hemisync-${Date.now()}.wav`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**File Format:** WAV (uncompressed, high quality)
**File Size:** ~150-200 MB for 30 minutes
**Duration:** Rendering takes ~5-10 seconds for 30-minute mix

---

## Data Flow

### Recording Fix Flow
```
User clicks "Quick Start" (no sessions exist)
  ↓
Create SavedSession:
  - id: Date.now().toString()
  - timestamp: Date.now()
  - analysis: createEmptyAnalysis()
  - label: "Quick Start Session"
  ↓
Add to sessions array
  ↓
Set as activeSessionId
  ↓
Save to localStorage (automatic)
  ↓
Navigate to DASHBOARD
  ↓
User clicks "Record New" on Neural Imprints
  ↓
Navigate to VOICE_CALIBRATION
  ↓
User records affirmation
  ↓
handleVoiceSave(audioData) called
  ↓
Find session by activeSessionId (now exists!)
  ↓
Update affirmation.userRecording in session.analysis.affirmations
  ↓
Save updated session to localStorage
  ↓
Recording persists! ✓
```

### Mix Export Flow
```
User clicks "Export Hemisync Session"
  ↓
Gather settings:
  - Recorded affirmations (filter for userRecording !== undefined)
  - Binaural Hz (customHz, rightHz)
  - Ocean/rain state + volumes
  - Duration: 30 minutes
  ↓
Show progress UI: "Rendering..."
  ↓
Call audioEngine.exportMix()
  ↓
OfflineAudioContext renders:
  1. Generate binaural beats (continuous)
  2. Schedule affirmations with intelligent spacing
  3. Loop soundscape if selected
  4. Mix all layers
  ↓
Convert AudioBuffer to WAV Blob
  ↓
Trigger download: theta-hemisync-{timestamp}.wav
  ↓
Show "Download Ready!" ✓
```

---

## Component Changes

### New: `components/MixStudio.tsx`
Collapsible section for Mix Studio UI (could be inline in Dashboard, or extracted)

### Modified: `App.tsx`
- Fix Quick Start button handler to create real session
- Pass mix export handler to Dashboard

### Modified: `components/Dashboard.tsx`
- Add Mix Studio section below oscilloscope in Neural Alchemy Lab card
- Wire up export functionality

### Modified: `services/audioEngine.ts`
- Add `calculateAffirmationSchedule()` helper
- Add `playMixPreview()` for real-time playback
- Add `exportMix()` for rendering and download
- Add `bufferToWave()` helper for WAV conversion

---

## Edge Cases & Error Handling

**No Recorded Affirmations:**
- Disable export button
- Show message: "Record affirmations first to create a mix"

**Very Long Affirmations:**
- If single affirmation > 2 minutes, cap gap at 3 minutes (prevent excessive silence)

**Browser Limitations:**
- OfflineAudioContext may struggle with 60-minute renders on older devices
- Show warning for durations > 45 minutes: "Large files may take longer to render"

**File Size Warning:**
- Before export, show estimated file size
- "This will create a ~180 MB file. Continue?"

**Memory Management:**
- After export completes, free AudioBuffers
- Revoke blob URLs after download

---

## Success Criteria

✅ **Bug Fixed:**
- Quick Start recordings persist across page refreshes
- Users can build affirmation library without running AI analysis

✅ **Export Works:**
- One-click export creates 30-minute file with current settings
- Advanced mode allows customization (affirmations, soundscape, duration)
- Download triggers automatically with proper filename

✅ **Audio Quality:**
- Binaural beats are clear and properly spaced (left/right channels)
- Affirmations are intelligently spaced (not too frequent, not too sparse)
- No clipping, distortion, or audio artifacts

✅ **UX:**
- Simple by default (one button)
- Advanced options available when expanded
- Progress feedback during rendering
- File size < 250 MB for 30 minutes

---

## Out of Scope

- MP3 export (requires encoder library, adds complexity)
- Cloud storage for mixes (files are too large)
- Preset saving (can add later if needed)
- Volume normalization/mastering (keep it simple)
- AI voice cloning for affirmations (already exists as placeholder)

---

## Technical Notes

**Browser Compatibility:**
- Web Audio API: All modern browsers
- OfflineAudioContext: Safari 14+, Chrome 90+, Firefox 88+
- MediaRecorder: All modern browsers
- File download: All modern browsers

**Performance:**
- Real-time playback: No issues (current system already works)
- Export rendering: 5-10 seconds for 30 minutes on average laptop
- Memory usage: ~300 MB peak during export (acceptable)

**File Format:**
- WAV chosen for simplicity (no encoding required)
- 44.1 kHz sample rate (CD quality)
- 16-bit depth
- Stereo (required for binaural beats)

---

## Design Approved By

User: fibonaccipapi
Date: 2026-03-20
Status: Ready for implementation
