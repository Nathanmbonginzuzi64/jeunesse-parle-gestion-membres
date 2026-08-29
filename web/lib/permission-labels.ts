/** Libellés français pour les slugs de permission. */
export const PERMISSION_LABELS: Record<string, string> = {
  "members.view": "Voir les membres",
  "members.create": "Créer un membre",
  "members.update": "Modifier un membre",
  "members.delete": "Supprimer un membre",
  "members.validate": "Valider un membre",
  "members.change-status": "Changer le statut",
  "members.export": "Exporter les membres",
  "members.view-sensitive": "Données sensibles",
  "cards.view": "Voir les cartes",
  "cards.issue": "Émettre une carte",
  "cards.revoke": "Révoquer une carte",
  "cards.verify": "Vérifier une carte",
  "structures.view": "Voir les structures",
  "structures.manage": "Gérer les structures",
  "territories.manage": "Gérer les territoires",
  "activities.view": "Voir les activités",
  "activities.manage": "Gérer les activités",
  "attendance.view": "Voir les présences",
  "attendance.record": "Enregistrer une présence",
  "users.view": "Voir les utilisateurs",
  "users.manage": "Gérer les utilisateurs",
  "roles.manage": "Gérer les rôles",
  "statistics.view": "Voir les statistiques",
  "map.view": "Voir la cartographie",
  "audit.view": "Voir l'audit",
  "settings.manage": "Gérer les paramètres",
  "notifications.send": "Envoyer des notifications",
};

export const PERMISSION_GROUPS: { id: string; label: string; prefix: string }[] = [
  { id: "members", label: "Membres", prefix: "members." },
  { id: "cards", label: "Cartes", prefix: "cards." },
  { id: "structures", label: "Structures & territoires", prefix: "structures." },
  { id: "territories", label: "Territoires", prefix: "territories." },
  { id: "activities", label: "Activités", prefix: "activities." },
  { id: "attendance", label: "Présences", prefix: "attendance." },
  { id: "users", label: "Utilisateurs", prefix: "users." },
  { id: "roles", label: "Rôles", prefix: "roles." },
  { id: "statistics", label: "Statistiques", prefix: "statistics." },
  { id: "map", label: "Cartographie", prefix: "map." },
  { id: "audit", label: "Audit", prefix: "audit." },
  { id: "settings", label: "Paramètres", prefix: "settings." },
  { id: "notifications", label: "Notifications", prefix: "notifications." },
];

export function permissionLabel(slug: string) {
  return PERMISSION_LABELS[slug] ?? slug;
}

export function scopeLevelLabel(level: number) {
  if (level <= 0) return "National";
  if (level === 1) return "Provincial";
  if (level === 2) return "Ville";
  if (level === 3) return "Local";
  return "Membre";
}
