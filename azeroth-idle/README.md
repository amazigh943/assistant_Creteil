# Aldoria Idle

Idle RPG fantasy pour navigateur, dans l'esprit des jeux « clicker » : recrutez
des héros, terrassez les monstres, progressez de région en région, puis montez
en Ascension pour renaître plus fort.

Le jeu n'a **aucune dépendance** : HTML, CSS et modules JavaScript natifs.

## Lancer le jeu

Les modules ES exigent un serveur HTTP (l'ouverture directe du fichier ne
fonctionne pas) :

```bash
cd azeroth-idle
python3 -m http.server 8080      # ou : npm start
# puis ouvrir http://localhost:8080
```

Sur GitHub Pages, le jeu est servi tel quel depuis le dossier `azeroth-idle/`.

## Tests

```bash
cd azeroth-idle
npm test                          # node --test, Node 18+ (aucune installation)
```

Les tests couvrent les grands nombres, l'économie (achats x1 à MAX), le combat
(récompense unique, progression, boss, absence), les améliorations,
compétences, l'Ascension et la sauvegarde (aller-retour, migration, fichiers
corrompus, versions futures).

## Contenu actuel

- **Interface** : barre de ressources en haut, colonne d'onglets à gauche,
  grande scène de combat à droite ; disposition empilée sur mobile.
- **Combat** : clic, DPS automatique, coups critiques, dégâts flottants,
  pièces qui jaillissent, 10 monstres par zone, boss chronométré toutes les
  5 zones, progression auto ou mode farm.
- **10 héros** (sur 54 prévus), chacun avec 5 améliorations ; achats x1,
  x10, x25, x100 et MAX ; paliers ×3 tous les 50 niveaux dès le niveau 100.
- **4 compétences actives** (touches 1 à 4), débloquées par les améliorations.
- **9 régions** de 10 zones, chacune avec son décor, son ambiance et son
  bestiaire ; après la 9ᵉ, le cycle reprend en mode Héroïque, puis Mythique…
- **Onglets** : Combat, Héros, Améliorations, Reliques, Montures, Idoles,
  Boutique, Ascension.
- **Ressources** : or, éclats d'éther (rares), âmes (Ascension), reliques.
- **Sauvegarde** : automatique toutes les 15 s, à la fermeture et au passage
  en arrière-plan ; gains hors ligne (24 h max) ; export / import.

## Architecture

```
azeroth-idle/
├── index.html
├── css/main.css            direction artistique, responsive
├── assets/                 illustrations PNG/WebP (voir assets/README.md)
├── js/
│   ├── config.js           équilibrage : courbe de PV, or, boss, âmes…
│   ├── data/               contenu : héros, régions, compétences, reliques…
│   ├── core/               moteur sans DOM, testé
│   │   ├── bignum.js       grands nombres (au-delà de 1e308)
│   │   ├── economy.js      coûts et achats multiples
│   │   ├── stats.js        calcul centralisé de tous les bonus
│   │   ├── combat.js       monstres, dégâts, récompenses, zones, absence
│   │   ├── actions.js      achats, compétences, idoles, Ascension
│   │   ├── state.js        état sauvegardé
│   │   └── save.js         sauvegarde versionnée + migrations
│   ├── ui/                 affichage (scène, panneaux, HUD, décors)
│   └── main.js             boucle de jeu et branchements
└── tests/core.test.mjs
```

Principes :

- **Le moteur (`core/`) ne touche jamais au DOM** : il émet des événements
  (`hit`, `kill`, `zoneCleared`…) que l'interface affiche.
- **Tous les bonus passent par `computeStats()`** : un seul endroit pour le
  DPS, le clic, l'or, les critiques et le temps contre les boss.
- **Une récompense par monstre** : chaque monstre porte un drapeau `rewarded`
  vérifié avant tout gain.

## Ajouter du contenu

- **Un héros** : une entrée dans `DPS_HEROES` (`js/data/heroes.js`). Son coût
  et son DPS découlent de sa position (`heroCurve`), avec surcharge possible.
- **Une région** : une entrée dans `REGIONS` (`js/data/regions.js`) avec
  palette, type de décor, monstres et deux boss. Le moteur n'a pas à changer.
- **Une relique, une monture, une idole** : `js/data/progression.js`.
- **Un changement de format de sauvegarde** : incrémenter `SAVE_VERSION` et
  ajouter la migration correspondante dans `MIGRATIONS` (`js/core/save.js`).

## Débogage

La console du navigateur expose `window.aldoria.game` (état, combat,
statistiques) et `window.aldoria.save()`.
