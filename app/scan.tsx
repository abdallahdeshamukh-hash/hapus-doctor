import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';
import { diagnoseScan, transcribeAudio, uriToBase64, DiagnosisResult } from '@/lib/hapus';
import { cacheLastScan } from '@/lib/offline';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import {
  ChevronLeft,
  Camera,
  X,
  Mic,
  Square,
  Sparkles,
  Send,
  Image as ImageIcon,
  FileText,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScanScreen() {
  const { user } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState('image/jpeg');
  const [symptomNotes, setSymptomNotes] = useState('');
  const [voiceText, setVoiceText] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [phaseMsg, setPhaseMsg] = useState('AI तपासणी सुरू करत आहे...');
  const [tipIdx, setTipIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const voice = useVoiceRecorder(30);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // §3 progress UX: rotate Marathi tips + count elapsed seconds while the
  // AI call runs, so a 5–15s wait never looks frozen.
  useEffect(() => {
    if (!submitting) return;
    setTipIdx(0);
    setElapsed(0);
    const tipTimer = setInterval(() => setTipIdx((i) => (i + 1) % SCAN_TIPS.length), 2500);
    const secTimer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      clearInterval(tipTimer);
      clearInterval(secTimer);
    };
  }, [submitting]);

  // ----------------------------------------------------------------
  // VOICE — record → transcribe → show spoken symptom text
  // ----------------------------------------------------------------
  async function handleMicPress() {
    setError(null);
    if (voice.recording) {
      const rec = await voice.stop();
      if (!rec || !mountedRef.current) return;

      setTranscribing(true);
      const text = await transcribeAudio(rec.uri, rec.mimeType);
      if (!mountedRef.current) return;
      setTranscribing(false);

      if (!text) {
        setError('आवाज समजला नाही. पुन्हा बोला किंवा लिहून लक्षणे सांगा.');
        return;
      }
      setVoiceText(text);
    } else {
      await voice.start();
    }
  }

  // ----------------------------------------------------------------
  // IMAGE PICKING (web + native)
  // ----------------------------------------------------------------
  function applyImage(uri: string, mime?: string) {
    setImageUri(uri);
    if (mime) setImageMime(mime);
    else if (uri.endsWith('.png')) setImageMime('image/png');
    else setImageMime('image/jpeg');
  }

  async function pickImage() {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }

    const ImagePicker = await import('expo-image-picker');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('फोटो निवडण्यासाठी परवानगी आवश्यक आहे.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      applyImage(result.assets[0].uri, result.assets[0].mimeType || undefined);
    }
  }

  async function takePhoto() {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }

    const ImagePicker = await import('expo-image-picker');
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('कॅमेरा परवानगी आवश्यक आहे.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      applyImage(result.assets[0].uri, result.assets[0].mimeType || undefined);
    }
  }

  function handleWebFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      applyImage(URL.createObjectURL(file), file.type || undefined);
    }
    e.target.value = '';
  }

  // ----------------------------------------------------------------
  // SUBMIT — base64 → AI diagnose → upload photo → insert scan → result
  // ----------------------------------------------------------------
  async function handleSubmit() {
    setError(null);

    if (!imageUri) {
      setError('कृपया आधी पान/फळ/फुलांचा फोटो काढा किंवा निवडा.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Image → base64 for the AI call
      setPhaseMsg('फोटो तयार करत आहे...');
      const base64 = await uriToBase64(imageUri);
      if (!base64) throw new Error('फोटो वाचता आला नाही. पुन्हा प्रयत्न करा.');

      // 2. AI diagnosis (voice text + typed notes both help the AI)
      setPhaseMsg('AI पानांचे परीक्षण करत आहे...');
      const notes = [voiceText, symptomNotes.trim()].filter(Boolean).join(' ') || null;
      const diagnosis: DiagnosisResult | null = await diagnoseScan({
        image_base64: base64,
        mime_type: imageMime,
        voice_text: notes,
      });

      if (!diagnosis) {
        throw new Error('AI सेवा तात्पुरती उपलब्ध नाही. थोड्या वेळाने पुन्हा प्रयत्न करा.');
      }

      // 3. Upload photo to storage
      setPhaseMsg('फोटो जतन करत आहे...');
      let image_url: string | null = null;
      let image_path: string | null = null;

      if (user) {
        const fileExt = imageMime === 'image/png' ? 'png' : 'jpg';
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const formData = {
          uri: imageUri,
          name: fileName,
          type: imageMime,
        } as any;

        const { error: uploadError } = await supabase.storage
          .from('hapus-scans')
          .upload(fileName, formData);

        if (uploadError) {
          console.warn('Photo upload failed (scan continues without photo):', uploadError.message);
        } else {
          const { data: urlData } = supabase.storage.from('hapus-scans').getPublicUrl(fileName);
          image_url = urlData.publicUrl;
          image_path = fileName;
        }
      }

      // 4. Insert the scan row with the full diagnosis
      setPhaseMsg('निदान जतन करत आहे...');
      const { data: inserted, error: insertError } = await supabase
        .from('scans')
        .insert({
          farmer_id: user?.id,
          image_url,
          image_path,
          voice_text: notes,
          is_healthy: diagnosis.is_healthy,
          disease_name_mr: diagnosis.disease_name_mr,
          disease_name_en: diagnosis.disease_name_en,
          confidence: diagnosis.confidence,
          severity: diagnosis.severity,
          stage: diagnosis.stage,
          description_mr: diagnosis.description_mr,
          treatment: diagnosis.treatment,
          prevention_mr: diagnosis.prevention_mr,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // §4: cache the last successful diagnosis for offline result fallback.
      // (Only real scans are cached; the cache never masks a live fetch —
      // result/[id].tsx reads it only when the network fetch errors.)
      if (inserted) {
        await cacheLastScan({
          id: inserted.id,
          farmer_id: user?.id ?? '',
          image_url,
          image_path,
          voice_text: notes,
          is_healthy: diagnosis.is_healthy,
          disease_name_mr: diagnosis.disease_name_mr,
          disease_name_en: diagnosis.disease_name_en,
          confidence: diagnosis.confidence,
          severity: diagnosis.severity,
          stage: diagnosis.stage,
          description_mr: diagnosis.description_mr,
          treatment: diagnosis.treatment,
          prevention_mr: diagnosis.prevention_mr,
          created_at: new Date().toISOString(),
        });
      }

      // 5. Go to the result screen (replace so back skips the scan form)
      router.replace(`/result/${inserted.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'तपासणी अयशस्वी. पुन्हा प्रयत्न करा.';
      setError(msg);
    } finally {
      setSubmitting(false);
      setPhaseMsg('AI तपासणी सुरू करत आहे...');
    }
  }

  if (submitting)
    return (
      <View style={styles.container}>
        <LoadingPhase message={phaseMsg} tip={SCAN_TIPS[tipIdx]} elapsed={elapsed} />
      </View>
    );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleWebFileChange}
        />
      )}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
          <ChevronLeft size={24} color={theme.colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>झाड तपासा</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {voice.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{voice.error}</Text>
            </View>
          )}

          {/* ---- PHOTO ---- */}
          <Text style={styles.stepLabel}>१. पान / फळ / फुलांचा फोटो</Text>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImageUri(null)}
              >
                <X size={16} color={theme.colors.white} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePickerRow}>
              <TouchableOpacity style={styles.imagePickerButton} onPress={takePhoto}>
                <Camera size={20} color={theme.colors.primary[600]} strokeWidth={2} />
                <Text style={styles.imagePickerText}>फोटो काढा</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                <ImageIcon size={20} color={theme.colors.primary[600]} strokeWidth={2} />
                <Text style={styles.imagePickerText}>गॅलरीतून निवडा</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.photoHint}>
            💡 पान किंवा फळ चांगल्या प्रकाशात, जवळून व स्पष्ट दिसेल असा फोटो काढा — निदान अधिक अचूक होईल.
          </Text>

          {/* ---- VOICE SYMPTOMS ---- */}
          <Text style={styles.stepLabel}>२. लक्षणे सांगा (ऐच्छिक)</Text>
          <View style={styles.voiceCard}>
            <TouchableOpacity
              style={[styles.micButton, voice.recording && styles.micButtonRecording]}
              onPress={handleMicPress}
              disabled={transcribing}
              activeOpacity={0.85}
            >
              {transcribing ? (
                <ActivityIndicator size="small" color={theme.colors.primary[600]} />
              ) : voice.recording ? (
                <Square size={22} color={theme.colors.white} fill={theme.colors.white} />
              ) : (
                <Mic size={22} color={theme.colors.primary[600]} strokeWidth={2} />
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.voiceTitle}>
                {transcribing
                  ? 'ऐकत आहे...'
                  : voice.recording
                    ? `रेकॉर्डिंग... ${voice.elapsed}s (थांबवण्यासाठी दाबा)`
                    : 'मायक्रोफोन दाबा व बोला'}
              </Text>
              <Text style={styles.voiceSubtitle}>मराठी / हिंदी / English</Text>
            </View>
          </View>

          {voiceText && (
            <View style={styles.voiceTextBox}>
              <View style={styles.voiceTextHeader}>
                <Sparkles size={13} color={theme.colors.accent[700]} strokeWidth={2.2} />
                <Text style={styles.voiceTextLabel}>तुम्ही सांगितले:</Text>
                <TouchableOpacity onPress={() => setVoiceText(null)}>
                  <X size={14} color={theme.colors.textTertiary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <Text style={styles.voiceTextBody}>{voiceText}</Text>
            </View>
          )}

          {/* ---- TYPED NOTES ---- */}
          <View style={styles.field}>
            <Text style={styles.label}>
              <FileText size={14} color={theme.colors.textSecondary} /> अधिक माहिती लिहा (ऐच्छिक)
            </Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="उदा. ४-५ दिवसांपासून पाने पिवळी पडत आहेत..."
              placeholderTextColor={theme.colors.textTertiary}
              value={symptomNotes}
              onChangeText={setSymptomNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            activeOpacity={0.9}
          >
            <Send size={20} color={theme.colors.white} strokeWidth={2} />
            <Text style={styles.submitButtonText}>AI कडून तपासा</Text>
          </TouchableOpacity>

          <Text style={styles.aiFootnote}>
            ✨ AI रोग ओळखते, तीव्रता सांगते व मराठीत उपाय सुचवते — सामान्यतः ५–१० सेकंदांत
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// §3: rotating reassurance tips shown while the AI call runs
const SCAN_TIPS = [
  'पानांचे निरीक्षण सुरू…',
  'रोग सूची तपासत आहे…',
  'उपाय तयार करत आहे…',
];

function LoadingPhase({ message, tip, elapsed }: { message: string; tip: string; elapsed: number }) {
  return (
    <SafeAreaView style={[styles.container, styles.loadingWrap]} edges={['top']}>
      <View style={styles.loadingIcon}>
        <Sparkles size={40} color={theme.colors.primary[600]} strokeWidth={2} />
      </View>
      <ActivityIndicator size="large" color={theme.colors.primary[600]} style={{ marginTop: 24 }} />
      <Text style={styles.loadingMsg}>{message}</Text>
      <Text style={styles.loadingTip}>{tip}</Text>
      <Text style={styles.loadingSub}>{elapsed} सेकंद पूर्ण झाले — सामान्यतः ५–१० लागतात</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.page,
  },
  loadingWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMsg: {
    marginTop: 20,
    ...theme.type.h2,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  loadingTip: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    minHeight: 20,
  },
  loadingSub: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textTertiary,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.surface.raised,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    ...theme.type.h2,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.error,
  },
  stepLabel: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    marginBottom: 10,
    marginTop: 20,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 220,
    borderRadius: 14,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imagePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.primary[200],
    backgroundColor: theme.colors.primary[50],
  },
  imagePickerText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary[700],
  },
  photoHint: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textTertiary,
    lineHeight: 18,
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.primary[200],
    backgroundColor: theme.colors.primary[50],
  },
  micButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.surface.raised,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary[200],
  },
  micButtonRecording: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  voiceTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
  },
  voiceSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  voiceTextBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.accent[200],
    backgroundColor: theme.colors.accent[50],
  },
  voiceTextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  voiceTextLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.accent[700],
  },
  voiceTextBody: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  field: {
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.neutral[700],
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textInput: {
    backgroundColor: theme.surface.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textPrimary,
  },
  textArea: {
    minHeight: 90,
    paddingTop: 14,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary[600],
    borderRadius: 12,
    height: 56,
    marginTop: 24,
    shadowColor: theme.colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
  aiFootnote: {
    marginTop: 14,
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
});
