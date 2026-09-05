/**
 * Archive locale du contenu public « Jeunesse Parle » (source : jeunesseparle.cd).
 * Les textes et médias sont stockés dans le dépôt pour rester disponibles
 * même si le site externe n'est plus en ligne.
 */

export const CAMPAIGN_SOURCE = {
  url: "https://jeunesseparle.cd/",
  archivedAt: "2026-09-03",
  label: "Jeunesse Parle Constitution",
} as const;

export const INITIATOR = {
  name: "Serge ETINKUM ANZA",
  role: "Acteur politique · Initiateur de la campagne",
  quote:
    "De toute évidence, vingt ans après, il est temps de corriger les anomalies constatées ou d'écrire une nouvelle Constitution.",
  portrait: "/campaign/serge-etinkum-1.jpg",
  gallery: [
    "/campaign/serge-etinkum-1.jpg",
    "/campaign/serge-etinkum-2.jpg",
    "/campaign/serge-etinkum-3.jpg",
    "/campaign/lancement-kinshasa.jpg",
  ],
} as const;

export const CAMPAIGN_INTRO = {
  title: "La Jeunesse Parle Constitution",
  subtitle: "Donne ton avis sur la réforme constitutionnelle de la RDC",
  lead:
    "Plateforme citoyenne initiée par Serge ETINKUM ANZA. Nous donnons la parole aux jeunes Congolais pour qu'ils participent au débat constitutionnel et proposent leurs idées directement.",
  heroImage: "/campaign/lancement-kinshasa.jpg",
  heroVideo: "/campaign/videofond2.mp4",
  heroBackground: "/campaign/hero-background.png",
} as const;

export const CAMPAIGN_PILLARS = [
  {
    title: "Initiateur de la campagne",
    text: "Campagne citoyenne « La Jeunesse Parle Constitution » portée par Serge ETINKUM ANZA.",
  },
  {
    title: "Espace d'écoute",
    text: "Créer un espace de dialogue et de participation pour les jeunes Congolais.",
  },
  {
    title: "Voix nationale",
    text: "Porter la voix de la jeunesse dans le débat constitutionnel national.",
  },
  {
    title: "Mobilisation",
    text: "Kinshasa, provinces, universités, associations et diaspora.",
  },
] as const;

export const CAMPAIGN_WHY = [
  {
    title: "Recueillir les propositions",
    text: "Sonder les jeunes de 18 à 35 ans sur les points clés de la réforme constitutionnelle pour construire l'avenir ensemble.",
  },
  {
    title: "Débat inclusif et apaisé",
    text: "Un espace de dialogue serein, loin des tensions partisanes.",
  },
  {
    title: "Transmettre aux décideurs",
    text: "Vos propositions vers l'Assemblée nationale et les décideurs.",
  },
] as const;

export const CAMPAIGN_STEPS = [
  {
    n: "1",
    title: "Dépose ta proposition",
    text: "Rédige ton idée en 2000 signes maximum. Sois clair, concis et constructif.",
  },
  {
    n: "2",
    title: "Vote pour les idées",
    text: "Parcours les contributions des autres jeunes et soutiens les initiatives pertinentes.",
  },
  {
    n: "3",
    title: "Présentation officielle",
    text: "Les propositions les plus soutenues seront compilées et présentées aux autorités.",
  },
] as const;

export const CAMPAIGN_AUDIENCE = [
  { label: "Provinces", detail: "Jeunes de toutes les provinces de la RDC" },
  { label: "Diaspora", detail: "Congolais établis à l'étranger" },
  { label: "Étudiants", detail: "Universités et mouvements de jeunesse" },
  { label: "Actifs", detail: "Jeunes travailleurs et entrepreneurs" },
] as const;

export const ABOUT_STORY = {
  title: "Parcours et engagement",
  paragraphs: [
    "La plateforme citoyenne « La Jeunesse Parle », initiative de Monsieur Serge ETINKUM ANZA, vise à donner aux jeunes de la République démocratique du Congo une voix structurée dans la réflexion sur la réforme constitutionnelle.",
    "Elle est née du constat de vulnérabilité des jeunes, et plus précisément de la non prise en compte de la question de dignité des jeunes en RDC.",
    "Homme de conviction et de terrain, Monsieur Serge ETINKUM ANZA appelle à une participation inclusive : universités, mouvements associatifs, organisations citoyennes et jeunes des provinces comme de la diaspora. Tous sont invités à discuter dans le respect des lois et réglementations de la République.",
  ],
} as const;

export interface ArchivedNewsItem {
  id: string;
  date: string;
  dateLabel: string;
  category: "Actualité" | "Campagne" | "Événement";
  title: string;
  excerpt: string;
  image?: string;
  video?: string;
  body: string[];
}

