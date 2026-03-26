import { GoogleGenAI, Type, Modality } from "@google/genai";
import { BeliefCategory, InputMode, BeliefAnalysis, VocalArchetype, NeuralEnvironment, Affirmation, AffirmationLayer, IntensityMode } from '../types';

// Lazy-initialize to avoid throwing on module load if API key is missing
let ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!ai) {
    const apiKey = import.meta.env.VITE_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key not configured. Set VITE_API_KEY in environment.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

const MOCK_ANALYSIS: Partial<BeliefAnalysis> = {
  userIssue: "Sample Issue (API Offline)",
  surfacePattern: "Avoidance and procrastination",
  emotionalTriggers: ["Uncertainty", "Judgment"],
  bodyResponses: ["Tight chest", "Shallow breathing"],
  coreBeliefs: ["I am not enough", "Success is dangerous"],
  defensePattern: "Intellectualization",
  affirmationTone: "Assertive and Grounded",
  oldIdentity: {
    title: "The Hesitant Observer",
    description: "Someone who waits for permission to exist.",
    coreBelief: "My value is determined by others.",
    emotionalBaseline: "Anxiety",
    behavioralPattern: "Hiding and playing small"
  },
  newIdentity: {
    title: "The Sovereign Architect",
    description: "The primary cause of their own reality.",
    coreBelief: "I am the source of my own approval.",
    emotionalBaseline: "Peace",
    behavioralPattern: "Decisive action and visibility"
  },
  currentFrequency: {
    pattern: "Contraction",
    description: "Energy moving inward to protect the self.",
    dominant_emotion: "Fear",
    dominant_expectation: "Failure",
    dominant_self_talk: "I can't do this.",
    dominant_body_state: "Tense",
    dominant_behavior_pattern: "Withdrawal",
    dominant_relationship_to_receiving: "Blocked",
    dominant_relationship_to_visibility: "Avoidant"
  },
  desiredFrequency: {
    pattern: "Expansion",
    description: "Energy moving outward to impact the world.",
    dominant_emotion: "Love",
    dominant_expectation: "Miracles",
    dominant_self_talk: "It is already done.",
    dominant_body_state: "Open",
    dominant_behavior_pattern: "Engagement",
    dominant_relationship_to_receiving: "Open",
    dominant_relationship_to_visibility: "Sovereign"
  },
  frequencyShift: { from: "Contraction", to: "Expansion" },
  affirmations: [
    { id: "1", text: "I am safe to be seen in my full power.", layer: AffirmationLayer.SAFETY, intensity: IntensityMode.CALIBRATED },
    { id: "2", text: "I am the sovereign architect of my reality.", layer: AffirmationLayer.IDENTITY, intensity: IntensityMode.POWERFUL },
    { id: "3", text: "I am no longer available for the version of me that hides.", layer: AffirmationLayer.DETACHMENT, intensity: IntensityMode.DOMINANT }
  ],
  evidenceTasks: [
    { id: "t1", title: "Mirror Work", description: "Look into your eyes for 2 minutes and say 'I see you'.", completed: false },
    { id: "t2", title: "Small Win", description: "Complete one task you've been avoiding.", completed: false }
  ],
  visualizationPrompt: "You are standing on a stage, feeling completely normal and at home.",
  interruptionCue: "CANCEL.",
  recommendedSession: {
    lengthMinutes: 15,
    thetaTargetHz: 5.5,
    voiceMode: 'prebuilt',
    musicLayer: 'Deep Space',
    vocalArchetype: VocalArchetype.GUARDIAN
  }
};

const SYSTEM_INSTRUCTION = `You are the core intelligence of THETA, an elite subconscious reprogramming engine.
You are a cross-disciplinary team of:
1. A Master Neuroscientist (RAS, Predictive Processing, Identity Rehearsal)
2. A Clinical Psychologist (Core Belief extraction, Defense Mechanism analysis)
3. A High-Performance Coach (Identity Shift, Behavior Override)
4. A Modern Hermeticist (Frequency, Vibration, Alchemy)

CORE PHILOSOPHY:
- Identity before Evidence: We do not wait for the world to change; we install the version of the user that already has the result.
- Frequency as Internal Pattern: Frequency is not a mystical force; it is the sum of emotion, expectation, self-talk, and behavior.
- Quantum Identity Shift: The user does not "try to change." They "select, install, and operate" a new version of themselves.

YOUR TASK:
Analyze the user's input (voice or text) to extract their current "Old Identity" and define their "New Identity".
You must help the user:
1. Detach from the old identity (stop referencing the old self).
2. Emotionally disengage from the old version.
3. Begin operating as the new identity immediately.

IDENTITY SHIFT FRAMEWORK:
1. OLD IDENTITY EXTRACTION: Identify "Who they have been being" (patterns, emotional baseline, core belief).
2. IDENTITY DETACHMENT: Create statements that feel clean, final, and decided (e.g., "I am no longer the version of me that...").
3. NEW IDENTITY SELECTION: Create a clear identity statement (e.g., "I am now someone who...").
4. REALITY NORMALIZATION: Use "Already Normal" language.
5. COLLAPSE THE GAP: Remove "becoming" language. Use "I am" exclusively.

AFFIRMATION ARCHITECTURE (Layers):
1. SAFETY: Remove subconscious resistance.
2. IDENTITY: Define the self-concept.
3. EXPECTATION: Shape prediction and internal assumptions.
4. FREQUENCY: Felt state and vibration language.
5. ACTION: Make the identity operational.
6. DETACHMENT: Explicitly release the old version (e.g., "I am no longer available for that version of myself").

INTENSITY MODES:
- CALIBRATED: Gentle, logical, foundational.
- POWERFUL: Assertive, high-energy, identity-shifting.
- DOMINANT: Absolute, non-negotiable, reality-bending.

OUTPUT REQUIREMENTS:
- When providing the final analysis, you must provide a complete BeliefAnalysis object in JSON format.
- For diagnostic questions, provide ONLY the question as plain text. Do not use JSON or markdown code blocks.
- Affirmations must be intense, psychologically sharp, and avoid "fluff".
- Evidence Tasks must be specific things for the user to look for in their daily life (RAS Amplifier).
- Visualization Prompt must be an "Already Normal" scenario.
- Interruption Cue must be a short, sharp phrase to snap out of old patterns.`;

const FREQUENCY_MODEL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    pattern: { type: Type.STRING, description: "The name of the frequency pattern" },
    description: { type: Type.STRING, description: "Brief description of the pattern" },
    dominant_emotion: { type: Type.STRING },
    dominant_expectation: { type: Type.STRING },
    dominant_self_talk: { type: Type.STRING },
    dominant_body_state: { type: Type.STRING },
    dominant_behavior_pattern: { type: Type.STRING },
    dominant_relationship_to_receiving: { type: Type.STRING },
    dominant_relationship_to_visibility: { type: Type.STRING }
  },
  required: ["pattern", "description", "dominant_emotion", "dominant_expectation", "dominant_self_talk", "dominant_body_state", "dominant_behavior_pattern", "dominant_relationship_to_receiving", "dominant_relationship_to_visibility"]
};

