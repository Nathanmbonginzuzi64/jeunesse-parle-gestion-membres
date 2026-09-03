import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';

type Options = {
  /** Intervalle en ms (défaut 5 s). */
  intervalMs?: number;
  enabled?: boolean;
};

/**
 * Rafraîchit les données en arrière-plan tant que l’écran est focus
 * et que l’app est au premier plan — sans spinner ni reset UI.
 */
export function useBackgroundRefresh(
  refresh: () => void | Promise<void>,
  options: Options = {},
) {
  const { intervalMs = 5000, enabled = true } = options;
  const refreshRef = useRef(refresh);
  const inFlightRef = useRef(false);
  const focusedRef = useRef(false);
  const appActiveRef = useRef(AppState.currentState === 'active');

  refreshRef.current = refresh;

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      return () => {
        focusedRef.current = false;
      };
    }, []),
  );

  useEffect(() => {
    if (!enabled) return;

    const onAppState = (state: AppStateStatus) => {
      appActiveRef.current = state === 'active';
    };
    const sub = AppState.addEventListener('change', onAppState);

    const tick = async () => {
      if (!focusedRef.current || !appActiveRef.current || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await refreshRef.current();
      } catch {
        /* silencieux */
      } finally {
        inFlightRef.current = false;
      }
    };

    const id = setInterval(() => {
      void tick();
    }, intervalMs);

    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [enabled, intervalMs]);
}
