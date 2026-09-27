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
// ALSO supports a model-fallback chain: flash-lite first (separate quota bucket),
// then the broader flash tier — when every key's daily quota for one model is
// exhausted (429), the function automatically walks down the chain.
const GEMINI_KEYS = (Deno.env.get('GEMINI_API_KEY') ?? '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);
const GEMINI_MODELS = [
  'gemini-flash-lite-latest', // primary: fast, separate daily quota bucket
  'gemini-2.0-flash',         // fallback 1: broad flash tier
  'gemini-flash-latest',      // fallback 2: newest flash alias
];

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
    // GET .../health — AI status probe for the pre-fair dashboard (public/ai-status.html)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      if (url.pathname.replace(/\/+$/, '').endsWith('/health')) return await handleHealth(req);
      return json({ error: 'Not found. GET .../health for status; POST { mode } to diagnose/transcribe.' }, 404);
    }

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

  const { text, model } = await callGeminiVision(prompt, body.image_base64, body.mime_type || 'image/jpeg');
  if (!text) return json({ error: 'AI unavailable', diag: (globalThis as any).__geminiErr || 'fetch failed' }, 502);

  const parsed = safeParse(text);
  if (!parsed) return json({ error: 'Could not parse AI response', raw: text.slice(0, 800), finish: (globalThis as any).__geminiFinish }, 502);

  // Sanitize — never trust the model blindly
  const d = parsed;
  d._model = model; // which model in the fallback chain actually answered
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

  const hit = await geminiFetch({
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

  if (!hit || !hit.res.ok) {
    console.error('Gemini transcribe error:', hit ? await hit.res.text() : 'fetch failed');
    return json({ error: 'AI unavailable' }, 502);
  }

  const data = await hit.res.json();
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
// Gemini helpers — key × model fallback chain
// ------------------------------------------------------------------
// Free tier is rate-limited (503 high-demand + per-key daily quota) and can
// simply stall. Strategy: for every (model, key) pair — retry with backoff on
// 503; on 429 (daily quota exhausted) stop wasting attempts on that pair and
// move on. A stalled attempt is aborted after PER_ATTEMPT_MS so one slow model
// falls through to the next instead of eating the whole request; a total budget
// keeps the response well inside Supabase's 150s idle limit.
// Primary model first across all keys, then the fallback models.
const PER_ATTEMPT_MS = 22_000; // one stalled model must not eat the request
const TOTAL_BUDGET_MS = 75_000; // answer (or fail) before the 150s idle limit

async function geminiFetch(payload: unknown): Promise<{ res: Response; model: string } | null> {
  const delays = [800, 2500, 5000]; // per-pair patience, demo-friendly
  let last: { res: Response; model: string } | null = null;
  const startedAt = Date.now();

  for (const model of GEMINI_MODELS) {
    for (let k = 0; k < GEMINI_KEYS.length; k++) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEYS[k]}`;
      for (let attempt = 0; attempt <= delays.length; attempt++) {
        if (Date.now() - startedAt > TOTAL_BUDGET_MS) {
          console.error('Gemini: total budget exhausted, giving up');
          return last;
        }
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), PER_ATTEMPT_MS);
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: abort.signal,
          });
          if (res.ok) return { res, model };
          last = { res, model };
          if (res.status === 429) {
            console.error(`Gemini ${model} key #${k + 1} daily quota exceeded, moving on`);
            break; // next key (then next model)
          }
          if (res.status !== 503) return last; // other error — surface it
          if (attempt < delays.length) await new Promise((r) => setTimeout(r, delays[attempt]));
        } catch (err) {
          console.error('Gemini fetch threw:', err);
          if (attempt >= delays.length) break;
          await new Promise((r) => setTimeout(r, delays[attempt]));
        } finally {
          clearTimeout(timer);
        }
      }
    }
  }
  return last; // everything exhausted — return last error response
}

