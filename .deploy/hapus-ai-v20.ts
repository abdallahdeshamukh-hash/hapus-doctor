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
// Aliases first — pinned versions get retired out from under us. Discovered in
// the field on 2026-09-27: gemini-2.0-flash began answering 404 "This model is
// no longer available", which silently ate a whole candidate on every scan.
// v20, discovered in the field on 2026-09-28: on Sunday-evening demand spikes
// BOTH -latest aliases answer 503 "high demand" for a full two-round hedge,
// while the pinned generations behind them stay calm. The aliases stay first
// (fastest day-to-day), but pinned backups now sit at the end of the chain.
const GEMINI_MODELS = [
  'gemini-flash-lite-latest',  // primary: fastest, and its own daily quota bucket
  'gemini-flash-latest',       // fallback: newest flash alias (503s when busy)
  'gemini-2.5-flash-lite',     // pinned backup: separate quota bucket, calm under alias contention
  'gemini-2.5-flash',          // pinned backup: last resort for 503 storms
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
  mode: 'diagnose' | 'transcribe' | 'models';
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
      case 'models':     return await handleModels();
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
  if (!text) return json({ error: 'AI unavailable', retryable: true, diag: (globalThis as any).__geminiErr || 'fetch failed' }, 503);

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
// Gemini helpers — HEDGED candidate chain (model × key)
// ------------------------------------------------------------------
// The free tier is rate-limited (503 high-demand + per-key daily quota) and a
// cold request can simply hang: the logs showed a first attempt sitting for
// 22s+ that the SAME payload answers in ~5s once retried. Walking candidates
// one at a time behind a short timeout therefore throws away real work and
// stalls the farmer. Instead every candidate is launched on a small stagger —
// primary first — and the first good answer wins; the losers are aborted.
// Worst case stays well inside Supabase's 150s idle limit.
const HEDGE_STAGGER_MS = 4_000; // candidate n starts at n × this
const PER_ATTEMPT_MS = 36_000; // hard cap on any single candidate
const TOTAL_BUDGET_MS = 100_000; // never keep the farmer waiting past this
const HEDGE_ROUNDS = 3; // two whole extra passes when a round comes back empty
// After a fully-empty round, wait before the next one: immediate retries hit
// the same 503 storm, and the backoff is what makes the extra rounds count.
const ROUND_BACKOFF_MS = 8_000;
// Models Google retired (404) during this isolate's life — learned at runtime so
// a dead alias never costs another candidate.
const DEAD_MODELS = new Set<string>();

async function geminiFetch(payload: unknown): Promise<{ res: Response; model: string } | null> {
  const candidates: { model: string; key: string }[] = [];
  for (const model of GEMINI_MODELS) for (const key of GEMINI_KEYS) candidates.push({ model, key });

  const startedAt = Date.now();
  const controllers: AbortController[] = [];
  let lastErr: string | null = null;
  let last: { res: Response; model: string } | null = null;

  const attempt = async (c: { model: string; key: string }) => {
    const abort = new AbortController();
    controllers.push(abort);
    const left = TOTAL_BUDGET_MS - (Date.now() - startedAt);
    if (left <= 3_000) throw new Error('Gemini: out of total budget, not launching another candidate');
    const timer = setTimeout(() => abort.abort(), Math.max(2_000, Math.min(PER_ATTEMPT_MS, left)));
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${c.model}:generateContent?key=${c.key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: abort.signal,
        },
      );
      // Read the body before returning: the loser attempts are abort()ed, and
      // an unconsumed body would die with them.
      const text = await res.text();
      if (!res.ok) {
        if (res.status === 404) DEAD_MODELS.add(c.model); // retired upstream
        lastErr = `${c.model} HTTP ${res.status}: ${text.slice(0, 200)}`;
        last = { res: new Response(text, { status: res.status, headers: res.headers }), model: c.model };
        console.error('Gemini error:', lastErr);
        throw new Error(lastErr);
      }
      return { res: new Response(text, { status: res.status, headers: res.headers }), model: c.model };
    } catch (err) {
      lastErr = lastErr ?? String(err).slice(0, 200);
      console.error(`Gemini ${c.model} candidate failed:`, err);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    for (let round = 1; round <= HEDGE_ROUNDS; round++) {
      const live = candidates.filter((c) => !DEAD_MODELS.has(c.model));
      if (!live.length) break;
      if (round > 1) {
        console.error(`Gemini: round ${round - 1} came back empty, retrying after backoff — ${lastErr}`);
        await new Promise((r) => setTimeout(r, Math.min(ROUND_BACKOFF_MS, Math.max(0, TOTAL_BUDGET_MS - (Date.now() - startedAt)))));
      }
      const hedged = live.map((c, i) =>
        (i === 0 ? Promise.resolve() : new Promise((r) => setTimeout(r, i * HEDGE_STAGGER_MS))).then(() => attempt(c)),
      );
      try {
        return await Promise.any(hedged); // first OK answer wins
      } catch {
        // every candidate in this round failed — a fresh round often answers
      }
    }
    console.error('Gemini: every candidate failed after retry —', lastErr);
    return last; // surface the last real error response, if any
  } finally {
    for (const abort of controllers) abort.abort(); // stop the losers
  }
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
// MODELS — POST { mode: 'models' }: which Gemini models does the key still
// have? Aliases get retired (gemini-2.0-flash died under us), and a 404 costs
// real seconds on a scan, so this makes the live set inspectable on demand.
// ------------------------------------------------------------------
async function handleModels() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEYS[0]}`, {
      signal: AbortSignal.timeout(20_000),
    });
    const data = await res.json().catch(() => null);
    const live = ((data?.models ?? []) as any[])
      .filter((m) => (m?.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m) => String(m?.name ?? '').replace(/^models\//, ''))
      .filter(Boolean);
    return json({
      ok: res.ok && live.length > 0,
      chain: GEMINI_MODELS,
      chain_dead: [...DEAD_MODELS],
      live,
      live_count: live.length,
      version: 'v20',
    });
  } catch (err) {
    return json({ ok: false, error: String(err).slice(0, 200), chain: GEMINI_MODELS, version: 'v20' }, 502);
  }
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
    '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';
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
        version: 'v20',
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
      version: 'v20',
    });
  } catch (err) {
    return json({ ok: false, status: 'error', gemini_ok: false, diag: String(err).slice(0, 200), models: GEMINI_MODELS, version: 'v20' });
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
