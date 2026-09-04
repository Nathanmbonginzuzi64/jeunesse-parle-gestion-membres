/**
 * Synchronisation temps réel légère entre tous les portails web ouverts.
 * Les mutations API déclenchent un rafraîchissement immédiat (< 5 s) partout.
 */

export const REALTIME_EVENT = "jp:realtime-refresh";
export const REALTIME_CHANNEL = "jp-realtime";

const FAST_POLL_MS = 2_500;

export function getFastPollMs() {
  return FAST_POLL_MS;
}

export function notifyRealtimeRefresh(reason = "mutation") {
  if (typeof window === "undefined") return;

  try {
    window.dispatchEvent(
      new CustomEvent(REALTIME_EVENT, { detail: { reason, at: Date.now() } }),
    );
  } catch {
    /* ignore */
  }

  try {
    const channel = new BroadcastChannel(REALTIME_CHANNEL);
    channel.postMessage({ reason, at: Date.now() });
    channel.close();
  } catch {
    /* BroadcastChannel indisponible */
  }
}

export function subscribeRealtimeRefresh(handler: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onEvent = () => handler();
  window.addEventListener(REALTIME_EVENT, onEvent);

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(REALTIME_CHANNEL);
    channel.onmessage = () => handler();
  } catch {
    channel = null;
  }

  const onFocus = () => handler();
  const onVisible = () => {
    if (document.visibilityState === "visible") handler();
  };
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    window.removeEventListener(REALTIME_EVENT, onEvent);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisible);
    try {
      channel?.close();
    } catch {
      /* ignore */
    }
  };
}
