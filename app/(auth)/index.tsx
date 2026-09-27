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
import { Leaf, Mail, Lock, User, ArrowRight, Eye, EyeOff, Compass } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Map raw Supabase errors to friendly, actionable Marathi. A judge tapping
// the wrong password must never see English engineering text.
function friendlyAuthError(err: unknown, mode: 'login' | 'register'): string {
  const raw = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (raw.includes('invalid login credentials'))
    return 'ईमेल किंवा पासवर्ड चुकीचे आहे. पुन्हा तपासा — पासवर्ड विसरलात? खाली «पासवर्ड विसरलात?» दाबा.';
  if (raw.includes('already registered') || raw.includes('already exists'))
    return 'हा ईमेल आधीच नोंदणीकृत आहे — साइन इन करा. पासवर्ड विसरलात तर «पासवर्ड विसरलात?» वापरा.';
  if (raw.includes('email not confirmed'))
    return 'ईमेल पुष्टीकरण बाकी आहे. तुमचा ईमेल तपासा (स्पॅमही) आणि लिंकवर क्लिक करा.';
  if (raw.includes('at least') && raw.includes('password'))
    return 'पासवर्ड किमान ६ अक्षरांचा ठेवा.';
  if (raw.includes('rate limit'))
    return 'बरेच प्रयत्न झाले. १–२ मिनिटांनी पुन्हा करा.';
  if (raw.includes('signups not allowed'))
    return 'सध्या नवीन खाती बंद आहेत. पाहुणे म्हणून डेमो पाहा किंवा नंतर प्रयत्न करा.';
  if (raw.includes('failed to fetch') || raw.includes('network'))
    return 'नेट कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.';
  return mode === 'register'
    ? 'खाते तयार होऊ शकले नाही. पुन्हा प्रयत्न करा.'
    : 'साइन इन होऊ शकले नाही. पुन्हा प्रयत्न करा.';
}

function resetRedirectUrl(): string | undefined {
  if (Platform.OS !== 'web') return undefined;
  const base = window.location.pathname.replace(/(index\.html)?$/, '').replace(/\/$/, '');
  return window.location.origin + base + '/reset';
}

export default function AuthScreen() {
  const { session, profile } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (session && profile) {
      router.replace('/(farmer)');
    }
  }, [session, profile]);

  async function handleSubmit() {
    setError(null);
    setInfo(null);

    if (!email.trim() || !password.trim()) {
      setError('कृपया ईमेल व पासवर्ड टाका.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('कृपया तुमचे नाव टाका.');
      return;
    }
    if (password.length < 6) {
      setError('पासवर्ड किमान ६ अक्षरांचा ठेवा.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });

        if (signUpError) {
          // Already registered? Flip to login with the same email prefilled.
          if (String(signUpError.message).toLowerCase().includes('already')) {
            setMode('login');
            setError(friendlyAuthError(signUpError, 'register'));
            return;
          }
          throw signUpError;
        }

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
      setError(friendlyAuthError(err, mode));
    } finally {
      setLoading(false);
    }
  }

  async function handleGuestDemo() {
    setError(null);
    setInfo(null);
    setGuestLoading(true);
    try {
      const { error: guestError } = await supabase.auth.signInAnonymously();
      if (guestError) throw guestError;
      // Session lands → AuthProvider creates a पाहुणे profile → redirect fires.
    } catch (err) {
      const raw = (err instanceof Error ? err.message : String(err)).toLowerCase();
      setError(
        raw.includes('anonymous') || raw.includes('signups')
          ? 'पाहुणे प्रवेश सध्या उपलब्ध नाही — नोंदणी करा (फक्त ३० सेकंद).'
          : 'डेमो सुरू होऊ शकला नाही. पुन्हा प्रयत्न करा.'
      );
    } finally {
      setGuestLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('आधी तुमचा ईमेल वर टाका — तिथे रीसेट लिंक येईल.');
      return;
    }
    setResetLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: resetRedirectUrl(),
      });
      if (resetError) throw resetError;
      setInfo('रीसेट लिंक ' + email.trim() + ' या ईमेलवर पाठवली आहे. ईमेल तपासा (स्पॅमही).');
    } catch (err) {
      setError(friendlyAuthError(err, 'login'));
    } finally {
      setResetLoading(false);
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
          {info && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{info}</Text>
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
                placeholder="किमान ६ अक्षरे"
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
            {mode === 'login' && (
              <TouchableOpacity onPress={handleForgotPassword} disabled={resetLoading}>
                <Text style={styles.forgotText}>
                  {resetLoading ? 'लिंक पाठवत आहे…' : 'पासवर्ड विसरलात?'}
                </Text>
              </TouchableOpacity>
            )}
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

          <TouchableOpacity
            style={[styles.guestButton, guestLoading && styles.submitButtonDisabled]}
            onPress={handleGuestDemo}
            disabled={guestLoading || loading}
            activeOpacity={0.9}
          >
            <Compass size={20} color={theme.colors.primary[600]} />
            <Text style={styles.guestText}>
              {guestLoading ? 'डेमो सुरू होत आहे…' : 'पाहुणे म्हणून डेमो पाहा'}
            </Text>
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {mode === 'login' ? 'खाते नाही? ' : 'आधीचे खाते आहे? '}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
                setInfo(null);
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
  infoBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: '#166534',
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
  forgotText: {
    fontSize: 13,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary[600],
    marginTop: 8,
    alignSelf: 'flex-end',
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
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: theme.colors.primary[600],
    borderRadius: 12,
    height: 52,
    marginTop: 12,
  },
  guestText: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary[600],
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
