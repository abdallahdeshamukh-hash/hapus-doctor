import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Linking, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { supabase, Scan, SEVERITY_CONFIG, STAGE_CONFIG, TreatmentOption } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { LoadingState, SeverityBadge, StageBadge } from '@/components/ui';
import { cacheLastScan, getCachedLastScan, isSampleScan, setScanReminder, getScanReminder } from '@/lib/offline';
import {
  ChevronLeft,
  Sparkles,
  Volume2,
  Share2,
  Square,
  CheckCircle,
  AlertTriangle,
  FlaskConical,
  Leaf,
  Bell,
  CalendarClock,
  ShieldCheck,
  RotateCcw,
  WifiOff,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  // §4: true when the row could not be fetched (offline) and the locally
  // cached last diagnosis was used instead. Never set on a live fetch.
  const [fromCache, setFromCache] = useState(false);
  // TTS: true when the device has no Devanagari-capable voice — Marathi text
  // would be skipped and the engine would speak only digits/punctuation.
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
  // Local rescan/spray reminder: null = not saved yet on this device.
  const [reminderSaved, setReminderSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const { data, error } = await supabase
          .from('scans')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (!active) return;
        setFromCache(false);

        if (error) {
          // §4: network/permission failure — fall back to the locally cached
          // last diagnosis, but ONLY when it is the same scan id. A live
          // successful fetch always wins; a cache miss shows the not-found
          // screen unchanged.
          console.warn('Scan fetch failed, trying local cache:', error.message);
          const cached = await getCachedLastScan();
          if (!active) return;
          if (cached && cached.id === id) {
            setScan(cached);
            setFromCache(true);
          } else {
            setScan(null);
          }
          setLoading(false);
          return;
        }

        if (data) {
          setScan(data as Scan);
          // Keep the offline fallback fresh; never cache sample rows.
          if (!isSampleScan(data as Scan)) cacheLastScan(data as Scan);
        } else {
          setScan(null);
        }
        setLoading(false);
      })();
      return () => {
        active = false;
        Speech.stop();
      };
    }, [id])
  );

  useEffect(() => { Speech.stop(); }, []);

  // Rescan interval: rescan_after_days is not persisted, so estimate from
  // severity (low→10, medium→8, high/critical→7) — consistent with the
  // edge-function's 5–14 day guidance. Healthy scans need no reminder.
  const rescanDays =
    scan?.is_healthy
      ? null
      : scan?.severity === 'high' || scan?.severity === 'critical'
        ? 7
        : scan?.severity === 'medium'
          ? 8
          : 10;
  const reminderDue = useMemo(() => {
    if (!scan || !rescanDays) return null;
    const d = new Date(new Date(scan.created_at).getTime() + rescanDays * 86_400_000);
    return d;
  }, [scan, rescanDays]);
  const dueMr = reminderDue
    ? reminderDue.toLocaleDateString('mr-IN', { day: 'numeric', month: 'long' })
    : null;

  useEffect(() => {
    if (!scan) return;
    (async () => {
      const saved = await getScanReminder(scan.id);
      setReminderSaved(!!saved);
    })();
  }, [scan]);

  async function handleSaveReminder() {
    if (!scan || !reminderDue) return;
    await setScanReminder({
      scanId: scan.id,
      dueAt: reminderDue.toISOString(),
      diseaseMr: scan.disease_name_mr,
    });
    setReminderSaved(true);
  }


  if (loading) return <LoadingState message="निदान लोड होत आहे..." />;
  if (!scan) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerBox}>
          <Text style={styles.centerText}>ही तपासणी सापडली नाही.</Text>
          <TouchableOpacity style={styles.backHomeButton} onPress={() => router.replace('/(farmer)')}>
            <Text style={styles.backHomeText}>मुख्य पानावर जा</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const sev = scan.severity ? SEVERITY_CONFIG[scan.severity] : null;

  // ---- Marathi speech text (the farmer's ears are the UI) ----
  function buildSpeechText(s: Scan): string {
    const parts: string[] = [];
    if (s.is_healthy) {
      parts.push('बरं झालं! तुमचं झाड निरोगी आहे.');
    } else {
      parts.push(`लक्षणे दिसत आहेत. संभाव्य रोग: ${s.disease_name_mr ?? 'अज्ञात'}.`);
      if (s.description_mr) parts.push(s.description_mr);
    }
    if (s.treatment?.length) {
      parts.push('उपाय खालीलप्रमाणे:');
      s.treatment.forEach((t, i) => {
        const typeLabel = t.type === 'chemical' ? 'रासायनिक उपाय' : 'सेंद्रिय उपाय';
        parts.push(`${i + 1}. ${typeLabel}. औषध ${t.medicine}. प्रमाण ${t.dosage}. ${t.frequency}.`);
        if (t.notes) parts.push(t.notes);
      });
    }
    if (s.prevention_mr?.length) {
      parts.push('प्रतिबंधक उपाय:');
      s.prevention_mr.forEach((p) => parts.push(p));
    }
    return parts.join(' ');
  }

  // A voice can serve this text if it targets Marathi/Hindi (or generic Indian
  // English voices, which on Android typically read Devanagari fine).
  async function hasIndicVoice(): Promise<boolean> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices.some(
        (v: { language: string; name?: string }) =>
        /^mr|^hi|^sa/i.test(v.language) || /marathi|hind/i.test(v.name ?? '')
      );
    } catch {
      return true; // can't check → attempt to speak anyway
    }
  }

  function openCalendar() {
    if (!reminderDue) return;
    const pad = (n: number) => String(n).padStart(2, '0');
    const day = `${reminderDue.getFullYear()}${pad(reminderDue.getMonth() + 1)}${pad(reminderDue.getDate())}`;
    const next = new Date(reminderDue.getTime() + 86_400_000);
    const dayAfter = `${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: scan?.disease_name_mr ? `फवारणी/पुन्हा तपासणी — ${scan.disease_name_mr}` : 'फवारणी/पुन्हा तपासणी',
      dates: `${day}/${dayAfter}`,
      details: 'हपुस डॉक्टर ॲपने सुचवलेली पुन्हा तपासणीची तारीख.',
    });
    Linking.openURL('https://calendar.google.com/calendar/render?' + params.toString()).catch(() => {});
  }

  // WhatsApp-ready plain text: diagnosis + both treatments + prevention.
  function buildShareText(s: Scan): string {
    const lines: string[] = [];
    lines.push('🥭 हपुस डॉक्टर — निदान');
    lines.push(s.is_healthy
      ? 'निदान: झाड निरोगी आहे ✅'
      : `निदान: ${s.disease_name_mr ?? 'रोग'} (${s.disease_name_en ?? ''}) — खात्री ${s.confidence ?? '-'}%`);
    if (!s.is_healthy && s.description_mr) lines.push(s.description_mr);
    (s.treatment ?? []).forEach((t, i) => {
      lines.push('');
      lines.push(`${i + 1}) ${t.type === 'chemical' ? 'रासायनिक' : 'सेंद्रिय'} उपाय`);
      lines.push(`औषध: ${t.medicine}`);
      lines.push(`प्रमाण: ${t.dosage}`);
      lines.push(`वेळापत्रक: ${t.frequency}`);
      if (t.notes) lines.push(`सूचना: ${t.notes}`);
    });
    if (s.prevention_mr?.length) {
      lines.push('');
      lines.push('प्रतिबंधक उपाय:');
      s.prevention_mr.forEach((p) => lines.push('• ' + p));
    }
    lines.push('');
    lines.push('(हपुस डॉक्टर ॲपचे AI निदान — सल्ला म्हणूनच; अंतिम निर्णय कृषी सेवा केंद्राचा)');
    return lines.join('\n');
  }

  async function handleShare() {
    const text = buildShareText(scan!);
    if (Platform.OS === 'web') {
      const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
      if (nav.share) {
        try { await nav.share({ text }); return; } catch { /* user cancelled */ }
      }
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
      return;
    }
    try {
      await Linking.openURL('https://wa.me/?text=' + encodeURIComponent(text));
    } catch { /* no WhatsApp installed */ }
  }

  async function handleSpeak() {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    const text = buildSpeechText(scan!);
    if (!text) return;
    if (!(await hasIndicVoice())) {
      // Without a Devanagari voice the engine speaks only digits/punctuation —
      // tell the farmer plainly instead of playing garbage.
      setVoiceUnavailable(true);
      return;
    }
    setVoiceUnavailable(false);
    setSpeaking(true);
    Speech.speak(text, {
      rate: 0.95,
      pitch: 1.0,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  const treatments = scan.treatment ?? [];
  const chemical = treatments.filter((t) => t.type === 'chemical');
  const organic = treatments.filter((t) => t.type === 'organic');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => {
            Speech.stop();
            router.back();
          }}
          style={styles.navButton}
          accessibilityLabel="मागे जा"
          accessibilityRole="button"
        >
          <ChevronLeft size={24} color={theme.colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>निदान निकाल</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- OFFLINE NOTICE (§4) ---- */}
        {fromCache && (
          <View style={styles.offlineBanner}>
            <WifiOff size={14} color="#92400e" strokeWidth={2.2} />
            <Text style={styles.offlineBannerText}>
              ऑफलाइन — हे निदान फोनवर जतन केलेल्या प्रतितून दाखवले आहे. इंटरनेट परत आल्यावर जुन्या तपासण्या पहा.
            </Text>
          </View>
        )}

        {/* ---- PHOTO ---- */}
        {scan.image_url ? (
          <Image source={{ uri: scan.image_url }} style={styles.photo} />
        ) : null}

        {/* ---- VERDICT CARD ---- */}
        {scan.is_healthy ? (
          <View style={[styles.verdictCard, styles.verdictHealthy]}>
            <View style={styles.verdictIcon}>
              <CheckCircle size={28} color="#16a34a" strokeWidth={2.2} />
            </View>
            <Text style={[styles.verdictTitle, { color: '#16a34a' }]}>झाड निरोगी आहे 🌿</Text>
            {scan.confidence != null && (
              <Text style={styles.verdictConfidence}>{scan.confidence}% खात्री</Text>
            )}
            {scan.description_mr && (
              <Text style={styles.verdictDesc}>{scan.description_mr}</Text>
            )}
          </View>
        ) : (
          <View style={[styles.verdictCard, styles.verdictDisease]}>
            <View style={[styles.verdictIcon, { backgroundColor: '#fef2f2' }]}>
              <AlertTriangle size={28} color="#dc2626" strokeWidth={2.2} />
            </View>
            <View style={styles.verdictBadges}>
              {sev && <SeverityBadge severity={scan.severity} />}
              <StageBadge stage={scan.stage} />
              {scan.confidence != null && (
                <View style={styles.confChip}>
                  <Text style={styles.confChipText}>{scan.confidence}% खात्री</Text>
                </View>
              )}
            </View>
            <Text style={styles.diseaseNameMr}>{scan.disease_name_mr || 'रोग आढळला'}</Text>
            <Text style={styles.diseaseNameEn}>{scan.disease_name_en}</Text>
            {scan.description_mr && (
              <Text style={styles.verdictDesc}>{scan.description_mr}</Text>
            )}
          </View>
        )}

        {/* ---- SPEAK BUTTON ---- */}
        <TouchableOpacity
          style={[styles.speakButton, speaking && styles.speakButtonActive]}
          onPress={handleSpeak}
          activeOpacity={0.85}
        >
          {speaking ? (
            <Square size={20} color={theme.colors.white} fill={theme.colors.white} />
          ) : (
            <Volume2 size={20} color={theme.colors.white} strokeWidth={2.2} />
          )}
          <Text style={styles.speakButtonText}>
            {speaking ? 'थांबवा' : 'उपाय ऐका (मराठी)'}
          </Text>
        </TouchableOpacity>

        {voiceUnavailable && (
          <View style={styles.voiceWarnBox}>
            <Text style={styles.voiceWarnText}>
              या फोनवर मराठी आवाज नाही. उपाय खाली लिहिलेला वाचा, किंवा फोनच्या
              Settings → Language मध्ये मराठी (किंवा हिंदी) आवाज ॲड करा.
            </Text>
          </View>
        )}

        {/* ---- RESCAN REMINDER CARD ---- */}
        {reminderDue && (
          <View style={styles.reminderCard}>
            <View style={styles.reminderRow}>
              <CalendarClock size={18} color="#92400e" strokeWidth={2.2} />
              <Text style={styles.reminderTitle}>पुन्हा तपासणीची आठवण</Text>
            </View>
            <Text style={styles.reminderText}>
              {reminderSaved
                ? `✓ आठवण जतन झाली — ${dueMr} ला (${rescanDays} दिवसांनी) झाड पुन्हा तपासा.`
                : `उपाय सुरू केल्यानंतर ${rescanDays} दिवसांनी — ${dueMr} ला — झाड पुन्हा तपासा.`}
            </Text>
            <View style={styles.reminderActions}>
              {!reminderSaved && (
                <TouchableOpacity style={styles.reminderSaveBtn} onPress={handleSaveReminder} activeOpacity={0.85}>
                  <Bell size={15} color="#92400e" strokeWidth={2.2} />
                  <Text style={styles.reminderSaveText}>आठवण जतन करा</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.reminderCalBtn} onPress={openCalendar} activeOpacity={0.85}>
                <CalendarClock size={15} color="#15803d" strokeWidth={2.2} />
                <Text style={styles.reminderCalText}>कॅलेंडरमध्ये जोडा</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ---- WHATSAPP SHARE ---- */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.85}>
          <Share2 size={18} color="#15803d" strokeWidth={2.2} />
          <Text style={styles.shareButtonText}>उपाय शेअर करा (WhatsApp)</Text>
        </TouchableOpacity>

        {/* ---- TREATMENT ---- */}
        {!scan.is_healthy && treatments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Sparkles size={16} color="#7c3aed" strokeWidth={2.2} />
              <Text style={styles.sectionTitle}>शिफारस केलेले उपाय</Text>
            </View>

            {chemical.length > 0 && (
              <View style={styles.treatmentGroup}>
                <View style={styles.groupHeader}>
                  <FlaskConical size={15} color="#dc2626" strokeWidth={2.2} />
                  <Text style={[styles.groupTitle, { color: '#dc2626' }]}>रासायनिक उपाय</Text>
                </View>
                {chemical.map((t, i) => (
                  <TreatmentCard key={`c${i}`} t={t} accent="#dc2626" bg="#fef2f2" border="#fecaca" />
                ))}
              </View>
            )}

            {organic.length > 0 && (
              <View style={styles.treatmentGroup}>
                <View style={styles.groupHeader}>
                  <Leaf size={15} color="#16a34a" strokeWidth={2.2} />
                  <Text style={[styles.groupTitle, { color: '#16a34a' }]}>सेंद्रिय उपाय</Text>
                </View>
                {organic.map((t, i) => (
                  <TreatmentCard key={`o${i}`} t={t} accent="#16a34a" bg="#f0fdf4" border="#bbf7d0" />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ---- PREVENTION ---- */}
        {scan.prevention_mr && scan.prevention_mr.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <ShieldCheck size={16} color={theme.colors.primary[600]} strokeWidth={2.2} />
              <Text style={styles.sectionTitle}>प्रतिबंधक उपाय</Text>
            </View>
            <View style={styles.preventionCard}>
              {scan.prevention_mr.map((p, i) => (
                <View key={i} style={styles.preventionRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.preventionText}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ---- RESCAN ADVICE + VOICE NOTE ---- */}
        <View style={styles.metaCard}>
          {scan.voice_text ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>तुम्ही सांगितले होते:</Text>
              <Text style={styles.metaValue}>{scan.voice_text}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <CalendarClock size={14} color={theme.colors.textSecondary} strokeWidth={2} />
            <Text style={styles.metaValueSmall}>
              उपाय सुरू केल्यानंतर ७–१० दिवसांनी पुन्हा तपासा — सुधारणा दिसली पाहिजे.
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaValueSmall}>
              {scan.created_at
                ? new Date(scan.created_at).toLocaleString('mr-IN', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </Text>
          </View>
        </View>

        {/* ---- RESCAN ---- */}
        <TouchableOpacity
          style={styles.rescanButton}
          onPress={() => router.replace('/scan')}
          activeOpacity={0.9}
        >
          <RotateCcw size={18} color={theme.colors.white} strokeWidth={2.2} />
          <Text style={styles.rescanText}>पुन्हा तपासा</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          ⚠️ AI निदान हे सल्ला आहे, अंतिम निदान नाही. कीटकनाशके लेबलवरील सूचनांनुसारच वापरा. शंका
          असल्यास कृषी सेवा केंद्राशी सल्ला करा.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function TreatmentCard({
  t,
  accent,
  bg,
  border,
}: {
  t: TreatmentOption;
  accent: string;
  bg: string;
  border: string;
}) {
  return (
    <View style={[styles.treatmentCard, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.medicine, { color: accent }]}>{t.medicine}</Text>
      <View style={styles.treatmentRow}>
        <Text style={styles.treatmentLabel}>प्रमाण:</Text>
        <Text style={styles.treatmentValue}>{t.dosage}</Text>
      </View>
      <View style={styles.treatmentRow}>
        <Text style={styles.treatmentLabel}>वेळापत्रक:</Text>
        <Text style={styles.treatmentValue}>{t.frequency}</Text>
      </View>
      {t.notes ? <Text style={styles.treatmentNotes}>{t.notes}</Text> : null}
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
    textAlign: 'center',
  },
  backHomeButton: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  backHomeText: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    marginTop: 16,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: '#92400e',
    lineHeight: 17,
  },
  verdictCard: {
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  verdictHealthy: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  verdictDisease: {
    backgroundColor: theme.colors.card,
    borderColor: '#fecaca',
  },
  verdictIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  verdictBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 10,
  },
  confChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: theme.colors.neutral[100],
  },
  confChipText: {
    fontSize: 12,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.neutral[700],
  },
  verdictTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    textAlign: 'center',
  },
  verdictConfidence: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  diseaseNameMr: {
    fontSize: 22,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  diseaseNameEn: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  verdictDesc: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
  },
  speakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.accent[600],
    borderRadius: 14,
    height: 54,
    marginTop: 16,
    shadowColor: theme.colors.accent[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  speakButtonActive: {
    backgroundColor: '#dc2626',
  },
  speakButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
  reminderCard: {
    marginTop: 24,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 14,
    padding: 14,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  reminderTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: '#92400e',
  },
  reminderText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: '#78350f',
    lineHeight: 19,
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  reminderSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reminderSaveText: {
    fontSize: 12.5,
    fontFamily: theme.fonts.semiBold,
    color: '#92400e',
  },
  reminderCalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reminderCalText: {
    fontSize: 12.5,
    fontFamily: theme.fonts.semiBold,
    color: '#15803d',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: '#dcfce7',
    borderWidth: 1.5,
    borderColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 12,
  },
  shareButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: '#15803d',
  },
  voiceWarnBox: {
    marginTop: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  voiceWarnText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: '#92400e',
    lineHeight: 19,
  },
  section: {
    marginTop: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
  },
  treatmentGroup: {
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
  },
  treatmentCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  medicine: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    marginBottom: 8,
  },
  treatmentRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  treatmentLabel: {
    width: 90,
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textTertiary,
  },
  treatmentValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textPrimary,
    lineHeight: 19,
  },
  treatmentNotes: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  preventionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 10,
  },
  preventionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary[500],
    marginTop: 8,
  },
  preventionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textPrimary,
    lineHeight: 21,
  },
  metaCard: {
    marginTop: 24,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textSecondary,
  },
  metaValue: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  metaValueSmall: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary[600],
    borderRadius: 12,
    height: 54,
    marginTop: 24,
  },
  rescanText: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
  disclaimer: {
    marginTop: 16,
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textTertiary,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
