<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    /*
     * Origines autorisées, fournies par l'environnement.
     * Aucun joker en production : la liste doit être explicite.
     */
    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')),
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

        'exposed_headers' => ['Content-Disposition'],

    'max_age' => 0,

    'supports_credentials' => false,
];
