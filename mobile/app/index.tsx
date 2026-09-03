import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { JP } from '@/constants/theme';

/** Redirection initiale selon session / rôle. */
export default function Index() {
  const { user, loading, postLoginPath } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/(auth)/connexion');
      return;
    }
    router.replace(postLoginPath(user) as never);
  }, [loading, user, router, postLoginPath]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: JP.bg }}>
      <ActivityIndicator size="large" color={JP.brand} />
    </View>
  );
}
