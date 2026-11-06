# 模块 M6：可验证审计中心与 AI 评委 CLI 验证套件

- **模块编号**：`M6`
- **当前状态**：⏳ 待开始 (0%)
- **核心目标**：
  1. 为人类评委与企业主提供直观的 **TEE 硬件证明 + NEP-413 签名 + NEAR Intents 预仿真回执 + NEAR Testnet 交易哈希** 审计浏览器。
  2. 为 AI 评委（Claude Code & Codex）提供一键可运行的命令行验证脚本 `npm run verify-demo` 与机器友好的 `README.md`。

---

## 1. 审计中心记录结构 (`AuditReceipt`)

每一笔经过 `IntentWork` 处理的外包验收或 API 采购（无论是放行、拦截还是待审批），都会生成一张不可篡改的结构化审计凭证：

- **基础溯源信息**：`receiptId`、时间戳、业务类型（`OUTSOURCE_BOUNTY` | `AGENT_API_402`）、任务标题。
- **NEAR AI Cloud (TEE) 证明**：`model`、`chatId`、`teeHardware`、`signingAddress`、`signature`、`injectionDetected`、`qualityScore`。
- **IntentGuard 风控轨迹**：逐条展示 `R-01` ~ `R-08` 规则的检查结果（`PASS` / `WARN` / `FAIL`）与最终决策。
- **NEAR Intents & Testnet 链上证明**：
  - `originAsset` (`nep141:wrap.testnet` / `nep141:wrap.near`) 与 `destinationAsset`（如 Solana USDC `assetId`）。
  - `1Click Quote` 详情（预计到账金额、兑换汇率、费用明细）。
  - `nep413SignedIntent`（包含公钥、签名、nonce 与 DIP-4 `simulate_intents` 预演日志）。
  - `testnetTxHash`（可在 NEAR Testnet Explorer 查看的链上交易哈希或签名回执）。

---

## 2. AI 评委一键验证脚本 (`npm run verify-demo`)

遵照 [HACKATHON.md](file:///Users/0xzxh/bytesio/near/HACKATHON.md#L58-L60) 中 *"The jury includes AI judges, so write the README for a machine reader as well as a human one... as 'do X - see Y' steps"* 的要求，提供 `scripts/verify-demo.ts`：
- 无需打开浏览器，运行 `npm run verify-demo` 即可自动执行：
  1. 连接 NEAR Testnet RPC (`https://rpc.testnet.near.org`) 并验证测试网密钥对与 NEP-413 意图签名。
  2. 连接 NEAR Intents 1Click API (`https://1click.chaindefuser.com/v0/tokens` & `/v0/quote`) 拉取真实多链资产并完成跨链 `dry: true` 报价。
  3. 自动运行外包正常交付（放行）、Prompt 注入攻击（拦截）、大额审计（转人工）及 x402 API 刺客账单（熔断）4 个核心断言测试。
  4. 在终端打印清晰的 `PASS / FAIL` 矩阵表格。

---

## 3. 模块代码文件规划

| 文件路径 | 职责说明 | 状态 |
| :--- | :--- | :--- |
| `src/lib/audit/store.ts` | 审计收据内存与本地持久化存储、查询与导出 | ⏳ 待实现 |
| `src/components/AuditExplorer.tsx` | 可验证审计日志与加密证明查验器前端视图 | ⏳ 待实现 |
| `scripts/verify-demo.ts` | 供 Claude Code & Codex 评委一键运行的端到端自动化验证脚本 | ⏳ 待实现 |
| `README.md` | 机器与人类双友好的项目主文档（含架构、赛道映射与 `Do X -> See Y` 指南） | ⏳ 待实现 |

---

## 4. 进度更新日志 (Progress Log)

- **2026-10-24**：完成 M6 审计凭证数据结构与 AI 评委自动化验证脚本规范设计。
