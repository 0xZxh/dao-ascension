import crypto from "crypto";
import { requestCrossChainIntentQuote } from "../intents/client";
import { getNearConfig } from "../near/config";
import {
  getCultivatorFunctionCallKeyInfo,
  getTestnetNetworkStatus,
  queryContractView,
  SignedSessionActionReceipt,
  signSessionActionReceipt,
} from "../near/testnet-wallet";
import { deleteStoreFromDisk, loadStoreFromDisk, saveStoreToDisk } from "./persistence";
import {
  ArtifactRarity,
  CelestialMailAttachment,
  CelestialMailItem,
  CombatBattleReport,
  CombatTurnLog,
  CultivatorFinancialRecord,
  CultivatorFinancialStats,
  CultivatorNftAccount,
  ElderAiCounsel,
  ForgeBlueprintConfig,
  ForgedArtifact,
  GardenPlotState,
  HerbSeedConfig,
  LeaderboardEntry,
  PvpDuelOpponent,
  PvpDuelReport,
  PvpTurnLog,
  RealmStage,
  SecretRealmFloorConfig,
  SectTreasuryState,
  WeeklySettlementRecord,
  XianxiaWorldSnapshot,
  SpiritRootDefinition,
  SpiritRootTier,
  SPIRIT_ROOTS_CATALOG,
} from "./types";

export const HERB_SEEDS_CATALOG: HerbSeedConfig[] = [
  {
    tier: 1,
    id: "seed-tier-1",
    name: "聚灵青叶草",
    pillName: "九转回春丹",
    costSpiritStones: 15,
    permMaxHpBonus: 40,
    pillsYieldCount: 2,
    pillHealAmount: 95,
    alchemyScorePoints: 35,
    growDurationSeconds: 30,
    lore: "汲取天地初生木灵之气，炼丹服之可固本培元、气血充盈。",
  },
  {
    tier: 2,
    id: "seed-tier-2",
    name: "九叶赤血芝",
    pillName: "龙虎气血丹",
    costSpiritStones: 35,
    permMaxHpBonus: 95,
    pillsYieldCount: 3,
    pillHealAmount: 165,
    alchemyScorePoints: 85,
    growDurationSeconds: 90,
    lore: "生于古洞灵脉之上，九叶如火，可大幅拓宽修士经脉与气血上限。",
  },
  {
    tier: 3,
    id: "seed-tier-3",
    name: "千年玄黄朱果",
    pillName: "太乙涅槃仙丹",
    costSpiritStones: 75,
    permMaxHpBonus: 210,
    pillsYieldCount: 4,
    pillHealAmount: 290,
    alchemyScorePoints: 190,
    growDurationSeconds: 180,
    lore: "五百年开花、五百年结果，蕴含玄黄不灭生机，凡人食之立地筑基。",
  },
];

export const FORGE_BLUEPRINTS_CATALOG: ForgeBlueprintConfig[] = [
  {
    id: "bp-bamboo-sword",
    name: "青竹蜂云剑",
    tier: 1,
    ironOreCost: 2,
    meteorOreCost: 0,
    spiritStoneFee: 25,
    baseAtkMin: 32,
    baseAtkMax: 46,
    baseDefBonus: 6,
    baseCritPct: 8,
    baseForgeScore: 55,
    description: "取万年灵竹辅以百炼玄铁熔铸，剑气轻灵，破甲无声。",
  },
  {
    id: "bp-primordial-seal",
    name: "紫金混元印",
    tier: 2,
    ironOreCost: 4,
    meteorOreCost: 1,
    spiritStoneFee: 55,
    baseAtkMin: 72,
    baseAtkMax: 98,
    baseDefBonus: 18,
    baseCritPct: 14,
    baseForgeScore: 130,
    description: "融合天外陨铁与紫金铜母，祭出时重若千钧，镇压一切邪祟。",
  },
  {
    id: "bp-taixu-sword",
    name: "太虚焚天仙剑",
    tier: 3,
    ironOreCost: 6,
    meteorOreCost: 2,
    spiritStoneFee: 110,
    baseAtkMin: 145,
    baseAtkMax: 195,
    baseDefBonus: 32,
    baseCritPct: 24,
    baseForgeScore: 280,
    description: "引地心离火与星辰陨铁千锤百炼，一剑既出，万妖辟易。",
  },
];

export function getSecretRealmFloorConfig(floor: number): SecretRealmFloorConfig {
  const f = Math.max(1, Math.floor(floor));

  let realmTitle = "练气期妖兽";
  let dropSeedTier: 1 | 2 | 3 = 1;
  if (f <= 5) {
    realmTitle = `练气渊薮 · ${f}阶`;
    dropSeedTier = 1;
  } else if (f <= 15) {
    realmTitle = `筑基幽境 · ${f - 5}阶`;
    dropSeedTier = 2;
  } else if (f <= 30) {
    realmTitle = `金丹秘窟 · ${f - 15}阶`;
    dropSeedTier = 2;
  } else if (f <= 50) {
    realmTitle = `元婴魔渊 · ${f - 30}阶`;
    dropSeedTier = 3;
  } else if (f <= 75) {
    realmTitle = `化神凶域 · ${f - 50}阶`;
    dropSeedTier = 3;
  } else if (f <= 100) {
    realmTitle = `炼虚古道 · ${f - 75}阶`;
    dropSeedTier = 3;
  } else if (f <= 150) {
    realmTitle = `合体神魔域 · ${f - 100}阶`;
    dropSeedTier = 3;
  } else if (f <= 200) {
    realmTitle = `大乘至尊天 · ${f - 150}阶`;
    dropSeedTier = 3;
  } else if (f <= 300) {
    realmTitle = `渡劫绝巅域 · ${f - 200}阶`;
    dropSeedTier = 3;
  } else {
    realmTitle = `九天真仙域 · ${f - 300}阶`;
    dropSeedTier = 3;
  }

  const monsterPrefixes = [
    "黑风", "赤焰", "玄冰", "九幽", "太虚", "幽冥", "万劫", "紫霄", "混元", "寂灭",
    "洪荒", "修罗", "天煞", "烛照", "焚天", "雷煞", "万魔", "碧落", "黄泉", "九天",
  ];
  const monsterSuffixes = [
    "幽冥狼", "毒火蝎", "双头蛟", "血煞蝠", "金睛兽", "玄甲龟", "吞天鹏", "火凤鸟",
    "雷麒麟", "赤炎龙", "混沌魔", "修罗将", "阴阳尸", "灭世蟒", "烛九阴", "九尾妖狐",
    "通天猿", "夜叉王", "镇魂兽", "魔尊化身",
  ];

  const pIdx = (f * 7 + 3) % monsterPrefixes.length;
  const sIdx = (f * 13 + 5) % monsterSuffixes.length;
  const monsterName = `${monsterPrefixes[pIdx]}${monsterSuffixes[sIdx]}`;

  const monsterHp = Math.round(130 + Math.pow(f, 1.55) * 50 + f * 25);
  const monsterAtk = Math.round(28 + Math.pow(f, 1.34) * 9 + f * 4);
  const monsterDef = Math.round(6 + Math.pow(f, 1.12) * 3);

  const recommendedHp = Math.round(monsterHp * 0.72);
  const recommendedAtk = Math.round(monsterAtk * 0.92);

  const entryFeeStones = Math.min(12, Math.floor((f - 1) / 2) * 2);
  const rewardSpiritStones = 0; // PVE 不掉落大量灵石，保护 Web3 NEAR 充值经济与周榜国库分润生态
  const rewardExp = Math.round(80 + Math.pow(f, 1.25) * 50);
  const dropIronOres = Math.min(30, Math.floor(2 + f * 0.6));
  const dropMeteorOres = Math.min(15, Math.floor(f / 2));
  const slayerScorePoints = Math.round(50 + f * 50 + Math.pow(f, 1.3) * 15);

  return {
    floor: f,
    monsterName,
    monsterTitle: realmTitle,
    recommendedHp,
    recommendedAtk,
    monsterHp,
    monsterAtk,
    monsterDef,
    entryFeeStones,
    rewardSpiritStones,
    rewardExp,
    dropIronOres,
    dropMeteorOres,
    dropSeedTier,
    slayerScorePoints,
  };
}

export const SECRET_REALM_FLOORS: SecretRealmFloorConfig[] = Array.from(
  { length: 30 },
  (_, i) => getSecretRealmFloorConfig(i + 1)
);

export const RIVAL_DAOISTS = [
  {
    daoName: "凌霄剑尊",
    subAccountId: "lingxiao.daoascension.testnet",
    slayerBase: 115,
    alchemyBase: 70,
    blacksmithBase: 95,
    duelBase: 1280,
  },
  {
    daoName: "药王谷·百草仙",
    subAccountId: "baicao.daoascension.testnet",
    slayerBase: 65,
    alchemyBase: 140,
    blacksmithBase: 50,
    duelBase: 1020,
  },
  {
    daoName: "天工阁·赤炎子",
    subAccountId: "chiyan.daoascension.testnet",
    slayerBase: 80,
    alchemyBase: 55,
    blacksmithBase: 135,
    duelBase: 1150,
  },
];

// Spirit Stone to USD peg in game economy (1 Spirit Stone = $0.10 USD equivalent)
export const SPIRIT_STONE_USD_RATE = 0.1;

export { SPIRIT_ROOTS_CATALOG } from "./types";

export interface InternalStore {
  cultivator: CultivatorNftAccount;
  treasury: SectTreasuryState;
  latestBattleReport: CombatBattleReport | null;
  latestPvpReport: PvpDuelReport | null;
  elderCounsel: ElderAiCounsel;
  recentSessionReceipts: SignedSessionActionReceipt[];
}

function createInitialGardenPlots(): GardenPlotState[] {
  const plots: GardenPlotState[] = [];
  const now = Date.now();
  for (let i = 0; i < 9; i++) {
    if (i === 0) {
      // Pre-plant plot #0 as READY so player/judge can harvest immediately on first click
      plots.push({
        plotId: 0,
        status: "READY",
        seedTier: 2,
        herbName: "九叶赤血芝",
        pillName: "龙虎气血丹",
        plantedAt: new Date(now - 600_000).toISOString(),
        matureAtIso: new Date(now - 300_000).toISOString(),
        remainingGrowSeconds: 0,
        wateredWithSpiritSpring: true,
        potencyMultiplier: 1.25,
        expectedMaxHpBonus: 118,
        expectedPillsYield: 3,
      });
    } else if (i === 1) {
      plots.push({
        plotId: 1,
        status: "GROWING",
        seedTier: 1,
        herbName: "聚灵青叶草",
        pillName: "九转回春丹",
        plantedAt: new Date(now - 10_000).toISOString(),
        matureAtIso: new Date(now + 20_000).toISOString(),
        remainingGrowSeconds: 20,
        wateredWithSpiritSpring: false,
        potencyMultiplier: 1.0,
        expectedMaxHpBonus: 40,
        expectedPillsYield: 2,
      });
    } else {
      plots.push({
        plotId: i,
        status: "EMPTY",
        wateredWithSpiritSpring: false,
        potencyMultiplier: 1.0,
        expectedMaxHpBonus: 0,
        expectedPillsYield: 0,
      });
    }
  }
  return plots;
}

export function updatePlotsGrowthStatus(plots: GardenPlotState[]): void {
  const now = Date.now();
  for (const plot of plots) {
    if (plot.status === "GROWING") {
      if (plot.matureAtIso) {
        const matureMs = new Date(plot.matureAtIso).getTime();
        const remainSec = Math.ceil((matureMs - now) / 1000);
        if (remainSec <= 0) {
          plot.status = "READY";
          plot.remainingGrowSeconds = 0;
        } else {
          plot.remainingGrowSeconds = remainSec;
        }
      } else {
        plot.status = "READY";
        plot.remainingGrowSeconds = 0;
      }
    } else if (plot.status === "READY") {
      plot.remainingGrowSeconds = 0;
    }
  }
}

export function calculateNextSundayMidnightUtc8(fromTime: Date = new Date()): {
  nextSettlementIsoUtc: string;
  nextSettlementLabelUtc8: string;
  remainingMs: number;
} {
  const utcMs = fromTime.getTime();
  // 东八区偏移量 +8小时
  const utc8Time = new Date(utcMs + 8 * 3600 * 1000);

  const year = utc8Time.getUTCFullYear();
  const month = utc8Time.getUTCMonth();
  const date = utc8Time.getUTCDate();
  const day = utc8Time.getUTCDay(); // 0 is Sunday, 1 is Monday ...

  // 距离下一个周一 00:00:00 (即周日 24:00:00 UTC+8) 的天数
  const daysUntilNextMonday = day === 0 ? 1 : 8 - day;

  const targetUtc8 = new Date(
    Date.UTC(year, month, date + daysUntilNextMonday, 0, 0, 0, 0)
  );
  const realTargetUtc = new Date(targetUtc8.getTime() - 8 * 3600 * 1000);
  const remainingMs = Math.max(0, realTargetUtc.getTime() - fromTime.getTime());

  const y = targetUtc8.getUTCFullYear();
  const m = String(targetUtc8.getUTCMonth() + 1).padStart(2, "0");
  const d = String(targetUtc8.getUTCDate()).padStart(2, "0");

  return {
    nextSettlementIsoUtc: realTargetUtc.toISOString(),
    nextSettlementLabelUtc8: `${y}-${m}-${d} 00:00:00 (东八区周日24点 / 周一0点 UTC+8)`,
    remainingMs,
  };
}

