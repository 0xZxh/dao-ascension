use borsh::BorshDeserialize;
use near_sdk::near;
use near_sdk::store::{IterableSet, LookupMap};
use near_sdk::{env, require, AccountId, Gas, NearToken, PanicOnDefault, Promise};

pub mod types;
use types::*;

pub const MAX_DAO_NAME_BYTES: u32 = 64;
pub const MAX_AVATAR_CLASS_BYTES: u32 = 32;
pub const MAX_SPIRIT_ROOT_BYTES: u32 = 96;
pub const MAX_REASON_BYTES: u32 = 64;
pub const MAX_SEED_PREFIX_BYTES: u32 = 16;
pub const MAX_PAYMENT_METHOD_BYTES: u32 = 16;
pub const MAX_REGISTERED_CULTIVATORS: u32 = 256;
pub const MAX_SCORE_SYNC_PAGE: u32 = 20;

const YOCTO_PER_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const MIN_RECHARGE_YOCTO: u128 = 20_000_000_000_000_000_000_000;
const FORGE_FEE_YOCTO: u128 = 50_000_000_000_000_000_000_000;
const CALLBACK_CUSHION_YOCTO: u128 = 50_000_000_000_000_000_000_000;
const SLAYER_PRACTICE_POINTS: u64 = 10;
const ALCHEMY_PRACTICE_POINTS: u64 = 10;
const DUEL_PRACTICE_POINTS: u64 = 20;
const DEFAULT_SPIRIT_ROOT: &str = "凡品 · 五行凡脉杂灵根";

const BOARDS: [BoardType; 4] = [
    BoardType::Slayer,
    BoardType::Alchemy,
    BoardType::Blacksmith,
    BoardType::Duel,
];

const BOARD_PAYOUTS: [(BoardType, u128); 4] = [
    (BoardType::Slayer, 30),
    (BoardType::Duel, 30),
    (BoardType::Alchemy, 20),
    (BoardType::Blacksmith, 20),
];

#[near(contract_state)]
#[derive(PanicOnDefault)]
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
    /// Scores earned by the player account itself. `report_scores` can only copy these.
    pub earned: LookupMap<(AccountId, BoardType), u64>,
    pub registered: IterableSet<AccountId>,
    pub forge_items: LookupMap<AccountId, ForgeItem>,
    pub pending_forge: LookupMap<AccountId, PendingCommit>,
    pub pending_root: LookupMap<AccountId, PendingCommit>,
    pub pending_settlement: Option<PendingSettlement>,
    pub dev_ops_withdrawal: Option<NearToken>,
    pub score_sync_epoch: u64,
    pub score_sync_cursor: u64,
    pub score_sync_len: u64,
    pub score_sync_complete: bool,
    /// Prize NEAR already removed from the active pool and not yet cleared by the callback.
    pub settlement_escrow: NearToken,
    /// YoctoNEAR that entered the three pools for this account. Prefix `j`.
    pub credited_in: LookupMap<AccountId, u128>,
    /// Prize yoctoNEAR this account has successfully received. Prefix `k`.
    pub paid_out: LookupMap<AccountId, u128>,
}

/// State layout of the contract already deployed on dao-ascension-dev.testnet.
/// Only the contract-state blob is read here. Collection entries stay under their old prefixes.
#[derive(BorshDeserialize)]
struct LegacyDaoAscensionContract {
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

#[near]
impl DaoAscensionContract {
    #[init]
    pub fn new(
        owner_id: AccountId,
        operator_id: AccountId,
        epoch_duration_ns: Option<u64>,
    ) -> Self {
        require!(!env::state_exists(), "Already initialized");
        let treasury = env::current_account_id();
        // The account that holds player NEAR must not also be the admin.
        // A full-access key on that account can replace the contract and take the balance.
        require!(
            owner_id != treasury,
            "owner_id must not be the treasury account"
        );
        require!(
            operator_id != treasury,
            "operator_id must not be the treasury account"
        );
        let duration = epoch_duration_ns.unwrap_or(7 * 24 * 3600 * 1_000_000_000);
        require!(duration > 0, "epoch duration must be non-zero");

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
            epoch_start_time_ns: env::block_timestamp(),
            epoch_duration_ns: duration,
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
            earned: LookupMap::new(b"e"),
            registered: IterableSet::new(b"g"),
            forge_items: LookupMap::new(b"f"),
            pending_forge: LookupMap::new(b"h"),
            pending_root: LookupMap::new(b"i"),
            pending_settlement: None,
            dev_ops_withdrawal: None,
            score_sync_epoch: 0,
            score_sync_cursor: 0,
            score_sync_len: 0,
            score_sync_complete: false,
            settlement_escrow: NearToken::from_near(0),
            credited_in: LookupMap::new(b"j"),
            paid_out: LookupMap::new(b"k"),
        }
        .flushed()
    }

    /// One-time upgrade from the previous testnet state.
    /// The old blob has the same fields through `forge_fee_points` and no later fields.
    /// A mismatch reverts this transaction, so the previous code stays in place.
    #[init(ignore_state)]
    pub fn migrate() -> Self {
        let old: LegacyDaoAscensionContract =
            env::state_read().expect("legacy state missing");
        Self {
            owner_id: old.owner_id,
            operator_id: old.operator_id,
            characters: old.characters,
            points: old.points,
            current_epoch_id: old.current_epoch_id,
            epoch_start_time_ns: old.epoch_start_time_ns,
            epoch_duration_ns: old.epoch_duration_ns,
            min_scores: old.min_scores,
            leaderboards: old.leaderboards,
            epoch_settlements: old.epoch_settlements,
            treasury_active_pool: old.treasury_active_pool,
            treasury_reserve_pool: old.treasury_reserve_pool,
            treasury_dev_ops_pool: old.treasury_dev_ops_pool,
            total_near_recharged: old.total_near_recharged,
            seq_counter: old.seq_counter,
            spirit_stones_per_near: old.spirit_stones_per_near,
            reshape_fee_near: old.reshape_fee_near,
            reshape_fee_points: old.reshape_fee_points,
            roll_root_fee_near: old.roll_root_fee_near,
            forge_fee_points: old.forge_fee_points,
            earned: LookupMap::new(b"e"),
            registered: IterableSet::new(b"g"),
            forge_items: LookupMap::new(b"f"),
            pending_forge: LookupMap::new(b"h"),
            pending_root: LookupMap::new(b"i"),
            pending_settlement: None,
            dev_ops_withdrawal: None,
            score_sync_epoch: 0,
            score_sync_cursor: 0,
            score_sync_len: 0,
            score_sync_complete: false,
            settlement_escrow: NearToken::from_near(0),
            credited_in: LookupMap::new(b"j"),
            paid_out: LookupMap::new(b"k"),
        }
        .flushed()
    }

    // =========================================================================
    // 1. Character NFT (soulbound). Caller pays for the bytes they add.
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
        let dao_name = bounded_text(&dao_name, MAX_DAO_NAME_BYTES, "dao_name");
        let avatar_class = bounded_text(&avatar_class, MAX_AVATAR_CLASS_BYTES, "avatar_class");
        let spirit_root = match spirit_root {
            Some(value) => bounded_text(&value, MAX_SPIRIT_ROOT_BYTES, "spirit_root"),
            None => DEFAULT_SPIRIT_ROOT.to_string(),
        };

        let storage_before = env::storage_usage();
        let now = env::block_timestamp();
        let meta = CharacterMeta {
            token_id: format!("cultivator-nft:{}", caller),
            owner_id: caller.clone(),
            dao_name,
            avatar_class,
            spirit_root,
            minted_at_ns: now,
            reshaped_at_ns: now,
            is_soulbound: true,
        };
        self.characters.insert(caller, meta.clone());
        // Surplus above storage joins the pools. The storage stake itself does not.
        self.settle_deposit(storage_before, 0, false);
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
        let new_dao_name = bounded_text(&new_dao_name, MAX_DAO_NAME_BYTES, "dao_name");
        let new_avatar_class =
            bounded_text(&new_avatar_class, MAX_AVATAR_CLASS_BYTES, "avatar_class");
        let pay_with_near = payment_kind(&payment_method);

        let storage_before = env::storage_usage();
        if !pay_with_near {
            self.debit_points(&caller, self.reshape_fee_points);
        }
        char_meta.dao_name = new_dao_name;
        char_meta.avatar_class = new_avatar_class;
        char_meta.reshaped_at_ns = env::block_timestamp();
        self.characters.insert(caller, char_meta.clone());

