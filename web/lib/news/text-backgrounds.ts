/** Fonds de publication texte — style Facebook / réseaux sociaux. */

export type TextBackgroundId =
  | "none"
  | "ocean"
  | "sunset"
  | "forest"
  | "royal"
  | "rdc"
  | "night"
  | "coral"
  | "mint"
  | "lavender"
  | "sky"
  | "fire";

export interface TextBackgroundPreset {
  id: TextBackgroundId;
  label: string;
  className: string;
  textClass: string;
}

export const TEXT_BACKGROUNDS: TextBackgroundPreset[] = [
  { id: "none", label: "Classique", className: "bg-white border border-slate-200", textClass: "text-slate-800" },
  {
    id: "ocean",
    label: "Océan",
    className: "bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400",
    textClass: "text-white",
  },
  {
    id: "sunset",
    label: "Coucher de soleil",
    className: "bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600",
    textClass: "text-white",
  },
  {
    id: "forest",
    label: "Forêt",
    className: "bg-gradient-to-br from-emerald-700 via-green-600 to-lime-500",
    textClass: "text-white",
  },
  {
    id: "royal",
    label: "Royal",
    className: "bg-gradient-to-br from-indigo-700 via-violet-600 to-purple-500",
    textClass: "text-white",
  },
  {
    id: "rdc",
    label: "RDC 🇨🇩",
    className: "bg-gradient-to-br from-sky-600 via-blue-700 to-red-600",
    textClass: "text-white",
  },
  {
    id: "night",
    label: "Nuit",
    className: "bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900",
    textClass: "text-white",
  },
  {
    id: "coral",
    label: "Corail",
    className: "bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-500",
    textClass: "text-white",
  },
  {
    id: "mint",
    label: "Menthe",
    className: "bg-gradient-to-br from-teal-400 via-emerald-400 to-cyan-300",
    textClass: "text-slate-900",
  },
  {
    id: "lavender",
    label: "Lavande",
    className: "bg-gradient-to-br from-violet-300 via-purple-300 to-fuchsia-200",
    textClass: "text-slate-900",
  },
  {
    id: "sky",
    label: "Ciel",
    className: "bg-gradient-to-br from-sky-400 via-blue-400 to-indigo-400",
    textClass: "text-white",
  },
  {
    id: "fire",
    label: "Flamme",
    className: "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600",
    textClass: "text-white",
  },
];

export function getTextBackground(id?: string | null): TextBackgroundPreset {
  return TEXT_BACKGROUNDS.find((b) => b.id === id) ?? TEXT_BACKGROUNDS[0];
}

export function encodeTextBackground(id: TextBackgroundId): string | null {
  return id && id !== "none" ? `bg:${id}` : null;
}

export function decodeTextBackground(externalUrl?: string | null, mediaType?: string): TextBackgroundId {
  if (mediaType === "text" && externalUrl?.startsWith("bg:")) {
    const id = externalUrl.slice(3) as TextBackgroundId;
    return TEXT_BACKGROUNDS.some((b) => b.id === id) ? id : "none";
  }
  return "none";
}
