"use client";

import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Gift, Mail, Sparkles, X } from "lucide-react";
import { CelestialMailItem } from "@/lib/xianxia/types";

/**
 * 仙门云海 + 淡紫霞光 + 细碎星点荧光粒子缓缓漂浮背景画布
 */
export function StarlightCloudCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // 生成细碎星点荧光粒子 (淡鎏金、月白、淡青、淡紫霞光)
    const particles = Array.from({ length: 68 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.1 + 0.6,
      vx: (Math.random() - 0.5) * 0.18,
      vy: -(Math.random() * 0.28 + 0.08),
      alpha: Math.random() * 0.65 + 0.2,
      phase: Math.random() * Math.PI * 2,
      hue:
        Math.random() > 0.55
          ? "218, 192, 138" // 浅鎏金
          : Math.random() > 0.3
          ? "142, 204, 192" // 淡青玉
          : "212, 195, 238", // 淡紫霞
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.phase += 0.02;

        if (p.y < -10) p.y = height + 10;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const curAlpha = p.alpha * (0.65 + 0.35 * Math.sin(p.phase));

        // 柔和荧光光晕
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4.5);
        grad.addColorStop(0, `rgba(255, 255, 255, ${curAlpha})`);
        grad.addColorStop(0.4, `rgba(${p.hue}, ${curAlpha * 0.75})`);
        grad.addColorStop(1, `rgba(${p.hue}, 0)`);

        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(p.x, p.y, p.r * 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* 1. 柔和淡青、月白、淡紫霞光漫反射天幕底色 */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 18% 22%, rgba(226, 212, 244, 0.52) 0%, transparent 48%),
            radial-gradient(circle at 82% 18%, rgba(202, 232, 224, 0.65) 0%, transparent 52%),
            radial-gradient(circle at 50% 85%, rgba(244, 233, 212, 0.55) 0%, transparent 55%),
            linear-gradient(180deg, #EEF6F4 0%, #E5F0EE 46%, #EFEBF6 78%, #F5F2EB 100%)
          `,
        }}
      />

      {/* 2. 远景空灵仙山与云海层 (平面水墨淡青柔光，无厚重感) */}
      <svg
        viewBox="0 0 1440 520"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 w-full h-[54vh] opacity-65"
      >
        <defs>
          <linearGradient id="mistMountainFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B8D5CF" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#EEF5F3" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="mistMountainMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9EC4BC" stopOpacity="0.38" />
            <stop offset="70%" stopColor="#DCD4EA" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#F5F3EE" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="cloudSeaGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.0" />
            <stop offset="50%" stopColor="#F8FBFA" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#F4F1F8" stopOpacity="0.92" />
          </linearGradient>
        </defs>

        {/* 远岫仙峰 */}
        <path
          d="M0,320 Q140,180 290,270 T590,190 T920,250 T1220,160 T1440,260 L1440,520 L0,520 Z"
          fill="url(#mistMountainFar)"
        />
        {/* 中景云山 */}
        <path
          d="M0,370 Q210,240 420,330 T830,240 T1190,310 T1440,290 L1440,520 L0,520 Z"
          fill="url(#mistMountainMid)"
        />
        {/* 氤氲云海柔光漫反射 */}
        <rect x="0" y="260" width="1440" height="260" fill="url(#cloudSeaGlow)" />
        {/* 淡金色流云丝线装饰 */}
        <path
          d="M120,410 Q280,380 440,410 T760,395 T1120,415"
          fill="none"
          stroke="#D5BA86"
          strokeWidth="1"
          strokeOpacity="0.45"
        />
        <path
          d="M260,455 Q480,430 690,455 T1180,440"
          fill="none"
          stroke="#B4CFC9"
          strokeWidth="1.2"
          strokeOpacity="0.55"
        />
      </svg>

      {/* 3. 星点荧光粒子画布 */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

/**
 * 四角淡金色流云回纹 + 缠枝灵草纹样 SVG 角花
 */
export function CornerCloudHerbFiligree({
  position,
}: {
  position: "tl" | "tr" | "bl" | "br";
}) {
  const transformMap = {
    tl: "",
    tr: "scale(-1, 1)",
    bl: "scale(1, -1)",
    br: "scale(-1, -1)",
  };
  const posClassMap = {
    tl: "top-1 left-1",
    tr: "top-1 right-1",
    bl: "bottom-1 left-1",
    br: "bottom-1 right-1",
  };

  return (
    <svg
      viewBox="0 0 44 44"
      className={`w-7 h-7 absolute pointer-events-none opacity-80 ${posClassMap[position]}`}
      style={{ transform: transformMap[position] }}
    >
      {/* 外框流云回纹折线 */}
      <path
        d="M2,28 L2,8 Q2,2 8,2 L28,2"
        fill="none"
        stroke="#C8AA72"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      {/* 内层回纹与如意云头 */}
      <path
        d="M6,22 L6,10 Q6,6 10,6 L22,6"
        fill="none"
        stroke="#D8C093"
        strokeWidth="0.85"
      />
      <path
        d="M10,6 L10,11 L16,11 L16,8.5 L13,8.5"
        fill="none"
        stroke="#C8AA72"
        strokeWidth="0.85"
      />
      {/* 缠枝灵草卷叶纹 */}
      <path
        d="M6,17 Q14,15 16,21 Q12,23 8,19"
        fill="none"
        stroke="#8BB6AE"
        strokeWidth="0.9"
      />
      <path
        d="M17,6 Q15,14 21,16 Q23,12 19,8"
        fill="none"
        stroke="#8BB6AE"
        strokeWidth="0.9"
      />
      <circle cx="8" cy="8" r="1.3" fill="#C8AA72" />
    </svg>
  );
}

/**
 * 顶部细巧白玉鎏金玉扣 (Jade Clasp)
 */
export function TopJadeClasp() {
  return (
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none z-20 flex items-center justify-center">
      <svg viewBox="0 0 96 22" className="w-24 h-5">
        {/* 左右鎏金云翼 */}
        <path
          d="M8,11 Q22,4 36,11 Q22,18 8,11 Z"
          fill="#F6FBF9"
          stroke="#C8AA72"
          strokeWidth="1"
        />
        <path
          d="M88,11 Q74,4 60,11 Q74,18 88,11 Z"
          fill="#F6FBF9"
          stroke="#C8AA72"
          strokeWidth="1"
        />
        {/* 中央白玉锁扣 */}
        <polygon
          points="48,2 60,11 48,20 36,11"
          fill="#E6F3F0"
          stroke="#C5A46A"
          strokeWidth="1.2"
        />
        <circle cx="48" cy="11" r="3" fill="#88B8AF" />
        <circle cx="48" cy="11" r="1.2" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

/**
 * 侧边细巧玉扣 + 流苏坠饰 (Jade Bead & Silk Tassel Pendant)
 */
export function JadeTasselPendant({ side = "left" }: { side?: "left" | "right" }) {
  return (
    <div
      className={`absolute top-5 ${
        side === "left" ? "-left-3" : "-right-3"
      } pointer-events-none hidden sm:flex flex-col items-center z-20 animate-sway`}
    >
      <svg viewBox="0 0 24 110" className="w-4 h-22">
        {/* 鎏金挂环 */}
        <circle
          cx="12"
          cy="6"
          r="3.5"
          fill="none"
          stroke="#C5A46A"
          strokeWidth="1.2"
        />
        {/* 细丝线 */}
        <line x1="12" y1="9.5" x2="12" y2="20" stroke="#C5A46A" strokeWidth="1" />
        {/* 冰种青玉珠 */}
        <circle
          cx="12"
          cy="25"
          r="5"
          fill="#A9D4CC"
          stroke="#E8F6F3"
          strokeWidth="1.2"
        />
        <circle cx="10.5" cy="23.5" r="1.3" fill="#FFFFFF" />
        {/* 中国结盘长纹小扣 */}
        <polygon
          points="12,32 17,37 12,42 7,37"
          fill="none"
          stroke="#C5A46A"
          strokeWidth="1.1"
        />
        {/* 鎏金束口 */}
        <rect
          x="9"
          y="43"
          width="6"
          height="3.5"
          rx="1"
          fill="#D4B781"
        />
        {/* 柔顺垂坠淡青与浅金流苏丝穗 */}
        <path
          d="M10,46.5 Q8,75 7,104"
          stroke="#88B8AF"
          strokeWidth="0.9"
          fill="none"
          opacity="0.85"
        />
        <path
          d="M11.5,46.5 Q11,76 10.5,106"
          stroke="#C8AA72"
          strokeWidth="0.85"
          fill="none"
          opacity="0.8"
        />
        <path
          d="M12.5,46.5 Q13,76 13.5,106"
          stroke="#88B8AF"
          strokeWidth="0.9"
          fill="none"
          opacity="0.85"
        />
        <path
          d="M14,46.5 Q16,75 17,104"
          stroke="#D5BA86"
          strokeWidth="0.85"
          fill="none"
          opacity="0.75"
        />
      </svg>
    </div>
  );
}

/**
 * 中式云纹分割线 (Delicate Symmetrical Cloud-Scroll Divider)
 */
export function CloudDivider({ className = "my-3" }: { className?: string }) {
  return (
    <div className={`w-full flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 360 16" className="w-full max-w-md h-3.5 opacity-80">
        <line
          x1="8"
          y1="8"
          x2="142"
          y2="8"
          stroke="#CDB280"
          strokeWidth="0.8"
          strokeOpacity="0.65"
        />
        {/* 左流云卷纹 */}
        <path
          d="M142,8 Q150,3 156,8 Q160,12 165,8"
          fill="none"
          stroke="#C4A56E"
          strokeWidth="1"
        />
        {/* 中央青玉菱花 */}
        <polygon
          points="180,2 187,8 180,14 173,8"
          fill="#BCE0D9"
          stroke="#C4A56E"
          strokeWidth="1"
        />
        <circle cx="180" cy="8" r="1.8" fill="#FFFFFF" />
        {/* 右流云卷纹 */}
        <path
          d="M195,8 Q200,12 204,8 Q210,3 218,8"
          fill="none"
          stroke="#C4A56E"
          strokeWidth="1"
        />
        <line
          x1="218"
          y1="8"
          x2="352"
          y2="8"
          stroke="#CDB280"
          strokeWidth="0.8"
          strokeOpacity="0.65"
        />
      </svg>
    </div>
  );
}

