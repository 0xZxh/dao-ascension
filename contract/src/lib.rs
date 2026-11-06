use near_sdk::near;
use near_sdk::store::LookupMap;
use near_sdk::{env, require, AccountId, NearToken, Promise};

pub mod types;
use types::*;

#[near(contract_state)]
pub struct DaoAscensionContract {
    pub owner_id: AccountId,
    pub operator_id: AccountId,
    pub characters: LookupMap<AccountId, CharacterMeta>,
    pub points: LookupMap<AccountId, u64>,
    pub current_epoch_id: u64,
    pub epoch_start_time_ns: u64,
    pub epoch_duration_ns: u64,
    pub min_scores: LookupMap<BoardType, u64>,
    pub leaderboards: LookupMap<(u64, BoardType), Vec<LeaderboardEntry>>,
    pub epoch_settlements: LookupMap<u64, EpochSettlementRecord>,
    pub treasury_active_pool: NearToken,
    pub treasury_reserve_pool: NearToken,
    pub treasury_dev_ops_pool: NearToken,
    pub total_near_recharged: NearToken,
    pub seq_counter: u64,
    pub spirit_stones_per_near: u64,
    pub reshape_fee_near: NearToken,
    pub reshape_fee_points: u64,
    pub roll_root_fee_near: NearToken,
    pub forge_fee_points: u64,
}

impl Default for DaoAscensionContract {
    fn default() -> Self {
        let default_acc: AccountId = "dao-ascension.testnet".parse().unwrap();
        let now = env::block_timestamp();
        let mut min_scores = LookupMap::new(b"m");
        min_scores.insert(BoardType::Slayer, 1);
        min_scores.insert(BoardType::Alchemy, 1);
        min_scores.insert(BoardType::Blacksmith, 100);
        min_scores.insert(BoardType::Duel, 1000);

        Self {
            owner_id: default_acc.clone(),
            operator_id: default_acc,
            characters: LookupMap::new(b"c"),
            points: LookupMap::new(b"p"),
            current_epoch_id: 1,
            epoch_start_time_ns: now,
            epoch_duration_ns: 7 * 24 * 3600 * 1_000_000_000, // 7 days in ns
            min_scores,
            leaderboards: LookupMap::new(b"l"),
            epoch_settlements: LookupMap::new(b"s"),
            treasury_active_pool: NearToken::from_near(0),
            treasury_reserve_pool: NearToken::from_near(0),
            treasury_dev_ops_pool: NearToken::from_near(0),
            total_near_recharged: NearToken::from_near(0),
            seq_counter: 0,
            spirit_stones_per_near: 50,
            reshape_fee_near: NearToken::from_yoctonear(500_000_000_000_000_000_000_000), // 0.5 NEAR
            reshape_fee_points: 200,
            roll_root_fee_near: NearToken::from_yoctonear(100_000_000_000_000_000_000_000), // 0.1 NEAR
            forge_fee_points: 50,
        }
    }
}

#[near]
impl DaoAscensionContract {
    #[init]
    pub fn new(
        owner_id: AccountId,
        operator_id: AccountId,
        epoch_duration_ns: Option<u64>,
    ) -> Self {
        require!(!env::state_exists(), "Already initialized");
        let now = env::block_timestamp();
        let mut min_scores = LookupMap::new(b"m");
        min_scores.insert(BoardType::Slayer, 1);
        min_scores.insert(BoardType::Alchemy, 1);
        min_scores.insert(BoardType::Blacksmith, 100);
        min_scores.insert(BoardType::Duel, 1000);

        Self {
            owner_id,
            operator_id,
            characters: LookupMap::new(b"c"),
            points: LookupMap::new(b"p"),
            current_epoch_id: 1,
            epoch_start_time_ns: now,
            epoch_duration_ns: epoch_duration_ns.unwrap_or(7 * 24 * 3600 * 1_000_000_000),
            min_scores,
            leaderboards: LookupMap::new(b"l"),
            epoch_settlements: LookupMap::new(b"s"),
            treasury_active_pool: NearToken::from_near(0),
            treasury_reserve_pool: NearToken::from_near(0),
            treasury_dev_ops_pool: NearToken::from_near(0),
            total_near_recharged: NearToken::from_near(0),
            seq_counter: 0,
            spirit_stones_per_near: 50,
            reshape_fee_near: NearToken::from_yoctonear(500_000_000_000_000_000_000_000),
            reshape_fee_points: 200,
            roll_root_fee_near: NearToken::from_yoctonear(100_000_000_000_000_000_000_000),
            forge_fee_points: 50,
        }
    }

