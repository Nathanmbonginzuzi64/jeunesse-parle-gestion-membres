import * as FileSystem from 'expo-file-system/legacy';
import type { AgentHistoryEntry } from '@/lib/agent-types';

const FILE = `${FileSystem.documentDirectory ?? ''}jp_agent_history.json`;
const MAX = 80;

export async function loadAgentHistory(): Promise<AgentHistoryEntry[]> {
  try {
    const info = await FileSystem.getInfoAsync(FILE);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(FILE);
    const parsed = JSON.parse(raw) as AgentHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function pushAgentHistory(
  entry: Omit<AgentHistoryEntry, 'id' | 'at'> & { id?: string; at?: string },
): Promise<AgentHistoryEntry[]> {
  const next: AgentHistoryEntry = {
    id: entry.id ?? `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: entry.at ?? new Date().toISOString(),
    kind: entry.kind,
    title: entry.title,
    subtitle: entry.subtitle,
    ok: entry.ok,
    activityTitle: entry.activityTitle,
    memberCode: entry.memberCode,
  };

  const current = await loadAgentHistory();
  const list = [next, ...current].slice(0, MAX);
  try {
    await FileSystem.writeAsStringAsync(FILE, JSON.stringify(list));
  } catch {
    /* ignore persistence errors */
  }
  return list;
}

export async function clearAgentHistory(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(FILE);
    if (info.exists) await FileSystem.deleteAsync(FILE, { idempotent: true });
  } catch {
    /* ignore */
  }
}
