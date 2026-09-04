"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, fetchProtectedImage } from "./api";
import type { City, Commune, District, Province, Quartier, Avenue, References } from "./types";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export type UseApiOptions = {
  /**
   * Intervalle de refresh silencieux en ms (défaut 5000).
   * `false` pour désactiver. Ne bascule jamais `loading` pendant le poll.
   */
  refreshInterval?: number | false;
};

const DEFAULT_REFRESH_MS = 5_000;

function sameData(a: unknown, b: unknown) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * Récupère une ressource de l'API et annule la requête précédente dès que les
 * paramètres changent, ce qui évite les réponses obsolètes lors du filtrage.
 * En arrière-plan, rafraîchit les données sans spinner ni reset d’écran.
 */
export function useApi<T>(
  path: string | null,
  query?: Record<string, string | number | boolean | null | undefined>,
  options?: UseApiOptions,
): FetchState<T> & { reload: () => void } {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: path !== null,
    error: null,
  });
  const [nonce, setNonce] = useState(0);
  const serialized = JSON.stringify(query ?? {});
  const refreshInterval =
    options?.refreshInterval === false
      ? false
      : (options?.refreshInterval ?? DEFAULT_REFRESH_MS);
  const dataRef = useRef<T | null>(null);
  dataRef.current = state.data;

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));

    api
      .get<T>(path, JSON.parse(serialized), controller.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error: unknown) => {
        if ((error as Error)?.name === "AbortError") return;
        setState({
          data: null,
          loading: false,
          error: error instanceof ApiError ? error.message : "Chargement impossible.",
        });
      });

    return () => controller.abort();
  }, [path, serialized, nonce]);

  useEffect(() => {
    if (!path || refreshInterval === false || refreshInterval <= 0) return;

    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      if (cancelled || inFlight) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

      inFlight = true;
      try {
        const data = await api.get<T>(path, JSON.parse(serialized));
        if (cancelled) return;
        if (sameData(dataRef.current, data)) return;
        setState((current) => ({
          ...current,
          data,
          loading: false,
          error: null,
        }));
      } catch {
        /* silencieux — on conserve les données affichées */
      } finally {
        inFlight = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };

    const timer = window.setInterval(() => void tick(), refreshInterval);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [path, serialized, refreshInterval]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { ...state, reload };
}

/** Retarde la propagation d'une valeur : utilisé par la recherche instantanée. */
export function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/** Référentiel statique (statuts, genres, niveaux d'études…) mis en cache pour la session. */
let referencesCache: References | null = null;

export function useReferences(): References | null {
  const [references, setReferences] = useState<References | null>(referencesCache);

  useEffect(() => {
    if (referencesCache) return;

    api.public
      .get<References>("/references")
      .then((data) => {
        referencesCache = data;
        setReferences(data);
      })
      .catch(() => setReferences(null));
  }, []);

  return references;
}

/**
 * Charge la hiérarchie territoriale depuis la base : aucune donnée
 * administrative n'est codée en dur dans le frontend.
 */
export function useTerritories(
  provinceId?: number | null,
  cityId?: number | null,
  districtId?: number | null,
  communeId?: number | null,
  zoneId?: number | null,
) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [quartiers, setQuartiers] = useState<Quartier[]>([]);
  const [avenues, setAvenues] = useState<Avenue[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [territoryError, setTerritoryError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const asList = <T,>(payload: { data?: T[] } | T[] | null | undefined): T[] => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
  };

  const loadTerritories = useCallback(async <T,>(
    path: string,
    query?: Record<string, string | number | boolean | null | undefined>,
  ): Promise<T[]> => {
    try {
      const response = await api.public.get<{ data: T[] }>(path, query);
      return asList<T>(response);
    } catch (publicError) {
      // Repli authentifié si la route publique échoue (CORS / réseau partiel).
      try {
        const response = await api.get<{ data: T[] }>(path, query);
        return asList<T>(response);
      } catch {
        throw publicError instanceof ApiError
          ? publicError
          : new ApiError(0, "Impossible de charger le référentiel territorial.");
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingProvinces(true);
    setTerritoryError(null);
    loadTerritories<Province>("/territories/provinces")
      .then((rows) => {
        if (!cancelled) {
          setProvinces(rows);
          if (rows.length === 0) {
            setTerritoryError("Aucune province active trouvée. Vérifiez que l'API Laravel tourne.");
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setProvinces([]);
          setTerritoryError(
            error instanceof ApiError
              ? error.message
              : "Impossible de charger les provinces. Vérifiez NEXT_PUBLIC_API_URL et le serveur.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProvinces(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadTerritories, reloadKey]);

  useEffect(() => {
    if (!provinceId) {
      setCities([]);
      return;
    }
    let cancelled = false;
    loadTerritories<City>("/territories/cities", { province_id: provinceId })
      .then((rows) => {
        if (!cancelled) setCities(rows);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [provinceId, loadTerritories, reloadKey]);

  useEffect(() => {
    if (!cityId) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    loadTerritories<District>("/territories/districts", { city_id: cityId })
      .then((rows) => {
        if (!cancelled) setDistricts(rows);
      })
      .catch(() => {
        if (!cancelled) setDistricts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [cityId, loadTerritories, reloadKey]);

  useEffect(() => {
    if (!cityId) {
      setCommunes([]);
      return;
    }
    let cancelled = false;
    loadTerritories<Commune>("/territories/communes", {
      city_id: cityId,
      // Ne filtre par district que s'il est choisi (beaucoup de villes n'en ont pas).
      district_id: districtId ?? undefined,
    })
      .then((rows) => {
        if (!cancelled) setCommunes(rows);
      })
      .catch(() => {
        if (!cancelled) setCommunes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [cityId, districtId, loadTerritories, reloadKey]);

  useEffect(() => {
    if (!communeId) {
      setQuartiers([]);
      return;
    }
    let cancelled = false;
    loadTerritories<Quartier>("/territories/quartiers", { commune_id: communeId })
      .then((rows) => {
        if (!cancelled) setQuartiers(rows);
      })
      .catch(() => {
        if (!cancelled) setQuartiers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [communeId, loadTerritories, reloadKey]);

  useEffect(() => {
    if (!zoneId) {
      setAvenues([]);
      return;
    }
    let cancelled = false;
    loadTerritories<Avenue>("/territories/avenues", { zone_id: zoneId })
      .then((rows) => {
        if (!cancelled) setAvenues(rows);
      })
      .catch(() => {
        if (!cancelled) setAvenues([]);
      });
    return () => {
      cancelled = true;
    };
  }, [zoneId, loadTerritories, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return {
    provinces,
    cities,
    districts,
    communes,
    quartiers,
    avenues,
    zones: quartiers,
    loadingProvinces,
    territoryError,
    reload,
  };
}

export function usePublicStructures(provinceId?: number | null, cityId?: number | null) {
  const [structures, setStructures] = useState<Array<{ id: number; name: string; type: string }>>([]);

  useEffect(() => {
    api.public
      .get<{ data: Array<{ id: number; name: string; type: string }> }>("/territories/structures", {
        province_id: provinceId ?? undefined,
        city_id: cityId ?? undefined,
      })
      .then((response) => setStructures(response.data))
      .catch(() => setStructures([]));
  }, [provinceId, cityId]);

  return structures;
}

/**
 * Résout une image servie derrière une route authentifiée en object URL, puis
 * libère la mémoire au démontage.
 */
export function useProtectedImage(url: string | null | undefined): string | null {
  const [source, setSource] = useState<string | null>(null);
  const previous = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (previous.current?.startsWith("blob:")) {
      URL.revokeObjectURL(previous.current);
      previous.current = null;
    }

    if (!url) {
      setSource(null);
      return;
    }

    fetchProtectedImage(url).then((objectUrl) => {
      if (cancelled) {
        if (objectUrl?.startsWith("blob:")) URL.revokeObjectURL(objectUrl);
        return;
      }
      previous.current = objectUrl;
      setSource(objectUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(
    () => () => {
      if (previous.current?.startsWith("blob:")) URL.revokeObjectURL(previous.current);
    },
    [],
  );

  return source;
}
