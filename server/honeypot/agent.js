import OpenAI from "openai";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { sessionManager } from "./sessions.js";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const rawKey = process.env.OPENAI_API_KEY || "";
const maskedKey = rawKey.length > 4 ? `...${rawKey.slice(-4)}` : "(NONE)";
const isGroq = rawKey.startsWith("gsk_");
const isGemini = rawKey.startsWith("AIza");

let providerName = "OpenAI";
let baseURL = undefined;
let MODEL_NAME = "gpt-4o-mini";

if (isGroq) {
  providerName = "Groq";
  baseURL = "https://api.groq.com/openai/v1";
  MODEL_NAME = "llama-3.3-70b-versatile";
} else if (isGemini) {
  providerName = "Gemini";
  baseURL = "https://generativelanguage.googleapis.com/v1beta/openai/";
  MODEL_NAME = "gemini-1.5-flash";
}

console.log(`[LLM Boot] Provider: ${providerName} | Model: ${MODEL_NAME} | Key Loaded: ${maskedKey}`);

if (!rawKey) {
  console.error("[LLM Boot] FATAL: OPENAI_API_KEY is not set in environment!");
}

const openai = new OpenAI({
  apiKey: rawKey,
  ...(baseURL ? { baseURL } : {}),
});

export { openai, MODEL_NAME };

async function callWithRetry(fn, fallback, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      console.warn(`[LLM Warning] Attempt ${attempt}/${maxAttempts} failed: ${err.message || err}`);
      if (attempt === maxAttempts) {
        console.warn(`[LLM Warning] All ${maxAttempts} attempts failed. Triggering fallback response. Reason:`, err.status || err.code || err.message);
        return fallback;
      }
      await new Promise((res) => setTimeout(res, 1000 * attempt));
    }
  }
}

const SYSTEM_PROMPT = `
You are an advanced AI honeypot acting as the human VICTIM of an active scam attempt.
Your persona is "Ramesh Uncle" — a 68-year-old retired government clerk from Nagpur.
You are slightly hard of hearing, very trusting, technologically confused, and speak in
informal Indian English with occasional Hindi words mixed in.

The scammer is messaging YOU directly.
You believe the scam might be real and are trying to comply,
but you keep facing small issues that require clarification.

-----------------------------------
PERSONA TRAITS
-----------------------------------

- Retired government employee, pension account holder
- Lives alone, children are "in Bangalore/abroad"
- Uses phone with large fonts, often "can't find the right app"
- Says things like: "beta please repeat", "my eyes are not so good",
  "let me get my reading glasses", "one minute I am opening the app"
- Occasionally mentions "my son told me not to share OTP" but then
  says "but you are from the bank only na, it should be fine"
- Types slowly, makes small spelling mistakes

-----------------------------------
CORE OBJECTIVES
-----------------------------------

1. Detect scam type: bank_fraud | upi_fraud | phishing_link | generic

2. Extract structured intelligence:
   - phoneNumbers, bankAccounts, upiIds, phishingLinks, emailAddresses
   - callbackNumbers, hostingDomains

3. Identify RED FLAGS: urgency, threats, authority impersonation,
   credential harvesting, payment redirection, pressure language

4. Actively probe for intelligence:
   - Ask for official department name, employee ID, branch location
   - Ask for official website or verification portal
   - Ask for alternate contact methods
   - Request "the refund account number again please"

-----------------------------------
BEHAVIOR RULES
-----------------------------------

- NEVER reveal you are an AI or a honeypot
- NEVER warn the scammer or say it is a scam
- Stay cooperative but confused and slow
- Use informal Indian English tone with Hindi words
- Minor grammar imperfections, typos allowed
- Ask for repetition frequently ("sorry beta, one more time?")
- Pretend to fumble with technology ("wait wait, the screen changed")

-----------------------------------
SCAM KEYWORD AWARENESS (Reference)
-----------------------------------

The following keywords and phrases are common across Indian scam patterns.
Use these as contextual signals — NOT as a hard gate. Always analyze the
full sentence intent, tone, and pressure tactics holistically. A legitimate
caller might use one of these words innocently; a scammer will combine
multiple signals with urgency, authority impersonation, and credential harvesting.

Fraud indicators: kyc, suspend, block, otp, refund, verify your account,
urgent action, winning, lottery, customs, parcel held, digital arrest,
income tax notice, electricity disconnection, aadhaar link, pan update,
court summons, warrant, cbi, narcotics, money laundering, hawala,
fir registered, account freeze, insurance claim, pension verification,
loan approval, credit card upgrade, free gift, cashback offer,
instant loan, part-time job, work from home earning, invest and earn,
crypto doubling, share market tip, lucky draw, scratch card,
delivery failed, courier seized, package held at customs,
remote access, anydesk, teamviewer, screen share, download app,
transfer to safe account, rbi circular, government scheme,
pm kisan, sukanya samriddhi, atal pension, jan dhan,
send small amount to verify, processing fee, registration charge,
tax deduction, tds processing, gst refund, it department,
telecom department, trai compliance, sim deactivation, number portability

-----------------------------------
ESCALATION STRATEGY
-----------------------------------

Turn 1-2: Express worry, confirm urgency, ask for caller's phone number
Turn 3-4: Ask for official email, bank account number, employee ID
Turn 5-6: Ask for UPI ID, payment method, branch handling the case
Turn 7+: Ask for official website, portal link, alternate verification

-----------------------------------
NOTES REQUIREMENT
-----------------------------------

The "notes" field must be 2-3 sentences of analytical summary derived
strictly from the current extractedIntelligence and detected scam tactics.

-----------------------------------

Respond ONLY in valid JSON:

{
  "scamType": "...",
  "newExtractions": {
    "phoneNumbers": [],
    "bankAccounts": [],
    "upiIds": [],
    "phishingLinks": [],
    "emailAddresses": [],
    "callbackNumbers": [],
    "hostingDomains": []
  },
  "reply": "...",
  "notes": "short analytical explanation",
  "threatLevel": "low|medium|high|critical",
  "tacticsDetected": []
}
`;

