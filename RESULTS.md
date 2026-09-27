# Hapus Doctor — Accuracy Results

**Test date:** 2026-09-26 · **Function:** latest deployed hapus-ai (JSON mode) · **Model:** gemini-flash-lite-latest · **Photos:** Wikimedia Commons, labeled from source captions

## One-glance evidence table

| # | Photo | Expected | AI diagnosis | Confidence | Stage | Treat. | Latency | Verdict |
|---|-------|----------|--------------|-----------:|-------|-------:|--------:|:-------:|
| 1 | 01-powdery-mildew-flowers.jpg | Powdery Mildew | Powdery Mildew (95%) | 95% | flower | 2 | 14.3s | ✅ PASS |
| 2 | 02-powdery-mildew-leaf-blight.jpg | Powdery Mildew | Powdery Mildew (95%) | 95% | leaf | 2 | 5s | ✅ PASS |
| 3 | 03-powdery-mildew-leaf-curling.jpg | Powdery Mildew | Powdery Mildew (92%) | 92% | leaf | 2 | 5s | ✅ PASS |
| 4 | 04-anthracnose-leaf-1.jpg | Anthracnose | Anthracnose (95%) | 95% | flower (expected leaf) | 2 | 5.1s | ✅ PASS |
| 5 | 05-anthracnose-leaf-2.jpg | Anthracnose | Anthracnose (95%) | 95% | fruit (expected leaf) | 2 | 9.4s | ✅ PASS |
| 6 | 06-fruit-fly.jpg | Fruit Fly | Fruit Fly (Bactrocera dorsalis) (90%) | 90% | fruit | 2 | 4.2s | ✅ PASS |
| 7 | 07-healthy-leaf.jpg | Healthy | Healthy (95%) | 95% | leaf | 0 | 3.4s | ✅ PASS |
| 8 | 08-healthy-fruit-alphonso.jpg | Healthy | Healthy (95%) | 95% | fruit | 0 | 2s | ✅ PASS |

**Score: 8/8 correct.**
Latency (success path): min 2s · median 5s · max 14.3s.
Stage detection (leaf/flower/fruit) correct on 6/8 photos.

## How to read this
- "Expected" comes from the Wikimedia Commons photo caption (ground truth).
- PASS = AI returned the same disease (or Healthy) as the photo's label.
- Every row is backed by raw evidence JSON in `demo-photos/results/raw-results.json`
  (full model output, timestamps, retry counts).

## Untestable on Wikimedia Commons (no usable color photo)
These diseases exist in the prompt but couldn't be verified with a real photo:
Mango Hopper, Sooty Mould, Die-back, Gummosis, Floral Malformation.
The 1920s B/W scans on Commons aren't representative of farmer photos; they were excluded
deliberately. Demo-day claim to judges: "8 of 8 Commons-labeled photos verified
correct; 5 rare diseases are in the model's list but lacked testable photos."

## Test photos for the live demo
The four demo photos (one per stage) are in `demo-photos/`:
- **Flower:** 01-powdery-mildew-flowers.jpg — powdery mildew on panicle ✅ verified
- **Leaf:** 02-powdery-mildew-leaf-blight.jpg — severe leaf blight ✅ verified
- **Fruit (diseased):** 06-fruit-fly.jpg — fruit fly damage ✅ verified
- **Fruit (healthy):** 08-healthy-fruit-alphonso.jpg — Alphonso fruit ✅ verified

## Reproduce
```bash
node scripts/accuracy-run.js
```
