export const theme = {
  colors: {
    primary: {
      // mango-leaf green
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    accent: {
      // alphonso gold
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    neutral: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    white: '#ffffff',
    black: '#000000',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    danger: '#dc2626',
    background: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
  },

  // Surfaces: the page is very slightly green-tinted so white cards separate
  // from it without needing a border. `sunken` is the soft tint for section
  // bands; `inset` is for quiet panels nested inside a raised card.
  surface: {
    page: '#f6f8f6',
    raised: '#ffffff',
    sunken: '#eef5ef',
    inset: '#f8faf9',
  },

  // Scrims for photo heroes (top → bottom). Kept in tokens so every photo
  // overlay in the app fades identically.
  scrim: {
    strong: ['rgba(6,46,24,0.05)', 'rgba(6,46,24,0.55)', 'rgba(6,46,24,0.88)'] as [
      string,
      string,
      string,
    ],
    soft: ['rgba(6,46,24,0.00)', 'rgba(6,46,24,0.35)', 'rgba(6,46,24,0.72)'] as [
      string,
      string,
      string,
    ],
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  fonts: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },

  // Type scale. Every step carries an explicit lineHeight generous enough for
  // Devanagari: matras sit above and below the baseline, so line-height tuned
  // for Latin (~1.2x) clips them. These run ~1.4–1.5x on purpose.
  type: {
    display: { fontSize: 32, lineHeight: 46 },
    h1: { fontSize: 24, lineHeight: 36 },
    h2: { fontSize: 18, lineHeight: 28 },
    h3: { fontSize: 16, lineHeight: 26 },
    body: { fontSize: 15, lineHeight: 24 },
    bodySm: { fontSize: 13, lineHeight: 21 },
    caption: { fontSize: 12, lineHeight: 18 },
    tiny: { fontSize: 11, lineHeight: 16 },
    // Numbers and Latin sublabels — Latin sits tighter than Devanagari, so
    // these keep a normal ratio plus a touch of negative tracking.
    number: { fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
    latin: { fontSize: 13, lineHeight: 20, letterSpacing: 0.2 },
  },

  // Depth tiers. Screens previously used one identical card everywhere, which
  // is what made everything read flat. Pick by role, not by taste:
  //   hero  — the one focal card (photo/verdict), lifts off the page
  //   card  — list rows and stat tiles, hairline border instead of shadow
  //   inset — quiet panel nested inside another card
  elevation: {
    hero: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 8,
    },
    card: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    inset: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
  },

  // Severity rails: a 4px left stripe double-codes severity alongside the
  // pill, so a farmer can scan a long history list at a glance.
  rail: {
    width: 4,
    radius: 2,
  },
};

export type Theme = typeof theme;