        if pay_with_near {
            self.settle_deposit(storage_before, self.reshape_fee_near.as_yoctonear(), true);
        } else {
            // Points already paid. Any attached NEAR is storage, then refund. It does not enter the pools.
            self.settle_deposit(storage_before, 0, true);
        }
        char_meta
    }

    #[payable]
    pub fn commit_spirit_root(&mut self, commitment_hex: String) {
        let caller = env::predecessor_account_id();
        require!(
            self.characters.get(&caller).is_some(),
            "No cultivator character found"
        );
        require!(
            self.pending_root.get(&caller).is_none(),
            "reveal the current spirit root commit first"
        );
        let commitment = decode_hex_32(&commitment_hex);
        let storage_before = env::storage_usage();
        self.pending_root.insert(
            caller,
            PendingCommit {
                commitment,
                commit_seed: env::random_seed_array(),
                commit_block_height: env::block_height(),
                prefix: String::new(),
            },
        );
        self.settle_deposit(storage_before, self.roll_root_fee_near.as_yoctonear(), true);
    }

    #[payable]
    pub fn reveal_spirit_root(&mut self, secret_hex: String) -> String {
        let caller = env::predecessor_account_id();
        let mut char_meta = self
            .characters
            .get(&caller)
            .cloned()
            .expect("No cultivator character found");
        let pending = self
            .pending_root
            .get(&caller)
            .cloned()
            .expect("no spirit root commit");
        let secret = decode_hex_32(&secret_hex);
        require!(
            env::sha256_array(&secret) == pending.commitment,
            "secret does not match commitment"
        );
        require!(
            env::block_height() > pending.commit_block_height,
            "reveal must be in a later block than the commit"
        );

        let digest = mix_digest(&pending.commit_seed, &secret);
        let new_root = spirit_root_from_digest(&digest);
        require!(
            new_root.len() <= MAX_SPIRIT_ROOT_BYTES as usize,
            "spirit root catalog exceeds limit"
        );

        let storage_before = env::storage_usage();
        char_meta.spirit_root = new_root.clone();
        char_meta.reshaped_at_ns = env::block_timestamp();
        self.characters.insert(caller.clone(), char_meta);
        self.pending_root.remove(&caller);
        self.settle_deposit(storage_before, 0, true);
        new_root
    }

    pub fn nft_transfer(&mut self) {
        env::panic_str("Soulbound: transfer forbidden (Characters are bound to soul wallet)");
    }

    // =========================================================================
    // 2. Spirit stones. Attached NEAR on a points payment is refunded.
    // =========================================================================

    #[payable]
    pub fn recharge_points(&mut self) -> u64 {
        let caller = env::predecessor_account_id();
        let current_stones = self.points.get(&caller).copied().unwrap_or(0);
        let storage_before = env::storage_usage();
        // Materialize the entries first. The values are fixed-width, so the fee measured here
        // is the fee for the final balance and contribution slot too.
        self.points.insert(caller.clone(), current_stones);
        self.materialize_contribution(&caller);

        let storage_fee = self.storage_fee_since(storage_before);
        let deposit = env::attached_deposit().as_yoctonear();
        require!(
            deposit >= storage_fee,
            "insufficient NEAR: caller must pay new storage and the fee"
        );
        let credited = deposit - storage_fee;
        require!(
            credited >= MIN_RECHARGE_YOCTO,
            "Minimum recharge is 0.02 NEAR (1 stone), after storage"
        );
        let stones_gained = credited
            .checked_mul(u128::from(self.spirit_stones_per_near))
            .expect("stone math overflow")
            / YOCTO_PER_NEAR;
        require!(stones_gained > 0, "Recharge resulted in 0 spirit stones");
        let stones_gained = u64::try_from(stones_gained).expect("stone count exceeds u64");
        let new_stones = current_stones
            .checked_add(stones_gained)
            .expect("points overflow");
        self.points.insert(caller.clone(), new_stones);
        self.distribute_treasury_split(NearToken::from_yoctonear(credited));
        self.credit_contributor(&caller, credited);
        self.total_near_recharged = NearToken::from_yoctonear(
            self.total_near_recharged
                .as_yoctonear()
                .checked_add(credited)
                .expect("recharge total overflow"),
        );
        self.assert_liquid_covers_booked_and(0);
        new_stones
    }

    pub fn spend_points(&mut self, amount: u64, reason: String) -> u64 {
        require!(
            env::attached_deposit().as_yoctonear() == 0,
            "this method does not accept NEAR"
        );
        let caller = env::predecessor_account_id();
        require!(reason.len() <= MAX_REASON_BYTES as usize, "reason exceeds 64 bytes");
        require!(!reason.trim().is_empty(), "Reason required");
        self.debit_points(&caller, amount);
        self.points.get(&caller).copied().unwrap_or(0)
    }

    /// One paid action by the predecessor. The contract adds exactly 1 to that account's
    /// earned score. The caller cannot name another account or choose the score.
    #[payable]
    pub fn practice(&mut self, board: BoardType) -> u64 {
        require!(
            board != BoardType::Blacksmith,
            "blacksmith score increases only when a forge is committed"
        );
        let cost = match board {
            BoardType::Slayer => SLAYER_PRACTICE_POINTS,
            BoardType::Alchemy => ALCHEMY_PRACTICE_POINTS,
            BoardType::Duel => DUEL_PRACTICE_POINTS,
            BoardType::Blacksmith => unreachable!(),
        };
        let storage_before = env::storage_usage();
        let updated = self.accrue_predecessor(board, cost);
        // Points paid the action. Attached NEAR covers storage and the rest is refunded.
        self.settle_deposit(storage_before, 0, true);
        updated
    }

    // =========================================================================
    // 3. Forge. Outcome is fixed at commit and stored on reveal.
    // =========================================================================

    #[payable]
    pub fn commit_forge(&mut self, commitment_hex: String, seed_prefix: Option<String>) {
        let caller = env::predecessor_account_id();
        require!(
            self.characters.get(&caller).is_some(),
            "No cultivator character found"
        );
        require!(
            self.pending_forge.get(&caller).is_none(),
            "reveal the current forge commit first"
        );
        require!(
            env::block_timestamp() < self.epoch_end_ns(),
            "epoch is closed; scores are frozen"
        );
        let commitment = decode_hex_32(&commitment_hex);
        let prefix = bounded_prefix(seed_prefix);
        let deposit = env::attached_deposit().as_yoctonear();
        let pay_with_near = deposit >= FORGE_FEE_YOCTO;

        let storage_before = env::storage_usage();
        if !pay_with_near {
            self.debit_points(&caller, self.forge_fee_points);
        }
        self.pending_forge.insert(
            caller.clone(),
            PendingCommit {
                commitment,
                commit_seed: env::random_seed_array(),
                commit_block_height: env::block_height(),
                prefix,
            },
        );
        // +1 blacksmith is deterministic. The rarity roll is not the score.
        self.accrue_predecessor(BoardType::Blacksmith, 0);
        if pay_with_near {
            self.settle_deposit(storage_before, FORGE_FEE_YOCTO, true);
        } else {
            self.settle_deposit(storage_before, 0, true);
        }
    }

    #[payable]
    pub fn reveal_forge(&mut self, secret_hex: String) -> ForgeItem {
        let caller = env::predecessor_account_id();
        require!(
            self.characters.get(&caller).is_some(),
            "No cultivator character found"
        );
        let pending = self
            .pending_forge
            .get(&caller)
            .cloned()
            .expect("no forge commit");
        let secret = decode_hex_32(&secret_hex);
        require!(
            env::sha256_array(&secret) == pending.commitment,
            "secret does not match commitment"
        );
        require!(
            env::block_height() > pending.commit_block_height,
            "reveal must be in a later block than the commit"
        );
        let digest = mix_digest(&pending.commit_seed, &secret);
        let (rarity, atk_bonus, name) = forge_from_digest(&digest);
        let item = ForgeItem {
            name,
            rarity,
            atk_bonus,
            prefix: pending.prefix,
            seed_hash: encode_hex(&digest[0..3]),
        };

        let storage_before = env::storage_usage();
        self.forge_items.insert(caller.clone(), item.clone());
        self.pending_forge.remove(&caller);
        self.settle_deposit(storage_before, 0, true);
        item
    }

    // =========================================================================
    // 4. Score sync. Operator copies stored scores. Arguments contain no account and no score.
    // =========================================================================

    #[payable]
    pub fn report_scores(&mut self, epoch_id: u64, page_limit: u32) -> ScoreSyncStatus {
        self.assert_operator();
        require!(page_limit >= 1, "page_limit must be at least 1");
        require!(
            page_limit <= MAX_SCORE_SYNC_PAGE,
            "page_limit exceeds 20"
        );
        require!(
            epoch_id == self.current_epoch_id,
            "Scores can only be reported for active epoch"
        );
        require!(
            env::block_timestamp() >= self.epoch_end_ns(),
            "scores can be copied only after the epoch closes"
        );
        require!(
            self.pending_settlement.is_none(),
            "settlement in progress"
        );

        if self.score_sync_epoch != epoch_id {
            self.score_sync_epoch = epoch_id;
            self.score_sync_cursor = 0;
            self.score_sync_len = u64::from(self.registered.len());
            self.score_sync_complete = self.score_sync_len == 0;
        }

        let storage_before = env::storage_usage();
        if !self.score_sync_complete {
            let page = u64::from(page_limit);
            let end = self
                .score_sync_cursor
                .saturating_add(page)
                .min(self.score_sync_len);
            let accounts: Vec<AccountId> = self
                .registered
                .iter()
                .skip(self.score_sync_cursor as usize)
                .take((end - self.score_sync_cursor) as usize)
                .cloned()
                .collect();
            for account in accounts {
                for board in BOARDS {
                    let key = (account.clone(), board);
                    if let Some(score) = self.earned.get(&key).copied() {
                        self.write_stored_score(epoch_id, account.clone(), board, score);
                    }
                }
            }
            self.score_sync_cursor = end;
            self.score_sync_complete = self.score_sync_cursor >= self.score_sync_len;
        }
        self.settle_deposit(storage_before, 0, true);
        self.score_sync_status(epoch_id)
    }

    // =========================================================================
    // 5. Settlement. Operator only.
    // The scheduled prize leaves the active pool before the transfers.
    // The callback only puts a failed transfer back into the current active pool.
    // =========================================================================

    #[payable]
    pub fn settle(&mut self, epoch_id: u64) -> SettlementStart {
        self.assert_operator();
        require!(
            epoch_id == self.current_epoch_id,
            "Can only settle current active epoch"
        );
        require!(
            self.epoch_settlements.get(&epoch_id).is_none(),
            "Epoch already settled (I1: single execution per epoch)"
        );
        require!(
            self.pending_settlement.is_none(),
            "settlement in progress"
        );
        require!(
            self.dev_ops_withdrawal.is_none(),
            "dev ops withdrawal in progress"
        );
        let now = env::block_timestamp();
        require!(
            now >= self.epoch_end_ns(),
            "Cannot settle epoch before duration concludes (I6)"
        );
        require!(
            self.score_sync_epoch == epoch_id && self.score_sync_complete,
            "score sync is incomplete; winners are not yet copied from earned scores"
        );
        // Attached NEAR cannot paper over a shortfall in the account that holds the pools.
        require!(
            self.liquid_excluding_attached() >= self.booked_yocto(),
            "liquid balance is below booked pools; settlement was not recorded"
        );

        let pool = self.treasury_active_pool;
        let (winners, total_payout) = self.compute_payouts(epoch_id);
        require!(
            total_payout <= pool.as_yoctonear(),
            "payout exceeds active pool"
        );

        if winners.is_empty() {
            let storage_before = env::storage_usage();
            self.commit_epoch(epoch_id, env::predecessor_account_id(), now, winners, pool);
            self.retain_operator_storage(storage_before);
            return SettlementStart {
                epoch_id,
                payout_count: 0,
                finalized: true,
            };
        }

        require!(
            env::prepaid_gas() >= Gas::from_tgas(150),
            "attach at least 150 TGas so payouts and the settlement callback can finish"
        );

        let storage_before = env::storage_usage();
        // Take the prize out of the current active pool before any transfer receipt runs.
        // A recharge that lands before the callback adds to whatever active pool remains.
        self.move_active_to_escrow(total_payout);
        self.pending_settlement = Some(PendingSettlement {
            epoch_id,
            settled_at_ns: now,
            settled_by: env::predecessor_account_id(),
            winners: winners.clone(),
            pool,
        });
        self.retain_operator_storage(storage_before);

        let mut scheduled = Promise::new(winners[0].account_id.clone()).transfer(winners[0].amount_near);
        for winner in winners.iter().skip(1) {
            scheduled = scheduled.and(Promise::new(winner.account_id.clone()).transfer(winner.amount_near));
        }
        let _ = scheduled.then(
            Self::ext(env::current_account_id())
                .with_static_gas(Gas::from_tgas(80))
                .on_settle_payouts(),
        );

        SettlementStart {
            epoch_id,
            payout_count: winners.len() as u32,
            finalized: false,
        }
    }

    /// Runs only as the contract callback.
    /// A successful transfer leaves escrow. A failed transfer returns to the current active pool.
    #[private]
    pub fn on_settle_payouts(&mut self) {
        let Some(pending) = self.pending_settlement.clone() else {
            return;
        };
        let expected = pending.winners.len() as u64;
        require!(
            env::promise_results_count() == expected,
            "settlement callback result count does not match payouts"
        );
        let mut winners = pending.winners;
        for (index, winner) in winners.iter_mut().enumerate() {
            let amount = winner.amount_near.as_yoctonear();
            let succeeded = promise_succeeded(index as u64);
            winner.paid = succeeded;
            self.release_escrow(amount, !succeeded);
            if succeeded {
                self.note_paid(&winner.account_id, amount);
            }
        }
        self.commit_epoch(
            pending.epoch_id,
            pending.settled_by,
            pending.settled_at_ns,
            winners,
            pending.pool,
        );
    }

    /// Moves only the dev-ops ledger. The 1 yocto stays in the account and enters no pool.
    #[payable]
    pub fn withdraw_dev_ops(&mut self) -> NearToken {
        let caller = env::predecessor_account_id();
        require!(caller == self.owner_id, "only owner can withdraw dev ops");
        require!(
            env::attached_deposit().as_yoctonear() == 1,
            "attach exactly 1 yoctoNEAR"
        );
        require!(
            self.dev_ops_withdrawal.is_none(),
            "dev ops withdrawal in progress"
        );
        require!(
            self.pending_settlement.is_none(),
            "settlement in progress"
        );
        let amount = self.treasury_dev_ops_pool;
        require!(amount.as_yoctonear() > 0, "dev ops pool is empty");
        require!(
            self.liquid_excluding_attached() >= self.booked_yocto(),
            "liquid balance is below booked pools; dev ops was not withdrawn"
        );

        self.treasury_dev_ops_pool = NearToken::from_yoctonear(0);
        self.dev_ops_withdrawal = Some(amount);
        let _ = Promise::new(self.owner_id.clone()).transfer(amount).then(
            Self::ext(env::current_account_id())
                .with_static_gas(Gas::from_tgas(10))
                .on_dev_ops_withdrawn(),
        );
        amount
    }

    #[private]
    pub fn on_dev_ops_withdrawn(&mut self) {
        let Some(amount) = self.dev_ops_withdrawal.take() else {
            return;
        };
        require!(
            env::promise_results_count() == 1,
            "dev ops callback is missing its transfer result"
        );
        if !promise_succeeded(0) {
            self.treasury_dev_ops_pool = NearToken::from_yoctonear(
                self.treasury_dev_ops_pool
                    .as_yoctonear()
                    .checked_add(amount.as_yoctonear())
                    .expect("dev ops restore overflow"),
            );
        }
    }

    /// Moves reserve NEAR onto the active-pool ledger. No transfer. Still subject to the contribution cap.
    #[payable]
    pub fn release_reserve_to_active(&mut self, amount: NearToken) {
        require!(
            env::predecessor_account_id() == self.owner_id,
            "only owner can release the reserve"
        );
        require!(
            env::attached_deposit().as_yoctonear() == 1,
            "attach exactly 1 yoctoNEAR"
        );
        require!(
            self.pending_settlement.is_none(),
            "settlement in progress"
        );
        require!(
            self.dev_ops_withdrawal.is_none(),
            "dev ops withdrawal in progress"
        );
        let yocto = amount.as_yoctonear();
        require!(yocto > 0, "release amount must be non-zero");
        let reserve = self.treasury_reserve_pool.as_yoctonear();
        require!(yocto <= reserve, "release exceeds reserve pool");
        self.treasury_reserve_pool = NearToken::from_yoctonear(reserve - yocto);
        self.treasury_active_pool = NearToken::from_yoctonear(
            self.treasury_active_pool
                .as_yoctonear()
                .checked_add(yocto)
                .expect("active pool overflow"),
        );
    }

    // =========================================================================
    // 6. Views
    // =========================================================================

    pub fn get_character(&self, account_id: AccountId) -> Option<CharacterMeta> {
        self.characters.get(&account_id).cloned()
    }

    pub fn nft_token(&self, token_id: String) -> Option<CharacterMeta> {
        require!(token_id.len() <= 128, "token_id exceeds 128 bytes");
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

    pub fn get_earned_score(&self, account_id: AccountId, board: BoardType) -> u64 {
        self.earned
            .get(&(account_id, board))
            .copied()
            .unwrap_or(0)
    }

    pub fn get_forge_item(&self, account_id: AccountId) -> Option<ForgeItem> {
        self.forge_items.get(&account_id).cloned()
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
            (self.epoch_start_time_ns, false, self.treasury_active_pool)
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
            end_time_ns: start.saturating_add(self.epoch_duration_ns),
            settled,
            active_reward_pool_near: pool,
        }
    }

    pub fn get_settlement(&self, epoch_id: u64) -> Option<EpochSettlementRecord> {
        self.epoch_settlements.get(&epoch_id).cloned()
    }

    pub fn get_pending_settlement(&self) -> Option<PendingSettlement> {
        self.pending_settlement.clone()
    }

    pub fn get_score_sync(&self) -> ScoreSyncStatus {
        self.score_sync_status(self.score_sync_epoch)
    }

    pub fn get_dev_ops_withdrawal(&self) -> Option<NearToken> {
        self.dev_ops_withdrawal
    }

    pub fn get_settlement_escrow(&self) -> NearToken {
        self.settlement_escrow
    }

    pub fn get_contribution(&self, account_id: AccountId) -> Contribution {
        Contribution {
            credited_in: NearToken::from_yoctonear(
                self.credited_in.get(&account_id).copied().unwrap_or(0),
            ),
            paid_out: NearToken::from_yoctonear(self.paid_out.get(&account_id).copied().unwrap_or(0)),
        }
    }

    pub fn get_input_limits(&self) -> InputLimits {
        InputLimits {
            max_dao_name_bytes: MAX_DAO_NAME_BYTES,
            max_avatar_class_bytes: MAX_AVATAR_CLASS_BYTES,
            max_spirit_root_bytes: MAX_SPIRIT_ROOT_BYTES,
            max_reason_bytes: MAX_REASON_BYTES,
            max_seed_prefix_bytes: MAX_SEED_PREFIX_BYTES,
            max_payment_method_bytes: MAX_PAYMENT_METHOD_BYTES,
            max_registered_cultivators: MAX_REGISTERED_CULTIVATORS,
            max_score_sync_page: MAX_SCORE_SYNC_PAGE,
        }
    }

    pub fn get_custody_rule(&self) -> String {
        "The treasury account must not keep a full-access key. \
owner_id and operator_id are separate accounts. \
Delete every full-access key before user deposits, \
and do not reuse a key that has appeared in a terminal log."
            .to_string()
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
        let min_scores = BOARDS
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
}

