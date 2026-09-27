import { ActivityIndicator, Text, View, StyleSheet, type ViewStyle } from 'react-native';
import { theme } from '@/lib/theme';
import { ScanSeverity, SEVERITY_CONFIG } from '@/lib/supabase';
import { MangoLeaf } from '@/components/Brand';

/**
 * Depth tiers. Previously every surface in the app was the same 1px-border
 * rounded rectangle, which is what made screens read flat. Pick by role:
 *
 *   hero  — the one focal card per screen (photo / verdict). Lifts off the page.
 *   card  — list rows and tiles. Hairline border, no shadow.
 *   inset — a quiet panel nested inside another card. Tinted, no border.
 */
export function Card({
  variant = 'card',
  style,
  children,
}: {
  variant?: 'hero' | 'card' | 'inset';
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}) {
  const variantStyle =
    variant === 'hero'
      ? styles.cardHero
      : variant === 'inset'
        ? styles.cardInset
        : styles.cardBase;
  return <View style={[variantStyle, style]}>{children}</View>;
}

/**
 * A 4px severity stripe pinned to a card's leading edge. Double-codes severity
 * alongside the pill so a farmer can scan a long history list by colour alone
 * without reading each row.
 */
export function SeverityRail({
  color,
  muted,
}: {
  color: string;
  muted?: boolean;
}) {
  return (
    <View
      style={[
        styles.rail,
        { backgroundColor: color },
        muted ? { opacity: 0.55 } : null,
      ]}
    />
  );
}

export function LoadingState({ message }: { message?: string }) {
  return (
    <View style={styles.centerFill}>
      <ActivityIndicator size="large" color={theme.colors.primary[600]} />
      {message && <Text style={styles.loadingText}>{message}</Text>}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        {icon ?? <MangoLeaf size={34} color={theme.colors.primary[600]} opacity={0.85} />}
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
      {action && <View style={{ marginTop: 24 }}>{action}</View>}
    </View>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIconWrap, { backgroundColor: '#fef2f2' }]}>
        <Text style={{ fontSize: 28, color: theme.colors.error }}>!</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.error, fontSize: 16 }]}>
        {message}
      </Text>
    </View>
  );
}

export function SeverityBadge({ severity }: { severity: ScanSeverity | null | undefined }) {
  if (!severity) return null;
  const c = SEVERITY_CONFIG[severity];
  return (
    <View style={[styles.pill, { backgroundColor: c.bgColor }]}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.dotColor }} />
      <Text style={[styles.pillText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

export function StageBadge({ stage }: { stage: string | null | undefined }) {
  if (!stage) return null;
  const labels: Record<string, string> = {
    leaf: 'पाने',
    flower: 'फुले',
    fruit: 'फळे',
    trunk: 'खोड',
  };
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: 'rgba(255,255,255,0.92)' },
      ]}
    >
      <Text style={[styles.pillText, { color: theme.colors.accent[800] }]}>
        {labels[stage] ?? stage}
      </Text>
    </View>
  );
}

/** Badge that reads correctly when sitting on top of a photo or dark scrim. */
export function GlassBadge({
  label,
  color,
  dot,
}: {
  label: string;
  color?: string;
  dot?: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
      {dot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />}
      <Text style={[styles.pillText, { color: color ?? theme.colors.neutral[800] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    backgroundColor: theme.surface.raised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHero: {
    backgroundColor: theme.surface.raised,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    ...theme.elevation.hero,
  },
  cardInset: {
    backgroundColor: theme.surface.inset,
    borderRadius: theme.radius.md,
    borderWidth: 0,
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: theme.rail.width,
    borderTopRightRadius: theme.rail.radius,
    borderBottomRightRadius: theme.rail.radius,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
  },
  pillText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: theme.fonts.semiBold,
  },
  centerFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.surface.page,
  },
  loadingText: {
    marginTop: 12,
    ...theme.type.body,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    ...theme.type.h2,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...theme.type.body,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