    // =========================================================================
    // 1. Character NFT (Soulbound NEP-171/177 view compatible)
    // =========================================================================

    #[payable]
    pub fn mint_character(
        &mut self,
        dao_name: String,
        avatar_class: String,
        spirit_root: Option<String>,
    ) -> CharacterMeta {
        let caller = env::predecessor_account_id();
        require!(
            self.characters.get(&caller).is_none(),
            "Soulbound violation: Each wallet may only bind 1 cultivator character (I4)"
        );
        require!(!dao_name.trim().is_empty(), "Dao name cannot be empty");

        let deposit = env::attached_deposit();
        if deposit.as_yoctonear() > 0 {
            self.distribute_treasury_split(deposit);
        }

        let now = env::block_timestamp();
        let meta = CharacterMeta {
            token_id: format!("cultivator-nft:{}", caller),
            owner_id: caller.clone(),
            dao_name: dao_name.trim().to_string(),
            avatar_class: avatar_class.trim().to_string(),
            spirit_root: spirit_root.unwrap_or_else(|| "凡品 · 五行凡脉杂灵根".to_string()),
            minted_at_ns: now,
            reshaped_at_ns: now,
            is_soulbound: true,
        };

        self.characters.insert(caller, meta.clone());
        meta
    }

    #[payable]
    pub fn reshape_dao_body(
        &mut self,
        new_dao_name: String,
        new_avatar_class: String,
        payment_method: String,
    ) -> CharacterMeta {
        let caller = env::predecessor_account_id();
        let mut char_meta = self
            .characters
            .get(&caller)
            .cloned()
            .expect("No cultivator character found to reshape");

        if payment_method.to_uppercase() == "NEAR" {
            let deposit = env::attached_deposit();
            require!(
                deposit.as_yoctonear() >= self.reshape_fee_near.as_yoctonear(),
                "Insufficient attached NEAR for reshape fee (0.5 NEAR required)"
            );
            self.distribute_treasury_split(deposit);
        } else {
            // Pay via Spirit Stone points (200 points)
            let caller_points = self.points.get(&caller).copied().unwrap_or(0);
            require!(
                caller_points >= self.reshape_fee_points,
                "Insufficient spirit stone points (200 stones required)"
            );
            self.points
                .insert(caller.clone(), caller_points - self.reshape_fee_points);
        }

        char_meta.dao_name = new_dao_name.trim().to_string();
        char_meta.avatar_class = new_avatar_class.trim().to_string();
        char_meta.reshaped_at_ns = env::block_timestamp();

        self.characters.insert(caller, char_meta.clone());
        char_meta
    }

    #[payable]
    pub fn roll_spirit_root(&mut self) -> String {
        let caller = env::predecessor_account_id();
        let mut char_meta = self
            .characters
            .get(&caller)
            .cloned()
            .expect("No cultivator character found");

        let deposit = env::attached_deposit();
        require!(
            deposit.as_yoctonear() >= self.roll_root_fee_near.as_yoctonear(),
            "Insufficient deposit for spirit root washing (0.1 NEAR required)"
        );
        self.distribute_treasury_split(deposit);

        // On-chain verifiable pseudo-random roll
        let seed = env::random_seed();
        let now = env::block_timestamp();
        let roll_seed = ((seed[0] as u64) ^ (now & 0xFF) ^ ((seed[7] as u64) << 2)) % 100;

        let new_root = match roll_seed {
            99 => "仙品 · 太初星辰剑灵根 (HP+25%, ATK+25%)".to_string(),
            94..=98 => "天品 · 九天玄霄雷灵根 (HP+15%, ATK+15%)".to_string(),
            80..=93 => "地品 · 乾坤造化纯阳根 (HP+10%, ATK+5%)".to_string(),
            50..=79 => "玄品 · 厚土固本灵根 (HP+5%, ATK+0%)".to_string(),
            _ => "凡品 · 五行凡脉杂灵根 (HP+0%, ATK+0%)".to_string(),
        };

        char_meta.spirit_root = new_root.clone();
        char_meta.reshaped_at_ns = env::block_timestamp();
        self.characters.insert(caller, char_meta);

        new_root
    }

