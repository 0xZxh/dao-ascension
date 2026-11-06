import crypto from "crypto";
import nacl from "tweetnacl";
import { getNearConfig } from "./config";

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function base58Encode(buffer: Uint8Array): string {
  const digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    let carry = buffer[i];
    for (let j = 0; j < digits.length; ++j) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let result = "";
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    result += BASE58_ALPHABET[0];
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }
  return result;
}

export function base58Decode(str: string): Uint8Array {
  const bytes = [0];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const value = BASE58_ALPHABET.indexOf(c);
    if (value < 0) throw new Error(`Invalid base58 character: ${c}`);
    let carry = value;
    for (let j = 0; j < bytes.length; ++j) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < str.length && str[i] === BASE58_ALPHABET[0]; i++) {
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

export interface TestnetChainStatus {
  networkId: string;
  rpcUrl: string;
  chainId: string;
  latestBlockHeight: number;
  latestBlockHash: string;
  latestBlockTime: string;
  protocolVersion: number;
  rpcLatencyMs: number;
  liveRpcConnected: boolean;
}

export interface FunctionCallAccessKeyInfo {
  publicKey: string;
  accountId: string;
  permissionType: "FunctionCall" | "FullAccess";
  receiverId: string;
  allowedMethods: string[];
  allowanceNear: string;
  remainingAllowanceNear: number;
  nonce: number;
}

export interface Nep413SignedIntent {
  standard: "nep413";
  payload: {
    recipient: string;
    nonce: string;
    message: string;
  };
  public_key: string;
  signature: string;
  intentHash: string;
  verified: boolean;
}

// Deterministic development keypair for NEAR Testnet agent signing
function getTestnetAgentKeyPair(): nacl.SignKeyPair {
  const seedHex = crypto
    .createHash("sha256")
    .update("intentwork-near-testnet-agent-function-call-key-v1")
    .digest();
  return nacl.sign.keyPair.fromSeed(new Uint8Array(seedHex));
}

export async function getTestnetNetworkStatus(): Promise<TestnetChainStatus> {
  const config = getNearConfig();
  const start = Date.now();
  try {
    const res = await fetch(config.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "intentwork-status",
        method: "status",
        params: [],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
    });
    const data = await res.json();
    const syncInfo = data?.result?.sync_info;
    if (syncInfo) {
      return {
        networkId: config.networkId,
        rpcUrl: config.rpcUrl,
        chainId: data.result.chain_id || config.networkId,
        latestBlockHeight: syncInfo.latest_block_height,
        latestBlockHash: syncInfo.latest_block_hash,
        latestBlockTime: syncInfo.latest_block_time,
        protocolVersion: data.result.protocol_version || 72,
        rpcLatencyMs: Date.now() - start,
        liveRpcConnected: true,
      };
    }
  } catch {
    // Fallback if offline
  }

  return {
    networkId: config.networkId,
    rpcUrl: config.rpcUrl,
    chainId: "testnet",
    latestBlockHeight: 184920315,
    latestBlockHash: base58Encode(crypto.randomBytes(32)),
    latestBlockTime: new Date().toISOString(),
    protocolVersion: 72,
    rpcLatencyMs: Date.now() - start,
    liveRpcConnected: false,
  };
}

export async function queryContractView<T>(
  methodName: string,
  args: Record<string, unknown> = {},
  contractId?: string
): Promise<T | null> {
  const config = getNearConfig();
  const targetContract = contractId || config.cultivatorNftContractId;
  const argsBase64 = Buffer.from(JSON.stringify(args)).toString("base64");

  try {
    const res = await fetch(config.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `view-${methodName}`,
        method: "query",
        params: {
          request_type: "call_function",
          finality: "final",
          account_id: targetContract,
          method_name: methodName,
          args_base64: argsBase64,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
    });
    const data = await res.json();
    if (data.result?.result) {
      const decodedStr = Buffer.from(data.result.result).toString("utf8");
      return JSON.parse(decodedStr) as T;
    }
  } catch {
    // Return null if view call encounters network timeout or method error
  }
  return null;
}

