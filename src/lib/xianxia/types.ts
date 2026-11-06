import { CrossChainQuoteResult } from "../intents/client";
import {
  FunctionCallAccessKeyInfo,
  SignedSessionActionReceipt,
  TestnetChainStatus,
} from "../near/testnet-wallet";

export type RealmStage = "练气期" | "筑基期" | "结丹期" | "元婴期";

export type ArtifactRarity = "凡品法器" | "凡品灵兵" | "上品灵宝" | "极品道器" | "传世仙器";

export interface HerbSeedConfig {
  tier: 1 | 2 | 3;
  id: string;
  name: string;
  pillName: string;
  costSpiritStones: number;
  permMaxHpBonus: number;
  pillsYieldCount: number;
  pillHealAmount: number;
  alchemyScorePoints: number;
  growDurationSeconds: number;
  lore: string;
}

export interface GardenPlotState {
  plotId: number;
  status: "EMPTY" | "GROWING" | "READY";
  seedTier?: 1 | 2 | 3;
  herbName?: string;
  pillName?: string;
  plantedAt?: string;
  matureAtIso?: string;
  remainingGrowSeconds?: number;
  wateredWithSpiritSpring: boolean;
  potencyMultiplier: number;
  expectedMaxHpBonus: number;
  expectedPillsYield: number;
}

export interface ForgedArtifact {
  id: string;
  blueprintId: string;
  name: string;
  rarity: ArtifactRarity;
  atkBonus: number;
  defBonus: number;
  critRatePct: number;
  forgeScore: number;
  affixTitle: string;
  elderInscription: string;
  forgedAt: string;
  txHash: string;
}

export interface ForgeBlueprintConfig {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  ironOreCost: number;
  meteorOreCost: number;
  spiritStoneFee: number;
  baseAtkMin: number;
  baseAtkMax: number;
  baseDefBonus: number;
  baseCritPct: number;
  baseForgeScore: number;
  description: string;
}

export interface SecretRealmFloorConfig {
  floor: number;
  monsterName: string;
  monsterTitle: string;
  recommendedHp: number;
  recommendedAtk: number;
  monsterHp: number;
  monsterAtk: number;
  monsterDef: number;
  entryFeeStones: number;
  rewardSpiritStones: number;
  rewardExp: number;
  dropIronOres: number;
  dropMeteorOres: number;
  dropSeedTier: 1 | 2 | 3;
  slayerScorePoints: number;
}

export interface PvpDuelOpponent {
  id: string;
  subAccountId: string;
  daoName: string;
  title: string;
  avatarClass: "saintess" | "sword" | "venerable" | "fox" | "demon";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  difficultyLabelZh: string;
  difficultyLabelEn: string;
  hp: number;
  atk: number;
  def: number;
  critRatePct: number;
  equippedArtifactName: string;
  artifactRarity: ArtifactRarity;
  duelScore: number;
  rewardSpiritStones: number;
  rewardDuelPoints: number;
  winChanceEstimatePct: number;
}

export interface PvpTurnLog {
  turn: number;
  attackerName: string;
  defenderName: string;
  actionText: string;
  damageDealt?: number;
  isCrit?: boolean;
  hpRestored?: number;
  attackerHpAfter: number;
  defenderHpAfter: number;
}

export interface PvpDuelReport {
  duelId: string;
  opponent: PvpDuelOpponent;
  victory: boolean;
  turnsTaken: number;
  pillsConsumed: number;
  logs: PvpTurnLog[];
  rewards: {
    spiritStones: number;
    duelPointsDelta: number;
    newDuelScore: number;
    ironOres?: number;
  };
  txHash: string;
  timestamp: string;
}

export interface CombatTurnLog {
  turn: number;
  actor: "CULTIVATOR" | "MONSTER" | "PILL_RECOVERY";
  actionText: string;
  damageDealt?: number;
  isCrit?: boolean;
  hpRestored?: number;
  cultivatorHpAfter: number;
  monsterHpAfter: number;
}

export interface CombatBattleReport {
  battleId: string;
  floor: number;
  monsterName: string;
  victory: boolean;
  turnsTaken: number;
  pillsConsumed: number;
  logs: CombatTurnLog[];
  rewards?: {
    spiritStones: number;
    exp: number;
    ironOres: number;
    meteorOres: number;
    seedTier: 1 | 2 | 3;
    slayerPoints: number;
    realmBreakthrough?: string;
  };
  txHash: string;
  timestamp: string;
}

