/** Contrats de données exposés par l'API Laravel. */

import type { MemberFingerprint } from "@/lib/fingerprints";

export type MemberStatus = "pending" | "active" | "inactive" | "suspended" | "archived";
export type CardStatus = "active" | "inactive" | "suspended" | "expired" | "lost" | "replaced";
export type AttendanceStatusValue = "present" | "absent" | "late" | "excused";

export interface Paginated<T> {
  data: T[];
  links?: { first?: string; last?: string; prev?: string | null; next?: string | null };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export interface NamedRef {
  id: number;
  name: string;
  code?: string;
}

export interface Role {
  slug: string;
  name: string;
  scope_level: number;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  is_active: boolean;
  must_change_password: boolean;
  must_confirm_biometric?: boolean;
  role: Role | null;
  scope: {
    province_id: number | null;
    province?: string | null;
    city_id: number | null;
    city?: string | null;
    commune_id: number | null;
    structure_id: number | null;
    structure?: string | null;
  };
  member_id: number | null;
  member_code?: string | null;
  permissions?: string[];
  fingerprints?: MemberFingerprint[];
  fingerprint_enrolled?: boolean;
  last_login_at: string | null;
  created_at: string | null;
}

export interface MemberCard {
  id: number;
  card_number: string;
  sequence: number;
  status: CardStatus;
  status_label: string;
  status_reason: string | null;
  issued_at: string | null;
  expires_at: string | null;
  is_valid: boolean;
  template_version: string | null;
  created_at: string | null;
}

export interface Member {
  id: number;
  member_code: string;
  full_name: string;
  last_name: string;
  middle_name: string | null;
  first_name: string;
  gender: "M" | "F" | null;
  gender_label: string | null;
  age: number | null;
  photo_url: string | null;

  status: MemberStatus;
  status_label: string;
  status_reason: string | null;

  province?: NamedRef | null;
  city?: NamedRef | null;
  district?: NamedRef | null;
  commune?: NamedRef | null;
  zone?: NamedRef | null;
  quartier?: NamedRef | null;
  structure?: NamedRef | null;

  position: string | null;
  profession: string | null;
  joined_at: string | null;
  created_at: string | null;

  // Champs sensibles : présents uniquement pour les porteurs de la permission.
  phone?: string | null;
  phone_alt?: string | null;
  email?: string | null;
  address?: string | null;
  birth_date?: string | null;
  birth_place?: string | null;
  education_level?: string | null;
  employment_status?: string | null;
  activity_domain?: string | null;
  skills?: string[];
  interests?: string[];
  notes?: string | null;
  validated_at?: string | null;
  consent_given?: boolean;

  /** Empreintes digitales (auriculaire, index, majeur — mains G/D). */
  fingerprints?: MemberFingerprint[];
  fingerprint_enrolled?: boolean;
  has_portal_account?: boolean;

  card?: MemberCard | null;
}

export interface MemberHistoryEntry {
  from: string | null;
  to: string;
  reason: string | null;
  author: string | null;
  at: string | null;
}

export interface TimelineEvent {
  type: "status" | "card" | "attendance" | "verification";
  label: string;
  detail: string | null;
  author: string | null;
  at: string | null;
}

export interface CardRender {
  organization: string;
  country: string;
  member_code: string;
  full_name: string;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  photo_url: string | null;
  structure: string | null;
  province: string | null;
  city: string | null;
  commune: string | null;
  position: string | null;
  status: string;
  card_status: string;
  card_status_label: string;
  issued_at: string | null;
  expires_at: string | null;
  verification_url: string | null;
  qr_svg: string | null;
}

export interface CardVisualItem {
  member_id: number;
  member_code: string;
  full_name: string;
  card: MemberCard;
  render: CardRender;
}

export interface VerificationResult {
  result: "valid" | "not_found" | "revoked" | "expired" | "inactive";
  valid: boolean;
  message: string;
  member: {
    member_id?: number;
    member_code: string;
    full_name: string;
    photo_url: string | null;
    gender: string | null;
    province: string | null;
    structure: string | null;
    position: string | null;
    status: string;
    card_number: string;
    card_status: string;
    issued_at: string | null;
    expires_at: string | null;
    phone?: string | null;
    joined_at?: string | null;
    city?: string | null;
    fingerprint_enrolled?: boolean;
    fingerprints_count?: number;
  } | null;
}

export interface Activity {
  id: number;
  code: string;
  title: string;
  description: string | null;
  type: string;
  type_label: string;
  status: string;
  status_label: string;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  capacity: number | null;
  is_public: boolean;
  /** Image de couverture (affiche / illustration). */
  image_url: string | null;
  province?: NamedRef | null;
  structure?: NamedRef | null;
  organizer?: { id: number; name: string } | null;
  participants_count?: number;
  attendances_count?: number;
  created_at: string | null;
}

export interface AttendanceRow {
  member_id: number;
  member_code: string;
  full_name: string;
  structure: string | null;
  photo_url: string | null;
  status: AttendanceStatusValue | null;
  status_label: string | null;
  method: string | null;
  recorded_at: string | null;
}

export interface AttendanceSheet {
  activity: { id: number; code: string; title: string; starts_at: string | null };
  summary: {
    expected: number;
    present: number;
    late: number;
    excused: number;
    absent: number;
    not_recorded: number;
  };
  rows: AttendanceRow[];
}

export interface Structure {
  id: number;
  code: string;
  name: string;
  type: string;
  description: string | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_active: boolean;
  province?: NamedRef | null;
  city?: NamedRef | null;
  district?: NamedRef | null;
  commune?: NamedRef | null;
  zone?: NamedRef | null;
  quartier?: NamedRef | null;
  leader?: { id: number; full_name: string; member_code: string } | null;
  members_count?: number;
  created_at: string | null;
}

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  level: string;
  read_at: string | null;
  is_read: boolean;
  created_at: string | null;
}

