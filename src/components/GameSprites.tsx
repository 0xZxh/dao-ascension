"use client";

import React from "react";

export type AvatarClass =
  | "saintess"
  | "sword"
  | "venerable"
  | "fox"
  | "demon"
  | "alchemy"
  | "body";

export interface CharacterPortraitConfig {
  id: "saintess" | "sword" | "venerable" | "fox" | "demon";
  zhName: string;
  enName: string;
  zhTitle: string;
  enTitle: string;
  zhTrait: string;
  enTrait: string;
  zhPromptLore: string;
  enPromptLore: string;
  imageSrc: string;
  baseHp: number;
  baseAtk: number;
  critPct: number;
  def: number;
  accentColor: string;
  particleColor: string;
  badgeClass: string;
}

export const XIANXIA_CHARACTER_ROSTER: CharacterPortraitConfig[] = [
  {
    id: "saintess",
    zhName: "瑶池清冷圣女",
    enName: "Celadon Immortal Saintess",
    zhTitle: "云海琼楼 · 清冷绝尘",
    enTitle: "Cloud Palace · Ethereal Saintess",
    zhTrait: "气血+50 · 赠回春丹×4",
    enTrait: "+50 Max HP · 4 Healing Pills",
    zhPromptLore:
      "清冷绝尘，鹅蛋脸，浅杏眼，眉眼温柔又疏离，乌黑长发挽成古典仙髻，点缀珍珠玉簪、银质步摇，淡青色叠层广袖仙裙暗绣仙鹤云纹，脚踝细玉链，指尖萦绕淡青灵雾，背景云海琼楼。",
    enPromptLore:
      "Aloof and ethereal oval face with gentle almond eyes, classical updo with pearl jade hairpin & silver buyao, layered pale-celadon wide-sleeve dress embroidered with cranes and clouds.",
    imageSrc: "/characters/saintess.jpg",
    baseHp: 210,
    baseAtk: 38,
    critPct: 14,
    def: 16,
    accentColor: "#78B5AA",
    particleColor: "#B8EFE4",
    badgeClass: "bg-[#E6F4F0]/90 border-[#9CC5BD] text-[#2E5C53]",
  },
  {
    id: "sword",
    zhName: "太虚少年剑修",
    enName: "Young Sword Cultivator",
    zhTitle: "剑眉星目 · 飒爽御剑",
    enTitle: "Starry Gaze · Swift Sword",
    zhPromptLore:
      "英气俊朗，剑眉星目，眼神锐利，红发绳束高马尾，墨黑劲款仙袍配藏青镶银边，窄袖外搭半透黑纱披风，腰间古篆灵纹佩剑，衣摆剑气流光，身侧飘细碎银白色剑粒子。",
    enPromptLore:
      "Heroic young swordsman with sharp eyes, high ponytail tied with a red cord, ink-black & navy silver-trimmed martial robe, translucent black gauze cloak, and silver sword-qi particles.",
    zhTrait: "本命攻击+12 · 剑心暴击18%",
    enTrait: "+12 Base ATK · 18% Sword Crit",
    imageSrc: "/characters/swordsman.jpg",
    baseHp: 170,
    baseAtk: 48,
    critPct: 18,
    def: 14,
    accentColor: "#6B8FA8",
    particleColor: "#E2F1FF",
    badgeClass: "bg-[#E8EFF5]/90 border-[#9BB6CC] text-[#2C4A63]",
  },
  {
    id: "venerable",
    zhName: "太古玄机仙尊",
    enName: "Ancient Immortal Venerable",
    zhTitle: "鹤发玄袍 · 执拂尘问道",
    enTitle: "White-Haired Grandmaster",
    zhTrait: "气血+80 · 护体玄罡+22",
    enTrait: "+80 Max HP · +22 Arcane DEF",
    zhPromptLore:
      "中年清雅面容，眉目平和深邃，长发雪白以玄玉发箍束起，玄色宽大道袍织暗金色古篆符文與厚重云锦面料，袖口垂长流苏，手持古朴拂尘，周身缓缓流转金色灵光。",
    enPromptLore:
      "Serene and majestic Immortal Venerable with snow-white hair bound in a black-jade crown, dark brocade Daoist robe inscribed with antique gold runes, holding an ancient horsetail whisk.",
    imageSrc: "/characters/venerable.jpg",
    baseHp: 240,
    baseAtk: 40,
    critPct: 15,
    def: 22,
    accentColor: "#C8A86B",
    particleColor: "#FFE9B5",
    badgeClass: "bg-[#F6EFE2]/90 border-[#C8AA72] text-[#735626]",
  },
  {
    id: "fox",
    zhName: "青丘狐妖少女",
    enName: "Fox Spirit Maiden",
    zhTitle: "桃花媚眼 · 蓬松白尾",
    enTitle: "Peach-Blossom Eyes · White Tail",
    zhTrait: "气血+40 · 攻击+8 · 银铃赤足",
    enTrait: "+40 HP · +8 ATK · Spirit Fox",
    zhPromptLore:
      "灵动狡黠，浅狐耳，蓬松白色狐尾，桃花眼配淡粉眼尾，松散垂落长发，粉色薄纱短款仙裙绣桃花与蝶纹，银铃配饰，赤脚踏雾，周身花瓣飘飞，林间薄雾暖柔光，甜而不艳。",
    enPromptLore:
      "Playful Fox Spirit Maiden with pale fox ears, fluffy white tails, peach-blossom eyes with pink corners, blush-pink gauze short immortal dress embroidered with butterflies & silver ankle bells.",
    imageSrc: "/characters/fox_maiden.jpg",
    baseHp: 200,
    baseAtk: 44,
    critPct: 17,
    def: 15,
    accentColor: "#E08EA3",
    particleColor: "#FFD1DC",
    badgeClass: "bg-[#FAECF0]/90 border-[#E0B0BE] text-[#824153]",
  },
  {
    id: "demon",
    zhName: "九幽血瞳魔尊",
    enName: "Crimson-Eyed Demon Sovereign",
    zhTitle: "狭长红瞳 · 墨紫暗金",
    enTitle: "Phoenix Red Eyes · Netherfire",
    zhTrait: "狂暴攻击+18 · 魔瞳暴击22%",
    enTrait: "+18 ATK · 22% Nether Crit",
    zhPromptLore:
      "俊美邪魅，狭长凤眼红瞳，黑发微乱，墨紫暗金长袍刻暗纹魔纹，血色流光纱配黑色玉饰，衣袂狂扬，周身暗紫色幽火粒子，黑云缭绕，冷暗氛围感国风原画。",
    enPromptLore:
      "Handsome and enigmatic Demon Sovereign with narrow crimson phoenix eyes, wind-tousled black hair, ink-purple & dark-gold rune robes, blood-silk mantle, and dark-violet netherfire particles.",
    imageSrc: "/characters/demon_lord.jpg",
    baseHp: 185,
    baseAtk: 54,
    critPct: 22,
    def: 16,
    accentColor: "#8E52B8",
    particleColor: "#D9A6FF",
    badgeClass: "bg-[#F0EAF7]/90 border-[#B9A4D6] text-[#53387E]",
  },
];

