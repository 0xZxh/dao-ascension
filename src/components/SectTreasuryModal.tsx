"use client";

import React from "react";
import {
  Coins,
  Shield,
  Trophy,
  Hammer,
  Sprout,
  Swords,
  X,
  ExternalLink,
  Info,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { SectTreasuryState } from "@/lib/xianxia/types";
import { CinnabarSeal } from "./JadeUiOrnaments";

export interface SectTreasuryModalProps {
  isOpen: boolean;
  onClose: () => void;
  treasury: SectTreasuryState;
  onClearGenesisFund?: () => void;
  lang?: "zh" | "en";
}

export function SectTreasuryModal({
  isOpen,
  onClose,
  treasury,
  onClearGenesisFund,
  lang = "zh",
}: SectTreasuryModalProps) {
  if (!isOpen) return null;

  const t = (zh: string, en: string) => (lang === "en" ? en : zh);

  const totalStones = treasury.totalTreasurySpiritStones;
  const totalNear = Number((totalStones / 50).toFixed(2));

  const activePoolStones = treasury.activeWeeklyRewardPoolStones;
  const activePoolNear = Number((activePoolStones / 50).toFixed(2));

  const reserveStones = Number((totalStones * 0.3).toFixed(1));
  const reserveNear = Number((reserveStones / 50).toFixed(2));

  const devOpsStones = treasury.activeDevOpsAllocationStones;
  const devOpsNear = Number((devOpsStones / 50).toFixed(2));

  const breakdown = treasury.feeBreakdown || {
    seedPurchasesStones: 0,
    forgingFeesStones: 0,
    realmEntryFeesStones: 0,
    initialGenesisStones: 0,
    rechargeStones: 0,
  };

  const genesisStones = breakdown.initialGenesisStones || 0;
  const genesisNear = Number((genesisStones / 50).toFixed(2));

  const seedsStones = breakdown.seedPurchasesStones || 0;
  const seedsNear = Number((seedsStones / 50).toFixed(2));

  const forgingStones = breakdown.forgingFeesStones || 0;
  const forgingNear = Number((forgingStones / 50).toFixed(2));

  const realmStones = breakdown.realmEntryFeesStones || 0;
  const realmNear = Number((realmStones / 50).toFixed(2));

  const rechargeStones = breakdown.rechargeStones || 0;
  const rechargeNear = Number((rechargeStones / 50).toFixed(2));

  // 纯玩家行为产生的真实流水（剔除模拟创世金）
  const organicPlayerStones = Number((totalStones - genesisStones).toFixed(1));
  const organicPlayerNear = Number((organicPlayerStones / 50).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 select-none animate-fadeIn">
      {/* 遮罩背景 */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* 宣纸法旨主窗口 */}
      <div className="relative z-10 w-full max-w-4xl bg-[#FAF6EC] border-2 border-[#C8AA72] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* 顶部玉扣与标题栏 */}
        <div className="h-13 border-b border-[#C8AA72]/60 bg-[#F0E8D5] px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <CinnabarSeal text="库" variant="circle" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-sm sm:text-base text-[#4A320E] tracking-widest">
                  {t("九天玄机阁 · 宗门国库账房", "Sect Treasury Vault & Ledger")}
                </span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-[#FAF4E6] border border-[#B89452]/50 text-[#8A6828]">
                  {t(`第 ${treasury.currentEpoch} 周天期`, `Epoch #${treasury.currentEpoch}`)}
                </span>
              </div>
              <p className="text-[11px] font-serif text-[#7A5B22] hidden sm:block">
                {t(
                  "依【五三二黄金分账规约】实时清算 · 每一分 NEAR 与灵石皆明明白白",
                  "50/30/20 Golden Split · Every single NEAR & Spirit Stone fully accounted"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-[#6D5325] hover:text-[#251A08] transition p-1.5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 主体滚动区 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#FAF6EC]">
          {/* 1. 四大核心资金蓄水池总览卡片 */}
          <div>
            <div className="text-xs font-serif font-bold text-[#6D5325] mb-2 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-[#B45309]" />
              <span>{t("【国库储备总值与五三二流向分配】", "[Treasury Reserves & 50/30/20 Flow]")}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* 总库 */}
              <div className="p-3 bg-gradient-to-br from-[#162925] to-[#0D1A17] text-[#FAF6EC] border border-[#C8AA72] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="text-[11px] text-[#A2C4BD] font-serif flex items-center justify-between">
                    <span>{t("🏛️ 国库总现储", "Total Treasury")}</span>
                    <span className="text-[10px] font-mono text-[#F2CE85]">100%</span>
                  </div>
                  <div className="mt-1 font-mono font-bold text-base sm:text-lg text-[#5FE3C8] tabular-nums">
                    {totalNear} NEAR
                  </div>
                </div>
                <div className="mt-1 text-[11px] font-mono text-[#D7CCC8]">
                  ≈ {totalStones} {t("灵石", "Stones")}
                </div>
              </div>

              {/* 50% 周天榜发榜池 */}
              <div className="p-3 bg-[#FEF3C7] border border-[#F59E0B]/60 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-[11px] text-[#92400E] font-serif flex items-center justify-between">
                    <span>{t("🏆 四大天榜周俸池", "Heaven Boards Pool")}</span>
                    <span className="text-[10px] font-mono font-bold px-1 bg-[#D97706] text-white">50%</span>
                  </div>
                  <div className="mt-1 font-mono font-bold text-base sm:text-lg text-[#B45309] tabular-nums">
                    {activePoolNear} NEAR
                  </div>
                </div>
                <div className="mt-1 text-[11px] font-mono text-[#78350F]">
                  ≈ {activePoolStones} {t("灵石 (周日发榜)", "Stones (Sun)")}
                </div>
              </div>

              {/* 30% 永固底池 */}
              <div className="p-3 bg-[#E8EFF5] border border-[#9BB6CC] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-[11px] text-[#2C4A63] font-serif flex items-center justify-between">
                    <span>{t("🛡️ 宗门底池滚存", "Reserve Fund")}</span>
                    <span className="text-[10px] font-mono font-bold px-1 bg-[#475569] text-white">30%</span>
                  </div>
                  <div className="mt-1 font-mono font-bold text-base sm:text-lg text-[#1E3A8A] tabular-nums">
                    {reserveNear} NEAR
                  </div>
                </div>
                <div className="mt-1 text-[11px] font-mono text-[#334155]">
                  ≈ {reserveStones} {t("灵石 (永续沉淀)", "Stones (Perpetual)")}
                </div>
              </div>

              {/* 20% 开发运营金库 */}
              <div className="p-3 bg-[#FAECF0] border border-[#E0B0BE] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-[11px] text-[#824153] font-serif flex items-center justify-between">
                    <span>{t("⚙️ 天机开发金库", "Dev Vault")}</span>
                    <span className="text-[10px] font-mono font-bold px-1 bg-[#9F1239] text-white">20%</span>
                  </div>
                  <div className="mt-1 font-mono font-bold text-base sm:text-lg text-[#9F1239] tabular-nums">
                    {devOpsNear} NEAR
                  </div>
                </div>
                <div className="mt-1 text-[11px] font-mono text-[#701A75]">
                  ≈ {devOpsStones} {t("灵石 (护佑宗门)", "Stones (DevOps)")}
                </div>
              </div>
            </div>
          </div>

          {/* 2. 收入账目来源逐笔拆解 (Fee Breakdown) */}
          <div className="bg-white border border-[#C8AA72]/65 p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C8AA72]/30 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#B45309] rounded-xs" />
                <span className="font-serif font-bold text-sm text-[#253D39]">
                  {t("国库真金收入来源明细拆解 (Fee Breakdown)", "Treasury Revenue Breakdown")}
                </span>
              </div>
              <div className="text-xs font-mono text-[#7A674B]">
                {t("1 NEAR = 50 灵石兑换并轨", "1 NEAR = 50 Spirit Stones")}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* 创世保底注资 */}
              <div
                className={`p-3 border flex flex-col justify-between ${
                  genesisStones > 0
                    ? "bg-[#FFFBEB] border-[#FDE68A]"
                    : "bg-[#F8FAFC] border-slate-200 opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-xs text-[#92400E] flex items-center gap-1">
                      <span>🌟 {t("创世天道注资 (冷启动保底池)", "Genesis Bootstrap Fund")}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-[#B45309]">
                      {genesisNear} NEAR
                    </span>
                  </div>
                  <p className="text-[11px] font-serif text-[#78350F] mt-1 leading-relaxed">
                    {genesisStones > 0
                      ? t(
                          "系统初始化注入的保底奖金，确保首周开服即有真金周俸分发，避免奖池为空无人参赛。",
                          "Initial bootstrap seed fund so week 1 has rewards even before players deposit."
                        )
                      : t("已完成注资剥离，当前为 100% 纯玩家实际资产。", "Bootstrap removed. 100% pure organic.")}
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-[#F59E0B]/30 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#92400E]">
                    {genesisStones} {t("灵石", "Stones")}
                  </span>
                  {genesisStones > 0 && onClearGenesisFund && (
                    <button
                      type="button"
                      onClick={onClearGenesisFund}
                      className="text-[10px] text-[#A82E2E] hover:underline flex items-center gap-0.5"
                      title="若想只统计纯真实玩家流水，点击可剔除创世保底注资"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t("移除创世保底 (回归纯玩家流水)", "Remove Seed Fund")}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 仙草仙种采购税 */}
              <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-xs text-[#166534] flex items-center gap-1">
                      <Sprout className="w-3.5 h-3.5 text-[#15803D]" />
                      <span>{t("洞府灵草仙种宗门采购税", "Herb Seed Purchase Fees")}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-[#15803D]">
                      {seedsNear} NEAR
                    </span>
                  </div>
                  <p className="text-[11px] font-serif text-[#14532D] mt-1 leading-relaxed">
                    {t(
                      "玩家在灵田购买一阶、二阶、三阶灵草仙种的消耗，100% 直汇国库流转。",
                      "100% of seed purchase costs are channeled into the Sect Treasury."
                    )}
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-[#86EFAC]/50 flex items-center justify-between text-[11px] font-mono text-[#166534]">
                  <span>{seedsStones} {t("灵石", "Stones")}</span>
                  <span className="text-[10px] text-[#22C55E]">● {t("玩家真实消耗", "Organic")}</span>
                </div>
              </div>

              {/* 天工剑庐铸剑地火费 */}
              <div className="p-3 bg-[#FAF5FF] border border-[#E9D5FF] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-xs text-[#6B21A8] flex items-center gap-1">
                      <Hammer className="w-3.5 h-3.5 text-[#7E22CE]" />
                      <span>{t("天工剑庐开炉地火锻造费", "Forging Hearth Fees")}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-[#7E22CE]">
                      {forgingNear} NEAR
                    </span>
                  </div>
                  <p className="text-[11px] font-serif text-[#581C87] mt-1 leading-relaxed">
                    {t(
                      "熔炼玄铁陨铁、铸造仙剑法宝时消耗的地火灵石税费，全额归宗门公帑。",
                      "Blacksmith hearth fire fees when forging artifacts are collected into Treasury."
                    )}
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-[#D8B4FE]/50 flex items-center justify-between text-[11px] font-mono text-[#6B21A8]">
                  <span>{forgingStones} {t("灵石", "Stones")}</span>
                  <span className="text-[10px] text-[#A855F7]">● {t("玩家真实消耗", "Organic")}</span>
                </div>
              </div>

              {/* 云海秘境破阵门票费 */}
              <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-xs text-[#1E40AF] flex items-center gap-1">
                      <Swords className="w-3.5 h-3.5 text-[#1D4ED8]" />
                      <span>{t("云海试炼破阵符印门票费", "Trial Realm Entry Fees")}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-[#1D4ED8]">
                      {realmNear} NEAR
                    </span>
                  </div>
                  <p className="text-[11px] font-serif text-[#1E3A8A] mt-1 leading-relaxed">
                    {t(
                      "道友每次启阵挑战云海秘境试炼层数所纳之破阵符费，涓滴汇聚成诛魔奖赏。",
                      "Trial tower entry fees pooled to incentivize slaying evil beasts."
                    )}
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-[#93C5FD]/50 flex items-center justify-between text-[11px] font-mono text-[#1E40AF]">
                  <span>{realmStones} {t("灵石", "Stones")}</span>
                  <span className="text-[10px] text-[#3B82F6]">● {t("玩家真实消耗", "Organic")}</span>
                </div>
              </div>
            </div>

            {/* 真实与保底资产小计对比栏 */}
            <div className="mt-2 p-2.5 bg-[#FAF6EC] border border-[#C8AA72]/40 flex flex-wrap items-center justify-between gap-2 text-xs font-serif">
              <div className="flex items-center gap-1.5 text-[#594119]">
                <Info className="w-4 h-4 text-[#8A6828] shrink-0" />
                <span>
                  {t("账目汇总校验：", "Ledger Balance Check: ")}
                  <strong className="text-[#14532D]">
                    {t(
                      `全服玩家行为贡献 ${organicPlayerNear} NEAR (${organicPlayerStones} 灵石)`,
                      `Player organic activity: ${organicPlayerNear} NEAR`
                    )}
                  </strong>
                  {genesisStones > 0 && (
                    <span>
                      {" + "}
                      <strong className="text-[#B45309]">
                        {t(
                          `创世保底启动池 ${genesisNear} NEAR (${genesisStones} 灵石)`,
                          `Genesis seed: ${genesisNear} NEAR`
                        )}
                      </strong>
                    </span>
                  )}
                  {" = "}
                  <strong className="text-[#162925]">
                    {totalNear} NEAR ({totalStones} 灵石)
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* 3. 本周四大周天榜实时配额与分润流向 */}
          <div className="bg-[#FAF7EE] border border-[#C8AA72]/65 p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs font-serif font-bold text-[#4A320E] border-b border-[#C8AA72]/30 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-[#B45309]" />
                <span>{t("四大天榜本周奖池分润流向 (由 50% 奖池细分)", "Four Leaderboards Allocation (from 50% Pool)")}</span>
              </span>
              <span className="font-mono text-[#8A6828]">
                {t("总奖池:", "Total Pool:")} {activePoolNear} NEAR
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-serif">
              <div className="p-2.5 bg-white border border-[#C8AA72]/50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[#253D39]">
                  <span className="font-bold">诛魔天榜</span>
                  <span className="font-mono text-[10px] text-[#059669] font-bold">30%</span>
                </div>
                <div className="mt-1 font-mono font-bold text-sm text-[#14532D]">
                  {Number((activePoolNear * 0.3).toFixed(2))} NEAR
                </div>
                <div className="text-[10px] font-mono text-[#688580]">
                  ≈ {Number((activePoolStones * 0.3).toFixed(1))} 石
                </div>
              </div>

              <div className="p-2.5 bg-white border border-[#C8AA72]/50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[#253D39]">
                  <span className="font-bold">问鼎论剑榜</span>
                  <span className="font-mono text-[10px] text-[#059669] font-bold">30%</span>
                </div>
                <div className="mt-1 font-mono font-bold text-sm text-[#14532D]">
                  {Number((activePoolNear * 0.3).toFixed(2))} NEAR
                </div>
                <div className="text-[10px] font-mono text-[#688580]">
                  ≈ {Number((activePoolStones * 0.3).toFixed(1))} 石
                </div>
              </div>

              <div className="p-2.5 bg-white border border-[#C8AA72]/50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[#253D39]">
                  <span className="font-bold">百草药圣榜</span>
                  <span className="font-mono text-[10px] text-[#059669] font-bold">20%</span>
                </div>
                <div className="mt-1 font-mono font-bold text-sm text-[#14532D]">
                  {Number((activePoolNear * 0.2).toFixed(2))} NEAR
                </div>
                <div className="text-[10px] font-mono text-[#688580]">
                  ≈ {Number((activePoolStones * 0.2).toFixed(1))} 石
                </div>
              </div>

              <div className="p-2.5 bg-white border border-[#C8AA72]/50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[#253D39]">
                  <span className="font-bold">神工天匠榜</span>
                  <span className="font-mono text-[10px] text-[#059669] font-bold">20%</span>
                </div>
                <div className="mt-1 font-mono font-bold text-sm text-[#14532D]">
                  {Number((activePoolNear * 0.2).toFixed(2))} NEAR
                </div>
                <div className="text-[10px] font-mono text-[#688580]">
                  ≈ {Number((activePoolStones * 0.2).toFixed(1))} 石
                </div>
              </div>
            </div>
          </div>

          {/* 4. 往期清算历史与承兑凭据 (Settlement History) */}
          {treasury.settlementHistory && treasury.settlementHistory.length > 0 && (
            <div className="bg-white border border-[#C8AA72]/65 p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-serif font-bold text-[#4A320E] border-b border-[#C8AA72]/30 pb-1.5">
                <span>{t("天道历期清算颁旨记录", "Settlement History")}</span>
                <span className="font-mono text-[11px] text-[#7A674B]">
                  共 {treasury.settlementHistory.length} 次
                </span>
              </div>

              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                {treasury.settlementHistory.map((s) => (
                  <div
                    key={s.settlementId}
                    className="p-2 bg-[#FAF6EC] border border-[#C8AA72]/40 text-xs font-serif flex flex-wrap items-center justify-between gap-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#92400E]">
                        第 {s.epochNumber} 期
                      </span>
                      <span className="text-[#64827D]">
                        {new Date(s.settledAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-[#14532D]">
                        分润: {(s.extractedRewardPoolStones / 50).toFixed(2)} NEAR ({s.extractedRewardPoolStones} 石)
                      </span>
                      <span className="text-[#8A6828]">
                        保留: {(s.treasuryReserveRemaining / 50).toFixed(2)} NEAR
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮栏 */}
        <div className="h-12 border-t border-[#C8AA72]/60 bg-[#F0E8D5] px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="text-xs font-serif text-[#7A5B22] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#2E6B5E]" />
            <span>{t("太虚仙门 · 链上金册实时对账通达", "On-Chain Ledger Real-time Audited")}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="xianxia-btn-gold text-xs font-serif font-bold px-4 py-1.5 shadow-xs"
          >
            {t("已悉账目 · 谨遵宗令", "Close Ledger")}
          </button>
        </div>
      </div>
    </div>
  );
}
