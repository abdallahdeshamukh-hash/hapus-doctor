import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, Scan, SEVERITY_CONFIG } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';
import { LoadingState, EmptyState, SeverityBadge, SeverityRail } from '@/components/ui';
import { MangoLeaf, LeafBadge } from '@/components/Brand';
import { resolveScanImage } from '@/lib/scanImage';
import {
  Camera,
  Leaf,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  History as HistoryIcon,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FarmerHomeScreen() {
  const { profile } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScans = useCallback(async () => {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(4);

    if (error) {
      console.error('Error fetching scans:', error.message);
      return;
    }
    setScans((data as Scan[]) || []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchScans().finally(() => setLoading(false));
    }, [fetchScans])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await fetchScans();
    setRefreshing(false);
  }

  const total = scans.length;
  const diseased = scans.filter((s) => !s.is_healthy).length;
  const healthy = total - diseased;

  if (loading) return <LoadingState message="तुमची बाग लोड होत आहे..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>नमस्कार,</Text>
            <Text style={styles.userName}>{profile?.name || 'शेतकरी'}</Text>
          </View>
          <LeafBadge size={46} />
        </View>

        {/* Hero: deep-green orchard panel carrying the brand and the one
            action that matters. Replaces the flat green rectangle. */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={[theme.colors.primary[700], theme.colors.primary[900]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            {/* Decorative leaf watermarks — original vector art, low opacity */}
            <View style={styles.heroLeafA} pointerEvents="none">
              <MangoLeaf size={168} color={theme.colors.primary[300]} opacity={0.16} />
            </View>
            <View style={styles.heroLeafB} pointerEvents="none">
              <MangoLeaf size={104} color={theme.colors.primary[200]} opacity={0.12} />
            </View>

            <Text style={styles.heroWordmark}>हपुस डॉक्टर</Text>
            <Text style={styles.heroTitle}>झाड तपासा</Text>
            <Text style={styles.heroSubtitle}>
              पानाचा/फळाचा फोटो काढा — AI रोग ओळखेल व मराठीत उपाय सांगेल
            </Text>

            <TouchableOpacity
              style={styles.heroCta}
              onPress={() => router.push('/scan')}
              activeOpacity={0.9}
            >
              <Camera size={20} color={theme.colors.primary[800]} strokeWidth={2.4} />
              <Text style={styles.heroCtaText}>फोटो काढा</Text>
              <ChevronRight size={18} color={theme.colors.primary[700]} strokeWidth={2.5} />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>बागेची स्थिती</Text>
          {/* One segmented card instead of three floating tiles — the dividers
              carry the structure so the tiles need no borders. */}
          <View style={styles.statCard}>
            <StatTile
              icon={<HistoryIcon size={18} color={theme.colors.primary[700]} strokeWidth={2.2} />}
              label="एकूण"
              value={total}
              tint={theme.colors.primary[50]}
              color={theme.colors.primary[700]}
              onPress={() => router.push('/(farmer)/history')}
            />
            <View style={styles.statDivider} />
            <StatTile
              icon={<CheckCircle size={18} color="#16a34a" strokeWidth={2.2} />}
              label="निरोगी"
              value={healthy}
              tint="#f0fdf4"
              color="#15803d"
            />
            <View style={styles.statDivider} />
            <StatTile
              icon={<AlertTriangle size={18} color="#d97706" strokeWidth={2.2} />}
              label="रोगट"
              value={diseased}
              tint="#fffbeb"
              color="#b45309"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>अलीकडील तपासणी</Text>
            <TouchableOpacity onPress={() => router.push('/(farmer)/history')}>
              <Text style={styles.seeAllText}>सर्व पहा</Text>
            </TouchableOpacity>
          </View>

          {scans.length === 0 ? (
            <EmptyState
              icon={<Leaf size={32} color={theme.colors.primary[600]} strokeWidth={2} />}
              title="अजून तपासणी नाही"
              subtitle="पहिला पानाचा फोटो काढून AI कडून मोफत निदान घ्या."
              action={
                <TouchableOpacity style={styles.emptyAction} onPress={() => router.push('/scan')}>
                  <Text style={styles.emptyActionText}>आता तपासा</Text>
                </TouchableOpacity>
              }
            />
          ) : (
            <View style={styles.scanList}>
              {scans.map((scan) => (
                <ScanCard key={scan.id} scan={scan} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({
  icon,
  label,
  value,
  tint,
  color,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tint: string;
  color: string;
  onPress?: () => void;
}) {
  const Wrapper: React.ElementType = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.statTile} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.statIcon, { backgroundColor: tint }]}>{icon}</View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Wrapper>
  );
}

function ScanCard({ scan }: { scan: Scan }) {
  const sev = scan.severity ? SEVERITY_CONFIG[scan.severity] : null;
  const image = resolveScanImage(scan);
  // Rail colour mirrors the badge so severity is legible without reading text.
  const railColor = scan.is_healthy ? '#4ade80' : (sev?.dotColor ?? theme.colors.neutral[300]);

  return (
    <TouchableOpacity
      style={styles.scanCard}
      onPress={() => router.push(`/result/${scan.id}`)}
      activeOpacity={0.7}
    >
      <SeverityRail color={railColor} />
      {image ? (
        <Image source={image} style={styles.scanThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.scanThumb, styles.scanThumbPlaceholder]}>
          <MangoLeaf size={26} color={theme.colors.primary[500]} opacity={0.5} />
        </View>
      )}
      <View style={styles.scanCardLeft}>
        <View style={styles.scanCardHeader}>
          {scan.is_healthy ? (
            <View style={styles.healthyPill}>
              <CheckCircle size={12} color="#15803d" strokeWidth={2.5} />
              <Text style={styles.healthyPillText}>निरोगी</Text>
            </View>
          ) : (
            <SeverityBadge severity={scan.severity} />
          )}
          {scan.confidence != null && (
            <Text style={styles.confidenceText}>{scan.confidence}% खात्री</Text>
          )}
        </View>
        <Text style={styles.scanTitle} numberOfLines={1}>
          {scan.is_healthy ? 'झाड निरोगी आहे' : scan.disease_name_mr || 'रोग आढळला'}
        </Text>
        <Text style={styles.scanDate}>
          {new Date(scan.created_at).toLocaleDateString('mr-IN', {
            day: 'numeric',
            month: 'short',
          })}
        </Text>
      </View>
      <ChevronRight size={20} color={theme.colors.textTertiary} strokeWidth={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.page,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  greeting: {
    ...theme.type.bodySm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  userName: {
    ...theme.type.h1,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },

  heroWrap: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  hero: {
    borderRadius: theme.radius.xl,
    padding: 22,
    overflow: 'hidden',
    ...theme.elevation.hero,
  },
  heroLeafA: {
    position: 'absolute',
    right: -44,
    top: -30,
    transform: [{ rotate: '18deg' }],
  },
  heroLeafB: {
    position: 'absolute',
    right: 54,
    bottom: -46,
    transform: [{ rotate: '-24deg' }],
  },
  heroWordmark: {
    ...theme.type.caption,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary[200],
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  heroTitle: {
    ...theme.type.display,
    fontFamily: theme.fonts.bold,
    color: theme.colors.white,
    marginBottom: 6,
  },
  heroSubtitle: {
    ...theme.type.bodySm,
    fontFamily: theme.fonts.regular,
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 20,
    maxWidth: 300,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.white,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: theme.radius.full,
  },
  heroCtaText: {
    ...theme.type.body,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary[800],
  },

  section: {
    paddingHorizontal: 20,
    marginBottom: 26,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    ...theme.type.h2,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    marginBottom: 14,
  },
  seeAllText: {
    ...theme.type.bodySm,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary[700],
    marginBottom: 14,
  },

  statCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: theme.surface.raised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 16,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    ...theme.type.number,
    fontFamily: theme.fonts.bold,
  },
  statLabel: {
    ...theme.type.caption,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },

  scanList: {
    gap: 12,
  },
  scanCard: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface.raised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    gap: 12,
    overflow: 'hidden',
  },
  scanThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: theme.colors.neutral[100],
  },
  scanThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
  },
  scanCardLeft: {
    flex: 1,
  },
  scanCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  healthyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    backgroundColor: '#f0fdf4',
  },
  healthyPillText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: theme.fonts.semiBold,
    color: '#15803d',
  },
  confidenceText: {
    ...theme.type.caption,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  scanTitle: {
    ...theme.type.h3,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  scanDate: {
    ...theme.type.caption,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textTertiary,
  },

  emptyAction: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
  },
  emptyActionText: {
    ...theme.type.bodySm,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
});
