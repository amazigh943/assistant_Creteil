/**
 * Héros recrutables.
 *
 * Pour ajouter un héros (jusqu'à 54 prévus), ajoutez une entrée à DPS_HEROES :
 * son coût et son DPS sont calculés automatiquement à partir de sa position
 * (voir heroCurve), et peuvent être surchargés avec `baseCost` / `baseDps`.
 * Le sprite est cherché dans assets/heroes/<id>.webp puis .png.
 */

const UPGRADE_LEVELS = [10, 25, 50, 75, 100];
const UPGRADE_COST_FACTORS = [12, 40, 250, 2000, 20000];

/** Arrondit à deux chiffres significatifs pour des valeurs « propres ». */
function round2(x) {
  if (x < 100) return Math.round(x);
  const p = Math.pow(10, Math.floor(Math.log10(x)) - 1);
  return Math.round(x / p) * p;
}

/** Courbe de coût et de DPS du n-ième héros de DPS (1-indexé). */
export function heroCurve(index) {
  const cost = 50 * Math.pow(4.8, index - 1);
  const dps = cost * 0.1 * Math.pow(0.86, index - 1);
  return { baseCost: round2(cost), baseDps: Math.max(1, round2(dps)) };
}

function upgradeList(heroId, baseCost, specs) {
  return specs.map((spec, i) => ({
    id: `${heroId}-${i + 1}`,
    heroId,
    level: UPGRADE_LEVELS[i],
    cost: baseCost * UPGRADE_COST_FACTORS[i],
    name: spec.name,
    effects: spec.effects,
  }));
}

const CLICK_HERO = {
  id: 'ysolde',
  name: 'Ysolde Brise-Aube',
  heroClass: 'Aventurière',
  role: 'click',
  color: '#e0b64a',
  baseCost: 5,
  clickPerLevel: 1,
  lore: 'Jeune aventurière de Val-Doré. Chacun de vos clics porte sa lame.',
  upgradeSpecs: [
    { name: 'Coup appuyé', effects: [{ type: 'clickMult', value: 2 }] },
    { name: 'Instinct du combat', effects: [{ type: 'critChance', value: 0.03 }] },
    { name: 'Écho des alliés', effects: [{ type: 'clickDpsPercent', value: 0.01 }] },
    { name: "Lame de l'aube", effects: [{ type: 'clickMult', value: 2 }] },
    { name: 'Volonté inflexible', effects: [{ type: 'clickMult', value: 2 }, { type: 'clickDpsPercent', value: 0.02 }] },
  ],
};

const x = (value) => ({ type: 'heroMult', value });