export function createInitialCelestialMails(): CelestialMailItem[] {
  return [
    {
      id: "mail-genesis-welcome",
      title: "【仙途引路】九天玄机阁迎新法旨",
      sender: "九天玄机阁 · 太古仙尊",
      category: "REWARD",
      content:
        "奉太虚玉清法旨：恭贺道友步入太虚云海洞府！仙门特赐灵田开荒资粮：内含开荒灵石 50 枚、百炼玄铁 2 方、一阶凝灵草仙种 2 枚。望道友外修神兵、内固元神，勤耕灵田，早日登临云海试炼塔，名列宗门三大周天榜！",
      createdAt: new Date().toISOString(),
      isRead: false,
      isClaimed: false,
      attachments: {
        spiritStones: 50,
        ironOres: 2,
        seeds: { tier: 1, count: 2 },
      },
      epochNumber: 1,
    },
  ];
}

function createInitialState(
  ownerAccountId: string = "qingyun-master.testnet"
): InternalStore {
  const config = getNearConfig();
  const initialMails = createInitialCelestialMails();
  const nextSettle = calculateNextSundayMidnightUtc8();

  const isDefault = ownerAccountId === "qingyun-master.testnet";
  const cleanOwner = (ownerAccountId || "qingyun-master.testnet").trim();
  const subAccountPrefix = cleanOwner.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/\.testnet$/, "");
  const boundSubAccountId = isDefault
    ? "qingyun-01.daoascension.testnet"
    : `${subAccountPrefix}-01.daoascension.testnet`;
  const defaultDaoName = isDefault ? "青云道人" : `${subAccountPrefix}道友`;

  const initialCultivator: CultivatorNftAccount = {
    nftTokenId: isDefault ? "cultivator-nft:001" : `cultivator-nft:${cleanOwner}`,
    nftStandard: "nep171",
    isMinted: isDefault,
    avatarClass: "saintess",
    spiritRoot: SPIRIT_ROOTS_CATALOG[0],
    ownerAccountId: cleanOwner,
    boundSubAccountId,
    daoName: defaultDaoName,
    title: "太虚门·内门亲传",
    realm: "练气期",
    realmLevel: 3,
    exp: 40,
    maxExp: 120,
    hp: 160,
    maxHp: 160,
    baseHp: 160,
    herbBonusHp: 0,
    atk: 36,
    baseAtk: 36,
    weaponBonusAtk: 0,
    def: 12,
    critRatePct: 10,
    spiritStones: 260,
    inventory: {
      healingPills: 2,
      pillHealPower: 110,
      ironOres: 6,
      meteorOres: 2,
      seedBag: {
        1: 2,
        2: 1,
        3: 0,
      },
      artifacts: [],
    },
    equippedArtifact: null,
    gardenPlots: createInitialGardenPlots(),
    highestFloorCleared: 0,
    herbsHarvestedCount: isDefault ? 2 : 0,
    scores: {
      slayerScore: 0,
      alchemyScore: isDefault ? 2 : 0,
      blacksmithScore: 160 + 36 * 4,
      duelScore: 1000,
      duelWins: 0,
      duelLosses: 0,
    },
    inbox: initialMails,
    unreadMailCount: initialMails.filter((m) => !m.isRead).length,
    financialStats: {
      totalNearSpent: 0.2,
      totalNearEarned: 0,
      totalStonesRecharged: 0,
      totalStonesDividends: 0,
      records: [
        {
          id: `fin-init-genesis`,
          type: "MINT_NFT",
          titleZh: "太虚仙宗 · 结契铸造本命修真道身 NFT",
          titleEn: "Mint Cultivator Soul NFT",
          nearDelta: -0.2,
          stonesDelta: 88,
          timestamp: new Date().toISOString(),
          txHash: "ed25519-mint-genesis",
        },
      ],
    },
    transferHistory: [],
  };

  const initialTreasury: SectTreasuryState = {
    treasuryAccountId: config.sectTreasuryAccountId,
    devOpsVaultAccountId: "devops.daoascension.testnet",
    currentEpoch: 1,
    totalTreasurySpiritStones: 680,
    extractionRatioPct: 50,
    devOpsRatioPct: 20,
    reserveRatioPct: 30,
    activeWeeklyRewardPoolStones: 340,
    activeDevOpsAllocationStones: 136,
    cumulativeDevOpsRevenueStones: 180,
    cumulativeDevOpsRevenueUsd: 18.0,
    feeBreakdown: {
      seedPurchasesStones: 95,
      forgingFeesStones: 110,
      realmEntryFeesStones: 75,
      initialGenesisStones: 400,
    },
    boards: {
      slayerBoard: [],
      alchemyBoard: [],
      blacksmithBoard: [],
      duelBoard: [],
    },
    settlementHistory: [],
    nextWeeklySettlementUtc8: nextSettle.nextSettlementIsoUtc,
    weeklySettlementCronDescription:
      "东八区每周日 24:00 (周一 00:00 UTC+8) 准时结算，天阙传谕颁布周俸法旨",
  };

  const initialCounsel: ElderAiCounsel = {
    elderName: "玄机长老 (NEAR.AI Spirit Elder)",
    elderTitle: "太虚门·传功兼丹器大宗师",
    elderWallet: config.agentSubAccountId,
    message:
      "道友初入仙途，切记『外炼飞剑以破敌，内服灵丹以固本』。你洞府1号灵田的【九叶赤血芝】已成熟，速去采摘炼丹提升气血上限，再去天工阁锻造本命飞剑，即可勇闯镇魔古塔问鼎四大周天榜！",
    marketDemandHint:
      "【宗门行情】本周四大天榜（诛魔、百草、神工、论剑）竞争激烈，国库50%灵石将于周日结算并通过 NEAR Intents 跨链发放！",
    teeAttested: true,
    timestamp: new Date().toISOString(),
  };

  const store: InternalStore = {
    cultivator: initialCultivator,
    treasury: initialTreasury,
    latestBattleReport: null,
    latestPvpReport: null,
    elderCounsel: initialCounsel,
    recentSessionReceipts: [],
  };

  recalculateLeaderboards(store);
  return store;
}

const globalForXianxia = globalThis as unknown as {
  __daoAscensionStore?: InternalStore;
  __daoAscensionAccountMap?: Record<string, InternalStore>;
};

export function getStore(accountId?: string): InternalStore {
  const normalizedId = (accountId || "qingyun-master.testnet").trim();
  if (!globalForXianxia.__daoAscensionAccountMap) {
    globalForXianxia.__daoAscensionAccountMap = {};
  }
  if (!globalForXianxia.__daoAscensionAccountMap[normalizedId]) {
    const loaded = loadStoreFromDisk(normalizedId);
    if (loaded) {
      globalForXianxia.__daoAscensionAccountMap[normalizedId] = loaded;
    } else {
      globalForXianxia.__daoAscensionAccountMap[normalizedId] = createInitialState(normalizedId);
      saveStoreToDisk(normalizedId, globalForXianxia.__daoAscensionAccountMap[normalizedId]);
    }
  }
  if (normalizedId === "qingyun-master.testnet") {
    globalForXianxia.__daoAscensionStore = globalForXianxia.__daoAscensionAccountMap[normalizedId];
  }
  const currentStore = globalForXianxia.__daoAscensionAccountMap[normalizedId];
  if (currentStore?.cultivator && !currentStore.cultivator.financialStats) {
    currentStore.cultivator.financialStats = {
      totalNearSpent: 0.2,
      totalNearEarned: 0,
      totalStonesRecharged: 0,
      totalStonesDividends: 0,
      records: [
        {
          id: `fin-init-genesis`,
          type: "MINT_NFT",
          titleZh: "太虚仙宗 · 结契铸造本命修真道身 NFT",
          titleEn: "Mint Cultivator Soul NFT",
          nearDelta: -0.2,
          stonesDelta: 88,
          timestamp: new Date().toISOString(),
          txHash: "ed25519-mint-genesis",
        },
      ],
    };
  }
  return currentStore;
}

export function resetXianxiaWorldState(accountId?: string): InternalStore {
  const normalizedId = (accountId || "qingyun-master.testnet").trim();
  deleteStoreFromDisk(normalizedId);
  const newStore = createInitialState(normalizedId);
  if (!globalForXianxia.__daoAscensionAccountMap) {
    globalForXianxia.__daoAscensionAccountMap = {};
  }
  globalForXianxia.__daoAscensionAccountMap[normalizedId] = newStore;
  if (normalizedId === "qingyun-master.testnet") {
    globalForXianxia.__daoAscensionStore = newStore;
  }
  saveStoreToDisk(normalizedId, newStore);
  return newStore;
}

export function createCustomCultivatorCharacter(params: {
  daoName: string;
  avatarClass:
    | "saintess"
    | "sword"
    | "venerable"
    | "fox"
    | "demon"
    | "alchemy"
    | "body";
  spiritRootName: string;
  accountId?: string;
}): InternalStore {
  const store = getStore(params.accountId);
  const cleanName = params.daoName.trim() || "云清浅";
  store.cultivator.daoName = cleanName;
  store.cultivator.isMinted = true;

  const validClass: "saintess" | "sword" | "venerable" | "fox" | "demon" =
    params.avatarClass === "alchemy"
      ? "saintess"
      : params.avatarClass === "body"
      ? "venerable"
      : params.avatarClass;
  store.cultivator.avatarClass = validClass;

  const matchedRoot =
    SPIRIT_ROOTS_CATALOG.find(
      (r) =>
        r.name.includes(params.spiritRootName || "") ||
        r.id === params.spiritRootName
    ) || SPIRIT_ROOTS_CATALOG[0];
  store.cultivator.spiritRoot = matchedRoot;

  if (params.avatarClass === "sword") {
    store.cultivator.title = `太虚剑修 · ${matchedRoot.name}`;
    store.cultivator.baseHp = 170;
    store.cultivator.baseAtk = 48;
    store.cultivator.critRatePct = 18;
  } else if (
    params.avatarClass === "saintess" ||
    params.avatarClass === "alchemy"
  ) {
    store.cultivator.title = `瑶池圣女 · ${matchedRoot.name}`;
    store.cultivator.baseHp = 210;
    store.cultivator.baseAtk = 38;
    store.cultivator.critRatePct = 10;
    store.cultivator.inventory.healingPills = 4;
  } else if (
    params.avatarClass === "venerable" ||
    params.avatarClass === "body"
  ) {
    store.cultivator.title = `上古仙尊 · ${matchedRoot.name}`;
    store.cultivator.baseHp = 240;
    store.cultivator.baseAtk = 40;
    store.cultivator.def = 22;
    store.cultivator.critRatePct = 10;
  } else if (params.avatarClass === "fox") {
    store.cultivator.title = `青丘灵狐 · ${matchedRoot.name}`;
    store.cultivator.baseHp = 200;
    store.cultivator.baseAtk = 44;
    store.cultivator.critRatePct = 17;
  } else if (params.avatarClass === "demon") {
    store.cultivator.title = `九幽魔尊 · ${matchedRoot.name}`;
    store.cultivator.baseHp = 185;
    store.cultivator.baseAtk = 54;
    store.cultivator.critRatePct = 22;
  }

  recalculateCultivatorDerivedStats(store.cultivator);

  // Start all 9 plots EMPTY so the step-by-step tutorial guides the player from planting seed #1!
  store.cultivator.gardenPlots = store.cultivator.gardenPlots.map((p) => ({
    plotId: p.plotId,
    status: "EMPTY",
    wateredWithSpiritSpring: false,
    potencyMultiplier: 1.0,
    expectedMaxHpBonus: 0,
    expectedPillsYield: 0,
  }));

  recalculateLeaderboards(store);
  globalForXianxia.__daoAscensionStore = store;
  return store;
}

export function recalculateCultivatorDerivedStats(
  cultivator: CultivatorNftAccount
): void {
  const root = cultivator.spiritRoot || SPIRIT_ROOTS_CATALOG[0];
  const hpMultiplier = 1 + (root.hpBonusPct / 100);
  const atkMultiplier = 1 + (root.atkBonusPct / 100);

  cultivator.maxHp = Math.round(
    (cultivator.baseHp + cultivator.herbBonusHp) * hpMultiplier
  );
  cultivator.hp = cultivator.maxHp;

  cultivator.atk = Math.round(
    (cultivator.baseAtk + cultivator.weaponBonusAtk) * atkMultiplier
  );

  const weaponCrit = cultivator.equippedArtifact
    ? cultivator.equippedArtifact.critRatePct
    : 0;
  cultivator.critRatePct = Math.min(75, 10 + weaponCrit + root.critBonusPct);
  cultivator.scores.blacksmithScore = cultivator.maxHp + cultivator.atk * 4;
}