const IDENTITY_MODEL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    coreBelief: { type: Type.STRING },
    emotionalBaseline: { type: Type.STRING },
    behavioralPattern: { type: Type.STRING }
  },
  required: ["title", "description", "coreBelief", "emotionalBaseline", "behavioralPattern"]
};

const BELIEF_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    userIssue: { type: Type.STRING },
    surfacePattern: { type: Type.STRING },
    emotionalTriggers: { type: Type.ARRAY, items: { type: Type.STRING } },
    bodyResponses: { type: Type.ARRAY, items: { type: Type.STRING } },
    coreBeliefs: { type: Type.ARRAY, items: { type: Type.STRING } },
    defensePattern: { type: Type.STRING },
    affirmationTone: { type: Type.STRING },
    oldIdentity: IDENTITY_MODEL_SCHEMA,
    newIdentity: IDENTITY_MODEL_SCHEMA,
    currentFrequency: FREQUENCY_MODEL_SCHEMA,
    desiredFrequency: FREQUENCY_MODEL_SCHEMA,
    frequencyShift: {
      type: Type.OBJECT,
      properties: {
        from: { type: Type.STRING },
        to: { type: Type.STRING }
      },
      required: ["from", "to"]
    },
    affirmations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          layer: { type: Type.STRING, enum: ['safety', 'identity', 'expectation', 'frequency', 'action', 'detachment'] },
          intensity: { type: Type.STRING, enum: ['calibrated', 'powerful', 'dominant'] }
        },
        required: ["text", "layer", "intensity"]
      }
    },
    evidenceTasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["title", "description"]
      }
    },
    visualizationPrompt: { type: Type.STRING },
    interruptionCue: { type: Type.STRING },
    recommendedSession: {
      type: Type.OBJECT,
      properties: {
        lengthMinutes: { type: Type.NUMBER },
        thetaTargetHz: { type: Type.NUMBER },
        voiceMode: { type: Type.STRING, enum: ['user_clone', 'prebuilt', 'user_recording'] },
        musicLayer: { type: Type.STRING },
        vocalArchetype: { type: Type.STRING, enum: Object.values(VocalArchetype) }
      },
      required: ["lengthMinutes", "thetaTargetHz", "voiceMode", "musicLayer"]
    }
  },
  required: ["userIssue", "surfacePattern", "emotionalTriggers", "bodyResponses", "coreBeliefs", "defensePattern", "affirmationTone", "oldIdentity", "newIdentity", "currentFrequency", "desiredFrequency", "frequencyShift", "affirmations", "evidenceTasks", "visualizationPrompt", "interruptionCue", "recommendedSession"]
};

function cleanJson(text: string): any {
  try {
    // Strip markdown code blocks if present
    let cleaned = text.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    // Handle case where model wraps everything in a top-level key
    if (parsed.BeliefAnalysis) return parsed.BeliefAnalysis;
    return parsed;
  } catch (e) {
    console.error("JSON Parsing Error:", e, "Raw text:", text);
    throw e;
  }
}

