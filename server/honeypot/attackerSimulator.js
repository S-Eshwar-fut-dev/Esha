import { openai, MODEL_NAME } from "./agent.js";

const ATTACKER_SYSTEM_PROMPT = `
You are generating one turn of SIMULATED scam-call dialogue for testing our own defensive honeypot system.
This is synthetic training/demo data only — no real person will ever receive this text.
Stay in character as a scripted fraud-actor persona (e.g. fake bank support officer, fake e-commerce refund agent, fake telecom e-KYC representative, or fake lottery claims director) consistent with the selected campaign.

Campaign Contexts:
- bank_fraud: Impersonate State Bank Security / RBI official claiming account freeze, urgent verification, demanding OTP or verification transfer.
- upi_fraud: Impersonate e-commerce (FlipShop/Amazon) refund support tricking victim to accept UPI collect requests or enter PIN to receive money.
- phishing_link: Impersonate Jio/Airtel telecom compliance team threatening 24h SIM disconnection unless e-KYC form is filled or app downloaded.
- generic: Impersonate International Digital Lottery claims officer demanding processing fee / TDS payment to release 25 Lakh prize money.

Rules:
- Generate ONLY the next line spoken/typed by the scammer in 1-3 urgent, pressuring sentences.
- Naturally advance the scam script turn by turn based on the victim's latest response.
- Include realistic (fictional) details like fake UPI IDs (e.g. verify.refund@okaxis), fake 10-digit phone numbers, fake account numbers, or fake URLs.
- Do NOT resolve or end the scam prematurely; your objective is to press for credentials/money while keeping the victim engaged.
- Do NOT include labels like "Scammer:" or quotation marks around your output.
`.trim();

/**
 * Generate a dynamic attacker turn using LLM.
 * @param {string} campaign - 'bank_fraud' | 'upi_fraud' | 'phishing_link' | 'generic'
 * @param {Array} conversationHistory - Array of { sender: 'scammer'|'agent', text: string }
 * @param {object} options - { demoMode: true }
 */
export async function generateAttackerTurn(campaign = "bank_fraud", conversationHistory = [], options = { demoMode: true }) {
  if (!options.demoMode) {
    throw new Error("[Security Guardrail] Attacker simulation is strictly restricted to demoMode.");
  }

  const formattedHistory = conversationHistory
    .map((m) => `${m.sender === "scammer" ? "Threat Actor (You)" : "Victim (Target)"}: ${m.text}`)
    .join("\n");

  const prompt = `
Campaign Type: ${campaign}
Conversation Transcript So Far:
${formattedHistory || "(Conversation starting — give your opening attack line)"}

Generate the NEXT threat actor dialogue line:
`.trim();

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      temperature: 0.75,
      max_tokens: 120,
      messages: [
        { role: "system", content: ATTACKER_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() || "";
    // Clean up any accidental leading quotes or speaker prefixes
    return text.replace(/^(Threat Actor|Scammer|Caller):\s*/i, "").replace(/^["']|["']$/g, "");
  } catch (err) {
    console.error("[Attacker Simulator Error]", err);
    return null; // fallback to scripted line if API fails
  }
}
