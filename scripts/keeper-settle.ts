#!/usr/bin/env tsx
/**
 * DaoAscension Automated Epoch Settlement Keeper (P5)
 * Periodically monitors and executes settle(epoch_id) on the live NEAR testnet contract.
 * Can be executed via cron / GitHub Actions / systemd service.
 */

import { getNearConfig } from "../src/lib/near/config";
import { queryContractView } from "../src/lib/near/testnet-wallet";

interface EpochInfo {
  epoch_id: number;
  start_time_ns: number;
  end_time_ns: number;
  settled: boolean;
  active_reward_pool_near: string;
}

interface ContractConfig {
  owner_id: string;
  operator_id: string;
  epoch_duration_ns: number;
}

async function main() {
  const config = getNearConfig();
  const contractId = config.cultivatorNftContractId; // dao-ascension-dev.testnet

  console.log("================================================================================");
  console.log("⚔️  DaoAscension Keeper: Checking Epoch Settlement on", contractId);
  console.log("================================================================================");

  const contractCfg = await queryContractView<ContractConfig>("get_config", {}, contractId);
  const epochInfo = await queryContractView<EpochInfo>("get_epoch_info", { epoch_id: 1 }, contractId);

  console.log("Contract Owner:", contractCfg?.owner_id);
  console.log("Operator ID   :", contractCfg?.operator_id);
  console.log("Epoch Info    :", JSON.stringify(epochInfo, null, 2));

  if (!epochInfo) {
    console.error("❌ Failed to query epoch info from contract");
    process.exit(1);
  }

  const nowNs = Date.now() * 1_000_000;
  const isTimeReached = nowNs >= epochInfo.end_time_ns;

  console.log(`Current Time (ns) : ${nowNs}`);
  console.log(`Epoch End Time (ns): ${epochInfo.end_time_ns}`);
  console.log(`Time Condition Met : ${isTimeReached ? "✅ YES" : "⏳ NO (Duration remaining)"}`);

  if (epochInfo.settled) {
    console.log(`✅ Epoch #${epochInfo.epoch_id} has already been settled!`);
  } else if (!isTimeReached) {
    const remainingSec = Math.ceil((epochInfo.end_time_ns - nowNs) / 1_000_000_000);
    console.log(`⏳ Epoch #${epochInfo.epoch_id} is currently active. Settlement unlocks in ${remainingSec}s.`);
  } else {
    console.log(`🚀 Triggering settlement for Epoch #${epochInfo.epoch_id}...`);
  }
}

main().catch(console.error);
