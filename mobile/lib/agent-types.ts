export type VerificationOutcome = 'valid' | 'not_found' | 'revoked' | 'expired' | 'inactive';

export type VerificationResult = {
  result: VerificationOutcome;
  valid: boolean;
  message: string;
  member: {
    member_id?: number;
    member_code: string;
    full_name: string;
    photo_url: string | null;
    gender?: string | null;
    province: string | null;
    city?: string | null;
    structure: string | null;
    position?: string | null;
    status: string;
    card_number?: string;
    card_status: string;
    issued_at?: string | null;
    expires_at?: string | null;
    phone?: string | null;
    fingerprint_enrolled?: boolean;
  } | null;
};

export type AttendanceSheetSummary = {
  expected: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  not_recorded: number;
};

export type AttendanceSheetRow = {
  member_id: number;
  member_code: string;
  full_name: string;
  structure: string | null;
  province?: string | null;
  commune?: string | null;
  member_status_label?: string;
  card_valid?: boolean;
  photo_url: string | null;
  status: string | null;
  status_label: string | null;
  method: string | null;
  recorded_at: string | null;
  recorded_by?: string | null;
};

export type AttendanceSheet = {
  activity: {
    id: number;
    code: string;
    title: string;
    starts_at: string | null;
    location?: string | null;
  };
  summary: AttendanceSheetSummary;
  rows: AttendanceSheetRow[];
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
};

export type AgentHistoryKind = 'verify' | 'attendance';

export type AgentHistoryEntry = {
  id: string;
  kind: AgentHistoryKind;
  at: string;
  title: string;
  subtitle?: string;
  ok: boolean;
  activityTitle?: string;
  memberCode?: string;
};

export type VerificationHistoryItem = {
  id: number;
  result: string;
  context: string | null;
  member: {
    id?: number;
    member_code: string;
    full_name: string;
    photo_url?: string | null;
  } | null;
  verified_by?: string | null;
  created_at: string | null;
};

export type AgentPresentRow = {
  id: number;
  status: string | null;
  status_label: string | null;
  method: string | null;
  recorded_at: string | null;
  recorded_by?: string | null;
  member: {
    id: number;
    member_code: string;
    full_name: string;
    structure?: string | null;
    photo_url?: string | null;
  } | null;
  activity?: {
    id: number;
    code?: string;
    title: string;
    starts_at?: string | null;
    location?: string | null;
    status?: string | null;
    status_label?: string | null;
    structure?: string | null;
  } | null;
};

export type AgentOngoingActivity = {
  activity: {
    id: number;
    code?: string;
    title: string;
    status?: string | null;
    status_label?: string | null;
    starts_at?: string | null;
    location?: string | null;
    structure?: string | null;
  };
  present_count: number;
  presents: AgentPresentRow[];
};

export type AgentPresentsResponse = {
  ongoing: AgentOngoingActivity[];
  by_date: Array<{ date: string; items: AgentPresentRow[] }>;
  data: AgentPresentRow[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    mine_only?: boolean;
  };
};
