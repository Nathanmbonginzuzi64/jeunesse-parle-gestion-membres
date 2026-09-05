const VOICE_KEY = "jp.admin.activity.voice.enabled";

export function isAdminActivityVoiceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(VOICE_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export function setAdminActivityVoiceEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VOICE_KEY, enabled ? "1" : "0");
  if (!enabled && typeof window.speechSynthesis !== "undefined") {
    window.speechSynthesis.cancel();
  }
}

/** Voix off SuperAdmin (Web Speech API). */
export function speakAdmin(text: string): void {
  if (typeof window === "undefined" || !text.trim()) return;
  if (!isAdminActivityVoiceEnabled()) return;
  if (typeof window.speechSynthesis === "undefined") return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.lang = "fr-FR";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}
