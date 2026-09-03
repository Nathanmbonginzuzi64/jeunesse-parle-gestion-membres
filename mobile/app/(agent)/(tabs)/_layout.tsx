import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { JP } from '@/constants/theme';

export default function AgentTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: JP.brand },
        headerTintColor: JP.white,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: JP.brand,
        tabBarInactiveTintColor: JP.muted,
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          borderTopColor: JP.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="verifier"
        options={{
          title: 'Vérifier',
          tabBarIcon: ({ color, size }) => <Ionicons name="scan" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="presences"
        options={{
          title: 'Présences',
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="historique"
        options={{
          title: 'Historique',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reglages"
        options={{
          title: 'Réglages',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="scan-qr" options={{ href: null, title: 'Scanner QR' }} />
      <Tabs.Screen name="fiche-membre" options={{ href: null, title: 'Fiche membre' }} />
    </Tabs>
  );
}
