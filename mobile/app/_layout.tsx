import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/lib/auth';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(agent)" />
        <Stack.Screen name="(membre)" />
      </Stack>
      <StatusBar style="dark" />
    </AuthProvider>
  );
}
