/**
 * Régions et bestiaire.
 *
 * Chaque région couvre BALANCE.zonesPerRegion zones et contient :
 *  - monsters : monstres ordinaires (tirés au hasard)
 *  - bosses   : un boss par zone de boss de la région (zones 5 et 10)
 *  - decor / palette / particles : décor procédural utilisé tant que
 *    assets/zones/<id>.webp (ou .png) n'existe pas.
 *
 * Ajouter une région = ajouter une entrée ici. Le moteur de combat n'a pas
 * besoin d'être modifié. Après la dernière région, le cycle recommence en
 * mode « Héroïque », puis « Mythique », etc.
 */

export const REGIONS = [
  {
    id: 'val-dore',
    name: 'Val-Doré',
    subtitle: 'Prairies paisibles et forêts de chênes',
    decor: 'meadow',
    particles: 'fireflies',
    palette: {
      skyTop: '#5fa8e8', skyBottom: '#f7e3a8', sun: '#fff4c2',
      far: '#7fa7c7', mid: '#5d9a5a', near: '#3f7a3c', ground: '#6aa84f', groundDark: '#3e6e2c',
      accent: '#f3c552', fog: 'rgba(255,248,220,0.35)',
    },
    monsters: [
      { id: 'sanglier-pres', name: 'Sanglier des prés', type: 'Bête' },
      { id: 'loup-gris', name: 'Loup gris', type: 'Bête' },
      { id: 'kobold-mineur', name: 'Kobold mineur', type: 'Humanoïde' },
      { id: 'gnoll-pillard', name: 'Gnoll pillard', type: 'Humanoïde' },
    ],
    bosses: [
      { id: 'grondefer', name: 'Grondefer, roi des Kobolds', type: 'Humanoïde' },
      { id: 'hurlesang', name: "Hurlesang, l'alpha de la meute", type: 'Bête' },
    ],
  },
  {
    id: 'marches-brume',
    name: 'Marches de Brume',
    subtitle: 'Côtes venteuses et fermes abandonnées',
    decor: 'coast',
    particles: 'mist',
    palette: {
      skyTop: '#8fb3c9', skyBottom: '#efd9b4', sun: '#fff1d0',
      far: '#93a9b5', mid: '#8a9a5b', near: '#6b7a3f', ground: '#a39252', groundDark: '#6d5f31',
      accent: '#e6a35a', fog: 'rgba(235,240,245,0.45)',
    },
    monsters: [
      { id: 'brigand-masque', name: 'Brigand au masque gris', type: 'Humanoïde' },
      { id: 'grenouillard', name: 'Grenouillard des berges', type: 'Amphibien' },
      { id: 'epouvantail', name: 'Épouvantail animé', type: 'Artificiel' },
      { id: 'harpie-falaises', name: 'Harpie des falaises', type: 'Bête' },
    ],
    bosses: [
      { id: 'capitaine-masque-gris', name: 'Capitaine Masque-Gris', type: 'Humanoïde' },
      { id: 'mere-vasiere', name: 'Mère Vasière', type: 'Amphibien' },
    ],
  },
  {
    id: 'bois-crepuscule',
    name: 'Bois du Crépuscule',
    subtitle: 'Une forêt où le soleil ne se lève jamais',
    decor: 'darkwood',
    particles: 'wisps',
    palette: {
      skyTop: '#1d2140', skyBottom: '#6b4f7a', sun: '#d8e2ff',
      far: '#3a3a5e', mid: '#2b2f45', near: '#1b1f2e', ground: '#33384a', groundDark: '#1a1d28',
      accent: '#9fb8ff', fog: 'rgba(150,140,200,0.30)',
    },
    monsters: [
      { id: 'goule-errante', name: 'Goule errante', type: 'Mort-vivant' },
      { id: 'squelette-rodeur', name: 'Squelette rôdeur', type: 'Mort-vivant' },
      { id: 'araignee-ombres', name: 'Araignée des ombres', type: 'Bête' },
      { id: 'loup-garou', name: 'Loup-garou affamé', type: 'Maudit' },
    ],
    bosses: [
      { id: 'corbeval', name: 'Corbeval le Nécromant', type: 'Humanoïde' },
      { id: 'mortelune', name: 'Mortelune, la Veuve', type: 'Bête' },
    ],
  },
  {
    id: 'jungle-verdombre',
    name: 'Jungle de Verdombre',
    subtitle: 'Temples engloutis et lianes étouffantes',
    decor: 'jungle',
    particles: 'pollen',
    palette: {
      skyTop: '#4fb3a4', skyBottom: '#e9f0b0', sun: '#fffbd1',
      far: '#4f8f7a', mid: '#2f7a4f', near: '#1d5a35', ground: '#4f8a3a', groundDark: '#2c5523',
      accent: '#ffd36b', fog: 'rgba(220,255,220,0.30)',
    },
    monsters: [
      { id: 'troll-lianes', name: 'Troll des lianes', type: 'Troll' },
      { id: 'panthere-tachetee', name: 'Panthère tachetée', type: 'Bête' },
      { id: 'raptor-jade', name: 'Raptor de jade', type: 'Bête' },
      { id: 'basilic', name: 'Basilic pétrifiant', type: 'Bête' },
    ],
    bosses: [
      { id: 'haruka', name: 'Haruka la Chasseuse de crânes', type: 'Troll' },
      { id: 'grand-basilic', name: 'Grand Basilic ocellé', type: 'Bête' },
    ],
  },
  {
    id: 'steppes-cuivre',
    name: 'Steppes de Cuivre',
    subtitle: 'Savane brûlante et mesas rouges',
    decor: 'savanna',
    particles: 'dust',
    palette: {
      skyTop: '#e98b4f', skyBottom: '#fbe2a2', sun: '#fff0b8',
      far: '#c97a55', mid: '#b5844a', near: '#8c5a2f', ground: '#c9a15a', groundDark: '#8a6731',
      accent: '#ffb347', fog: 'rgba(255,220,170,0.30)',
    },
    monsters: [
      { id: 'hyene-rieuse', name: 'Hyène rieuse', type: 'Bête' },
      { id: 'homme-sanglier', name: 'Homme-sanglier épineux', type: 'Humanoïde' },
      { id: 'elementaire-poussiere', name: 'Élémentaire de poussière', type: 'Élémentaire' },
      { id: 'centaure-errant', name: 'Centaure errant', type: 'Humanoïde' },
    ],
    bosses: [
      { id: 'grand-defenseur', name: 'Brokk, chef des Épineux', type: 'Humanoïde' },
      { id: 'tempete-sable', name: 'Sirocco, Seigneur des sables', type: 'Élémentaire' },
    ],
  },
  {
    id: 'terres-pourries',
    name: 'Terres Pourries',
    subtitle: 'Champs maudits et villages réduits en cendres',
    decor: 'blight',
    particles: 'ash',
    palette: {
      skyTop: '#3b4a3a', skyBottom: '#a6a77a', sun: '#e8f0b0',
      far: '#5a6450', mid: '#4a4f3c', near: '#2f3326', ground: '#5e5a3e', groundDark: '#33301f',
      accent: '#c8e070', fog: 'rgba(190,210,140,0.30)',
    },
    monsters: [
      { id: 'mort-vivant', name: 'Mort-vivant décharné', type: 'Mort-vivant' },
      { id: 'abomination', name: 'Abomination recousue', type: 'Mort-vivant' },
      { id: 'banshee', name: 'Banshee hurlante', type: 'Esprit' },
      { id: 'liche-mineure', name: 'Liche mineure', type: 'Mort-vivant' },
    ],
    bosses: [
      { id: 'baron-putride', name: 'Le Baron Putride', type: 'Mort-vivant' },
      { id: 'veuve-cendres', name: 'Ysmera, la Veuve des cendres', type: 'Esprit' },
    ],
  },
  {
    id: 'sylve-corrompue',
    name: 'Sylve Corrompue',
    subtitle: 'Une forêt dévorée par le feu démoniaque',
    decor: 'fel',
    particles: 'embers-green',
    palette: {
      skyTop: '#1b2a1a', skyBottom: '#5f8a2a', sun: '#d6ff7a',
      far: '#2f4a2a', mid: '#253a1e', near: '#141f10', ground: '#2f3f1e', groundDark: '#151d0d',
      accent: '#8dff3a', fog: 'rgba(140,255,80,0.18)',
    },
    monsters: [
      { id: 'satyre', name: 'Satyre corrompu', type: 'Démon' },
      { id: 'diablotin', name: 'Diablotin ricaneur', type: 'Démon' },
      { id: 'loup-corrompu', name: 'Loup corrompu', type: 'Bête' },
      { id: 'garde-infernal', name: 'Garde infernal', type: 'Démon' },
    ],
    bosses: [
      { id: 'xaroth', name: 'Xaroth le Profanateur', type: 'Démon' },
      { id: 'mere-epines', name: 'Mère des Épines', type: 'Démon' },
    ],
  },
  {
    id: 'plaines-fracturees',
    name: 'Plaines Fracturées',
    subtitle: 'Un monde brisé flottant dans le néant',
    decor: 'shattered',
    particles: 'void',
    palette: {
      skyTop: '#2a0f45', skyBottom: '#c2508a', sun: '#ffd0f0',
      far: '#5a2f6e', mid: '#4a2a4f', near: '#2a1830', ground: '#6e4a5a', groundDark: '#3a2230',
      accent: '#ff7ad9', fog: 'rgba(255,140,220,0.20)',
    },
    monsters: [
      { id: 'elementaire-neant', name: 'Élémentaire du néant', type: 'Élémentaire' },
      { id: 'ogre-deux-tetes', name: 'Ogre à deux têtes', type: 'Géant' },
      { id: 'orc-corrompu', name: 'Orc corrompu', type: 'Humanoïde' },
      { id: 'traqueur-vide', name: 'Traqueur du vide', type: 'Aberration' },
    ],
    bosses: [
      { id: 'gorgrak', name: 'Gorgrak Briseterre', type: 'Géant' },
      { id: 'oeil-neant', name: "L'Œil du Néant", type: 'Aberration' },
    ],
  },
  {
    id: 'toundra-ivoire',
    name: "Toundra d'Ivoire",
    subtitle: 'Glaciers éternels et forteresses gelées',
    decor: 'tundra',
    particles: 'snow',
    palette: {
      skyTop: '#6f9fd1', skyBottom: '#e6f2ff', sun: '#ffffff',
      far: '#b5cbe6', mid: '#8fb0d4', near: '#5f86b3', ground: '#e8f1fb', groundDark: '#a9c1db',
      accent: '#a8e6ff', fog: 'rgba(240,248,255,0.45)',
    },
    monsters: [
      { id: 'geant-givre', name: 'Géant de givre', type: 'Géant' },
      { id: 'arachnide-glace', name: 'Arachnide des glaces', type: 'Bête' },
      { id: 'guerrier-spectral', name: 'Guerrier spectral', type: 'Mort-vivant' },
      { id: 'mammouth', name: 'Mammouth laineux', type: 'Bête' },
    ],
    bosses: [
      { id: 'jarl-hiver', name: "Hrodmar, Jarl de l'Hiver", type: 'Géant' },
      { id: 'dragon-givre', name: 'Skaldrith, Dragon de givre', type: 'Dragon' },
    ],
  },
];

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

export const CYCLE_NAMES = ['', 'Héroïque', 'Mythique', 'Légendaire', 'Éternel'];

export function cycleName(cycle) {
  if (cycle <= 0) return '';
  return CYCLE_NAMES[cycle] ?? `Éternel ${cycle - CYCLE_NAMES.length + 2}`;
}
