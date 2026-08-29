/** Clé Google Maps — variable NEXT_PUBLIC_ requise pour le rendu côté client. */
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export function getMapConfig() {
  const configured = Boolean(GOOGLE_MAPS_API_KEY);
  return {
    provider: configured ? ("google" as const) : ("none" as const),
    configured,
  };
}
