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
} from "lucide-react";
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
  CombatTurnLog,
  PvpDuelOpponent,
  PvpDuelReport,
  PvpTurnLog,
  SpiritRootDefinition,
  XianxiaWorldSnapshot,
} from "@/lib/xianxia/types";
import { SPIRIT_ROOTS_CATALOG } from "@/lib/xianxia/engine";
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

  interface LoadingTarget {
    type:
      | "PLOT"
      | "FORGE"
      | "BATTLE"
      | "ARENA"
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
    "ALL" | "SLAYER" | "ALCHEMY" | "BLACKSMITH" | "DUEL"
  >("ALL");
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

  // 灵田植物实时倒计时与成熟判定 (每秒本地驱动，零冗余网络开销)
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

        if (!hasChanges) return prev;
        return {
          ...prev,
          cultivator: {
            ...prev.cultivator,
            gardenPlots: updatedPlots,
          },
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const callGameApi = async (
    payload: Record<string, unknown>,
    target?: LoadingTarget
  ) => {
    const isGlobalBlocking = target?.type !== "PLOT";
    if (isGlobalBlocking) setLoadingAction(true);
    if (target && isGlobalBlocking) setActiveLoading(target);
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
      if (data.snapshot) {
        setSnapshot(data.snapshot);
      }
      return data;
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
    const highestFloor = snapshot?.cultivator?.highestFloorCleared || 0;
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

    setLoadingPlotIds((prev) => [...prev, plotId]);
    try {
      if (plot.status === "EMPTY") {
        await callGameApi(
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
        if (tutorialStage === 1) setTutorialStage(2);
      } else if (plot.status === "GROWING") {
        if (!plot.wateredWithSpiritSpring) {
          await callGameApi(
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
          if (tutorialStage <= 2) setTutorialStage(3);
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
        const newHp = data?.snapshot?.cultivator?.maxHp || prevHp + 50;
        const diffHp = newHp - prevHp;
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
    } finally {
      setLoadingPlotIds((prev) => prev.filter((id) => id !== plotId));
    }
  };

  // ==========================================================================
  // 3. 天工铸剑引导 (+攻击力 ATK)
  // ==========================================================================
  const handleForgeWeapon = async (blueprintId: string) => {
    if (loadingAction || isForgingAnim || !snapshot) return;
    setIsForgingAnim(true);
    const prevAtk = snapshot.cultivator.atk;

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
  // 4. 云海秘境 2D 回合斗法动画
  // ==========================================================================
  const handleStartVisualBattle = async (floorNumber: number) => {
    if (isBattling || loadingAction) return;
    setSelectedFloor(floorNumber);
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
      }
    );
    const report = data?.actionResult?.report;
    if (!report || !report.logs) return;

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

        if (report.victory) {
          triggerFloatingStat(
            t(
              `试炼告捷 · 获玄铁 +${report.rewards?.ironOres} · 灵石 +${report.rewards?.spiritStones}`,
              `Victory · +${report.rewards?.ironOres} Ores · +${report.rewards?.spiritStones} Stones`
            )
          );
          if (tutorialStage === 5) {
            setTutorialStage(6);
            triggerUnlockNotice(
              t(
                "试炼通关 · 仙殿已开启：【肆·问鼎论剑台】与【伍·宗门天榜】（参与 PVP 论剑切磋与每周国库分润）",
                "Pavilions Unlocked: [PVP Duel Arena] & [Heavenly Leaderboards] (50% Sect Treasury Dividends)"
              )
            );
          }
        }
        return;
      }

      const step = logs[idx];
      setBattleTurnIdx(idx + 1);

      if (step.actor === "CULTIVATOR") {
        setHeroAnimState("attack");
        setMonsterAnimState("hit");
        setArenaFloatingDmg({
          target: "monster",
          text: `-${step.damageDealt} ${step.isCrit ? "剑意暴击" : ""}`,
          tone: step.isCrit ? "gold" : "rose",
        });
      } else if (step.actor === "MONSTER") {
        setHeroAnimState("hit");
        setMonsterAnimState("attack");
        setArenaFloatingDmg({
          target: "hero",
          text: `-${step.damageDealt} HP`,
          tone: "rose",
        });
      } else if (step.actor === "PILL_RECOVERY") {
        setHeroAnimState("heal");
        setMonsterAnimState("idle");
        setArenaFloatingDmg({
          target: "hero",
          text: `灵丹回春 +${step.hpRestored} HP`,
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
      }
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

        if (report.victory) {
          triggerFloatingStat(
            t(
              `🏆 论剑大捷！积分 +${report.rewards.duelPointsDelta} · 获灵石 +${report.rewards.spiritStones}`,
              `🏆 Duel Victory! +${report.rewards.duelPointsDelta} Pts · +${report.rewards.spiritStones} Stones`
            )
          );
        } else {
          triggerFloatingStat(
            t(
              `论剑惜败！积分 ${report.rewards.duelPointsDelta}，请淬炼飞剑后再战！`,
              `Duel Defeat! ${report.rewards.duelPointsDelta} Pts`
            )
          );
        }
        return;
      }

      const step = logs[idx];
      setPvpTurnIdx(idx + 1);

      if (step.actionText.includes("丹") || (step.hpRestored && step.hpRestored > 0)) {
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
        setPvpHeroAnim("attack");
        setPvpOpponentAnim("hit");
        setPvpFloatingDmg({
          target: "opponent",
          text: `-${step.damageDealt} ${step.isCrit ? "暴击!" : ""}`,
          tone: step.isCrit ? "gold" : "rose",
        });
      } else {
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
              href="/guide"
              className="text-[#C8AA72] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t("玩法与经济指南", "Guide & Tokenomics")}</span>
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

      {/* 0. 链上操作全局非侵入式微芒浮标 (不突兀的顶部道符提示，解决需求3) */}
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

      {/* 1. 顶部极窄通栏 (Top 36px System Bar，系统操作与修仙属性彻底分离) */}
      <div className="w-full fixed top-0 left-0 right-0 z-40 xianxia-dark-bar h-9 flex items-center justify-between px-4 sm:px-8 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-[#C8AA72] font-serif font-bold tracking-widest text-[13px]">
            太虚仙宗 · 问道天关
          </span>
          <span className="text-[#4F736C]">|</span>
          <span className="text-[#8AB8AF] font-mono text-[11px] hidden sm:inline">
            NEAR Protocol NEP-413
          </span>
        </div>
        <div className="flex items-center gap-3 font-serif">
          {/* NEAR 测试网钱包状态与直连 */}
          {signedAccountId ? (
            <button
              type="button"
              onClick={() => {
                setAccountInput(signedAccountId);
                setIsAccountModalOpen(true);
              }}
              className="text-[#E0C99B] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5 px-2 py-0.5 border border-[#52D1B2] bg-[#112622] shadow-xs"
              title="已连接 NEAR 测试网钱包，点击查看详情或切换"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#52D1B2] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3BB89A]"></span>
              </span>
              <span className="font-mono text-[11px] text-[#5FE3C8] truncate max-w-[120px] sm:max-w-none">
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
                className="xianxia-btn-gold px-2 py-0.5 text-xs font-bold shadow-xs flex items-center gap-1 animate-pulse"
                title="一键连接官方 NEAR 测试网钱包 (支持 Meteor, MyNearWallet, HERE 等)"
              >
                <Wallet className="w-3.5 h-3.5 text-[#7D5E2A]" />
                <span className="font-serif tracking-wider text-[#253D39]">
                  {t("连接测试网钱包", "Connect Wallet")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountInput(activeAccountId);
                  setIsAccountModalOpen(true);
                }}
                className="text-[#A2C4BD] hover:text-[#FFFFFF] transition-colors flex items-center gap-1 px-1.5 py-0.5 border border-[#C8AA72]/40 bg-[#162724] text-[10px] font-mono"
                title="免钱包直接体验：输入或切换指定账号档案"
              >
                <User className="w-3 h-3 text-[#5FE3C8]" />
                <span className="truncate max-w-[80px] sm:max-w-none">{activeAccountId}</span>
              </button>
            </div>
          )}
          <span className="text-[#4F736C]">|</span>
          {/* 天阙传谕 · 飞剑传书信箱入口 */}
          <button
            type="button"
            onClick={handleOpenMailbox}
            className="text-[#E0C99B] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5 relative px-2 py-0.5 border border-[#C8AA72]/50 bg-[#162724] shadow-xs"
            title="查看天阙传谕、周榜结算法旨与仙资附件"
          >
            <Mail className="w-3.5 h-3.5 text-[#F2CE85]" />
            <span className="font-serif tracking-wider font-semibold">
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
          <span className="text-[#4F736C]">|</span>
          {/* 灵石与 NEAR 汇率指示器与充值入口 */}
          <button
            type="button"
            onClick={() => setIsRechargeModalOpen(true)}
            className="text-[#F2CE85] hover:text-[#FFFFFF] transition-colors flex items-center gap-1 px-2 py-0.5 border border-[#C8AA72]/50 bg-[#162724] shadow-xs"
            title="查看灵石与 NEAR 兑换规则及收益模式（1 NEAR = 50 灵石，点击充值）"
          >
            <Coins className="w-3.5 h-3.5 text-[#5FE3C8]" />
            <span className="font-mono text-[11px] text-[#5FE3C8]">1N=50石</span>
            <span className="text-[10px] text-[#C8AA72] font-serif border-l border-[#C8AA72]/40 pl-1">
              {t("充值与法则", "Recharge")}
            </span>
          </button>
          <span className="text-[#4F736C]">|</span>
          <Link
            href="/guide"
            className="text-[#C8AA72] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5"
            title="查看游戏完整玩法教程、经济模型（含20%开发运营金库）与部署流程"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t("玩法与经济指南", "Guide & Tokenomics")}</span>
          </Link>
          <span className="text-[#4F736C]">|</span>
          {tutorialStage < 6 && (
            <>
              <button
                onClick={() => setTutorialStage(6)}
                className="text-[#A2C4BD] hover:text-[#FFFFFF] transition-colors flex items-center gap-1"
              >
                <Unlock className="w-3 h-3" />
                <span>{t("全阁开启", "Unlock All")}</span>
              </button>
              <span className="text-[#4F736C]">|</span>
            </>
          )}
          <button
            onClick={() => {
              setReshapeAvatar(cultivator.avatarClass);
              setReshapeDaoName(cultivator.daoName);
              setIsReshapeModalOpen(true);
            }}
            className="text-[#E0C99B] hover:text-[#FFFFFF] transition-colors flex items-center gap-1 px-1.5 py-0.5 border border-[#C8AA72]/40 bg-[#162724]"
            title="道身重塑需支付 0.5 NEAR 或 200 灵石"
          >
            <Sparkles className="w-3 h-3 text-[#FFDF9E]" />
            <span>{t("重塑道身", "Reshape")}</span>
          </button>
          <span className="text-[#4F736C]">|</span>
          <button
            onClick={() => setLang((prev) => (prev === "zh" ? "en" : "zh"))}
            className="text-[#C8AA72] hover:text-[#FFFFFF] transition-colors font-mono"
          >
            {lang === "zh" ? "EN" : "中文"}
          </button>
        </div>
      </div>

      {/* 2. 顶部原生悬浮游戏 HUD (无底框冷金雕刻仪轨，彻底消灭胶囊药丸) */}
      <header className="w-full max-w-5xl mt-2 z-30">
        <div className="xianxia-status-shelf px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* 左侧：道号与境界印可 */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-[#C8AA72] bg-[#162925] flex items-center justify-center text-[#E5D2AB] font-serif font-bold text-sm shadow-inner">
              道
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-base text-[#F4F9F7] tracking-[0.18em]">
                  {trDaoName(cultivator.daoName, lang)}
                </span>
                <span className="flex items-center gap-1 text-[#E5D2AB] text-[11px] font-serif border border-[#C8AA72]/45 px-1.5 py-0.2 bg-[#1A2E2A]">
                  <CinnabarSeal text="真" variant="rect" />
                  <span>
                    {trRealm(cultivator.realm, lang)} · {cultivator.realmLevel}
                    {t("层", "")}
                  </span>
                </span>
              </div>
              <div className="text-[11px] text-[#86ABA3] font-serif">
                {t(cultivator.title, "Taixu Sect Inner Disciple")}
              </div>
            </div>
          </div>

          {/* 中央与右侧：古籍等宽数值仪表盘 (用菱形中式符号分隔，严禁 pill badges) */}
          <div className="flex items-center gap-3 sm:gap-4 font-serif text-[#C4DDD7]">
            <div className="flex items-center gap-1.5">
              <span className="text-[#86ABA3] text-[11px]">{t("气血", "HP")}:</span>
              <span className="text-[#5FE3C8] font-mono font-bold text-sm sm:text-base tabular-nums">
                {cultivator.maxHp}
              </span>
            </div>

            <span className="text-[#C8AA72]/60 select-none">◇</span>

            <div className="flex items-center gap-1.5">
              <span className="text-[#86ABA3] text-[11px]">{t("攻击", "ATK")}:</span>
              <span className="text-[#F2CE85] font-mono font-bold text-sm sm:text-base tabular-nums">
                {cultivator.atk}
              </span>
            </div>

            <span className="text-[#C8AA72]/60 select-none">◇</span>

            <div className="flex items-center gap-1.5">
              <span className="text-[#86ABA3] text-[11px]">{t("灵石", "Stones")}:</span>
              <span className="text-[#F2CE85] font-mono font-bold text-sm sm:text-base tabular-nums">
                {cultivator.spiritStones}
              </span>
            </div>

            <span className="text-[#C8AA72]/60 select-none hidden sm:inline">◇</span>

            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-[#86ABA3] text-[11px]">{t("灵丹", "Pills")}:</span>
              <span className="text-[#5FE3C8] font-mono font-bold text-sm tabular-nums">
                ×{cultivator.inventory.healingPills}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 解锁新仙阁柔光提示卷轴 */}
      {unlockNotice && (
        <div className="w-full max-w-5xl mt-2.5 z-20">
          <div className="xianxia-chamfer-sm bg-[#FFFDF5] border border-[#C8AA72] px-4 py-2 text-center text-xs sm:text-sm font-serif font-bold text-[#6E5122] flex items-center justify-center gap-2 shadow-md">
            <Sparkles className="w-4 h-4 text-[#B89452]" />
            <span>{unlockNotice}</span>
          </div>
        </div>
      )}

      {/* 3. 师尊引路：横向展开的水墨宣纸画轴 (左右两侧带实木轴头) */}
      <section className="w-full max-w-5xl mt-3 z-20">
        <ScrollBanner>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 border-2 border-[#A8884C] bg-[#162724] shrink-0 shadow-sm relative overflow-hidden">
                <img
                  src="/characters/venerable.jpg"
                  alt="上古仙尊"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 font-serif text-xs font-bold text-[#7A5C29] border border-[#C8AA72]/60 px-1.5 py-0.2 bg-white/70">
                    <CinnabarSeal text="引" variant="rect" />
                    <span>{guideInfo.stepText}</span>
                  </span>
                  <span className="text-sm font-serif font-bold text-[#2A1D0E] tracking-wider">
                    {guideInfo.title}
                  </span>
                </div>
                <p className="text-xs font-serif text-[#4A3922] mt-1 leading-relaxed">
                  {guideInfo.desc}
                </p>
              </div>
            </div>

            {tutorialStage === 4 && activeBuilding !== "FORGE" && (
              <button
                onClick={() => setActiveBuilding("FORGE")}
                className="xianxia-btn-gold px-3.5 py-1.5 text-xs font-serif font-bold shrink-0 shadow-sm"
              >
                {t("移步天工剑庐 →", "Enter Sword Forge →")}
              </button>
            )}
            {tutorialStage === 5 && activeBuilding !== "REALM" && (
              <button
                onClick={() => setActiveBuilding("REALM")}
                className="xianxia-btn-gold px-3.5 py-1.5 text-xs font-serif font-bold shrink-0 shadow-sm"
              >
                {t("登临云海试炼塔 →", "Enter Trial Tower →")}
              </button>
            )}
            {tutorialStage === 6 && activeBuilding !== "TREASURY" && (
              <button
                onClick={() => setActiveBuilding("TREASURY")}
                className="xianxia-btn-celadon px-3.5 py-1.5 text-xs font-serif font-bold shrink-0 shadow-sm"
              >
                {t("瞻仰宗门天榜 →", "View Heaven Boards →")}
              </button>
            )}
          </div>
        </ScrollBanner>
      </section>

      {/* 3.5 仙途五步初引任务指引进度条 (解决需求2：一目了然的新手目标与跳转) */}
      <TutorialStepMilestoneBar
        currentStage={tutorialStage}
        onStepClick={(target) => setActiveBuilding(target)}
      />
      {/* 4. 主舞台：左侧修仙道身立绘碑台 + 右侧四大仙阁交互画卷 */}
      <main className="w-full max-w-5xl mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5 z-20">
        {/* 左侧：道身立绘浮空玉台 (去大白圆角框，改为冷峻白玉匣碑式排版) */}
        <section className="lg:col-span-4">
          <JadeGlassPanel
            withTassels
            className="p-5 flex flex-col items-center justify-between min-h-[460px] relative select-none"
          >
            {/* 头顶柔光飘字 (中式方框微切角) */}
            {floatingStatText && (
              <div className="absolute top-12 z-30 px-3 py-1 bg-[#FAF6EC] border border-[#B89452] text-[#593F14] font-serif font-bold text-xs shadow-md animate-bounce">
                {floatingStatText}
              </div>
            )}

            {/* 顶栏：道行战力与灵丹储备 (古典书页条目) */}
            <div className="w-full flex items-center justify-between text-xs font-serif text-[#486B65] border-b border-[#C8AA72]/30 pb-2">
              <span className="flex items-center gap-1.5">
                <span className="text-[#789690]">{t("道行战力", "Dao Power")}:</span>
                <strong className="text-[#8A6A32] font-mono text-sm tabular-nums">
                  {cultivator.maxHp + cultivator.atk * 4}
                </strong>
              </span>
              <span className="flex items-center gap-1 text-[#2E6B5E]">
                <span className="text-[#789690]">{t("回春丹", "Pills")}:</span>
                <strong className="font-mono text-sm tabular-nums">
                  ×{cultivator.inventory.healingPills}
                </strong>
              </span>
            </div>

            {/* 中央白玉立绘区：配局部竖排称号与朱砂印章 */}
            <div className="my-2 flex flex-col items-center w-full relative">
              {/* 侧边古典竖排称号点缀 (打破现代网页水平单调感) */}
              <div className="absolute top-1 right-1 z-20 flex flex-col items-center gap-1 pointer-events-none">
                <CinnabarSeal text="仙" variant="square" />
                <div className="vertical-rl font-serif font-bold text-xs text-[#20423C] tracking-[0.25em] bg-white/80 py-1.5 px-0.5 border border-[#C8AA72]/45 shadow-xs">
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

              <div className="mt-1 text-center font-serif">
                <div className="text-lg font-bold text-[#253D39] tracking-[0.2em]">
                  {trDaoName(cultivator.daoName, lang)}
                </div>
                {cultivator.equippedArtifact ? (
                  <div className="text-xs text-[#8A6830] font-medium mt-0.5">
                    {t("本命佩剑:", "Equipped:")}【
                    {trArtifactName(cultivator.equippedArtifact.name, lang)}】(+
                    {cultivator.equippedArtifact.atkBonus} ATK)
                  </div>
                ) : (
                  <div className="text-xs text-[#6F8E88] mt-0.5">
                    {t("袖手听云 · 尚未佩剑", "Unarmed · Forge a Spirit Sword")}
                  </div>
                )}
              </div>

              {/* 本命真灵已结契法印 & 重塑道身/洗炼灵根入口 (满足需求1：选完不能随意切换，需重塑费用) */}
              <div className="mt-2.5 w-full bg-[#EDF5F3]/90 p-2 border border-[#C8AA72]/50 space-y-1.5 font-serif">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CinnabarSeal text="契" variant="rect" />
                    <span className="text-[11px] font-bold text-[#205247]">
                      {t("本命法相 · 真灵已结契", "Dao Body Bound (NFT)")}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#86ABA3]">
                    #{cultivator.nftTokenId.replace("cultivator-nft:", "")}
                  </span>
                </div>

                {/* 当前先天灵根词条与加成 */}
                <div className="flex items-center justify-between text-[11px] bg-white/80 px-2 py-1 border border-[#C8AA72]/35">
                  <div className="flex items-center gap-1">
                    <span
                      className={`px-1 py-0.2 text-[10px] font-bold border ${
                        cultivator.spiritRoot?.badgeStyle ||
                        "border-[#8A9591] text-[#4A5552] bg-[#EFEFEF]"
                      }`}
                    >
                      {cultivator.spiritRoot?.tier || "凡品"}
                    </span>
                    <span className="text-[#2B4B44] font-semibold truncate max-w-[100px]">
                      {cultivator.spiritRoot?.name || "五行杂灵根"}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#A67838] font-mono font-bold">
                    {cultivator.spiritRoot?.hpBonusPct
                      ? `+${cultivator.spiritRoot.hpBonusPct}%HP `
                      : ""}
                    {cultivator.spiritRoot?.atkBonusPct
                      ? `+${cultivator.spiritRoot.atkBonusPct}%ATK `
                      : ""}
                    {cultivator.spiritRoot?.critBonusPct
                      ? `+${cultivator.spiritRoot.critBonusPct}%暴击`
                      : ""}
                    {!cultivator.spiritRoot?.hpBonusPct &&
                      !cultivator.spiritRoot?.atkBonusPct &&
                      !cultivator.spiritRoot?.critBonusPct &&
                      "凡根·0%加成"}
                  </div>
                </div>

                {/* 重塑道身与灵根洗炼专属入口 */}
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setReshapeAvatar(cultivator.avatarClass);
                      setReshapeDaoName(cultivator.daoName);
                      setIsReshapeModalOpen(true);
                    }}
                    className="px-2 py-1 text-[11px] font-serif font-bold text-[#7D5E2A] bg-[#FAF5E6] hover:bg-[#F3E8C8] border border-[#C8AA72] flex items-center justify-center gap-1 shadow-2xs"
                    title="重塑道身形象与道号 (消耗 200 灵石 或 0.5 NEAR)"
                  >
                    <Sparkles className="w-3 h-3 text-[#A87932]" />
                    <span>{t("重塑道身", "Reshape")}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isRollingSpiritRoot}
                    onClick={handleRollSpiritRootWithNear}
                    className="px-2 py-1 text-[11px] font-serif font-bold text-[#205247] bg-[#EAF4F1] hover:bg-[#D7EAE4] border border-[#7BB5A8] flex items-center justify-center gap-1 shadow-2xs"
                    title="支付 0.1 NEAR 洗炼灵根高阶词条 (资金 100% 注入国库)"
                  >
                    <RefreshCw
                      className={`w-3 h-3 text-[#3E8576] ${
                        isRollingSpiritRoot ? "animate-spin" : ""
                      }`}
                    />
                    <span>{t("洗炼灵根", "Wash Root")}</span>
                  </button>
                </div>
              </div>
            </div>

            <CloudDivider className="my-1.5" />

            {/* 紧凑古籍线装格排版：气血上限与攻击条 */}
            <div className="w-full bg-white/75 border border-[#C8AA72]/55 p-3 space-y-2.5 font-serif text-xs">
              {/* 气血进度条 (矩形古籍格) */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#205247] font-semibold">
                    {t("灵田固本 · 气血上限 (HP)", "Max HP (Herb Garden)")}
                  </span>
                  <span className="font-mono font-bold text-[#205247] tabular-nums">
                    {cultivator.maxHp}{" "}
                    <span className="text-[#3E8576] text-[10px]">
                      (+{cultivator.herbBonusHp})
                    </span>
                  </span>
                </div>
                <div className="w-full h-2 bg-[#D3E5E1] border border-[#9CC5BD] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#5BA496] to-[#34786B] transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((cultivator.maxHp / 600) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* 攻击进度条 */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#7A5923] font-semibold">
                    {t("剑庐修锋 · 本命攻击 (ATK)", "Attack (Sword Forge)")}
                  </span>
                  <span className="font-mono font-bold text-[#7A5923] tabular-nums">
                    {cultivator.atk}{" "}
                    <span className="text-[#A6803F] text-[10px]">
                      (+{cultivator.weaponBonusAtk})
                    </span>
                  </span>
                </div>
                <div className="w-full h-2 bg-[#EFE4D2] border border-[#C8AA72] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#CFA763] to-[#96702C] transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((cultivator.atk / 260) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* 古籍表格行: 矿产与灵种 */}
              <div className="pt-2 border-t border-[#C8AA72]/30 grid grid-cols-3 gap-1 text-[11px] text-center text-[#4B6B65]">
                <div className="border-r border-[#C8AA72]/30">
                  <div className="text-[10px] text-[#789690]">{t("玄铁矿", "Iron")}</div>
                  <div className="font-mono font-bold text-[#253D39] tabular-nums">
                    {cultivator.inventory.ironOres}
                  </div>
                </div>
                <div className="border-r border-[#C8AA72]/30">
                  <div className="text-[10px] text-[#789690]">{t("星辰陨铁", "Meteor")}</div>
                  <div className="font-mono font-bold text-[#253D39] tabular-nums">
                    {cultivator.inventory.meteorOres}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#789690]">{t("灵草仙种", "Seeds")}</div>
                  <div className="font-mono font-bold text-[#253D39] tabular-nums">
                    {(cultivator.inventory.seedBag[1] || 0) +
                      (cultivator.inventory.seedBag[2] || 0) +
                      (cultivator.inventory.seedBag[3] || 0)}
                  </div>
                </div>
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
                isNew: arenaUnlocked && activeBuilding !== "ARENA" && tutorialStage >= 6,
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
              const isTutorialTabTarget =
                (tutorialStage === 4 && activeBuilding !== "FORGE" && tab.id === "FORGE") ||
                (tutorialStage === 5 && activeBuilding !== "REALM" && tab.id === "REALM") ||
                (tutorialStage === 6 && activeBuilding !== "ARENA" && tab.id === "ARENA");

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
                        tab.id === "FORGE"
                          ? t("轻触切换至天工剑庐", "Switch to Sword Forge")
                          : tab.id === "REALM"
                          ? t("轻触切换至云海试炼", "Switch to Trial Tower")
                          : t("轻触拔剑登临论剑台", "Switch to Duel Arena")
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

                {/* 仙种品阶选择器 (折沿按钮) */}
                <div className="flex gap-1.5 bg-[#EDF5F3] p-1 border border-[#C8AA72]/45">
                  {catalogs.herbSeeds.map((s) => (
                    <button
                      key={s.tier}
                      onClick={() => setSelectedSeedTier(s.tier)}
                      className={`px-2.5 py-0.5 text-xs font-serif transition ${
                        selectedSeedTier === s.tier
                          ? "bg-[#DCEEEB] border border-[#73ADA1] text-[#234E46] font-bold shadow-xs"
                          : "text-[#5E7C77] hover:text-[#253D39]"
                      }`}
                    >
                      {s.tier}
                      {t("阶", "T")} · {trHerbName(s.name, lang)} (+
                      {s.permMaxHpBonus}HP)
                    </button>
                  ))}
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
                            <span className="text-[9.5px] font-serif text-[#86ABA3] px-1 shrink-0">
                              {t("灵壤", "Soil")}
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
                              <span className="text-[9.5px] text-[#86ABA3] leading-none mt-0.5">
                                {t("点击下种", "Click to Plant")}
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

              {/* 温润白玉八卦剑炉动效区 (去圆角大白框，用中式方八卦阵盘) */}
              <div className="my-3 py-3 px-4 border border-[#C8AA72]/50 bg-white/70 flex flex-col items-center justify-center relative">
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
                    : t("白玉八卦剑炉已温炉 · 请择一卷剑谱开炉", "Select a Sword Scroll Below to Forge")}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {catalogs.forgeBlueprints.map((bp, idx) => {
                  const canForge =
                    cultivator.inventory.ironOres >= bp.ironOreCost &&
                    cultivator.inventory.meteorOres >= bp.meteorOreCost &&
                    cultivator.spiritStones >= bp.spiritStoneFee;
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
                        <div className="text-[11px] font-serif text-[#5C7A75] mt-2 space-y-0.5">
                          <div>
                            {t("玄铁矿:", "Iron:")} <span className="font-mono text-[#253D39]">{bp.ironOreCost}</span>{" "}
                            {bp.meteorOreCost > 0 &&
                              `· 陨铁: ${bp.meteorOreCost}`}
                          </div>
                          <div>
                            {t("灵火费:", "Furnace Fee:")} <span className="font-mono text-[#253D39]">{bp.spiritStoneFee}</span>{" "}
                            {t("灵石", "Stones")}
                          </div>
                        </div>
                      </div>

                      <button
                        disabled={!canForge || isForgingAnim || loadingAction}
                        onClick={() => handleForgeWeapon(bp.id)}
                        className={`mt-3 w-full py-2 text-xs font-serif font-bold transition flex items-center justify-center min-h-[34px] ${
                          canForge
                            ? "xianxia-btn-gold"
                            : "bg-slate-200/60 text-slate-400 border border-slate-300 cursor-not-allowed"
                        }`}
                      >
                        {isBpLoading ? (
                          <XianxiaLoadingRing
                            text={activeLoading?.textZh}
                            size="sm"
                            tone="light"
                          />
                        ) : canForge ? (
                          t("开炉铸剑", "Forge Blade")
                        ) : (
                          t("玄铁不足 (试炼获取)", "Need Ores")
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
                      "气血低于五成半时将自动服用灵圃炼制的回春灵丹；降伏守护玄兽可获玄铁、陨铁与灵石",
                      "Auto-consumes farmed healing pills below 55% HP; defeat Guardians to obtain forging ores"
                    )}
                  </p>
                </div>

                <div className="flex gap-1.5">
                  {catalogs.realmFloors.map((fl) => (
                    <button
                      key={fl.floor}
                      disabled={isBattling}
                      onClick={() => setSelectedFloor(fl.floor)}
                      className={`px-2.5 py-1 text-xs font-serif transition ${
                        selectedFloor === fl.floor
                          ? "xianxia-btn-gold font-bold"
                          : "border border-[#C8AA72]/40 bg-white/70 text-[#587570] hover:text-[#253D39]"
                      }`}
                    >
                      {t(`第${fl.floor}重`, `Tier ${fl.floor}`)}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const currentFloorCfg =
                  catalogs.realmFloors.find((f) => f.floor === selectedFloor) ||
                  catalogs.realmFloors[0];
                const activeLog =
                  isBattling &&
                  latestBattleReport &&
                  latestBattleReport.logs[battleTurnIdx - 1];

                const displayHeroHp = activeLog
                  ? activeLog.cultivatorHpAfter
                  : cultivator.maxHp;
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
                                `试炼通过 · 获赐玄铁 +${latestBattleReport.rewards?.ironOres}、陨铁 +${latestBattleReport.rewards?.meteorOres}、灵石 +${latestBattleReport.rewards?.spiritStones}`,
                                `Victory · +${latestBattleReport.rewards?.ironOres} Iron Ores & +${latestBattleReport.rewards?.spiritStones} Spirit Stones`
                              )
                            : t(
                                "气血稍逊，请回灵圃服丹或铸造更高品阶仙剑后再试",
                                "Return to the Herb Garden or Sword Forge to strengthen your Cultivator"
                              )
                          : t(
                                `本重镇守玄灵：${currentFloorCfg.monsterName}（通过可获玄铁 +${currentFloorCfg.dropIronOres}、灵石 +${currentFloorCfg.rewardSpiritStones}）`,
                                `Guardian: ${trMonsterName(
                                  currentFloorCfg.monsterName,
                                  "en"
                                )} (Drops +${currentFloorCfg.dropIronOres} Ores)`
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
                          className="xianxia-btn-gold px-4 py-2 font-serif font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm min-w-[145px]"
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
                                : t(
                                    `御剑试炼第 ${currentFloorCfg.floor} 重`,
                                    `Challenge Tier ${currentFloorCfg.floor}`
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
                                +{opp.rewardSpiritStones}石 / +{opp.rewardDuelPoints}分
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#253D39] tracking-wider">
                    {t(
                      "宗门国库 · 四大周天榜与五三二黄金分账 (50% 奖池 / 30% 滚存 / 20% 开发金库)",
                      "Sect Treasury 50/30/20 Split & Four Weekly Heaven Leaderboards"
                    )}
                  </h3>
                  <p className="text-xs font-serif text-[#587570] mt-0.5">
                    {t(
                      `国库现储 ${treasury.totalTreasurySpiritStones} 灵石：50% (${treasury.activeWeeklyRewardPoolStones} 石) 分润四大天榜玩家 (诛魔30% / 论剑30% / 百草20% / 神工20%) · 30% 滚存底池 · 20% (${treasury.activeDevOpsAllocationStones} 石) 划拨天机阁开发运营`,
                      `Treasury: ${treasury.totalTreasurySpiritStones} Stones — 50% Weekly Boards (Slayer 30%, Duel 30%, Alchemy 20%, Forge 20%) · 30% Reserve · 20% to Dev Vault`
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* 周榜东八区周日24点倒计时 */}
                  <WeeklyCountdownBadge
                    targetIsoUtc={treasury.nextWeeklySettlementUtc8}
                    label={t("东八区周日 24:00 (UTC+8) 定时发榜倒计时", "Sun 24:00 (UTC+8) Auto-Settle")}
                  />

                  {/* 状态徽标：天道定时发榜中，禁止玩家手动重复提取 */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-[#12221F] border border-[#C8AA72]/60 text-xs font-serif shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-[#52D1B2] animate-pulse" />
                    <span className="text-[#E0C99B] font-semibold">
                      {t("天道定时清算中", "Scheduled Auto-Distribution")}
                    </span>
                    <button
                      type="button"
                      onClick={handleOpenMailbox}
                      className="ml-1 text-[11px] text-[#5FE3C8] hover:text-[#FFFFFF] underline transition flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3" />
                      <span>{t("查收天阙传谕", "View Decrees")}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 定时发榜与邮件领赏说明卡片 */}
              <div className="mt-2.5 mb-1 px-3 py-1.5 bg-[#FBF6EA] border border-[#C8AA72]/45 text-xs font-serif text-[#664D24] flex flex-wrap items-center justify-between gap-2">
                <div className="flex-1 min-w-[280px] flex items-center gap-1.5 leading-relaxed">
                  <CinnabarSeal text="律" variant="rect" />
                  <span>
                    {t(
                      "【四大周天榜清算机制】每周日 24:00 (UTC+8) 准时由天道自动结算并向【天阙传谕】下发周俸，禁止手动重复提取国库。",
                      "Four weekly boards settle automatically every Sun 24:00 (UTC+8). Rewards arrive via Decrees Mail, preventing duplicate manual exploitation."
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenMailbox}
                  className="shrink-0 text-xs text-[#8A6828] hover:text-[#593F14] font-bold underline flex items-center gap-1"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>{t("打开传谕信箱领赏", "Open Decrees Inbox")}</span>
                </button>
              </div>

              <CloudDivider className="my-2" />

              {/* 天榜视界切换栏 (四象全览 2x2 / 单榜封神金阶) */}
              <div className="flex flex-wrap items-center justify-between gap-2 my-2 pb-1.5 border-b border-[#C8AA72]/30">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-serif font-bold text-[#253D39] flex items-center gap-1 mr-1">
                    <Trophy className="w-3.5 h-3.5 text-[#B8860B]" />
                    <span>{t("天榜视界", "Leaderboard View")}:</span>
                  </span>
                  {[
                    {
                      id: "ALL" as const,
                      label: t("四象全览 (2×2并照)", "All 4 Boards (2x2)"),
                      icon: Award,
                    },
                    {
                      id: "SLAYER" as const,
                      label: t("诛魔天榜 · 试炼", "Slayer Board"),
                      icon: Swords,
                    },
                    {
                      id: "ALCHEMY" as const,
                      label: t("百草药圣榜 · 灵植", "Alchemy Board"),
                      icon: Sprout,
                    },
                    {
                      id: "BLACKSMITH" as const,
                      label: t("神工天匠榜 · 战力", "Swordsmith Board"),
                      icon: Hammer,
                    },
                    {
                      id: "DUEL" as const,
                      label: t("问鼎论剑榜 · 积分", "Duel Board"),
                      icon: Trophy,
                    },
                  ].map((tab) => {
                    const active = boardViewTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setBoardViewTab(tab.id)}
                        className={`px-2.5 py-1 text-xs font-serif transition-all flex items-center gap-1 border ${
                          active
                            ? "bg-[#253D39] text-[#F3E5C8] border-[#253D39] font-bold shadow-xs"
                            : "bg-white/80 text-[#597570] hover:text-[#253D39] border-[#C8AA72]/40 hover:bg-[#FAF6EC]"
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[11px] font-serif text-[#789691] flex items-center gap-1.5">
                  <span>
                    {t(
                      "前四席享国库周俸梯度分润 (50%/25%/15%/10%)",
                      "Top 4 share 50/25/15/10% of 50% pool"
                    )}
                  </span>
                </div>
              </div>

              {/* 四大周天榜展示主体 (2×2 宽广四象全览 或 单榜领奖台名册) */}
              {(() => {
                const boardsData = [
                  {
                    id: "SLAYER" as const,
                    title: t("诛魔天榜 · 三成池", "Slayer Board · 30% Pool"),
                    shortTitle: t("诛魔天榜", "Slayer Board"),
                    sub: t("按云海试炼通关层数排序", "Sorted by Trial Tower Floors"),
                    poolSharePct: 30,
                    poolStones: Number((treasury.activeWeeklyRewardPoolStones * 0.3).toFixed(1)),
                    metricName: t("试炼层数", "Trial Floor"),
                    icon: Swords,
                    entries: treasury.boards.slayerBoard,
                  },
                  {
                    id: "ALCHEMY" as const,
                    title: t("百草药圣榜 · 二成池", "Alchemy Board · 20% Pool"),
                    shortTitle: t("百草药圣榜", "Alchemy Board"),
                    sub: t("按种植收获灵草株数排序", "Sorted by Herbs Harvested"),
                    poolSharePct: 20,
                    poolStones: Number((treasury.activeWeeklyRewardPoolStones * 0.2).toFixed(1)),
                    metricName: t("收获株数", "Herbs Harvested"),
                    icon: Sprout,
                    entries: treasury.boards.alchemyBoard,
                  },
                  {
                    id: "BLACKSMITH" as const,
                    title: t("神工天匠榜 · 二成池", "Swordsmith Board · 20% Pool"),
                    shortTitle: t("神工天匠榜", "Swordsmith Board"),
                    sub: t("按道身综合战力(气血+攻击*4)排序", "Sorted by Total Combat Power"),
                    poolSharePct: 20,
                    poolStones: Number((treasury.activeWeeklyRewardPoolStones * 0.2).toFixed(1)),
                    metricName: t("综合战力", "Combat Power"),
                    icon: Hammer,
                    entries: treasury.boards.blacksmithBoard,
                  },
                  {
                    id: "DUEL" as const,
                    title: t("问鼎论剑榜 · 三成池", "Duel Board · 30% Pool"),
                    shortTitle: t("问鼎论剑榜", "Duel Board"),
                    sub: t("按论剑台演武积分排序", "Sorted by Duel ELO Points"),
                    poolSharePct: 30,
                    poolStones: Number((treasury.activeWeeklyRewardPoolStones * 0.3).toFixed(1)),
                    metricName: t("论剑积分", "Duel Score"),
                    icon: Trophy,
                    entries: treasury.boards.duelBoard,
                  },
                ];

                if (boardViewTab === "ALL") {
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-auto">
                      {boardsData.map((board) => {
                        const top1 = board.entries[0];
                        const top2 = board.entries[1];
                        const top3 = board.entries[2];
                        const remaining = board.entries.slice(3);
                        const playerEntry = board.entries.find((e) => e.isPlayer);
                        const Icon = board.icon;

                        return (
                          <div
                            key={board.id}
                            className="border border-[#C8AA72]/50 bg-white/80 p-3 space-y-2 font-serif shadow-xs flex flex-col justify-between"
                          >
                            {/* 榜首卡片头部 */}
                            <div>
                              <div className="flex items-center justify-between pb-1.5 border-b border-[#C8AA72]/30">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-xs bg-[#253D39] text-[#E5D2A8] flex items-center justify-center shrink-0 shadow-2xs">
                                    <Icon className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-[#253D39] flex items-center gap-1.5">
                                      <span>{board.title}</span>
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#FAF2DE] border border-[#C8AA72]/40 text-[#8A6828]">
                                        池: {board.poolStones}石
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-[#607E79] truncate" title={board.sub}>
                                      {board.sub}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[11px] font-serif text-[#688580] bg-white/70 px-2 py-0.5 border border-[#C8AA72]/30 shrink-0">
                                  {t(`共 ${board.entries.length} 位在榜`, `${board.entries.length} Cultivators`)}
                                </span>
                              </div>

                              {/* 内容列表区 */}
                              <div className="space-y-2 mt-2">
                                {board.entries.length === 0 ? (
                                  <div className="py-6 text-center text-xs text-[#86ABA3] italic bg-white/40 border border-dashed border-[#C8AA72]/30 my-2">
                                    {t("虚位以待，道友速速登榜", "Awaiting Cultivators")}
                                  </div>
                                ) : (
                                  <>
                                    {/* 1. 👑 榜首魁首特殊尊荣展示 */}
                                    {top1 && (
                                      <div
                                        className={`p-2.5 border-2 relative overflow-hidden transition shadow-xs ${
                                          top1.isPlayer
                                            ? "bg-gradient-to-r from-[#FFFBEA] via-[#FAF1D6] to-[#F5E6BE] border-[#D4AF37] ring-1 ring-[#D4AF37]"
                                            : "bg-gradient-to-r from-[#FFFDF2] via-[#FAF5E4] to-[#F5EBD0] border-[#D4AF37]/80"
                                        }`}
                                      >
                                        <div className="absolute -right-2 -bottom-3 text-5xl font-serif text-[#D4AF37]/10 select-none pointer-events-none font-bold">
                                          魁
                                        </div>
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#8A5A12]">
                                            <Crown className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37] shrink-0" />
                                            <span>{t("👑 榜首魁首 · 冠绝天榜", "👑 Rank 1 Champion")}</span>
                                            {top1.isPlayer && (
                                              <span className="text-[10px] bg-[#B8860B] text-white px-1.5 py-0.2 rounded-xs font-bold shrink-0">
                                                {t("道友本人", "You")}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 font-mono text-xs font-bold text-[#855B14] bg-[#FEF3C7] px-2 py-0.5 border border-[#F59E0B]/40">
                                            <span>+{top1.estimatedRewardStones} {t("灵石", "Stones")}</span>
                                            <span className="text-[10px] text-[#A16207]">({top1.sharePct}%)</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-5 h-5 rounded-full bg-gradient-to-b from-[#F59E0B] to-[#D97706] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                              1
                                            </span>
                                            <span className="text-sm font-bold text-[#3B2506] truncate max-w-[150px]" title={top1.daoName}>
                                              {trDaoName(top1.daoName, lang)}
                                            </span>
                                          </div>
                                          <span className="font-mono text-xs font-bold text-[#785412] bg-white/95 px-2 py-0.5 border border-[#C8AA72]/60 shrink-0 shadow-2xs">
                                            {top1.metricLabel}
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* 2. 🥈 榜眼 & 🥉 探花两列并排特殊展示 */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                      {/* #2 榜眼 */}
                                      {top2 ? (
                                        <div
                                          className={`p-2 border flex items-center justify-between gap-1.5 shadow-2xs ${
                                            top2.isPlayer
                                              ? "bg-[#F1F5F9] border-[#64748B] ring-1 ring-[#64748B]"
                                              : "bg-gradient-to-r from-[#F8FAFC] to-[#EEF2F6] border-[#CBD5E1]"
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="w-4 h-4 rounded-full bg-[#64748B] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                              2
                                            </span>
                                            <Medal className="w-3 h-3 text-[#64748B] shrink-0" />
                                            <span className="text-xs font-bold text-[#1E293B] truncate max-w-[80px]" title={top2.daoName}>
                                              {trDaoName(top2.daoName, lang)}
                                            </span>
                                            {top2.isPlayer && (
                                              <span className="text-[9px] bg-[#64748B] text-white px-1 rounded-xs font-bold shrink-0">我</span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <span className="font-mono text-[10.5px] font-semibold text-[#475569] bg-white/90 px-1 py-0.2 border border-[#CBD5E1]">
                                              {top2.metricLabel}
                                            </span>
                                            <span className="text-[11px] font-mono font-bold text-[#1E293B]">
                                              +{top2.estimatedRewardStones}石
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="p-2 border border-dashed border-[#CBD5E1] text-[10.5px] text-[#94A3B8] flex items-center justify-between italic bg-white/40">
                                          <span>🥈 榜眼虚位以待</span>
                                          <span className="font-mono text-[10px]">待登榜 (25%)</span>
                                        </div>
                                      )}

                                      {/* #3 探花 */}
                                      {top3 ? (
                                        <div
                                          className={`p-2 border flex items-center justify-between gap-1.5 shadow-2xs ${
                                            top3.isPlayer
                                              ? "bg-[#FAF5F0] border-[#8D6E63] ring-1 ring-[#8D6E63]"
                                              : "bg-gradient-to-r from-[#FAF6F0] to-[#EFE4D8] border-[#D7CCC8]"
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="w-4 h-4 rounded-full bg-[#8D6E63] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                              3
                                            </span>
                                            <Medal className="w-3 h-3 text-[#8D6E63] shrink-0" />
                                            <span className="text-xs font-bold text-[#3E2723] truncate max-w-[80px]" title={top3.daoName}>
                                              {trDaoName(top3.daoName, lang)}
                                            </span>
                                            {top3.isPlayer && (
                                              <span className="text-[9px] bg-[#8D6E63] text-white px-1 rounded-xs font-bold shrink-0">我</span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <span className="font-mono text-[10.5px] font-semibold text-[#5D4037] bg-white/90 px-1 py-0.2 border border-[#D7CCC8]">
                                              {top3.metricLabel}
                                            </span>
                                            <span className="text-[11px] font-mono font-bold text-[#3E2723]">
                                              +{top3.estimatedRewardStones}石
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="p-2 border border-dashed border-[#D7CCC8] text-[10.5px] text-[#A1887F] flex items-center justify-between italic bg-white/40">
                                          <span>🥉 探花虚位以待</span>
                                          <span className="font-mono text-[10px]">待登榜 (15%)</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* 3. 第 4 名及后续道友（多人平滑滚动兼容） */}
                                    {remaining.length > 0 && (
                                      <div className="border-t border-[#C8AA72]/30 pt-1.5 space-y-1">
                                        <div className="flex items-center justify-between text-[10.5px] text-[#718F89] px-0.5">
                                          <span>{t("天榜列席道友", "Competing Cultivators")} ({remaining.length}{t("位", "")})</span>
                                          <span>{t("第4席享10%周俸 · 余位蓄势", "Rank 4 gets 10%")}</span>
                                        </div>
                                        <div className="max-h-[110px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                          {remaining.map((e) => (
                                            <div
                                              key={e.subAccountId}
                                              className={`px-2 py-1 text-xs flex items-center justify-between gap-1 border ${
                                                e.isPlayer
                                                  ? "bg-[#FAF6EC] border-[#C8AA72] text-[#594119] font-bold"
                                                  : "bg-white/60 border-[#C8AA72]/20 text-[#476660]"
                                              }`}
                                            >
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-mono text-[11px] text-[#8C7A58] font-bold w-4 shrink-0">#{e.rank}</span>
                                                <span className="truncate max-w-[110px]" title={e.daoName}>{trDaoName(e.daoName, lang)}</span>
                                                {e.isPlayer && (
                                                  <span className="text-[9px] bg-[#C8AA72] text-white px-1 py-0.2 rounded-xs font-bold shrink-0">我</span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-1 shrink-0">
                                                <span className="font-mono text-[10.5px] font-bold text-[#8A6828] bg-[#FAF2DE]/95 px-1 py-0.2 border border-[#C8AA72]/40">
                                                  {e.metricLabel}
                                                </span>
                                                <span className="text-[#2E6B5E] font-mono font-semibold tabular-nums text-[11px]">
                                                  {e.estimatedRewardStones > 0 ? `+${e.estimatedRewardStones}石` : t("候榜", "-")}
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* 4. 底部图钉：若当前道友在三甲之外，固定展示自身排名与差距 */}
                            {playerEntry && playerEntry.rank > 3 && (
                              <div className="mt-2 px-2.5 py-1 bg-[#FAF6EC] border border-[#C8AA72] text-xs font-serif text-[#594119] flex items-center justify-between shadow-2xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-[#B8860B] animate-pulse" />
                                  <span>{t("贫道当前位次", "Your Standing")}: <strong className="font-bold text-[#8A5A12]">第 {playerEntry.rank} 名</strong></span>
                                </div>
                                <span className="font-mono text-[11px] text-[#8A6828] font-bold">{playerEntry.metricLabel}</span>
                                <span className="font-mono text-[11px] text-[#2E6B5E] font-bold">
                                  {playerEntry.estimatedRewardStones > 0 ? `+${playerEntry.estimatedRewardStones}石` : t("蓄势待发", "Pending")}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                // 单榜专注全景视图 (带三甲领奖台与完整名册)
                const targetBoard = boardsData.find((b) => b.id === boardViewTab) || boardsData[0];
                const top1 = targetBoard.entries[0];
                const top2 = targetBoard.entries[1];
                const top3 = targetBoard.entries[2];
                const remaining = targetBoard.entries.slice(3);
                const playerEntry = targetBoard.entries.find((e) => e.isPlayer);
                const Icon = targetBoard.icon;

                return (
                  <div className="space-y-3 font-serif my-auto">
                    {/* 单榜抬头横幅 */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white/80 border border-[#C8AA72]/50 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xs bg-[#253D39] text-[#E5D2A8] flex items-center justify-center shrink-0 shadow-xs">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#253D39] flex items-center gap-2">
                            <span>{targetBoard.title}</span>
                            <span className="text-xs font-mono px-2 py-0.5 bg-[#FAF2DE] border border-[#C8AA72]/40 text-[#8A6828]">
                              奖池: {targetBoard.poolStones} 灵石
                            </span>
                          </div>
                          <div className="text-xs text-[#607E79]">{targetBoard.sub}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-serif text-[#688580] bg-white/90 px-2.5 py-1 border border-[#C8AA72]/30">
                          {t(`共 ${targetBoard.entries.length} 位道友竞逐此榜`, `${targetBoard.entries.length} Cultivators Competing`)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setBoardViewTab("ALL")}
                          className="px-2.5 py-1 text-xs bg-[#FAF6EC] hover:bg-[#F0E6D2] border border-[#C8AA72] text-[#8A6828] font-bold transition flex items-center gap-1"
                        >
                          <span>{t("← 返回四象全览", "← Back to 2x2 View")}</span>
                        </button>
                      </div>
                    </div>

                    {/* 三甲封神领奖台 (Three-Tier Podium) */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-2 pb-1 px-2 sm:px-6 bg-gradient-to-b from-white/40 via-white/80 to-[#FAF6EC]/90 border border-[#C8AA72]/40 shadow-xs">
                      {/* 🥈 榜眼 (第 2 名) */}
                      <div className="flex flex-col items-center">
                        {top2 ? (
                          <div className="w-full flex flex-col items-center">
                            <Medal className="w-6 h-6 text-[#64748B] mb-1" />
                            <div className="text-xs sm:text-sm font-bold text-[#1E293B] truncate max-w-[100px] text-center" title={top2.daoName}>
                              {trDaoName(top2.daoName, lang)}
                            </div>
                            <div className="text-[11px] font-mono font-bold text-[#64748B] bg-white/90 px-1.5 py-0.5 border border-[#CBD5E1] my-1">
                              {top2.metricLabel}
                            </div>
                            <div className="text-xs font-mono font-bold text-[#1E293B] mb-1">
                              +{top2.estimatedRewardStones}石 (25%)
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-[11px] text-[#94A3B8] italic mb-3">
                            🥈 榜眼虚位
                          </div>
                        )}
                        <div className="w-full h-20 sm:h-24 bg-gradient-to-b from-[#E2E8F0] to-[#CBD5E1] border-t-2 border-[#94A3B8] flex items-center justify-center font-bold text-lg text-[#475569] shadow-xs">
                          贰 · 榜眼
                        </div>
                      </div>

                      {/* 👑 魁首 (第 1 名 - 最高领奖台) */}
                      <div className="flex flex-col items-center">
                        {top1 ? (
                          <div className="w-full flex flex-col items-center relative">
                            <Crown className="w-8 h-8 text-[#D4AF37] fill-[#D4AF37] mb-1 animate-bounce" />
                            <div className="text-sm sm:text-base font-bold text-[#422D0B] truncate max-w-[140px] text-center" title={top1.daoName}>
                              {trDaoName(top1.daoName, lang)}
                            </div>
                            {top1.isPlayer && (
                              <span className="text-[10px] bg-[#B8860B] text-white px-1.5 py-0.2 rounded-xs font-bold my-0.5">
                                {t("道友本人", "You")}
                              </span>
                            )}
                            <div className="text-xs font-mono font-bold text-[#8A5A12] bg-[#FEF3C7] px-2 py-0.5 border border-[#F59E0B]/50 my-1 shadow-2xs">
                              {top1.metricLabel}
                            </div>
                            <div className="text-xs sm:text-sm font-mono font-bold text-[#B45309] mb-1">
                              +{top1.estimatedRewardStones}石 ({top1.sharePct}%)
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-xs text-[#86ABA3] italic mb-3">
                            👑 榜首虚位
                          </div>
                        )}
                        <div className="w-full h-28 sm:h-32 bg-gradient-to-b from-[#FEF3C7] to-[#FDE68A] border-t-3 border-[#D4AF37] flex flex-col items-center justify-center font-bold text-xl text-[#78350F] shadow-md ring-1 ring-[#D4AF37]/50">
                          <span>壹 · 魁首</span>
                          <span className="text-[10px] font-normal text-[#92400E] mt-0.5">冠绝太虚</span>
                        </div>
                      </div>

                      {/* 🥉 探花 (第 3 名) */}
                      <div className="flex flex-col items-center">
                        {top3 ? (
                          <div className="w-full flex flex-col items-center">
                            <Medal className="w-5 h-5 text-[#8D6E63] mb-1" />
                            <div className="text-xs sm:text-sm font-bold text-[#3E2723] truncate max-w-[100px] text-center" title={top3.daoName}>
                              {trDaoName(top3.daoName, lang)}
                            </div>
                            <div className="text-[11px] font-mono font-bold text-[#8D6E63] bg-white/90 px-1.5 py-0.5 border border-[#D7CCC8] my-1">
                              {top3.metricLabel}
                            </div>
                            <div className="text-xs font-mono font-bold text-[#3E2723] mb-1">
                              +{top3.estimatedRewardStones}石 (15%)
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-[11px] text-[#A1887F] italic mb-3">
                            🥉 探花虚位
                          </div>
                        )}
                        <div className="w-full h-16 sm:h-18 bg-gradient-to-b from-[#EFEBE9] to-[#D7CCC8] border-t-2 border-[#8D6E63] flex items-center justify-center font-bold text-base text-[#4E342E] shadow-xs">
                          叁 · 探花
                        </div>
                      </div>
                    </div>

                    {/* 完整名册表单 (第 4 名及后续所有道友) */}
                    <div className="border border-[#C8AA72]/40 bg-white/90 p-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs text-[#253D39] font-bold border-b border-[#C8AA72]/30 pb-2 mb-2">
                        <span className="w-16">{t("名次", "Rank")}</span>
                        <span className="flex-1">{t("道友道号", "Cultivator")}</span>
                        <span className="w-32 text-center">{targetBoard.metricName}</span>
                        <span className="w-28 text-right">{t("预估周俸", "Est. Dividends")}</span>
                      </div>
                      {targetBoard.entries.length === 0 ? (
                        <div className="py-6 text-center text-xs text-[#86ABA3] italic">
                          {t("本榜暂无道友入籍，速速登临大放异彩", "No cultivators yet.")}
                        </div>
                      ) : (
                        <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                          {targetBoard.entries.map((e) => (
                            <div
                              key={e.subAccountId}
                              className={`px-3 py-1.5 text-xs flex items-center justify-between border ${
                                e.isPlayer
                                  ? "bg-[#FAF6EC] border-[#C8AA72] text-[#594119] font-bold shadow-2xs"
                                  : "bg-white border-[#C8AA72]/20 text-[#476660]"
                              }`}
                            >
                              <span className="w-16 font-mono font-bold text-[#8A6828]">
                                #{e.rank}
                                {e.rank === 1 && " 👑"}
                                {e.rank === 2 && " 🥈"}
                                {e.rank === 3 && " 🥉"}
                              </span>
                              <div className="flex-1 flex items-center gap-1.5 truncate">
                                <span className="truncate">{trDaoName(e.daoName, lang)}</span>
                                {e.isPlayer && (
                                  <span className="text-[10px] bg-[#C8AA72] text-white px-1.5 py-0.2 rounded-xs font-bold shrink-0">
                                    {t("道友本人", "You")}
                                  </span>
                                )}
                              </div>
                              <span className="w-32 text-center font-mono font-bold text-[#8A6828] bg-[#FAF2DE]/80 px-2 py-0.5 border border-[#C8AA72]/30">
                                {e.metricLabel}
                              </span>
                              <span className="w-28 text-right font-mono font-bold text-[#2E6B5E]">
                                {e.estimatedRewardStones > 0 ? `+${e.estimatedRewardStones} 灵石` : t("候榜", "-")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
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
                : cultivator.maxHp;

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
                          `论剑告捷！积分 +${pvpDuelReport.rewards.duelPointsDelta} · 获灵石 +${pvpDuelReport.rewards.spiritStones}`,
                          `Victory! Duel Pts +${pvpDuelReport.rewards.duelPointsDelta} · +${pvpDuelReport.rewards.spiritStones} Stones`
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
