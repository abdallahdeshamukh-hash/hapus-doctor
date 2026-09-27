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
import { supabase, Scan, SEVERITY_CONFIG } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';
import { LoadingState, EmptyState, SeverityBadge } from '@/components/ui';
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
          <View style={styles.headerLogo}>
            <Leaf size={22} color={theme.colors.white} strokeWidth={2.2} />
          </View>
        </View>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => router.push('/scan')}
          activeOpacity={0.9}
        >
          <View style={styles.scanButtonContent}>
            <View style={styles.scanButtonIcon}>
              <Camera size={26} color={theme.colors.white} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scanButtonTitle}>झाड तपासा</Text>
              <Text style={styles.scanButtonSubtitle}>
                पानाचा/फळाचा फोटो काढा — AI रोग ओळखेल व उपाय सांगेल
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>बागेची स्थिती</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon={<HistoryIcon size={20} color={theme.colors.primary[600]} strokeWidth={2} />}
              label="एकूण तपासणी"
              value={total}
              color={theme.colors.primary[600]}
              bgColor={theme.colors.primary[50]}
            />
            <StatCard
              icon={<CheckCircle size={20} color="#16a34a" strokeWidth={2} />}
              label="निरोगी"
              value={healthy}
              color="#16a34a"
              bgColor="#f0fdf4"
            />
            <StatCard
              icon={<AlertTriangle size={20} color="#d97706" strokeWidth={2} />}
              label="रोगट"
              value={diseased}
              color="#d97706"
              bgColor="#fffbeb"
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
              icon={<Leaf size={32} color={theme.colors.primary[400]} strokeWidth={2} />}
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

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: bgColor }]}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ScanCard({ scan }: { scan: Scan }) {
  const sev = scan.severity ? SEVERITY_CONFIG[scan.severity] : null;
  return (
    <TouchableOpacity
      style={styles.scanCard}
      onPress={() => router.push(`/result/${scan.id}`)}
      activeOpacity={0.7}
    >
      {scan.image_url ? (
        <Image source={{ uri: scan.image_url }} style={styles.scanThumb} />
      ) : (
        <View style={[styles.scanThumb, styles.scanThumbPlaceholder]}>
          <Leaf size={20} color={theme.colors.primary[400]} strokeWidth={2} />
        </View>
      )}
      <View style={styles.scanCardLeft}>
        <View style={styles.scanCardHeader}>
          {scan.is_healthy ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 9999,
                backgroundColor: '#f0fdf4',
              }}
            >
              <CheckCircle size={12} color="#16a34a" strokeWidth={2.5} />
              <Text style={{ fontSize: 12, fontFamily: theme.fonts.semiBold, color: '#16a34a' }}>
                निरोगी
              </Text>
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
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  userName: {
    fontSize: 24,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.primary[600],
    shadowColor: theme.colors.primary[600],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  scanButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  scanButtonIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
    marginBottom: 2,
  },
  scanButtonSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary[600],
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  scanList: {
    gap: 12,
  },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  scanThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: theme.colors.neutral[100],
  },
  scanThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanCardLeft: {
    flex: 1,
    marginRight: 4,
  },
  scanCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  confidenceText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  scanTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  scanDate: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textTertiary,
  },
  emptyAction: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyActionText: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
});
