import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase, Scan, SEVERITY_CONFIG } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { LoadingState, EmptyState, SeverityBadge } from '@/components/ui';
import { isSampleScan } from '@/lib/offline';
import { Leaf, CheckCircle, ChevronRight, Bookmark } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScans = useCallback(async () => {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .order('created_at', { ascending: false });

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

  if (loading) return <LoadingState message="तपासणी लोड होत आहे..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>माझ्या तपासण्या</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {scans.length === 0 ? (
          <EmptyState
            icon={<Leaf size={32} color={theme.colors.primary[400]} strokeWidth={2} />}
            title="अजून तपासणी नाही"
            subtitle="झाडाचा फोटो काढा — प्रत्येक तपासणी येथे जतन होईल."
          />
        ) : (
          <View style={{ gap: 12, marginTop: 16 }}>
            {scans.map((scan) => {
              const sev = scan.severity ? SEVERITY_CONFIG[scan.severity] : null;
              const sample = isSampleScan(scan);
              return (
                <TouchableOpacity
                  key={scan.id}
                  style={[styles.card, sample && styles.sampleCard]}
                  onPress={() => router.push(`/result/${scan.id}`)}
                  activeOpacity={0.7}
                >
                  {scan.image_url ? (
                    <Image source={{ uri: scan.image_url }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder, sample && styles.sampleThumb]}>
                      <Bookmark size={20} color={theme.colors.accent[700]} strokeWidth={2} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardHeader}>
                      {sample && (
                        <View style={styles.sampleBadge}>
                          <Bookmark size={11} color={theme.colors.accent[700]} strokeWidth={2.5} />
                          <Text style={styles.sampleBadgeText}>नमुना तपासणी</Text>
                        </View>
                      )}
                      {scan.is_healthy ? (
                        <View style={styles.healthyBadge}>
                          <CheckCircle size={12} color="#16a34a" strokeWidth={2.5} />
                          <Text style={styles.healthyBadgeText}>निरोगी</Text>
                        </View>
                      ) : (
                        <SeverityBadge severity={scan.severity} />
                      )}
                      {sev && scan.is_healthy ? <SeverityBadge severity={scan.severity} /> : null}
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {scan.is_healthy
                        ? 'झाड निरोगी आहे'
                        : scan.disease_name_mr || 'रोग आढळला'}
                    </Text>
                    <Text style={styles.cardDate}>
                      {new Date(scan.created_at).toLocaleString('mr-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={theme.colors.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  navBar: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  sampleCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderStyle: 'dashed',
  },
  sampleThumb: {
    backgroundColor: '#fef3c7',
  },
  sampleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  sampleBadgeText: {
    fontSize: 11,
    fontFamily: theme.fonts.semiBold,
    color: '#92400e',
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: theme.colors.neutral[100],
  },
  thumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  healthyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: '#f0fdf4',
  },
  healthyBadgeText: {
    fontSize: 12,
    fontFamily: theme.fonts.semiBold,
    color: '#16a34a',
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textTertiary,
  },
});
