export type PolicyRuleStatus = "PASS" | "WARN" | "FAIL";

export type PolicyActionVerdict =
  | "ALLOWED"
  | "PENDING_APPROVAL"
  | "BLOCKED";

export interface PolicyConfig {
  maxSingleBountyUsd: number;
  autoApproveBountyThresholdUsd: number;
  maxSingleApiCallUsd: number;
  dailySpendCapUsd: number;
  maxSlippageBps: number;
  allowedChains: string[];
  allowedAssets: string[];
  blockedAddresses: string[];
  requireTeeVerification: boolean;
  enforceFunctionCallKeyScope: boolean;
}

export interface PolicyRuleCheckResult {
  ruleId: string;
  ruleName: string;
  status: PolicyRuleStatus;
  detail: string;
}

export interface PolicyEvaluationInput {
  scope: "OUTSOURCE_BOUNTY" | "AGENT_API_402";
  amountUsd: number;
  destinationChain: string;
  destinationSymbol: string;
  recipientAddress: string;
  untrustedContent: string;
  teePassed: boolean;
  teeInjectionDetected: boolean;
  effectiveSlippageBps: number;
  targetContractMethod: string;
  humanApprovedOverride?: boolean;
}

export interface PolicyEvaluationDecision {
  verdict: PolicyActionVerdict;
  summary: string;
  triggeredRuleIds: string[];
  ruleChecks: PolicyRuleCheckResult[];
  evaluatedAt: string;
  evaluationDurationMs: number;
  dailySpentBeforeUsd: number;
  dailySpentAfterUsd: number;
}
