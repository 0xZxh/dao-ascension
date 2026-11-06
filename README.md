# DaoAscension (仙途寻道·问鼎天榜) — On-Chain Xianxia Cultivation RPG on NEAR

> **English & 中文双语文档 (Bilingual Documentation)** | Built for **NEAR HACKATHON 2026** (`2026-11-01` – `2026-11-14`)  
> **Tracks**: `games` · `nfts` · `agents` · `defi`  
> **UI Language Switcher**: One-click **`中文 / EN`** toggle in the top header of the web app.

---

## Part I — English Documentation (For AI & Human Judges)

### 1. Problem & Solution

Traditional Web3 games suffer from three structural flaws:
1. **Constant Wallet Popups**: Signing a transaction every time a player waters a crop, crafts a sword, or fights a monster ruins gameplay immersion.
2. **Static NFTs**: Character NFTs are passive images stored separately from inventory, stats, and land plots.
3. **Single-Metric Ponzi Leaderboards**: Pure combat or whale-dominated leaderboards alienate casual farmers and crafters, leading to rapid token inflation and collapse.

**DaoAscension (仙途寻道·问鼎天榜)** solves these using native **NEAR Protocol** primitives:
- **Cultivator NFT as an Account (`NEP-171` + Bound Sub-Account)**: Every Cultivator NFT (`cultivator-nft:001`) owns a dedicated NEAR sub-account (`qingyun-01.daoascension.testnet`) that holds its realm progression, **Max HP**, **ATK**, equipped Flying Sword, storage bag, and 3×3 Spiritual Herb Garden. Transferring the NFT transfers the entire account and inventory atomically.
- **Zero-Popup Gameplay (`Function Call Access Keys`)**: All farming, alchemy pill refining, blacksmith forging, and dungeon combat actions are signed silently in the background via scoped `ed25519` Function Call Access Keys (`25.00 NEAR` allowance) and verified via `NEP-413`.
- **Trifecta Character Progression Loop**:
  1. **Spiritual Herb Farming (洞府灵田 → +HP)**: Plant spiritual herbs (`Spirit-Gathering Grass`, `Nine-Leaf Blood Lingzhi`, `Millennium Vermilion Fruit`), irrigate with Spirit Spring water, and refine pills in the alchemy furnace to permanently increase **Max HP** and stock auto-healing combat pills.
  2. **Immortal Artifact Forging (天工炼器 → +ATK)**: Smelt Secret Realm ores (`Black Iron`, `Meteor Ore`) into Flying Swords (`Azure Bamboo Cloud Sword`, `Purple-Gold Primordial Seal`, `Taixu Heaven-Burning Sword`) with dynamic rarity affixes to boost **ATK** and **Crit Rate**.
  3. **Secret Realm Combat (秘境伏魔 → Loot Ores & Seeds)**: Challenge the 5-floor Demon Suppression Tower. Cultivators automatically consume farmed alchemy pills when HP drops below 55% and loot higher-tier ores and herb seeds on victory.
- **Sect Treasury & 3 Weekly Heaven Leaderboards settled via NEAR Intents**:
  - 100% of Spirit Stones spent on seeds, forging furnace fees, and realm entry talismans flow into the **Sect Treasury (`sect-treasury.daoascension.testnet`)**.
  - Every week, **50% of the Sect Treasury** is extracted and distributed across **3 parallel Weekly Leaderboards**:
    - **40% — Demon Slayer Board (诛魔天榜)**: Ranked by Secret Realm floor progression and combat score.
    - **30% — Herb & Alchemy Board (百草药圣榜)**: Ranked by spiritual herb harvesting and pill refinement score.
    - **30% — Divine Blacksmith Board (神工天匠榜)**: Ranked by forged artifact quality and craftsmanship score.
  - Weekly leaderboard rewards are settled cross-chain (e.g., to **Solana USDC**, **Arbitrum USDT**, **Base USDC**, or **NEAR**) via the **NEAR Intents 1Click API** (`https://1click.chaindefuser.com/v0/quote`) with verified `NEP-413` intent signatures and `DIP-4` simulation logs.

### 2. How to Try It (`Do X -> See Y` Steps)

#### Option A: One-Command CLI Verification (For AI Judges)

```bash
npm install
npm run verify-demo
```

- **Do X**: Run `npm run verify-demo`.
- **See Y**: The CLI executes all 6 core stages (1. NEAR Testnet RPC & Function Call Key binding $\rightarrow$ 2. Spiritual Herb Farming `+Max HP` $\rightarrow$ 3. Artifact Forging `+ATK` & Treasury fee inflow $\rightarrow$ 4. Secret Realm Combat Floors 1 & 2 victory + loot $\rightarrow$ 5. Sect Treasury 50% extraction to 3 Weekly Leaderboards + NEAR Intents `Solana USDC` quote & `NEP-413` signature verification $\rightarrow$ 6. Cultivator NFT as Account full ownership transfer), printing `✅ PASS` for every assertion.

#### Option B: Interactive Bilingual Web UI (`Do X -> See Y`)

```bash
npm run dev
```

