import { Phone, Building2, Wallet, Link2, Mail, PhoneCall, Globe, Flag, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react'
import './IntelPanel.css'

function formatDuration(s) {
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

const THREAT_COLORS = {
  low: '#047857',
  medium: '#D97706',
  high: '#C4320A',
  critical: '#D92D20',
}

const INTEL_SECTIONS = [
  { key: 'phoneNumbers', label: 'Phone Numbers', icon: <Phone size={14} className="intel-icon" />, tagClass: 'intel-tag-phone' },
  { key: 'bankAccounts', label: 'Bank Accounts', icon: <Building2 size={14} className="intel-icon" />, tagClass: 'intel-tag-bank' },
  { key: 'upiIds', label: 'UPI IDs', icon: <Wallet size={14} className="intel-icon" />, tagClass: 'intel-tag-upi' },
  { key: 'phishingLinks', label: 'Phishing Links', icon: <Link2 size={14} className="intel-icon" />, tagClass: 'intel-tag-link' },
  { key: 'emailAddresses', label: 'Email Addresses', icon: <Mail size={14} className="intel-icon" />, tagClass: 'intel-tag-email' },
  { key: 'callbackNumbers', label: 'Callback Numbers', icon: <PhoneCall size={14} className="intel-icon" />, tagClass: 'intel-tag-phone' },
  { key: 'hostingDomains', label: 'Hosting Domains', icon: <Globe size={14} className="intel-icon" />, tagClass: 'intel-tag-domain' },
  { key: 'suspiciousKeywords', label: 'Suspicious Keywords', icon: <Flag size={14} className="intel-icon" />, tagClass: 'intel-tag-keyword' },
]

export default function IntelPanel({
  intelligence, scamType, confidence, threatLevel, tacticsDetected,
  agentNotes, turnCount, elapsed, progress, sessionFinalized,
}) {
  const totalItems = Object.values(intelligence).reduce((s, a) => s + a.length, 0)

  return (
    <div className="intel-panel">
      {/* Stat Cards */}
      <div className="intel-stats-grid">
        <div className="intel-stat-card">
          <div className="intel-stat-value" style={{ color: 'var(--accent-rose)' }}>
            {scamType ? scamType.replace('_', ' ') : '—'}
          </div>
          <div className="intel-stat-label">Scam Type</div>
        </div>
        <div className="intel-stat-card">
          <div className="intel-stat-value" style={{ color: THREAT_COLORS[threatLevel] || 'var(--accent-emerald)' }}>
            {threatLevel?.toUpperCase() || 'LOW'}
          </div>
          <div className="intel-stat-label">Threat Level</div>
        </div>
        <div className="intel-stat-card">
          <div className="intel-stat-value mono" style={{ color: 'var(--accent-cyan)' }}>
            {turnCount}
          </div>
          <div className="intel-stat-label">Turns</div>
        </div>
        <div className="intel-stat-card">
          <div className="intel-stat-value mono" style={{ color: 'var(--accent-amber)' }}>
            {formatDuration(elapsed)}
          </div>
          <div className="intel-stat-label">Duration</div>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="intel-confidence">
        <div className="intel-confidence-header">
          <span>Confidence Score</span>
          <span className="mono" style={{ color: confidence >= 0.8 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
            {confidence > 0 ? `${(confidence * 100).toFixed(0)}%` : '—'}
          </span>
        </div>
        <div className="intel-confidence-bar">
          <div
            className="intel-confidence-fill"
            style={{
              width: `${confidence * 100}%`,
              background: confidence >= 0.85 ? 'var(--gradient-success)' :
                confidence >= 0.6 ? 'var(--gradient-amber)' : 'var(--gradient-brand)',
            }}
          />
        </div>
      </div>

      {/* Tactics Detected */}
      {tacticsDetected.length > 0 && (
        <div className="intel-tactics">
          <div className="intel-section-head">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldAlert size={14} color="#D92D20" /> Tactics Detected
            </span>
            <span className="intel-section-count">{tacticsDetected.length}</span>
          </div>
          <div className="intel-tactics-list">
            {tacticsDetected.map((t, i) => (
              <span key={i} className="tactic-tag">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="intel-progress">
        <div className="intel-progress-header">
          <span>Engagement Progress</span>
          <span className="mono">{progress}%</span>
        </div>
        <div className="intel-progress-bar">
          <div className="intel-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Intel Sections */}
      {INTEL_SECTIONS.map(({ key, label, icon, tagClass }) => {
        const items = intelligence[key] || []
        return (
          <div key={key} className="intel-section">
            <div className="intel-section-head">
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{icon} {label}</span>
              <span className={`intel-section-count ${items.length > 0 ? 'has-items' : ''}`}>
                {items.length}
              </span>
            </div>
            <div className="intel-section-body">
              {items.length > 0 ? (
                items.map((item, i) => (
                  <span key={i} className={`intel-tag ${tagClass}`}>{item}</span>
                ))
              ) : (
                <span className="intel-section-empty">No {label.toLowerCase()} extracted yet</span>
              )}
            </div>
          </div>
        )
      })}

      {/* Agent Notes */}
      <div className="intel-notes">
        <div className="intel-section-head">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={14} color="#4F46E5" /> Agent Analysis
          </span>
        </div>
        <div className="intel-notes-body">
          {agentNotes || 'Waiting for engagement to begin...'}
        </div>
      </div>

      {/* Finalized Badge */}
      {sessionFinalized && (
        <div className="intel-finalized">
          <CheckCircle2 size={16} color="#047857" style={{ flexShrink: 0 }} />
          <span>Session finalized — {totalItems} intelligence items extracted</span>
        </div>
      )}
    </div>
  )
}
