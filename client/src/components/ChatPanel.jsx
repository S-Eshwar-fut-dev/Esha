import { useRef, useEffect } from 'react'
import { MessageSquare, Play, Pause, SkipForward, RotateCcw, Target, Search, Zap, Landmark, UserX, ShieldCheck, CheckCircle2 } from 'lucide-react'
import './ChatPanel.css'

function formatDuration(s) {
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export default function ChatPanel({
  selectedScenario, conversationHistory, currentTurn, totalTurns,
  isRunning, isAutoMode, allDone, onRun, onStep, onReset, elapsed, progress,
}) {
  const messagesRef = useRef(null)

  useEffect(() => {
    if (messagesRef.current) {
      requestAnimationFrame(() => {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight
      })
    }
  }, [conversationHistory, isRunning])

  const showTyping = isRunning && conversationHistory.length > 0 &&
    conversationHistory[conversationHistory.length - 1].sender === 'scammer'

  return (
    <section className="chat-panel">
      {/* Toolbar */}
      <div className="chat-toolbar">
        <div className="chat-toolbar-left">
          <h3>
            <MessageSquare size={16} className="chat-header-icon" /> Live Engagement
          </h3>
          <span className="turn-badge mono">{currentTurn} / {totalTurns}</span>
          {elapsed > 0 && (
            <span className="duration-badge mono">{formatDuration(elapsed)}</span>
          )}
        </div>
        <div className="chat-toolbar-right">
          {/* Progress bar */}
          <div className="chat-progress-wrap">
            <div className="chat-progress-bar">
              <div className="chat-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="chat-progress-label mono">{progress}%</span>
          </div>
          <button
            className="btn btn-brand"
            disabled={!selectedScenario || isRunning || allDone}
            onClick={onRun}
          >
            {isAutoMode ? (
              <><Pause size={14} /> Running...</>
            ) : allDone ? (
              <><CheckCircle2 size={14} /> Complete</>
            ) : (
              <><Play size={14} /> Run Demo</>
            )}
          </button>
          <button
            className="btn btn-ghost"
            disabled={!selectedScenario || isRunning || allDone}
            onClick={onStep}
          >
            <SkipForward size={14} /> Step
          </button>
          <button
            className="btn btn-danger"
            disabled={!selectedScenario}
            onClick={onReset}
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" ref={messagesRef}>
        {!selectedScenario ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <Target size={36} color="#4F46E5" />
            </div>
            <h3>Ready to Engage</h3>
            <p>Select an attack vector from the sidebar, then click <strong>Run Demo</strong> to watch Esha's honeypot agent drain the scammer's time.</p>
            <div className="chat-empty-features">
              <div className="feature-pill"><Search size={12} /> Real-time Intel Extraction</div>
              <div className="feature-pill"><Zap size={12} /> Kafka Event Streaming</div>
              <div className="feature-pill"><Landmark size={12} /> I4C Case Filing</div>
            </div>
          </div>
        ) : (
          <>
            <div className="chat-system-msg">
              Scenario loaded: <strong>{selectedScenario.name}</strong> — {selectedScenario.messages.length} attack messages queued.
            </div>
            {conversationHistory.map((msg, i) => (
              <div
                key={i}
                className={`chat-message ${msg.sender === 'scammer' ? 'msg-scammer' : 'msg-agent'}`}
              >
                <div className="msg-avatar">
                  {msg.sender === 'scammer' ? (
                    <UserX size={16} color="#D92D20" />
                  ) : (
                    <ShieldCheck size={16} color="#4F46E5" />
                  )}
                </div>
                <div className="msg-content">
                  <div className="msg-sender">
                    {msg.sender === 'scammer' ? 'Threat Actor' : 'Esha Agent'}
                  </div>
                  <div className="msg-bubble" dangerouslySetInnerHTML={{ __html: escapeHtml(msg.text) }} />
                  <div className="msg-time">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {showTyping && (
              <div className="chat-message msg-agent">
                <div className="msg-avatar">
                  <ShieldCheck size={16} color="#4F46E5" />
                </div>
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}
            {allDone && (
              <div className="chat-system-msg complete">
                <CheckCircle2 size={14} style={{ display: 'inline', marginRight: 4 }} />
                Engagement complete — {currentTurn} turns, {formatDuration(elapsed)} elapsed. Intelligence extracted and filed. Review the Intel, Kafka, and I4C panels →
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
