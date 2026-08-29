/** Empreintes digitales — auriculaire, index et majeur (mains gauche et droite). */

export type FingerprintHand = "left" | "right";
export type FingerprintFinger = "auriculaire" | "index" | "majeur";
export type FingerprintSlot = `${FingerprintHand}_${FingerprintFinger}`;

export interface MemberFingerprint {
  slot: FingerprintSlot;
  hand: FingerprintHand;
  finger: FingerprintFinger;
  template_hash: string;
  captured_at: string;
}

export interface FingerprintSlotMeta {
  slot: FingerprintSlot;
  hand: FingerprintHand;
  finger: FingerprintFinger;
  label: string;
  shortLabel: string;
}

export const FINGERPRINT_SLOTS: FingerprintSlotMeta[] = [
  { slot: "left_auriculaire", hand: "left", finger: "auriculaire", label: "Auriculaire gauche", shortLabel: "Aur. G" },
  { slot: "left_index", hand: "left", finger: "index", label: "Index gauche", shortLabel: "Idx. G" },
  { slot: "left_majeur", hand: "left", finger: "majeur", label: "Majeur gauche", shortLabel: "Maj. G" },
  { slot: "right_auriculaire", hand: "right", finger: "auriculaire", label: "Auriculaire droit", shortLabel: "Aur. D" },
  { slot: "right_index", hand: "right", finger: "index", label: "Index droit", shortLabel: "Idx. D" },
  { slot: "right_majeur", hand: "right", finger: "majeur", label: "Majeur droit", shortLabel: "Maj. D" },
];

export const REQUIRED_FINGERPRINT_COUNT = FINGERPRINT_SLOTS.length;

export type FingerprintCaptureMap = Record<FingerprintSlot, MemberFingerprint | null>;

export function emptyFingerprintMap(): FingerprintCaptureMap {
  return Object.fromEntries(FINGERPRINT_SLOTS.map((item) => [item.slot, null])) as FingerprintCaptureMap;
}

export function fingerprintMapFromList(list: MemberFingerprint[] | undefined | null): FingerprintCaptureMap {
  const map = emptyFingerprintMap();
  for (const item of list ?? []) {
    map[item.slot] = item;
  }
  return map;
}

export function fingerprintListFromMap(map: FingerprintCaptureMap): MemberFingerprint[] {
  return FINGERPRINT_SLOTS.map((item) => map[item.slot]).filter(Boolean) as MemberFingerprint[];
}

export function allFingerprintsCaptured(map: FingerprintCaptureMap): boolean {
  return FINGERPRINT_SLOTS.every((item) => Boolean(map[item.slot]?.template_hash));
}

export function capturedFingerprintCount(map: FingerprintCaptureMap): number {
  return fingerprintListFromMap(map).length;
}

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(8, "0");
}

/** Génère un template mock déterministe (simulateur sans lecteur réel). */
export function generateFingerprintTemplate(seed: string, slot: FingerprintSlot): string {
  return `FP-${slot.replace("_", "-")}-${simpleHash(`${seed}:${slot}`)}`;
}

export function mockMemberFingerprints(memberId: number, memberCode: string): MemberFingerprint[] {
  const seed = `${memberCode}-${memberId}`;
  const capturedAt = "2024-11-02T10:00:00.000Z";
  return FINGERPRINT_SLOTS.map((item) => ({
    slot: item.slot,
    hand: item.hand,
    finger: item.finger,
    template_hash: generateFingerprintTemplate(seed, item.slot),
    captured_at: capturedAt,
  }));
}

export function mockUserFingerprints(userId: number, loginSeed: string): MemberFingerprint[] {
  const seed = `user-${loginSeed}-${userId}`;
  const capturedAt = new Date().toISOString();
  return FINGERPRINT_SLOTS.map((item) => ({
    slot: item.slot,
    hand: item.hand,
    finger: item.finger,
    template_hash: generateFingerprintTemplate(seed, item.slot),
    captured_at: capturedAt,
  }));
}

export interface FingerprintLoginResult {
  valid: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    name: string;
    email: string | null;
    is_active: boolean;
    role: string | null;
    fingerprint_enrolled: boolean;
  };
}

export function matchFingerprint(
  stored: MemberFingerprint[],
  scannedTemplate: string,
): MemberFingerprint | null {
  return stored.find((item) => item.template_hash === scannedTemplate) ?? null;
}

export interface FingerprintVerifyResult {
  valid: boolean;
  message: string;
  matched_slot: FingerprintSlot | null;
  member_code: string | null;
  member_id: number | null;
  full_name: string | null;
  fingerprints_enrolled: number;
}
