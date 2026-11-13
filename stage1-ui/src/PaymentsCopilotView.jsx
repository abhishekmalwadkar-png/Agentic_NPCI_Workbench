import React, { useState, useRef, useEffect } from 'react'

// ── Currency Formatter ────────────────────────────────────────────────────────
const fmtInr = (n) => '₹ ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Clean Inline Markdown Parser ──────────────────────────────────────────────
function renderInline(str) {
  if (!str) return null
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  const splits = str.split(regex)
  return splits.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#0f172a', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} style={{
          background: '#f1f5f9',
          color: '#0f172a',
          padding: '2px 6px',
          borderRadius: 4,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11.5px',
          fontWeight: 600,
          border: '1px solid #e2e8f0'
        }}>
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

// ── Formatted Text Block (for non-record messages) ─────────────────────────────
function FormattedMessage({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, lineHeight: 1.6 }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={idx} style={{ height: 4 }} />
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          const content = trimmed.substring(2)
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingLeft: 4 }}>
              <span style={{ color: '#ea580c', fontWeight: 800, marginTop: -1 }}>•</span>
              <div style={{ flex: 1 }}>{renderInline(content)}</div>
            </div>
          )
        }
        return <div key={idx}>{renderInline(trimmed)}</div>
      })}
    </div>
  )
}

