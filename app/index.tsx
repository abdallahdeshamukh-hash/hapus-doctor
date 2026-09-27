import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { LoadingState } from '@/components/ui';
import { theme } from '@/lib/theme';
import {
  hasRecoveryParams,
  consumeRecoveryParams,
  pathOnly,
  cleanUrl,
} from '@/lib/recovery';

export default function IndexScreen() {
  const { session, profile, loading } = useAuth();
  // Route exactly once. Consuming a recovery token creates a session, which
  // would otherwise re-run this effect and bounce the farmer past the
  // set-a-new-password screen straight into the app.
  const routedRef = useRef(false);

  useEffect(() => {
    if (loading || routedRef.current) return;
    routedRef.current = true;
    let cancelled = false;

    (async () => {
      // GitHub Pages serves 404.html for deep links; it stashes the intended
      // path — and any auth tokens that came with it — then bounces here.
      // Honour it so /result/<id>, /profile and password-recovery links all
      // survive a cold open or a refresh.
      let pending: string | null = null;
      try {
        pending = sessionStorage.getItem('hapus.redirect');
        if (pending) sessionStorage.removeItem('hapus.redirect');
      } catch {
        /* private mode etc. */
      }

      if (cancelled) return;

      if (pending && pending !== '/' && !pending.startsWith('//')) {
        // A recovery link carries its token in the stashed URL. supabase-js
        // cannot see it — its URL detection ran while the browser was still on
        // '/' — so establish the session here, before navigating.
        if (hasRecoveryParams(pending)) {
          await consumeRecoveryParams(pending);
          if (cancelled) return;
          cleanUrl();
        }
        router.replace(pathOnly(pending) as never);
        return;
      }

      if (!session) {
        router.replace('/(auth)');
      } else {
        // All signed-in users of Hapus Doctor are farmers
        router.replace('/(farmer)');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, profile, loading]);

  return (
    <View style={styles.container}>
      <LoadingState message="हपुस डॉक्टर सुरू होत आहे..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.page,
  },
});
