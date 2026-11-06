# Illustrations du jeu

Déposez ici les **vraies illustrations** (PNG ou WebP). Elles sont détectées
automatiquement, sans modifier le code. Le jeu cherche d'abord `<id>.webp`,
puis `<id>.png`.

Tant qu'un fichier manque, l'interface affiche un **emplacement neutre** :
un cadre avec un monogramme pour les portraits, un cercle d'invocation animé
avec le chemin attendu pour les monstres. Aucun faux personnage n'est dessiné
en code.

## Formats recommandés

| Dossier | Usage | Format conseillé |
|---|---|---|
| `heroes/` | Portraits chibi des héros (colonne gauche) | 256 × 256, fond transparent ou décor de portrait |
| `monsters/` | Monstres et boss au centre de la scène | 512 × 512, **fond transparent**, pieds en bas de l'image |
| `zones/` | Décor plein écran d'une région | 1920 × 1080, sans personnage ; le centre bas accueille le monstre |
| `skills/` | Icônes de compétences | 128 × 128, transparent |
| `relics/`, `mounts/`, `idols/`, `shop/` | Icônes de collection | 256 × 256, transparent |

Les monstres sont alignés en bas : laissez peu de marge sous les pieds.
Pour une région, le décor procédural actuel sert de référence de composition
(horizon vers 58 % de la hauteur, sol dégagé au centre).

## Noms de fichiers attendus

### Héros — `assets/heroes/`

- `ysolde.webp` — Ysolde Brise-Aube (Aventurière)
- `brannoc.webp` — Brannoc Hache-Rouille (Guerrier)
- `mirelle.webp` — Mirelle Givrelune (Mage)
- `oswin.webp` — Oswin Lame-Claire (Paladin)
- `sefra.webp` — Sefra Ventnoir (Chasseresse)
- `tobrik.webp` — Tobrik Mèche-Courte (Voleur)
- `nahla.webp` — Nahla Pierre-Racine (Druidesse)
- `ulgar.webp` — Ulgar Tonnebras (Chaman)
- `seraphin.webp` — Séraphin Aube-Pâle (Prêtre)
- `morvenne.webp` — Morvenne Cendrecœur (Démoniste)

### Décors de région — `assets/zones/`

- `val-dore.webp` — Val-Doré
- `marches-brume.webp` — Marches de Brume
- `bois-crepuscule.webp` — Bois du Crépuscule
- `jungle-verdombre.webp` — Jungle de Verdombre
- `steppes-cuivre.webp` — Steppes de Cuivre
- `terres-pourries.webp` — Terres Pourries
- `sylve-corrompue.webp` — Sylve Corrompue
- `plaines-fracturees.webp` — Plaines Fracturées
- `toundra-ivoire.webp` — Toundra d'Ivoire

### Monstres et boss — `assets/monsters/`

- **Val-Doré** : `sanglier-pres`, `loup-gris`, `kobold-mineur`, `gnoll-pillard`, `grondefer` (boss), `hurlesang` (boss)
- **Marches de Brume** : `brigand-masque`, `grenouillard`, `epouvantail`, `harpie-falaises`, `capitaine-masque-gris` (boss), `mere-vasiere` (boss)
- **Bois du Crépuscule** : `goule-errante`, `squelette-rodeur`, `araignee-ombres`, `loup-garou`, `corbeval` (boss), `mortelune` (boss)
- **Jungle de Verdombre** : `troll-lianes`, `panthere-tachetee`, `raptor-jade`, `basilic`, `haruka` (boss), `grand-basilic` (boss)
- **Steppes de Cuivre** : `hyene-rieuse`, `homme-sanglier`, `elementaire-poussiere`, `centaure-errant`, `grand-defenseur` (boss), `tempete-sable` (boss)
- **Terres Pourries** : `mort-vivant`, `abomination`, `banshee`, `liche-mineure`, `baron-putride` (boss), `veuve-cendres` (boss)
- **Sylve Corrompue** : `satyre`, `diablotin`, `loup-corrompu`, `garde-infernal`, `xaroth` (boss), `mere-epines` (boss)
- **Plaines Fracturées** : `elementaire-neant`, `ogre-deux-tetes`, `orc-corrompu`, `traqueur-vide`, `gorgrak` (boss), `oeil-neant` (boss)
- **Toundra d'Ivoire** : `geant-givre`, `arachnide-glace`, `guerrier-spectral`, `mammouth`, `jarl-hiver` (boss), `dragon-givre` (boss)

### Compétences — `assets/skills/`

`frenzy`, `midas`, `blessing`, `hunt`

### Reliques, montures, idoles, boutique

- `assets/relics/` : `ecu-ancestral`, `bourse-sans-fond`, `gantelet-tonnerre`, `sablier-ensable`, `oeil-lynx`, `prisme-ether`, `cor-de-guerre`, `couronne-dechue`
- `assets/mounts/` : `destrier-plaines`, `loup-neiges`, `griffon-airain`, `drake-braise`
- `assets/idols/` : `aurvax`, `kharoth`, `myrrha`, `chronis`, `nyxalis`
- `assets/shop/` : `bourse-marchand`, `sablier-brise`, `elixir-puissance`, `elixir-fortune`
