import { ApiError } from "@/lib/api";
import { getToken } from "@/lib/api";
import type { Member, Paginated, StatisticsCharts, StatisticsOverview, VerificationResult } from "@/lib/types";
import type { FingerprintVerifyResult, MemberFingerprint } from "@/lib/fingerprints";
import { FINGERPRINT_SLOTS, generateFingerprintTemplate, matchFingerprint } from "@/lib/fingerprints";
import { getMapConfig } from "@/lib/maps-config";
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

const settingsMock = {
  organization: { name: "Jeunesse Parle", country: "République Démocratique du Congo" },
  membership: { minimum_age: 15, maximum_age: 40 },
  security: { two_factor: false, session_timeout_minutes: 120 },
  notifications: { email: true, sms: false, push: true },
  cards: { duration_months: 24, template: "v1" },
  maintenance: false,
};

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture image impossible."));
    reader.readAsDataURL(file);
  });
}

async function resolveActivityImage(input: Record<string, unknown>): Promise<string | null> {
  const image = input.image;
  if (image instanceof File) return fileToDataUrl(image);
  if (typeof input.image_url === "string" && input.image_url) return input.image_url;
  return null;
}

async function resolveUserPhoto(input: Record<string, unknown>): Promise<string | null> {
  const photo = input.photo;
  if (photo instanceof File) return fileToDataUrl(photo);
  if (typeof input.photo_url === "string" && input.photo_url) return input.photo_url;
  return null;
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
    if (!user.is_active) {
      throw new ApiError(403, "Ce compte est désactivé. Contactez un administrateur.", {
        errors: { login: ["Compte désactivé."] },
      });
    }
    user.last_login_at = new Date().toISOString();
    return { message: "Connexion réussie.", token: `mock.${user.id}`, user } as T;
  }

  if (method === "POST" && path === "/auth/login-fingerprint") {
    return loginWithFingerprint(jsonBody(body)) as T;
  }

  // --- Biométrie contextuelle (WebAuthn / mocks) ---
  if (path.startsWith("/biometrics/")) {
    return handleBiometricsMock(method, path, body) as T;
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
  if (method === "GET" && path === "/public/stats") {
    const kpis = db.statisticsOverview.kpis;
    return {
      members_total: kpis.members.total,
      provinces_covered: kpis.coverage.provinces,
      structures_active: kpis.coverage.structures,
      cards_verified: kpis.cards.active,
      updated_at: new Date().toISOString(),
    } as T;
  }
  if (method === "GET" && path === "/territories/provinces") return { data: db.provinces } as T;
  if (method === "GET" && path === "/territories/cities") {
    const provinceId = Number(query?.province_id);
    return { data: db.cities.filter((city) => !provinceId || city.province_id === provinceId) } as T;
  }
  if (method === "GET" && path === "/territories/districts") {
    const cityId = Number(query?.city_id);
    return { data: db.districts.filter((district) => !cityId || district.city_id === cityId) } as T;
  }
  if (method === "GET" && path === "/territories/communes") {
    const cityId = Number(query?.city_id);
    const districtId = Number(query?.district_id);
    return {
      data: db.communes.filter(
        (commune) =>
          (!cityId || commune.city_id === cityId) &&
          (!districtId || commune.district_id === districtId),
      ),
    } as T;
  }
  if (method === "GET" && (path === "/territories/quartiers" || path === "/territories/zones")) {
    const communeId = Number(query?.commune_id);
    return { data: db.quartiers.filter((quartier) => !communeId || quartier.commune_id === communeId) } as T;
  }
  if (method === "GET" && path === "/territories/avenues") {
    const zoneId = Number(query?.zone_id);
    const communeId = Number(query?.commune_id);
    return {
      data: db.avenues.filter(
        (avenue) =>
          (!zoneId || avenue.zone_id === zoneId) &&
          (!communeId || avenue.commune_id === communeId),
      ),
    } as T;
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

  if (method === "POST" && path === "/members/verify-fingerprint") {
    const memberCode = String(jsonBody(body).member_code ?? "").trim().toUpperCase();
    return verifyFingerprint(memberCode) as T;
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

  if (method === "POST" && path === "/auth/profile") {
    const user = requireUser();
    const input = jsonBody(body);
    if (input.name) user.name = String(input.name);
    if (input.email) user.email = String(input.email);
    if (input.phone !== undefined) user.phone = (input.phone as string) || null;
    const photoUrl = await resolveUserPhoto(input);
    if (photoUrl) user.photo_url = photoUrl;
    return { message: "Profil mis à jour.", user } as T;
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

  if (method === "POST" && path === "/biometrics/member-enroll/options") {
    return {
      options: { publicKey: { challenge: "mock" } },
      enrollment_key: String(jsonBody(body).enrollment_key ?? "mock"),
      context: "MEMBER_ENROLLMENT",
    } as T;
  }

  if (method === "POST" && path === "/biometrics/member-enroll/complete") {
    return {
      ok: true,
      message: "Biométrie enregistrée.",
      enrollment_key: String(jsonBody(body).enrollment_key ?? "mock"),
    } as T;
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
      district: db.districts.find((d) => d.id === Number(input.district_id))
        ? { id: Number(input.district_id), name: db.districts.find((d) => d.id === Number(input.district_id))!.name }
        : null,
      commune: db.communes.find((c) => c.id === Number(input.commune_id))
        ? { id: Number(input.commune_id), name: db.communes.find((c) => c.id === Number(input.commune_id))!.name }
        : null,
      quartier: db.quartiers.find((q) => q.id === Number(input.zone_id ?? input.quartier_id))
        ? {
            id: Number(input.zone_id ?? input.quartier_id),
            name: db.quartiers.find((q) => q.id === Number(input.zone_id ?? input.quartier_id))!.name,
          }
        : null,
      zone: db.quartiers.find((q) => q.id === Number(input.zone_id ?? input.quartier_id))
        ? {
            id: Number(input.zone_id ?? input.quartier_id),
            name: db.quartiers.find((q) => q.id === Number(input.zone_id ?? input.quartier_id))!.name,
          }
        : null,
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
  if (method === "POST" && path === "/territories/districts") {
    const input = jsonBody(body);
    const city = db.cities.find((c) => c.id === Number(input.city_id));
    const item = {
      id: db.districts.length + 1,
      city_id: Number(input.city_id),
      province_id: city?.province_id ?? Number(input.province_id),
      name: String(input.name ?? "District"),
      type: String(input.type ?? "district"),
    };
    db.districts.push(item);
    return { message: "District ajouté.", data: item } as T;
  }
  if (method === "POST" && path === "/territories/communes") {
    const input = jsonBody(body);
    const city = db.cities.find((c) => c.id === Number(input.city_id));
    const item = {
      id: db.communes.length + 1,
      city_id: Number(input.city_id),
      province_id: city?.province_id ?? Number(input.province_id),
      district_id: input.district_id ? Number(input.district_id) : null,
      name: String(input.name ?? "Commune"),
      type: String(input.type ?? "commune"),
    };
    db.communes.push(item);
    return { message: "Commune ajoutée.", data: item } as T;
  }
  if (method === "POST" && (path === "/territories/quartiers" || path === "/territories/zones")) {
    const input = jsonBody(body);
    const commune = db.communes.find((c) => c.id === Number(input.commune_id));
    const item = {
      id: db.quartiers.length + 1,
      commune_id: Number(input.commune_id),
      district_id: commune?.district_id ?? (input.district_id ? Number(input.district_id) : null),
      city_id: commune?.city_id ?? Number(input.city_id),
      province_id: commune?.province_id ?? Number(input.province_id),
      name: String(input.name ?? "Quartier"),
      type: String(input.type ?? "quartier"),
    };
    db.quartiers.push(item);
    db.zones.push(item);
    return { message: "Quartier ajouté.", data: item } as T;
  }
  if (method === "POST" && path === "/territories/avenues") {
    const input = jsonBody(body);
    const quartier = db.quartiers.find((q) => q.id === Number(input.zone_id));
    const item = {
      id: db.avenues.length + 1,
      zone_id: Number(input.zone_id),
      commune_id: quartier?.commune_id ?? Number(input.commune_id),
      city_id: quartier?.city_id ?? Number(input.city_id),
      province_id: quartier?.province_id ?? Number(input.province_id),
      name: String(input.name ?? "Avenue"),
      number: (input.number as string) ?? null,
      direction: (input.direction as string) ?? null,
      reference_stop: (input.reference_stop as string) ?? null,
    };
    db.avenues.push(item);
    return { message: "Avenue ajoutée.", data: item } as T;
  }
  if (method === "GET" && path === "/territories/tree") {
    const structuresForAvenue = (avenueId: number) =>
      db.structures.filter((s) => (s as { avenue?: { id: number } }).avenue?.id === avenueId);
    const structuresForQuartier = (quartierId: number) =>
      db.structures.filter(
        (s) =>
          (s.quartier?.id ?? s.zone?.id) === quartierId &&
          !(s as { avenue?: { id: number } }).avenue?.id,
      );
    const structuresForCommune = (communeId: number) =>
      db.structures.filter(
        (s) => s.commune?.id === communeId && !s.quartier?.id && !s.zone?.id,
      );
    const structuresForDistrict = (districtId: number) =>
      db.structures.filter(
        (s) => s.district?.id === districtId && !s.commune?.id,
      );
    const structuresForCity = (cityId: number, provinceId: number) =>
      db.structures.filter(
        (s) =>
          s.city?.id === cityId &&
          s.province?.id === provinceId &&
          !s.district?.id &&
          !s.commune?.id,
      );

    return {
      data: db.provinces.map((province) => ({
        ...province,
        cities: db.cities
          .filter((city) => city.province_id === province.id)
          .map((city) => ({
            ...city,
            districts: db.districts
              .filter((district) => district.city_id === city.id)
              .map((district) => ({
                ...district,
                communes: db.communes
                  .filter((commune) => commune.district_id === district.id)
                  .map((commune) => ({
                    ...commune,
                    quartiers: db.quartiers
                      .filter((quartier) => quartier.commune_id === commune.id)
                      .map((quartier) => ({
                        ...quartier,
                        avenues: db.avenues
                          .filter((avenue) => avenue.zone_id === quartier.id)
                          .map((avenue) => ({
                            ...avenue,
                            structures: structuresForAvenue(avenue.id),
                          })),
                        structures: structuresForQuartier(quartier.id),
                      })),
                    structures: structuresForCommune(commune.id),
                  })),
                structures: structuresForDistrict(district.id),
              })),
            structures: structuresForCity(city.id, province.id),
          })),
        structures: db.structures.filter(
          (structure) => structure.province?.id === province.id && !structure.city,
        ),
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
    const imageUrl = await resolveActivityImage(input);
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
      image_url: imageUrl,
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
      if (input.capacity !== undefined) activity.capacity = input.capacity ? Number(input.capacity) : null;
      if (input.is_public !== undefined) activity.is_public = Boolean(input.is_public);
      if (input.image instanceof File || input.image_url !== undefined) {
        activity.image_url = await resolveActivityImage(input);
      }
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
    if (method === "POST" && segments[2] === "attendance" && segments[3] === "fingerprint") {
      const input = jsonBody(body);
      const memberCode = String(input.member_code ?? db.members[0]?.member_code ?? "").trim().toUpperCase();
      const verify = verifyFingerprint(memberCode);
      const member = db.members.find((item) => item.member_code === verify.member_code) ?? db.members[0];
      return {
        valid: verify.valid,
        message: verify.valid
          ? `Présence enregistrée : ${verify.full_name} — empreinte reconnue.`
          : verify.message,
        attendance_recorded: verify.valid,
        matched_slot: verify.matched_slot,
        member_code: verify.member_code,
        member_id: verify.member_id,
        full_name: verify.full_name,
        photo_url: member?.photo_url ?? null,
      } as T;
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
    return getMapConfig() as T;
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
    const fingerprints = parseFingerprintsFromBody(body);
    const webauthnEnrollment = parseWebAuthnEnrollmentFromBody(body);
    const photoUrl = await resolveUserPhoto(input);
    const created = db.makeUser({
      id: db.users.length + 1,
      name: String(input.name ?? "Utilisateur"),
      email: String(input.email ?? ""),
      phone: (input.phone as string) ?? null,
      photo_url: photoUrl,
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
      fingerprints,
      fingerprint_enrolled: webauthnEnrollment !== null || fingerprints.length >= FINGERPRINT_SLOTS.length,
    });
    if (input.fingerprint_enrollment === "0") {
      created.fingerprints = [];
      created.fingerprint_enrolled = false;
    }
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
      if (input.photo instanceof File || typeof input.photo_url === "string") {
        const photoUrl = await resolveUserPhoto(input);
        if (photoUrl) user.photo_url = photoUrl;
      }
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
      if (input.fingerprint_enrollment === "0") {
        user.fingerprints = [];
        user.fingerprint_enrolled = false;
      } else {
        const webauthnEnrollment = parseWebAuthnEnrollmentFromBody(body);
        if (webauthnEnrollment) {
          user.fingerprint_enrolled = true;
        } else {
          const fingerprints = parseFingerprintsFromBody(body);
          if (fingerprints.length > 0) {
            user.fingerprints = fingerprints;
            user.fingerprint_enrolled = fingerprints.length >= FINGERPRINT_SLOTS.length;
          }
        }
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
  if (method === "GET" && path === "/permissions") {
    return {
      data: db.ALL_PERMISSIONS.map((slug) => ({
        slug,
        name: slug,
        group: slug.split(".")[0],
      })),
    } as T;
  }
  if (segments[0] === "roles" && segments[1] && segments[2] === "permissions") {
    const role = db.roles.find((item) => String(item.id) === segments[1]);
    if (!role) throw new ApiError(404, "Rôle introuvable.");
    if (role.slug === "super-admin") {
      throw new ApiError(422, "Les droits du super administrateur ne peuvent pas être modifiés.");
    }
    if (method === "PUT") {
      const input = jsonBody(body);
      role.permissions = Array.isArray(input.permissions) ? (input.permissions as string[]) : role.permissions;
      return { message: "Permissions mises à jour.", data: role } as T;
    }
    if (method === "DELETE" && segments[3]) {
      role.permissions = role.permissions.filter((item) => item !== segments[3]);
      return { message: "Permission retirée.", data: role } as T;
    }
  }

  if (method === "GET" && path === "/reports") {
    return {
      scope: { level: 0, role: "Super Admin", province: null, city: null, structure: null },
      reports: [],
      generated_at: new Date().toISOString(),
    } as T;
  }
  if (method === "GET" && path === "/reports/members") {
    const rows = db.members.map((m) => ({
      id: m.id,
      member_code: m.member_code,
      photo_url: m.photo_url ?? null,
      last_name: m.last_name,
      middle_name: m.middle_name,
      first_name: m.first_name,
      full_name: m.full_name,
      gender_label: m.gender_label,
      birth_date: m.birth_date ?? null,
      province: m.province?.name,
      city: m.city?.name,
      district: "Gombe",
      commune: m.commune?.name,
      quartier: m.zone?.name,
      avenue: "Av. Liberation",
      structure: m.structure?.name,
      joined_at: m.joined_at,
      created_at: m.created_at,
      status: m.status,
      status_label: m.status_label,
      card_status_label: m.card?.status_label ?? "Active",
      biometric_enrolled: Boolean(m.fingerprint_enrolled),
    }));
    return {
      ...paginate(rows, query),
      generated_at: new Date().toISOString(),
    } as T;
  }
  if (method === "GET" && segments[0] === "reports" && segments[1] === "members" && segments[2]) {
    const member = memberByParam(segments[2]);
    if (!member) throw new ApiError(404, "Membre introuvable.");
    return {
      member: {
        id: member.id,
        member_code: member.member_code,
        full_name: member.full_name,
        last_name: member.last_name,
        middle_name: member.middle_name,
        first_name: member.first_name,
        status: member.status,
        status_label: member.status_label,
        province: member.province?.name,
        city: member.city?.name,
        commune: member.commune?.name,
        quartier: member.zone?.name,
        structure: member.structure?.name,
        joined_at: member.joined_at,
        card_status_label: member.card?.status_label,
        card_number: member.card?.card_number,
        biometric_enrolled: Boolean(member.fingerprint_enrolled),
      },
      profile: {
        profession: member.profession,
        education_level: member.education_level,
        skills: member.skills ?? [],
        interests: member.interests ?? [],
      },
      activities: db.activities.slice(0, 3).map((a) => ({
        id: a.id,
        code: a.code,
        title: a.title,
        type: a.type,
        type_label: a.type_label,
        starts_at: a.starts_at,
        location: a.location,
      })),
      attendances: [],
      summary: { activities_count: 3, attendances_present: 25, attendances_total: 30, participation_rate: 83 },
      generated_at: new Date().toISOString(),
    } as T;
  }
  if (method === "GET" && path === "/reports/activities") {
    const rows = db.activities.map((a) => ({
      id: a.id,
      code: a.code,
      title: a.title,
      type: a.type,
      type_label: a.type_label,
      organizer: "Admin Nathan",
      starts_at: a.starts_at,
      ends_at: a.ends_at,
      location: a.location,
      province: a.province?.name,
      city: a.city?.name,
      commune: a.commune?.name,
      structure: a.structure?.name,
      status: a.status,
      participants_count: a.members_count ?? 12,
      attendances_count: a.attendances_count ?? 10,
    }));
    return paginate(rows, query) as T;
  }
  if (method === "GET" && path === "/reports/cards") {
    const cards = db.members
      .filter((m) => m.card)
      .map((m, i) => ({
        id: i + 1,
        card_number: m.card!.card_number,
        status: m.card!.status,
        status_label: m.card!.status_label,
        issued_at: m.card!.issued_at,
        expires_at: m.card!.expires_at,
        member: { member_code: m.member_code, full_name: m.full_name },
      }));
    return {
      summary: {
        total: cards.length,
        active: cards.filter((c) => c.status === "active").length,
        expired: 0,
        suspended: 0,
        lost: 0,
        replaced: 0,
        inactive: 0,
      },
      ...paginate(cards, query),
      generated_at: new Date().toISOString(),
    } as T;
  }
  if (method === "GET" && path === "/reports/attendance") {
    return {
      global: {
        active_members: db.members.filter((m) => m.status === "active").length,
        total_records: 450,
        present: 370,
        absent: 80,
        participation_rate: 82,
      },
      by_activity_type: [
        { type: "formation", type_label: "Formation", activities_count: 12, attendances_count: 480, present_count: 460, rate: 96 },
        { type: "conference", type_label: "Conférence", activities_count: 8, attendances_count: 320, present_count: 280, rate: 88 },
        { type: "reunion", type_label: "Réunion", activities_count: 20, attendances_count: 600, present_count: 510, rate: 85 },
      ],
      generated_at: new Date().toISOString(),
    } as T;
  }
  if (method === "GET" && path === "/reports/users") {
    const page = Number(query?.page ?? 1);
    const perPage = Math.min(Number(query?.per_page ?? 10), 100);
    const sorted = [...db.users].sort((a, b) => {
      const aTime = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
      const bTime = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
      return bTime - aTime;
    });
    const total = sorted.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const start = (page - 1) * perPage;
    return {
      summary: {
        total: db.users.length,
        active: db.users.filter((u) => u.is_active).length,
        suspended: db.users.filter((u) => !u.is_active).length,
      },
      by_role: db.roles.map((r) => ({ role: r.name, slug: r.slug, total: r.users_count ?? 1 })),
      recent: sorted.slice(start, start + perPage).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role?.name,
        is_active: u.is_active,
        last_login_at: u.last_login_at,
      })),
      recent_meta: {
        current_page: page,
        last_page: lastPage,
        per_page: perPage,
        total,
      },
      generated_at: new Date().toISOString(),
    } as T;
  }
  if (method === "GET" && path === "/reports/roles") {
    return {
      data: db.roles.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        scope_level: r.scope_level,
        users_count: r.users_count ?? 1,
        permissions: (r.permissions ?? []).map((slug: string) => ({
          slug,
          name: slug.replace(/\./g, " "),
          module: slug.split(".")[0],
        })),
      })),
      generated_at: new Date().toISOString(),
    } as T;
  }

  if (method === "GET" && path === "/audit") {
    const action = String(query?.action ?? "").toLowerCase();
    const q = String(query?.q ?? "").toLowerCase();
    let logs = [...db.auditLogs];
    if (action) logs = logs.filter((log) => log.action.toLowerCase().startsWith(action));
    if (q) {
      logs = logs.filter((log) =>
        [log.action, log.description, log.user?.name, log.subject_type, log.ip_address]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return paginate(logs, query) as T;
  }

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
  if (method === "GET" && path === "/cards/visual") {
    let list = db.members
      .filter((member) => member.card)
      .map((member) => ({
        member_id: member.id,
        member_code: member.member_code,
        full_name: member.full_name,
        card: member.card!,
        render: db.cardRender(member),
      }));
    const q = String(query?.q ?? "").toLowerCase();
    if (q) {
      list = list.filter((item) =>
        [item.full_name, item.member_code, item.card.card_number].join(" ").toLowerCase().includes(q),
      );
    }
    const status = String(query?.status ?? "");
    if (status) list = list.filter((item) => item.card.status === status);
    return paginate(list, query) as T;
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
    return { ...settingsMock } as T;
  }

  if ((method === "POST" || method === "PUT" || method === "PATCH") && path === "/settings") {
    const input = jsonBody(body) as Partial<typeof settingsMock>;
    Object.assign(settingsMock, input);
    if (input.organization) settingsMock.organization = { ...settingsMock.organization, ...input.organization };
    if (input.membership) settingsMock.membership = { ...settingsMock.membership, ...input.membership };
    if (input.security) settingsMock.security = { ...settingsMock.security, ...input.security };
    if (input.notifications) settingsMock.notifications = { ...settingsMock.notifications, ...input.notifications };
    if (input.cards) settingsMock.cards = { ...settingsMock.cards, ...input.cards };
    return { message: "Paramètres enregistrés.", ...settingsMock } as T;
  }

  const newsMocks = getNewsMocks();
  if (method === "GET" && path === "/news") {
    return { data: newsMocks.posts } as T;
  }
  if (method === "GET" && path === "/news/stats") {
    const posts = newsMocks.posts;
    return {
      total_posts: posts.length,
      total_views: posts.reduce((sum, p) => sum + p.views_count, 0),
      total_likes: posts.reduce((sum, p) => sum + p.likes_count, 0),
      total_comments: posts.reduce((sum, p) => sum + p.comments_count, 0),
      total_shares: posts.reduce((sum, p) => sum + p.shares_count, 0),
      top_posts: [...posts]
        .sort((a, b) => b.likes_count - a.likes_count)
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          title: p.title,
          likes_count: p.likes_count,
          views_count: p.views_count,
          comments_count: p.comments_count,
        })),
    } as T;
  }
  if (method === "POST" && path === "/news") {
    requireUser();
    const input = jsonBody(body);
    const mediaType = String(input.media_type ?? "text");
    const externalUrl =
      mediaType === "text" && input.text_background && String(input.text_background) !== "none"
        ? `bg:${String(input.text_background)}`
        : input.external_url
          ? String(input.external_url)
          : null;
    const category = String(input.category ?? "general");
    const post = {
      id: newsMocks.nextId++,
      title: String(input.title ?? "Sans titre"),
      body: String(input.body ?? ""),
      category,
      category_label: category,
      category_badge: category.toUpperCase(),
      media_type: mediaType,
      media_url: null as string | null,
      gallery_urls: [] as string[],
      external_url: mediaType === "text" ? null : externalUrl,
      text_background: mediaType === "text" && externalUrl?.startsWith("bg:") ? externalUrl.slice(3) : null,
      author: currentUser()?.name ?? "Admin",
      author_role: "Super Admin",
      activity: null,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      views_count: 0,
      status: String(input.is_published ?? "1") === "0" || input.is_published === false ? "draft" : "published",
      is_published: !(String(input.is_published ?? "1") === "0" || input.is_published === false),
      created_at: new Date().toISOString(),
      comments: [],
    };
    newsMocks.posts.unshift(post);
    return { message: "Actualité publiée.", data: post } as T;
  }
  if (method === "GET" && segments[0] === "news" && segments[1] && segments.length === 2) {
    const post = newsMocks.posts.find((p) => String(p.id) === segments[1]);
    if (!post) throw new ApiError(404, "Actualité introuvable.");
    post.views_count += 1;
    return { data: post } as T;
  }
  if (method === "POST" && segments[0] === "news" && segments[2] === "react") {
    requireUser();
    const post = newsMocks.posts.find((p) => String(p.id) === segments[1]);
    if (!post) throw new ApiError(404, "Actualité introuvable.");
    const input = jsonBody(body);
    const removing = Boolean(input.remove);
    post.likes_count = Math.max(0, post.likes_count + (removing ? -1 : 1));
    return {
      message: removing ? "Réaction retirée." : "Réaction enregistrée.",
      likes_count: post.likes_count,
      my_reaction: removing ? null : String(input.type ?? "like"),
      reactions: { like: post.likes_count },
    } as T;
  }
  if (method === "POST" && segments[0] === "news" && segments[2] === "comments") {
    requireUser();
    const post = newsMocks.posts.find((p) => String(p.id) === segments[1]);
    if (!post) throw new ApiError(404, "Actualité introuvable.");
    const input = jsonBody(body);
    const comment = {
      id: newsMocks.nextCommentId++,
      body: String(input.body ?? ""),
      author: currentUser()?.name ?? "Membre",
      user_id: currentUser()?.id ?? null,
      likes_count: 0,
      liked: false,
      created_at: new Date().toISOString(),
      replies: [] as Array<Record<string, unknown>>,
    };
    post.comments = post.comments ?? [];
    post.comments.push(comment);
    post.comments_count += 1;
    return { message: "Commentaire publié.", data: comment } as T;
  }
  if (method === "POST" && segments[0] === "news" && segments[1] === "comments" && segments[3] === "like") {
    requireUser();
    const comment = findNewsMockComment(newsMocks, Number(segments[2]));
    if (!comment) throw new ApiError(404, "Commentaire introuvable.");
    const input = jsonBody(body);
    const removing = Boolean(input.remove) || Boolean(comment.liked);
    if (removing) {
      comment.liked = false;
      comment.likes_count = Math.max(0, Number(comment.likes_count ?? 0) - 1);
      return { message: "Like retiré.", likes_count: comment.likes_count, liked: false } as T;
    }
    comment.liked = true;
    comment.likes_count = Number(comment.likes_count ?? 0) + 1;
    return { message: "Commentaire aimé.", likes_count: comment.likes_count, liked: true } as T;
  }
  if (method === "PATCH" && segments[0] === "news" && segments[1] === "comments" && segments[2]) {
    requireUser();
    const comment = findNewsMockComment(newsMocks, Number(segments[2]));
    if (!comment) throw new ApiError(404, "Commentaire introuvable.");
    const input = jsonBody(body);
    comment.body = String(input.body ?? comment.body);
    comment.updated_at = new Date().toISOString();
    return { message: "Commentaire modifié.", data: comment } as T;
  }
  if (method === "DELETE" && segments[0] === "news" && segments[1] === "comments" && segments[2]) {
    requireUser();
    const commentId = Number(segments[2]);
    for (const post of newsMocks.posts) {
      const before = post.comments?.length ?? 0;
      post.comments = (post.comments ?? []).filter((c) => c.id !== commentId);
      if ((post.comments?.length ?? 0) < before) {
        post.comments_count = Math.max(0, post.comments_count - 1);
        return { message: "Commentaire supprimé." } as T;
      }
    }
    throw new ApiError(404, "Commentaire introuvable.");
  }
  if (method === "POST" && segments[0] === "news" && segments[2] === "share") {
    const post = newsMocks.posts.find((p) => String(p.id) === segments[1]);
    if (!post) throw new ApiError(404, "Actualité introuvable.");
    post.shares_count += 1;
    return { message: "Partage enregistré." } as T;
  }

  const jpMocks = getJpMessageMocks();
  if (method === "GET" && path === "/jp-messages") {
    return paginate(jpMocks.messages, query) as T;
  }
  if (method === "POST" && path === "/jp-messages") {
    requireUser();
    const input = jsonBody(body);
    const msg = {
      id: jpMocks.nextId++,
      reference: `JP-MSG-${String(jpMocks.nextId).padStart(4, "0")}`,
      subject: String(input.subject ?? ""),
      category: String(input.category ?? "demande"),
      body: String(input.body ?? ""),
      status: "open",
      source: currentUser()?.member_id ? "member" : "staff",
      created_at: new Date().toISOString(),
      author_label: currentUser()?.name ?? "Utilisateur",
      member: currentUser()?.member_id
        ? {
            member_code: currentUser()?.member_code ?? "JP-RDC-000001",
            full_name: currentUser()?.name ?? "Membre",
          }
        : null,
      replies: [],
    };
    jpMocks.messages.unshift(msg);
    return { message: "Message envoyé.", data: msg } as T;
  }
  if (method === "GET" && segments[0] === "jp-messages" && segments[1] && segments.length === 2) {
    const msg = jpMocks.messages.find((m) => String(m.id) === segments[1]);
    if (!msg) throw new ApiError(404, "Message introuvable.");
    return { data: msg } as T;
  }
  if (method === "POST" && segments[0] === "jp-messages" && segments[2] === "replies") {
    requireUser();
    const msg = jpMocks.messages.find((m) => String(m.id) === segments[1]);
    if (!msg) throw new ApiError(404, "Message introuvable.");
    const input = jsonBody(body);
    const user = currentUser()!;
    const isAdmin = (user.permissions ?? []).includes("users.view");
    msg.replies = msg.replies ?? [];
    msg.replies.push({
      id: jpMocks.nextReplyId++,
      body: String(input.body ?? ""),
      author: user.name,
      is_admin: isAdmin,
      created_at: new Date().toISOString(),
    });
    return { message: "Réponse envoyée." } as T;
  }

  throw new ApiError(404, "Ressource introuvable (mode design).");
}

let newsMockState: {
  nextId: number;
  nextCommentId: number;
  posts: Array<{
    id: number;
    title: string;
    body: string;
    author: string;
    activity: null;
    likes_count: number;
    comments_count: number;
    shares_count: number;
    views_count: number;
    created_at: string;
    comments: Array<{
      id: number;
      body: string;
      author: string;
      user_id?: number | null;
      likes_count?: number;
      liked?: boolean;
      created_at: string;
      updated_at?: string;
      replies?: Array<Record<string, unknown>>;
    }>;
  }>;
} | null = null;

function findNewsMockComment(
  newsMocks: NonNullable<typeof newsMockState>,
  commentId: number,
): Record<string, unknown> | null {
  for (const post of newsMocks.posts) {
    for (const comment of post.comments ?? []) {
      if (comment.id === commentId) return comment as Record<string, unknown>;
      for (const reply of comment.replies ?? []) {
        if (Number(reply.id) === commentId) return reply;
      }
    }
  }
  return null;
}

function getNewsMocks() {
  if (!newsMockState) {
    newsMockState = {
      nextId: 3,
      nextCommentId: 2,
      posts: [
        {
          id: 1,
          title: "Mobilisation nationale — Kinshasa",
          body: "Grande marche prévue samedi à la Gombe. Tous les responsables de cellules sont invités.",
          author: "Coordination JP",
          activity: null,
          likes_count: 42,
          comments_count: 1,
          shares_count: 8,
          views_count: 320,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          comments: [
            {
              id: 1,
              body: "Notre cellule sera présente.",
              author: "Jean M.",
              likes_count: 0,
              liked: false,
              created_at: new Date(Date.now() - 3600000).toISOString(),
              replies: [],
            },
          ],
        },
        {
          id: 2,
          title: "Formation leaders — Lubumbashi",
          body: "Session de formation ce vendredi pour les nouveaux responsables.",
          author: "Admin Provincial",
          activity: null,
          likes_count: 18,
          comments_count: 0,
          shares_count: 3,
          views_count: 95,
          created_at: new Date(Date.now() - 172800000).toISOString(),
          comments: [],
        },
      ],
    };
  }
  return newsMockState;
}

let jpMessageMockState: {
  nextId: number;
  nextReplyId: number;
  messages: Array<{
    id: number;
    reference: string;
    subject: string;
    category: string;
    body: string;
    status: string;
    created_at: string;
    member?: { member_code: string; full_name: string; photo_url?: string | null };
    replies?: Array<{ id: number; body: string; author: string; is_admin: boolean; created_at: string }>;
  }>;
} | null = null;

function getJpMessageMocks() {
  if (!jpMessageMockState) {
    jpMessageMockState = {
      nextId: 2,
      nextReplyId: 2,
      messages: [
        {
          id: 1,
          reference: "JP-MSG-0001",
          subject: "Question sur ma carte membre",
          category: "carte",
          body: "Ma carte n'apparaît pas dans l'application mobile.",
          status: "open",
          created_at: new Date(Date.now() - 7200000).toISOString(),
          member: { member_code: "JP-RDC-000042", full_name: "Marie Kabongo" },
          replies: [
            {
              id: 1,
              body: "Bonjour Marie, nous vérifions votre dossier.",
              author: "Support JP",
              is_admin: true,
              created_at: new Date(Date.now() - 3600000).toISOString(),
            },
          ],
        },
      ],
    };
  }
  return jpMessageMockState;
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
  const cardStatus = member.card?.status;
  const inactive = member.status !== "active" || cardStatus !== "active";
  const expired = cardStatus === "expired";
  const revoked = cardStatus === "suspended" || cardStatus === "replaced";

  let result: VerificationResult["result"] = "valid";
  let message = "Membre vérifié — carte valide.";
  if (!byCode && normalized.replace(/[^A-Za-z0-9]/g, "").length >= 16) {
    result = "valid";
    message = "Membre vérifié — carte valide.";
  } else if (expired) {
    result = "expired";
    message = "Carte expirée — renouvellement requis.";
  } else if (revoked) {
    result = "revoked";
    message = "Carte désactivée ou remplacée.";
  } else if (inactive) {
    result = "inactive";
    message = "Membre ou carte inactive.";
  }

  return {
    result,
    valid: result === "valid",
    message,
    member: {
      member_id: member.id,
      member_code: member.member_code,
      full_name: member.full_name,
      photo_url: member.photo_url,
      gender: member.gender_label,
      province: member.province?.name ?? null,
      structure: member.structure?.name ?? null,
      position: member.position,
      status: member.status_label,
      card_number: member.card?.card_number,
      card_status: member.card?.status_label,
      issued_at: member.card?.issued_at,
      expires_at: member.card?.expires_at,
      phone: member.phone,
      city: member.city,
      fingerprint_enrolled: Boolean(member.fingerprint_enrolled),
      fingerprints_count: member.fingerprints?.length ?? 0,
    },
  };
}

function verifyFingerprint(memberCode: string): FingerprintVerifyResult {
  const member = db.members.find((item) => item.member_code.toUpperCase() === memberCode);
  if (!member) {
    throw new ApiError(404, "Aucun membre ne correspond à cet identifiant.", {
      valid: false,
      message: "Aucun membre ne correspond à cet identifiant.",
      matched_slot: null,
      member_code: memberCode,
      member_id: null,
      full_name: null,
      fingerprints_enrolled: 0,
    });
  }

  const stored = member.fingerprints ?? [];
  if (stored.length < FINGERPRINT_SLOTS.length) {
    throw new ApiError(422, "Empreintes digitales incomplètes pour ce membre.", {
      valid: false,
      message: "Empreintes digitales incomplètes — enregistrement requis (6 doigts).",
      matched_slot: null,
      member_code: member.member_code,
      member_id: member.id,
      full_name: member.full_name,
      fingerprints_enrolled: stored.length,
    });
  }

  const inactive = member.status !== "active";
  if (inactive) {
    throw new ApiError(403, "Membre inactif — empreinte rejetée.", {
      valid: false,
      message: "Membre inactif — vérification biométrique refusée.",
      matched_slot: null,
      member_code: member.member_code,
      member_id: member.id,
      full_name: member.full_name,
      fingerprints_enrolled: stored.length,
    });
  }

  const scannedTemplate = generateFingerprintTemplate(
    `${member.member_code}-${member.id}`,
    "left_index",
  );
  const matched = matchFingerprint(stored, scannedTemplate) ?? stored[0];

  return {
    valid: true,
    message: "Empreinte reconnue — identité confirmée.",
    matched_slot: matched.slot,
    member_code: member.member_code,
    member_id: member.id,
    full_name: member.full_name,
    fingerprints_enrolled: stored.length,
  };
}

function loginWithFingerprint(input: Record<string, unknown>) {
  const login = String(input.login ?? "").trim().toLowerCase();
  if (!login) {
    throw new ApiError(422, "Saisissez votre e-mail ou téléphone.", {
      errors: { login: ["Identifiant requis pour la connexion biométrique."] },
    });
  }

  const user = db.users.find(
    (item) => item.email?.toLowerCase() === login || item.phone === String(input.login ?? "").trim(),
  );

  if (!user) {
    throw new ApiError(422, "Aucun compte ne correspond à cet identifiant.", {
      valid: false,
      message: "Aucun compte ne correspond à cet identifiant.",
    });
  }

  if (!user.is_active) {
    throw new ApiError(403, "Compte désactivé — connexion par empreinte refusée.", {
      valid: false,
      message: "Ce compte est désactivé. Contactez un administrateur.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_active: false,
        role: user.role?.slug ?? null,
        fingerprint_enrolled: Boolean(user.fingerprint_enrolled),
      },
    });
  }

  const stored = user.fingerprints ?? [];
  if (stored.length < FINGERPRINT_SLOTS.length) {
    throw new ApiError(422, "Empreintes non enregistrées pour ce compte.", {
      valid: false,
      message: "Aucune empreinte enregistrée — demandez à un administrateur de configurer la biométrie.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_active: true,
        role: user.role?.slug ?? null,
        fingerprint_enrolled: false,
      },
    });
  }

  const loginSeed = user.email ?? user.phone ?? String(user.id);
  const scannedTemplate = generateFingerprintTemplate(`user-${loginSeed}-${user.id}`, "left_index");
  const matched = matchFingerprint(stored, scannedTemplate) ?? stored[0];

  if (!matched) {
    throw new ApiError(422, "Empreinte non reconnue.", {
      valid: false,
      message: "Empreinte non reconnue — réessayez ou utilisez votre mot de passe.",
    });
  }

  user.last_login_at = new Date().toISOString();

  return {
    valid: true,
    message: user.must_change_password
      ? "Connexion biométrique réussie — vous devez changer votre mot de passe."
      : "Connexion biométrique réussie.",
    token: `mock.${user.id}`,
    user,
  };
}

const mockWebAuthnCredentials: Array<{
  id: number;
  user_id: number;
  device_name: string;
  created_at: string;
  last_used_at: string | null;
}> = [];

function handleBiometricsMock(method: string, path: string, body: unknown) {
  const payload = jsonBody(body);
  const context = String(payload.context ?? "");

  if (method === "POST" && path === "/biometrics/register/options") {
    requireUser();
    return { options: { publicKey: { challenge: "mock" } }, context: "BIOMETRIC_REGISTRATION" };
  }

  if (method === "POST" && path === "/biometrics/register") {
    const user = requireUser();
    const row = {
      id: mockWebAuthnCredentials.length + 1,
      user_id: user.id,
      device_name: String(payload.device_name ?? "Windows Hello (mock)"),
      created_at: new Date().toISOString(),
      last_used_at: null as string | null,
    };
    mockWebAuthnCredentials.push(row);
    user.fingerprint_enrolled = true;
    return { ok: true, message: "Biométrie configurée.", context: "BIOMETRIC_REGISTRATION", credential: row };
  }

  if (method === "GET" && path === "/biometrics/credentials") {
    const user = requireUser();
    return {
      data: mockWebAuthnCredentials
        .filter((item) => item.user_id === user.id)
        .map(({ id, device_name, created_at, last_used_at }) => ({
          id,
          device_name,
          created_at,
          last_used_at,
        })),
    };
  }

  if (method === "DELETE" && path.startsWith("/biometrics/credentials/")) {
    const user = requireUser();
    const id = Number(path.split("/").pop());
    const index = mockWebAuthnCredentials.findIndex((item) => item.id === id && item.user_id === user.id);
    if (index >= 0) mockWebAuthnCredentials.splice(index, 1);
    return { message: "Credential biométrique révoqué." };
  }

  if (method === "POST" && path === "/biometrics/authenticate/options") {
    return {
      options: { publicKey: { challenge: "mock" } },
      challenge_key: "mock",
      context,
    };
  }

  if (method === "POST" && path === "/biometrics/authenticate") {
    const member = db.members[0];
    const user = db.users.find((item) => item.member_id === member?.id) ?? db.users[0];

    if (context === "LOGIN") {
      if (!user?.is_active) {
        throw new ApiError(422, "Ce compte est désactivé.", {
          errors: { credential: ["Ce compte est désactivé."] },
        });
      }
      user.last_login_at = new Date().toISOString();
      return {
        ok: true,
        context: "LOGIN",
        action: "LOGIN",
        message: "Connexion réussie.",
        creates_session: true,
        token: `mock.${user.id}`,
        user,
      };
    }

    if (context === "ATTENDANCE") {
      requireUser();
      return {
        ok: true,
        context: "ATTENDANCE",
        action: "ATTENDANCE",
        message: "Présence enregistrée.",
        creates_session: false,
        attendance: {
          id: 1,
          recorded_at: new Date().toISOString(),
          method: "fingerprint",
        },
        member: {
          id: member.id,
          member_code: member.member_code,
          full_name: member.full_name,
          status: "active",
          status_label: "Actif",
        },
      };
    }

    // MEMBER_VERIFICATION (défaut)
    return {
      ok: true,
      context: "MEMBER_VERIFICATION",
      action: "MEMBER_VERIFICATION",
      message: "Membre identifié.",
      creates_session: false,
      member: {
        id: member.id,
        member_code: member.member_code,
        full_name: member.full_name,
        status: "active",
        status_label: "Actif",
        photo_url: member.photo_url,
        structure: member.structure?.name ?? null,
        province: member.province?.name ?? null,
        card: {
          status: "active",
          status_label: "Valide",
          card_number: member.card?.card_number ?? "JP-CARD-000001",
        },
      },
    };
  }

  throw new ApiError(404, "Route biométrique mock introuvable.");
}

function parseFingerprintsFromBody(body: unknown): MemberFingerprint[] {
  const data = jsonBody(body);
  const raw = data.fingerprints;
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as MemberFingerprint[];
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw as MemberFingerprint[];
  return [];
}

function parseWebAuthnEnrollmentFromBody(body: unknown): Record<string, unknown> | null {
  const data = jsonBody(body);
  const raw = data.webauthn_enrollment;
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return parsed?.enrollment_key ? parsed : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object" && raw !== null && "enrollment_key" in raw) {
    return raw as Record<string, unknown>;
  }
  return null;
}
