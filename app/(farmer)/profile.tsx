import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';
import {
  User as UserIcon,
  Mail,
  Leaf,
  LogOut,
  Info,
  BookOpen,
  ShieldCheck,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { profile, user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    // Alert.alert has no UI on react-native-web — sign out directly there.
    if (Platform.OS === 'web') {
      setLoading(true);
      await signOut();
      setLoading(false);
      return;
    }
    Alert.alert('साइन आउट', 'तुम्हाला खात्री आहे का?', [
      { text: 'रद्द करा', style: 'cancel' },
      {
        text: 'साइन आउट',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          await signOut();
          setLoading(false);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>प्रोफाइल</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24 }}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.name?.charAt(0).toUpperCase() || 'श'}</Text>
          </View>
          <Text style={styles.profileName}>{profile?.name || 'शेतकरी'}</Text>
          <View style={styles.roleBadge}>
            <Leaf size={12} color={theme.colors.primary[700]} strokeWidth={2} />
            <Text style={styles.roleText}>शेतकरी — हपुस डॉक्टर</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>खाते</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <UserIcon size={18} color={theme.colors.neutral[600]} strokeWidth={2} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>नाव</Text>
                <Text style={styles.infoValue}>{profile?.name || 'टाकलेले नाही'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Mail size={18} color={theme.colors.neutral[600]} strokeWidth={2} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>ईमेल</Text>
                <Text style={styles.infoValue}>{user?.email || 'टाकलेले नाही'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>अ‍ॅप</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <BookOpen size={18} color={theme.colors.neutral[600]} strokeWidth={2} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>मार्गदर्शन</Text>
                <Text style={styles.infoValue}>
                  मुख्य पान → मार्गदर्शन: ९ सामान्य रोगांची माहिती
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <ShieldCheck size={18} color={theme.colors.neutral[600]} strokeWidth={2} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>गोपनीयता</Text>
                <Text style={styles.infoValue}>तुमचे फोटो फक्त तुम्हाला दिसतात (RLS सुरक्षा)</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Info size={18} color={theme.colors.neutral[600]} strokeWidth={2} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>आवृत्ती</Text>
                <Text style={styles.infoValue}>1.0.0</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={loading}
          activeOpacity={0.7}
        >
          <LogOut size={20} color={theme.colors.error} strokeWidth={2} />
          <Text style={styles.signOutText}>साइन आउट</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Leaf size={16} color={theme.colors.textTertiary} strokeWidth={2} />
          <Text style={styles.footerText}>हपुस डॉक्टर — AI आंबा तपासणी, मराठीत</Text>
        </View>
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
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: theme.fonts.bold,
    color: theme.colors.white,
  },
  profileName: {
    fontSize: 22,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: theme.colors.primary[50],
  },
  roleText: {
    fontSize: 13,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary[700],
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textTertiary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 66,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 24,
  },
  signOutText: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.error,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textTertiary,
  },
});
