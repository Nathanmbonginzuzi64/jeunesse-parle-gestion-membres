"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getFastPollMs, subscribeRealtimeRefresh } from "@/lib/realtime";

const POLL_MS = getFastPollMs();

export function useJpUnread() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const response = await api.get<{ count: number }>("/jp-messages/unread-count");
      setCount(response.count);
    } catch {
      /* silencieux */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void refresh();
    }, POLL_MS);
    const onNotif = () => void refresh();
    const unsubscribe = subscribeRealtimeRefresh(() => void refresh());
    window.addEventListener("jp:notifications", onNotif);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("jp:notifications", onNotif);
      unsubscribe();
    };
  }, [refresh]);

  return { count, refresh };
}
