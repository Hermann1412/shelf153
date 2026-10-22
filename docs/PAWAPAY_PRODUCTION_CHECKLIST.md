# Checklist pawaPay avant production

## Configuration

- [ ] `PAWAPAY_BASE_URL` pointe vers l'URL live confirmée par pawaPay.
- [ ] `PAWAPAY_API_TOKEN` est stocké dans le gestionnaire de secrets, jamais dans Git.
- [ ] Les opérateurs et devises du compte sont confirmés via Active Configuration.
- [ ] Un taux USD/CDF actif a été créé dans **Admin > Finance**.
- [ ] `MIN_SELLER_PAYOUT_USD` correspond à la politique commerciale.
- [ ] Les trois callbacks HTTPS sont configurés : deposit, payout et refund.
- [ ] L'autorité publique du callback tient compte du reverse proxy.
- [ ] Si les signatures sont activées, clés, key IDs, algorithme et horloges système sont vérifiés.

## Sandbox réel

- [ ] Airtel USD : deposit, payout, refund total et partiel.
- [ ] Airtel CDF : deposit, payout, refund total et partiel.
- [ ] Orange USD/CDF selon Active Configuration.
- [ ] Vodacom USD/CDF selon Active Configuration, avec montant CDF entier.
- [ ] Scénarios `COMPLETED`, `FAILED`, `PROCESSING`/`ENQUEUED` disponibles.
- [ ] Callback reçu, callback dupliqué, callback retardé et callback absent.
- [ ] Timeout d'initiation : aucun nouvel UUID n'est créé et la réconciliation retrouve l'opération.
- [ ] `NOT_FOUND` doit être confirmé plusieurs fois avant libération.

## Données et exploitation

- [ ] Sauvegarde PostgreSQL créée et restauration répétée sur staging.
- [ ] `npx prisma migrate deploy` validé sur une copie de production.
- [ ] Le ledger, les dettes et les écritures d'audit sont exportables.
- [ ] Le processus d'import des frais/relevés pawaPay est défini.
- [ ] Les alertes couvrent transactions longtemps pending, mismatches et échecs répétés.
- [ ] Aucun payout réel n'est déclenché par les tests ou la CI.

## Validation logicielle

- [ ] Backend : Prisma validate, lint et tests d'intégration passent.
- [ ] Frontend et dashboard : lint, tests et builds passent.
- [ ] Audit des dépendances de production sans vulnérabilité haute/critique.
- [ ] Recherche de secrets dans les fichiers suivis effectuée.
- [ ] Revue manuelle des permissions Admin, vendeur et client terminée.
