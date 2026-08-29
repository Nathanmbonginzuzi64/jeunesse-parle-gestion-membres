"use client";

import { useCallback, useRef, useState } from "react";
import {
  formatWebAuthnError,
  isWebAuthnFocusError,
  webAuthnCreate,
  webAuthnGet,
} from "@/lib/biometrics/webauthn-client";

type CreateOptionsPayload = { publicKey?: Record<string, unknown> } | Record<string, unknown>;

/**
 * Enchaîne requête API + cérémonie WebAuthn en deux temps si le focus est perdu
 * pendant l'appel réseau (erreur Windows Hello fréquente).
 */
export function useWebAuthnCeremony() {
  const pendingCreateRef = useRef<CreateOptionsPayload | null>(null);
  const pendingGetRef = useRef<CreateOptionsPayload | null>(null);
  const [awaitingCeremony, setAwaitingCeremony] = useState(false);

  const clearPending = useCallback(() => {
    pendingCreateRef.current = null;
    pendingGetRef.current = null;
    setAwaitingCeremony(false);
  }, []);

  const runCreate = useCallback(
    async (fetchOptions: () => Promise<CreateOptionsPayload>) => {
      if (pendingCreateRef.current) {
        try {
          const result = await webAuthnCreate(pendingCreateRef.current);
          clearPending();
          return result;
        } catch (error) {
          if (isWebAuthnFocusError(error)) {
            setAwaitingCeremony(true);
            throw error;
          }
          clearPending();
          throw error;
        }
      }

      const options = await fetchOptions();
      pendingCreateRef.current = options;

      try {
        const result = await webAuthnCreate(options);
        clearPending();
        return result;
      } catch (error) {
        if (isWebAuthnFocusError(error)) {
          setAwaitingCeremony(true);
          throw error;
        }
        clearPending();
        throw error;
      }
    },
    [clearPending],
  );

  const runGet = useCallback(
    async (fetchOptions: () => Promise<CreateOptionsPayload>) => {
      if (pendingGetRef.current) {
        try {
          const result = await webAuthnGet(pendingGetRef.current);
          clearPending();
          return result;
        } catch (error) {
          if (isWebAuthnFocusError(error)) {
            setAwaitingCeremony(true);
            throw error;
          }
          clearPending();
          throw error;
        }
      }

      const options = await fetchOptions();
      pendingGetRef.current = options;

      try {
        const result = await webAuthnGet(options);
        clearPending();
        return result;
      } catch (error) {
        if (isWebAuthnFocusError(error)) {
          setAwaitingCeremony(true);
          throw error;
        }
        clearPending();
        throw error;
      }
    },
    [clearPending],
  );

  return {
    awaitingCeremony,
    clearPending,
    runCreate,
    runGet,
    formatError: formatWebAuthnError,
  };
}