export interface CelestialMailAttachment {
  spiritStones?: number;
  ironOres?: number;
  meteorOres?: number;
  healingPills?: number;
  seeds?: { tier: 1 | 2 | 3; count: number };
  crossChainIntentQuote?: CrossChainQuoteResult;
}

export interface CelestialMailItem {
  id: string;
  title: string;
  sender: string;
  category: "SETTLEMENT" | "SYSTEM" | "REWARD";
  content: string;
  createdAt: string;
  isRead: boolean;
  isClaimed: boolean;
  attachments?: CelestialMailAttachment;
  txHash?: string;
  epochNumber?: number;
}

export type SpiritRootTier = "凡品" | "玄品" | "地品" | "天品" | "仙品";

export interface SpiritRootDefinition {
  id: string;
  name: string;
  tier: SpiritRootTier;
  hpBonusPct: number;
  atkBonusPct: number;
  critBonusPct: number;
  pillPotencyBonusPct: number;
  stoneDropBonusPct: number;
  badgeStyle: string;
  lore: string;
}

export const SPIRIT_ROOTS_CATALOG: SpiritRootDefinition[] = [
  {
    id: "root-common",
    name: "凡品 · 五行凡脉杂灵根",
    tier: "凡品",
    hpBonusPct: 0,
    atkBonusPct: 0,
    critBonusPct: 0,
    pillPotencyBonusPct: 0,
    stoneDropBonusPct: 0,
    badgeStyle: "bg-[#F3EFE6] border-[#D1C7B7] text-[#695D4A]",
    lore: "五行俱全却混沌未明，修仙之基，凡夫俗子初入道门之根。",
  },
  {
    id: "root-earth",
    name: "玄品 · 厚土固本灵根",
    tier: "玄品",
    hpBonusPct: 5,
    atkBonusPct: 0,
    critBonusPct: 0,
    pillPotencyBonusPct: 10,
    stoneDropBonusPct: 0,
    badgeStyle: "bg-[#EBF4F0] border-[#9CC5BD] text-[#2F6158]",
    lore: "地脉玄黄气所凝，气血雄浑，炼丹服气效力倍增。",
  },
  {
    id: "root-metal",
    name: "地品 · 庚金破煞灵根",
    tier: "地品",
    hpBonusPct: 0,
    atkBonusPct: 8,
    critBonusPct: 5,
    pillPotencyBonusPct: 0,
    stoneDropBonusPct: 0,
    badgeStyle: "bg-[#FAF1E3] border-[#DEBE87] text-[#825C21]",
    lore: "西方太白庚金之气，锋芒内蕴，剑意凌厉，出鞘破煞。",
  },
  {
    id: "root-wood",
    name: "天品 · 青莲造化木灵根",
    tier: "天品",
    hpBonusPct: 15,
    atkBonusPct: 5,
    critBonusPct: 4,
    pillPotencyBonusPct: 15,
    stoneDropBonusPct: 12,
    badgeStyle: "bg-[#E6F5F1] border-[#72B4A7] text-[#1D5E52]",
    lore: "九天造化青莲真种，生气无穷，采药炼丹与气血同修。",
  },
  {
    id: "root-star",
    name: "仙品 · 太初星辰剑灵根",
    tier: "仙品",
    hpBonusPct: 20,
    atkBonusPct: 20,
    critBonusPct: 12,
    pillPotencyBonusPct: 20,
    stoneDropBonusPct: 20,
    badgeStyle: "bg-[#F5EDFA] border-[#C39FE3] text-[#5C2B8A]",
    lore: "太初玄光淬炼，剑气通达周天星宿，诸般修仙增益登峰造极。",
  },
];

