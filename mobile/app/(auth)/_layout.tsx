import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="bienvenue" options={{ animation: 'fade' }} />
      <Stack.Screen name="confidentialite" />
      <Stack.Screen name="conditions" />
      <Stack.Screen name="mentions" />
      <Stack.Screen name="connexion" />
      <Stack.Screen name="portail-web" />
    </Stack>
  );
}
