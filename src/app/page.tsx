"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Coins,
  Compass,
  Droplets,
  Flame,
  Globe,
  Hammer,
  Heart,
  RefreshCw,
  Sparkles,
  Sprout,
  Swords,
  Trophy,
  Unlock,
  UserPlus,
  Mail,
  Gift,
  Lock,
  Shield,
  User,
  Wallet,
  Crosshair,
  ChevronRight,
  X,
  CheckCircle2,
  Clock,
  FlameKindling,
  Crown,
  Medal,
  Volume2,
  VolumeX,
  Music,
  HelpCircle,
} from "lucide-react";
import { xianxiaAudio } from "@/lib/xianxia/sound";
import {
  AvatarClass,
  CultivatorSprite,
  HerbTileVisual,
  MonsterSprite,
  resolveCharacterConfig,
  XIANXIA_CHARACTER_ROSTER,
} from "@/components/GameSprites";
import {
  CelestialMailModal,
  CinnabarSeal,
  CloudDivider,
  GuideHandPointer,
  JadeGlassPanel,
  ScrollBanner,
  StarlightCloudCanvas,
  StatusTickerBar,
  TutorialStepMilestoneBar,
  WeeklyCountdownBadge,
  XianxiaLoadingRing,
} from "@/components/JadeUiOrnaments";
import { SectTreasuryModal } from "@/components/SectTreasuryModal";
import {
  Lang,
  trArtifactName,
  trDaoName,
  trHerbName,
  trMonsterName,
  trMonsterTitle,
  trPillName,
  trRarity,
  trRealm,
} from "@/lib/xianxia/i18n";
import {
  CombatBattleReport,
  CombatTurnLog,
  PvpDuelOpponent,
  PvpDuelReport,
  PvpTurnLog,
  SPIRIT_ROOTS_CATALOG,
  SpiritRootDefinition,
  XianxiaWorldSnapshot,
} from "@/lib/xianxia/types";
import { useNearWallet } from "near-connect-hooks";

type ActiveBuilding = "GARDEN" | "FORGE" | "REALM" | "ARENA" | "TREASURY";

const PLOT_ORDINALS = [
  { zh: "【壹号畦】", en: "Plot I" },
  { zh: "【贰号畦】", en: "Plot II" },
  { zh: "【叁号畦】", en: "Plot III" },
  { zh: "【肆号畦】", en: "Plot IV" },
  { zh: "【伍号畦】", en: "Plot V" },
  { zh: "【陆号畦】", en: "Plot VI" },
  { zh: "【柒号畦】", en: "Plot VII" },
  { zh: "【捌号畦】", en: "Plot VIII" },
  { zh: "【玖号畦】", en: "Plot IX" },
];

// 0 = 创角界面
// 1 = 引导第1步：灵田播种
// 2 = 引导第2步：灵泉浇灌
// 3 = 引导第3步：采摘炼丹 (+气血 HP) -> 解锁【天工炼器】
// 4 = 引导第4步：挥锤铸剑 (+攻击 ATK) -> 解锁【秘境战斗】
// 5 = 引导第5步：2D 秘境斩妖掉矿 -> 解锁【宗门周天榜】
// 6 = 全部解锁自由修仙
type TutorialStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const RANDOM_DAO_NAMES_ZH = [
  "云清浅",
  "青云子",
  "苏扶摇",
  "凌霄剑主",
  "韩立",
  "叶凡",
  "白小纯",
  "沈清秋",
];

const SPIRIT_ROOTS = [
  {
    id: "root-celadon",
    zh: "🌿 青莲造化木灵根 · 天品",
    en: "🌿 Azure Lotus Wood Spirit Root · SSR",
    badgeStyle: "bg-[#E6F4F0]/90 border-[#9CC5BD] text-[#35635B]",
  },
  {
    id: "root-thunder",
    zh: "✨ 太初星辰剑灵根 · 仙品",
    en: "✨ Primordial Starlight Sword Root · UR",
    badgeStyle: "bg-[#F5EFE2]/90 border-[#C8AA72] text-[#7A5C29]",
  },
  {
    id: "root-lavender",
    zh: "🌸 紫霞流云仙灵根 · 天品",
    en: "🌸 Rosy Cloud Immortal Root · SSR",
    badgeStyle: "bg-[#EFEBF7]/90 border-[#BFAEE0] text-[#5C4B7D]",
  },
  {
    id: "root-jade",
    zh: "💧 沧溟冰魄水灵根 · 圣品",
    en: "💧 Frost Jade Water Spirit Root · SSR",
    badgeStyle: "bg-[#E6F1F6]/90 border-[#9DC0D4] text-[#365C70]",
  },
];

