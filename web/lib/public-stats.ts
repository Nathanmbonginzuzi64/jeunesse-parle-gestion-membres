import { API_BASE_URL } from "@/lib/api";

export interface PublicLandingStats {
  members_total: number;
  provinces_covered: number;
  structures_active: number;
  cards_verified: number;
  updated_at?: string;
}

export const EMPTY_PUBLIC_STATS: PublicLandingStats = {
  members_total: 0,
  provinces_covered: 0,
  structures_active: 0,
  cards_verified: 0,
};

export async function getPublicLandingStats(): Promise<PublicLandingStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/public/stats`, {
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      return EMPTY_PUBLIC_STATS;
    }

    return (await response.json()) as PublicLandingStats;
  } catch {
    return EMPTY_PUBLIC_STATS;
  }
}