export interface CultivatorNftAccount {
  nftTokenId: string;
  nftStandard: "nep171";
  isMinted: boolean;
  avatarClass: "saintess" | "sword" | "venerable" | "fox" | "demon";
  spiritRoot: SpiritRootDefinition;
  ownerAccountId: string;
  boundSubAccountId: string;
  daoName: string;
  title: string;
  realm: RealmStage;
  realmLevel: number;
  exp: number;
  maxExp: number;
  hp: number;
  maxHp: number;
  baseHp: number;
  herbBonusHp: number;
  atk: number;
  baseAtk: number;
  weaponBonusAtk: number;
  def: number;
  critRatePct: number;
  spiritStones: number;
  inventory: {
    healingPills: number;
    pillHealPower: number;
    ironOres: number;
    meteorOres: number;
    seedBag: Record<1 | 2 | 3, number>;
    artifacts: ForgedArtifact[];
  };
  equippedArtifact: ForgedArtifact | null;
  gardenPlots: GardenPlotState[];
  highestFloorCleared: number;
  herbsHarvestedCount: number;
  scores: {
    slayerScore: number;
    alchemyScore: number;
    blacksmithScore: number;
    duelScore: number;
    duelWins: number;
    duelLosses: number;
  };
  inbox: CelestialMailItem[];
  unreadMailCount: number;
  transferHistory: Array<{
    fromOwner: string;
    toOwner: string;
    transferredAt: string;
    txHash: string;
    snapshotSummary: string;
  }>;
}

export interface LeaderboardEntry {
  rank: number;
  daoName: string;
  subAccountId: string;
  isPlayer: boolean;
  score: number;
  metricLabel: string;
  sharePct: number;
  estimatedRewardStones: number;
  estimatedRewardUsd: number;
}

export interface WeeklySettlementRecord {
  settlementId: string;
  epochNumber: number;
  settledAt: string;
  totalTreasuryBefore: number;
  extractedRewardPoolStones: number;
  devOpsAllocatedStones: number;
  devOpsAllocatedUsd: number;
  treasuryReserveRemaining: number;
  boardPools: {
    slayerPoolStones: number;
    alchemyPoolStones: number;
    blacksmithPoolStones: number;
    duelPoolStones: number;
  };
  playerRewards: {
    slayerRewardStones: number;
    alchemyRewardStones: number;
    blacksmithRewardStones: number;
    duelRewardStones: number;
    totalPlayerRewardStones: number;
    totalPlayerRewardUsd: number;
  };
  crossChainPayoutQuote: CrossChainQuoteResult;
}

export interface SectTreasuryState {
  treasuryAccountId: string;
  devOpsVaultAccountId: string;
  currentEpoch: number;
  totalTreasurySpiritStones: number;
  extractionRatioPct: number;
  devOpsRatioPct: number;
  reserveRatioPct: number;
  activeWeeklyRewardPoolStones: number;
  activeDevOpsAllocationStones: number;
  cumulativeDevOpsRevenueStones: number;
  cumulativeDevOpsRevenueUsd: number;
  feeBreakdown: {
    seedPurchasesStones: number;
    forgingFeesStones: number;
    realmEntryFeesStones: number;
    initialGenesisStones: number;
  };
  boards: {
    slayerBoard: LeaderboardEntry[];
    alchemyBoard: LeaderboardEntry[];
    blacksmithBoard: LeaderboardEntry[];
    duelBoard: LeaderboardEntry[];
  };
  settlementHistory: WeeklySettlementRecord[];
  nextWeeklySettlementUtc8: string;
  weeklySettlementCronDescription: string;
}

export interface ElderAiCounsel {
  elderName: string;
  elderTitle: string;
  elderWallet: string;
  message: string;
  marketDemandHint: string;
  teeAttested: boolean;
  timestamp: string;
}

export interface XianxiaWorldSnapshot {
  cultivator: CultivatorNftAccount;
  treasury: SectTreasuryState;
  latestBattleReport: CombatBattleReport | null;
  latestPvpReport: PvpDuelReport | null;
  pvpOpponents: PvpDuelOpponent[];
  elderCounsel: ElderAiCounsel;
  sessionKeyInfo: FunctionCallAccessKeyInfo;
  chainStatus: TestnetChainStatus;
  recentSessionReceipts: SignedSessionActionReceipt[];
  economicRules: {
    nearUsdRate: number;
    spiritStoneUsdRate: number;
    spiritStonesPerNear: number;
    reshapeFeeNear: number;
    reshapeFeeStones: number;
    rollSpiritRootNear: number;
    devOpsRevenueRatioPct: number;
    weeklyRewardPoolRatioPct: number;
  };
  catalogs: {
    herbSeeds: HerbSeedConfig[];
    forgeBlueprints: ForgeBlueprintConfig[];
    realmFloors: SecretRealmFloorConfig[];
  };
}
