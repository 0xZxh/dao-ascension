# DaoAscension (仙途寻道·问鼎天榜) 研发总控进度看板 & 黑客松提交 SOP

- **项目名称**：`DaoAscension` (仙途寻道·问鼎天榜) — 基于 NEAR "NFT as Account" 与 NEAR Intents 的仙侠角色成长与宗门天榜链游
- **当前环境**：`NEAR Testnet` (`https://rpc.testnet.near.org`) + `Function Call Access Keys (0-Popup)` + `NEAR Intents 1Click API`
- **联报赛道**：`games` | `nfts` | `agents` | `defi`
- **提交截止时间**：`2026-11-14T23:59:00Z`（北京时间 2026 年 11 月 15 日 07:59）

---

## 📊 模块研发进度总表 (M0 ~ M6)

| 模块编号 | 模块名称 | 核心交付文件 | 验收标准 | 当前状态 | 完成度 |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **M0** | **项目脚手架与提交 SOP 规范** | [00-ROADMAP.md](file:///Users/0xzxh/bytesio/near/docs/00-ROADMAP.md), [README.md](file:///Users/0xzxh/bytesio/near/README.md) | 符合 `HACKATHON.md` 人类与 AI 评委双模标准 | ✅ 已完成 | 100% |
| **M1** | **NEAR Testnet 道身账户层 (NFT as Account) & Session Key** | [config.ts](file:///Users/0xzxh/bytesio/near/src/lib/near/config.ts), [testnet-wallet.ts](file:///Users/0xzxh/bytesio/near/src/lib/near/testnet-wallet.ts) | `NEP-171` 道身绑定独立子账户 `qingyun-01.daoascension.testnet`、`Function Call Key` 免弹窗签名、NEP-413 验签 | ✅ 已完成 | 100% |
| **M2** | **角色成长三大系统（灵田+HP / 炼器+ATK / 秘境战斗）** | [types.ts](file:///Users/0xzxh/bytesio/near/src/lib/xianxia/types.ts), [engine.ts](file:///Users/0xzxh/bytesio/near/src/lib/xianxia/engine.ts) | 洞府种药炼丹永久加 `Max HP` 与回血丹；天工熔炼玄铁打造飞剑加 `ATK`；镇魔塔回合制自动吃药斩妖掉矿种 | ✅ 已完成 | 100% |
| **M3** | **宗门国库 50% 分润三大周天榜 & NEAR Intents 跨链结算** | [client.ts](file:///Users/0xzxh/bytesio/near/src/lib/intents/client.ts), [engine.ts](file:///Users/0xzxh/bytesio/near/src/lib/xianxia/engine.ts) | 种子/炼器/秘境费 100% 入国库，提取 50% 分发至【诛魔榜 40%】【百草榜 30%】【神工榜 30%】并生成 `1click` 跨链结算回执 | ✅ 已完成 | 100% |
| **M4** | **玄机长老 AI NPC (TEE Attested Elder)** | [engine.ts](file:///Users/0xzxh/bytesio/near/src/lib/xianxia/engine.ts) | 拥有独立子账户钱包 `elder-agent.daoascension.testnet`，为仙器题写铭文并播报宗门供需行情 | ✅ 已完成 | 100% |
| **M5** | **国风暗金仙侠交互大屏 UI 与评委一键向导** | [page.tsx](file:///Users/0xzxh/bytesio/near/src/app/page.tsx), [route.ts](file:///Users/0xzxh/bytesio/near/src/app/api/xianxia/action/route.ts) | 顶部 30 秒快速演练向导、九宫灵田、天工炼器炉、镇魔塔战报、三榜并列大屏与底部 NEP-413 签名流 | ✅ 已完成 | 100% |
| **M6** | **AI 评委一键验证脚本 (`npm run verify-demo`)** | [verify-demo.ts](file:///Users/0xzxh/bytesio/near/scripts/verify-demo.ts) | 单命令自动执行 6 大闭环断言并输出 `PASS` 矩阵 | ✅ 已完成 | 100% |

---

## 🚀 一步一步提交操作清单 (Step-by-Step Submission Checklist)

- [x] **Step 1-4**：完成 M0 ~ M5 仙侠核心成长闭环、宗门国库三周榜、NEAR Intents 跨链发奖与国风大屏 UI
- [x] **Step 5**：通过 `npm run verify-demo` 与 `npm run build` 自动化验证
- [x] **Step 6**：生成符合 AI 评委规范的 `Do X -> See Y` 根目录 `README.md`
- [ ] **Step 7（由你操作）**：将本仓库推送至公开 GitHub 仓库（确认设为 `Public`），并可一键部署至 Vercel
- [ ] **Step 8（由你操作）**：在 X (Twitter) 发布公开演示推文（附上 60 秒录屏或界面截图，注明 built at `NEAR HACKATHON` `@NEARProtocol`）
- [ ] **Step 9-10（你提供字段后执行）**：核对 `projectName`、`leadName`、`email`、`nearAddress`、`projectUrl`、`demoUrl` 后，调用 `POST https://nearhackathon.com/api/applications` 完成单次提交
