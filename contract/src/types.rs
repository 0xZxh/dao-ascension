use near_sdk::near;
use near_sdk::{AccountId, NearToken};

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CharacterMeta {
    pub token_id: String,
    pub owner_id: AccountId,
    pub dao_name: String,
    pub avatar_class: String,
    pub spirit_root: String,
    pub minted_at_ns: u64,
    pub reshaped_at_ns: u64,
    pub is_soulbound: bool,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BoardType {
    Slayer,     // 云海试炼通关层数
    Alchemy,    // 种植收获灵草株数
    Blacksmith, // 道身综合战力
    Duel,       // 问鼎论剑演武积分
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LeaderboardEntry {
    pub account_id: AccountId,
    pub score: u64,
    pub reached_at_ns: u64,
    pub seq: u64,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WinnerPayout {
    pub board: BoardType,
    pub account_id: AccountId,
    pub rank: u8,
    pub score: u64,
    pub share_pct: u8,
    pub amount_near: NearToken,
    pub paid: bool,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EpochSettlementRecord {
    pub epoch_id: u64,
    pub settled_at_ns: u64,
    pub settled_by: AccountId,
    pub winners: Vec<WinnerPayout>,
    pub total_payout_near: NearToken,
    pub rolled_over_near: NearToken,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EpochInfo {
    pub epoch_id: u64,
    pub start_time_ns: u64,
    pub end_time_ns: u64,
    pub settled: bool,
    pub active_reward_pool_near: NearToken,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TreasurySnapshot {
    pub active_pool_near: NearToken,
    pub reserve_pool_near: NearToken,
    pub dev_ops_pool_near: NearToken,
    pub total_recharged_near: NearToken,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ForgeRarity {
    Ordinary,  // 凡品 (50%)
    Spiritual, // 灵品 (30%)
    Mystic,    // 玄品 (14%)
    Earth,     // 地品 (5%)
    Heaven,    // 天品 (1%)
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ForgeItem {
    pub name: String,
    pub rarity: ForgeRarity,
    pub atk_bonus: u32,
    pub prefix: String,
    pub seed_hash: String,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PublicOdds {
    pub forge_ordinary_pct: u8,
    pub forge_spiritual_pct: u8,
    pub forge_mystic_pct: u8,
    pub forge_earth_pct: u8,
    pub forge_heaven_pct: u8,
    pub root_common_pct: u8,
    pub root_mystic_pct: u8,
    pub root_earth_pct: u8,
    pub root_heaven_pct: u8,
    pub root_immortal_pct: u8,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ContractConfig {
    pub owner_id: AccountId,
    pub operator_id: AccountId,
    pub spirit_stones_per_near: u64,
    pub reshape_fee_near: NearToken,
    pub reshape_fee_points: u64,
    pub roll_root_fee_near: NearToken,
    pub min_scores: Vec<(BoardType, u64)>,
    pub epoch_duration_ns: u64,
}