    pub fn nft_transfer(&mut self) {
        env::panic_str("Soulbound: transfer forbidden (Characters are bound to soul wallet)");
    }

    // =========================================================================
    // 2. Spirit Stone Points (D1: Non-transferable internal score)
    // =========================================================================

    #[payable]
    pub fn recharge_points(&mut self) -> u64 {
        let caller = env::predecessor_account_id();
        let deposit = env::attached_deposit();
        let yocto = deposit.as_yoctonear();
        require!(
            yocto >= 20_000_000_000_000_000_000_000, // 0.02 NEAR = 1 stone
            "Minimum recharge is 0.02 NEAR (1 stone)"
        );

        let stones_gained = (yocto * (self.spirit_stones_per_near as u128))
            / 1_000_000_000_000_000_000_000_000;
        require!(stones_gained > 0, "Recharge resulted in 0 spirit stones");

        let current_stones = self.points.get(&caller).copied().unwrap_or(0);
        let new_stones = current_stones + (stones_gained as u64);
        self.points.insert(caller, new_stones);

        self.distribute_treasury_split(deposit);
        self.total_near_recharged =
            NearToken::from_yoctonear(self.total_near_recharged.as_yoctonear() + yocto);

        new_stones
    }

    pub fn spend_points(&mut self, amount: u64, reason: String) -> u64 {
        let caller = env::predecessor_account_id();
        let current_stones = self.points.get(&caller).copied().unwrap_or(0);
        require!(
            current_stones >= amount,
            "Insufficient spirit stones to spend"
        );
        require!(!reason.is_empty(), "Reason required");

        let updated = current_stones - amount;
        self.points.insert(caller, updated);
        updated
    }

    // =========================================================================
    // 3. Forging with Public Odds & Randomness (D8)
    // =========================================================================

    #[payable]
    pub fn forge_artifact(&mut self, seed_prefix: Option<String>) -> ForgeItem {
        let caller = env::predecessor_account_id();
        let deposit = env::attached_deposit();

        if deposit.as_yoctonear() >= 50_000_000_000_000_000_000_000 {
            // 0.05 NEAR
            self.distribute_treasury_split(deposit);
        } else {
            let current = self.points.get(&caller).copied().unwrap_or(0);
            require!(
                current >= self.forge_fee_points,
                "Need 50 spirit stones or 0.05 NEAR to forge artifact"
            );
            self.points
                .insert(caller.clone(), current - self.forge_fee_points);
        }

        let seed = env::random_seed();
        let now = env::block_timestamp();
        let roll = ((seed[1] as u64) ^ ((now >> 4) & 0xFF) ^ ((seed[5] as u64) << 3)) % 100;

        let (rarity, atk_min, atk_max, name) = match roll {
            99 => (
                ForgeRarity::Heaven,
                260,
                350,
                "太乙分光诛仙剑 [天品灵宝 · 混沌初开 · 寂灭]".to_string(),
            ),
            94..=98 => (
                ForgeRarity::Earth,
                160,
                240,
                "青霄游龙剑 [地品灵宝 · 千锤百炼 · 破军]".to_string(),
            ),
            80..=93 => (
                ForgeRarity::Mystic,
                105,
                150,
                "玄铁寒光剑 [玄品灵兵 · 精金淬炼 · 穿云]".to_string(),
            ),
            50..=79 => (
                ForgeRarity::Spiritual,
                65,
                95,
                "精钢流光剑 [灵品法剑 · 灵液开刃 · 斩风]".to_string(),
            ),
            _ => (
                ForgeRarity::Ordinary,
                35,
                60,
                "百炼青锋剑 [凡品灵兵 · 百炼精铁 · 凌风]".to_string(),
            ),
        };

        let atk_spread = atk_max - atk_min + 1;
        let atk_offset = (((seed[2] as u32) + (now as u32)) % atk_spread) as u32;
        let atk_bonus = atk_min + atk_offset;

        ForgeItem {
            name,
            rarity,
            atk_bonus,
            prefix: seed_prefix.unwrap_or_else(|| "XIANXIA".to_string()),
            seed_hash: format!("{:02x}{:02x}{:02x}", seed[0], seed[1], seed[2]),
        }
    }

    // =========================================================================
    // 4. Operator Score Reporting (Monotonic Increases with Timestamp & Seq I5, I7)
    // =========================================================================

