/**
 * Diversified fallback stall lines for when the LLM call fails or is
 * unavailable. A single repeated line is a fingerprintable tell — this
 * pool varies vocabulary, sentence structure, code-switch ratio, and
 * stalling *tactic* so no two turns in a session read the same way.
 *
 * Grouped by tactic so a caller can also weight tactic selection (e.g.
 * bias toward TECH_ISSUE early, FAMILY_INTERRUPT later) rather than pure
 * random draw, if you want the stall to feel like it's escalating.
 */
const FALLBACK_POOL = {
  CONFUSION: [
    'Wait wait, I am getting confused, say again from starting.',
    'Hold on beta, my head is spinning with all this, one second.',
    'Sorry, what was that number, I did not catch it properly.',
    'Ek minute, ek minute — you are speaking too fast for me.',
  ],
  VISION_HEARING: [
    'Beta, let me find my glasses first, I cannot read the screen.',
    'The phone volume is very low, can you please repeat louder?',
    'My hearing aid is giving problem, say once more please.',
    'I am not able to see the small text, hold on.',
  ],
  TECH_ISSUE: [
    'The app is loading, loading… it is very slow today.',
    'Internet is not working properly here, please wait.',
    'It is asking for password again, one second I am trying.',
    'Screen has frozen, let me restart the phone, hold the line.',
    'This banking app keeps crashing, give me a moment.',
  ],
  FAMILY_INTERRUPT: [
    'Sorry, my daughter is calling me from other room, one second.',
    'Someone is at the door, please hold, I will come back.',
    'My grandson is asking something, wait two minutes please.',
    'The cooker whistle is going, let me just check the kitchen.',
  ],
  PHYSICAL_STALL: [
    'Let me sit down properly first, my legs are paining.',
    'One second, I need to get my reading spectacles from the other room.',
    'I dropped the phone, sorry, picking it up now.',
    'My hands are shaking a little, give me a moment to type.',
  ],
  CLARIFICATION_SEEKING: [
    'Which account you said, the SBI one or the other one?',
    'You said refund is coming, but from where exactly?',
    'Can you tell me your name and department again please?',
    'Is this the same department that called yesterday also?',
  ],
};

/**
 * Session-scoped fallback selector: never repeats a line within the same
 * session, and only repeats a *tactic* after all tactics have been used
 * at least once.
 *
 * Usage: instantiate one selector per session (not global — global would
 * leak "used" state across unrelated calls):
 *
 *   const getFallback = createFallbackSelector();
 *   // store getFallback on the session object
 *   ...
 *   const { tactic, line } = getFallback();
 */
export function createFallbackSelector() {
  const usedLines = new Set();
  let tacticOrder = shuffle(Object.keys(FALLBACK_POOL));
  let tacticIndex = 0;

  return function nextFallback() {
    // Cycle through tactics in shuffled order; reshuffle once exhausted.
    if (tacticIndex >= tacticOrder.length) {
      tacticOrder = shuffle(Object.keys(FALLBACK_POOL));
      tacticIndex = 0;
    }

    const tactic = tacticOrder[tacticIndex++];
    const candidates = FALLBACK_POOL[tactic].filter((line) => !usedLines.has(line));

    // If every line in this tactic has been used this session, fall back to
    // the full (still de-duped globally) candidate set so we never throw.
    const pool = candidates.length > 0 ? candidates : FALLBACK_POOL[tactic];
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    usedLines.add(chosen);
    return { tactic, line: chosen };
  };
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