export function recordFinancialEntry(
  cultivator: CultivatorNftAccount,
  entry: Omit<CultivatorFinancialRecord, "id" | "timestamp">
): CultivatorFinancialRecord {
  if (!cultivator.financialStats) {
    cultivator.financialStats = {
      totalNearSpent: 0.2,
      totalNearEarned: 0,
      totalStonesRecharged: 0,
      totalStonesDividends: 0,
      records: [
        {
          id: "fin-init-genesis",
          type: "MINT_NFT",
          titleZh: "太虚仙宗 · 结契铸造本命修真道身 NFT",
          titleEn: "Mint Cultivator Soul NFT",
          nearDelta: -0.2,
          stonesDelta: 88,
          timestamp: new Date().toISOString(),
          txHash: "ed25519-mint-genesis",
        },
      ],
    };
  }

  const stats = cultivator.financialStats;
  const record: CultivatorFinancialRecord = {
    id: `fin-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  if (entry.nearDelta < 0) {
    stats.totalNearSpent = Number(
      (stats.totalNearSpent + Math.abs(entry.nearDelta)).toFixed(3)
    );
  } else if (entry.nearDelta > 0) {
    stats.totalNearEarned = Number(
      (stats.totalNearEarned + entry.nearDelta).toFixed(3)
    );
  }

  if (entry.type === "RECHARGE") {
    stats.totalStonesRecharged += Math.max(0, entry.stonesDelta);
  } else if (entry.type === "WEEKLY_DIVIDEND") {
    stats.totalStonesDividends += Math.max(0, entry.stonesDelta);
  }

  stats.records.unshift(record);
  if (stats.records.length > 50) {
    stats.records = stats.records.slice(0, 50);
  }

  return record;
}

export function rollSpiritRootWithNear(params?: { accountId?: string }): {
  spiritRoot: SpiritRootDefinition;
  receipt: SignedSessionActionReceipt;
} {
  const store = getStore(params?.accountId);
  const cultivator = store.cultivator;

  // 概率分布：凡品 50%, 玄品 30%, 地品 14%, 天品 5%, 仙品 1%
  const roll = Math.random() * 100;
  let targetTier: SpiritRootTier = "凡品";
  if (roll < 1) {
    targetTier = "仙品";
  } else if (roll < 6) {
    targetTier = "天品";
  } else if (roll < 20) {
    targetTier = "地品";
  } else if (roll < 50) {
    targetTier = "玄品";
  } else {
    targetTier = "凡品";
  }

  const matches = SPIRIT_ROOTS_CATALOG.filter((r) => r.tier === targetTier);
  const picked =
    matches[Math.floor(Math.random() * matches.length)] ||
    SPIRIT_ROOTS_CATALOG[0];

  // 支付 0.1 NEAR，汇入宗门国库
  store.treasury.totalTreasurySpiritStones += 5;
  cultivator.spiritRoot = picked;
  recalculateCultivatorDerivedStats(cultivator);

  const receipt = recordSessionAction(
    store,
    "roll_spirit_root",
    `感应天地真机！支付 0.1 NEAR 洗炼真元，觉醒【${picked.tier} · ${picked.name}】（气血+${picked.hpBonusPct}%，攻击+${picked.atkBonusPct}%，暴击+${picked.critBonusPct}%）！`,
    {
      near_cost: "0.1 NEAR",
      rolled_tier: picked.tier,
      rolled_root: picked.name,
      hp_bonus_pct: `${picked.hpBonusPct}%`,
      atk_bonus_pct: `${picked.atkBonusPct}%`,
    }
  );

  recordFinancialEntry(cultivator, {
    type: "WASH_ROOT",
    titleZh: `天道玄鉴 · 逆天重洗五行灵根为【${picked.tier} · ${picked.name}】`,
    titleEn: `Wash Spirit Root to [${picked.tier} · ${picked.name}]`,
    nearDelta: -0.1,
    stonesDelta: 0,
    txHash: receipt.txHash,
  });

  return { spiritRoot: picked, receipt };
}

export function reshapeDaoBody(params: {
  accountId?: string;
  newAvatarClass: "saintess" | "sword" | "venerable" | "fox" | "demon";
  newDaoName: string;
  paymentMethod?: "NEAR" | "STONES";
}): {
  success: boolean;
  cultivator: CultivatorNftAccount;
  receipt: SignedSessionActionReceipt;
} {
  const store = getStore(params.accountId);
  const cultivator = store.cultivator;
  const method =
    params.paymentMethod ||
    (cultivator.spiritStones >= 200 ? "STONES" : "NEAR");

  if (method === "STONES") {
    if (cultivator.spiritStones < 200) {
      throw new Error(
        "道身重塑需消耗 200 灵石，灵石不足，请使用 0.5 NEAR 支付！"
      );
    }
    cultivator.spiritStones -= 200;
    store.treasury.totalTreasurySpiritStones += 200;
  } else {
    // 0.5 NEAR payment directly flows 25 stones value into Treasury
    store.treasury.totalTreasurySpiritStones += 25;
  }

  const cleanName = params.newDaoName.trim() || cultivator.daoName;
  cultivator.avatarClass = params.newAvatarClass;
  cultivator.daoName = cleanName;
  cultivator.title = `${resolveClassTitle(params.newAvatarClass)} · ${
    cultivator.spiritRoot?.name || "五行修仙"
  }`;

  const receipt = recordSessionAction(
    store,
    "reshape_dao_body",
    `天火淬形！支付道身重塑仙资 (${
      method === "STONES" ? "200 灵石" : "0.5 NEAR"
    })，形象正式更迭为【${params.newAvatarClass}】，道号更迭为【${cleanName}】，仙道修为与神兵灵田完好承袭！`,
    {
      payment_method: method,
      new_avatar: params.newAvatarClass,
      new_dao_name: cleanName,
    }
  );

  if (method === "NEAR") {
    recordFinancialEntry(cultivator, {
      type: "RESHAPE",
      titleZh: `造化阴阳 · 支付 0.5 NEAR 逆天重塑道身体魄法相【${cleanName}】`,
      titleEn: `Reshape Dao Body with 0.5 NEAR [${cleanName}]`,
      nearDelta: -0.5,
      stonesDelta: 0,
      txHash: receipt.txHash,
    });
  } else {
    recordFinancialEntry(cultivator, {
      type: "RESHAPE",
      titleZh: `造化阴阳 · 消耗 200 灵石重塑道身体魄法相【${cleanName}】`,
      titleEn: `Reshape Dao Body with 200 Stones [${cleanName}]`,
      nearDelta: 0,
      stonesDelta: -200,
      txHash: receipt.txHash,
    });
  }

  return { success: true, cultivator, receipt };
}

function resolveClassTitle(avatarClass: string): string {
  switch (avatarClass) {
    case "sword":
      return "太虚剑修";
    case "saintess":
      return "瑶池圣女";
    case "venerable":
      return "上古仙尊";
    case "fox":
      return "青丘灵狐";
    case "demon":
      return "九幽魔尊";
    default:
      return "太虚门亲传";
  }
}

export function rechargeSpiritStonesWithNear(params: {
  accountId?: string;
  nearAmount: number;
}): {
  spiritStonesGained: number;
  newBalance: number;
  receipt: SignedSessionActionReceipt;
} {
  const store = getStore(params.accountId);
  const amount = Number(params.nearAmount) || 1.0;
  // 1 NEAR = 50 Stones, 5 NEAR bonus +10
  const bonus = amount >= 5.0 ? 10 : 0;
  const gained = Math.round(amount * 50) + bonus;

  store.cultivator.spiritStones += gained;
  store.treasury.totalTreasurySpiritStones += gained;
  store.treasury.feeBreakdown.rechargeStones =
    (store.treasury.feeBreakdown.rechargeStones || 0) + gained;

  const receipt = recordSessionAction(
    store,
    "recharge_spirit_stones",
    `注入真元灵池！支付 ${amount} NEAR 兑换获赠 ${gained} 灵石，资金全额注入宗门国库！`,
    {
      near_spent: `${amount} NEAR`,
      stones_credited: gained,
      new_balance: store.cultivator.spiritStones,
    }
  );

  recordFinancialEntry(store.cultivator, {
    type: "RECHARGE",
    titleZh: `通宝仙庄 · 充值 ${amount} NEAR 购入 ${gained} 灵石`,
    titleEn: `Recharge ${amount} NEAR for ${gained} Stones`,
    nearDelta: -amount,
    stonesDelta: gained,
    txHash: receipt.txHash,
  });

  return {
    spiritStonesGained: gained,
    newBalance: store.cultivator.spiritStones,
    receipt,
  };
}

function buildBoardEntries(
  entriesRaw: Array<{
    daoName: string;
    subAccountId: string;
    isPlayer: boolean;
    score: number;
    metricLabel: string;
    avatarClass?: "saintess" | "sword" | "venerable" | "fox" | "demon";
  }>,
  boardPoolStones: number
): LeaderboardEntry[] {
  const sorted = [...entriesRaw].sort((a, b) => b.score - a.score);
  const count = sorted.length;
  let weights: number[];
  if (count <= 1) {
    weights = [1.0];
  } else if (count === 2) {
    weights = [0.65, 0.35];
  } else if (count === 3) {
    weights = [0.5, 0.3, 0.2];
  } else {
    weights = [0.5, 0.25, 0.15, 0.1];
  }

  return sorted.map((item, idx) => {
    const share = weights[idx] ?? 0;
    const rewardStones = Number((boardPoolStones * share).toFixed(2));
    const rewardNear = Number((rewardStones / 50).toFixed(2));
    return {
      rank: idx + 1,
      daoName: item.daoName,
      subAccountId: item.subAccountId,
      isPlayer: item.isPlayer,
      avatarClass: item.avatarClass || "saintess",
      score: item.score,
      metricLabel: item.metricLabel,
      sharePct: Math.round(share * 100),
      estimatedRewardStones: rewardStones,
      estimatedRewardNear: rewardNear,
      estimatedRewardUsd: Number(
        (rewardStones * SPIRIT_STONE_USD_RATE).toFixed(2)
      ),
    };
  });
}

function recalculateLeaderboards(store: InternalStore): void {
  const { cultivator, treasury } = store;
  const activePool = Number(
    (
      (treasury.totalTreasurySpiritStones * treasury.extractionRatioPct) /
      100
    ).toFixed(2)
  );
  treasury.activeWeeklyRewardPoolStones = activePool;
  treasury.activeDevOpsAllocationStones = Number(
    ((treasury.totalTreasurySpiritStones * treasury.devOpsRatioPct) / 100).toFixed(
      2
    )
  );

  // 30% Slayer Board, 20% Alchemy Board, 20% Blacksmith Board, 30% Duel Board
  const slayerPool = activePool * 0.3;
  const alchemyPool = activePool * 0.2;
  const blacksmithPool = activePool * 0.2;
  const duelPool = activePool * 0.3;

  // 动态汇集所有真实入道结契玩家（彻底移除静态霸榜假人 RIVAL_DAOISTS）
  const allAccountStores = globalForXianxia.__daoAscensionAccountMap
    ? Object.values(globalForXianxia.__daoAscensionAccountMap)
    : [store];

  const candidateCultivators: CultivatorNftAccount[] = [];
  const seenIds = new Set<string>();

  // 始终包含当前查看的道身
  candidateCultivators.push(cultivator);
  seenIds.add(cultivator.boundSubAccountId);

  // 汇总其他已结契真实玩家
  for (const acc of allAccountStores) {
    if (
      acc?.cultivator &&
      !seenIds.has(acc.cultivator.boundSubAccountId) &&
      acc.cultivator.isMinted
    ) {
      seenIds.add(acc.cultivator.boundSubAccountId);
      candidateCultivators.push(acc.cultivator);
    }
  }

  // 1. 诛魔天榜：看【云海试炼通关层数】 (highestFloorCleared)
  treasury.boards.slayerBoard = buildBoardEntries(
    candidateCultivators.map((c) => {
      const floors = c.highestFloorCleared || 0;
      c.scores.slayerScore = floors;
      return {
        daoName: c.daoName,
        subAccountId: c.boundSubAccountId,
        isPlayer: c.boundSubAccountId === cultivator.boundSubAccountId,
        avatarClass: c.avatarClass || "sword",
        score: floors,
        metricLabel: floors > 0 ? `第 ${floors} 层` : "0 层",
      };
    }),
    slayerPool
  );

  // 2. 百草药圣榜：看【种植收获灵草株数】 (herbsHarvestedCount)
  treasury.boards.alchemyBoard = buildBoardEntries(
    candidateCultivators.map((c) => {
      const harvested = c.herbsHarvestedCount || 0;
      c.scores.alchemyScore = harvested;
      return {
        daoName: c.daoName,
        subAccountId: c.boundSubAccountId,
        isPlayer: c.boundSubAccountId === cultivator.boundSubAccountId,
        avatarClass: c.avatarClass || "saintess",
        score: harvested,
        metricLabel: `收获 ${harvested} 株`,
      };
    }),
    alchemyPool
  );

  // 3. 神工天匠榜：看【道身综合战力】 (气血 + 攻击 * 4)
  treasury.boards.blacksmithBoard = buildBoardEntries(
    candidateCultivators.map((c) => {
      const totalPower = (c.maxHp || 160) + (c.atk || 36) * 4;
      c.scores.blacksmithScore = totalPower;
      return {
        daoName: c.daoName,
        subAccountId: c.boundSubAccountId,
        isPlayer: c.boundSubAccountId === cultivator.boundSubAccountId,
        avatarClass: c.avatarClass || "venerable",
        score: totalPower,
        metricLabel: `${totalPower} 战力`,
      };
    }),
    blacksmithPool
  );

  // 4. 问鼎论剑榜：看【论剑演武 ELO 积分】 (duelScore)
  treasury.boards.duelBoard = buildBoardEntries(
    candidateCultivators.map((c) => {
      const duelScore = c.scores.duelScore || 1000;
      return {
        daoName: c.daoName,
        subAccountId: c.boundSubAccountId,
        isPlayer: c.boundSubAccountId === cultivator.boundSubAccountId,
        avatarClass: c.avatarClass || "demon",
        score: duelScore,
        metricLabel: `${duelScore} 分`,
      };
    }),
    duelPool
  );
}

function recordSessionAction(
  store: InternalStore,
  methodName: string,
  summary: string,
  argsPreview: Record<string, unknown>
): SignedSessionActionReceipt {
  const receipt = signSessionActionReceipt({
    cultivatorSubAccountId: store.cultivator.boundSubAccountId,
    methodName,
    summary,
    argsPreview,
  });
  store.recentSessionReceipts.unshift(receipt);
  if (store.recentSessionReceipts.length > 18) {
    store.recentSessionReceipts.pop();
  }
  return receipt;
}

function checkRealmProgression(c: CultivatorNftAccount): string | undefined {
  let breakthroughMsg: string | undefined;
  while (c.exp >= c.maxExp) {
    c.exp -= c.maxExp;
    c.realmLevel += 1;
    c.baseHp += 25;
    c.baseAtk += 8;
    c.def += 3;

    if (c.realmLevel > 3) {
      c.realmLevel = 1;
      const stages: RealmStage[] = ["练气期", "筑基期", "结丹期", "元婴期"];
      const idx = stages.indexOf(c.realm);
      if (idx < stages.length - 1) {
        c.realm = stages[idx + 1];
        c.baseHp += 80;
        c.baseAtk += 24;
        c.def += 8;
        breakthroughMsg = `天降祥瑞！道身突破至【${c.realm}·一层】，基础气血与灵力大幅暴涨！`;
      }
    }
    c.maxExp = Math.round(c.maxExp * 1.35);
  }
  c.maxHp = c.baseHp + c.herbBonusHp;
  c.hp = c.maxHp;
  c.atk = c.baseAtk + c.weaponBonusAtk;
  return breakthroughMsg;
}

// ============================================================================
// 1. 灵田药园系统 (Spiritual Herb Garden -> +Max HP & Combat Healing Pills)
// ============================================================================

export function plantHerbInPlot(params: {
  plotId: number;
  seedTier: 1 | 2 | 3;
  accountId?: string;
}): {
  plot: GardenPlotState;
  receipt: SignedSessionActionReceipt;
  usedSeedFromBag: boolean;
} {
  const store = getStore(params.accountId);
  const { cultivator, treasury } = store;
  const plot = cultivator.gardenPlots.find((p) => p.plotId === params.plotId);
  if (!plot) {
    throw new Error(`灵田槽位 #${params.plotId} 不存在`);
  }
  if (plot.status !== "EMPTY") {
    throw new Error(`灵田 #${params.plotId + 1} 已有灵植生长中`);
  }

  const seedConfig = HERB_SEEDS_CATALOG.find((s) => s.tier === params.seedTier);
  if (!seedConfig) {
    throw new Error(`未找到 ${params.seedTier} 阶灵种配置`);
  }

  let usedSeedFromBag = false;
  if ((cultivator.inventory.seedBag[params.seedTier] || 0) > 0) {
    cultivator.inventory.seedBag[params.seedTier] -= 1;
    usedSeedFromBag = true;
  } else {
    if (cultivator.spiritStones < seedConfig.costSpiritStones) {
      throw new Error(
        `灵石不足（需 ${seedConfig.costSpiritStones} 灵石，当前 ${cultivator.spiritStones}）`
      );
    }
    cultivator.spiritStones -= seedConfig.costSpiritStones;
    treasury.totalTreasurySpiritStones += seedConfig.costSpiritStones;
    treasury.feeBreakdown.seedPurchasesStones += seedConfig.costSpiritStones;
  }

  const now = Date.now();
  plot.status = "GROWING";
  plot.seedTier = seedConfig.tier;
  plot.herbName = seedConfig.name;
  plot.pillName = seedConfig.pillName;
  plot.plantedAt = new Date(now).toISOString();
  plot.matureAtIso = new Date(now + seedConfig.growDurationSeconds * 1000).toISOString();
  plot.remainingGrowSeconds = seedConfig.growDurationSeconds;
  plot.wateredWithSpiritSpring = false;
  plot.potencyMultiplier = 1.0;
  plot.expectedMaxHpBonus = seedConfig.permMaxHpBonus;
  plot.expectedPillsYield = seedConfig.pillsYieldCount;

  recalculateLeaderboards(store);

  const receipt = recordSessionAction(
    store,
    "plant_spiritual_herb",
    `在灵田 #${plot.plotId + 1} 播下【${seedConfig.name}】（需凝练灵气 ${seedConfig.growDurationSeconds} 秒，${usedSeedFromBag ? "消耗储物袋灵种" : `${seedConfig.costSpiritStones} 灵石汇入宗门国库`}）`,
    {
      plot_id: plot.plotId,
      seed_tier: seedConfig.tier,
      herb_name: seedConfig.name,
      grow_duration_seconds: seedConfig.growDurationSeconds,
      fee_to_treasury: usedSeedFromBag ? 0 : seedConfig.costSpiritStones,
    }
  );

  store.elderCounsel = {
    ...store.elderCounsel,
    message: `善哉！道友在灵田 #${plot.plotId + 1} 种下了【${seedConfig.name}】。根据品阶需生长 ${seedConfig.growDurationSeconds} 秒，引九天灵泉浇灌可缩减半数成熟时日并提升药效！`,
    timestamp: new Date().toISOString(),
  };

  return { plot, receipt, usedSeedFromBag };
}

