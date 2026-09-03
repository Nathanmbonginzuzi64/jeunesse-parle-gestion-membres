<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Organisation
    |--------------------------------------------------------------------------
    */
    'organization' => [
        'name' => env('JP_ORG_NAME', 'Jeunesse Parle'),
        'country' => env('JP_ORG_COUNTRY', 'République Démocratique du Congo'),
        'country_code' => 'RDC',
        'logo_url' => env('JP_ORG_LOGO_URL'),
        'support_email' => env('JP_SUPPORT_EMAIL', 'contact@jeunesseparle.cd'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Cartes de membre
    |--------------------------------------------------------------------------
    | Une validité nulle produit une carte sans date d'expiration.
    */
    'card_validity_years' => (int) env('JP_CARD_VALIDITY_YEARS', 3),
    'card_template_version' => env('JP_CARD_TEMPLATE_VERSION', 'v1'),

    /*
    |--------------------------------------------------------------------------
    | Vérification publique
    |--------------------------------------------------------------------------
    | URL de base encodée dans le QR code. Doit pointer vers l'application web
    | publique, pas vers l'API.
    */
    'verification_base_url' => env('JP_VERIFICATION_BASE_URL', env('FRONTEND_URL', 'http://localhost:3000')),

    /*
    |--------------------------------------------------------------------------
    | Adhésion
    |--------------------------------------------------------------------------
    */
    'minimum_age' => (int) env('JP_MINIMUM_AGE', 15),
    'maximum_age' => (int) env('JP_MAXIMUM_AGE', 40),

    /*
    |--------------------------------------------------------------------------
    | Photos
    |--------------------------------------------------------------------------
    */
    'photo' => [
        'max_kilobytes' => (int) env('JP_PHOTO_MAX_KB', 10240),
        'mimes' => ['jpeg', 'jpg', 'png', 'webp'],
    ],

    'chat' => [
        'max_kilobytes' => (int) env('JP_CHAT_MAX_KB', 10240),
    ],

    /*
    |--------------------------------------------------------------------------
    | Médias actualités (image / vidéo)
    |--------------------------------------------------------------------------
    */
    'news_media' => [
        'max_kilobytes' => (int) env('JP_NEWS_MEDIA_MAX_KB', 102400), // 100 Mo
        'image_mimes' => ['jpeg', 'jpg', 'png', 'webp'],
        'video_mimes' => ['mp4', 'webm', 'mov', 'quicktime'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Exports
    |--------------------------------------------------------------------------
    | Plafond de lignes exportables en une fois, pour éviter les fuites massives
    | et protéger la mémoire du serveur.
    */
    'export' => [
        'max_rows' => (int) env('JP_EXPORT_MAX_ROWS', 20000),
    ],

    /*
    |--------------------------------------------------------------------------
    | Sécurité
    |--------------------------------------------------------------------------
    */
    'security' => [
        'max_login_attempts' => (int) env('JP_MAX_LOGIN_ATTEMPTS', 5),
        'lockout_minutes' => (int) env('JP_LOCKOUT_MINUTES', 15),
    ],

    /*
    |--------------------------------------------------------------------------
    | Cartographie
    |--------------------------------------------------------------------------
    | La clé est exposée au frontend via une route dédiée uniquement si elle est
    | définie ; elle n'est jamais écrite dans le dépôt.
    */
    'maps' => [
        'provider' => env('JP_MAP_PROVIDER', 'none'),
        'api_key' => env('GOOGLE_MAPS_API_KEY'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Biométrie
    |--------------------------------------------------------------------------
    | Désactivée par défaut. L'activation suppose un fournisseur externe certifié
    | et la collecte préalable d'un consentement explicite.
    */
    'biometrics' => [
        'enabled' => env('JP_BIOMETRICS_ENABLED', true),
        'provider' => env('JP_BIOMETRICS_PROVIDER', 'webauthn'),
        // Accepte la simulation DigitalPersona héritée (dev).
        'lab_mode' => env('JP_BIOMETRICS_LAB_MODE', true),
        // Domaine WebAuthn (Windows Hello). Ex. localhost en local.
        'rp_id' => env('JP_WEBAUTHN_RP_ID', 'localhost'),
    ],
];
