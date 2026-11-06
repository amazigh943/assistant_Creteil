/**
 * Compétences actives, reliques, montures, idoles et boutique.
 * Les effets utilisent le même vocabulaire que les améliorations de héros
 * (voir core/stats.js) :
 *   dpsPercent, clickPercent, goldPercent (additifs, +0.10 = +10 %)
 *   critChance, etherChance (additifs, en fraction)
 *   bossTime (secondes)
 */

export const SKILLS = [
  {
    id: 'frenzy', name: 'Rage du berserker', key: '1', duration: 30, cooldown: 600,
    description: '10 frappes automatiques par seconde pendant 30 s.',
    effects: [{ type: 'autoClicks', value: 10 }],
  },
  {
    id: 'midas', name: 'Transmutation', key: '2', duration: 30, cooldown: 900,
    description: "Double l'or gagné pendant 30 s.",
    effects: [{ type: 'goldMult', value: 2 }],
  },
  {
    id: 'blessing', name: 'Bénédiction de lumière', key: '3', duration: 30, cooldown: 600,
    description: 'Double le DPS de tous les héros pendant 30 s.',
    effects: [{ type: 'dpsMult', value: 2 }],
  },
  {
    id: 'hunt', name: 'Œil du prédateur', key: '4', duration: 30, cooldown: 900,
    description: '+50 % de chances de coup critique pendant 30 s.',
    effects: [{ type: 'critChance', value: 0.5 }],
  },
];
export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

export const RELICS = [
  { id: 'ecu-ancestral', name: 'Écu ancestral', rarity: 'commune', effects: [{ type: 'dpsPercent', value: 0.05 }] },
  { id: 'bourse-sans-fond', name: 'Bourse sans fond', rarity: 'commune', effects: [{ type: 'goldPercent', value: 0.08 }] },
  { id: 'gantelet-tonnerre', name: 'Gantelet du tonnerre', rarity: 'commune', effects: [{ type: 'clickPercent', value: 0.15 }] },
  { id: 'sablier-ensable', name: 'Sablier ensablé', rarity: 'rare', effects: [{ type: 'bossTime', value: 1 }] },
  { id: 'oeil-lynx', name: 'Œil de lynx', rarity: 'rare', effects: [{ type: 'critChance', value: 0.01 }] },
  { id: 'prisme-ether', name: "Prisme d'éther", rarity: 'rare', effects: [{ type: 'etherChance', value: 0.0025 }] },
  { id: 'cor-de-guerre', name: 'Cor de guerre', rarity: 'épique', effects: [{ type: 'dpsPercent', value: 0.04 }, { type: 'goldPercent', value: 0.04 }] },
  { id: 'couronne-dechue', name: 'Couronne des rois déchus', rarity: 'légendaire', effects: [{ type: 'dpsPercent', value: 0.12 }] },
];
export const RELIC_BY_ID = Object.fromEntries(RELICS.map((r) => [r.id, r]));
export const RELIC_WEIGHTS = { commune: 10, rare: 5, 'épique': 2, 'légendaire': 1 };

export const MOUNTS = [
  { id: 'destrier-plaines', name: 'Destrier des plaines', cost: 10, effects: [{ type: 'goldPercent', value: 0.10 }],
    description: 'Fidèle et robuste, idéal pour transporter le butin.' },
  { id: 'loup-neiges', name: 'Loup des neiges', cost: 25, effects: [{ type: 'dpsPercent', value: 0.15 }],
    description: 'Ses hurlements galvanisent vos héros.' },
  { id: 'griffon-airain', name: "Griffon d'airain", cost: 60, effects: [{ type: 'bossTime', value: 3 }],
    description: 'Il fond sur les boss avant qu’ils ne puissent fuir.' },
  { id: 'drake-braise', name: 'Drake de braise', cost: 150, effects: [{ type: 'dpsPercent', value: 0.25 }, { type: 'clickPercent', value: 0.25 }],
    description: 'Un jeune dragon au souffle ardent.' },
];
export const MOUNT_BY_ID = Object.fromEntries(MOUNTS.map((m) => [m.id, m]));

/** Idoles : entités légendaires améliorées avec des âmes (coût = niveau visé). */
export const IDOLS = [
  { id: 'aurvax', name: "Aurvax, le Dragon d'or", domain: 'Avarice', maxLevel: 0,
    effects: [{ type: 'goldPercent', value: 0.15 }], description: "+15 % d'or par niveau." },
  { id: 'kharoth', name: 'Kharoth, le Titan rouge', domain: 'Fureur', maxLevel: 0,
    effects: [{ type: 'dpsPercent', value: 0.15 }], description: '+15 % de DPS par niveau.' },
  { id: 'myrrha', name: 'Myrrha, Mère des tempêtes', domain: 'Colosse', maxLevel: 0,
    effects: [{ type: 'clickPercent', value: 0.25 }], description: '+25 % de dégâts de clic par niveau.' },
  { id: 'chronis', name: 'Chronis, Gardien du sablier', domain: 'Temps', maxLevel: 10,
    effects: [{ type: 'bossTime', value: 2 }], description: '+2 s pour vaincre les boss par niveau.' },
  { id: 'nyxalis', name: "Nyxalis, l'Oracle voilé", domain: 'Présage', maxLevel: 10,
    effects: [{ type: 'etherChance', value: 0.002 }], description: "+0,2 % de chance d'éclat d'éther par niveau." },
];
export const IDOL_BY_ID = Object.fromEntries(IDOLS.map((i) => [i.id, i]));

/** Boutique : achats en éclats d'éther (aucun paiement réel). */
export const SHOP_ITEMS = [
  { id: 'bourse-marchand', name: 'Bourse du marchand', cost: 5,
    description: "Reçoit immédiatement l'équivalent de 250 monstres de la zone actuelle en or." },
  { id: 'sablier-brise', name: 'Sablier brisé', cost: 8,
    description: 'Recharge instantanément toutes les compétences.' },
  { id: 'elixir-puissance', name: 'Élixir de puissance', cost: 12, buff: { id: 'elixir-puissance', duration: 600 },
    description: 'Double le DPS pendant 10 minutes.' },
  { id: 'elixir-fortune', name: 'Élixir de fortune', cost: 12, buff: { id: 'elixir-fortune', duration: 600 },
    description: "Double l'or gagné pendant 10 minutes." },
];
export const SHOP_BY_ID = Object.fromEntries(SHOP_ITEMS.map((s) => [s.id, s]));
export const BUFF_EFFECTS = {
  'elixir-puissance': [{ type: 'dpsMult', value: 2 }],
  'elixir-fortune': [{ type: 'goldMult', value: 2 }],
};