export function waterPlotWithSpiritSpring(
  plotId: number,
  accountId?: string
): {
  plot: GardenPlotState;
  receipt: SignedSessionActionReceipt;
} {
  const store = getStore(accountId);
  const plot = store.cultivator.gardenPlots.find((p) => p.plotId === plotId);
  if (!plot || plot.status === "EMPTY") {
    throw new Error(`灵田 #${plotId + 1} 尚未播种灵草`);
  }

  plot.wateredWithSpiritSpring = true;
  plot.potencyMultiplier = 1.25;
  const seedConfig = HERB_SEEDS_CATALOG.find((s) => s.tier === plot.seedTier)!;
  plot.expectedMaxHpBonus = Math.round(
    seedConfig.permMaxHpBonus * plot.potencyMultiplier
  );
  plot.expectedPillsYield = seedConfig.pillsYieldCount + 1;

  // 灵泉加速：剩余生长时间缩短 50%，若剩余不足 3 秒直接成熟
  if (plot.matureAtIso) {
    const now = Date.now();
    const matureMs = new Date(plot.matureAtIso).getTime();
    const remainingMs = Math.max(0, matureMs - now);
    const newRemainingMs = Math.floor(remainingMs * 0.5);
    plot.matureAtIso = new Date(now + newRemainingMs).toISOString();
    plot.remainingGrowSeconds = Math.ceil(newRemainingMs / 1000);
    if (newRemainingMs <= 3000) {
      plot.status = "READY";
      plot.remainingGrowSeconds = 0;
    }
  } else {
    plot.status = "READY";
    plot.remainingGrowSeconds = 0;
  }

  const receipt = recordSessionAction(
    store,
    "water_spirit_spring",
    `引九天灵泉浇灌灵田 #${plot.plotId + 1}，【${plot.herbName}】生长时间减半，药效提升至 +25%！`,
    {
      plot_id: plot.plotId,
      herb_name: plot.herbName,
      expected_hp_bonus: plot.expectedMaxHpBonus,
    }
  );

  return { plot, receipt };
}

export function harvestAndRefinePill(
  plotId: number,
  accountId?: string
): {
  hpGained: number;
  pillsGained: number;
  alchemyPointsGained: number;
  newMaxHp: number;
  receipt: SignedSessionActionReceipt;
} {
  const store = getStore(accountId);
  const { cultivator } = store;
  updatePlotsGrowthStatus(cultivator.gardenPlots);
  const plot = cultivator.gardenPlots.find((p) => p.plotId === plotId);
  if (!plot || plot.status === "EMPTY") {
    throw new Error(`灵田 #${plotId + 1} 无可采摘的灵草`);
  }

  if (plot.status === "GROWING") {
    const remain = plot.remainingGrowSeconds || 1;
    throw new Error(
      `【${plot.herbName || "灵草"}】尚未成熟（还需凝练灵气 ${remain} 秒），请稍候或引灵泉浇灌加速！`
    );
  }

  const seedConfig = HERB_SEEDS_CATALOG.find((s) => s.tier === plot.seedTier)!;
  const hpGained =
    plot.expectedMaxHpBonus || seedConfig.permMaxHpBonus;
  const pillsGained =
    plot.expectedPillsYield || seedConfig.pillsYieldCount;
  const alchemyPointsGained = Math.round(
    seedConfig.alchemyScorePoints * (plot.wateredWithSpiritSpring ? 1.25 : 1.0)
  );

  // Permanently boost Cultivator's Max HP & refill current HP
  cultivator.herbBonusHp += hpGained;
  cultivator.maxHp = cultivator.baseHp + cultivator.herbBonusHp;
  cultivator.hp = cultivator.maxHp;

  // Add combat healing pills to storage bag
  cultivator.inventory.healingPills += pillsGained;
  cultivator.inventory.pillHealPower = Math.max(
    cultivator.inventory.pillHealPower,
    seedConfig.pillHealAmount
  );

  // Update Alchemy Leaderboard Score (种植收获总株数)
  cultivator.herbsHarvestedCount = (cultivator.herbsHarvestedCount || 0) + 1;
  cultivator.scores.alchemyScore = cultivator.herbsHarvestedCount;

  const harvestedHerbName = plot.herbName || seedConfig.name;
  const refinedPillName = plot.pillName || seedConfig.pillName;

  // Reset plot to EMPTY
  plot.status = "EMPTY";
  plot.seedTier = undefined;
  plot.herbName = undefined;
  plot.pillName = undefined;
  plot.plantedAt = undefined;
  plot.matureAtIso = undefined;
  plot.remainingGrowSeconds = undefined;
  plot.wateredWithSpiritSpring = false;
  plot.potencyMultiplier = 1.0;
  plot.expectedMaxHpBonus = 0;
  plot.expectedPillsYield = 0;

  recalculateLeaderboards(store);

  const receipt = recordSessionAction(
    store,
    "harvest_and_refine_pill",
    `采摘【${harvestedHerbName}】入炉炼化为【${refinedPillName}】，道身气血上限永久 +${hpGained} HP（当前 ${cultivator.maxHp} HP），获战斗回血丹 +${pillsGained} 枚，百草榜积分 +${alchemyPointsGained}`,
    {
      plot_id: plotId,
      herb: harvestedHerbName,
      pill: refinedPillName,
      hp_bonus: hpGained,
      new_max_hp: cultivator.maxHp,
      alchemy_score_total: cultivator.scores.alchemyScore,
    }
  );

  store.elderCounsel = {
    ...store.elderCounsel,
    message: `丹香四溢！道友将【${harvestedHerbName}】炼化为【${refinedPillName}】，经脉气血暴涨 +${hpGained} HP（总气血达 ${cultivator.maxHp}），百草药圣榜排名随之攀升！`,
    timestamp: new Date().toISOString(),
  };

  return {
    hpGained,
    pillsGained,
    alchemyPointsGained,
    newMaxHp: cultivator.maxHp,
    receipt,
  };
}

// ============================================================================
// 2. 天工炼器系统 (Artifact Forging -> +ATK & Blacksmith Leaderboard)
// ============================================================================

