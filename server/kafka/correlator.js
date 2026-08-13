// Simulated vector correlation engine (ChromaDB-style)
// Clusters sessions by shared infrastructure: mule accounts, UPI VPAs, phone numbers

const clusters = new Map(); // clusterId -> { sessions, sharedEntities, campaignId, score }
const entityIndex = new Map(); // entity -> Set<sessionId>
let clusterIdCounter = 1;

export const correlator = {
  correlate(intelEvent) {
    const { sessionId } = intelEvent;
    const entities = extractEntities(intelEvent);

    if (entities.length === 0) return null;

    // Index all entities
    const matchedSessions = new Set();
    for (const entity of entities) {
      if (!entityIndex.has(entity)) {
        entityIndex.set(entity, new Set());
      }
      const sessions = entityIndex.get(entity);

      // Check for cross-session matches
      for (const existingSession of sessions) {
        if (existingSession !== sessionId) {
          matchedSessions.add(existingSession);
        }
      }
      sessions.add(sessionId);
    }

    // If we have cross-session matches, create/update cluster
    if (matchedSessions.size > 0) {
      const allSessions = [sessionId, ...matchedSessions];
      const sharedEntities = entities.filter((e) => {
        const sessions = entityIndex.get(e);
        return sessions && sessions.size > 1;
      });

      // Find existing cluster or create new
      let existingClusterId = null;
      for (const [cid, cluster] of clusters) {
        if (allSessions.some((s) => cluster.sessions.includes(s))) {
          existingClusterId = cid;
          break;
        }
      }

      const clusterId = existingClusterId || `CLUSTER-${String(clusterIdCounter++).padStart(4, "0")}`;
      const campaignId = generateCampaignId(intelEvent.scamType);
      const score = Math.min(0.95, 0.6 + sharedEntities.length * 0.1 + matchedSessions.size * 0.05);

      clusters.set(clusterId, {
        clusterId,
        sessions: [...new Set(allSessions)],
        sharedEntities,
        campaignId,
        similarityScore: parseFloat(score.toFixed(2)),
        scamType: intelEvent.scamType,
        firstSeen: Date.now(),
        lastUpdated: Date.now(),
      });

      return {
        type: "cross_session_correlation",
        clusterId,
        sessionId,
        matchedSessions: [...matchedSessions],
        sharedEntities,
        campaignId,
        similarityScore: parseFloat(score.toFixed(2)),
        confidence: intelEvent.confidence,
        scamType: intelEvent.scamType,
        extractedIntelligence: intelEvent,
        timestamp: Date.now(),
      };
    }

    // Even without cross-session matches, if confidence is high enough, verify
    if (intelEvent.confidence && intelEvent.confidence >= 0.85) {
      return {
        type: "high_confidence_single",
        sessionId,
        entities,
        confidence: intelEvent.confidence,
        scamType: intelEvent.scamType,
        campaignId: generateCampaignId(intelEvent.scamType),
        extractedIntelligence: intelEvent,
        timestamp: Date.now(),
      };
    }

    return null;
  },

  getClusters() {
    return Array.from(clusters.values());
  },
};

function extractEntities(intel) {
  const entities = [];
  const fields = ["phoneNumbers", "bankAccounts", "upiIds", "phishingLinks", "emailAddresses", "callbackNumbers"];
  for (const field of fields) {
    if (Array.isArray(intel[field])) {
      entities.push(...intel[field]);
    }
  }
  return entities;
}

function generateCampaignId(scamType) {
  const prefixes = {
    bank_fraud: "BANK-FREEZE",
    upi_fraud: "UPI-REFUND",
    phishing_link: "KYC-SUSPEND",
    generic: "PRIZE-SCAM",
  };
  const prefix = prefixes[scamType] || "UNKNOWN";
  return `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
}
