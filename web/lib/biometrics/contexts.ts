/** Contextes biométriques — la première action + le lieu déterminent l'objectif. */

export type BiometricContext =
  | "LOGIN"
  | "MEMBER_VERIFICATION"
  | "ATTENDANCE"
  | "BIOMETRIC_REGISTRATION"
  | "MEMBER_ENROLLMENT"
  | "SECURITY_CONFIRMATION";

export const BIOMETRIC_CONTEXT_COPY: Record<
  BiometricContext,
  { title: string; description: string; waiting: string; successDefault: string }
> = {
  LOGIN: {
    title: "Connexion biométrique",
    description: "Utilisez votre empreinte (Windows Hello) pour vous connecter.",
    waiting: "En attente de votre empreinte…",
    successDefault: "Connexion réussie.",
  },
  MEMBER_VERIFICATION: {
    title: "Identification du membre",
    description: "Utilisez votre empreinte pour identifier le membre.",
    waiting: "En attente de l'empreinte du membre…",
    successDefault: "Membre identifié.",
  },
  ATTENDANCE: {
    title: "Enregistrer la présence",
    description: "Identifiez le membre avec son empreinte.",
    waiting: "En attente de l'empreinte…",
    successDefault: "Présence enregistrée.",
  },
  BIOMETRIC_REGISTRATION: {
    title: "Configurer votre biométrie",
    description: "Utilisez Windows Hello pour sécuriser votre compte.",
    waiting: "Suivez les instructions de Windows Hello…",
    successDefault: "Biométrie configurée.",
  },
  MEMBER_ENROLLMENT: {
    title: "Enregistrer la biométrie du membre",
    description: "Utilisez Windows Hello pour enregistrer l'empreinte du nouveau membre.",
    waiting: "En attente de l'empreinte du membre…",
    successDefault: "Biométrie enregistrée.",
  },
  SECURITY_CONFIRMATION: {
    title: "Confirmer votre empreinte",
    description: "Utilisez l'empreinte enregistrée lors de votre adhésion pour confirmer votre identité.",
    waiting: "En attente de votre empreinte…",
    successDefault: "Empreinte confirmée.",
  },
};
