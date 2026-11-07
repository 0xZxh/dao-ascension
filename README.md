# DaoAscension (仙途寻道·问鼎天榜) — On-Chain Xianxia Cultivation RPG on NEAR

> **English & 中文双语文档 (Bilingual Documentation)** | Built for **NEAR HACKATHON 2026** (`2026-11-01` – `2026-11-14`)  
> **Tracks**: `games` · `nfts` · `agents` · `defi`  
> **Smart Contract**: Deployed on NEAR Testnet at [`dao-ascension-dev.testnet`](https://testnet.nearblocks.io/address/dao-ascension-dev.testnet) (Rust `near-sdk 5.30.1`)  
> **UI Language Switcher**: One-click **`中文 / EN`** toggle in the top header of the web app.

---

## Part I — English Documentation (For AI & Human Judges)

### 1. Problem & Solution

Traditional Web3 games suffer from four structural flaws:
1. **Constant Wallet Popups**: Signing a transaction every time a player waters a crop, crafts a sword, or fights a monster ruins gameplay immersion.
2. **Static NFTs**: Character NFTs are passive images stored separately from inventory, stats, and land plots.
3. **Single-Metric Ponzi Leaderboards**: Whale-dominated combat boards alienate casual farmers and crafters, leading to rapid economic death spirals.
4. **Sybil Exploit Vulnerability**: Fake multi-account bots farm weekly rewards with zero real economic commitment.

**DaoAscension (仙途寻道·问鼎天榜)** solves these using native **NEAR Protocol** primitives:
- **Soulbound Cultivator NFT (`NEP-171` + Bound Sub-Account)**: Each wallet binds exactly one non-transferable Cultivator NFT (`cultivator-nft:001`), permanently binding its realm stage, **Max HP**, **ATK**, equipped Flying Sword, storage bag, and 3×3 Spiritual Herb Garden.
- **Zero-Popup Gameplay (`Function Call Access Keys`)**: All farming, alchemy pill refining, blacksmith forging, and dungeon combat actions are signed silently in the background via scoped `ed25519` Function Call Access Keys (`25.00 NEAR` allowance) and verified via `NEP-413`.
- **Trifecta Progression + PVP Arena Loop**:
  1. **Spiritual Herb Farming (洞府灵田 → +HP)**: Plant herbs (`Spirit-Gathering Grass`, `Nine-Leaf Blood Lingzhi`, `Millennium Vermilion Fruit`), irrigate with Spirit Spring water, and refine pills in the alchemy furnace to permanently increase **Max HP** and stock auto-healing combat pills.
  2. **Immortal Artifact Forging (天工炼器 → +ATK)**: Smelt Secret Realm ores (`Black Iron`, `Meteor Ore`) into Flying Swords with dynamic rarity affixes to boost **ATK** and **Crit Rate**.
  3. **Secret Realm Combat (秘境伏魔 → Loot Ores & Seeds)**: Challenge the 5-floor Demon Suppression Tower. Cultivators automatically consume farmed alchemy pills when HP drops below 55% and loot higher-tier ores and herb seeds on victory.
  4. **PVP Arena Duel (问鼎论剑 → ELO Ranking)**: 12-round tactical combat against peer cultivators with distinct battle stats, climbing the Duel Leaderboard.
- **Sect Treasury "50-30-20 Gold Distribution Rule" across 4 Weekly Heaven Leaderboards**:
  - 100% of Spirit Stones spent on seeds, forging furnace fees, and realm entry talismans flow into the **Sect Treasury**.
  - Every week, the Sect Treasury executes the **50-30-20 Rule**:
    - **50% Weekly Reward Pool**: Distributed across **4 Parallel Weekly Leaderboards**:
      - **30% — Demon Slayer Board (诛魔天榜)**: Ranked by Secret Realm floor progression.
      - **30% — Duel Board (问鼎论剑榜)**: Ranked by PVP Arena ELO combat rating.
      - **20% — Herb & Alchemy Board (百草药圣榜)**: Ranked by spiritual herbs harvested.
      - **20% — Divine Blacksmith Board (神工天匠榜)**: Ranked by total Dao Body combat power (`HP + ATK * 4`).
    - **30% Rolling Base Pool**: Stored in smart contract as next week's base pool and reserve liquidity.
    - **20% Dev & Operations Vault**: Allocated for NEAR RPC nodes, session key gas sponsorship, and live ops.
  - Weekly leaderboard rewards are settled cross-chain (e.g., to **Solana USDC**, **Arbitrum USDT**, **Base USDC**, or **NEAR**) via the **NEAR Intents 1Click API** with verified `NEP-413` intent signatures.

---

### 2. Live On-Chain Testnet Evidence

- **Contract Account**: [`dao-ascension-dev.testnet`](https://testnet.nearblocks.io/address/dao-ascension-dev.testnet)
- **Account Creation**: [7nDRiVZC26DqoJ6eSE1eL6Sdo9V6esbwpbHWufksHXn7](https://testnet.nearblocks.io/txns/7nDRiVZC26DqoJ6eSE1eL6Sdo9V6esbwpbHWufksHXn7)
- **Contract Deployment & Init**: [EhKCCpSSkcXBZ6V46KFK6oJve7a5Dzj4R3SDMKujGWp8](https://testnet.nearblocks.io/txns/EhKCCpSSkcXBZ6V46KFK6oJve7a5Dzj4R3SDMKujGWp8)
- **Soulbound Character Minting**: [3yWiegaipvL8nVfiCG1aVihjPwuHHiEvWUjBzwS3u4z3](https://testnet.nearblocks.io/txns/3yWiegaipvL8nVfiCG1aVihjPwuHHiEvWUjBzwS3u4z3)
- **Points Recharge (1 NEAR = 50 Stones)**: [44chpcsfsBGf9byByXFw26tKtbDKc26QZLfEJpMmhEQM](https://testnet.nearblocks.io/txns/44chpcsfsBGf9byByXFw26tKtbDKc26QZLfEJpMmhEQM)
- **Pure-Random Artifact Forging**: [8eYSLKjC76UygedXd4bxWQodN4jPDKw8dUiTD253w2Tu](https://testnet.nearblocks.io/txns/8eYSLKjC76UygedXd4bxWQodN4jPDKw8dUiTD253w2Tu)

---

### 3. How to Try It (`Do X -> See Y` Steps)

#### Option A: One-Command CLI 10-Step Verification (For AI & Human Judges)

```bash
npm install
npm run verify-demo
```

- **Do X**: Run `npm run verify-demo`.
- **See Y**: The CLI executes all 10 core verification assertions:
  1. `[1. NEAR Testnet & Session Key]`: Bind NEP-171 Cultivator NFT to sub-account & FunctionCall Key
  2. `[2. Spiritual Herb Growth Timers (+HP)]`: Harvesting mature herbs boosts Max HP; unready herbs enforce timers
  3. `[3. Pure-Random Artifact Forging (+ATK)]`: Forging artifact pure-randomly rolls rarity/ATK and routes fee to Sect Treasury
  4. `[4. Secret Realm Combat Loop]`: Defeat monsters on Floors 1 & 2, drop ores/seeds, update Slayer Board
  5. `[5. PVP Arena Duel & 4th Heaven Board]`: PVP duel resolves 12-turn combat with ATK/DEF/crits, updating Duel Score and Duel Board
  6. `[6. Treasury -> 4 Weekly Boards & Decrees]`: Extract 50% Treasury across 4 boards, issue Weekly Decree Mail, claim attachment & settle via NEAR Intents
  7. `[7. NEAR Multi-Account Data Isolation]`: Logging in with distinct NEAR accounts isolates cultivator data, garden, and inventory
  8. `[8. Innate Spirit Root & 0.1 NEAR Washing]`: Default spirit root is Ordinary (0% bonus); washing costs 0.1 NEAR (funds treasury) and rolls high tier with dynamic stat recalculation
  9. `[9. Dao Body Reshaping & NFT Retention]`: Reshaping deducts 200 stones / 0.5 NEAR into treasury, changes avatar & title while preserving all HP, artifacts, and plots
  10. `[10. Concurrent Herb Plots & Tokenomics (1N=50石)]`: Plots 0, 1, 2 can be seeded concurrently without mutually blocking, and 1 NEAR accurately converts to 50 Spirit Stones

#### Option B: Smart Contract Unit Tests (7 Mathematical & Invariant Checks)

```bash
cd contract
cargo test
```

- **See Y**: 7 unit tests pass in 0.08s, verifying invariants I1 through I8 (timelocks, rollover, monotonic score reporting, single settlement, soulbound transfers forbidden, and treasury splits).

#### Option C: Sybil & Monte Carlo Economic Simulation

```bash
python3 sim/simulate_economy.py
```

- **See Y**: Simulates 10, 100, and 1,000 players over 12 epochs with a 20% Sybil attack. Verifies that the Sybil net profit is strictly negative (-2.37 NEAR, -56.35 NEAR, -516.57 NEAR).

#### Option D: Automated Settlement Keeper

```bash
npx tsx scripts/keeper-settle.ts
```

- **See Y**: Queries live epoch info and config from `dao-ascension-dev.testnet` on NEAR testnet via FastNEAR RPC.

#### Option E: Interactive Bilingual Web UI (`Do X -> See Y`)

```bash
npm run dev
```

Open `http://localhost:3000` in your browser (click **`中文 / EN`** in the top bar to switch languages at any time):
1. **洞府灵圃 (Herb Garden)**: Plant herbs in the 3×3 grid (strictly fixed 138px height), water with spring water, harvest pills for permanent Max HP increase.
2. **天工剑庐 (Blacksmith Forge)**: Forge flying swords, enjoy pure-random rarity rolling, boost ATK.
3. **云海试炼 (Demon Tower)**: Battle demonic beasts turn-by-turn with automatic pill consumption.
4. **问鼎论剑 (PVP Arena)**: Duel opponents, earn ELO rating points.
5. **宗门天榜 (Sect Treasury Leaderboards)**: Toggle between 2×2 All-Board view and single-board Olympic-style 3-tier podium view. View Top 1 Champion gold card, Top 2/3 silver/bronze badges, scrollable list for rank 4+, and pinned current player standing.

---

## Part II — 中文版说明文档 (Chinese Documentation)

### 1. 核心机制与架构亮点

**《仙途寻道·问鼎天榜》(DaoAscension)** 是基于 NEAR 链抽象与“NFT 即账户”构建的仙侠角色成长链游：

1. **道身即账户 (`NFT as Account` — `NEP-171` + 灵魂绑定)**：每个修仙者钱包绑定唯一且不可转让的灵魂绑定 NFT (`cultivator-nft:001`)，挂载独立子账户，永久存储境界、气血上限 (`Max HP`)、本命攻击 (`ATK`)、佩戴飞剑、储物袋与 3×3 九宫灵田。
2. **零弹窗无感修仙 (`Function Call Access Keys`)**：播种、灵泉灌溉、炼丹、天工铸剑、秘境闯塔全程由受限 `Function Call Key` 静默签名并经 `NEP-413` 校验，零钱包弹窗打扰。
3. **四大核心系统闭环**：
   - **【洞府灵田】（农场种植 → 永久增加气血 Max HP）**：固定 138px 高度九宫格防抖设计，种植、浇灌、炼丹，提供战斗自动回血丹药。
   - **【天工炼器】（装备打造 → 永久增加攻击力 ATK）**：消耗秘境铁矿真随机锻造高阶飞剑，费用全额注入国库。
   - **【云海秘境】（PVE 闯塔 → 耗血吃药掉落矿石种子）**：五层镇魔塔，血量低于 55% 自动服用灵丹，击败妖兽掉落高阶灵材。
   - **【问鼎论剑】（PVP 竞技场 → 12回合攻防决胜与 ELO 天梯）**：与其他门派道友切磋演武，争夺天榜排名。
4. **宗门国库“五三二黄金分账法则”与四大周天榜**：
   - 玩家充值 NEAR 兑换灵石（1 NEAR = 50 灵石）、购买种子、炼器手续费 100% 汇入**宗门国库**。
   - 每周日 24:00 由天道自动执行 **50-30-20 黄金分润**：
     - **50% 奖池**：全额分配给**四大周天榜**（诛魔 30% / 论剑 30% / 百草 20% / 神工 20%），前四名梯度分润（50% / 25% / 15% / 10%）。
     - **30% 滚存底池**：留存在智能合约金库中，作为下一周期的奖池底池与流动性缓冲。
     - **20% 官方开发运营金库**：支持 RPC 节点网络与全天候开发。
   - 周榜奖励由合约直接以真实 NEAR 发放，并支持通过 **NEAR Intents 1Click API** 一键跨链结算承兑为 `Solana USDC`、`Arbitrum USDT` 或 `NEAR`。

---

### 2. 真实链上部署与测试验证

- **Rust 智能合约**: `contract/` 基于 `near-sdk 5.30.1`，7 项单元测试覆盖 I1-I8 核心不变量。
- **NEAR 测试网正式部署**: 合约账号 `dao-ascension-dev.testnet`。
- **女巫攻击蒙特卡洛模拟**: `python3 sim/simulate_economy.py` 严格验证 20% 女巫攻击净收益为负，小号无法获利。
- **10 项端到端全链路自动化测试**: `npm run verify-demo`（通过率 100%）。

---

## License & Hackathon Verification Notice

Built for **NEAR HACKATHON 2026**.  
Open-source under MIT License. All contract logic, economic simulations, and client assets are verified and reproducible via standard commands.
