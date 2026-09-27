import { supabase } from './supabase';
import type { ScanSeverity, ScanStage, TreatmentOption } from './supabase';

// ------------------------------------------------------------------
// Hapus Doctor AI client
// All AI goes through the 'hapus-ai' Supabase Edge Function so the
// Gemini API key never ships inside the app bundle.
//
// Every function here is fail-soft: if AI is unavailable the caller
// shows a friendly error and the farmer can retry — nothing crashes.
// ------------------------------------------------------------------

export type DiagnosisResult = {
  is_healthy: boolean;
  disease_name_mr: string;
  disease_name_en: string;
  confidence: number;
  severity: ScanSeverity;
  stage: ScanStage;
  description_mr: string;
  treatment: TreatmentOption[];
  prevention_mr: string[];
  rescan_after_days: number;
};

/**
 * Diagnose a mango leaf/flower/fruit/trunk photo (optionally with the
 * farmer's spoken symptom description). Returns null if AI is unavailable.
 */
export function diagnoseScan(input: {
  image_base64: string;
  mime_type?: string;
  voice_text?: string | null;
}): Promise<DiagnosisResult | null> {
  return (async () => {
    const data = await invokeAI({
      mode: 'diagnose',
      image_base64: input.image_base64,
      mime_type: input.mime_type || 'image/jpeg',
      voice_text: input.voice_text ?? null,
    });
    return (data as DiagnosisResult) ?? null;
  })();
}

/**
 * Transcribe an audio recording (Marathi/Hindi/English speech) to text.
 */
export function transcribeAudio(
  audioUri: string,
  mimeType = 'audio/m4a'
): Promise<string | null> {
  return (async () => {
    const base64 = await uriToBase64(audioUri);
    if (!base64) return null;
    const data = await invokeAI({ mode: 'transcribe', audio_base64: base64, mime_type: mimeType });
    return typeof data?.text === 'string' && data.text.trim() ? data.text.trim() : null;
  })();
}

async function invokeAI(payload: Record<string, unknown>): Promise<any | null> {
  try {
    const { data, error } = await supabase.functions.invoke('hapus-ai', { body: payload });
    if (error) {
      console.warn('AI call failed (non-fatal):', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('AI call threw (non-fatal):', err);
    return null;
  }
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Convert a local image/audio URI to base64 (works on web + native). */
export async function uriToBase64(uri: string): Promise<string | null> {
  try {
    if (uri.startsWith('data:')) {
      return uri.split(',')[1] ?? null;
    }

    if (uri.startsWith('file:') || uri.startsWith('blob:') || uri.startsWith('http')) {
      const res = await fetch(uri);
      const blob = await res.blob();
      return await blobToBase64(blob);
    }

    return null;
  } catch (err) {
    console.warn('uriToBase64 failed (non-fatal):', err);
    return null;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result);
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
