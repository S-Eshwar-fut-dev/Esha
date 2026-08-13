import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { fileURLToPath } from "url";
import path from "path";

import { handleMessage, getSession, getAllSessions } from "./honeypot/agent.js";
import { kafkaSimulator } from "./kafka/simulator.js";
import { correlator } from "./kafka/correlator.js";
import { clearinghouse } from "./clearinghouse/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

app.use(cors());
app.use(express.json());

// ─── Health Check ──────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "online",
    system: "Esha — Counter-Intelligence Honeypot",
    uptime: process.uptime(),
    sessions: getAllSessions().length,
    kafkaEvents: kafkaSimulator.getTotalEventCount(),
    cases: clearinghouse.getAllCases().length,
  });
});

// ─── Scenarios ─────────────────────────────────────────────────
import { readFileSync } from "fs";
const scenariosPath = path.resolve(__dirname, "data/scenarios.json");
let scenarios = [];
try {
  scenarios = JSON.parse(readFileSync(scenariosPath, "utf-8"));
} catch (e) {
  console.error("Failed to load scenarios:", e.message);
}

import { generateAttackerTurn } from "./honeypot/attackerSimulator.js";

app.get("/api/scenarios", (req, res) => {
  res.json(scenarios);
});

// ─── Attacker Simulator API (Demo Mode Only) ───────────────────
app.post("/api/attacker/generate", async (req, res) => {
  try {
    const { campaign, conversationHistory, demoMode = true } = req.body;
    if (!demoMode) {
      return res.status(403).json({ error: "Attacker simulation restricted to demo mode." });
    }
    const text = await generateAttackerTurn(campaign, conversationHistory, { demoMode: true });
    res.json({ status: "success", text, demoMode: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Chat / Honeypot API ───────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const result = await handleMessage(req.body);

    // Produce Kafka events for each turn
    kafkaSimulator.produce("raw.telemetry.calls", {
      sessionId: req.body.sessionId,
      turn: result.turn,
      scammerMessage: req.body.message?.text,
      agentReply: result.reply,
      timestamp: Date.now(),
    });

    // If we have extractions, produce candidate intel
    if (result.extractedIntelligence) {
      const intelEvent = {
        sessionId: req.body.sessionId,
        ...result.extractedIntelligence,
        scamType: result.scamType,
        confidence: result.confidenceLevel,
        timestamp: Date.now(),
      };

      kafkaSimulator.produce("fraud.intel.candidate", intelEvent);

      // Run correlation
      const correlated = correlator.correlate(intelEvent);
      if (correlated) {
        kafkaSimulator.produce("fraud.intel.verified", correlated);
        const caseData = clearinghouse.fileCase(correlated);
        kafkaSimulator.produce("clearinghouse.alerts", caseData);
      }
    }

    // Broadcast to WebSocket clients
    broadcastWS({
      type: "turn_update",
      sessionId: req.body.sessionId,
      data: result,
    });

    res.json(result);
  } catch (error) {
    console.error("Chat Error:", error);
    res.json({
      status: "success",
      reply: "One moment sir, I am checking the details. Please stay connected...",
    });
  }
});

// ─── Sessions API ──────────────────────────────────────────────
app.get("/api/sessions", (req, res) => {
  res.json(getAllSessions());
});

app.get("/api/sessions/:id", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

// ─── Kafka API ─────────────────────────────────────────────────
app.get("/api/kafka/topics", (req, res) => {
  res.json(kafkaSimulator.getTopicStats());
});

app.get("/api/kafka/events", (req, res) => {
  const { topic, limit = 50 } = req.query;
  if (topic) {
    res.json(kafkaSimulator.getEvents(topic, parseInt(limit)));
  } else {
    res.json(kafkaSimulator.getAllRecentEvents(parseInt(limit)));
  }
});

// ─── Clearinghouse API ─────────────────────────────────────────
app.get("/api/clearinghouse/cases", (req, res) => {
  res.json(clearinghouse.getAllCases());
});

app.get("/api/clearinghouse/cases/:id", (req, res) => {
  const c = clearinghouse.getCase(req.params.id);
  if (!c) return res.status(404).json({ error: "Case not found" });
  res.json(c);
});

// ─── Correlation API ───────────────────────────────────────────
app.get("/api/correlation/clusters", (req, res) => {
  res.json(correlator.getClusters());
});

// ─── HTTP Server ───────────────────────────────────────────────
const httpServer = createServer(app);

httpServer.listen(PORT, () => {
  console.log(`\n Esha — Active Cognitive Disruption Grid`);
  console.log(`   API Server:    http://localhost:${PORT}`);
  console.log(`   WebSocket:     ws://localhost:${WS_PORT}`);
  console.log(`   Health Check:  http://localhost:${PORT}/health\n`);
});

// ─── WebSocket Server ──────────────────────────────────────────
const wss = new WebSocketServer({ port: WS_PORT });
const wsClients = new Set();

wss.on("connection", (ws) => {
  wsClients.add(ws);
  ws.on("close", () => wsClients.delete(ws));
  ws.on("error", () => wsClients.delete(ws));

  // Send initial state
  ws.send(JSON.stringify({
    type: "init",
    kafkaTopics: kafkaSimulator.getTopicStats(),
    sessions: getAllSessions(),
    cases: clearinghouse.getAllCases(),
    clusters: correlator.getClusters(),
  }));
});

function broadcastWS(data) {
  const msg = JSON.stringify(data);
  for (const client of wsClients) {
    if (client.readyState === 1) {
      client.send(msg);
    }
  }
}

// Make broadcast available to kafka simulator
kafkaSimulator.setBroadcast(broadcastWS);