    pub fn report_scores(&mut self, epoch_id: u64, entries: Vec<(AccountId, BoardType, u64)>) {
        let caller = env::predecessor_account_id();
        require!(
            caller == self.operator_id || caller == self.owner_id,
            "Only operator or owner can report official leaderboard scores (I5)"
        );
        require!(
            epoch_id == self.current_epoch_id,
            "Scores can only be reported for active epoch"
        );

        let now = env::block_timestamp();
        for (account, board, score) in entries {
            let min_required = self.min_scores.get(&board).copied().unwrap_or(0);
            if score < min_required {
                continue; // Do not register scores that do not meet min criteria
            }

            let key = (epoch_id, board);
            let mut board_entries = self.leaderboards.get(&key).cloned().unwrap_or_default();

            if let Some(existing) = board_entries.iter_mut().find(|e| e.account_id == account) {
                require!(
                    score >= existing.score,
                    "Monotonic score invariant violation: score cannot decrease (I5)"
                );
                if score > existing.score {
                    existing.score = score;
                    existing.reached_at_ns = now;
                    self.seq_counter += 1;
                    existing.seq = self.seq_counter;
                }
            } else {
                self.seq_counter += 1;
                board_entries.push(LeaderboardEntry {
                    account_id: account,
                    score,
                    reached_at_ns: now,
                    seq: self.seq_counter,
                });
            }

            self.leaderboards.insert(key, board_entries);
        }
    }

    // =========================================================================
    // 5. Weekly Settlement (I1 strictly once per epoch, real NEAR transfers D4)
    // =========================================================================

    pub fn settle(&mut self, epoch_id: u64) -> EpochSettlementRecord {
        let caller = env::predecessor_account_id();
        require!(
            epoch_id == self.current_epoch_id,
            "Can only settle current active epoch"
        );
        require!(
            self.epoch_settlements.get(&epoch_id).is_none(),
            "Epoch already settled (I1: single execution per epoch)"
        );

        let now = env::block_timestamp();
        let epoch_end = self.epoch_start_time_ns + self.epoch_duration_ns;
        require!(
            now >= epoch_end,
            "Cannot settle epoch before duration concludes (I6)"
        );

        let pool = self.treasury_active_pool;
        let pool_yocto = pool.as_yoctonear();

        let mut all_winners: Vec<WinnerPayout> = Vec::new();
        let mut total_payout_yocto: u128 = 0;

        let boards = [
            (BoardType::Slayer, 30u128),     // 30% of active pool
            (BoardType::Duel, 30u128),       // 30% of active pool
            (BoardType::Alchemy, 20u128),    // 20% of active pool
            (BoardType::Blacksmith, 20u128), // 20% of active pool
        ];

        for (board, board_share_pct) in boards {
            let board_pool_yocto = (pool_yocto * board_share_pct) / 100;
            let key = (epoch_id, board);
            let mut entries = self.leaderboards.get(&key).cloned().unwrap_or_default();

            // Filter by min score
            let min_s = self.min_scores.get(&board).copied().unwrap_or(0);
            entries.retain(|e| e.score >= min_s);

            // Sort: score DESC, reached_at_ns ASC (first to achieve wins tie), seq ASC
            entries.sort_by(|a, b| {
                b.score
                    .cmp(&a.score)
                    .then_with(|| a.reached_at_ns.cmp(&b.reached_at_ns))
                    .then_with(|| a.seq.cmp(&b.seq))
            });

            let num_winners = entries.len().min(4);
            if num_winners == 0 {
                continue; // No qualified cultivators: unawarded funds roll over
            }

            let splits: Vec<u8> = match num_winners {
                1 => vec![100],
                2 => vec![65, 35],
                3 => vec![50, 30, 20],
                _ => vec![50, 25, 15, 10],
            };

            for (i, entry) in entries.iter().take(num_winners).enumerate() {
                let share_pct = splits[i];
                let payout_yocto = (board_pool_yocto * (share_pct as u128)) / 100;
                if payout_yocto > 0 {
                    let payout_token = NearToken::from_yoctonear(payout_yocto);
                    // Real on-chain transfer to winner (D4)
                    let _ = Promise::new(entry.account_id.clone()).transfer(payout_token);
                    total_payout_yocto += payout_yocto;

                    all_winners.push(WinnerPayout {
                        board,
                        account_id: entry.account_id.clone(),
                        rank: (i + 1) as u8,
                        score: entry.score,
                        share_pct,
                        amount_near: payout_token,
                        paid: true,
                    });
                }
            }
        }

        let rolled_over_yocto = pool_yocto.saturating_sub(total_payout_yocto);
        let record = EpochSettlementRecord {
            epoch_id,
            settled_at_ns: now,
            settled_by: caller,
            winners: all_winners,
            total_payout_near: NearToken::from_yoctonear(total_payout_yocto),
            rolled_over_near: NearToken::from_yoctonear(rolled_over_yocto),
        };

        self.epoch_settlements.insert(epoch_id, record.clone());

        // Advance to next epoch:
        // New active pool = rollover + 30% drawn from reserve pool
        let reserve_draw_yocto = (self.treasury_reserve_pool.as_yoctonear() * 30) / 100;
        self.treasury_reserve_pool = NearToken::from_yoctonear(
            self.treasury_reserve_pool
                .as_yoctonear()
                .saturating_sub(reserve_draw_yocto),
        );
        self.treasury_active_pool =
            NearToken::from_yoctonear(rolled_over_yocto + reserve_draw_yocto);

        self.current_epoch_id += 1;
        self.epoch_start_time_ns = now;

        record
    }

