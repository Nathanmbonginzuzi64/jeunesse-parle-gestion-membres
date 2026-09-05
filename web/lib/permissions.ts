/** Slugs de permission, alignés sur l'enum `App\Enums\Permission` du backend. */
export const PERMISSIONS = {
  membersView: "members.view",
  membersCreate: "members.create",
  membersUpdate: "members.update",
  membersDelete: "members.delete",
  membersValidate: "members.validate",
  membersChangeStatus: "members.change-status",
  membersExport: "members.export",
  membersViewSensitive: "members.view-sensitive",

  cardsView: "cards.view",
  cardsIssue: "cards.issue",
  cardsRevoke: "cards.revoke",
  cardsVerify: "cards.verify",

  structuresView: "structures.view",
  structuresManage: "structures.manage",
  territoriesManage: "territories.manage",

  activitiesView: "activities.view",
  activitiesManage: "activities.manage",
  attendanceView: "attendance.view",
  attendanceRecord: "attendance.record",

  usersView: "users.view",
  usersManage: "users.manage",
  rolesManage: "roles.manage",

  statisticsView: "statistics.view",
  mapView: "map.view",
  auditView: "audit.view",
  settingsManage: "settings.manage",
  notificationsSend: "notifications.send",
  backupManage: "backup.manage",
  trashView: "trash.view",
  trashManage: "trash.manage",
} as const;

export type PermissionSlug = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_SLUGS = {
  superAdmin: "super-admin",
  adminNational: "admin-national",
  responsableProvincial: "responsable-provincial",
  responsableVille: "responsable-ville",
  responsableLocal: "responsable-local",
  agentVerification: "agent-verification",
  membre: "membre",
} as const;

/** Couleurs de badge par statut de membre, réutilisées partout dans l'interface. */
export const MEMBER_STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200",
  suspended: "bg-red-50 text-red-700 ring-red-200",
  archived: "bg-zinc-100 text-zinc-500 ring-zinc-200",
};

export const CARD_STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200",
  suspended: "bg-amber-50 text-amber-700 ring-amber-200",
  expired: "bg-orange-50 text-orange-700 ring-orange-200",
  lost: "bg-red-50 text-red-700 ring-red-200",
  replaced: "bg-blue-50 text-blue-700 ring-blue-200",
};

export const ACTIVITY_STATUS_STYLES: Record<string, string> = {
  planned: "bg-blue-50 text-blue-700 ring-blue-200",
  ongoing: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  completed: "bg-slate-100 text-slate-600 ring-slate-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
  postponed: "bg-amber-50 text-amber-700 ring-amber-200",
};

export const ATTENDANCE_STATUS_STYLES: Record<string, string> = {
  present: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  late: "bg-amber-50 text-amber-700 ring-amber-200",
  excused: "bg-blue-50 text-blue-700 ring-blue-200",
  absent: "bg-red-50 text-red-700 ring-red-200",
};
