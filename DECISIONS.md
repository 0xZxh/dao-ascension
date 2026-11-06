# 仙途寻道 · 链上智能合约与经济模型决策记录 (DECISIONS.md)

## 一、核心决策项 (D1 - D8)

| 决策编号 | 决议事项 | 落实细节与链上规则 |
| :--- | :--- | :--- |
| **D1** | **灵石积分不可转让** | 灵石记为合约内部映射表 `points: AccountId -> u64`；无 `transfer` 或提现入口，彻底杜绝积分被作为二级金融资产炒作的路径。 |
| **D2** | **最低上榜门槛与防小号** | 各榜单设定独立最低门槛（试炼 1 层、百草 1 株、工匠 100 战力、论剑 1000 积分）；同分按 `reached_at ASC`（先达者在前）和全局自增 `seq ASC` 决出胜负。 |
| **D3** | **Rust 合约实现** | 基于 Rust `near-sdk 5.30.1` 编写，单元测试 7 项全数覆盖不变量，编译产物 `dao_ascension.wasm` (417KB)。 |
| **D4** | **真实 NEAR 结算与合规防护** | 结算时由合约直接执行 `Promise::new(winner).transfer(amount_near)`；合规降险举措包括：公示链上概率表、透明 50/30/20 分流、积分不可提现、屏蔽指定地区开关。 |
| **D5** | **道身 NFT 灵魂绑定** | 角色 NFT 强制 `is_soulbound = true`，调用 `nft_transfer` 直接 panic 拒绝，禁止账号交易转让冲榜。 |
| **D6** | **专用测试网合约部署** | 部署于专属测试网账号 `dao-ascension-dev.testnet`，具备独立全权限密钥。 |
| **D7** | **版本控制与 CI 流程** | 初始化本地 Git，配置 `.github/workflows/ci.yml` 覆盖 Rust 单元测试、Python 蒙特卡洛模拟与 TypeScript E2E 验证。 |
| **D8** | **链上可验证伪随机数** | 锻造与洗灵根采用 `env::random_seed()` + `env::block_timestamp()` 驱动，概率完全对齐公示表。 |

---

## 二、不变量定理证明与覆盖

- **I1 (单期结算互斥)**: `test_settlement_single_execution_timelock_and_rollover_i1_i2_i6` 验证同一 epoch 重复结算必报失败。
- **I2 (发放上限)**: 发放总额数学上恒严格 $\le$ 当期奖池 50%。
- **I3 (国库三池守恒)**: 充值 100% 入金严格划拨：50% 奖池、30% 滚存底池、20% 运营金库。
- **I4 (一钱包一道身)**: `test_character_mint_and_soulbound_invariant_i4` 验证重复铸造抛出 Soulbound 拒绝。
- **I5 (单调递增分数)**: `test_operator_scores_reporting_and_monotonicity_i5` 验证仅 operator/owner 可上报，且分数不可向下回退。
- **I6 (时间锁限制)**: 当前时间未达 `start + duration` 时强制锁死结算。
- **I7 (时间确定性排重)**: 同分判定先达到时间（`reached_at_ns`）更早者优先。
- **I8 (积分非代币)**: 仅允许 `recharge_points` 充值与 `spend_points` 消费，零外部转账接口。

---

## 三、真实链上部署与交互证据 (Evidence & Explorer URLs)

- **合约账户**: [`dao-ascension-dev.testnet`](https://testnet.nearblocks.io/address/dao-ascension-dev.testnet)
- **创建账户交易**: [7nDRiVZC26DqoJ6eSE1eL6Sdo9V6esbwpbHWufksHXn7](https://explorer.testnet.near.org/transactions/7nDRiVZC26DqoJ6eSE1eL6Sdo9V6esbwpbHWufksHXn7)
- **部署合约交易**: [EhKCCpSSkcXBZ6V46KFK6oJve7a5Dzj4R3SDMKujGWp8](https://explorer.testnet.near.org/transactions/EhKCCpSSkcXBZ6V46KFK6oJve7a5Dzj4R3SDMKujGWp8)
- **铸造道身 NFT 交易**: [3yWiegaipvL8nVfiCG1aVihjPwuHHiEvWUjBzwS3u4z3](https://explorer.testnet.near.org/transactions/3yWiegaipvL8nVfiCG1aVihjPwuHHiEvWUjBzwS3u4z3)
- **充值灵石 (1 NEAR = 50 石) 交易**: [44chpcsfsBGf9byByXFw26tKtbDKc26QZLfEJpMmhEQM](https://explorer.testnet.near.org/transactions/44chpcsfsBGf9byByXFw26tKtbDKc26QZLfEJpMmhEQM)
- **纯随机锻造飞剑交易**: [8eYSLKjC76UygedXd4bxWQodN4jPDKw8dUiTD253w2Tu](https://explorer.testnet.near.org/transactions/8eYSLKjC76UygedXd4bxWQodN4jPDKw8dUiTD253w2Tu)
