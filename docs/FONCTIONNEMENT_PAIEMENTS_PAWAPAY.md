# Fonctionnement des paiements Shelf153 avec pawaPay

Ce document décrit le fonctionnement des dépôts clients, remboursements, paiements vendeurs, frais, taux USD/CDF, callbacks, réconciliation et écritures comptables de Shelf153.

## 1. Principes financiers

La devise comptable de la plateforme est actuellement l'USD. Le client et le vendeur peuvent néanmoins utiliser USD ou CDF avec pawaPay.

La retenue commerciale est calculée par ligne de commande :

```text
commission plateforme brute = montant des produits × 7 %
montant vendeur              = montant des produits - commission plateforme brute
revenu net plateforme        = commission brute - frais dépôt - frais payout + frais remboursés
```

Exemple :

```text
Vente produits :                 100 USD
Commission plateforme 7 % :       7 USD
Montant vendeur :                 93 USD
Frais de paiement client :         2 USD
Frais de payout vendeur :          1 USD
Revenu net plateforme :            4 USD
```

Le vendeur reçoit toujours 93 USD avant remboursements ou dettes éventuelles. Les frais pawaPay sont supportés par les 7 % de la plateforme ; ils ne sont pas retirés une deuxième fois au vendeur.

Tous les calculs critiques utilisent des unités monétaires minimales et `BigInt`. Les valeurs historiques importantes — commission, montant, devise et taux de change — sont enregistrées au moment de la transaction.

## 2. Paiement client — deposit

### Création de la commande

Le client choisit son opérateur, son numéro Mobile Money et la devise USD ou CDF. Le serveur :

1. relit les produits et prix depuis PostgreSQL ;
2. valide les quantités et le stock ;
3. calcule le brut, la commission de 7 % et le net vendeur par ligne ;
4. calcule taxe, livraison et total client ;
5. récupère le taux USD/CDF actif lorsque le client paie en CDF ;
6. réserve le stock dans une transaction Prisma `Serializable` ;
7. crée la commande et son paiement `Pending` ;
8. stocke l'UUID avant d'appeler pawaPay ;
9. appelle `POST /v2/deposits`.

Une réponse `ACCEPTED` ou `DUPLICATE_IGNORED` laisse le paiement en attente de son résultat final. Une réponse explicitement `REJECTED` fait échouer le paiement et libère le stock. Un timeout ou une erreur réseau ne prouve pas l'échec : le paiement reste `Pending` pour réconciliation.

### Finalisation

Le paiement n'est marqué `Paid` que lorsque le serveur relit son statut via l'API pawaPay authentifiée et vérifie :

- le `depositId` ;
- le montant ;
- la devise ;
- l'opérateur.

La transition `Pending → Paid/Failed` est atomique et ne peut être appliquée qu'une fois. En cas de succès, les écritures `SALE`, `PLATFORM_COMMISSION` et `SELLER_PAYABLE` sont ajoutées au ledger.

