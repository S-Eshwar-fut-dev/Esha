import { createFallbackSelector } from './fallbackPool.js';

const sessions = new Map();

export const sessionManager = {
  getOrCreate(sessionId) {
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        sessionId,
        scamType: null,
        scamDetected: false,
        extracted: {
          phoneNumbers: [],
          bankAccounts: [],
          upiIds: [],
          phishingLinks: [],
          emailAddresses: [],
          callbackNumbers: [],
          hostingDomains: [],
        },
        startTime: Date.now(),
        turnCount: 0,
        notes: [],
        finalTriggered: false,
        status: "active",
        threatLevel: "low",
        tacticsDetected: [],
        confidenceLevel: 0,
        vector: "voice_call",
        getFallback: createFallbackSelector(),
      });
    }
    return sessions.get(sessionId);
  },

  get(sessionId) {
    const s = sessions.get(sessionId);
    if (!s) return null;
    return {
      ...s,
      engagementDurationSeconds: Math.floor((Date.now() - s.startTime) / 1000),
      totalExtractions: Object.values(s.extracted).reduce((sum, arr) => sum + arr.length, 0),
    };
  },

  getAll() {
    return Array.from(sessions.values()).map((s) => ({
      sessionId: s.sessionId,
      scamType: s.scamType,
      scamDetected: s.scamDetected,
      status: s.status,
      turnCount: s.turnCount,
      threatLevel: s.threatLevel,
      confidenceLevel: s.confidenceLevel,
      startTime: s.startTime,
      engagementDurationSeconds: Math.floor((Date.now() - s.startTime) / 1000),
      totalExtractions: Object.values(s.extracted).reduce((sum, arr) => sum + arr.length, 0),
    }));
  },

  delete(sessionId) {
    sessions.delete(sessionId);
  },
};
