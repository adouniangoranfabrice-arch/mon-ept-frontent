# Mon Emploi du Temps — prof d'informatique

Application web personnelle pour gérer son emploi du temps.
Frontend : React + Vite, Tailwind CSS v4, animations avec Motion.
Backend : FastAPI + SQLAlchemy, base SQLite (`backend/edt.db`).

## Lancer l'application (le plus simple)

Double-cliquez sur **`lancer.bat`** : il compile le frontend, démarre le backend et ouvre
http://localhost:8000 dans le navigateur. Fermez la fenêtre noire pour tout arrêter.

## Lancer le projet (développement)

Deux terminaux. Node.js 20+ et Python 3.11+ sont requis.

**1. Backend** (dossier `backend/`) :

```bash
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt     # première fois seulement
.venv\Scripts\python -m uvicorn app.main:app --reload       # http://localhost:8000/docs
```

**2. Frontend** (racine du projet) :

```bash
npm install
npm run dev        # http://localhost:5173  (les appels /api sont transmis au backend)
```

## Version « production » (un seul serveur)

```bash
npm run build                                               # crée dist/
cd backend
.venv\Scripts\python -m uvicorn app.main:app --port 8000    # http://localhost:8000
```

Le backend sert alors aussi l'application.

## Tests du backend

```bash
cd backend
.venv\Scripts\python -m pytest -q
```

## API

Documentation interactive : http://localhost:8000/docs

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/data` | Toutes les données |
| PUT | `/api/data` | Remplacer toutes les données (import, entièrement validé) |
| POST | `/api/reset` | Revenir aux données de départ |
| GET / POST | `/api/{table}` | Lister / créer |
| GET / PUT / DELETE | `/api/{table}/{id}` | Voir / modifier / supprimer (avec les séances liées) |

`{table}` = `jours`, `heures`, `classes` ou `seances`. Les erreurs renvoient `{"detail": "message en français"}`.

## Fonctionnalités

| Table    | Créer | Voir | Modifier | Supprimer | Particularités |
|----------|:-----:|:----:|:--------:|:---------:|----------------|
| Jours    | ✓ | ✓ | ✓ | ✓ | Interrupteur « actif ». Par défaut : lundi, mardi, jeudi |
| Heures   | ✓ | ✓ | ✓ | ✓ | Refuse les créneaux qui se chevauchent ou dont la fin précède le début |
| Classes  | ✓ | ✓ | ✓ | ✓ | Couleur, niveau, effectif, volume horaire calculé |
| Séances  | ✓ | ✓ | ✓ | ✓ | Un seul cours par jour + heure. Créneaux occupés grisés dans le formulaire |

- **Ma semaine** : grille Heures × Jours actifs. Un clic sur une case vide crée une séance, un clic sur un cours l'affiche (puis Modifier / Supprimer).
- Statistiques : heures de cours par semaine, créneaux libres, prochain cours.
- Supprimer un jour, une heure ou une classe supprime aussi les séances liées (avec avertissement).
- **Sauvegarde** (menu de gauche) : export / import en JSON, réinitialisation.

## Élèves et import Excel

Page **Élèves** → **Importer (Excel)** : choisir la classe, choisir le fichier, vérifier l'aperçu, importer.

- Formats : **.xlsx** ou **.csv** (un ancien **.xls** doit être réenregistré en .xlsx).
- Le fichier doit contenir une colonne **Nom_prenoms** (aussi reconnus : « Nom et prénoms »,
  « NOMS ET PRÉNOMS », ou deux colonnes « Nom » + « Prénoms »). Titres et autres colonnes
  (N°, Sexe…) sont ignorés.
- Les doublons du fichier et les élèves déjà inscrits dans la classe sont ignorés
  (comparaison sans accents ni majuscules).
- Supprimer une classe supprime aussi ses élèves.

## Notes et moyennes

Page **Notes** : choisir la classe, puis le trimestre (1er, 2e, 3e) ou l'**Année**.

- **Nouvelle évaluation** : libellé (Interrogation 1, Devoir 1…), date, barème (sur 20 par défaut),
  coefficient (1 par défaut). La saisie des notes s'ouvre aussitôt.
- Saisie : une ligne par élève, `Entrée` passe au suivant, virgule acceptée (12,5).
  Une case vide = pas de note (absent) : elle ne compte pas dans la moyenne.
- Cliquer sur une note du tableau ouvre la saisie sur cet élève.
- **Moyenne du trimestre** (sur 20) = Σ (note / barème × 20 × coefficient) / Σ coefficients.
- **Moyenne annuelle** = moyenne des trimestres qui ont une moyenne. Rangs avec ex æquo.
- Une évaluation notée ne peut pas changer de classe, ni avoir un barème inférieur à la meilleure note.
- Supprimer une évaluation supprime ses notes ; un élève qui change de classe perd ses notes.

## Données

Deux stockages possibles, choisis automatiquement :

- **MongoDB** si `MONGODB_URI` est défini dans `backend/.env` (MongoDB Atlas ou MongoDB local) ;
- **SQLite** sinon (`backend/edt.db`).

http://localhost:8000/api/health indique le stockage utilisé.

### Passer à MongoDB

1. Copiez `backend/.env.example` en `backend/.env` et renseignez `MONGODB_URI`.
2. Relancez l'application (`lancer.bat`).
3. Pour reprendre des données existantes, utilisez **Importer** avec un fichier exporté (.json).

Collections : `jours`, `heures`, `classes`, `eleves`, `evaluations`, `notes`, `seances` (l'id de chaque élément est le `_id`).
Index : un seul cours par jour + heure (`uq_seance_creneau`), ordre des jours unique.
Le fichier `backend/.env` contient votre mot de passe : il est exclu de git.

Pensez à **Exporter** régulièrement pour avoir une copie.

Modèle :

```
Jours    (id, libelle, ordre, actif)          ordre : 1 = lundi … 7 = dimanche
Heures   (id, code, heure_debut, heure_fin)
Classes  (id, nom, niveau, effectif, couleur)
Seances  (id, jour_id, heure_id, classe_id, salle, recurrente)   un seul cours par jour + heure
```

## Structure

```
src/                       frontend React
  main.jsx                 point d'entrée
  App.jsx                  menu + navigation entre pages
  api.js                   appels HTTP au backend
  store/StoreContext.jsx   état partagé, chargement, appels CRUD
  components/              ui (boutons, modales…), Toast, Icon, SeanceDialogs
  pages/                   Semaine, Seances, Classes, Heures, Jours
  utils.js                 calculs d'heures, couleurs