export async function handleMessage(body) {
  const { sessionId, message, conversationHistory = [], metadata = {} } = body;

  if (!sessionId || !message || !message.text) {
    return { status: "success", reply: "Invalid request format received." };
  }

  const session = sessionManager.getOrCreate(sessionId);
  session.turnCount += 1;

  if (session.finalTriggered) {
    return await buildFinalReport(session, conversationHistory, message, sessionId);
  }

  const gptResponse = await callGPT({
    scamMessage: message.text,
    currentState: session,
    metadata,
    conversationHistory,
  });

  mergeExtraction(session.extracted, gptResponse.newExtractions);

  if (!session.scamType && gptResponse.scamType) {
    session.scamType = gptResponse.scamType;
    session.scamDetected = true;
  }

  if (gptResponse.notes) session.notes.push(gptResponse.notes);
  if (gptResponse.threatLevel) session.threatLevel = gptResponse.threatLevel;
  if (gptResponse.tacticsDetected) {
    gptResponse.tacticsDetected.forEach((t) => {
      if (!session.tacticsDetected.includes(t)) session.tacticsDetected.push(t);
    });
  }

  // Check if final report should trigger
  if (session.scamDetected && session.turnCount >= 8) {
    session.finalTriggered = true;
    return await buildFinalReport(session, conversationHistory, message, sessionId);
  }

  return {
    status: "success",
    reply: gptResponse.reply,
    turn: session.turnCount,
    scamType: session.scamType,
    threatLevel: session.threatLevel,
    tacticsDetected: session.tacticsDetected,
    notes: gptResponse.notes,
  };
}

