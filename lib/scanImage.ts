import type { ImageSourcePropType } from 'react-native';
import type { Scan } from './supabase';
import { isSampleScan } from './offline';

// ------------------------------------------------------------------
// Scan imagery
//
// Screens used to render every row with the same grey leaf glyph, which made
// the app look like a wireframe. Seeded samples now carry a bundled photo.
//
// These are the same caption-verified photos used in the accuracy suite
// (demo-photos/), so each sample's picture genuinely matches its own
// diagnosis rather than being decorative stock art.
// ------------------------------------------------------------------

const SAMPLE_IMAGES: Record<string, ImageSourcePropType> = {
  healthy: require('../assets/images/sample-healthy-leaf.jpg'),
  'powdery mildew': require('../assets/images/sample-powdery-mildew.jpg'),
  anthracnose: require('../assets/images/sample-anthracnose.jpg'),
};

type ScanImageFields = Pick<
  Scan,
  'image_url' | 'is_healthy' | 'disease_name_en' | 'voice_text'
>;

/**
 * The image to show for a scan, or null when there is nothing honest to show.
 *
 * A real uploaded photo always wins. Bundled sample photos are strictly gated
 * on the sample marker: a real scan whose upload failed must fall through to a
 * placeholder rather than display a mango leaf the farmer never photographed.
 */
export function resolveScanImage(scan: ScanImageFields): ImageSourcePropType | null {
  if (scan.image_url) return { uri: scan.image_url };
  if (!isSampleScan(scan)) return null;

  const key = scan.is_healthy ? 'healthy' : (scan.disease_name_en ?? '').toLowerCase();
  return SAMPLE_IMAGES[key] ?? null;
}

/** Shown under sample photos so no third-party image ships uncredited. */
export const SAMPLE_PHOTO_CREDIT = 'नमुना फोटो: Wikimedia Commons';
