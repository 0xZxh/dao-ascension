import { getAgentFunctionCallKeyInfo } from "../near/testnet-wallet";
import {
  PolicyConfig,
  PolicyEvaluationDecision,
  PolicyEvaluationInput,
  PolicyRuleCheckResult,
} from "./types";

const DETERMINISTIC_INJECTION_PATTERNS: RegExp[] = [
  /system\s*override/i,
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /immediately\s+transfer/i,
  /drain\s+treasury/i,
  /send\s+all\s+funds/i,
  /0xdeadbeef/i,
  /0xdrainer/i,
];

export function evaluatePolicyGuardrails(
  input: PolicyEvaluationInput,
  config: PolicyConfig,
  currentDailySpentUsd: number
): PolicyEvaluationDecision {
  const start = Date.now();
  const checks: PolicyRuleCheckResult[] = [];
  const triggeredRuleIds: string[] = [];

  // R-01: Deterministic Prompt Injection & Hijack Lock
  const regexMatched = DETERMINISTIC_INJECTION_PATTERNS.some((rx) =>
    rx.test(input.untrustedContent)
  );
  const injectionHit = input.teeInjectionDetected || regexMatched;
  if (injectionHit) {
    triggeredRuleIds.push("R-01");
    checks.push({
      ruleId: "R-01",
      ruleName: "INJECTION_LOCK (防注入与劫持熔断)",
      status: "FAIL",
      detail:
        "检测到试图篡改打款指令或绕过代码审查的恶意 Prompt 注入特征，已由确定性防火墙硬阻断。",
    });
  } else if (!input.teePassed) {
    triggeredRuleIds.push("R-01");
    checks.push({
      ruleId: "R-01",
      ruleName: "INJECTION_LOCK & QUALITY_GATE (交付物质量门禁)",
      status: "FAIL",
      detail: "NEAR AI Cloud (TEE) 验收未通过，拒绝释放赏金。",
    });
  } else {
    checks.push({
      ruleId: "R-01",
      ruleName: "INJECTION_LOCK (防注入与质量门禁)",
      status: "PASS",
      detail: "未检测到 Prompt 注入或指令劫持，且通过 TEE 质量审查。",
    });
  }

  // R-02: Single Transaction Hard Cap
  const hardCap =
    input.scope === "AGENT_API_402"
      ? config.maxSingleApiCallUsd
      : config.maxSingleBountyUsd;
  if (input.amountUsd > hardCap) {
    triggeredRuleIds.push("R-02");
    checks.push({
      ruleId: "R-02",
      ruleName: "MAX_SINGLE_TX (单笔最高硬限额)",
      status: "FAIL",
      detail: `请求金额 $${input.amountUsd.toFixed(2)} 超出 ${
        input.scope === "AGENT_API_402" ? "Agent 单次 API 采购" : "外包单笔赏金"
      }硬上限 ($${hardCap.toFixed(2)})。`,
    });
  } else {
    checks.push({
      ruleId: "R-02",
      ruleName: "MAX_SINGLE_TX (单笔最高硬限额)",
      status: "PASS",
      detail: `请求金额 $${input.amountUsd.toFixed(2)} 在硬上限 ($${hardCap.toFixed(2)}) 范围内。`,
    });
  }

  // R-03: Human-in-the-loop Approval Threshold
  let needsHumanApproval = false;
  if (
    input.scope === "OUTSOURCE_BOUNTY" &&
    input.amountUsd > config.autoApproveBountyThresholdUsd &&
    input.amountUsd <= config.maxSingleBountyUsd
  ) {
    if (input.humanApprovedOverride) {
      checks.push({
        ruleId: "R-03",
        ruleName: "HUMAN_APPROVAL_THRESHOLD (人工复核阈值)",
        status: "PASS",
        detail: `金额 $${input.amountUsd.toFixed(2)} 超过自动放行线 ($${config.autoApproveBountyThresholdUsd.toFixed(2)})，已获得人类雇主显式签名批准。`,
      });
    } else {
      needsHumanApproval = true;
      triggeredRuleIds.push("R-03");
      checks.push({
        ruleId: "R-03",
        ruleName: "HUMAN_APPROVAL_THRESHOLD (人工复核阈值)",
        status: "WARN",
        detail: `金额 $${input.amountUsd.toFixed(2)} 超过自动放行线 ($${config.autoApproveBountyThresholdUsd.toFixed(2)})，已挂起并转入人类雇主审批队列。`,
      });
    }
  } else {
    checks.push({
      ruleId: "R-03",
      ruleName: "HUMAN_APPROVAL_THRESHOLD (人工复核阈值)",
      status: "PASS",
      detail: `金额在全自动放行额度 ($${config.autoApproveBountyThresholdUsd.toFixed(2)}) 内，无需人工介入。`,
    });
  }

  // R-04: 24h Rolling Spend Cap
  const projectedDaily = currentDailySpentUsd + input.amountUsd;
  if (projectedDaily > config.dailySpendCapUsd) {
    triggeredRuleIds.push("R-04");
    checks.push({
      ruleId: "R-04",
      ruleName: "DAILY_SPEND_CAP (24h 滚动累计限额)",
      status: "FAIL",
      detail: `累计支出将达 $${projectedDaily.toFixed(2)}，超出 24 小时安全上限 ($${config.dailySpendCapUsd.toFixed(2)})。`,
    });
  } else {
    checks.push({
      ruleId: "R-04",
      ruleName: "DAILY_SPEND_CAP (24h 滚动累计限额)",
      status: "PASS",
      detail: `执行后 24 小时累计支出为 $${projectedDaily.toFixed(2)} / $${config.dailySpendCapUsd.toFixed(2)}。`,
    });
  }

  // R-05: Chain & Asset Allowlist
  const chainAllowed = config.allowedChains
    .map((c) => c.toLowerCase())
    .includes(input.destinationChain.toLowerCase());
  const assetAllowed = config.allowedAssets
    .map((a) => a.toUpperCase())
    .includes(input.destinationSymbol.toUpperCase());

  if (!chainAllowed || !assetAllowed) {
    triggeredRuleIds.push("R-05");
    checks.push({
      ruleId: "R-05",
      ruleName: "CHAIN_ASSET_ALLOWLIST (跨链与币种白名单)",
      status: "FAIL",
      detail: `目标链 (${input.destinationChain}) 或资产 (${input.destinationSymbol}) 不在企业允许结算白名单中。`,
    });
  } else {
    checks.push({
      ruleId: "R-05",
      ruleName: "CHAIN_ASSET_ALLOWLIST (跨链与币种白名单)",
      status: "PASS",
      detail: `目标结算链 (${input.destinationChain.toUpperCase()}) 与资产 (${input.destinationSymbol}) 均在白名单内。`,
    });
  }

  // R-06: Recipient Address Sanity & Anti-Scam Blacklist
  const addrLower = input.recipientAddress.trim().toLowerCase();
  const isBlacklisted = config.blockedAddresses.some((b) =>
    addrLower.includes(b.toLowerCase())
  );
  const isMalformed = input.recipientAddress.trim().length < 6;
  if (isBlacklisted || isMalformed) {
    triggeredRuleIds.push("R-06");
    checks.push({
      ruleId: "R-06",
      ruleName: "RECIPIENT_SANITY (收款地址反诈骗校验)",
      status: "FAIL",
      detail: `收款地址 (${input.recipientAddress}) 命中高危钓鱼/黑客黑名单或格式非法。`,
    });
  } else {
    checks.push({
      ruleId: "R-06",
      ruleName: "RECIPIENT_SANITY (收款地址反诈骗校验)",
      status: "PASS",
      detail: `收款地址 (${input.recipientAddress}) 格式合法且未命中威胁情报黑名单。`,
    });
  }

  // R-07: Pre-flight Slippage & Fee Cap
  if (input.effectiveSlippageBps > config.maxSlippageBps) {
    triggeredRuleIds.push("R-07");
    checks.push({
      ruleId: "R-07",
      ruleName: "MAX_SLIPPAGE_BPS (跨链预仿真滑点上限)",
      status: "FAIL",
      detail: `NEAR Intents 预仿真滑点 (${input.effectiveSlippageBps} bps) 超出安全阈值 (${config.maxSlippageBps} bps)，熔断保护触发。`,
    });
  } else {
    checks.push({
      ruleId: "R-07",
      ruleName: "MAX_SLIPPAGE_BPS (跨链预仿真滑点上限)",
      status: "PASS",
      detail: `NEAR Intents 预仿真损耗 (${input.effectiveSlippageBps} bps) 低于上限 (${config.maxSlippageBps} bps)。`,
    });
  }

  // R-08: NEAR Function Call Access Key Scope Check
  const keyInfo = getAgentFunctionCallKeyInfo();
  const methodPermitted = keyInfo.allowedMethods.includes(
    input.targetContractMethod
  );
  if (!methodPermitted || keyInfo.remainingAllowanceNear <= 0.05) {
    triggeredRuleIds.push("R-08");
    checks.push({
      ruleId: "R-08",
      ruleName: "ACCESS_KEY_SCOPE (NEAR 受限函数密钥权限)",
      status: "FAIL",
      detail: `Agent 受限密钥 (${keyInfo.publicKey.slice(0, 18)}...) 无权调用方法 ${input.targetContractMethod} 或 Gas 额度不足。`,
    });
  } else {
    checks.push({
      ruleId: "R-08",
      ruleName: "ACCESS_KEY_SCOPE (NEAR 受限函数密钥权限)",
      status: "PASS",
      detail: `已验证 NEAR Testnet Function Call Key 权限范围 (${input.targetContractMethod})，剩余 Gas 额度 ${keyInfo.remainingAllowanceNear} NEAR。`,
    });
  }

  const hasHardFailure = checks.some((c) => c.status === "FAIL");
  let verdict: PolicyEvaluationDecision["verdict"] = "ALLOWED";
  let summary =
    "全部 8 项确定性安全护栏与 NEAR Intents 预仿真校验通过，允许自动签名并执行跨链结算。";

  if (hasHardFailure) {
    verdict = "BLOCKED";
    const failedIds = checks
      .filter((c) => c.status === "FAIL")
      .map((c) => c.ruleId)
      .join(", ");
    summary = `被 IntentGuard 防火墙硬阻断（命中规则：${failedIds}），金库资金未发生任何转移。`;
  } else if (needsHumanApproval) {
    verdict = "PENDING_APPROVAL";
    summary =
      "代码验收与安全检查通过，但金额超出全自动放行阈值，已冻结并等待雇主一键复核放行。";
  }

  return {
    verdict,
    summary,
    triggeredRuleIds,
    ruleChecks: checks,
    evaluatedAt: new Date().toISOString(),
    evaluationDurationMs: Math.max(1, Date.now() - start),
    dailySpentBeforeUsd: currentDailySpentUsd,
    dailySpentAfterUsd:
      verdict === "ALLOWED"
        ? Number((currentDailySpentUsd + input.amountUsd).toFixed(2))
        : currentDailySpentUsd,
  };
}