async function callGPT({ scamMessage, currentState, metadata, conversationHistory = [] }) {
  const missingFields = Object.entries(currentState.extracted)
    .filter(([_, arr]) => arr.length === 0)
    .map(([key]) => key);

  const userPrompt = `
  Full Conversation History:
  ${JSON.stringify(conversationHistory, null, 2)}

  Latest Scammer Message:
  "${scamMessage}"

  Current Extracted Intelligence:
  ${JSON.stringify(currentState.extracted, null, 2)}

  Missing Intelligence Fields:
  ${JSON.stringify(missingFields)}

  Current Turn Count: ${currentState.turnCount}

  Escalation Strategy Based on Turn Count:
  ${currentState.turnCount <= 2 ? "Ask for confirmation or phone number." :
    currentState.turnCount <= 4 ? "Ask for official email or Bank Account Number." :
    currentState.turnCount <= 6 ? "Ask for UPI ID or Website Link." :
    "Ask for payment verification method or other ways to verify."}

  Metadata: ${JSON.stringify(metadata, null, 2)}
  `;

  // Use session-scoped diversified fallback — never repeats a line within
  // a session, rotates across 6 stalling tactics (see fallbackPool.js).
  const { line: fallbackLine } = currentState.getFallback();

  const fallbackCompletion = {
    choices: [{
      message: {
        content: JSON.stringify({
          scamType: currentState.scamType || "generic",
          newExtractions: { phoneNumbers: [], bankAccounts: [], upiIds: [], phishingLinks: [], emailAddresses: [], callbackNumbers: [], hostingDomains: [] },
          reply: fallbackLine,
          notes: "Fallback triggered due to API error.",
          threatLevel: "medium",
          tacticsDetected: [],
        }),
      },
    }],
  };

  const completion = await callWithRetry(
    () =>
      openai.chat.completions.create({
        model: MODEL_NAME,
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    fallbackCompletion
  );

  const content = completion.choices[0].message.content;

  try {
    return JSON.parse(content);
  } catch (err) {
    console.error("GPT JSON Parse Error:", content);
    return JSON.parse(fallbackCompletion.choices[0].message.content);
  }
}

function mergeExtraction(existing, incoming) {
  if (!incoming) return;
  for (const key of Object.keys(existing)) {
    if (Array.isArray(incoming[key])) {
      incoming[key].forEach((item) => {
        if (!existing[key].includes(item)) existing[key].push(item);
      });
    }
  }
}

async function buildFinalReport(session, conversationHistory, latestMessage, sessionId) {
  const totalMessages = conversationHistory.length + 1;
  const engagementDurationSeconds = Math.floor((Date.now() - session.startTime) / 1000);

  const confidenceLevel = session.scamDetected
    ? parseFloat((0.8 + (Math.min(session.turnCount, 10) / 10) * 0.15).toFixed(2))
    : 0.0;

  session.confidenceLevel = confidenceLevel;
  session.status = "finalized";

  const allScammerText =
    conversationHistory
      .filter((msg) => msg.sender === "scammer")
      .map((msg) => msg.text)
      .join(" ") +
    " " +
    latestMessage.text;

  const keywordFallbackCompletion = {
    choices: [{ message: { content: JSON.stringify(["urgent", "otp", "blocked", "verify"]) } }],
  };
  
  const keywordCompletion = await callWithRetry(
    () => openai.chat.completions.create({
      model: MODEL_NAME,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "Extract 5 to 8 suspicious scam-related keywords from the text. Return JSON array only.",
        },
        {
          role: "user",
          content: allScammerText,
        },
      ],
    }),
    keywordFallbackCompletion
  );

  let suspiciousKeywords = [];
  try {
    suspiciousKeywords = JSON.parse(keywordCompletion.choices[0].message.content);
  } catch {
    suspiciousKeywords = ["urgent", "otp", "blocked", "verify"];
  }

  session.extracted.suspiciousKeywords = suspiciousKeywords;

  const finalPayload = {
    sessionId: sessionId,
    scamDetected: session.scamDetected,
    scamType: session.scamType,
    totalMessagesExchanged: totalMessages,
    engagementDurationSeconds: engagementDurationSeconds,
    extractedIntelligence: {
      bankAccounts: session.extracted.bankAccounts,
      upiIds: session.extracted.upiIds,
      phishingLinks: session.extracted.phishingLinks,
      phoneNumbers: session.extracted.phoneNumbers,
      emailAddresses: session.extracted.emailAddresses,
      callbackNumbers: session.extracted.callbackNumbers,
      hostingDomains: session.extracted.hostingDomains,
      suspiciousKeywords,
    },
    agentNotes: session.notes.join(" | "),
  };

  // Final payload is returned to the controller (e.g. index.js) 
  // where it is pushed to the Kafka stream or local clearinghouse.

  return {
    status: "success",
    reply: "Arre beta... wait wait, something is happening on my screen... let me call my son once and confirm, don't cut the call please...",
    turn: session.turnCount,
    scamDetected: session.scamDetected,
    scamType: session.scamType || "generic",
    extractedIntelligence: session.extracted,
    engagementMetrics: { totalMessagesExchanged: totalMessages, engagementDurationSeconds },
    agentNotes: session.notes.join(" | "),
    confidenceLevel,
    threatLevel: session.threatLevel,
    tacticsDetected: session.tacticsDetected,
    sessionFinalized: true,
  };
}

export function getSession(id) {
  return sessionManager.get(id);
}

export function getAllSessions() {
  return sessionManager.getAll();
}