/**
 * 朱砂印章组件 (Cinnabar Seal Stamp)
 * 用于境界、封印、印可、圣号
 */
export function CinnabarSeal({
  text,
  variant = "square",
  className = "",
}: {
  text: string;
  variant?: "square" | "rect" | "circle";
  className?: string;
}) {
  const shapeClass =
    variant === "square"
      ? "w-6 h-6 text-[11px]"
      : variant === "circle"
      ? "w-6 h-6 rounded-full text-[11px]"
      : "px-1.5 py-0.5 text-[10px]";

  return (
    <span
      className={`seal-stamp select-none font-serif shrink-0 ${shapeClass} ${className}`}
      style={{
        border: "1.5px solid #A82E2E",
        color: "#A82E2E",
        backgroundColor: "rgba(255, 238, 238, 0.72)",
        boxShadow: "inset 0 0 3px rgba(168, 46, 46, 0.28)",
      }}
    >
      {text}
    </span>
  );
}

/**
 * 横向水墨宣纸展开画轴组件 (Scroll Banner)
 * 用于师尊传音与天机初引，左右带深色实木卷轴轴头，彻底消灭圆角盒子感
 */
export function ScrollBanner({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative w-full xianxia-scroll-paper py-3 px-6 sm:px-9 ${className}`}>
      {/* 左侧实木卷轴轴头 (Left Wooden Scroll Knob) */}
      <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-gradient-to-r from-[#2B1F13] via-[#4D3A24] to-[#2B1F13] border-r border-[#A8884C] flex flex-col justify-between items-center py-1 shadow-md">
        <div className="w-2.5 h-1.5 rounded-sm bg-[#C5A46A]" />
        <div className="w-1.5 h-6 bg-[#C5A46A]/60 rounded-full" />
        <div className="w-2.5 h-1.5 rounded-sm bg-[#C5A46A]" />
      </div>

      {/* 右侧实木卷轴轴头 (Right Wooden Scroll Knob) */}
      <div className="absolute right-0 top-0 bottom-0 w-3.5 bg-gradient-to-l from-[#2B1F13] via-[#4D3A24] to-[#2B1F13] border-l border-[#A8884C] flex flex-col justify-between items-center py-1 shadow-md">
        <div className="w-2.5 h-1.5 rounded-sm bg-[#C5A46A]" />
        <div className="w-1.5 h-6 bg-[#C5A46A]/60 rounded-full" />
        <div className="w-2.5 h-1.5 rounded-sm bg-[#C5A46A]" />
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}

/**
 * 碑刻白玉匣面板容器 (去除现代 rounded-[26px]，采用微切角或 2px 极窄圆角 + 双金线)
 */
export function JadeGlassPanel({
  children,
  className = "",
  withTassels = false,
  withTopClasp = false,
  chamfer = false,
}: {
  children: React.ReactNode;
  className?: string;
  withTassels?: boolean;
  withTopClasp?: boolean;
  chamfer?: boolean;
}) {
  const baseBoxClass = chamfer
    ? "xianxia-chamfer bg-white/90 border border-[#C8AA72]/65 backdrop-blur-md shadow-lg"
    : "xianxia-hud-panel";

  return (
    <div className={`relative ${baseBoxClass} ${className}`}>
      {withTopClasp && <TopJadeClasp />}
      {withTassels && (
        <>
          <JadeTasselPendant side="left" />
          <JadeTasselPendant side="right" />
        </>
      )}
      <CornerCloudHerbFiligree position="tl" />
      <CornerCloudHerbFiligree position="tr" />
      <CornerCloudHerbFiligree position="bl" />
      <CornerCloudHerbFiligree position="br" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

/**
 * 紧凑单行天机推演状态栏 (Status Ticker Bar)
 * 放在页面最底部，默认收起，展开时带有遮罩浮层，绝不遮挡主页交互
 */
export function StatusTickerBar({
  txCount,
  blockHeight,
  isExpanded,
  onToggleExpand,
  children,
}: {
  txCount: number;
  blockHeight: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  children?: React.ReactNode;
}) {
  return (
    <>
      {/* 展开时的半透明轻量暗色遮罩 */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-35 transition-opacity"
          onClick={onToggleExpand}
        />
      )}

      <footer className="w-full fixed bottom-0 left-0 right-0 z-40 xianxia-dark-bar text-[#D1E6E1] text-xs shadow-lg">
        <div className="max-w-6xl mx-auto px-4 h-9 flex items-center justify-between">
          {/* 左侧呼吸指示灯 + 结契状态 */}
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#52D1B2] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3BB89A]"></span>
            </span>
            <span className="text-[#A2C4BD] font-serif tracking-wider">
              天机链镜 · NEAR 无感签名已结契
            </span>
            <span className="text-[11px] text-[#CDB280] font-mono opacity-85 hidden sm:inline">
              (Session Key 0.25N NEP-413 · 已签发 {txCount} 笔)
            </span>
          </div>

          {/* 右侧：高度与折叠展开按钮 */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[#8EAFA8] tabular-nums hidden sm:inline">
              Block #{blockHeight}
            </span>
            <button
              type="button"
              onClick={onToggleExpand}
              className="text-[11px] text-[#E0C99B] hover:text-[#FFFFFF] transition-colors flex items-center gap-1 font-serif tracking-widest px-2 py-0.5 border border-[#C8AA72]/40 bg-[#162724]"
            >
              <span>{isExpanded ? "收起天机符牒 ▾" : "展开天机符牒 ▴"}</span>
            </button>
          </div>
        </div>

        {/* 展开浮层内容 (向上滑出的暗玉抽屉) */}
        {isExpanded && (
          <div className="border-t border-[#C8AA72]/40 bg-[#11201D]/98 backdrop-blur-xl p-4 sm:p-5 max-h-[65vh] overflow-y-auto relative z-50">
            {children}
          </div>
        )}
      </footer>
    </>
  );
}

/**
 * 仙门引导光标指引手势 (GuideHandPointer)
 * 带金色微芒光晕与下指手势，精准聚焦当前任务目标
 */
export function GuideHandPointer({
  text,
  direction = "down",
  className = "",
}: {
  text: string;
  direction?: "down" | "up" | "left" | "right";
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none select-none z-30 flex flex-col items-center animate-bounce ${className}`}
    >
      <div className="bg-[#FAF4E6] border border-[#B89452] px-2.5 py-0.5 text-[11px] font-serif font-bold text-[#593F14] shadow-md whitespace-nowrap flex items-center gap-1.5 ring-1 ring-[#C8AA72]/50">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4B57C] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B89452]"></span>
        </span>
        <span>{text}</span>
      </div>
      {direction === "down" && (
        <div className="flex flex-col items-center -mt-0.5">
          <div className="w-0 h-0 border-x-4 border-x-transparent border-t-5 border-t-[#B89452]" />
          <span className="text-sm -mt-1 text-[#8A6828] filter drop-shadow">👇</span>
        </div>
      )}
      {direction === "up" && (
        <div className="flex flex-col items-center -mb-0.5 order-first">
          <span className="text-sm -mb-1 text-[#8A6828] filter drop-shadow">👆</span>
          <div className="w-0 h-0 border-x-4 border-x-transparent border-b-5 border-b-[#B89452]" />
        </div>
      )}
    </div>
  );
}

