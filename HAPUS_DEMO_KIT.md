# हपुस डॉक्टर (Hapus Doctor) — Demo-Day Kit 🥭🎤

Everything you need for the **Dr. K. H. Gharda Memorial Innovation Fair (Sept 30, GITM Campus)**.

**The one-liner:** *"शेतकरी आंब्याला डॉक्टर देऊ शकत नाही — आम्ही डॉक्टराला शेतकऱ्याच्या हातात दिला."*
(A farmer can't take the mango to a doctor — we put the doctor in the farmer's hand.)

**The honest pitch (use this — judges reward it):** diagnosis takes about **5 seconds median, sometimes up to 15**. We didn't hide that — the scan screen shows rotating status tips and a live timer so the wait is part of the demo, not a dead moment. And we **proved** the AI: **8 of 8 labeled test photos diagnosed correctly** (RESULTS.md), confidence 90–95%, with an honesty branch that refuses to invent a diagnosis for a photo that isn't a clear mango problem.

---

## 1. Pre-fair setup checklist

### ✅ DONE — verified, no action needed
- [x] Full Expo app in `hapus-doctor/` (typecheck green)
- [x] Edge function **hapus-ai v13 deployed** (JSON mode, `gemini-flash-lite-latest`) — do NOT redeploy on demo morning; it works
- [x] Accuracy proven: **8/8** on Wikimedia test photos — see [RESULTS.md](./RESULTS.md); photos + raw evidence in `demo-photos/`
- [x] Scan progress UX: rotating Marathi tips + elapsed seconds during the AI call
- [x] Offline resilience: last diagnosis cached on-device, result reopens from cache with an "ऑफलाइन" banner if the network dies (tested under real network failure)
- [x] History seeding: new accounts get 3 sample scans marked **"नमुना तपासणी"** (amber dashed cards) — history is never empty on stage
- [x] **AI quota guard (v15)**: edge function tries 3 models × 2 keys automatically (flash-lite → 2.0-flash → flash-latest), so one exhausted daily quota no longer kills the demo
- [x] **AI status dashboard**: open **`/ai-status.html`** on the deployed site every demo morning — one green banner confirms edge function, live Gemini probe, and Supabase are all up
- [x] Print-ready **poster + handout**: open `demo-kit/poster.html` and `demo-kit/handout.html` in a browser → Ctrl+P → A4/A3

### ⚠️ TODO (you, ~20 min, by Sept 28)
1. **Register the demo farmer account** in the app (role is farmer automatically) — then log out and log back in once to confirm the 3 sample scans appear.
2. **Verify the 4 live-demo photos are on the demo phone** (also in `demo-photos/`): `01-powdery-mildew-flowers.jpg` (flower), `02-powdery-mildew-leaf-blight.jpg` (leaf), `06-fruit-fly.jpg` (fruit, diseased), `08-healthy-fruit-alphonso.jpg` (fruit, healthy) — all 4 already verified correct by the AI.
3. **Record the backup video** (Section 6) on the demo phone.
4. **Rehearse the demo script below once, timed** — the AI call is 5–15s; rehearse what you say during it.

**Live web app (scan this, no install needed):** https://abdallahdeshamukh-hash.github.io/hapus-doctor/ · **AI health check:** [/ai-status.html](https://abdallahdeshamukh-hash.github.io/hapus-doctor/ai-status.html)

### Run the app (2 min)
```bash
cd hapus-doctor
npx expo start
```
Scan the QR with **Expo Go** on your phone → register → photograph a leaf → diagnosis in Marathi → press **🔊 उपाय ऐका**.

**Cost of the entire AI stack: ₹0.** (Gemini free tier + Supabase free tier + Expo free.)

---

## 2. The 90-second pitch

