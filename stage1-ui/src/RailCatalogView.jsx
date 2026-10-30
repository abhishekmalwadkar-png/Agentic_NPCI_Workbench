import React, { useState, useEffect } from 'react'

const API = 'http://localhost:8000'

// Professional SVG Vector Icons for each payment rail
function RailSvgIcon({ code, color = '#0284c7' }) {
  const props = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }
  switch (code) {
    case 'UPI':
      return <svg {...props}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
    case 'IMPS':
      return <svg {...props}><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
    case 'NACH':
      return <svg {...props}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
    case 'AEPS':
      return <svg {...props}><path d="M12 11c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4z" /><path d="M18 21a6 6 0 0 0-12 0" /><circle cx="18" cy="8" r="3" /><path d="M22 21a4 4 0 0 0-7-2.7" /></svg>
    case 'RUPAY':
      return <svg {...props}><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
    case 'CTS':
      return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
    case 'BBPS':
      return <svg {...props}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="16" y2="11" /><line x1="8" y1="15" x2="13" y2="15" /></svg>
    case 'NETC':
      return <svg {...props}><rect x="3" y="11" width="18" height="9" rx="2" /><path d="M5 11l2-6h10l2 6" /><circle cx="7.5" cy="16.5" r="1.5" /><circle cx="16.5" cy="16.5" r="1.5" /></svg>
    default:
      return <svg {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
  }
}

