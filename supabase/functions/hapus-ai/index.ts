// Hapus Doctor — AI edge function (same Supabase project as CampusFix).
//
//   POST { mode: 'diagnose', image_base64, mime_type, voice_text? }
//     → { is_healthy, disease_name_mr, disease_name_en, confidence, severity, stage,
//         description_mr, treatment: [{type, medicine, dosage, frequency, notes}],
//         prevention_mr: [...], rescan_after_days }
//
//   POST { mode: 'transcribe', audio_base64, mime_type }
//     → { text }
//
// SETUP (one time, Supabase Dashboard → Edge Functions → hapus-ai → Secrets):
//   GEMINI_API_KEY = <comma-separated keys — the SAME secret already set for ai-triage>
//
// DEPLOY: npx supabase functions deploy hapus-ai
// or paste this file into Dashboard → Edge Functions → Create new → hapus-ai.
//
// TypeScript for Deno — excluded from the app typecheck via supabase/tsconfig.functions.json.
/// <reference lib="deno.ns" />
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

// Supports comma-separated keys: GEMINI_API_KEY="key1,key2" — failover on quota.
const GEMINI_KEYS = (Deno.env.get('GEMINI_API_KEY') ?? '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);
const GEMINI_MODEL = 'gemini-flash-lite-latest'; // alias; separate daily quota bucket (flash tier exhausted 2026-09-26)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const VALID_STAGES = ['leaf', 'flower', 'fruit', 'trunk'] as const;
const VALID_TREATMENT_TYPES = ['chemical', 'organic'] as const;

interface AIRequest {
  mode: 'diagnose' | 'transcribe';
  image_base64?: string;
  mime_type?: string;
  audio_base64?: string;
  voice_text?: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    if (!GEMINI_KEYS.length) {
      return json({ error: 'GEMINI_API_KEY not configured in edge function secrets' }, 500);
    }

    const body: AIRequest = await req.json();

    switch (body.mode) {
      case 'diagnose':   return await handleDiagnose(body);
      case 'transcribe': return await handleTranscribe(body);
      default:           return json({ error: `Unknown mode: ${body.mode}` }, 400);
    }
  } catch (err) {
    console.error('hapus-ai error:', err);
    return json({ error: 'AI service temporarily unavailable' }, 500);
  }
});