    // =========================================================================
    // 6. View Methods
    // =========================================================================

    pub fn get_character(&self, account_id: AccountId) -> Option<CharacterMeta> {
        self.characters.get(&account_id).cloned()
    }

    pub fn nft_token(&self, token_id: String) -> Option<CharacterMeta> {
        let prefix = "cultivator-nft:";
        if token_id.starts_with(prefix) {
            let acc_str = &token_id[prefix.len()..];
            if let Ok(acc) = acc_str.parse::<AccountId>() {
                return self.characters.get(&acc).cloned();
            }
        }
        None
    }

    pub fn nft_tokens_for_owner(&self, account_id: AccountId) -> Vec<CharacterMeta> {
        self.characters
            .get(&account_id)
            .cloned()
            .map(|c| vec![c])
            .unwrap_or_default()
    }

    pub fn get_points(&self, account_id: AccountId) -> u64 {
        self.points.get(&account_id).copied().unwrap_or(0)
    }

    pub fn get_board(&self, epoch_id: u64, board: BoardType) -> Vec<LeaderboardEntry> {
        let key = (epoch_id, board);
        let mut entries = self.leaderboards.get(&key).cloned().unwrap_or_default();
        let min_s = self.min_scores.get(&board).copied().unwrap_or(0);
        entries.retain(|e| e.score >= min_s);
        entries.sort_by(|a, b| {
            b.score
                .cmp(&a.score)
                .then_with(|| a.reached_at_ns.cmp(&b.reached_at_ns))
                .then_with(|| a.seq.cmp(&b.seq))
        });
        entries
    }

    pub fn get_treasury_snapshot(&self) -> TreasurySnapshot {
        TreasurySnapshot {
            active_pool_near: self.treasury_active_pool,
            reserve_pool_near: self.treasury_reserve_pool,
            dev_ops_pool_near: self.treasury_dev_ops_pool,
            total_recharged_near: self.total_near_recharged,
        }
    }

    pub fn get_epoch_info(&self, epoch_id: u64) -> EpochInfo {
        let (start, settled, pool) = if epoch_id == self.current_epoch_id {
            (
                self.epoch_start_time_ns,
                false,
                self.treasury_active_pool,
            )
        } else if let Some(rec) = self.epoch_settlements.get(&epoch_id) {
            (
                rec.settled_at_ns.saturating_sub(self.epoch_duration_ns),
                true,
                rec.total_payout_near,
            )
        } else {
            (0, false, NearToken::from_near(0))
        };

        EpochInfo {
            epoch_id,
            start_time_ns: start,
            end_time_ns: start + self.epoch_duration_ns,
            settled,
            active_reward_pool_near: pool,
        }
    }

    pub fn get_settlement(&self, epoch_id: u64) -> Option<EpochSettlementRecord> {
        self.epoch_settlements.get(&epoch_id).cloned()
    }

    pub fn get_odds(&self) -> PublicOdds {
        PublicOdds {
            forge_ordinary_pct: 50,
            forge_spiritual_pct: 30,
            forge_mystic_pct: 14,
            forge_earth_pct: 5,
            forge_heaven_pct: 1,
            root_common_pct: 50,
            root_mystic_pct: 30,
            root_earth_pct: 14,
            root_heaven_pct: 5,
            root_immortal_pct: 1,
        }
    }

