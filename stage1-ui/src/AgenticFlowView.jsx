import React, { useState, useEffect, useRef, useCallback } from 'react'

// ── 1. UNIFIED INBOUND SETTLEMENT FEEDS (4 FEEDS SPANNING ALL 8 RAILS) ────────
export const UNIFIED_FEEDS = [
  {
    id: 'feed_0',
    name: 'NPCI Settlement Master File',
    tag: 'Central Rail',
    file: 'NPCI_Settlement_Master.csv',
    schema: 'RRN, TXN_ID, UTR, RAIL, CYCLE_ID, AMOUNT, STATUS',
    desc: 'Unified net settlement & clearing feed spanning all 8 NPCI payment rails & cut-offs.'
  },
  {
    id: 'feed_1',
    name: 'Payment Switch Gateway Logs',
    tag: 'Base24 / Gateway',
    file: 'Switch_Gateway_Logs.csv',
    schema: 'RRN, SWITCH_STATUS, SWITCH_RESP_CODE, RAIL_TYPE',
    desc: 'Real-time multi-protocol gateway authorization switch logs (ISO-8583 / EPX / Coupler).'
  },
  {
    id: 'feed_2',
    name: 'Core Banking System (CBS)',
    tag: 'Finacle Host',
    file: 'Finacle_CBS_Dump.csv',
    schema: 'RRN, CBS_AMOUNT, CBS_STATUS, ACCOUNT_NO',
    desc: 'Bank customer ledger debit entries, account postings, and balance adjustments.'
  },
  {
    id: 'feed_3',
    name: 'General Ledger Suspense Pool',
    tag: 'GL Accounts',
    file: 'GL_Suspense_Pool.csv',
    schema: 'RRN, GL_AMOUNT, GL_STATUS, RAIL_POOL_ID',
    desc: 'Inter-bank settlement suspense balance & clearing mirror ledgers (GL-14020, GL-9901..9908).'
  }
]

// ── 2. CENTRAL AGENT DEFINITION (NO WORKFLOW NAME) ────────────────────────────
export const UNIFIED_AGENT = {
  name: 'AI Reconciler & Dispatcher Agent',
  desc: 'AUTONOMOUS MULTI-RAIL ORCHESTRATION & 4-WAY MATCHING CORE',
  sla: 'RBI T+1 Mandate (Circular DPSS.CO.PD No.629)',
  stats: '8 Rails Unified • 4-Way Ingest • Sub-Second Dual-Track Dispatch'
}

// ── 3. 8 AUTOMATED EXECUTION TOOLS (ONE PER NPCI PAYMENT RAIL) ────────────────
// Clean, simple cards with AE Logo + Rail Name (e.g., UPI, IMPS, NACH, etc.)
export const UNIFIED_8_TOOLS = [
  { id: 'tool_0', name: 'UPI', type: 'Execution Tool' },
  { id: 'tool_1', name: 'IMPS', type: 'Execution Tool' },
  { id: 'tool_2', name: 'NACH', type: 'Execution Tool' },
  { id: 'tool_3', name: 'AePS', type: 'Execution Tool' },
  { id: 'tool_4', name: 'RuPay', type: 'Execution Tool' },
  { id: 'tool_5', name: 'CTS', type: 'Execution Tool' },
  { id: 'tool_6', name: 'BBPS', type: 'Execution Tool' },
  { id: 'tool_7', name: 'NETC', type: 'Execution Tool' }
]

