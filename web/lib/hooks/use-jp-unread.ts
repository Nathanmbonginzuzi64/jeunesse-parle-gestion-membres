"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const POLL_MS = 12_000;

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
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    const onNotif = () => void refresh();
    window.addEventListener("jp:notifications", onNotif);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("jp:notifications", onNotif);
    };
  }, [refresh]);

  return { count, refresh };
}
