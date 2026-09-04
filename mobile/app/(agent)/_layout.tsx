import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { ROLE_SLUGS, JP } from '@/constants/theme';

export default function AgentLayout() {
  const { user, loading, hasRole, postLoginPath } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: JP.bg }}>
        <ActivityIndicator color={JP.brand} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/connexion" />;
  }

  if (!hasRole(ROLE_SLUGS.agentVerification)) {
    return <Redirect href={postLoginPath(user)} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profil" />
      <Stack.Screen name="ma-carte" />
      <Stack.Screen name="securite" />
      <Stack.Screen name="cartes" />
      <Stack.Screen name="carte/[memberId]" />
    </Stack>
  );
}
