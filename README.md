# Garage El Jaouhari — Manager 2027 (MVP)

Gestion centralisée du garage : clients, véhicules, dossiers de réparation, assurances & expertises,
devis, factures, paiements, stock, fournisseurs, équipe, notifications et rapports.

MVP CRUD sans authentification, sans IA et sans intégration externe.

> **Contributeurs et agents IA** : lisez d'abord [AGENTS.md](AGENTS.md) — état du projet, règles métier,
> feuille de route IA. Il doit être mis à jour à chaque fonctionnalité livrée.

## Stack

| Couche | Technologies |
|---|---|
| Backend | Django 6, Django REST Framework, django-filter, SQLite (PostgreSQL en production) |
| Frontend | React 19, Vite, TanStack Query, React Router, Tailwind CSS v4, Recharts, lucide |

## Démarrage

```bash
# Backend (port 8010)
cd backend
cp .env.example .env                       # puis définir DJANGO_SECRET_KEY
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_demo --reset   # données de démo + import de backend/data/oem/*.xlsx
.venv/bin/python manage.py runserver 0.0.0.0:8010

# Frontend (port 5180, proxy /api et /media vers le backend)
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Ouvrir http://localhost:5180 — depuis un téléphone du même réseau : `http://<ip-du-pc>:5180`.
`BACKEND_URL` permet de pointer le proxy Vite vers un autre backend.

## Organisation

```
backend/apps/
  core/       paramètres du garage, documents, journal d'activité, tableau de bord, recherche, notifications, exports CSV
  clients/    clients (anti-doublon) et véhicules
  repairs/    dossiers de réparation (13 statuts), tâches, assurances, experts
  billing/    devis (versions), factures (verrouillage), paiements (chèques, remboursements) + services de calcul
  inventory/  pièces, compatibilité, mouvements de stock (append-only), fournisseurs
  staff/      employés
frontend/src/
  components/ ui (primitives), common (tableau, panneau latéral, formulaires), layout (menu, barre, ⌘K)
  features/   un dossier par module (dashboard, clients, repairs, quotes, invoices, payments, stock…)
```

## Règles métier implémentées

- **Devis** : pièces sur fond jaune (TVA 20 %), prestations sur fond blanc maintenues en HT (taux configurable).
  Un devis accepté est verrouillé ; toute modification crée une nouvelle version, les anciennes sont conservées.
- **Factures** : créées depuis un devis accepté ; répartition assurance / client ; une facture émise n'est plus
  modifiable (annulation avec motif obligatoire). Statut payé / partiel / en retard calculé depuis les paiements.
- **Paiements** : un chèque n'est compté qu'une fois **encaissé** ; remboursement avec motif obligatoire ;
  pas de suppression (annulation motivée, historisée). Résumé financier par dossier sans double comptage.
- **Stock** : mouvements immuables, sorties rattachées à un dossier, contrôle de stock insuffisant, alertes de rupture.
- **Compatibilité** : recherche marque / modèle / année / motorisation dans le stock et le catalogue OEM ;
  références non vérifiées signalées.
- **Catalogue OEM & équivalences** : import du modèle Excel `Base_OEM_*.xlsx`
  (`python manage.py import_oem <fichier>` ou bouton « Importer un fichier Excel »). Une référence n'est jamais
  inventée : statuts Inconnue → À vérifier → Confirmée (source + date obligatoires).
- **Assurance** : parcours en 8 étapes (Précédent / Continuer), envoi officiel uniquement après validation humaine.
- **Notifications** : calculées en continu (retards, expertises, chèques, impayés, stock bas…).

## Prochaines étapes (PaaS)

Authentification et rôles, PostgreSQL, stockage objet pour les documents, multi-tenant, PDF serveur,
OCR / IA, WhatsApp, sauvegardes automatisées.