export function getAgentFunctionCallKeyInfo(
  spentNear = 0.42
): FunctionCallAccessKeyInfo {
  const config = getNearConfig();
  const kp = getTestnetAgentKeyPair();
  const pubKeyBase58 = `ed25519:${base58Encode(kp.publicKey)}`;
  const totalAllowance = 25.0;
  return {
    publicKey: pubKeyBase58,
    accountId: config.agentSubAccountId,
    permissionType: "FunctionCall",
    receiverId: config.policyContractId,
    allowedMethods: [
      "plant_spiritual_herb",
      "water_spirit_spring",
      "harvest_and_refine_pill",
      "forge_immortal_artifact",
      "equip_artifact_to_cultivator",
      "challenge_secret_realm",
      "settle_weekly_heaven_board",
      "transfer_cultivator_nft_account",
    ],
    allowanceNear: `${totalAllowance.toFixed(2)} NEAR`,
    remainingAllowanceNear: Math.max(
      0,
      Number((totalAllowance - spentNear).toFixed(4))
    ),
    nonce: 184920001,
  };
}

export function getCultivatorFunctionCallKeyInfo(
  cultivatorSubAccountId: string,
  sessionTxCount = 0
): FunctionCallAccessKeyInfo {
  const config = getNearConfig();
  const kp = getTestnetAgentKeyPair();
  const pubKeyBase58 = `ed25519:${base58Encode(kp.publicKey)}`;
  const totalAllowance = 25.0;
  const spentNear = Number((sessionTxCount * 0.0018).toFixed(4));
  return {
    publicKey: pubKeyBase58,
    accountId: cultivatorSubAccountId,
    permissionType: "FunctionCall",
    receiverId: config.policyContractId,
    allowedMethods: [
      "plant_spiritual_herb",
      "water_spirit_spring",
      "harvest_and_refine_pill",
      "forge_immortal_artifact",
      "equip_artifact_to_cultivator",
      "challenge_secret_realm",
      "settle_weekly_heaven_board",
      "transfer_cultivator_nft_account",
    ],
    allowanceNear: `${totalAllowance.toFixed(2)} NEAR`,
    remainingAllowanceNear: Math.max(
      0,
      Number((totalAllowance - spentNear).toFixed(4))
    ),
    nonce: 184920001 + sessionTxCount,
  };
}

export interface SignedSessionActionReceipt {
  txHash: string;
  methodName: string;
  signerSubAccount: string;
  receiverContract: string;
  gaslessSessionUsed: boolean;
  publicKey: string;
  signature: string;
  nep413Verified: boolean;
  timestamp: string;
  summary: string;
  argsPreview: Record<string, unknown>;
}

export function signSessionActionReceipt(params: {
  cultivatorSubAccountId: string;
  methodName: string;
  summary: string;
  argsPreview: Record<string, unknown>;
}): SignedSessionActionReceipt {
  const config = getNearConfig();
  const kp = getTestnetAgentKeyPair();
  const pubKeyStr = `ed25519:${base58Encode(kp.publicKey)}`;
  const nonceBytes = crypto.randomBytes(32);

  const messageObj = {
    signer: params.cultivatorSubAccountId,
    receiver: config.policyContractId,
    method: params.methodName,
    args: params.argsPreview,
    ts: Date.now(),
  };
  const messageStr = JSON.stringify(messageObj);

  const signed = signNep413IntentTestnet({
    signerAccountId: params.cultivatorSubAccountId,
    intentType: "token_diff",
    originAsset: "nep141:spirit-stone.daoascension.testnet",
    destinationAsset: `action:${params.methodName}`,
    amountIn: "1",
    expectedAmountOut: "1",
    recipientAddress: config.policyContractId,
    destinationChain: "near",
    taskOrInvoiceId: `${params.methodName}-${nonceBytes.toString("hex").slice(0, 8)}`,
  });

  const txHash = base58Encode(
    crypto
      .createHash("sha256")
      .update(Buffer.from(messageStr + signed.signature, "utf8"))
      .digest()
  );

  return {
    txHash,
    methodName: params.methodName,
    signerSubAccount: params.cultivatorSubAccountId,
    receiverContract: config.policyContractId,
    gaslessSessionUsed: true,
    publicKey: pubKeyStr,
    signature: signed.signature,
    nep413Verified: signed.verified,
    timestamp: new Date().toISOString(),
    summary: params.summary,
    argsPreview: params.argsPreview,
  };
}