Documentation pawaPay : [Initiate deposit](https://docs.pawapay.io/v2/api-reference/deposits/initiate-deposit).

## 3. Remboursement client — refund

Un remboursement est créé depuis **Dashboard Admin → Finance**, ou avec :

```http
POST /api/v1/refund/order/:orderId/item/:orderItemId
Content-Type: application/json

{
  "grossAmount": "20.00",
  "externalReference": "support-ticket-123",
  "paymentFeeRefund": "0.00"
}
```

`externalReference` est une clé d'idempotence métier. Réutiliser la même valeur ne doit pas créer un second remboursement.

Le workflow est le suivant :

1. validation de la commande, du paiement et du montant restant ;
2. vérification qu'aucun autre refund n'est en cours pour le dépôt ;
3. génération et stockage du `refundId` UUIDv4 ;
4. calcul des montants comptables et du montant dans la devise pawaPay ;
5. appel `POST /v2/refunds` avec le même `refundId` en cas de retry ;
6. attente du callback ou interrogation de `GET /v2/refunds/:refundId` ;
7. comparaison de l'identifiant, du montant, de la devise, de l'opérateur et du numéro ;
8. comptabilisation uniquement après `COMPLETED`.

Pour un paiement CDF, le taux stocké sur le paiement original est réutilisé. Le taux actif actuel n'est jamais appliqué à une ancienne transaction.

Lorsque toutes les lignes de produits ont été remboursées, le dernier remboursement couvre le solde restant du dépôt client, incluant donc le reliquat lié à la taxe et à la livraison.

Statuts internes principaux :

- `Pending`, `Accepted`, `Processing`, `Enqueued` : non final ;
- `Completed` : fonds remboursés et comptabilité appliquée ;
- `Failed` : remboursement définitivement refusé ou introuvable après confirmations répétées.

Documentation pawaPay : [Initiate refund](https://docs.pawapay.io/v2/api-reference/refunds/initiate-refund), [Check refund status](https://docs.pawapay.io/v2/api-reference/refunds/check-refund-status) et [Refund callback](https://docs.pawapay.io/v2/api-reference/refunds/refund-callback).

## 4. Remboursement après payout vendeur

Si le vendeur a déjà reçu sa part avant le remboursement, le système crée une dette `SellerDebt` au lieu de faire supporter cette perte silencieusement à la plateforme.

Exemple :

```text
Nouveaux revenus vendeur : 150 USD
Dette de remboursement :    40 USD
Payout maximum :            110 USD
```

La dette contient le remboursement, la commande, le vendeur, le montant initial, le montant récupéré et le solde restant. Chaque récupération crée une ligne `SellerDebtRecovery` et une écriture `DEBT_RECOVERY`.

Si une ligne appartient à un payout encore `Pending`, la course refund/payout reste sûre :

- si le payout échoue, les lignes et récupérations réservées sont libérées ;
- s'il réussit, la dette correspondant au refund déjà complété est créée ;
- les contraintes et transactions empêchent deux payouts ou deux refunds actifs concurrents.

## 5. Paiement vendeur — payout

Un payout peut uniquement être lancé par un Admin. Sont éligibles les lignes :

- liées à un paiement client `Paid` ;
- marquées `Delivered` ;
- non réservées par un payout existant ;
- diminuées des remboursements réussis.

Le serveur calcule :

```text
revenus éligibles
- dettes vendeur récupérables
= montant réellement envoyé au vendeur
```

Il applique ensuite `MIN_SELLER_PAYOUT_USD`. Les lignes sont réservées et le payout est créé dans une transaction `Serializable` avant l'appel pawaPay. Un payout dont la totalité sert à rembourser une dette est clôturé localement sans envoyer un transfert Mobile Money de montant zéro.

Un timeout laisse le payout `Pending`. Un `FAILED` confirmé libère les lignes et restaure les dettes provisoirement récupérées. Un `COMPLETED` génère les écritures `PAYOUT` et `DEBT_RECOVERY`.

Documentation pawaPay : [Initiate payout](https://docs.pawapay.io/v2/api-reference/payouts/initiate-payout) et [Check payout status](https://docs.pawapay.io/v2/api-reference/payouts/check-payout-status).

## 6. Frais pawaPay

Les réponses de statut utilisées actuellement ne donnent pas un montant fiable de frais pour chaque transaction. Le système n'invente donc aucun frais.

Les frais peuvent être enregistrés :

- manuellement dans **Admin → Finance** ;
- avec `PATCH /api/v1/order/payment/:orderId/fee` pour un deposit ;
- avec `PATCH /api/v1/payout/:payoutId/fee` pour un payout ;
- par import JSON avec `POST /api/v1/admin/finance/fees/import`.

Exemple d'import :

```json
{
  "entries": [
    {
      "reference": "statement-2026-09-deposit-123",
      "kind": "payment",
      "orderId": "UUID_COMMANDE",
      "amount": "2.00",
      "currency": "USD",
      "reason": "Rapprochement relevé pawaPay septembre"
    },
    {
      "reference": "statement-2026-09-payout-456",
      "kind": "payout",
      "payoutId": "UUID_PAYOUT",
      "amount": "2800",
      "currency": "CDF",
      "reason": "Frais payout relevé pawaPay septembre"
    }
  ]
}
```

Chaque correction conserve l'ancienne valeur, la nouvelle valeur, le motif, la source, l'Admin et la référence d'import. Une référence d'import déjà traitée est ignorée.

## 7. Ledger financier

`financial_ledger_entries` est un journal append-only. Les types utilisés sont :

| Type | Signification |
|---|---|
| `SALE` | Vente de produits confirmée |
| `PLATFORM_COMMISSION` | Commission brute de 7 % |
| `SELLER_PAYABLE` | Montant acquis au vendeur |
| `PAYMENT_FEE` | Frais liés au dépôt client |
| `PAYOUT` | Montant effectivement versé au vendeur |
| `PAYOUT_FEE` | Frais liés au payout |
| `REFUND` | Remboursement client confirmé |
| `SELLER_REFUND_DEBT` | Dette vendeur créée après remboursement |
| `DEBT_RECOVERY` | Dette récupérée sur de futurs revenus |

Chaque écriture possède une clé d'idempotence et les identifiants financiers applicables. Les commandes financièrement comptabilisées et les utilisateurs ayant un historique financier ne peuvent pas être supprimés ; ils doivent être annulés, remboursés ou suspendus.

## 8. Taux USD/CDF

Les taux sont administrés dans **Admin → Finance** avec :

```http
POST /api/v1/admin/finance/exchange-rates

{
  "sourceCurrency": "USD",
  "destinationCurrency": "CDF",
  "rate": "2800",
  "effectiveAt": "2026-09-15T00:00:00Z"
}
```

Créer un nouveau taux désactive le taux actif précédent sans le supprimer. Chaque paiement et payout conserve son propre snapshot `exchange_rate`. `PAWAPAY_CDF_PER_USD` sert seulement de fallback lorsqu'aucun taux actif n'existe encore en base.

## 9. Callbacks

Remplacer `api.example.com` par le domaine HTTPS public du backend :

```text
Deposit : POST https://api.example.com/api/v1/payment/pawapay/callback
Payout  : POST https://api.example.com/api/v1/payment/pawapay/payout-callback
Refund  : POST https://api.example.com/api/v1/payment/pawapay/refund-callback
```

Les callbacks sont limités en débit. Le corps reçu n'est jamais suffisant pour finaliser une transaction : l'API Shelf153 interroge pawaPay avec son token, puis compare les données stockées.

## 10. Signatures RFC 9421

Deux protections indépendantes sont disponibles :

1. validation des callbacks signés par pawaPay ;
2. signature des requêtes financières envoyées à pawaPay.

La validation contrôle le `Content-Digest`, la signature, l'algorithme, le key ID, les dates `created`/`expires`, la méthode, l'autorité, le chemin et le type de contenu. Elle est désactivée par défaut et ne doit être activée qu'après configuration des clés correspondantes dans le dashboard pawaPay.

Documentation : [Signatures in API](https://docs.pawapay.io/v2/docs/signatures) et [Public Keys](https://docs.pawapay.io/v2/api-reference/toolkit/public-keys).

## 11. Réconciliation automatique

Le worker démarre avec le serveur et traite périodiquement :

- deposits `Pending` ;
- payouts `Pending` ;
- refunds `Pending`, `Accepted`, `Processing` ou `Enqueued`.

Il utilise un backoff exponentiel plafonné, une limite de transactions par cycle et des écritures structurées lorsqu'une transaction reste bloquée. `NOT_FOUND` doit être observé plusieurs fois avant qu'une opération incertaine soit déclarée échouée.

Plusieurs instances backend peuvent fonctionner simultanément : chaque opération est revendiquée par mise à jour conditionnelle avant l'appel distant.

## 12. Variables d'environnement backend

### Serveur, sécurité et base de données

| Variable | Exemple | Obligatoire | Explication |
|---|---|---:|---|
| `PORT` | `4000` | Non | Port HTTP du backend. |
| `NODE_ENV` | `production` | Production | Active cookies sécurisés et validation stricte de la configuration. |
| `DATABASE_URL` | `postgresql://user:password@host:5432/db?schema=public` | Oui | Connexion PostgreSQL utilisée par Prisma. |
| `TEST_DATABASE_URL` | `postgresql://.../shelf153_test` | Tests | Base exclusivement réservée aux tests d'intégration. |
| `REQUIRE_TEST_DATABASE` | `true` | CI | Fait échouer la suite si `TEST_DATABASE_URL` manque. |
| `FRONTEND_URL` | `https://shop.example.com` | Oui | Origine CORS autorisée pour la boutique. |
| `DASHBOARD_URL` | `https://admin.example.com` | Oui | Origine CORS autorisée pour le dashboard. |
| `TRUST_PROXY_HOPS` | `1` | Selon hébergeur | Nombre de reverse proxies Express considérés comme fiables. Laisser vide localement. |
| `JWT_SECRET_KEY` | secret aléatoire long | Oui | Signature des sessions JWT. Ne jamais commiter. |
| `JWT_EXPIRES_IN` | `7d` | Oui | Durée de validité du JWT. |
| `COOKIE_EXPIRES_IN` | `7` | Oui | Durée du cookie en jours. |

### pawaPay général et deposits

| Variable | Valeur recommandée | Explication |
|---|---|---|
| `PAWAPAY_BASE_URL` | Sandbox : `https://api.sandbox.pawapay.io` | URL Merchant API v2. En production, utiliser uniquement l'URL live communiquée par pawaPay. |
| `PAWAPAY_API_TOKEN` | secret pawaPay | Token Bearer pour les appels authentifiés. Obligatoire et secret. |
| `PAWAPAY_CURRENCY` | `USD` | Devise client par défaut si le frontend n'en envoie pas. |
| `PAWAPAY_ALLOWED_CURRENCIES` | `USD,CDF` | Liste des devises client acceptées par Shelf153. Elles doivent aussi être activées chez pawaPay. |
| `PAWAPAY_DEFAULT_PROVIDER` | `AIRTEL_COD` | Opérateur client par défaut. |
| `PAWAPAY_ALLOWED_PROVIDERS` | `AIRTEL_COD,VODACOM_MPESA_COD,ORANGE_COD` | Opérateurs acceptés pour les deposits. Vérifier leur disponibilité réelle via Active Configuration. |
| `PAWAPAY_TIMEOUT_MS` | `15000` | Timeout HTTP. Son expiration laisse l'opération incertaine ; elle ne provoque pas automatiquement un échec. |

### Payouts vendeurs

| Variable | Valeur recommandée | Explication |
|---|---|---|
| `PAWAPAY_PAYOUT_CURRENCY` | `USD` | Devise payout par défaut. |
| `PAWAPAY_PAYOUT_ALLOWED_CURRENCIES` | `USD,CDF` | Devises autorisées pour les payouts. |
| `PAWAPAY_PAYOUT_ALLOWED_PROVIDERS` | `AIRTEL_COD,VODACOM_MPESA_COD,ORANGE_COD` | Opérateurs autorisés pour les vendeurs. |
| `MIN_SELLER_PAYOUT_USD` | ex. `10.00` | Montant minimum effectivement envoyé au vendeur, en USD comptable. `0` désactive le seuil. |

### Commission et change

| Variable | Valeur recommandée | Explication |
|---|---|---|
| `PLATFORM_COMMISSION_RATE` | `0.07` | Taux de retenue commerciale. `0.07` signifie 7 %. Le taux utilisé est stocké sur chaque transaction. |
| `PAWAPAY_CDF_PER_USD` | ex. `2800` | Fallback temporaire USD→CDF si aucun taux actif n'existe dans `exchange_rates`. Préférer la gestion Admin. |
| `PRICE_INPUT_DIVISOR` | `283` | Conversion historique utilisée par le dashboard pour les prix produits. Cette variable ne remplace pas le taux pawaPay. |

### Réconciliation

| Variable | Valeur recommandée | Explication |
|---|---|---|
| `PAYMENT_RECONCILIATION_INTERVAL_MS` | `60000` | Fréquence de réveil du worker. |
| `PAYMENT_RECONCILIATION_AFTER_MINUTES` | `15` | Âge minimal d'un deposit avant première vérification automatique. |
| `PAYOUT_RECONCILIATION_AFTER_MINUTES` | `15` | Âge minimal d'un payout avant première vérification. |
| `REFUND_RECONCILIATION_AFTER_MINUTES` | `5` | Âge minimal d'un refund avant première vérification. |
| `PAWAPAY_RECONCILIATION_MAX_DELAY_MINUTES` | `360` | Plafond du backoff exponentiel entre deux vérifications. |
| `PAWAPAY_NOT_FOUND_CONFIRMATIONS` | `3` | Nombre de réponses `NOT_FOUND` requises avant échec définitif. |
| `PAWAPAY_RECONCILIATION_ALERT_AFTER_ATTEMPTS` | `5` | Nombre de tentatives à partir duquel un log `stuck` est produit. |

### Signatures RFC 9421

| Variable | Valeur recommandée | Explication |
|---|---|---|
| `PAWAPAY_REQUIRE_SIGNED_CALLBACKS` | `false`, puis `true` après configuration | Refuse tout callback non signé lorsqu'elle vaut `true`. |
| `PAWAPAY_CALLBACK_PUBLIC_KEY` | PEM avec `\n` échappés | Clé publique HTTP pawaPay servant à vérifier les callbacks. Ce n'est pas la clé publique du marchand. |
| `PAWAPAY_CALLBACK_KEY_ID` | key ID pawaPay | Identifiant attendu dans `Signature-Input`. |
| `PAWAPAY_CALLBACK_AUTHORITY` | `api.example.com` | Autorité publique réellement signée, sans protocole ni chemin. Indispensable derrière un proxy. |
| `PAWAPAY_SIGNATURE_CLOCK_SKEW_SECONDS` | `300` | Tolérance d'horloge pour `created` et `expires`. |
| `PAWAPAY_SIGN_FINANCIAL_REQUESTS` | `false`, puis `true` après échange de clés | Signe les POST deposit, payout et refund. |
| `PAWAPAY_SIGNING_PRIVATE_KEY` | clé privée PEM | Clé privée dédiée de Shelf153. Secret absolu, à stocker dans le gestionnaire de secrets. |
| `PAWAPAY_SIGNING_KEY_ID` | key ID marchand | Identifiant de la clé publique déposée dans le dashboard pawaPay. |
| `PAWAPAY_SIGNATURE_ALGORITHM` | `ecdsa-p256-sha256` | Algorithme RFC 9421. Valeurs supportées : `ecdsa-p256-sha256`, `ecdsa-p384-sha384`, `rsa-pss-sha512`, `rsa-v1_5-sha256`. |

### Services annexes

| Variable | Explication |
|---|---|
| `SMTP_SERVICE` | Service Nodemailer, par exemple `gmail`. |
| `SMTP_MAIL` | Adresse d'envoi des emails. |
| `SMTP_PASSWORD` | Mot de passe d'application SMTP. Secret. |
| `SMTP_HOST` | Serveur SMTP. |
| `SMTP_PORT` | Port SMTP, par exemple `465`. |
| `GEMINI_API_KEY` | Clé de la fonctionnalité de recommandation IA. Optionnelle si cette fonction est désactivée. |
| `CLOUDINARY_CLIENT_NAME` | Nom du compte Cloudinary. |
| `CLOUDINARY_CLIENT_API` | Identifiant API Cloudinary. |
| `CLOUDINARY_CLIENT_SECRET` | Secret Cloudinary. |

## 13. Variables frontend et dashboard

### Boutique

| Variable | Exemple | Explication |
|---|---|---|
| `VITE_API_URL` | `https://api.example.com/api/v1` | URL publique de l'API REST. |
| `VITE_SOCKET_URL` | `https://api.example.com` | URL publique Socket.IO. |
| `VITE_DASHBOARD_URL` | `https://admin.example.com` | Lien vers le dashboard vendeur/Admin. |

### Dashboard

| Variable | Exemple | Explication |
|---|---|---|
| `VITE_API_URL` | `https://api.example.com/api/v1` | URL publique de l'API REST. |
| `VITE_SOCKET_URL` | `https://api.example.com` | URL publique Socket.IO. |

Les variables `VITE_*` sont injectées au moment du build et sont publiques dans le bundle. Ne jamais y placer de token, clé privée ou mot de passe.

## 14. Exemple minimal local

```dotenv
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://shelf153:shelf153-local-only@localhost:5433/shelf153?schema=public
TEST_DATABASE_URL=postgresql://shelf153:shelf153-local-only@localhost:5433/shelf153_test?schema=public
FRONTEND_URL=http://localhost:5173
DASHBOARD_URL=http://localhost:5174
JWT_SECRET_KEY=REMPLACER_PAR_UN_SECRET_LONG_ET_ALEATOIRE
JWT_EXPIRES_IN=7d
COOKIE_EXPIRES_IN=7

PAWAPAY_BASE_URL=https://api.sandbox.pawapay.io
PAWAPAY_API_TOKEN=REMPLACER_PAR_LE_TOKEN_SANDBOX
PAWAPAY_ALLOWED_CURRENCIES=USD,CDF
PAWAPAY_ALLOWED_PROVIDERS=AIRTEL_COD,VODACOM_MPESA_COD,ORANGE_COD
PAWAPAY_PAYOUT_ALLOWED_CURRENCIES=USD,CDF
PAWAPAY_PAYOUT_ALLOWED_PROVIDERS=AIRTEL_COD,VODACOM_MPESA_COD,ORANGE_COD
PLATFORM_COMMISSION_RATE=0.07
MIN_SELLER_PAYOUT_USD=10.00

PAYMENT_RECONCILIATION_INTERVAL_MS=60000
PAYMENT_RECONCILIATION_AFTER_MINUTES=15
PAYOUT_RECONCILIATION_AFTER_MINUTES=15
REFUND_RECONCILIATION_AFTER_MINUTES=5
PAWAPAY_NOT_FOUND_CONFIRMATIONS=3
PAWAPAY_RECONCILIATION_MAX_DELAY_MINUTES=360
PAWAPAY_RECONCILIATION_ALERT_AFTER_ATTEMPTS=5

PAWAPAY_REQUIRE_SIGNED_CALLBACKS=false
PAWAPAY_SIGN_FINANCIAL_REQUESTS=false
```

## 15. Installation et validation

```bash
docker compose up -d postgres

cd backend
npm install
npx prisma migrate deploy
npm run lint
TEST_DATABASE_URL=postgresql://shelf153:shelf153-local-only@localhost:5433/shelf153_test?schema=public npm run test:integration
npm run build
```

Exécuter ensuite `npm run lint`, `npm test` et `npm run build` dans `frontend` puis `dashboard`.

Avant la production, suivre également [PAWAPAY_PRODUCTION_CHECKLIST.md](./PAWAPAY_PRODUCTION_CHECKLIST.md).

## 16. Points à configurer manuellement chez pawaPay

1. Activer les opérateurs et devises nécessaires au compte marchand.
2. Configurer les trois URL de callback HTTPS.
3. Tester réellement deposit, payout et refund en sandbox pour chaque opérateur actif.
4. Récupérer la clé publique HTTP et son key ID si les callbacks signés sont activés.
5. Déposer la clé publique Shelf153 dans le dashboard si les requêtes financières signées sont activées.
6. Mettre en place la rotation des clés sans interruption.
7. Définir le processus de rapprochement/import des frais depuis les relevés pawaPay.

Ne jamais utiliser de vrais numéros, fonds ou credentials de production dans les tests automatisés.
