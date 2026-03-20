
import { GoogleGenAI, Modality } from "@google/genai";
import { SynthesisEngine, VocalArchetype } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Mapping our archetypes to internal API voice names/IDs
const GEMINI_VOICE_MAP: Record<VocalArchetype, string> = {
  [VocalArchetype.SOLARIS]: 'Zephyr',
  [VocalArchetype.DEEP_SPACE]: 'Charon',
  [VocalArchetype.GUARDIAN]: 'Kore',
  [VocalArchetype.VITALITY]: 'Puck',
  [VocalArchetype.LUNA]: 'Fenrir',
};

// Common high-quality ElevenLabs voice IDs
const ELEVEN_LABS_VOICE_MAP: Record<VocalArchetype, string> = {
  [VocalArchetype.SOLARIS]: '21m00Tcm4TlvDq8ikWAM', // Rachel
  [VocalArchetype.DEEP_SPACE]: 'pNInz6obpgDQGcFmaJgB', // Adam
  [VocalArchetype.GUARDIAN]: 'MF3mGyEYCl7XYW7Lyk39', // Antoni
  [VocalArchetype.VITALITY]: 'TX3LPaxL7noL3fW8GP4S', // Patrick
  [VocalArchetype.LUNA]: 'EXAVITQu4vr4xnSDxMaL', // Bella
};

export class VoiceSynthesisService {
  static async synthesize(
    text: string, 
    engine: SynthesisEngine = SynthesisEngine.GEMINI, 
    archetype: VocalArchetype = VocalArchetype.SOLARIS
  ): Promise<string> {
    
    if (engine === SynthesisEngine.ELEVEN_LABS) {
      try {
        const apiKey = (process.env as any).ELEVENLABS_API_KEY;
        if (!apiKey) throw new Error("ElevenLabs API key missing");

        const voiceId = ELEVEN_LABS_VOICE_MAP[archetype];
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        });

        if (!response.ok) throw new Error("ElevenLabs request failed");
        
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn("ElevenLabs failed, falling back to Gemini Neural Core:", e);
        // Fallback to Gemini if ElevenLabs fails
        return this.synthesizeWithGemini(text, archetype);
      }
    }

    return this.synthesizeWithGemini(text, archetype);
  }

  private static async synthesizeWithGemini(text: string, archetype: VocalArchetype): Promise<string> {
    const voiceName = GEMINI_VOICE_MAP[archetype];
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Speak this affirmation calmly and slowly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Gemini TTS failed");
    return base64Audio;
  }
}
