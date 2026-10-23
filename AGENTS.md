# AGENTS.md — Garage El Jaouhari Manager 2027

Guide de référence pour **tout contributeur, humain ou agent IA** (Claude Code, Copilot, Cursor, Codex…).
Il décrit l'état réel du projet, ce qui reste à faire, les règles à respecter et la place de l'IA aujourd'hui et demain.

> **Règle n°1 — tenir ce fichier à jour.**
> Toute fonctionnalité livrée, modifiée ou retirée **doit** mettre à jour ce fichier dans le même commit :
> le tableau « État des modules », la liste « Reste à faire » et le « Journal des versions ».
> Une pull request qui ajoute une fonctionnalité sans mettre à jour `AGENTS.md` n'est pas terminée.

---

## 1. Le projet en bref

Logiciel de gestion d'un garage automobile (mécanique, carrosserie, peinture) à Casablanca, utilisable sur PC et
téléphone avec une seule base de données partagée : de l'accueil du véhicule jusqu'au devis, à la réparation,
à la facturation et à l'encaissement. Destiné à devenir un produit PaaS multi-garages.

- **Backend** : Django 6 + Django REST Framework (`backend/`), SQLite en développement.
- **Frontend** : React 19 + Vite + TanStack Query + Tailwind CSS v4 (`frontend/`).
- **Langue de l'interface** : français. Devise : MAD.
- **Démarrage** : voir [README.md](README.md) (backend sur le port 8010, frontend sur 5180).

## 2. Architecture et conventions

```
backend/apps/<domaine>/      models.py · serializers.py · views.py · services.py (logique métier)
  core/                      paramètres garage, documents, journal ActivityLog, dashboard, recherche, notifications, exports
  clients/  repairs/  billing/  inventory/  staff/
backend/data/oem/            fichiers Excel Base_OEM_*.xlsx importés par `seed_demo` / `import_oem`
frontend/src/
  components/ui/             primitives (Button, Input, Badge…) — pas de logique métier
  components/common/         DataTable, Panel (panneau latéral docké), ResourceForm (formulaire par schéma), CrudPage
  features/<module>/         une page = un dossier : *-fields.js (schéma de formulaire), *-columns.jsx, page .jsx
  lib/api.js                 un `createResource()` par endpoint REST — jamais d'appel axios dans un composant
  lib/choices.js             miroir des `choices` Django (libellés + couleurs de badge)
```

Conventions à respecter :

- **Calculs financiers côté serveur uniquement** (`billing/services.py`, `Invoice.refresh_status`). Le frontend peut
  prévisualiser des totaux mais la vérité vient de l'API.
- **Validation métier dans les serializers DRF**, avec des messages d'erreur en français lisibles par l'utilisateur.
- **Toute action importante est journalisée** via `ActivityLog.record(...)` (historique client / dossier).
- **Actions destructives** : toujours via `useConfirm()` côté frontend ; les paiements et mouvements de stock
  ne se suppriment jamais (annulation motivée ou mouvement correctif).
- **Couleurs** : uniquement les tokens sémantiques (`bg-card`, `text-muted-foreground`, `bg-primary`…) définis dans
  `frontend/src/index.css` ; le mode sombre doit continuer à fonctionner.
- **Formulaires** : ne pas masquer les tableaux ni le menu → utiliser `FormPanel` (panneau docké à droite).
- **Responsive** : chaque nouvelle page doit être vérifiée en largeur téléphone (375 px).
- **Secrets** : uniquement dans `backend/.env` (jamais commité) ; documenter toute nouvelle variable dans `.env.example`.
- **Commits** : messages clairs en français, préfixés (`feat:`, `fix:`, `docs:`, `refactor:`), un sujet par commit.

## 3. Règles métier non négociables