export default function AgenticFlowView({
  onTriggerAe,
  reconSummary,
  aeState,
  sidebarCollapsed
}) {
  const containerRef = useRef(null)
  const feedRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]
  const agentRef = useRef(null)
  const toolRefs = [
    useRef(null), useRef(null), useRef(null), useRef(null),
    useRef(null), useRef(null), useRef(null), useRef(null)
  ]

  const [lines, setLines] = useState({ in: [], out: [] })
  const [activeHighlight, setActiveHighlight] = useState(null)
  const [simStage, setSimStage] = useState('IDLE') // IDLE | INGESTING | MATCHING | DISPATCHING | COMPLETE

  // Pixel-perfect dynamic SVG line calculation connecting 4 Feeds -> Agent -> 8 Tools
  const updatePaths = useCallback(() => {
    if (!containerRef.current || !agentRef.current) return
    const cRect = containerRef.current.getBoundingClientRect()
    const aRect = agentRef.current.getBoundingClientRect()

    const agentLeft = {
      x: aRect.left - cRect.left,
      y: aRect.top - cRect.top + aRect.height / 2
    }
    const agentRight = {
      x: aRect.right - cRect.left,
      y: aRect.top - cRect.top + aRect.height / 2
    }

    // Inbound lines (4 Feeds -> Agent)
    const inColors = ['#ea580c', '#d97706', '#f59e0b', '#059669']
    const inLines = feedRefs.map((r, i) => {
      if (!r.current) return null
      const rect = r.current.getBoundingClientRect()
      const start = {
        x: rect.right - cRect.left,
        y: rect.top - cRect.top + rect.height / 2
      }
      const dx = agentLeft.x - start.x
      const c1 = start.x + dx * 0.45
      const c2 = agentLeft.x - dx * 0.35
      return {
        id: `in_${i}`,
        d: `M ${start.x} ${start.y} C ${c1} ${start.y}, ${c2} ${agentLeft.y}, ${agentLeft.x} ${agentLeft.y}`,
        color: inColors[i]
      }
    }).filter(Boolean)

    // Outbound lines (Agent -> 8 Tools)
    const outLines = toolRefs.map((r, i) => {
      if (!r.current) return null
      const rect = r.current.getBoundingClientRect()
      const end = {
        x: rect.left - cRect.left,
        y: rect.top - cRect.top + rect.height / 2
      }
      const dx = end.x - agentRight.x
      const c1 = agentRight.x + dx * 0.35
      const c2 = end.x - dx * 0.45
      return {
        id: `out_${i}`,
        d: `M ${agentRight.x} ${agentRight.y} C ${c1} ${agentRight.y}, ${c2} ${end.y}, ${end.x} ${end.y}`,
        color: '#ea580c'
      }
    }).filter(Boolean)

    setLines({ in: inLines, out: outLines })
  }, [])

  // Auto-track during sidebar expand/collapse
  useEffect(() => {
    let start = performance.now()
    let frameId
    const step = (now) => {
      updatePaths()
      if (now - start < 450) {
        frameId = requestAnimationFrame(step)
      }
    }
    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [sidebarCollapsed, updatePaths])

  // ResizeObserver on the container to auto-fit any screen size
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      updatePaths()
    })
    ro.observe(containerRef.current)
    const timer = setTimeout(updatePaths, 100)
    return () => {
      ro.disconnect()
      clearTimeout(timer)
    }
  }, [updatePaths])

  // Simulation runner
  const runLiveSimulationDemo = () => {
    if (simStage !== 'IDLE') return
    setSimStage('INGESTING')
    setTimeout(() => {
      setSimStage('MATCHING')
      setTimeout(() => {
        setSimStage('DISPATCHING')
        setTimeout(() => {
          setSimStage('COMPLETE')
          setTimeout(() => {
            setSimStage('IDLE')
          }, 3500)
        }, 1600)
      }, 1600)
    }, 1400)
  }

  return (
    <div
      ref={containerRef}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: '16px 20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, sans-serif"
      }}
    >
      {/* ── 1. TOP HEADER BAR ────────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        zIndex: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: 12,
        marginBottom: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Multi-Rail Reconciliation & Autonomous Execution Architecture
            </div>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 99,
              background: '#fff7ed',
              color: '#ea580c',
              border: '1px solid #fdba74',
              letterSpacing: '0.4px',
              textTransform: 'uppercase'
            }}>
              8 Rails Unified
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 99,
              background: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              letterSpacing: '0.4px',
              textTransform: 'uppercase'
            }}>
              Autonomous STP
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
            4 Inbound Settlement Feeds &bull; Central AI Reconciler &amp; Dispatcher Agent &bull; 8 Dedicated Rail Execution Tools
          </div>
        </div>

        {/* Action Controls: Live Simulation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={runLiveSimulationDemo}
            disabled={simStage !== 'IDLE'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              background: simStage !== 'IDLE' ? '#fff7ed' : '#ffffff',
              color: '#ea580c',
              border: '1.5px solid #ea580c',
              cursor: simStage !== 'IDLE' ? 'wait' : 'pointer',
              boxShadow: '0 2px 6px rgba(234, 88, 12, 0.12)',
              transition: 'all 0.2s ease'
            }}
          >
            <span>{simStage !== 'IDLE' ? '■' : '▶'}</span>
            {simStage === 'IDLE' && 'Simulate Multi-Rail Flow'}
            {simStage === 'INGESTING' && 'Step 1: Ingesting 4 Multi-Rail Feeds...'}
            {simStage === 'MATCHING' && 'Step 2: AI 4-Way Matching Core...'}
            {simStage === 'DISPATCHING' && 'Step 3: Triggering 8 Rail Tools...'}
            {simStage === 'COMPLETE' && '✓ 8 Rail Tools Dispatched & Reconciled!'}
          </button>
        </div>
      </div>

      {/* ── 2. DYNAMIC SVG CURVES LAYER ──────────────────────────────────── */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        <defs>
          <linearGradient id="multiRailInGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fdba74" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="multiRailOutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Inbound Lines (4 Feeds -> Agent) */}
        {lines.in.map((line, i) => {
          const isHl = activeHighlight === `feed_${i}` || activeHighlight === 'agent'
          const isIngesting = simStage === 'INGESTING'
          return (
            <g key={line.id}>
              {/* Glow background */}
              <path
                d={line.d}
                fill="none"
                stroke={line.color}
                strokeWidth={isHl || isIngesting ? 5 : 2}
                strokeOpacity={isHl || isIngesting ? 0.35 : 0.12}
                strokeLinecap="round"
              />
              {/* Dynamic animated path */}
              <path
                d={line.d}
                fill="none"
                stroke={isHl || isIngesting ? '#ea580c' : line.color}
                strokeWidth={isHl || isIngesting ? 2.5 : 1.75}
                strokeDasharray="6 4"
                style={{
                  animation: 'flowDashIn 1.2s linear infinite',
                  transition: 'stroke 0.2s, stroke-width 0.2s'
                }}
              />
            </g>
          )
        })}

        {/* Outbound Lines (Agent -> 8 Tools) */}
        {lines.out.map((line, i) => {
          const isHl = activeHighlight === `tool_${i}` || activeHighlight === 'agent'
          const isDispatching = simStage === 'DISPATCHING'
          return (
            <g key={line.id}>
              {/* Glow background */}
              <path
                d={line.d}
                fill="none"
                stroke="#ea580c"
                strokeWidth={isHl || isDispatching ? 4.5 : 1.75}
                strokeOpacity={isHl || isDispatching ? 0.35 : 0.12}
                strokeLinecap="round"
              />
              {/* Dynamic animated path */}
              <path
                d={line.d}
                fill="none"
                stroke="#ea580c"
                strokeWidth={isHl || isDispatching ? 2.5 : 1.75}
                strokeDasharray="7 5"
                style={{
                  animation: 'flowDashOut 1.4s linear infinite',
                  transition: 'stroke 0.2s, stroke-width 0.2s'
                }}
              />
            </g>
          )
        })}
      </svg>

      {/* ── 3. THREE-COLUMN ARCHITECTURE GRID ────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'grid',
          gridTemplateColumns: 'minmax(270px, 1.05fr) minmax(290px, 1.1fr) minmax(330px, 1.35fr)',
          gap: 28,
          alignItems: 'center'
        }}
      >
        {/* ── COLUMN 1: 4 INBOUND SETTLEMENT LEGS (LEFT) ──────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 2
          }}>
            <span>◇</span> 4 INBOUND SETTLEMENT LEGS (ALL 8 RAILS)
          </div>

          {UNIFIED_FEEDS.map((feed, idx) => {
            const isHl = activeHighlight === `feed_${idx}`
            return (
              <div
                key={feed.id}
                ref={feedRefs[idx]}
                onMouseEnter={() => setActiveHighlight(`feed_${idx}`)}
                onMouseLeave={() => setActiveHighlight(null)}
                style={{
                  background: isHl ? '#ffffff' : '#f8fafc',
                  border: `1.5px solid ${isHl ? '#ea580c' : '#e2e8f0'}`,
                  borderRadius: 8,
                  padding: '9px 12px',
                  boxShadow: isHl ? '0 4px 14px rgba(234, 88, 12, 0.18)' : '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease',
                  transform: isHl ? 'scale(1.02)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>{feed.name}</span>
                  <span style={{
                    fontSize: 9.5,
                    padding: '2px 7px',
                    borderRadius: 4,
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: '#475569',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {feed.tag}
                  </span>
                </div>
                <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#ea580c', fontWeight: 600, margin: '3px 0 3px' }}>
                  {feed.file}
                </div>
                <div style={{ fontSize: 9.5, color: '#64748b', lineHeight: 1.35 }}>
                  <strong style={{ color: '#334155' }}>Schema:</strong> {feed.schema}
                </div>
                <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.35, marginTop: 2 }}>
                  {feed.desc}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── COLUMN 2: AUTOMATIONEDGE RECONCILER AGENT (CENTER) ──────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div
            ref={agentRef}
            onMouseEnter={() => setActiveHighlight('agent')}
            onMouseLeave={() => setActiveHighlight(null)}
            style={{
              background: '#ffffff',
              border: `2px solid ${activeHighlight === 'agent' ? '#c2410c' : '#ea580c'}`,
              borderRadius: 16,
              padding: '20px 22px',
              boxShadow: activeHighlight === 'agent'
                ? '0 12px 35px rgba(234, 88, 12, 0.25), 0 2px 8px rgba(0, 0, 0, 0.04)'
                : '0 8px 30px rgba(234, 88, 12, 0.14), 0 2px 8px rgba(0, 0, 0, 0.04)',
              width: '100%',
              maxWidth: 360,
              textAlign: 'center',
              position: 'relative',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease',
              transform: activeHighlight === 'agent' ? 'scale(1.02)' : 'none'
            }}
          >
            {/* Pulsing halo ring */}
            <div style={{
              position: 'absolute',
              top: -6,
              left: -6,
              right: -6,
              bottom: -6,
              borderRadius: 20,
              border: '2px solid rgba(234, 88, 12, 0.25)',
              animation: 'aeAgentPulse 3s infinite ease-in-out',
              pointerEvents: 'none'
            }} />

            {/* Glowing Logo Icon (Orange Theme) */}
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: '#fff7ed',
              border: '2px solid #ea580c',
              margin: '0 auto 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(234, 88, 12, 0.2)'
            }}>
              <img
                src="/favicon.svg"
                alt="AE"
                style={{ width: 32, height: 32 }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </div>

            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
              {UNIFIED_AGENT.name}
            </div>
            <div style={{
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: '#ea580c',
              margin: '4px 0 10px',
              textTransform: 'uppercase'
            }}>
              {UNIFIED_AGENT.desc}
            </div>

            {/* Regulatory SLA Badge */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 10,
              color: '#334155',
              lineHeight: 1.35,
              marginBottom: 8
            }}>
              <strong style={{ color: '#ea580c' }}>SLA Standard:</strong> {UNIFIED_AGENT.sla}
            </div>

            <div style={{
              fontSize: 9.5,
              color: '#64748b',
              fontWeight: 600,
              borderTop: '1px dashed #e2e8f0',
              paddingTop: 8
            }}>
              {UNIFIED_AGENT.stats}
            </div>
          </div>
        </div>

        {/* ── COLUMN 3: 8 AUTOMATED EXECUTION TOOLS (RIGHT) ────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 2
          }}>
            <img src="/favicon.svg" alt="AE" style={{ width: 14, height: 14 }} />
            <span>8 AUTOMATED EXECUTION TOOLS (ALL 8 RAILS)</span>
          </div>

          {UNIFIED_8_TOOLS.map((tool, idx) => {
            const isHl = activeHighlight === `tool_${idx}`
            return (
              <div
                key={tool.id}
                ref={toolRefs[idx]}
                onMouseEnter={() => setActiveHighlight(`tool_${idx}`)}
                onMouseLeave={() => setActiveHighlight(null)}
                style={{
                  background: isHl ? '#fffbf5' : '#ffffff',
                  border: `1.5px solid ${isHl ? '#ea580c' : '#fed7aa'}`,
                  borderRadius: 8,
                  padding: '8px 14px',
                  boxShadow: isHl ? '0 4px 14px rgba(234, 88, 12, 0.18)' : '0 1px 4px rgba(234, 88, 12, 0.05)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  transform: isHl ? 'scale(1.02)' : 'none',
                  cursor: 'default'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: '#fff7ed',
                    border: '1px solid #fdba74',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(234, 88, 12, 0.12)',
                    flexShrink: 0
                  }}>
                    <img src="/favicon.svg" alt="AE" style={{ width: 16, height: 16 }} />
                  </div>
                  <div style={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '0.02em'
                  }}>
                    {tool.name}
                  </div>
                </div>

                <span style={{
                  fontSize: 9,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: '#fff7ed',
                  border: '1px solid #fdba74',
                  color: '#ea580c',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  flexShrink: 0
                }}>
                  {tool.type}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes aeAgentPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.02); opacity: 0.7; box-shadow: 0 0 20px rgba(234, 88, 12, 0.25); }
        }
        @keyframes flowDashIn {
          from { stroke-dashoffset: 22; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes flowDashOut {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -24; }
        }
      `}</style>
    </div>
  )
}
