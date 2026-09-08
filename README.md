# Shelf153

Marketplace composée d'une API Express/Prisma, d'une boutique React et d'un dashboard React.

## Prérequis

- Node.js 24
- PostgreSQL 17 (PostgreSQL 14+ convient également)
- Comptes pawaPay, Cloudinary, Gemini et SMTP pour les fonctions correspondantes

## Installation locale

1. Copier `backend/.env.example` vers `backend/.env` et renseigner les secrets.
2. Copier les fichiers `.env.example` du frontend et du dashboard vers `.env`.
3. Démarrer PostgreSQL avec `docker compose up -d postgres` ou fournir une autre `DATABASE_URL`.
4. Dans `backend`, lancer `npm install`, `npx prisma migrate dev`, puis `npm run dev`.
5. Dans `frontend` et `dashboard`, lancer `npm install`, puis `npm run dev`.

La boutique écoute sur `5173`, le dashboard sur `5174` et l'API sur `4000`.

## Base de données

Le schéma source se trouve dans `backend/prisma/schema.prisma`. Ne créez pas les tables au démarrage de l'application :

- développement : `npm run db:migrate -- --name description_du_changement`
- production/CI : `npm run db:deploy`
- régénération du client : `npm run prisma:generate`

La migration initiale cible PostgreSQL. Une ancienne base MySQL contenant déjà des données doit faire l'objet d'un export/transfert explicite ; la migration ne copie pas automatiquement les données MySQL.

## Tests et contrôles

Les tests d'intégration utilisent exclusivement `TEST_DATABASE_URL` :

```bash
cd backend
TEST_DATABASE_URL=postgresql://shelf153:shelf153-local-only@localhost:5433/shelf153_test npm run test:integration
```

Sans `TEST_DATABASE_URL`, `npm test` ignore proprement la suite d'intégration. La CI lance migrations, tests, ESLint et builds sur une base PostgreSQL éphémère.

## Paiement Mobile Money avec pawaPay

L'intégration utilise la Merchant API pawaPay v2. Le stock est réservé atomiquement lors de la création de commande et une transition `Pending -> Paid/Failed` ne peut être appliquée qu'une fois. Un échec libère le stock une seule fois. Le callback ne fait pas confiance au statut reçu : il confirme l'état final par l'API pawaPay authentifiée avant toute transition.

Le callback de dépôt public à configurer dans le dashboard pawaPay est :

`POST https://api.example.com/api/v1/payment/pawapay/callback`

En RDC, la configuration fournie accepte `AIRTEL_COD`, `VODACOM_MPESA_COD` et `ORANGE_COD`. Le téléphone doit être saisi au format international, par exemple `243XXXXXXXXX` (le signe `+` et les espaces sont automatiquement retirés). Utilisez `https://api.sandbox.pawapay.io` pour les tests et l'URL live communiquée par pawaPay en production.

## Déploiement

- Exécuter `npx prisma migrate deploy` avant le démarrage de chaque nouvelle version de l'API.
- Construire les images frontend avec `VITE_API_URL`, `VITE_SOCKET_URL` et `VITE_DASHBOARD_URL` pointant vers les URL publiques HTTPS.
- Utiliser des domaines HTTPS autorisés dans `FRONTEND_URL` et `DASHBOARD_URL`.
- Ne jamais partager `DATABASE_URL`, `PAWAPAY_API_TOKEN`, les identifiants Cloudinary, SMTP, Gemini ou le secret JWT.
- Le endpoint de santé est `GET /api/v1/health`.