const AFFIX_POOL: Array<{
  rarity: ArtifactRarity;
  multiplier: number;
  affixTitle: string;
  inscription: string;
}> = [
  {
    rarity: "传世仙器",
    multiplier: 1.65,
    affixTitle: "太古仙罡 · 破界",
    inscription: "『一剑霜寒十四州，太虚紫气绕剑身』——玄机长老亲题仙品铭文",
  },
  {
    rarity: "极品道器",
    multiplier: 1.35,
    affixTitle: "玄黄道韵 · 镇岳",
    inscription: "『玄黄引动八荒变，神兵出匣震妖邪』——天工真传绝品铭印",
  },
  {
    rarity: "上品灵宝",
    multiplier: 1.18,
    affixTitle: "离火真罡 · 贯日",
    inscription: "『玄铁融星火，锋芒斩妖氛』——天工阁上品灵宝印记",
  },
  {
    rarity: "凡品灵兵",
    multiplier: 1.0,
    affixTitle: "百炼精钢 · 疾风",
    inscription: "『千锤百炼出深山，锋刃初成試鬼神』——内门制式灵兵",
  },
];

export function forgeImmortalArtifact(
  blueprintId: string,
  accountId?: string
): {
  artifact: ForgedArtifact;
  autoEquipped: boolean;
  receipt: SignedSessionActionReceipt;
} {
  const store = getStore(accountId);
  const { cultivator, treasury } = store;
  const bp = FORGE_BLUEPRINTS_CATALOG.find((b) => b.id === blueprintId);
  if (!bp) {
    throw new Error(`未找到炼器图纸: ${blueprintId}`);
  }

  if (cultivator.inventory.ironOres < bp.ironOreCost) {
    throw new Error(
      `玄铁矿不足（需 ${bp.ironOreCost} 块，当前 ${cultivator.inventory.ironOres} 块）`
    );
  }
  if (cultivator.inventory.meteorOres < bp.meteorOreCost) {
    throw new Error(
      `天外陨铁不足（需 ${bp.meteorOreCost} 块，当前 ${cultivator.inventory.meteorOres} 块）`
    );
  }
  if (cultivator.spiritStones < bp.spiritStoneFee) {
    throw new Error(
      `灵石不足支付天工地火费（需 ${bp.spiritStoneFee} 灵石，当前 ${cultivator.spiritStones}）`
    );
  }

  // Deduct materials & route 100% of Spirit Stone fee to Sect Treasury
  cultivator.inventory.ironOres -= bp.ironOreCost;
  cultivator.inventory.meteorOres -= bp.meteorOreCost;
  cultivator.spiritStones -= bp.spiritStoneFee;

  treasury.totalTreasurySpiritStones += bp.spiritStoneFee;
  treasury.feeBreakdown.forgingFeesStones += bp.spiritStoneFee;

  // 纯随机品质机缘抽取 (凡品灵兵 45%, 上品灵宝 35%, 极品道器 15%, 传世仙器 5%)
  const roll = Math.random() * 100;
  let pickedAffix: (typeof AFFIX_POOL)[number];
  if (roll < 45) {
    pickedAffix = AFFIX_POOL[3]; // 凡品灵兵
  } else if (roll < 80) {
    pickedAffix = AFFIX_POOL[2]; // 上品灵宝
  } else if (roll < 95) {
    pickedAffix = AFFIX_POOL[1]; // 极品道器
  } else {
    pickedAffix = AFFIX_POOL[0]; // 传世仙器
  }

  // 基础攻击在 [bp.baseAtkMin, bp.baseAtkMax] 区间纯随机摇点
  const randomBaseAtk = Math.round(
    bp.baseAtkMin + Math.random() * (bp.baseAtkMax - bp.baseAtkMin)
  );
  const atkBonus = Math.round(randomBaseAtk * pickedAffix.multiplier);
  const defBonus = Math.round(bp.baseDefBonus * pickedAffix.multiplier);
  const critRatePct = Math.round(bp.baseCritPct * pickedAffix.multiplier);
  const forgeScore = Math.round(bp.baseForgeScore * pickedAffix.multiplier);

  const artifactId = `artifact-${crypto.randomBytes(3).toString("hex")}`;
  const receipt = recordSessionAction(
    store,
    "forge_immortal_artifact",
    `天工开物·纯随机天命机缘！熔炼【${bp.name}】出炉【${pickedAffix.rarity} · ${pickedAffix.affixTitle}】，攻击力 +${atkBonus} ATK，地火炼器费 ${bp.spiritStoneFee} 灵石注入宗门国库`,
    {
      artifact_id: artifactId,
      blueprint: bp.name,
      rarity: pickedAffix.rarity,
      atk_bonus: atkBonus,
      fee_to_treasury: bp.spiritStoneFee,
    }
  );

  const forged: ForgedArtifact = {
    id: artifactId,
    blueprintId: bp.id,
    name: bp.name,
    rarity: pickedAffix.rarity,
    atkBonus,
    defBonus,
    critRatePct,
    forgeScore,
    affixTitle: pickedAffix.affixTitle,
    elderInscription: pickedAffix.inscription,
    forgedAt: new Date().toISOString(),
    txHash: receipt.txHash,
  };

  cultivator.inventory.artifacts.unshift(forged);

  // Auto-equip if stronger than current equipped weapon
  let autoEquipped = false;
  if (
    !cultivator.equippedArtifact ||
    forged.atkBonus >= cultivator.equippedArtifact.atkBonus
  ) {
    cultivator.equippedArtifact = forged;
    cultivator.weaponBonusAtk = forged.atkBonus;
    cultivator.atk = cultivator.baseAtk + cultivator.weaponBonusAtk;
    cultivator.critRatePct = 10 + forged.critRatePct;
    autoEquipped = true;
  }

  cultivator.scores.blacksmithScore = cultivator.maxHp + cultivator.atk * 4;
  recalculateLeaderboards(store);

  store.elderCounsel = {
    ...store.elderCounsel,
    message: `宝剑出匣，紫气冲霄！道友纯凭天命机缘锻造出【${forged.rarity}·${forged.name}】（+${forged.atkBonus} ATK），老夫已为其铭刻灵纹，神工天匠榜积分暴涨 +${forgeScore}！`,
    timestamp: new Date().toISOString(),
  };

  return { artifact: forged, autoEquipped, receipt };
}

export function equipArtifactToCultivator(
  artifactId: string,
  accountId?: string
): {
  equipped: ForgedArtifact;
  newTotalAtk: number;
  receipt: SignedSessionActionReceipt;
} {
  const store = getStore(accountId);
  const { cultivator } = store;
  const target = cultivator.inventory.artifacts.find((a) => a.id === artifactId);
  if (!target) {
    throw new Error(`储物袋中未找到法宝 ${artifactId}`);
  }

  cultivator.equippedArtifact = target;
  cultivator.weaponBonusAtk = target.atkBonus;
  cultivator.atk = cultivator.baseAtk + cultivator.weaponBonusAtk;
  cultivator.critRatePct = 10 + target.critRatePct;
  cultivator.scores.blacksmithScore = cultivator.maxHp + cultivator.atk * 4;

  recalculateLeaderboards(store);

  const receipt = recordSessionAction(
    store,
    "equip_artifact_to_cultivator",
    `道身佩剑【${target.name} (${target.rarity})】，总攻击力跃升至 ${cultivator.atk} ATK`,
    {
      artifact_id: target.id,
      atk_total: cultivator.atk,
    }
  );

  return {
    equipped: target,
    newTotalAtk: cultivator.atk,
    receipt,
  };
}

// ============================================================================
// 3. 秘境伏魔战斗系统 (Secret Realm Combat -> Tests HP & ATK, Auto-Pills, Drops)
// ============================================================================

export function challengeSecretRealmFloor(
  floorNumber: number,
  accountId?: string
): {
  report: CombatBattleReport;
  receipt: SignedSessionActionReceipt;
} {
  const store = getStore(accountId);
  const { cultivator, treasury } = store;
  const floorCfg = getSecretRealmFloorConfig(floorNumber);
  if (!floorCfg) {
    throw new Error(`秘境第 ${floorNumber} 层尚未开启`);
  }

  if (cultivator.spiritStones < floorCfg.entryFeeStones) {
    throw new Error(
      `秘境破阵符费用不足（需 ${floorCfg.entryFeeStones} 灵石，当前 ${cultivator.spiritStones}）`
    );
  }

  // Pay entry fee into Sect Treasury
  cultivator.spiritStones -= floorCfg.entryFeeStones;
  treasury.totalTreasurySpiritStones += floorCfg.entryFeeStones;
  treasury.feeBreakdown.realmEntryFeesStones += floorCfg.entryFeeStones;

  // Start battle with full Max HP
  cultivator.hp = cultivator.maxHp;
  let playerHp = cultivator.hp;
  let monsterHp = floorCfg.monsterHp;
  let pillsConsumed = 0;
  const logs: CombatTurnLog[] = [];

  for (let turn = 1; turn <= 12; turn++) {
    // 1. Cultivator strikes monster
    const isCrit = turn % 2 === 1 && cultivator.critRatePct >= 15;
    const rawDmg = Math.max(18, cultivator.atk - floorCfg.monsterDef);
    const dmgToMonster = isCrit ? Math.round(rawDmg * 1.55) : rawDmg;
    monsterHp = Math.max(0, monsterHp - dmgToMonster);

    const weaponLabel = cultivator.equippedArtifact
      ? `祭出【${cultivator.equippedArtifact.name}】`
      : "催动太虚剑气";

    logs.push({
      turn,
      actor: "CULTIVATOR",
      actionText: `${cultivator.daoName}${weaponLabel}${isCrit ? "触发【破界暴击】" : ""}斩向${floorCfg.monsterName}，造成 ${dmgToMonster} 点伤害！`,
      damageDealt: dmgToMonster,
      isCrit,
      cultivatorHpAfter: playerHp,
      monsterHpAfter: monsterHp,
    });

    if (monsterHp <= 0) {
      break;
    }

    // 2. Monster counter-attacks
    const monsterDmg = Math.max(
      12,
      floorCfg.monsterAtk -
        (cultivator.def + (cultivator.equippedArtifact?.defBonus || 0))
    );
    playerHp = Math.max(0, playerHp - monsterDmg);

    logs.push({
      turn,
      actor: "MONSTER",
      actionText: `${floorCfg.monsterName}凶威狂发反扑，震伤道身气血 -${monsterDmg} HP！`,
      damageDealt: monsterDmg,
      cultivatorHpAfter: playerHp,
      monsterHpAfter: monsterHp,
    });

    // 3. Auto-consume Alchemy Pill if HP < 55% of Max HP (Farming -> Combat loop!)
    if (
      playerHp > 0 &&
      playerHp < cultivator.maxHp * 0.55 &&
      cultivator.inventory.healingPills > 0
    ) {
      cultivator.inventory.healingPills -= 1;
      pillsConsumed += 1;
      const healVal = Math.min(
        cultivator.maxHp - playerHp,
        cultivator.inventory.pillHealPower
      );
      playerHp += healVal;

      logs.push({
        turn,
        actor: "PILL_RECOVERY",
        actionText: `道身气血震荡，自动吞服灵田炼制的【灵丹】，瞬间恢复 +${healVal} HP 气血！`,
        hpRestored: healVal,
        cultivatorHpAfter: playerHp,
        monsterHpAfter: monsterHp,
      });
    }

    if (playerHp <= 0) {
      break;
    }
  }

  const victory = monsterHp <= 0;
  let rewards: CombatBattleReport["rewards"] | undefined;

  if (victory) {
    cultivator.exp += floorCfg.rewardExp;
    cultivator.inventory.ironOres += floorCfg.dropIronOres;
    cultivator.inventory.meteorOres += floorCfg.dropMeteorOres;
    cultivator.inventory.seedBag[floorCfg.dropSeedTier] =
      (cultivator.inventory.seedBag[floorCfg.dropSeedTier] || 0) + 1;
    cultivator.highestFloorCleared = Math.max(
      cultivator.highestFloorCleared,
      floorCfg.floor
    );
    cultivator.scores.slayerScore = cultivator.highestFloorCleared;

    const realmBreakthrough = checkRealmProgression(cultivator);

    rewards = {
      spiritStones: 0, // PVE 试炼不掉落大量灵石，保护 Web3 代币经济
      exp: floorCfg.rewardExp,
      ironOres: floorCfg.dropIronOres,
      meteorOres: floorCfg.dropMeteorOres,
      seedTier: floorCfg.dropSeedTier,
      slayerPoints: floorCfg.slayerScorePoints,
      realmBreakthrough,
    };
  } else {
    // Restore to 50% HP back at cave abode after defeat
    cultivator.hp = Math.round(cultivator.maxHp * 0.5);
  }

  recalculateLeaderboards(store);

  const battleId = `realm-battle-${crypto.randomBytes(3).toString("hex")}`;
  const receipt = recordSessionAction(
    store,
    "challenge_secret_realm",
    victory
      ? `镇魔塔第 ${floorCfg.floor} 重讨伐【${floorCfg.monsterName}】大获全胜！掉落玄铁 +${floorCfg.dropIronOres}${floorCfg.dropMeteorOres > 0 ? `、陨铁 +${floorCfg.dropMeteorOres}` : ""}、${floorCfg.dropSeedTier}阶仙种×1，诛魔天榜积分 +${floorCfg.slayerScorePoints}`
      : `秘境第 ${floorCfg.floor} 重激战【${floorCfg.monsterName}】惜败，请前往灵田炼丹提升气血或去天工阁锻剑后再战！`,
    {
      battle_id: battleId,
      floor: floorCfg.floor,
      monster: floorCfg.monsterName,
      victory,
      pills_consumed: pillsConsumed,
      slayer_score_total: cultivator.scores.slayerScore,
    }
  );

  const report: CombatBattleReport = {
    battleId,
    floor: floorCfg.floor,
    monsterName: floorCfg.monsterName,
    victory,
    turnsTaken: logs[logs.length - 1]?.turn || 1,
    pillsConsumed,
    logs,
    rewards,
    txHash: receipt.txHash,
    timestamp: new Date().toISOString(),
  };

  store.latestBattleReport = report;
  store.elderCounsel = {
    ...store.elderCounsel,
    message: victory
      ? `壮哉！道友仗剑斩杀第 ${floorCfg.floor} 重【${floorCfg.monsterName}】${pillsConsumed > 0 ? `（期间灵丹护体回血 ${pillsConsumed} 次）` : ""}，诛魔天榜名次再进一竿！${cultivator.highestFloorCleared >= 10 ? "九幽魔尊暗纹结契解锁！" : cultivator.highestFloorCleared >= 5 ? "青丘狐妖少女灵魄破封解锁！" : ""}`
      : `道友莫馁！【${floorCfg.monsterName}】凶悍，不妨先回洞府灵田服丹增加气血上限，或锻造更高阶仙剑后再来斩妖！`,
    timestamp: new Date().toISOString(),
  };

  return { report, receipt };
}

