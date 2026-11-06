import { getNearConfig } from "../near/config";
import {
  getTestnetNetworkStatus,
  Nep413SignedIntent,
  signNep413IntentTestnet,
} from "../near/testnet-wallet";

export interface IntentTokenOption {
  assetId: string;
  symbol: string;
  blockchain: string;
  chainLabel: string;
  decimals: number;
  priceUsd: number;
  contractAddress?: string;
}

export interface CrossChainQuoteResult {
  dryRun: boolean;
  liveApiUsed: boolean;
  originAsset: string;
  originSymbol: string;
  destinationAsset: string;
  destinationSymbol: string;
  destinationChain: string;
  amountInFormatted: string;
  amountInUsd: number;
  amountOutFormatted: string;
  amountOutUsd: number;
  effectiveSlippageBps: number;
  protocolFeeBps: number;
  estimatedTimeSeconds: number;
  depositAddress: string;
  quoteTimestamp: string;
  simulationLogs: string[];
  nep413SignedIntent: Nep413SignedIntent;
  testnetBlockAnchor: {
    blockHeight: number;
    blockHash: string;
    networkId: string;
    explorerUrl: string;
  };
}

// Curated default fallback list with real assetIds from 1click.chaindefuser.com/v0/tokens
const FALLBACK_TOKENS: IntentTokenOption[] = [
  {
    assetId: "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near",
    symbol: "USDC",
    blockchain: "sol",
    chainLabel: "Solana",
    decimals: 6,
    priceUsd: 1.0,
  },
  {
    assetId: "nep141:arb-0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9.omft.near",
    symbol: "USDT",
    blockchain: "arb",
    chainLabel: "Arbitrum",
    decimals: 6,
    priceUsd: 1.0,
  },
  {
    assetId: "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
    symbol: "USDC",
    blockchain: "arb",
    chainLabel: "Arbitrum",
    decimals: 6,
    priceUsd: 1.0,
  },
  {
    assetId: "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
    symbol: "USDC",
    blockchain: "base",
    chainLabel: "Base",
    decimals: 6,
    priceUsd: 1.0,
  },
  {
    assetId: "nep141:wrap.near",
    symbol: "NEAR",
    blockchain: "near",
    chainLabel: "NEAR Protocol",
    decimals: 24,
    priceUsd: 4.85,
  },
  {
    assetId: "nep141:usdt.tether-token.near",
    symbol: "USDT",
    blockchain: "near",
    chainLabel: "NEAR Protocol",
    decimals: 6,
    priceUsd: 1.0,
  },
  {
    assetId: "nep141:btc.omft.near",
    symbol: "BTC",
    blockchain: "btc",
    chainLabel: "Bitcoin",
    decimals: 8,
    priceUsd: 89500.0,
  },
];

const CHAIN_LABELS: Record<string, string> = {
  near: "NEAR Protocol",
  sol: "Solana",
  arb: "Arbitrum",
  base: "Base",
  eth: "Ethereum",
  btc: "Bitcoin",
  ton: "TON",
  pol: "Polygon",
};

let cachedTokens: IntentTokenOption[] | null = null;
let cachedAt = 0;

export async function fetchSupportedIntentTokens(): Promise<{
  tokens: IntentTokenOption[];
  liveSource: boolean;
}> {
  if (cachedTokens && Date.now() - cachedAt < 120_000) {
    return { tokens: cachedTokens, liveSource: true };
  }

  const config = getNearConfig();
  try {
    const res = await fetch(`${config.intentsApiBase}/v0/tokens`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const raw: Array<{
        assetId: string;
        symbol: string;
        blockchain: string;
        decimals: number;
        price?: number;
        contractAddress?: string;
      }> = await res.json();

      const targetChains = new Set(["near", "sol", "arb", "base", "btc", "eth"]);
      const targetSymbols = new Set(["USDC", "USDT", "NEAR", "wNEAR", "ETH", "BTC"]);

      const filtered: IntentTokenOption[] = [];
      const seen = new Set<string>();

      for (const item of raw) {
        const chain = (item.blockchain || "").toLowerCase();
        const sym = item.symbol === "wNEAR" ? "NEAR" : item.symbol;
        const key = `${chain}:${sym}`;
        if (targetChains.has(chain) && targetSymbols.has(item.symbol) && !seen.has(key)) {
          seen.add(key);
          filtered.push({
            assetId: item.assetId,
            symbol: sym,
            blockchain: chain,
            chainLabel: CHAIN_LABELS[chain] || chain.toUpperCase(),
            decimals: item.decimals,
            priceUsd: Number(item.price || 1.0),
            contractAddress: item.contractAddress,
          });
        }
      }

      if (filtered.length >= 4) {
        cachedTokens = filtered;
        cachedAt = Date.now();
        return { tokens: filtered, liveSource: true };
      }
    }
  } catch {
    // Fallback to curated list if network unavailable
  }

  return { tokens: FALLBACK_TOKENS, liveSource: false };
}

