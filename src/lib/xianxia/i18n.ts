import { ArtifactRarity, RealmStage } from "./types";

export type Lang = "zh" | "en";

const REALM_EN_MAP: Record<RealmStage, string> = {
  练气期: "Qi Condensation",
  筑基期: "Foundation Est.",
  结丹期: "Core Formation",
  元婴期: "Nascent Soul",
};

const RARITY_EN_MAP: Record<ArtifactRarity, string> = {
  凡品法器: "Common Artifact",
  凡品灵兵: "Mortal Spirit Weapon",
  上品灵宝: "Fine Spirit Treasure",
  极品道器: "Masterwork Dao Vessel",
  传世仙器: "Mythic Celestial Artifact",
};

const HERB_NAME_EN: Record<string, string> = {
  聚灵青叶草: "Spirit-Gathering Grass",
  九叶赤血芝: "Nine-Leaf Blood Lingzhi",
  千年玄黄朱果: "Millennium Vermilion Fruit",
};

const PILL_NAME_EN: Record<string, string> = {
  九转回春丹: "Rejuvenation Pill",
  龙虎气血丹: "Dragon-Tiger Vitality Pill",
  太乙涅槃仙丹: "Taiyi Nirvana Elixir",
};

const HERB_LORE_EN: Record<string, string> = {
  "seed-tier-1":
    "Absorbs nascent wood-spirit qi; refine into pills to permanently boost Max HP.",
  "seed-tier-2":
    "Grows atop ancient spirit veins with nine fiery leaves; greatly expands meridians & Max HP.",
  "seed-tier-3":
    "Blooms once every 500 years with immortal vitality; grants massive permanent Max HP.",
};

const ARTIFACT_NAME_EN: Record<string, string> = {
  青竹蜂云剑: "Azure Bamboo Cloud Sword",
  紫金混元印: "Purple-Gold Primordial Seal",
  太虚焚天仙剑: "Taixu Heaven-Burning Sword",
};

const BLUEPRINT_DESC_EN: Record<string, string> = {
  "bp-bamboo-sword":
    "Forged from ten-thousand-year spirit bamboo and hundred-refined black iron. Swift armor-piercing sword qi.",
  "bp-primordial-seal":
    "Fused with meteoric iron and purple-gold essence. Crushes demonic defenses with overwhelming weight.",
  "bp-taixu-sword":
    "Tempered in earth-core samadhi fire and star meteor iron. One slash annihilates all fiends.",
};

const AFFIX_EN_MAP: Record<string, string> = {
  "太古剑意 · 破界": "Primordial Sword Intent · Worldbreaker",
  "离火真罡 · 贯日": "Samadhi Flame Aura · Sunpiercer",
  "百炼精钢 · 疾风": "Hundred-Refined Steel · Gale",
};

const INSCRIPTION_EN_MAP: Record<string, string> = {
  "『一剑霜寒十四州，太虚紫气绕剑身』——玄机长老亲题仙品铭文":
    '"One sword chills fourteen provinces; purple qi coils the blade" — Inscribed by Elder Xuanji',
  "『玄铁融星火，锋芒斩妖氛』——天工阁上品灵宝印记":
    '"Black iron melts in starlight, cleaving demonic miasma" — Heavenly Forge Spirit Seal',
  "『千锤百炼出深山，锋刃初成試鬼神』——内门制式法器":
    '"Tempered a thousand times in deep mountains" — Inner Sect Standard Artifact',
};

const MONSTER_NAME_EN: Record<string, string> = {
  黑风幽冥狼: "Black-Wind Nether Wolf",
  赤甲毒火蝎王: "Crimson-Shell Scorpion King",
  玄冰双头魔蛟: "Mystic-Ice Twin-Headed Dragon",
  炼狱血煞魔将: "Purgatory Blood Demon General",
  九幽吞天魔帝: "Nine-Nether Sky-Devouring Archfiend",
};

const MONSTER_TITLE_EN: Record<number, string> = {
  1: "Outer Abyss Beast · Tier 1",
  2: "Molten Cavern Warlord · Tier 2",
  3: "Frost Abyss Overlord · Tier 3",
  4: "Demon Tower Guardian · Tier 4",
  5: "Eternal Abyss Archfiend · Tier 5",
};

const DAOIST_NAME_EN: Record<string, string> = {
  青云道人: "Daoist Qingyun",
  凌霄剑尊: "Sword Sovereign Lingxiao",
  "药王谷·百草仙": "Immortal Baicao (Herb Valley)",
  "天工阁·赤炎子": "Master Chiyan (Sky Forge)",
};

export function trRealm(realm: RealmStage, lang: Lang): string {
  return lang === "en" ? REALM_EN_MAP[realm] || realm : realm;
}

export function trRarity(rarity: ArtifactRarity, lang: Lang): string {
  return lang === "en" ? RARITY_EN_MAP[rarity] || rarity : rarity;
}

export function trHerbName(name: string | undefined, lang: Lang): string {
  if (!name) return "";
  return lang === "en" ? HERB_NAME_EN[name] || name : name;
}

export function trPillName(name: string | undefined, lang: Lang): string {
  if (!name) return "";
  return lang === "en" ? PILL_NAME_EN[name] || name : name;
}

export function trHerbLore(seedId: string, defaultLore: string, lang: Lang): string {
  return lang === "en" ? HERB_LORE_EN[seedId] || defaultLore : defaultLore;
}

export function trArtifactName(name: string | undefined, lang: Lang): string {
  if (!name) return "";
  return lang === "en" ? ARTIFACT_NAME_EN[name] || name : name;
}

export function trBlueprintDesc(id: string, defaultDesc: string, lang: Lang): string {
  return lang === "en" ? BLUEPRINT_DESC_EN[id] || defaultDesc : defaultDesc;
}

export function trAffix(affix: string, lang: Lang): string {
  return lang === "en" ? AFFIX_EN_MAP[affix] || affix : affix;
}

export function trInscription(ins: string, lang: Lang): string {
  return lang === "en" ? INSCRIPTION_EN_MAP[ins] || ins : ins;
}

export function trMonsterName(name: string, lang: Lang): string {
  return lang === "en" ? MONSTER_NAME_EN[name] || name : name;
}

export function trMonsterTitle(floor: number, defaultTitle: string, lang: Lang): string {
  return lang === "en" ? MONSTER_TITLE_EN[floor] || defaultTitle : defaultTitle;
}

export function trDaoName(name: string, lang: Lang): string {
  return lang === "en" ? DAOIST_NAME_EN[name] || name : name;
}