// ============================================================================
// 3.5 仙门论剑台 PVP 系统 (Daoist PVP Arena Duel -> ELO & Duel Board)
// ============================================================================

export function generatePvpOpponents(
  cultivator: CultivatorNftAccount
): PvpDuelOpponent[] {
  const pvpScore = cultivator.scores.duelScore || 1000;
  return [
    {
      id: "pvp-easy-lingjian",
      subAccountId: "lingjian.daoascension.testnet",
      daoName: "药王谷·灵芝童子",
      title: "草木通玄 · 药王外门",
      avatarClass: "saintess",
      difficulty: "EASY",
      difficultyLabelZh: "同门切磋 (易)",
      difficultyLabelEn: "Disciple Spar (Easy)",
      hp: Math.max(120, Math.round(cultivator.maxHp * 0.82)),
      atk: Math.max(24, Math.round(cultivator.atk * 0.82)),
      def: 8,
      critRatePct: 8,
      equippedArtifactName: "青竹蜂云剑",
      artifactRarity: "凡品灵兵",
      duelScore: Math.max(800, pvpScore - 45),
      rewardSpiritStones: 0,
      rewardDuelPoints: 18,
      winChanceEstimatePct: 78,
    },
    {
      id: "pvp-medium-chiyan",
      subAccountId: "chiyan.daoascension.testnet",
      daoName: "天工阁·赤炎子",
      title: "地火铸兵 · 天工真传",
      avatarClass: "sword",
      difficulty: "MEDIUM",
      difficultyLabelZh: "势均力敌 (中)",
      difficultyLabelEn: "Even Match (Medium)",
      hp: Math.max(180, Math.round(cultivator.maxHp * 1.05)),
      atk: Math.max(35, Math.round(cultivator.atk * 1.0)),
      def: 14,
      critRatePct: 15,
      equippedArtifactName: "紫金混元印",
      artifactRarity: "极品道器",
      duelScore: pvpScore + 20,
      rewardSpiritStones: 0,
      rewardDuelPoints: 28,
      winChanceEstimatePct: 52,
    },
    {
      id: "pvp-hard-lingxiao",
      subAccountId: "lingxiao.daoascension.testnet",
      daoName: "凌霄剑宗·凌霄剑尊",
      title: "御剑九霄 · 宗门剑魁",
      avatarClass: "demon",
      difficulty: "HARD",
      difficultyLabelZh: "问鼎宿敌 (难)",
      difficultyLabelEn: "Apex Rival (Hard)",
      hp: Math.max(260, Math.round(cultivator.maxHp * 1.25)),
      atk: Math.max(48, Math.round(cultivator.atk * 1.2)),
      def: 20,
      critRatePct: 22,
      equippedArtifactName: "太虚焚天仙剑",
      artifactRarity: "传世仙器",
      duelScore: pvpScore + 85,
      rewardSpiritStones: 0,
      rewardDuelPoints: 42,
      winChanceEstimatePct: 32,
    },
  ];
}