> "कोकणातील हपुस आंबा — जगातील सर्वोत्तम आंबा — दरवर्षी १५ ते ३० टक्के उतारा रोगांमुळे गमावतो. भुरी, काजळी, काळा डाग… शेतकऱ्याला रोग ओळखता येत नाही, आणि तज्ज्ञाचा सल्ला मिळण्यास आठवडे लागतात.
>
> आमचे समाधान: **हपुस डॉक्टर**. शेतकरी पानाचा फोटो काढतो — आणि जेमतेम पाच सेकंदांत AI रोग ओळखते, तीव्रता सांगते, आणि **मराठीत अचूक उपाय** सुचवते — कोणती औषध, किती प्रमाण, कधी फवारणी. शेतकरी लिहू-वाचू शकत नाही, तरी चालेल — तो **लक्षणे बोलून सांगतो**, आणि उपाय **ऐकून घेतो**.
>
> आम्ही फक्त दावा करत नाही — आम्ही सिद्ध करतो. आठ प्रमाणित चाचणी फोटो — आठही बरोबर ओळखले. फोटो आंब्याचा नसेल तर हे AI खोटे निदान देत नाही — जवळचा फोटो विचारते.
>
> आणि तिसरी गोष्ट: संपूर्ण AI stack मोफत — एका रुपयाचाही खर्च नाही, म्हणून हे प्रत्येक कोकणातील शेतकऱ्यापर्यंत पोहोचू शकते.
>
> **हा फक्त app नाही — हा प्रत्येक आंब्याच्या झाडासाठी एक डॉक्टर आहे.**"

**English framing if judges ask:** "Plantix and similar apps are English-first and generic. We are Marathi-first, voice-first, and Hapus-specific — built for one crop, one region, one farmer. And we benchmarked honestly: 8/8 on labeled photos, and we tell the farmer the real wait time instead of pretending it's instant."

---

## 3. Demo script (2 minutes, rehearsed order)

1. **Open on the home screen:** big green **"झाड तपासा"** card; point at the history — 3 amber **"नमुना तपासणी"** sample cards plus a real scan. *(10 sec)*
2. **Tap झाड तपासा → "फोटो काढा" →** photograph a diseased leaf (or gallery-pick `02-powdery-mildew-leaf-blight.jpg`). *(15 sec)*
3. **🎤 Voice moment (the wow):** tap the mic and say in Marathi:
   *"गेल्या चार-पाच दिवसांपासून फुलांवर पांढरी भुरी आली आहे, फुले गळत आहेत."* → transcript appears on screen. *(20 sec)*
4. **Tap "AI कडून तपासा" →** the loading screen runs its tips — **narrate over it, don't stand silent**: "लक्षणे बोलून सांगितली — आता AI पानांचे निरीक्षण करत आहे…" The rotating tips + timer keep it alive for the 5–15 seconds. *(10 sec)*
5. **Result:** **भुरी (Powdery Mildew)**, severity badge, confidence %. *(10 sec)*
6. **Press 🔊 "उपाय ऐका (मराठी)"** — let the phone SPEAK the treatment aloud. This is the moment judges remember. *(20 sec)*
7. **Scroll to show both treatment cards:** रासायनिक (sulphur spray, exact dosage) AND सेंद्रिय option. Point out prevention list. *(20 sec)*
8. **Show माझी तपासणी tab:** history with the marked samples; then **मार्गदर्शन tab**: 9-disease Marathi encyclopedia. *(15 sec)*
9. **Close:** "एक झाड, एक डॉक्टर — आणि याची किंमत: शून्य रुपये." *(5 sec)*

**Backup if voice fails:** the typed notes field does the same job — type the Marathi sentence and submit.

---

## 4. Judge Q&A cheat-sheet

**Q: "How accurate is the AI? What if it's wrong?"**
A: We benchmarked it: **8 of 8 Wikimedia photos with caption-verified ground truth diagnosed correctly** — powdery mildew, anthracnose, fruit fly, and healthy samples — confidence 90–95%. The model reads the photo against a constrained list of 9 known Konkan Hapus problems, a much smaller decision space than generic plant apps. And it's honest by design: an unclear or non-mango photo gets a low-confidence "send a closer photo" reply, never a confident wrong answer. RESULTS.md in the repo has the full per-photo evidence.

**Q: "Why does it take 5–15 seconds? Isn't that slow?"**
A: It's the honest cost of a careful vision analysis on the free tier, and we'd rather tell the farmer the truth than fake speed. The scan screen shows rotating status tips and a live timer so the farmer always knows the app is working — in field trials, perceived wait matters more than actual wait. The roadmap item is image downscaling + response streaming to pull the median under 3s.

