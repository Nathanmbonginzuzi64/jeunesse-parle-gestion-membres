# Jeunesse Parle — Mobile (Expo)

Application mobile **Membre** + **Agent de vérification** (shells séparés).

## Prérequis

- Backend Laravel sur `http://127.0.0.1:8000`
- Compte `agent-verification` ou `membre`

Configurer l’URL API dans `app.json` → `expo.extra.apiUrl` ou variable `EXPO_PUBLIC_API_URL`.

Sur appareil physique, utilisez l’IP LAN de votre machine (ex. `http://192.168.x.x:8000/api`).

## Démarrage

```bash
cd mobile
npm install
npx expo start
```

## Rôles

| Rôle | Destination |
|------|-------------|
| `agent-verification` | Shell Agent (vérifier / QR / présences) |
| `membre` | Stub « App Membre à venir » (Vague 2) |
| Autres | Écran « Portail web requis » |

## Header

Toutes les requêtes envoient `X-Client-Portal: mobile` pour l’audit.
