import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { LeafBadge } from '@/components/Brand';
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hasRecoveryParams, consumeRecoveryParams, cleanUrl } from '@/lib/recovery';

// Landing page for the password-recovery link.
//
// The session is established explicitly rather than relying on supabase-js's
// URL detection: on GitHub Pages a link to /reset is served 404.html, which
// bounces to the app root, so the client is constructed without the token in
// the URL and never sees it. See lib/recovery.ts.

type Phase = 'checking' | 'ready' | 'invalid';

export default function ResetScreen() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      // 1. A session may already be established: either the recovery token was
      //    consumed on the way in (app/index.tsx), or the farmer is signed in.
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setEmail(data.session.user?.email ?? null);
        setPhase('ready');
        return;
      }

      // 2. Otherwise consume the params from this URL ourselves — this covers a
      //    direct load where supabase-js did not run URL detection.
      const href = typeof window !== 'undefined' ? window.location.href : '';
      if (href && hasRecoveryParams(href)) {
        const outcome = await consumeRecoveryParams(href);
        if (!active) return;
        if (outcome.status === 'ok') {
          cleanUrl();
          const { data: after } = await supabase.auth.getSession();
          if (!active) return;
          setEmail(after.session?.user?.email ?? null);
          setPhase('ready');
          return;
        }
      }

      if (active) setPhase('invalid');
    })();

    // 3. Belt and braces: supabase-js emits PASSWORD_RECOVERY when it consumes a
    //    token, which can land just after the checks above.
    const { data: sub } = supabase.auth.onAuthStateChange((event, sessionNow) => {
      if (sessionNow && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) {
        setEmail(sessionNow.user?.email ?? null);
        setPhase('ready');
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSave() {
    setError(null);
    if (password.length < 6) {
      setError('पासवर्ड किमान ६ अक्षरांचा ठेवा.');
      return;
    }
    if (password !== confirm) {
      setError('दोन्ही पासवर्ड जुळत नाहीत.');
      return;
    }
    setBusy(true);
    try {
      const { error: updError } = await supabase.auth.updateUser({ password });
      if (updError) throw updError;
      setDone(true);
      setTimeout(() => router.replace('/(farmer)'), 1600);
    } catch (err) {
      const raw = (err instanceof Error ? err.message : String(err)).toLowerCase();
      setError(
        raw.includes('session') || raw.includes('token')
          ? 'लिंक कालबाह्य झाली — पुन्हा नवीन लिंक मागवा.'
          : 'पासवर्ड बदलू शकलो नाही. पुन्हा प्रयत्न करा.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <LeafBadge size={58} background={theme.colors.white} leaf={theme.colors.primary[700]} />
          <Text style={styles.title}>नवीन पासवर्ड ठेवा</Text>
          {email && phase === 'ready' && <Text style={styles.subtitle}>{email}</Text>}
        </View>

        {phase === 'checking' && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Text style={styles.checkingText}>लिंक तपासत आहे…</Text>
          </View>
        )}

        {phase === 'invalid' && (
          <View>
            <View style={styles.warnBox}>
              <AlertTriangle size={18} color={theme.colors.accent[800]} strokeWidth={2.2} />
              <Text style={styles.warnText}>
                ही लिंक आधीच वापरली गेली आहे किंवा कालबाह्य झाली आहे. सुरक्षेसाठी रीसेट
                लिंक एकदाच चालते — काही ईमेल ॲप्स लिंक आपोआप उघडतात, त्यामुळे ती तुमच्या
                आधीच वापरली जाऊ शकते.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/(auth)')}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>नवीन लिंक मागवा</Text>
            </TouchableOpacity>
            <Text style={styles.hintText}>
              पुढील स्क्रीनवर «पासवर्ड विसरलात?» दाबा, आणि आलेल्या सर्वांत नवीन
              ईमेलमधील लिंक लगेच उघडा.
            </Text>
          </View>
        )}

        {phase === 'ready' &&
          (done ? (
            <View style={styles.centerBox}>
              <CheckCircle size={44} color={theme.colors.primary[600]} strokeWidth={2.2} />
              <Text style={styles.doneText}>पासवर्ड बदलला! ॲप उघडत आहे…</Text>
            </View>
          ) : (
            <View>
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <View style={styles.inputWrapper}>
                <Lock size={20} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="नवीन पासवर्ड (किमान ६ अक्षरे)"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!show}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShow(!show)} style={styles.eyeButton}>
                  {show ? (
                    <EyeOff size={20} color={theme.colors.textTertiary} />
                  ) : (
                    <Eye size={20} color={theme.colors.textTertiary} />
                  )}
                </TouchableOpacity>
              </View>
              <View style={[styles.inputWrapper, { marginTop: 12 }]}>
                <Lock size={20} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="नवीन पासवर्ड पुन्हा टाका"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry={!show}
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, busy && styles.disabled]}
                onPress={handleSave}
                disabled={busy}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryButtonText}>
                  {busy ? 'बदलत आहे…' : 'पासवर्ड बदला'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.page,
  },
  header: {
    alignItems: 'center',
    marginBottom: 26,
  },
  title: {
    ...theme.type.h1,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    marginTop: 12,
  },
  subtitle: {
    ...theme.type.bodySm,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  centerBox: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 24,
  },
  checkingText: {
    ...theme.type.body,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  doneText: {
    ...theme.type.body,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary[800],
    textAlign: 'center',
  },
  warnBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: theme.colors.accent[50],
    borderWidth: 1,
    borderColor: theme.colors.accent[200],
    borderRadius: theme.radius.lg,
    padding: 14,
    marginBottom: 16,
  },
  warnText: {
    flex: 1,
    ...theme.type.bodySm,
    fontFamily: theme.fonts.medium,
    color: theme.colors.accent[900],
  },
  hintText: {
    ...theme.type.bodySm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 14,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorText: {
    ...theme.type.bodySm,
    fontFamily: theme.fonts.medium,
    color: theme.colors.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
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
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[600],
    borderRadius: theme.radius.md,
    height: 56,
    marginTop: 20,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
  disabled: {
    opacity: 0.6,
  },
});
