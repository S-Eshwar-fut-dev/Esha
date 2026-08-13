import { Target, Building2, CreditCard, Link2, AlertTriangle } from 'lucide-react'
import './ScenarioSidebar.css'

const renderScamIcon = (scamType) => {
  switch (scamType) {
    case 'bank_fraud':
      return <Building2 size={18} className="icon-amber" />
    case 'upi_fraud':
      return <CreditCard size={18} className="icon-purple" />
    case 'phishing_link':
      return <Link2 size={18} className="icon-cyan" />
    case 'generic':
    default:
      return <AlertTriangle size={18} className="icon-red" />
  }
}

export default function ScenarioSidebar({ scenarios, selectedId, onSelect, disabled }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">
          <Target size={14} className="sidebar-header-icon" /> Attack Vectors
        </h2>
        <p className="sidebar-desc">Select a scam scenario to engage</p>
      </div>
      <div className="sidebar-list">
        {scenarios.map((s, i) => (
          <div
            key={s.id}
            className={`scenario-card ${selectedId === s.id ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onSelect(s)}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="scenario-card-inner">
              <div className="scenario-icon">{renderScamIcon(s.scamType)}</div>
              <div className="scenario-info">
                <h3 className="scenario-name">{s.name.replace(/^[^\s]+\s/, '')}</h3>
                <p className="scenario-desc">{s.description}</p>
                <div className="scenario-meta">
                  <span className={`scenario-type-tag type-${s.scamType}`}>
                    {s.scamType.replace('_', ' ')}
                  </span>
                  <span className="scenario-msgs mono">{s.messages.length} msgs</span>
                </div>
              </div>
            </div>
            <div className="scenario-glow" />
          </div>
        ))}
      </div>
    </aside>
  )
}
