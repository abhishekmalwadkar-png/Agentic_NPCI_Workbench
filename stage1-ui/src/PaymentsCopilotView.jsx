import React, { useState, useRef, useEffect } from 'react'

export default function PaymentsCopilotView({ apiBase = 'http://localhost:8000', onNavigateWorkbench }) {
  const [channelMode, setChannelMode] = useState('teams') // 'teams' | 'portal'
  const [inputQuery, setInputQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: "Hello! I am the **Payments Copilot (UC7)** for NEFT & RTGS.\n\nI provide instant 3-way status triangulation across **Finacle CBS**, **SFMS Switch**, and **RBI e-Kuber**. Ask me about any UTR, in-flight queue depth, or settlement account liquidity.",
      adaptiveCard: null
    }
  ])

  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, loading])

  const handleSend = async (queryText) => {
    const q = queryText || inputQuery
    if (!q.trim() || loading) return

    const userMsg = {
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: q
    }

    setChatHistory(prev => [...prev, userMsg])
    if (!queryText) setInputQuery('')
    setLoading(true)

    try {
      const res = await fetch(`${apiBase}/api/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, channel: channelMode })
      })
      const data = await res.json()

      const botMsg = {
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: data.summary,
        adaptiveCard: data.adaptive_card || null,
        record: data.record || null
      }
      setChatHistory(prev => [...prev, botMsg])
    } catch (e) {
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Error contacting Payments Copilot service: ${e.message}. Ensure backend is running.`
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const quickPrompts = [
    { label: "Instant RTGS Settlement", query: "Status of UTR RBIR20261113000101" },
    { label: "Inward Closed Acc Break", query: "Check UTR NEFT20261113000103" },
    { label: "SFMS Timeout Deemed Failure", query: "Investigate UTR RBIR20261113000104" },
    { label: "RBI e-Kuber Liquidity Float", query: "Check RBI e-Kuber balance and liquidity threshold" },
    { label: "In-Flight Queue Depths", query: "Show pending RTGS queue and NEFT batch countdown" }
  ]

  const isTeams = channelMode === 'teams'

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ── Top Header & Channel Mode Selector ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Payments Copilot Agent (UC7)
            </h2>
            <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 4, fontWeight: 700, border: '1px solid #cbd5e1' }}>
              AUTONOMY: L3 READ-ONLY
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Natural language conversational assistant for branch & operations staff. Real-time 3-way triangulation across CBS, SFMS, and RBI e-Kuber.
          </p>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: 4, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setChannelMode('teams')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: isTeams ? '#464775' : 'transparent',
              color: isTeams ? '#ffffff' : '#475569',
              transition: 'all 0.2s'
            }}
          >
            <span>Microsoft Teams Bot View</span>
          </button>
          <button
            onClick={() => setChannelMode('portal')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: !isTeams ? '#ea580c' : 'transparent',
              color: !isTeams ? '#ffffff' : '#475569',
              transition: 'all 0.2s'
            }}
          >
            <span>Bank Ops Web Portal View</span>
          </button>
        </div>
      </div>

      {/* ── Quick Prompt Chips ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', alignSelf: 'center', marginRight: 4 }}>
          Quick Demo Prompts:
        </span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p.query)}
            disabled={loading}
            style={{
              padding: '5px 12px',
              borderRadius: 16,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: isTeams ? '#464775' : '#ea580c',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = isTeams ? '#464775' : '#ea580c' }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1' }}
          >
            {p.label} &rarr;
          </button>
        ))}
      </div>

      {/* ── Main Chat Interface Container (Teams or Portal Skin) ── */}
      <div style={{
        background: isTeams ? '#f5f5f5' : '#ffffff',
        borderRadius: 12,
        border: isTeams ? '2px solid #464775' : '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        display: 'flex',
        minHeight: 640
      }}>

        {/* Teams Left Sidebar (Simulated Channel List) */}
        {isTeams && (
          <div style={{ width: 260, background: '#ebebeb', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 14px', background: '#464775', color: '#fff' }}>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Microsoft Teams</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>ABC Bank India Treasury</div>
            </div>
            <div style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#616161', textTransform: 'uppercase' }}>
              Recent Bot Chats
            </div>
            <div style={{ padding: '10px 14px', background: '#ffffff', borderLeft: '4px solid #464775', cursor: 'pointer' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#242424' }}>Payments-Ops-Copilot</div>
              <div style={{ fontSize: 11, color: '#616161' }}>Bot • RBI 3-Way Triangulation</div>
            </div>
            <div style={{ padding: '10px 14px', cursor: 'pointer', opacity: 0.7 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#242424' }}># Settlement-Liquidity-Alerts</div>
              <div style={{ fontSize: 11, color: '#616161' }}>Channel • Automated e-Kuber watch</div>
            </div>
            <div style={{ padding: '10px 14px', cursor: 'pointer', opacity: 0.7 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#242424' }}># Exception-Approvals-L2</div>
              <div style={{ fontSize: 11, color: '#616161' }}>Channel • Maker-checker queue</div>
            </div>
            <div style={{ marginTop: 'auto', padding: 14, borderTop: '1px solid #e0e0e0', background: '#f5f5f5', fontSize: 11, color: '#616161' }}>
              Signed in as: <b>abhishek.malwadkar</b> (Checker)
            </div>
          </div>
        )}

        {/* Chat Feed */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: isTeams ? '#f5f5f5' : '#ffffff' }}>
          
          {/* Channel Header Banner */}
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: isTeams ? '#ffffff' : '#fff7ed',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: isTeams ? '#242424' : '#9a3412' }}>
                {isTeams ? 'Payments-Ops-Copilot (AutomationEdge Bot)' : 'Wholesale Payments Operations Copilot'}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                Governed by AutomationEdge Security Gate • PII Redacted • Immutable Audit Trail
              </div>
            </div>
            <span style={{ fontSize: 11, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: 12, fontWeight: 700 }}>
              ONLINE • CONNECTED TO RBI e-KUBER
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '100%'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: msg.sender === 'user' ? '#0f172a' : (isTeams ? '#464775' : '#ea580c') }}>
                    {msg.sender === 'user' ? 'Operations Officer (You)' : (isTeams ? 'Payments Copilot BOT' : 'Payments Copilot Agent')}
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{msg.timestamp}</span>
                </div>

                {/* Plain Text Message */}
                <div style={{
                  maxWidth: 720,
                  padding: '12px 16px',
                  borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: msg.sender === 'user'
                    ? (isTeams ? '#464775' : '#ea580c')
                    : (isTeams ? '#ffffff' : '#f8fafc'),
                  color: msg.sender === 'user' ? '#ffffff' : '#1e293b',
                  border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  fontSize: 13,
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.text}
                </div>

                {/* Teams Adaptive Card Display (if present) */}
                {msg.adaptiveCard && (
                  <div style={{
                    marginTop: 10,
                    maxWidth: 720,
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: 16,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                        3-Leg Triangulation Evidence Card
                      </div>
                      <span style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: msg.record?.recon_status === 'MATCHED_STP' ? '#ecfdf5' : '#fef2f2',
                        color: msg.record?.recon_status === 'MATCHED_STP' ? '#15803d' : '#b91c1c'
                      }}>
                        {msg.record?.recon_status || 'ADAPTIVE CARD'}
                      </span>
                    </div>

                    {/* Facts Grid */}
                    {msg.adaptiveCard.body?.find(b => b.type === 'FactSet')?.facts && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 12, marginBottom: 12 }}>
                        {msg.adaptiveCard.body.find(b => b.type === 'FactSet').facts.map((f, fIdx) => (
                          <div key={fIdx} style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{f.title}</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{f.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Card Actions */}
                    <div style={{ display: 'flex', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                      <button
                        onClick={() => alert(`Downloading Cryptographically Signed Evidence Dossier for ${msg.record?.utr || 'transaction'}...`)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#334155',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Download Evidence Pack
                      </button>
                      {onNavigateWorkbench && (
                        <button
                          onClick={() => onNavigateWorkbench('rbi_3way')}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: 'none',
                            background: isTeams ? '#464775' : '#ea580c',
                            color: '#ffffff',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Open in 3-Way Workbench &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 12, fontStyle: 'italic' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isTeams ? '#464775' : '#ea580c', animation: 'pulse 1s infinite' }} />
                Payments Copilot is querying CBS, SFMS Switch, and RBI e-Kuber statement logs...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Box */}
          <div style={{ padding: '16px 20px', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10 }}>
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask by UTR, Account number, or natural question (e.g. 'Status of UTR RBIR20261113000101')..."
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !inputQuery.trim()}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: isTeams ? '#464775' : '#ea580c',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 13,
                cursor: loading || !inputQuery.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !inputQuery.trim() ? 0.6 : 1
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

