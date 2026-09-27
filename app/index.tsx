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
