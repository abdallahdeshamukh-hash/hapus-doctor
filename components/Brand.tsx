import Svg, { Path, G } from 'react-native-svg';

/**
 * Original brand mark for Hapus Doctor.
 *
 * Drawn as vector paths rather than shipped as a bitmap so the same asset
 * stays crisp from a 16px tab icon to a full-bleed hero watermark, and so the
 * app's identity is our own work rather than licensed stock art.
 *
 * The leaf is lanceolate with a curved midrib — the silhouette of a mango leaf
 * rather than a generic rounded leaf.
 */

const LEAF_OUTLINE =
  'M50 2 C 82 20 95 46 79 68 C 68 82 57 91 50 98 C 43 91 32 82 21 68 C 5 46 18 20 50 2 Z';

const MIDRIB = 'M50 9 C 50 38 50 68 50 94';

// Lateral veins, curving up and outward from the midrib like a real leaf.
const VEINS = [
  'M50 24 C 44 22 38 18 33 12',
  'M50 37 C 43 35 36 30 30 22',
  'M50 50 C 43 48 35 42 29 33',
  'M50 63 C 43 61 36 55 31 45',
  'M50 76 C 44 74 38 68 34 59',
  'M50 24 C 56 22 62 18 67 12',
  'M50 37 C 57 35 64 30 70 22',
  'M50 50 C 57 48 65 42 71 33',
  'M50 63 C 57 61 64 55 69 45',
  'M50 76 C 56 74 62 68 66 59',
];

/**
 * Leaf body plus its venation. `detail` is the stroke colour for the midrib and
 * veins — pass something that contrasts with `fill`, otherwise the veins
 * disappear into the leaf and the mark reads as a plain blob.
 */
function LeafPaths({
  fill,
  detail,
  veinOpacity = 0.5,
  midribWidth = 2.4,
  veinWidth = 1.5,
}: {
  fill: string;
  detail: string;
  veinOpacity?: number;
  midribWidth?: number;
  veinWidth?: number;
}) {
  return (
    <>
      <Path d={LEAF_OUTLINE} fill={fill} />
      <Path
        d={MIDRIB}
        stroke={detail}
        strokeWidth={midribWidth}
        strokeLinecap="round"
        fill="none"
        opacity={veinOpacity}
      />
      {VEINS.map((d) => (
        <Path
          key={d}
          d={d}
          stroke={detail}
          strokeWidth={veinWidth}
          strokeLinecap="round"
          fill="none"
          opacity={veinOpacity}
        />
      ))}
    </>
  );
}

export function MangoLeaf({
  size = 100,
  color = '#ffffff',
  opacity = 1,
  veinColor = 'rgba(6,46,24,0.45)',
  veinOpacity = 0.6,
}: {
  size?: number;
  color?: string;
  opacity?: number;
  veinColor?: string;
  veinOpacity?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      <LeafPaths fill={color} detail={veinColor} veinOpacity={veinOpacity} />
    </Svg>
  );
}

/**
 * The app's logo lockup: a leaf tilted inside a rounded tile. Used on the auth
 * and reset screens, the home header and the poster.
 *
 * `background` doubles as the vein colour, so the venation reads as a knockout
 * through the leaf.
 */
export function LeafBadge({
  size = 44,
  background = '#16a34a',
  leaf = '#ffffff',
  radius,
  tilt = -12,
}: {
  size?: number;
  background?: string;
  leaf?: string;
  radius?: number;
  tilt?: number;
}) {
  const r = radius ?? Math.round(size * 0.3);
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d={`M${r} 0 H${100 - r} A${r} ${r} 0 0 1 100 ${r} V${100 - r} A${r} ${r} 0 0 1 ${100 - r} 100 H${r} A${r} ${r} 0 0 1 0 ${100 - r} V${r} A${r} ${r} 0 0 1 ${r} 0 Z`}
        fill={background}
      />
      {/* Scaled down, centred, and tilted — at full bleed and upright it filled
          the tile edge-to-edge and read as a flat sliver rather than a mark. */}
      <G transform={`translate(50, 50) rotate(${tilt}) scale(0.70) translate(-50, -50)`}>
        <LeafPaths
          fill={leaf}
          detail={background}
          veinOpacity={0.6}
          midribWidth={4.5}
          veinWidth={2.6}
        />
      </G>
    </Svg>
  );
}