// ------------------------------------------------------------------
// DIAGNOSE — vision mode: mango photo (+ optional spoken symptoms) →
// strict JSON diagnosis with Marathi treatment plan
// ------------------------------------------------------------------
async function handleDiagnose(body: AIRequest) {
  if (!body.image_base64) return json({ error: 'image_base64 required' }, 400);

  const farmerNote = body.voice_text
    ? `\n\nThe farmer also described the problem (may be Marathi/Hindi/English/mixed): "${body.voice_text.slice(0, 500)}". Use this as additional evidence, but the photo is primary.`
    : '';

  const prompt = `You are Hapus Doctor, an expert plant pathologist advising farmers who grow Alphonso (हपुस) mangoes in the Konkan region of Maharashtra, India.

Look at the photo of a mango leaf/flower/fruit/trunk.${farmerNote}

Diagnose from this list of the most common Konkan Hapus problems (or healthy):
- भुरी / Powdery Mildew (Oidium mangiferae) — WHITE POWDERY DUST on panicles/flowers/young leaves/fruit; leaf edges may curl & brown; flower & fruit drop. White dust = mildew, NOT hopper. Curling leaves with any whitish/grey residue = mildew blight phase, NOT anthracnose
- काजळी / Mango Hopper (Idioscopus spp.) — actual small brown insects visible on panicles + sticky honeydew + black sooty coating. No white dust
- काळा डाग / Anthracnose (Colletotrichum) — distinct dark brown/black SPOTS with sharp edges on leaves/fruit (no white dust, no powder residue), spreads in humid rain
- फळमाशी / Fruit Fly (Bactrocera dorsalis) — small holes on fruit, larvae inside, premature drop
- ठिपका मरण / Die-back (Botryodiplodia) — twig tips drying backwards, gum exudation
- काजळ / Sooty Mould — black sticky layer on leaf surface
- फुलोऱ्याचे विकृतीकरण / Floral Malformation — thick deformed panicles, no fruit set
- गममोसिस / Gummosis — gum oozing from trunk/branches, bark cracking
- Healthy

Respond with ONLY this JSON object:
{
  "is_healthy": true/false,
  "disease_name_mr": "रोगाचे मराठी नाव (उदा. भुरी). Empty string if healthy",
  "disease_name_en": "English disease name. Empty string if healthy",
  "confidence": <integer 0-100>,
  "severity": one of ["low","medium","high","critical"],
  "stage": one of ["leaf","flower","fruit","trunk"] — what the photo shows,
  "description_mr": "२–३ वाक्यांत सोप्या मराठीत: हा काय आहे, कशामुळे होतो, फळउत्पादनाला काय धोका",
  "treatment": [
    {
      "type": "chemical" or "organic",
      "medicine": "औषध/उपायाचे नाव — सोप्या मराठीत + तांत्रिक नाव",
      "dosage": "अचूक प्रमाण मराठीत (उदा. '२ ग्रॅम प्रति १ लिटर पाणी')",
      "frequency": "वेळापत्रक (उदा. '१०–१२ दिवसांच्या अंतराने ३ फवारण्या')",
      "notes": "महत्त्वाची एक सूचना (लहान)"
    }
  ],
  "prevention_mr": ["प्रतिबंधक उपाय १", "प्रतिबंधक उपाय २"],
  "rescan_after_days": <integer 5-14>
}

RULES:
- All farmer-visible text in simple Marathi (देवनागरी) a farmer understands.
- Diseased: EXACTLY ONE chemical AND at least one organic treatment (2–3 entries max). Healthy: treatment = [].
- Dosages follow Konkan extension (DBSKKV) practice — sulphur sprays for powdery mildew, imidacloprid 0.3 ml/L hoppers, carbendazim 1 g/L anthracnose.
- severity: low = early/cosmetic signs, medium = clear infection on part of the tree, high = spreading, serious yield threat, critical = severe outbreak, fruit loss imminent.
- confidence = honest visual certainty; unclear photo → confidence < 40 with closest match.
- Photo not a recognizable mango plant part → is_healthy=true, confidence <= 25, description_mr says the photo isn't a clear mango problem and asks for a closer photo.`;

  const text = await callGeminiVision(prompt, body.image_base64, body.mime_type || 'image/jpeg');
  if (!text) return json({ error: 'AI unavailable', diag: (globalThis as any).__geminiErr || 'fetch failed' }, 502);

  const parsed = safeParse(text);
  if (!parsed) return json({ error: 'Could not parse AI response', raw: text.slice(0, 800), finish: (globalThis as any).__geminiFinish }, 502);

  // Sanitize — never trust the model blindly
  const d = parsed;
  d.is_healthy = Boolean(d.is_healthy);

  const sev = String(d.severity || 'medium').toLowerCase();
  d.severity = (VALID_SEVERITIES as readonly string[]).includes(sev) ? sev : 'medium';

  const stage = String(d.stage || 'leaf').toLowerCase();
  d.stage = (VALID_STAGES as readonly string[]).includes(stage) ? stage : 'leaf';

  d.confidence = Math.max(0, Math.min(100, Math.round(Number(d.confidence) || 50)));
  const days = Math.round(Number(d.rescan_after_days) || 7);
  d.rescan_after_days = Math.max(3, Math.min(30, days));

  // Treatment: validate shape, whitelist types, cap length
  const treatments = Array.isArray(d.treatment) ? d.treatment : [];
  d.treatment = treatments
    .filter((t: any) => t && typeof t === 'object')
    .slice(0, 4)
    .map((t: any) => ({
      type: (VALID_TREATMENT_TYPES as readonly string[]).includes(String(t.type))
        ? t.type
        : 'organic',
      medicine: String(t.medicine ?? '').slice(0, 200),
      dosage: String(t.dosage ?? '').slice(0, 200),
      frequency: String(t.frequency ?? '').slice(0, 200),
      notes: String(t.notes ?? '').slice(0, 300),
    }));

  if (d.is_healthy) d.treatment = [];

  d.prevention_mr = Array.isArray(d.prevention_mr)
    ? d.prevention_mr.filter((p: any) => typeof p === 'string' && p.trim()).slice(0, 6)
    : [];

  return json(d);
}