export function challengePvpDuel(params: {
  opponentId: string;
  accountId?: string;
}): {
  report: PvpDuelReport;
  receipt: SignedSessionActionReceipt;
} {
  const store = getStore(params.accountId);
  const { cultivator } = store;

  const opponents = generatePvpOpponents(cultivator);
  const opponent =
    opponents.find((o) => o.id === params.opponentId) || opponents[1];

  cultivator.hp = cultivator.maxHp;
  let playerHp = cultivator.hp;
  let opponentHp = opponent.hp;
  let pillsConsumed = 0;
  const logs: PvpTurnLog[] = [];

  const maxTurns = 12;
  let winner: "PLAYER" | "OPPONENT" = "PLAYER";

  for (let turn = 1; turn <= maxTurns; turn++) {
    // 1. Cultivator attacks Opponent
    const isCritPlayer = Math.random() * 100 < cultivator.critRatePct;
    const rawDmg = Math.max(12, cultivator.atk - opponent.def);
    const variance = 0.9 + Math.random() * 0.25;
    const finalPlayerDmg = Math.round(
      rawDmg * (isCritPlayer ? 1.55 : 1.0) * variance
    );
    opponentHp = Math.max(0, opponentHp - finalPlayerDmg);

    const weaponTxt = cultivator.equippedArtifact
      ? `祭出【${cultivator.equippedArtifact.name}】`
      : "催动太虚剑指";

    logs.push({
      turn,
      attackerName: cultivator.daoName,
      defenderName: opponent.daoName,
      actionText: isCritPlayer
        ? `${cultivator.daoName}${weaponTxt}，引动紫府真气【暴击破防】，造成 ${finalPlayerDmg} 点穿透伤害！`
        : `${cultivator.daoName}${weaponTxt}激射剑芒，造成 ${finalPlayerDmg} 点伤害。`,
      damageDealt: finalPlayerDmg,
      isCrit: isCritPlayer,
      attackerHpAfter: playerHp,
      defenderHpAfter: opponentHp,
    });

    if (opponentHp <= 0) {
      winner = "PLAYER";
      break;
    }

    // 2. Opponent attacks Cultivator
    const isCritOpp = Math.random() * 100 < opponent.critRatePct;
    const rawOppDmg = Math.max(10, opponent.atk - cultivator.def);
    const oppVariance = 0.9 + Math.random() * 0.2;
    const finalOppDmg = Math.round(
      rawOppDmg * (isCritOpp ? 1.5 : 1.0) * oppVariance
    );
    playerHp = Math.max(0, playerHp - finalOppDmg);

    logs.push({
      turn,
      attackerName: opponent.daoName,
      defenderName: cultivator.daoName,
      actionText: isCritOpp
        ? `${opponent.daoName}祭出【${opponent.equippedArtifactName}】猛烈反击，【暴击破罡】造成 ${finalOppDmg} 点伤害！`
        : `${opponent.daoName}祭出【${opponent.equippedArtifactName}】回敬一道剑气，造成 ${finalOppDmg} 点伤害。`,
      damageDealt: finalOppDmg,
      isCrit: isCritOpp,
      attackerHpAfter: opponentHp,
      defenderHpAfter: playerHp,
    });

    if (playerHp <= 0) {
      if (
        cultivator.inventory.healingPills > 0 &&
        pillsConsumed < 2
      ) {
        cultivator.inventory.healingPills -= 1;
        pillsConsumed += 1;
        const healAmt = cultivator.inventory.pillHealPower || 110;
        playerHp = Math.min(cultivator.maxHp, playerHp + healAmt);
        logs.push({
          turn,
          attackerName: cultivator.daoName,
          defenderName: cultivator.daoName,
          actionText: `${cultivator.daoName}于危急关头捏碎【回春丹】，气血翻涌恢复 +${healAmt} HP！`,
          hpRestored: healAmt,
          attackerHpAfter: opponentHp,
          defenderHpAfter: playerHp,
        });
      } else {
        winner = "OPPONENT";
        break;
      }
    }
  }

  if (playerHp > 0 && opponentHp > 0) {
    const playerRatio = playerHp / cultivator.maxHp;
    const oppRatio = opponentHp / opponent.hp;
    winner = playerRatio >= oppRatio ? "PLAYER" : "OPPONENT";
  }

  const isVictory = winner === "PLAYER";
  let duelDelta = 0;
  let rewardStones = 0;
  let rewardOres = 0;

  if (isVictory) {
    duelDelta = opponent.rewardDuelPoints;
    rewardStones = 0; // PVP 演武不直接发放大量灵石，胜负积分累积至周天榜参与国库分润
    rewardOres = opponent.difficulty === "HARD" ? 2 : 1;
    cultivator.scores.duelScore = (cultivator.scores.duelScore || 1000) + duelDelta;
    cultivator.scores.duelWins = (cultivator.scores.duelWins || 0) + 1;
    cultivator.inventory.ironOres += rewardOres;
  } else {
    duelDelta = opponent.difficulty === "EASY" ? -12 : -8;
    cultivator.scores.duelScore = Math.max(100, (cultivator.scores.duelScore || 1000) + duelDelta);
    cultivator.scores.duelLosses = (cultivator.scores.duelLosses || 0) + 1;
  }

  cultivator.hp = playerHp;

  recalculateLeaderboards(store);

  const duelId = `duel-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
  const report: PvpDuelReport = {
    duelId,
    opponent,
    victory: isVictory,
    turnsTaken: logs[logs.length - 1]?.turn || 1,
    pillsConsumed,
    logs,
    rewards: {
      spiritStones: rewardStones,
      duelPointsDelta: duelDelta,
      newDuelScore: cultivator.scores.duelScore,
      ironOres: rewardOres,
    },
    txHash: `0x${crypto.randomBytes(20).toString("hex")}`,
    timestamp: new Date().toISOString(),
  };

  store.latestPvpReport = report;

  const receipt = recordSessionAction(
    store,
    "challenge_pvp_duel",
    `仙门论剑演武：${cultivator.daoName} 切磋 ${opponent.daoName}，结果【${isVictory ? "大获全胜" : "稍逊一筹"}】！论剑积分 ${duelDelta >= 0 ? `+${duelDelta}` : duelDelta}，当前积分 ${cultivator.scores.duelScore}`,
    {
      duel_id: duelId,
      opponent: opponent.daoName,
      victory: isVictory,
      score_delta: duelDelta,
      new_score: cultivator.scores.duelScore,
    }
  );

  return { report, receipt };
}

// ============================================================================
// 4. 宗门国库提取固定比例到四大周天榜 & NEAR Intents 跨链发奖
// ============================================================================

export async function settleWeeklyHeavenLeaderboards(params?: {
  destinationChain?: string;
  destinationSymbol?: string;
  recipientAddress?: string;
  autoClaimToWallet?: boolean;
  forceSettle?: boolean;
  accountId?: string;
}): Promise<{
  settlement: WeeklySettlementRecord;
  receipt: SignedSessionActionReceipt;
  mail: CelestialMailItem;
}> {
  const store = getStore(params?.accountId);
  const { cultivator, treasury } = store;

  const now = Date.now();
  const targetMs = new Date(treasury.nextWeeklySettlementUtc8).getTime();

  // 1. 严格时点校验：非强制调试模式下，未到东八区周日 24:00 (UTC+8) 禁止提前结算
  if (!params?.forceSettle && now < targetMs) {
    throw new Error(
      `天道定时律令：本周结算时辰未到（东八区每周日 24:00），国库不可提前清算发放！`
    );
  }

  // 2. 防频繁重复结算：每个周天期（Epoch）只能清算一次；若 1 小时内刚清算过且非强制测试，拦截
  if (
    !params?.forceSettle &&
    treasury.settlementHistory.length > 0 &&
    now - new Date(treasury.settlementHistory[0].settledAt).getTime() < 3600_000
  ) {
    throw new Error(
      `本期周天榜方才完成结算，天阙传谕已送达信箱，切勿频繁重复清算！`
    );
  }

  recalculateLeaderboards(store);

  const totalTreasuryBefore = treasury.totalTreasurySpiritStones;
  const extractedRewardPoolStones = Number(
    ((totalTreasuryBefore * treasury.extractionRatioPct) / 100).toFixed(2)
  );
  const devOpsAllocatedStones = Number(
    ((totalTreasuryBefore * treasury.devOpsRatioPct) / 100).toFixed(2)
  );
  const devOpsAllocatedUsd = Number(
    (devOpsAllocatedStones * SPIRIT_STONE_USD_RATE).toFixed(2)
  );
  const treasuryReserveRemaining = Number(
    (
      totalTreasuryBefore -
      extractedRewardPoolStones -
      devOpsAllocatedStones
    ).toFixed(2)
  );

  treasury.cumulativeDevOpsRevenueStones = Number(
    (treasury.cumulativeDevOpsRevenueStones + devOpsAllocatedStones).toFixed(2)
  );
  treasury.cumulativeDevOpsRevenueUsd = Number(
    (treasury.cumulativeDevOpsRevenueUsd + devOpsAllocatedUsd).toFixed(2)
  );

  // 四大天榜分润：诛魔 30%、百草 20%、神工 20%、论剑 30%
  const slayerPoolStones = Number((extractedRewardPoolStones * 0.3).toFixed(2));
  const alchemyPoolStones = Number((extractedRewardPoolStones * 0.2).toFixed(2));
  const blacksmithPoolStones = Number((extractedRewardPoolStones * 0.2).toFixed(2));
  const duelPoolStones = Number((extractedRewardPoolStones * 0.3).toFixed(2));

  const playerSlayerEntry = treasury.boards.slayerBoard.find((e) => e.isPlayer)!;
  const playerAlchemyEntry = treasury.boards.alchemyBoard.find(
    (e) => e.isPlayer
  )!;
  const playerBlacksmithEntry = treasury.boards.blacksmithBoard.find(
    (e) => e.isPlayer
  )!;
  const playerDuelEntry = treasury.boards.duelBoard.find(
    (e) => e.isPlayer
  )!;

  const slayerRewardStones = playerSlayerEntry?.estimatedRewardStones ?? 0;
  const alchemyRewardStones = playerAlchemyEntry?.estimatedRewardStones ?? 0;
  const blacksmithRewardStones = playerBlacksmithEntry?.estimatedRewardStones ?? 0;
  const duelRewardStones = playerDuelEntry?.estimatedRewardStones ?? 0;

  const totalPlayerRewardStones = Number(
    (
      slayerRewardStones +
      alchemyRewardStones +
      blacksmithRewardStones +
      duelRewardStones
    ).toFixed(2)
  );
  const totalPlayerRewardNear = Number((totalPlayerRewardStones / 50).toFixed(2));
  const totalPlayerRewardUsd = Number(
    Math.max(1.5, totalPlayerRewardStones * SPIRIT_STONE_USD_RATE).toFixed(2)
  );

  // Deduct extracted pool from Sect Treasury
  treasury.totalTreasurySpiritStones = treasuryReserveRemaining;

  const shouldAutoClaim = params?.autoClaimToWallet ?? false;
  if (shouldAutoClaim) {
    cultivator.spiritStones = Number(
      (cultivator.spiritStones + totalPlayerRewardStones).toFixed(2)
    );
    if (totalPlayerRewardNear > 0) {
      recordFinancialEntry(cultivator, {
        type: "WEEKLY_DIVIDEND",
        titleZh: `第 ${treasury.currentEpoch} 周四大天榜周俸分润 (+${totalPlayerRewardNear} NEAR)`,
        titleEn: `Weekly Dividend Epoch ${treasury.currentEpoch} (+${totalPlayerRewardNear} NEAR)`,
        nearDelta: totalPlayerRewardNear,
        stonesDelta: totalPlayerRewardStones,
      });
    }
  }

  const destChain = params?.destinationChain || "sol";
  const destSymbol = params?.destinationSymbol || "USDC";
  const recipient =
    params?.recipientAddress ||
    (destChain === "near"
      ? cultivator.boundSubAccountId
      : "7V9C2XU7B3X9zV8kL2mN4pQ6rS8tU1vW3xY5zA7bC9dE");

  const settlementId = `epoch-${treasury.currentEpoch}-${crypto.randomBytes(2).toString("hex")}`;

  const crossChainPayoutQuote = await requestCrossChainIntentQuote({
    amountUsd: totalPlayerRewardUsd,
    destinationChain: destChain,
    destinationSymbol: destSymbol,
    recipientAddress: recipient,
    taskOrInvoiceId: settlementId,
  });

  const settlement: WeeklySettlementRecord = {
    settlementId,
    epochNumber: treasury.currentEpoch,
    settledAt: new Date().toISOString(),
    totalTreasuryBefore,
    extractedRewardPoolStones,
    devOpsAllocatedStones,
    devOpsAllocatedUsd,
    treasuryReserveRemaining,
    boardPools: {
      slayerPoolStones,
      alchemyPoolStones,
      blacksmithPoolStones,
      duelPoolStones,
    },
    playerRewards: {
      slayerRewardStones,
      alchemyRewardStones,
      blacksmithRewardStones,
      duelRewardStones,
      totalPlayerRewardStones,
      totalPlayerRewardUsd,
    },
    crossChainPayoutQuote,
  };

  treasury.settlementHistory.unshift(settlement);
  treasury.currentEpoch += 1;
  // 推进下一次东八区周日 24:00 时间戳，防止同一周再次结算
  const nextTarget = calculateNextSundayMidnightUtc8(new Date(now + 60_000));
  treasury.nextWeeklySettlementUtc8 = nextTarget.nextSettlementIsoUtc;

  recalculateLeaderboards(store);

  const receipt = recordSessionAction(
    store,
    "settle_weekly_heaven_board",
    `第 ${settlement.epochNumber} 周宗门天榜结算！国库提取 50% (${extractedRewardPoolStones} 灵石 ≈ ${(extractedRewardPoolStones / 50).toFixed(2)} NEAR) 分润至四大天榜，${cultivator.daoName} 共斩获 +${totalPlayerRewardNear} NEAR (${totalPlayerRewardStones} 灵石 / $${totalPlayerRewardUsd})，天阙传谕法旨与 NEAR Intents 跨链承兑凭证已下达至信箱`,
    {
      settlement_id: settlementId,
      extracted_pool_stones: extractedRewardPoolStones,
      extracted_pool_near: Number((extractedRewardPoolStones / 50).toFixed(2)),
      player_total_stones: totalPlayerRewardStones,
      player_total_near: totalPlayerRewardNear,
      intents_dest: `${crossChainPayoutQuote.amountOutFormatted} (${crossChainPayoutQuote.destinationChain})`,
      nep413_hash: crossChainPayoutQuote.nep413SignedIntent.intentHash,
    }
  );

  // 下发【天阙传谕】周结算法旨邮件
  const mailId = `mail-epoch-${settlement.epochNumber}-${crypto.randomBytes(3).toString("hex")}`;
  const extractedPoolNear = Number((extractedRewardPoolStones / 50).toFixed(2));
  const settlementMail: CelestialMailItem = {
    id: mailId,
    title: `【天阙传谕】第 ${settlement.epochNumber} 周四大天榜周俸结算法旨`,
    sender: "九天玄机阁 · 国库执事长老",
    category: "SETTLEMENT",
    content: `奉太虚玉清律令：东八区周日 24:00 (周一 00:00 UTC+8) 已届，宗门国库依五三二黄金分账规约清算完毕。
本周国库总储 ${totalTreasuryBefore} 灵石 (${(totalTreasuryBefore / 50).toFixed(2)} NEAR)，提取五成（${extractedRewardPoolStones} 灵石 ≈ ${extractedPoolNear} NEAR）全额注入四大周天榜奖池：
- 诛魔天榜（三成池）：道友斩妖卫道，获赐 ${(slayerRewardStones / 50).toFixed(2)} NEAR (${slayerRewardStones} 灵石)；
- 百草药圣榜（两成池）：道友精炼灵丹，获赐 ${(alchemyRewardStones / 50).toFixed(2)} NEAR (${alchemyRewardStones} 灵石)；
- 神工天匠榜（两成池）：道友神工铸剑，获赐 ${(blacksmithRewardStones / 50).toFixed(2)} NEAR (${blacksmithRewardStones} 灵石)；
- 问鼎论剑榜（三成池）：道友论剑演武，获赐 ${(duelRewardStones / 50).toFixed(2)} NEAR (${duelRewardStones} 灵石)；

道友本周合计斩获周俸：+${totalPlayerRewardNear} NEAR (${totalPlayerRewardStones} 灵石 / $${totalPlayerRewardUsd})！
同时已调用 NEAR Intents 协议签发跨链承兑单 (${crossChainPayoutQuote.amountOutFormatted} on ${crossChainPayoutQuote.destinationChain.toUpperCase()})。
天机阁已划拨 ${devOpsAllocatedStones} 灵石 ($${devOpsAllocatedUsd}) 入开发运营金库，护佑宗门长青。

周俸仙资 (NEAR + 灵石) 已备于下方谕牒附件，请道友速速领赏入包，并生成 NEP-413 链上永固凭证！`,
    createdAt: new Date().toISOString(),
    isRead: false,
    isClaimed: shouldAutoClaim,
    attachments: {
      spiritStones: totalPlayerRewardStones,
      nearAmount: totalPlayerRewardNear,
      crossChainIntentQuote: crossChainPayoutQuote,
    },
    txHash: receipt.txHash,
    epochNumber: settlement.epochNumber,
  };

  cultivator.inbox.unshift(settlementMail);
  cultivator.unreadMailCount = cultivator.inbox.filter((m) => !m.isRead).length;

  store.elderCounsel = {
    ...store.elderCounsel,
    message: `钟鸣九响，天榜发榜！本座已从宗门国库提取 50% 灵石池完成第 ${settlement.epochNumber} 期四大周天榜结算，道友合算获赐 +${totalPlayerRewardNear} NEAR (${totalPlayerRewardStones} 灵石)，结算法旨已飞剑传书送达【天阙传谕】，请道友速往信箱领受俸禄！`,
    timestamp: new Date().toISOString(),
  };

  return { settlement, receipt, mail: settlementMail };
}

/**
 * 自动检测并执行东八区周日 24:00 (UTC+8) 定时发榜结算法旨
 * 无需人工点击，系统到达指定时辰自动扣库、发信、分润
 */
export async function checkAndAutoSettleWeeklyBoards(accountId?: string): Promise<{
  settled: boolean;
  settlement?: WeeklySettlementRecord;
  mail?: CelestialMailItem;
}> {
  const store = getStore(accountId);
  const now = Date.now();
  const targetMs = new Date(store.treasury.nextWeeklySettlementUtc8).getTime();

  // 若当前真实时间已达到或超过设定的东八区周日 24:00 时辰
  if (now >= targetMs) {
    const res = await settleWeeklyHeavenLeaderboards({
      forceSettle: true,
      destinationChain: "sol",
      destinationSymbol: "USDC",
      accountId,
    });
    return {
      settled: true,
      settlement: res.settlement,
      mail: res.mail,
    };
  }

  return { settled: false };
}

/**
 * 校准宗门国库：剥离初始模拟注入的创世启动金 (400 灵石 / 8 NEAR)，
 * 还原为 100% 纯玩家实际游戏行为所产生的真实资产总额。
 */
export function clearTreasuryGenesisFund(accountId?: string): {
  clearedGenesisStones: number;
  newTotalTreasuryStones: number;
  newTotalTreasuryNear: number;
} {
  const store = getStore(accountId);
  const genesis = store.treasury.feeBreakdown.initialGenesisStones || 0;
  if (genesis > 0) {
    store.treasury.totalTreasurySpiritStones = Math.max(
      0,
      Number((store.treasury.totalTreasurySpiritStones - genesis).toFixed(2))
    );
    store.treasury.feeBreakdown.initialGenesisStones = 0;
    recalculateLeaderboards(store);
    saveStoreToDisk(accountId || "qingyun-master.testnet", store);
  }
  return {
    clearedGenesisStones: genesis,
    newTotalTreasuryStones: store.treasury.totalTreasurySpiritStones,
    newTotalTreasuryNear: Number(
      (store.treasury.totalTreasurySpiritStones / 50).toFixed(2)
    ),
  };
}

// ============================================================================
// 4.5 天阙传谕（飞剑传书与邮件收发系统）
// ============================================================================

export function readCelestialMail(
  mailId: string,
  accountId?: string
): {
  mail: CelestialMailItem;
  unreadCount: number;
} {
  const store = getStore(accountId);
  const mail = store.cultivator.inbox.find((m) => m.id === mailId);
  if (!mail) throw new Error("未找到指定天阙传谕信件");
  mail.isRead = true;
  store.cultivator.unreadMailCount = store.cultivator.inbox.filter(
    (m) => !m.isRead
  ).length;
  return { mail, unreadCount: store.cultivator.unreadMailCount };
}

export function claimCelestialMailAttachment(
  mailId: string,
  accountId?: string
): {
  mail: CelestialMailItem;
  claimedRewards: CelestialMailAttachment;
  receipt: SignedSessionActionReceipt;
} {
  const store = getStore(accountId);
  const { cultivator } = store;
  const mail = cultivator.inbox.find((m) => m.id === mailId);
  if (!mail) throw new Error("未找到指定天阙传谕信件");
  if (mail.isClaimed) throw new Error("该法旨谕牒附件已领赏完毕，切勿重复领取");
  if (!mail.attachments) throw new Error("该传谕并无待领赏的物资附件");

  const rewards = mail.attachments;
  if (rewards.spiritStones) {
    cultivator.spiritStones = Number(
      (cultivator.spiritStones + rewards.spiritStones).toFixed(2)
    );
  }
  if (rewards.ironOres) {
    cultivator.inventory.ironOres += rewards.ironOres;
  }
  if (rewards.meteorOres) {
    cultivator.inventory.meteorOres += rewards.meteorOres;
  }
  if (rewards.healingPills) {
    cultivator.inventory.healingPills += rewards.healingPills;
  }
  if (rewards.seeds) {
    cultivator.inventory.seedBag[rewards.seeds.tier] =
      (cultivator.inventory.seedBag[rewards.seeds.tier] || 0) +
      rewards.seeds.count;
  }

  mail.isClaimed = true;
  mail.isRead = true;
  cultivator.unreadMailCount = cultivator.inbox.filter((m) => !m.isRead).length;

  const rewardSummary = [
    rewards.spiritStones ? `灵石 +${rewards.spiritStones}` : "",
    rewards.ironOres ? `玄铁 +${rewards.ironOres}` : "",
    rewards.meteorOres ? `陨铁 +${rewards.meteorOres}` : "",
    rewards.seeds ? `仙种 +${rewards.seeds.count}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const receipt = recordSessionAction(
    store,
    "claim_celestial_mail_reward",
    `领受天阙传谕【${mail.title}】物资赐福：${rewardSummary}`,
    {
      mail_id: mail.id,
      category: mail.category,
      rewards: rewardSummary,
      claimed_at: new Date().toISOString(),
    }
  );

  if (rewards.nearAmount) {
    recordFinancialEntry(cultivator, {
      type: "WEEKLY_DIVIDEND",
      titleZh: `查收天阙传谕【${mail.title}】NEAR分润`,
      titleEn: `Claim Decree NEAR [${mail.title}]`,
      nearDelta: rewards.nearAmount,
      stonesDelta: rewards.spiritStones || 0,
      txHash: receipt.txHash,
    });
  } else if (rewards.spiritStones) {
    recordFinancialEntry(cultivator, {
      type: "WEEKLY_DIVIDEND",
      titleZh: `查收天阙传谕【${mail.title}】灵石周俸`,
      titleEn: `Claim Decree Stones [${mail.title}]`,
      nearDelta: 0,
      stonesDelta: rewards.spiritStones,
      txHash: receipt.txHash,
    });
  }

  return {
    mail,
    claimedRewards: rewards,
    receipt,
  };
}