    pub fn get_config(&self) -> ContractConfig {
        let boards = [
            BoardType::Slayer,
            BoardType::Alchemy,
            BoardType::Blacksmith,
            BoardType::Duel,
        ];
        let min_scores = boards
            .iter()
            .map(|&b| (b, self.min_scores.get(&b).copied().unwrap_or(0)))
            .collect();

        ContractConfig {
            owner_id: self.owner_id.clone(),
            operator_id: self.operator_id.clone(),
            spirit_stones_per_near: self.spirit_stones_per_near,
            reshape_fee_near: self.reshape_fee_near,
            reshape_fee_points: self.reshape_fee_points,
            roll_root_fee_near: self.roll_root_fee_near,
            min_scores,
            epoch_duration_ns: self.epoch_duration_ns,
        }
    }

    // =========================================================================
    // Helper: Treasury 50/30/20 Inflow Allocation
    // =========================================================================

    fn distribute_treasury_split(&mut self, deposit: NearToken) {
        let yocto = deposit.as_yoctonear();
        let active_yocto = (yocto * 50) / 100;
        let reserve_yocto = (yocto * 30) / 100;
        let dev_ops_yocto = yocto.saturating_sub(active_yocto + reserve_yocto);

        self.treasury_active_pool = NearToken::from_yoctonear(
            self.treasury_active_pool.as_yoctonear() + active_yocto,
        );
        self.treasury_reserve_pool = NearToken::from_yoctonear(
            self.treasury_reserve_pool.as_yoctonear() + reserve_yocto,
        );
        self.treasury_dev_ops_pool = NearToken::from_yoctonear(
            self.treasury_dev_ops_pool.as_yoctonear() + dev_ops_yocto,
        );
    }
}

