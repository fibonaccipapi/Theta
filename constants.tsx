
import { BeliefCategory } from './types';

export interface Question {
  id: string;
  category: BeliefCategory;
  layer: 1 | 2 | 3;
  text: string;
}

export const CATEGORIES = [
  { id: BeliefCategory.MONEY, label: 'Money', icon: 'DollarSign' },
  { id: BeliefCategory.RELATIONSHIPS, label: 'Relationships', icon: 'Heart' },
  { id: BeliefCategory.SELF_WORTH, label: 'Self-Worth', icon: 'User' },
  { id: BeliefCategory.HEALTH, label: 'Health', icon: 'Activity' },
  { id: BeliefCategory.SUCCESS, label: 'Success', icon: 'TrendingUp' },
  { id: BeliefCategory.PURPOSE, label: 'Purpose', icon: 'Compass' },
  { id: BeliefCategory.SHAME, label: 'Shame / Pressure', icon: 'ShieldAlert' },
  { id: BeliefCategory.CUSTOM, label: 'Custom Issue', icon: 'Edit3' },
];

export const ONBOARDING_QUESTIONS: Question[] = [
  // MONEY
  { id: 'm1', category: BeliefCategory.MONEY, layer: 1, text: "What area of your financial life feels most blocked right now?" },
  { id: 'm2', category: BeliefCategory.MONEY, layer: 2, text: "When money comes in, what emotion quietly arrives with it?" },
  { id: 'm3', category: BeliefCategory.MONEY, layer: 2, text: "What happens inside when you spend on yourself?" },
  { id: 'm4', category: BeliefCategory.MONEY, layer: 3, text: "What do you fear wealth would expose about you?" },
  { id: 'm5', category: BeliefCategory.MONEY, layer: 3, text: "If you became financially secure, who might become uncomfortable?" },
  
  // RELATIONSHIPS
  { id: 'r1', category: BeliefCategory.RELATIONSHIPS, layer: 1, text: "What do you keep wanting in love but not fully allowing?" },
  { id: 'r2', category: BeliefCategory.RELATIONSHIPS, layer: 2, text: "When someone is consistent with you, what part of you gets suspicious?" },
  { id: 'r3', category: BeliefCategory.RELATIONSHIPS, layer: 2, text: "When love gets calm, does your nervous system call it boring?" },
  { id: 'r4', category: BeliefCategory.RELATIONSHIPS, layer: 3, text: "What would intimacy require you to stop pretending about?" },
  { id: 'r5', category: BeliefCategory.RELATIONSHIPS, layer: 3, text: "What feels riskier: being abandoned, or being deeply known?" },

  // SELF-WORTH
  { id: 'sw1', category: BeliefCategory.SELF_WORTH, layer: 1, text: "Which pattern feels the most expensive in your life right now?" },
  { id: 'sw2', category: BeliefCategory.SELF_WORTH, layer: 2, text: "When someone truly sees your value, what happens inside?" },
  { id: 'sw3', category: BeliefCategory.SELF_WORTH, layer: 2, text: "Do compliments land, bounce off, or feel suspicious?" },
  { id: 'sw4', category: BeliefCategory.SELF_WORTH, layer: 3, text: "What do you secretly think people would discover if you stopped performing?" },
  { id: 'sw5', category: BeliefCategory.SELF_WORTH, layer: 3, text: "What kind of love do you believe must be earned?" },

  // HEALTH
  { id: 'h1', category: BeliefCategory.HEALTH, layer: 1, text: "What story do you tell yourself when your body feels off?" },
  { id: 'h2', category: BeliefCategory.HEALTH, layer: 2, text: "Do you experience your body more like an ally, a project, or a problem?" },
  { id: 'h3', category: BeliefCategory.HEALTH, layer: 2, text: "When stress rises, do you trust your body to recover?" },
  { id: 'h4', category: BeliefCategory.HEALTH, layer: 3, text: "Do you believe healing is natural for you, or harder for you than other people?" },
  { id: 'h5', category: BeliefCategory.HEALTH, layer: 3, text: "What does your body seem to symbolize in your internal narrative?" },

  // SUCCESS
  { id: 's1', category: BeliefCategory.SUCCESS, layer: 1, text: "What part of you wants success, and what part of you mistrusts it?" },
  { id: 's2', category: BeliefCategory.SUCCESS, layer: 2, text: "When attention increases, what do you brace for?" },
  { id: 's3', category: BeliefCategory.SUCCESS, layer: 2, text: "What does visibility threaten: safety, privacy, belonging, or control?" },
  { id: 's4', category: BeliefCategory.SUCCESS, layer: 3, text: "What becomes dangerous the moment you are fully seen?" },
  { id: 's5', category: BeliefCategory.SUCCESS, layer: 3, text: "If you stop playing small, who do you fear you’ll lose?" },

  // PURPOSE
  { id: 'p1', category: BeliefCategory.PURPOSE, layer: 1, text: "What do you feel you are 'meant' to do, but keep postponing?" },
  { id: 'p2', category: BeliefCategory.PURPOSE, layer: 2, text: "When you imagine living your full purpose, what part of you feels like a fraud?" },
  { id: 'p3', category: BeliefCategory.PURPOSE, layer: 3, text: "What would you have to admit about your current life if you followed your true calling?" },

  // SHAME
  { id: 'sh1', category: BeliefCategory.SHAME, layer: 1, text: "What is the one thing you hope people never find out about your 'struggles'?" },
  { id: 'sh2', category: BeliefCategory.SHAME, layer: 2, text: "When you make a mistake, is the voice inside a coach or a critic?" },
  { id: 'sh3', category: BeliefCategory.SHAME, layer: 3, text: "Who are you trying to prove wrong by succeeding?" },

  // CORE IDENTITY (Layer 3 generic)
  { id: 'c1', category: BeliefCategory.CUSTOM, layer: 3, text: "What do you fear this situation says about you?" },
  { id: 'c2', category: BeliefCategory.CUSTOM, layer: 3, text: "What would be dangerous about finally getting what you want?" },
  { id: 'c3', category: BeliefCategory.CUSTOM, layer: 3, text: "What identity would you have to release in order to heal this?" },
  { id: 'c4', category: BeliefCategory.CUSTOM, layer: 3, text: "What feels more familiar: peace or struggle?" },
  { id: 'c5', category: BeliefCategory.CUSTOM, layer: 3, text: "Do you distrust pain more, or happiness more?" },
];

