import { Stack } from 'expo-router';

export default function MembreLayout() {
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
      <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="jp-message/nouveau" />
      <Stack.Screen name="jp-message/dossier/[id]" />
      <Stack.Screen name="actualite/[id]" />
      <Stack.Screen name="activite/[id]" />
    </Stack>
  );
}
