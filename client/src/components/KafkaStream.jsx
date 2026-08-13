import { Zap } from 'lucide-react'
import './KafkaStream.css'

const TOPIC_COLORS = {
  'raw.telemetry.calls': { bg: '#EEF2FF', border: '#C7D2FE', color: '#3730A3', label: 'TELEMETRY' },
  'raw.telemetry.sms': { bg: '#F0F9FF', border: '#B2DDFF', color: '#026AA2', label: 'SMS' },
  'fraud.intel.candidate': { bg: '#FEF0C7', border: '#FEDF89', color: '#B54708', label: 'CANDIDATE' },
  'fraud.intel.verified': { bg: '#ECFDF3', border: '#ABE5C6', color: '#067647', label: 'VERIFIED' },
  'clearinghouse.alerts': { bg: '#FEF3F2', border: '#FECDCA', color: '#B42318', label: 'ALERT' },
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function truncate(str, len = 100) {
  if (!str) return ''
  const s = typeof str === 'string' ? str : JSON.stringify(str)
  return s.length > len ? s.substring(0, len) + '...' : s
}

export default function KafkaStream({ events }) {
  // Topic stats
  const topicCounts = {}
  events.forEach(e => {
    topicCounts[e.topic] = (topicCounts[e.topic] || 0) + 1
  })

  return (
    <div className="kafka-panel">
      {/* Topic Summary */}
      <div className="kafka-topic-bar">
        {Object.entries(TOPIC_COLORS).map(([topic, style]) => (
          <div key={topic} className="kafka-topic-chip" style={{ borderColor: style.border, background: style.bg }}>
            <span className="kafka-topic-dot" style={{ background: style.color }} />
            <span className="kafka-topic-name">{style.label}</span>
            <span className="kafka-topic-count mono" style={{ color: style.color }}>
              {topicCounts[topic] || 0}
            </span>
          </div>
        ))}
      </div>

      {/* Event Stream */}
      <div className="kafka-stream">
        {events.length === 0 ? (
          <div className="kafka-empty">
            <div className="kafka-empty-icon"><Zap size={32} color="#4F46E5" /></div>
            <p>No Kafka events yet. Start a demo to see real-time event streaming.</p>
          </div>
        ) : (
          events.map((event, i) => {
            const style = TOPIC_COLORS[event.topic] || TOPIC_COLORS['raw.telemetry.calls']
            return (
              <div
                key={event.offset ?? i}
                className="kafka-event-card"
                style={{ borderLeftColor: style.color, animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                <div className="kafka-event-header">
                  <span className="kafka-event-topic" style={{ color: style.color, background: style.bg, borderColor: style.border }}>
                    {style.label}
                  </span>
                  <span className="kafka-event-meta mono">
                    P{event.partition} · #{event.offset}
                  </span>
                  <span className="kafka-event-time mono">{formatTime(event.timestamp)}</span>
                </div>
                <div className="kafka-event-body mono">
                  {event.topic === 'clearinghouse.alerts' ? (
                    <>
                      <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>
                        CASE {event.value?.caseId}
                      </span>
                      {' — '}{event.value?.recommendation ? truncate(event.value.recommendation, 120) : 'Freeze recommended'}
                    </>
                  ) : event.topic === 'fraud.intel.verified' ? (
                    <>
                      <span style={{ color: '#067647', fontWeight: 600 }}>
                        {event.value?.type === 'cross_session_correlation' ? 'LINKED CROSS-SESSION' : 'VERIFIED INTEL'}
                      </span>
                      {event.value?.campaignId && ` · Campaign: ${event.value.campaignId}`}
                      {event.value?.sharedEntities && ` · Entities: ${event.value.sharedEntities.slice(0, 3).join(', ')}`}
                    </>
                  ) : event.topic === 'fraud.intel.candidate' ? (
                    <>
                      <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
                        {event.value?.scamType || 'analyzing'}
                      </span>
                      {` · Session: ${truncate(event.key, 30)}`}
                      {event.value?.confidence && ` · Conf: ${(event.value.confidence * 100).toFixed(0)}%`}
                    </>
                  ) : (
                    <>
                      <span style={{ color: style.color }}>Turn {event.value?.turn || '?'}</span>
                      {' · '}{truncate(event.value?.agentReply || event.value?.scammerMessage || JSON.stringify(event.value), 100)}
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