/** Actualités archivées depuis jeunesseparle.cd (contenu local). */
export const ARCHIVED_NEWS: ArchivedNewsItem[] = [
  {
    id: "dialogue-national-prealables",
    date: "2026-08-14",
    dateLabel: "14 août",
    category: "Actualité",
    title:
      "Dialogue national : Jeunesse Parle pose ses préalables et refuse toute récompense politique aux porteurs d'armes",
    excerpt:
      "Le coordonnateur et initiateur du mouvement Jeunesse Parle, Serge ETINKUM ANZA, présente sa vision d'un dialogue national inclusif à Kinshasa.",
    image: "/campaign/actu-dialogue-national.jpg",
    video: "/campaign/actu-video-1.mp4",
    body: [
      "Le coordonnateur et initiateur du mouvement Jeunesse Parle, Serge ETINKUM ANZA, a échangé à Kinshasa sur sa vision du dialogue national inclusif.",
      "Jeunesse Parle pose des préalables clairs et refuse toute récompense politique aux porteurs d'armes, afin de préserver un cadre républicain et pacifique pour la jeunesse congolaise.",
      "Cette prise de position s'inscrit dans la campagne citoyenne pour associer les jeunes au débat sur l'avenir de la Constitution.",
    ],
  },
  {
    id: "deploiement-grand-bandundu",
    date: "2026-08-06",
    dateLabel: "6 août",
    category: "Campagne",
    title:
      "Après Kinshasa, Lubumbashi et Kisangani, « Jeunesse Parle » poursuit son déploiement dans le Grand Bandundu",
    excerpt:
      "Initié par Serge Etinkum ANZA, le mouvement poursuit son déploiement provincial et donne la parole à la jeunesse congolaise.",
    image: "/campaign/actu-bandundu.jpg",
    video: "/campaign/actu-video-2.mp4",
    body: [
      "Après Kinshasa, Lubumbashi et Kisangani, le mouvement « Jeunesse Parle » poursuit son déploiement à travers les provinces, notamment dans le Grand Bandundu.",
      "L'objectif : structurer l'écoute des jeunes, renforcer l'engagement citoyen et préparer la participation au débat constitutionnel.",
    ],
  },
  {
    id: "idiofa-kwilu",
    date: "2026-08-02",
    dateLabel: "2 août",
    category: "Événement",
    title:
      "Kwilu : à Idiofa, Serge Etinkum ANZA annonce l'implantation de « Jeunesse Parle » et mobilise les jeunes",
    excerpt:
      "En marge d'un meeting populaire à Idiofa, le coordonnateur national livre un message tourné vers la jeunesse et l'engagement citoyen.",
    image: "/campaign/serge-etinkum-2.jpg",
    body: [
      "À Idiofa (Kwilu), Serge Etinkum ANZA a annoncé l'implantation du mouvement Jeunesse Parle et mobilisé les jeunes autour de l'engagement citoyen.",
      "Le message insiste sur la dignité des jeunes, la participation pacifique et le rôle de la jeunesse dans les réformes du pays.",
    ],
  },
  {
    id: "complexe-sportif-garde",
    date: "2026-07-27",
    dateLabel: "27 juillet",
    category: "Actualité",
    title:
      "Serge Etinkum Anza salue l'encadrement de la jeunesse au complexe sportif et promet un appui en équipements",
    excerpt:
      "Visite au complexe sportif omnisports de la « Cohésion nationale » au camp Tshatshi, avec un engagement d'appui aux jeunes.",
    image: "/campaign/serge-etinkum-3.jpg",
    body: [
      "Le président et initiateur du mouvement « Jeunesse Parle » a effectué une visite au complexe sportif omnisports de la Cohésion nationale, implanté au camp Tshatshi.",
      "Il a salué l'encadrement de la jeunesse et promis un appui en équipements pour renforcer les activités sportives et citoyennes.",
    ],
  },
];

/** Indicateurs open data (campagne + plateforme) — valeurs d'archive + fallbacks. */
export const OPEN_DATA_SNAPSHOT = {
  updatedAt: "2026-09-03",
  sourceNote:
    "Données d'archive de la campagne Jeunesse Parle Constitution et indicateurs de la plateforme de gestion des membres.",
  kpis: [
    { id: "contributions", label: "Contributions citoyennes", value: 5000, suffix: "+", unit: "propositions" },
    { id: "age_min", label: "Âge minimum ciblé", value: 18, unit: "ans" },
    { id: "age_max", label: "Âge maximum ciblé", value: 35, unit: "ans" },
    { id: "provinces_focus", label: "Pôles de déploiement cités", value: 4, unit: "villes majeures" },
  ],
  deployment: [
    { label: "Kinshasa", status: "Déployé", progress: 100 },
    { label: "Lubumbashi", status: "Déployé", progress: 90 },
    { label: "Kisangani", status: "Déployé", progress: 85 },
    { label: "Grand Bandundu", status: "En cours", progress: 60 },
    { label: "Kwilu / Idiofa", status: "En cours", progress: 55 },
  ],
  audiences: [
    { label: "Provinces", share: 40 },
    { label: "Diaspora", share: 15 },
    { label: "Étudiants", share: 25 },
    { label: "Actifs", share: 20 },
  ],
  datasets: [
    {
      id: "actualites-archive",
      title: "Archive des actualités campagne",
      description: "Titres, dates, catégories et extraits des annonces publiques archivées.",
      format: "JSON local",
      records: ARCHIVED_NEWS.length,
    },
    {
      id: "indicateurs-campagne",
      title: "Indicateurs de mobilisation",
      description: "KPIs de la campagne Constitution et répartition des audiences.",
      format: "JSON local",
      records: 8,
    },
    {
      id: "membres-plateforme",
      title: "Stats plateforme membres",
      description: "Membres, provinces, structures et cartes (API publique quand disponible).",
      format: "API /public/stats",
      records: 4,
    },
  ],
} as const;
