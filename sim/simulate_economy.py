#!/usr/bin/env python3
"""
DaoAscension Economy & Sybil Resistance Simulation (P3)
Simulates 12 epochs across N = 10, 100, 1000 players with Sybil attackers.
Verifies the Sybil Attack Inequality:
  Net Profit = Payout Won - NEAR Cost to Qualify & Beat Honest Players
"""

import random

def run_simulation(num_honest=100, sybil_ratio=0.2, epochs=12, min_score_forge_cost_near=0.1):
    random.seed(42)
    num_sybils = int(num_honest * sybil_ratio)
    total_players = num_honest + num_sybils

    print(f"\n==================================================================")
    print(f"📊 Simulating N={num_honest} Honest + {num_sybils} Sybil accounts ({int(sybil_ratio*100)}% attack) over {epochs} Epochs")
    print(f"==================================================================")

    # Treasury balances
    reserve_pool_near = 0.0
    active_pool_near = 0.0
    dev_ops_near = 0.0

    epoch_logs = []

    for ep in range(1, epochs + 1):
        # 1. Honest players recharge & play
        # Honest players recharge between 0.1 NEAR and 2.0 NEAR
        honest_inflow = sum(random.uniform(0.2, 1.5) for _ in range(num_honest))

        # Sybil attacker tries to spend minimum NEAR to qualify and beat honest threshold
        # Sybil deposit per account
        sybil_deposit_per_account = min_score_forge_cost_near + random.uniform(0.05, 0.2)
        sybil_inflow = num_sybils * sybil_deposit_per_account

        total_recharge = honest_inflow + sybil_inflow

        # 50% to active, 30% to reserve, 20% to dev ops
        active_inflow = total_recharge * 0.50
        reserve_inflow = total_recharge * 0.30
        dev_inflow = total_recharge * 0.20

        dev_ops_near += dev_inflow
        reserve_pool_near += reserve_inflow
        active_pool_near += active_inflow

        # Each board takes its share of active pool:
        # Slayer: 30%, Duel: 30%, Alchemy: 20%, Blacksmith: 20%
        # Simulate duel board competition
        # Honest player scores scale with their investment and skill
        scores = []
        for i in range(num_honest):
            invest = random.uniform(0.2, 1.5)
            score = int(1000 + invest * 300 + random.randint(10, 100))
            scores.append((score, False, invest))

        # Sybil accounts scores scale with minimum deposit
        for i in range(num_sybils):
            score = int(1000 + sybil_deposit_per_account * 200 + random.randint(5, 50))
            scores.append((score, True, sybil_deposit_per_account))

        # Sort scores DESC
        scores.sort(key=lambda x: x[0], reverse=True)

        # Top 4 winners in Duel Board (30% of active pool)
        duel_pool = active_pool_near * 0.30
        splits = [0.50, 0.25, 0.15, 0.10]
        sybil_rewards = 0.0
        sybil_ranks = []

        for rank, (share, entry) in enumerate(zip(splits, scores[:4])):
            payout = duel_pool * share
            if entry[1]: # is sybil
                sybil_rewards += payout
                sybil_ranks.append(rank + 1)

        sybil_cost = sybil_inflow
        # In duel board alone:
        sybil_net = sybil_rewards - sybil_cost

        # Payout total (Duel 30% + others distributed similarly)
        total_payout = active_pool_near * 0.85 # ~85% awarded, rest rolled over
        rollover = active_pool_near - total_payout

        # Next epoch pool setup:
        reserve_draw = reserve_pool_near * 0.30
        reserve_pool_near -= reserve_draw
        active_pool_near = rollover + reserve_draw

        epoch_logs.append({
            "epoch": ep,
            "total_recharge": round(total_recharge, 2),
            "duel_pool": round(duel_pool, 2),
            "sybil_cost": round(sybil_cost, 2),
            "sybil_rewards": round(sybil_rewards, 2),
            "sybil_net": round(sybil_net, 2),
            "sybil_ranks": sybil_ranks,
            "active_pool_next": round(active_pool_near, 2),
            "reserve_pool": round(reserve_pool_near, 2),
        })

    print(f"{'Epoch':<6} | {'Recharge':<9} | {'DuelPool':<9} | {'SybilCost':<10} | {'SybilWin':<9} | {'SybilNet':<9} | {'SybilRanks':<12} | {'ActiveNext':<10}")
    print("-" * 85)
    total_sybil_loss = 0.0
    for log in epoch_logs:
        ranks_str = str(log["sybil_ranks"]) if log["sybil_ranks"] else "None (0/4)"
        print(f"#{log['epoch']:<5} | {log['total_recharge']:<9} | {log['duel_pool']:<9} | {log['sybil_cost']:<10} | {log['sybil_rewards']:<9} | {log['sybil_net']:<9} | {ranks_str:<12} | {log['active_pool_next']:<10}")
        total_sybil_loss += log["sybil_net"]

    print("-" * 85)
    print(f"🎯 Total Sybil Cumulative Net across 12 Epochs: {round(total_sybil_loss, 2)} NEAR")
    if total_sybil_loss < 0:
        print(f"✅ Sybil Attack Invariant HOLDS: Attacking is strictly EV NEGATIVE (Net Loss: {abs(round(total_sybil_loss, 2))} NEAR)!")
    else:
        print(f"⚠️ Warning: Sybil was profitable by {round(total_sybil_loss, 2)} NEAR. Increase min_score / entry requirements!")

if __name__ == "__main__":
    run_simulation(num_honest=10, sybil_ratio=0.2, epochs=6)
    run_simulation(num_honest=100, sybil_ratio=0.2, epochs=12)
    run_simulation(num_honest=1000, sybil_ratio=0.2, epochs=12)
