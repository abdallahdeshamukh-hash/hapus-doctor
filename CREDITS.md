# Credits & image provenance

## Demo / sample photos

`demo-photos/*.jpg` are third-party photographs from **Wikimedia Commons**, used as the
caption-verified accuracy test set (see `RESULTS.md`, 8/8) and, in three cases, bundled
into the app as the images for the seeded sample inspections.

| Bundled file | Source photo | Used for |
| --- | --- | --- |
| `assets/images/sample-healthy-leaf.jpg` | `demo-photos/07-healthy-leaf.jpg` | sample scan — healthy |
| `assets/images/sample-powdery-mildew.jpg` | `demo-photos/01-powdery-mildew-flowers.jpg` | sample scan — powdery mildew |
| `assets/images/sample-anthracnose.jpg` | `demo-photos/04-anthracnose-leaf-1.jpg` | sample scan — anthracnose |

Sample results display an on-screen credit (`नमुना फोटो: Wikimedia Commons`), and bundled
sample photos are gated behind the `नमुना तपासणी` marker in `lib/offline.ts` so a real
farmer's scan can never render one of these photos.

> **Action item (before public promotion):** the per-file Commons licence and author were
> **not recorded** when the test set was assembled, and no attribution metadata survives in
> the JPEGs. Wikimedia Commons files are usually CC BY / CC BY-SA / CC0 — the first two
> require author attribution. Re-locate each source file and record author + licence here,
> or replace these three images with photographs taken for this project. This is a
> documentation gap, not a functional one; the app itself is unaffected.

## Original artwork

Everything else visual in this app is original work created for this project, so it carries
no licensing constraint:

- `components/Brand.tsx` — the mango-leaf mark and logo lockup (vector paths).
- `lib/theme.ts` — colour ramp, type scale, elevation tiers and surface tokens.
- Hero panels, gradient scrims and leaf watermarks are drawn with `expo-linear-gradient`
  and the SVG mark above.

## Third-party software

Icons: [Lucide](https://lucide.dev) (ISC). Fonts: Inter via `@expo-google-fonts` (OFL).
Runtime: Expo / React Native (MIT). AI inference: Google Gemini via a Supabase Edge Function.
