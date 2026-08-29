"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, fetchProtectedImage } from "./api";
import type { City, Commune, District, Province, Quartier, References } from "./types";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Récupère une ressource de l'API et annule la requête précédente dès que les
 * paramètres changent, ce qui évite les réponses obsolètes lors du filtrage.
 */
export function useApi<T>(
  path: string | null,
  query?: Record<string, string | number | boolean | null | undefined>,
): FetchState<T> & { reload: () => void } {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: path !== null,
    error: null,
  });
  const [nonce, setNonce] = useState(0);
  const serialized = JSON.stringify(query ?? {});

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
) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [quartiers, setQuartiers] = useState<Quartier[]>([]);

  useEffect(() => {
    api.public
      .get<{ data: Province[] }>("/territories/provinces")
      .then((response) => setProvinces(response.data))
      .catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (!provinceId) {
      setCities([]);
      return;
    }
    api.public
      .get<{ data: City[] }>("/territories/cities", { province_id: provinceId })
      .then((response) => setCities(response.data))
      .catch(() => setCities([]));
  }, [provinceId]);

  useEffect(() => {
    if (!cityId) {
      setDistricts([]);
      return;
    }
    api.public
      .get<{ data: District[] }>("/territories/districts", { city_id: cityId })
      .then((response) => setDistricts(response.data))
      .catch(() => setDistricts([]));
  }, [cityId]);

  useEffect(() => {
    if (!cityId) {
      setCommunes([]);
      return;
    }
    api.public
      .get<{ data: Commune[] }>("/territories/communes", {
        city_id: cityId,
        district_id: districtId ?? undefined,
      })
      .then((response) => setCommunes(response.data))
      .catch(() => setCommunes([]));
  }, [cityId, districtId]);

  useEffect(() => {
    if (!communeId) {
      setQuartiers([]);
      return;
    }
    api.public
      .get<{ data: Quartier[] }>("/territories/quartiers", { commune_id: communeId })
      .then((response) => setQuartiers(response.data))
      .catch(() => setQuartiers([]));
  }, [communeId]);

  return { provinces, cities, districts, communes, quartiers, zones: quartiers };
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
