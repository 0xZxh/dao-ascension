# 模块 M1：NEAR Testnet 链上层与 NEAR Intents 跨链适配器

- **模块编号**：`M1`
- **当前状态**：⏳ 待开始 (0%)
- **核心目标**：在开发阶段完全基于 **NEAR Testnet (`testnet`)** 运行所有链上交互、账户管理、受限密钥与资金托管，同时无缝对接 **NEAR Intents 1Click API** 获取真实实时跨链报价与预执行仿真。

---

## 1. 为什么采用「NEAR Testnet + Intents Dry-Run 混合架构」？

根据官方 `near-intents` 文档说明：
> *"There is no testnet version of NEAR Intents - use small amounts for test swaps. `dry: true` = preview only, `dry: false` = get deposit address."*

为了保证开发阶段 **零主网资金损耗** 且 **100% 真实上链可验证**，本模块设计了双层环境适配机制（由环境变量 `NEXT_PUBLIC_NEAR_NETWORK=testnet|mainnet` 控制）：

1. **链上账户、权限密钥与托管结算层（100% 运行于 NEAR Testnet）**：
   - RPC 节点：`https://rpc.testnet.near.org`
   - 钱包登录：`@hot-labs/near-connect` 配置为 `network: "testnet"`。
   - 测试网自动水龙头账户（Dev/Judge Sandbox Account）：自动生成或使用预置的 `.testnet` 账户，在测试网上真实执行：
     - 创建 **Function Call Access Key**（限定仅可调用指定合约方法、设定 NEAR 消费限额 `allowance`）。
     - 签署 **NEP-413 标准意图消息（Signed Intent Payload）** 并进行密码学验签（`verifyNep413Signature`）。
     - 执行真实的 NEAR Testnet 赏金发放交易，返回可在 `https://testnet.nearblocks.io` 查验的真实 `txHash`。
2. **跨链汇率、路由与意图仿真层（实时对接 NEAR Intents API）**：
   - 调用 `GET https://1click.chaindefuser.com/v0/tokens` 实时拉取 NEAR Intents 支持的真实多链代币（Solana USDC、Arbitrum USDT、Base ETH、NEAR 等）。
   - 调用 `POST https://1click.chaindefuser.com/v0/quote`（开发阶段默认传入 `dry: true`），获取**真实的跨链兑换数量、手续费明细、滑点估算与预期耗时**。
   - 调用 `intents.near` 合约的 `simulate_intents` 视图方法，验证 NEP-413 签名意图结构与 DIP-4 事件日志。

---

## 2. 模块代码文件规划

| 文件路径 | 职责说明 | 状态 |
| :--- | :--- | :--- |
| `src/lib/near/config.ts` | 统一管理 `testnet` / `mainnet` 网络配置、RPC 节点、浏览器链接与 Intents API 地址 | ⏳ 待实现 |
| `src/lib/near/testnet-wallet.ts` | 封装 `near-kit` 与 `@hot-labs/near-connect`，提供测试网账户状态查询、Function Call Key 生成、NEP-413 签名与测试网交易发送 | ⏳ 待实现 |
| `src/lib/intents/client.ts` | 封装 NEAR Intents 1Click API（`/v0/tokens`、`/v0/quote` 预览与正式模式）及 `simulate_intents` RPC 预仿真 | ⏳ 待实现 |
| `src/app/api/intents/tokens/route.ts` | 获取并缓存支持的多链资产列表接口 | ⏳ 待实现 |
| `src/app/api/intents/quote/route.ts` | 跨链意图报价与预执行仿真接口 | ⏳ 待实现 |

---

## 3. 验收标准 (Acceptance Criteria)

- [ ] 在 `testnet` 模式下，可查询任意 `.testnet` 账户余额及其 Access Keys 列表（区分 Full Access 与 Function Call 权限密钥）。
- [ ] 可使用测试网密钥生成符合 NEP-413 标准的签名意图，并通过 `verifyNep413Signature` 验证通过。
- [ ] 可成功从 `1click.chaindefuser.com/v0/tokens` 拉取真实多链资产，并在 `dry: true` 模式下获取从 `NEAR` 跨链至 `Solana USDC` / `Arbitrum USDT` 的真实实时报价。
- [ ] 在测试网模式下触发赏金结算时，可生成真实的 NEAR Testnet 交易哈希或完整的 NEP-413 签名回执。

---

## 4. 进度更新日志 (Progress Log)

- **2026-10-24**：完成 M1 模块架构设计与 Testnet 混合方案技术规范编写。
