import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { JP } from '@/constants/theme';

export default function AgentTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: JP.brand,
        tabBarInactiveTintColor: JP.muted,
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          borderTopColor: JP.border,
          backgroundColor: JP.card,
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done" color={color} size={size} />
          ),
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
          title: 'Plus',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal-circle" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="scan-qr" options={{ href: null, title: 'Scanner QR' }} />
      <Tabs.Screen name="empreinte" options={{ href: null, title: 'Empreinte' }} />
      <Tabs.Screen name="fiche-membre" options={{ href: null, title: 'Fiche membre' }} />
      <Tabs.Screen name="feuille" options={{ href: null, title: 'Feuille de présence' }} />
      <Tabs.Screen name="membres-verifies" options={{ href: null, title: 'Membres vérifiés' }} />
    </Tabs>
  );
}
