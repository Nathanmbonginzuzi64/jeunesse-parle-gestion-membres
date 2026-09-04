import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MembrePageHeader } from '@/components/membre/page-header';
import { SectionHeader } from '@/components/membre/section';
import { AgentActionTile, AgentChip, AgentListCard } from '@/components/agent/agent-ui';
import { VerificationResultCard } from '@/components/agent/verification-result-card';
import { BigButton, Field } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { pushAgentHistory } from '@/lib/agent-history';
import type { VerificationResult } from '@/lib/agent-types';
import { useAuth } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { extractTokenFromQr } from '@/lib/qr-token';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

type Mode = 'identity' | 'attendance';

interface MemberHit {
  id: number;
  member_code: string;
  full_name: string;
  status: string;
  status_label?: string;
  photo_url?: string | null;
  province?: { name: string } | null;
  commune?: { name: string } | null;
  structure?: { name: string } | null;
}

interface ActivityRow {
  id: number;
  title: string;
  code?: string;
}

export default function VerifierScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can } = useAuth();
  const params = useLocalSearchParams<{ activityId?: string; mode?: string; fresh?: string }>();
  const canVerify = can(PERMISSIONS.cardsVerify);
  const canRecord = can(PERMISSIONS.attendanceRecord);
  const canViewMembers = can(PERMISSIONS.membersView);

  const [mode, setMode] = useState<Mode>(
    params.mode === 'attendance' || params.activityId ? 'attendance' : 'identity',
  );
  const [token, setToken] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MemberHit[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [activityId, setActivityId] = useState<number | null>(
    params.activityId ? Number(params.activityId) : null,
  );

  useEffect(() => {
    if (params.fresh === '1' || params.mode === 'identity') {
      setMode('identity');
      setResult(null);
      setError(null);
      setToken('');
    }
  }, [params.fresh, params.mode]);

  const loadActivities = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!canRecord) return;
      const silent = Boolean(opts?.silent);
      try {
        const response = await api.get<{ data: ActivityRow[] }>('/activities/for-attendance', {
          per_page: 40,
        });
        const list = response.data ?? [];
        setActivities(list);
        setActivityId((current) => current ?? list[0]?.id ?? null);
      } catch {
        if (!silent) setActivities([]);
      }
    },
    [canRecord],
  );

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  useBackgroundRefresh(() => loadActivities({ silent: true }), {
    enabled: canRecord,
    intervalMs: 8000,
  });

  useEffect(() => {
    if (params.activityId) {
      setActivityId(Number(params.activityId));
      setMode('attendance');
    }
  }, [params.activityId]);

  useEffect(() => {
    if (mode === 'identity' && !canVerify && canRecord) setMode('attendance');
    if (mode === 'attendance' && !canRecord && canVerify) setMode('identity');
  }, [mode, canVerify, canRecord]);

  const selectedActivity = activities.find((item) => item.id === activityId);

  async function verifyIdentity(source: string) {
    if (!canVerify) {
      Alert.alert('Autorisation', 'Vous n’avez pas la permission de vérifier les cartes.');
      return;
    }
    const value = extractTokenFromQr(source);
    const normalized = value.trim();
    const isMemberCode = /^JP-RDC-/i.test(normalized);
    if (!normalized || (!isMemberCode && normalized.length < 16)) {
      setError('Identifiant ou jeton QR invalide.');
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.post<VerificationResult>('/members/verify', {
        token: value,
      });
      setResult(response);
      await Haptics.notificationAsync(
        response.valid
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
      await pushAgentHistory({
        kind: 'verify',
        ok: Boolean(response.valid),
        title: response.member?.full_name ?? response.message,
        subtitle: response.member?.member_code ?? response.result,
        memberCode: response.member?.member_code,
      });
    } catch (caught) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (caught instanceof ApiError) {
        const payload = caught.payload as unknown as VerificationResult;
        setResult(payload?.result ? payload : null);
        setError(caught.message);
        if (payload?.result) {
          await pushAgentHistory({
            kind: 'verify',
            ok: Boolean(payload.valid),
            title: payload.member?.full_name ?? caught.message,
            subtitle: payload.member?.member_code ?? payload.result,
            memberCode: payload.member?.member_code,
          });
        }
      } else {
        setError('Vérification impossible.');
        setResult(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function searchMembers() {
    if (!canViewMembers) {
      Alert.alert('Autorisation', 'Permission membres.view requise.');
      return;
    }
    if (!q.trim()) {
      Alert.alert('Recherche', 'Saisissez un numéro ou un nom.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.get<{ data: MemberHit[] }>('/members', {
        q: q.trim(),
        per_page: 15,
      });
      setResults(response.data ?? []);
      if ((response.data ?? []).length === 0) {
        Alert.alert('Aucun résultat', 'Aucun membre ne correspond à cette recherche.');
      }
    } catch (err) {
      Alert.alert('Erreur', err instanceof ApiError ? err.message : 'Recherche impossible.');
    } finally {
      setLoading(false);
    }
  }

  function requireActivity(): boolean {
    if (!activityId) {
      Alert.alert('Activité', 'Sélectionnez une activité de pointage.');
      return false;
    }
    return true;
  }

  function openMember(member: MemberHit) {
    router.push({
      pathname: '/(agent)/(tabs)/fiche-membre',
      params: {
        memberId: String(member.id),
        memberCode: member.member_code,
        fullName: member.full_name,
        statusLabel: member.status_label ?? member.status,
        province: member.province?.name ?? '',
        commune: member.commune?.name ?? '',
        structure: member.structure?.name ?? '',
        photoUrl: member.photo_url ?? '',
        activityId: activityId ? String(activityId) : '',
      },
    });
  }

  return (
    <View style={styles.screen}>
      <MembrePageHeader
        title="Vérification"
        subtitle={
          mode === 'identity'
            ? 'Contrôle d’identité carte'
            : 'Pointage sur activité'
        }
        icon="scan-outline"
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 28 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {(canVerify || canRecord) && (
          <View style={styles.modes}>
            {canVerify ? (
              <AgentChip
                label="Identité"
                active={mode === 'identity'}
                onPress={() => setMode('identity')}
              />
            ) : null}
            {canRecord ? (
              <AgentChip
                label="Pointage"
                active={mode === 'attendance'}
                onPress={() => setMode('attendance')}
              />
            ) : null}
          </View>
        )}

        {mode === 'identity' && canVerify ? (
          <>
            <SectionHeader title="Saisie manuelle" />
            <Field
              label="Code / jeton carte"
              placeholder="JP-RDC-… ou jeton QR"
              autoCapitalize="characters"
              value={token}
              onChangeText={setToken}
              onSubmitEditing={() => void verifyIdentity(token)}
            />
            <BigButton
              label="Vérifier l’identité"
              loading={loading}
              onPress={() => void verifyIdentity(token)}
            />
            <View style={{ height: 12 }} />
            <View style={styles.tiles}>
              <AgentActionTile
                icon="qr-code-outline"
                title="Scanner QR"
                subtitle="Identité seule"
                tone="success"
                onPress={() =>
                  router.push({
                    pathname: '/(agent)/(tabs)/scan-qr',
                    params: { mode: 'verify' },
                  })
                }
              />
            </View>
            <View style={{ height: 14 }} />
            <VerificationResultCard result={result} error={error} />
          </>
        ) : null}

        {mode === 'attendance' && canRecord ? (
          <>
            <SectionHeader title="Activité de pointage" />
            {activities.map((activity) => (
              <AgentListCard
                key={activity.id}
                active={activityId === activity.id}
                onPress={() => setActivityId(activity.id)}
              >
                <Text style={styles.activityTitle}>
                  {activityId === activity.id ? `✓ ${activity.title}` : activity.title}
                </Text>
                {activity.code ? <Text style={styles.meta}>{activity.code}</Text> : null}
              </AgentListCard>
            ))}
            {activities.length === 0 ? (
              <Text style={styles.meta}>Aucune activité ouverte.</Text>
            ) : null}

            <SectionHeader title="Enregistrer une présence" />
            <View style={styles.tiles}>
              <AgentActionTile
                icon="camera-outline"
                title="Scanner QR"
                subtitle="Présence auto"
                onPress={() => {
                  if (!requireActivity()) return;
                  router.push({
                    pathname: '/(agent)/(tabs)/scan-qr',
                    params: {
                      mode: 'attendance',
                      activityId: String(activityId),
                      activityTitle: selectedActivity?.title ?? '',
                    },
                  });
                }}
              />
              <AgentActionTile
                icon="finger-print-outline"
                title="Empreinte"
                subtitle="Inscription + présence"
                tone="dark"
                onPress={() => {
                  if (!requireActivity()) return;
                  router.push({
                    pathname: '/(agent)/(tabs)/empreinte',
                    params: {
                      activityId: String(activityId),
                      activityTitle: selectedActivity?.title ?? '',
                    },
                  });
                }}
              />
            </View>

            {activityId ? (
              <>
                <View style={{ height: 12 }} />
                <Pressable
                  style={styles.linkRow}
                  onPress={() =>
                    router.push({
                      pathname: '/(agent)/(tabs)/feuille',
                      params: {
                        activityId: String(activityId),
                        activityTitle: selectedActivity?.title ?? '',
                      },
                    })
                  }
                >
                  <Text style={styles.linkText}>Ouvrir la feuille de présence</Text>
                  <Text style={styles.linkChevron}>→</Text>
                </Pressable>
              </>
            ) : null}

            {canViewMembers ? (
              <>
                <SectionHeader title="Recherche membre" />
                <Field
                  label="Nom ou code"
                  placeholder="JP-RDC-… ou nom"
                  value={q}
                  onChangeText={setQ}
                  onSubmitEditing={() => void searchMembers()}
                  returnKeyType="search"
                />
                <BigButton label="Rechercher" onPress={() => void searchMembers()} loading={loading} />
                <View style={{ marginTop: 8 }}>
                  {results.map((item) => (
                    <AgentListCard key={item.id} onPress={() => openMember(item)}>
                      <Text style={styles.activityTitle}>{item.full_name}</Text>
                      <Text style={styles.code}>{item.member_code}</Text>
                    </AgentListCard>
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: JP.bg },
  content: { paddingHorizontal: 16, paddingTop: 4 },
  modes: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 4 },
  tiles: { flexDirection: 'row', gap: 10 },
  activityTitle: { fontWeight: '800', color: JP.text, fontSize: 14 },
  meta: { marginTop: 2, fontSize: 12, color: JP.muted, fontWeight: '600' },
  code: { marginTop: 2, fontSize: 12, color: JP.brandDark, fontFamily: 'monospace', fontWeight: '700' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: JP.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 14,
  },
  linkText: { fontWeight: '800', color: JP.brand, fontSize: 14 },
  linkChevron: { color: JP.brand, fontWeight: '800', fontSize: 16 },
});