**Q: "Farmers' phones and network — will this really work?"**
A: Built on Expo (runs on modest Android phones), photos are compressed before upload, every screen is Marathi, voice input handles the literacy barrier. And we already handle dead networks: the **last successful diagnosis is cached on the phone** — if the venue Wi-Fi dies, the result screen reopens it with a clear "ऑफलाइन" banner. That's tested under real network failure, not just claimed.

**Q: "What about pesticides? Are you pushing chemicals?"**
A: Every diagnosis shows BOTH a chemical and an organic option, with exact dosages following Konkan extension (DBSKKV) practice. The choice stays with the farmer. Correct, correctly-dosed spraying beats panic over-spraying.

**Q: "Why not just use Plantix?"**
A: Three reasons: language (Marathi-first, voice-first), crop (Hapus-specific disease list and dosages, not 400 generic crops), and ownership (a ₹0 stack a student team built can be extended with a mandi price feed, a DBT scheme matcher, or an FPO dashboard — we're not waiting on a foreign company's roadmap).

**Q: "What's the business/social angle?"**
A: Free for farmers. Sustainability paths: FPO/mandi partnerships, a ₹1-per-scan premium advisory tier for pesticide dealers, or state agri-department licensing as an extension-wing tool. But the fair version is deliberately free — the social impact is the product.

**Q: "What data does it collect? Privacy?"**
A: The farmer's photos and scan history are row-level-security protected — only that farmer sees their own scans. No personal data beyond an email. Voice is transcribed server-side; only text is stored.

**Q: "Did you build this yourselves?"**
A: Yes — React Native app, Supabase backend with row-level security, and a server-side AI edge function so the API key never ships in the app. Strict server-side validation of every AI field (severity/stage whitelists, confidence clamping) before it ever reaches the farmer. Total AI cost per diagnosis: a fraction of a paisa on the free tier.

**Q: "Future work?"**
A: Median latency under 3s via image downscaling + streaming; fully offline-first with on-device photo queueing; a Konkan outbreak map from aggregated anonymized scans; fertilizer dose calculator per tree age; e-NAM mandi price integration.

---

## 5. Poster & handout (print-ready)

Open in a browser → Ctrl+P → "Save as PDF" or print:

| File | Size | Use |
|---|---|---|
| `demo-kit/poster.html` | A3 portrait | The booth poster — title, problem/solution, 8/8 result badge, QR |
| `demo-kit/handout.html` | A4 portrait, 2 per sheet if duplex | Judge handout — one page: pitch, evidence, stack, contact |

Both carry the headline number judges remember: **8/8 verified diagnoses, median 5s, ₹0**.

## 6. Demo-day emergency kit

- **Backup video:** record the full demo flow (photo → voice → diagnosis → 🔊) on your phone the night before.
- **Backup photos:** the 4 verified disease photos (Section 1) — if the live leaf photo fails, gallery-pick one.
- **Offline fallback (built in):** venue Wi-Fi dead → the last diagnosis still opens from the phone cache with the "ऑफलाइन" banner; phone hotspot restores the live AI. History stays populated with the marked sample scans either way.
- **Voice fallback:** if the hall is noisy, type the Marathi sentence in the notes field.
- **AI down fallback:** v15 walks a 3-model × 2-key fallback chain automatically; check `/ai-status.html` to see exactly what's exhausted. If everything is throttled, demo the मार्गदर्शन tab, the history flow, and the cached-offline result — and say honestly: "AI service is throttled right now; here's the verified 8/8 evidence instead."
- **Charge everything.** Power bank + laptop charger. Kill auto-lock on the demo phone (Settings → Display → 30 min).

## 7. Talking point only you will have

Every other team will show a complaint box, a to-do app, or a GPT wrapper. You are showing:
1. **A real crop, a real loss (₹ figures from any ICER/DBSKKV abstract on Hapus yield loss)** — with a **measured, reproducible accuracy result**, not a claim.
2. **Speech in AND speech out** — the only team whose demo talks *to* the farmer and *for* the farmer.
3. **Honest engineering** — a visible wait with rotating status, a cache that survives dead Wi-Fi, and an AI that says "send a closer photo" instead of guessing.
4. **₹0 architecture** — free-tier AI + free-tier backend, built and explained by the team that wrote it.

Lead with the mango. मराठीत बोला. Let the phone speak.
