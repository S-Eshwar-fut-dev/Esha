import { ShieldCheck } from 'lucide-react'
import './Header.css'

export default function Header({ systemHealth, kafkaEventCount, caseCount }) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="header-brand-icon">
          <ShieldCheck className="brand-shield-icon" size={20} color="#FFFFFF" />
          <div className="brand-icon-glow" />
        </div>
        <div className="header-brand-text">
          <h1 className="brand-name">
            <span className="gradient-text">Esha</span>
          </h1>
          <p className="brand-subtitle">Active Cognitive Disruption Grid</p>
        </div>
      </div>

      <div className="header-center">
        <div className="header-metrics">
          <div className="header-metric">
            <span className="header-metric-value mono">{kafkaEventCount}</span>
            <span className="header-metric-label">Events</span>
          </div>
          <div className="header-metric-divider" />
          <div className="header-metric">
            <span className="header-metric-value mono">{caseCount}</span>
            <span className="header-metric-label">Cases</span>
          </div>
          <div className="header-metric-divider" />
          <div className="header-metric">
            <span className="header-metric-value mono">
              {systemHealth ? `${Math.floor(systemHealth.uptime)}s` : '—'}
            </span>
            <span className="header-metric-label">Uptime</span>
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className="badge badge-info">
          <span className="mono" style={{ fontSize: '0.65rem' }}>LLAMA-3.3-70B</span>
        </div>
        <div className="badge badge-success">
          <span className="status-dot online" />
          Daemon Online
        </div>
      </div>
    </header>
  )
}
