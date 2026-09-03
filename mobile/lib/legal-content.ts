export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export const APP_TAGLINE = 'La jeunesse congolaise a une voix.';

export const ONBOARDING_SLIDES = [
  {
    icon: 'people' as const,
    kicker: 'Le mouvement',
    title: 'Jeunesse Parle',
    text: 'Plateforme citoyenne et identité numérique du mouvement. Ici, chaque jeune est reconnu, chaque engagement compte, chaque présence est réelle.',
  },
  {
    icon: 'megaphone' as const,
    kicker: 'Pourquoi c’est important',
    title: 'Une voix structurée',
    text: 'Trop longtemps, la dignité des jeunes n’a pas été prise en compte. Jeunesse Parle donne un cadre républicain pour participer, proposer et se faire entendre — en RDC comme dans la diaspora.',
  },
  {
    icon: 'id-card' as const,
    kicker: 'Votre identité',
    title: 'Carte, QR, présence',
    text: 'Votre carte membre et son QR permettent de vous identifier lors des activités, assemblées et mobilisations. Fini les listes floues : une preuve claire, sur le terrain.',
  },
  {
    icon: 'shield-checkmark' as const,
    kicker: 'Sur le terrain',
    title: 'Membres et agents',
    text: 'Les membres suivent le mouvement. Les agents de vérification authentifient les cartes et enregistrent les présences. Les administrateurs restent sur le portail web.',
  },
] as const;

export const PRIVACY_INTRO =
  'Jeunesse Parle traite vos données pour gérer l’adhésion, vérifier l’identité des membres et organiser les activités du mouvement — pas pour les vendre.';

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: 'Qui est responsable',
    paragraphs: [
      'Le traitement est assuré par Jeunesse Parle, mouvement citoyen initié par Serge ETINKUM ANZA, pour la gestion des membres en République démocratique du Congo et dans la diaspora.',
    ],
  },
  {
    title: 'Données concernées',
    paragraphs: [
      'Identité (nom, photo, code membre), coordonnées (e-mail, téléphone), rôle et permissions, carte et QR, historique de présences, journaux de connexion (web ou mobile), et, lorsque c’est activé sur le terrain, éléments de vérification biométrique.',
    ],
  },
  {
    title: 'Finalités',
    paragraphs: [
      'Créer et sécuriser votre compte, délivrer la carte membre, vérifier l’identité lors des activités, enregistrer les présences, vous informer (actualités, messages internes) et protéger la plateforme contre les abus.',
    ],
  },
  {
    title: 'Partage',
    paragraphs: [
      'Les agents de vérification et les responsables habilités voient les informations nécessaires à leur mission. Nous ne vendons pas vos données. Un transfert n’a lieu que si la loi l’exige ou si un prestataire technique strictement nécessaire y accède, sous contrôle.',
    ],
  },
  {
    title: 'Conservation et sécurité',
    paragraphs: [
      'Les données sont conservées le temps de votre adhésion et des obligations de traçabilité. L’accès est protégé par mot de passe, sessions et journal d’audit. Signalez tout usage suspect depuis l’application ou le portail web.',
    ],
  },
  {
    title: 'Vos droits',
    paragraphs: [
      'Vous pouvez demander l’accès, la rectification ou la désactivation de votre compte auprès des administrateurs Jeunesse Parle. Certaines données de présence et d’audit peuvent être conservées pour la sincérité des activités du mouvement.',
    ],
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: 'Objet',
    paragraphs: [
      'Cette application mobile sert aux membres et aux agents de vérification Jeunesse Parle. Les fonctions d’administration nationale restent sur le portail web.',
    ],
  },
  {
    title: 'Compte',
    paragraphs: [
      'Vous êtes responsable de la confidentialité de vos identifiants. Un compte inactif, cédé ou utilisé de manière frauduleuse peut être suspendu. La carte membre atteste de l’appartenance au mouvement ; elle ne remplace pas une pièce d’identité de l’État.',
    ],
  },
  {
    title: 'Usage acceptable',
    paragraphs: [
      'Il est interdit de falsifier une carte, de scanner ou d’enregistrer des présences pour autrui sans mandat, de perturber le service ou d’utiliser l’application à des fins contraires aux lois de la République et aux valeurs du mouvement.',
    ],
  },
  {
    title: 'Vérification sur le terrain',
    paragraphs: [
      'Les agents peuvent demander à voir la carte, scanner le QR et, le cas échéant, procéder à une vérification biométrique prévue par l’organisation. Le refus peut empêcher l’accès à une activité contrôlée.',
    ],
  },
  {
    title: 'Disponibilité',
    paragraphs: [
      'Le service est fourni avec diligence, sans garantie d’accès ininterrompu. Une maintenance peut temporairement limiter l’application.',
    ],
  },
];

export const MENTIONS_SECTIONS: LegalSection[] = [
  {
    title: 'Éditeur',
    paragraphs: [
      'Jeunesse Parle — plateforme citoyenne « La Jeunesse Parle ». Initiateur : Serge ETINKUM ANZA. Campagne et identité du mouvement en République démocratique du Congo.',
    ],
  },
  {
    title: 'Application',
    paragraphs: [
      'Application mobile officielle de gestion des membres, des présences et de la vérification de cartes. Version 1.0.0. API locale par défaut : port 8000.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [
      'Pour une question sur vos données, votre carte ou votre compte, adressez-vous aux responsables Jeunesse Parle via le portail web ou les canaux officiels du mouvement.',
    ],
  },
];
