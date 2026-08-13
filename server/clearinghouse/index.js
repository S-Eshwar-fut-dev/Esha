import crypto from "crypto";

const cases = new Map();
let caseCounter = 1;

export const clearinghouse = {
  fileCase(correlatedEvent) {
    const caseId = `I4C-${new Date().getFullYear()}-${String(caseCounter++).padStart(6, "0")}`;

    // Build evidentiary chain with SHA-256 hash
    const evidencePayload = JSON.stringify({
      sessionId: correlatedEvent.sessionId,
      entities: correlatedEvent.sharedEntities || correlatedEvent.entities || [],
      scamType: correlatedEvent.scamType,
      timestamp: correlatedEvent.timestamp,
    });
    const evidenceHash = crypto.createHash("sha256").update(evidencePayload).digest("hex");

    const caseData = {
      caseId,
      status: "FREEZE_RECOMMENDED",
      severity: correlatedEvent.type === "cross_session_correlation" ? "CRITICAL" : "HIGH",
      type: correlatedEvent.type,
      clusterId: correlatedEvent.clusterId || null,
      campaignId: correlatedEvent.campaignId,
      scamType: correlatedEvent.scamType,
      linkedSessions: correlatedEvent.matchedSessions
        ? [correlatedEvent.sessionId, ...correlatedEvent.matchedSessions]
        : [correlatedEvent.sessionId],
      sharedEntities: correlatedEvent.sharedEntities || correlatedEvent.entities || [],
      confidence: correlatedEvent.confidence || correlatedEvent.similarityScore,
      recommendation: generateRecommendation(correlatedEvent),
      evidentiaryChain: {
        hash: evidenceHash,
        algorithm: "SHA-256",
        timestamp: new Date().toISOString(),
        payload: evidencePayload,
      },
      filedAt: Date.now(),
      filedAtISO: new Date().toISOString(),
    };

    cases.set(caseId, caseData);
    return caseData;
  },

  getCase(caseId) {
    return cases.get(caseId) || null;
  },

  getAllCases() {
    return Array.from(cases.values()).sort((a, b) => b.filedAt - a.filedAt);
  },
};

function generateRecommendation(event) {
  const entities = event.sharedEntities || event.entities || [];
  const parts = [];

  parts.push(`IMMEDIATE ACTION: Freeze all linked accounts and UPI VPAs associated with campaign ${event.campaignId}.`);

  if (entities.length > 0) {
    parts.push(`Flagged entities: ${entities.slice(0, 5).join(", ")}.`);
  }

  if (event.type === "cross_session_correlation") {
    parts.push(`Cross-session correlation detected across ${event.matchedSessions.length + 1} honeypot sessions — indicates organized fraud ring activity.`);
  }

  parts.push("Forward to investigating officer for human review and prosecution under IT Act Section 66/66C/66D.");

  return parts.join(" ");
}
