/** Permissions alignées sur le backend / portail web. */
export const PERMISSIONS = {
  membersView: 'members.view',
  cardsView: 'cards.view',
  cardsVerify: 'cards.verify',
  attendanceView: 'attendance.view',
  attendanceRecord: 'attendance.record',
} as const;

export type PermissionSlug = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
