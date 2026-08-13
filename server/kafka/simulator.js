const topics = {
  "raw.telemetry.calls": [],
  "raw.telemetry.sms": [],
  "fraud.intel.candidate": [],
  "fraud.intel.verified": [],
  "clearinghouse.alerts": [],
};

let broadcastFn = null;
let globalOffset = 0;

export const kafkaSimulator = {
  setBroadcast(fn) {
    broadcastFn = fn;
  },

  produce(topicName, data) {
    if (!topics[topicName]) topics[topicName] = [];

    const event = {
      offset: globalOffset++,
      topic: topicName,
      partition: Math.floor(Math.random() * 4),
      timestamp: Date.now(),
      key: data.sessionId || "system",
      value: data,
    };

    topics[topicName].push(event);

    // Broadcast to WebSocket clients
    if (broadcastFn) {
      broadcastFn({
        type: "kafka_event",
        event,
      });
    }

    return event;
  },

  getEvents(topicName, limit = 50) {
    const topicEvents = topics[topicName] || [];
    return topicEvents.slice(-limit);
  },

  getAllRecentEvents(limit = 50) {
    const all = [];
    for (const [topicName, events] of Object.entries(topics)) {
      all.push(...events);
    }
    all.sort((a, b) => b.timestamp - a.timestamp);
    return all.slice(0, limit);
  },

  getTopicStats() {
    const stats = {};
    for (const [name, events] of Object.entries(topics)) {
      stats[name] = {
        name,
        eventCount: events.length,
        lastEvent: events.length > 0 ? events[events.length - 1].timestamp : null,
        partitions: 4,
      };
    }
    return stats;
  },

  getTotalEventCount() {
    return Object.values(topics).reduce((sum, events) => sum + events.length, 0);
  },
};
