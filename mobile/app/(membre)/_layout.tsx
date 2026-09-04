import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { JP } from '@/constants/theme';

export default function MembreLayout() {
  const { user, loading, postLoginPath } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/(auth)/connexion');
      return;
    }
    if (
      user.member_status === 'pending' ||
      user.needs_structure_choice ||
      user.needs_profile_completion
    ) {
      router.replace(postLoginPath(user) as never);
    }
  }, [user, loading, router, postLoginPath]);

  if (
    loading ||
    !user ||
    user.member_status === 'pending' ||
    user.needs_structure_choice ||
    user.needs_profile_completion
  ) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: JP.bg }}>
        <ActivityIndicator color={JP.brand} />
      </View>
    );
  }

  return (
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="ma-carte" />
      <Stack.Screen name="profil" />
      <Stack.Screen name="parametres" />
      <Stack.Screen name="parametres/securite" />
      <Stack.Screen name="parametres/confidentialite" />
      <Stack.Screen name="parametres/langue" />
      <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="jp-message/nouveau" />
      <Stack.Screen name="jp-message/dossier/[id]" />
      <Stack.Screen name="actualite/[id]" />
      <Stack.Screen name="activite/[id]" />
    </Stack>
  );
}
