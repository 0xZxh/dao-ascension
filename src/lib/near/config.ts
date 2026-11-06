export type NearNetworkId = "testnet" | "mainnet";

export interface NearEnvironmentConfig {
  networkId: NearNetworkId;
  rpcUrl: string;
  explorerUrl: string;
  treasuryAccountId: string;
  sectTreasuryAccountId: string;
  cultivatorNftContractId: string;
  agentSubAccountId: string;
  policyContractId: string;
  intentsVerifierContract: string;
  intentsApiBase: string;
  nearAiBaseUrl: string;
  nearAiModel: string;
  isTestnet: boolean;
}

export function getNearConfig(): NearEnvironmentConfig {
  const rawNet = (
    process.env.NEXT_PUBLIC_NEAR_NETWORK || "testnet"
  ).toLowerCase();
  const networkId: NearNetworkId = rawNet === "mainnet" ? "mainnet" : "testnet";
  const isTestnet = networkId === "testnet";

  return {
    networkId,
    isTestnet,
    rpcUrl: isTestnet
      ? process.env.NEAR_RPC_TESTNET || "https://test.rpc.fastnear.com"
      : process.env.NEAR_RPC_MAINNET || "https://rpc.mainnet.near.org",
    explorerUrl: isTestnet
      ? "https://testnet.nearblocks.io"
      : "https://nearblocks.io",
    treasuryAccountId:
      process.env.NEAR_TESTNET_ACCOUNT_ID ||
      (isTestnet ? "dao-ascension-dev.testnet" : "sect-treasury.daoascension.near"),
    sectTreasuryAccountId: isTestnet
      ? "dao-ascension-dev.testnet"
      : "sect-treasury.daoascension.near",
    cultivatorNftContractId: isTestnet
      ? "dao-ascension-dev.testnet"
      : "cultivator-nft.daoascension.near",
    agentSubAccountId: isTestnet
      ? "elder-agent.daoascension.testnet"
      : "elder-agent.daoascension.near",
    policyContractId: isTestnet
      ? "dao-ascension-dev.testnet"
      : "realm-engine.daoascension.near",
    intentsVerifierContract: "intents.near",
    intentsApiBase:
      process.env.NEAR_INTENTS_API_BASE || "https://1click.chaindefuser.com",
    nearAiBaseUrl:
      process.env.NEAR_AI_BASE_URL || "https://cloud-api.near.ai/v1",
    nearAiModel: process.env.NEAR_AI_MODEL || "deepseek-ai/DeepSeek-V3.1",
  };
}