// ------------------------------------------------------------------
// TRANSCRIBE — Marathi/Hindi/English speech → text
// ------------------------------------------------------------------
async function handleTranscribe(body: AIRequest) {
  if (!body.audio_base64) return json({ error: 'audio_base64 required' }, 400);

  const prompt = `Transcribe this audio exactly as spoken. It may be in Marathi, Hindi, English, or a mix (a farmer describing mango tree symptoms). Output ONLY the transcript text, nothing else. If the audio is silent or unclear, output exactly: {"text": ""}`;

  const res = await geminiFetch({
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: body.mime_type || 'audio/m4a', data: body.audio_base64 } },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 8192,
    },
  });

  if (!res || !res.ok) {
    console.error('Gemini transcribe error:', res ? await res.text() : 'fetch failed');
    return json({ error: 'AI unavailable' }, 502);
  }

  const data = await res.json();
  const raw = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
    .join('');
  const cleaned = raw.replace(/^```(json)?|```$/g, '').trim();
  let text = cleaned;
  try {
    const j = JSON.parse(cleaned);
    if (typeof j.text === 'string') text = j.text;
  } catch { /* plain transcript, fine */ }

  return json({ text });
}

// ------------------------------------------------------------------
// Gemini helpers (same proven machinery as ai-triage)
// ------------------------------------------------------------------
// Free tier is rate-limited (503 high-demand + per-key daily quota).
// Strategy: per-key retry with backoff; on 429 move to the next key.
async function geminiFetch(payload: unknown): Promise<Response | null> {
  const delays = [800, 2500, 5000]; // per-key patience, demo-friendly
  let lastRes: Response | null = null;

  for (let k = 0; k < GEMINI_KEYS.length; k++) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEYS[k]}`;
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) return res;
        lastRes = res;
        if (res.status === 429) {
          console.error(`Gemini key #${k + 1} quota exceeded, trying next key`);
          break; // move to next key immediately
        }
        if (res.status !== 503) return res; // other error — surface it
        if (attempt < delays.length) await new Promise((r) => setTimeout(r, delays[attempt]));
      } catch (err) {
        console.error('Gemini fetch threw:', err);
        if (attempt >= delays.length) break;
        await new Promise((r) => setTimeout(r, delays[attempt]));
      }
    }
  }
  return lastRes; // all keys exhausted — return last error response
}

async function callGeminiVision(prompt: string, base64: string, mime: string): Promise<string | null> {
  const res = await geminiFetch({
    contents: [
      {
        parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: base64 } }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 20000,
      responseMimeType: 'application/json', // JSON mode — no prose/fences to strip, faster emit
    },
  });
  if (!res || !res.ok) {
    (globalThis as any).__geminiErr = res ? `${res.status} ${(await res.text()).slice(0, 300)}` : 'fetch failed';
    console.error('Gemini vision error:', (globalThis as any).__geminiErr);
    return null;
  }
  const data = await res.json();
  const cand = data?.candidates?.[0];
  // Join ALL parts — thinking/text can be split across several
  const joined = (cand?.content?.parts ?? [])
    .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
    .join('');
  (globalThis as any).__geminiFinish = cand?.finishReason ?? 'unknown';
  return joined || null;
}

function safeParse(text: string): any | null {
  try {
    // Models sometimes wrap JSON in ```json fences despite instructions
    const cleaned = text.replace(/```json|```/g, '').trim();
    // Also grab the first {...} block if there's stray prose
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
