import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { LoadingState } from '@/components/ui';
import { theme } from '@/lib/theme';

export default function IndexScreen() {
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // GitHub Pages serves 404.html for deep links, which stores the intended
    // path and bounces here — honor it so /result/<id> and /profile survive
    // a cold open or a refresh.
    try {
      const pending = sessionStorage.getItem('hapus.redirect');
      if (pending) {
        sessionStorage.removeItem('hapus.redirect');
        if (pending !== '/' && !pending.startsWith('//')) {
          router.replace(pending as never);
          return;
        }
      }
    } catch { /* private mode etc. */ }

    if (!session) {
      router.replace('/(auth)');
    } else {
      // All signed-in users of Hapus Doctor are farmers
      router.replace('/(farmer)');
    }
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
    backgroundColor: theme.colors.background,
  },
});