async function callGeminiVision(prompt: string, base64: string, mime: string): Promise<{ text: string | null; model: string | null }> {
  const hit = await geminiFetch({
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
  if (!hit || !hit.res.ok) {
    (globalThis as any).__geminiErr = hit ? `${hit.res.status} ${(await hit.res.text()).slice(0, 300)}` : 'fetch failed';
    console.error('Gemini vision error:', (globalThis as any).__geminiErr);
    return { text: null, model: hit?.model ?? null };
  }
  const data = await hit.res.json();
  const cand = data?.candidates?.[0];
  // Join ALL parts — thinking/text can be split across several
  const joined = (cand?.content?.parts ?? [])
    .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
    .join('');
  (globalThis as any).__geminiFinish = cand?.finishReason ?? 'unknown';
  return { text: joined || null, model: hit.model };
}

// ------------------------------------------------------------------
// HEALTH — GET .../health: is the AI actually reachable right now?
// Fires one tiny live probe through the normal fallback chain and
// reports which model answered. Powers public/ai-status.html.
// ------------------------------------------------------------------
// Rolling per-IP health-probe timestamps (see handleHealth).
const healthHits = new Map<string, number[]>();

async function handleHealth(req: Request) {
  // Simple in-memory per-IP rate limit: max 10 probes / 10 min / IP,
  // so the public health endpoint can't be used to drain Gemini quota.
  const ip =
    req?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  const now = Date.now();
  const WINDOW = 10 * 60 * 1000, LIMIT = 10;
  healthHits.set(ip, (healthHits.get(ip) ?? []).filter((t) => now - t < WINDOW));
  const hits = healthHits.get(ip) ?? [];
  if (hits.length >= LIMIT) {
    return json({ ok: false, status: 'rate_limited', gemini_ok: false, retry_after_min: 10 }, 429);
  }
  hits.push(now);
  healthHits.set(ip, hits);

  if (!GEMINI_KEYS.length) {
    return json({ ok: false, status: 'no_keys', gemini_ok: false, keys_count: 0, models: GEMINI_MODELS });
  }
  // 8x8 red pixel JPEG — tiny but a real image so vision mode runs.
  const tinyJpeg =
    '/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCABAADADASIAAhEBAxEB/8QAGwAAAgMBAQEAAAAAAAAAAAAABQYDBAcCAQj/xAAwEAABAwIFAgUBCQEAAAAAAAABAgMEBREABhIhMRNBFBUiUWEHIyUyQnFygZGhYv/EABoBAAIDAQEAAAAAAAAAAAAAAAIDAAEEBQb/xAAqEQACAQMDAQYHAAAAAAAAAAABAgADESESEzFRIkFxobHwBDJCgZHh8f/aAAwDAQACEQMRAD8AzPLuZavlGLDlSpBKX5PWbZcuHACAouhXPcbG97nFWrQW5mckOtLjLjTpQkNLYT1m9KlE7J523Gk77WwrQJMeWl1M5DryGkXQsOHWFEWSAkmxF7XsL/oMNH0rcaj5nZMpodMWKnlcRiFABz43Nv5xzmTbDOOfWVYDM7kZYqOX6oF0997w0pSmoUtuyVO6hwBc97g+1saRQ6TNpMqSzmtqFNdcZSqLJUyCHWxa6Dax1gepIt6t+e0OeHp+U5T0itPmoR1gCIpbSUbEkrSgp4JN1KIt+JJ+MMUrw2dKLRncqR2kMlzxDr0tN1NFtBCUqF7k6je/Bte+EVNbAEjPWa1Vfp+YQv4eLR5TkCNHBEhrUNSNCUmw9JPIJFtvjHVUjTvKUOU9tJlRUFbV0bmw3A+CBb+sOCIsbyunrqy0CWplDa0A3SXiOx/W4x09Q1sRG5LLxdUnUXBe/pPbHFq0tSErmxPv8QSBUS/eJ8OSGPJ8wOJiS0vKhujpvoSQCoWJ2+DcfxjR8nQagzTnc0NVCLHZfcc8Ul9rqNLZJ9Wpsci5O1xbFukU6FJgQKXGpkCp1xhtSH5SNQYZZJsAs7C9vze52ucNeUKG3SPuun1BNWgudbxEJ6JoZSTYEIfJusgkA+ncEbDHoq1S4sOYK0WORJ5EydXssrp5VRZ02Cwpxg6tTWnspC17WI4TuSLg2th3p86kUnKTGYn2kx1eE6CW+l0kslRF9KCfTcWv3tawwmIf80hNw4A1reZWhhou9NLNhdKOOTfVvuAL4rZzmVKKxR6DFjMz5BkKdkF9AUl5BHpTqWDvsfVbm3vbGdaubHmODWzeF69nWn5ly7Mg05599xkpcckD7NwKG6S2g7ncDkjbYYfspZgXJp0GU5ZLchlK1Am+9t/9vjOJSYTUaIgU9UV2LZmQ7FjK1MrPCFosNxflJ0ke3GL9OqctqmsNlTinkoJA6Vgu5Pqtzb4wrYVOSf3DCBO11kVQbmTKIUsSVnptJD4ZOsJTxc8Ep/3tjPajKqVFqbMSmuVKE04+nxDESxQ+okgOIGo+lRJTpBtYYqQn6/Vq61Epr6oai70ZDmkaUA2OpRPAtf2vb3xqOXofk8Wo1yc3JkMQGSYYdIK5TiSQVqSB6VE7J3Ngb24xpp9lrXFrSGruE9BA0Vh+NUKS1McjMPmSguRgkuOtK0KsTpOxKb7GwF++ww4SokVySl9sIEtGtlKw4FDSo7bcX7YA5ZmefVWJXIKJEdUsPuu09zSpCnANKilX7iLgjm2w5wYqlW8MhtiPEek6bIQhDY1OrtcpSL77344xmAVEa+cn+RdNgtJj1Ms1qPGacpc6VLUSJDTJWGwtQcF7bg2AHAPsefYZVZst7MbLciIhME2LMkL5SQDYpHsSe+4N8Ds0xujTHrOS6VJmNNy34TTRJbQldlO7bJI2vbbbcb3w4eV0V6jxIq5ZiSW2k6VJAU2TyFAj8p9x7m2D3EZA9r38owfEalBI8ZkU3ND2ZhHjR4MJ5TUwF2qxoy22FovcFaOQrm1uOTzi39T6jMraFwMu9VVPhgGVGYBUWRYaNah+IHt84TvpbWptFr0Zp9lw06YuyGVjSnWOCL/0ffbDblma+z9V63FgpcRBqri23iklBaRa/Uv2Kd/7wbKtN9Q4APv7RNKxpEnvx4T3J1RRMVTTRS65U4X2AUtBCV6gpIQBfdRSkqJ/5F/g7Xo0rMmT0zlQ5EadIbDzTJ2cbdQTcDg6SQoj92BmUBDk5yS/BiiBQKS6WYKVpUPEOBPTU4pXClAX/leJzMmUn6iQpVUcjusyGhT1uR3idLgtoWtHKFFNrgbHsebUCtwDjv8AWSkwKhT18uIMyNmqoTnEO1Ftc9qmNrQ8QSXiw6Cladz6h3tsRYEX4xplKp6KtSoU1icJRea6bJKAhCQi4A/3nvhWrUXLuT61D8NTnI/iVKbfdQpSk2ve9jfVpPfba3OGPLlIkwJlQqEOdHlUiQrqNMsuamkJO5Cb7kk37bbe2MtZtgtowRY8SWNLUq84n//Z';
  const t0 = Date.now();
  try {
    const { text, model } = await callGeminiVision(
      'Reply with exactly this JSON: {"is_healthy":true,"confidence":1,"stage":"leaf","severity":"low","treatment":[],"prevention_mr":[],"description_mr":"प्रोब","disease_name_mr":"","disease_name_en":"","rescan_after_days":7}',
      tinyJpeg,
      'image/jpeg'
    );
    const latency = Date.now() - t0;
    if (text) {
      return json({
        ok: true,
        status: 'ok',
        gemini_ok: true,
        probe_model: model,
        model: model,
        models: GEMINI_MODELS,
        keys_count: GEMINI_KEYS.length,
        probe_latency_ms: latency,
        version: 'v17',
      });
    }
    const diagRaw = String((globalThis as any).__geminiErr || 'probe failed');
    const isQuota = diagRaw.includes('429') || diagRaw.includes('RESOURCE_EXHAUSTED');
    return json({
      ok: true,
      status: isQuota ? 'quota' : 'probe_error',
      gemini_ok: false,
      quota_exhausted: isQuota,
      diag: diagRaw.slice(0, 200),
      models: GEMINI_MODELS,
      keys_count: GEMINI_KEYS.length,
      version: 'v17',
    });
  } catch (err) {
    return json({ ok: false, status: 'error', gemini_ok: false, diag: String(err).slice(0, 200), models: GEMINI_MODELS, version: 'v17' });
  }
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
