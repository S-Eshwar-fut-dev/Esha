import { Landmark, Scale, Lock } from 'lucide-react'
import './ClearinghousePanel.css'

const SEVERITY_MAP = {
  CRITICAL: { bg: '#FEF3F2', border: '#FECDCA', color: '#D92D20' },
  HIGH: { bg: '#FEF0C7', border: '#FEDF89', color: '#B54708' },
  MEDIUM: { bg: '#EEF2FF', border: '#C7D2FE', color: '#3730A3' },
}

export default function ClearinghousePanel({ cases, clusters }) {
  return (
    <div className="clearinghouse-panel">
      {/* Summary */}
      <div className="ch-summary">
        <div className="ch-summary-card">
          <div className="ch-summary-value mono" style={{ color: '#D92D20' }}>{cases.length}</div>
          <div className="ch-summary-label">Cases Filed</div>
        </div>
        <div className="ch-summary-card">
          <div className="ch-summary-value mono" style={{ color: '#6D28D9' }}>{clusters.length}</div>
          <div className="ch-summary-label">Clusters</div>
        </div>
        <div className="ch-summary-card">
          <div className="ch-summary-value mono" style={{ color: '#B54708' }}>
            {cases.filter(c => c.status === 'FREEZE_RECOMMENDED').length}
          </div>
          <div className="ch-summary-label">Freeze Rec.</div>
        </div>
      </div>

      {/* Cases */}
      <div className="ch-cases">
        {cases.length === 0 ? (
          <div className="ch-empty">
            <div className="ch-empty-icon"><Landmark size={32} color="#4F46E5" /></div>
            <p>No cases filed yet. Cases are generated when fraud intelligence is verified through cross-session correlation or high-confidence detection.</p>
          </div>
        ) : (
          cases.map((c, i) => {
            const sev = SEVERITY_MAP[c.severity] || SEVERITY_MAP.MEDIUM
            return (
              <div
                key={c.caseId}
                className="ch-case-card"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="ch-case-header">
                  <span className="ch-case-id mono">{c.caseId}</span>
                  <span className="ch-case-severity" style={{ background: sev.bg, borderColor: sev.border, color: sev.color }}>
                    {c.severity}
                  </span>
                </div>

                <div className="ch-case-status">
                  <span className="ch-status-badge">
                    <span className="status-dot threat" />
                    {c.status}
                  </span>
                  <span className="ch-case-type mono">{c.scamType?.replace('_', ' ')}</span>
                </div>

                {c.campaignId && (
                  <div className="ch-case-field">
                    <span className="ch-field-label">Campaign</span>
                    <span className="ch-field-value mono">{c.campaignId}</span>
                  </div>
                )}

                {c.sharedEntities?.length > 0 && (
                  <div className="ch-case-field">
                    <span className="ch-field-label">Flagged Entities</span>
                    <div className="ch-entities">
                      {c.sharedEntities.slice(0, 5).map((e, j) => (
                        <span key={j} className="ch-entity-tag mono">{e}</span>
                      ))}
                    </div>
                  </div>
                )}

                {c.recommendation && (
                  <div className="ch-case-recommendation">
                    <span className="ch-rec-label">
                      <Scale size={13} style={{ display: 'inline', marginRight: 4 }} /> Recommendation
                    </span>
                    <p className="ch-rec-text">{c.recommendation}</p>
                  </div>
                )}

                {c.evidentiaryChain && (
                  <div className="ch-case-evidence">
                    <span className="ch-field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={12} color="#4F46E5" /> Evidence Hash
                    </span>
                    <span className="ch-hash mono">{c.evidentiaryChain.hash?.substring(0, 32)}...</span>
                    <span className="ch-hash-algo mono">{c.evidentiaryChain.algorithm} · {c.filedAtISO}</span>
                  </div>
                )}

                <div className="ch-case-sessions">
                  <span className="ch-field-label">Linked Sessions</span>
                  <span className="ch-session-count mono">{c.linkedSessions?.length || 1}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
