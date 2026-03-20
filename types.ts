
export enum BeliefCategory {
  MONEY = 'money',
  RELATIONSHIPS = 'relationships',
  SELF_WORTH = 'self-worth',
  HEALTH = 'health',
  SUCCESS = 'success',
  PURPOSE = 'purpose',
  SAFETY = 'safety',
  CONTROL = 'control',
  TRUST = 'trust',
  DESERVINGNESS = 'deservingness',
  VISIBILITY = 'visibility',
  BELONGING = 'belonging',
  REST = 'rest',
  EXPRESSION = 'expression',
  POWER = 'power',
  SHAME = 'shame',
  PRESSURE = 'pressure',
  CUSTOM = 'custom'
}

export enum InputMode {
  GUIDED = 'guided',
  VOICE = 'voice',
  ADAPTIVE = 'adaptive'
}

export enum AffirmationTier {
  SOFT = 'soft',
  STANDARD = 'standard',
  POWERFUL = 'powerful'
}

export enum NeuralEnvironment {
  DEEP_HEALING = 'Deep Healing (528Hz)',
  INNER_PEACE = 'Inner Peace (432Hz)',
  ABUNDANCE = 'Abundance (888Hz)',
  COGNITIVE_CLARITY = 'Clarity (221Hz)',
  FORGIVENESS = 'Release & Forgiveness (396Hz)',
  CREATIVITY = 'Creative Flow (417Hz)'
}

export enum SynthesisEngine {
  GEMINI = 'gemini',
  ELEVEN_LABS = 'eleven_labs'
}

export enum VocalArchetype {
  SOLARIS = 'Solaris', // Zephyr
  DEEP_SPACE = 'Deep Space', // Charon
  GUARDIAN = 'Guardian', // Kore
  VITALITY = 'Vitality', // Puck
  LUNA = 'Luna' // Fenrir
}

export enum AffirmationLayer {
  SAFETY = 'safety',
  IDENTITY = 'identity',
  EXPECTATION = 'expectation',
  FREQUENCY = 'frequency',
  ACTION = 'action',
  DETACHMENT = 'detachment'
}

export enum IntensityMode {
  CALIBRATED = 'calibrated',
  POWERFUL = 'powerful',
  DOMINANT = 'dominant'
}

export interface FrequencyModel {
  pattern: string;
  description: string;
  dominant_emotion: string;
  dominant_expectation: string;
  dominant_self_talk: string;
  dominant_body_state: string;
  dominant_behavior_pattern: string;
  dominant_relationship_to_receiving: string;
  dominant_relationship_to_visibility: string;
}

export interface IdentityModel {
  title: string;
  description: string;
  coreBelief: string;
  emotionalBaseline: string;
  behavioralPattern: string;
}

export interface EvidenceTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  timestamp?: number;
}

export interface Affirmation {
  id: string;
  text: string;
  layer: AffirmationLayer;
  intensity: IntensityMode;
  userRecording?: string; // base64
  audioData?: string; // AI generated base64
  isCustom?: boolean;
}

export interface BeliefAnalysis {
  userIssue: string;
  inputMode: InputMode;
  surfacePattern: string;
  emotionalTriggers: string[];
  bodyResponses: string[];
  coreBeliefs: string[];
  defensePattern: string;
  affirmationTone: string;
  oldIdentity: IdentityModel;
  newIdentity: IdentityModel;
  currentFrequency: FrequencyModel;
  desiredFrequency: FrequencyModel;
  frequencyShift: { from: string; to: string };
  affirmations: Affirmation[];
  evidenceTasks: EvidenceTask[];
  visualizationPrompt: string;
  interruptionCue: string;
  recommendedSession: SessionConfig;
}

export interface SessionConfig {
  lengthMinutes: number;
  thetaTargetHz: number;
  voiceMode: 'user_clone' | 'prebuilt' | 'user_recording';
  musicLayer: string;
  vocalArchetype?: VocalArchetype;
}

export interface OnboardingAnswer {
  questionId: string;
  answer: string;
}

export interface BinauralBeatConfig {
  carrierHz: number;
  targetHz: number;
  brainwaveRange: 'theta' | 'alpha' | 'delta' | 'beta' | 'gamma';
  volume: number;
}

export interface AudioProfile {
  bpm: number;
  key: string;
  energy: 'low' | 'medium' | 'high';
  frequencyDistribution: {
    bass: number;
    mids: number;
    highs: number;
  };
  tone: 'bright' | 'warm' | 'neutral';
  nervousSystemImpact: 'calming' | 'neutral' | 'stimulating';
  thetaCompatibility: number; // 0-100
  isBinaural?: boolean;
  binauralConfig?: BinauralBeatConfig;
}

export interface ProcessedAudio {
  id: string;
  name: string;
  originalData?: string; // base64
  processedData: string; // base64
  profile: AudioProfile;
  timestamp: number;
  type: 'voice' | 'music' | 'binaural' | 'mix';
}

export enum AppState {
  LANDING = 'landing',
  MODE_SELECTION = 'mode_selection',
  ONBOARDING_GUIDED = 'onboarding_guided',
  ONBOARDING_VOICE = 'onboarding_voice',
  ONBOARDING_ADAPTIVE = 'onboarding_adaptive',
  RESULTS = 'results',
  DASHBOARD = 'dashboard',
  SESSION = 'session',
  VOICE_CALIBRATION = 'voice_calibration',
  SOUNDSCAPE_EDITOR = 'soundscape_editor',
  VERSION_SELECTED = 'version_selected',
  IDENTITY_LOCK_IN = 'identity_lock_in',
  AUDIO_ENGINE = 'audio_engine',
  FREQUENCY_MAP = 'frequency_map'
}

export interface UserVoiceData {
  id: string;
  audioData: string; 
  label: string;
  calibrated: boolean;
  timestamp: number;
}

export interface SavedSession {
  id: string;
  timestamp: number;
  analysis: BeliefAnalysis;
  label?: string;
}

export interface AppData {
  activeAnalysisId: string | null;
  sessions: SavedSession[];
  voiceLibrary: UserVoiceData[];
  processedAudios: ProcessedAudio[];
  selectedEnv: NeuralEnvironment;
  vocalArchetype: VocalArchetype;
  customSoundscapes: CustomSoundscape[];
}

export interface SoundscapeLayer {
  id: string;
  affirmationId: string;
  startTime: number; // seconds into the track
  volume: number;
}

export interface CustomSoundscape {
  id: string;
  name: string;
  backgroundAudioData: string; // base64
  layers: SoundscapeLayer[];
  loop: boolean;
  duration: number;
}
