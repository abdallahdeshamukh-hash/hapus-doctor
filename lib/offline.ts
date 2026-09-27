import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, Scan } from './supabase';

// ------------------------------------------------------------------
// Demo-day resilience (§4)
//
// 1. Last successful diagnosis is cached locally; the result screen
//    falls back to it when the scan fetch fails (venue Wi-Fi dead).
// 2. On first login, 3 sample scans are seeded into history so the
//    history tab is never empty on stage.
//
// Sample rows carry the marker sentence "नमुना तपासणी" in voice_text —
// that marker is the ONLY way samples are identified (no schema change):
// isSampleScan() reads it, screens render a distinct badge from it.
// The cache path never stores sample rows and never masks a live fetch.
// ------------------------------------------------------------------

const LAST_SCAN_KEY = 'hapus.lastScan.v1';
const SEED_KEY_PREFIX = 'hapus.seededScans.v1.';

// Concurrency guard: StrictMode double-mounts effects and a reload during
// the insert could re-enter. Only one seed may ever run at a time per session.
let seedInFlight: Promise<void> | null = null;

export const SAMPLE_MARKER = 'नमुना तपासणी';

/** True when a scan row is one of the seeded sample rows. */
export function isSampleScan(scan: Pick<Scan, 'voice_text'>): boolean {
  return !!scan.voice_text?.startsWith(SAMPLE_MARKER);
}

/** Persist the last successful diagnosis (fail-soft; storage is best-effort). */
export async function cacheLastScan(scan: Scan): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SCAN_KEY, JSON.stringify(scan));
  } catch (err) {
    console.warn('cacheLastScan failed (non-fatal):', err);
  }
}

/** The last successful diagnosis, or null when nothing is cached. */
export async function getCachedLastScan(): Promise<Scan | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_SCAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Scan;
    return parsed && parsed.id ? parsed : null;
  } catch (err) {
    console.warn('getCachedLastScan failed (non-fatal):', err);
    return null;
  }
}

/**
 * Seed 3 clearly-marked sample scans on a farmer's first login, so the
 * history tab is never empty on demo day. Runs at most once per user;
 * never seeds when the farmer already has real scans.
 */
export async function seedSampleScansOnce(userId: string): Promise<void> {
  if (seedInFlight) return seedInFlight;
  seedInFlight = (async () => {
    try {
      const key = SEED_KEY_PREFIX + userId;
      if (await AsyncStorage.getItem(key)) return;

    // Never pollute a farmer who already has real scans.
    const { data: existing } = await supabase
      .from('scans')
      .select('id')
      .eq('farmer_id', userId)
      .limit(1);
    if (existing && existing.length > 0) {
      await AsyncStorage.setItem(key, 'done');
      return;
    }

    const ago = (hours: number) =>
      new Date(Date.now() - hours * 3_600_000).toISOString();

    const note = (detail: string) =>
      `${SAMPLE_MARKER} — ही उदाहरण तपासणी आहे. ${detail}`;

    const { error } = await supabase.from('scans').insert([
      {
        farmer_id: userId,
        image_url: null,
        image_path: null,
        voice_text: note('तुमचा झाड निरोगी दिसतोय!'),
        is_healthy: true,
        disease_name_mr: null,
        disease_name_en: null,
        confidence: 95,
        severity: 'low',
        stage: 'leaf',
        description_mr:
          'नमुना: निरोगी हपुस पाने — हिरवीट, मजबूत व चमकदार. कोणताही रोग दिसत नाही.',
        treatment: [],
        prevention_mr: ['आठवड्यातून एकदा झाडाची पाने खालून तपासा'],
        created_at: ago(2),
      },
      {
        farmer_id: userId,
        image_url: null,
        image_path: null,
        voice_text: note('फुलांवर पांढरी भुरी दिसतेय.'),
        is_healthy: false,
        disease_name_mr: 'भुरी',
        disease_name_en: 'Powdery Mildew',
        confidence: 92,
        severity: 'medium',
        stage: 'flower',
        description_mr:
          'नमुना: फुलांवर पांढरी पावडरसारखी भुरी आली आहे. हा बुरशीजन्य रोग फुले व फळे गळण्यास कारणीभूत ठरतो.',
        treatment: [
          {
            type: 'chemical',
            medicine: 'सल्फर पावडर ८०% (सल्फेक्स)',
            dosage: '२ ग्रॅम प्रति १ लिटर पाणी',
            frequency: '८–१० दिवसांच्या अंतराने २–३ फवारण्या',
            notes: 'दुपारी फवारणी करा; तीव्र उन्हाळ्यात टाळा',
          },
          {
            type: 'organic',
            medicine: 'अळी-बुरशी रोधक अर्क (गोमूत्र + निंबोळी)',
            dosage: '३ लिटर प्रति १० लिटर पाणी',
            frequency: 'आठवड्यातून एकदा',
            notes: 'सकाळी फुलांवर फवारा',
          },
        ],
        prevention_mr: ['जास्त दाटीवाटी टाळा', 'संक्रमित गळालेली फुले जमिनीतून काढून नष्ट करा'],
        created_at: ago(26),
      },
      {
        farmer_id: userId,
        image_url: null,
        image_path: null,
        voice_text: note('पानांवर काळे ठिपके दिसत आहेत.'),
        is_healthy: false,
        disease_name_mr: 'काळा डाग',
        disease_name_en: 'Anthracnose',
        confidence: 90,
        severity: 'high',
        stage: 'leaf',
        description_mr:
          'नमुना: पानांवर गडद तपकिरी-काळे अनियमित ठिपके आहेत. दमट हवामानात हा रोग वेगाने पसरतो व फळांवरही येतो.',
        treatment: [
          {
            type: 'chemical',
            medicine: 'कार्बेन्डाझिम ५०% डब्ल्यूपी (बाविस्टीन)',
            dosage: '१ ग्रॅम प्रति १ लिटर पाणी',
            frequency: '१०–१२ दिवसांच्या अंतराने ३ फवारण्या',
            notes: 'वरच्या व खालच्या दोन्ही पानांवर फवारणी करा',
          },
          {
            type: 'organic',
            medicine: 'बोर्डो मिश्रण',
            dosage: '१% द्रावण (२:२:५०)',
            frequency: 'पावसाळ्यापूर्वी व नंतर १५ दिवसांनी',
            notes: 'पाऊस पडल्यानंतर पुन्हा फवारणी करा',
          },
        ],
        prevention_mr: ['पाने कोरडी ठेवा, आधी फवारणी करा', 'संक्रमित पाने तोडून नष्ट करा'],
        created_at: ago(72),
      },
    ]);

    if (error) {
      console.warn('seedSampleScansOnce insert failed (non-fatal):', error.message);
      return;
    }
    await AsyncStorage.setItem(key, 'done');
    } catch (err) {
      console.warn('seedSampleScansOnce failed (non-fatal):', err);
    } finally {
      seedInFlight = null;
    }
  })();
  return seedInFlight;
}
