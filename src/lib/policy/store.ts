import { PolicyConfig } from "./types";

const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  maxSingleBountyUsd: 100.0,
  autoApproveBountyThresholdUsd: 30.0,
  maxSingleApiCallUsd: 1.0,
  dailySpendCapUsd: 250.0,
  maxSlippageBps: 150,
  allowedChains: ["near", "sol", "arb", "base", "btc"],
  allowedAssets: ["USDC", "USDT", "NEAR", "ETH", "BTC"],
  blockedAddresses: [
    "0xdrainer",
    "0xdeadbeef",
    "hacker-vault.near",
    "scam-collector.sol",
  ],
  requireTeeVerification: true,
  enforceFunctionCallKeyScope: true,
};

interface PolicyStateStore {
  config: PolicyConfig;
  dailySpentUsd: number;
}

const globalForPolicy = globalThis as unknown as {
  __intentWorkPolicyStore?: PolicyStateStore;
};

function getStore(): PolicyStateStore {
  if (!globalForPolicy.__intentWorkPolicyStore) {
    globalForPolicy.__intentWorkPolicyStore = {
      config: { ...DEFAULT_POLICY_CONFIG },
      dailySpentUsd: 18.5,
    };
  }
  return globalForPolicy.__intentWorkPolicyStore;
}

export function getPolicyConfig(): PolicyConfig {
  return getStore().config;
}

export function updatePolicyConfig(
  partial: Partial<PolicyConfig>
): PolicyConfig {
  const store = getStore();
  store.config = {
    ...store.config,
    ...partial,
  };
  return store.config;
}

export function getDailySpentUsd(): number {
  return getStore().dailySpentUsd;
}

export function recordApprovedSpendUsd(amountUsd: number): number {
  const store = getStore();
  store.dailySpentUsd = Number((store.dailySpentUsd + amountUsd).toFixed(2));
  return store.dailySpentUsd;
}

export function resetPolicyStore(): void {
  globalForPolicy.__intentWorkPolicyStore = {
    config: { ...DEFAULT_POLICY_CONFIG },
    dailySpentUsd: 18.5,
  };
}
