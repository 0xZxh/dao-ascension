# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**DaoAscension(仙途寻道·问鼎天榜)** 是 NEAR HACKATHON 2026(2026-11-01 ~ 2026-11-14)参赛项目:仙侠角色成长链游演示,主打"NFT 即账户(NEP-171 + 绑定子账户)"、"零弹窗 Function Call Key 签名"、"宗门国库 50% 经 NEAR Intents 跨链结算三大周榜"。技术栈:Next.js 14(App Router)+ React 18 + TypeScript(strict)+ Tailwind CSS。参赛赛道:`games` / `nfts` / `agents` / `defi`。

**重要现实**:这是黑客松演示项目,链上部分是"半真实"的 —— RPC 状态查询与 Intents 1Click 报价(dry-run)是真实网络请求,但 NEP-413 签名使用本地确定性 ed25519 密钥,合约方法名指向的 `realm-engine.daoascension.testnet` 等合约并未实际部署。游戏状态完全存在于服务端内存,无数据库、无持久化。

## 常用命令

```bash
npm run dev          # 开发服务器 (http://localhost:3000)
npm run build        # 生产构建(提交前必须通过)
npm start            # 生产模式启动
npm run lint         # next lint
npm run verify-demo  # AI 评委端到端验证:tsx scripts/verify-demo.ts,打印 6 大闭环 PASS/FAIL 矩阵
```

- 没有单元测试框架(jest/vitest 均未配置)。`verify-demo` 就是事实上的验收测试:直接 import 引擎函数、调用 `resetXianxiaWorldState()` 重置内存状态后断言,全部通过则退出码 0。
- 路径别名 `@/*` → `./src/*`(tsconfig.json 中配置)。
- 环境变量见 `.env.example`(testnet 默认;可选 `NEAR_INTENTS_JWT` 消除 0.25% 手续费、可选 `NEAR_AI_API_KEY`)。

## 架构总览

数据流是单向的:浏览器 UI → POST/GET API 路由 → 游戏引擎(内存 store)→ 返回世界快照。

```
src/app/page.tsx (2200+ 行单文件大屏 UI,zh/en 双语切换)
  └─ fetch("/api/xianxia/state")   GET  世界快照
  └─ fetch("/api/xianxia/action")  POST { action: "PLANT_HERB", ... } 动作分发
        └─ src/lib/xianxia/engine.ts  核心游戏引擎(约 1650 行)
             ├─ src/lib/xianxia/types.ts     全部领域模型(玩家/国库/周榜/邮件/战斗报告)
             ├─ src/lib/near/config.ts       testnet/mainnet 网络配置(环境变量驱动)
             ├─ src/lib/near/testnet-wallet.ts  base58、NEP-413 签名/验签、真实 RPC status 查询(离线降级)
             └─ src/lib/intents/client.ts    1Click API 报价(dry: true),失败回退硬编码 FALLBACK_TOKENS
```

### 游戏引擎(`src/lib/xianxia/engine.ts`)

- **状态存储**:`globalThis.__daoAscensionStore`(模块级单例,`getStore()` 惰性创建)。没有持久化 —— 服务重启或 `next dev` 热重载即回到初始状态;`resetXianxiaWorldState()` 随时可重置。
- **动作函数**:`plantHerbInPlot`、`waterPlotWithSpiritSpring`、`harvestAndRefinePill`、`forgeImmortalArtifact`、`equipArtifactToCultivator`、`challengeSecretRealmFloor`、`settleWeeklyHeavenLeaderboards`(异步,唯一会调 Intents 报价的动作)、`transferCultivatorNftAccount`、`read/claimCelestialMail*`。每个动作直接原地修改 store 中的 `cultivator` / `treasury`,并生成 `SignedSessionActionReceipt`(模拟链上回执,含 NEP-413 签名)。
- **游戏数值**:三大目录常量在文件顶部 —— `HERB_SEEDS_CATALOG`(种药 +HP)、`FORGE_BLUEPRINTS_CATALOG`(锻造 +ATK)、`SECRET_REALM_FLOORS`(5 层镇魔塔),另有 `RIVAL_DAOISTS` 生成排行榜对手。
- **结算逻辑**:提取国库 50%,其中 40%/30%/30% 分给诛魔榜/百草榜/神工榜,20% 归 devOps,剩余 30% 留存;玩家奖励以"天阙传谕"邮件(`CelestialMailItem`)形式发放,需 `claimCelestialMailAttachment` 领取。
- **周榜结算时间**:东八区每周日 24:00(`calculateNextSundayMidnightUtc8`),仅计算展示,无真实定时器。

### API 层(`src/app/api/xianxia/`)

