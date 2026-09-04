import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Card } from '@/components/ui';
import type { VerificationResult } from '@/lib/agent-types';
import { JP } from '@/constants/theme';

const META: Record<
  VerificationResult['result'],
  { tone: 'success' | 'warning' | 'danger'; label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  valid: { tone: 'success', label: 'Carte valide', icon: 'checkmark-circle' },
  inactive: { tone: 'warning', label: 'Compte inactif', icon: 'alert-circle' },
  expired: { tone: 'warning', label: 'Carte expirée', icon: 'time' },
  revoked: { tone: 'danger', label: 'Carte révoquée', icon: 'shield-outline' },
  not_found: { tone: 'danger', label: 'Introuvable', icon: 'close-circle' },
};

export function VerificationResultCard({
  result,
  error,
}: {
  result: VerificationResult | null;
  error?: string | null;
}) {
  if (!result && !error) {
    return (
      <Card>
        <View style={styles.idle}>
          <Ionicons name="shield-checkmark-outline" size={36} color={JP.brand} />
          <Text style={styles.idleTitle}>En attente de scan</Text>
          <Text style={styles.idleSub}>
            Scannez un QR ou saisissez le code membre (JP-RDC-…) pour vérifier l’identité.
          </Text>
        </View>
      </Card>
    );
  }

  const meta = result ? META[result.result] ?? META.not_found : META.not_found;
  const member = result?.member;

  return (
    <Card>
      <View style={styles.header}>
        <Ionicons
          name={meta.icon}
          size={28}
          color={meta.tone === 'success' ? JP.success : meta.tone === 'warning' ? JP.warning : JP.danger}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{meta.label}</Text>
          <Text style={styles.message}>{result?.message ?? error}</Text>
        </View>
        <Badge
          label={result?.valid ? 'OK' : 'KO'}
          tone={result?.valid ? 'success' : 'danger'}
        />
      </View>

      {member ? (
        <View style={styles.member}>
          {member.photo_url ? (
            <Image source={{ uri: member.photo_url }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoFallback]}>
              <Text style={styles.initials}>{(member.full_name || '?').slice(0, 1)}</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.name}>{member.full_name}</Text>
            <Text style={styles.code}>{member.member_code}</Text>
            <Text style={styles.metaLine}>
              {[member.structure, member.province, member.city].filter(Boolean).join(' · ') || '—'}
            </Text>
            <Text style={styles.metaLine}>
              Statut : {member.status}
              {member.card_status ? ` · Carte : ${member.card_status}` : ''}
            </Text>
            {member.card_number ? (
              <Text style={styles.metaLine}>N° carte : {member.card_number}</Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  idle: { alignItems: 'center', paddingVertical: 18, gap: 8 },
  idleTitle: { fontSize: 16, fontWeight: '800', color: JP.text },
  idleSub: { fontSize: 13, color: JP.muted, textAlign: 'center', lineHeight: 18 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '800', color: JP.text },
  message: { marginTop: 2, fontSize: 13, color: JP.muted, lineHeight: 18 },
  member: { flexDirection: 'row', gap: 12, marginTop: 4 },
  photo: { width: 72, height: 72, borderRadius: 16, backgroundColor: JP.brandLight },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 24, fontWeight: '800', color: JP.brand },
  name: { fontSize: 17, fontWeight: '800', color: JP.text },
  code: { fontSize: 12, fontFamily: 'monospace', color: JP.brandDark, fontWeight: '700' },
  metaLine: { fontSize: 12, color: JP.muted },
});
