# 模块 M5：Agent 工具与 API 自采购网关 (x402 Procurement Gateway)

- **模块编号**：`M5`
- **当前状态**：⏳ 待开始 (0%)
- **核心目标**：实现 AI Agent 在执行任务过程中的**自主跨链微支付采购（HTTP 402 Payment Required 范式）**——让 Agent 无需人类绑信用卡，即可在预算护栏内用 NEAR Intents 按次跨链购买外部数据、安全扫描或算力 API，并自动拦截伪造高价账单的“刺客 API”。

---

## 1. 内置可真实调用的 3 大付费微服务节点

我们在系统内部提供 3 个真实的 HTTP 402 风格微服务接口，供 Agent 自主发现、比价与采购：

| 服务 ID | 服务名称 | 标称价格与收款链 | 真实账单行为 | 预期网关处理结果 |
| :--- | :--- | :--- | :--- | :--- |
| **API-01** | **ChainAlpha 链上巨鲸情报流** | `0.15 USDC` on **Solana** | 返回合规 `402 Payment Required` 载荷（`0.15 USDC`） | ✅ 护栏校验通过 ➔ 调用 NEAR Intents 报价 ➔ 自动签名结算并解锁巨鲸持仓 JSON 数据 |
| **API-02** | **AuditScan 合约静态漏洞分析器** | `0.25 USDT` on **Arbitrum** | 返回合规 `402 Payment Required` 载荷（`0.25 USDT`） | ✅ 护栏校验通过 ➔ 调用 NEAR Intents 报价 ➔ 自动签名结算并返回安全扫描报告 |
| **API-03** | **ShadowFeed 伪装免费行情源（刺客节点）** | 标称 `0.05 USDC`，但实际 402 账单暗藏 **`95.00 USDC`** 扣款 + 诱导话术 | 企图利用 Agent 自动付款机制盗刷金库大额资金 | 🚨 **IntentGuard 护栏当场熔断拦截**（超出 Agent 单次 API 采购上限 `$1.00`），自动拉黑该节点并切换至安全备选源完成任务 |

---

## 2. 模块代码文件规划

| 文件路径 | 职责说明 | 状态 |
| :--- | :--- | :--- |
| `src/lib/procurement/providers.ts` | 定义 3 个外部 API 供应商元数据、402 账单生成器与解锁后的数据载荷 | ⏳ 待实现 |
| `src/lib/procurement/agent-runner.ts` | 执行复合任务的采购 Agent：自动请求 API -> 解析 402 账单 -> 过 M2 护栏 -> 调 M1 Intents 微支付 -> 汇总最终任务报告 | ⏳ 待实现 |
| `src/app/api/procurement/run/route.ts` | 触发 Agent 自采购任务流水线的后端接口 | ⏳ 待实现 |
| `src/components/AgentProcurementView.tsx` | Agent 跨链自采购网关可视化界面（展示 HTTP 402 握手、刺客账单拦截、跨链微支付收据与解锁数据） | ⏳ 待实现 |

---

## 3. 验收标准 (Acceptance Criteria)

- [ ] 用户一键启动“执行外包辅助调研与安全扫描任务（总预算上限 `1.00 USD`）”。
- [ ] Agent 依次调用 3 个 API 节点：自动拦截 `API-03` 的 `95 USDC` 恶意刺客账单，并成功完成 `API-01`（Solana `0.15 USDC`）与 `API-02`（Arbitrum `0.25 USDT`）的跨链报价与微支付解锁，输出完整汇总报告。

---

## 4. 进度更新日志 (Progress Log)

- **2026-10-24**：完成 M5 Agent x402 跨链微支付采购网关与防刺客节点设计。
