import React, { useState, useEffect, useRef, useCallback } from 'react'

export default function AgenticFlowView({ onTriggerAe, reconSummary, aeState, sidebarCollapsed }) {
  const containerRef = useRef(null)
  const feedRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]
  const agentRef = useRef(null)
  const toolRefs = [useRef(null), useRef(null), useRef(null)]

  const [lines, setLines] = useState({ in: [], out: [] })
  const [simulating, setSimulating] = useState(true)
  const [activeHighlight, setActiveHighlight] = useState(null)

  // Pixel-perfect dynamic SVG line calculation
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

    // Outbound lines (Agent -> 3 Tools) - unified vibrant orange theme
    const outConfigs = [
      { color: '#ea580c', label: 'STP Matched (~99.95%)' },
      { color: '#f97316', label: 'Auto-Refund < ₹5k' },
      { color: '#c2410c', label: 'High Value / HITL' }
    ]

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
        ...outConfigs[i]
      }
    }).filter(Boolean)

    setLines({ in: inLines, out: outLines })
  }, [])

  // Auto-track during sidebar expand/collapse animation (smooth 400ms frame loop)
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

  // ResizeObserver on the container to auto-fit any screen size without glitches
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      updatePaths()
    })
    ro.observe(containerRef.current)
    window.addEventListener('resize', updatePaths)
    const t = setTimeout(updatePaths, 100)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updatePaths)
      clearTimeout(t)
    }
  }, [updatePaths])

  const stpRate = reconSummary?.stp_rate ? `${reconSummary.stp_rate}%` : '99.95%'

  return (
    <div
      ref={containerRef}
      style={{
        background: '#ffffff',
        color: '#0f172a',
        width: '100%',
        maxWidth: '100%',
        minHeight: 'calc(100vh - 84px)',
        boxSizing: 'border-box',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 8px -1px rgba(15, 23, 42, 0.04)',
        padding: '16px 20px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, sans-serif"
      }}
    >
      

      {/* TOP HEADER BAR */}
      <div style={{
        position: 'relative',
        zIndex: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: 14,
        marginBottom: 18
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: '#fff7ed',
            border: '1.5px solid #fdba74',
            borderRadius: 8,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(234, 88, 12, 0.15)',
            flexShrink: 0,
            fontSize: 18
          }}>
            🏦
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                ABC <span style={{ color: '#ea580c' }}>Bank</span>
              </span>
              <span style={{ color: '#cbd5e1', fontSize: 16 }}>|</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                UPI Reconciliation – Agentic Automation Flow
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
              End-to-End Orchestration: 4 Inbound Settlement Feeds → AI Reconciler Agent → 3 Execution Tools
            </div>
          </div>
        </div>

        {/* Top Badges & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{
            background: '#fff7ed',
            border: '1px solid #fdba74',
            borderRadius: 16,
            padding: '4px 11px',
            fontSize: 10.5,
            fontWeight: 700,
            color: '#c2410c',
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ea580c' }} />
            50,000 RECORDS / BATCH
          </div>

          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 16,
            padding: '4px 11px',
            fontSize: 10.5,
            fontWeight: 700,
            color: '#047857',
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            <span>✓</span> RBI T+1 READY
          </div>

          <div style={{
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: 16,
            padding: '4px 11px',
            fontSize: 10.5,
            fontWeight: 700,
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            <span>⚙</span> AGENTIC AI + RPA
          </div>

          <button
            onClick={() => setSimulating(s => !s)}
            style={{
              background: simulating ? '#fff7ed' : '#f8fafc',
              border: `1px solid ${simulating ? '#ea580c' : '#cbd5e1'}`,
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              color: simulating ? '#ea580c' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <span>{simulating ? '⏸' : '▶'}</span>
            {simulating ? 'Pause' : 'Stream'}
          </button>
        </div>
      </div>

      {/* DYNAMIC SVG CONNECTOR OVERLAY */}
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
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#ea580c" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* INBOUND CURVES (4 FEEDS -> AGENT) */}
        {lines.in.map(l => (
          <path
            key={l.id}
            d={l.d}
            fill="none"
            stroke={l.color}
            strokeWidth="2.4"
            strokeDasharray="6 5"
            opacity="0.9"
            filter="url(#lineGlow)"
            style={{
              animation: simulating ? 'flowDashIn 1.3s linear infinite' : 'none'
            }}
          />
        ))}

        {/* OUTBOUND CURVES (AGENT -> 3 TOOLS) - ORANGE FLOW STREAMS */}
        {lines.out.map((l) => (
          <path
            key={l.id}
            d={l.d}
            fill="none"
            stroke={l.color}
            strokeWidth="3.0"
            strokeDasharray="7 5"
            opacity="0.95"
            filter="url(#lineGlow)"
            style={{
              animation: simulating ? 'flowDashOut 1.1s linear infinite' : 'none'
            }}
          />
        ))}
      </svg>

      {/* RESPONSIVE 3-COLUMN GRID CONTAINER */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 1fr) minmax(280px, 1.3fr) minmax(240px, 1.1fr)',
        gap: 'clamp(12px, 1.8vw, 28px)',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box'
      }}>

        {/* ========================================================================= */}
        {/* COLUMN 1: 4 INBOUND SETTLEMENT FEEDS (LEFT)                               */}
        {/* ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            marginBottom: 2
          }}>
            <span>◇</span> 4 INBOUND FEEDS
          </div>

          {/* Feed 1: UPI Settlement Master */}
          <div
            ref={feedRefs[0]}
            onMouseEnter={() => setActiveHighlight('feed_npci')}
            onMouseLeave={() => setActiveHighlight(null)}
            style={{
              background: activeHighlight === 'feed_npci' ? '#ffffff' : '#f8fafc',
              border: `1px solid ${activeHighlight === 'feed_npci' ? '#ea580c' : '#e2e8f0'}`,
              borderRadius: 8,
              padding: '10px 12px',
              boxShadow: activeHighlight === 'feed_npci' ? '0 4px 14px rgba(234, 88, 12, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: '#ea580c' }}>▦</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>UPI Settlement Master</span>
              </div>
              <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>Central Rail</span>
            </div>
            <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#ea580c', fontWeight: 600, margin: '4px 0 4px' }}>
              📄 NPCI_UPI_Settlement_Master.csv
            </div>
            <div style={{ fontSize: 9.5, color: '#64748b', lineHeight: 1.35 }}>
              <strong style={{ color: '#334155' }}>Schema:</strong> RRN, TXN_ID, UTR, RAIL, CYCLE_ID, AMOUNT, STATUS
            </div>
            <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.35, marginTop: 2 }}>
              Official net clearing &amp; settlement raw record.
            </div>
          </div>

          {/* Feed 2: Payment Switch Logs */}
          <div
            ref={feedRefs[1]}
            onMouseEnter={() => setActiveHighlight('feed_switch')}
            onMouseLeave={() => setActiveHighlight(null)}
            style={{
              background: activeHighlight === 'feed_switch' ? '#ffffff' : '#f8fafc',
              border: `1px solid ${activeHighlight === 'feed_switch' ? '#d97706' : '#e2e8f0'}`,
              borderRadius: 8,
              padding: '10px 12px',
              boxShadow: activeHighlight === 'feed_switch' ? '0 4px 14px rgba(217, 119, 6, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: '#d97706' }}>⚡</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>Payment Switch Logs</span>
              </div>
              <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>Base24</span>
            </div>
            <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#ea580c', fontWeight: 600, margin: '4px 0 4px' }}>
              📄 Switch_Base24_Logs.csv
            </div>
            <div style={{ fontSize: 9.5, color: '#64748b', lineHeight: 1.35 }}>
              <strong style={{ color: '#334155' }}>Schema:</strong> RRN, SWITCH_STATUS, SWITCH_RESP_CODE
            </div>
            <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.35, marginTop: 2 }}>
              Real-time gateway authorization (00=Auth, 91=Timeout, 96=Error).
            </div>
          </div>

          {/* Feed 3: Core Banking System (CBS) */}
          <div
            ref={feedRefs[2]}
            onMouseEnter={() => setActiveHighlight('feed_cbs')}
            onMouseLeave={() => setActiveHighlight(null)}
            style={{
              background: activeHighlight === 'feed_cbs' ? '#ffffff' : '#f8fafc',
              border: `1px solid ${activeHighlight === 'feed_cbs' ? '#f59e0b' : '#e2e8f0'}`,
              borderRadius: 8,
              padding: '10px 12px',
              boxShadow: activeHighlight === 'feed_cbs' ? '0 4px 14px rgba(2, 132, 199, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: '#ea580c' }}>🏛</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>Core Banking (CBS)</span>
              </div>
              <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>Finacle</span>
            </div>
            <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#ea580c', fontWeight: 600, margin: '4px 0 4px' }}>
              📄 Finacle_CBS_Dump.csv
            </div>
            <div style={{ fontSize: 9.5, color: '#64748b', lineHeight: 1.35 }}>
              <strong style={{ color: '#334155' }}>Schema:</strong> RRN, CBS_AMOUNT, CBS_STATUS, ACCOUNT_NO
            </div>
            <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.35, marginTop: 2 }}>
              Bank customer ledger debits, account postings, debit states.
            </div>
          </div>

          {/* Feed 4: GL Suspense Pool */}
          <div
            ref={feedRefs[3]}
            onMouseEnter={() => setActiveHighlight('feed_gl')}
            onMouseLeave={() => setActiveHighlight(null)}
            style={{
              background: activeHighlight === 'feed_gl' ? '#ffffff' : '#f8fafc',
              border: `1px solid ${activeHighlight === 'feed_gl' ? '#059669' : '#e2e8f0'}`,
              borderRadius: 8,
              padding: '10px 12px',
              boxShadow: activeHighlight === 'feed_gl' ? '0 4px 14px rgba(5, 150, 105, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: '#059669' }}>📊</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>GL Suspense Pool</span>
              </div>
              <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>Ledger</span>
            </div>
            <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#ea580c', fontWeight: 600, margin: '4px 0 4px' }}>
              📄 GL_Suspense_Pool.csv
            </div>
            <div style={{ fontSize: 9.5, color: '#64748b', lineHeight: 1.35 }}>
              <strong style={{ color: '#334155' }}>Schema:</strong> RRN, GL_AMOUNT, GL_STATUS
            </div>
            <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.35, marginTop: 2 }}>
              Inter-bank settlement suspense balance (GL-14020).
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: AUTOMATIONEDGE RECONCILER AGENT (CENTER)                        */}
        {/* ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div
            ref={agentRef}
            style={{
              background: '#ffffff',
              border: '2px solid #ea580c',
              borderRadius: 16,
              padding: '18px 20px',
              boxShadow: '0 8px 30px rgba(234, 88, 12, 0.14), 0 2px 8px rgba(0, 0, 0, 0.04)',
              width: '100%',
              maxWidth: 380,
              textAlign: 'center',
              position: 'relative',
              boxSizing: 'border-box'
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
              animation: simulating ? 'aeAgentPulse 3s infinite ease-in-out' : 'none',
              pointerEvents: 'none'
            }} />

            {/* Glowing Logo Icon (Orange Theme) */}
            <div style={{
              width: 58,
              height: 58,
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
                style={{ width: 34, height: 34 }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </div>

            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
              AI Reconciler Agent
            </div>
            <div style={{ fontSize: 11.5, color: '#ea580c', fontWeight: 700, marginTop: 1 }}>
              Workflow: "UPI Reconciliation Engine"
            </div>
            <div style={{
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: '#64748b',
              margin: '4px 0 14px',
              textTransform: 'uppercase'
            }}>
              Autonomous Orchestration &amp; 4-Way Matching Core
            </div>

            
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: 3 AUTOMATED EXECUTION TOOLS (RIGHT) - ORANGE THEME ONLY   */}
        {/* ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
            <span>3 AUTOMATED EXECUTION TOOLS</span>
          </div>

          {/* Tool 1: GL Knock-Off (Orange Theme) */}
          <div
            ref={toolRefs[0]}
            onMouseEnter={() => setActiveHighlight('tool_gl')}
            onMouseLeave={() => setActiveHighlight(null)}
            style={{
              background: activeHighlight === 'tool_gl' ? '#fffbf5' : '#ffffff',
              border: `1.5px solid ${activeHighlight === 'tool_gl' ? '#ea580c' : '#fed7aa'}`,
              borderRadius: 10,
              padding: '12px 14px',
              boxShadow: activeHighlight === 'tool_gl' ? '0 6px 18px rgba(234, 88, 12, 0.16)' : '0 2px 8px rgba(234, 88, 12, 0.08)',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
          >
            {/* Embedded Connector Trigger Pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: '#fff7ed',
              border: '1px solid #fdba74',
              borderRadius: 12,
              padding: '2px 8px',
              fontSize: 9.5,
              fontWeight: 800,
              color: '#c2410c',
              marginBottom: 6
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ea580c' }} />
              Trigger: STP Matched ({stpRate})
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
              <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                Zero-Delta GL Knock-Off
              </div>
            </div>

            <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#ea580c', fontWeight: 600, margin: '4px 0 6px' }}>
              AE Workflow: UPI_ZeroDelta_GL_KnockOff.psw
            </div>
            <div style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.35, marginBottom: 6 }}>
              Automated ledger accounting workflow that balances suspense GL accounts for matched transactions.
            </div>
            <div style={{ fontSize: 10, color: '#334155', lineHeight: 1.4 }}>
              <div><strong style={{ color: '#ea580c' }}>✓ Action:</strong> Posts zero-delta balancing entry between GL-14020 &amp; GL-11010</div>
              <div><strong style={{ color: '#ea580c' }}>✓ Result:</strong> ₹0.00 ledger variance &amp; instant settlement closure</div>
            </div>
          </div>

          {/* Tool 2: CBS Auto-Refund Execution (Orange Theme) */}
          <div
            ref={toolRefs[1]}
            onMouseEnter={() => setActiveHighlight('tool_cbs')}
            onMouseLeave={() => setActiveHighlight(null)}
            style={{
              background: activeHighlight === 'tool_cbs' ? '#fffbf5' : '#ffffff',
              border: `1.5px solid ${activeHighlight === 'tool_cbs' ? '#ea580c' : '#fed7aa'}`,
              borderRadius: 10,
              padding: '12px 14px',
              boxShadow: activeHighlight === 'tool_cbs' ? '0 6px 18px rgba(234, 88, 12, 0.16)' : '0 2px 8px rgba(234, 88, 12, 0.08)',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
          >
            {/* Embedded Connector Trigger Pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: '#fff7ed',
              border: '1px solid #fdba74',
              borderRadius: 12,
              padding: '2px 8px',
              fontSize: 9.5,
              fontWeight: 800,
              color: '#c2410c',
              marginBottom: 6
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ea580c' }} />
              Trigger: Auto-Refund &lt; ₹5,000 (Deemed Fails)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
              <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                CBS Auto-Refund Execution
              </div>
            </div>

            <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#ea580c', fontWeight: 600, margin: '4px 0 6px' }}>
              AE Workflow: UPI_CBS_Execution_Bot.psw
            </div>
            <div style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.35, marginBottom: 6 }}>
              Automated refund workflow executing instant account reversals for deemed failure timeouts under ₹5,000.
            </div>
            <div style={{ fontSize: 10, color: '#334155', lineHeight: 1.4 }}>
              <div><strong style={{ color: '#ea580c' }}>✓ Action:</strong> Calls Finacle CBS reversal API &amp; credits customer account</div>
              <div><strong style={{ color: '#ea580c' }}>✓ Result:</strong> 100% compliance with RBI T+1 TAT circular (stops penalty clock)</div>
            </div>
          </div>

          {/* Tool 3: AI Exception & HITL Dispatcher (Orange Theme) */}
          <div
            ref={toolRefs[2]}
            onMouseEnter={() => setActiveHighlight('tool_dispatcher')}
            onMouseLeave={() => setActiveHighlight(null)}
            style={{
              background: activeHighlight === 'tool_dispatcher' ? '#fffbf5' : '#ffffff',
              border: `1.5px solid ${activeHighlight === 'tool_dispatcher' ? '#ea580c' : '#fed7aa'}`,
              borderRadius: 10,
              padding: '12px 14px',
              boxShadow: activeHighlight === 'tool_dispatcher' ? '0 6px 18px rgba(234, 88, 12, 0.16)' : '0 2px 8px rgba(234, 88, 12, 0.08)',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
          >
            {/* Embedded Connector Trigger Pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: '#fff7ed',
              border: '1px solid #fdba74',
              borderRadius: 12,
              padding: '2px 8px',
              fontSize: 9.5,
              fontWeight: 800,
              color: '#c2410c',
              marginBottom: 6
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ea580c' }} />
              Trigger: High Value (&gt;₹10k) / Mismatches
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
              <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                AI Exception &amp; HITL Dispatcher
              </div>
            </div>

            <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#ea580c', fontWeight: 600, margin: '4px 0 6px' }}>
              AE Workflow: UPI_AI_DualTrack_Dispatcher.psw
            </div>
            <div style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.35, marginBottom: 6 }}>
              Agentic AI packager compiling multi-system evidence dossiers for Operations Manager Cockpit.
            </div>
            <div style={{ fontSize: 10, color: '#334155', lineHeight: 1.4 }}>
              <div><strong style={{ color: '#ea580c' }}>✓ Action:</strong> Correlates Switch &amp; CBS logs with 94% AI confidence score</div>
              <div><strong style={{ color: '#ea580c' }}>✓ Result:</strong> 1-click maker-checker sign-off with cryptographic audit seal</div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM FOOTER BAR */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        marginTop: 18,
        paddingTop: 12,
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        fontSize: 10.5,
        color: '#64748b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ea580c' }} />
            <span>Protocol: <strong style={{ color: '#0f172a' }}>AE Server REST Engine (POST /aeengine/rest/execute)</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ea580c' }} />
            <span>Pattern: <strong style={{ color: '#0f172a' }}>Agent-to-Tools (Agentic Orchestrator → Execution Workflows)</strong></span>
          </div>
        </div>

        <div>
          Enterprise Solutions Consulting • Banking Operations Architecture
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