export default function RailCatalogView({
  onLaunchWorkflow,
  onOpenRailOps,
  onStartRailTrial,
  selectedRailCode,
  reconData,
  reconBreaks,
  reconMatched,
  recoverySummary,
  onOpenRecon,
  onOpenHitl
}) {
  const [catalogs, setCatalogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [selectedRail, setSelectedRail] = useState(null)

  // Trial execution state
  const [trialRunning, setTrialRunning] = useState(false)
  const [trialResult, setTrialResult] = useState(null)
  const [trialRailCode, setTrialRailCode] = useState(null)

  const fetchCatalogs = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API}/api/rail-catalog/all`)
      const data = await res.json()
      setCatalogs(data.catalogs || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCatalogs()
  }, [])

  // Run automated trial for a rail: Launch dedicated Rail Upload & Ingestion Sandbox
  const handleTryNow = async (rail) => {
    if (onStartRailTrial) {
      onStartRailTrial(rail.rail_code, rail.name)
    }
    try {
      fetch(`${API}/api/rail-catalog/try-now?rail_code=${rail.rail_code}`, { method: 'POST' }).catch(() => {})
    } catch (e) {
      console.error(e)
    }
  }

  // Toggle subscription access
  const handleToggleSubscribe = async (rail) => {
    const newStatus = rail.subscription_status === 'SUBSCRIBED' ? 'TRIAL_AVAILABLE' : 'SUBSCRIBED'
    try {
      const res = await fetch(`${API}/api/rail-catalog/subscribe?rail_code=${rail.rail_code}&status=${newStatus}`, {
        method: 'POST'
      })
      const data = await res.json()
      if (data.status === 'SUCCESS') {
        fetchCatalogs()
      }
    } catch (e) {
      alert(`Error updating subscription: ` + e.message)
    }
  }

  const filteredCatalogs = catalogs.filter(c => {
    if (activeCategory === 'ALL') return true
    return c.category === activeCategory
  })

  return (
    <div>
      {/* ── 1. Hero Catalog Banner with Light Orange Shade (White to Orange) ── */}
      <div className="page-header" style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 45%, #fed7aa 100%)',
        border: '1px solid #fdba74',
        color: '#0f172a',
        padding: '24px 28px',
        borderRadius: 14,
        marginBottom: 20,
        boxShadow: '0 4px 20px rgba(234, 88, 12, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.3px', color: '#0f172a' }}>
              NPCI Payment Rail Solution Catalog
            </span>
            <span style={{
              background: '#ffedd5',
              border: '1px solid #ea580c',
              color: '#c2410c',
              fontSize: 11,
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: 99
            }}>
              8 Modular Rail Suites
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#334155', marginTop: 6, maxWidth: 840, lineHeight: 1.5 }}>
            Each NPCI rail has its own dedicated automation suite. Select any rail catalog to subscribe, and click <b style={{ color: '#0f172a' }}>Try Now</b> to test automated clearing, 4-way reconciliation, and Finacle reversals.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            title={`Active Subscriptions: ${catalogs.filter(c => c.subscription_status === 'SUBSCRIBED').length} of ${catalogs.length || 8} Rails Subscribed`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#ffffff',
              border: '1px solid #fed7aa',
              padding: '6px 12px',
              borderRadius: 20,
              boxShadow: '0 2px 6px rgba(234, 88, 12, 0.08)',
              cursor: 'default'
            }}
          >
            <div style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#ffedd5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ea580c'
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#c2410c' }}>
              {catalogs.filter(c => c.subscription_status === 'SUBSCRIBED').length}/{catalogs.length || 8} Active
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Category Filter Bar ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Filter Rail Domain:</span>
          {[
            { id: 'ALL', label: 'All 8 Rails' },
            { id: 'Instant & Mobile', label: 'Instant & Mobile (UPI, IMPS)' },
            { id: 'Bulk & Mandates', label: 'Bulk & Mandates (NACH, CTS)' },
            { id: 'Cards & Biometrics', label: 'Cards & Biometrics (RuPay, AePS)' },
            { id: 'Utility & Transit', label: 'Utility & Transit (BBPS, NETC)' },
          ].map(cat => (
            <button
              key={cat.id}
              className={`filter-tab ${activeCategory === cat.id ? 'active' : ''}`}
              style={{ fontSize: 11.5, padding: '5px 12px' }}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Showing <b>{filteredCatalogs.length}</b> Rail Solution Suites
        </span>
      </div>

      {/* ── 3. Rail Solution Catalog Grid ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: 18,
        marginBottom: 24
      }}>
        {filteredCatalogs.map(rail => {
          const isSubscribed = rail.subscription_status === 'SUBSCRIBED'
          const isRunningThis = trialRunning && trialRailCode === rail.rail_code

          return (
            <div
              key={rail.rail_code}
              className="card catalog-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1.5px solid #e2e8f0',
                borderRadius: 16,
                padding: '22px 24px 18px',
                position: 'relative',
                background: '#ffffff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}
            >
              {/* Card Top: Big Favicon Icon + Name & Subtitle + Status Badge */}
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Big Square Favicon Icon Container (Matching Reference Design) */}
                    <div className="catalog-icon-box" style={{
                      width: 58,
                      height: 58,
                      borderRadius: 14,
                      background: '#ffffff',
                      border: '1.5px solid #fed7aa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 14px rgba(234, 88, 12, 0.12)',
                      padding: 8,
                      flexShrink: 0
                    }}>
                      <img
                        src="/favicon.svg"
                        alt="AutomationEdge"
                        style={{ width: 40, height: 40, objectFit: 'contain' }}
                      />
                    </div>

                    {/* Catalog Suite Name & Creator/Meta */}
                    <div
                      style={{ cursor: 'pointer' }}
                      onClick={() => onOpenRailOps && onOpenRailOps(rail.rail_code)}
                      title={`Click to view ${rail.name} Operations`}
                    >
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', lineHeight: 1.25 }}>
                        {rail.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>&copy; 2026 AutomationEdge</span>
                        <span>&bull;</span>
                        <span style={{ color: '#ea580c', fontWeight: 700 }}>{rail.rail_code}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`badge ${isSubscribed ? 'badge-green' : 'badge-amber'}`}
                    style={{
                      fontSize: 10.5,
                      padding: '4px 9px',
                      letterSpacing: '0.3px',
                      fontWeight: 700,
                      borderRadius: 99,
                      flexShrink: 0
                    }}
                  >
                    {isSubscribed ? 'SUBSCRIBED' : 'TRIAL AVAILABLE'}
                  </span>
                </div>

                {/* Description Body Text */}
                <div style={{
                  fontSize: 13,
                  color: '#475569',
                  lineHeight: 1.55,
                  margin: '16px 0 14px',
                  minHeight: 40
                }}>
                  {rail.tagline}
                </div>

                {/* Modern Pill Tags (Domain, STP Rate, SLA standard, Tasks) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 6,
                    background: '#fff7ed',
                    color: '#c2410c',
                    border: '1px solid #ffedd5'
                  }}>
                    {rail.category}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 6,
                    background: '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #dcfce7'
                  }}>
                    95.2% STP
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 6,
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #dbeafe'
                  }}>
                    RBI T+1 SLA
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: '#f8fafc',
                    color: '#64748b',
                    border: '1px solid #e2e8f0'
                  }}>
                    +{rail.automated_tasks?.length || 5} tasks
                  </span>
                </div>

                {/* Dedicated Live UPI Reconciliation & GL Settlement Panel */}
                {rail.rail_code === 'UPI' && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px solid #fed7aa',
                    borderRadius: 12,
                    padding: '12px 14px',
                    marginBottom: 16,
                    boxShadow: '0 2px 8px rgba(234, 88, 12, 0.06)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>
                          AE Workflow: NPCI Demo UPI Reconn
                        </span>
                      </div>
                      <span style={{
                        background: '#dcfce7',
                        border: '1px solid #86efac',
                        color: '#15803d',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 99,
                        letterSpacing: '0.3px'
                      }}>
                        Message : UPI Recon Completed
                      </span>
                    </div>

                    {/* Metric Counters */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, marginBottom: 10 }}>
                      <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: 8, padding: '7px 10px' }}>
                        <div style={{ color: '#15803d', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase' }}>STP MATCHED &amp; CLOSED</div>
                        <div style={{ fontWeight: 900, color: '#16a34a', fontSize: 13, marginTop: 2 }}>
                          {reconData?.matched_count || 1} Record (₹{(reconData?.matched_amount || 840.04).toLocaleString()})
                        </div>
                        <div style={{ color: '#059669', fontSize: 9.5, marginTop: 2, fontWeight: 600 }}>Zero-Delta GL Knocked-off Balanced</div>
                      </div>

                      <div style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: 8, padding: '7px 10px' }}>
                        <div style={{ color: '#c2410c', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase' }}>AI BREAKS (DUAL-TRACK)</div>
                        <div style={{ fontWeight: 900, color: '#ea580c', fontSize: 13, marginTop: 2 }}>
                          {reconData?.break_count || 4} Breaks (₹{(reconData?.break_amount || 7700).toLocaleString()})
                        </div>
                        <div style={{ color: '#b45309', fontSize: 9.5, marginTop: 2, fontWeight: 600 }}>
                          3 Auto-Refunded | 1 HITL Cockpit
                        </div>
                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {onOpenRecon && (
                        <button
                          onClick={() => onOpenRecon()}
                          style={{
                            flex: 1,
                            background: '#ffffff',
                            border: '1px solid #ea580c',
                            color: '#ea580c',
                            borderRadius: 6,
                            padding: '6px 8px',
                            fontSize: 10.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                        >
                          View 4-Way Recon &rarr;
                        </button>
                      )}
                      {onOpenHitl && (
                        <button
                          onClick={() => onOpenHitl()}
                          style={{
                            flex: 1,
                            background: '#fff7ed',
                            border: '1px solid #fed7aa',
                            color: '#9a3412',
                            borderRadius: 6,
                            padding: '6px 8px',
                            fontSize: 10.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                        >
                          HITL Cockpit (1) &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Action Area: Preserving Try Now & Subscribe buttons */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {/* TRY NOW BUTTON - UI Theme Orange without emojis */}
                  <button
                    className="btn btn-primary"
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      padding: '9px 12px',
                      background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                      borderColor: '#ea580c',
                      color: '#ffffff',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(234, 88, 12, 0.35)',
                      borderRadius: 8
                    }}
                    disabled={isRunningThis}
                    onClick={() => handleTryNow(rail)}
                  >
                    {isRunningThis ? 'Running...' : 'Try Now'}
                  </button>

                  {/* SUBSCRIBE / TOGGLE ACCESS BUTTON - UI Theme without emojis */}
                  <button
                    className="btn btn-secondary"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '9px 10px',
                      justifyContent: 'center',
                      background: isSubscribed ? '#f8fafc' : '#ffffff',
                      color: isSubscribed ? '#64748b' : '#ea580c',
                      borderColor: isSubscribed ? '#e2e8f0' : '#ea580c',
                      boxShadow: isSubscribed ? 'none' : '0 1px 3px rgba(234, 88, 12, 0.1)',
                      borderRadius: 8
                    }}
                    onClick={() => handleToggleSubscribe(rail)}
                  >
                    {isSubscribed ? 'Subscribed' : 'Subscribe'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 4A. Real-Time Execution Loading Overlay ─────────────────────── */}
      {trialRunning && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 460, textAlign: 'center', padding: '36px 28px' }}>
            <div style={{
              width: 48,
              height: 48,
              border: '3.5px solid #e2e8f0',
              borderTop: '3.5px solid #0284c7',
              borderRadius: '50%',
              margin: '0 auto 18px',
              animation: 'spin 0.75s linear infinite'
            }} />
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              Executing Automated {trialRailCode} Pipeline...
            </div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
              Ingesting settlement cycle files &bull; Cross-matching 4 legs &bull; AI exception diagnosis &bull; Finacle CBS reversals &bull; Sealing SHA-256 audit pack
            </div>
          </div>
        </div>
      )}

      {/* ── 4B. Trial Execution Results Modal ──────────────────────────────── */}
      {trialResult && (
        <div className="modal-overlay" onClick={() => setTrialResult(null)}>
          <div className="modal-box" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#166534' }}>
                    Live Automation Trial Result: {trialResult.rail_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#15803d' }}>
                    Executed in {trialResult.execution_duration_ms}ms &bull; {trialResult.trial_timestamp}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setTrialResult(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: 22 }}>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 14,
                marginBottom: 16
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                  {trialResult.message}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  All 6 stages (SFTP Ingestion &rarr; 4-Way Match &rarr; AI Diagnostics &rarr; CBS Auto-Reversal &rarr; Cryptographic MIS) executed automatically.
                </div>
              </div>

              {/* KPI Results Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 600 }}>Records Ingested &amp; Validated</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', marginTop: 2 }}>
                    {trialResult.results?.records_ingested?.toLocaleString('en-IN')} txns
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>4-Way STP Match Rate</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#15803d', marginTop: 2 }}>
                    {trialResult.results?.stp_match_rate} ({trialResult.results?.matched_stp_count?.toLocaleString('en-IN')} STP)
                  </div>
                </div>

                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>Exceptions Auto-Resolved</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#b45309', marginTop: 2 }}>
                    {trialResult.results?.exceptions_auto_resolved?.toLocaleString('en-IN')} of {trialResult.results?.exceptions_detected}
                  </div>
                </div>

                <div style={{ background: '#fdf4ff', border: '1px solid #f5d0fe', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#86198f', fontWeight: 600 }}>Financial Amounts Recovered</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#a21caf', marginTop: 2 }}>
                    ₹ {Number(trialResult.results?.total_financial_recovered_inr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Cryptographic Proof */}
              <div style={{ background: '#0f172a', color: '#e2e8f0', borderRadius: 6, padding: '10px 14px', fontFamily: 'JetBrains Mono', fontSize: 11, marginBottom: 16 }}>
                <span style={{ color: '#38bdf8' }}>Cryptographic Proof:</span> {trialResult.results?.cryptographic_trial_seal}<br/>
                <span style={{ color: '#4ade80' }}>RBI DPSS Compliance:</span> {trialResult.results?.rbi_tat_compliance}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setTrialResult(null)}>
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', borderColor: '#ea580c' }}
                  onClick={() => {
                    const code = trialResult.rail_code
                    setTrialResult(null)
                    if (onOpenRailOps) onOpenRailOps(code)
                  }}
                >
                  Open {trialResult.rail_code} Operations View &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