impl DaoAscensionContract {
    fn assert_operator(&self) {
        let caller = env::predecessor_account_id();
        require!(
            caller == self.operator_id || caller == self.owner_id,
            "only operator or owner"
        );
    }

    fn epoch_end_ns(&self) -> u64 {
        self.epoch_start_time_ns
            .checked_add(self.epoch_duration_ns)
            .expect("epoch end overflow")
    }

    fn score_sync_status(&self, epoch_id: u64) -> ScoreSyncStatus {
        ScoreSyncStatus {
            epoch_id,
            cursor: self.score_sync_cursor,
            registered: self.score_sync_len,
            complete: self.score_sync_complete && self.score_sync_epoch == epoch_id,
        }
    }

    fn debit_points(&mut self, caller: &AccountId, amount: u64) {
        let current = self.points.get(caller).copied().unwrap_or(0);
        require!(current >= amount, "Insufficient spirit stones");
        self.points.insert(caller.clone(), current - amount);
    }

    /// `point_cost` of 0 means the caller already paid in the surrounding method.
    fn accrue_predecessor(&mut self, board: BoardType, point_cost: u64) -> u64 {
        let caller = env::predecessor_account_id();
        require!(
            self.characters.get(&caller).is_some(),
            "mint a character before earning a score"
        );
        require!(
            env::block_timestamp() < self.epoch_end_ns(),
            "epoch is closed; scores are frozen"
        );
        if point_cost > 0 {
            self.debit_points(&caller, point_cost);
        }
        if !self.registered.contains(&caller) {
            require!(
                self.registered.len() < MAX_REGISTERED_CULTIVATORS,
                "registered cultivator cap reached"
            );
            self.registered.insert(caller.clone());
        }
        let key = (caller, board);
        let current = self.earned.get(&key).copied().unwrap_or(0);
        let next = current.checked_add(1).expect("score overflow");
        self.earned.insert(key, next);
        next
    }