/**
 * 仙道局部不突兀的八卦聚灵 Loading 组件 (XianxiaLoadingRing)
 * 用于按钮或灵田点击区域，轻盈通透，契合仙侠质感
 */
export function XianxiaLoadingRing({
  text = "天机推演中...",
  size = "sm",
  tone = "gold",
}: {
  text?: string;
  size?: "sm" | "md";
  tone?: "gold" | "jade" | "light";
}) {
  const iconSize = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";
  const textColor =
    tone === "light"
      ? "text-[#F5F8F7]"
      : tone === "jade"
      ? "text-[#1F4941]"
      : "text-[#593F14]";
  const strokeColor1 = tone === "light" ? "#F5DEB3" : "#C8AA72";
  const strokeColor2 = tone === "light" ? "#A3E3D8" : "#73ADA1";

  return (
    <div className="flex items-center justify-center gap-2 select-none">
      <svg
        viewBox="0 0 40 40"
        className={`${iconSize} animate-spin`}
        style={{ color: strokeColor1 }}
      >
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke={strokeColor1}
          strokeWidth="2.5"
          strokeDasharray="24 10"
          strokeOpacity="0.9"
        />
        <circle
          cx="20"
          cy="20"
          r="9"
          fill="none"
          stroke={strokeColor2}
          strokeWidth="1.8"
          strokeDasharray="14 6"
        />
        <circle cx="20" cy="20" r="2.5" fill={strokeColor1} />
      </svg>
      {text && (
        <span className={`${textSize} font-serif tracking-wider ${textColor} font-semibold`}>
          {text}
        </span>
      )}
    </div>
  );
}

