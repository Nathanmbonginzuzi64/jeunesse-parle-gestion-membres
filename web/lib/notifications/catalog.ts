import type { AppNotification } from "@/lib/types";

export type NotificationCategoryFilter =
  | ""
  | "member"
  | "activity"
  | "presence"
  | "news"
  | "message"
  | "admin"
  | "security";

export const NOTIFICATION_CATEGORIES: Array<{ id: NotificationCategoryFilter; label: string }> = [
  { id: "", label: "Toutes" },
  { id: "activity", label: "Activités" },
  { id: "message", label: "Messages" },
  { id: "news", label: "Actualités" },
  { id: "presence", label: "Présences" },
  { id: "security", label: "Sécurité" },
  { id: "member", label: "Membre" },
  { id: "admin", label: "Administration" },
];

export function resolveNotificationAction(notification: AppNotification): { href: string; label: string } | null {
  const data = notification.data ?? {};
  const action = data.action as string | undefined;

  if (action === "view_activity" && data.activity_id) {
    return { href: `/activites/${data.activity_id}`, label: "Voir l'activité" };
  }
  if (action === "join_activity" && data.activity_id) {
    return { href: `/activites/${data.activity_id}`, label: "Participer" };
  }
  if (action === "view_maps" && data.activity_id) {
    return { href: `/activites/${data.activity_id}`, label: "Voir sur Maps" };
  }
  if (action === "view_news" && data.news_post_id) {
    return { href: `/actualites/${data.news_post_id}`, label: "Voir l'actualité" };
  }
  if (action === "view_chat" && data.conversation_id) {
    return { href: `/jp-message?chat=${data.conversation_id}`, label: "Ouvrir la conversation" };
  }
  if (action === "view_jp_message" && data.jp_message_id) {
    return { href: `/jp-message/${data.jp_message_id}`, label: "Voir le message" };
  }
  if (action === "view_member" && data.member_id) {
    return { href: `/membres/${data.member_id}`, label: "Voir le membre" };
  }
  if (action === "view_card") {
    return { href: `/cartes`, label: "Voir ma carte" };
  }
  if (action === "view_profile" && data.member_code) {
    return { href: `/mon-espace`, label: "Mon espace" };
  }

  return null;
}

export function categoryLabel(category?: string | null): string {
  return NOTIFICATION_CATEGORIES.find((c) => c.id === category)?.label ?? "Général";
}