    fn write_stored_score(&mut self, epoch_id: u64, account: AccountId, board: BoardType, score: u64) {
        let stored = self
            .earned
            .get(&(account.clone(), board))
            .copied()
            .unwrap_or(0);
        require!(score == stored, "leaderboard score must equal the stored earned score");
        let min_required = self.min_scores.get(&board).copied().unwrap_or(0);
        if score < min_required {
            return;
        }
        let key = (epoch_id, board);
        let mut board_entries = self.leaderboards.get(&key).cloned().unwrap_or_default();
        let now = env::block_timestamp();
        if let Some(existing) = board_entries.iter_mut().find(|e| e.account_id == account) {
            require!(score >= existing.score, "stored score went backwards");
            if score > existing.score {
                existing.score = score;
                existing.reached_at_ns = now;
                self.seq_counter = self.seq_counter.checked_add(1).expect("seq overflow");
                existing.seq = self.seq_counter;
            }
        } else {
            require!(
                board_entries.len() < MAX_REGISTERED_CULTIVATORS as usize,
                "leaderboard cap reached"
            );
            self.seq_counter = self.seq_counter.checked_add(1).expect("seq overflow");
            board_entries.push(LeaderboardEntry {
                account_id: account,
                score,
                reached_at_ns: now,
                seq: self.seq_counter,
            });
        }
        self.leaderboards.insert(key, board_entries);
    }

    fn remaining_prize_cap(&self, account: &AccountId, already_assigned: u128) -> u128 {
        let credited = self.credited_in.get(account).copied().unwrap_or(0);
        let paid = self.paid_out.get(account).copied().unwrap_or(0);
        credited.saturating_sub(paid).saturating_sub(already_assigned)
    }

    fn move_active_to_escrow(&mut self, yocto: u128) {
        let active = self.treasury_active_pool.as_yoctonear();
        require!(yocto <= active, "payout exceeds active pool");
        self.treasury_active_pool = NearToken::from_yoctonear(active - yocto);
        self.settlement_escrow = NearToken::from_yoctonear(
            self.settlement_escrow
                .as_yoctonear()
                .checked_add(yocto)
                .expect("escrow overflow"),
        );
    }

    fn release_escrow(&mut self, yocto: u128, restore_to_active: bool) {
        let escrow = self.settlement_escrow.as_yoctonear();
        require!(yocto <= escrow, "escrow is short");
        self.settlement_escrow = NearToken::from_yoctonear(escrow - yocto);
        if restore_to_active {
            self.treasury_active_pool = NearToken::from_yoctonear(
                self.treasury_active_pool
                    .as_yoctonear()
                    .checked_add(yocto)
                    .expect("active restore overflow"),
            );
        }
    }

    fn note_paid(&mut self, account: &AccountId, yocto: u128) {
        let current = self.paid_out.get(account).copied().unwrap_or(0);
        self.paid_out.insert(
            account.clone(),
            current.checked_add(yocto).expect("paid out overflow"),
        );
    }

    fn materialize_contribution(&mut self, account: &AccountId) {
        let credited = self.credited_in.get(account).copied().unwrap_or(0);
        self.credited_in.insert(account.clone(), credited);
        let paid = self.paid_out.get(account).copied().unwrap_or(0);
        self.paid_out.insert(account.clone(), paid);
    }

    fn credit_contributor(&mut self, account: &AccountId, yocto: u128) {
        if yocto == 0 {
            return;
        }
        let current = self.credited_in.get(account).copied().unwrap_or(0);
        self.credited_in.insert(
            account.clone(),
            current.checked_add(yocto).expect("credited in overflow"),
        );
    }

    fn compute_payouts(&self, epoch_id: u64) -> (Vec<WinnerPayout>, u128) {
        let pool_yocto = self.treasury_active_pool.as_yoctonear();
        let mut winners = Vec::new();
        let mut total_payout: u128 = 0;
        for (board, board_share_pct) in BOARD_PAYOUTS {
            let board_pool = pool_yocto
                .checked_mul(board_share_pct)
                .expect("board pool overflow")
                / 100;
            let mut entries = self
                .leaderboards
                .get(&(epoch_id, board))
                .cloned()
                .unwrap_or_default();
            let min_s = self.min_scores.get(&board).copied().unwrap_or(0);
            entries.retain(|e| {
                e.score >= min_s && self.characters.get(&e.account_id).is_some()
            });
            entries.sort_by(|a, b| {
                b.score
                    .cmp(&a.score)
                    .then_with(|| a.reached_at_ns.cmp(&b.reached_at_ns))
                    .then_with(|| a.seq.cmp(&b.seq))
            });
            let num_winners = entries.len().min(4);
            if num_winners == 0 {
                continue;
            }
            let splits: [u8; 4] = match num_winners {
                1 => [100, 0, 0, 0],
                2 => [65, 35, 0, 0],
                3 => [50, 30, 20, 0],
                _ => [50, 25, 15, 10],
            };
            for (i, entry) in entries.iter().take(num_winners).enumerate() {
                let share_pct = splits[i];
                let nominal = board_pool * u128::from(share_pct) / 100;
                let already = assigned_to(&winners, &entry.account_id);
                let cap = self.remaining_prize_cap(&entry.account_id, already);
                let payout_yocto = nominal.min(cap);
                if payout_yocto == 0 {
                    continue;
                }
                total_payout = total_payout
                    .checked_add(payout_yocto)
                    .expect("payout overflow");
                winners.push(WinnerPayout {
                    board,
                    account_id: entry.account_id.clone(),
                    rank: (i + 1) as u8,
                    score: entry.score,
                    share_pct,
                    amount_near: NearToken::from_yoctonear(payout_yocto),
                    paid: false,
                });
            }
        }
        (winners, total_payout)
    }

    fn commit_epoch(
        &mut self,
        epoch_id: u64,
        settled_by: AccountId,
        settled_at_ns: u64,
        winners: Vec<WinnerPayout>,
        pool: NearToken,
    ) {
        let pool_yocto = pool.as_yoctonear();
        let mut paid_yocto: u128 = 0;
        for winner in &winners {
            if winner.paid {
                paid_yocto = paid_yocto
                    .checked_add(winner.amount_near.as_yoctonear())
                    .expect("paid sum overflow");
            }
        }
        require!(paid_yocto <= pool_yocto, "paid amount exceeds active pool");
        let rolled = pool_yocto - paid_yocto;
        let record = EpochSettlementRecord {
            epoch_id,
            settled_at_ns,
            settled_by,
            winners,
            total_payout_near: NearToken::from_yoctonear(paid_yocto),
            rolled_over_near: NearToken::from_yoctonear(rolled),
        };
        self.epoch_settlements.insert(epoch_id, record);
        // The active pool was already reduced when the prize moved into escrow.
        // Do not assign it from this snapshot: a deposit during the callback window must stay.
        self.current_epoch_id = self
            .current_epoch_id
            .checked_add(1)
            .expect("epoch overflow");
        self.epoch_start_time_ns = settled_at_ns;
        self.score_sync_complete = false;
        self.score_sync_cursor = 0;
        self.score_sync_len = 0;
        self.pending_settlement = None;
    }