| Domaine | Règle |
|---|---|
| Devis | Pièces sur fond jaune avec TVA (20 % par défaut) ; prestations sur fond blanc maintenues en HT (taux configurable). Un devis **accepté est verrouillé** : toute modification crée une nouvelle version, les anciennes restent consultables. |
| Factures | Créées depuis un devis accepté. Une facture **émise** n'est plus modifiable (seuls statut, échéance, notes) ; annulation uniquement avec motif. |
| Paiements | Un chèque n'est compté comme reçu **qu'une fois encaissé**. Remboursement = motif obligatoire. Aucun encaissement compté deux fois. Pas de suppression. |
| Stock | Mouvements immuables ; une sortie est rattachée à un dossier ; stock négatif interdit. |
| Références OEM | **Ne jamais inventer ni déduire une référence OEM** à partir d'un nom de pièce. Sans référence → statut « Inconnue ». « Confirmée » exige une source et une date de vérification. La compatibilité ne peut être confirmée que pour une référence confirmée (idéalement par VIN). |
| Équivalences | Une équivalence « vérifiée » exige une source et une date. Les données de démonstration ne contiennent aucune référence OEM. |
| Fiscalité | La présentation (prestations en HT) reste **à valider** avec les obligations fiscales marocaines avant usage officiel. |

## 4. État des modules

Légende : ✅ fait · 🟡 partiel · ⬜ à faire

| Module | État | Détail |
|---|---|---|
| Interface générale | ✅ | Menu sombre à accents rouges, barre de recherche ⌘K, notifications, mode sombre, responsive mobile |
| Tableau de bord | ✅ | KPIs facturé / encaissé / créances / chèques, graphique 6 mois, pipeline atelier, alertes, activité |
| Clients | ✅ | Dossier permanent 8 onglets, anti-doublon (téléphone / CIN), historique |
| Véhicules | ✅ | Rattachés au client, plaque / VIN / kilométrage, création depuis la fiche client |
| Dossiers de réparation | ✅ | 13 statuts, vue liste + atelier (glisser-déposer), tâches, équipe, résumé financier et marge |
| Assurances & expertises | 🟡 | Parcours en 8 étapes, compagnies, experts (anti-doublon). Manque : rapports d'expertise structurés, relances |
| Devis | ✅ | Lignes pièces / prestations, versions, verrouillage, impression A4 / PDF navigateur |
| Factures | ✅ | Depuis devis, part assurance / client, émission, litige, annulation motivée, impression |
| Paiements | ✅ | Espèces / virement / chèque / carte, acomptes, chèques (statuts), remboursements, annulations, filtres, export |
| Stock & pièces | ✅ | Catalogue, emplacements, mouvements, alertes de rupture, coût pièces par dossier |
| Compatibilité | 🟡 | Recherche par véhicule dans le stock **et** dans le catalogue OEM. Manque : décodage VIN |
| Catalogue OEM & équivalences | 🟡 | Modèle `OemReference` + `OemEquivalence`, import Excel (commande + bouton), suivi de vérification par famille, correspondances stock. **Données importées : Peugeot 208 2023 1.5 BlueHDi, 114 lignes, toutes « Inconnue »** — références à rechercher et saisir |
| Fournisseurs | 🟡 | Fiches et délais. Manque : commandes, livraisons, factures et dettes fournisseurs |
| Employés & tâches | 🟡 | Fiches, charge, retards, temps passé. Manque : rôles / droits d'accès |
| Notifications | 🟡 | Calculées en temps réel (11 types). Manque : historique persistant, accusé de lecture |
| Documents & rapports | 🟡 | Upload photos / pièces jointes, rentabilité par type, exports CSV. Manque : PDF serveur, export Excel natif, SAGE |
| Paramètres & sécurité | 🟡 | Identité garage, TVA, mentions légales. Manque : utilisateurs, rôles, sauvegarde / restauration |
| Authentification | ⬜ | Aucune connexion pour l'instant (API ouverte — **ne pas exposer sur Internet**) |
| IA / OCR / WhatsApp | ⬜ | Voir section 5 |

## 5. Intelligence artificielle — état actuel et cible

