# Jeunesse Parle — Mobile (Expo)

Application mobile **Membre** + **Agent de vérification**.

## Connexion API (important)

Le mobile **détecte automatiquement** l’IP du PC via Expo (même Wi‑Fi), teste `/api/health`, et mémorise l’URL qui fonctionne.

Sur le PC, lancez Laravel ainsi :

```bash
cd backend
php artisan serve --host=0.0.0.0 --port=8000
```

La reconnexion se fait en arrière-plan (login, appels API, changement de réseau).

Optionnel : `EXPO_PUBLIC_API_URL=http://192.168.x.x:8000/api` ou `expo.extra.apiUrl` dans `app.json`.

## Démarrage

```bash
cd mobile
npm install
npx expo start -c
```

## Rôles

| Rôle | Destination |
|------|-------------|
| `agent-verification` | Shell Agent |
| `membre` | Shell Membre |
| Autres | Écran « Portail web requis » |

Toutes les requêtes envoient `X-Client-Portal: mobile`.
