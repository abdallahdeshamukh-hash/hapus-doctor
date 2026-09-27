# हपुस डॉक्टर (Hapus Doctor) 🥭

**The doctor in the farmer's pocket.** An AI plant doctor for Alphonso (Hapus) mangoes — built for Konkan farmers, in Marathi.

Farmers photograph a mango leaf/flower/fruit and optionally **describe symptoms by voice in Marathi**. AI diagnoses the disease, scores severity, and returns a treatment plan — chemical AND organic options with exact dosages — which the phone **reads aloud in Marathi**.

## Verified accuracy

Tested against 8 Wikimedia Commons photos with caption-verified ground truth
(2026-09-26, deployed function v13, `gemini-flash-lite-latest`):

| | |
|---|---|
| **Disease identification** | **8 / 8 correct** — powdery mildew ×3, anthracnose ×2, fruit fly, healthy leaf, healthy fruit |
| **Confidence** | 90–95% on all passes |
| **Latency** | 2.0s – 14.3s, **median ~5s** |
| **Honesty branch** | Non-mango photos → low-confidence "send a closer photo" reply, never a false diagnosis |

Full evidence table with per-photo model output: [RESULTS.md](./RESULTS.md) ·
raw JSON: `demo-photos/results/raw-results.json` · reproduce: `node scripts/accuracy-run.js`.

**Honest latency note:** the diagnosis is *not* instant. Median wait is about 5 seconds
with occasional spikes to ~15s. The scan screen is built for that: a spinner, rotating
Marathi status tips ("पानांचे निरीक्षण सुरू…", "रोग सूची तपासत आहे…", "उपाय तयार करत आहे…")
and a running elapsed-seconds counter, so the wait never looks frozen.

## Features

| | |
|---|---|
| 📸 **Photo diagnosis** | Leaf/flower/fruit/trunk photo → disease + confidence + severity in ~5s (median) |
| 🎙️ **Voice symptoms** | Describe by voice in Marathi/Hindi/English — no typing needed |
| 🔊 **Read-aloud treatment** | The phone speaks the full treatment plan in Marathi (expo-speech) |
| 🌿 **Chemical + organic** | Both options with exact dosage and spray schedule (DBSKKV-style recommendations) |
| ⏳ **Honest progress UX** | Rotating Marathi tips + elapsed timer while the AI thinks — never a frozen screen |
| 📴 **Offline resilience** | Last successful diagnosis is cached on-device; if the network dies the result still opens from cache, clearly flagged "ऑफलाइन" |
| 🗂️ **History that's never empty** | New accounts get 3 clearly-marked sample scans ("नमुना तपासणी") — visually distinct amber cards, never confused with real data |
| 📚 **रोग मार्गदर्शन** | 9-disease Marathi encyclopedia: symptoms, cause, season, treatment, prevention |
| 🔐 **Private by design** | Row Level Security — farmers see only their own scans; AI keys stay server-side |

## Tech stack

- **Frontend:** React Native (Expo SDK 54, expo-router), TypeScript, Marathi-first UI
- **Backend:** Supabase — Postgres + Auth + Storage + Edge Functions (same project as CampusFix, isolated tables/buckets)
- **AI:** Google Gemini (`gemini-flash-lite-latest`, free tier) via a single edge function (`supabase/functions/hapus-ai`)
  - vision diagnosis + audio transcription, JSON output mode, retry-with-backoff, **2-key failover**
  - strict server-side output validation: severity/stage whitelists, confidence clamping, treatment shape enforcement
- **Resilience:** `lib/offline.ts` — AsyncStorage cache of the last diagnosis + fail-soft seeding of sample scans (marked only by a `voice_text` prefix — no schema change)
- **Security:** Postgres RLS on `scans`, owner-scoped storage policies, no secrets in the app bundle

## Project layout

```
app/
  (auth)/               # login/register (role: farmer)
  (farmer)/             # tabs: home, history, guide (encyclopedia), profile
  scan.tsx              # photo + voice + notes → AI diagnosis (progress tips + timer)
  result/[id].tsx       # diagnosis card, treatments, 🔊 Marathi read-aloud, offline fallback
  disease/[id].tsx      # encyclopedia detail
lib/
  supabase.ts           # typed client, Scan types, severity/stage configs
  hapus.ts              # fail-soft AI client (diagnose / transcribe)
  offline.ts            # last-diagnosis cache + seeded sample scans (demo resilience)
  auth.tsx              # auth context (fires sample seeding on first login)
  diseases.ts           # static Marathi encyclopedia data
  theme.ts              # mango-green + alphonso-gold theme
hooks/
  useVoiceRecorder.ts   # cross-platform recording (expo-audio + web)
demo-kit/               # §5 fair materials: poster.html, handout.html (print-ready)
demo-photos/            # 8 labeled test photos + raw AI evidence (RESULTS.md)
scripts/accuracy-run.js # reproduces the 8/8 accuracy run
supabase/
  hapus-migrations/     # scans table + RLS + storage (run in SQL Editor)
  functions/hapus-ai/   # Gemini proxy edge function (deploy to Supabase)
```

## Setup

> The Supabase project already hosts CampusFix with the `GEMINI_API_KEY` secret set — Hapus Doctor shares it; nothing collides.

```bash
npm install
npx expo start
```

1. **Database:** run `supabase/hapus-migrations/20260925220000_create_scans.sql` in the Supabase SQL Editor (adds `scans`, `farmer` role, `hapus-scans` bucket — safe alongside CampusFix).
2. **Edge function:** Dashboard → Edge Functions → create `hapus-ai` → paste `supabase/functions/hapus-ai/index.ts` → Deploy. Reuses the project's existing `GEMINI_API_KEY` secret (comma-separate multiple keys for failover).
3. **App:** register an account in the app — role is `farmer` automatically.

**Presenting this at a fair?** See [HAPUS_DEMO_KIT.md](./HAPUS_DEMO_KIT.md) — pitch script, demo choreography, judge Q&A — and the print-ready [demo-kit/](./demo-kit/) poster + handout.

**Disclaimer:** AI output is advisory guidance, not a prescription. Always follow pesticide labels and confirm with local agriculture officers.