/**
 * 五步问道仙途任务引路条 (TutorialStepMilestoneBar)
 * 一目了然的阶段目标展示：① 播种灵草 -> ② 浇灌灵泉 -> ③ 采摘炼丹 -> ④ 剑庐铸剑 -> ⑤ 秘境试炼 -> ⑥ 问鼎天榜
 */
export function TutorialStepMilestoneBar({
  currentStage,
  onStepClick,
}: {
  currentStage: number;
  onStepClick?: (targetBuilding: "GARDEN" | "FORGE" | "REALM" | "ARENA" | "TREASURY") => void;
}) {
  const steps = [
    {
      id: 1,
      nameZh: "壹·播种",
      nameEn: "Plant",
      building: "GARDEN" as const,
      desc: "开垦壹号灵田，播下灵种",
    },
    {
      id: 2,
      nameZh: "贰·灵泉",
      nameEn: "Water",
      building: "GARDEN" as const,
      desc: "引灵泉润泽灵芽成熟",
    },
    {
      id: 3,
      nameZh: "叁·炼丹",
      nameEn: "Refine",
      building: "GARDEN" as const,
      desc: "采摘灵草入炉炼气血丹 (+HP)",
    },
    {
      id: 4,
      nameZh: "肆·铸剑",
      nameEn: "Forge",
      building: "FORGE" as const,
      desc: "熔炼玄铁锻造本命飞剑 (+ATK)",
    },
    {
      id: 5,
      nameZh: "伍·伏魔",
      nameEn: "Battle",
      building: "REALM" as const,
      desc: "登临试炼塔斩妖掉落仙矿",
    },
    {
      id: 6,
      nameZh: "大成·天榜",
      nameEn: "Heaven",
      building: "TREASURY" as const,
      desc: "问鼎三大周天榜瓜分五成国库",
    },
  ];

  return (
    <div className="w-full max-w-5xl my-2 select-none">
      <div className="bg-[#F8F5EC]/90 border border-[#C8AA72]/60 px-3 py-1.5 flex items-center justify-between gap-1 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#6E4F18] shrink-0 mr-1">
          <span className="w-1.5 h-1.5 bg-[#C8AA72] rotate-45" />
          <span>仙途五步初引</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end min-w-0">
          {steps.map((st, idx) => {
            const isDone = currentStage > st.id;
            const isCurrent = currentStage === st.id;

            return (
              <React.Fragment key={st.id}>
                <button
                  type="button"
                  onClick={() => onStepClick && onStepClick(st.building)}
                  className={`px-2 py-0.5 text-[11px] font-serif transition flex items-center gap-1 shrink-0 ${
                    isCurrent
                      ? "bg-[#FAF4E6] border border-[#B89452] text-[#4A320E] font-bold ring-1 ring-[#C8AA72]/60 shadow-xs scale-102"
                      : isDone
                      ? "bg-[#E6F2EE]/80 border border-[#9CC5BD]/70 text-[#245248]"
                      : "opacity-55 text-[#738B86] border border-transparent"
                  }`}
                  title={st.desc}
                >
                  {isDone ? (
                    <span className="text-[#2E6B5E] font-bold text-[10px]">✓</span>
                  ) : (
                    <span className="font-mono text-[10px]">{st.id}</span>
                  )}
                  <span>{st.nameZh}</span>
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B89452] animate-ping" />
                  )}
                </button>
                {idx < steps.length - 1 && (
                  <span className="text-[#C8AA72]/50 text-[10px] select-none shrink-0">
                    →
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 东八区每周日 24:00 (UTC+8) 天榜结算倒计时徽标 (WeeklyCountdownBadge)
 */
export function WeeklyCountdownBadge({
  targetIsoUtc,
  label = "东八区周日 24:00 (UTC+8) 结算法旨倒计时",
}: {
  targetIsoUtc?: string;
  label?: string;
}) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!targetIsoUtc) return;
    const update = () => {
      const now = Date.now();
      const target = new Date(targetIsoUtc).getTime();
      const diff = Math.max(0, target - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetIsoUtc]);

  return (
    <div className="inline-flex items-center gap-2 bg-[#FAF5E6] border border-[#C8AA72] px-3 py-1 text-xs font-serif shadow-xs">
      <Clock className="w-3.5 h-3.5 text-[#8A6828]" />
      <span className="text-[#593F14] font-semibold">{label}:</span>
      <span className="font-mono font-bold text-[#8A6828] tabular-nums">
        {timeLeft.days}天 {String(timeLeft.hours).padStart(2, "0")}时{" "}
        {String(timeLeft.minutes).padStart(2, "0")}分{" "}
        {String(timeLeft.seconds).padStart(2, "0")}秒
      </span>
    </div>
  );
}

/**
 * 天阙传谕 · 飞剑传书信箱弹窗 (CelestialMailModal)
 * 宣纸法旨排版，支持查阅宗门谕牒与一键领受天赏物资
 */
export function CelestialMailModal({
  isOpen,
  onClose,
  mails,
  activeMailId,
  onSelectMail,
  onClaimMail,
  onClaimAll,
  isClaiming,
}: {
  isOpen: boolean;
  onClose: () => void;
  mails: CelestialMailItem[];
  activeMailId?: string;
  onSelectMail: (mailId: string) => void;
  onClaimMail: (mailId: string) => void;
  onClaimAll: () => void;
  isClaiming?: boolean;
}) {
  if (!isOpen) return null;
  const currentMail = mails.find((m) => m.id === activeMailId) || mails[0];
  const unclaimedCount = mails.filter((m) => !m.isClaimed && m.attachments).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 select-none animate-fadeIn">
      {/* 遮罩背景 */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* 宣纸法旨主窗口 */}
      <div className="relative z-10 w-full max-w-4xl bg-[#FAF6EC] border-2 border-[#C8AA72] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* 顶部玉扣与标题栏 */}
        <div className="h-12 border-b border-[#C8AA72]/60 bg-[#F0E8D5] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CinnabarSeal text="谕" variant="circle" />
            <span className="font-serif font-bold text-sm sm:text-base text-[#4A320E] tracking-widest">
              天阙传谕 · 飞剑传书法旨
            </span>
            <span className="text-xs text-[#7A5B22] font-serif border border-[#B89452]/40 px-2 py-0.5 bg-[#FAF4E6] hidden sm:inline">
              共 {mails.length} 封 · {unclaimedCount} 份待领赏
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {unclaimedCount > 1 && (
              <button
                type="button"
                disabled={isClaiming}
                onClick={onClaimAll}
                className="xianxia-btn-gold text-xs font-serif font-bold px-2.5 sm:px-3 py-1 flex items-center gap-1 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>全部一键领赏</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-[#6D5325] hover:text-[#251A08] transition p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 主体两栏布局：左侧信笺卷轴列表，右侧法旨阅读与领赏台 */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
          {/* 左侧邮件列表 (4 cols) */}
          <div className="md:col-span-4 border-r border-[#C8AA72]/40 bg-[#F4EEDC]/60 overflow-y-auto p-2 space-y-1.5 max-h-[35vh] md:max-h-[70vh]">
            {mails.length === 0 ? (
              <div className="text-center py-12 text-xs font-serif text-[#826E50]">
                暂无天阙法旨传书
              </div>
            ) : (
              mails.map((m) => {
                const isSelected = currentMail?.id === m.id;
                const hasUnclaimed = !m.isClaimed && m.attachments;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectMail(m.id)}
                    className={`w-full text-left p-2.5 transition border relative flex flex-col justify-between min-h-[68px] ${
                      isSelected
                        ? "bg-[#FAF7EE] border-[#B89452] shadow-xs ring-1 ring-[#C8AA72]/60"
                        : "bg-white/65 border-[#C8AA72]/30 hover:bg-white/95"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 w-full">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!m.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#A82E2E] shrink-0 animate-pulse" />
                        )}
                        <span className="font-serif font-bold text-xs text-[#3A2912] truncate">
                          {m.title}
                        </span>
                      </div>
                      {hasUnclaimed && (
                        <span className="shrink-0 text-[10px] font-serif text-[#8A6828] bg-[#FAF1D8] border border-[#B89452]/50 px-1">
                          待领赏
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#7A674B] font-serif mt-1 pt-1 border-t border-[#C8AA72]/20 w-full">
                      <span className="truncate">{m.sender}</span>
                      <span className="font-mono tabular-nums opacity-75">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* 右侧法旨详情展示与领赏台 (8 cols) */}
          <div className="md:col-span-8 flex flex-col justify-between overflow-y-auto p-4 sm:p-6 bg-[#FAF6EC] max-h-[50vh] md:max-h-[70vh]">
            {currentMail ? (
              <div className="space-y-4">
                {/* 法旨头信息 */}
                <div className="border-b border-[#C8AA72]/40 pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-2 py-0.5 bg-[#F2E8D2] border border-[#B89452]/50 font-serif text-[11px] font-bold text-[#5A3F14]">
                      {currentMail.category === "SETTLEMENT"
                        ? "三大天榜 · 周俸结算法旨"
                        : currentMail.category === "REWARD"
                        ? "太虚仙门 · 宗门赐福"
                        : "天机系统 · 传谕"}
                    </span>
                    <span className="font-mono text-xs text-[#806B49] tabular-nums">
                      {new Date(currentMail.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-[#2A1D0D] mt-2 tracking-wide">
                    {currentMail.title}
                  </h3>
                  <div className="text-xs font-serif text-[#705833] mt-1 flex items-center gap-2">
                    <span>发件尊上：{currentMail.sender}</span>
                    {currentMail.epochNumber && (
                      <span className="font-mono">
                        (第 {currentMail.epochNumber} 周天期)
                      </span>
                    )}
                  </div>
                </div>

                {/* 法旨正文 */}
                <div className="text-xs sm:text-sm font-serif text-[#3D2C17] leading-relaxed whitespace-pre-line py-2 border-b border-[#C8AA72]/30 min-h-[90px]">
                  {currentMail.content}
                </div>

                {/* 附件物资与领赏操作 */}
                {currentMail.attachments ? (
                  <div className="bg-[#F4EDE0] border border-[#C8AA72]/60 p-3.5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-serif font-bold text-[#593F14]">
                      <div className="flex items-center gap-1.5">
                        <Gift className="w-4 h-4 text-[#8A6828]" />
                        <span>法旨附赠仙资宝物：</span>
                      </div>
                      {currentMail.isClaimed ? (
                        <div className="flex items-center gap-1 text-[#256858] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>已奉旨领受入包</span>
                        </div>
                      ) : (
                        <span className="text-[#A82E2E] animate-pulse">
                          ● 尚未领受
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {currentMail.attachments.spiritStones && (
                        <div className="px-3 py-1 bg-white border border-[#C8AA72] flex items-center gap-1.5 shadow-xs">
                          <span className="text-xs font-serif text-[#4A3414]">
                            灵石:
                          </span>
                          <span className="font-mono font-bold text-sm text-[#8A6828] tabular-nums">
                            +{currentMail.attachments.spiritStones}
                          </span>
                        </div>
                      )}
                      {currentMail.attachments.ironOres && (
                        <div className="px-3 py-1 bg-white border border-[#C8AA72] flex items-center gap-1.5 shadow-xs">
                          <span className="text-xs font-serif text-[#4A3414]">
                            百炼玄铁:
                          </span>
                          <span className="font-mono font-bold text-sm text-[#2E6B5E] tabular-nums">
                            +{currentMail.attachments.ironOres}
                          </span>
                        </div>
                      )}
                      {currentMail.attachments.meteorOres && (
                        <div className="px-3 py-1 bg-white border border-[#C8AA72] flex items-center gap-1.5 shadow-xs">
                          <span className="text-xs font-serif text-[#4A3414]">
                            天外陨铁:
                          </span>
                          <span className="font-mono font-bold text-sm text-[#6E4F9E] tabular-nums">
                            +{currentMail.attachments.meteorOres}
                          </span>
                        </div>
                      )}
                      {currentMail.attachments.seeds && (
                        <div className="px-3 py-1 bg-white border border-[#C8AA72] flex items-center gap-1.5 shadow-xs">
                          <span className="text-xs font-serif text-[#4A3414]">
                            {currentMail.attachments.seeds.tier}阶灵草仙种:
                          </span>
                          <span className="font-mono font-bold text-sm text-[#2A7565] tabular-nums">
                            +{currentMail.attachments.seeds.count}
                          </span>
                        </div>
                      )}
                      {currentMail.attachments.crossChainIntentQuote && (
                        <div className="w-full px-2.5 py-1 bg-[#101E1B] text-[#E0F0EB] text-[11px] font-mono border border-[#C8AA72]/40 flex items-center justify-between">
                          <span>NEAR Intents 承兑:</span>
                          <span className="text-[#5FE3C8] truncate">
                            {currentMail.attachments.crossChainIntentQuote.amountOutFormatted} ({currentMail.attachments.crossChainIntentQuote.destinationChain.toUpperCase()}) · NEP-413 已结契
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-1 flex justify-end">
                      {currentMail.isClaimed ? (
                        <div className="px-4 py-1.5 text-xs font-serif text-[#6F5D41] bg-[#EDE4D0] border border-[#C8AA72]/40">
                          已于 {currentMail.createdAt.slice(0, 10)} 领赏交割
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isClaiming}
                          onClick={() => onClaimMail(currentMail.id)}
                          className="xianxia-btn-gold px-5 py-2 font-serif font-bold text-xs flex items-center gap-2 shadow-md"
                        >
                          {isClaiming ? (
                            <XianxiaLoadingRing text="领赏上链结契中..." size="sm" tone="light" />
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-[#7A5B22]" />
                              <span>奉旨一键领赏</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-right text-xs font-serif text-[#786345] pt-2">
                    此谕牒为法旨通告，无额外仙资附件
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