    fn distribute_treasury_split(&mut self, deposit: NearToken) {
        let yocto = deposit.as_yoctonear();
        let active = yocto * 50 / 100;
        let reserve = yocto * 30 / 100;
        let dev_ops = yocto - active - reserve;
        self.treasury_active_pool = NearToken::from_yoctonear(
            self.treasury_active_pool
                .as_yoctonear()
                .checked_add(active)
                .expect("active pool overflow"),
        );
        self.treasury_reserve_pool = NearToken::from_yoctonear(
            self.treasury_reserve_pool
                .as_yoctonear()
                .checked_add(reserve)
                .expect("reserve pool overflow"),
        );
        self.treasury_dev_ops_pool = NearToken::from_yoctonear(
            self.treasury_dev_ops_pool
                .as_yoctonear()
                .checked_add(dev_ops)
                .expect("dev ops pool overflow"),
        );
    }

    /// `refund_surplus` refunds everything above storage and `treasury_fee`.
    /// Otherwise every yocto above storage enters the pools (mint and recharge).
    fn settle_deposit(&mut self, storage_before: u64, treasury_fee: u128, refund_surplus: bool) -> u128 {
        let caller = env::predecessor_account_id();
        // A mint or fee that can enter the pools needs its contribution slot inside this measurement.
        if !refund_surplus || treasury_fee > 0 {
            self.materialize_contribution(&caller);
        }
        let storage_fee = self.storage_fee_since(storage_before);
        let deposit = env::attached_deposit().as_yoctonear();
        let need = storage_fee
            .checked_add(treasury_fee)
            .expect("deposit requirement overflow");
        require!(
            deposit >= need,
            "insufficient NEAR: caller must pay new storage and the fee"
        );
        let above_storage = deposit - storage_fee;
        let (to_treasury, to_refund) = if refund_surplus {
            (treasury_fee, above_storage - treasury_fee)
        } else {
            (above_storage, 0)
        };
        if to_treasury > 0 {
            self.distribute_treasury_split(NearToken::from_yoctonear(to_treasury));
            self.credit_contributor(&env::predecessor_account_id(), to_treasury);
        }
        self.assert_liquid_covers_booked_and(to_refund);
        refund_predecessor(to_refund);
        to_treasury
    }

    /// Operator-funded storage. Nothing here is credited to a pool.
    /// If the account has no slack above the booked pools, 0.05 NEAR of the deposit is retained
    /// so the settlement callback can pay for its own storage.
    fn retain_operator_storage(&mut self, storage_before: u64) {
        let storage_fee = self.storage_fee_since(storage_before);
        let deposit = env::attached_deposit().as_yoctonear();
        let liquid_without_deposit = free_liquid_yocto().saturating_sub(deposit);
        let slack = liquid_without_deposit.saturating_sub(self.booked_yocto());
        let cushion = CALLBACK_CUSHION_YOCTO.saturating_sub(slack);
        let keep = storage_fee.checked_add(cushion).expect("operator deposit overflow");
        require!(
            deposit >= keep,
            "operator must attach NEAR for new storage"
        );
        let refund = deposit - keep;
        self.assert_liquid_covers_booked_and(refund);
        refund_predecessor(refund);
    }

    fn booked_yocto(&self) -> u128 {
        let mut total = self.treasury_active_pool.as_yoctonear();
        total = total
            .checked_add(self.treasury_reserve_pool.as_yoctonear())
            .expect("booked overflow");
        total = total
            .checked_add(self.treasury_dev_ops_pool.as_yoctonear())
            .expect("booked overflow");
        if let Some(inflight) = self.dev_ops_withdrawal {
            total = total
                .checked_add(inflight.as_yoctonear())
                .expect("booked overflow");
        }
        total
            .checked_add(self.settlement_escrow.as_yoctonear())
            .expect("booked overflow")
    }

    fn liquid_excluding_attached(&self) -> u128 {
        free_liquid_yocto().saturating_sub(env::attached_deposit().as_yoctonear())
    }

    /// `store` collections keep writes in memory until flushed. Measure storage only after flush,
    /// or the caller is not charged for bytes that land in the trie at the end of the call.
    fn flush_collections(&mut self) {
        self.characters.flush();
        self.points.flush();
        self.min_scores.flush();
        self.leaderboards.flush();
        self.epoch_settlements.flush();
        self.earned.flush();
        self.registered.flush();
        self.forge_items.flush();
        self.pending_forge.flush();
        self.pending_root.flush();
        self.credited_in.flush();
        self.paid_out.flush();
    }

    fn flushed(mut self) -> Self {
        self.flush_collections();
        self
    }

    fn storage_fee_since(&mut self, storage_before: u64) -> u128 {
        self.flush_collections();
        let growth = env::storage_usage().saturating_sub(storage_before);
        env::storage_byte_cost()
            .as_yoctonear()
            .checked_mul(u128::from(growth))
            .expect("storage fee overflow")
    }

    fn assert_liquid_covers_booked_and(&self, extra_outgoing: u128) {
        let need = self
            .booked_yocto()
            .checked_add(extra_outgoing)
            .expect("backing overflow");
        require!(
            free_liquid_yocto() >= need,
            "liquid balance does not cover booked pools"
        );
    }
}

fn payment_kind(payment_method: &str) -> bool {
    require!(
        payment_method.len() <= MAX_PAYMENT_METHOD_BYTES as usize,
        "payment_method exceeds 16 bytes"
    );
    match payment_method.trim().to_ascii_uppercase().as_str() {
        "NEAR" => true,
        "POINTS" => false,
        _ => env::panic_str("payment_method must be NEAR or POINTS"),
    }
}

fn bounded_text(value: &str, max_bytes: u32, label: &str) -> String {
    let trimmed = value.trim();
    require!(!trimmed.is_empty(), format!("{label} cannot be empty"));
    require!(
        trimmed.len() <= max_bytes as usize,
        format!("{label} exceeds {max_bytes} bytes")
    );
    trimmed.to_string()
}

fn bounded_prefix(prefix: Option<String>) -> String {
    let prefix = prefix.unwrap_or_else(|| "XIANXIA".to_string());
    bounded_text(&prefix, MAX_SEED_PREFIX_BYTES, "seed_prefix")
}

fn decode_hex_32(input: &str) -> [u8; 32] {
    require!(input.len() == 64, "expected 64 hex characters");
    let bytes = input.as_bytes();
    let mut out = [0u8; 32];
    let mut i = 0;
    while i < 32 {
        out[i] = (hex_val(bytes[i * 2]) << 4) | hex_val(bytes[i * 2 + 1]);
        i += 1;
    }
    out
}

fn hex_val(byte: u8) -> u8 {
    match byte {
        b'0'..=b'9' => byte - b'0',
        b'a'..=b'f' => byte - b'a' + 10,
        b'A'..=b'F' => byte - b'A' + 10,
        _ => env::panic_str("invalid hex"),
    }
}

fn encode_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push(HEX[(byte >> 4) as usize] as char);
        out.push(HEX[(byte & 0x0f) as usize] as char);
    }
    out
}

fn mix_digest(commit_seed: &[u8; 32], secret: &[u8; 32]) -> [u8; 32] {
    let mut material = [0u8; 64];
    material[..32].copy_from_slice(commit_seed);
    material[32..].copy_from_slice(secret);
    env::sha256_array(&material)
}

fn roll_percent(digest: &[u8; 32]) -> u64 {
    let mut bytes = [0u8; 8];
    bytes.copy_from_slice(&digest[..8]);
    u64::from_be_bytes(bytes) % 100
}

fn forge_from_digest(digest: &[u8; 32]) -> (ForgeRarity, u32, String) {
    let (rarity, atk_min, atk_max, name) = match roll_percent(digest) {
        99 => (
            ForgeRarity::Heaven,
            260,
            350,
            "太乙分光诛仙剑 [天品灵宝 · 混沌初开 · 寂灭]",
        ),
        94..=98 => (
            ForgeRarity::Earth,
            160,
            240,
            "青霄游龙剑 [地品灵宝 · 千锤百炼 · 破军]",
        ),
        80..=93 => (
            ForgeRarity::Mystic,
            105,
            150,
            "玄铁寒光剑 [玄品灵兵 · 精金淬炼 · 穿云]",
        ),
        50..=79 => (
            ForgeRarity::Spiritual,
            65,
            95,
            "精钢流光剑 [灵品法剑 · 灵液开刃 · 斩风]",
        ),
        _ => (
            ForgeRarity::Ordinary,
            35,
            60,
            "百炼青锋剑 [凡品灵兵 · 百炼精铁 · 凌风]",
        ),
    };
    let spread = atk_max - atk_min + 1;
    let mut offset_bytes = [0u8; 4];
    offset_bytes.copy_from_slice(&digest[8..12]);
    let atk_bonus = atk_min + (u32::from_be_bytes(offset_bytes) % spread);
    (rarity, atk_bonus, name.to_string())
}

fn spirit_root_from_digest(digest: &[u8; 32]) -> String {
    match roll_percent(digest) {
        99 => "仙品 · 太初星辰剑灵根 (HP+25%, ATK+25%)".to_string(),
        94..=98 => "天品 · 九天玄霄雷灵根 (HP+15%, ATK+15%)".to_string(),
        80..=93 => "地品 · 乾坤造化纯阳根 (HP+10%, ATK+5%)".to_string(),
        50..=79 => "玄品 · 厚土固本灵根 (HP+5%, ATK+0%)".to_string(),
        _ => "凡品 · 五行凡脉杂灵根 (HP+0%, ATK+0%)".to_string(),
    }
}

