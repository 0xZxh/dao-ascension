# 模块 M2：IntentGuard 确定性安全护栏与策略引擎

- **模块编号**：`M2`
- **当前状态**：⏳ 待开始 (0%)
- **核心目标**：构建一个**纯确定性（Deterministic TypeScript，绝不依赖 LLM 自觉）**的资金防火墙与策略引擎，确保即使 AI Agent 遭遇 Prompt 注入或产生幻觉，也无法突破人类设定的消费限额、目标链白名单与滑点安全边界。

---

## 1. 核心风控规则矩阵 (Policy Rules Matrix)

| 规则编号 | 规则名称 | 检查逻辑 | 触发后动作 |
| :--- | :--- | :--- | :--- |
| **R-01** | **Prompt 注入与劫持熔断 (`INJECTION_LOCK`)** | 检查上游 TEE 审计器输出的 `injectionDetected` 标志，以及确定性正则/特征扫描（如尝试覆盖系统指令、篡改收款地址指令） | 🚨 **立即阻断 (`BLOCKED`)**，记录安全事件并冻结该笔请求 |
| **R-02** | **单笔硬上限 (`MAX_SINGLE_TX`)** | 校验请求折合 USD 金额是否超过单笔硬上限（如 `> $100`） | 🚨 **立即阻断 (`BLOCKED`)** |
| **R-03** | **自动放行阈值与人工审批 (`HUMAN_APPROVAL_THRESHOLD`)** | 若金额在 `(自动放行线 $30, 单笔硬上限 $100]` 区间内 | 🟡 **挂起转人工审批 (`PENDING_APPROVAL`)**，需人类雇主点击批准后才签名放行 |
| **R-04** | **24 小时滚动累计限额 (`DAILY_SPEND_CAP`)** | 统计过去 24 小时已执行金额 + 本次请求金额是否超过日限额（如 `$200/天`） | 🚨 **立即阻断 (`BLOCKED`)** 或转人工审批 |
| **R-05** | **目标链与资产白名单 (`CHAIN_ASSET_ALLOWLIST`)** | 校验收款目标链（如仅允许 `near`, `sol`, `arb`, `base`）与代币是否在企业白名单内 | 🚨 **立即阻断 (`BLOCKED`)** |
| **R-06** | **收款地址格式与黑名单校验 (`RECIPIENT_SANITY`)** | 校验目标链地址格式合法性，并比对已知钓鱼/攻击者黑名单地址库 | 🚨 **立即阻断 (`BLOCKED`)** |
| **R-07** | **跨链滑点与损耗上限 (`MAX_SLIPPAGE_BPS`)** | 基于 `NEAR Intents 1Click Quote` 预仿真结果，核算实际到手价值损耗是否超过阈值（如 `> 150 bps / 1.5%`） | 🚨 **立即阻断 (`BLOCKED`)**，防止流动性枯竭导致资金蒸发 |
| **R-08** | **Function Call Key 权限校验 (`ACCESS_KEY_SCOPE`)** | 校验当前 Agent 持有的 NEAR Testnet Function Call Key 剩余 `allowance` 及允许调用的合约方法 | 🚨 **立即阻断 (`BLOCKED`)** |

---

## 2. 模块代码文件规划

| 文件路径 | 职责说明 | 状态 |
| :--- | :--- | :--- |
| `src/lib/policy/types.ts` | 定义安全策略配置 (`PolicyConfig`)、评估上下文 (`EvaluationContext`) 与风控决策结果 (`PolicyDecision`) | ⏳ 待实现 |
| `src/lib/policy/engine.ts` | 核心确定性规则评估器（逐条执行 R-01 ~ R-08，返回详细规则命中轨迹与耗时） | ⏳ 待实现 |
| `src/lib/policy/store.ts` | 策略状态存储、24 小时支出账本与待人工审批队列管理 | ⏳ 待实现 |
| `src/app/api/policy/route.ts` | 查看/更新安全策略配置及处理人工审批（Approve / Reject）的 REST 接口 | ⏳ 待实现 |

---

## 3. 验收标准 (Acceptance Criteria)

- [ ] 合规小额请求（如 `15 USDC` 至 `Solana` 白名单链，无注入风险）返回 `ALLOWED` 并附带全部 8 项规则通过绿灯记录。
- [ ] 包含恶意 Prompt 注入或黑名单地址的请求，毫秒级返回 `BLOCKED` 并精准指出命中的规则编号（如 `R-01` / `R-06`）。
- [ ] 金额处于人工复核区间的请求（如 `80 USDC`），返回 `PENDING_APPROVAL`，并在人类点击批准后能够继续触发 NEAR Intents 跨链结算。

---

## 4. 进度更新日志 (Progress Log)

- **2026-10-24**：完成 M2 安全护栏 8 大核心风控规则设计与接口规范定义。
