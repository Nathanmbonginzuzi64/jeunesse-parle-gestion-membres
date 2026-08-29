# Jeunesse Parle 🇨🇩 — Gestion des membres

Plateforme nationale d’inscription, d’identification et de mobilisation des membres de **La Jeunesse Parle** en RDC.

> Un membre → un profil → un ID unique (`JP-RDC-00000001`) → une carte → un QR code → une structure → des activités → un historique → des statistiques.

---

## Phase actuelle : design web (sans backend)

Le frontend fonctionne **seul**, avec des données de démonstration.

Le backend Laravel n’est **pas requis** tant que `NEXT_PUBLIC_USE_MOCKS=true` (valeur par défaut).

```
JEUNESSE PARLE
├── web/        Next.js — interface (à travailler maintenant)
├── backend/    Laravel — API (à brancher plus tard)
└── mobile/     Même API, plus tard
```

### Lancer uniquement le site

```bash
cd web
copy .env.example .env.local
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Sur l’écran de connexion, cliquez un compte de démonstration. Le mot de passe peut être n’importe quoi (ex. `demo`).

| Rôle | E-mail |
|---|---|
| Super administrateur | `superadmin@jeunesseparle.test` |
| Administrateur national | `admin@jeunesseparle.test` |
| Responsable Kinshasa | `kinshasa@jeunesseparle.test` |
| Responsable Nord-Kivu | `nordkivu@jeunesseparle.test` |
| Agent de vérification | `agent@jeunesseparle.test` |
| Membre | `nathan@jeunesseparle.test` |

Le badge **Mode design** en haut de l’application confirme que Laravel n’est pas appelé.

### Plus tard : brancher l’API

1. Lancer le backend (`cd backend && php artisan serve`)
2. Dans `web/.env.local` : `NEXT_PUBLIC_USE_MOCKS=false`
3. Relancer `npm run dev`

---

## Identité visuelle

Le logo officiel (`web/public/logo.jpeg`) est utilisé dans l’interface.

- Bleu : `#0087D1`
- Rouge : `#CE1126`
- Jaune : `#FAD201`

---

## Backend (plus tard)

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
php artisan test
```

Les règles de sécurité (RBAC, cloisonnement territorial, QR opaque, audit) restent dans Laravel. Le frontend actuel sert à figer le design et les parcours.