export function resolveCharacterConfig(
  avatarClass?: AvatarClass | string
): CharacterPortraitConfig {
  if (avatarClass === "saintess" || avatarClass === "alchemy") {
    return XIANXIA_CHARACTER_ROSTER[0];
  }
  if (avatarClass === "sword") {
    return XIANXIA_CHARACTER_ROSTER[1];
  }
  if (avatarClass === "venerable" || avatarClass === "body") {
    return XIANXIA_CHARACTER_ROSTER[2];
  }
  if (avatarClass === "fox") {
    return XIANXIA_CHARACTER_ROSTER[3];
  }
  if (avatarClass === "demon") {
    return XIANXIA_CHARACTER_ROSTER[4];
  }
  return XIANXIA_CHARACTER_ROSTER[0];
}

/**
 * 东方仙侠高精国风立绘展示组件 (支持 5 大角色原画立绘 + 琉璃玉框 + 动态悬浮灵气粒子 + 佩剑特效)
 */
export function CultivatorSprite({
  avatarClass,
  hasWeapon,
  weaponTier = 1,
  isAttacking = false,
  isHit = false,
  isHealing = false,
  size = "md",
}: {
  avatarClass: AvatarClass;
  hasWeapon?: boolean;
  weaponTier?: number;
  isAttacking?: boolean;
  isHit?: boolean;
  isHealing?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const charCfg = resolveCharacterConfig(avatarClass);

  const dimensions =
    size === "lg"
      ? "w-52 h-64 sm:w-56 sm:h-72"
      : size === "md"
      ? "w-44 h-56"
      : "w-28 h-36";

  return (
    <div
      className={`relative flex items-center justify-center select-none transition-transform duration-300 ${dimensions} ${
        isAttacking
          ? "translate-x-8 scale-105"
          : isHit
          ? "-translate-x-2 opacity-80"
          : "animate-float-slow"
      }`}
    >
      {/* 背后柔和仙门霞光光晕 */}
      <div
        className="absolute -inset-2 rounded-[26px] pointer-events-none opacity-65 blur-md"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${charCfg.particleColor}, transparent 72%)`,
        }}
      />

      {/* 丹药回血青玉柔光 */}
      {isHealing && (
        <div className="absolute inset-0 rounded-[24px] bg-teal-200/55 blur-md animate-ping z-20 pointer-events-none" />
      )}

      {/* 白玉琉璃鎏金立绘画框 */}
      <div className="relative w-full h-full rounded-[22px] overflow-hidden border-[1.5px] border-[#C8AA72]/75 bg-white/80 shadow-[0_10px_28px_-8px_rgba(92,132,124,0.28)]">
        {/* 角色高精国风立绘 */}
        <img
          src={charCfg.imageSrc}
          alt={charCfg.zhName}
          className="w-full h-full object-cover object-top transition-transform duration-700 hover:scale-105"
        />

        {/* 四角浅鎏金回纹角花装饰 */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
        >
          <path
            d="M2,16 L2,2 L16,2"
            fill="none"
            stroke="#D6B981"
            strokeWidth="1.5"
          />
          <path
            d="M84,2 L98,2 L98,16"
            fill="none"
            stroke="#D6B981"
            strokeWidth="1.5"
          />
          <path
            d="M2,84 L2,98 L16,98"
            fill="none"
            stroke="#D6B981"
            strokeWidth="1.5"
          />
          <path
            d="M84,98 L98,98 L98,84"
            fill="none"
            stroke="#D6B981"
            strokeWidth="1.5"
          />
        </svg>

        {/* 底部朦胧柔光云雾渐变遮罩 + 角色名牌 */}
        <div
          className="absolute inset-x-0 bottom-0 h-14 flex flex-col items-center justify-end pb-2 px-2 text-center pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, rgba(246, 250, 249, 0.92) 15%, rgba(246, 250, 249, 0.45) 68%, transparent 100%)",
          }}
        >
          <span className="text-[11px] font-bold tracking-widest text-[#233B37] drop-shadow-sm">
            {charCfg.zhName}
          </span>
          <span className="text-[9px] text-[#5C7A74] tracking-wider">
            {charCfg.zhTitle}
          </span>
        </div>
      </div>

      {/* 悬浮本命琉璃飞剑徽章 (当已佩剑时浮于立绘右侧) */}
      {hasWeapon && (
        <div
          className={`absolute -right-3 top-4 z-20 px-2 py-1 rounded-full bg-white/90 border border-[#C8AA72] shadow-sm flex items-center gap-1 text-[10px] font-semibold text-[#6E5225] ${
            isAttacking ? "translate-x-3 -translate-y-1 scale-110" : ""
          }`}
        >
          <span>🗡️</span>
          <span>
            {weaponTier >= 3 ? "仙剑" : weaponTier === 2 ? "灵剑" : "佩剑"}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * 秘境守护玄灵 / 妖尊立绘 (支持山海瑞兽、青丘灵狐化形、九幽血瞳魔尊立绘)
 */
export function MonsterSprite({
  floor,
  isHit = false,
  isAttacking = false,
}: {
  floor: number;
  isHit?: boolean;
  isAttacking?: boolean;
}) {
  // 第3、4层展示【狐妖化形少女】立绘，第5层终极试炼展示【九幽魔尊】立绘
  const portraitSrc =
    floor >= 5
      ? "/characters/demon_lord.jpg"
      : floor >= 3
      ? "/characters/fox_maiden.jpg"
      : null;

  const portraitLabel =
    floor >= 5
      ? "九幽血瞳魔尊"
      : floor === 4
      ? "青丘九尾天狐"
      : floor === 3
      ? "幻雾桃花狐仙"
      : "";

  if (portraitSrc) {
    return (
      <div
        className={`relative w-28 h-36 flex items-center justify-center select-none transition-transform duration-300 ${
          isAttacking
            ? "-translate-x-8 scale-105"
            : isHit
            ? "translate-x-2 opacity-75"
            : "animate-float-slow"
        }`}
      >
        <div className="relative w-full h-full rounded-[20px] overflow-hidden border-[1.5px] border-[#C8AA72]/80 bg-white/80 shadow-[0_8px_22px_-6px_rgba(92,72,128,0.3)]">
          <img
            src={portraitSrc}
            alt={portraitLabel}
            className="w-full h-full object-cover object-top"
          />
          <div
            className="absolute inset-x-0 bottom-0 py-1 px-1.5 text-center text-[9px] font-bold tracking-wider text-white"
            style={{
              background:
                "linear-gradient(to top, rgba(28, 16, 44, 0.85), transparent)",
            }}
          >
            {portraitLabel}
          </div>
        </div>
      </div>
    );
  }

  const spiritBodyColor = floor === 1 ? "#DCECE8" : "#EFE0E6";
  const strokeGold = "#C4A46B";

  return (
    <div
      className={`relative w-28 h-36 flex items-center justify-center select-none transition-transform duration-300 ${
        isAttacking
          ? "-translate-x-8 scale-105"
          : isHit
          ? "translate-x-2 opacity-75"
          : "animate-float-slow"
      }`}
    >
      {/* 灵兽脚下淡紫霞光云座 */}
      <div
        className="absolute bottom-1 w-28 h-6 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(206, 188, 232, 0.48) 0%, transparent 75%)",
          border: "1px solid rgba(196, 164, 107, 0.45)",
        }}
      />

      <svg viewBox="0 0 120 130" className="w-full h-full">
        <circle
          cx="60"
          cy="62"
          r="38"
          fill="#FFFFFF"
          fillOpacity="0.45"
          stroke={strokeGold}
          strokeWidth="0.9"
          strokeDasharray="4 3"
        />
        <path
          d="M42 36 Q26 16 32 8 Q38 18 48 30"
          fill="none"
          stroke={strokeGold}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M78 36 Q94 16 88 8 Q82 18 72 30"
          fill="none"
          stroke={strokeGold}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <ellipse
          cx="60"
          cy="68"
          rx="31"
          ry="35"
          fill={spiritBodyColor}
          stroke={strokeGold}
          strokeWidth="1.2"
        />
        <polygon
          points="60,42 64,48 60,54 56,48"
          fill="#D7BA84"
          stroke="#FFFFFF"
          strokeWidth="0.8"
        />
        <ellipse cx="47" cy="60" rx="4.5" ry="2.5" fill="#5D837C" />
        <ellipse cx="73" cy="60" rx="4.5" ry="2.5" fill="#5D837C" />
        <circle cx="46" cy="59.5" r="1" fill="#FFFFFF" />
        <circle cx="72" cy="59.5" r="1" fill="#FFFFFF" />
        <path
          d="M22 76 Q60 92 98 76"
          fill="none"
          stroke="#9AC6BD"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/**
 * 白玉阵盘灵畦视觉组件 (聚灵阵眼符印 + 灵芽破土 + 三阶道品仙草立绘)
 * 告别粗糙 CSS 椭圆，完全采用中式工笔水墨矢量植物与灵气动效
 */
export function HerbTileVisual({
  status,
  seedTier = 1,
}: {
  status: "EMPTY" | "GROWING" | "READY";
  seedTier?: 1 | 2 | 3;
}) {
  // 1. 待播种：玄土灵壤 + 八卦聚灵阵盘符印 (深邃灵壤 + 聚灵法阵微芒，定宽定高 100x80)
  if (status === "EMPTY") {
    return (
      <svg
        viewBox="0 0 100 80"
        className="w-20 h-16 mx-auto select-none shrink-0"
      >
        <defs>
          <radialGradient id="soilGlow" cx="50%" cy="56%" r="48%">
            <stop offset="0%" stopColor="#4A3425" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#302015" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#253D39" stopOpacity="0.0" />
          </radialGradient>
          <radialGradient id="jadeArrayGlow" cx="50%" cy="54%" r="46%">
            <stop offset="0%" stopColor="#A7E8D8" stopOpacity="0.4" />
            <stop offset="65%" stopColor="#5FE3C8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2E6B5E" stopOpacity="0.0" />
          </radialGradient>
        </defs>

        {/* 灵壤温润气晕 */}
        <ellipse cx="50" cy="50" rx="36" ry="22" fill="url(#jadeArrayGlow)" />
        <ellipse cx="50" cy="52" rx="28" ry="15" fill="url(#soilGlow)" />

        {/* 八卦聚灵阵盘金纹外环 */}
        <ellipse
          cx="50"
          cy="50"
          rx="32"
          ry="18"
          fill="none"
          stroke="#C8AA72"
          strokeWidth="1.2"
          strokeDasharray="6 2 2 2"
          strokeOpacity="0.85"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="22"
          ry="12"
          fill="none"
          stroke="#7BAEA4"
          strokeWidth="0.8"
          strokeDasharray="3 2"
          strokeOpacity="0.7"
        />

        {/* 四象阵眼刻印 (东青龙、西白虎、南朱雀、北玄武符线) */}
        <line x1="50" y1="32" x2="50" y2="38" stroke="#D4AF37" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="50" y1="62" x2="50" y2="68" stroke="#D4AF37" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="18" y1="50" x2="26" y2="50" stroke="#D4AF37" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="74" y1="50" x2="82" y2="50" stroke="#D4AF37" strokeWidth="1.4" strokeLinecap="round" />

        {/* 中央阵眼八卦灵玉 */}
        <polygon
          points="50,44 56,50 50,56 44,50"
          fill="#EEF8F5"
          stroke="#52D1B2"
          strokeWidth="1.2"
        />
        <circle cx="50" cy="50" r="2.5" fill="#D4AF37" />

        {/* 虚位灵气游丝与微尘 */}
        <path
          d="M45,46 Q42,36 47,26"
          stroke="#86C4B8"
          strokeWidth="0.8"
          strokeDasharray="2 2"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M55,44 Q58,34 53,24"
          stroke="#D8BD88"
          strokeWidth="0.8"
          strokeDasharray="2 2"
          fill="none"
          opacity="0.6"
        />
        <circle cx="47" cy="26" r="1" fill="#5FE3C8" opacity="0.8" />
        <circle cx="53" cy="24" r="1" fill="#FFE599" opacity="0.8" />
      </svg>
    );
  }

  // 2. 润泽生长期：双叶灵芽破土 + 晨露灵光 + 袅袅灵气 (严格定高定宽 100x80)
  if (status === "GROWING") {
    return (
      <svg
        viewBox="0 0 100 80"
        className="w-20 h-16 mx-auto select-none shrink-0"
      >
        <defs>
          <radialGradient id="growSoilGlow" cx="50%" cy="60%" r="45%">
            <stop offset="0%" stopColor="#3B2618" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#253D39" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1E332E" stopOpacity="0.0" />
          </radialGradient>
          <linearGradient id="jadeStem" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#2E6B5E" />
            <stop offset="60%" stopColor="#52D1B2" />
            <stop offset="100%" stopColor="#A8F0E2" />
          </linearGradient>
          <linearGradient id="jadeLeafL" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#3B7D70" />
            <stop offset="60%" stopColor="#6EE0C8" />
            <stop offset="100%" stopColor="#D5FAF2" />
          </linearGradient>
          <linearGradient id="jadeLeafR" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#357568" />
            <stop offset="60%" stopColor="#5ED4BC" />
            <stop offset="100%" stopColor="#CEF5EC" />
          </linearGradient>
          <radialGradient id="sproutAura" cx="50%" cy="35%" r="45%">
            <stop offset="0%" stopColor="#8DF2DC" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#5FE3C8" stopOpacity="0.0" />
          </radialGradient>
        </defs>

        {/* 灵壤微芒底衬 */}
        <ellipse cx="50" cy="62" rx="26" ry="12" fill="url(#growSoilGlow)" />
        <ellipse cx="50" cy="40" rx="24" ry="24" fill="url(#sproutAura)" />

        {/* 破土晶莹嫩茎 */}
        <path
          d="M50,64 Q48,46 50,28"
          stroke="url(#jadeStem)"
          strokeWidth="2.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* 左侧初展翠玉灵叶 */}
        <path
          d="M49,44 C34,38 28,26 31,18 C41,19 46,32 49,44 Z"
          fill="url(#jadeLeafL)"
          stroke="#2A665A"
          strokeWidth="0.9"
        />
        {/* 左叶金色灵脉 */}
        <path
          d="M48,42 Q39,30 33,21"
          stroke="#D4AF37"
          strokeWidth="0.7"
          fill="none"
          opacity="0.85"
        />

        {/* 右侧初展翠玉灵叶 */}
        <path
          d="M51,38 C65,32 71,20 68,12 C58,14 53,26 51,38 Z"
          fill="url(#jadeLeafR)"
          stroke="#2A665A"
          strokeWidth="0.9"
        />
        {/* 右叶金色灵脉 */}
        <path
          d="M51,36 Q61,24 66,15"
          stroke="#D4AF37"
          strokeWidth="0.7"
          fill="none"
          opacity="0.85"
        />

        {/* 顶端嫩心芽 (朝露欲滴) */}
        <path
          d="M50,28 Q47,18 50,14 Q53,18 50,28 Z"
          fill="#FFFFFF"
          stroke="#52D1B2"
          strokeWidth="0.8"
        />

        {/* 叶尖九天晨露神珠 */}
        <circle cx="31" cy="18" r="2.2" fill="#FFFFFF" stroke="#5FE3C8" strokeWidth="0.6" />
        <circle cx="68" cy="12" r="2.0" fill="#FFFDF0" stroke="#D4AF37" strokeWidth="0.7" />

        {/* 双螺旋袅袅升腾灵气丝线 */}
        <path
          d="M44,26 Q40,14 46,4"
          stroke="#5FE3C8"
          strokeWidth="0.9"
          strokeDasharray="2 2"
          fill="none"
          opacity="0.8"
        />
        <path
          d="M56,20 Q60,10 54,2"
          stroke="#F59E0B"
          strokeWidth="0.9"
          strokeDasharray="2 2"
          fill="none"
          opacity="0.8"
        />

        {/* 悬浮灵星 */}
        <circle cx="36" cy="10" r="1.3" fill="#5FE3C8" />
        <circle cx="64" cy="6" r="1.3" fill="#FCD34D" />
      </svg>
    );
  }

  // 3. 成熟仙葩仙草：依据阶数绘制不同的道品灵植 (严格统一定高定宽 100x80)
  // --------------------------------------------------------------------------
  // 一阶：聚灵青莲 (Azure Jade Spirit Lotus)
  if (seedTier === 1) {
    return (
      <svg
        viewBox="0 0 100 80"
        className="w-20 h-16 mx-auto select-none shrink-0 animate-float-slow"
      >
        <defs>
          <radialGradient id="lotusAura" cx="50%" cy="44%" r="48%">
            <stop offset="0%" stopColor="#C6F6EC" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#6EE0C8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2E6B5E" stopOpacity="0.0" />
          </radialGradient>
          <linearGradient id="lotusOuterPetal" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#2D6B5F" />
            <stop offset="50%" stopColor="#68C7B6" />
            <stop offset="85%" stopColor="#D2F6EF" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
          <linearGradient id="lotusInnerPetal" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#3F8578" />
            <stop offset="60%" stopColor="#8BE0D0" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>

        {/* 青碧仙光宝华光晕 */}
        <circle cx="50" cy="42" r="30" fill="url(#lotusAura)" />

        {/* 碧玉莲台底座 */}
        <ellipse cx="50" cy="62" rx="22" ry="7" fill="#24554B" stroke="#489D8E" strokeWidth="1" />

        {/* 外层舒展仙瓣 */}
        <path
          d="M50,56 C24,52 14,32 28,18 C40,30 47,46 50,56 Z"
          fill="url(#lotusOuterPetal)"
          stroke="#265B51"
          strokeWidth="0.9"
        />
        <path
          d="M50,56 C76,52 86,32 72,18 C60,30 53,46 50,56 Z"
          fill="url(#lotusOuterPetal)"
          stroke="#265B51"
          strokeWidth="0.9"
        />

        {/* 中层青莲花瓣 */}
        <path
          d="M50,56 C32,46 26,26 39,12 C48,24 50,42 50,56 Z"
          fill="url(#lotusInnerPetal)"
          stroke="#2A665A"
          strokeWidth="0.8"
        />
        <path
          d="M50,56 C68,46 74,26 61,12 C52,24 50,42 50,56 Z"
          fill="url(#lotusInnerPetal)"
          stroke="#2A665A"
          strokeWidth="0.8"
        />

        {/* 中央主瓣与圣洁白莲芯 */}
        <path
          d="M50,56 C41,40 41,20 50,6 C59,20 59,40 50,56 Z"
          fill="#FFFFFF"
          stroke="#4AA091"
          strokeWidth="1.1"
        />

        {/* 金色莲蓬宝芯 */}
        <ellipse cx="50" cy="34" rx="5" ry="4" fill="#FDE68A" stroke="#D97706" strokeWidth="0.9" />
        <circle cx="48" cy="33" r="1.1" fill="#FFFFFF" />
        <circle cx="52" cy="33.5" r="0.9" fill="#92400E" />
        <circle cx="50" cy="36" r="0.9" fill="#92400E" />

        {/* 飘浮荧光仙芒 */}
        <circle cx="28" cy="14" r="1.8" fill="#FCD34D" opacity="0.9" />
        <circle cx="72" cy="14" r="1.8" fill="#5EEAD4" opacity="0.9" />
        <circle cx="50" cy="2" r="2.0" fill="#FFFFFF" />
      </svg>
    );
  }

  // 二阶：九叶赤血芝 (Nine-Leaf Crimson Blood Lingzhi)
  if (seedTier === 2) {
    return (
      <svg
        viewBox="0 0 100 80"
        className="w-20 h-16 mx-auto select-none shrink-0 animate-float-slow"
      >
        <defs>
          <radialGradient id="lingzhiAura" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#FBCFE8" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#F43F5E" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#881337" stopOpacity="0.0" />
          </radialGradient>
          <linearGradient id="lingzhiTier1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E11D48" />
            <stop offset="60%" stopColor="#9F1239" />
            <stop offset="100%" stopColor="#4C0519" />
          </linearGradient>
          <linearGradient id="lingzhiTier2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FB7185" />
            <stop offset="65%" stopColor="#BE123C" />
            <stop offset="100%" stopColor="#5E0B20" />
          </linearGradient>
        </defs>

        {/* 赤霞真火光晕 */}
        <circle cx="50" cy="40" r="30" fill="url(#lingzhiAura)" />

        {/* 乌木灵芝柄 */}
        <path
          d="M48,64 C46,50 44,38 46,26"
          stroke="#3B0712"
          strokeWidth="3.6"
          strokeLinecap="round"
          fill="none"
        />

        {/* 下层如意重云芝盖 */}
        <path
          d="M24,36 C26,27 42,23 56,27 C68,31 76,39 72,46 C64,50 44,48 33,44 C26,42 22,40 24,36 Z"
          fill="url(#lingzhiTier1)"
          stroke="#F59E0B"
          strokeWidth="1.2"
        />
        {/* 金色如意纹嵌边 */}
        <path
          d="M28,34 Q46,27 64,31"
          stroke="#FEF3C7"
          strokeWidth="1.1"
          fill="none"
          strokeDasharray="2 1"
        />

        {/* 上层赤血灵芝如意宝盖 */}
        <path
          d="M32,24 C34,14 52,10 66,14 C78,18 83,26 79,32 C71,36 52,34 41,30 C35,28 30,26 32,24 Z"
          fill="url(#lingzhiTier2)"
          stroke="#FBBF24"
          strokeWidth="1.3"
        />
        {/* 顶层金边回纹 */}
        <path
          d="M36,21 Q52,15 72,19"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          fill="none"
          opacity="0.9"
        />

        {/* 赤火灵孢星尘 */}
        <circle cx="42" cy="10" r="1.8" fill="#FDE68A" />
        <circle cx="78" cy="14" r="1.6" fill="#FDA4AF" />
        <circle cx="26" cy="24" r="1.5" fill="#FDE68A" />
        <circle cx="50" cy="4" r="2.0" fill="#FFFFFF" />
      </svg>
    );
  }

  // 三阶：千年玄黄朱果 (Thousand-Year Aureate Cinnabar Fruit)
  return (
    <svg
      viewBox="0 0 100 80"
      className="w-20 h-16 mx-auto select-none shrink-0 animate-float-slow"
    >
      <defs>
        <radialGradient id="zhuGuoBody" cx="36%" cy="34%" r="64%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="30%" stopColor="#FBBF24" />
          <stop offset="70%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#7C2D12" />
        </radialGradient>
        <radialGradient id="zhuGuoAura" cx="50%" cy="38%" r="48%">
          <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#F97316" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7C2D12" stopOpacity="0.0" />
        </radialGradient>
      </defs>

      {/* 耀眼玄黄真火光晕 */}
      <circle cx="50" cy="38" r="30" fill="url(#zhuGuoAura)" />

      {/* 灵藤古木枝杈 */}
      <path
        d="M50,64 Q46,48 50,38 Q42,36 34,32"
        stroke="#451A03"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M50,38 Q58,34 66,30"
        stroke="#451A03"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* 托果翠玉仙叶 */}
      <path
        d="M34,32 C24,30 20,20 24,14 C30,20 34,28 34,32 Z"
        fill="#34D399"
        stroke="#065F46"
        strokeWidth="0.9"
      />
      <path
        d="M66,30 C76,28 80,18 76,12 C70,18 66,26 66,30 Z"
        fill="#34D399"
        stroke="#065F46"
        strokeWidth="0.9"
      />

      {/* 左枚玄黄朱果 */}
      <circle cx="36" cy="34" r="8.5" fill="url(#zhuGuoBody)" stroke="#FDE68A" strokeWidth="1.1" />
      <circle cx="33.5" cy="31" r="2.0" fill="#FFFFFF" opacity="0.85" />

      {/* 右枚玄黄朱果 */}
      <circle cx="64" cy="32" r="9.5" fill="url(#zhuGuoBody)" stroke="#FDE68A" strokeWidth="1.1" />
      <circle cx="61.5" cy="29" r="2.2" fill="#FFFFFF" opacity="0.9" />

      {/* 中央主品硕大圣果 */}
      <circle cx="50" cy="24" r="12" fill="url(#zhuGuoBody)" stroke="#FEF3C7" strokeWidth="1.3" />
      <circle cx="46.5" cy="20.5" r="3.0" fill="#FFFFFF" opacity="0.95" />

      {/* 升腾的三昧真火星辉 */}
      <polygon points="50,7 52,11 50,15 48,11" fill="#FEF08A" />
      <circle cx="28" cy="12" r="1.6" fill="#FBBF24" />
      <circle cx="72" cy="10" r="1.6" fill="#FBBF24" />
      <circle cx="50" cy="2" r="2.0" fill="#FFFFFF" />
    </svg>
  );
}
