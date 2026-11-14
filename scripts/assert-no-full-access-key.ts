#!/usr/bin/env tsx
/**
 * Read-only custody check. Exits 1 if the account still has a FullAccess key.
 * Does not sign, deploy, delete keys, or print private key material.
 *
 * Usage:
 *   tsx scripts/assert-no-full-access-key.ts <account-id> [rpc-url]
 */

interface AccessKeyView {
  public_key?: string;
  access_key?: {
    permission?: string | { FunctionCall?: unknown };
  };
}

interface RpcResponse {
  result?: { keys?: AccessKeyView[] };
  error?: { message?: string };
}

async function main() {
  const accountId = process.argv[2];
  const rpcUrl = process.argv[3] || "https://rpc.mainnet.near.org";

  if (!accountId) {
    console.error("usage: tsx scripts/assert-no-full-access-key.ts <account-id> [rpc-url]");
    process.exit(2);
  }

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "assert-no-full-access-key",
      method: "query",
      params: {
        request_type: "view_access_key_list",
        finality: "final",
        account_id: accountId,
      },
    }),
  });

  if (!response.ok) {
    console.error(`RPC HTTP ${response.status} for ${accountId}`);
    process.exit(1);
  }

  const body = (await response.json()) as RpcResponse;
  if (body.error) {
    console.error(`RPC error for ${accountId}: ${body.error.message || "unknown"}`);
    process.exit(1);
  }

  const keys = body.result?.keys ?? [];
  const fullAccess = keys.filter((key) => key.access_key?.permission === "FullAccess");

  if (fullAccess.length > 0) {
    console.error(
      `REFUSE: ${accountId} still has ${fullAccess.length} FullAccess key(s) out of ${keys.length}.`,
    );
    console.error(
      "Delete them before this account holds user NEAR. Do not reuse a key that has appeared in a terminal log.",
    );
    process.exit(1);
  }

  console.log(`OK: ${accountId} has no FullAccess key (${keys.length} access key(s) listed).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