Open `http://localhost:3000` in your browser (click **`中文 / EN`** in the top bar to switch languages at any time):

1. **Harvest Spiritual Herbs & Refine Pills (`+HP`)**:
   - **Do X**: Click **"① 灵田炼丹 (+气血 HP) / ① Farm Herb (+Max HP)"** in the top quick-walkthrough bar (or click Harvest on Plot #1).
   - **See Y**: Cultivator's **Max HP** permanently increases from `160` to `274 HP`, combat healing pills increase in the storage bag, **Alchemy Board** score increases, and a verified `NEP-413` session receipt appears in the bottom log with zero wallet popups.
2. **Forge an Immortal Sword (`+ATK` & Treasury Fee Inflow)**:
   - **Do X**: Click **"② 天工炼器 (+攻击 ATK) / ② Forge Sword (+ATK)"** in the top bar (or switch to Tab 2 and click Forge).
   - **See Y**: Iron ores and `25` Spirit Stones are consumed (`25` Spirit Stones flow directly into the **Sect Treasury**), a newly forged Flying Sword with Elder inscription is auto-equipped, and Cultivator **ATK** jumps from `36` to `92+ ATK`.
3. **Challenge the Secret Realm (`Combat Loop & Auto-Pill Recovery`)**:
   - **Do X**: Click **"③ 闯秘境斩妖 / ③ Realm Combat"** in the top bar (or switch to Tab 3 and challenge Floor 1).
   - **See Y**: Turn-by-turn combat log displays sword strikes, critical hits, automatic consumption of farmed healing pills when HP drops below 55%, monster defeat, and ore/seed drops.
4. **Settle 3 Weekly Leaderboards via NEAR Intents (`Cross-Chain Payout`)**:
   - **Do X**: Click **"④ 国库50%结算三周榜 / ④ Settle 3 Boards (NEAR Intents)"** in the top bar.
   - **See Y**: Exactly **50%** of the Sect Treasury is extracted and distributed across the 3 Weekly Leaderboards (`40% Slayer` / `30% Alchemy` / `30% Blacksmith`), generating a live **NEAR Intents 1Click quote** (`Solana USDC` / `Arbitrum USDT`) with a verified `NEP-413` intent hash.
5. **Transfer Cultivator NFT as an Account (`NEP-171 + Sub-Account`)**:
   - **Do X**: In the left sidebar, enter `immortal-buyer.testnet` and click **"整号过户 / Transfer NFT"**.
   - **See Y**: Ownership of `cultivator-nft:001` and its bound sub-account `qingyun-01.daoascension.testnet` transfers to `immortal-buyer.testnet` while preserving 100% of its Max HP, ATK, equipped sword, storage bag, and 9 garden plots.

---

## Part II — 中文版说明文档 (Chinese Documentation)

### 1. 核心机制与创新亮点

**《仙途寻道·问鼎天榜》(DaoAscension)** 是基于 NEAR 链抽象与“NFT 即账户”构建的仙侠角色成长链游：
1. **道身即账户 (`NFT as Account` — `NEP-171` + 独立子账户)**：每个修仙者 NFT (`cultivator-nft:001`) 绑定独立子账户 (`qingyun-01.daoascension.testnet`)，角色的境界、气血上限 (`Max HP`)、本命攻击 (`ATK`)、佩戴飞剑、储物袋与 3×3 九宫灵田全部挂载在 NFT 账户名下，转让 NFT 即整号带全套资产一键过户。
2. **零弹窗无感修仙 (`Function Call Access Keys`)**：播种、灵泉灌溉、炼丹、天工铸剑、秘境闯塔全程由受限 `Function Call Key` 静默签名并经 `NEP-413` 校验，零钱包弹窗打扰。
3. **角色成长三位一体闭环**：
   - **【洞府灵田】（农场种植 → 产出气血 HP）**：种植聚灵草、九叶赤血芝、千年朱果，炼丹永久增加角色**气血上限 (Max HP)** 并储备战斗自动回血丹。
   - **【天工炼器】（装备打造 → 产出攻击 ATK）**：熔炼秘境掉落的百炼玄铁与天外陨铁，锻造青竹蜂云剑、紫金混元印、太虚焚天仙剑，赋予角色高额**攻击力 (ATK)** 与破界暴击。
   - **【秘境伏魔】（战斗系统 → 耗血吃药掉矿种）**：闯荡镇魔古塔 1~5 层，气血低于 55% 自动服用灵田炼制的回春丹，击败妖兽掉落高阶矿石与灵草仙种。
4. **宗门国库 50% 提取至三大周天榜 + NEAR Intents 跨链结算**：
   - 购置灵种、炼器火种费、秘境破阵符 100% 汇入**宗门国库 (`sect-treasury.daoascension.testnet`)**。
   - 每周从国库提取 **50%** 灵石注入三大并行周榜：**【诛魔天榜 (40%)】**、**【百草药圣榜 (30%)】**、**【神工天匠榜 (30%)】**，并通过 **NEAR Intents 1Click API** 一键跨链结算为 `Solana USDC`、`Arbitrum USDT` 或 `NEAR`。