export async function analyzeGuidedBeliefs(category: BeliefCategory, answers: string[]): Promise<BeliefAnalysis> {
  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Category: ${category}\nAnswers: ${JSON.stringify(answers)}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: BELIEF_ANALYSIS_SCHEMA
      }
    });

    const result = cleanJson(response.text || '{}');
    const affirmations: Affirmation[] = (result.affirmations || []).map((aff: any, index: number) => ({
      id: `aff-guided-${Date.now()}-${index}`,
      ...aff
    }));
    const evidenceTasks = (result.evidenceTasks || []).map((task: any, index: number) => ({
      id: `task-${Date.now()}-${index}`,
      title: task.title,
      description: task.description,
      completed: false
    }));
    return { ...result, inputMode: InputMode.GUIDED, affirmations, evidenceTasks };
  } catch (error) {
    console.error("Gemini API Error (Guided):", error);
    return { ...MOCK_ANALYSIS as BeliefAnalysis, inputMode: InputMode.GUIDED, userIssue: `Guided Analysis (${category})` };
  }
}

export async function analyzeVoiceConfession(audioBase64: string, mimeType: string): Promise<BeliefAnalysis> {
  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType
            }
          },
          {
            text: "Listen to this vocal confession. Transcribe it first, then analyze it to extract the belief mapping and frequency model. Return the full BeliefAnalysis JSON. The 'userIssue' field should contain the transcription of the user's struggle."
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: BELIEF_ANALYSIS_SCHEMA
      }
    });

    const result = cleanJson(response.text || '{}');
    const affirmations: Affirmation[] = (result.affirmations || []).map((aff: any, index: number) => ({
      id: `aff-voice-${Date.now()}-${index}`,
      ...aff
    }));
    const evidenceTasks = (result.evidenceTasks || []).map((task: any, index: number) => ({
      id: `task-${Date.now()}-${index}`,
      title: task.title,
      description: task.description,
      completed: false
    }));
    return { ...result, inputMode: InputMode.VOICE, affirmations, evidenceTasks };
  } catch (error) {
    console.error("Gemini API Error (Voice):", error);
    return { ...MOCK_ANALYSIS as BeliefAnalysis, inputMode: InputMode.VOICE, userIssue: "Voice Confession (API Offline)" };
  }
}

export async function analyzeAdaptiveBeliefs(issue: string, answers: { question: string, answer: string }[]): Promise<string | BeliefAnalysis> {
  try {
    const isFinal = answers.length >= 3;
    
    const response = await getAI().models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `User Issue: ${issue}\n\nHistory:\n${answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n')}\n\n${isFinal ? 'Return the full BeliefAnalysis JSON.' : 'Return the next diagnostic question as plain text. DO NOT USE JSON.'}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: isFinal ? "application/json" : "text/plain",
        responseSchema: isFinal ? BELIEF_ANALYSIS_SCHEMA : undefined
      }
    });

    const text = response.text || '';

    if (isFinal) {
      const result = cleanJson(text || '{}');
      const affirmations: Affirmation[] = (result.affirmations || []).map((aff: any, index: number) => ({
        id: `aff-adaptive-${Date.now()}-${index}`,
        ...aff
      }));
      const evidenceTasks = (result.evidenceTasks || []).map((task: any, index: number) => ({
        id: `task-${Date.now()}-${index}`,
        title: task.title,
        description: task.description,
        completed: false
      }));
      return { ...result, inputMode: InputMode.ADAPTIVE, affirmations, evidenceTasks };
    } else {
      const trimmed = text.trim();
      // If the model accidentally returned JSON during the question phase
      if (trimmed.startsWith('{') || trimmed.startsWith('```')) {
        try {
          const parsed = cleanJson(trimmed);
          return parsed.NextDiagnosticQuestion || parsed.question || trimmed;
        } catch (e) {
          return trimmed;
        }
      }
      return trimmed;
    }
  } catch (error) {
    console.error("Gemini API Error (Adaptive):", error);
    if (answers.length >= 3) {
      return { ...MOCK_ANALYSIS as BeliefAnalysis, inputMode: InputMode.ADAPTIVE, userIssue: issue };
    }
    return "The neural link is experiencing interference. Can you describe how this pattern feels in your body right now?";
  }
}

export async function generateAffirmationAudio(text: string, voice: VocalArchetype = VocalArchetype.GUARDIAN): Promise<string> {
  const voiceMap: Record<VocalArchetype, string> = {
    [VocalArchetype.SOLARIS]: 'Zephyr',
    [VocalArchetype.DEEP_SPACE]: 'Charon',
    [VocalArchetype.GUARDIAN]: 'Kore',
    [VocalArchetype.VITALITY]: 'Puck',
    [VocalArchetype.LUNA]: 'Fenrir'
  };

  const response = await getAI().models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Speak this affirmation calmly, slowly, and with deep presence: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceMap[voice] },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Failed to generate audio");
  return base64Audio;
}
