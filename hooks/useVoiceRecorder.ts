import { useState, useRef, useEffect, useCallback } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { Platform } from 'react-native';

// ------------------------------------------------------------------
// useVoiceRecorder — cross-platform audio recording for voice symptoms.
//
// Uses expo-audio's useAudioRecorder (works on iOS/Android/Web).
// Exposes: recording flag, elapsed seconds, start(), stop() → { uri, mimeType } | null
// Fail-soft: any permission/infra error surfaces via `error` and stops cleanly.
// ------------------------------------------------------------------

export type RecordingResult = { uri: string; mimeType: string } | null;

export function useVoiceRecorder(maxSeconds = 30) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => stopTimer, []);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      if (Platform.OS !== 'web') {
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) {
          setError('मायक्रोफोनची परवानगी आवश्यक आहे.');
          return false;
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      }
      // Note: on web, Chrome may record webm/opus; the edge function passes the
      // mime type to Gemini. Native records m4a/aac which Gemini accepts directly.

      await recorder.prepareToRecordAsync();
      recorder.record();
      setElapsed(0);
      setRecording(true);

      // Auto-stop at max duration so recordings can't grow unbounded
      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          if (s + 1 >= maxSeconds) {
            stop().catch(() => {});
          }
          return s + 1;
        });
      }, 1000);

      return true;
    } catch (err) {
      console.warn('Recording start failed:', err);
      setError('रेकॉर्डिंग सुरू होऊ शकली नाही. लक्षणे टाइप करून सांगा.');
      return false;
    }
  }, [recorder, maxSeconds]);

  const stop = useCallback(async (): Promise<RecordingResult> => {
    stopTimer();
    try {
      if (!recorder.isRecording && !recording) {
        setRecording(false);
        return null;
      }
      await recorder.stop();
      if (Platform.OS !== 'web') {
        await setAudioModeAsync({ allowsRecording: false });
      }
      setRecording(false);
      const uri = recorder.uri;
      if (!uri) return null;

      // HIGH_QUALITY preset → .m4a (aac) everywhere; web fallback is webm
      const mimeType = uri.endsWith('.m4a') || Platform.OS !== 'web' ? 'audio/m4a' : 'audio/webm';
      return { uri, mimeType };
    } catch (err) {
      console.warn('Recording stop failed:', err);
      setRecording(false);
      setError('रेकॉर्डिंग अयशस्वी. लक्षणे टाइप करून सांगा.');
      return null;
    }
  }, [recorder, recording]);

  return { recording, elapsed, error, start, stop, maxSeconds };
}
