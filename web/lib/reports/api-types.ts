import type { Paginated } from "@/lib/types";

export interface ReportHub {
  scope: {
    level: number;
    role?: string;
    province?: string;
    city?: string;
    structure?: string;
  };
  reports: Array<{ id: string; label: string; endpoint: string }>;
  generated_at: string;
}

export interface MemberReportRow {
  id: number;
  member_code: string;
  photo_url: string | null;
  last_name: string;
  middle_name: string | null;
  first_name: string;
  full_name: string;
  gender?: string;
  gender_label?: string;
  birth_date?: string | null;
  phone?: string;
  email?: string;
  province?: string;
  city?: string;
  district?: string;
  commune?: string;
  quartier?: string;
  avenue?: string;
  structure?: string;
  joined_at?: string;
  created_at?: string;
  status: string;
  status_label: string;
  card_status?: string;
  card_status_label?: string;
  card_number?: string;
  biometric_enrolled: boolean;
  supervisor?: { member_code: string; full_name: string } | null;
}

export interface MembersReportResponse extends Paginated<MemberReportRow> {
  generated_at: string;
}

export interface MemberProfileReport {
  member: MemberReportRow;
  profile: {
    education_level?: string;
    profession?: string;
    employment_status?: string;
    activity_domain?: string;
    skills: string[];
    interests: string[];
    address?: string | null;
  };
  activities: Array<{
    id: number;
    code: string;
    title: string;
    type: string;
    type_label: string;
    starts_at?: string;
    location?: string;
    role?: string;
  }>;
  attendances: Array<{
    id: number;
    activity?: string;
    activity_type?: string;
    date?: string;
    location?: string;
    status: string;
    status_label: string;
    method?: string;
    recorded_at?: string;
  }>;
  summary: {
    activities_count: number;
    attendances_present: number;
    attendances_total: number;
    participation_rate: number | null;
  };
  generated_at: string;
}

export interface ActivitiesReportResponse {
  data: Array<{
    id: number;
    code: string;
    title: string;
    type: string;
    type_label: string;
    organizer?: string;
    starts_at?: string;
    ends_at?: string;
    location?: string;
    province?: string;
    city?: string;
    commune?: string;
    structure?: string;
    status: string;
    participants_count: number;
    attendances_count: number;
  }>;
  meta: Paginated<unknown>["meta"];
}

export interface CardsReportResponse {
  summary: {
    total: number;
    active: number;
    expired: number;
    suspended: number;
    lost: number;
    replaced: number;
    inactive: number;
  };
  data: Array<{
    id: number;
    card_number: string;
    status: string;
    status_label: string;
    issued_at?: string;
    expires_at?: string;
    member?: { member_code: string; full_name: string };
  }>;
  meta: Paginated<unknown>["meta"];
  generated_at: string;
}

export interface AttendanceReportResponse {
  global: {
    active_members: number;
    total_records: number;
    present: number;
    absent: number;
    participation_rate: number;
  };
  by_activity_type: Array<{
    type: string;
    type_label: string;
    activities_count: number;
    attendances_count: number;
    present_count: number;
    rate: number;
  }>;
  generated_at: string;
}

export interface UsersReportResponse {
  summary: { total: number; active: number; suspended: number };
  by_role: Array<{ role: string; slug: string; total: number }>;
  recent: Array<{
    id: number;
    name: string;
    email: string;
    role?: string;
    is_active: boolean;
    last_login_at?: string;
  }>;
  recent_meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  generated_at: string;
}

export interface RolesReportResponse {
  data: Array<{
    id: number;
    slug: string;
    name: string;
    description?: string;
    scope_level: number;
    users_count: number;
    permissions: Array<{ slug: string; name: string; module?: string }>;
  }>;
  generated_at: string;
}

export interface ReportFiltersState {
  q: string;
  period: string;
  status: string;
  province_id: number | null;
  city_id: number | null;
  district_id: number | null;
  commune_id: number | null;
  zone_id: number | null;
  structure_id: number | "";
  registered_from: string;
  registered_to: string;
  from: string;
  to: string;
}

export const EMPTY_REPORT_FILTERS: ReportFiltersState = {
  q: "",
  period: "",
  status: "",
  province_id: null,
  city_id: null,
  district_id: null,
  commune_id: null,
  zone_id: null,
  structure_id: "",
  registered_from: "",
  registered_to: "",
  from: "",
  to: "",
};
