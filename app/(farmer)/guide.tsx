import { ScrollView, Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { DISEASES } from '@/lib/diseases';
import { theme } from '@/lib/theme';
import { BookOpen, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GuideScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>रोग मार्गदर्शन</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <BookOpen size={18} color={theme.colors.accent[700]} strokeWidth={2} />
          <Text style={styles.introText}>
            हपुस आंब्यावरील सर्वांत सामान्य रोग व किडींचे मराठी मार्गदर्शन — लक्षणे, उपाय व प्रतिबंध.
          </Text>
        </View>

        {DISEASES.map((d) => (
          <TouchableOpacity
            key={d.id}
            style={styles.card}
            onPress={() => router.push(`/disease/${d.id}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.colorBar, { backgroundColor: d.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.nameMr}>{d.name_mr}</Text>
              <Text style={styles.nameEn}>{d.name_en}</Text>
              <Text style={styles.symptomPreview} numberOfLines={2}>
                {d.symptom_mr}
              </Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
        ))}

        <Text style={styles.disclaimer}>
          ⚠️ हे सामान्य मार्गदर्शन आहे. कीटकनाशके लेबलवरील सूचनांनुसारच वापरा. शंका असल्यास तालुका
          कृषी अधिकाऱ्यांशी सल्ला करा.
        </Text>
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
  intro: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: theme.colors.accent[50],
    borderWidth: 1,
    borderColor: theme.colors.accent[200],
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  introText: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.accent[800],
    lineHeight: 19,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 12,
    marginBottom: 12,
  },
  colorBar: {
    width: 4,
    borderRadius: 2,
    alignSelf: 'stretch',
  },
  nameMr: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
  },
  nameEn: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  symptomPreview: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  disclaimer: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textTertiary,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