// =============================================================================
// Unit Tests Verifying Invariants I1 - I8 and Core Game Rules
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn setup_context(predecessor: &str, deposit: NearToken, timestamp_ns: u64) {
        let mut builder = VMContextBuilder::new();
        builder
            .predecessor_account_id(predecessor.parse().unwrap())
            .attached_deposit(deposit)
            .block_timestamp(timestamp_ns)
            .random_seed([7u8; 32]);
        testing_env!(builder.build());
    }

    #[test]
    fn test_character_mint_and_soulbound_invariant_i4() {
        let owner: AccountId = "owner.near".parse().unwrap();
        let operator: AccountId = "operator.near".parse().unwrap();
        setup_context("owner.near", NearToken::from_near(0), 1_000_000_000);
        let mut contract = DaoAscensionContract::new(owner, operator, None);

        // 1. First mint succeeds
        setup_context("alice.near", NearToken::from_near(0), 1_000_000_000);
        let meta = contract.mint_character(
            "太清仙子".to_string(),
            "saintess".to_string(),
            None,
        );
        assert_eq!(meta.dao_name, "太清仙子");
        assert_eq!(meta.owner_id.as_str(), "alice.near");
        assert!(meta.is_soulbound);
        assert_eq!(meta.token_id, "cultivator-nft:alice.near");

        // 2. View functions return correct data
        let fetched = contract.get_character("alice.near".parse().unwrap()).unwrap();
        assert_eq!(fetched.dao_name, "太清仙子");
        let nft = contract.nft_token("cultivator-nft:alice.near".to_string()).unwrap();
        assert_eq!(nft.dao_name, "太清仙子");

        // 3. Second mint for same wallet must panic (I4)
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.mint_character("重塑者".to_string(), "swordsman".to_string(), None);
        }));
        assert!(result.is_err(), "Duplicate character minting must fail (I4)");
    }

    #[test]
    fn test_soulbound_transfer_forbidden() {
        setup_context("alice.near", NearToken::from_near(0), 1_000_000_000);
        let mut contract = DaoAscensionContract::default();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.nft_transfer();
        }));
        assert!(result.is_err(), "Soulbound transfer must be forbidden");
    }

    #[test]
    fn test_points_recharge_spend_and_treasury_split_d1_i8() {
        let owner: AccountId = "owner.near".parse().unwrap();
        let operator: AccountId = "operator.near".parse().unwrap();
        setup_context("owner.near", NearToken::from_near(0), 1_000_000_000);
        let mut contract = DaoAscensionContract::new(owner, operator, None);

        // Recharge 2 NEAR -> 100 Spirit Stones (D1)
        setup_context("alice.near", NearToken::from_near(2), 1_000_000_000);
        let stones = contract.recharge_points();
        assert_eq!(stones, 100);
        assert_eq!(contract.get_points("alice.near".parse().unwrap()), 100);

        // Check Treasury 50/30/20 split
        let treasury = contract.get_treasury_snapshot();
        assert_eq!(treasury.active_pool_near, NearToken::from_near(1)); // 50%
        assert_eq!(
            treasury.reserve_pool_near,
            NearToken::from_yoctonear(600_000_000_000_000_000_000_000)
        ); // 30% = 0.6 NEAR
        assert_eq!(
            treasury.dev_ops_pool_near,
            NearToken::from_yoctonear(400_000_000_000_000_000_000_000)
        ); // 20% = 0.4 NEAR

        // Spend 30 stones on herbs
        setup_context("alice.near", NearToken::from_near(0), 1_000_000_000);
        let remaining = contract.spend_points(30, "seed_tier_2".to_string());
        assert_eq!(remaining, 70);
        assert_eq!(contract.get_points("alice.near".parse().unwrap()), 70);
    }

    #[test]
    fn test_operator_scores_reporting_and_monotonicity_i5() {
        let owner: AccountId = "owner.near".parse().unwrap();
        let operator: AccountId = "operator.near".parse().unwrap();
        setup_context("owner.near", NearToken::from_near(0), 1_000_000_000);
        let mut contract = DaoAscensionContract::new(owner, operator, None);

        // Unauthorized user attempts to report scores -> must panic (I5)
        setup_context("attacker.near", NearToken::from_near(0), 1_000_000_000);
        let unauthorized = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.report_scores(
                1,
                vec![("alice.near".parse().unwrap(), BoardType::Slayer, 5)],
            );
        }));
        assert!(unauthorized.is_err(), "Unauthorized score reporting must fail (I5)");

        // Authorized operator reports scores
        setup_context("operator.near", NearToken::from_near(0), 1_000_000_000);
        contract.report_scores(
            1,
            vec![
                ("alice.near".parse().unwrap(), BoardType::Slayer, 5),
                ("bob.near".parse().unwrap(), BoardType::Slayer, 3),
            ],
        );

        let board = contract.get_board(1, BoardType::Slayer);
        assert_eq!(board.len(), 2);
        assert_eq!(board[0].account_id.as_str(), "alice.near");
        assert_eq!(board[0].score, 5);
        assert_eq!(board[1].account_id.as_str(), "bob.near");
        assert_eq!(board[1].score, 3);

        // Monotonic decrease attempt -> must panic (I5)
        let decrease_attempt = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.report_scores(
                1,
                vec![("alice.near".parse().unwrap(), BoardType::Slayer, 4)],
            );
        }));
        assert!(
            decrease_attempt.is_err(),
            "Score monotonic decrease must fail (I5)"
        );
    }

    #[test]
    fn test_min_score_filter_and_tie_breaking_d2_i7() {
        let owner: AccountId = "owner.near".parse().unwrap();
        let operator: AccountId = "operator.near".parse().unwrap();
        setup_context("owner.near", NearToken::from_near(0), 1_000_000_000);
        let mut contract = DaoAscensionContract::new(owner, operator, None);

        // Min score for Slayer is 1. Score of 0 should be filtered out!
        setup_context("operator.near", NearToken::from_near(0), 1_000_000_000);
        contract.report_scores(
            1,
            vec![
                ("zero.near".parse().unwrap(), BoardType::Slayer, 0),
                ("alice.near".parse().unwrap(), BoardType::Slayer, 10),
            ],
        );
        let board = contract.get_board(1, BoardType::Slayer);
        assert_eq!(board.len(), 1, "Score below min_score must be excluded");
        assert_eq!(board[0].account_id.as_str(), "alice.near");

        // Tie-breaker: Bob reaches score 10 LATER than Alice (at t = 2_000_000_000)
        setup_context("operator.near", NearToken::from_near(0), 2_000_000_000);
        contract.report_scores(
            1,
            vec![("bob.near".parse().unwrap(), BoardType::Slayer, 10)],
        );
        let board_after = contract.get_board(1, BoardType::Slayer);
        assert_eq!(board_after.len(), 2);
        // Alice reached 10 at t=1s, Bob reached 10 at t=2s -> Alice remains #1! (I7)
        assert_eq!(board_after[0].account_id.as_str(), "alice.near");
        assert_eq!(board_after[1].account_id.as_str(), "bob.near");
    }

    #[test]
    fn test_settlement_single_execution_timelock_and_rollover_i1_i2_i6() {
        let owner: AccountId = "owner.near".parse().unwrap();
        let operator: AccountId = "operator.near".parse().unwrap();
        let epoch_duration = 600 * 1_000_000_000; // 10 minutes in ns
        setup_context("owner.near", NearToken::from_near(0), 1_000_000_000);
        let mut contract = DaoAscensionContract::new(owner, operator, Some(epoch_duration));

        // Alice recharges 10 NEAR -> Active pool gets 5 NEAR (50%)
        setup_context("alice.near", NearToken::from_near(10), 1_000_000_000);
        contract.recharge_points();

        // Operator reports scores for Slayer
        setup_context("operator.near", NearToken::from_near(0), 1_000_000_000);
        contract.report_scores(
            1,
            vec![
                ("alice.near".parse().unwrap(), BoardType::Slayer, 5),
                ("bob.near".parse().unwrap(), BoardType::Slayer, 2),
            ],
        );

        // Attempt early settlement before 10 minutes elapsed -> must panic (I6)
        setup_context("anyone.near", NearToken::from_near(0), 100 * 1_000_000_000);
        let early = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.settle(1);
        }));
        assert!(early.is_err(), "Early settlement before epoch end must fail (I6)");

        // Advance time to t = 700s (past epoch duration) -> settlement succeeds!
        setup_context("anyone.near", NearToken::from_near(0), 700 * 1_000_000_000);
        let record = contract.settle(1);
        assert_eq!(record.epoch_id, 1);
        assert_eq!(record.settled_by.as_str(), "anyone.near");
        assert_eq!(record.winners.len(), 2);
        // Alice takes 65% of Slayer pool (30% of 5 NEAR = 1.5 NEAR * 65% = 0.975 NEAR)
        assert_eq!(record.winners[0].account_id.as_str(), "alice.near");
        assert_eq!(record.winners[0].rank, 1);
        assert_eq!(record.winners[0].share_pct, 65);
        assert_eq!(
            record.winners[0].amount_near,
            NearToken::from_yoctonear(975_000_000_000_000_000_000_000)
        );

        // Bob takes 35% of Slayer pool (1.5 NEAR * 35% = 0.525 NEAR)
        assert_eq!(record.winners[1].account_id.as_str(), "bob.near");
        assert_eq!(record.winners[1].rank, 2);
        assert_eq!(record.winners[1].share_pct, 35);
        assert_eq!(
            record.winners[1].amount_near,
            NearToken::from_yoctonear(525_000_000_000_000_000_000_000)
        );

        // Invariant I2: Total payout must be <= total active pool (5 NEAR)
        assert!(record.total_payout_near.as_yoctonear() <= NearToken::from_near(5).as_yoctonear());

        // Invariant I1: Second settlement call for same epoch must fail!
        let duplicate = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.settle(1);
        }));
        assert!(
            duplicate.is_err(),
            "Duplicate settlement for same epoch must fail (I1)"
        );

        // Epoch advanced to 2
        let epoch2 = contract.get_epoch_info(2);
        assert_eq!(epoch2.epoch_id, 2);
        assert!(!epoch2.settled);
    }

    #[test]
    fn test_forging_and_public_odds() {
        let owner: AccountId = "owner.near".parse().unwrap();
        let operator: AccountId = "operator.near".parse().unwrap();
        setup_context("owner.near", NearToken::from_near(0), 1_000_000_000);
        let mut contract = DaoAscensionContract::new(owner, operator, None);

        // Alice recharges 2 NEAR (100 stones)
        setup_context("alice.near", NearToken::from_near(2), 1_000_000_000);
        contract.recharge_points();

        // Forge artifact using 50 stones
        setup_context("alice.near", NearToken::from_near(0), 1_000_000_000);
        let item = contract.forge_artifact(Some("TAICHI".to_string()));
        assert!(!item.name.is_empty());
        assert!(item.atk_bonus >= 35);
        assert_eq!(contract.get_points("alice.near".parse().unwrap()), 50);

        let odds = contract.get_odds();
        assert_eq!(
            odds.forge_ordinary_pct
                + odds.forge_spiritual_pct
                + odds.forge_mystic_pct
                + odds.forge_earth_pct
                + odds.forge_heaven_pct,
            100
        );
    }
}

