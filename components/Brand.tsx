import Svg, { Path, G } from 'react-native-svg';

/**
 * Original brand mark for Hapus Doctor.
 *
 * Drawn as vector paths rather than shipped as a bitmap so the same asset
 * stays crisp from a 16px tab icon to a full-bleed hero watermark, and so the
 * app's identity is our own work rather than licensed stock art.
 *
 * The leaf is lanceolate with a curved midrib — the silhouette of a mango
 * leaf rather than a generic rounded leaf.
 */

const LEAF_OUTLINE =
  'M50 2 C 82 20 95 46 79 68 C 68 82 57 91 50 98 C 43 91 32 82 21 68 C 5 46 18 20 50 2 Z';

const MIDRIB = 'M50 9 C 50 38 50 68 50 94';

// Lateral veins, curving up and outward from the midrib like a real leaf.
const VEINS = [
  'M50 26 C 43 24 37 20 32 13',
  'M50 40 C 42 38 35 33 29 25',
  'M50 54 C 42 52 34 46 28 37',
  'M50 68 C 43 66 36 60 31 50',
  'M50 26 C 57 24 63 20 68 13',
  'M50 40 C 58 38 65 33 71 25',
  'M50 54 C 58 52 66 46 72 37',
  'M50 68 C 57 66 64 60 69 50',
];

export function MangoLeaf({
  size = 100,
  color = '#ffffff',
  opacity = 1,
  veinOpacity = 0.55,
}: {
  size?: number;
  color?: string;
  opacity?: number;
  veinOpacity?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      <Path d={LEAF_OUTLINE} fill={color} />
      <Path
        d={MIDRIB}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
        opacity={veinOpacity}
      />
      {VEINS.map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
          opacity={veinOpacity}
        />
      ))}
    </Svg>
  );
}

/**
 * The app's logo lockup: a leaf knocked out of a filled rounded tile.
 * Used on the auth screen, the home header and the poster.
 */
export function LeafBadge({
  size = 44,
  background = '#16a34a',
  leaf = '#ffffff',
  radius,
}: {
  size?: number;
  background?: string;
  leaf?: string;
  radius?: number;
}) {
  const r = radius ?? Math.round(size * 0.3);
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d={`M${r} 0 H${100 - r} A${r} ${r} 0 0 1 100 ${r} V${100 - r} A${r} ${r} 0 0 1 ${100 - r} 100 H${r} A${r} ${r} 0 0 1 0 ${100 - r} V${r} A${r} ${r} 0 0 1 ${r} 0 Z`}
        fill={background}
      />
      {/* Scaled down and centred so the leaf sits in the tile with real
          padding — at full bleed it filled the square edge-to-edge and read
          as a sliver rather than a mark. */}
      <G transform="translate(50, 50) scale(0.72) translate(-50, -50)">
        <Path d={LEAF_OUTLINE} fill={leaf} opacity={0.97} />
        <Path
          d={MIDRIB}
          stroke={background}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
          opacity={0.45}
        />
      </G>
    </Svg>
  );
}