function toAtomicUnits(amountFloat: number, decimals: number): string {
  const factor = Math.pow(10, Math.min(decimals, 8));
  const scaled = BigInt(Math.max(1, Math.round(amountFloat * factor)));
  if (decimals > 8) {
    const multiplier = BigInt("1" + "0".repeat(decimals - 8));
    return (scaled * multiplier).toString();
  }
  return scaled.toString();
}

export async function requestCrossChainIntentQuote(params: {
  amountUsd: number;
  destinationChain: string;
  destinationSymbol: string;
  recipientAddress: string;
  taskOrInvoiceId: string;
  forceHighSlippageSimulation?: boolean;
}): Promise<CrossChainQuoteResult> {
  const config = getNearConfig();
  const { tokens } = await fetchSupportedIntentTokens();

  // Origin treasury asset: NEAR USDT (6 decimals) for stablecoin accounting
  const originToken =
    tokens.find((t) => t.blockchain === "near" && t.symbol === "USDT") ||
    FALLBACK_TOKENS.find((t) => t.blockchain === "near" && t.symbol === "USDT")!;

  const destToken =
    tokens.find(
      (t) =>
        t.blockchain.toLowerCase() === params.destinationChain.toLowerCase() &&
        t.symbol.toUpperCase() === params.destinationSymbol.toUpperCase()
    ) ||
    tokens.find(
      (t) => t.blockchain.toLowerCase() === params.destinationChain.toLowerCase()
    ) ||
    FALLBACK_TOKENS[0];

  const atomicAmountIn = toAtomicUnits(params.amountUsd, originToken.decimals);
  const deadline = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Sample valid refund/recipient addresses for dry=true quote validation on 1Click API
  const sampleRecipients: Record<string, string> = {
    sol: "7V9C2XU7B3X9zV8kL2mN4pQ6rS8tU1vW3xY5zA7bC9dE",
    arb: "0x742d35Cc6634C0532925a3b8D84B2021F90a51A3",
    base: "0x742d35Cc6634C0532925a3b8D84B2021F90a51A3",
    eth: "0x742d35Cc6634C0532925a3b8D84B2021F90a51A3",
    near: "freelancer-payout.testnet",
    btc: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
  };

  let liveApiUsed = false;
  let amountOutFormatted = "";
  let amountOutUsd = params.amountUsd * 0.9975;
  let effectiveSlippageBps = params.forceHighSlippageSimulation ? 320 : 25;
  let estimatedTimeSeconds = 9;
  let depositAddress = `intents-vault-${params.taskOrInvoiceId.slice(0, 8)}.testnet`;

  if (
    originToken.assetId !== destToken.assetId &&
    !params.forceHighSlippageSimulation
  ) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (process.env.NEAR_INTENTS_JWT) {
        headers["Authorization"] = `Bearer ${process.env.NEAR_INTENTS_JWT}`;
      }

      const quoteReqBody = {
        dry: true,
        swapType: "EXACT_INPUT",
        slippageTolerance: 100,
        originAsset: originToken.assetId,
        depositType: "ORIGIN_CHAIN",
        destinationAsset: destToken.assetId,
        amount: atomicAmountIn,
        refundTo: "intentwork-treasury.near",
        refundType: "ORIGIN_CHAIN",
        recipient:
          sampleRecipients[destToken.blockchain] || params.recipientAddress,
        recipientType: "DESTINATION_CHAIN",
        deadline,
      };

      const res = await fetch(`${config.intentsApiBase}/v0/quote`, {
        method: "POST",
        headers,
        body: JSON.stringify(quoteReqBody),
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const q = data?.quote || data;
        if (q?.amountOutFormatted || q?.amountOut) {
          liveApiUsed = true;
          amountOutFormatted =
            q.amountOutFormatted ||
            (
              Number(q.amountOut) / Math.pow(10, destToken.decimals)
            ).toFixed(4);
          amountOutUsd = Number(q.amountOutUsd || params.amountUsd * 0.9975);
          estimatedTimeSeconds = Number(q.timeEstimate || 8);
          const lossRatio = Math.max(
            0,
            (params.amountUsd - amountOutUsd) / Math.max(params.amountUsd, 0.01)
          );
          effectiveSlippageBps = Math.min(
            120,
            Math.max(8, Math.round(lossRatio * 10000))
          );
        }
      }
    } catch {
      // Fallback to calculated dry-run quote
    }
  }

  if (!amountOutFormatted) {
    const outUnits =
      (params.amountUsd * (1 - effectiveSlippageBps / 10000)) /
      Math.max(destToken.priceUsd, 0.0001);
    amountOutFormatted = outUnits.toFixed(destToken.symbol === "BTC" ? 6 : 4);
    amountOutUsd = Number(
      (params.amountUsd * (1 - effectiveSlippageBps / 10000)).toFixed(4)
    );
  }

  const signedIntent = signNep413IntentTestnet({
    intentType: "cross_chain_settlement",
    originAsset: originToken.assetId,
    destinationAsset: destToken.assetId,
    amountIn: atomicAmountIn,
    expectedAmountOut: amountOutFormatted,
    recipientAddress: params.recipientAddress,
    destinationChain: destToken.blockchain,
    taskOrInvoiceId: params.taskOrInvoiceId,
  });

  const testnetStatus = await getTestnetNetworkStatus();

  const simulationLogs = [
    `EVENT_JSON:{"standard":"dip4","version":"0.3.0","event":"simulate_intents_preflight","data":[{"signer_id":"${config.agentSubAccountId}","network":"${config.networkId}","intent_hash":"${signedIntent.intentHash}"}]}`,
    `EVENT_JSON:{"standard":"dip4","version":"0.3.0","event":"token_diff","data":[{"account_id":"${config.treasuryAccountId}","diff":{"${originToken.assetId}":"-${atomicAmountIn}","${destToken.assetId}":"+${amountOutFormatted}"},"recipient":"${params.recipientAddress}"}]}`,
    `EVENT_JSON:{"standard":"nep413","version":"1.0.0","event":"signature_verified","data":[{"public_key":"${signedIntent.public_key}","verified":${signedIntent.verified},"testnet_block_height":${testnetStatus.latestBlockHeight}}]}`,
  ];

  return {
    dryRun: config.isTestnet,
    liveApiUsed,
    originAsset: originToken.assetId,
    originSymbol: originToken.symbol,
    destinationAsset: destToken.assetId,
    destinationSymbol: destToken.symbol,
    destinationChain: destToken.blockchain,
    amountInFormatted: `${params.amountUsd.toFixed(2)} ${originToken.symbol}`,
    amountInUsd: params.amountUsd,
    amountOutFormatted: `${amountOutFormatted} ${destToken.symbol}`,
    amountOutUsd,
    effectiveSlippageBps,
    protocolFeeBps: process.env.NEAR_INTENTS_JWT ? 0 : 25,
    estimatedTimeSeconds,
    depositAddress,
    quoteTimestamp: new Date().toISOString(),
    simulationLogs,
    nep413SignedIntent: signedIntent,
    testnetBlockAnchor: {
      blockHeight: testnetStatus.latestBlockHeight,
      blockHash: testnetStatus.latestBlockHash,
      networkId: testnetStatus.networkId,
      explorerUrl: `${config.explorerUrl}/blocks/${testnetStatus.latestBlockHeight}`,
    },
  };
}
