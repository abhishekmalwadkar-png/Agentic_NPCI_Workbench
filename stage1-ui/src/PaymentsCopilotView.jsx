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

// ── Interactive Record List Table (Matched / Breaks / Approvals) ──────────────
function RecordListTable({ records, type, onSelectUtr, onNavigateWorkbench }) {
  if (!records || !records.length) return null
  const isMatched = type === 'MATCHED_LIST'
  const isAutoRefund = type === 'AUTO_REFUND_LIST'
  const headerBg = isMatched ? '#ecfdf5' : isAutoRefund ? '#f0fdfa' : '#fef2f2'
  const headerColor = isMatched ? '#047857' : isAutoRefund ? '#0f766e' : '#b91c1c'
  const headerBorder = isMatched ? '#a7f3d0' : isAutoRefund ? '#99f6e4' : '#fecaca'

  return (
    <div style={{
      marginTop: 12,
      border: `1.5px solid ${headerBorder}`,
      borderRadius: 10,
      background: '#ffffff',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{
        padding: '10px 14px',
        background: headerBg,
        borderBottom: `1px solid ${headerBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10.5,
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: 4,
            background: isMatched ? '#047857' : isAutoRefund ? '#0f766e' : '#b91c1c',
            color: '#ffffff'
          }}>
            {isMatched ? 'MATCHED (STP)' : isAutoRefund ? 'AUTO-REFUNDED & REVERSED' : 'EXCEPTIONS & BREAKS'}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: headerColor }}>
            {records.length} Record{records.length === 1 ? '' : 's'}
          </span>
        </div>
        {onNavigateWorkbench && (
          <button
            onClick={() => onNavigateWorkbench('rbi_3way')}
            style={{
              padding: '3px 8px',
              fontSize: 11,
              borderRadius: 4,
              border: `1px solid ${headerBorder}`,
              background: '#ffffff',
              color: headerColor,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Open 3-Way Workbench &rarr;
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left', fontSize: 11 }}>
              <th style={{ padding: '8px 12px' }}>UTR</th>
              <th style={{ padding: '8px 10px' }}>Rail</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '8px 12px' }}>Parties</th>
              <th style={{ padding: '8px 10px' }}>3-Leg Status</th>
              <th style={{ padding: '8px 10px' }}>Status</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={r.utr || i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 1 ? '#fafafa' : '#ffffff' }}>
                <td style={{ padding: '8px 12px' }}>
                  <code style={{ fontSize: 11.5, fontWeight: 800, color: '#0f172a' }}>{r.utr}</code>
                </td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: r.rail === 'RTGS' ? '#eff6ff' : '#f0fdf4',
                    color: r.rail === 'RTGS' ? '#1d4ed8' : '#15803d'
                  }}>
                    {r.rail}
                  </span>
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                  {fmtInr(r.amount)}
                </td>
                <td style={{ padding: '8px 12px', fontSize: 11, color: '#475569', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <b>{r.remitter_name}</b> &rarr; {r.beneficiary_name}
                </td>
                <td style={{ padding: '8px 10px', fontSize: 10.5 }}>
                  <span style={{ color: r.cbs_status === 'DEBITED' ? '#166534' : '#b91c1c', fontWeight: 600 }}>CBS: {r.cbs_status}</span> •{' '}
                  <span style={{ color: r.sfms_status?.includes('ACK') ? '#166534' : '#b91c1c', fontWeight: 600 }}>SFMS: {r.sfms_status}</span> •{' '}
                  <span style={{ color: r.rbi_status === 'SETTLED' ? '#166534' : '#b91c1c', fontWeight: 600 }}>RBI: {r.rbi_status}</span>
                </td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: r.recon_status === 'MATCHED_STP' ? '#ecfdf5' : isAutoRefund || r.recon_status?.includes('AUTO') || r.recon_status?.includes('REVERSE') ? '#f0fdfa' : '#fef2f2',
                    color: r.recon_status === 'MATCHED_STP' ? '#047857' : isAutoRefund || r.recon_status?.includes('AUTO') || r.recon_status?.includes('REVERSE') ? '#0f766e' : '#b91c1c'
                  }}>
                    {r.recon_status === 'MATCHED_STP' ? 'STP SETTLED' : isAutoRefund || r.recon_status?.includes('AUTO') || r.recon_status?.includes('REVERSE') ? 'AUTO REFUNDED' : (r.priority || 'BREAK')}
                  </span>
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                  <button
                    onClick={() => onSelectUtr && onSelectUtr(r.utr)}
                    style={{
                      padding: '3px 8px',
                      fontSize: 10.5,
                      borderRadius: 4,
                      border: '1.5px solid #ea580c',
                      background: '#fff7ed',
                      color: '#ea580c',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#ea580c'; e.currentTarget.style.color = '#ffffff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff7ed'; e.currentTarget.style.color = '#ea580c' }}
                  >
                    Investigate &rarr;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT: PaymentsCopilotView (UC7)
// ═══════════════════════════════════════════════════════════════════════════════
const STORAGE_KEY = 'npci_copilot_chat_history_v1'

const INITIAL_WELCOME_MESSAGE = {
  sender: 'bot',
  timestamp: '11:47 AM',
  text: "Hello! I am the **Payments Copilot (UC7)** for NEFT & RTGS.\n\nI provide instant 3-way status triangulation across **Finacle CBS**, **SFMS Switch**, and **RBI e-Kuber**. Ask me about any UTR, in-flight queue depth, or settlement account liquidity.",
  record: null
}

export default function PaymentsCopilotView({ apiBase = 'http://localhost:8000', onNavigateWorkbench }) {
  const [channelMode, setChannelMode] = useState('teams') // 'teams' | 'portal'
  const [inputQuery, setInputQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const [chatHistory, setChatHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.warn('Failed to parse saved chat history from localStorage', e)
    }
    return [INITIAL_WELCOME_MESSAGE]
  })

  const chatEndRef = useRef(null)

  // Persist chat history across tab navigation and browser refreshes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory))
    } catch (e) {
      console.warn('Failed to save chat history to localStorage', e)
    }
  }, [chatHistory])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, loading])

  const handleClearHistory = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) { }
    setChatHistory([INITIAL_WELCOME_MESSAGE])
  }

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

    // Robust backend endpoint resolution with fallback
    const baseUrl = apiBase || (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:8000' : '')
    const targetUrl = `${baseUrl}/api/copilot/chat`

    // AbortController with 10-second timeout to prevent indefinite hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, channel: channelMode }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText || 'Backend server returned an error'}`)
      }

      const data = await res.json()

      const botMsg = {
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: data.summary || data.message || 'Information retrieved successfully.',
        adaptiveCard: data.adaptive_card || null,
        record: data.record || null,
        recordsList: data.records_list || null,
        recordType: data.record_type || null
      }
      setChatHistory(prev => [...prev, botMsg])
    } catch (e) {
      clearTimeout(timeoutId)
      const isTimeout = e.name === 'AbortError'
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: isTimeout
            ? "⚠️ Request timed out after 10 seconds. The banking backend service may be restarting. Please retry your inquiry."
            : `⚠️ Error contacting Payments Copilot: ${e.message}. Ensure backend is running.`
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const quickPrompts = [
    { label: "List Matched Records", query: "Give list of matched records" },
    { label: "Auto-Refunded Records", query: "Give list of auto refunded" },
    { label: "Show Open Breaks", query: "Give list of unmatched records" },
    { label: "Recon Summary", query: "What is the recon status" },
    { label: "Instant RTGS Settlement", query: "Status of UTR RBIR20261113000101" },
    { label: "Inward Closed Acc Break", query: "Check UTR NEFT20261113000103" },
    { label: "SFMS Timeout Deemed Failure", query: "Investigate UTR RBIR20261113000104" },
    { label: "RBI e-Kuber Liquidity Float", query: "Check RBI e-Kuber balance and liquidity threshold" },
    { label: "In-Flight Queue Depths", query: "Show pending RTGS queue and NEFT batch countdown" }
  ]

  const isTeams = channelMode === 'teams'

  const containerStyle = {
    width: '100%',
    height: 'calc(100vh - 65px)',
    padding: '10px 14px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, system-ui, sans-serif'
  }

  return (
    <div style={containerStyle}>

      {/* ── Top Header & Channel Mode Selector ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Payments Copilot Agent (UC7)
            </h2>
            <span style={{ fontSize: 10.5, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontWeight: 700, border: '1px solid #cbd5e1' }}>
              AUTONOMY: L3 READ-ONLY
            </span>
          </div>
          <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 12 }}>
            Natural language conversational assistant for branch &amp; operations staff. Real-time 3-way triangulation across CBS, SFMS, and RBI e-Kuber.
          </p>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: 3, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setChannelMode('teams')}
            style={{
              padding: '5px 12px',
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
              padding: '5px 12px',
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

      {/* ── Main Chat Interface Frame ── */}
      <div style={{
        background: isTeams ? '#f5f5f5' : '#ffffff',
        borderRadius: 10,
        border: isTeams ? '2px solid #464775' : '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        display: 'flex',
        flex: 1,
        minHeight: 0,
        height: '100%'
      }}>

        {/* Teams Left Sidebar — Authentic Microsoft Teams Layout */}
        {isTeams && (
          <div style={{ display: 'flex', flexDirection: 'row', height: '100%', minHeight: 0, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

            {/* ── Narrow Icon Rail (48px) — Teams nav icons ── */}
            <div style={{
              width: 48,
              background: '#292643',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: 6,
              gap: 2,
              flexShrink: 0
            }}>
              {/* Teams logo pill */}
              <div style={{ width: 36, height: 36, background: '#5558af', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M12.5 2.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM6 7h8a1 1 0 0 1 1 1v5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8a1 1 0 0 1 1-1z" fill="#fff"/>
                </svg>
              </div>
              {/* Activity icon */}
              {[
                /* Activity bell */
                <svg key="act" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2a6 6 0 0 0-6 6v2.5L2.5 12H17.5l-1.5-1.5V8a6 6 0 0 0-6-6zm0 16a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2z" fill="currentColor"/></svg>,
                /* Chat bubbles */
                <svg key="chat" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H7l-4 3V4z" fill="currentColor"/></svg>,
                /* Teams grid */
                <svg key="teams" width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="11" y="2" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="2" y="11" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="11" y="11" width="7" height="7" rx="1.5" fill="currentColor"/></svg>,
                /* Calendar */
                <svg key="cal" width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 8h16M6 2v4M14 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
                /* Files */
                <svg key="files" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 3h7l5 5v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.5"/><path d="M11 3v5h5" stroke="currentColor" strokeWidth="1.5"/></svg>
              ].map((icon, idx) => (
                <div key={idx} title={['Activity','Chat','Teams','Calendar','Files'][idx]} style={{
                  width: 36, height: 36,
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: idx === 1 ? '#fff' : 'rgba(255,255,255,0.55)',
                  background: idx === 1 ? 'rgba(255,255,255,0.15)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.12s ease'
                }}>{icon}</div>
              ))}
              {/* Avatar at bottom */}
              <div style={{ marginTop: 'auto', marginBottom: 10, width: 32, height: 32, borderRadius: '50%', background: '#6264a7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', border: '2px solid rgba(255,255,255,0.3)' }}>
                AM
              </div>
            </div>

            {/* ── Chat List Panel (260px) ── */}
            <div style={{ width: 260, background: '#fff', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              {/* Panel header */}
              <div style={{ padding: '14px 14px 8px', borderBottom: '1px solid #edebe9' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#201f1e', marginBottom: 8 }}>Chat</div>
                {/* Search box */}
                <div style={{ display: 'flex', alignItems: 'center', background: '#f3f2f1', borderRadius: 4, padding: '6px 10px', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="#605e5c" strokeWidth="1.5"/><path d="M10.5 10.5l3.5 3.5" stroke="#605e5c" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <span style={{ fontSize: 12, color: '#605e5c' }}>Search</span>
                </div>
              </div>

              {/* Chat list items */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* Active item — Payments Copilot bot */}
                <div
                  onClick={handleClearHistory}
                  title="New chat with Payments Copilot"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#edebe9', cursor: 'pointer', borderLeft: '3px solid #6264a7' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6264a7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>PC</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#201f1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Payments-Ops-Copilot</span>
                      <span style={{ fontSize: 10, color: '#605e5c', flexShrink: 0 }}>Now</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#605e5c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Bot • RBI 3-Way Triangulation</div>
                  </div>
                </div>

                {/* Channel item — Settlement Liquidity */}
                <div
                  onClick={() => handleSend("Check RBI e-Kuber balance and liquidity threshold")}
                  title="Check e-Kuber liquidity"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderLeft: '3px solid transparent', transition: 'background 0.12s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f2f1'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0078d4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>#</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#201f1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Settlement-Liquidity-Alerts</span>
                      <span style={{ fontSize: 10, color: '#605e5c', flexShrink: 0 }}>10:30</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#605e5c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Channel • Automated e-Kuber watch</div>
                  </div>
                </div>

                {/* Channel item — Exception Approvals */}
                <div
                  onClick={() => handleSend("Give list of unmatched records")}
                  title="View open reconciliation breaks"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderLeft: '3px solid transparent', transition: 'background 0.12s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f2f1'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#c43e1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>#</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#201f1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Exception-Approvals-L2</span>
                      <span style={{ fontSize: 10, color: '#605e5c', flexShrink: 0 }}>09:15</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#605e5c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Channel • Maker-checker queue</div>
                  </div>
                </div>
              </div>

              {/* Footer — signed in user */}
              <div style={{ padding: '10px 14px', borderTop: '1px solid #edebe9', display: 'flex', alignItems: 'center', gap: 8, background: '#faf9f8' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6264a7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>AM</div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#201f1e' }}>abhishek.malwadkar</div>
                  <div style={{ fontSize: 10, color: '#605e5c' }}>Checker</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Feed */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: isTeams ? '#f5f5f5' : '#ffffff', fontFamily: isTeams ? "'Segoe UI', system-ui, sans-serif" : 'inherit' }}>

          {/* Channel Header Banner — Teams style with avatar */}
          <div style={{
            padding: '10px 20px',
            borderBottom: isTeams ? '1px solid #edebe9' : '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isTeams && (
                <div style={{ position: 'relative' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6264a7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>PC</div>
                  <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: '#6bb700', border: '2px solid #fff' }} />
                </div>
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: isTeams ? '#201f1e' : '#9a3412', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isTeams ? 'Payments Copilot' : 'Wholesale Payments Operations Copilot'}
                  {isTeams && <span style={{ fontSize: 10, background: '#ebe8f8', color: '#6264a7', borderRadius: 3, padding: '1px 5px', fontWeight: 600 }}>Bot</span>}
                </div>
                <div style={{ fontSize: 11, color: isTeams ? '#605e5c' : '#64748b' }}>
                  {isTeams ? 'Governed by AutomationEdge Security Gate • PII Redacted' : 'Governed by AutomationEdge Security Gate • PII Redacted • Immutable Audit Trail'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isTeams && (
                <>
                  {/* Teams action icons — decorative */}
                  {[
                    <svg key="v" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6zm11 1.5 3-2v9l-3-2V7.5z" fill="#605e5c"/></svg>,
                    <svg key="ph" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 3h2.5l1.5 4-1.5 1.5a9 9 0 0 0 4 4L13 11l4 1.5V15a2 2 0 0 1-2 2C7.163 17 3 12.837 3 7a2 2 0 0 1 2-2v-2z" fill="#605e5c"/></svg>,
                    <svg key="more" width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="4" cy="10" r="1.5" fill="#605e5c"/><circle cx="10" cy="10" r="1.5" fill="#605e5c"/><circle cx="16" cy="10" r="1.5" fill="#605e5c"/></svg>
                  ].map((icon, idx) => (
                    <div key={idx} style={{ width: 32, height: 32, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#edebe9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >{icon}</div>
                  ))}
                </>
              )}
              <button
                onClick={handleClearHistory}
                title="Start a new chat session"
                style={{
                  padding: '5px 12px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  borderRadius: 4,
                  border: isTeams ? '1px solid #6264a7' : '1px solid #ea580c',
                  background: isTeams ? '#6264a7' : '#ea580c',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'opacity 0.15s ease'
                }}
              >
                <span>+</span> New Chat
              </button>
              <span style={{ fontSize: 11, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: 12, fontWeight: 700 }}>
                ONLINE • CONNECTED TO RBI e-KUBER
              </span>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Today date separator */}
            {isTeams && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 12px' }}>
                <div style={{ flex: 1, height: 1, background: '#edebe9' }} />
                <span style={{ fontSize: 11, color: '#605e5c', fontWeight: 600, whiteSpace: 'nowrap' }}>Today</span>
                <div style={{ flex: 1, height: 1, background: '#edebe9' }} />
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: isTeams ? 'row' : 'column',
                  alignItems: isTeams ? 'flex-start' : (msg.sender === 'user' ? 'flex-end' : 'flex-start'),
                  justifyContent: (!isTeams && msg.sender === 'user') ? 'flex-end' : 'flex-start',
                  gap: isTeams ? 10 : 0,
                  maxWidth: '100%',
                  marginBottom: isTeams ? 6 : 16,
                  flexDirection: (!isTeams && msg.sender === 'user') ? 'column' : (isTeams ? 'row' : 'column')
                }}
              >
                {/* Teams-style: avatar on the left for all messages */}
                {isTeams && (
                  <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: msg.sender === 'user' ? '#6264a7' : '#5558af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                    {msg.sender === 'user' ? 'AM' : 'PC'}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0, maxWidth: isTeams ? 'calc(100% - 42px)' : '100%' }}>
                  {/* Sender name + timestamp row */}
                  {isTeams ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#201f1e' }}>
                        {msg.sender === 'user' ? 'Operations Officer' : 'Payments Copilot'}
                      </span>
                      <span style={{ fontSize: 11, color: '#605e5c' }}>{msg.timestamp}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: msg.sender === 'user' ? '#0f172a' : '#ea580c' }}>
                        {msg.sender === 'user' ? 'Operations Officer (You)' : 'Payments Copilot Agent'}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{msg.timestamp}</span>
                    </div>
                  )}

                  {/* If this is a UTR Record, render the clean PaymentInvestigationCard */}
                  {msg.record && msg.record.utr ? (
                    <PaymentInvestigationCard
                      record={msg.record}
                      onNavigateWorkbench={onNavigateWorkbench}
                      isTeams={isTeams}
                    />
                  ) : (
                    /* Formatted Text Message for non-UTR replies */
                    <div style={{
                      maxWidth: isTeams ? '100%' : 780,
                      width: isTeams ? '100%' : '100%',
                      padding: isTeams ? '10px 14px' : '14px 18px',
                      borderRadius: isTeams ? 4 : (msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px'),
                      background: isTeams
                        ? (msg.sender === 'user' ? '#e8e8f0' : '#ffffff')
                        : (msg.sender === 'user' ? '#ea580c' : '#f8fafc'),
                      color: isTeams ? '#201f1e' : (msg.sender === 'user' ? '#ffffff' : '#1e293b'),
                      border: isTeams ? 'none' : (msg.sender === 'user' ? 'none' : '1px solid #e2e8f0'),
                      boxShadow: isTeams ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                      display: 'inline-block',
                      alignSelf: (!isTeams && msg.sender === 'user') ? 'flex-end' : 'flex-start'
                    }}>
                      <FormattedMessage text={msg.text} />

                      {/* Quick Sample Queries (Visible inside the chat on Welcome / New Chat) */}
                      {i === 0 && (
                        <div style={{
                          marginTop: 14,
                          paddingTop: 12,
                          borderTop: isTeams ? '1px solid #edebe9' : '1px solid #fed7aa'
                        }}>
                          <div style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: isTeams ? '#6264a7' : '#ea580c',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: 8
                          }}>
                            Sample Queries (Click any prompt to ask):
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {quickPrompts.map((p, pIdx) => (
                              <button
                                key={pIdx}
                                onClick={() => handleSend(p.query)}
                                style={{
                                  background: isTeams ? '#f3f2f1' : '#fff7ed',
                                  border: isTeams ? '1px solid #d2d0ce' : '1px solid #fed7aa',
                                  borderRadius: isTeams ? 4 : 99,
                                  padding: '4px 11px',
                                  fontSize: 11.5,
                                  color: isTeams ? '#201f1e' : '#9a3412',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = isTeams ? '#6264a7' : '#ea580c'
                                  e.currentTarget.style.color = isTeams ? '#6264a7' : '#ea580c'
                                  e.currentTarget.style.background = isTeams ? '#ebe8f8' : '#ffedd5'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = isTeams ? '#d2d0ce' : '#fed7aa'
                                  e.currentTarget.style.color = isTeams ? '#201f1e' : '#9a3412'
                                  e.currentTarget.style.background = isTeams ? '#f3f2f1' : '#fff7ed'
                                }}
                              >
                                <span>{p.label}</span>
                                <span style={{ fontSize: 10, opacity: 0.6 }}>&rarr;</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.recordsList && msg.recordsList.length > 0 && (
                        <RecordListTable
                          records={msg.recordsList}
                          type={msg.recordType}
                          onSelectUtr={(utr) => handleSend(`Status of UTR ${utr}`)}
                          onNavigateWorkbench={onNavigateWorkbench}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#605e5c', fontSize: 12, fontStyle: 'italic', marginLeft: isTeams ? 42 : 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isTeams ? '#6264a7' : '#ea580c', animation: 'pulse 1s infinite' }} />
                Payments Copilot is querying CBS, SFMS Switch, and RBI e-Kuber statement logs...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Compose Box — Teams style */}
          {isTeams ? (
            <div style={{ background: '#fff', borderTop: '1px solid #edebe9', padding: '8px 16px 12px' }}>
              {/* Formatting toolbar row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 6 }}>
                {[
                  { label: 'B', style: { fontWeight: 900, fontSize: 13 } },
                  { label: 'I', style: { fontStyle: 'italic', fontSize: 13 } },
                  { label: 'U', style: { textDecoration: 'underline', fontSize: 13 } }
                ].map(({ label, style }) => (
                  <div key={label} title={label} style={{ width: 28, height: 26, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#605e5c', cursor: 'pointer', fontSize: 12, ...style, transition: 'background 0.12s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f2f1'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >{label}</div>
                ))}
                <div style={{ width: 1, height: 18, background: '#edebe9', margin: '0 4px' }} />
                {/* emoji, attach, gif icons */}
                {[
                  <svg key="em" width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#605e5c" strokeWidth="1.5"/><path d="M7 13c.7 1 1.5 1.5 3 1.5s2.3-.5 3-1.5" stroke="#605e5c" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7.5" cy="8.5" r="1" fill="#605e5c"/><circle cx="12.5" cy="8.5" r="1" fill="#605e5c"/></svg>,
                  <svg key="att" width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M17 10l-7 7a5 5 0 0 1-7-7l7-7a3 3 0 0 1 4 4l-7 7a1 1 0 0 1-1-1l5-5" stroke="#605e5c" strokeWidth="1.5" strokeLinecap="round"/></svg>,
                  <svg key="gif" width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="10" rx="2" stroke="#605e5c" strokeWidth="1.5"/><text x="5" y="14" fontSize="7" fontWeight="800" fill="#605e5c">GIF</text></svg>
                ].map((icon, idx) => (
                  <div key={idx} style={{ width: 28, height: 26, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f2f1'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >{icon}</div>
                ))}
              </div>
              {/* Input row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f3f2f1', borderRadius: 4, padding: '6px 10px' }}>
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a new message"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 13,
                    color: '#201f1e',
                    fontFamily: "'Segoe UI', system-ui, sans-serif"
                  }}
                />
                {/* Like / Send */}
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !inputQuery.trim()}
                  title="Send"
                  style={{
                    width: 32, height: 32,
                    borderRadius: 4,
                    border: 'none',
                    background: loading || !inputQuery.trim() ? 'transparent' : '#6264a7',
                    color: loading || !inputQuery.trim() ? '#c8c6c4' : '#fff',
                    cursor: loading || !inputQuery.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M2 10l16-8-8 16v-8H2z" fill="currentColor"/></svg>
                </button>
              </div>
            </div>
          ) : (
            /* Portal compose box */
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
                  background: '#ea580c',
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
          )}
        </div>
      </div>
    </div>
  )
}