const DPS_HEROES = [
  {
    id: 'brannoc', name: 'Brannoc Hache-Rouille', heroClass: 'Guerrier', color: '#c0583a',
    lore: "Vétéran des guerres de clans, il n'a jamais reculé devant une charge.",
    upgradeSpecs: [
      { name: 'Hache aiguisée', effects: [x(2)] },
      { name: 'Cri de guerre', effects: [x(2), { type: 'unlockSkill', skill: 'frenzy' }] },
      { name: 'Enchaînement', effects: [x(2)] },
      { name: 'Bannière du clan', effects: [{ type: 'dpsPercent', value: 0.10 }] },
      { name: 'Fureur des anciens', effects: [x(4)] },
    ],
  },
  {
    id: 'mirelle', name: 'Mirelle Givrelune', heroClass: 'Mage', color: '#5aa7e6',
    lore: "Érudite de la Tour d'Opale, elle plie le givre et les arcanes à sa volonté.",
    upgradeSpecs: [
      { name: 'Projectile de givre', effects: [x(2)] },
      { name: 'Transmutation arcanique', effects: [x(2), { type: 'unlockSkill', skill: 'midas' }] },
      { name: 'Nova de glace', effects: [x(2)] },
      { name: 'Savoir interdit', effects: [{ type: 'goldPercent', value: 0.10 }] },
      { name: 'Archimage', effects: [x(4)] },
    ],
  },
  {
    id: 'oswin', name: 'Oswin Lame-Claire', heroClass: 'Paladin', color: '#f2cf6b',
    lore: "Chevalier de l'Ordre de l'Aube, il protège les faibles et châtie les impies.",
    upgradeSpecs: [
      { name: 'Marteau béni', effects: [x(2)] },
      { name: 'Bénédiction de lumière', effects: [x(2), { type: 'unlockSkill', skill: 'blessing' }] },
      { name: 'Aura de dévotion', effects: [x(2)] },
      { name: 'Serment sacré', effects: [{ type: 'dpsPercent', value: 0.10 }] },
      { name: "Champion de l'aube", effects: [x(4)] },
    ],
  },
  {
    id: 'sefra', name: 'Sefra Ventnoir', heroClass: 'Chasseresse', color: '#7fb04f',
    lore: 'Pisteuse des forêts du Nord, ses flèches ne manquent jamais leur cible.',
    upgradeSpecs: [
      { name: 'Flèches barbelées', effects: [x(2)] },
      { name: 'Œil du prédateur', effects: [x(2), { type: 'unlockSkill', skill: 'hunt' }] },
      { name: 'Tir multiple', effects: [x(2)] },
      { name: 'Compagnon fidèle', effects: [{ type: 'critChance', value: 0.02 }] },
      { name: 'Maîtresse des bêtes', effects: [x(4)] },
    ],
  },
  {
    id: 'tobrik', name: 'Tobrik Mèche-Courte', heroClass: 'Voleur', color: '#9a7bd1',
    lore: 'Personne ne sait vraiment pour qui il travaille. Sûrement pour lui-même.',
    upgradeSpecs: [
      { name: 'Dagues empoisonnées', effects: [x(2)] },
      { name: "Pas de l'ombre", effects: [x(2)] },
      { name: 'Coup bas', effects: [x(2)] },
      { name: 'Bourse bien remplie', effects: [{ type: 'goldPercent', value: 0.15 }] },
      { name: 'Prince des voleurs', effects: [x(4)] },
    ],
  },
  {
    id: 'nahla', name: 'Nahla Pierre-Racine', heroClass: 'Druidesse', color: '#3fa77f',
    lore: "Gardienne des bosquets sacrés, elle parle aux arbres et prend la forme de l'ours.",
    upgradeSpecs: [
      { name: 'Épines', effects: [x(2)] },
      { name: "Forme de l'ours", effects: [x(2)] },
      { name: 'Colère de la sylve', effects: [x(2)] },
      { name: 'Harmonie', effects: [{ type: 'dpsPercent', value: 0.10 }] },
      { name: 'Gardienne du bosquet', effects: [x(4)] },
    ],
  },
  {
    id: 'ulgar', name: 'Ulgar Tonnebras', heroClass: 'Chaman', color: '#3d7fd9',
    lore: 'Il entend la voix des esprits et commande au tonnerre des steppes.',
    upgradeSpecs: [
      { name: 'Éclair', effects: [x(2)] },
      { name: 'Totem de flammes', effects: [x(2)] },
      { name: "Chaîne d'éclairs", effects: [x(2)] },
      { name: 'Esprit des ancêtres', effects: [{ type: 'dpsPercent', value: 0.10 }] },
      { name: 'Voix du tonnerre', effects: [x(4)] },
    ],
  },
  {
    id: 'seraphin', name: 'Séraphin Aube-Pâle', heroClass: 'Prêtre', color: '#e8dcb4',
    lore: 'Sa foi brûle plus fort que les bûchers des hérétiques.',
    upgradeSpecs: [
      { name: 'Châtiment', effects: [x(2)] },
      { name: 'Mot de pouvoir', effects: [x(2)] },
      { name: 'Feu sacré', effects: [x(2)] },
      { name: 'Prière de fortune', effects: [{ type: 'goldPercent', value: 0.15 }] },
      { name: "Saint d'Aldoria", effects: [x(4)] },
    ],
  },
  {
    id: 'morvenne', name: 'Morvenne Cendrecœur', heroClass: 'Démoniste', color: '#a04fc8',
    lore: "Elle a scellé un pacte avec les abysses. Le prix ? Elle ne l'a pas encore payé.",
    upgradeSpecs: [
      { name: "Trait de l'ombre", effects: [x(2)] },
      { name: 'Pacte infernal', effects: [x(2)] },
      { name: 'Pluie de feu', effects: [x(2)] },
      { name: 'Âme liée', effects: [{ type: 'dpsPercent', value: 0.15 }] },
      { name: 'Reine des cendres', effects: [x(4)] },
    ],
  },
];

function buildHero(def, index) {
  const isClick = def.role === 'click';
  const curve = isClick ? {} : heroCurve(index);
  const baseCost = def.baseCost ?? curve.baseCost;
  return {
    role: 'dps',
    clickPerLevel: 0,
    ...def,
    index,
    baseCost,
    baseDps: isClick ? 0 : (def.baseDps ?? curve.baseDps),
    sprite: `assets/heroes/${def.id}`,
    upgrades: upgradeList(def.id, baseCost, def.upgradeSpecs),
  };
}

export const HEROES = [CLICK_HERO, ...DPS_HEROES].map((def, i) => buildHero(def, i));
export const HERO_BY_ID = Object.fromEntries(HEROES.map((h) => [h.id, h]));
export const UPGRADES = HEROES.flatMap((h) => h.upgrades);
export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
export const PLANNED_HERO_COUNT = 54;
