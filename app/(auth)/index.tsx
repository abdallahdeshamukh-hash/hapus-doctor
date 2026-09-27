import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';
import { Leaf, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthScreen() {
  const { session, profile } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session && profile) {
      router.replace('/(farmer)');
    }
  }, [session, profile]);

  async function handleSubmit() {
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('कृपया ईमेल व पासवर्ड टाका.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('कृपया तुमचे नाव टाका.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user.id,
            name: name.trim(),
            role: 'farmer',
          });

          if (profileError) throw profileError;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (signInError) throw signInError;
      }
      // Navigation is handled by the useEffect above watching session/profile
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'काहीतरी चुकले. पुन्हा प्रयत्न करा.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Leaf size={32} color={theme.colors.white} strokeWidth={2.5} />
          </View>
          <Text style={styles.appName}>हपुस डॉक्टर</Text>
          <Text style={styles.tagline}>Hapus Doctor — तुमच्या बागेचा डॉक्टर</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>{mode === 'login' ? 'पुन्हा स्वागत आहे' : 'नवीन खाते'}</Text>
          <Text style={styles.subtitle}>
            {mode === 'login'
              ? 'बागेची तपासणी सुरू ठेवण्यासाठी साइन इन करा'
              : 'आंब्याच्या बागेची AI तपासणी सुरू करा'}
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {mode === 'register' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>तुमचे नाव</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="उदा. संजय पाटील"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>ईमेल</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color={theme.colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="farmer@example.com"
                placeholderTextColor={theme.colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>पासवर्ड</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color={theme.colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? (
                  <EyeOff size={20} color={theme.colors.textTertiary} />
                ) : (
                  <Eye size={20} color={theme.colors.textTertiary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.9}
          >
            <Text style={styles.submitText}>
              {loading ? 'कृपया प्रतीक्षा करा...' : mode === 'login' ? 'साइन इन' : 'खाते तयार करा'}
            </Text>
            {!loading && <ArrowRight size={20} color={theme.colors.white} />}
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {mode === 'login' ? 'खाते नाही? ' : 'आधीचे खाते आहे? '}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
            >
              <Text style={styles.switchLink}>{mode === 'login' ? 'नोंदणी करा' : 'साइन इन'}</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 40,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary[600],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  appName: {
    fontSize: 30,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  form: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.error,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.neutral[700],
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textPrimary,
    height: '100%',
  },
  eyeButton: {
    padding: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary[600],
    borderRadius: 12,
    height: 56,
    marginTop: 8,
    shadowColor: theme.colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  switchText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  switchLink: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary[600],
  },
});
