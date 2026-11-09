# Shelf153

Marketplace composée d'une API Express/Prisma, d'une boutique React et d'un dashboard React.

Documentation détaillée des paiements, remboursements, payouts et variables d'environnement : [docs/FONCTIONNEMENT_PAIEMENTS_PAWAPAY.md](docs/FONCTIONNEMENT_PAIEMENTS_PAWAPAY.md).

## Prérequis

- Node.js 24
- PostgreSQL 17 (PostgreSQL 14+ convient également)
- Comptes pawaPay, Cloudinary et SMTP pour les fonctions correspondantes

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

Le client choisit `USD` ou `CDF` avant de confirmer sa commande. Les prix catalogue et la commande restent comptabilisés en USD. Le taux actif provient d'abord de la table historisée `exchange_rates`, administrable dans la page **Finance** ; `PAWAPAY_CDF_PER_USD` n'est plus qu'un fallback de transition. La devise, le montant encaissé et le taux sont figés dans `payments`. Le endpoint public `GET /api/v1/order/payment/config` fournit le taux et sa source.

Un cycle automatique réconcilie dépôts, payouts et remboursements avec backoff exponentiel et limite par cycle. Un `NOT_FOUND` n'est définitif qu'après `PAWAPAY_NOT_FOUND_CONFIRMATIONS` contrôles ; un timeout ou une réponse ambiguë reste en attente.

Le callback de dépôt public à configurer dans le dashboard pawaPay est :

`POST https://api.example.com/api/v1/payment/pawapay/callback`

### Commission plateforme

`PLATFORM_COMMISSION_RATE=0.07` applique une retenue totale de 7 % sur le montant des produits de chaque ligne de commande, hors taxe et livraison. Les frais pawaPay sont inclus dans cette retenue : ils diminuent uniquement `platform_net_revenue` et ne sont jamais ajoutés au total client ni retirés une seconde fois du net vendeur.

Les calculs utilisent des unités monétaires minimales et un arrondi déterministe, puis enregistrent sur chaque ligne le brut, le taux historique, la commission et le net vendeur. Le paiement conserve les totaux, les frais prestataire, le revenu plateforme et les éventuels remboursements. Un paiement échoué reçoit le statut comptable `Void` et ne génère aucun revenu définitif.

La réponse de statut pawaPay ne contient actuellement aucun champ de frais. Après rapprochement avec le relevé du prestataire, un Admin peut enregistrer le frais réel via `PATCH /api/v1/order/payment/:orderId/fee` avec `{ "fee": "2.50", "currency": "USD", "reason": "relevé août" }`. Chaque changement conserve l'ancienne valeur, la nouvelle valeur, l'auteur et le motif. Les frais de payout utilisent `PATCH /api/v1/payout/:payoutId/fee`.

Les remboursements partiels et totaux utilisent `POST /api/v1/refund/order/:orderId/item/:orderItemId`. Le UUID pawaPay est stocké avant l'appel. La comptabilité n'est appliquée qu'après un statut `COMPLETED` relu auprès de pawaPay. Après un payout vendeur terminé, la part vendeur devient une dette auditée et sera récupérée sur les revenus futurs. Le callback public est `POST https://api.example.com/api/v1/payment/pawapay/refund-callback`.

Le ledger `financial_ledger_entries` enregistre ventes, commissions, montants vendeurs, frais, payouts, remboursements, dettes et recouvrements avec une clé d'idempotence. Les corrections manuelles sont conservées dans `financial_adjustment_audits`.

### Paiements sortants aux vendeurs

Un administrateur peut payer les revenus d'un vendeur depuis la page **Paiements vendeurs** du dashboard. Seuls les articles dont le paiement de commande est `Paid`, dont le statut vendeur est `Delivered` et qui n'appartiennent à aucun autre paiement sortant sont éligibles. Le vendeur doit d'abord enregistrer son numéro international et son opérateur Mobile Money dans son profil boutique.

