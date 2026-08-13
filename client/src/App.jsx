import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Zap, Landmark } from 'lucide-react'
import './App.css'
import Header from './components/Header.jsx'
import ScenarioSidebar from './components/ScenarioSidebar.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import IntelPanel from './components/IntelPanel.jsx'
import KafkaStream from './components/KafkaStream.jsx'
import ClearinghousePanel from './components/ClearinghousePanel.jsx'

const WS_URL = 'ws://localhost:3002'

function App() {
  const [scenarios, setScenarios] = useState([])
  const [selectedScenario, setSelectedScenario] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [conversationHistory, setConversationHistory] = useState([])
  const [currentTurn, setCurrentTurn] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isAutoMode, setIsAutoMode] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [systemHealth, setSystemHealth] = useState(null)

  const [intelligence, setIntelligence] = useState({
    phoneNumbers: [], bankAccounts: [], upiIds: [],
    phishingLinks: [], emailAddresses: [], callbackNumbers: [],
    hostingDomains: [], suspiciousKeywords: [],
  })
  const [scamType, setScamType] = useState(null)
  const [confidence, setConfidence] = useState(0)
  const [threatLevel, setThreatLevel] = useState('low')
  const [tacticsDetected, setTacticsDetected] = useState([])
  const [agentNotes, setAgentNotes] = useState('')
  const [sessionFinalized, setSessionFinalized] = useState(false)

  const [kafkaEvents, setKafkaEvents] = useState([])
  const [cases, setCases] = useState([])
  const [clusters, setClusters] = useState([])

  const [activeTab, setActiveTab] = useState('intel') // intel | kafka | clearinghouse

  const wsRef = useRef(null)
  const autoRunRef = useRef(false)
  const timerRef = useRef(null)

  // ── Load scenarios ──
  useEffect(() => {
    fetch('/api/scenarios').then(r => r.json()).then(setScenarios).catch(console.error)
    fetch('/health').then(r => r.json()).then(setSystemHealth).catch(() => {})
  }, [])

  // ── WebSocket ──
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => console.log('🔌 WebSocket connected')

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'init') {
            setCases(msg.cases || [])
            setClusters(msg.clusters || [])
          } else if (msg.type === 'kafka_event') {
            setKafkaEvents(prev => [msg.event, ...prev].slice(0, 200))
            // Update cases/clusters on clearinghouse events
            if (msg.event.topic === 'clearinghouse.alerts') {
              setCases(prev => [msg.event.value, ...prev])
            }
          } else if (msg.type === 'turn_update') {
            // Real-time update handled by the chat response flow
          }
        } catch (err) {
          console.error('WS parse error:', err)
        }
      }

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected, reconnecting...')
        setTimeout(connect, 2000)
      }
    }

    connect()
    return () => { if (wsRef.current) wsRef.current.close() }
  }, [])

  // ── Duration timer ──
  useEffect(() => {
    if (startTime) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [startTime])

  // ── Select scenario ──
  const selectScenario = useCallback((scenario) => {
    if (isRunning) return
    setSelectedScenario(scenario)
    setSessionId(`esha-${scenario.id}-${Date.now()}`)
    setConversationHistory([])
    setCurrentTurn(0)
    setStartTime(null)
    setElapsed(0)
    setSessionFinalized(false)
    setIntelligence({
      phoneNumbers: [], bankAccounts: [], upiIds: [],
      phishingLinks: [], emailAddresses: [], callbackNumbers: [],
      hostingDomains: [], suspiciousKeywords: [],
    })
    setScamType(null)
    setConfidence(0)
    setThreatLevel('low')
    setTacticsDetected([])
    setAgentNotes('')
  }, [isRunning])

  // ── Extract intel from text (client-side regex) ──
  const extractFromText = (text) => {
    if (!text) return {}
    const found = {}
    const phones = text.match(/\+?91[\s-]?\d{10}|\+?91\d{10}/g)
    if (phones) found.phoneNumbers = phones
    const emails = text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/g)
    if (emails) found.emailAddresses = emails
    const upis = text.match(/[\w.]+@(?:ok|pay|ybl|upi|paytm|icici|hdfc|sbi|axis)[\w]*/gi)
    if (upis) found.upiIds = upis
    const urls = text.match(/https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+/gi)
    if (urls) found.phishingLinks = urls
    const banks = text.match(/\b\d{12,18}\b/g)
    if (banks) found.bankAccounts = banks
    return found
  }

  const mergeIntel = (prev, incoming) => {
    const merged = { ...prev }
    for (const key of Object.keys(merged)) {
      if (incoming[key]) {
        const newItems = incoming[key].filter(i => !merged[key].includes(i))
        if (newItems.length > 0) merged[key] = [...merged[key], ...newItems]
      }
    }
    return merged
  }

  // ── Process one turn (Dual-AI Agent Loop) ──
  const processTurn = useCallback(async () => {
    const maxTurns = selectedScenario?.messages?.length || 8
    if (!selectedScenario || currentTurn >= maxTurns) {
      setIsRunning(false)
      setIsAutoMode(false)
      autoRunRef.current = false
      return false
    }

    setIsRunning(true)

    // Step 1: Generate/retrieve attacker message (AI Attacker vs Static fallback)
    let scamMessage = selectedScenario.messages[currentTurn]
    try {
      const attackerRes = await fetch('/api/attacker/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign: selectedScenario.scamType || selectedScenario.id,
          conversationHistory,
          demoMode: true,
        }),
      })
      const attackerData = await attackerRes.json()
      if (attackerData.status === 'success' && attackerData.text) {
        scamMessage = attackerData.text
      }
    } catch (e) {
      console.warn('AI Attacker generation failed, using scenario line:', e)
    }

    const newTurn = currentTurn + 1
    setCurrentTurn(newTurn)

    const newHistory = [...conversationHistory, { sender: 'scammer', text: scamMessage }]
    setConversationHistory(newHistory)

    if (!startTime) setStartTime(Date.now())

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: { text: scamMessage },
          conversationHistory: newHistory,
          metadata: { source: 'esha_frontend', scenario: selectedScenario.id },
        }),
      })
      const data = await res.json()

      const reply = data.reply || '...'
      const updatedHistory = [...newHistory, { sender: 'agent', text: reply }]
      setConversationHistory(updatedHistory)

      // Update intelligence
      if (data.extractedIntelligence) {
        setIntelligence(prev => mergeIntel(prev, data.extractedIntelligence))
      }
      // Client-side extraction
      const clientExtracted = extractFromText(scamMessage)
      if (Object.keys(clientExtracted).length > 0) {
        setIntelligence(prev => mergeIntel(prev, clientExtracted))
      }

      if (data.scamType) setScamType(data.scamType)
      if (data.confidenceLevel !== undefined) setConfidence(data.confidenceLevel)
      if (data.threatLevel) setThreatLevel(data.threatLevel)
      if (data.tacticsDetected) setTacticsDetected(data.tacticsDetected)
      if (data.agentNotes) setAgentNotes(data.agentNotes)
      if (data.notes) setAgentNotes(prev => prev ? `${prev} | ${data.notes}` : data.notes)
      if (data.sessionFinalized) setSessionFinalized(true)

      setIsRunning(false)
      return true
    } catch (err) {
      console.error('Turn error:', err)
      setIsRunning(false)
      return false
    }
  }, [selectedScenario, currentTurn, conversationHistory, sessionId, startTime])

  // ── Auto run ──
  useEffect(() => {
    let timer;
    if (isAutoMode && !isRunning && !sessionFinalized) {
      if (currentTurn < (selectedScenario?.messages?.length || 0)) {
        timer = setTimeout(() => {
          if (autoRunRef.current) {
            processTurn();
          }
        }, 1500);
      } else {
        setIsAutoMode(false);
        autoRunRef.current = false;
      }
    }
    return () => clearTimeout(timer);
  }, [isAutoMode, isRunning, currentTurn, selectedScenario, processTurn, sessionFinalized]);

  const runAutoDemo = useCallback(() => {
    autoRunRef.current = true;
    setIsAutoMode(true);
  }, []);

  const handleReset = useCallback(() => {
    autoRunRef.current = false
    setIsAutoMode(false)
    setIsRunning(false)
    if (selectedScenario) {
      selectScenario(selectedScenario)
    }
  }, [selectedScenario, selectScenario])

  const totalMessages = selectedScenario?.messages?.length || 0
  const progress = totalMessages > 0 ? Math.round((currentTurn / totalMessages) * 100) : 0
  const allDone = currentTurn >= totalMessages && totalMessages > 0

  return (
    <div className="app-shell">
      <Header
        systemHealth={systemHealth}
        kafkaEventCount={kafkaEvents.length}
        caseCount={cases.length}
      />

      <main className="main-grid">
        {/* Left: Scenarios */}
        <ScenarioSidebar
          scenarios={scenarios}
          selectedId={selectedScenario?.id}
          onSelect={selectScenario}
          disabled={isRunning}
        />

        {/* Center: Chat */}
        <ChatPanel
          selectedScenario={selectedScenario}
          conversationHistory={conversationHistory}
          currentTurn={currentTurn}
          totalTurns={totalMessages}
          isRunning={isRunning}
          isAutoMode={isAutoMode}
          allDone={allDone}
          onRun={runAutoDemo}
          onStep={processTurn}
          onReset={handleReset}
          elapsed={elapsed}
          progress={progress}
        />

        {/* Right: Intel / Kafka / Clearinghouse tabs */}
        <div className="right-panel">
          <div className="right-tabs">
            <button
              className={`right-tab ${activeTab === 'intel' ? 'active' : ''}`}
              onClick={() => setActiveTab('intel')}
            >
              <Search size={14} /> Intel
            </button>
            <button
              className={`right-tab ${activeTab === 'kafka' ? 'active' : ''}`}
              onClick={() => setActiveTab('kafka')}
            >
              <Zap size={14} /> Kafka
              {kafkaEvents.length > 0 && <span className="tab-count">{kafkaEvents.length}</span>}
            </button>
            <button
              className={`right-tab ${activeTab === 'clearinghouse' ? 'active' : ''}`}
              onClick={() => setActiveTab('clearinghouse')}
            >
              <Landmark size={14} /> I4C
              {cases.length > 0 && <span className="tab-count">{cases.length}</span>}
            </button>
          </div>

          <div className="right-content">
            {activeTab === 'intel' && (
              <IntelPanel
                intelligence={intelligence}
                scamType={scamType}
                confidence={confidence}
                threatLevel={threatLevel}
                tacticsDetected={tacticsDetected}
                agentNotes={agentNotes}
                turnCount={currentTurn}
                elapsed={elapsed}
                progress={progress}
                sessionFinalized={sessionFinalized}
              />
            )}
            {activeTab === 'kafka' && (
              <KafkaStream events={kafkaEvents} />
            )}
            {activeTab === 'clearinghouse' && (
              <ClearinghousePanel cases={cases} clusters={clusters} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
