import { ApiError } from "@/lib/api";
import { getToken } from "@/lib/api";
import type { Member, Paginated, StatisticsCharts, StatisticsOverview } from "@/lib/types";
import * as db from "./data";

type Query = Record<string, string | number | boolean | null | undefined>;

interface MockRequest {
  method: string;
  path: string;
  query?: Query;
  body?: unknown;
  anonymous?: boolean;
}

const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

function paginate<T>(items: T[], query?: Query): Paginated<T> {
  const page = Number(query?.page ?? 1);
  const perPage = Number(query?.per_page ?? 20);
  const start = (page - 1) * perPage;
  const slice = items.slice(start, start + perPage);
  return {
    data: slice,
    meta: {
      current_page: page,
      from: items.length ? start + 1 : null,
      last_page: Math.max(1, Math.ceil(items.length / perPage)),
      per_page: perPage,
      to: items.length ? start + slice.length : null,
      total: items.length,
    },
  };
}

function currentUser() {
  const token = getToken();
  const id = token ? Number(token.replace("mock.", "")) : NaN;
  return db.users.find((user) => user.id === id) ?? null;
}

function requireUser() {
  const user = currentUser();
  if (!user) throw new ApiError(401, "Authentification requise.");
  return user;
}

function jsonBody(body: unknown): Record<string, unknown> {
  if (!body) return {};
  if (body instanceof FormData) {
    const record: Record<string, unknown> = {};
    body.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }
  return body as Record<string, unknown>;
}

function memberByParam(id: string) {
  const numeric = Number(id);
  return (
    db.members.find((member) => member.id === numeric || member.member_code === id) ?? null
  );
}

function scaleNumber(value: number, factor: number) {
  return Math.max(1, Math.round(value * factor));
}

function statsFactor(query?: Query) {
  let factor = 1;
  if (query?.structure_id) factor = 0.06;
  else if (query?.commune_id) factor = 0.12;
  else if (query?.city_id) factor = 0.25;
  else if (query?.province_id) factor = 0.38;
  if (query?.status === "active") factor *= 0.79;
  if (query?.status === "pending") factor *= 0.07;
  if (query?.period === "7d") factor *= 0.15;
  if (query?.period === "90d") factor *= 0.72;
  if (query?.period === "12m") factor *= 1;
  return factor;
}

function scaledOverview(query?: Query): StatisticsOverview {
  const factor = statsFactor(query);
  const base = db.statisticsOverview;
  const m = base.kpis.members;
  return {
    ...base,
    scope: {
      ...base.scope,
      province: query?.province_id ? db.provinces.find((p) => p.id === Number(query.province_id))?.name ?? base.scope.province : base.scope.province,
      structure: query?.structure_id ? db.structures.find((s) => s.id === Number(query.structure_id))?.name ?? null : base.scope.structure,
    },
    kpis: {
      ...base.kpis,
      members: {
        ...m,
        total: scaleNumber(m.total, factor),
        active: scaleNumber(m.active, factor),
        pending: scaleNumber(m.pending, factor),
        inactive: scaleNumber(m.inactive, factor),
        suspended: scaleNumber(m.suspended, factor),
        archived: scaleNumber(m.archived, factor),
        new_this_month: scaleNumber(m.new_this_month, factor),
        new_last_30_days: scaleNumber(m.new_last_30_days, factor),
      },
      cards: {
        active: scaleNumber(base.kpis.cards.active, factor),
        issued_this_month: scaleNumber(base.kpis.cards.issued_this_month, factor),
      },
      activities: {
        total: scaleNumber(base.kpis.activities.total, factor),
        upcoming: scaleNumber(base.kpis.activities.upcoming, factor),
      },
      verifications: {
        last_30_days: scaleNumber(base.kpis.verifications.last_30_days, factor),
      },
    },
  };
}

