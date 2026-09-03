import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BigButton } from '@/components/ui';
import { DocScreen } from '@/components/doc-screen';
import { JP } from '@/constants/theme';
import { PRIVACY_INTRO, PRIVACY_SECTIONS } from '@/lib/legal-content';
import { getWelcomeState, markLegalAccepted } from '@/lib/onboarding';

const OTHER_DOCS = [
  { href: '/(auth)/conditions' as const, icon: 'document-text' as const, label: 'Conditions d’utilisation' },
  { href: '/(auth)/mentions' as const, icon: 'information-circle' as const, label: 'Mentions légales' },
];

export default function ConfidentialiteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [accepted, setAccepted] = useState(false);
  const [already, setAlready] = useState(false);

  useEffect(() => {
    void getWelcomeState().then((state) => setAlready(state.acceptedLegal));
  }, []);

  async function finish() {
    await markLegalAccepted();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(auth)/connexion');
  }

  return (
    <DocScreen
      kicker="Vos données"
      title="Confidentialité"
      intro={PRIVACY_INTRO}
      sections={PRIVACY_SECTIONS}
      onBack={() => {
        if (already) {
          if (router.canGoBack()) router.back();
          else router.replace('/(auth)/connexion');
          return;
        }
        router.replace('/(auth)/bienvenue');
      }}
      footer={
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <Text style={styles.othersLabel}>Autres documents</Text>
          {OTHER_DOCS.map((doc) => (
            <Pressable
              key={doc.href}
              onPress={() => router.push(doc.href)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name={doc.icon} size={18} color={JP.brand} />
              <Text style={styles.rowLabel}>{doc.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={JP.muted} />
            </Pressable>
          ))}

          {already ? (
            <BigButton label="Retour à la connexion" tone="neutral" onPress={() => router.replace('/(auth)/connexion')} />
          ) : (
            <>
              <Pressable
                onPress={() => setAccepted((value) => !value)}
                style={styles.checkRow}
              >
                <View style={[styles.box, accepted && styles.boxOn]}>
                  {accepted ? <Ionicons name="checkmark" size={16} color={JP.white} /> : null}
                </View>
                <Text style={styles.checkText}>
                  J’ai lu la confidentialité et j’accepte les conditions d’utilisation.
                </Text>
              </Pressable>
              <BigButton
                label="Continuer vers la connexion"
                disabled={!accepted}
                onPress={() => void finish()}
              />
            </>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: JP.border,
    backgroundColor: JP.white,
    gap: 8,
  },
  othersLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: JP.muted,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: JP.text,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: JP.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: JP.white,
  },
  boxOn: {
    backgroundColor: JP.brand,
    borderColor: JP.brand,
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: JP.text,
  },
});