**État actuel : aucune fonctionnalité d'IA n'est intégrée.** Aucun appel à un modèle, aucune clé d'API, aucun OCR.
Le code est néanmoins préparé pour l'accueillir : champs de statut de vérification, journal d'activité, validation
serveur, séparation « proposé / confirmé » sur les références OEM.

Fonctions envisagées (cahier des charges §13), par ordre de priorité suggéré :

1. **OCR des documents** — carte grise, constat, documents d'assurance, factures fournisseurs, reçus.
   Préremplit les champs ; chaque champ incertain est signalé et doit être validé par l'utilisateur.
2. **Aide à la recherche de références** — proposer des références OEM / équivalences **en statut « À vérifier »
   uniquement**, avec la source citée. Jamais « Confirmée » automatiquement.
3. **Analyse des photos de dommages** — zones endommagées indicatives, suggestion d'opérations et préremplissage d'un
   devis brouillon à partir du catalogue du garage (prix inconnus marqués « à confirmer »).
4. **Assistance administrative** — brouillons de relances de paiement, réponses clients, demandes de prix fournisseurs,
   synthèse de dossier.

Règles de sécurité de l'IA (obligatoires pour toute future intégration) :

- L'IA **propose**, l'humain **valide** : aucune décision financière ou technique définitive, aucun envoi
  (client, assurance, fournisseur, WhatsApp) sans validation explicite.
- Les prix viennent du catalogue ou sont marqués « à confirmer » ; l'analyse photo ne remplace pas l'inspection.
- Les clés d'API restent **côté serveur** (`backend/.env`), jamais dans le navigateur.
- Toute donnée produite par l'IA est traçable (origine « IA », date, utilisateur qui a validé) dans `ActivityLog`.
- Prévoir un mode dégradé : l'application doit fonctionner sans le service d'IA.

## 6. Reste à faire (prochaines étapes)

Ordre recommandé (cahier des charges §20) :

1. Authentification, rôles et permissions (gérant, réception, atelier, comptable) ; protéger toute l'API.
2. PostgreSQL, sauvegarde et restauration testées, stockage des fichiers hors du disque applicatif.
3. Compléter le catalogue OEM (recherche des références, sources, prix) et lier les lignes aux pièces du stock.
4. Fournisseurs : commandes, réceptions, factures et paiements fournisseurs, dettes.
5. Notifications persistantes avec historique et lecture.
6. Génération PDF côté serveur, exports Excel natifs et format SAGE.
7. Tests automatisés backend (règles de calcul, verrouillages, paiements) — aucun test pour l'instant.
8. OCR / IA / WhatsApp selon la section 5.
9. Multi-tenant (plusieurs garages) pour la version PaaS ; installation Windows si nécessaire.

## 7. Comment contribuer (humains et agents)

1. Lire ce fichier et le [README.md](README.md) ; lancer `seed_demo --reset` pour disposer de données.
2. Respecter les sections 2 et 3. En cas de doute sur une règle métier, **demander** plutôt qu'inventer.
3. Vérifier : `python manage.py check`, `npx vite build`, et tester la page dans le navigateur (desktop + mobile).
4. Mettre à jour **ce fichier** (sections 4 et 6, journal ci-dessous) et, si besoin, le README.
5. Commit clair, puis push. Ne jamais committer `.env`, base SQLite, `media/`, `node_modules/`.

## 8. Journal des versions

| Version | Date | Contenu |
|---|---|---|
| v1.0.0 | 2026-10-23 | MVP CRUD complet : clients, véhicules, dossiers, assurance 8 étapes, devis versionnés, factures, paiements, stock, compatibilité, fournisseurs, équipe, notifications, rapports, paramètres. |
| v1.1.0 | 2026-10-23 | Catalogue OEM véhicule et équivalences : modèles `OemReference` / `OemEquivalence`, import Excel (`import_oem` + bouton), onglets Catalogue OEM et Équivalences, correspondances avec le stock. Import de la base Peugeot 208 2023 1.5 BlueHDi (114 lignes à compléter). Retrait des références OEM fictives des données de démo. Création de ce fichier `AGENTS.md`. |