backend/                   API FastAPI — Clean Architecture (voir ci-dessous)
```

## Architecture du backend (Clean Architecture)

Les dépendances vont toujours **vers le domaine** : `api` et `infrastructure` → `application` → `domain`.
Le test `tests/unit/test_architecture.py` échoue si cette règle est violée.

```
backend/
├── app/
│   ├── main.py                     # crée l'app, monte les routers, prépare la base au démarrage
│   ├── config.py                   # Settings (MONGODB_URI, chemin SQLite, CORS…) lus dans backend/.env
│   │
│   ├── domain/                     # ❶ CŒUR : aucune dépendance externe
│   │   ├── entities/               #    dataclasses métier + leurs règles
│   │   │   ├── jour.py             #    Jour (libellé et ordre uniques)
│   │   │   ├── heure.py            #    Heure (+ chevauche(), format HH:MM)
│   │   │   ├── classe.py           #    Classe (+ rang 6e → Tle, couleur)
│   │   │   ├── eleve.py            #    Eleve (nom_prenoms, classe ; pas de doublon dans une classe)
│   │   │   ├── evaluation.py       #    Evaluation (classe, trimestre, barème, coefficient)
│   │   │   ├── note.py             #    Note + moyenne() et moyenne_annuelle()
│   │   │   ├── seance.py           #    Seance (+ un seul cours par créneau)
│   │   │   └── emploi_du_temps.py  #    EmploiDuTemps : verifier(), trie(), par_defaut()
│   │   ├── ports/
│   │   │   ├── repositories.py     #    JourRepository, HeureRepository, ClasseRepository, EleveRepository,
│   │   │   │                       #    SeanceRepository, EmploiDuTempsRepository, Depots
│   │   │   ├── fichiers.py         #    LecteurListeEleves (lecture du fichier Excel)
│   │   │   └── identifiants.py     #    GenerateurId
│   │   └── errors.py               #    ErreurValidation, Introuvable, Conflit
│   │
│   ├── application/                # ❷ CAS D'USAGE : un fichier = une action métier
│   │   ├── commun/crud.py          #    comportement commun (créer, modifier, supprimer…)
│   │   ├── jours/                  #    creer_jour, modifier_jour, supprimer_jour, lister_jours, voir_jour
│   │   ├── heures/                 #    creer_heure, modifier_heure, supprimer_heure, lister_heures, voir_heure
│   │   ├── classes/                #    creer_classe, modifier_classe, supprimer_classe, lister_classes, voir_classe
│   │   ├── eleves/                 #    creer, modifier, supprimer, lister, voir + lire_fichier_eleves, importer_eleves
│   │   ├── evaluations/            #    creer, modifier, supprimer, lister, voir
│   │   ├── notes/                  #    enregistrer_notes
│   │   ├── seances/                #    creer_seance, modifier_seance, supprimer_seance, lister_seances, voir_seance
│   │   └── emploi_du_temps/        #    lire_emploi_du_temps, importer_emploi_du_temps, reinitialiser_emploi_du_temps
│   │
│   ├── infrastructure/             # ❸ ADAPTATEURS : implémentent les ports
│   │   ├── mongo/
│   │   │   ├── client.py           #    connexion (sans effet de bord à l'import), ping
│   │   │   ├── indexes.py          #    create_indexes(), appelé au démarrage
│   │   │   ├── fabrique.py         #    assemble les repositories MongoDB
│   │   │   └── repositories/       #    MongoClasseRepository… SEUL endroit qui parle à MongoDB
│   │   ├── sqlite/
│   │   │   ├── client.py           #    connexion (sans effet de bord à l'import)
│   │   │   ├── modeles.py          #    tables SQLAlchemy
│   │   │   ├── schema.py           #    creer_schema(), appelé au démarrage
│   │   │   ├── fabrique.py         #    assemble les repositories SQLite
│   │   │   └── repositories/       #    SqlJourRepository… SEUL endroit qui parle à la base
│   │   ├── excel/lecteur_eleves.py #    LecteurExcelEleves (.xlsx avec openpyxl, .csv)
│   │   ├── stockage.py             #    choisit MongoDB ou SQLite selon la configuration
│   │   └── identifiants.py         #    generer_uuid
│   │
│   └── api/                        # ❹ PRÉSENTATION HTTP
│       ├── dependencies.py         #    injection des cas d'usage : cas_usage(CreerClasse)
│       ├── errors.py               #    erreurs du domaine → 400 / 404 / 409 / 422
│       ├── schemas/                #    DTO Pydantic d'entrée (…In) et de sortie (…Out)
│       └── routes/                 #    systeme, emploi_du_temps, jours, heures, classes, eleves, evaluations, seances
│                                   #    → chaque route appelle UN cas d'usage
│
├── scripts/                        # exporter, importer, vider → appellent les cas d'usage
└── tests/
    ├── unit/                       # entités, cas d'usage (faux repositories en mémoire), architecture
    └── integration/                # routes testées avec SQLite ET MongoDB (mongomock)
```

### Scripts (depuis `backend/`)

```bash
.venv\Scripts\python -m scripts.exporter sauvegarde.json   # copie de la base en JSON
.venv\Scripts\python -m scripts.importer sauvegarde.json   # remplace la base (après validation)
.venv\Scripts\python -m scripts.vider                       # sauvegarde dans sauvegardes/, puis vide la base
```

MongoDB et SQLite implémentent les mêmes ports : le domaine, les cas d'usage et l'API
sont identiques quel que soit le stockage.