fn free_liquid_yocto() -> u128 {
    let stake = env::storage_byte_cost()
        .as_yoctonear()
        .checked_mul(u128::from(env::storage_usage()))
        .expect("storage stake overflow");
    env::account_balance().as_yoctonear().saturating_sub(stake)
}

fn refund_predecessor(yocto: u128) {
    if yocto > 0 {
        let _ = Promise::new(env::predecessor_account_id()).transfer(NearToken::from_yoctonear(yocto));
    }
}

fn promise_succeeded(index: u64) -> bool {
    env::promise_result_checked(index, 128).is_ok()
}

fn assigned_to(winners: &[WinnerPayout], account: &AccountId) -> u128 {
    winners
        .iter()
        .filter(|winner| &winner.account_id == account)
        .fold(0u128, |sum, winner| {
            sum.checked_add(winner.amount_near.as_yoctonear())
                .expect("assigned overflow")
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::{testing_env, AccountId, Gas, NearToken, PromiseResult};
    use std::collections::HashMap;

    fn set_env(
        predecessor: &str,
        deposit: NearToken,
        timestamp_ns: u64,
        block_height: u64,
        balance: NearToken,
        seed: [u8; 32],
    ) {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id("treasury.near".parse().unwrap())
            .predecessor_account_id(predecessor.parse().unwrap())
            .attached_deposit(deposit)
            .block_timestamp(timestamp_ns)
            .block_height(block_height)
            .account_balance(balance)
            .random_seed(seed)
            .prepaid_gas(Gas::from_tgas(300));
        testing_env!(builder.build());
    }

    fn env_of(predecessor: &str, deposit: NearToken, timestamp_ns: u64) {
        set_env(
            predecessor,
            deposit,
            timestamp_ns,
            1,
            NearToken::from_near(1_000),
            [7u8; 32],
        );
    }

    fn callback_env(results: Vec<PromiseResult>, timestamp_ns: u64) {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id("treasury.near".parse().unwrap())
            .predecessor_account_id("treasury.near".parse().unwrap())
            .block_timestamp(timestamp_ns)
            .block_height(20)
            .account_balance(NearToken::from_near(1_000))
            .prepaid_gas(Gas::from_tgas(300));
        testing_env!(
            builder.build(),
            near_sdk::test_vm_config(),
            near_sdk::RuntimeFeesConfig::test(),
            HashMap::<String, NearToken>::new(),
            results,
        );
    }

    fn init(duration: Option<u64>) -> DaoAscensionContract {
        env_of("owner.near", NearToken::from_near(0), 1_000_000_000);
        DaoAscensionContract::new(
            "owner.near".parse().unwrap(),
            "operator.near".parse().unwrap(),
            duration,
        )
    }

    fn pools(contract: &DaoAscensionContract) -> (u128, u128, u128) {
        let snap = contract.get_treasury_snapshot();
        (
            snap.active_pool_near.as_yoctonear(),
            snap.reserve_pool_near.as_yoctonear(),
            snap.dev_ops_pool_near.as_yoctonear(),
        )
    }

    fn mint(contract: &mut DaoAscensionContract, account: &str, timestamp_ns: u64) {
        env_of(account, NearToken::from_near(1), timestamp_ns);
        contract.mint_character(format!("{account}-dao"), "swordsman".to_string(), None);
    }

    #[test]
    fn test_character_mint_storage_limit_and_soulbound() {
        let mut contract = init(None);
        env_of("alice.near", NearToken::from_near(1), 1_000_000_000);
        let too_long = "a".repeat((MAX_DAO_NAME_BYTES as usize) + 1);
        let rejected = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.mint_character(too_long, "swordsman".to_string(), None);
        }));
        assert!(rejected.is_err(), "overlong dao_name must fail before it is stored");

        let meta = contract.mint_character("太清仙子".to_string(), "saintess".to_string(), None);
        assert_eq!(meta.dao_name, "太清仙子");
        assert!(meta.is_soulbound);
        let (active, reserve, dev) = pools(&contract);
        let credited = active + reserve + dev;
        assert!(credited < YOCTO_PER_NEAR, "storage stake must not be booked into the pools");
        assert_eq!(active, credited * 50 / 100);
        assert_eq!(reserve, credited * 30 / 100);
        assert_eq!(dev, credited - active - reserve);

        let duplicate = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.mint_character("重塑者".to_string(), "swordsman".to_string(), None);
        }));
        assert!(duplicate.is_err(), "duplicate mint must fail");
    }

    #[test]
    fn test_mint_without_storage_deposit_is_rejected() {
        let mut contract = init(None);
        env_of("alice.near", NearToken::from_near(0), 1_000_000_000);
        let rejected = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.mint_character("太清仙子".to_string(), "saintess".to_string(), None);
        }));
        assert!(rejected.is_err(), "caller must pay for the new character bytes");
    }

    #[test]
    fn test_soulbound_transfer_forbidden() {
        let mut contract = init(None);
        env_of("alice.near", NearToken::from_near(0), 1_000_000_000);
        let rejected = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.nft_transfer();
        }));
        assert!(rejected.is_err(), "soulbound transfer must be forbidden");
    }

    #[test]
    fn test_points_split_excludes_storage_and_points_payment_refunds_near() {
        let mut contract = init(None);
        env_of("alice.near", NearToken::from_near(5), 1_000_000_000);
        let stones = contract.recharge_points();
        let (active, reserve, dev) = pools(&contract);
        let credited = active + reserve + dev;
        assert!(credited < 5 * YOCTO_PER_NEAR);
        assert_eq!(active, credited * 50 / 100);
        assert_eq!(reserve, credited * 30 / 100);
        assert_eq!(dev, credited - active - reserve);
        assert_eq!(
            stones as u128,
            credited * u128::from(contract.spirit_stones_per_near) / YOCTO_PER_NEAR
        );
        assert!(stones >= contract.reshape_fee_points);

        mint(&mut contract, "alice.near", 1_000_000_000);
        let before = pools(&contract);
        env_of("alice.near", NearToken::from_near(3), 1_000_000_000);
        contract.reshape_dao_body("新名".to_string(), "saintess".to_string(), "POINTS".to_string());
        assert_eq!(pools(&contract), before, "attached NEAR on a points payment must not enter the pools");
        assert_eq!(
            contract.get_points("alice.near".parse().unwrap()),
            stones - contract.reshape_fee_points
        );

        let overlong = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.reshape_dao_body(
                "b".repeat((MAX_DAO_NAME_BYTES as usize) + 1),
                "saintess".to_string(),
                "POINTS".to_string(),
            );
        }));
        assert!(overlong.is_err(), "overlong reshape name must fail");
    }

    #[test]
    fn test_scores_come_only_from_the_player_who_paid() {
        let mut contract = init(None);
        mint(&mut contract, "alice.near", 1_000_000_000);
        env_of("alice.near", NearToken::from_near(2), 1_000_000_000);
        contract.recharge_points();

        env_of("attacker.near", NearToken::from_near(1), 1_000_000_000);
        let unauthorized = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.report_scores(1, 20);
        }));
        assert!(unauthorized.is_err(), "a non-operator cannot write scores");

        env_of("alice.near", NearToken::from_near(1), 1_000_000_000);
        let score = contract.practice(BoardType::Slayer);
        assert_eq!(score, 1);
        assert_eq!(
            contract.get_earned_score("alice.near".parse().unwrap(), BoardType::Slayer),
            1
        );
        assert_eq!(
            contract.get_earned_score("operator.near".parse().unwrap(), BoardType::Slayer),
            0
        );

        env_of("operator.near", NearToken::from_near(1), 8 * 24 * 3600 * 1_000_000_000);
        let status = contract.report_scores(1, 20);
        assert!(status.complete);
        let board = contract.get_board(1, BoardType::Slayer);
        assert_eq!(board.len(), 1);
        assert_eq!(board[0].account_id.as_str(), "alice.near");
        assert_eq!(board[0].score, 1);
    }

    #[test]
    fn test_tie_break_still_prefers_the_earlier_player() {
        let mut contract = init(None);
        mint(&mut contract, "alice.near", 1_000_000_000);
        mint(&mut contract, "bob.near", 1_000_000_000);
        env_of("alice.near", NearToken::from_near(1), 1_000_000_000);
        contract.recharge_points();
        env_of("bob.near", NearToken::from_near(1), 1_000_000_000);
        contract.recharge_points();

        env_of("alice.near", NearToken::from_near(1), 2_000_000_000);
        contract.practice(BoardType::Slayer);
        env_of("bob.near", NearToken::from_near(1), 3_000_000_000);
        contract.practice(BoardType::Slayer);

        env_of("operator.near", NearToken::from_near(1), 8 * 24 * 3600 * 1_000_000_000);
        contract.report_scores(1, 20);
        let board = contract.get_board(1, BoardType::Slayer);
        assert_eq!(board[0].account_id.as_str(), "alice.near");
        assert_eq!(board[1].account_id.as_str(), "bob.near");
        assert_eq!(board[0].score, board[1].score);
    }

    #[test]
    fn test_settlement_is_operator_only_and_waits_for_transfer_results() {
        let epoch_duration = 600 * 1_000_000_000;
        let mut contract = init(Some(epoch_duration));
        mint(&mut contract, "alice.near", 1_000_000_000);
        mint(&mut contract, "bob.near", 1_000_000_000);
        env_of("alice.near", NearToken::from_near(10), 1_000_000_000);
        contract.recharge_points();
        env_of("bob.near", NearToken::from_near(1), 1_000_000_000);
        contract.recharge_points();
        env_of("alice.near", NearToken::from_near(1), 1_000_000_000);
        contract.practice(BoardType::Slayer);
        env_of("bob.near", NearToken::from_near(1), 2_000_000_000);
        contract.practice(BoardType::Slayer);

        env_of("operator.near", NearToken::from_near(1), 100 * 1_000_000_000);
        let early = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.settle(1);
        }));
        assert!(early.is_err(), "settlement before the epoch ends must fail");

        env_of("anyone.near", NearToken::from_near(1), 700 * 1_000_000_000);
        let stranger = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.settle(1);
        }));
        assert!(stranger.is_err(), "a stranger must not settle");

        env_of("operator.near", NearToken::from_near(1), 700 * 1_000_000_000);
        contract.report_scores(1, 20);
        let (active_before, reserve_before, dev_before) = pools(&contract);
        let started = contract.settle(1);
        assert!(!started.finalized);
        assert!(contract.get_settlement(1).is_none(), "epoch must not be marked settled before receipts");
        assert_eq!(contract.current_epoch_id, 1);
        let escrow = contract.get_settlement_escrow().as_yoctonear();
        let (active_held, reserve_held, dev_held) = pools(&contract);
        assert!(escrow > 0, "the scheduled prize must leave the active pool immediately");
        assert_eq!(active_held + escrow, active_before);
        assert_eq!(reserve_held, reserve_before);
        assert_eq!(dev_held, dev_before);

        callback_env(
            vec![
                PromiseResult::Successful(vec![]),
                PromiseResult::Successful(vec![]),
            ],
            700 * 1_000_000_000,
        );
        contract.on_settle_payouts();
        let record = contract.get_settlement(1).unwrap();
        assert_eq!(record.settled_by.as_str(), "operator.near");
        assert_eq!(record.winners.len(), 2);
        assert!(record.winners.iter().all(|winner| winner.paid));
        let slayer_pool = active_before * 30 / 100;
        assert_eq!(record.winners[0].amount_near.as_yoctonear(), slayer_pool * 65 / 100);
        assert_eq!(record.winners[1].amount_near.as_yoctonear(), slayer_pool * 35 / 100);
        assert!(record.total_payout_near.as_yoctonear() <= active_before);
        let (active_after, reserve_after, dev_after) = pools(&contract);
        assert_eq!(reserve_after, reserve_before, "reserve must not be drawn into the prize");
        assert_eq!(dev_after, dev_before);
        assert_eq!(contract.get_settlement_escrow().as_yoctonear(), 0);
        assert_eq!(active_after, active_before - record.total_payout_near.as_yoctonear());
        assert_eq!(contract.current_epoch_id, 2);

        env_of("operator.near", NearToken::from_near(1), 700 * 1_000_000_000);
        let duplicate = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.settle(1);
        }));
        assert!(duplicate.is_err(), "the same epoch cannot be settled twice");
    }

    #[test]
    fn test_failed_transfer_stays_in_the_next_active_pool() {
        let epoch_duration = 600 * 1_000_000_000;
        let mut contract = init(Some(epoch_duration));
        mint(&mut contract, "alice.near", 1_000_000_000);
        env_of("alice.near", NearToken::from_near(10), 1_000_000_000);
        contract.recharge_points();
        env_of("alice.near", NearToken::from_near(1), 1_000_000_000);
        contract.practice(BoardType::Slayer);

        env_of("operator.near", NearToken::from_near(1), 700 * 1_000_000_000);
        contract.report_scores(1, 20);
        let (active_before, reserve_before, _) = pools(&contract);
        contract.settle(1);
        callback_env(vec![PromiseResult::Failed], 700 * 1_000_000_000);
        contract.on_settle_payouts();

        let record = contract.get_settlement(1).unwrap();
        assert!(!record.winners[0].paid);
        assert_eq!(record.total_payout_near.as_yoctonear(), 0);
        let (active_after, reserve_after, _) = pools(&contract);
        assert_eq!(contract.get_settlement_escrow().as_yoctonear(), 0);
        assert_eq!(active_after, active_before);
        assert_eq!(reserve_after, reserve_before);
        assert_eq!(record.rolled_over_near.as_yoctonear(), active_before);
        assert_eq!(
            contract
                .get_contribution("alice.near".parse().unwrap())
                .paid_out
                .as_yoctonear(),
            0
        );
    }

    #[test]
    fn test_settlement_does_not_record_when_liquid_balance_is_short() {
        let epoch_duration = 600 * 1_000_000_000;
        let mut contract = init(Some(epoch_duration));
        mint(&mut contract, "alice.near", 1_000_000_000);
        env_of("alice.near", NearToken::from_near(10), 1_000_000_000);
        contract.recharge_points();
        env_of("alice.near", NearToken::from_near(1), 1_000_000_000);
        contract.practice(BoardType::Slayer);
        env_of("operator.near", NearToken::from_near(1), 700 * 1_000_000_000);
        contract.report_scores(1, 20);

        set_env(
            "operator.near",
            NearToken::from_near(1),
            700 * 1_000_000_000,
            1,
            NearToken::from_yoctonear(1),
            [7u8; 32],
        );
        let rejected = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.settle(1);
        }));
        assert!(rejected.is_err(), "a shortfall must abort before the epoch is recorded");
        assert!(contract.get_settlement(1).is_none());
        assert!(contract.get_pending_settlement().is_none());
        assert_eq!(contract.current_epoch_id, 1);
    }

    #[test]
    fn test_forge_commit_reveal_is_stored_and_ignores_timestamp() {
        let mut contract = init(None);
        mint(&mut contract, "alice.near", 1_000_000_000);
        let secret = [9u8; 32];
        env_of("alice.near", NearToken::from_near(0), 1_000_000_000);
        let commitment = encode_hex(&env::sha256_array(&secret));

        set_env(
            "alice.near",
            NearToken::from_near(1),
            1_000_000_000,
            4,
            NearToken::from_near(1_000),
            [3u8; 32],
        );
        contract.commit_forge(commitment, Some("TAICHI".to_string()));
        assert_eq!(
            contract.get_earned_score("alice.near".parse().unwrap(), BoardType::Blacksmith),
            1
        );

        let same_block = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.reveal_forge(encode_hex(&secret));
        }));
        assert!(same_block.is_err(), "reveal in the commit block must fail");

        set_env(
            "alice.near",
            NearToken::from_near(1),
            9_000_000_000_000,
            5,
            NearToken::from_near(1_000),
            [9u8; 32],
        );
        let item = contract.reveal_forge(encode_hex(&secret));
        let digest = mix_digest(&[3u8; 32], &secret);
        let (rarity, atk, name) = forge_from_digest(&digest);
        assert_eq!(item.name, name);
        assert_eq!(item.rarity, rarity);
        assert_eq!(item.atk_bonus, atk);
        assert_eq!(item.prefix, "TAICHI");
        assert_eq!(contract.get_forge_item("alice.near".parse().unwrap()).unwrap(), item);
        assert_eq!(
            contract.get_earned_score("alice.near".parse().unwrap(), BoardType::Blacksmith),
            1,
            "reveal must not mint a second score"
        );
    }

    #[test]
    fn test_treasury_account_cannot_be_owner_or_operator() {
        set_env(
            "dao-ascension.near",
            NearToken::from_near(0),
            1_000_000_000,
            1,
            NearToken::from_near(1_000),
            [7u8; 32],
        );
        // current account is treasury.near, so this init is rejected for a different reason
        // only when the admin id equals the contract account. Use the contract account itself.
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id("dao-ascension.near".parse().unwrap())
            .predecessor_account_id("dao-ascension.near".parse().unwrap())
            .block_timestamp(1_000_000_000)
            .account_balance(NearToken::from_near(1_000))
            .prepaid_gas(Gas::from_tgas(300));
        testing_env!(builder.build());
        let rejected = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            DaoAscensionContract::new(
                "dao-ascension.near".parse().unwrap(),
                "dao-ascension.near".parse().unwrap(),
                None,
            );
        }));
        assert!(rejected.is_err(), "the treasury account cannot be the admin");
    }

    #[test]
    fn test_dev_ops_withdraw_does_not_touch_player_pools() {
        let mut contract = init(None);
        env_of("alice.near", NearToken::from_near(2), 1_000_000_000);
        contract.recharge_points();
        let (active_before, reserve_before, dev_before) = pools(&contract);
        assert!(dev_before > 0);

        env_of("operator.near", NearToken::from_yoctonear(1), 1_000_000_000);
        let denied = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.withdraw_dev_ops();
        }));
        assert!(denied.is_err(), "operator must not withdraw dev ops");

        env_of("owner.near", NearToken::from_near(0), 1_000_000_000);
        let missing_yocto = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.withdraw_dev_ops();
        }));
        assert!(missing_yocto.is_err(), "dev ops withdraw requires exactly 1 yoctoNEAR");
        assert_eq!(pools(&contract).2, dev_before);

        env_of("owner.near", NearToken::from_yoctonear(1), 1_000_000_000);
        let amount = contract.withdraw_dev_ops();
        assert_eq!(amount.as_yoctonear(), dev_before);
        assert_eq!(pools(&contract).0, active_before);
        assert_eq!(pools(&contract).1, reserve_before);
        assert_eq!(pools(&contract).2, 0);

        callback_env(vec![PromiseResult::Failed], 1_000_000_000);
        contract.on_dev_ops_withdrawn();
        let (active_after, reserve_after, dev_after) = pools(&contract);
        assert_eq!(active_after, active_before);
        assert_eq!(reserve_after, reserve_before);
        assert_eq!(dev_after, dev_before, "a failed withdraw must restore only the dev ops ledger");
    }

    #[test]
    fn test_recharge_during_settlement_stays_in_the_active_pool() {
        let epoch_duration = 600 * 1_000_000_000;
        let mut contract = init(Some(epoch_duration));
        mint(&mut contract, "alice.near", 1_000_000_000);
        env_of("alice.near", NearToken::from_near(10), 1_000_000_000);
        contract.recharge_points();
        env_of("alice.near", NearToken::from_near(1), 1_000_000_000);
        contract.practice(BoardType::Slayer);

        env_of("operator.near", NearToken::from_near(1), 700 * 1_000_000_000);
        contract.report_scores(1, 20);
        let active_before = pools(&contract).0;
        contract.settle(1);
        let escrow = contract.get_settlement_escrow().as_yoctonear();
        let active_held = pools(&contract).0;
        assert!(escrow > 0);
        assert_eq!(active_held + escrow, active_before);

        env_of("bob.near", NearToken::from_near(4), 710 * 1_000_000_000);
        contract.recharge_points();
        let bob_active = contract
            .get_contribution("bob.near".parse().unwrap())
            .credited_in
            .as_yoctonear()
            * 50
            / 100;
        assert_eq!(pools(&contract).0, active_held + bob_active);

        callback_env(vec![PromiseResult::Successful(vec![])], 720 * 1_000_000_000);
        contract.on_settle_payouts();
        assert_eq!(
            pools(&contract).0,
            active_held + bob_active,
            "a deposit that lands after settle must stay in the active pool"
        );
        assert_eq!(contract.get_settlement_escrow().as_yoctonear(), 0);
    }

    #[test]
    fn test_prize_cannot_exceed_the_winners_own_deposit() {
        let epoch_duration = 600 * 1_000_000_000;
        let mut contract = init(Some(epoch_duration));
        mint(&mut contract, "alice.near", 1_000_000_000);
        env_of("whale.near", NearToken::from_near(30), 1_000_000_000);
        contract.recharge_points();
        env_of("alice.near", NearToken::from_near(1), 1_000_000_000);
        contract.recharge_points();
        env_of("alice.near", NearToken::from_near(1), 2_000_000_000);
        contract.practice(BoardType::Slayer);
        env_of("alice.near", NearToken::from_near(1), 3_000_000_000);
        contract.practice(BoardType::Alchemy);

        env_of("operator.near", NearToken::from_near(1), 700 * 1_000_000_000);
        contract.report_scores(1, 20);
        let (active_before, reserve_before, dev_before) = pools(&contract);
        let credit = contract
            .get_contribution("alice.near".parse().unwrap())
            .credited_in
            .as_yoctonear();
        let uncapped = active_before * 30 / 100 + active_before * 20 / 100;
        assert!(credit > 0);
        assert!(
            credit < uncapped,
            "alice must not be able to take both board shares from the whale's deposit"
        );

        contract.settle(1);
        let pending = contract.get_pending_settlement().expect("alice still has a capped prize");
        let paid: u128 = pending
            .winners
            .iter()
            .map(|winner| winner.amount_near.as_yoctonear())
            .sum();
        assert_eq!(paid, credit);
        assert!(pending
            .winners
            .iter()
            .all(|winner| winner.account_id.as_str() == "alice.near"));

        let mut results = Vec::new();
        for _ in 0..pending.winners.len() {
            results.push(PromiseResult::Successful(vec![]));
        }
        callback_env(results, 720 * 1_000_000_000);
        contract.on_settle_payouts();
        let (active_after, reserve_after, dev_after) = pools(&contract);
        assert_eq!(active_after, active_before - credit);
        assert_eq!(reserve_after, reserve_before);
        assert_eq!(dev_after, dev_before);
        assert_eq!(
            contract
                .get_contribution("alice.near".parse().unwrap())
                .paid_out
                .as_yoctonear(),
            credit
        );
        assert_eq!(
            contract
                .get_contribution("whale.near".parse().unwrap())
                .paid_out
                .as_yoctonear(),
            0
        );
    }

    #[test]
    fn test_account_without_a_deposit_is_paid_nothing() {
        let epoch_duration = 600 * 1_000_000_000;
        let mut contract = init(Some(epoch_duration));
        env_of("whale.near", NearToken::from_near(5), 1_000_000_000);
        contract.recharge_points();
        let carol: AccountId = "carol.near".parse().unwrap();
        contract.characters.insert(
            carol.clone(),
            CharacterMeta {
                token_id: format!("cultivator-nft:{carol}"),
                owner_id: carol.clone(),
                dao_name: "carol".to_string(),
                avatar_class: "swordsman".to_string(),
                spirit_root: "凡品".to_string(),
                minted_at_ns: 1,
                reshaped_at_ns: 1,
                is_soulbound: true,
            },
        );
        contract.registered.insert(carol.clone());
        contract.earned.insert((carol.clone(), BoardType::Slayer), 5);
        let active_before = pools(&contract).0;
        assert!(active_before > 0);
        assert_eq!(
            contract.get_contribution(carol).credited_in.as_yoctonear(),
            0
        );

        env_of("operator.near", NearToken::from_near(1), 700 * 1_000_000_000);
        contract.report_scores(1, 20);
        let started = contract.settle(1);
        assert!(started.finalized, "a zero cap produces no transfer");
        assert!(contract.get_pending_settlement().is_none());
        assert_eq!(pools(&contract).0, active_before);
        assert_eq!(contract.get_settlement_escrow().as_yoctonear(), 0);
        assert!(contract.get_settlement(1).unwrap().winners.is_empty());
    }

    #[test]
    fn test_one_failed_transfer_returns_only_that_amount() {
        let epoch_duration = 600 * 1_000_000_000;
        let mut contract = init(Some(epoch_duration));
        mint(&mut contract, "alice.near", 1_000_000_000);
        mint(&mut contract, "bob.near", 1_000_000_000);
        env_of("alice.near", NearToken::from_near(10), 1_000_000_000);
        contract.recharge_points();
        env_of("bob.near", NearToken::from_near(10), 1_000_000_000);
        contract.recharge_points();
        env_of("alice.near", NearToken::from_near(1), 2_000_000_000);
        contract.practice(BoardType::Slayer);
        env_of("bob.near", NearToken::from_near(1), 3_000_000_000);
        contract.practice(BoardType::Slayer);

        env_of("operator.near", NearToken::from_near(1), 700 * 1_000_000_000);
        contract.report_scores(1, 20);
        let active_before = pools(&contract).0;
        contract.settle(1);
        let pending = contract.get_pending_settlement().unwrap();
        assert_eq!(pending.winners[0].account_id.as_str(), "alice.near");
        assert_eq!(pending.winners[1].account_id.as_str(), "bob.near");
        let alice_prize = pending.winners[0].amount_near.as_yoctonear();
        let bob_prize = pending.winners[1].amount_near.as_yoctonear();
        assert!(alice_prize > 0 && bob_prize > 0);

        callback_env(
            vec![PromiseResult::Successful(vec![]), PromiseResult::Failed],
            720 * 1_000_000_000,
        );
        contract.on_settle_payouts();
        let record = contract.get_settlement(1).unwrap();
        assert!(record.winners[0].paid);
        assert!(!record.winners[1].paid);
        assert_eq!(pools(&contract).0, active_before - alice_prize);
        assert_eq!(contract.get_settlement_escrow().as_yoctonear(), 0);
        assert_eq!(
            contract
                .get_contribution("alice.near".parse().unwrap())
                .paid_out
                .as_yoctonear(),
            alice_prize
        );
        assert_eq!(
            contract
                .get_contribution("bob.near".parse().unwrap())
                .paid_out
                .as_yoctonear(),
            0
        );
    }

    #[test]
    fn test_owner_can_move_reserve_onto_the_active_ledger() {
        let mut contract = init(None);
        env_of("alice.near", NearToken::from_near(2), 1_000_000_000);
        contract.recharge_points();
        let (active_before, reserve_before, dev_before) = pools(&contract);
        assert!(reserve_before > 1);

        env_of("operator.near", NearToken::from_yoctonear(1), 1_000_000_000);
        let denied = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.release_reserve_to_active(NearToken::from_yoctonear(1));
        }));
        assert!(denied.is_err(), "operator must not move the reserve");

        env_of("owner.near", NearToken::from_near(0), 1_000_000_000);
        let missing_yocto = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.release_reserve_to_active(NearToken::from_yoctonear(1));
        }));
        assert!(missing_yocto.is_err(), "reserve release requires exactly 1 yoctoNEAR");
        assert_eq!(pools(&contract), (active_before, reserve_before, dev_before));

        env_of("owner.near", NearToken::from_yoctonear(1), 1_000_000_000);
        let too_much = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.release_reserve_to_active(NearToken::from_yoctonear(reserve_before + 1));
        }));
        assert!(too_much.is_err(), "a release cannot exceed the reserve");
        assert_eq!(pools(&contract), (active_before, reserve_before, dev_before));

        let release = reserve_before / 2;
        contract.release_reserve_to_active(NearToken::from_yoctonear(release));
        assert_eq!(pools(&contract).0, active_before + release);
        assert_eq!(pools(&contract).1, reserve_before - release);
        assert_eq!(pools(&contract).2, dev_before);
    }
}