function scaledCharts(query?: Query): StatisticsCharts {
  const factor = statsFactor(query);
  const base = db.statisticsCharts;
  const scaleRows = <T extends { total: number }>(rows: T[]) =>
    rows.map((row) => ({ ...row, total: scaleNumber(row.total, factor) }));
  return {
    ...base,
    registrations_trend: scaleRows(base.registrations_trend),
    by_status: scaleRows(base.by_status),
    by_province: base.by_province.map((row) => ({
      ...row,
      total: scaleNumber(row.total, factor),
      active: scaleNumber(row.active, factor),
    })),
    by_gender: scaleRows(base.by_gender),
    by_age_range: scaleRows(base.by_age_range),
    by_profession: scaleRows(base.by_profession),
    top_skills: scaleRows(base.top_skills),
    by_activity: base.by_activity ? scaleRows(base.by_activity) : [],
  };
}

export async function mockRequest<T>(request: MockRequest): Promise<T> {
  await delay();

  const { method, path, query, body, anonymous } = request;
  const segments = path.replace(/^\//, "").split("/");

  if (method === "POST" && path === "/auth/login") {
    const payload = jsonBody(body);
    const login = String(payload.login ?? "").toLowerCase();
    const user = db.users.find(
      (item) => item.email?.toLowerCase() === login || item.phone === login,
    );
    if (!user) {
      throw new ApiError(422, "Identifiants incorrects.", {
        errors: { login: ["Identifiants incorrects."] },
      });
    }
    return { message: "Connexion réussie.", token: `mock.${user.id}`, user } as T;
  }

  if (method === "POST" && path === "/auth/register") {
    return {
      message: "Votre demande d'adhésion a été enregistrée.",
      member_code: "JP-RDC-00000007",
      token: "mock.8",
      user: db.users[4],
    } as T;
  }

  if (method === "POST" && (path === "/auth/forgot-password" || path === "/auth/reset-password")) {
    return { message: "Si un compte correspond, les instructions de réinitialisation ont été envoyées." } as T;
  }

  if (method === "GET" && path === "/references") return db.references as T;
  if (method === "GET" && path === "/territories/provinces") return { data: db.provinces } as T;
  if (method === "GET" && path === "/territories/cities") {
    const provinceId = Number(query?.province_id);
    return { data: db.cities.filter((city) => !provinceId || city.province_id === provinceId) } as T;
  }
  if (method === "GET" && path === "/territories/communes") {
    const cityId = Number(query?.city_id);
    return { data: db.communes.filter((commune) => !cityId || commune.city_id === cityId) } as T;
  }
  if (method === "GET" && path === "/territories/zones") {
    const communeId = Number(query?.commune_id);
    return { data: db.zones.filter((zone) => !communeId || zone.commune_id === communeId) } as T;
  }
  if (method === "GET" && path === "/territories/structures") {
    const provinceId = Number(query?.province_id);
    return {
      data: db.structures
        .filter((structure) => !provinceId || structure.province?.id === provinceId)
        .map((structure) => ({ id: structure.id, name: structure.name, type: structure.type })),
    } as T;
  }

  if (method === "POST" && path === "/members/verify") {
    const token = String(jsonBody(body).token ?? "");
    return verifyToken(token) as T;
  }

  if (method === "GET" && segments[0] === "verify" && segments[1]) {
    return verifyToken(segments[1]) as T;
  }

  if (method === "POST" && path === "/contact") {
    return { message: "Votre message a été envoyé. Nous vous répondrons rapidement." } as T;
  }

  if (!anonymous) requireUser();

  if (method === "GET" && path === "/auth/me") {
    const user = requireUser();
    const member = user.member_id ? db.members.find((item) => item.id === user.member_id) ?? null : null;
    return { user, member } as T;
  }

  if (method === "POST" && (path === "/auth/logout" || path === "/auth/logout-all")) {
    return { message: "Déconnexion effectuée." } as T;
  }

  if (method === "POST" && path === "/auth/change-password") {
    return { message: "Mot de passe mis à jour." } as T;
  }

  if (method === "GET" && path === "/members") {
    let list = [...db.members];
    const q = String(query?.q ?? "").toLowerCase();
    if (q) {
      list = list.filter((member) =>
        [member.full_name, member.member_code, member.phone, member.email]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    if (query?.status) list = list.filter((member) => member.status === query.status);
    if (query?.province_id) list = list.filter((member) => member.province?.id === Number(query.province_id));
  if (query?.structure_id) list = list.filter((member) => member.structure?.id === Number(query.structure_id));
    if (query?.gender) list = list.filter((member) => member.gender === query.gender);
    return paginate(list, query) as T;
  }

  if (method === "POST" && path === "/members") {
    return { message: "Membre enregistré avec succès.", data: db.members[0] } as T;
  }

  if (method === "POST" && path === "/members/check-duplicates") {
    return { has_duplicates: false, duplicates: [] } as T;
  }

  if (segments[0] === "members" && segments[1]) {
    const member = memberByParam(segments[1]);
    if (!member) throw new ApiError(404, "Ressource introuvable.");

    if (method === "GET" && segments.length === 2) {
      return { data: member, history: [], cards: member.card ? [member.card] : [] } as T;
    }
    if (method === "GET" && segments[2] === "timeline") {
      return { data: db.memberTimeline(member) } as T;
    }
    if (method === "GET" && segments[2] === "card") {
      if (!member.card) throw new ApiError(404, "Aucune carte active pour ce membre.");
      return { data: member.card, render: db.cardRender(member) } as T;
    }
    if (method === "GET" && segments[2] === "cards") {
      return { data: member.card ? [member.card] : [] } as T;
    }
    if (method === "POST" && segments[2] === "validate") {
      member.status = "active";
      member.status_label = "Actif";
      return { message: "Membre validé. Sa carte et son QR code ont été générés.", data: member } as T;
    }
    if (method === "POST" && segments[2] === "status") {
      const status = String(jsonBody(body).status ?? member.status) as Member["status"];
      member.status = status;
      member.status_label = db.references.member_statuses.find((item) => item.value === status)?.label ?? status;
      return { message: "Statut mis à jour.", data: member } as T;
    }
    if (method === "POST" && segments[2] === "card") {
      return { message: "Carte générée avec succès.", data: member.card } as T;
    }
    if (method === "POST" && segments[2] === "cards") {
      return { message: "Ancienne carte désactivée. Une nouvelle carte et un nouveau QR code ont été générés.", data: member.card } as T;
    }
    if (["PUT", "PATCH", "POST"].includes(method) && segments.length === 2) {
      return { message: "Membre mis à jour.", data: member } as T;
    }
    if (method === "DELETE" && segments.length === 2) {
      const index = db.members.findIndex((item) => item.id === member.id);
      if (index >= 0) db.members.splice(index, 1);
      return { message: `Membre ${member.member_code} supprimé définitivement.` } as T;
    }
  }

  if (method === "POST" && path === "/members/bulk-status") {
    const input = jsonBody(body) as { ids?: number[]; status?: string };
    const ids = input.ids ?? [];
    ids.forEach((id) => {
      const member = db.members.find((item) => item.id === id);
      if (member && input.status) {
        member.status = input.status as Member["status"];
        member.status_label =
          db.references.member_statuses.find((item) => item.value === input.status)?.label ?? input.status;
      }
    });
    return { message: `${ids.length} membre(s) mis à jour.` } as T;
  }

  if (method === "GET" && path === "/structures") return paginate(db.structures, query) as T;
  if (method === "POST" && path === "/structures") {
    const input = jsonBody(body);
    const created = {
      id: db.structures.length + 1,
      code: `JP-STR-${String(db.structures.length + 1).padStart(5, "0")}`,
      name: String(input.name ?? "Structure"),
      type: String(input.type ?? "cellule"),
      description: (input.description as string) ?? null,
      address: (input.address as string) ?? null,
      contact_phone: null,
      contact_email: null,
      is_active: true,
      province: db.provinces.find((p) => p.id === Number(input.province_id))
        ? { id: Number(input.province_id), name: db.provinces.find((p) => p.id === Number(input.province_id))!.name }
        : null,
      city: db.cities.find((c) => c.id === Number(input.city_id))
        ? { id: Number(input.city_id), name: db.cities.find((c) => c.id === Number(input.city_id))!.name }
        : null,
      commune: null,
      zone: null,
      leader: null,
      members_count: 0,
      created_at: new Date().toISOString(),
    };
    db.structures.unshift(created);
    return { message: "Structure créée.", data: created } as T;
  }
  if (segments[0] === "structures" && segments[1]) {
    const structure = db.structures.find((item) => String(item.id) === segments[1]);
    if (!structure) throw new ApiError(404, "Ressource introuvable.");
    if (method === "PATCH") {
      const input = jsonBody(body);
      if (input.name) structure.name = String(input.name);
      if (input.type) structure.type = String(input.type);
      if (input.description !== undefined) structure.description = (input.description as string) || null;
      if (input.address !== undefined) structure.address = (input.address as string) || null;
      return { message: "Structure mise à jour.", data: structure } as T;
    }
    if (method === "POST" && segments[2] === "disable") {
      structure.is_active = false;
      return { message: "Structure désactivée." } as T;
    }
  }

  if (method === "POST" && path === "/territories/provinces") {
    const input = jsonBody(body);
    const item = {
      id: db.provinces.length + 1,
      code: String(input.code ?? "PRV"),
      name: String(input.name ?? "Province"),
      chief_town: (input.chief_town as string) ?? null,
      latitude: null,
      longitude: null,
    };
    db.provinces.push(item);
    return { message: "Province ajoutée.", data: item } as T;
  }
  if (method === "POST" && path === "/territories/cities") {
    const input = jsonBody(body);
    const item = {
      id: db.cities.length + 1,
      province_id: Number(input.province_id),
      name: String(input.name ?? "Ville"),
      type: String(input.type ?? "ville"),
    };
    db.cities.push(item);
    return { message: "Ville ajoutée.", data: item } as T;
  }
  if (method === "POST" && path === "/territories/communes") {
    const input = jsonBody(body);
    const city = db.cities.find((c) => c.id === Number(input.city_id));
    const item = {
      id: db.communes.length + 1,
      city_id: Number(input.city_id),
      province_id: city?.province_id ?? Number(input.province_id),
      name: String(input.name ?? "Commune"),
      type: String(input.type ?? "commune"),
    };
    db.communes.push(item);
    return { message: "Commune ajoutée.", data: item } as T;
  }
  if (method === "GET" && path === "/territories/tree") {
    return {
      data: db.provinces.map((province) => ({
        ...province,
        cities: db.cities
          .filter((city) => city.province_id === province.id)
          .map((city) => ({
            ...city,
            communes: db.communes.filter((commune) => commune.city_id === city.id),
            structures: db.structures.filter((structure) => structure.province?.id === province.id && structure.city?.id === city.id),
          })),
        structures: db.structures.filter((structure) => structure.province?.id === province.id && !structure.city),
      })),
    } as T;
  }

  if (method === "GET" && path === "/activities") {
    let list = [...db.activities];
    if (query?.status) list = list.filter((item) => item.status === query.status);
    if (query?.tab === "upcoming") list = list.filter((item) => item.status === "planned" || item.status === "ongoing");
    if (query?.tab === "completed") list = list.filter((item) => item.status === "completed");
    if (query?.tab === "drafts") list = list.filter((item) => item.status === "draft");
    return paginate(list, query) as T;
  }
  if (method === "POST" && path === "/activities") {
    const input = jsonBody(body);
    const created = {
      id: db.activities.length + 1,
      code: `JP-ACT-${String(db.activities.length + 1).padStart(5, "0")}`,
      title: String(input.title ?? "Activité"),
      description: (input.description as string) ?? null,
      type: String(input.type ?? "reunion"),
      type_label: db.references.activity_types.find((t) => t.value === input.type)?.label ?? "Réunion",
      status: "planned",
      status_label: "Planifiée",
      starts_at: (input.starts_at as string) ?? null,
      ends_at: (input.ends_at as string) ?? null,
      location: (input.location as string) ?? null,
      capacity: input.capacity ? Number(input.capacity) : null,
      is_public: Boolean(input.is_public),
      province: db.provinces.find((p) => p.id === Number(input.province_id))
        ? { id: Number(input.province_id), name: db.provinces.find((p) => p.id === Number(input.province_id))!.name }
        : null,
      structure: db.structures.find((s) => s.id === Number(input.structure_id))
        ? { id: Number(input.structure_id), name: db.structures.find((s) => s.id === Number(input.structure_id))!.name }
        : null,
      organizer: { id: requireUser().id, name: requireUser().name },
      participants_count: 0,
      attendances_count: 0,
      created_at: new Date().toISOString(),
    };
    db.activities.unshift(created);
    return { message: "Activité créée.", data: created } as T;
  }
  if (segments[0] === "activities" && segments[1]) {
    const activity = db.activities.find((item) => String(item.id) === segments[1]);
    if (!activity) throw new ApiError(404, "Ressource introuvable.");
    if (method === "PATCH") {
      const input = jsonBody(body);
      if (input.title) activity.title = String(input.title);
      if (input.description !== undefined) activity.description = (input.description as string) || null;
      if (input.type) {
        activity.type = String(input.type);
        activity.type_label = db.references.activity_types.find((t) => t.value === input.type)?.label ?? activity.type_label;
      }
      if (input.starts_at) activity.starts_at = String(input.starts_at);
      if (input.ends_at !== undefined) activity.ends_at = (input.ends_at as string) || null;
      if (input.location !== undefined) activity.location = (input.location as string) || null;
      return { message: "Activité mise à jour.", data: activity } as T;
    }
    if (method === "DELETE") {
      const index = db.activities.findIndex((item) => String(item.id) === segments[1]);
      if (index >= 0) db.activities.splice(index, 1);
      return { message: "Activité supprimée." } as T;
    }
    if (method === "GET" && segments.length === 2) return { data: activity } as T;
    if (method === "GET" && segments[2] === "attendance" && segments[3] === "sheet") {
      return db.attendanceSheet as T;
    }
    if (method === "POST" && segments[2] === "attendance") {
      return { message: "Présence enregistrée : Nathan Mbongi — Présent." } as T;
    }
  }

  if (method === "GET" && path === "/statistics") return scaledOverview(query) as T;
  if (method === "GET" && path === "/statistics/charts") return scaledCharts(query) as T;
  if (method === "GET" && path === "/map/statistics") {
    const payload = { ...db.mapStatistics };
    if (query?.province_id) payload.cities = db.statisticsCharts.by_city;
    if (query?.city_id) payload.communes = [{ id: 1, name: "Kintambo", total: 2400 }];
    return payload as T;
  }
  if (method === "GET" && path === "/map/config") {
    return { provider: "none", configured: false } as T;
  }

  if (method === "GET" && path === "/notifications") return paginate(db.notifications, query) as T;
  if (method === "GET" && path === "/notifications/unread-count") {
    return { count: db.notifications.filter((item) => !item.is_read).length } as T;
  }
  if (method === "POST" && path === "/notifications") {
    const input = jsonBody(body) as { title?: string; body?: string; level?: string };
    const item = {
      id: db.notifications.length + 1,
      type: "manual",
      title: input.title ?? "Notification",
      body: input.body ?? null,
      data: null,
      level: input.level ?? "info",
      read_at: null,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    db.notifications.unshift(item);
    return { message: "Notification envoyée.", data: item } as T;
  }
  if (method === "POST" && path === "/notifications/read-all") {
    db.notifications.forEach((item) => {
      item.is_read = true;
      item.read_at = new Date().toISOString();
    });
    return { message: "Toutes les notifications ont été marquées comme lues.", count: db.notifications.length } as T;
  }
  if (method === "POST" && segments[0] === "notifications" && segments[2] === "read") {
    const item = db.notifications.find((notification) => String(notification.id) === segments[1]);
    if (item) {
      item.is_read = true;
      item.read_at = new Date().toISOString();
    }
    return { message: "Notification marquée comme lue." } as T;
  }

  if (method === "GET" && path === "/users") return paginate(db.users, query) as T;
  if (method === "POST" && path === "/users") {
    const input = jsonBody(body);
    const role = db.roles.find((item) => item.id === Number(input.role_id));
    const created = db.makeUser({
      id: db.users.length + 1,
      name: String(input.name ?? "Utilisateur"),
      email: String(input.email ?? ""),
      phone: (input.phone as string) ?? null,
      role: role ? { slug: role.slug, name: role.name, scope_level: role.scope_level } : { slug: "membre", name: "Membre", scope_level: 4 },
      scope: {
        province_id: input.province_id ? Number(input.province_id) : null,
        province: db.provinces.find((p) => p.id === Number(input.province_id))?.name ?? null,
        city_id: input.city_id ? Number(input.city_id) : null,
        city: db.cities.find((c) => c.id === Number(input.city_id))?.name ?? null,
        commune_id: input.commune_id ? Number(input.commune_id) : null,
        structure_id: input.structure_id ? Number(input.structure_id) : null,
        structure: db.structures.find((s) => s.id === Number(input.structure_id))?.name ?? null,
      },
    });
    db.users.unshift(created);
    return { message: "Compte créé.", data: created } as T;
  }
  if (segments[0] === "users" && segments[1]) {
    const user = db.users.find((item) => String(item.id) === segments[1]);
    if (!user) throw new ApiError(404, "Ressource introuvable.");
    if (method === "PATCH") {
      const input = jsonBody(body);
      if (input.name) user.name = String(input.name);
      if (input.email) user.email = String(input.email);
      if (input.phone !== undefined) user.phone = (input.phone as string) || null;
      if (input.role_id) {
        const role = db.roles.find((item) => item.id === Number(input.role_id));
        if (role) user.role = { slug: role.slug, name: role.name, scope_level: role.scope_level };
      }
      if (input.province_id !== undefined) {
        user.scope.province_id = input.province_id ? Number(input.province_id) : null;
        user.scope.province = db.provinces.find((p) => p.id === Number(input.province_id))?.name ?? null;
      }
      if (input.city_id !== undefined) {
        user.scope.city_id = input.city_id ? Number(input.city_id) : null;
        user.scope.city = db.cities.find((c) => c.id === Number(input.city_id))?.name ?? null;
      }
      if (input.structure_id !== undefined) {
        user.scope.structure_id = input.structure_id ? Number(input.structure_id) : null;
        user.scope.structure = db.structures.find((s) => s.id === Number(input.structure_id))?.name ?? null;
      }
      return { message: "Compte mis à jour.", data: user } as T;
    }
    if (method === "POST" && segments[2] === "disable") {
      user.is_active = false;
      return { message: "Compte désactivé." } as T;
    }
    if (method === "POST" && segments[2] === "reset-password") {
      user.must_change_password = true;
      return { message: "Un e-mail de réinitialisation a été envoyé." } as T;
    }
  }
  if (method === "GET" && path === "/roles") return { data: db.roles } as T;
  if (method === "GET" && path === "/audit") return paginate(db.auditLogs, query) as T;

  if (method === "GET" && path === "/search") {
    const q = String(query?.q ?? "").toLowerCase();
    const members = db.members
      .filter((member) =>
        [member.full_name, member.member_code, member.phone].join(" ").toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((member) => ({
        type: "member",
        id: member.id,
        title: member.full_name,
        subtitle: member.member_code,
        href: `/membres/${member.id}`,
      }));
    const activities = db.activities
      .filter((activity) => activity.title.toLowerCase().includes(q) || activity.code.toLowerCase().includes(q))
      .slice(0, 3)
      .map((activity) => ({
        type: "activity",
        id: activity.id,
        title: activity.title,
        subtitle: activity.code,
        href: `/activites/${activity.id}`,
      }));
    const structures = db.structures
      .filter((structure) => structure.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((structure) => ({
        type: "structure",
        id: structure.id,
        title: structure.name,
        subtitle: structure.type,
        href: "/structures",
      }));
    return { data: [...members, ...activities, ...structures] } as T;
  }

  if (method === "GET" && path === "/cards") {
    const list = db.members.flatMap((member) =>
      member.card
        ? [
            {
              ...member.card,
              member_id: member.id,
              member_code: member.member_code,
              full_name: member.full_name,
              photo_url: member.photo_url,
              province: member.province,
            },
          ]
        : [],
    );
    const status = String(query?.status ?? "");
    const filtered = status ? list.filter((card) => card.status === status) : list;
    return paginate(filtered, query) as T;
  }
  if (method === "POST" && segments[0] === "cards" && segments[2] === "regenerate") {
    const member = db.members.find((item) => item.card && String(item.card.id) === segments[1]);
    if (!member?.card) throw new ApiError(404, "Carte introuvable.");
    member.card.status = "replaced";
    member.card.status_label = "Remplacée";
    member.card = {
      ...member.card,
      id: member.card.id + 100,
      card_number: `JP-CARD-${String(member.id).padStart(6, "0")}`,
      status: "active",
      status_label: "Active",
      issued_at: new Date().toISOString(),
    };
    return { message: "Carte régénérée.", data: member.card } as T;
  }
  if (method === "POST" && segments[0] === "cards" && segments[2] === "revoke") {
    const member = db.members.find((item) => item.card && String(item.card.id) === segments[1]);
    if (!member?.card) throw new ApiError(404, "Carte introuvable.");
    member.card.status = "inactive";
    member.card.status_label = "Inactive";
    return { message: "Carte désactivée." } as T;
  }

  if (method === "POST" && path === "/scan/attendance") {
    const input = jsonBody(body);
    const activityId = Number(input.activity_id);
    const activity = db.activities.find((item) => item.id === activityId);
    if (!activity) throw new ApiError(404, "Activité introuvable.");
    const token = String(input.member_code ?? input.qr_token ?? "");
    const member = db.members.find(
      (item) =>
        item.member_code.toLowerCase() === token.toLowerCase() ||
        item.member_code.toLowerCase() === extractMemberCode(token).toLowerCase(),
    ) ?? db.members[0];
    activity.attendances_count = (activity.attendances_count ?? 0) + 1;
    return {
      message: `Présence enregistrée : ${member.full_name} — Présent.`,
      attendance_recorded: true,
      member: {
        member_code: member.member_code,
        full_name: member.full_name,
        photo_url: member.photo_url,
        status: member.status_label,
        structure: member.structure?.name ?? null,
        province: member.province?.name ?? null,
      },
      activity: { id: activity.id, title: activity.title },
    } as T;
  }

  if (method === "GET" && path === "/settings") {
    return {
      organization: db.references.organization,
      membership: db.references.membership,
      security: { two_factor: false, session_timeout_minutes: 120 },
      notifications: { email: true, sms: false, push: true },
      cards: { duration_months: 24, template: "jp-2026" },
      maintenance: false,
    } as T;
  }

  if (method === "POST" && path === "/settings") {
    return { message: "Paramètres enregistrés." } as T;
  }

  throw new ApiError(404, "Ressource introuvable (mode design).");
}

function extractMemberCode(value: string) {
  const match = value.match(/JP-RDC-\d+/i);
  return match ? match[0].toUpperCase() : value.trim();
}

function verifyToken(token: string) {
  const normalized = token.trim();
  const byCode = db.members.find(
    (member) => member.member_code.toLowerCase() === normalized.toLowerCase(),
  );
  const valid = Boolean(byCode) || normalized.replace(/[^A-Za-z0-9]/g, "").length >= 16;
  if (!valid) {
    throw new ApiError(404, "Aucune carte ne correspond à ce QR code.", {
      result: "not_found",
      valid: false,
      message: "Aucune carte ne correspond à ce QR code.",
      member: null,
    });
  }

  const member = byCode ?? db.members[0];
  const inactive = member.status !== "active" || member.card?.status !== "active";
  return {
    result: inactive ? "inactive" : "valid",
    valid: !inactive,
    message: inactive ? "Carte inactive." : "Membre vérifié.",
    member: {
      member_code: member.member_code,
      full_name: member.full_name,
      photo_url: null,
      gender: member.gender_label,
      province: member.province?.name ?? null,
      structure: member.structure?.name ?? null,
      position: member.position,
      status: member.status_label,
      card_number: member.card?.card_number,
      card_status: member.card?.status_label,
      issued_at: member.card?.issued_at,
      expires_at: member.card?.expires_at,
    },
  };
}
