import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { findDisease } from '@/lib/diseases';
import { theme } from '@/lib/theme';
import {
  ChevronLeft,
  Stethoscope,
  FlaskConical,
  ShieldCheck,
  CalendarDays,
  CircleHelp,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DiseaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const disease = findDisease(id);

  if (!disease) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerBox}>
          <Text style={styles.centerText}>ही माहिती सापडली नाही.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>मागे जा</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navButton} accessibilityLabel="मागे जा" accessibilityRole="button">
          <ChevronLeft size={24} color={theme.colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {disease.name_mr}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { borderLeftColor: disease.color }]}>
          <Text style={styles.nameMr}>{disease.name_mr}</Text>
          <Text style={styles.nameEn}>{disease.name_en}</Text>
        </View>

        <Section icon={<Stethoscope size={15} color={disease.color} strokeWidth={2.2} />} title="लक्षणे">
          <Text style={styles.bodyText}>{disease.symptom_mr}</Text>
        </Section>

        <Section
          icon={<CircleHelp size={15} color={disease.color} strokeWidth={2.2} />}
          title="कारण"
        >
          <Text style={styles.bodyText}>{disease.cause_mr}</Text>
        </Section>

        <Section
          icon={<CalendarDays size={15} color={disease.color} strokeWidth={2.2} />}
          title="कोणत्या हंगामात"
        >
          <Text style={styles.bodyText}>{disease.season_mr}</Text>
        </Section>

        <Section
          icon={<FlaskConical size={15} color={disease.color} strokeWidth={2.2} />}
          title="उपाय"
          cardBg="#fff7ed"
          cardBorder="#fed7aa"
        >
          <Text style={styles.bodyText}>{disease.treatment_mr}</Text>
        </Section>

        <Section
          icon={<ShieldCheck size={15} color={disease.color} strokeWidth={2.2} />}
          title="प्रतिबंध"
          cardBg="#f0fdf4"
          cardBorder="#bbf7d0"
        >
          <Text style={styles.bodyText}>{disease.prevention_mr}</Text>
        </Section>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => router.push('/scan')}
          activeOpacity={0.9}
        >
          <Text style={styles.scanButtonText}>आपल्या झाडाची तपासणी करा</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          ⚠️ सामान्य मार्गदर्शन. कीटकनाशके लेबलवरील सूचनांनुसारच वापरा.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  icon,
  title,
  children,
  cardBg,
  cardBorder,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  cardBg?: string;
  cardBorder?: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View
        style={[
          styles.sectionCard,
          cardBg ? { backgroundColor: cardBg, borderColor: cardBorder } : null,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  centerText: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
  heroCard: {
    marginTop: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
  },
  nameMr: {
    fontSize: 22,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
  nameEn: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
  },
  sectionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  bodyText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  scanButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[600],
    borderRadius: 12,
    height: 52,
    marginTop: 24,
  },
  scanButtonText: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
  disclaimer: {
    marginTop: 14,
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