Les articles sont réservés dans une transaction PostgreSQL avant l'appel à pawaPay. Le UUID du paiement sortant sert aussi de clé d'idempotence pawaPay. Une réponse réseau ambiguë reste `Pending` et est réconciliée automatiquement ; une confirmation `FAILED` ou `NOT_FOUND` libère les articles pour une nouvelle tentative, tandis qu'un paiement `Completed` conserve définitivement leur rattachement.

L'Admin choisit `USD` ou `CDF` au moment du paiement. Le payout déduit d'abord les dettes vendeur, respecte `MIN_SELLER_PAYOUT_USD`, et utilise le taux actif historisé. Le montant brut gagné, la dette récupérée, le montant réellement versé et le taux restent figés dans `seller_payouts`. Les montants CDF sont arrondis à l'unité.

Le callback de paiement sortant public à configurer dans pawaPay est :

`POST https://api.example.com/api/v1/payment/pawapay/payout-callback`

Le contenu d'un callback n'est jamais considéré comme une preuve suffisante : l'API relit le statut via l'API pawaPay authentifiée et vérifie l'identifiant, le montant, la devise, le numéro et l'opérateur avant de finaliser la transition.

Routes du dashboard :

- `GET /api/v1/payout` : historique de tous les vendeurs pour un Admin, ou uniquement celui du vendeur connecté.
- `GET /api/v1/payout/summary` : montants éligibles, réservé à l'Admin.
- `POST /api/v1/payout/seller/:sellerId` avec `{ "currency": "USD" }` ou `{ "currency": "CDF" }` : initier le paiement de tous les revenus éligibles d'un vendeur, réservé à l'Admin.
- `GET /api/v1/payout/:payoutId/status` : contrôler et synchroniser le statut, limité à l'Admin ou au vendeur propriétaire.
- `GET /api/v1/admin/finance` : ledger, remboursements, payouts, dettes, taux et audits.
- `POST /api/v1/admin/finance/exchange-rates` : créer et activer un nouveau taux historisé.
- `POST /api/v1/admin/finance/fees/import` : importer jusqu'à 500 frais rapprochés avec une référence externe unique par ligne.

### Signatures RFC 9421

Les callbacks signés et les requêtes financières signées sont désactivés par défaut. Après activation dans le dashboard pawaPay, configurer `PAWAPAY_REQUIRE_SIGNED_CALLBACKS=true`, la clé publique HTTP pawaPay, son key ID et l'autorité exacte du callback. Pour signer les dépôts, payouts et refunds sortants, configurer `PAWAPAY_SIGN_FINANCIAL_REQUESTS=true`, une clé privée dédiée et le key ID public déclaré chez pawaPay. Ne jamais stocker les clés dans Git.

En RDC, la configuration fournie accepte `AIRTEL_COD`, `VODACOM_MPESA_COD` et `ORANGE_COD`. Le téléphone doit être saisi au format international, par exemple `243XXXXXXXXX` (le signe `+` et les espaces sont automatiquement retirés). Utilisez `https://api.sandbox.pawapay.io` uniquement pour les tests. Sur Render, `PAWAPAY_BASE_URL` et `PAWAPAY_API_TOKEN` doivent obligatoirement être renseignés avec les valeurs live avant le lancement commercial.

## Déploiement

- Exécuter `npx prisma migrate deploy` avant le démarrage de chaque nouvelle version de l'API.
- Construire les images frontend avec `VITE_API_URL`, `VITE_SOCKET_URL` et `VITE_DASHBOARD_URL` pointant vers les URL publiques HTTPS.
- Déclarer ces trois variables dans les paramètres de chaque projet Vercel avant le build ; elles ne sont volontairement pas inscrites dans `vercel.json` car elles dépendent des domaines déployés.
- Utiliser des domaines HTTPS autorisés dans `FRONTEND_URL` et `DASHBOARD_URL`.
- Ne jamais partager `DATABASE_URL`, `PAWAPAY_API_TOKEN`, les identifiants Cloudinary, SMTP ou le secret JWT.
- Le endpoint de santé est `GET /api/v1/health`.