export const THETA_FREQ_RANGE = { min: 4, max: 8 };
export const BASE_FREQ = 200; // Hz

export const BINAURAL_PRESETS = [
  {
    id: 'theta-meditation',
    name: 'Deep Meditation',
    brainwave: 'Theta (4-7 Hz)',
    description: 'Subconscious Access, Visualization, Hypnosis',
    targetHz: 4,
    carrierHz: 200,
    brainwaveRange: 'theta' as const,
    icon: 'Moon'
  },
  {
    id: 'manifestation',
    name: 'Manifestation',
    brainwave: 'Theta/Alpha (8 Hz)',
    description: 'Theta + Alpha blend for subconscious alignment',
    targetHz: 8,
    carrierHz: 220,
    brainwaveRange: 'alpha' as const,
    icon: 'Sparkles'
  },
  {
    id: 'focus',
    name: 'Focus / Productivity',
    brainwave: 'Alpha (10 Hz)',
    description: 'Alpha state for relaxed awareness and flow',
    targetHz: 10,
    carrierHz: 300,
    brainwaveRange: 'alpha' as const,
    icon: 'Zap'
  },
  {
    id: 'high-performance',
    name: 'High Performance',
    brainwave: 'Beta (15 Hz)',
    description: 'Active problem solving and complex thought',
    targetHz: 15,
    carrierHz: 400,
    brainwaveRange: 'beta' as const,
    icon: 'Target'
  },
  {
    id: 'happiness',
    name: 'Happiness / Mood Lift',
    brainwave: 'Gamma (40 Hz)',
    description: 'Gamma burst for elevated state',
    targetHz: 40,
    carrierHz: 528,
    brainwaveRange: 'gamma' as const,
    icon: 'Sun'
  },
  {
    id: 'anxiety-relief',
    name: 'Anxiety Relief',
    brainwave: 'Alpha (9 Hz)',
    description: 'Calming the nervous system',
    targetHz: 9,
    carrierHz: 396,
    brainwaveRange: 'alpha' as const,
    icon: 'Wind'
  },
  {
    id: 'deep-sleep',
    name: 'Deep Sleep',
    brainwave: 'Delta (2 Hz)',
    description: 'Restorative sleep and physical healing',
    targetHz: 2,
    carrierHz: 100,
    brainwaveRange: 'delta' as const,
    icon: 'CloudMoon'
  },
  {
    id: 'creativity',
    name: 'Creativity',
    brainwave: 'Alpha-Theta (7 Hz)',
    description: 'Insights and creative problem solving',
    targetHz: 7,
    carrierHz: 250,
    brainwaveRange: 'theta' as const,
    icon: 'Palette'
  },
  {
    id: 'peak-awareness',
    name: 'Peak Awareness',
    brainwave: 'Gamma (45 Hz)',
    description: 'Heightened perception and integration',
    targetHz: 45,
    carrierHz: 888,
    brainwaveRange: 'gamma' as const,
    icon: 'Eye'
  }
];