- `state/route.ts`:GET 返回 `XianxiaWorldSnapshot`(玩家 + 国库 + 战报 + 长老 AI 建议 + 会话密钥信息 + 链状态 + 最近回执 + 目录)。
- `action/route.ts`:POST 单一入口,按 `body.action` 字符串(如 `"PLANT_HERB"`、`"CHALLENGE_REALM"`)switch 分发到引擎函数,成功后重新取快照一并返回。新增玩法动作 = 引擎加函数 + 此处加 case。
- 两条路由均 `export const dynamic = "force-dynamic"`,不要缓存。

### NEAR 适配层

- `src/lib/near/testnet-wallet.ts`:密钥对是**确定性的**(对固定字符串 `"intentwork-near-testnet-agent-function-call-key-v1"` 做 SHA256 作为 ed25519 种子)—— 纯演示用途,任何修改默认都不应引入真实用户密钥。NEP-413 签名摘要格式为 `SHA256("NEP413_INTENTWORK_TESTNET" + verifierContract + nonce + message)`。
- `src/lib/intents/client.ts`:`fetchSupportedIntentTokens()` 有 2 分钟模块级缓存;`requestCrossChainIntentQuote()` 以 NEAR USDT 为 origin 资产,调 `/v0/quote` 时 `dry: true`,网络失败静默回退到本地估算报价(此时 `liveApiUsed: false`)。
- `src/lib/near/config.ts`:所有账户 ID(`sect-treasury.daoascension.testnet`、`cultivator-nft.daoascension.testnet` 等)由 `getNearConfig()` 按 `NEXT_PUBLIC_NEAR_NETWORK` 返回 testnet/mainnet 变体。

### 独立的 policy 模块(⚠️ 当前未被引用)

`src/lib/policy/`(engine.ts + store.ts + types.ts)是 IntentGuard 风控防火墙:R-01 注入锁定、R-02 单笔上限、R-03 人工复核阈值、R-04 24h 累计限额、R-05 链与资产白名单、R-06 收款地址黑名单、R-07 滑点熔断、R-08 Function Call Key 权限范围。**没有任何文件 import 它** —— 它对应 docs/04、docs/05 规划的外包市场/Agent 采购模块,尚未接线。不要误以为游戏结算经过了这层风控。

### 前端与文档

- `src/app/page.tsx` 是 2200+ 行的单文件大屏 UI(九宫灵田、炼器炉、镇魔塔战报、三周榜、NEP-413 签名流),顶部有 30 秒快速演练向导(步骤①~⑤)和 `中文/EN` 语言切换(i18n 字典在 `src/lib/xianxia/i18n.ts`,按中文原文查英文映射)。
- `src/app/guide/page.tsx` 用 react-markdown 渲染 `docs/GDD.md`(游戏设计文档,847 行),带目录与关键词高亮。
- 角色立绘/头像在 `public/characters/`(jpg + svg 两种格式)。
- `docs/` 是模块化设计文档 `00-ROADMAP.md`(总进度看板,权威进度来源)~ `06-AUDIT-AND-JUDGE-CLI.md`,大部分模块标记"已完成",但 docs 中的"待实现"状态表(如 M6 内表格)已过时 —— 实际交付状态以 00-ROADMAP.md 的 M0~M6 总表为准。

## 黑客松工作约束(来自 HACKATHON.md,必须遵守)

- 提交截止 **2026-11-14T23:59:00Z**;每队只能提交一次。
- **未经人类明确确认,绝不执行**:调用提交 API(`POST https://nearhackathon.com/api/applications`,先打印完整 JSON payload 并等确认,`requestId` 用 `uuidgen` 生成一次并复用)、代替用户发 X 帖子、将仓库设为公开/推送、签名交易/部署主网、提交密钥。
- 评委含 AI:README 与文档要机器可读,写"Do X → See Y"步骤,不写营销文案。
- 当前目录**尚未 git init**;README/文档提及"推送至公开 GitHub 仓库"是待办事项,不要自行代为执行。
- 提交需要人类提供:projectName、leadName、email、team size、tracks、主网 NEAR 收款账户、公开仓库链接、X 演示帖链接、项目介绍、consent。

## 修改建议

- 改游戏数值 → 找 `engine.ts` 顶部三个 CATALOG 常量 + `createInitialState()` 中的初始角色/国库。
- 改接口/类型 → 先改 `src/lib/xianxia/types.ts`,快照结构直接决定前端渲染。
- 改前端交互 → 所有按钮动作都走 `POST /api/xianxia/action` 的 action 字符串,先在路由 case 里找对应动作名。
- 验证改动 → 优先 `npm run verify-demo`(纯逻辑闭环),UI 类改动再 `npm run dev` 手测;提交前跑 `npm run build`。