export function claimAllCelestialMails(accountId?: string): {
  claimedCount: number;
  totalSpiritStonesClaimed: number;
  receipt: SignedSessionActionReceipt;
} {
  const store = getStore(accountId);
  const { cultivator } = store;
  const unclaimed = cultivator.inbox.filter(
    (m) => !m.isClaimed && m.attachments
  );

  let totalStones = 0;
  let totalIron = 0;
  let totalMeteor = 0;

  for (const mail of unclaimed) {
    const rewards = mail.attachments!;
    if (rewards.spiritStones) {
      totalStones += rewards.spiritStones;
      cultivator.spiritStones = Number(
        (cultivator.spiritStones + rewards.spiritStones).toFixed(2)
      );
    }
    if (rewards.ironOres) {
      totalIron += rewards.ironOres;
      cultivator.inventory.ironOres += rewards.ironOres;
    }
    if (rewards.meteorOres) {
      totalMeteor += rewards.meteorOres;
      cultivator.inventory.meteorOres += rewards.meteorOres;
    }
    if (rewards.seeds) {
      cultivator.inventory.seedBag[rewards.seeds.tier] =
        (cultivator.inventory.seedBag[rewards.seeds.tier] || 0) +
        rewards.seeds.count;
    }
    mail.isClaimed = true;
    mail.isRead = true;
  }

  cultivator.unreadMailCount = cultivator.inbox.filter((m) => !m.isRead).length;

  const receipt = recordSessionAction(
    store,
    "claim_all_celestial_mails",
    `一键领受 ${unclaimed.length} 封天阙传谕全部赐福：灵石 +${totalStones.toFixed(2)}${totalIron > 0 ? ` · 玄铁 +${totalIron}` : ""}`,
    {
      unclaimed_claimed_count: unclaimed.length,
      total_spirit_stones: totalStones,
      claimed_at: new Date().toISOString(),
    }
  );

  if (totalStones > 0) {
    recordFinancialEntry(cultivator, {
      type: "WEEKLY_DIVIDEND",
      titleZh: `一键查收 ${unclaimed.length} 封传谕全部周俸`,
      titleEn: `Claim All ${unclaimed.length} Decrees`,
      nearDelta: 0,
      stonesDelta: totalStones,
      txHash: receipt.txHash,
    });
  }

  return {
    claimedCount: unclaimed.length,
    totalSpiritStonesClaimed: totalStones,
    receipt,
  };
}

// ============================================================================
// 5. 道身 NFT 即账户 (NFTs as Accounts: Full Sub-Account & Inventory Transfer)
// ============================================================================

export function transferCultivatorNftAccount(
  newOwnerAccountId: string,
  accountId?: string
): {
  previousOwner: string;
  newOwner: string;
  boundSubAccountId: string;
  receipt: SignedSessionActionReceipt;
} {
  const cleanTarget = newOwnerAccountId.trim().toLowerCase();
  if (!cleanTarget || cleanTarget.length < 4) {
    throw new Error("请输入有效的新主人 NEAR 账户名（如 immortal-buyer.testnet）");
  }

  const store = getStore(accountId);
  const { cultivator } = store;
  const previousOwner = cultivator.ownerAccountId;
  cultivator.ownerAccountId = cleanTarget;

  const snapshotSummary = `包含境界【${cultivator.realm}${cultivator.realmLevel}层】、气血 ${cultivator.maxHp} HP、攻击 ${cultivator.atk} ATK、本命法宝【${cultivator.equippedArtifact?.name || "无"}】、灵石 ${cultivator.spiritStones} 及 9 块洞府灵田整体过户`;

  const receipt = recordSessionAction(
    store,
    "transfer_cultivator_nft_account",
    `【NFT as Account 整号交割】道身 NFT (${cultivator.nftTokenId}) 及其绑定的独立子账户 (${cultivator.boundSubAccountId}) 从 ${previousOwner} 完整过户至 ${cleanTarget}（${snapshotSummary}）`,
    {
      nft_token_id: cultivator.nftTokenId,
      bound_sub_account: cultivator.boundSubAccountId,
      from_owner: previousOwner,
      to_owner: cleanTarget,
      carried_spirit_stones: cultivator.spiritStones,
      carried_max_hp: cultivator.maxHp,
      carried_atk: cultivator.atk,
    }
  );

  cultivator.transferHistory.unshift({
    fromOwner: previousOwner,
    toOwner: cleanTarget,
    transferredAt: new Date().toISOString(),
    txHash: receipt.txHash,
    snapshotSummary,
  });

  store.elderCounsel = {
    ...store.elderCounsel,
    message: `元神交割完毕！道身 NFT (${cultivator.nftTokenId}) 连同子账户 (${cultivator.boundSubAccountId}) 内的全部修为、法宝、灵丹与九宫灵田，已毫发无损归于新主【${cleanTarget}】麾下！`,
    timestamp: new Date().toISOString(),
  };

  return {
    previousOwner,
    newOwner: cleanTarget,
    boundSubAccountId: cultivator.boundSubAccountId,
    receipt,
  };
}

// ============================================================================
// 6. 获取世界全量快照 (World Snapshot for UI & CLI Verification)
// ============================================================================

export async function getXianxiaWorldSnapshot(
  targetAccountId?: string
): Promise<XianxiaWorldSnapshot> {
  const normalizedId = (targetAccountId || "qingyun-master.testnet").trim();
  const store = getStore(normalizedId);
  // 更新灵田生长倒计时
  updatePlotsGrowthStatus(store.cultivator.gardenPlots);
  // 自动检测东八区周日 24:00 发榜时机（真·定时全自动发函，无需玩家手动干预）
  await checkAndAutoSettleWeeklyBoards(normalizedId);
  recalculateLeaderboards(store);

  // 1. 同步链上合约 dao-ascension-dev.testnet 中的真实角色 NFT 与国库账本 (A1/P4)
  try {
    const onChainCharPromise = queryContractView<{
      token_id: string;
      owner_id: string;
      dao_name: string;
      avatar_class: string;
      spirit_root: string;
      minted_at_ns: number;
      reshaped_at_ns: number;
      is_soulbound: boolean;
    }>("get_character", { account_id: normalizedId });

    const onChainTreasuryPromise = queryContractView<{
      active_pool_near: string;
      reserve_pool_near: string;
      dev_ops_pool_near: string;
      total_recharged_near: string;
    }>("get_treasury_snapshot", {});

    const onChainPointsPromise = queryContractView<number>("get_points", {
      account_id: normalizedId,
    });

    const [onChainChar, onChainTreasury, onChainPoints] = await Promise.all([
      onChainCharPromise,
      onChainTreasuryPromise,
      onChainPointsPromise,
    ]);

    if (onChainChar) {
      store.cultivator.isMinted = true;
      store.cultivator.daoName = onChainChar.dao_name;
      store.cultivator.avatarClass = onChainChar.avatar_class as any;
      store.cultivator.nftTokenId = onChainChar.token_id;
      if (onChainChar.spirit_root) {
        store.cultivator.spiritRoot.name = onChainChar.spirit_root;
      }
    }

    if (onChainTreasury) {
      const totalYocto = BigInt(onChainTreasury.total_recharged_near || "0");
      const activeYocto = BigInt(onChainTreasury.active_pool_near || "0");
      const devYocto = BigInt(onChainTreasury.dev_ops_pool_near || "0");
      const yoctoPerNear = BigInt(10) ** BigInt(24);

      const totalStones = Number((totalYocto * BigInt(50)) / yoctoPerNear);
      const activeStones = Number((activeYocto * BigInt(50)) / yoctoPerNear);
      const devStones = Number((devYocto * BigInt(50)) / yoctoPerNear);

      if (totalStones > 0) {
        store.treasury.totalTreasurySpiritStones = Math.max(
          store.treasury.totalTreasurySpiritStones,
          totalStones
        );
        store.treasury.activeWeeklyRewardPoolStones = Math.max(
          store.treasury.activeWeeklyRewardPoolStones,
          activeStones
        );
        store.treasury.activeDevOpsAllocationStones = Math.max(
          store.treasury.activeDevOpsAllocationStones,
          devStones
        );
      }
    }

    if (typeof onChainPoints === "number" && onChainPoints > 0) {
      store.cultivator.spiritStones = onChainPoints;
    }
  } catch (err) {
    console.warn("Syncing on-chain state warning:", err);
  }

  // 2. 状态保存至磁盘 (A2: 服务重启后完全不丢)
  saveStoreToDisk(normalizedId, store);

  const chainStatus = await getTestnetNetworkStatus();
  const sessionKeyInfo = getCultivatorFunctionCallKeyInfo(
    store.cultivator.boundSubAccountId,
    store.recentSessionReceipts.length
  );

  return {
    cultivator: store.cultivator,
    treasury: store.treasury,
    latestBattleReport: store.latestBattleReport,
    latestPvpReport: store.latestPvpReport,
    pvpOpponents: generatePvpOpponents(store.cultivator),
    elderCounsel: store.elderCounsel,
    sessionKeyInfo,
    chainStatus,
    recentSessionReceipts: store.recentSessionReceipts,
    economicRules: {
      nearUsdRate: 5.0,
      spiritStoneUsdRate: SPIRIT_STONE_USD_RATE,
      spiritStonesPerNear: 50,
      reshapeFeeNear: 0.5,
      reshapeFeeStones: 200,
      rollSpiritRootNear: 0.1,
      devOpsRevenueRatioPct: 20,
      weeklyRewardPoolRatioPct: 50,
    },
    catalogs: {
      herbSeeds: HERB_SEEDS_CATALOG,
      forgeBlueprints: FORGE_BLUEPRINTS_CATALOG,
      realmFloors: Array.from(
        {
          length: Math.max(
            20,
            (store.cultivator.highestFloorCleared || 0) + 10
          ),
        },
        (_, i) => getSecretRealmFloorConfig(i + 1)
      ),
    },
  };
}
