# Guide d'installation — Windows

Commandes pour **PowerShell**. Il faut deux fenêtres : une pour le backend, une pour le frontend.

## 1. Installer (une seule fois)

- Git : https://git-scm.com/download/win
- Python 3.12 ou plus récent : https://www.python.org/downloads/ — cocher **« Add python.exe to PATH »**
- Node.js 20 LTS : https://nodejs.org

```powershell
git --version
python --version
node --version
```

## 2. Récupérer le projet

```powershell
cd $HOME\Documents
git clone https://github.com/motawakil/Auto-Garage.git
cd Auto-Garage
```

## 3. Backend — fenêtre n°1

Première fois :
```powershell
cd $HOME\Documents\Auto-Garage\backend
copy .env.example .env
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py loaddata data\demo\demo_data.json
```

`loaddata` charge les données de démonstration fournies dans le dépôt (24 clients, 22 dossiers, devis,
factures, paiements, stock, catalogue OEM Peugeot 208). Variante qui les régénère :
`.venv\Scripts\python manage.py seed_demo --reset`.

À chaque fois :
```powershell
cd $HOME\Documents\Auto-Garage\backend
.venv\Scripts\python manage.py runserver 0.0.0.0:8010
```

## 4. Frontend — fenêtre n°2

Première fois :
```powershell
cd $HOME\Documents\Auto-Garage\frontend
npm install --legacy-peer-deps
```

À chaque fois :
```powershell
cd $HOME\Documents\Auto-Garage\frontend
npm run dev
```

Ouvrir **http://localhost:5180** et se connecter avec un compte de démonstration :

- Administrateur : `admin@eljaouhari.ma` / `Demo-Admin-2026!`
- Utilisateur (sans accès aux paramètres) : `atelier@eljaouhari.ma` / `Demo-Atelier-2026!`

Sur la page de connexion, les boutons « Comptes de démonstration » remplissent le formulaire.

## 5. Mettre à jour (pull)

Arrêter les serveurs (`Ctrl + C`), puis :
```powershell
cd $HOME\Documents\Auto-Garage
git pull
cd backend
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python manage.py migrate
cd ..\frontend
npm install --legacy-peer-deps
```

Si la mise à jour annonce une réinitialisation des migrations (voir AGENTS.md, journal des versions) :
```powershell
cd $HOME\Documents\Auto-Garage\backend
del db.sqlite3
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py loaddata data\demo\demo_data.json
```

## 6. Problèmes fréquents

| Problème | Solution |
|---|---|
| `python` non reconnu | Réinstaller Python avec « Add to PATH », ou utiliser `py` |
| `npm install` échoue | Toujours ajouter `--legacy-peer-deps` |
| PowerShell bloque `npm` | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` puis `O` |
| Port 8010 / 5180 occupé | Fermer l'ancienne fenêtre du serveur |
| Page vide | Vérifier que le backend tourne |
| « Vérification CSRF échouée » | Ouvrir l'application via http://localhost:5180 (pas 127.0.0.1) ou ajouter l'origine dans `DJANGO_CSRF_TRUSTED_ORIGINS` du `.env` |
| « Trop de tentatives » | Attendre 15 minutes, ou redémarrer le backend (le compteur est en mémoire en développement) |
| `loaddata` : erreur d'unicité | La base contient déjà des données : supprimer `backend\db.sqlite3`, puis `migrate` et `loaddata` |

Téléphone sur le même Wi-Fi : `http://<IP-du-PC>:5180` (IP via `ipconfig`, « Adresse IPv4 »).

## 7. Contribuer

Être ajouté comme collaborateur du dépôt sur GitHub, lire [AGENTS.md](../AGENTS.md), puis :
```powershell
git add .
git commit -m "feat: description de la modification"
git push
```