export interface AuditLog {
  id: number;
  action: string;
  description: string | null;
  subject_type: string | null;
  subject_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user: { id: number; name: string } | null;
  created_at: string | null;
}

export interface VerificationLogRow {
  id: number;
  result: string;
  context: string | null;
  member: { member_code: string; full_name: string } | null;
  verified_by: string | null;
  ip_address: string | null;
  created_at: string | null;
}

export interface StatisticsOverview {
  scope: {
    level: number;
    role: string | null;
    province: string | null;
    city: string | null;
    structure: string | null;
  };
  kpis: {
    members: {
      total: number;
      active: number;
      pending: number;
      inactive: number;
      suspended: number;
      archived: number;
      new_this_month: number;
      new_last_30_days: number;
    };
    coverage: { provinces: number; cities: number; districts: number; quartiers: number; structures: number };
    cards: { active: number; issued_this_month: number };
    activities: { total: number; upcoming: number };
    verifications: { last_30_days: number };
  };
  recent: Array<{
    type: string;
    label: string;
    reference: string | null;
    status: string | null;
    at: string | null;
  }>;
}

export interface StatisticsCharts {
  registrations_trend: Array<{ period: string; label: string; total: number }>;
  by_status: Array<{ key: string; label: string; total: number }>;
  by_province: ProvinceStat[];
  by_city: Array<{ id: number; name: string; type: string; total: number }>;
  by_gender: Array<{ key: string; label: string; total: number }>;
  by_age_range: Array<{ label: string; total: number }>;
  by_profession: Array<{ label: string; total: number }>;
  top_skills: Array<{ label: string; total: number }>;
  by_activity?: Array<{ label: string; total: number }>;
}

export interface ProvinceStat {
  id: number;
  name: string;
  code: string;
  latitude: number | null;
  longitude: number | null;
  total: number;
  active: number;
}

export interface MapStatistics {
  total: number;
  provinces: ProvinceStat[];
  cities?: Array<{ id: number; name: string; type: string; total: number }>;
  communes?: Array<{ id: number; name: string; total: number }>;
  generated_at: string;
}

export interface Province {
  id: number;
  code: string;
  name: string;
  chief_town: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface City {
  id: number;
  province_id: number;
  name: string;
  type: string;
}

export interface District {
  id: number;
  city_id: number;
  province_id: number;
  name: string;
  type: string;
}

export interface Commune {
  id: number;
  city_id: number;
  province_id: number;
  district_id?: number | null;
  name: string;
  type: string;
}

/** Quartier — niveau le plus fin avant la structure (alias technique : zone). */
export interface Quartier {
  id: number;
  commune_id: number;
  district_id?: number | null;
  city_id: number;
  province_id: number;
  name: string;
  type: string;
}

/** @deprecated Préférer Quartier — conservé pour compatibilité API. */
export type Zone = Quartier;

export interface Option {
  value: string;
  label: string;
}

export interface References {
  member_statuses: Option[];
  card_statuses: Option[];
  genders: Option[];
  activity_types: Option[];
  activity_statuses: Option[];
  attendance_statuses: Option[];
  structure_types: Option[];
  education_levels: string[];
  employment_statuses: string[];
  organization: { name: string; country: string };
  membership: { minimum_age: number; maximum_age: number };
}

export interface DuplicateMatch {
  id: number;
  member_code: string;
  full_name: string;
  phone?: string | null;
  reason?: string;
  score?: number;
  [key: string]: unknown;
}

export interface RoleDetail {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  scope_level: number;
  users_count: number;
  permissions: string[];
}