export function signNep413IntentTestnet(params: {
  signerAccountId?: string;
  intentType: "transfer" | "token_diff" | "cross_chain_settlement";
  originAsset: string;
  destinationAsset: string;
  amountIn: string;
  expectedAmountOut: string;
  recipientAddress: string;
  destinationChain: string;
  taskOrInvoiceId: string;
}): Nep413SignedIntent {
  const config = getNearConfig();
  const kp = getTestnetAgentKeyPair();
  const pubKeyStr = `ed25519:${base58Encode(kp.publicKey)}`;
  const nonceBytes = crypto.randomBytes(32);
  const nonceBase64 = nonceBytes.toString("base64");

  const deadline = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const innerMessage = JSON.stringify({
    deadline,
    signer_id: params.signerAccountId || config.agentSubAccountId,
    network: config.networkId,
    ref_id: params.taskOrInvoiceId,
    intents: [
      {
        intent: params.intentType,
        origin_asset: params.originAsset,
        destination_asset: params.destinationAsset,
        amount_in: params.amountIn,
        min_amount_out: params.expectedAmountOut,
        recipient: params.recipientAddress,
        destination_chain: params.destinationChain,
      },
    ],
  });

  // Construct NEP-413 digest: SHA256(tag + recipient + nonce + message)
  const payloadToHash = Buffer.concat([
    Buffer.from("NEP413_INTENTWORK_TESTNET", "utf8"),
    Buffer.from(config.intentsVerifierContract, "utf8"),
    nonceBytes,
    Buffer.from(innerMessage, "utf8"),
  ]);
  const digest = crypto.createHash("sha256").update(payloadToHash).digest();
  const sigBytes = nacl.sign.detached(new Uint8Array(digest), kp.secretKey);
  const sigStr = `ed25519:${base58Encode(sigBytes)}`;

  const intentHash = base58Encode(
    crypto.createHash("sha256").update(sigBytes).digest()
  );

  const signed: Nep413SignedIntent = {
    standard: "nep413",
    payload: {
      recipient: config.intentsVerifierContract,
      nonce: nonceBase64,
      message: innerMessage,
    },
    public_key: pubKeyStr,
    signature: sigStr,
    intentHash,
    verified: false,
  };

  signed.verified = verifyNep413IntentSignature(signed);
  return signed;
}

export function verifyNep413IntentSignature(
  signed: Nep413SignedIntent
): boolean {
  try {
    const pubKeyRaw = base58Decode(signed.public_key.replace(/^ed25519:/, ""));
    const sigRaw = base58Decode(signed.signature.replace(/^ed25519:/, ""));
    const nonceBytes = Buffer.from(signed.payload.nonce, "base64");
    const payloadToHash = Buffer.concat([
      Buffer.from("NEP413_INTENTWORK_TESTNET", "utf8"),
      Buffer.from(signed.payload.recipient, "utf8"),
      nonceBytes,
      Buffer.from(signed.payload.message, "utf8"),
    ]);
    const digest = crypto.createHash("sha256").update(payloadToHash).digest();
    return nacl.sign.detached.verify(
      new Uint8Array(digest),
      sigRaw,
      pubKeyRaw
    );
  } catch {
    return false;
  }
}
