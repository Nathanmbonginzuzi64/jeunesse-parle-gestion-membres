"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { AppNotification } from "@/lib/types";

const POLL_MS = 12_000;

export function useNotificationFeed(options?: { enabled?: boolean; onNew?: (items: AppNotification[]) => void }) {
  const enabled = options?.enabled ?? true;
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const sinceRef = useRef(new Date().toISOString());
  const onNewRef = useRef(options?.onNew);
  onNewRef.current = options?.onNew;

  const refreshCount = useCallback(async () => {
    try {
      const response = await api.get<{ count: number }>("/notifications/unread-count");
      setUnreadCount(response.count);
    } catch {
      /* silencieux */
    } finally {
      setLoading(false);
    }
  }, []);

  const pollSince = useCallback(async () => {
    try {
      const response = await api.get<{
        has_new: boolean;
        unread_count: number;
        notifications: AppNotification[];
      }>("/notifications/since", { since: sinceRef.current });

      sinceRef.current = new Date().toISOString();
      setUnreadCount(response.unread_count);

      if (response.has_new && response.notifications?.length) {
        onNewRef.current?.(response.notifications);
        window.dispatchEvent(
          new CustomEvent("jp:notifications", { detail: { notifications: response.notifications } }),
        );
      }
    } catch {
      /* silencieux */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    void refreshCount();
    void pollSince();

    const interval = setInterval(() => {
      void pollSince();
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [enabled, pollSince, refreshCount]);

  return {
    unreadCount,
    loading,
    refreshCount,
    pollSince,
    setUnreadCount,
  };
}