// ── High-Clarity Payment Investigation Card (UC7 3-Leg Dossier) ───────────────
function PaymentInvestigationCard({ record, onNavigateWorkbench, isTeams }) {
  if (!record || !record.utr) return null

  const isMatched = record.recon_status === 'MATCHED_STP'
  const isHold = (record.recon_status || '').includes('HOLD') || (record.recon_status || '').includes('CHECKER')
  const statusBadgeBg = isMatched ? '#ecfdf5' : isHold ? '#fffbeb' : '#fef2f2'
  const statusBadgeColor = isMatched ? '#047857' : isHold ? '#b45309' : '#b91c1c'
  const statusBadgeBorder = isMatched ? '#a7f3d0' : isHold ? '#fde68a' : '#fecaca'

  const statusLabel = isMatched
    ? 'SETTLED (3-WAY MATCH STP)'
    : record.recon_status === 'BREAK_SWITCH_TIMEOUT'
    ? 'BREAK: SFMS NETWORK TIMEOUT'
    : record.recon_status === 'BREAK_BENEFICIARY_REJECT'
    ? 'BREAK: BENEFICIARY ACCOUNT CLOSED'
    : record.recon_status === 'PRE_SUBMISSION_CHECK_PASS'
    ? 'HELD: L2 CHECKER APPROVAL REQUIRED'
    : (record.recon_status || 'EXCEPTION BREAK')

  return (
    <div style={{
      maxWidth: 780,
      width: '100%',
      background: '#ffffff',
      borderRadius: 12,
      border: isTeams ? '1.5px solid #cbd5e1' : '1.5px solid #e2e8f0',
      boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      marginTop: 6
    }}>
      {/* 1. Header Banner */}
      <div style={{
        padding: '16px 20px',
        background: isMatched ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : isHold ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
        borderBottom: `1px solid ${statusBadgeBorder}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              background: record.rail === 'RTGS' ? '#1e3a8a' : '#047857',
              color: '#ffffff',
              fontSize: 10.5,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 4,
              letterSpacing: '0.4px'
            }}>
              {record.rail}
            </span>
            <code style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#0f172a',
              background: '#ffffff',
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid #cbd5e1'
            }}>
              {record.utr}
            </code>
            <span style={{ fontSize: 11, color: '#64748b' }}>RRN: <b>{record.rrn}</b></span>
          </div>
          <div style={{ fontSize: 12, color: '#475569' }}>
            <span>Remitter: <b>{record.remitter_name}</b> ({record.remitter_acc})</span>
            <span style={{ margin: '0 6px', color: '#94a3b8' }}>&rarr;</span>
            <span>Beneficiary: <b>{record.beneficiary_name}</b> ({record.beneficiary_bank})</span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 19, fontWeight: 900, color: '#0f172a' }}>
            {fmtInr(record.amount)}
          </div>
          <div style={{
            display: 'inline-block',
            marginTop: 4,
            padding: '3px 10px',
            borderRadius: 6,
            background: statusBadgeBg,
            color: statusBadgeColor,
            border: `1px solid ${statusBadgeBorder}`,
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.3px'
          }}>
            {statusLabel}
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 20px' }}>
        {/* 2. 3-Leg Settlement Triangulation Comparison */}
        <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          3-Leg Settlement Triangulation
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 12,
          marginBottom: 16
        }}>
          {/* Leg 1: Finacle CBS */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 12,
            borderTop: (record.cbs_status === 'DEBITED' || record.cbs_status === 'POSTED') ? '3px solid #16a34a' : '3px solid #ea580c'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#0f172a' }}>1. Finacle CBS</span>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 4,
                background: (record.cbs_status === 'DEBITED' || record.cbs_status === 'POSTED') ? '#dcfce7' : '#fef2f2',
                color: (record.cbs_status === 'DEBITED' || record.cbs_status === 'POSTED') ? '#15803d' : '#b91c1c'
              }}>
                {record.cbs_status}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.4 }}>
              <div>GL Leg: <b>{record.cbs_gl_leg}</b></div>
              <div>Txn Ref: <code>{record.cbs_txn_id}</code></div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 3 }}>{record.cbs_timestamp}</div>
            </div>
          </div>

          {/* Leg 2: SFMS Messaging Switch */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 12,
            borderTop: (record.sfms_status === 'INWARD_RECEIVED' || record.sfms_status === 'DELIVERED_ACK') ? '3px solid #16a34a' : (record.sfms_status || '').includes('TIMEOUT') ? '3px solid #dc2626' : '3px solid #f59e0b'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#0f172a' }}>2. SFMS Switch</span>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 4,
                background: (record.sfms_status === 'INWARD_RECEIVED' || record.sfms_status === 'DELIVERED_ACK') ? '#dcfce7' : '#fee2e2',
                color: (record.sfms_status === 'INWARD_RECEIVED' || record.sfms_status === 'DELIVERED_ACK') ? '#15803d' : '#991b1b'
              }}>
                {record.sfms_status}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.4 }}>
              <div>Message: <b>{record.sfms_msg_type}</b></div>
              <div>Msg ID: <code>{record.sfms_msg_id}</code></div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 3 }}>{record.sfms_timestamp}</div>
            </div>
          </div>

          {/* Leg 3: RBI e-Kuber Node */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 12,
            borderTop: record.rbi_status === 'SETTLED' ? '3px solid #16a34a' : '3px solid #94a3b8'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#0f172a' }}>3. RBI e-Kuber</span>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 4,
                background: record.rbi_status === 'SETTLED' ? '#dcfce7' : '#f1f5f9',
                color: record.rbi_status === 'SETTLED' ? '#15803d' : '#64748b'
              }}>
                {record.rbi_status}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.4 }}>
              <div>Voucher: <code>{record.rbi_voucher_no}</code></div>
              <div>Settled: <b>{record.rbi_settled_amount > 0 ? fmtInr(record.rbi_settled_amount) : 'INR 0.00'}</b></div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 3 }}>{record.rbi_timestamp}</div>
            </div>
          </div>
        </div>

        {/* 3. Root-Cause Diagnostic Callout */}
        <div style={{
          background: isMatched ? '#f0fdf4' : isHold ? '#fffbeb' : '#fef2f2',
          border: `1px solid ${statusBadgeBorder}`,
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 14
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: statusBadgeColor, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>
            AI Root-Cause Diagnostic
          </div>
          <div style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.5 }}>
            {record.root_cause}
          </div>
        </div>

        {/* 4. Regulatory TAT & SLA Metrics Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 14
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Regulatory SLA</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
              RBI DPSS Mandate (2h TAT)
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Elapsed Time</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#ea580c', marginTop: 2 }}>
              {record.sla_elapsed_min} minutes
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Breach Deadline</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: (record.sla_status || '').includes('RISK') ? '#dc2626' : '#0f172a', marginTop: 2 }}>
              {record.tat_deadline}
            </div>
          </div>
        </div>

        {/* 5. Proposed Next Action & Direct Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          paddingTop: 10,
          borderTop: '1px solid #f1f5f9'
        }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Recommended Resolution Action:
            </div>
            <div style={{ fontSize: 12, color: '#334155', fontWeight: 600, marginTop: 2 }}>
              {record.proposed_action}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => alert(`Downloading Cryptographically Signed Evidence Dossier for UTR ${record.utr}...`)}
              style={{
                padding: '7px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Download Audit Pack
            </button>
            {onNavigateWorkbench && (
              <button
                onClick={() => onNavigateWorkbench('rbi_3way')}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: isTeams ? '#464775' : '#ea580c',
                  color: '#ffffff',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                Open in 3-Way Workbench &rarr;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT: PaymentsCopilotView (UC7)
// ═══════════════════════════════════════════════════════════════════════════════
export default function PaymentsCopilotView({ apiBase = 'http://localhost:8000', onNavigateWorkbench }) {
  const [channelMode, setChannelMode] = useState('teams') // 'teams' | 'portal'
  const [inputQuery, setInputQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: "Hello! I am the **Payments Copilot (UC7)** for NEFT & RTGS.\n\nI provide instant 3-way status triangulation across **Finacle CBS**, **SFMS Switch**, and **RBI e-Kuber**. Ask me about any UTR, in-flight queue depth, or settlement account liquidity.",
      record: null
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
            Natural language conversational assistant for branch &amp; operations staff. Real-time 3-way triangulation across CBS, SFMS, and RBI e-Kuber.
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
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              background: isTeams ? '#464775' : 'transparent',
              color: isTeams ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease'
            }}
          >
            Microsoft Teams Bot View
          </button>
          <button
            onClick={() => setChannelMode('portal')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              background: !isTeams ? '#ea580c' : 'transparent',
              color: !isTeams ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease'
            }}
          >
            Bank Ops Web Portal View
          </button>
        </div>
      </div>

      {/* ── Quick Demo Prompt Chips ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
          Sample Queries:
        </span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p.query)}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 99,
              padding: '5px 12px',
              fontSize: 12,
              color: '#334155',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = isTeams ? '#464775' : '#ea580c'; e.currentTarget.style.color = isTeams ? '#464775' : '#ea580c' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155' }}
          >
            <span>{p.label}</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>&rarr;</span>
          </button>
        ))}
      </div>

      {/* ── Main Chat Interface Frame ── */}
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

                {/* If this is a UTR Record, render the clean PaymentInvestigationCard */}
                {msg.record && msg.record.utr ? (
                  <PaymentInvestigationCard
                    record={msg.record}
                    onNavigateWorkbench={onNavigateWorkbench}
                    isTeams={isTeams}
                  />
                ) : (
                  /* Formatted Text Message for non-UTR replies (Welcome, Liquidity, Queues, Help) */
                  <div style={{
                    maxWidth: 720,
                    padding: '14px 18px',
                    borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: msg.sender === 'user'
                      ? (isTeams ? '#464775' : '#ea580c')
                      : (isTeams ? '#ffffff' : '#f8fafc'),
                    color: msg.sender === 'user' ? '#ffffff' : '#1e293b',
                    border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                  }}>
                    <FormattedMessage text={msg.text} />
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
              placeholder="Ask by UTR, Account number, or natural question (e.g. 'Status of UTR RBIR20261113000104')..."
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