export default function JadeXianxiaH5Game() {
  const [snapshot, setSnapshot] = useState<XianxiaWorldSnapshot | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("zh");

  // NEAR 多账号持久化与切换
  const [activeAccountId, setActiveAccountId] =
    useState<string>("qingyun-master.testnet");
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [accountInput, setAccountInput] =
    useState<string>("qingyun-master.testnet");

  // NEAR 测试网官方钱包集成 (@hot-labs/near-connect + near-connect-hooks)
  const {
    signedAccountId,
    loading: isWalletInitializing,
    signIn: nearSignIn,
    signOut: nearSignOut,
  } = useNearWallet();

  const handleWalletConnect = async () => {
    try {
      await nearSignIn();
    } catch (err) {
      console.error("NEAR wallet connect failed:", err);
    }
  };

  const handleWalletDisconnect = async () => {
    try {
      await nearSignOut();
      triggerFloatingStat(
        t("✨ 已断开 NEAR 测试网钱包", "✨ Disconnected NEAR Wallet")
      );
    } catch (err) {
      console.error("NEAR wallet disconnect failed:", err);
    }
  };

  // 渐进式解锁状态
  const [tutorialStage, setTutorialStage] = useState<TutorialStage>(0);
  const [activeBuilding, setActiveBuilding] =
    useState<ActiveBuilding>("GARDEN");
  const [unlockNotice, setUnlockNotice] = useState<string | null>(null);

  // 创角状态
  const [daoNameInput, setDaoNameInput] = useState<string>("云清浅");
  const [avatarClass, setAvatarClass] = useState<AvatarClass>("saintess");
  const [spiritRootIdx, setSpiritRootIdx] = useState<number>(0);
  const [isRollingRoot, setIsRollingRoot] = useState<boolean>(false);

  // 角色头顶柔光属性飘字
  const [floatingStatText, setFloatingStatText] = useState<string | null>(null);

  // 炼器动画状态
  const [isForgingAnim, setIsForgingAnim] = useState<boolean>(false);

  // 2D 秘境战斗动画状态
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [isBattling, setIsBattling] = useState<boolean>(false);
  const [battleTurnIdx, setBattleTurnIdx] = useState<number>(0);
  const [heroAnimState, setHeroAnimState] = useState<
    "idle" | "attack" | "hit" | "heal"
  >("idle");
  const [monsterAnimState, setMonsterAnimState] = useState<
    "idle" | "attack" | "hit"
  >("idle");
  const [arenaFloatingDmg, setArenaFloatingDmg] = useState<{
    target: "hero" | "monster";
    text: string;
    tone: "gold" | "jade" | "rose";
  } | null>(null);
  const battleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 问鼎论剑台 PVP 状态
  const [activePvpOpponent, setActivePvpOpponent] =
    useState<PvpDuelOpponent | null>(null);
  const [isPvpModalOpen, setIsPvpModalOpen] = useState<boolean>(false);
  const [pvpDuelReport, setPvpDuelReport] = useState<PvpDuelReport | null>(null);
  const [pvpTurnIdx, setPvpTurnIdx] = useState<number>(0);
  const [isPvpAnimating, setIsPvpAnimating] = useState<boolean>(false);
  const [pvpHeroAnim, setPvpHeroAnim] = useState<
    "idle" | "attack" | "hit" | "heal"
  >("idle");
  const [pvpOpponentAnim, setPvpOpponentAnim] = useState<
    "idle" | "attack" | "hit" | "heal"
  >("idle");
  const [pvpFloatingDmg, setPvpFloatingDmg] = useState<{
    target: "hero" | "opponent";
    text: string;
    tone: "gold" | "jade" | "rose";
  } | null>(null);
  const pvpTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 秘境战斗大捷/惜败结算弹窗 (12回合战斗演示完后弹出，杜绝提前剧透)
  const [battleResultModal, setBattleResultModal] = useState<{
    isOpen: boolean;
    victory: boolean;
    floor: number;
    monsterName: string;
    rewards?: CombatBattleReport["rewards"];
    turnsTaken: number;
    pillsConsumed: number;
  } | null>(null);
  const [visualBattleReport, setVisualBattleReport] =
    useState<CombatBattleReport | null>(null);

  // 秘境无限层数分页状态 (每页5重)
  const [realmFloorPage, setRealmFloorPage] = useState<number>(0);

  // 仙资收支御道簿弹窗状态 (NEAR 投入消耗与赚取分润总账)
  const [isFinancialModalOpen, setIsFinancialModalOpen] =
    useState<boolean>(false);

  // 宗门天榜律令与五三二分账 Tips 弹窗状态 (规则收纳于 Tips 内，不堆在外面)
  const [isTreasuryRulesTipsOpen, setIsTreasuryRulesTipsOpen] =
    useState<boolean>(false);

  interface LoadingTarget {
    type:
      | "PLOT"
      | "FORGE"
      | "BATTLE"
      | "ARENA"
      | "HEAL"
      | "SETTLE"
      | "TRANSFER"
      | "CREATE"
      | "ROOT"
      | "ACCOUNT";
    id?: number | string;
    textZh: string;
    textEn: string;
  }

  const [selectedSeedTier, setSelectedSeedTier] = useState<1 | 2 | 3>(1);
  const [boardViewTab, setBoardViewTab] = useState<
    "SLAYER" | "ALCHEMY" | "BLACKSMITH" | "DUEL"
  >("SLAYER");
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [loadingPlotIds, setLoadingPlotIds] = useState<number[]>([]);
  const [activeLoading, setActiveLoading] = useState<LoadingTarget | null>(null);

  // 角色重塑弹窗状态 (消耗 0.5 NEAR 或 200 灵石)
  const [isReshapeModalOpen, setIsReshapeModalOpen] = useState<boolean>(false);
  const [reshapeAvatar, setReshapeAvatar] = useState<AvatarClass>("saintess");
  const [reshapeDaoName, setReshapeDaoName] = useState<string>("");
  const [reshapePayment, setReshapePayment] = useState<"STONES" | "NEAR">("STONES");
  const [isReshaping, setIsReshaping] = useState<boolean>(false);

  // 灵根洗炼 (0.1 NEAR) 状态
  const [isRollingSpiritRoot, setIsRollingSpiritRoot] = useState<boolean>(false);
  const [createdSpiritRoot, setCreatedSpiritRoot] =
    useState<SpiritRootDefinition>(SPIRIT_ROOTS_CATALOG[0]);

  // 灵石/NEAR 汇率与充值弹窗状态
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState<boolean>(false);

  // 底部天机链镜面板默认收起关闭 (满足需求1，避免进入主页时遮挡洞府灵圃与属性)
  const [showNearPanel, setShowNearPanel] = useState<boolean>(false);
  const [transferTargetInput, setTransferTargetInput] = useState<string>(
    "immortal-sovereign.testnet"
  );
  // 天阙传谕 · 飞剑传书信箱状态
  const [isMailOpen, setIsMailOpen] = useState<boolean>(false);
  const [activeMailId, setActiveMailId] = useState<string | undefined>(undefined);
  const [isClaimingMail, setIsClaimingMail] = useState<boolean>(false);

  // 宗门国库账房 · 司库总账与五三二分账弹窗状态
  const [isTreasuryModalOpen, setIsTreasuryModalOpen] = useState<boolean>(false);

  // 仙乐 BGM 与游戏音效开关状态
  const [bgmPlaying, setBgmPlaying] = useState<boolean>(false);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const hasAutoStartedAudioRef = useRef<boolean>(false);

  // 醒目道具扣减与属性获得飘字提示系统 (满足需求：道具不足提示 + 扣道具明显表现)
  interface ResourceDeltaBadge {
    id: string;
    icon: string;
    labelZh: string;
    labelEn: string;
    delta: number;
    isDeduction: boolean;
  }
  interface InsufficientAlertInfo {
    titleZh: string;
    titleEn: string;
    detailZh: string;
    detailEn: string;
    missingKey: "stones" | "iron" | "meteor" | "seeds" | "pills" | "other";
    actionLabelZh?: string;
    actionLabelEn?: string;
    onQuickResolve?: () => void;
  }
  interface PlotFloatingFx {
    textZh: string;
    textEn: string;
    subTextZh?: string;
    subTextEn?: string;
    isDeduction: boolean;
    key: number;
  }
  interface ForgeFloatingFx {
    deductions: string[];
    gainText?: string;
    key: number;
  }
  const [deltaBannerItems, setDeltaBannerItems] = useState<ResourceDeltaBadge[]>([]);
  const [slotDeltas, setSlotDeltas] = useState<Record<string, number>>({});
  const [insufficientAlert, setInsufficientAlert] = useState<InsufficientAlertInfo | null>(null);
  const [missingSlotKey, setMissingSlotKey] = useState<string | null>(null);
  const [plotFloatingFx, setPlotFloatingFx] = useState<Record<number, PlotFloatingFx>>({});
  const [forgeFloatingFx, setForgeFloatingFx] = useState<ForgeFloatingFx | null>(null);
  const deltaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insufficientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerInsufficientAlert = (info: InsufficientAlertInfo) => {
    xianxiaAudio.playInsufficient();
    setInsufficientAlert(info);
    setMissingSlotKey(info.missingKey);
    if (insufficientTimerRef.current) clearTimeout(insufficientTimerRef.current);
    insufficientTimerRef.current = setTimeout(() => {
      setMissingSlotKey(null);
      setInsufficientAlert(null);
    }, 5200);
  };

  const triggerPlotFloatingFx = (plotId: number, fx: Omit<PlotFloatingFx, "key">) => {
    setPlotFloatingFx((prev) => ({
      ...prev,
      [plotId]: { ...fx, key: Date.now() },
    }));
    setTimeout(() => {
      setPlotFloatingFx((prev) => {
        const next = { ...prev };
        delete next[plotId];
        return next;
      });
    }, 2400);
  };

  // 全局按钮点击清脆玉佩音效 + 首次交互自动开启仙侠古琴背景音
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const btn = target.closest("button, a");
      if (btn) {
        if (!hasAutoStartedAudioRef.current) {
          hasAutoStartedAudioRef.current = true;
          xianxiaAudio.startBgm();
          setBgmPlaying(true);
        }
        xianxiaAudio.playClick();
      }
    };
    window.addEventListener("click", handleGlobalClick, true);
    return () => window.removeEventListener("click", handleGlobalClick, true);
  }, []);

  const handleToggleBgm = () => {
    hasAutoStartedAudioRef.current = true;
    const next = xianxiaAudio.toggleBgm();
    setBgmPlaying(next);
  };

  const handleToggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    xianxiaAudio.setSfxEnabled(next);
  };

  const t = useCallback(
    (zhText: string, enText: string) => (lang === "en" ? enText : zhText),
    [lang]
  );

  const triggerFloatingStat = (text: string) => {
    setFloatingStatText(text);
    setTimeout(() => {
      setFloatingStatText(null);
    }, 2600);
  };

  const triggerUnlockNotice = (msg: string) => {
    setUnlockNotice(msg);
    setTimeout(() => {
      setUnlockNotice(null);
    }, 4500);
  };

  const fetchSnapshot = useCallback(async (targetAccountId?: string) => {
    const acc = targetAccountId || activeAccountId;
    try {
      const res = await fetch(
        `/api/xianxia/state?accountId=${encodeURIComponent(acc)}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.ok && data.snapshot) {
        setSnapshot(data.snapshot);
        setFetchError(null);
        // 如果该账户已经铸造/结契了道身，且当前还停留在创角界面 (tutorialStage === 0)，则直接进入洞府！
        if (data.snapshot.cultivator.isMinted) {
          let targetStage: TutorialStage = 1;
          if (typeof window !== "undefined") {
            const saved = localStorage.getItem(`dao_tutorial_stage_${acc}`);
            if (saved) targetStage = Number(saved) as TutorialStage;
          }
          if (targetStage === 0) {
            targetStage = data.snapshot.cultivator.highestFloorCleared > 0 ? 6 : (data.snapshot.cultivator.equippedArtifact ? 5 : 1);
          }
          setTutorialStage(targetStage);
          setAvatarClass(data.snapshot.cultivator.avatarClass || "saintess");
        } else {
          setTutorialStage(0);
        }
      } else {
        throw new Error(data.error || "Snapshot missing");
      }
    } catch (err) {
      console.warn("fetchSnapshot warning:", err);
      setFetchError(t("灵脉感应短暂受阻，正在吸纳天地灵气自动重连...", "Spiritual connection interrupted, auto-reconnecting..."));
      // 1.8秒后自动轻量重试
      setTimeout(() => {
        fetchSnapshot(acc);
      }, 1800);
    }
  }, [activeAccountId, t]);

  // 记录每个账号当前的洞府引导阶段
  useEffect(() => {
    if (typeof window !== "undefined" && activeAccountId && tutorialStage > 0) {
      localStorage.setItem(`dao_tutorial_stage_${activeAccountId}`, String(tutorialStage));
    }
  }, [tutorialStage, activeAccountId]);

  // 客户端挂载：读取 localStorage 中保存的 NEAR 账户并加载
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAcc = localStorage.getItem("dao_near_account");
      if (savedAcc && savedAcc.trim()) {
        const cleaned = savedAcc.trim();
        setActiveAccountId(cleaned);
        setAccountInput(cleaned);
        fetchSnapshot(cleaned);
        return;
      }
    }
    fetchSnapshot();
    return () => {
      if (battleTimerRef.current) clearInterval(battleTimerRef.current);
      if (pvpTimerRef.current) clearInterval(pvpTimerRef.current);
    };
  }, [fetchSnapshot]);

  // 当 NEAR 测试网钱包连接成功，自动切换至该链上钱包账户并调取道身档案
  useEffect(() => {
    if (signedAccountId && signedAccountId.trim()) {
      const trimmed = signedAccountId.trim();
      setActiveAccountId(trimmed);
      setAccountInput(trimmed);
      if (typeof window !== "undefined") {
        localStorage.setItem("dao_near_account", trimmed);
      }
      fetchSnapshot(trimmed);
      triggerFloatingStat(
        t(
          `✨ 已连接 NEAR 测试网钱包：${trimmed}`,
          `✨ Connected NEAR Testnet Wallet: ${trimmed}`
        )
      );
    }
  }, [signedAccountId, fetchSnapshot]);

  // 灵田植物实时倒计时与成熟判定 + 闭关静坐挂机调息回血 (每秒本地驱动，零冗余网络开销)
  useEffect(() => {
    const timer = setInterval(() => {
      setSnapshot((prev) => {
        if (!prev) return prev;
        let hasChanges = false;
        const updatedPlots = prev.cultivator.gardenPlots.map((plot) => {
          if (plot.status === "GROWING" && plot.matureAtIso) {
            const now = Date.now();
            const matureTime = new Date(plot.matureAtIso).getTime();
            const remaining = Math.max(0, Math.ceil((matureTime - now) / 1000));
            if (remaining === 0) {
              hasChanges = true;
              return {
                ...plot,
                status: "READY" as const,
                remainingGrowSeconds: 0,
              };
            }
            if (plot.remainingGrowSeconds !== remaining) {
              hasChanges = true;
              return {
                ...plot,
                remainingGrowSeconds: remaining,
              };
            }
          }
          return plot;
        });

        // 闭关调息·挂机自动恢复道身气血 (Idle Meditation HP Regen: 1.5% maxHp/s)
        let hpChanged = false;
        let currentHp = prev.cultivator.hp ?? prev.cultivator.maxHp;
        const maxHp = prev.cultivator.maxHp || 160;
        if (currentHp < maxHp) {
          const hpPerSec = Math.max(2, Math.round(maxHp * 0.015));
          currentHp = Math.min(maxHp, currentHp + hpPerSec);
          hpChanged = true;
        }

        if (!hasChanges && !hpChanged) return prev;
        return {
          ...prev,
          cultivator: {
            ...prev.cultivator,
            hp: currentHp,
            gardenPlots: hasChanges ? updatedPlots : prev.cultivator.gardenPlots,
          },
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const callGameApi = async (
    payload: Record<string, unknown>,
    target?: LoadingTarget,
    options?: { deferSnapshot?: boolean }
  ) => {
    const isGlobalBlocking = target?.type !== "PLOT";
    if (isGlobalBlocking) setLoadingAction(true);
    if (target && isGlobalBlocking) setActiveLoading(target);
    const prevCultivator = snapshot?.cultivator;
    try {
      const bodyWithAccount = {
        accountId: activeAccountId,
        ...payload,
      };
      const res = await fetch("/api/xianxia/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyWithAccount),
      });
      const data = await res.json();
      let applySnapshotFn = () => {};
      if (data.snapshot) {
        const nextCultivator = data.snapshot.cultivator;
        const badges: ResourceDeltaBadge[] = [];
        const slots: Record<string, number> = {};

        if (prevCultivator && nextCultivator) {

          const dStones = Number(
            (nextCultivator.spiritStones - prevCultivator.spiritStones).toFixed(1)
          );
          if (dStones !== 0) {
            slots.stones = dStones;
            badges.push({
              id: `stones-${Date.now()}`,
              icon: "💎",
              labelZh: "灵石",
              labelEn: "Stones",
              delta: dStones,
              isDeduction: dStones < 0,
            });
          }

          const dIron =
            nextCultivator.inventory.ironOres - prevCultivator.inventory.ironOres;
          if (dIron !== 0) {
            slots.iron = dIron;
            badges.push({
              id: `iron-${Date.now()}`,
              icon: "⛏️",
              labelZh: "百炼玄铁",
              labelEn: "Iron Ore",
              delta: dIron,
              isDeduction: dIron < 0,
            });
          }

          const dMeteor =
            nextCultivator.inventory.meteorOres -
            prevCultivator.inventory.meteorOres;
          if (dMeteor !== 0) {
            slots.meteor = dMeteor;
            badges.push({
              id: `meteor-${Date.now()}`,
              icon: "☄️",
              labelZh: "星辰陨铁",
              labelEn: "Meteor Ore",
              delta: dMeteor,
              isDeduction: dMeteor < 0,
            });
          }

          const dPills =
            nextCultivator.inventory.healingPills -
            prevCultivator.inventory.healingPills;
          if (dPills !== 0) {
            slots.pills = dPills;
            badges.push({
              id: `pills-${Date.now()}`,
              icon: "💊",
              labelZh: "回春灵丹",
              labelEn: "Healing Pill",
              delta: dPills,
              isDeduction: dPills < 0,
            });
          }

          const prevSeeds =
            (prevCultivator.inventory.seedBag[1] || 0) +
            (prevCultivator.inventory.seedBag[2] || 0) +
            (prevCultivator.inventory.seedBag[3] || 0);
          const nextSeeds =
            (nextCultivator.inventory.seedBag[1] || 0) +
            (nextCultivator.inventory.seedBag[2] || 0) +
            (nextCultivator.inventory.seedBag[3] || 0);
          const dSeeds = nextSeeds - prevSeeds;
          if (dSeeds !== 0) {
            slots.seeds = dSeeds;
            badges.push({
              id: `seeds-${Date.now()}`,
              icon: "🌱",
              labelZh: "灵草仙种",
              labelEn: "Herb Seed",
              delta: dSeeds,
              isDeduction: dSeeds < 0,
            });
          }

          const dHp = nextCultivator.maxHp - prevCultivator.maxHp;
          if (dHp !== 0) {
            slots.hp = dHp;
            badges.push({
              id: `hp-${Date.now()}`,
              icon: "❤️",
              labelZh: "气血上限",
              labelEn: "Max HP",
              delta: dHp,
              isDeduction: dHp < 0,
            });
          }

          const dAtk = nextCultivator.atk - prevCultivator.atk;
          if (dAtk !== 0) {
            slots.atk = dAtk;
            badges.push({
              id: `atk-${Date.now()}`,
              icon: "🗡️",
              labelZh: "本命攻击",
              labelEn: "Attack",
              delta: dAtk,
              isDeduction: dAtk < 0,
            });
          }

          // 境界等级成长突破与 EXP 增加检测
          if (
            nextCultivator.realm !== prevCultivator.realm ||
            nextCultivator.realmLevel !== prevCultivator.realmLevel
          ) {
            xianxiaAudio.playVictory();
            badges.push({
              id: `realm-${Date.now()}`,
              icon: "🌟",
              labelZh: `${nextCultivator.realm} 突破`,
              labelEn: "Realm Breakthrough",
              delta: nextCultivator.realmLevel,
              isDeduction: false,
            });
            triggerFloatingStat(
              lang === "en"
                ? `🌟 Breakthrough! Reached [${nextCultivator.realm} Lv.${nextCultivator.realmLevel}]!`
                : `🌟 天降祥瑞！道身修为突破至【${nextCultivator.realm}·${nextCultivator.realmLevel}层】！`
            );
          } else {
            const dExp = nextCultivator.exp - prevCultivator.exp;
            if (dExp > 0) {
              badges.push({
                id: `exp-${Date.now()}`,
                icon: "✨",
                labelZh: "真元修为",
                labelEn: "Cultivation EXP",
                delta: dExp,
                isDeduction: false,
              });
            }
          }
        }

        applySnapshotFn = () => {
          if (badges.length > 0) {
            setDeltaBannerItems(badges);
            setSlotDeltas(slots);
            if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
            deltaTimerRef.current = setTimeout(() => {
              setDeltaBannerItems([]);
              setSlotDeltas({});
            }, 3400);

            if (badges.some((b) => b.isDeduction)) {
              xianxiaAudio.playItemDeduct();
            }
          }

          // 触发专项主题音效
          const act = String(payload.action || "");
          if (act === "PLANT_HERB") xianxiaAudio.playPlant();
          else if (act === "WATER_SPIRIT_SPRING") xianxiaAudio.playWater();
          else if (act === "HARVEST_AND_REFINE") xianxiaAudio.playHarvest();
          else if (act === "FORGE_ARTIFACT") xianxiaAudio.playForge();
          else if (
            act === "ROLL_SPIRIT_ROOT" ||
            act === "RESHAPE_DAO_BODY" ||
            act === "RECHARGE_SPIRIT_STONES" ||
            act === "CLAIM_MAIL_ATTACHMENT" ||
            act === "CLAIM_ALL_MAILS"
          ) {
            xianxiaAudio.playHarvest();
          }

          setSnapshot(data.snapshot);
        };

        if (!options?.deferSnapshot) {
          applySnapshotFn();
        }
      }

      // 若后端返回道具或灵石不足等错误，立即弹出醒目警示框并闪烁对应资源槽
      if (data && data.ok === false && data.error) {
        const errMsg = String(data.error);
        const isStonesErr = errMsg.includes("灵石");
        const isIronErr = errMsg.includes("玄铁");
        const isMeteorErr = errMsg.includes("陨铁");
        triggerInsufficientAlert({
          titleZh: isStonesErr
            ? "⚠️ 灵石余额不足 · 无法施展仙术"
            : isIronErr || isMeteorErr
            ? "⚠️ 炼器仙矿不足 · 无法开炉淬剑"
            : "⚠️ 仙门禁制提示",
          titleEn: isStonesErr
            ? "⚠️ Insufficient Spirit Stones"
            : isIronErr || isMeteorErr
            ? "⚠️ Insufficient Forging Ores"
            : "⚠️ Action Blocked",
          detailZh: errMsg,
          detailEn: errMsg,
          missingKey: isStonesErr
            ? "stones"
            : isIronErr
            ? "iron"
            : isMeteorErr
            ? "meteor"
            : "other",
          actionLabelZh: isStonesErr
            ? "💎 立即补充灵石 (+充灵石)"
            : isIronErr || isMeteorErr
            ? "⚔️ 前往云海试炼获取仙矿"
            : undefined,
          actionLabelEn: isStonesErr
            ? "💎 Top Up Spirit Stones"
            : isIronErr || isMeteorErr
            ? "⚔️ Farm Ores in Trial Tower"
            : undefined,
          onQuickResolve: isStonesErr
            ? () => {
                setInsufficientAlert(null);
                setIsRechargeModalOpen(true);
              }
            : isIronErr || isMeteorErr
            ? () => {
                setInsufficientAlert(null);
                setActiveBuilding("REALM");
              }
            : undefined,
        });
      }

      return {
        ...data,
        applySnapshot: applySnapshotFn,
      };
    } finally {
      if (isGlobalBlocking) {
        setLoadingAction(false);
        setActiveLoading(null);
      }
    }
  };

  // 切换或登录 NEAR 账号拉回专属道身修仙档案
  const handleSwitchAccount = async (newAccount: string) => {
    const trimmed = newAccount.trim();
    if (!trimmed) return;
    setActiveAccountId(trimmed);
    setAccountInput(trimmed);
    if (typeof window !== "undefined") {
      localStorage.setItem("dao_near_account", trimmed);
    }
    setIsAccountModalOpen(false);
    setLoadingAction(true);
    setActiveLoading({
      type: "ACCOUNT",
      textZh: `调取【${trimmed}】道身档案中...`,
      textEn: `Loading Archive for ${trimmed}...`,
    });
    try {
      await fetchSnapshot(trimmed);
      triggerFloatingStat(
        t(
          `✨ 已调取【${trimmed}】专属道身档案`,
          `✨ Loaded Cultivator Archive: ${trimmed}`
        )
      );
    } finally {
      setLoadingAction(false);
      setActiveLoading(null);
    }
  };

  // 角色解锁检查判定 (狐妖试炼第5重解锁，魔尊试炼第10重解锁)
  const checkCharacterUnlock = (charId: AvatarClass) => {
    const highestFloor = Math.max(
      snapshot?.cultivator?.highestFloorCleared || 0,
      snapshot?.cultivator?.lifetimeHighestFloorCleared || 0
    );
    if (charId === "fox") {
      const isUnlocked = highestFloor >= 5;
      return {
        unlocked: isUnlocked,
        reasonZh: "需通关【云海试炼】第 5 重解锁九尾灵狐化形",
        reasonEn: "Requires clearing Trial Tower Tier 5 to unlock Fox Maiden",
      };
    }
    if (charId === "demon") {
      const isUnlocked = highestFloor >= 10;
      return {
        unlocked: isUnlocked,
        reasonZh: "需通关【云海试炼】第 10 重降伏心魔解锁九幽魔尊",
        reasonEn: "Requires clearing Trial Tower Tier 10 to unlock Demon Lord",
      };
    }
    return { unlocked: true, reasonZh: "", reasonEn: "" };
  };

  // ==========================================================================
  // 天阙传谕（信箱与领赏）
  // ==========================================================================
  const handleOpenMailbox = () => {
    setIsMailOpen(true);
    if (snapshot?.cultivator?.inbox?.length) {
      const firstUnread = snapshot.cultivator.inbox.find((m) => !m.isRead);
      const targetId = firstUnread?.id || snapshot.cultivator.inbox[0].id;
      setActiveMailId(targetId);
      if (firstUnread) {
        callGameApi({ action: "READ_MAIL", mailId: targetId });
      }
    }
  };

  const handleSelectMail = (mailId: string) => {
    setActiveMailId(mailId);
    callGameApi({ action: "READ_MAIL", mailId });
  };

  const handleClaimMail = async (mailId: string) => {
    setIsClaimingMail(true);
    try {
      const data = await callGameApi({ action: "CLAIM_MAIL_ATTACHMENT", mailId });
      if (data?.ok) {
        triggerFloatingStat(
          t("✨ 奉旨领赏成功 · 仙资已入乾坤袋！", "✨ Claimed Decree Rewards to Bag!")
        );
      }
    } finally {
      setIsClaimingMail(false);
    }
  };

  const handleClaimAllMails = async () => {
    setIsClaimingMail(true);
    try {
      const data = await callGameApi({ action: "CLAIM_ALL_MAILS" });
      if (data?.ok) {
        triggerFloatingStat(
          t("✨ 全部天阙传谕仙资已悉数领受入包！", "✨ Claimed All Decree Rewards!")
        );
      }
    } finally {
      setIsClaimingMail(false);
    }
  };

  const handleClearGenesisFund = async () => {
    try {
      const data = await callGameApi({ action: "CLEAR_GENESIS_FUND" });
      if (data?.ok) {
        triggerFloatingStat(
          t("🏛️ 创世保底注资已剥离，国库完全回归纯真实玩家流水！", "🏛️ Genesis seed fund removed. 100% organic!")
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================================================
  // 1. 创角与道身成长 (支持 0.1 NEAR 洗炼灵根，道身重塑，灵石充值)
  // ==========================================================================
  const handleRollSpiritRootWithNear = async () => {
    setIsRollingSpiritRoot(true);
    try {
      const res = await callGameApi(
        { action: "ROLL_SPIRIT_ROOT" },
        {
          type: "ROOT",
          textZh: "感应天地真机 · 0.1 NEAR 灵根洗炼中...",
          textEn: "Rolling Spirit Root on-chain (0.1 NEAR)...",
        }
      );
      if (res?.ok && res?.actionResult?.spiritRoot) {
        const root = res.actionResult.spiritRoot as SpiritRootDefinition;
        setCreatedSpiritRoot(root);
        triggerFloatingStat(
          t(
            `✨ 觉醒【${root.tier} · ${root.name}】！气血+${root.hpBonusPct}% 攻击+${root.atkBonusPct}% 暴击+${root.critBonusPct}%`,
            `✨ Awakened [${root.tier} ${root.name}]! HP+${root.hpBonusPct}% ATK+${root.atkBonusPct}% Crit+${root.critBonusPct}%`
          )
        );
      }
    } finally {
      setIsRollingSpiritRoot(false);
    }
  };

  const handleReshapeDaoBody = async () => {
    setIsReshaping(true);
    try {
      const res = await callGameApi(
        {
          action: "RESHAPE_DAO_BODY",
          avatarClass: reshapeAvatar,
          daoName: reshapeDaoName.trim() || cultivator.daoName,
          paymentMethod: reshapePayment,
        },
        {
          type: "ROOT",
          textZh: `天火淬形 · 消耗 ${
            reshapePayment === "STONES" ? "200灵石" : "0.5 NEAR"
          } 重塑道身中...`,
          textEn: "Reshaping Dao Body on-chain...",
        }
      );
      if (res?.ok) {
        setIsReshapeModalOpen(false);
        setAvatarClass(reshapeAvatar);
        triggerFloatingStat(
          t(
            `✨ 道身重塑圆满！更迭为【${resolveCharacterConfig(reshapeAvatar).zhName}】`,
            `✨ Reshaped Dao Body to [${resolveCharacterConfig(reshapeAvatar).enName}]`
          )
        );
      } else if (res?.error) {
        triggerFloatingStat(`❌ ${res.error}`);
      }
    } finally {
      setIsReshaping(false);
    }
  };

  const handleRechargeSpiritStones = async (nearAmount: number) => {
    setLoadingAction(true);
    try {
      const res = await callGameApi(
        {
          action: "RECHARGE_SPIRIT_STONES",
          nearAmount,
        },
        {
          type: "ROOT",
          textZh: `真元注池 · 支付 ${nearAmount} NEAR 充值灵石中...`,
          textEn: `Recharging Spirit Stones (${nearAmount} NEAR)...`,
        }
      );
      if (res?.ok) {
        setIsRechargeModalOpen(false);
        triggerFloatingStat(
          t(
            `✨ 成功兑换 ${res.actionResult?.spiritStonesGained} 灵石入乾坤袋！`,
            `✨ Credited ${res.actionResult?.spiritStonesGained} Spirit Stones!`
          )
        );
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStartCultivationJourney = async () => {
    await callGameApi(
      {
        action: "CREATE_CHARACTER",
        daoName: daoNameInput.trim() || "云清浅",
        avatarClass,
        spiritRootName: createdSpiritRoot.name,
      },
      {
        type: "CREATE",
        textZh: "真灵结契上链中...",
        textEn: "Awakening Dao Body...",
      }
    );
    setActiveBuilding("GARDEN");
    setTutorialStage(1);
    triggerFloatingStat(
      t("✨ 道身初成 · 步入太虚云海洞府", "✨ Cultivator Awakened")
    );
  };

  // ==========================================================================
  // 2. 灵田耕种引导 (并发多畦播种解耦，播种 -> 灵泉 -> 采摘炼丹 +气血 HP)
  // ==========================================================================
  const handlePlotClick = async (plotId: number) => {
    if (!snapshot || loadingPlotIds.includes(plotId)) return;
    const plot = snapshot.cultivator.gardenPlots.find(
      (p) => p.plotId === plotId
    );
    if (!plot) return;

    // 播种前预检：若乾坤袋无对应仙种且灵石不足，立即触发醒目不足提示与原位飘字
    if (plot.status === "EMPTY") {
      const seedCfg =
        snapshot.catalogs.herbSeeds.find((s) => s.tier === selectedSeedTier) ||
        snapshot.catalogs.herbSeeds[0];
      const bagSeedCount = snapshot.cultivator.inventory.seedBag[selectedSeedTier] || 0;
      const curStones = snapshot.cultivator.spiritStones;

      if (bagSeedCount <= 0 && curStones < seedCfg.costSpiritStones) {
        triggerPlotFloatingFx(plotId, {
          textZh: `⚠️ 灵石不足 (需 ${seedCfg.costSpiritStones}💎)`,
          textEn: `⚠️ Need ${seedCfg.costSpiritStones}💎 Stones`,
          subTextZh: `当前仅余 ${curStones} 灵石`,
          subTextEn: `Only ${curStones} Stones left`,
          isDeduction: true,
        });
        triggerInsufficientAlert({
          titleZh: `⚠️ 仙资不足 · 无法播下【${seedCfg.name}】`,
          titleEn: `⚠️ Insufficient Stones to Plant [${seedCfg.name}]`,
          detailZh: `采购 ${seedCfg.tier}阶·${seedCfg.name} 仙种需消耗 ${seedCfg.costSpiritStones} 灵石（当前仅余 ${curStones} 灵石，且乾坤袋无该品阶库存仙种）。`,
          detailEn: `Requires ${seedCfg.costSpiritStones} Spirit Stones (Current: ${curStones}, and 0 seeds in bag).`,
          missingKey: "stones",
          actionLabelZh: "💎 立即补充灵石 (+充灵石)",
          actionLabelEn: "💎 Top Up Spirit Stones",
          onQuickResolve: () => {
            setInsufficientAlert(null);
            setIsRechargeModalOpen(true);
          },
        });
        return;
      }
    }

    setLoadingPlotIds((prev) => [...prev, plotId]);
    try {
      if (plot.status === "EMPTY") {
        const seedCfg =
          snapshot.catalogs.herbSeeds.find((s) => s.tier === selectedSeedTier) ||
          snapshot.catalogs.herbSeeds[0];
        const bagSeedCount = snapshot.cultivator.inventory.seedBag[selectedSeedTier] || 0;

        const data = await callGameApi(
          {
            action: "PLANT_HERB",
            plotId,
            seedTier: selectedSeedTier,
          },
          {
            type: "PLOT",
            id: plotId,
            textZh: `畦·${plotId + 1} 播种聚灵上链中...`,
            textEn: `Plot ${plotId + 1} planting seed...`,
          }
        );

        if (data?.ok) {
          triggerPlotFloatingFx(plotId, {
            textZh:
              bagSeedCount > 0
                ? `🔻 消耗仙种 -1 🌱`
                : `🔻 消耗灵石 -${seedCfg.costSpiritStones} 💎`,
            textEn:
              bagSeedCount > 0
                ? `🔻 -1 🌱 Bag Seed`
                : `🔻 -${seedCfg.costSpiritStones} 💎 Stones`,
            subTextZh: `🌱 播下【${seedCfg.name}】`,
            subTextEn: `🌱 Planted ${seedCfg.name}`,
            isDeduction: true,
          });
          if (tutorialStage === 1) setTutorialStage(2);
        }
      } else if (plot.status === "GROWING") {
        if (!plot.wateredWithSpiritSpring) {
          const data = await callGameApi(
            {
              action: "WATER_SPIRIT_SPRING",
              plotId,
            },
            {
              type: "PLOT",
              id: plotId,
              textZh: `畦·${plotId + 1} 灵泉引润上链中...`,
              textEn: `Plot ${plotId + 1} watering dew...`,
            }
          );
          if (data?.ok) {
            triggerPlotFloatingFx(plotId, {
              textZh: `💧 灵泉引润 · 耗时减半`,
              textEn: `💧 Spring Dew · Time -50%`,
              isDeduction: false,
            });
            if (tutorialStage <= 2) setTutorialStage(3);
          }
        } else {
          const rem = plot.remainingGrowSeconds ?? 0;
          triggerFloatingStat(
            t(
              `🌿 灵草正在吸纳天地灵气，尚需 ${rem} 秒方可凝丹成熟！`,
              `Herb absorbing spiritual Qi, ${rem}s remaining to mature!`
            )
          );
        }
      } else if (plot.status === "READY") {
        const prevHp = snapshot.cultivator.maxHp;
        const data = await callGameApi(
          {
            action: "HARVEST_AND_REFINE",
            plotId,
          },
          {
            type: "PLOT",
            id: plotId,
            textZh: `畦·${plotId + 1} 采草炼丹凝气中...`,
            textEn: `Plot ${plotId + 1} refining pill...`,
          }
        );
        if (data?.ok) {
          const newHp = data?.snapshot?.cultivator?.maxHp || prevHp + 50;
          const diffHp = newHp - prevHp;
          triggerPlotFloatingFx(plotId, {
            textZh: `✨ 气血 +${diffHp} ❤️ · 回春丹 +1 💊`,
            textEn: `✨ +${diffHp} ❤️ HP · +1 💊 Pill`,
            isDeduction: false,
          });
          triggerFloatingStat(
            t(`灵丹入体 · 气血上限 +${diffHp} HP`, `Max HP +${diffHp} HP`)
          );

          if (tutorialStage === 3) {
            setTutorialStage(4);
            triggerUnlockNotice(
              t(
                "灵草筑基圆满 · 新仙阁已开启：【天工铸剑阁】（锻造本命飞剑提升攻击力 ATK）",
                "Unlocked New Pavilion: [Spirit Forge] (Craft Flying Swords for +ATK)"
              )
            );
          }
        }
      }
    } finally {
      setLoadingPlotIds((prev) => prev.filter((id) => id !== plotId));
    }
  };

  // ==========================================================================
  // 3. 天工铸剑引导 (+攻击力 ATK，带仙矿/灵石不足提示与剑炉扣减动效)
  // ==========================================================================
  const handleForgeWeapon = async (blueprintId: string) => {
    if (loadingAction || isForgingAnim || !snapshot) return;
    const bp = snapshot.catalogs.forgeBlueprints.find((b) => b.id === blueprintId);
    if (!bp) return;

    const curIron = snapshot.cultivator.inventory.ironOres;
    const curMeteor = snapshot.cultivator.inventory.meteorOres;
    const curStones = snapshot.cultivator.spiritStones;

    const lackIron = Math.max(0, bp.ironOreCost - curIron);
    const lackMeteor = Math.max(0, bp.meteorOreCost - curMeteor);
    const lackStones = Math.max(0, Number((bp.spiritStoneFee - curStones).toFixed(1)));

    // 若材料或灵石不足，立即触发震动音效、闪烁缺口槽位并弹出快捷引导提示
    if (lackIron > 0 || lackMeteor > 0 || lackStones > 0) {
      const missingPartsZh: string[] = [];
      const missingPartsEn: string[] = [];
      if (lackIron > 0) {
        missingPartsZh.push(`还差 ${lackIron} 块⛏️百炼玄铁（需 ${bp.ironOreCost}，当前 ${curIron}）`);
        missingPartsEn.push(`Need ${lackIron} more ⛏️ Iron Ores (${curIron}/${bp.ironOreCost})`);
      }
      if (lackMeteor > 0) {
        missingPartsZh.push(`还差 ${lackMeteor} 块☄️星辰陨铁（需 ${bp.meteorOreCost}，当前 ${curMeteor}）`);
        missingPartsEn.push(`Need ${lackMeteor} more ☄️ Meteor Ores (${curMeteor}/${bp.meteorOreCost})`);
      }
      if (lackStones > 0) {
        missingPartsZh.push(`还差 ${lackStones} 💎灵石火种费（需 ${bp.spiritStoneFee}，当前 ${curStones}）`);
        missingPartsEn.push(`Need ${lackStones} more 💎 Spirit Stones (${curStones}/${bp.spiritStoneFee})`);
      }

      setForgeFloatingFx({
        deductions: [
          lackIron > 0
            ? t(`⚠️ 玄铁矿不足 (${curIron}/${bp.ironOreCost})`, `⚠️ Iron Ore Short (${curIron}/${bp.ironOreCost})`)
            : "",
          lackMeteor > 0
            ? t(`⚠️ 星辰陨铁不足 (${curMeteor}/${bp.meteorOreCost})`, `⚠️ Meteor Ore Short (${curMeteor}/${bp.meteorOreCost})`)
            : "",
          lackStones > 0
            ? t(`⚠️ 灵火费不足 (${curStones}/${bp.spiritStoneFee}💎)`, `⚠️ Spirit Stones Short (${curStones}/${bp.spiritStoneFee}💎)`)
            : "",
        ].filter(Boolean),
        key: Date.now(),
      });
      setTimeout(() => setForgeFloatingFx(null), 2600);

      const primaryMissing: "iron" | "meteor" | "stones" =
        lackIron > 0 ? "iron" : lackMeteor > 0 ? "meteor" : "stones";

      triggerInsufficientAlert({
        titleZh: `⚠️ 锻造材料不足 · 无法开炉铸造【${bp.name}】`,
        titleEn: `⚠️ Insufficient Materials to Forge [${bp.name}]`,
        detailZh: missingPartsZh.join("；") + "。",
        detailEn: missingPartsEn.join("; ") + ".",
        missingKey: primaryMissing,
        actionLabelZh:
          lackIron > 0 || lackMeteor > 0
            ? "⚔️ 前往【云海试炼】斩妖获取仙矿 →"
            : "💎 立即补充灵石 (+充灵石)",
        actionLabelEn:
          lackIron > 0 || lackMeteor > 0
            ? "⚔️ Farm Ores in Cloud Trial Tower →"
            : "💎 Top Up Spirit Stones",
        onQuickResolve: () => {
          setInsufficientAlert(null);
          if (lackIron > 0 || lackMeteor > 0) {
            setActiveBuilding("REALM");
          } else {
            setIsRechargeModalOpen(true);
          }
        },
      });
      return;
    }

    setIsForgingAnim(true);
    const prevAtk = snapshot.cultivator.atk;

    // 立即在八卦剑炉升起明显的材料投入扣减飞字
    const spentItems = [
      `🔻 -${bp.ironOreCost} ⛏️百炼玄铁`,
      ...(bp.meteorOreCost > 0 ? [`🔻 -${bp.meteorOreCost} ☄️星辰陨铁`] : []),
      `🔻 -${bp.spiritStoneFee} 💎灵石火种`,
    ];
    setForgeFloatingFx({
      deductions: spentItems,
      key: Date.now(),
    });

    setTimeout(async () => {
      const data = await callGameApi(
        {
          action: "FORGE_ARTIFACT",
          blueprintId,
        },
        {
          type: "FORGE",
          id: blueprintId,
          textZh: "流云真火淬炼上链中...",
          textEn: "Forging blade on-chain...",
        }
      );
      setIsForgingAnim(false);
      if (data?.ok) {
        const forged = data.actionResult?.artifact;
        const newAtk = data?.snapshot?.cultivator?.atk || prevAtk;
        setForgeFloatingFx({
          deductions: spentItems,
          gainText: t(
            `⚔️ 仙剑出匣【${forged?.name || bp.name}】 · 攻击升至 ${newAtk} ATK`,
            `⚔️ Forged [${trArtifactName(forged?.name || bp.name, "en")}] · ATK ${newAtk}`
          ),
          key: Date.now(),
        });
        setTimeout(() => setForgeFloatingFx(null), 3200);

        triggerFloatingStat(
          t(
            `仙剑出匣【${forged?.name || "飞剑"}】 · 攻击升至 ${newAtk} ATK`,
            `Forged ${trArtifactName(forged?.name, "en")} · ATK ${newAtk}`
          )
        );
        if (tutorialStage === 4) {
          setTutorialStage(5);
          triggerUnlockNotice(
            t(
              "飞剑认主 · 新秘境已开启：【云海试炼塔】（御剑伏魔获取仙矿与灵种）",
              "Unlocked Secret Realm: [Cloud Trial Tower] (2D Boss Combat)"
            )
          );
        }
      }
    }, 600);
  };

  // ==========================================================================
  // 服用回春丹疗伤与气血调息恢复 (Manual Pill Healing & Recovery)
  // ==========================================================================
  const handleConsumeHealingPill = async () => {
    if (!snapshot?.cultivator) return;
    const c = snapshot.cultivator;
    const curHp = c.hp ?? c.maxHp;
    if (curHp >= c.maxHp) {
      triggerFloatingStat(t("道身气血充盈圆满，暂无需服药！", "Life force already full!"));
      return;
    }
    if ((c.inventory.healingPills || 0) <= 0) {
      triggerInsufficientAlert({
        titleZh: "⚠️ 回春丹不足 · 无法吞服疗伤",
        titleEn: "⚠️ No Healing Pills in Bag",
        detailZh:
          "乾坤袋中回春丹已耗尽，请前往【壹·洞府灵圃】采草炼丹，或在洞府静坐挂机调息自动回血！",
        detailEn:
          "No healing pills in bag. Harvest herbs in garden to craft pills, or idle meditate to recover HP!",
        missingKey: "pills",
        actionLabelZh: "🌱 前往【洞府灵圃】采草炼制回春丹 →",
        actionLabelEn: "🌱 Harvest Herbs to Refine Pills →",
        onQuickResolve: () => {
          setInsufficientAlert(null);
          setActiveBuilding("GARDEN");
        },
      });
      return;
    }

    xianxiaAudio.playPillHeal();
    const data = await callGameApi(
      { action: "CONSUME_HEALING_PILL" },
      {
        type: "HEAL",
        id: "pill-heal",
        textZh: "运转太虚真元吞服回春丹...",
        textEn: "Consuming Healing Pill...",
      }
    );
    if (data?.ok) {
      const healed = data.actionResult?.healedHp || 110;
      triggerFloatingStat(
        t(
          `💊 吞服回春丹 · 气血恢复 +${healed} HP！`,
          `💊 Consumed Pill · Restored +${healed} HP!`
        )
      );
    }
  };

  // ==========================================================================
  // 4. 云海秘境 2D 回合斗法动画
  // ==========================================================================
  const handleStartVisualBattle = async (floorNumber: number) => {
    if (isBattling || loadingAction) return;
    setSelectedFloor(floorNumber);
    setBattleResultModal(null);
    const data = await callGameApi(
      {
        action: "CHALLENGE_REALM",
        floor: floorNumber,
      },
      {
        type: "BATTLE",
        id: floorNumber,
        textZh: `御剑出鞘挑战第${floorNumber}重...`,
        textEn: `Challenging Tier ${floorNumber}...`,
      },
      { deferSnapshot: true }
    );
    const report = data?.actionResult?.report;
    if (!report || !report.logs) return;

    setVisualBattleReport(report);
    setIsBattling(true);
    setBattleTurnIdx(0);

    const logs: CombatTurnLog[] = report.logs;
    let idx = 0;

    if (battleTimerRef.current) clearInterval(battleTimerRef.current);

    battleTimerRef.current = setInterval(() => {
      if (idx >= logs.length) {
        if (battleTimerRef.current) clearInterval(battleTimerRef.current);
        setIsBattling(false);
        setHeroAnimState("idle");
        setMonsterAnimState("idle");
        setArenaFloatingDmg(null);

        // 战斗动画完整演示结束后，才更新玩家属性与资源快照，避免提前剧透胜负
        if (data?.applySnapshot) {
          data.applySnapshot();
        }

        if (report.victory) {
          xianxiaAudio.playVictory();
          setBattleResultModal({
            isOpen: true,
            victory: true,
            floor: report.floor,
            monsterName: report.monsterName,
            rewards: report.rewards,
            turnsTaken: report.turnsTaken,
            pillsConsumed: report.pillsConsumed,
          });

          if (tutorialStage === 5) {
            setTutorialStage(6);
            triggerUnlockNotice(
              t(
                "试炼通关 · 仙殿已开启：【肆·问鼎论剑台】与【伍·宗门天榜】（参与 PVP 论剑切磋与每周国库分润）",
                "Pavilions Unlocked: [PVP Duel Arena] & [Heavenly Leaderboards] (50% Sect Treasury Dividends)"
              )
            );
          }
        } else {
          xianxiaAudio.playMonsterAttack();
          setBattleResultModal({
            isOpen: true,
            victory: false,
            floor: report.floor,
            monsterName: report.monsterName,
            turnsTaken: report.turnsTaken,
            pillsConsumed: report.pillsConsumed,
          });
        }
        return;
      }

      const step = logs[idx];
      setBattleTurnIdx(idx + 1);

      if (step.actor === "CULTIVATOR") {
        xianxiaAudio.playSwordSlash(Boolean(step.isCrit));
        setHeroAnimState("attack");
        setMonsterAnimState("hit");
        setArenaFloatingDmg({
          target: "monster",
          text: `-${step.damageDealt} ${step.isCrit ? "剑意暴击" : ""}`,
          tone: step.isCrit ? "gold" : "rose",
        });
      } else if (step.actor === "MONSTER") {
        xianxiaAudio.playMonsterAttack();
        setHeroAnimState("hit");
        setMonsterAnimState("attack");
        setArenaFloatingDmg({
          target: "hero",
          text: `-${step.damageDealt} HP`,
          tone: "rose",
        });
      } else if (step.actor === "PILL_RECOVERY") {
        xianxiaAudio.playPillHeal();
        xianxiaAudio.playItemDeduct();
        setHeroAnimState("heal");
        setMonsterAnimState("idle");
        setSlotDeltas((prev) => ({ ...prev, pills: -1 }));
        setTimeout(() => {
          setSlotDeltas((prev) => {
            const next = { ...prev };
            delete next.pills;
            return next;
          });
        }, 1600);
        setArenaFloatingDmg({
          target: "hero",
          text: `🔻消耗回春丹 -1💊 · 气血 +${step.hpRestored} HP`,
          tone: "jade",
        });
      }

      idx++;
    }, 650);
  };

  // ==========================================================================
  // 5. 问鼎论剑台 12 回合 PVP 斗法演武
  // ==========================================================================
  const handleChallengePvp = async (opponent: PvpDuelOpponent) => {
    if (isPvpAnimating || loadingAction) return;
    setActivePvpOpponent(opponent);
    setIsPvpModalOpen(true);
    setIsPvpAnimating(true);
    setPvpTurnIdx(0);
    setPvpHeroAnim("idle");
    setPvpOpponentAnim("idle");
    setPvpFloatingDmg(null);

    const data = await callGameApi(
      {
        action: "CHALLENGE_PVP_DUEL",
        opponentId: opponent.id,
      },
      {
        type: "ARENA",
        id: opponent.id,
        textZh: `拔剑论剑 · 迎战【${opponent.daoName}】上链中...`,
        textEn: `Challenging ${opponent.daoName}...`,
      },
      { deferSnapshot: true }
    );

    const report: PvpDuelReport | undefined = data?.actionResult?.report;
    if (!report || !report.logs) {
      setIsPvpAnimating(false);
      return;
    }
    setPvpDuelReport(report);

    const logs: PvpTurnLog[] = report.logs;
    let idx = 0;
    if (pvpTimerRef.current) clearInterval(pvpTimerRef.current);

    pvpTimerRef.current = setInterval(() => {
      if (idx >= logs.length) {
        if (pvpTimerRef.current) clearInterval(pvpTimerRef.current);
        setIsPvpAnimating(false);
        setPvpHeroAnim("idle");
        setPvpOpponentAnim("idle");
        setPvpFloatingDmg(null);

        // 论剑推演动画播完后才更新快照与扣减飘字
        if (data?.applySnapshot) {
          data.applySnapshot();
        }

        if (report.victory) {
          xianxiaAudio.playVictory();
          triggerFloatingStat(
            t(
              `🏆 论剑大捷！演武积分 +${report.rewards.duelPointsDelta}，问鼎周天榜位跃升！`,
              `🏆 Duel Victory! +${report.rewards.duelPointsDelta} Pts`
            )
          );
        } else {
          xianxiaAudio.playMonsterAttack();
          triggerFloatingStat(
            t(
              `论剑惜败！扣除 ${Math.abs(report.rewards.duelPointsDelta)} 演武积分，请淬炼飞剑后再战！`,
              `Duel Defeat! ${report.rewards.duelPointsDelta} Pts`
            )
          );
        }
        return;
      }

      const step = logs[idx];
      setPvpTurnIdx(idx + 1);

      if (step.actionText.includes("丹") || (step.hpRestored && step.hpRestored > 0)) {
        xianxiaAudio.playPillHeal();
        setPvpHeroAnim("heal");
        setPvpOpponentAnim("idle");
        setPvpFloatingDmg({
          target: "hero",
          text: `灵丹回春 +${step.hpRestored} HP`,
          tone: "jade",
        });
      } else if (
        step.attackerName.includes(snapshot?.cultivator?.daoName || "") ||
        step.defenderName.includes(opponent.daoName)
      ) {
        xianxiaAudio.playSwordSlash(Boolean(step.isCrit));
        setPvpHeroAnim("attack");
        setPvpOpponentAnim("hit");
        setPvpFloatingDmg({
          target: "opponent",
          text: `-${step.damageDealt} ${step.isCrit ? "暴击!" : ""}`,
          tone: step.isCrit ? "gold" : "rose",
        });
      } else {
        xianxiaAudio.playMonsterAttack();
        setPvpHeroAnim("hit");
        setPvpOpponentAnim("attack");
        setPvpFloatingDmg({
          target: "hero",
          text: `-${step.damageDealt} ${step.isCrit ? "暴击!" : ""}`,
          tone: "rose",
        });
      }

      idx++;
    }, 700);
  };

  if (!snapshot) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative">
        <StarlightCloudCanvas />
        <div className="relative z-10 flex flex-col items-center gap-3 text-[#3E635C] px-4 text-center">
          <Sparkles className="w-8 h-8 animate-spin text-[#B89758]" />
          <p className="text-base tracking-widest font-medium">
            {t("云海灵脉开启中 · 聚气归元...", "Awakening Celestial Realm...")}
          </p>
          {fetchError && (
            <div className="mt-2 flex flex-col items-center gap-2 max-w-sm">
              <p className="text-xs font-serif text-[#8A5A12] bg-[#FAF3E0] px-3.5 py-1.5 border border-[#C8AA72]/60 shadow-2xs">
                {fetchError}
              </p>
              <button
                type="button"
                onClick={() => fetchSnapshot()}
                className="xianxia-btn-gold px-4 py-1.5 text-xs font-serif font-bold cursor-pointer shadow-xs hover:scale-105 transition"
              >
                {t("手动重试唤醒灵脉 (Retry)", "Retry Connection")}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const { cultivator, treasury, latestBattleReport, catalogs } = snapshot;

  // ==========================================================================
  // 画面一：白玉琉璃风 · 创角悬浮大屏 (tutorialStage === 0)
  // ==========================================================================
  if (tutorialStage === 0) {
    const activeRoot = SPIRIT_ROOTS[spiritRootIdx];
    const selectedCharCfg = resolveCharacterConfig(avatarClass);
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-3 sm:p-6 select-none pt-12 sm:pt-14">
        <StarlightCloudCanvas />

        {/* 顶部极窄通栏 (Top 36px System Bar) */}
        <div className="w-full fixed top-0 left-0 right-0 z-40 xianxia-dark-bar h-9 flex items-center justify-between px-4 sm:px-8 text-xs">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt={t("仙途寻道", "DaoAscension")}
              className="site-logo h-[22px] w-[22px] shrink-0"
            />
            <span className="text-[#C8AA72] font-serif font-bold tracking-widest text-[13px]">
              太虚仙宗 · 问道天关
            </span>
            <span className="text-[#4F736C]">|</span>
            <span className="text-[#8AB8AF] font-mono text-[11px] hidden sm:inline">
              NEAR Protocol NEP-413
            </span>
          </div>
          <div className="flex items-center gap-3 font-serif">
            {/* NEAR 账号切换与道身归位 */}
            <button
              type="button"
              onClick={() => {
                setAccountInput(activeAccountId);
                setIsAccountModalOpen(true);
              }}
              className="text-[#E0C99B] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5 px-2 py-0.5 border border-[#C8AA72]/50 bg-[#162724] shadow-xs"
              title="绑定或切换自己的 NEAR 账号，拉回专属道身修仙档案"
            >
              <User className="w-3.5 h-3.5 text-[#5FE3C8]" />
              <span className="font-mono text-[11px] text-[#5FE3C8] truncate max-w-[120px] sm:max-w-none">
                {activeAccountId}
              </span>
              <span className="text-[10px] text-[#C8AA72] font-serif border-l border-[#C8AA72]/40 pl-1">
                {t("切换道身", "Switch")}
              </span>
            </button>
            <span className="text-[#4F736C]">|</span>
            <Link
              href={lang === "en" ? "/guide?lang=en" : "/guide"}
              className="text-[#C8AA72] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t("产品介绍", "Product")}</span>
            </Link>
            <span className="text-[#4F736C]">|</span>
            <button
              onClick={() => setLang((prev) => (prev === "zh" ? "en" : "zh"))}
              className="text-[#C8AA72] hover:text-[#FFFFFF] transition-colors font-mono"
            >
              {lang === "zh" ? "EN" : "中文"}
            </button>
          </div>
        </div>

        {/* 中央半透白玉琉璃浮空面板 (带顶扣与两侧流苏坠饰，去除 SaaS 大白圆角) */}
        <JadeGlassPanel
          withTopClasp
          withTassels
          className="max-w-4xl w-full p-6 sm:p-8 z-10 my-4"
        >
          {/* 顶部仙门标题区 */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 border border-[#C8AA72]/60 bg-white/75 text-[#7A5E2F] text-xs font-serif tracking-[0.25em]">
              <CinnabarSeal text="初" variant="square" className="w-4 h-4 text-[9px]" />
              <span>{t("太虚仙门 · 问道初章", "CELESTIAL SECT · CHAPTER I")}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#253D39] tracking-[0.2em] mt-2">
              {t("仙途寻道 · 凝练本命道身", "Awaken Your Immortal Form")}
            </h1>
            <p className="text-xs sm:text-sm text-[#587570] font-serif mt-1 tracking-wider">
              {t(
                "云海之上，白玉为凭 · 择五大国风仙侠道身，随上古仙尊指引开启灵圃、剑庐、秘境与天榜",
                "Atop the misty cloud sea · Choose from 5 iconic Xianxia characters to begin your Dao journey"
              )}
            </p>
          </div>

          <CloudDivider className="my-3" />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            {/* 左侧：白玉莲台高精国风人物立绘预览 (带竖排称号与朱砂印) */}
            <div className="md:col-span-5 bg-white/70 border border-[#C8AA72]/50 p-4 flex flex-col items-center justify-between relative shadow-sm">
              <div className="w-full flex items-center justify-between text-[11px] font-serif text-[#587570] border-b border-[#C8AA72]/30 pb-1.5">
                <span>{t("初始境界", "Initial Realm")}</span>
                <span className="flex items-center gap-1 text-[#2E5C53] font-bold">
                  <CinnabarSeal text="壹" variant="rect" />
                  {t("练气期 · 一层", "Qi Cond. · Lv.1")}
                </span>
              </div>

              {/* 立绘与侧边竖排称号 */}
              <div className="my-2 relative flex items-center justify-center w-full">
                <CultivatorSprite
                  avatarClass={avatarClass}
                  hasWeapon={avatarClass === "sword"}
                  weaponTier={1}
                  size="lg"
                />
                {/* 侧边竖排古典称号 */}
                <div className="absolute right-1 top-2 flex flex-col items-center gap-1 pointer-events-none">
                  <CinnabarSeal text="真" variant="square" />
                  <div className="vertical-rl font-serif font-bold text-[11px] text-[#253D39] tracking-[0.2em] bg-white/80 py-1 px-0.5 border border-[#C8AA72]/40 shadow-xs">
                    {selectedCharCfg.zhName}
                  </div>
                </div>
              </div>

              <div className="text-center w-full mt-1 font-serif">
                <div className="text-lg font-bold text-[#253D39] tracking-widest">
                  {daoNameInput || "云清浅"}
                </div>
                <div className="mt-1 text-[11px] px-2.5 py-0.5 border border-[#C8AA72]/50 bg-[#F7F2E7] text-[#7A5C29] inline-block font-mono">
                  {lang === "en" ? activeRoot.en : activeRoot.zh}
                </div>
                <p className="text-[11px] text-[#526E69] mt-2 leading-relaxed px-1">
                  {t(selectedCharCfg.zhPromptLore, selectedCharCfg.enPromptLore)}
                </p>
              </div>

              {/* 古籍三属性预览 (严格使用 tabular-nums) */}
              <div className="w-full grid grid-cols-3 gap-1 mt-3 pt-2.5 border-t border-[#C8AA72]/30 text-center font-serif text-xs">
                <div className="border-r border-[#C8AA72]/30">
                  <div className="text-[#64827D] text-[10px]">
                    {t("气血上限", "Max HP")}
                  </div>
                  <div className="font-mono font-bold text-[#2E6B5E] text-sm tabular-nums mt-0.5">
                    {selectedCharCfg.baseHp}
                  </div>
                </div>
                <div className="border-r border-[#C8AA72]/30">
                  <div className="text-[#64827D] text-[10px]">
                    {t("本命攻击", "Base ATK")}
                  </div>
                  <div className="font-mono font-bold text-[#8A6934] text-sm tabular-nums mt-0.5">
                    {selectedCharCfg.baseAtk}
                  </div>
                </div>
                <div>
                  <div className="text-[#64827D] text-[10px]">
                    {t("暴击 / 护体", "Crit / DEF")}
                  </div>
                  <div className="font-mono font-bold text-[#5C4B7D] text-sm tabular-nums mt-0.5">
                    {selectedCharCfg.critPct}% / {selectedCharCfg.def}
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：三步清雅创角选项 (五大国风人物原画瓦片) */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-3.5">
              {/* NEAR 测试网钱包绑定状态横幅 */}
              {signedAccountId ? (
                <div className="bg-[#122A25] border border-[#52D1B2]/60 px-3 py-2 flex items-center justify-between text-xs font-serif shadow-xs">
                  <div className="flex items-center gap-2 text-[#5FE3C8]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#52D1B2] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3BB89A]"></span>
                    </span>
                    <span className="font-bold">{t("测试网钱包已结契：", "Testnet Wallet Connected:")}</span>
                    <span className="font-mono text-[#E0C99B] font-bold">{signedAccountId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleWalletDisconnect}
                    className="text-[10px] text-[#A2C4BD] hover:text-[#FFFFFF] underline"
                  >
                    {t("断开", "Disconnect")}
                  </button>
                </div>
              ) : (
                <div className="bg-[#1A2520] border border-[#C8AA72]/60 p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-serif shadow-xs">
                  <div className="flex items-center gap-2 text-[#F2CE85]">
                    <Wallet className="w-4 h-4 text-[#5FE3C8]" />
                    <span>
                      {t(
                        "连接 NEAR 测试网钱包，道身 NFT 将永久归属于您的链上地址",
                        "Connect NEAR Testnet wallet to bind NFT to your address"
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleWalletConnect}
                    className="xianxia-btn-gold px-3 py-1 font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#7D5E2A]" />
                    <span>{t("连接测试网钱包", "Connect Wallet")}</span>
                  </button>
                </div>
              )}

              {/* 1. 道号 */}
              <div>
                <label className="block text-xs font-serif font-bold text-[#476660] tracking-wider mb-1">
                  {t("一 · 赐予仙门道号", "I · Inscribe Your Dao Name")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={daoNameInput}
                    onChange={(e) => setDaoNameInput(e.target.value)}
                    maxLength={14}
                    className="flex-1 px-3 py-1.5 bg-white/90 border border-[#C8AA72]/65 text-sm font-serif font-semibold text-[#253D39] focus:outline-none focus:border-[#73A499]"
                    placeholder={t("输入清雅道号...", "Enter Dao Name...")}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next =
                        RANDOM_DAO_NAMES_ZH[
                          Math.floor(Math.random() * RANDOM_DAO_NAMES_ZH.length)
                        ];
                      setDaoNameInput(next);
                    }}
                    className="xianxia-btn-celadon px-3 py-1.5 text-xs font-serif shrink-0 font-medium"
                  >
                    {t("随机雅号", "Random")}
                  </button>
                </div>
              </div>

              {/* 2. 五大国风仙侠人物形象选择 (中式牌匾卡片，去 rounded-2xl) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-serif font-bold text-[#476660] tracking-wider">
                    {t(
                      "二 · 择定仙门道身（五大国风立绘）",
                      "II · Choose Immortal Character Portrait"
                    )}
                  </label>
                  <span className="text-[11px] font-serif text-[#7A5E2F]">
                    {t(selectedCharCfg.zhTrait, selectedCharCfg.enTrait)}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {XIANXIA_CHARACTER_ROSTER.map((charItem) => {
                    const selected = selectedCharCfg.id === charItem.id;
                    const unlockInfo = checkCharacterUnlock(charItem.id);
                    return (
                      <button
                        key={charItem.id}
                        type="button"
                        onClick={() => {
                          if (!unlockInfo.unlocked) {
                            triggerFloatingStat(
                              t(`🔒 ${unlockInfo.reasonZh}`, `🔒 ${unlockInfo.reasonEn}`)
                            );
                            return;
                          }
                          setAvatarClass(charItem.id);
                        }}
                        className={`group p-1 border text-center transition-all flex flex-col items-center relative ${
                          !unlockInfo.unlocked
                            ? "bg-stone-100/60 border-stone-300 opacity-60 cursor-not-allowed"
                            : selected
                            ? "bg-white border-[#B89452] ring-2 ring-[#C5A46A]/50 shadow-sm"
                            : "bg-white/60 border-[#C8AA72]/40 hover:bg-white/90"
                        }`}
                      >
                        {selected && (
                          <div className="absolute top-0.5 right-0.5 z-10">
                            <CinnabarSeal text="选" variant="rect" className="text-[8px] px-0.5" />
                          </div>
                        )}
                        {!unlockInfo.unlocked && (
                          <div className="absolute top-0.5 right-0.5 z-10 bg-black/60 px-1 py-0.5 flex items-center gap-0.5 text-[8px] text-[#FFDE99] font-serif shadow-xs">
                            <Lock className="w-2.5 h-2.5" />
                            <span>{t("封印", "Lock")}</span>
                          </div>
                        )}
                        <div className="w-full aspect-[4/5] overflow-hidden border border-[#C8AA72]/30 bg-[#EDF5F3] mb-1">
                          <img
                            src={charItem.imageSrc}
                            alt={charItem.zhName}
                            className={`w-full h-full object-cover object-top transition-transform duration-300 ${
                              !unlockInfo.unlocked ? "grayscale" : "group-hover:scale-105"
                            }`}
                          />
                        </div>
                        <div className="text-[11px] font-serif font-bold text-[#253D39] leading-tight truncate w-full">
                          {t(
                            charItem.zhName.replace(/^.{2}/, ""),
                            charItem.enName.split(" ").slice(-1)[0]
                          )}
                        </div>
                        <div className="text-[9px] font-serif text-[#64827D] mt-0.5 truncate w-full">
                          {t(charItem.zhTitle.split(" · ")[1], charItem.id)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. 先天灵根（初始凡品，支持 0.1 NEAR 洗炼词条） */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-serif font-bold text-[#476660] tracking-wider">
                    {t("三 · 感应先天灵根", "III · Awaken Innate Spirit Root")}
                  </label>
                  <button
                    type="button"
                    onClick={handleRollSpiritRootWithNear}
                    disabled={isRollingSpiritRoot}
                    className="text-xs font-serif text-[#7D6030] hover:text-[#5E451D] font-medium flex items-center gap-1 px-1.5 py-0.5 border border-[#C8AA72]/50 bg-[#FBF7ED]"
                    title="支付 0.1 NEAR 洗炼高阶天道词条 (玄品 30%, 地品 14%, 天品 5%, 仙品 1%)"
                  >
                    <RefreshCw
                      className={`w-3 h-3 text-[#A87932] ${
                        isRollingSpiritRoot ? "animate-spin" : ""
                      }`}
                    />
                    <span>{t("感应洗炼 (0.1 NEAR)", "Wash Root (0.1 NEAR)")}</span>
                  </button>
                </div>
                <div
                  className={`px-3 py-2 border text-xs font-serif font-medium flex flex-col gap-1 ${
                    createdSpiritRoot.badgeStyle ||
                    "border-[#8A9591] text-[#4A5552] bg-[#EFEFEF]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono">
                      {createdSpiritRoot.tier} · {createdSpiritRoot.name}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#A67838]">
                      {createdSpiritRoot.tier === "凡品"
                        ? t("凡根资质 · 0%加成", "Ordinary · 0% Bonus")
                        : `+${createdSpiritRoot.hpBonusPct}% HP · +${createdSpiritRoot.atkBonusPct}% ATK`}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#657873] leading-relaxed">
                    {createdSpiritRoot.lore}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#7A938E] mt-1 px-0.5">
                  <span>
                    {t(
                      "默认五行凡根 · 需支付 0.1 NEAR 随机刷高级词条",
                      "Default Ordinary · 0.1N to roll high tiers"
                    )}
                  </span>
                  <span className="font-mono text-[#A87932]">
                    仙品1% | 天品5% | 地品14% | 玄品30%
                  </span>
                </div>
              </div>

              {/* 步入仙途按钮 (折沿金边按钮) */}
              <div className="pt-1">
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={handleStartCultivationJourney}
                  className="xianxia-btn-gold w-full py-3 font-serif font-bold text-sm tracking-[0.25em] flex items-center justify-center gap-2 shadow-md min-h-[46px]"
                >
                  {activeLoading?.type === "CREATE" ? (
                    <XianxiaLoadingRing text={activeLoading.textZh} size="sm" tone="light" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#7D5E2A]" />
                      <span>
                        {t(
                          "步入云海洞府 · 开启修仙之旅",
                          "Enter Celestial Abode · Start Journey"
                        )}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </JadeGlassPanel>
      </div>
    );
  }

  // ==========================================================================
  // 画面二：白玉琉璃浮空 HUD 主界面 (一步一步解锁洞府建筑)
  // ==========================================================================
  const forgeUnlocked = tutorialStage >= 4;
  const realmUnlocked = tutorialStage >= 5;
  const arenaUnlocked =
    tutorialStage >= 6 ||
    (snapshot.cultivator.highestFloorCleared >= 1);
  const treasuryUnlocked =
    tutorialStage >= 6 ||
    (snapshot.cultivator.highestFloorCleared >= 1);

  const getQuestGuideInfo = () => {
    switch (tutorialStage) {
      case 1:
        return {
          stepText: t("仙途初引 · 壹", "Guide · Step I"),
          title: t("开垦白玉灵畦 · 播下第一株灵草", "Plant Your First Spirit Herb"),
          desc: t(
            "玄机师尊：『修行之本在于气血。请轻触下方泛光的【一號白玉灵畦】，播下灵草仙种。』",
            "Elder Xuanji: 'Click the glowing [Plot #1] to plant your first spiritual herb seed.'"
          ),
        };
      case 2:
        return {
          stepText: t("仙途初引 · 贰", "Guide · Step II"),
          title: t("引九天清露 · 润泽灵芽", "Irrigate with Celestial Dew"),
          desc: t(
            "玄机师尊：『灵芽初绽，再触【一號灵畦】引灵泉浇灌，顷刻便可灵气盈满。』",
            "Elder Xuanji: 'Click [Plot #1] again to irrigate with celestial spring water for instant maturity.'"
          ),
        };
      case 3:
        return {
          stepText: t("仙途初引 · 叁", "Guide · Step III"),
          title: t("采摘入丹炉 · 凝练气血金丹 (+HP)", "Harvest & Refine Vitality Pill (+HP)"),
          desc: t(
            "玄机师尊：『仙葩已熟，轻触采摘炼丹服下，可永久增长道身【气血上限 HP】，并开启天工剑庐。』",
            "Elder Xuanji: 'Click [Plot #1] to refine the pill! It permanently increases Max HP and unlocks the Sword Forge.'"
          ),
        };
      case 4:
        return {
          stepText: t("仙途初引 · 肆", "Guide · Step IV"),
          title: t("移步【天工剑庐】 · 铸造本命飞剑 (+ATK)", "Enter Sword Forge & Craft Flying Sword (+ATK)"),
          desc: t(
            "玄机师尊：『气血既充，当修剑道。请切换至【贰 · 天工剑庐】，熔炼玄铁铸造【青竹蜂云剑】提升攻击力。』",
            "Elder Xuanji: 'Switch to [II · Sword Forge] and craft the Azure Bamboo Sword to boost your ATK.'"
          ),
        };
      case 5:
        return {
          stepText: t("仙途初引 · 伍", "Guide · Step V"),
          title: t("登临【云海试炼塔】 · 御剑降伏玄灵", "Challenge the Cloud Trial Tower"),
          desc: t(
            "玄机师尊：『宝剑生辉！请切换至【叁 · 云海试炼】，降伏一层守护玄兽以获取仙矿，开启宗门天榜。』",
            "Elder Xuanji: 'Switch to [III · Trial Tower] and defeat Floor 1 Guardian to unlock the Heaven Leaderboards.'"
          ),
        };
      default:
        return {
          stepText: t("仙门大成 · 逍遥游", "All Pavilions Unlocked"),
          title: t("四阁皆开 · 种药炼丹、铸剑试炼、问鼎三榜", "Cultivate Herbs, Craft Swords & Ascend the 3 Heaven Boards"),
          desc: t(
            "玄机师尊：『徒儿已通晓【灵田增气血 · 炼器增攻击 · 秘境获仙矿 · 国库五成分润三榜】之道，尽情游历吧。』",
            "Elder Xuanji: 'All pavilions are open! Grow rare herbs (+HP), forge Mythic Swords (+ATK), and claim 50% of the Sect Treasury.'"
          ),
        };
    }
  };

  const guideInfo = getQuestGuideInfo();

  return (
    <div className="min-h-screen relative flex flex-col items-center pb-28 sm:pb-36 px-3 sm:px-6 select-none pt-12 sm:pt-14">
      <StarlightCloudCanvas />

      {/* 0. 链上操作全局非侵入式微芒浮标 */}
      {activeLoading && (
        <div className="fixed top-11 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fadeIn">
          <div className="bg-[#12221F]/95 border border-[#C8AA72] px-4 py-1.5 shadow-2xl flex items-center gap-2.5 backdrop-blur-md">
            <XianxiaLoadingRing text="" size="sm" />
            <span className="text-xs font-serif text-[#F2CE85] tracking-wider font-semibold">
              {lang === "en" ? activeLoading.textEn : activeLoading.textZh}
            </span>
            <span className="text-[10px] font-mono text-[#86ABA3] opacity-80 hidden sm:inline">
              (NEAR NEP-413 ed25519 自动签名上链)
            </span>
          </div>
        </div>
      )}

      {/* 0.5 醒目道具扣减与属性获得游戏飘字横幅 (100% 纯实色不透明国风玉牌，字迹清晰锐利) */}
      {deltaBannerItems.length > 0 && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-wrap items-center justify-center gap-2.5 px-4 max-w-2xl">
          {deltaBannerItems.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: item.isDeduction ? "#2D0808" : "#0D2B24",
              }}
              className={`px-4 py-2 border-2 shadow-2xl flex items-center gap-2.5 font-serif animate-bounce ${
                item.isDeduction
                  ? "border-[#F87171] text-[#FFFFFF] ring-2 ring-[#DC2626]"
                  : "border-[#C8AA72] text-[#FFFFFF] ring-2 ring-[#34D399]"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span
                className={`text-[11px] px-2 py-0.5 font-bold tracking-wider ${
                  item.isDeduction
                    ? "bg-[#DC2626] text-white"
                    : "bg-[#10B981] text-[#052E24]"
                }`}
              >
                {item.isDeduction ? t("🔻 道具消耗", "🔻 SPENT") : t("✨ 仙缘获得", "✨ GAINED")}
              </span>
              <span className="text-xs sm:text-sm font-bold tracking-wide text-white">
                {lang === "en" ? item.labelEn : item.labelZh}
              </span>
              <span
                className={`font-mono text-base sm:text-lg font-extrabold tabular-nums ${
                  item.isDeduction ? "text-[#FCA5A5]" : "text-[#FDE68A]"
                }`}
              >
                {item.delta > 0 ? `+${item.delta}` : item.delta}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 0.6 仙资/道具不足国风玉轴弹窗 (纯实色宣纸白玉卷轴风格，高对比度清晰易读) */}
      {insufficientAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn"
          onClick={() => {
            setInsufficientAlert(null);
            setMissingSlotKey(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <JadeGlassPanel
              withTopClasp
              withTassels
              className="p-5 sm:p-6 font-serif shadow-2xl border-2 border-[#C8AA72] !bg-[#FFFDF7]"
            >
              {/* 弹窗顶栏 */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#C8AA72]/50">
                <div className="flex items-center gap-2">
                  <CinnabarSeal text="警" variant="rect" />
                  <h3 className="text-base font-bold text-[#253D39] tracking-wider">
                    {t("仙门法旨 · 仙资道具不足", "Sect Notice · Insufficient Resources")}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setInsufficientAlert(null);
                    setMissingSlotKey(null);
                  }}
                  className="text-[#64827D] hover:text-[#253D39] transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 缺失项主标题横幅 (深墨绿金字牌匾) */}
              <div
                style={{ backgroundColor: "#162724" }}
                className="mt-3 px-3.5 py-2.5 border border-[#C8AA72] flex items-center gap-2 text-xs sm:text-sm font-bold text-[#F2CE85]"
              >
                <span>
                  {lang === "en" ? insufficientAlert.titleEn : insufficientAlert.titleZh}
                </span>
              </div>

              {/* 缺失数量与当前余额高对比度宣纸框 */}
              <div
                style={{ backgroundColor: "#FFF5F5" }}
                className="my-3 p-3.5 border-2 border-[#DC2626]/70 text-[#7F1D1D] text-xs sm:text-sm font-bold leading-relaxed shadow-inner"
              >
                {lang === "en" ? insufficientAlert.detailEn : insufficientAlert.detailZh}
              </div>

              {/* 底部操作按钮组 */}
              <div className="pt-2.5 border-t border-[#C8AA72]/35 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setInsufficientAlert(null);
                    setMissingSlotKey(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-serif font-bold text-[#476660] hover:text-[#253D39] border border-[#C8AA72]/60 bg-white"
                >
                  {t("暂且返回", "Dismiss")}
                </button>
                {insufficientAlert.onQuickResolve && (
                  <button
                    type="button"
                    onClick={insufficientAlert.onQuickResolve}
                    className="xianxia-btn-gold px-4 py-1.5 text-xs font-serif font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#7D5E2A]" />
                    <span>
                      {lang === "en"
                        ? insufficientAlert.actionLabelEn
                        : insufficientAlert.actionLabelZh}
                    </span>
                  </button>
                )}
              </div>
            </JadeGlassPanel>
          </div>
        </div>
      )}

      {/* 1. 顶部极窄通栏 (Top 36px System Bar，含古琴仙乐与战斗音效开关) */}
      <div className="w-full fixed top-0 left-0 right-0 z-40 xianxia-dark-bar h-9 flex items-center justify-between px-3 sm:px-8 text-xs">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt={t("仙途寻道", "DaoAscension")}
            className="site-logo h-[22px] w-[22px] shrink-0"
          />
          <span className="text-[#C8AA72] font-serif font-bold tracking-widest text-[13px] whitespace-nowrap">
            太虚仙宗 · 问道天关
          </span>
          <span className="text-[#4F736C] hidden sm:inline">|</span>
          {/* 仙乐 BGM 与点击战斗音效控制组 */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleBgm}
              className={`px-2 py-0.5 border text-[11px] font-serif flex items-center gap-1 transition whitespace-nowrap ${
                bgmPlaying
                  ? "bg-[#1A3831] border-[#52D1B2] text-[#5FE3C8]"
                  : "bg-[#162724] border-[#C8AA72]/40 text-[#86ABA3] hover:text-white"
              }`}
              title="开启/关闭五声音阶古琴洞天背景仙乐"
            >
              <Music className={`w-3 h-3 ${bgmPlaying ? "animate-spin" : ""}`} />
              <span>{bgmPlaying ? t("仙乐·鸣", "BGM ON") : t("仙乐·静", "BGM OFF")}</span>
            </button>
            <button
              type="button"
              onClick={handleToggleSfx}
              className={`px-2 py-0.5 border text-[11px] font-serif flex items-center gap-1 transition whitespace-nowrap ${
                sfxEnabled
                  ? "bg-[#1A3831] border-[#C8AA72]/70 text-[#F2CE85]"
                  : "bg-[#162724] border-[#C8AA72]/30 text-[#6F8E88]"
              }`}
              title="开启/关闭点击、铸剑、飞剑斩击与扣减音效"
            >
              {sfxEnabled ? (
                <Volume2 className="w-3 h-3 text-[#F2CE85]" />
              ) : (
                <VolumeX className="w-3 h-3 text-[#6F8E88]" />
              )}
              <span className="hidden md:inline">
                {sfxEnabled ? t("音效·开", "SFX ON") : t("音效·关", "SFX OFF")}
              </span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 font-serif">
          {/* NEAR 测试网钱包状态与直连 */}
          {signedAccountId ? (
            <button
              type="button"
              onClick={() => {
                setAccountInput(signedAccountId);
                setIsAccountModalOpen(true);
              }}
              className="text-[#E0C99B] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5 px-2 py-0.5 border border-[#52D1B2] bg-[#112622] shadow-xs whitespace-nowrap"
              title="已连接 NEAR 测试网钱包，点击查看详情或切换"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#52D1B2] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3BB89A]"></span>
              </span>
              <span className="font-mono text-[11px] text-[#5FE3C8] truncate max-w-[100px] sm:max-w-none">
                {signedAccountId}
              </span>
              <span className="text-[10px] text-[#52D1B2] font-serif border-l border-[#52D1B2]/40 pl-1">
                {t("已结契", "Connected")}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleWalletConnect}
                className="xianxia-btn-gold px-2 py-0.5 text-xs font-bold shadow-xs flex items-center gap-1 whitespace-nowrap"
                title="一键连接官方 NEAR 测试网钱包 (支持 Meteor, MyNearWallet, HERE 等)"
              >
                <Wallet className="w-3.5 h-3.5 text-[#7D5E2A]" />
                <span className="font-serif tracking-wider text-[#253D39]">
                  {t("连接钱包", "Connect Wallet")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountInput(activeAccountId);
                  setIsAccountModalOpen(true);
                }}
                className="text-[#A2C4BD] hover:text-[#FFFFFF] transition-colors flex items-center gap-1 px-1.5 py-0.5 border border-[#C8AA72]/40 bg-[#162724] text-[10px] font-mono whitespace-nowrap"
                title="免钱包直接体验：输入或切换指定账号档案"
              >
                <User className="w-3 h-3 text-[#5FE3C8]" />
                <span className="truncate max-w-[75px] sm:max-w-none">{activeAccountId}</span>
              </button>
            </div>
          )}
          {/* 天阙传谕 · 飞剑传书信箱入口 */}
          <button
            type="button"
            onClick={handleOpenMailbox}
            className="text-[#E0C99B] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5 relative px-2 py-0.5 border border-[#C8AA72]/50 bg-[#162724] shadow-xs whitespace-nowrap"
            title="查看天阙传谕、周榜结算法旨与仙资附件"
          >
            <Mail className="w-3.5 h-3.5 text-[#F2CE85]" />
            <span className="font-serif tracking-wider font-semibold hidden sm:inline">
              {t("天阙传谕", "Decrees")}
            </span>
            {cultivator.unreadMailCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#E64242] animate-ping" />
                <span className="px-1 py-0 bg-[#A82E2E] text-white text-[10px] font-mono font-bold leading-none">
                  {cultivator.unreadMailCount}
                </span>
              </span>
            )}
          </button>
          {/* 仙资收支总账入口 */}
          <button
            type="button"
            onClick={() => setIsFinancialModalOpen(true)}
            className="text-[#E0C99B] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5 px-2 py-0.5 border border-[#C8AA72]/60 bg-[#162724] shadow-xs whitespace-nowrap"
            title="查看太虚仙宗仙资御道收支簿（NEAR 累计消耗投入与周榜赚取分润总账）"
          >
            <Coins className="w-3.5 h-3.5 text-[#F2CE85]" />
            <span className="font-serif text-[11px] text-[#F2CE85] hidden sm:inline">
              {t("仙资总账", "Ledger")}
            </span>
            <span className="font-mono text-[10.5px] text-[#86ABA3]">
              -{(cultivator.financialStats?.totalNearSpent || 0.2).toFixed(1)}N / +{(cultivator.financialStats?.totalNearEarned || 0).toFixed(1)}N
            </span>
          </button>
          {/* 宗门国库司库总账入口 */}
          <button
            type="button"
            onClick={() => setIsTreasuryModalOpen(true)}
            className="text-[#E0C99B] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5 px-2 py-0.5 border border-[#C8AA72]/60 bg-[#162724] shadow-xs whitespace-nowrap"
            title="查看宗门国库现存资产、收入来源拆解与四大天榜分配实况"
          >
            <span className="text-xs">🏛️</span>
            <span className="font-serif text-[11px] text-[#E0C99B] hidden md:inline">
              {t("宗门国库", "Treasury")}
            </span>
            <span className="font-mono text-[10.5px] text-[#5FE3C8] font-bold">
              {(treasury.totalTreasurySpiritStones / 50).toFixed(2)}N
            </span>
          </button>
          {/* 灵石与 NEAR 汇率指示器与充值入口 */}
          <button
            type="button"
            onClick={() => setIsRechargeModalOpen(true)}
            className="text-[#F2CE85] hover:text-[#FFFFFF] transition-colors flex items-center gap-1 px-2 py-0.5 border border-[#C8AA72]/50 bg-[#162724] shadow-xs whitespace-nowrap"
            title="查看灵石与 NEAR 兑换规则及收益模式（1 NEAR = 50 灵石，点击充值）"
          >
            <Coins className="w-3.5 h-3.5 text-[#5FE3C8]" />
            <span className="font-mono text-[11px] text-[#5FE3C8]">+充灵石</span>
          </button>
          <Link
            href={lang === "en" ? "/guide?lang=en" : "/guide"}
            className="text-[#C8AA72] hover:text-[#FFFFFF] transition-colors hidden md:flex items-center gap-1 whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t("产品", "Product")}</span>
          </Link>
          <button
            onClick={() => setLang((prev) => (prev === "zh" ? "en" : "zh"))}
            className="text-[#C8AA72] hover:text-[#FFFFFF] transition-colors font-mono px-1"
          >
            {lang === "zh" ? "EN" : "中"}
          </button>
        </div>
      </div>

      {/* 2. 游戏化顶部状态与资源槽 HUD (RPG Status & Resource Slots Bar，带实时扣减/增加动态跳字) */}
      <header className="w-full max-w-5xl mt-1.5 z-30">
        <div className="xianxia-status-shelf px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* 左侧：角色头像框 + 道号 + 境界 + 战力 */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 border-2 border-[#C8AA72] bg-[#10201D] overflow-hidden shrink-0 shadow-md relative">
              <img
                src={`/characters/${resolveCharacterConfig(avatarClass).id}.jpg`}
                alt={cultivator.daoName}
                className="w-full h-full object-cover object-top"
              />
              <span className="absolute bottom-0 right-0 px-1 bg-[#B8860B] text-white text-[8px] font-mono font-bold leading-tight">
                Lv.{cultivator.realmLevel}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-serif font-bold text-sm sm:text-base text-[#F4F9F7] tracking-widest truncate max-w-[120px] sm:max-w-none">
                  {trDaoName(cultivator.daoName, lang)}
                </span>
                <span className="text-[#E5D2AB] text-[10px] font-serif border border-[#C8AA72]/50 px-1.5 py-0.2 bg-[#1A2E2A] whitespace-nowrap font-semibold">
                  {trRealm(cultivator.realm, lang)}·{cultivator.realmLevel}{t("层", "")}
                </span>
                <span className="px-1.5 py-0.2 bg-[#2B1F0E] border border-[#D4AF37]/60 text-[#FDE68A] font-mono text-[10.5px] font-bold whitespace-nowrap">
                  ⚔️ {t("战力", "PWR")} {cultivator.maxHp + cultivator.atk * 4}
                </span>
              </div>

              {/* 经验等级成长进度条 (Top EXP Progress Bar) */}
              <div
                className="mt-1 flex items-center gap-1.5 cursor-help"
                title={t(
                  `修真修为进境：${cultivator.exp} / ${cultivator.maxExp} EXP（试炼伏魔、炼制灵丹、天工铸剑、论剑演武皆可凝练真元）`,
                  `Cultivation EXP: ${cultivator.exp} / ${cultivator.maxExp} (Trials, Farming, Forging & Duels award EXP)`
                )}
              >
                <div className="w-24 sm:w-32 h-1.5 bg-[#0A1614] border border-[#C8AA72]/45 rounded-full overflow-hidden p-[0.5px] relative shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-[#10B981] via-[#34D399] to-[#FDE68A] rounded-full transition-all duration-500 shadow-xs"
                    style={{
                      width: `${Math.min(100, Math.max(0, (cultivator.exp / (cultivator.maxExp || 1)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="font-mono text-[9.5px] text-[#A2C4BD] font-bold tabular-nums whitespace-nowrap">
                  {cultivator.exp}/{cultivator.maxExp} EXP ({Math.round((cultivator.exp / (cultivator.maxExp || 1)) * 100)}%)
                </span>
              </div>

              <div className="text-[10px] text-[#86ABA3] font-serif flex items-center gap-2 mt-0.5">
                <span>{t(cultivator.title, "Taixu Sect Disciple")}</span>
                <span className="text-[#C8AA72]/50">|</span>
                <span className="text-[#5FE3C8] font-mono">
                  🏆 {t("论剑积分", "ELO")}: {cultivator.scores.duelScore}
                </span>
                <span className="text-[#C8AA72]/50">|</span>
                <button
                  type="button"
                  onClick={() => setIsFinancialModalOpen(true)}
                  className="text-[#F2CE85] hover:text-[#FFFFFF] underline flex items-center gap-1 font-mono cursor-pointer"
                  title="点击查看仙资收支御道簿"
                >
                  <span>📜 仙资总账:</span>
                  <span className="text-[#FCA5A5]">-{(cultivator.financialStats?.totalNearSpent || 0.2).toFixed(1)}N</span>
                  <span>/</span>
                  <span className="text-[#86EFAC]">+{(cultivator.financialStats?.totalNearEarned || 0).toFixed(1)}N</span>
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：5大游戏道具与属性格子 (带明显扣减/增益跳字提示与气血服药/挂机调息联动) */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 font-serif">
            {(() => {
              const curHp = cultivator.hp ?? cultivator.maxHp;
              const isInjured = curHp < cultivator.maxHp;
              return [
                {
                  key: "hp",
                  icon: "❤️",
                  label: t("气血", "HP"),
                  value: `${curHp}/${cultivator.maxHp}`,
                  color: isInjured ? "text-[#FCA5A5]" : "text-[#5FE3C8]",
                  delta: slotDeltas.hp,
                  onClick: isInjured ? handleConsumeHealingPill : undefined,
                  badge: isInjured
                    ? t("🧘调息中·服药", "🧘Regen·Pill")
                    : undefined,
                },
                {
                  key: "atk",
                  icon: "🗡️",
                  label: t("攻击", "ATK"),
                  value: cultivator.atk,
                  color: "text-[#F2CE85]",
                  delta: slotDeltas.atk,
                },
                {
                  key: "stones",
                  icon: "💎",
                  label: t("灵石", "Stones"),
                  value: cultivator.spiritStones,
                  color: "text-[#FDE68A]",
                  delta: slotDeltas.stones,
                  onClick: () => setIsRechargeModalOpen(true),
                },
                {
                  key: "pills",
                  icon: "💊",
                  label: t("回春丹", "Pills"),
                  value: `×${cultivator.inventory.healingPills}`,
                  color: "text-[#6EE7B7]",
                  delta: slotDeltas.pills,
                  onClick: handleConsumeHealingPill,
                  badge:
                    isInjured && cultivator.inventory.healingPills > 0
                      ? t("点击服药", "Use Pill")
                      : undefined,
                },
                {
                  key: "iron",
                  icon: "⛏️",
                  label: t("玄铁矿", "Ores"),
                  value: `×${cultivator.inventory.ironOres}`,
                  color: "text-[#E2E8F0]",
                  delta: slotDeltas.iron,
                },
              ];
            })().map((slot) => {
              const hasDelta = slot.delta !== undefined && slot.delta !== 0;
              const isNeg = (slot.delta || 0) < 0;
              const isMissing = missingSlotKey === slot.key;
              const curHp = cultivator.hp ?? cultivator.maxHp;
              const isInjured = curHp < cultivator.maxHp;
              return (
                <div
                  key={slot.key}
                  onClick={slot.onClick}
                  className={`relative px-2 sm:px-2.5 py-1 border transition-all flex flex-col justify-between min-w-[60px] sm:min-w-[74px] ${
                    slot.onClick ? "cursor-pointer hover:border-[#F2CE85]" : ""
                  } ${
                    isMissing
                      ? "bg-[#581010] border-[#F87171] ring-2 ring-[#EF4444] animate-pulse scale-105"
                      : hasDelta
                      ? isNeg
                        ? "bg-[#450A0A] border-[#F87171] ring-2 ring-[#F87171] scale-105"
                        : "bg-[#064E3B] border-[#34D399] ring-1 ring-[#34D399] scale-105"
                      : slot.key === "hp" && isInjured
                      ? "bg-[#2A0C0C]/90 border-[#EF4444]/60"
                      : "bg-[#0F1E1B]/90 border-[#C8AA72]/40"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-[#94B8B0] whitespace-nowrap">
                    <span>{slot.label}</span>
                    <span>{slot.icon}</span>
                  </div>
                  <div className={`font-mono font-bold text-xs sm:text-sm tabular-nums ${slot.color}`}>
                    {slot.value}
                  </div>
                  {slot.key === "hp" && (
                    <div className="w-full h-1 bg-[#091412] rounded-full overflow-hidden mt-0.5 border border-[#C8AA72]/30">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isInjured ? "bg-gradient-to-r from-[#EF4444] to-[#F59E0B]" : "bg-[#10B981]"
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(0, (curHp / (cultivator.maxHp || 1)) * 100))}%`,
                        }}
                      />
                    </div>
                  )}
                  {slot.badge && !hasDelta && !isMissing && (
                    <span className="absolute -bottom-3 right-0 z-30 px-1 py-0 text-[8.5px] font-serif font-bold bg-[#14532D] text-[#86EFAC] border border-[#22C55E]/60 shadow-xs animate-pulse whitespace-nowrap">
                      {slot.badge}
                    </span>
                  )}
                  {isMissing && !hasDelta && (
                    <span className="absolute -bottom-3 right-0 z-30 px-1.5 py-0.2 text-[9.5px] font-serif font-extrabold bg-[#DC2626] text-white border border-[#FCA5A5] shadow-md animate-bounce whitespace-nowrap">
                      {t("⚠️不足", "⚠️LOW")}
                    </span>
                  )}
                  {hasDelta && (
                    <span
                      className={`absolute -bottom-3 right-0 z-30 px-1.5 py-0.2 text-[10px] font-mono font-extrabold shadow-md animate-bounce whitespace-nowrap ${
                        isNeg
                          ? "bg-[#EF4444] text-white border border-[#FCA5A5]"
                          : "bg-[#10B981] text-[#052E24] border border-[#A7F3D0]"
                      }`}
                    >
                      {isNeg ? `🔻${slot.delta}` : `+${slot.delta}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* 解锁新仙阁柔光提示卷轴 */}
      {unlockNotice && (
        <div className="w-full max-w-5xl mt-2 z-20">
          <div className="xianxia-chamfer-sm bg-[#FFFDF5] border border-[#C8AA72] px-4 py-1.5 text-center text-xs font-serif font-bold text-[#6E5122] flex items-center justify-center gap-2 shadow-md">
            <Sparkles className="w-4 h-4 text-[#B89452]" />
            <span>{unlockNotice}</span>
          </div>
        </div>
      )}

      {/* 3. 游戏主线任务与五步仙途一体化导航条 (紧凑型 RPG 任务栏，把主视口空间留给游戏舞台) */}
      <section className="w-full max-w-5xl mt-2 z-20">
        <div className="bg-[#FAF5E8]/92 border border-[#C8AA72]/70 px-3 sm:px-4 py-2 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
          {/* 左侧：师尊头像与当前主线指引 */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 border border-[#A8884C] bg-[#162724] shrink-0 overflow-hidden relative">
              <img
                src="/characters/venerable.jpg"
                alt="上古仙尊"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.2 bg-[#253D39] text-[#F2CE85] text-[10px] font-serif font-bold whitespace-nowrap">
                  {guideInfo.stepText}
                </span>
                <span className="text-xs font-serif font-bold text-[#2A1D0E] truncate">
                  {guideInfo.title}
                </span>
              </div>
              <p className="text-[11px] font-serif text-[#5C4728] truncate mt-0.5">
                {guideInfo.desc}
              </p>
            </div>
          </div>

          {/* 右侧：快捷五步仙途节点与一键跳转 */}
          <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
            <TutorialStepMilestoneBar
              currentStage={tutorialStage}
              onStepClick={(target) => setActiveBuilding(target)}
            />
            {tutorialStage < 6 && (
              <button
                type="button"
                onClick={() => setTutorialStage(6)}
                className="px-2 py-1 text-[10px] font-serif bg-[#253D39] text-[#E5D2AB] hover:text-white border border-[#C8AA72]/60 whitespace-nowrap"
              >
                {t("跳过引导", "Unlock All")}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 4. 游戏主舞台：左侧 RPG 道身装备与乾坤袋面板 + 右侧五大仙阁场景 */}
      <main className="w-full max-w-5xl mt-3 grid grid-cols-1 lg:grid-cols-12 gap-4 z-20">
        {/* 左侧：RPG 角色装备栏与乾坤储物袋 */}
        <section className="lg:col-span-4">
          <JadeGlassPanel
            withTassels
            className="p-4 flex flex-col items-center justify-between min-h-[460px] relative select-none"
          >
            {/* 头顶柔光飘字 */}
            {floatingStatText && (
              <div className="absolute top-10 z-30 px-3 py-1 bg-[#12221F] border border-[#F2CE85] text-[#F2CE85] font-serif font-bold text-xs shadow-xl animate-bounce">
                {floatingStatText}
              </div>
            )}

            {/* 顶栏：道身契约状态与动作入口 */}
            <div className="w-full flex items-center justify-between text-xs font-serif border-b border-[#C8AA72]/35 pb-2">
              <div className="flex items-center gap-1.5">
                <CinnabarSeal text="契" variant="rect" />
                <span className="font-bold text-[#20423C] text-[11px]">
                  {t("本命道身 · 灵魂绑定", "Soulbound Dao NFT")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setReshapeAvatar(cultivator.avatarClass);
                    setReshapeDaoName(cultivator.daoName);
                    setIsReshapeModalOpen(true);
                  }}
                  className="px-1.5 py-0.5 text-[10px] font-serif font-bold text-[#7D5E2A] bg-[#FAF5E6] hover:bg-[#F3E8C8] border border-[#C8AA72]"
                >
                  {t("重塑", "Reshape")}
                </button>
                <button
                  type="button"
                  disabled={isRollingSpiritRoot}
                  onClick={handleRollSpiritRootWithNear}
                  className="px-1.5 py-0.5 text-[10px] font-serif font-bold text-[#205247] bg-[#EAF4F1] hover:bg-[#D7EAE4] border border-[#7BB5A8] flex items-center gap-0.5"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isRollingSpiritRoot ? "animate-spin" : ""}`} />
                  <span>{t("洗灵根", "Wash Root")}</span>
                </button>
              </div>
            </div>

            {/* 中央：角色立绘与左右护法槽位 (RPG 纸娃娃角色风格) */}
            <div className="my-2 flex flex-col items-center w-full relative">
              <div className="absolute top-1 right-1 z-20 flex flex-col items-center gap-1 pointer-events-none">
                <CinnabarSeal text="仙" variant="square" />
                <div className="vertical-rl font-serif font-bold text-xs text-[#20423C] tracking-[0.25em] bg-white/85 py-1.5 px-0.5 border border-[#C8AA72]/45 shadow-xs">
                  {resolveCharacterConfig(avatarClass).zhName}
                </div>
              </div>

              <div className="py-1">
                <CultivatorSprite
                  avatarClass={avatarClass}
                  hasWeapon={!!cultivator.equippedArtifact}
                  weaponTier={
                    cultivator.equippedArtifact?.rarity === "传世仙器"
                      ? 3
                      : cultivator.equippedArtifact?.rarity === "上品灵宝"
                      ? 2
                      : 1
                  }
                  size="lg"
                />
              </div>

              {/* 境界修真等级成长与经验条 (Realm & EXP Progression Bar) */}
              <div className="w-full bg-[#112320] border border-[#C8AA72]/60 p-2.5 my-1.5 font-serif shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 bg-[#B8860B] text-white text-[10px] font-bold font-mono">
                      Lv.{cultivator.realmLevel}
                    </span>
                    <span className="font-bold text-[#F2CE85] text-xs sm:text-sm">
                      {trRealm(cultivator.realm, lang)} · {cultivator.realmLevel}{t("层", " Layer")}
                    </span>
                    {cultivator.realmLevel >= 3 && (
                      <span className="text-[10px] text-[#5FE3C8] bg-[#163630] border border-[#52D1B2]/50 px-1 font-bold animate-pulse">
                        {t("临近破境", "Near Breakthrough")}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-[#5FE3C8] font-bold tabular-nums">
                    {cultivator.exp} / {cultivator.maxExp} EXP{" "}
                    <span className="text-[10px] text-[#A2C4BD]">
                      ({Math.round((cultivator.exp / (cultivator.maxExp || 1)) * 100)}%)
                    </span>
                  </div>
                </div>

                {/* 华丽经验槽 */}
                <div className="mt-1.5 w-full h-2.5 bg-[#091412] border border-[#C8AA72]/50 rounded-full overflow-hidden p-[1px] relative shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-[#059669] via-[#10B981] via-[#34D399] to-[#FDE68A] rounded-full transition-all duration-700 relative overflow-hidden"
                    style={{
                      width: `${Math.min(100, Math.max(0, (cultivator.exp / (cultivator.maxExp || 1)) * 100))}%`,
                    }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
                  </div>
                </div>

                {/* 境界突破下阶增益预览与获益提示 */}
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#86ABA3] border-t border-[#C8AA72]/20 pt-1">
                  <span className="text-[#E5D2AB]">
                    {cultivator.realmLevel >= 3
                      ? t(
                          "破境大圆满：下一大境界 气血+80 · 攻击+24 · 护体+8",
                          "Next Realm: HP +80 · ATK +24 · DEF +8"
                        )
                      : t(
                          "下层晋升预估：气血 +25 HP · 攻击 +8 ATK · 护体 +3 DEF",
                          "Next Layer: HP +25 · ATK +8 · DEF +3"
                        )}
                  </span>
                  <span className="text-[#5FE3C8] hidden sm:inline">
                    {t("试炼 · 采药 · 炼器 · 演武凝练真元", "Trial/Farm/Forge gives EXP")}
                  </span>
                </div>
              </div>

              {/* 道身气血状态与服药/调息面板 (Dao Body HP Bar & Healing Controls) */}
              {(() => {
                const curHp = cultivator.hp ?? cultivator.maxHp;
                const maxHp = cultivator.maxHp || 160;
                const isInjured = curHp < maxHp;
                const hpPct = Math.min(100, Math.max(0, Math.round((curHp / maxHp) * 100)));
                return (
                  <div className="w-full bg-[#112320] border border-[#C8AA72]/60 p-2 my-1.5 font-serif shadow-xs">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm leading-none">❤️</span>
                        <span className="font-bold text-[#E5D2AB] text-xs">
                          {t("道身气血", "Daoist Life Force")}
                        </span>
                        {isInjured && (
                          <span className="text-[10px] text-[#86EFAC] bg-[#064E3B] border border-[#22C55E]/50 px-1 py-0.2 font-bold animate-pulse flex items-center gap-0.5">
                            <span>🧘</span>
                            <span>{t("调息回血 +1.5%/s", "Idle Regen +1.5%/s")}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-xs font-bold tabular-nums ${isInjured ? "text-[#FCA5A5]" : "text-[#5FE3C8]"}`}>
                          {curHp} / {maxHp} HP ({hpPct}%)
                        </span>
                        {isInjured && (
                          <button
                            type="button"
                            onClick={handleConsumeHealingPill}
                            className="px-2 py-0.5 text-[10px] font-bold text-[#064E3B] bg-[#A7F3D0] hover:bg-[#6EE7B7] border border-[#059669] shadow-2xs transition flex items-center gap-1 cursor-pointer"
                            title={t(`消耗 1 枚回春丹恢复气血 (当前拥有 ${cultivator.inventory.healingPills} 枚)`, `Use 1 Pill to Heal (${cultivator.inventory.healingPills} in bag)`)}
                          >
                            <span>💊</span>
                            <span>{t("服药疗伤", "Use Pill")}</span>
                          </button>
                        )}
                      </div>
                    </div>
                    {/* 气血条 */}
                    <div className="mt-1 w-full h-2 bg-[#091412] border border-[#C8AA72]/40 rounded-full overflow-hidden p-[0.5px] relative shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-500 relative overflow-hidden ${
                          isInjured
                            ? "bg-gradient-to-r from-[#DC2626] via-[#F59E0B] to-[#10B981]"
                            : "bg-gradient-to-r from-[#059669] via-[#10B981] to-[#34D399]"
                        }`}
                        style={{ width: `${hpPct}%` }}
                      >
                        {isInjured && <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 装备槽与灵根槽 (双栏 RPG 装备框) */}
              <div className="w-full grid grid-cols-2 gap-2 mt-2 font-serif">
                {/* 槽位1：本命佩剑 */}
                <div
                  onClick={() => forgeUnlocked && setActiveBuilding("FORGE")}
                  className="p-2 bg-[#162724] border border-[#C8AA72]/60 text-left cursor-pointer hover:border-[#F2CE85] transition"
                >
                  <div className="flex items-center justify-between text-[10px] text-[#86ABA3]">
                    <span>{t("【本命法宝】", "[Weapon Slot]")}</span>
                    <Swords className="w-3 h-3 text-[#F2CE85]" />
                  </div>
                  {cultivator.equippedArtifact ? (
                    <>
                      <div className="text-xs font-bold text-[#F2CE85] truncate mt-0.5">
                        {trArtifactName(cultivator.equippedArtifact.name, lang)}
                      </div>
                      <div className="text-[10px] font-mono text-[#5FE3C8]">
                        +{cultivator.equippedArtifact.atkBonus} ATK · 暴击{cultivator.equippedArtifact.critRatePct}%
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-bold text-[#94B8B0] mt-0.5">
                        {t("尚未佩剑", "Unarmed")}
                      </div>
                      <div className="text-[10px] text-[#C8AA72] underline">
                        {t("前往剑庐锻造 →", "Forge Sword →")}
                      </div>
                    </>
                  )}
                </div>

                {/* 槽位2：先天灵根 */}
                <div
                  onClick={handleRollSpiritRootWithNear}
                  className="p-2 bg-[#162724] border border-[#C8AA72]/60 text-left cursor-pointer hover:border-[#5FE3C8] transition"
                >
                  <div className="flex items-center justify-between text-[10px] text-[#86ABA3]">
                    <span>{t("【先天灵根】", "[Spirit Root]")}</span>
                    <Sparkles className="w-3 h-3 text-[#5FE3C8]" />
                  </div>
                  <div className="text-xs font-bold text-[#5FE3C8] truncate mt-0.5">
                    {cultivator.spiritRoot?.name || "五行杂灵根"}
                  </div>
                  <div className="text-[10px] font-mono text-[#E5D2AB] truncate">
                    {cultivator.spiritRoot?.hpBonusPct || cultivator.spiritRoot?.atkBonusPct
                      ? `HP+${cultivator.spiritRoot.hpBonusPct}% ATK+${cultivator.spiritRoot.atkBonusPct}%`
                      : t("0.1N 洗炼高阶词条", "0.1N Wash Root")}
                  </div>
                </div>
              </div>
            </div>

            {/* 底部：乾坤储物袋 (4格游戏背包槽位，道具扣减/获得/不足时高亮闪烁) */}
            <div className="w-full bg-[#132421] border border-[#C8AA72]/65 p-2.5 space-y-2 font-serif text-xs shadow-inner">
              <div className="flex items-center justify-between text-[11px] text-[#E5D2AB] border-b border-[#C8AA72]/30 pb-1">
                <span className="font-bold tracking-wider flex items-center gap-1">
                  <span>🎒</span>
                  <span>{t("乾坤储物袋 (道具实时变动)", "Storage Bag (Live Inventory)")}</span>
                </span>
                <span
                  onClick={() => setIsRechargeModalOpen(true)}
                  className={`font-mono text-[10px] px-1.5 py-0.2 cursor-pointer transition flex items-center gap-1 ${
                    missingSlotKey === "stones"
                      ? "bg-[#7F1D1D] text-white border border-[#F87171] animate-pulse"
                      : slotDeltas.stones && slotDeltas.stones < 0
                      ? "bg-[#450A0A] text-[#FCA5A5] border border-[#F87171]"
                      : "text-[#FDE68A] hover:underline"
                  }`}
                >
                  <span>💎 {cultivator.spiritStones} {t("灵石", "Stones")}</span>
                  {slotDeltas.stones !== undefined && slotDeltas.stones !== 0 && (
                    <span
                      className={`px-1 font-extrabold ${
                        slotDeltas.stones < 0
                          ? "bg-[#EF4444] text-white"
                          : "bg-[#10B981] text-[#052E24]"
                      }`}
                    >
                      {slotDeltas.stones < 0 ? `🔻${slotDeltas.stones}` : `+${slotDeltas.stones}`}
                    </span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[
                  {
                    key: "iron",
                    icon: "⛏️",
                    name: t("玄铁矿", "Iron"),
                    count: cultivator.inventory.ironOres,
                    delta: slotDeltas.iron,
                  },
                  {
                    key: "meteor",
                    icon: "☄️",
                    name: t("陨铁", "Meteor"),
                    count: cultivator.inventory.meteorOres,
                    delta: slotDeltas.meteor,
                  },
                  {
                    key: "pills",
                    icon: "💊",
                    name: t("回春丹", "Pills"),
                    count: cultivator.inventory.healingPills,
                    delta: slotDeltas.pills,
                    onClick: handleConsumeHealingPill,
                  },
                  {
                    key: "seeds",
                    icon: "🌱",
                    name: t("灵草种", "Seeds"),
                    count:
                      (cultivator.inventory.seedBag[1] || 0) +
                      (cultivator.inventory.seedBag[2] || 0) +
                      (cultivator.inventory.seedBag[3] || 0),
                    delta: slotDeltas.seeds,
                  },
                ].map((item) => {
                  const hasDelta = item.delta !== undefined && item.delta !== 0;
                  const isNeg = (item.delta || 0) < 0;
                  const isMissing = missingSlotKey === item.key;
                  return (
                    <div
                      key={item.key}
                      onClick={item.onClick}
                      className={`relative p-1.5 border transition-all ${
                        item.onClick ? "cursor-pointer hover:border-[#6EE7B7]" : ""
                      } ${
                        isMissing
                          ? "bg-[#581010] border-[#F87171] ring-2 ring-[#EF4444] animate-pulse scale-105"
                          : hasDelta
                          ? isNeg
                            ? "bg-[#581010] border-[#F87171] ring-2 ring-[#F87171] scale-105"
                            : "bg-[#0B4F3E] border-[#34D399] ring-1 ring-[#34D399] scale-105"
                          : "bg-[#1A302C] border-[#C8AA72]/35"
                      }`}
                    >
                      <div className="text-sm leading-none">{item.icon}</div>
                      <div className="text-[10px] text-[#A9C7C0] mt-1 truncate">{item.name}</div>
                      <div className="font-mono font-bold text-xs text-[#F4F9F7] tabular-nums">
                        ×{item.count}
                      </div>
                      {isMissing && !hasDelta && (
                        <span className="absolute -top-2 -right-1 px-1 py-0 text-[9px] font-serif font-extrabold bg-[#DC2626] text-white shadow-md animate-bounce">
                          {t("不足", "LOW")}
                        </span>
                      )}
                      {hasDelta && (
                        <span
                          className={`absolute -top-2 -right-1 px-1 py-0 text-[10px] font-mono font-extrabold shadow-md animate-bounce ${
                            isNeg ? "bg-[#EF4444] text-white" : "bg-[#10B981] text-[#052E24]"
                          }`}
                        >
                          {isNeg ? `🔻${item.delta}` : `+${item.delta}`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </JadeGlassPanel>
        </section>

        {/* 右侧：四大浮空仙阁中式牌匾页签与交互场景 */}
        <section className="lg:col-span-8 flex flex-col">
          {/* 五大仙阁中式牌匾页签 (Plaque Tabs，紧凑吸附在主面板上方) */}
          <div className="grid grid-cols-5 gap-1 sm:gap-1.5 -mb-px z-10">
            {[
              {
                id: "GARDEN" as ActiveBuilding,
                unlocked: true,
                zhTitle: "壹 · 洞府灵圃",
                enTitle: "I · Herb Garden",
                zhSub: "种灵草 · 增气血 HP",
                enSub: "Farm Herbs · +HP",
              },
              {
                id: "FORGE" as ActiveBuilding,
                unlocked: forgeUnlocked,
                zhTitle: "贰 · 天工剑庐",
                enTitle: "II · Sword Forge",
                zhSub: forgeUnlocked
                  ? "铸仙剑 · 增攻击 ATK"
                  : "炼丹后开启",
                enSub: forgeUnlocked ? "Craft Swords · +ATK" : "Locked",
                isNew: tutorialStage === 4 && activeBuilding !== "FORGE",
              },
              {
                id: "REALM" as ActiveBuilding,
                unlocked: realmUnlocked,
                zhTitle: "叁 · 云海试炼",
                enTitle: "III · Trial Tower",
                zhSub: realmUnlocked ? "御剑伏魔 · 获仙矿" : "铸剑后开启",
                enSub: realmUnlocked ? "2D Boss Trial" : "Locked",
                isNew: tutorialStage === 5 && activeBuilding !== "REALM",
              },
              {
                id: "ARENA" as ActiveBuilding,
                unlocked: arenaUnlocked,
                zhTitle: "肆 · 问鼎论剑",
                enTitle: "IV · Duel Arena",
                zhSub: arenaUnlocked ? "12回合攻防 · 夺积分" : "试炼后开启",
                enSub: arenaUnlocked ? "PVP Combat" : "Locked",
              },
              {
                id: "TREASURY" as ActiveBuilding,
                unlocked: treasuryUnlocked,
                zhTitle: "伍 · 宗门天榜",
                enTitle: "V · Heaven Boards",
                zhSub: treasuryUnlocked
                  ? "国库五成 · 四榜分润"
                  : "试炼后开启",
                enSub: treasuryUnlocked ? "50% Dividends" : "Locked",
              },
            ].map((tab) => {
              const active = activeBuilding === tab.id;
              // 严格限定新手指引手势：仅在未满6阶对应初引任务且未在对应仙阁时才指向目标仙阁；满6阶大成后绝不误指！
              const isTutorialTabTarget =
                (tutorialStage >= 1 && tutorialStage <= 3 && activeBuilding !== "GARDEN" && tab.id === "GARDEN") ||
                (tutorialStage === 4 && activeBuilding !== "FORGE" && tab.id === "FORGE") ||
                (tutorialStage === 5 && activeBuilding !== "REALM" && tab.id === "REALM");

              return (
                <button
                  key={tab.id}
                  disabled={!tab.unlocked}
                  onClick={() => tab.unlocked && setActiveBuilding(tab.id)}
                  className={`py-2 px-1 text-center transition-all relative select-none ${
                    !tab.unlocked
                      ? "xianxia-plaque-tab-locked"
                      : active
                      ? "xianxia-plaque-tab-active font-bold"
                      : "xianxia-plaque-tab-inactive"
                  } ${isTutorialTabTarget ? "ring-2 ring-[#B89452] shadow-md" : ""}`}
                >
                  {/* 新手引导手势光标指向目标标签 */}
                  {isTutorialTabTarget && (
                    <GuideHandPointer
                      text={
                        tab.id === "GARDEN"
                          ? t("轻触切换至洞府灵圃", "Switch to Herb Garden")
                          : tab.id === "FORGE"
                          ? t("轻触切换至天工剑庐", "Switch to Sword Forge")
                          : t("轻触切换至云海试炼", "Switch to Trial Tower")
                      }
                      direction="down"
                      className="absolute -top-7 left-1/2 -translate-x-1/2"
                    />
                  )}
                  <div className="flex items-center justify-center gap-1">
                    {!tab.unlocked && (
                      <CinnabarSeal text="封" variant="rect" className="text-[9px] px-1 py-0" />
                    )}
                    <span className="text-[11px] sm:text-xs font-serif tracking-wider truncate">
                      {t(tab.zhTitle, tab.enTitle)}
                    </span>
                  </div>
                  <div className="text-[9px] opacity-75 font-serif mt-0.5 hidden sm:block truncate">
                    {t(tab.zhSub, tab.enSub)}
                  </div>
                  {tab.isNew && (
                    <span className="absolute -top-2.5 right-1 px-1.5 py-0.2 bg-[#A82E2E] text-white text-[9px] font-serif border border-[#FFE8B5] animate-bounce">
                      {t("应召", "NEW")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* =============================================================== */}
          {/* 仙阁一：洞府九宫白玉灵圃 (白玉井字形阵盘)                         */}
          {/* =============================================================== */}
          {activeBuilding === "GARDEN" && (
            <JadeGlassPanel
              withTopClasp
              className="flex-1 p-5 flex flex-col justify-between min-h-[410px] border-t-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#253D39] tracking-wider">
                    {t(
                      "洞府白玉灵圃 · 采灵草炼气血金丹 (+气血上限 HP)",
                      "Sacred Jade Herb Garden (+Max HP & Healing Pills)"
                    )}
                  </h3>
                  <p className="text-xs font-serif text-[#587570] mt-0.5">
                    {t(
                      "触碰九宫灵畦：播下仙种 → 灵泉润泽 → 采摘入炉炼丹，永久增长道身气血上限",
                      "Click an array plot: Plant Seed → Irrigate with Dew → Refine Pill to permanently raise Max HP"
                    )}
                  </p>
                </div>

                {/* 仙种品阶选择器 (折沿按钮，实时显示袋藏数量或灵石扣减价格) */}
                <div className="flex flex-wrap gap-1.5 bg-[#EDF5F3] p-1 border border-[#C8AA72]/45">
                  {catalogs.herbSeeds.map((s) => {
                    const bagCount = cultivator.inventory.seedBag[s.tier] || 0;
                    const canAfford = bagCount > 0 || cultivator.spiritStones >= s.costSpiritStones;
                    return (
                      <button
                        key={s.tier}
                        onClick={() => setSelectedSeedTier(s.tier)}
                        className={`px-2.5 py-0.5 text-xs font-serif transition flex items-center gap-1 ${
                          selectedSeedTier === s.tier
                            ? "bg-[#DCEEEB] border border-[#73ADA1] text-[#234E46] font-bold shadow-xs"
                            : "text-[#5E7C77] hover:text-[#253D39]"
                        }`}
                      >
                        <span>
                          {s.tier}
                          {t("阶", "T")} · {trHerbName(s.name, lang)} (+{s.permMaxHpBonus}HP)
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1 py-0.2 border ${
                            bagCount > 0
                              ? "bg-[#D1FAE5] text-[#065F46] border-[#6EE7B7]"
                              : canAfford
                              ? "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]"
                              : "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]"
                          }`}
                        >
                          {bagCount > 0
                            ? `${t("袋藏", "Bag")}×${bagCount}`
                            : `${s.costSpiritStones}💎`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <CloudDivider className="my-2.5" />

              {/* 3x3 白玉井字形阵盘 (告别零散卡片与 CSS 椭圆，整块双线井田阵眼) */}
              <div className="xianxia-array-board p-2 my-auto">
                <div className="grid grid-cols-3 border border-[#C8AA72]/65 bg-[#E6F0EC]/60">
                  {cultivator.gardenPlots.map((plot, pIdx) => {
                    const isGuideTarget =
                      plot.plotId === 0 &&
                      (tutorialStage === 1 ||
                        tutorialStage === 2 ||
                        tutorialStage === 3);

                    const isPlotLoading = loadingPlotIds.includes(plot.plotId);
                    const localFx = plotFloatingFx[plot.plotId];
                    const curSeedCfg =
                      catalogs.herbSeeds.find((s) => s.tier === selectedSeedTier) ||
                      catalogs.herbSeeds[0];
                    const curBagSeedCount = cultivator.inventory.seedBag[selectedSeedTier] || 0;
                    const canAffordSeed =
                      curBagSeedCount > 0 || cultivator.spiritStones >= curSeedCfg.costSpiritStones;

                    const isRightCol = pIdx % 3 === 2;
                    const isBottomRow = pIdx >= 6;

                    return (
                      <button
                        key={plot.plotId}
                        disabled={isPlotLoading}
                        onClick={() => handlePlotClick(plot.plotId)}
                        className={`group relative xianxia-plot-cell p-2 flex flex-col justify-between h-[138px] w-full shrink-0 overflow-hidden select-none transition-all ${
                          !isRightCol ? "border-r border-[#C8AA72]/45" : ""
                        } ${!isBottomRow ? "border-b border-[#C8AA72]/45" : ""} ${
                          isGuideTarget
                            ? "ring-2 ring-[#C5A46A] z-10 shadow-[inset_0_0_22px_rgba(197,164,106,0.5),0_0_14px_rgba(197,164,106,0.35)] bg-[#FFFDF7]"
                            : ""
                        }`}
                      >
                        {/* 师尊引路提示手势 */}
                        {isGuideTarget && !isPlotLoading && (
                          <GuideHandPointer
                            text={
                              plot.status === "EMPTY"
                                ? t("轻触播下灵种", "Click to Plant")
                                : plot.status === "GROWING"
                                ? t("轻触灵泉浇灌", "Click to Water")
                                : t("轻触采摘炼丹", "Click to Refine")
                            }
                            direction="down"
                            className="absolute -top-8 left-1/2 -translate-x-1/2 z-30"
                          />
                        )}

                        {/* 灵畦原位道具扣减/增益飞字动效层 (100%纯实色高对比度，字迹清晰) */}
                        {localFx && (
                          <div
                            key={localFx.key}
                            className="absolute inset-x-1 top-6 z-30 pointer-events-none flex flex-col items-center justify-center animate-bounce"
                          >
                            <div
                              style={{
                                backgroundColor: localFx.isDeduction
                                  ? "#3B0A0A"
                                  : "#064E3B",
                              }}
                              className={`px-2.5 py-1 border-2 shadow-xl font-serif text-[11px] font-extrabold whitespace-nowrap ${
                                localFx.isDeduction
                                  ? "border-[#F87171] text-[#FFFFFF]"
                                  : "border-[#34D399] text-[#FFFFFF]"
                              }`}
                            >
                              {lang === "en" ? localFx.textEn : localFx.textZh}
                            </div>
                            {(localFx.subTextZh || localFx.subTextEn) && (
                              <span
                                style={{ backgroundColor: "#12221F" }}
                                className="mt-0.5 px-1.5 py-0.2 text-[#FDE68A] border border-[#C8AA72] text-[9.5px] font-serif font-bold whitespace-nowrap"
                              >
                                {lang === "en" ? localFx.subTextEn : localFx.subTextZh}
                              </span>
                            )}
                          </div>
                        )}

                        {/* 局部仙道八卦聚灵 Loading 覆盖层 */}
                        {isPlotLoading && (
                          <div className="absolute inset-0 bg-[#E6F0EC]/92 backdrop-blur-xs z-25 flex flex-col items-center justify-center p-2 transition-all">
                            <XianxiaLoadingRing
                              text={t("聚灵中...", "Loading...")}
                              size="sm"
                              tone="jade"
                            />
                          </div>
                        )}

                        {/* 顶部定高标尺栏 (20px，三态恒定防抖) */}
                        <div className="w-full h-5 flex items-center justify-between pointer-events-none shrink-0 px-0.5">
                          <span className="text-[10px] font-serif text-[#5C7D77] tracking-wider font-semibold truncate">
                            {PLOT_ORDINALS[pIdx]
                              ? t(PLOT_ORDINALS[pIdx].zh, PLOT_ORDINALS[pIdx].en)
                              : `畦·${pIdx + 1}`}
                          </span>
                          {plot.status === "READY" ? (
                            <span className="text-[10px] font-mono font-bold text-[#1E4D40] bg-white/90 px-1 py-0.2 border border-[#9CC5BD] shadow-2xs shrink-0">
                              +{plot.expectedMaxHpBonus} HP
                            </span>
                          ) : plot.status === "GROWING" ? (
                            <span className="text-[9.5px] font-serif font-bold text-[#8A6828] bg-[#FAF2DE] px-1 py-0.2 border border-[#C8AA72]/40 shrink-0">
                              {plot.herbName?.slice(0, 4) || "灵植"}
                            </span>
                          ) : (
                            <span
                              className={`text-[9.5px] font-mono font-bold px-1 py-0.2 border shrink-0 ${
                                curBagSeedCount > 0
                                  ? "bg-[#D1FAE5] text-[#065F46] border-[#6EE7B7]"
                                  : canAffordSeed
                                  ? "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]"
                                  : "bg-[#FEE2E2] text-[#DC2626] border-[#F87171]"
                              }`}
                            >
                              {curBagSeedCount > 0
                                ? `🌱袋藏×${curBagSeedCount}`
                                : canAffordSeed
                                ? `-${curSeedCfg.costSpiritStones}💎`
                                : `⚠️需${curSeedCfg.costSpiritStones}💎`}
                            </span>
                          )}
                        </div>

                        {/* 中部植物工笔矢量立绘区 (64px 严格定高定宽) */}
                        <div className="w-full h-16 flex items-center justify-center shrink-0 my-auto">
                          <HerbTileVisual
                            status={plot.status}
                            seedTier={plot.seedTier || selectedSeedTier}
                          />
                        </div>

                        {/* 底部状态操作区 (34px 严格定高居中，消除生长/成熟造成的挤压形变) */}
                        <div className="w-full h-[34px] flex flex-col items-center justify-center shrink-0 mt-auto">
                          {plot.status === "EMPTY" && (
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-serif font-semibold text-[#5E7C77] leading-tight">
                                {t("玄土待播", "Empty Soil")}
                              </span>
                              <span
                                className={`text-[9.5px] leading-none mt-0.5 font-serif ${
                                  canAffordSeed
                                    ? "text-[#86ABA3]"
                                    : "text-[#DC2626] font-bold"
                                }`}
                              >
                                {curBagSeedCount > 0
                                  ? t("点击播下袋藏仙种", "Use Bag Seed")
                                  : canAffordSeed
                                  ? t(`点击下种 (-${curSeedCfg.costSpiritStones}灵石)`, `Plant (-${curSeedCfg.costSpiritStones}💎)`)
                                  : t("⚠️ 灵石不足 (点击补充)", "⚠️ Low Stones")}
                              </span>
                            </div>
                          )}

                          {plot.status === "GROWING" && (
                            <div className="w-full flex flex-col items-center gap-1">
                              <div className="flex items-center gap-1 text-[11px] font-serif font-semibold text-[#8A6828] leading-none">
                                <Clock className="w-3 h-3 animate-spin text-[#B89452] shrink-0" />
                                <span className="font-mono tabular-nums">
                                  {plot.remainingGrowSeconds !== undefined
                                    ? `${Math.floor(plot.remainingGrowSeconds / 60)
                                        .toString()
                                        .padStart(2, "0")}:${(
                                        plot.remainingGrowSeconds % 60
                                      )
                                        .toString()
                                        .padStart(2, "0")}`
                                    : "凝气中"}
                                </span>
                                {!plot.wateredWithSpiritSpring ? (
                                  <span className="text-[9.5px] text-[#2E6B5E] underline font-bold">
                                    {t("灵泉润泽", "Water")}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-[#2E6B5E] bg-[#DCEEEB] px-1 py-0.2">
                                    {t("已润", "Dewed")}
                                  </span>
                                )}
                              </div>
                              {/* 细长灵气凝聚进度条 */}
                              {(() => {
                                const totalSec =
                                  (plot.seedTier === 3 ? 180 : plot.seedTier === 2 ? 90 : 30) *
                                  (plot.wateredWithSpiritSpring ? 0.5 : 1);
                                const remSec = plot.remainingGrowSeconds ?? 0;
                                const pct = Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    Math.round(((totalSec - remSec) / totalSec) * 100)
                                  )
                                );
                                return (
                                  <div className="w-4/5 h-1 bg-[#D3E5E1] border border-[#9CC5BD] overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-[#5BA496] to-[#34786B] transition-all duration-500"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {plot.status === "READY" && (
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-serif font-bold text-[#164E3E] bg-[#E1F3EE] px-2 py-0.5 border border-[#48A08E] animate-pulse shadow-2xs leading-tight">
                                {t("✨ 采摘炼丹", "✨ Harvest")}
                              </span>
                              <span className="text-[9.5px] text-[#2E6B5E] leading-none mt-0.5 font-bold">
                                {t("点此吸纳药性", "Refine Pill")}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </JadeGlassPanel>
          )}

          {/* =============================================================== */}
          {/* 仙阁二：天工剑庐 (熔炼玄铁 -> 锻造琉璃仙剑 +攻击力 ATK)          */}
          {/* =============================================================== */}
          {activeBuilding === "FORGE" && (
            <JadeGlassPanel
              withTopClasp
              className="flex-1 p-5 flex flex-col justify-between min-h-[410px] border-t-0"
            >
              <div>
                <h3 className="text-base font-serif font-bold text-[#253D39] tracking-wider">
                  {t(
                    "天工铸剑阁 · 熔炼玄铁锻造本命仙剑 (+攻击力 ATK)",
                    "Heavenly Sword Forge · Craft Immortal Blades (+ATK)"
                  )}
                </h3>
                <p className="text-xs font-serif text-[#587570] mt-0.5">
                  {t(
                    "消耗秘境采集的玄铁与灵石火种费（全额汇入宗门国库），铸成仙剑自动佩于腰间提升攻击力",
                    "Smelt Secret Realm ores into Flying Swords; 100% of Spirit Stone fees flow into the Sect Treasury"
                  )}
                </p>
              </div>

              {/* 温润白玉八卦剑炉动效区 (带材料扣减/不足实时飞字表现) */}
              <div className="my-3 py-3 px-4 border border-[#C8AA72]/50 bg-white/70 flex flex-col items-center justify-center relative overflow-hidden">
                {forgeFloatingFx && (
                  <div
                    key={forgeFloatingFx.key}
                    className="mb-2 flex flex-wrap items-center justify-center gap-1.5 z-20 animate-bounce"
                  >
                    {forgeFloatingFx.deductions.map((txt, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 bg-[#450A0A] border border-[#F87171] text-[#FCA5A5] font-mono text-xs font-extrabold shadow-md"
                      >
                        {txt}
                      </span>
                    ))}
                    {forgeFloatingFx.gainText && (
                      <span className="px-2.5 py-0.5 bg-[#064E3B] border border-[#34D399] text-[#FDE68A] font-serif text-xs font-extrabold shadow-md">
                        {forgeFloatingFx.gainText}
                      </span>
                    )}
                  </div>
                )}
                <div
                  className={`w-14 h-14 border-2 border-[#C8AA72] bg-[#FAF6EC] flex items-center justify-center shadow-xs ${
                    isForgingAnim ? "animate-ping" : ""
                  }`}
                >
                  <Hammer
                    className={`w-6 h-6 text-[#8A6830] ${
                      isForgingAnim ? "animate-bounce" : ""
                    }`}
                  />
                </div>
                <div className="text-xs font-serif font-medium text-[#594119] mt-2 tracking-wider">
                  {isForgingAnim
                    ? t("流云灵火凝练中 · 仙剑即将出匣...", "Tempering immortal blade in celestial fire...")
                    : t("白玉八卦剑炉已温炉 · 纯凭天命机缘出炉品质词条", "Select a Sword Scroll Below to Forge")}
                </div>

                {/* 铸造机缘与品质概率说明条 (消除玩家炸炉碎剑顾虑，清晰展示消耗与概率) */}
                <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 text-[11px] font-serif">
                  <span className="px-2 py-0.5 bg-[#ECFDF5] border border-[#10B981]/50 text-[#065F46] font-bold shadow-2xs">
                    ✓ {t("成功率 100% · 必出法宝零炸炉", "100% Success Guaranteed")}
                  </span>
                  <span className="text-[#C8AA72]/60 hidden sm:inline">|</span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <span className="px-1.5 py-0.2 bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569] font-bold">
                      {t("凡品灵兵 45% (1.0×)", "Common 45%")}
                    </span>
                    <span className="px-1.5 py-0.2 bg-[#EFF6FF] border border-[#93C5FD] text-[#1E40AF] font-bold">
                      {t("上品灵宝 35% (1.18×)", "Superior 35%")}
                    </span>
                    <span className="px-1.5 py-0.2 bg-[#FAF5FF] border border-[#D8B4FE] text-[#6B21A8] font-bold">
                      {t("极品道器 15% (1.35×)", "Flawless 15%")}
                    </span>
                    <span className="px-1.5 py-0.2 bg-[#FEF3C7] border border-[#F59E0B] text-[#92400E] font-bold shadow-2xs">
                      👑 {t("传世仙器 5% (1.65×)", "Mythic 5%")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {catalogs.forgeBlueprints.map((bp, idx) => {
                  const hasEnoughIron = cultivator.inventory.ironOres >= bp.ironOreCost;
                  const hasEnoughMeteor = cultivator.inventory.meteorOres >= bp.meteorOreCost;
                  const hasEnoughStones = cultivator.spiritStones >= bp.spiritStoneFee;
                  const canForge = hasEnoughIron && hasEnoughMeteor && hasEnoughStones;
                  const isGuideHighlight = tutorialStage === 4 && idx === 0;
                  const isBpLoading =
                    activeLoading?.type === "FORGE" && activeLoading.id === bp.id;

                  return (
                    <div
                      key={bp.id}
                      className={`border p-3.5 flex flex-col justify-between relative shadow-xs ${
                        isGuideHighlight
                          ? "bg-white border-[#B89452] ring-2 ring-[#C5A46A]/50 shadow-[0_0_12px_rgba(197,164,106,0.25)]"
                          : "bg-white/75 border-[#C8AA72]/45"
                      }`}
                    >
                      {/* 师尊推荐首铸手势指引 */}
                      {isGuideHighlight && !isBpLoading && (
                        <GuideHandPointer
                          text={t("轻触开炉锻造首把飞剑", "Click to Forge Blade")}
                          direction="down"
                          className="absolute -top-8 left-1/2 -translate-x-1/2 z-30"
                        />
                      )}
                      <div>
                        <div className="text-sm font-serif font-bold text-[#253D39]">
                          【{trArtifactName(bp.name, lang)}】
                        </div>
                        <div className="text-xs font-mono font-semibold text-[#8A6A32] mt-1 tabular-nums">
                          {t("攻击", "ATK")} +{bp.baseAtkMin}~
                          {Math.round(bp.baseAtkMax * 1.45)} ·{" "}
                          {t("剑心", "Crit")} +{bp.baseCritPct}%
                        </div>
                        <div className="text-[11px] font-serif text-[#5C7A75] mt-2 space-y-1 bg-[#F4F8F6] p-2 border border-[#C8AA72]/35">
                          <div className="flex items-center justify-between">
                            <span>⛏️ {t("百炼玄铁:", "Iron Ore:")}</span>
                            <span
                              className={`font-mono font-bold ${
                                hasEnoughIron ? "text-[#15803D]" : "text-[#DC2626]"
                              }`}
                            >
                              {cultivator.inventory.ironOres}/{bp.ironOreCost}{" "}
                              {hasEnoughIron ? "✓" : t("(不足)", "(Low)")}
                            </span>
                          </div>
                          {bp.meteorOreCost > 0 && (
                            <div className="flex items-center justify-between">
                              <span>☄️ {t("星辰陨铁:", "Meteor Ore:")}</span>
                              <span
                                className={`font-mono font-bold ${
                                  hasEnoughMeteor ? "text-[#15803D]" : "text-[#DC2626]"
                                }`}
                              >
                                {cultivator.inventory.meteorOres}/{bp.meteorOreCost}{" "}
                                {hasEnoughMeteor ? "✓" : t("(不足)", "(Low)")}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span>💎 {t("灵火费用:", "Furnace Fee:")}</span>
                            <span
                              className={`font-mono font-bold ${
                                hasEnoughStones ? "text-[#15803D]" : "text-[#DC2626]"
                              }`}
                            >
                              {cultivator.spiritStones}/{bp.spiritStoneFee}{" "}
                              {hasEnoughStones ? "✓" : t("(不足)", "(Low)")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        disabled={isForgingAnim || loadingAction}
                        onClick={() => handleForgeWeapon(bp.id)}
                        className={`mt-3 w-full py-2 text-xs font-serif font-bold transition flex items-center justify-center min-h-[34px] ${
                          canForge
                            ? "xianxia-btn-gold"
                            : "bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#F87171] shadow-2xs"
                        }`}
                      >
                        {isBpLoading ? (
                          <XianxiaLoadingRing
                            text={activeLoading?.textZh}
                            size="sm"
                            tone="light"
                          />
                        ) : canForge ? (
                          t(
                            `🔥 开炉铸剑 (-${bp.ironOreCost}⛏️ -${bp.spiritStoneFee}💎)`,
                            `🔥 Forge (-${bp.ironOreCost}⛏️ -${bp.spiritStoneFee}💎)`
                          )
                        ) : !hasEnoughIron || !hasEnoughMeteor ? (
                          t("⚠️ 仙矿不足 · 点击查看获取途径", "⚠️ Missing Ores · Click to Resolve")
                        ) : (
                          t("⚠️ 灵石不足 · 点击补充灵石", "⚠️ Low Stones · Click to Top Up")
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </JadeGlassPanel>
          )}

          {/* =============================================================== */}
          {/* 仙阁三：云海试炼塔 (2D 仙侠御剑斗法舞台 · 自动服丹 + 掉仙矿)      */}
          {/* =============================================================== */}
          {activeBuilding === "REALM" && (
            <JadeGlassPanel
              withTopClasp
              className="flex-1 p-5 flex flex-col justify-between min-h-[410px] border-t-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#253D39] tracking-wider">
                    {t(
                      "云海试炼塔 · 御剑伏魔台 (自动服丹回春 · 掉落炼器仙矿与灵种)",
                      "Cloud Trial Tower · 2D Immortal Combat Arena"
                    )}
                  </h3>
                  <p className="text-xs font-serif text-[#587570] mt-0.5">
                    {t(
                      "气血低于五成半时将自动服用灵圃炼制的回春灵丹；降伏守护玄兽可获玄铁、陨铁与仙种，登榜享周天榜 50% 国库灵石大分润",
                      "Auto-consumes healing pills below 55% HP; defeat Guardians to obtain ores & seeds, climb leaderboards for weekly treasury dividends"
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isBattling || realmFloorPage === 0}
                    onClick={() => setRealmFloorPage((p) => Math.max(0, p - 1))}
                    className="px-2 py-1 text-xs font-serif border border-[#C8AA72]/60 bg-white/80 hover:bg-[#FAF6EC] disabled:opacity-40 text-[#587570]"
                  >
                    ◀ 上五重
                  </button>

                  {Array.from({ length: 5 }, (_, i) => {
                    const flNum = realmFloorPage * 5 + i + 1;
                    const isCleared = flNum <= cultivator.highestFloorCleared;
                    const isNextTarget = flNum === cultivator.highestFloorCleared + 1;
                    const isLocked = flNum > cultivator.highestFloorCleared + 1;
                    const isSelected = selectedFloor === flNum;

                    return (
                      <button
                        key={flNum}
                        disabled={isBattling || isLocked}
                        onClick={() => setSelectedFloor(flNum)}
                        className={`px-3 py-1 text-xs font-serif transition flex items-center gap-1 ${
                          isSelected
                            ? "xianxia-btn-gold font-bold shadow-xs"
                            : isCleared
                            ? "border border-[#52D1B2]/60 bg-[#F2FBF8] text-[#1E574B] hover:bg-[#E3F6F0]"
                            : isNextTarget
                            ? "border-2 border-[#D4AF37] bg-[#FFFBEB] text-[#92400E] font-bold"
                            : "border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60"
                        }`}
                      >
                        {isCleared && <span className="text-[10px] text-[#059669]">✓</span>}
                        {isNextTarget && <span className="text-[10px] text-[#D97706]">⚡</span>}
                        {isLocked && <span className="text-[10px] text-slate-400">🔒</span>}
                        <span>{t(`第${flNum}重`, `T${flNum}`)}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={isBattling}
                    onClick={() => setRealmFloorPage((p) => p + 1)}
                    className="px-2 py-1 text-xs font-serif border border-[#C8AA72]/60 bg-white/80 hover:bg-[#FAF6EC] text-[#587570]"
                  >
                    下五重 ▶
                  </button>

                  <button
                    type="button"
                    disabled={isBattling}
                    onClick={() => {
                      const target = cultivator.highestFloorCleared + 1;
                      setSelectedFloor(target);
                      setRealmFloorPage(Math.floor(cultivator.highestFloorCleared / 5));
                    }}
                    className="ml-auto text-[11px] font-serif text-[#92400E] hover:text-[#78350F] underline flex items-center gap-1"
                  >
                    <span>⚡ 直达待破关卡 (第 {cultivator.highestFloorCleared + 1} 重)</span>
                  </button>
                </div>
              </div>

              {(() => {
                const currentFloorCfg =
                  catalogs.realmFloors.find((f) => f.floor === selectedFloor) ||
                  catalogs.realmFloors[0];
                const activeLog =
                  isBattling &&
                  visualBattleReport &&
                  visualBattleReport.logs[battleTurnIdx - 1];

                const displayHeroHp = activeLog
                  ? activeLog.cultivatorHpAfter
                  : cultivator.hp;
                const displayMonsterHp = activeLog
                  ? activeLog.monsterHpAfter
                  : currentFloorCfg.monsterHp;

                return (
                  <div className="my-2.5 border border-[#C8AA72]/50 bg-white/70 p-4 relative overflow-hidden">
                    <div className="grid grid-cols-2 gap-4 items-center">
                      {/* 左侧：玩家道身 */}
                      <div className="flex flex-col items-center relative">
                        {arenaFloatingDmg?.target === "hero" && (
                          <div
                            className={`absolute -top-2 z-20 px-2.5 py-0.5 bg-white border border-[#C8AA72] font-serif font-bold text-xs animate-bounce shadow-xs ${
                              arenaFloatingDmg.tone === "jade"
                                ? "text-[#2E6B5E]"
                                : "text-[#A65353]"
                            }`}
                          >
                            {arenaFloatingDmg.text}
                          </div>
                        )}
                        <div className="w-36 mb-2">
                          <div className="flex justify-between text-[11px] font-serif font-semibold text-[#2E6B5E] mb-1">
                            <span>{trDaoName(cultivator.daoName, lang)}</span>
                            <span className="font-mono tabular-nums">
                              {displayHeroHp}/{cultivator.maxHp}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-[#D3E5E1] border border-[#9CC5BD] overflow-hidden">
                            <div
                              className="h-full bg-[#5BA496] transition-all duration-300"
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    Math.round(
                                      (displayHeroHp / cultivator.maxHp) * 100
                                    )
                                  )
                                )}%`,
                              }}
                            />
                          </div>
                        </div>

                        <CultivatorSprite
                          avatarClass={avatarClass}
                          hasWeapon={!!cultivator.equippedArtifact}
                          isAttacking={heroAnimState === "attack"}
                          isHit={heroAnimState === "hit"}
                          isHealing={heroAnimState === "heal"}
                          size="md"
                        />
                      </div>

                      {/* 右侧：试炼塔守护瑞兽/玄灵 */}
                      <div className="flex flex-col items-center relative">
                        {arenaFloatingDmg?.target === "monster" && (
                          <div className="absolute -top-2 z-20 px-2.5 py-0.5 bg-white border border-[#C8AA72] font-serif font-bold text-xs text-[#8A6830] animate-bounce shadow-xs">
                            {arenaFloatingDmg.text}
                          </div>
                        )}
                        <div className="w-36 mb-2">
                          <div className="flex justify-between text-[11px] font-serif font-semibold text-[#6E558C] mb-1">
                            <span>
                              {trMonsterName(currentFloorCfg.monsterName, lang)}
                            </span>
                            <span className="font-mono tabular-nums">
                              {displayMonsterHp}/{currentFloorCfg.monsterHp}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-[#EAE4F2] border border-[#A892BD] overflow-hidden">
                            <div
                              className="h-full bg-[#9D86BD] transition-all duration-300"
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    Math.round(
                                      (displayMonsterHp /
                                        currentFloorCfg.monsterHp) *
                                        100
                                    )
                                  )
                                )}%`,
                              }}
                            />
                          </div>
                        </div>

                        <MonsterSprite
                          floor={currentFloorCfg.floor}
                          isHit={monsterAnimState === "hit"}
                          isAttacking={monsterAnimState === "attack"}
                        />
                      </div>
                    </div>

                    <div className="mt-3.5 pt-2.5 border-t border-[#C8AA72]/30 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs font-serif text-[#476660]">
                        {activeLog
                          ? activeLog.actionText
                          : latestBattleReport && !isBattling
                          ? latestBattleReport.victory
                            ? t(
                                `试炼通过 · 获赐玄铁 +${latestBattleReport.rewards?.ironOres}${
                                  (latestBattleReport.rewards?.meteorOres || 0) > 0
                                    ? `、陨铁 +${latestBattleReport.rewards?.meteorOres}`
                                    : ""
                                }、${latestBattleReport.rewards?.seedTier || 1}阶仙种×1`,
                                `Victory · +${latestBattleReport.rewards?.ironOres} Ores & Seeds`
                              )
                            : t(
                                "气血稍逊，请回灵圃服丹或铸造更高品阶仙剑后再试",
                                "Return to the Herb Garden or Sword Forge to strengthen your Cultivator"
                              )
                          : t(
                                `本重镇守：${currentFloorCfg.monsterName} · ${currentFloorCfg.monsterTitle}（通过掉落玄铁 +${currentFloorCfg.dropIronOres}${
                                  currentFloorCfg.dropMeteorOres > 0
                                    ? `、陨铁 +${currentFloorCfg.dropMeteorOres}`
                                    : ""
                                }、${currentFloorCfg.dropSeedTier}阶仙种×1、诛魔积分 +${currentFloorCfg.slayerScorePoints}）`,
                                `Guardian: ${trMonsterName(
                                  currentFloorCfg.monsterName,
                                  "en"
                                )} (Drops +${currentFloorCfg.dropIronOres} Ores & Seeds)`
                              )}
                      </div>

                      <div className="relative">
                        {tutorialStage === 5 && !isBattling && !loadingAction && (
                          <GuideHandPointer
                            text={t("轻触佩剑出鞘伏魔", "Challenge Guardian")}
                            direction="down"
                            className="absolute -top-8 right-4 z-30"
                          />
                        )}
                        <button
                          disabled={isBattling || loadingAction}
                          onClick={() =>
                            handleStartVisualBattle(currentFloorCfg.floor)
                          }
                          className={`px-4 py-2 font-serif font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm min-w-[145px] ${
                            cultivator.spiritStones >= currentFloorCfg.entryFeeStones
                              ? "xianxia-btn-gold"
                              : "bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#F87171]"
                          }`}
                        >
                          {activeLoading?.type === "BATTLE" ? (
                            <XianxiaLoadingRing
                              text={activeLoading.textZh}
                              size="sm"
                              tone="light"
                            />
                          ) : (
                            <>
                              <Swords className="w-3.5 h-3.5" />
                              {isBattling
                                ? t("御剑斗法中...", "In Combat...")
                                : cultivator.spiritStones < currentFloorCfg.entryFeeStones
                                ? t(
                                    `⚠️ 灵石不足 (需 ${currentFloorCfg.entryFeeStones}💎)`,
                                    `⚠️ Need ${currentFloorCfg.entryFeeStones}💎`
                                  )
                                : t(
                                    `御剑试炼第 ${currentFloorCfg.floor} 重${
                                      currentFloorCfg.entryFeeStones > 0
                                        ? ` (-${currentFloorCfg.entryFeeStones}💎)`
                                        : ""
                                    }`,
                                    `Challenge Tier ${currentFloorCfg.floor}${
                                      currentFloorCfg.entryFeeStones > 0
                                        ? ` (-${currentFloorCfg.entryFeeStones}💎)`
                                        : ""
                                    }`
                                  )}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </JadeGlassPanel>
          )}

          {/* =============================================================== */}
          {/* 仙阁四：问鼎论剑台 (PVP 基础对打 · 12回合对决 + ELO 积分)         */}
          {/* =============================================================== */}
          {activeBuilding === "ARENA" && (
            <JadeGlassPanel
              withTopClasp
              className="flex-1 p-5 flex flex-col justify-between min-h-[410px] border-t-0"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-serif font-bold text-[#253D39] tracking-wider flex items-center gap-2">
                      <Swords className="w-4 h-4 text-[#C8AA72]" />
                      <span>
                        {t(
                          "问鼎论剑台 · 诸天修士切磋演武 (12 回合攻防对抗 · ELO 积分)",
                          "Apex Duel Arena · 12-Turn PVP Combat & ELO Rating"
                        )}
                      </span>
                    </h3>
                    <p className="text-xs font-serif text-[#587570] mt-0.5">
                      {t(
                        "根据道身攻击、暴击、护体与飞剑词缀演武对抗，残血自动服用随身回春丹；胜者夺得战勋灵石并晋级【问鼎论剑周天榜】",
                        "Simulates turn-based duels using ATK/DEF/crits and auto-healing pills. Victor gains ELO and stones, climbing the Duel Heaven Board."
                      )}
                    </p>
                  </div>

                  {/* 个人论剑战绩摘要徽章 */}
                  <div className="flex items-center gap-2 bg-[#FAF6EC] border border-[#C8AA72]/60 px-3 py-1.5 text-xs font-serif">
                    <span className="text-[#8A6828] font-bold">
                      {(() => {
                        const score = cultivator.scores.duelScore || 1000;
                        if (score >= 1500) return t("太虚剑仙", "Grand Sword Immortal");
                        if (score >= 1300) return t("元婴尊者", "Nascent Soul Master");
                        if (score >= 1150) return t("金丹剑魁", "Golden Core Elite");
                        if (score >= 1000) return t("筑基剑修", "Foundation Swordsman");
                        return t("练气道童", "Qi Novice");
                      })()}
                    </span>
                    <span className="text-[#C8AA72]/60">|</span>
                    <span className="text-[#594119]">
                      {t("论剑积分", "ELO")}:{" "}
                      <strong className="font-mono text-[#8A6828] tabular-nums">
                        {cultivator.scores.duelScore || 1000}
                      </strong>
                    </span>
                    <span className="text-[#C8AA72]/60">|</span>
                    <span className="text-[#2E6B5E] font-mono tabular-nums">
                      {cultivator.scores.duelWins || 0}{t("胜", "W")}{" "}
                      <span className="text-[#A65353]">
                        {cultivator.scores.duelLosses || 0}{t("负", "L")}
                      </span>
                    </span>
                  </div>
                </div>

                <CloudDivider className="my-2.5" />

                {/* 对手匹配列表 (易 / 中 / 难) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-2">
                  {(snapshot.pvpOpponents || []).map((opp) => {
                    const isOpponentLoading =
                      activeLoading?.type === "ARENA" && activeLoading.id === opp.id;
                    const isEasy = opp.difficulty === "EASY";
                    const isHard = opp.difficulty === "HARD";

                    return (
                      <div
                        key={opp.id}
                        className={`border p-3 flex flex-col justify-between relative shadow-xs ${
                          isHard
                            ? "bg-[#FCF9F2] border-[#C8AA72]/80 ring-1 ring-[#C5A46A]/40"
                            : isEasy
                            ? "bg-white/80 border-[#9CC5BD]/60"
                            : "bg-white/75 border-[#C8AA72]/45"
                        }`}
                      >
                        <div>
                          {/* 顶栏：难度标签与胜率预测 */}
                          <div className="flex items-center justify-between pb-1.5 border-b border-[#C8AA72]/30 text-xs font-serif">
                            <span
                              className={`px-1.5 py-0.2 border text-[10px] font-semibold ${
                                isEasy
                                  ? "bg-[#E6F4F0] border-[#9CC5BD] text-[#2E6B5E]"
                                  : isHard
                                  ? "bg-[#FAF0E6] border-[#D4A373] text-[#A65353]"
                                  : "bg-[#F7F2E7] border-[#C8AA72] text-[#8A6828]"
                              }`}
                            >
                              {lang === "en" ? opp.difficultyLabelEn : opp.difficultyLabelZh}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-[#587570] tabular-nums">
                              {t("预估胜率", "Win Rate")} ~{opp.winChanceEstimatePct}%
                            </span>
                          </div>

                          {/* 对手立绘与名号 */}
                          <div className="flex items-center gap-2.5 my-2.5">
                            <div className="w-11 h-11 border border-[#C8AA72]/60 overflow-hidden bg-[#EDF5F3] shrink-0">
                              <img
                                src={resolveCharacterConfig(opp.avatarClass).imageSrc}
                                alt={opp.daoName}
                                className="w-full h-full object-cover object-top"
                              />
                            </div>
                            <div className="min-w-0 font-serif">
                              <div className="text-sm font-bold text-[#253D39] truncate">
                                {opp.daoName}
                              </div>
                              <div className="text-[10px] text-[#6E8E87] truncate">
                                {opp.title}
                              </div>
                            </div>
                          </div>

                          {/* 属性对比 */}
                          <div className="bg-white/60 border border-[#C8AA72]/30 p-2 space-y-1 text-[11px] font-serif">
                            <div className="flex justify-between">
                              <span className="text-[#64827D]">{t("对决气血", "HP")}:</span>
                              <span className="font-mono font-bold text-[#205247] tabular-nums">
                                {opp.hp}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#64827D]">{t("本命攻击", "ATK")}:</span>
                              <span className="font-mono font-bold text-[#8A6A32] tabular-nums">
                                {opp.atk}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#64827D]">{t("佩戴兵刃", "Weapon")}:</span>
                              <span className="font-semibold text-[#594119] truncate max-w-[120px]">
                                {opp.equippedArtifactName}
                              </span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-[#C8AA72]/20 text-[10px]">
                              <span className="text-[#8A6828] font-semibold">{t("胜者犒赏", "Rewards")}:</span>
                              <span className="font-mono text-[#2E6B5E] font-bold">
                                +{opp.rewardDuelPoints} {t("演武积分 (冲周榜)", "ELO Points")}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 拔剑应战按钮 */}
                        <button
                          type="button"
                          disabled={isPvpAnimating || loadingAction}
                          onClick={() => handleChallengePvp(opp)}
                          className={`mt-3 w-full py-2 text-xs font-serif font-bold transition flex items-center justify-center gap-1.5 min-h-[34px] ${
                            isHard ? "xianxia-btn-gold" : "xianxia-btn-celadon"
                          }`}
                        >
                          {isOpponentLoading ? (
                            <XianxiaLoadingRing
                              text={activeLoading?.textZh}
                              size="sm"
                              tone="light"
                            />
                          ) : (
                            <>
                              <Swords className="w-3.5 h-3.5" />
                              <span>{t("拔剑切磋 (12回合)", "Spar Duel (12 Turns)")}</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 底部论剑天道律令提示 */}
              <div className="mt-2 text-center text-[11px] font-serif text-[#64827D] border-t border-[#C8AA72]/30 pt-2">
                {t(
                  "天道昭彰 · 每次论剑由 NEAR NEP-413 会话密钥自动签署对决凭证，胜负实时上链存证并刷新论剑天榜。",
                  "Each duel is auto-signed by NEAR NEP-413 Session Key, recording outcome on-chain to update the Duel Heaven Board."
                )}
              </div>
            </JadeGlassPanel>
          )}

          {/* =============================================================== */}
          {/* 仙阁五：宗门天榜阁 (四大周天榜 · 国库五成每周日定时分润)          */}
          {/* =============================================================== */}
          {activeBuilding === "TREASURY" && (
            <JadeGlassPanel
              withTopClasp
              className="flex-1 p-5 flex flex-col justify-between min-h-[410px] border-t-0"
            >
              {/* 顶部紧凑标题与操作栏 (规则说明全部收纳至 Tips 浮窗，主界面清爽规整无堆叠) */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-[#C8AA72]/40">
                <div className="flex items-center gap-2">
                  <CinnabarSeal text="榜" variant="square" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-serif font-bold text-[#253D39] tracking-wider">
                        {t("太虚周天金榜", "Weekly Heaven Leaderboards")}
                      </h3>
                      {/* 规则与国库分账 Tips 按钮 */}
                      <button
                        type="button"
                        onClick={() => setIsTreasuryRulesTipsOpen(true)}
                        className="px-2 py-0.5 bg-[#FAF5E6] hover:bg-[#F3E8C8] text-[#8A5A12] border border-[#D4AF37]/60 text-[11px] font-serif font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                        title={t("点击查看国库五三二分账与发榜律令 Tips", "View Rules & Split Tips")}
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-[#B45309]" />
                        <span>{t("天榜律令 Tips", "Rules & Tips")}</span>
                      </button>
                    </div>
                    <div className="text-[11px] font-serif text-[#668580] mt-0.5 flex items-center gap-2">
                      <span>💎 {t("周俸总池:", "Weekly Pool:")}</span>
                      <span className="font-mono font-bold text-[#B45309]">
                        {(treasury.activeWeeklyRewardPoolStones / 50).toFixed(2)} NEAR ({treasury.activeWeeklyRewardPoolStones} {t("灵石", "Stones")})
                      </span>
                      <span className="text-[#C8AA72]/60">|</span>
                      <span>{t("前四席享 50%/25%/15%/10% 分润", "Top 4 share 50/25/15/10%")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* 周榜东八区周日24点倒计时 */}
                  <WeeklyCountdownBadge
                    targetIsoUtc={treasury.nextWeeklySettlementUtc8}
                    label={t("发榜倒计时", "Auto-Settle")}
                  />

                  {/* 查验宗门国库账房入口 */}
                  <button
                    type="button"
                    onClick={() => setIsTreasuryModalOpen(true)}
                    className="px-2.5 py-1 bg-gradient-to-r from-[#D97706] to-[#B45309] text-white hover:from-[#B45309] hover:to-[#92400E] border border-[#FDE68A] text-xs font-serif font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="查验宗门国库司库总账与五三二流向明细"
                  >
                    <Coins className="w-3.5 h-3.5 text-[#FEF3C7]" />
                    <span>{t("国库账房", "Treasury")}</span>
                  </button>

                  {/* 查收天阙传谕信箱入口 */}
                  <button
                    type="button"
                    onClick={handleOpenMailbox}
                    className="px-2.5 py-1 bg-[#12221F] hover:bg-[#1A332E] text-[#5FE3C8] hover:text-[#FFFFFF] border border-[#C8AA72]/60 text-xs font-serif font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="查收天道自动下达的周结算法旨与周俸附件"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#5FE3C8]" />
                    <span>{t("天阙传谕", "Decrees Inbox")}</span>
                  </button>
                </div>
              </div>

              <CloudDivider className="my-2" />

              {/* 四大周天榜独立切换与全宽展示主体 (每次专注展示一榜，视野开阔不拥挤) */}
              {(() => {
                const boardsData = [
                  {
                    id: "SLAYER" as const,
                    title: t("诛魔天榜 · 三成奖池", "Slayer Board · 30% Pool"),
                    shortTitle: t("诛魔天榜", "Slayer Board"),
                    sub: t("按云海试炼通关层数排序（最低门槛：第 1 层）", "Sorted by Trial Tower Floors (Min: Floor 1)"),
                    poolSharePct: 30,
                    poolStones: Number((treasury.activeWeeklyRewardPoolStones * 0.3).toFixed(1)),
                    metricName: t("试炼通关层数", "Trial Floor"),
                    icon: Swords,
                    entries: treasury.boards.slayerBoard,
                  },
                  {
                    id: "ALCHEMY" as const,
                    title: t("百草药圣榜 · 二成奖池", "Alchemy Board · 20% Pool"),
                    shortTitle: t("百草药圣榜", "Alchemy Board"),
                    sub: t("按种植收获灵草株数排序（最低门槛：收获 3 株）", "Sorted by Herbs Harvested (Min: 3 Herbs)"),
                    poolSharePct: 20,
                    poolStones: Number((treasury.activeWeeklyRewardPoolStones * 0.2).toFixed(1)),
                    metricName: t("收获灵草株数", "Herbs Harvested"),
                    icon: Sprout,
                    entries: treasury.boards.alchemyBoard,
                  },
                  {
                    id: "BLACKSMITH" as const,
                    title: t("神工天匠榜 · 二成奖池", "Swordsmith Board · 20% Pool"),
                    shortTitle: t("神工天匠榜", "Swordsmith Board"),
                    sub: t("按道身综合战力(气血+攻击×4)排序（最低门槛：1150 战力）", "Sorted by Combat Power (Min: 1150 PWR)"),
                    poolSharePct: 20,
                    poolStones: Number((treasury.activeWeeklyRewardPoolStones * 0.2).toFixed(1)),
                    metricName: t("道身综合战力", "Combat Power"),
                    icon: Hammer,
                    entries: treasury.boards.blacksmithBoard,
                  },
                  {
                    id: "DUEL" as const,
                    title: t("问鼎论剑榜 · 三成奖池", "Duel Board · 30% Pool"),
                    shortTitle: t("问鼎论剑榜", "Duel Board"),
                    sub: t("按论剑台演武积分排序（最低门槛：1020 积分）", "Sorted by Duel ELO Points (Min: 1020 Pts)"),
                    poolSharePct: 30,
                    poolStones: Number((treasury.activeWeeklyRewardPoolStones * 0.3).toFixed(1)),
                    metricName: t("论剑演武积分", "Duel Score"),
                    icon: Trophy,
                    entries: treasury.boards.duelBoard,
                  },
                ];

                const targetBoard =
                  boardsData.find((b) => b.id === boardViewTab) || boardsData[0];
                const top1 = targetBoard.entries[0];
                const top2 = targetBoard.entries[1];
                const top3 = targetBoard.entries[2];
                const extraEntries = targetBoard.entries.slice(4);
                const playerEntry = targetBoard.entries.find((e) => e.isPlayer);
                const Icon = targetBoard.icon;

                const seatMeta = [
                  {
                    badgeZh: "👑 壹 · 魁首",
                    badgeEn: "👑 #1 Champion",
                    shareDefault: 50,
                    rowBg:
                      "bg-gradient-to-r from-[#FFF9E2] via-[#FEF3C7]/90 to-[#FDE68A]/50 border-l-4 border-l-[#D97706]",
                    badgeStyle:
                      "bg-gradient-to-r from-[#D97706] to-[#B45309] text-white shadow-2xs",
                  },
                  {
                    badgeZh: "🥈 贰 · 榜眼",
                    badgeEn: "🥈 #2 Runner-up",
                    shareDefault: 25,
                    rowBg:
                      "bg-gradient-to-r from-[#F8FAFC] to-[#E2E8F0]/70 border-l-4 border-l-[#64748B]",
                    badgeStyle: "bg-[#475569] text-white",
                  },
                  {
                    badgeZh: "🥉 叁 · 探花",
                    badgeEn: "🥉 #3 Third",
                    shareDefault: 15,
                    rowBg:
                      "bg-gradient-to-r from-[#FAF6F2] to-[#EFE6DD]/70 border-l-4 border-l-[#8D6E63]",
                    badgeStyle: "bg-[#785549] text-white",
                  },
                  {
                    badgeZh: "肆 · 进士",
                    badgeEn: "#4 Fourth",
                    shareDefault: 10,
                    rowBg: "bg-white border-l-4 border-l-[#3E6B63]",
                    badgeStyle: "bg-[#3E6B63] text-white",
                  },
                ];

                return (
                  <div className="space-y-3 font-serif my-auto">
                    {/* 1. 四大天榜全宽牌匾切换栏 (4大独立榜单按钮，点击切换对应榜单) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {boardsData.map((b) => {
                        const active = boardViewTab === b.id;
                        const TabIcon = b.icon;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setBoardViewTab(b.id)}
                            className={`p-2.5 border text-left transition-all flex flex-col justify-between ${
                              active
                                ? "bg-[#162925] text-[#F4F9F7] border-[#C8AA72] ring-2 ring-[#C8AA72]/60 shadow-md"
                                : "bg-white/90 text-[#253D39] border-[#C8AA72]/45 hover:bg-[#FAF6EC]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <TabIcon
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    active ? "text-[#F2CE85]" : "text-[#253D39]"
                                  }`}
                                />
                                <span className="text-xs sm:text-[13px] font-bold truncate">
                                  {b.shortTitle}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 font-bold shrink-0 ${
                                  active
                                    ? "bg-[#2C4C45] text-[#5FE3C8]"
                                    : "bg-[#EDF5F3] text-[#2E6B5E]"
                                }`}
                              >
                                {b.poolSharePct}%{t("池", "")}
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono">
                              <span
                                className={
                                  active ? "text-[#FDE68A] font-bold" : "text-[#8A6828] font-bold"
                                }
                              >
                                💎 {(b.poolStones / 50).toFixed(2)} NEAR ({b.poolStones} {t("石", "S")})
                              </span>
                              <span
                                className={`text-[10px] font-serif ${
                                  active ? "text-[#A9C7C0]" : "text-[#688580]"
                                }`}
                              >
                                {t(`${b.entries.length}人在榜`, `${b.entries.length} ranked`)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* 2. 当前选中天榜抬头横幅 */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#F8F3E6] border border-[#C8AA72]/60 shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-[#253D39] text-[#E5D2A8] flex items-center justify-center shrink-0 shadow-xs">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#253D39] flex flex-wrap items-center gap-2">
                            <span>{targetBoard.title}</span>
                            <span className="text-xs font-mono px-2 py-0.5 bg-[#FEF3C7] border border-[#F59E0B]/50 text-[#92400E] font-bold">
                              💎 {t("本榜周俸池:", "Board Pool:")} {(targetBoard.poolStones / 50).toFixed(2)} NEAR ({targetBoard.poolStones}{" "}
                              {t("灵石", "Stones")})
                            </span>
                          </div>
                          <div className="text-xs text-[#5C7A74] mt-0.5">{targetBoard.sub}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {playerEntry ? (
                          <span className="text-xs font-serif bg-[#162925] text-[#F2CE85] px-3 py-1 border border-[#C8AA72] font-bold">
                            {t("贫道当前位次:", "Your Rank:")} #{playerEntry.rank}（{playerEntry.metricLabel} ·{" "}
                            {playerEntry.estimatedRewardStones > 0
                              ? `+${(playerEntry.estimatedRewardNear || playerEntry.estimatedRewardStones / 50).toFixed(2)} NEAR (${playerEntry.estimatedRewardStones}${t("灵石", "S")})`
                              : t("候补冲榜", "Waitlist")}
                            ）
                          </span>
                        ) : (
                          <span className="text-xs font-serif text-[#688580] bg-white px-2.5 py-1 border border-[#C8AA72]/40">
                            {t("前四席享 50% / 25% / 15% / 10% 国库周俸分润", "Top 4 share 50/25/15/10%")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 3. 三甲封神金阶领奖台 (Three-Tier Podium) */}
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-4 items-end pt-3 pb-1.5 px-3 sm:px-6 bg-gradient-to-b from-white/70 via-white/90 to-[#FAF6EC] border border-[#C8AA72]/50 shadow-xs">
                      {/* 🥈 榜眼 (第 2 名) */}
                      <div className="flex flex-col items-center">
                        {top2 ? (
                          <div className="w-full flex flex-col items-center">
                            <Medal className="w-5 h-5 text-[#64748B] mb-0.5" />
                            <div className="flex items-center gap-1 max-w-[130px]">
                              <img
                                src={resolveCharacterConfig(top2.avatarClass || "sword").imageSrc}
                                alt="avatar"
                                className="w-5 h-5 rounded-full border border-[#94A3B8] object-cover shrink-0 shadow-2xs"
                              />
                              <span className="text-xs sm:text-sm font-bold text-[#1E293B] truncate">
                                {trDaoName(top2.daoName, lang)}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono font-bold text-[#475569] bg-white px-2 py-0.5 border border-[#CBD5E1] my-1">
                              {top2.metricLabel}
                            </div>
                            <div className="text-xs font-mono font-bold text-[#14532D] mb-1 text-center">
                              +{(top2.estimatedRewardNear || top2.estimatedRewardStones / 50).toFixed(2)} NEAR ({top2.sharePct}%)
                              <span className="text-[10px] text-[#64748B] block">
                                ({top2.estimatedRewardStones} {t("灵石", "S")})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-xs text-[#64748B] italic mb-2">
                            {t("🥈 榜眼虚位以待 (25%分润)", "🥈 #2 Open (25%)")}
                          </div>
                        )}
                        <div className="w-full h-14 sm:h-16 bg-gradient-to-b from-[#E2E8F0] to-[#CBD5E1] border-t-2 border-[#94A3B8] flex items-center justify-center font-bold text-sm sm:text-base text-[#334155] shadow-xs">
                          {t("贰 · 榜眼", "II · Runner-up")}
                        </div>
                      </div>

                      {/* 👑 魁首 (第 1 名) */}
                      <div className="flex flex-col items-center">
                        {top1 ? (
                          <div className="w-full flex flex-col items-center relative">
                            <Crown className="w-7 h-7 text-[#D4AF37] fill-[#D4AF37] mb-0.5 animate-bounce" />
                            <div className="flex items-center gap-1.5 max-w-[150px]">
                              <img
                                src={resolveCharacterConfig(top1.avatarClass || "saintess").imageSrc}
                                alt="avatar"
                                className="w-6 h-6 rounded-full border border-[#D4AF37] object-cover shrink-0 shadow-2xs ring-1 ring-[#D4AF37]/50"
                              />
                              <span className="text-sm sm:text-base font-bold text-[#422D0B] truncate">
                                {trDaoName(top1.daoName, lang)}
                              </span>
                              {top1.isPlayer && (
                                <span className="text-[10px] bg-[#B8860B] text-white px-1.5 py-0.2 font-bold shrink-0">
                                  {t("本人", "YOU")}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono font-bold text-[#8A5A12] bg-[#FEF3C7] px-2.5 py-0.5 border border-[#F59E0B]/60 my-1 shadow-2xs">
                              {top1.metricLabel}
                            </div>
                            <div className="text-xs sm:text-sm font-mono font-bold text-[#14532D] mb-1 text-center">
                              +{(top1.estimatedRewardNear || top1.estimatedRewardStones / 50).toFixed(2)} NEAR ({top1.sharePct}%)
                              <span className="text-[10px] text-[#8A5A12] block">
                                ({top1.estimatedRewardStones} {t("灵石", "S")})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-xs text-[#8A6828] italic mb-2">
                            {t("👑 魁首虚位以待 (50%分润)", "👑 #1 Open (50%)")}
                          </div>
                        )}
                        <div className="w-full h-20 sm:h-22 bg-gradient-to-b from-[#FEF3C7] to-[#FDE68A] border-t-2 border-[#D4AF37] flex flex-col items-center justify-center font-bold text-base sm:text-lg text-[#78350F] shadow-md ring-1 ring-[#D4AF37]/50">
                          <span>{t("壹 · 魁首", "I · Champion")}</span>
                          <span className="text-[10px] font-normal text-[#92400E]">
                            {t("独揽五成榜池", "50% Board Pool")}
                          </span>
                        </div>
                      </div>

                      {/* 🥉 探花 (第 3 名) */}
                      <div className="flex flex-col items-center">
                        {top3 ? (
                          <div className="w-full flex flex-col items-center">
                            <Medal className="w-5 h-5 text-[#8D6E63] mb-0.5" />
                            <div className="flex items-center gap-1 max-w-[130px]">
                              <img
                                src={resolveCharacterConfig(top3.avatarClass || "venerable").imageSrc}
                                alt="avatar"
                                className="w-5 h-5 rounded-full border border-[#8D6E63] object-cover shrink-0 shadow-2xs"
                              />
                              <span className="text-xs sm:text-sm font-bold text-[#3E2723] truncate">
                                {trDaoName(top3.daoName, lang)}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono font-bold text-[#5D4037] bg-white px-2 py-0.5 border border-[#D7CCC8] my-1">
                              {top3.metricLabel}
                            </div>
                            <div className="text-xs font-mono font-bold text-[#14532D] mb-1 text-center">
                              +{(top3.estimatedRewardNear || top3.estimatedRewardStones / 50).toFixed(2)} NEAR ({top3.sharePct}%)
                              <span className="text-[10px] text-[#8D6E63] block">
                                ({top3.estimatedRewardStones} {t("灵石", "S")})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-xs text-[#8D6E63] italic mb-2">
                            {t("🥉 探花虚位以待 (15%分润)", "🥉 #3 Open (15%)")}
                          </div>
                        )}
                        <div className="w-full h-12 sm:h-14 bg-gradient-to-b from-[#EFEBE9] to-[#D7CCC8] border-t-2 border-[#8D6E63] flex items-center justify-center font-bold text-sm sm:text-base text-[#4E342E] shadow-xs">
                          {t("叁 · 探花", "III · Third")}
                        </div>
                      </div>
                    </div>

                    {/* 4. 全宽 12 列天榜封神名册表 (单榜独占 100% 宽度，列距宽敞绝不重叠) */}
                    <div className="border border-[#C8AA72]/65 bg-white shadow-xs overflow-hidden">
                      <div className="grid grid-cols-12 items-center h-8 px-4 bg-[#162925] text-[#E5D2AB] text-xs font-serif font-bold whitespace-nowrap">
                        <div className="col-span-3">{t("天榜席位", "Heaven Seat")}</div>
                        <div className="col-span-4">{t("上榜道友道号", "Cultivator Name")}</div>
                        <div className="col-span-2 text-center">{targetBoard.metricName}</div>
                        <div className="col-span-3 text-right">{t("预计周俸分润 (NEAR)", "Weekly Dividend (NEAR)")}</div>
                      </div>

                      <div className="divide-y divide-[#C8AA72]/30">
                        {[0, 1, 2, 3].map((seatIdx) => {
                          const entry = targetBoard.entries[seatIdx];
                          const meta = seatMeta[seatIdx];
                          return (
                            <div
                              key={seatIdx}
                              className={`grid grid-cols-12 items-center h-11 px-4 text-xs sm:text-sm whitespace-nowrap ${meta.rowBg} ${
                                entry?.isPlayer ? "ring-1 ring-inset ring-[#D97706]" : ""
                              }`}
                            >
                              <div className="col-span-3 flex items-center">
                                <span
                                  className={`px-2 py-0.5 text-xs font-bold leading-none ${
                                    entry ? meta.badgeStyle : "bg-stone-200 text-stone-600"
                                  }`}
                                >
                                  {lang === "en" ? meta.badgeEn : meta.badgeZh}
                                </span>
                              </div>

                              <div className="col-span-4 flex items-center gap-2 min-w-0 pr-2">
                                {entry ? (
                                  <>
                                    <img
                                      src={resolveCharacterConfig(entry.avatarClass || "saintess").imageSrc}
                                      alt="avatar"
                                      className="w-6 h-6 rounded-full border border-[#C8AA72] object-cover shrink-0 shadow-2xs"
                                    />
                                    <span className="font-bold text-[#253D39] truncate">
                                      {trDaoName(entry.daoName, lang)}
                                    </span>
                                    {entry.isPlayer && (
                                      <span className="px-1.5 py-0.5 bg-[#B8860B] text-white text-[10px] font-bold leading-none shrink-0">
                                        {t("道友本人", "YOU")}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs text-[#78908C] italic">
                                    {t("虚位以待 · 达标即刻登榜", "Open Seat · Qualify to Claim")}
                                  </span>
                                )}
                              </div>

                              <div className="col-span-2 text-center">
                                {entry ? (
                                  <span className="inline-block font-mono text-xs font-bold px-2.5 py-0.5 bg-white border border-[#C8AA72]/60 text-[#594119]">
                                    {entry.metricLabel}
                                  </span>
                                ) : (
                                  <span className="font-mono text-xs text-[#94A8A4]">
                                    {t("待登榜", "—")}
                                  </span>
                                )}
                              </div>

                              <div className="col-span-3 text-right font-mono">
                                {entry ? (
                                  <div className="flex flex-col items-end">
                                    <span className="font-bold text-[#14532D] text-xs sm:text-sm tabular-nums">
                                      +{(entry.estimatedRewardNear || entry.estimatedRewardStones / 50).toFixed(2)} NEAR{" "}
                                      <span className="text-xs text-[#92400E]">
                                        ({entry.sharePct}%)
                                      </span>
                                    </span>
                                    <span className="text-[10px] text-[#8A5A12] tabular-nums">
                                      ({entry.estimatedRewardStones} {t("灵石", "Stones")})
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-[#64827D]">
                                    {t(`享池内 ${meta.shareDefault}% 分润`, `${meta.shareDefault}% Pool Share`)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* 第 5 名及后续候补道友 */}
                        {extraEntries.map((e) => (
                          <div
                            key={e.subAccountId}
                            className="grid grid-cols-12 items-center h-9 px-4 text-xs bg-[#FAF6EC]/70 whitespace-nowrap"
                          >
                            <div className="col-span-3 font-mono font-bold text-[#786646]">
                              #{e.rank} {t("候补席", "Waitlist")}
                            </div>
                            <div className="col-span-4 flex items-center gap-1.5 truncate font-semibold text-[#253D39]">
                              <img
                                src={resolveCharacterConfig(e.avatarClass || "saintess").imageSrc}
                                alt="avatar"
                                className="w-5 h-5 rounded-full border border-[#C8AA72]/60 object-cover shrink-0"
                              />
                              <span className="truncate">{trDaoName(e.daoName, lang)}</span>
                            </div>
                            <div className="col-span-2 text-center font-mono font-bold text-[#8A6828]">
                              {e.metricLabel}
                            </div>
                            <div className="col-span-3 text-right font-mono text-[#688580]">
                              {t("蓄势冲榜中", "Competing")}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </JadeGlassPanel>
          )}
        </section>
      </main>

      {/* 5. 紧凑单行天机推演状态栏 (Status Ticker Bar, 彻底降噪，首屏净空留给核心玩法) */}
      <StatusTickerBar
        txCount={snapshot.recentSessionReceipts.length}
        blockHeight={snapshot.chainStatus.latestBlockHeight}
        isExpanded={showNearPanel}
        onToggleExpand={() => setShowNearPanel((prev) => !prev)}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#C8AA72]/30 mb-3">
            <div>
              <h4 className="text-sm font-serif font-bold text-[#F4F9F7] tracking-wider">
                {t(
                  "天机链镜 · NEAR 账户抽象与无感会话授权 (FunctionCall Session Key + NEP-413)",
                  "NEAR Account Abstraction & Session Key Details"
                )}
              </h4>
              <p className="text-[11px] text-[#86ABA3] font-serif mt-0.5">
                {t(
                  "道身独立子账户派发 FunctionCall 会话密钥（限额 0.25 NEAR），每次播种、炼丹、铸剑、闯关均在后台自动签名上链",
                  "Each Cultivator sub-account holds a scoped FunctionCall Access Key (0.25 NEAR allowance) auto-signing every action."
                )}
              </p>
            </div>
            <span className="px-2 py-0.5 border border-[#9CC5BD] bg-[#162724] text-[11px] font-mono text-[#5FE3C8] tabular-nums">
              NEAR Testnet Block #{snapshot.chainStatus.latestBlockHeight}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* 卡片1：无感会话密钥 */}
            <div className="border border-[#C8AA72]/35 bg-[#142320] p-3 space-y-1.5 font-serif">
              <div className="font-bold text-[#F4F9F7] flex items-center justify-between">
                <span>
                  {t("1. 无感会话密钥", "1. FunctionCall Session Key")}
                </span>
                <CinnabarSeal text="契" variant="rect" />
              </div>
              <div className="text-[#86ABA3] font-mono text-[10px] truncate">
                Key: {snapshot.sessionKeyInfo.publicKey}
              </div>
              <div className="text-[#86ABA3] text-[11px]">
                {t("授权合约:", "Receiver:")}{" "}
                <span className="font-mono text-[#F2CE85]">
                  {snapshot.sessionKeyInfo.receiverId}
                </span>
              </div>
              <div className="text-[#86ABA3] text-[11px]">
                {t("代付额度:", "Gas Allowance:")}{" "}
                <strong className="text-[#F2CE85] font-mono tabular-nums">
                  {snapshot.sessionKeyInfo.remainingAllowanceNear} NEAR
                </strong>{" "}
                · {t("已签发:", "Signed:")}{" "}
                <span className="font-mono tabular-nums">
                  {snapshot.recentSessionReceipts.length}
                </span>{" "}
                {t("笔", "txs")}
              </div>
            </div>

            {/* 卡片2：道身 NFT 即账户 */}
            <div className="border border-[#C8AA72]/35 bg-[#142320] p-3 space-y-1.5 font-serif">
              <div className="font-bold text-[#F4F9F7] flex items-center justify-between">
                <span>
                  {t("2. 道身 NFT 即账户", "2. Cultivator NFT as Account")}
                </span>
                <span className="font-mono text-[#F2CE85] text-[11px]">
                  {cultivator.nftTokenId}
                </span>
              </div>
              <div className="text-[11px] text-[#86ABA3]">
                {t("绑定子账户:", "Sub-Account:")}{" "}
                <span className="font-mono text-[#F2CE85]">
                  {cultivator.boundSubAccountId}
                </span>
              </div>
              <div className="text-[11px] text-[#86ABA3]">
                {t("当前持有主号:", "Owner Wallet:")}{" "}
                <strong className="font-mono text-[#5FE3C8]">
                  {cultivator.ownerAccountId}
                </strong>
              </div>
              <div className="flex gap-1.5 pt-0.5">
                <input
                  type="text"
                  value={transferTargetInput}
                  onChange={(e) => setTransferTargetInput(e.target.value)}
                  className="flex-1 px-2 py-0.5 bg-[#0C1715] border border-[#C8AA72]/45 text-[11px] font-mono text-[#F4F9F7] focus:outline-none"
                  placeholder="buyer.testnet"
                />
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={async () => {
                    await callGameApi(
                      {
                        action: "TRANSFER_NFT_ACCOUNT",
                        newOwnerAccountId: transferTargetInput,
                      },
                      {
                        type: "TRANSFER",
                        textZh: "道身整号结契过户中...",
                        textEn: "Transferring NFT account...",
                      }
                    );
                    triggerFloatingStat(
                      t(
                        `道身 NFT 连同灵田飞剑已整号过户至 ${transferTargetInput}`,
                        `Transferred NFT Account to ${transferTargetInput}`
                      )
                    );
                  }}
                  className="xianxia-btn-celadon px-2.5 py-1 text-[11px] font-serif font-bold shrink-0 min-w-[80px] flex items-center justify-center"
                >
                  {activeLoading?.type === "TRANSFER" ? (
                    <XianxiaLoadingRing
                      text={activeLoading.textZh}
                      size="sm"
                      tone="light"
                    />
                  ) : (
                    t("整号过户", "Transfer")
                  )}
                </button>
              </div>
            </div>

            {/* 卡片3：实时 NEP-413 签名回执流 */}
            <div className="border border-[#C8AA72]/35 bg-[#142320] p-3 space-y-1 font-serif">
              <div className="font-bold text-[#F4F9F7] flex items-center justify-between">
                <span>
                  {t("3. 实时 NEP-413 签名回执", "3. Live Signed Receipts")}
                </span>
                <span className="text-[10px] text-[#5FE3C8] font-mono">
                  ed25519 Verified
                </span>
              </div>
              {snapshot.recentSessionReceipts.length === 0 ? (
                <div className="text-[11px] text-[#6E958E] py-2">
                  {t(
                    "点击上方灵田播种或铸剑，此处将实时生成免弹窗 NEP-413 签名回执...",
                    "Click plots or forge weapons to see auto-signed receipts..."
                  )}
                </div>
              ) : (
                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                  {snapshot.recentSessionReceipts.slice(0, 3).map((rc) => (
                    <div
                      key={rc.txHash}
                      className="p-1 bg-[#0C1715] border border-[#C8AA72]/25 text-[10px]"
                    >
                      <div className="font-semibold text-[#F2CE85] truncate">
                        [{rc.methodName}] {rc.summary}
                      </div>
                      <div className="font-mono text-[#7EA39B] truncate">
                        Tx: {rc.txHash.slice(0, 16)}... · Sig:{" "}
                        {rc.signature.slice(0, 14)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </StatusTickerBar>

      {/* 6. 天阙传谕 · 飞剑传书信箱弹窗 */}
      <CelestialMailModal
        isOpen={isMailOpen}
        onClose={() => setIsMailOpen(false)}
        mails={cultivator.inbox || []}
        activeMailId={activeMailId}
        onSelectMail={handleSelectMail}
        onClaimMail={handleClaimMail}
        onClaimAll={handleClaimAllMails}
        isClaiming={isClaimingMail}
      />

      {/* 6.5 宗门国库账房 · 司库总账与五三二流向明细弹窗 */}
      <SectTreasuryModal
        isOpen={isTreasuryModalOpen}
        onClose={() => setIsTreasuryModalOpen(false)}
        treasury={treasury}
        onClearGenesisFund={handleClearGenesisFund}
        lang={lang}
      />

      {/* 7. 问鼎论剑台 · 12回合对决回放弹窗 */}
      {isPvpModalOpen && activePvpOpponent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <JadeGlassPanel
            withTopClasp
            withTassels
            className="max-w-2xl w-full p-5 sm:p-6 z-10 flex flex-col justify-between max-h-[90vh] overflow-y-auto"
          >
            {/* 顶栏：标题与回合数 */}
            <div className="flex items-center justify-between pb-2 border-b border-[#C8AA72]/40">
              <div className="flex items-center gap-2">
                <CinnabarSeal text="战" variant="rect" />
                <h3 className="text-base sm:text-lg font-serif font-bold text-[#253D39] tracking-wider">
                  {t("问鼎论剑 · 演武推演", "Apex Duel · Live Combat Simulation")}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-serif font-bold text-[#8A6828] bg-[#F8F3E6] border border-[#C8AA72]/60 px-2 py-0.5 font-mono tabular-nums">
                  {t("回合", "Turn")} {pvpTurnIdx} /{" "}
                  {pvpDuelReport?.turnsTaken || 12}
                </span>
                {!isPvpAnimating && (
                  <button
                    onClick={() => {
                      setIsPvpModalOpen(false);
                      setPvpDuelReport(null);
                    }}
                    className="text-[#64827D] hover:text-[#253D39] transition-colors p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 核心对阵舞台 (左右修士对立) */}
            {(() => {
              const currentLog =
                pvpDuelReport && pvpTurnIdx > 0
                  ? pvpDuelReport.logs[pvpTurnIdx - 1]
                  : null;

              const displayHeroHp = currentLog
                ? currentLog.attackerName.includes(cultivator.daoName)
                  ? currentLog.attackerHpAfter
                  : currentLog.defenderHpAfter
                : (cultivator.hp ?? cultivator.maxHp);

              const displayOpponentHp = currentLog
                ? currentLog.attackerName.includes(activePvpOpponent.daoName)
                  ? currentLog.attackerHpAfter
                  : currentLog.defenderHpAfter
                : activePvpOpponent.hp;

              return (
                <div className="my-3 py-4 px-3 bg-white/70 border border-[#C8AA72]/45 relative overflow-hidden">
                  <div className="grid grid-cols-2 gap-4 items-center">
                    {/* 左侧：我方修士 */}
                    <div className="flex flex-col items-center relative">
                      {pvpFloatingDmg?.target === "hero" && (
                        <div
                          className={`absolute -top-3 z-30 px-2.5 py-0.5 bg-white border border-[#C8AA72] font-serif font-bold text-xs animate-bounce shadow-md ${
                            pvpFloatingDmg.tone === "jade"
                              ? "text-[#2E6B5E]"
                              : "text-[#A65353]"
                          }`}
                        >
                          {pvpFloatingDmg.text}
                        </div>
                      )}

                      <div className="w-32 sm:w-40 mb-2">
                        <div className="flex justify-between text-[11px] font-serif font-semibold text-[#2E6B5E] mb-0.5">
                          <span className="truncate">{trDaoName(cultivator.daoName, lang)}</span>
                          <span className="font-mono tabular-nums">
                            {displayHeroHp}/{cultivator.maxHp}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#D3E5E1] border border-[#9CC5BD] overflow-hidden">
                          <div
                            className="h-full bg-[#5BA496] transition-all duration-300"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  Math.round((displayHeroHp / cultivator.maxHp) * 100)
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <CultivatorSprite
                        avatarClass={avatarClass}
                        hasWeapon={!!cultivator.equippedArtifact}
                        isAttacking={pvpHeroAnim === "attack"}
                        isHit={pvpHeroAnim === "hit"}
                        isHealing={pvpHeroAnim === "heal"}
                        size="md"
                      />
                    </div>

                    {/* 右侧：论剑对手 */}
                    <div className="flex flex-col items-center relative">
                      {pvpFloatingDmg?.target === "opponent" && (
                        <div className="absolute -top-3 z-30 px-2.5 py-0.5 bg-white border border-[#C8AA72] font-serif font-bold text-xs text-[#8A6828] animate-bounce shadow-md">
                          {pvpFloatingDmg.text}
                        </div>
                      )}

                      <div className="w-32 sm:w-40 mb-2">
                        <div className="flex justify-between text-[11px] font-serif font-semibold text-[#8A6828] mb-0.5">
                          <span className="truncate">{activePvpOpponent.daoName}</span>
                          <span className="font-mono tabular-nums">
                            {displayOpponentHp}/{activePvpOpponent.hp}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#F3E7D3] border border-[#C8AA72] overflow-hidden">
                          <div
                            className="h-full bg-[#C59B4B] transition-all duration-300"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  Math.round(
                                    (displayOpponentHp / activePvpOpponent.hp) * 100
                                  )
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <CultivatorSprite
                        avatarClass={activePvpOpponent.avatarClass}
                        hasWeapon={true}
                        isAttacking={pvpOpponentAnim === "attack"}
                        isHit={pvpOpponentAnim === "hit"}
                        isHealing={pvpOpponentAnim === "heal"}
                        size="md"
                      />
                    </div>
                  </div>

                  {/* 中间剑气交织徽章 */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <Swords className="w-12 h-12 text-[#B89452]" />
                  </div>
                </div>
              );
            })()}

            {/* 斗法行动战报文字 */}
            <div className="bg-[#FAF7EE] border border-[#C8AA72]/40 p-2.5 min-h-[64px] flex items-center justify-center text-center font-serif text-xs text-[#4A3922]">
              {pvpDuelReport && pvpTurnIdx > 0 ? (
                <div className="leading-relaxed">
                  {pvpDuelReport.logs[pvpTurnIdx - 1]?.actionText}
                </div>
              ) : (
                <div className="text-[#7A5E2F] flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("两尊道身立于论剑台，正在引动剑气玄罡...", "Preparing combat simulation...")}</span>
                </div>
              )}
            </div>

            {/* 战斗结算结论 */}
            {!isPvpAnimating && pvpDuelReport && (
              <div
                className={`mt-3 p-3 border text-center font-serif ${
                  pvpDuelReport.victory
                    ? "bg-[#F3F9F6] border-[#73ADA1] text-[#1E4D43]"
                    : "bg-[#FDF6F6] border-[#D4A3A3] text-[#7A3333]"
                }`}
              >
                <div className="text-sm font-bold flex items-center justify-center gap-1.5">
                  <CinnabarSeal
                    text={pvpDuelReport.victory ? "捷" : "逊"}
                    variant="rect"
                  />
                  <span>
                    {pvpDuelReport.victory
                      ? t(
                          `论剑大捷！演武积分 +${pvpDuelReport.rewards.duelPointsDelta}，问鼎周天榜位跃升！`,
                          `Victory! Duel Pts +${pvpDuelReport.rewards.duelPointsDelta}`
                        )
                      : t(
                          `论剑惜败！扣除 ${Math.abs(pvpDuelReport.rewards.duelPointsDelta)} 积分，重整旗鼓再战！`,
                          `Defeat! Duel Pts ${pvpDuelReport.rewards.duelPointsDelta}`
                        )}
                  </span>
                </div>
                <div className="text-[11px] text-[#607E79] mt-1 font-mono">
                  NEAR NEP-413 Proof Tx: {pvpDuelReport.txHash.slice(0, 18)}...
                </div>
              </div>
            )}

            {/* 底部按钮 */}
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={isPvpAnimating}
                onClick={() => {
                  setIsPvpModalOpen(false);
                  setPvpDuelReport(null);
                }}
                className={`px-4 py-2 text-xs font-serif font-bold transition ${
                  isPvpAnimating
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                    : "xianxia-btn-gold shadow-sm"
                }`}
              >
                {isPvpAnimating
                  ? t("演武推演中...", "Simulating...")
                  : t("归还战台 (完成对决)", "Return to Abode")}
              </button>
            </div>
          </JadeGlassPanel>
        </div>
      )}

      {/* 8. NEAR 账号道身绑定与测试网钱包弹窗 */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <JadeGlassPanel
            withTopClasp
            withTassels
            className="max-w-md w-full p-5 sm:p-6 z-10 font-serif max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#C8AA72]/40">
              <div className="flex items-center gap-2">
                <CinnabarSeal text="契" variant="rect" />
                <h3 className="text-base font-bold text-[#253D39] tracking-wider">
                  {t("天道档案 · NEAR 测试网钱包与道身", "NEAR Testnet Wallet & Cultivator Archive")}
                </h3>
              </div>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="text-[#64827D] hover:text-[#253D39] transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. 官方 NEAR 测试网钱包直接连接 */}
            <div className="my-3 p-3 bg-[#132522] border border-[#52D1B2]/50 text-white space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#52D1B2]" />
                  <span className="text-xs font-bold text-[#E0C99B]">
                    {t("官方 NEAR 测试网钱包直连", "Official NEAR Testnet Wallet")}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#5FE3C8] px-1.5 py-0.2 border border-[#52D1B2]/40 bg-[#0E1E1B]">
                  Testnet
                </span>
              </div>

              {signedAccountId ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs bg-[#0B1715] p-2 border border-[#52D1B2]/30">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#52D1B2] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3BB89A]"></span>
                      </span>
                      <span className="font-mono text-[#5FE3C8] font-bold truncate max-w-[190px]">
                        {signedAccountId}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#A2C4BD] font-serif">{t("已结契", "Connected")}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleWalletDisconnect}
                      className="px-2.5 py-1 text-xs text-[#E77D7D] hover:text-white border border-[#E77D7D]/40 bg-[#251515] transition"
                    >
                      {t("断开钱包", "Disconnect Wallet")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-[#A2C4BD] leading-relaxed">
                    {t(
                      "支持 Meteor Wallet、MyNearWallet、HERE Wallet 等官方测试网钱包。一键授权连接，道身 NFT 即账户直接与您的测试网地址绑定！",
                      "Connect official NEAR Testnet wallets (Meteor, MyNearWallet, HERE). Your Cultivator NFT binds directly to your address!"
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleWalletConnect}
                    className="w-full xianxia-btn-gold py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Wallet className="w-4 h-4 text-[#7D5E2A]" />
                    <span>{t("呼出官方测试网钱包连接", "Connect Testnet Wallet (Selector)")}</span>
                  </button>
                </div>
              )}
            </div>

            <CloudDivider className="my-2.5" />

            {/* 2. 免钱包体验 / 指定账号档案切换 */}
            <p className="text-xs text-[#587570] mt-1 leading-relaxed">
              {t(
                "每一个 NEAR 账号拥有物理隔离的独立道身档案（修为境界、九宫灵田、飞剑法宝、论剑胜绩与传谕信箱）。若未安装钱包插件，可直接输入指定账号体验：",
                "Each NEAR account stores a strictly isolated cultivator profile. You can also directly enter any testnet account to inspect its state:"
              )}
            </p>

            <div className="my-3 space-y-2">
              <label className="block text-xs font-bold text-[#3B5B55]">
                {t("输入 NEAR 账号 (Account ID):", "NEAR Account ID:")}
              </label>
              <input
                type="text"
                value={accountInput}
                onChange={(e) => setAccountInput(e.target.value)}
                placeholder="daoist.testnet"
                className="w-full px-3 py-2 bg-white/90 border border-[#C8AA72] text-xs font-mono font-bold text-[#253D39] focus:outline-none focus:ring-1 focus:ring-[#8A6828]"
              />

              {/* 快捷推荐预设账号 */}
              <div className="pt-1">
                <div className="text-[11px] text-[#789690] mb-1">
                  {t("快捷切换体验预设道身：", "Quick Switch Presets:")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "qingyun-master.testnet",
                    "daoist-0xzxh.testnet",
                    "immortal-sovereign.testnet",
                  ].map((presetAcc) => (
                    <button
                      key={presetAcc}
                      type="button"
                      onClick={() => setAccountInput(presetAcc)}
                      className="px-2 py-0.5 border border-[#C8AA72]/40 bg-white/70 hover:bg-[#FAF6EC] text-[10px] font-mono text-[#587570] transition"
                    >
                      {presetAcc}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#C8AA72]/30 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#64827D] hover:text-[#253D39] border border-stone-300 bg-white"
              >
                {t("关闭", "Close")}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchAccount(accountInput)}
                className="xianxia-btn-gold px-4 py-1.5 text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t("调取道身档案", "Load Archive")}</span>
              </button>
            </div>
          </JadeGlassPanel>
        </div>
      )}

      {/* 9. 重塑道身模态窗 (扣除 0.5 NEAR 或 200 灵石，更迭法相道号，承袭全部修为) */}
      {isReshapeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <JadeGlassPanel
            withTopClasp
            withTassels
            className="max-w-lg w-full p-5 sm:p-6 z-10 font-serif max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#C8AA72]/40">
              <div className="flex items-center gap-2">
                <CinnabarSeal text="塑" variant="rect" />
                <h3 className="text-base font-bold text-[#253D39] tracking-wider">
                  {t("天火淬形 · 道身重塑", "Reshape Dao Body & Cultivator Identity")}
                </h3>
              </div>
              <button
                onClick={() => setIsReshapeModalOpen(false)}
                className="text-[#64827D] hover:text-[#253D39] transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#FAF5E8] border border-[#C8AA72]/40 p-2.5 my-3 text-xs text-[#6B5120] leading-relaxed">
              {t(
                "重塑法相将重新选择国风形象与道号。您当前的九宫灵田、已增气血、本命飞剑、云海试炼层数与排行榜分润资格将全额继承，绝不损失！所付费用将全额汇入宗门国库！",
                "Reshaping allows choosing a new appearance and Daoist title. All your cultivated HP, forged swords, trial floors, and weekly treasury shares remain fully intact! Fees flow 100% into the Sect Treasury."
              )}
            </div>

            {/* 选择新形象 */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#3B5B55]">
                {t("一 · 挑选全新本命法相：", "I · Select New Dao Form:")}
              </label>
              <div className="grid grid-cols-5 gap-2">
                {XIANXIA_CHARACTER_ROSTER.map((charItem) => {
                  const unlockInfo = checkCharacterUnlock(charItem.id);
                  const selected = reshapeAvatar === charItem.id;
                  return (
                    <button
                      key={charItem.id}
                      type="button"
                      onClick={() => {
                        if (!unlockInfo.unlocked) {
                          triggerFloatingStat(
                            t(`🔒 ${unlockInfo.reasonZh}`, `🔒 ${unlockInfo.reasonEn}`)
                          );
                          return;
                        }
                        setReshapeAvatar(charItem.id);
                      }}
                      className={`group p-1 border text-center transition-all flex flex-col items-center relative ${
                        !unlockInfo.unlocked
                          ? "bg-stone-100/60 border-stone-300 opacity-60 cursor-not-allowed"
                          : selected
                          ? "bg-white border-[#B89452] ring-2 ring-[#C5A46A]/50 shadow-sm"
                          : "bg-white/60 border-[#C8AA72]/40 hover:bg-white/90"
                      }`}
                    >
                      {selected && (
                        <div className="absolute top-0.5 right-0.5 z-10">
                          <CinnabarSeal text="选" variant="rect" className="text-[8px] px-0.5" />
                        </div>
                      )}
                      {!unlockInfo.unlocked && (
                        <div className="absolute top-0.5 right-0.5 z-10 bg-black/60 px-1 py-0.5 flex items-center gap-0.5 text-[8px] text-[#FFDE99] font-serif shadow-xs">
                          <Lock className="w-2.5 h-2.5" />
                          <span>{t("封印", "Lock")}</span>
                        </div>
                      )}
                      <div className="w-full aspect-[4/5] overflow-hidden border border-[#C8AA72]/30 bg-[#EDF5F3] mb-1">
                        <img
                          src={charItem.imageSrc}
                          alt={charItem.zhName}
                          className={`w-full h-full object-cover object-top transition-transform duration-300 ${
                            !unlockInfo.unlocked ? "grayscale" : "group-hover:scale-105"
                          }`}
                        />
                      </div>
                      <div className="text-[10px] font-serif font-bold text-[#253D39] truncate w-full">
                        {t(charItem.zhName.replace(/^.{2}/, ""), charItem.enName.split(" ").slice(-1)[0])}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 新道号 */}
            <div className="my-3 space-y-1">
              <label className="block text-xs font-bold text-[#3B5B55]">
                {t("二 · 确立全新道号：", "II · Confirm Daoist Title:")}
              </label>
              <input
                type="text"
                value={reshapeDaoName}
                onChange={(e) => setReshapeDaoName(e.target.value)}
                placeholder={cultivator.daoName}
                className="w-full px-3 py-2 bg-white/90 border border-[#C8AA72] text-xs font-serif font-bold text-[#253D39] focus:outline-none focus:ring-1 focus:ring-[#8A6828]"
              />
            </div>

            {/* 支付方式 */}
            <div className="my-3 space-y-1.5">
              <label className="block text-xs font-bold text-[#3B5B55]">
                {t("三 · 支付重塑道资：", "III · Reshape Payment Method:")}
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setReshapePayment("STONES")}
                  className={`p-2.5 border text-left transition-all ${
                    reshapePayment === "STONES"
                      ? "bg-[#FAF5E6] border-[#B89452] ring-1 ring-[#C8AA72]"
                      : "bg-white/70 border-stone-200 hover:bg-white"
                  }`}
                >
                  <div className="font-bold text-[#253D39] flex items-center justify-between">
                    <span>{t("200 灵石", "200 Spirit Stones")}</span>
                    <Coins className="w-3.5 h-3.5 text-[#C8AA72]" />
                  </div>
                  <div className="text-[11px] text-[#789690] mt-0.5">
                    {t(`当前持有: ${cultivator.spiritStones} 灵石`, `You have: ${cultivator.spiritStones} stones`)}
                    {cultivator.spiritStones < 200 && (
                      <span className="text-[#C24141] font-bold block">{t("(灵石不足)", "(Insufficient)")}</span>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setReshapePayment("NEAR")}
                  className={`p-2.5 border text-left transition-all ${
                    reshapePayment === "NEAR"
                      ? "bg-[#FAF5E6] border-[#B89452] ring-1 ring-[#C8AA72]"
                      : "bg-white/70 border-stone-200 hover:bg-white"
                  }`}
                >
                  <div className="font-bold text-[#253D39] flex items-center justify-between">
                    <span>0.5 NEAR</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#5FE3C8]" />
                  </div>
                  <div className="text-[11px] text-[#789690] mt-0.5">
                    {t("链上无感会话密钥代扣", "Auto-deducted via Session Key")}
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-[#C8AA72]/30 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReshapeModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#64827D] hover:text-[#253D39] border border-stone-300 bg-white"
              >
                {t("取消", "Cancel")}
              </button>
              <button
                type="button"
                disabled={isReshaping || (reshapePayment === "STONES" && cultivator.spiritStones < 200)}
                onClick={handleReshapeDaoBody}
                className="xianxia-btn-gold px-4 py-1.5 text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isReshaping ? (
                  <XianxiaLoadingRing text="" size="sm" tone="light" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{t("天火淬形 · 确认重塑", "Confirm Reshape")}</span>
              </button>
            </div>
          </JadeGlassPanel>
        </div>
      )}

      {/* 试炼战斗大捷/惜败结算弹窗 (12回合战斗演示完后弹出，高对比度国风卷轴风格，杜绝剧透) */}
      {battleResultModal && battleResultModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn"
          onClick={() => setBattleResultModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <JadeGlassPanel
              withTopClasp
              withTassels
              className="p-6 font-serif shadow-2xl border-2 border-[#C8AA72] !bg-[#FFFDF7]"
            >
              {/* 弹窗顶栏 */}
              <div className="flex items-center justify-between pb-3 border-b border-[#C8AA72]/50">
                <div className="flex items-center gap-2">
                  <CinnabarSeal
                    text={battleResultModal.victory ? "捷" : "惜"}
                    variant="rect"
                  />
                  <h3 className="text-base sm:text-lg font-bold text-[#162724] tracking-wider">
                    {battleResultModal.victory
                      ? t("试炼大捷 · 荡平妖邪", "Trial Victory · Guardian Banished")
                      : t("试炼惜败 · 暂避锋芒", "Trial Defeat · Retreat to Abode")}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBattleResultModal(null)}
                  className="text-[#64827D] hover:text-[#253D39] transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 战果主说明横幅 */}
              <div
                style={{
                  backgroundColor: battleResultModal.victory ? "#0E2922" : "#2B0B0B",
                }}
                className={`mt-4 px-4 py-3 border-2 flex items-center gap-2.5 text-xs sm:text-sm font-bold shadow-md ${
                  battleResultModal.victory
                    ? "border-[#52D1B2] text-[#FDE68A]"
                    : "border-[#F87171] text-[#FCA5A5]"
                }`}
              >
                <span>
                  {battleResultModal.victory
                    ? t(
                        `恭贺道友仗剑斩杀第 ${battleResultModal.floor} 重镇守【${battleResultModal.monsterName}】（耗时 ${battleResultModal.turnsTaken} 回合${
                          battleResultModal.pillsConsumed > 0
                            ? `，灵丹回血 ${battleResultModal.pillsConsumed} 次`
                            : ""
                        }）！`,
                        `Guardian [${battleResultModal.monsterName}] defeated in ${battleResultModal.turnsTaken} turns!`
                      )
                    : t(
                        `道友激战 ${battleResultModal.turnsTaken} 回合，终因气血不支惜败于【${battleResultModal.monsterName}】之手。道身已由宗门灵符接引回洞府调养。`,
                        `Defeated by [${battleResultModal.monsterName}] in turn ${battleResultModal.turnsTaken}. Retreat to heal!`
                      )}
                </span>
              </div>

              {/* 胜利掉落物资清单 */}
              {battleResultModal.victory && battleResultModal.rewards && (
                <div className="my-4 p-3.5 bg-[#FAF6EC] border border-[#C8AA72]/60 shadow-inner">
                  <div className="text-xs font-bold text-[#8A6828] mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>{t("降伏妖魔 · 仙缘掉落收获", "Guardian Drop Rewards")}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-serif font-bold">
                    <div className="p-2 bg-white border border-[#C8AA72]/40 flex items-center justify-between text-[#253D39]">
                      <span>⛏️ 百炼玄铁</span>
                      <strong className="text-[#059669] font-mono font-bold text-sm">
                        +{battleResultModal.rewards.ironOres}
                      </strong>
                    </div>
                    {battleResultModal.rewards.meteorOres > 0 && (
                      <div className="p-2 bg-white border border-[#C8AA72]/40 flex items-center justify-between text-[#253D39]">
                        <span>☄️ 星辰陨铁</span>
                        <strong className="text-[#7C3AED] font-mono font-bold text-sm">
                          +{battleResultModal.rewards.meteorOres}
                        </strong>
                      </div>
                    )}
                    <div className="p-2 bg-white border border-[#C8AA72]/40 flex items-center justify-between text-[#253D39]">
                      <span>🌱 {battleResultModal.rewards.seedTier}阶灵草仙种</span>
                      <strong className="text-[#0D9488] font-mono font-bold text-sm">
                        +1
                      </strong>
                    </div>
                    <div className="p-2 bg-white border border-[#C8AA72]/40 flex items-center justify-between text-[#253D39]">
                      <span>⚔️ 诛魔天榜积分</span>
                      <strong className="text-[#B45309] font-mono font-bold text-sm">
                        +{battleResultModal.rewards.slayerPoints}
                      </strong>
                    </div>
                    <div className="p-2 bg-white border border-[#C8AA72]/40 flex items-center justify-between text-[#253D39] col-span-2">
                      <span>✨ 历练修为提升</span>
                      <strong className="text-[#2563EB] font-mono font-bold text-sm">
                        +{battleResultModal.rewards.exp} EXP
                      </strong>
                    </div>
                  </div>

                  {battleResultModal.rewards.realmBreakthrough && (
                    <div className="mt-3 p-2.5 bg-[#FFFBEB] border border-[#F59E0B] text-center text-xs font-bold text-[#B45309] animate-pulse">
                      🌟 天道感应 · 恭贺道友境界突破至【{battleResultModal.rewards.realmBreakthrough}】！
                    </div>
                  )}
                </div>
              )}

              {/* 失败修整指引 */}
              {!battleResultModal.victory && (
                <div className="my-4 p-3.5 bg-[#FFF5F5] border border-[#F87171] shadow-inner text-xs font-serif leading-relaxed text-[#7F1D1D]">
                  <p className="font-bold mb-1.5 flex items-center gap-1.5">
                    <span className="text-base">💡</span>
                    <span>{t("老祖点拨 · 提升战力妙法", "Elder Advice · Ways to Grow Stronger")}</span>
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>前往【壹·洞府灵圃】播种灵草，采收炼制回春丹直接永久提升气血上限 HP。</li>
                    <li>前往【贰·天工剑庐】消耗玄铁陨铁铸造更高阶本命飞剑，大幅提升攻击力 ATK。</li>
                  </ul>
                </div>
              )}

              {/* 底部操作按钮 */}
              <div className="pt-3 border-t border-[#C8AA72]/40 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBattleResultModal(null)}
                  className="px-4 py-2 text-xs font-serif font-bold text-[#476660] hover:text-[#253D39] border border-[#C8AA72]/60 bg-white shadow-xs"
                >
                  {t("闭关返府", "Return to Abode")}
                </button>
                {battleResultModal.victory ? (
                  <button
                    type="button"
                    onClick={() => {
                      const nextFloor = battleResultModal.floor + 1;
                      setBattleResultModal(null);
                      setSelectedFloor(nextFloor);
                      setRealmFloorPage(Math.floor(nextFloor / 5));
                      handleStartVisualBattle(nextFloor);
                    }}
                    className="xianxia-btn-gold px-4 py-2 text-xs font-serif font-bold flex items-center gap-1.5 shadow-md"
                  >
                    <Swords className="w-3.5 h-3.5 text-[#7D5E2A]" />
                    <span>{t(`乘胜挑战第 ${battleResultModal.floor + 1} 重 →`, `Challenge Tier ${battleResultModal.floor + 1} →`)}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const fl = battleResultModal.floor;
                      setBattleResultModal(null);
                      handleStartVisualBattle(fl);
                    }}
                    className="xianxia-btn-gold px-4 py-2 text-xs font-serif font-bold flex items-center gap-1.5 shadow-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#7D5E2A]" />
                    <span>{t("再次挑战此重", "Try Again")}</span>
                  </button>
                )}
              </div>
            </JadeGlassPanel>
          </div>
        </div>
      )}

      {/* 宗门天榜律令与国库五三二分账 Tips 弹窗 (按用户要求：规则与说明收纳于 Tips 弹窗，主界面清爽规整) */}
      {isTreasuryRulesTipsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsTreasuryRulesTipsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg"
          >
            <JadeGlassPanel
              withTopClasp
              withTassels
              className="p-5 sm:p-6 font-serif shadow-2xl border-2 border-[#C8AA72] !bg-[#FFFDF7] text-[#253D39]"
            >
              {/* 弹窗顶栏 */}
              <div className="flex items-center justify-between pb-3 border-b border-[#C8AA72]/50">
                <div className="flex items-center gap-2">
                  <CinnabarSeal text="律" variant="rect" />
                  <h3 className="text-base sm:text-lg font-bold text-[#253D39] tracking-wider">
                    {t("宗门天榜 · 天道律令与分账说明 (Tips)", "Heaven Leaderboards & Treasury Rules")}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTreasuryRulesTipsOpen(false)}
                  className="text-[#64827D] hover:text-[#253D39] transition-colors p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 核心要点卡片组 */}
              <div className="mt-3.5 space-y-3 text-xs sm:text-[13px] leading-relaxed">
                {/* 1. 五三二分账 */}
                <div className="p-3 bg-[#FAF6EC] border border-[#C8AA72]/60 shadow-2xs">
                  <div className="font-bold text-[#8A5A12] flex items-center gap-1.5 mb-1 text-sm">
                    <span>🏛️</span>
                    <span>{t("国库五三二黄金分账", "Treasury 50/30/20 Distribution")}</span>
                  </div>
                  <div className="text-[#4D3A1B] space-y-1">
                    <p>
                      • <strong>50% 周天奖池</strong>：全额注入四大周天榜（诛魔 30%、论剑 30%、百草 20%、神工 20%），每周日 24:00 结算分润。
                    </p>
                    <p>
                      • <strong>30% 滚存底池</strong>：常设留存于宗门国库储备金池中，保障代币经济持续滚存。
                    </p>
                    <p>
                      • <strong>20% 开发金库</strong>：划拨九天玄机阁用于智能合约运维、节点算力与系统研发。
                    </p>
                  </div>
                </div>

                {/* 2. 定时清算发俸 */}
                <div className="p-3 bg-[#F0F7F5] border border-[#7BB5A8]/60 shadow-2xs">
                  <div className="font-bold text-[#1F5448] flex items-center gap-1.5 mb-1 text-sm">
                    <span>⏰</span>
                    <span>{t("天道定时清算机制", "Scheduled Auto-Distribution")}</span>
                  </div>
                  <p className="text-[#253D39]">
                    每周日 24:00 (东八区周一 00:00 UTC+8) 准时由天道自动结算清算，周俸（NEAR 与灵石）直发至【天阙传谕】信箱，免除手动领取的繁琐并杜绝重复提取。
                  </p>
                </div>

                {/* 3. 每周重置机制 */}
                <div className="p-3 bg-[#FFF5F5] border border-[#DC2626]/40 shadow-2xs">
                  <div className="font-bold text-[#991B1B] flex items-center gap-1.5 mb-1 text-sm">
                    <span>🔄</span>
                    <span>{t("周天发榜后全员重置", "Weekly Reset Rule")}</span>
                  </div>
                  <p className="text-[#7F1D1D]">
                    每周结算法旨送达后，四大天榜周参与进度（云海试炼层数、采药株数、演武积分、铸剑功勋）全部归零重置。新周全员从起跑线重新打榜争雄！永久历史通关层数不受影响，化形皮肤解锁永久保留。
                  </p>
                </div>

                {/* 4. 席位分润阶梯 */}
                <div className="p-2.5 bg-[#FFFDF7] border border-[#C8AA72]/50 text-center font-mono font-bold text-[#8A5A12] text-xs shadow-2xs">
                  🏆 魁首独揽 50% 榜池 · 🥈 榜眼 25% · 🥉 探花 15% · 肆·进士 10%
                </div>
              </div>

              {/* 弹窗底部操作 */}
              <div className="mt-4 pt-3 border-t border-[#C8AA72]/40 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsTreasuryRulesTipsOpen(false)}
                  className="px-4 py-1.5 text-xs font-serif font-bold text-[#3B544F] border border-[#C8AA72]/60 bg-white hover:bg-[#FAF6EC] shadow-2xs cursor-pointer"
                >
                  {t("弟子知悉", "Understood")}
                </button>
              </div>
            </JadeGlassPanel>
          </div>
        </div>
      )}

      {/* 仙资收支御道簿弹窗 (NEAR 消耗投入与赚取分润总账) */}
      {isFinancialModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsFinancialModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85vh] flex flex-col"
          >
            <JadeGlassPanel
              withTopClasp
              withTassels
              className="p-5 sm:p-6 font-serif shadow-2xl border-2 border-[#C8AA72] !bg-[#FFFDF7] flex flex-col max-h-[85vh]"
            >
              {/* 弹窗顶栏 */}
              <div className="flex items-center justify-between pb-3 border-b border-[#C8AA72]/50 shrink-0">
                <div className="flex items-center gap-2">
                  <CinnabarSeal text="账" variant="rect" />
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#162724] tracking-wider">
                      {t("太虚仙宗 · 仙资收支御道簿", "Taixu Sect · Financial Ledger")}
                    </h3>
                    <p className="text-[11px] text-[#64827D]">
                      {t(
                        "记录修真道身 NFT 结契、灵根洗炼、真身重塑、灵石充值与周天榜国库分润之全量收支账目",
                        "Audit ledger tracking NEAR mint, root rolls, body reshaping, recharges, and weekly dividends."
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFinancialModalOpen(false)}
                  className="text-[#64827D] hover:text-[#253D39] transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 四大汇总卡片 */}
              {(() => {
                const fin = cultivator.financialStats || {
                  totalNearSpent: 0.2,
                  totalNearEarned: 0,
                  totalStonesRecharged: 0,
                  totalStonesDividends: 0,
                  records: [],
                };
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 shrink-0">
                    <div className="p-3 bg-[#FEF2F2] border border-[#F87171] text-center shadow-xs">
                      <div className="text-[11px] text-[#991B1B] font-bold">
                        {t("累计投入消耗 NEAR", "Total NEAR Spent")}
                      </div>
                      <div className="font-mono text-lg font-extrabold text-[#DC2626] mt-1 tabular-nums">
                        -{fin.totalNearSpent.toFixed(2)} N
                      </div>
                      <div className="text-[9.5px] text-[#B91C1C] mt-0.5 opacity-80">
                        {t("铸身+洗根+充值", "Mint + Rolls + Buy")}
                      </div>
                    </div>

                    <div className="p-3 bg-[#F0FDF4] border border-[#4ADE80] text-center shadow-xs">
                      <div className="text-[11px] text-[#166534] font-bold">
                        {t("累计赚取分润 NEAR", "Total NEAR Earned")}
                      </div>
                      <div className="font-mono text-lg font-extrabold text-[#16A34A] mt-1 tabular-nums">
                        +{fin.totalNearEarned.toFixed(2)} N
                      </div>
                      <div className="text-[9.5px] text-[#15803D] mt-0.5 opacity-80">
                        {t("周天榜国库分润", "Weekly Dividends")}
                      </div>
                    </div>

                    <div className="p-3 bg-[#FFFBEB] border border-[#FCD34D] text-center shadow-xs">
                      <div className="text-[11px] text-[#92400E] font-bold">
                        {t("累计充值灵石", "Stones Recharged")}
                      </div>
                      <div className="font-mono text-lg font-extrabold text-[#D97706] mt-1 tabular-nums">
                        +{fin.totalStonesRecharged} 💎
                      </div>
                      <div className="text-[9.5px] text-[#B45309] mt-0.5 opacity-80">
                        {t("注入真元灵池", "Stones Purchased")}
                      </div>
                    </div>

                    <div className="p-3 bg-[#F5F3FF] border border-[#C4B5FD] text-center shadow-xs">
                      <div className="text-[11px] text-[#5B21B6] font-bold">
                        {t("周榜分润灵石", "Dividend Stones")}
                      </div>
                      <div className="font-mono text-lg font-extrabold text-[#7C3AED] mt-1 tabular-nums">
                        +{fin.totalStonesDividends} 💎
                      </div>
                      <div className="text-[9.5px] text-[#6D28D9] mt-0.5 opacity-80">
                        {t("天道周日 24:00 发放", "Sunday Decrees")}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 明细交易流水记录表 (可滚动) */}
              <div className="flex-1 overflow-y-auto border border-[#C8AA72]/50 bg-white my-1">
                <table className="w-full text-xs font-serif text-left border-collapse">
                  <thead className="bg-[#12221F] text-[#F2CE85] text-[11px] sticky top-0 z-10 font-bold">
                    <tr>
                      <th className="p-2.5 border-b border-[#C8AA72]/40 whitespace-nowrap">时辰 / 记录</th>
                      <th className="p-2.5 border-b border-[#C8AA72]/40">仙资事由</th>
                      <th className="p-2.5 border-b border-[#C8AA72]/40 text-right whitespace-nowrap">NEAR 变动</th>
                      <th className="p-2.5 border-b border-[#C8AA72]/40 text-right whitespace-nowrap">灵石变动</th>
                      <th className="p-2.5 border-b border-[#C8AA72]/40 text-center whitespace-nowrap">存证凭据</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C8AA72]/20 text-[#253D39]">
                    {(() => {
                      const records = cultivator.financialStats?.records || [];
                      if (records.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-[#86ABA3] italic">
                              暂无财务流水记录
                            </td>
                          </tr>
                        );
                      }
                      return records.map((rec) => {
                        const dateStr = new Date(rec.timestamp).toLocaleTimeString([], {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        return (
                          <tr key={rec.id} className="hover:bg-[#FAF6EC] transition-colors">
                            <td className="p-2.5 font-mono text-[11px] text-[#64827D] whitespace-nowrap">
                              {dateStr}
                            </td>
                            <td className="p-2.5 font-bold">
                              {lang === "en" ? rec.titleEn : rec.titleZh}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold whitespace-nowrap">
                              {rec.nearDelta < 0 ? (
                                <span className="text-[#DC2626]">{rec.nearDelta.toFixed(2)} N</span>
                              ) : rec.nearDelta > 0 ? (
                                <span className="text-[#16A34A]">+{rec.nearDelta.toFixed(2)} N</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold whitespace-nowrap">
                              {rec.stonesDelta !== 0 ? (
                                <span className={rec.stonesDelta > 0 ? "text-[#D97706]" : "text-[#B91C1C]"}>
                                  {rec.stonesDelta > 0 ? `+${rec.stonesDelta}` : rec.stonesDelta} 💎
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-mono text-[10px] text-[#64827D] whitespace-nowrap">
                              {rec.txHash ? rec.txHash.slice(0, 10) + "..." : "链上存证"}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* 弹窗底部操作 */}
              <div className="pt-3 border-t border-[#C8AA72]/40 flex items-center justify-between gap-3 shrink-0">
                <div className="text-[11px] text-[#86ABA3] font-mono">
                  国库周俸结算机制：每周日 24:00 (UTC+8) 准时分润
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFinancialModalOpen(false);
                      setIsRechargeModalOpen(true);
                    }}
                    className="xianxia-btn-gold px-3.5 py-1.5 text-xs font-serif font-bold flex items-center gap-1 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#7D5E2A]" />
                    <span>{t("💎 补充灵石", "💎 Buy Stones")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFinancialModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-serif font-bold text-[#476660] hover:text-[#253D39] border border-[#C8AA72]/60 bg-white shadow-xs"
                  >
                    {t("合上账簿", "Close Ledger")}
                  </button>
                </div>
              </div>
            </JadeGlassPanel>
          </div>
        </div>
      )}

      {/* 10. 灵石汇率与充值换取弹窗 (含收益模式五三二法则说明，满足需求2与需求3) */}
      {isRechargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <JadeGlassPanel
            withTopClasp
            withTassels
            className="max-w-lg w-full p-5 sm:p-6 z-10 font-serif max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#C8AA72]/40">
              <div className="flex items-center gap-2">
                <CinnabarSeal text="兑" variant="rect" />
                <h3 className="text-base font-bold text-[#253D39] tracking-wider">
                  {t("天道真元池 · 灵石兑换与经济法则", "Celestial Treasury · Tokenomics & Exchange")}
                </h3>
              </div>
              <button
                onClick={() => setIsRechargeModalOpen(false)}
                className="text-[#64827D] hover:text-[#253D39] transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 灵石与 NEAR 兑换核心规则展示 */}
            <div className="my-3 p-3 bg-[#162724] border border-[#C8AA72]/50 text-white space-y-2">
              <div className="flex items-center justify-between border-b border-[#C8AA72]/30 pb-1.5">
                <span className="text-xs text-[#E0C99B] font-bold">
                  {t("仙界官方汇率锚定", "Official Pegged Exchange Rate")}
                </span>
                <span className="font-mono text-xs text-[#5FE3C8] font-bold">
                  1 NEAR = 50 灵石 (0.02N = 1石)
                </span>
              </div>
              <div className="text-[11px] text-[#A2C4BD] space-y-1">
                <div>• {t("硬通货价值：1 灵石 ≈ 0.10 USD，为宗门炼药、铸剑、重塑与拍卖通用代币。", "Value Peg: 1 Spirit Stone ≈ $0.10 USD. Used for alchemy, forging, and reshaping.")}</div>
                <div>• {t("出金承兑机制：每周日 24:00 周榜结算，国库 50% 灵石以 NEAR 发送至信箱，支持 1Click 跨链兑换为 SOL/USDC。", "Cash-out: Weekly boards distribute 50% of treasury in NEAR/stones, cross-chain redeemable via NEAR Intents.")}</div>
              </div>
            </div>

            {/* 平台收益模式：五三二黄金分润法则 */}
            <div className="p-3 bg-[#FAF5E6] border border-[#C8AA72]/40 text-xs text-[#4F3C1A] space-y-1.5 mb-3">
              <div className="font-bold text-[#7D5E2A] flex items-center justify-between">
                <span>{t("宗门国库“五三二黄金分润体系”：", "Treasury 50-30-20 Revenue Model:")}</span>
                <span className="text-[10px] font-mono text-[#A87932]">Sect Treasury Rule</span>
              </div>
              <div className="space-y-1 text-[11px] leading-relaxed text-[#6E5528]">
                <div>
                  <strong className="text-[#205247]">{t("【50% 仙榜封赏】", "[50% Heaven Boards]")}</strong>
                  {t("每周日 24:00 (东八区周一 0点) 定时全额分润给四大天榜前十名修仙大能。", " Distributed weekly to top 10 cultivators across the 4 Heaven Boards.")}
                </div>
                <div>
                  <strong className="text-[#205247]">{t("【30% 滚存底池】", "[30% Rolling Pool]")}</strong>
                  {t("沉淀在智能合约金库中，作为下一周期的奖池底池与流动性缓冲。", " Stored in smart contract as next week's base pool and reserve liquidity.")}
                </div>
                <div>
                  <strong className="text-[#205247]">{t("【20% 官方开发运营金库】", "[20% Dev & Operations]")}</strong>
                  {t("划拨至官方运营金库，支持 NEAR RPC 节点、无感会话密钥代付与全天候开发迭代。", " Allocated to official multi-sig vault for RPC nodes, session key gas, and live ops.")}
                </div>
              </div>
            </div>

            {/* 充值档位 */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#3B5B55]">
                {t("选择充值真元档位 (NEAR 兑换灵石)：", "Select Recharge Tier (NEAR -> Spirit Stones):")}
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { near: 1, stones: 50, tag: "" },
                  { near: 2, stones: 100, tag: "" },
                  { near: 5, stones: 260, tag: t("+10 灵石仙缘", "+10 Bonus") },
                  { near: 10, stones: 530, tag: t("+30 灵石特赏", "+30 Bonus") },
                ].map((tier) => (
                  <button
                    key={tier.near}
                    type="button"
                    disabled={loadingAction}
                    onClick={() => handleRechargeSpiritStones(tier.near)}
                    className="p-3 border border-[#C8AA72]/60 bg-white/80 hover:bg-[#FAF5E6] hover:border-[#8A6828] transition-all text-left flex flex-col justify-between group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#253D39] font-mono">
                        {tier.near} NEAR
                      </span>
                      {tier.tag && (
                        <span className="px-1 py-0.2 bg-[#E74C3C] text-white text-[9px] font-serif font-bold">
                          {tier.tag}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#8A6828] font-bold mt-1 font-mono flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-[#C8AA72]" />
                      <span>+{tier.stones} {t("灵石", "Stones")}</span>
                    </div>
                    <div className="text-[10px] text-[#7A9690] mt-0.5">
                      {t("全额注入宗门国库", "100% to Sect Treasury")}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#C8AA72]/30 flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setIsRechargeModalOpen(false)}
                className="px-4 py-1.5 text-xs text-[#64827D] hover:text-[#253D39] border border-stone-300 bg-white"
              >
                {t("关闭", "Close")}
              </button>
            </div>
          </JadeGlassPanel>
        </div>
      )}
    </div>
  );
}
