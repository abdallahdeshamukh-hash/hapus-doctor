import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { Leaf, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Landing page for the password-recovery link (web). supabase-js detects the
// recovery tokens in the URL, then this screen collects the new password.
export default function ResetScreen() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // supabase-js exchanges the code/token in the URL automatically
    // (detectSessionInUrl); give it a beat, then show the form if a session exists.
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setReady(!!data.session);
      if (!data.session) {
        setError('हा लिंक कालबाह्य झाला आहे. पुन्हा «पासवर्ड विसरलात?» वापरा.');
      }
    }, 1500);
    return () => clearTimeout(t);
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
      setTimeout(() => router.replace('/(farmer)'), 1500);
    } catch (err) {
      const raw = (err instanceof Error ? err.message : String(err)).toLowerCase();
      setError(raw.includes('session') || raw.includes('token') ? 'लिंक कालबाह्य झाली — पुन्हा रीसेट करा.' : 'पासवर्ड बदलू शकलो नाही. पुन्हा प्रयत्न करा.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Leaf size={28} color={theme.colors.white} strokeWidth={2.5} />
          </View>
          <Text style={styles.title}>नवीन पासवर्ड ठेवा</Text>
        </View>

        {done ? (
          <View style={styles.doneBox}>
            <CheckCircle size={40} color="#16a34a" />
            <Text style={styles.doneText}>पासवर्ड बदलला! घड्याळ उघडत आहे…</Text>
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
                {show ? <EyeOff size={20} color={theme.colors.textTertiary} /> : <Eye size={20} color={theme.colors.textTertiary} />}
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
              style={[styles.submitButton, (busy || !ready) && styles.disabled]}
              onPress={handleSave}
              disabled={busy || !ready}
            >
              <Text style={styles.submitText}>{busy ? 'बदलत आहे…' : 'पासवर्ड बदला'}</Text>
            </TouchableOpacity>
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
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
  doneBox: {
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  doneText: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: '#166534',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.error,
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[600],
    borderRadius: 12,
    height: 56,
    marginTop: 20,
  },
  disabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
});
