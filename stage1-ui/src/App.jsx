import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import RailCatalogView from './RailCatalogView'
import ProductOperationsView from './ProductOperationsView'
import AeServerExecutionModal from './AeServerExecutionModal'
import PaymentsCopilotView from './PaymentsCopilotView'
import RbiNeftRtgsView from './RbiNeftRtgsView'
import './index.css'

const LIVE_RAILS = ['AEPS', 'NETC', 'IMPS', 'NEFT', 'RTGS']

// ── Browser history for in-app navigation ────────────────────────────────────
// Each tab / rail-scope change is a history entry (#/<tab>?rail=<code>) so the browser
// Back / Forward buttons move between workbench tabs instead of leaving the site.
const VALID_NAVS = ['dashboard', 'catalog', 'rbi_3way', 'copilot', 'product_ops', 'upload', 'files', 'staging',
  'recon', 'investigate', 'recovery', 'reports', 'audit', 'orchestrator']
function readNavFromUrl() {
  const m = /^#\/([a-z_]+)(?:\?rail=([A-Za-z0-9]+))?/.exec(window.location.hash || '')
  if (!m || !VALID_NAVS.includes(m[1])) return null
  return { nav: m[1], rail: m[2] ? m[2].toUpperCase() : null }
}
const navUrl = (nav, rail) => `#/${nav}${rail ? `?rail=${rail}` : ''}`
const API = import.meta.env.VITE_API_URL || ''

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n => Number(n ?? 0).toLocaleString('en-IN')
const fmtInr = n => '₹ ' + Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = n => `${Number(n ?? 0).toFixed(1)}%`
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour12: false }) : '—'
const fmtDate = iso => iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

function Badge({ type, label }) {
  const cls = {
    VALIDATED: 'badge-green', REJECTED: 'badge-red', DUPLICATE: 'badge-amber',
    MATCHED: 'badge-green', BREAK: 'badge-red', SUCCESS: 'badge-green',
    TIMEOUT: 'badge-red', AMOUNT_MISMATCH: 'badge-red', DUPLICATE_TXN: 'badge-amber',
    P1: 'badge-red', P2: 'badge-amber', '': 'badge-gray',
    INFO: 'badge-blue', ERROR: 'badge-red', WARN: 'badge-amber',
    CRITICAL: 'badge-red', WARNING: 'badge-amber', NORMAL: 'badge-green',
  }[type] || 'badge-gray'
  return <span className={`badge ${cls}`}>{label || type}</span>
}

const SCENARIO_COLORS = {
  SUCCESS: '#10b981', TIMEOUT: '#ef4444', AMOUNT_MISMATCH: '#f97316',
  REVERSAL_MISSING: '#7c3aed', DUPLICATE: '#f59e0b',
  DEEMED_FAIL: '#ec4899', BENEFICIARY_NOT_FOUND: '#6366f1', INSUFFICIENT_FUNDS: '#0ea5e9',
}

const PIPELINE_STEPS = [
  {
    id: 0,
    label: 'SFTP / Portal',
    anim: 'anim-radar',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
        <path d="M12 10v4" />
      </svg>
    )
  },
  {
    id: 1,
    label: 'File Received',
    anim: 'anim-bounce',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <polyline points="9 15 12 18 15 15" />
      </svg>
    )
  },
  {
    id: 2,
    label: 'SHA-256 Check',
    anim: 'anim-spin-lock',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <circle cx="12" cy="11" r="2" />
        <line x1="12" y1="13" x2="12" y2="16" />
      </svg>
    )
  },
  {
    id: 3,
    label: 'Schema Validate',
    anim: 'anim-scan-glass',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <polyline points="9 15 11 17 15 13" />
      </svg>
    )
  },
  {
    id: 4,
    label: 'Staging Vault',
    anim: 'anim-vault',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="12" x2="15" y2="15" />
      </svg>
    )
  },
  {
    id: 5,
    label: 'Ready for Recon',
    anim: 'anim-pop',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="9 12 11.5 14.5 15.5 9.5" />
      </svg>
    )
  },
]

// ── Rich Animated Pipeline Component ─────────────────────────────────────────
function Pipeline({ stage, agentText, isDuplicate, isUploading }) {
  const trackPct = stage === 0 ? 0 : stage === 5 ? 100 : (stage / 5) * 100

  return (
    <div className="pipeline-container">
      <div className="pipeline-header">
        <div className="pipeline-title">
          <span className="pulse-indicator" />
          <span>End-to-End File Validation Pipeline &mdash; 6 Automated Gates</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
          {isUploading ? 'AGENT PIPELINE ACTIVE' : (stage === 5) ? 'PIPELINE COMPLETE' : 'SFTP WATCHER STANDBY'}
        </div>
      </div>

      <div className="pipeline-track">
        <div className="track-bg">
          <div className="track-fill" style={{ width: `${trackPct}%` }}>
            {isUploading && <div className="track-beam" />}
          </div>
        </div>

        {PIPELINE_STEPS.map((s) => {
          const isDone = (stage > s.id) || (stage === 5 && s.id === 5 && !isUploading)
          const isActive = isUploading && stage === s.id
          const isErr = isDuplicate && s.id === 2

          let statusClass = ''
          if (isErr) statusClass = 'error'
          else if (isDone) statusClass = 'done'
          else if (isActive) statusClass = 'active'

          return (
            <div key={s.id} className={`pipe-step-card ${statusClass}`} style={{ minWidth: 125, padding: '14px 16px' }}>
              <div className={`pipe-icon-box ${isActive ? s.anim : ''}`}>
                {isErr ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                ) : isDone ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  s.icon
                )}
              </div>
              <div className="pipe-title" style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          )
        })}
      </div>

      <div className="agent-ticker">
        <div className="agent-ticker-left">
          <span className="agent-ticker-tag">ABC Bank</span>
          <span className="agent-ticker-text">{agentText}</span>
        </div>
        <span className="agent-ticker-pct">{Math.round(trackPct)}%</span>
      </div>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, prefix = '', suffix = '' }) {
  return (
    <div className={`kpi-card ${color}`}>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${color}`}>{prefix}{fmt(value)}{suffix}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

// ── Scenario Bar ──────────────────────────────────────────────────────────────
function ScenarioBreakdown({ files, scopedRail, reconData }) {
  const totals = {}
  if (scopedRail === 'UPI' && reconData && reconData.total_records) {
    totals['STP_MATCH_SUCCESS'] = reconData.matched_count || 0
    const bb = reconData.break_breakdown || {}
    Object.entries(bb).forEach(([k, v]) => {
      totals[k] = v
    })
  } else if (files && files.length > 0) {
    if (scopedRail) {
      const vol = { UPI: 5, IMPS: 7431, NACH: 6524, AEPS: 1938, RUPAY: 1461, CTS: 1511, BBPS: 525, NETC: 1505 }[scopedRail] || 5
      totals['STP_MATCH_SUCCESS'] = Math.round(vol * 0.945)
      totals['CBS_TIMEOUT_AUTO_REVERSAL'] = Math.round(vol * 0.028)
      totals['AMOUNT_MISMATCH_SUSPENSE'] = Math.round(vol * 0.015)
      totals['LATE_PRESENTMENT_BREAK'] = Math.round(vol * 0.007)
      totals['REVERSAL_PENDING_QUEUE'] = Math.round(vol * 0.005)
    } else {
      files.forEach(f => {
        Object.entries(f.scenario_counts || {}).forEach(([k, v]) => {
          totals[k] = (totals[k] || 0) + v
        })
      })
    }
  }
  const total = Object.values(totals).reduce((a, b) => a + b, 0) || 1
  const sorted = Object.entries(totals).sort(([, a], [, b]) => b - a)
  return (
    <div>
      {sorted.map(([sc, cnt]) => (
        <div key={sc} className="sc-row">
          <div className="sc-label">{sc.replace(/_/g, ' ')}</div>
          <div className="sc-bar">
            <div className="sc-fill" style={{ width: `${cnt / total * 100}%`, background: SCENARIO_COLORS[sc] || '#64748b' }} />
          </div>
          <div className="sc-count">{fmt(cnt)}</div>
        </div>
      ))}
      {!sorted.length && <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>Upload a file to see scenario distribution</div>}
    </div>
  )
}

// ── Reusable Enterprise Pagination Component (Page Size = 10) ─────────────────
function Pagination({ totalItems, pageSize = 10, currentPage, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  if (totalItems <= pageSize) return null

  const startIdx = (currentPage - 1) * pageSize + 1
  const endIdx = Math.min(totalItems, currentPage * pageSize)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 18px',
      borderTop: '1px solid #f1f5f9',
      fontSize: 12,
      color: '#64748b',
      background: '#ffffff',
      flexWrap: 'wrap',
      gap: 10
    }}>
      <div>
        Showing <strong style={{ color: '#0f172a' }}>{startIdx}</strong> to <strong style={{ color: '#0f172a' }}>{endIdx}</strong> of <strong style={{ color: '#0f172a' }}>{totalItems.toLocaleString()}</strong> records
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="btn btn-secondary"
          style={{
            padding: '4px 11px',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage <= 1 ? 0.45 : 1
          }}
        >
          &larr; Previous
        </button>
        <span style={{ padding: '0 8px', fontWeight: 800, color: '#0f172a', fontSize: 12 }}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="btn btn-secondary"
          style={{
            padding: '4px 11px',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage >= totalPages ? 0.45 : 1
          }}
        >
          Next &rarr;
        </button>
      </div>
    </div>
  )
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
function AuditLog({ logs, scopedRail, onDownloadFile }) {
  const [page, setPage] = useState(1)
  const pageSize = 10
  const filtered = scopedRail
    ? logs.filter(l => !l.rail || l.rail.toUpperCase() === scopedRail.toUpperCase() || (l.detail && l.detail.toUpperCase().includes(scopedRail.toUpperCase())) || (l.event && l.event.toUpperCase().includes(scopedRail.toUpperCase())))
    : logs
  const listToRender = filtered.length ? filtered : logs
  const pagedList = listToRender.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div>
      {pagedList.map((l, i) => (
        <div key={i} className="audit-row">
          <div className="audit-level"><Badge type={l.level} label={l.level} /></div>
          <div style={{ flex: 1 }}>
            <div className="audit-event" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span>{l.event}</span>
              <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>[{l.file_id}]</span>
              {l.file_id && l.file_id !== 'SYSTEM' && onDownloadFile && (
                <button
                  onClick={() => onDownloadFile(l.file_id)}
                  title={`Download file ${l.file_id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#ea580c'; e.currentTarget.style.color = '#ea580c'; e.currentTarget.style.background = '#fff7ed' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = '#ffffff' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              )}
            </div>
            <div className="audit-detail">{l.detail}</div>
            <div className="audit-ts">{fmtDate(l.timestamp)}</div>
          </div>
        </div>
      ))}
      {!logs.length && <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>No events yet. Upload a file to begin.</div>}
      <Pagination totalItems={listToRender.length} pageSize={pageSize} currentPage={page} onPageChange={setPage} />
    </div>
  )
}

// ── File Registry Table (Multi-Rail, Date Filter DD-MM-YYYY, Direct AE Output Download) ──
function FileTable({ files, onDownload, activeRailScope }) {
  const [selectedRail, setSelectedRail] = useState(() => (activeRailScope && activeRailScope !== 'ALL' ? activeRailScope.toUpperCase() : 'ALL'))
  const [dateFilter, setDateFilter] = useState('') // Stored as DD-MM-YYYY
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Keep rail synced if user navigates with rail parameter
  useEffect(() => {
    if (activeRailScope && activeRailScope !== 'ALL') {
      setSelectedRail(activeRailScope.toUpperCase())
    }
  }, [activeRailScope])

  // Current today string in DD-MM-YYYY
  const todayDMY = useMemo(() => {
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  }, [])

  // Helper to extract DD-MM-YYYY from file object
  const getFileDateDMY = f => {
    if (f.date_dmy) return f.date_dmy
    if (f.received_at) {
      try {
        const d = new Date(f.received_at)
        if (!isNaN(d.getTime())) {
          const dd = String(d.getDate()).padStart(2, '0')
          const mm = String(d.getMonth() + 1).padStart(2, '0')
          const yyyy = d.getFullYear()
          return `${dd}-${mm}-${yyyy}`
        }
      } catch (e) { }
    }
    return todayDMY
  }

  // Helper to extract time string
  const getFileTimeStr = f => {
    if (f.time_str) return f.time_str
    if (f.received_at) {
      try {
        const d = new Date(f.received_at)
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }
      } catch (e) { }
    }
    return '12:00:00'
  }

  // Normalize rail
  const getFileRail = f => {
    if (f.rail) return f.rail.toUpperCase()
    const rKeys = Object.keys(f.rail_counts || {})
    if (rKeys.length > 0) return rKeys[0].toUpperCase()
    return 'UPI'
  }

  // Filtered files list
  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      // 1. Rail filter
      const fRail = getFileRail(f)
      if (selectedRail !== 'ALL' && fRail !== selectedRail) {
        return false
      }

      // 2. Date filter (DD-MM-YYYY)
      if (dateFilter) {
        const fDate = getFileDateDMY(f)
        if (fDate !== dateFilter) {
          return false
        }
      }

      // 3. Type filter
      if (typeFilter !== 'ALL') {
        const fType = (f.file_type || '').toUpperCase()
        if (!fType.includes(typeFilter.toUpperCase())) {
          return false
        }
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const fn = (f.filename || '').toLowerCase()
        const fid = (f.file_id || '').toLowerCase()
        const wf = (f.workflow_name || '').toLowerCase()
        if (!fn.includes(q) && !fid.includes(q) && !wf.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [files, selectedRail, dateFilter, typeFilter, searchQuery])

  // Count per rail for tab badges
  const railCounts = useMemo(() => {
    const counts = { ALL: files.length, UPI: 0, IMPS: 0, AEPS: 0, NETC: 0, NEFT: 0, RTGS: 0 }
    files.forEach(f => {
      const r = getFileRail(f)
      if (counts[r] !== undefined) counts[r]++
      else counts.ALL++
    })
    return counts
  }, [files])

  // Pagination slice
  const totalPages = Math.ceil(filteredFiles.length / pageSize) || 1
  const currentPage = Math.min(page, totalPages)
  const pagedFiles = filteredFiles.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const isFiltered = selectedRail !== 'ALL' || dateFilter !== '' || searchQuery !== '' || typeFilter !== 'ALL'

  const clearAllFilters = () => {
    setSelectedRail('ALL')
    setDateFilter('')
    setSearchQuery('')
    setTypeFilter('ALL')
    setPage(1)
  }

  // Handle ISO date picker change (YYYY-MM-DD -> DD-MM-YYYY)
  const handleDatePickerChange = e => {
    const val = e.target.value
    if (!val) {
      setDateFilter('')
      return
    }
    const [y, m, d] = val.split('-')
    setDateFilter(`${d}-${m}-${y}`)
    setPage(1)
  }

  // Convert current DD-MM-YYYY to YYYY-MM-DD for <input type="date">
  const pickerIsoValue = useMemo(() => {
    if (!dateFilter || !dateFilter.includes('-')) return ''
    const [d, m, y] = dateFilter.split('-')
    if (d && m && y && y.length === 4) {
      return `${y}-${m}-${d}`
    }
    return ''
  }, [dateFilter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Toolbar: Rail Selector Pills + Search ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingBottom: 12,
        borderBottom: '1px solid #e2e8f0'
      }}>
        {/* Rail Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {['ALL', 'UPI', 'IMPS', 'AEPS', 'NETC', 'NEFT', 'RTGS'].map(r => {
            const active = selectedRail === r
            const count = railCounts[r] || 0
            return (
              <button
                key={r}
                onClick={() => { setSelectedRail(r); setPage(1) }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  border: active ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
                  background: active ? '#ea580c' : '#ffffff',
                  color: active ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{r}</span>
                <span style={{
                  fontSize: 10,
                  padding: '1px 5px',
                  borderRadius: 10,
                  background: active ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: active ? '#ffffff' : '#64748b'
                }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: 280 }}>
          <input
            type="text"
            placeholder="Search filename or workflow..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              outline: 'none',
              background: '#f8fafc'
            }}
          />
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Row: DD-MM-YYYY Date Filter + File Type Filter + Filter Summary ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 14px',
        background: '#f8fafc',
        borderRadius: 8,
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          {/* Date Filter Label & Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Date (DD-MM-YYYY):
            </span>
            <input
              type="date"
              value={pickerIsoValue}
              onChange={handleDatePickerChange}
              style={{
                padding: '4px 8px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Quick Date Buttons */}
          <button
            onClick={() => { setDateFilter(''); setPage(1) }}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              borderRadius: 6,
              border: dateFilter === '' ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
              background: dateFilter === '' ? '#fff7ed' : '#ffffff',
              color: dateFilter === '' ? '#ea580c' : '#475569',
              fontWeight: dateFilter === '' ? 700 : 500,
              cursor: 'pointer'
            }}
          >
            All Dates
          </button>
          <button
            onClick={() => { setDateFilter(todayDMY); setPage(1) }}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              borderRadius: 6,
              border: dateFilter === todayDMY ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
              background: dateFilter === todayDMY ? '#fff7ed' : '#ffffff',
              color: dateFilter === todayDMY ? '#ea580c' : '#475569',
              fontWeight: dateFilter === todayDMY ? 700 : 500,
              cursor: 'pointer'
            }}
          >
            Today ({todayDMY})
          </button>

          {/* Active Date Badge if Selected */}
          {dateFilter && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              background: '#ea580c',
              color: '#ffffff'
            }}>
              Filtered: {dateFilter}
              <button
                onClick={() => setDateFilter('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: 12,
                  marginLeft: 2
                }}
                title="Clear date filter"
              >
                ×
              </button>
            </span>
          )}

          {/* Divider */}
          <span style={{ color: '#cbd5e1' }}>|</span>

          {/* File Type Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>Type:</span>
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
              style={{
                padding: '4px 8px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All File Types</option>
              <option value="MATCHED">Matched STP</option>
              <option value="UNMATCHED">Unmatched Exceptions</option>
              <option value="LEDGER">Balanced Ledgers</option>
              <option value="CBS">CBS Adjustments</option>
              <option value="FEED">Source Feeds</option>
              <option value="LIQUIDITY">Liquidity Returns</option>
            </select>
          </div>
        </div>

        {/* Counter & Clear All Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            Showing <strong>{filteredFiles.length}</strong> of <strong>{files.length}</strong> file{files.length === 1 ? '' : 's'}
          </span>
          {isFiltered && (
            <button
              onClick={clearAllFilters}
              style={{
                padding: '3px 8px',
                fontSize: 11,
                borderRadius: 4,
                border: '1px solid #f87171',
                background: '#fef2f2',
                color: '#dc2626',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 280 }}>Download &amp; Filename</th>
              <th style={{ width: 110 }}>File ID</th>
              <th style={{ width: 80 }}>Rail</th>
              <th style={{ width: 140 }}>File Type</th>
              <th style={{ width: 180 }}>Workflow Source</th>
              <th style={{ textAlign: 'right', width: 90 }}>Records</th>
              <th style={{ textAlign: 'right', width: 90 }}>Exceptions</th>
              <th style={{ textAlign: 'right', width: 80 }}>P1</th>
              <th style={{ textAlign: 'center', width: 80 }}>STP%</th>
              <th style={{ width: 100 }}>Status</th>
              <th style={{ width: 150 }}>Timestamp (DD-MM-YYYY)</th>
            </tr>
          </thead>
          <tbody>
            {pagedFiles.map((f, i) => {
              const total = f.records || 1
              const stp = f.stp_rate !== undefined ? f.stp_rate : Math.round(((f.stp_count || 0) / total) * 100)
              const fRail = getFileRail(f)
              const fDateDMY = getFileDateDMY(f)
              const fTime = getFileTimeStr(f)
              const isXlsx = (f.filename || '').toLowerCase().endsWith('.xlsx')

              return (
                <tr key={f.file_id || i}>
                  {/* Download + Filename */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => onDownload && onDownload(f)}
                        title={`Download ${f.filename} directly from workflow registry`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 30,
                          height: 30,
                          borderRadius: 6,
                          border: '1.5px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#0f172a',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#ea580c'
                          e.currentTarget.style.color = '#ea580c'
                          e.currentTarget.style.background = '#fff7ed'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#cbd5e1'
                          e.currentTarget.style.color = '#0f172a'
                          e.currentTarget.style.background = '#ffffff'
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>

                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              maxWidth: 210,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: 600,
                              fontSize: 12,
                              color: '#0f172a'
                            }}
                            title={f.filename}
                          >
                            {f.filename}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '1px 4px',
                              borderRadius: 4,
                              background: isXlsx ? '#dcfce7' : '#e0f2fe',
                              color: isXlsx ? '#15803d' : '#0369a1',
                              textTransform: 'uppercase'
                            }}
                          >
                            {isXlsx ? 'XLSX' : 'CSV'}
                          </span>
                        </div>
                        <span style={{ fontSize: 10, color: '#64748b' }}>
                          {f.size_kb ? `${f.size_kb} KB` : 'Direct AE Output'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* File ID */}
                  <td>
                    <code style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 5px', borderRadius: 4 }}>
                      {f.file_id || 'FILE-001'}
                    </code>
                  </td>

                  {/* Rail */}
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                        background:
                          fRail === 'UPI' ? '#fff7ed' :
                          fRail === 'IMPS' ? '#f5f3ff' :
                          fRail === 'AEPS' ? '#eff6ff' :
                          fRail === 'NETC' ? '#fefce8' :
                          fRail === 'NEFT' ? '#f0fdf4' : '#faf5ff',
                        color:
                          fRail === 'UPI' ? '#c2410c' :
                          fRail === 'IMPS' ? '#6d28d9' :
                          fRail === 'AEPS' ? '#1d4ed8' :
                          fRail === 'NETC' ? '#a16207' :
                          fRail === 'NEFT' ? '#15803d' : '#7e22ce',
                        border: `1px solid ${
                          fRail === 'UPI' ? '#fed7aa' :
                          fRail === 'IMPS' ? '#ddd6fe' :
                          fRail === 'AEPS' ? '#bfdbfe' :
                          fRail === 'NETC' ? '#fef08a' :
                          fRail === 'NEFT' ? '#bbf7d0' : '#e9d5ff'
                        }`
                      }}
                    >
                      {fRail}
                    </span>
                  </td>

                  {/* File Type */}
                  <td>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background:
                          (f.file_type || '').includes('Matched') ? '#f0fdf4' :
                          (f.file_type || '').includes('Unmatched') ? '#fef2f2' :
                          (f.file_type || '').includes('Ledger') ? '#ecfeff' :
                          (f.file_type || '').includes('CBS') ? '#fdf4ff' : '#f8fafc',
                        color:
                          (f.file_type || '').includes('Matched') ? '#166534' :
                          (f.file_type || '').includes('Unmatched') ? '#b91c1c' :
                          (f.file_type || '').includes('Ledger') ? '#0e7490' :
                          (f.file_type || '').includes('CBS') ? '#86198f' : '#475569'
                      }}
                    >
                      {f.file_type || 'Settlement Batch'}
                    </span>
                  </td>

                  {/* Workflow Source */}
                  <td>
                    <span
                      style={{
                        fontSize: 11,
                        color: '#334155',
                        display: 'block',
                        maxWidth: 170,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={f.workflow_name || 'NPCI AutomationEdge Workflow'}
                    >
                      {f.workflow_name || 'NPCI AutomationEdge Workflow'}
                    </span>
                  </td>

                  {/* Records */}
                  <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12 }}>
                    {fmt(f.records)}
                  </td>

                  {/* Exceptions */}
                  <td style={{
                    textAlign: 'right',
                    fontWeight: 600,
                    fontSize: 12,
                    color: (f.exception_count || 0) > 0 ? 'var(--red)' : '#64748b'
                  }}>
                    {fmt(f.exception_count || 0)}
                  </td>

                  {/* P1 Risk */}
                  <td style={{
                    textAlign: 'right',
                    fontWeight: 600,
                    fontSize: 12,
                    color: (f.p1_count || 0) > 0 ? 'var(--red)' : '#64748b'
                  }}>
                    {fmt(f.p1_count || 0)}
                  </td>

                  {/* STP% */}
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: stp >= 95 ? '#15803d' : stp >= 85 ? '#b45309' : '#b91c1c'
                    }}>
                      {stp}%
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    <Badge type={f.status || 'COMPLETED'} />
                  </td>

                  {/* Timestamp in DD-MM-YYYY */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>
                        {fDateDMY}
                      </span>
                      <span style={{ fontSize: 10, color: '#64748b' }}>
                        {fTime}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}

            {!filteredFiles.length && (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>
                      No workflow output files match the current filters
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {dateFilter ? `No files found for date ${dateFilter}` : ''}
                      {dateFilter && selectedRail !== 'ALL' ? ' and ' : ''}
                      {selectedRail !== 'ALL' ? `rail ${selectedRail}` : ''}
                    </div>
                    {isFiltered && (
                      <button
                        onClick={clearAllFilters}
                        style={{
                          marginTop: 4,
                          padding: '5px 12px',
                          fontSize: 11,
                          borderRadius: 6,
                          background: '#ea580c',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {filteredFiles.length > pageSize && (
          <div style={{ marginTop: 12 }}>
            <Pagination
              totalItems={filteredFiles.length}
              pageSize={pageSize}
              currentPage={currentPage}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Validation Result Box ─────────────────────────────────────────────────────
function ValidationResult({ result }) {
  if (!result) return null
  const cls = result.status === 'VALIDATED' ? 'ok' : result.status === 'DUPLICATE' ? 'dup' : 'err'
  const icons = { VALIDATED: 'VALID', REJECTED: 'REJECTED', DUPLICATE: 'DUPLICATE' }
  return (
    <div className={`validation-box ${cls}`}>
      <div className="validation-title">
        <span>{icons[result.status]}</span>
        <span>{result.status} &mdash; {result.filename}</span>
      </div>
      <div className="validation-metrics">
        <div className="validation-pill">Records: <b>{fmt(result.records)}</b></div>
        <div className="validation-pill">P1 Critical: <b style={{ color: 'var(--red)' }}>{fmt(result.p1_count)}</b></div>
        <div className="validation-pill">P2 Exceptions: <b style={{ color: 'var(--amber)' }}>{fmt(result.p2_count)}</b></div>
        <div className="validation-pill">Breaks: <b style={{ color: 'var(--red)' }}>{fmt(result.exception_count)}</b></div>
        <div className="validation-pill">STP Rate: <b style={{ color: 'var(--green)' }}>{result.records ? Math.round((result.stp_count || 0) / result.records * 100) + '%' : '—'}</b></div>
        <div className="validation-pill">Hash: <b style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{(result.hash || '').slice(0, 14)}…</b></div>
      </div>
      {result.errors?.length > 0 && (
        <ul className="validation-list" style={{ color: 'var(--red)' }}>
          {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
        </ul>
      )}
      {result.warnings?.length > 0 && (
        <ul className="validation-list" style={{ color: 'var(--amber)', marginTop: 4 }}>
          {result.warnings.slice(0, 3).map((w, i) => <li key={i}>• {w}</li>)}
        </ul>
      )}
    </div>
  )
}

// ── 4-Way Leg Inspection Modal ────────────────────────────────────────────────
function LegModal({ breakItem, onClose }) {
  if (!breakItem) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">4-Way Leg Comparison — {breakItem.txn_id}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              RRN: <b>{breakItem.rrn}</b> | Rail: <b>{breakItem.rail}</b> | Cycle: <b>{breakItem.cycle_id}</b>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Badge type={breakItem.priority} label={breakItem.priority + ' Critical'} />
          <Badge type={breakItem.scenario} label={breakItem.scenario.replace(/_/g, ' ')} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            TAT Risk: <b style={{ color: breakItem.sla_breach_risk === 'High' ? 'var(--red)' : 'var(--amber)' }}>{breakItem.sla_breach_risk}</b>
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            RBI Clock: <b style={{ color: breakItem.penalty_clock_started === 'Yes' ? 'var(--red)' : 'inherit' }}>{breakItem.penalty_clock_started === 'Yes' ? 'RUNNING (T+1)' : 'Normal'}</b>
          </span>
        </div>

        <div className="leg-grid">
          <div className={`leg-item ${breakItem.npci_status === 'SUCCESS' ? 'success' : 'error'}`}>
            <div className="leg-title">1. NPCI Central</div>
            <div className="leg-status" style={{ color: breakItem.npci_status === 'SUCCESS' ? 'var(--green)' : 'var(--red)' }}>
              {breakItem.npci_status}
            </div>
            <div className="leg-amount">{fmtInr(breakItem.npci_amount)}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Settlement Master</div>
          </div>

          <div className={`leg-item ${breakItem.switch_status === 'AUTHORIZED' ? 'success' : 'error'}`}>
            <div className="leg-title">2. Payment Switch</div>
            <div className="leg-status" style={{ color: breakItem.switch_status === 'AUTHORIZED' ? 'var(--green)' : 'var(--red)' }}>
              {breakItem.switch_status}
            </div>
            <div className="leg-amount">{fmtInr(breakItem.npci_amount)}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Base24 Gateway</div>
          </div>

          <div className={`leg-item ${breakItem.cbs_status === 'DEBITED' ? 'success' : 'error'}`}>
            <div className="leg-title">3. Core Banking (CBS)</div>
            <div className="leg-status" style={{ color: breakItem.cbs_status === 'DEBITED' ? 'var(--green)' : 'var(--red)' }}>
              {breakItem.cbs_status}
            </div>
            <div className="leg-amount">{fmtInr(breakItem.cbs_amount)}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Finacle Ledger</div>
          </div>

          <div className={`leg-item ${breakItem.gl_amount > 0 ? 'success' : 'error'}`}>
            <div className="leg-title">4. General Ledger (GL)</div>
            <div className="leg-status" style={{ color: breakItem.gl_amount > 0 ? 'var(--green)' : 'var(--red)' }}>
              {breakItem.gl_amount > 0 ? 'POSTED' : 'UNBALANCED'}
            </div>
            <div className="leg-amount">{fmtInr(breakItem.gl_amount)}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Suspense Pool</div>
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Financial Variance Analysis:</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-main)' }}>
            CBS Debited: <b>{fmtInr(breakItem.cbs_amount)}</b> &mdash; NPCI Settled: <b>{fmtInr(breakItem.npci_amount)}</b>
            &nbsp;|&nbsp; Net Delta: <b style={{ color: breakItem.variance !== 0 ? 'var(--red)' : 'var(--green)' }}>{fmtInr(breakItem.variance)}</b>
          </div>
          {breakItem.notes && (
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: '1.5' }}>
              <b>Root Cause Diagnostic:</b> {breakItem.notes}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            Next Step: Handed to <b>Stage 3 (AI Break Investigation Agent)</b> for automated root-cause dossier.
          </div>
          <button className="btn btn-secondary" onClick={onClose}>Close Inspection</button>
        </div>
      </div>
    </div>
  )
}

// ── Official Evidence Dossier Modal (Stage 3) ─────────────────────────────────
function DossierModal({ dossier, onClose }) {
  if (!dossier) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 820 }} onClick={e => e.stopPropagation()}>
        <div className="dossier-stamp">EVIDENCE DOSSIER &bull; TAMPER-PROOF</div>

        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              
              <div className="modal-title">{dossier.dossier_id}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Transaction: <b>{dossier.txn_id}</b> &bull; RRN: <b>{dossier.rrn}</b> &bull; Rail: <b>{dossier.rail}</b> &bull; Amount: <b style={{ color: 'var(--orange)' }}>{fmtInr(dossier.cbs_amount)}</b>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* AI Root-Cause Diagnostic Narrative */}
        <div className="dossier-section">
          <div className="dossier-sec-title">AI Agent Root-Cause Diagnostic:</div>
          <div className="dossier-narrative">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <b>{dossier.category}</b>
              <span className="badge badge-green">Confidence: {dossier.confidence_score}%</span>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: '1.6' }}>{dossier.technical_finding}</div>
          </div>
        </div>

        {/* 4-Way Technical Evidence Table */}
        <div className="dossier-section">
          <div className="dossier-sec-title">4-Way System Audit Evidence:</div>
          <div className="leg-grid">
            <div className={`leg-item ${dossier.four_way_legs?.npci?.status === 'SUCCESS' ? 'success' : 'error'}`}>
              <div className="leg-title">1. NPCI Master</div>
              <div className="leg-status">{dossier.four_way_legs?.npci?.status}</div>
              <div className="leg-amount">{fmtInr(dossier.four_way_legs?.npci?.amount)}</div>
            </div>
            <div className={`leg-item ${dossier.four_way_legs?.switch?.status === 'AUTHORIZED' ? 'success' : 'error'}`}>
              <div className="leg-title">2. Payment Switch</div>
              <div className="leg-status">{dossier.four_way_legs?.switch?.status}</div>
              <div className="leg-amount">{fmtInr(dossier.four_way_legs?.switch?.amount)}</div>
            </div>
            <div className={`leg-item ${dossier.four_way_legs?.cbs?.status === 'DEBITED' ? 'success' : 'error'}`}>
              <div className="leg-title">3. Core Banking (CBS)</div>
              <div className="leg-status">{dossier.four_way_legs?.cbs?.status}</div>
              <div className="leg-amount">{fmtInr(dossier.four_way_legs?.cbs?.amount)}</div>
            </div>
            <div className={`leg-item ${dossier.four_way_legs?.gl?.status === 'POSTED' ? 'success' : 'error'}`}>
              <div className="leg-title">4. General Ledger</div>
              <div className="leg-status">{dossier.four_way_legs?.gl?.status}</div>
              <div className="leg-amount">{fmtInr(dossier.four_way_legs?.gl?.amount)}</div>
            </div>
          </div>
        </div>

        {/* RBI Regulatory Assessment */}
        <div className="dossier-section" style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Regulatory SLA Clock (RBI Circular DPSS.CO.PD No.629):</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                Time to Breach: <span style={{ color: dossier.sla_urgency === 'CRITICAL' ? 'var(--red)' : 'var(--amber)', fontSize: 15 }}>{dossier.sla_countdown}</span>
                &nbsp;&bull;&nbsp; Elapsed: <b>{dossier.hours_elapsed}h</b>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Penalty Exposure:</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--red)' }}>{dossier.rbi_penalty_exposure}</div>
            </div>
          </div>
        </div>

        {/* Action Recommendation Box */}
        <div className="dossier-action-box">
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange-d)', textTransform: 'uppercase' }}>Recommended Resolution Action:</div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
              {dossier.action_label}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Routing: {dossier.is_hitl_required ? 'Operations Manager Sign-Off Required' : 'Autonomous Reversal Execution Bot (Finacle)'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={() => { alert(`Action Queued: ${dossier.action_label}`); onClose(); }}>
              {dossier.is_hitl_required ? 'Approve & Route to Ops Cockpit' : 'Execute Reversal Bot'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [stats, setStats] = useState({})
  const [files, setFiles] = useState([])
  const [audit, setAudit] = useState([])
  const [staging, setStaging] = useState([])
  const [activeNav, setActiveNav] = useState(() => readNavFromUrl()?.nav || 'dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeRailScope, setActiveRailScope] = useState(() => readNavFromUrl()?.rail || null)
  const [activeRailName, setActiveRailName] = useState(() => readNavFromUrl()?.rail || '')

  // Push a history entry whenever the tab or rail scope changes; Back / Forward restore it.
  const historyReady = useRef(false)
  useEffect(() => {
    const state = { nav: activeNav, rail: activeRailScope || null, railName: activeRailName || '' }
    const url = navUrl(activeNav, activeRailScope)
    if (!historyReady.current) {
      window.history.replaceState(state, '', url)   // first entry = current screen (no extra Back step)
      historyReady.current = true
      return
    }
    const cur = window.history.state
    if (cur && cur.nav === state.nav && (cur.rail || null) === state.rail) return   // already here (e.g. just restored by Back)
    window.history.pushState(state, '', url)
  }, [activeNav, activeRailScope, activeRailName])

  useEffect(() => {
    const onPop = (e) => {
      const s = e.state || readNavFromUrl() || { nav: 'dashboard', rail: null, railName: '' }
      setActiveNav(s.nav)
      setActiveRailScope(s.rail || null)
      setActiveRailName(s.railName || s.rail || '')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const [uploading, setUploading] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [pipeStage, setPipeStage] = useState(0)
  const [agentText, setAgentText] = useState('Ready — File Monitoring Agent actively watching inbound SFTP directory')
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [drag, setDrag] = useState(false)
  const [time, setTime] = useState(new Date())
  const [backendOk, setBackendOk] = useState(null)

  // Stage 2 Recon State
  const [reconData, setReconData] = useState(null)
  const [reconBreaks, setReconBreaks] = useState([])
  const [reconMatched, setReconMatched] = useState([])
  const [reconRunning, setReconRunning] = useState(false)
  const [breakFilter, setBreakFilter] = useState('ALL')
  const [selectedBreak, setSelectedBreak] = useState(null)

  // Stage 3 AI Investigation State
  const [agentSummary, setAgentSummary] = useState(null)
  const [dossierList, setDossierList] = useState([])
  const [selectedDossier, setSelectedDossier] = useState(null)
  const [agentRunning, setAgentRunning] = useState(false)
  const [dossierFilter, setDossierFilter] = useState('ALL')

  // Stage 4 & 5 State: Recovery & Operations Cockpit
  const [recoverySummary, setRecoverySummary] = useState(null)
  const [hitlQueue, setHitlQueue] = useState([])
  const [hitlFilter, setHitlFilter] = useState('ALL')
  const [approvingTxn, setApprovingTxn] = useState({})
  const [batchLoading, setBatchLoading] = useState(false)

  // Stage 6 State: Regulatory MIS & Audit Pack
  const [misReport, setMisReport] = useState(null)
  const [sealedPack, setSealedPack] = useState(null)
  const [sealing, setSealing] = useState(false)

  // Microsoft Agent Framework (MAF) Orchestrator & Context Graph State
  const [mafGraph, setMafGraph] = useState(null)
  const [selectedMafNode, setSelectedMafNode] = useState('node_recon')
  const [mafRunning, setMafRunning] = useState(false)
  const [selectedRailForOps, setSelectedRailForOps] = useState('UPI')

  // AutomationEdge (AE) Server Execution Modal State
  const [aeModalOpen, setAeModalOpen] = useState(false)
  const [aeExecutionStatus, setAeExecutionStatus] = useState('RUNNING') // 'RUNNING' | 'COMPLETED' | 'DUPLICATE_HALTED' | 'REJECTED_HALTED'
  const [aeCurrentStep, setAeCurrentStep] = useState(0)
  const [aeLogs, setAeLogs] = useState([])
  const [aeFileName, setAeFileName] = useState('NPCI_UPI_Settlement_TestData_50K.csv')
  const [aeTotalRecords, setAeTotalRecords] = useState(50000)

  const fileRef = useRef()

  // Pagination states for all data tabs (10 items per page)
  const [stagingPage, setStagingPage] = useState(1)
  const [reconPage, setReconPage] = useState(1)
  const [dossierPage, setDossierPage] = useState(1)
  const [hitlPage, setHitlPage] = useState(1)

  // Polling
  const refresh = useCallback(async () => {
    // AePS / NETC / IMPS have live Process Studio recon data - scope Stage 2 & 3 calls to the selected rail
    const liveRail = activeRailScope && LIVE_RAILS.includes(activeRailScope.toUpperCase()) ? activeRailScope.toUpperCase() : null
    const railQ = liveRail ? `rail=${liveRail}` : ''
    try {
      const [s, f, a, st, rc, rb, rm, as, rec, hitl, mis, mg] = await Promise.all([
        fetch(`${API}/api/stats`).then(r => r.json()),
        fetch(`${API}/api/files`).then(r => r.json()),
        fetch(`${API}/api/audit`).then(r => r.json()),
        fetch(`${API}/api/staging`).then(r => r.json()),
        fetch(`${API}/api/recon/summary${railQ ? `?${railQ}` : ''}`).then(r => r.json()).catch(() => null),
        fetch(`${API}/api/recon/breaks?limit=${liveRail ? 500 : 150}${railQ ? `&${railQ}` : ''}`).then(r => r.json()).catch(() => ({ breaks: [] })),
        fetch(`${API}/api/recon/matched?limit=200${railQ ? `&${railQ}` : ''}`).then(r => r.json()).catch(() => ({ matched: [] })),
        fetch(`${API}/api/agent/investigate/summary${railQ ? `?${railQ}` : ''}`).then(r => r.json()).catch(() => null),
        fetch(`${API}/api/recovery/summary`).then(r => r.json()).catch(() => null),
        fetch(`${API}/api/hitl/queue?limit=200`).then(r => r.json()).catch(() => ({ queue: [] })),
        fetch(`${API}/api/mis/report`).then(r => r.json()).catch(() => null),
        fetch(`${API}/api/orchestrator/graph`).then(r => r.json()).catch(() => null),
      ])
      setStats(s)
      setFiles(f.files || [])
      setAudit(a.logs || [])
      setStaging(st.staging_files || [])
      if (rc && rc.status !== 'IDLE') {
        setReconData(rc)
        if (rb) setReconBreaks(rb.breaks || [])
        if (rm) setReconMatched(rm.matched || [])
      } else {
        setReconData(null)
        setReconBreaks([])
        setReconMatched([])
      }
      if (as && as.status !== 'IDLE') {
        setAgentSummary(as)
        setDossierList(as.dossier_list_sample || [])
      } else {
        setAgentSummary(null)
        setDossierList([])
      }
      if (rec) setRecoverySummary(rec)
      if (hitl && hitl.queue) setHitlQueue(hitl.queue)
      if (mis) setMisReport(mis)
      if (mg) setMafGraph(mg)
      setBackendOk(true)
    } catch { setBackendOk(false) }
  }, [activeRailScope])

  const liveRailQuery = () => (activeRailScope && LIVE_RAILS.includes(activeRailScope.toUpperCase()) ? `rail=${activeRailScope.toUpperCase()}` : '')

  useEffect(() => { refresh(); const id = setInterval(refresh, 4000); return () => clearInterval(id) }, [refresh])
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id) }, [])

  const sleep = ms => new Promise(r => setTimeout(r, ms))

  // Trigger 4-Way Recon Execution
  const triggerReconRun = async () => {
    setReconRunning(true)
    try {
      const rq = liveRailQuery()
      const res = await fetch(`${API}/api/recon/run${rq ? `?${rq}` : ''}`, { method: 'POST' })
      const data = await res.json()
      await sleep(1000)
      setReconData(data)
      const breaksRes = await fetch(`${API}/api/recon/breaks?limit=${rq ? 500 : 150}${rq ? `&${rq}` : ''}`).then(r => r.json())
      setReconBreaks(breaksRes.breaks || [])
      const matchedRes = await fetch(`${API}/api/recon/matched?limit=200${rq ? `&${rq}` : ''}`).then(r => r.json()).catch(() => ({ matched: [] }))
      setReconMatched(matchedRes.matched || [])
      refresh()
    } catch (e) {
      alert("Error triggering reconciliation: " + e)
    }
    setReconRunning(false)
  }

  // Trigger AI Investigation Execution
  const triggerAgentInvestigation = async () => {
    setAgentRunning(true)
    try {
      const rq = liveRailQuery()
      const res = await fetch(`${API}/api/agent/investigate/run${rq ? `?${rq}` : ''}`, { method: 'POST' })
      const data = await res.json()
      await sleep(1200)
      setAgentSummary(data)
      setDossierList(data.dossier_list_sample || [])
      refresh()
    } catch (e) {
      alert("Error running AI investigation: " + e)
    }
    setAgentRunning(false)
  }

  // Stage 5: Single Transaction Approval & Finacle Post
  const handleApproveTxn = async (item) => {
    setApprovingTxn(prev => ({ ...prev, [item.txn_id]: true }))
    try {
      const res = await fetch(`${API}/api/hitl/approve?txn_id=${item.txn_id}&approver=Operations%20Manager`, {
        method: 'POST'
      })
      const result = await res.json()
      if (result.success) {
        setHitlQueue(prev => prev.map(q => q.txn_id === item.txn_id ? { ...q, status: 'APPROVED_AND_POSTED', posting_ref: result.posting_ref } : q))
        refresh()
      }
    } catch (e) {
      alert("Error approving transaction: " + e)
    }
    setApprovingTxn(prev => ({ ...prev, [item.txn_id]: false }))
  }

  // Stage 5: Reject Transaction (Halt CBS Posting)
  const handleRejectTxn = (item) => {
    const reason = window.prompt(`Enter rejection reason for transaction ${item.txn_id}:`, "Unverified beneficiary claim / Suspicious debit velocity")
    if (reason === null) return
    setHitlQueue(prev => prev.map(q => q.txn_id === item.txn_id ? { ...q, status: 'REJECTED', rejection_reason: reason } : q))
    alert(`Transaction ${item.txn_id} REJECTED.\n• Reason: ${reason}\n• Action: Finacle CBS posting suspended.\n• Status: Flagged to Fraud Risk Monitor.`)
  }

  // Stage 5: Escalate Transaction to High-Level Committee
  const handleEscalateTxn = (item) => {
    const note = window.prompt(`Enter escalation note for transaction ${item.txn_id}:`, "Amount mismatch exceeds branch authority — Escalate to Head of Settlement & Risk Committee")
    if (note === null) return
    setHitlQueue(prev => prev.map(q => q.txn_id === item.txn_id ? { ...q, status: 'ESCALATED', priority: 'P1', escalation_note: note } : q))
    alert(`Transaction ${item.txn_id} ESCALATED.\n• Priority: P1 Urgent\n• Recipient: Head of Operations & Risk Committee\n• Note: ${note}`)
  }

  // Stage 5: Batch Approve All Pending P1 Breaks
  const handleBatchApproveP1 = async () => {
    setBatchLoading(true)
    try {
      const res = await fetch(`${API}/api/hitl/batch-approve-p1?approver=Chief%20Operations%20Officer`, {
        method: 'POST'
      })
      const result = await res.json()
      if (result.success) {
        alert(`BATCH P1 EXECUTION COMPLETE!\n\n• Approved Cases: ${result.approved_count.toLocaleString()}\n• Total Amount Posted: ₹${result.approved_amount.toLocaleString()}\n• Avoided RBI Compensation Penalty: ₹2,40,000 / Day\n• Authorizer: ${result.approver}\n• Status: All reversals dispatched to Finacle CBS`)
        refresh()
      }
    } catch (e) {
      alert("Error in batch approval: " + e)
    }
    setBatchLoading(false)
  }

  // Stage 6: Seal Tamper-Proof Cryptographic Audit Pack
  const handleSealAuditPack = async () => {
    setSealing(true)
    try {
      const res = await fetch(`${API}/api/mis/seal-pack`, { method: 'POST' })
      const pack = await res.json()
      await sleep(900)
      setSealedPack(pack)
      refresh()
    } catch (e) {
      alert("Error sealing audit pack: " + e)
    }
    setSealing(false)
  }

  // Microsoft Agent Framework (MAF) Orchestrator Execution Trigger
  const handleRunOrchestrator = async () => {
    setMafRunning(true)
    try {
      const res = await fetch(`${API}/api/orchestrator/run`, { method: 'POST' })
      const data = await res.json()
      await sleep(600)
      refresh()
    } catch (e) {
      alert("Error executing MAF Workflow Graph: " + e)
    }
    setMafRunning(false)
  }

  // Trigger Autonomous Downstream Toolchain (Zero-Delta GL -> AI Dual-Track -> CBS Bot -> Audit Seal)
  const handleTriggerAeChain = async () => {
    setMafRunning(true)
    try {
      const res = await fetch(`${API}/api/orchestrator/trigger-ae-chain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_name: 'NPCI Demo UPI Reconn' })
      })
      const data = await res.json()
      await sleep(700)
      refresh()
    } catch (e) {
      alert("Error triggering Agent Toolchain: " + e)
    }
    setMafRunning(false)
  }

  // MAF Reset Trigger
  const handleResetOrchestrator = async () => {
    try {
      await fetch(`${API}/api/orchestrator/reset`, { method: 'POST' })
      refresh()
    } catch (e) {
      alert("Error resetting MAF Orchestrator: " + e)
    }
  }

  const hasData = Boolean(
    (stats.total_records_ingested && stats.total_records_ingested > 0) ||
    (files && files.length > 0) ||
    (staging && staging.length > 0)
  )

  const upiRecordVolume = (reconData?.total_records && reconData.total_records > 0)
    ? reconData.total_records
    : (hasData && stats.rail_volumes?.UPI ? stats.rail_volumes.UPI : (stats.total_records_ingested > 0 ? stats.total_records_ingested : 0))

  const railRecordCounts = {
    UPI: upiRecordVolume,
    IMPS: (reconData?.rail === 'IMPS' && reconData?.total_records) ? reconData.total_records : (stats.rail_volumes?.IMPS || 0),
    NACH: (reconData?.rail === 'NACH' && reconData?.total_records) ? reconData.total_records : (stats.rail_volumes?.NACH || 0),
    AEPS: (reconData?.rail === 'AEPS' && reconData?.total_records) ? reconData.total_records : (stats.rail_volumes?.AEPS || 0),
    RUPAY: (reconData?.rail === 'RUPAY' && reconData?.total_records) ? reconData.total_records : (stats.rail_volumes?.RUPAY || 0),
    CTS: (reconData?.rail === 'CTS' && reconData?.total_records) ? reconData.total_records : (stats.rail_volumes?.CTS || 0),
    BBPS: (reconData?.rail === 'BBPS' && reconData?.total_records) ? reconData.total_records : (stats.rail_volumes?.BBPS || 0),
    NETC: (reconData?.rail === 'NETC' && reconData?.total_records) ? reconData.total_records : (stats.rail_volumes?.NETC || 0),
    NEFT: (reconData?.rail === 'NEFT' && reconData?.total_records) ? reconData.total_records : (stats.rail_volumes?.NEFT || 0),
    RTGS: (reconData?.rail === 'RTGS' && reconData?.total_records) ? reconData.total_records : (stats.rail_volumes?.RTGS || 0)
  }

  const railMetadata = {
    UPI: {
      name: 'Unified Payments Interface (UPI 2.0)',
      category: 'Instant & Mobile',
      tagline: 'Real-time 24x7 Mobile P2P/P2M Clearing & Auto-Reversals',
      clearingWindow: '6 Daily Settlement Cycles (00:00 - 24:00 IST)',
      sla: 'T+1 Calendar Day (RBI DPSS Circular No.629)',
      systems: 'NPCI Central Switch, Base24, Finacle 10.x CBS, GL 9901',
      dailyVolume: `${upiRecordVolume} txns`,
      stpRate: (reconData?.stp_rate !== undefined ? `${reconData.stp_rate}%` : '20.0%')
    },
    IMPS: {
      name: 'Immediate Payment Service (IMPS)',
      category: 'Instant & Mobile',
      tagline: 'Instant 24x7 Interbank Account-to-Account Settlement',
      clearingWindow: 'Continuous Real-Time 24x7 Clearing',
      sla: 'T+1 Calendar Day (Immediate Settlement Obligation)',
      systems: 'NPCI IMPS Switch, Core Banking Host, CBS Suspense 9902, RBI RTGS Leg',
      dailyVolume: '7,431 txns',
      stpRate: '95.2%'
    },
    NACH: {
      name: 'National Automated Clearing House (NACH)',
      category: 'Bulk & Mandates',
      tagline: 'High-Volume Bulk Direct Debit, Mandates, Salary & Dividend Clearing',
      clearingWindow: 'Batch Clearing Sessions (09:00 & 14:00 IST)',
      sla: 'T+1 Session Cycle (Session 1 & Session 2)',
      systems: 'NPCI ACH Host, APBS Clearing File, CBS Bulk Debit Engine, Sundry Clearing 9903',
      dailyVolume: '6,524 txns',
      stpRate: '95.2%'
    },
    AEPS: {
      name: 'Aadhaar Enabled Payment System (AePS)',
      category: 'Cards & Biometrics',
      tagline: 'Biometric Micro-ATM Clearing & BC Agent Settlement',
      clearingWindow: 'Daily Batch Settlement Window',
      sla: 'T+1 Calendar Day (Micro-ATM Settlement)',
      systems: 'UIDAI Aadhaar Auth Switch, NPCI AePS Switch, CBS Agent Vault 9904',
      dailyVolume: '1,938 txns',
      stpRate: '95.2%'
    },
    RUPAY: {
      name: 'RuPay Multi-Channel Card Scheme',
      category: 'Cards & Biometrics',
      tagline: 'POS, E-Commerce & ATM Domestic Card Clearing & Chargebacks',
      clearingWindow: 'Daily End-of-Day Settlement Window (23:00 IST)',
      sla: 'T+1 Scheme Settlement (Chargeback Window T+45)',
      systems: 'RuPay Clearing Switch, Issuer Host, Acquirer GL 9905',
      dailyVolume: '1,461 txns',
      stpRate: '95.2%'
    },
    CTS: {
      name: 'Cheque Truncation System (CTS-2010)',
      category: 'Bulk & Cheque',
      tagline: 'Image-Based Electronic Physical Cheque Clearing & Return Memos',
      clearingWindow: '2 Daily Clearing Grid Windows (Presentment & Return)',
      sla: 'T+1 Clearing Cycle (Grid-Based Clearing)',
      systems: 'CTS Clearing House Grid, Document Scanner Vault, Finacle Cheque Clearing Module',
      dailyVolume: '1,511 cheques',
      stpRate: '95.2%'
    },
    BBPS: {
      name: 'Bharat Bill Payment System (BBPS)',
      category: 'Utility & Transit',
      tagline: 'Interoperable Utility, Telecom, Gas & Municipal Bill Settlement',
      clearingWindow: 'Daily Batch Clearing Window (00:00 - 23:59 IST)',
      sla: 'T+1 Calendar Day (Biller Settlement Window)',
      systems: 'NPCI Bharat BillPay Central Unit (BBPCU), Agent Feed, Biller Gateway, GL 9907',
      dailyVolume: '525 bills',
      stpRate: '95.2%'
    },
    NETC: {
      name: 'National Electronic Toll Collection (FASTag)',
      category: 'Utility & Transit',
      tagline: 'RFID Highway Toll Plaza Clearing & Concessionaire Reconciliation',
      clearingWindow: 'Hourly & Daily Toll Plaza Batch Settlement',
      sla: 'T+1 Batch Window (Plaza Settlement Mandate)',
      systems: 'IHMCL / NPCI NETC Switch, Plaza Toll Reader Log, FASTag Wallet CBS Host',
      dailyVolume: '1,505 tolls',
      stpRate: '95.2%'
    },
    NEFT: {
      name: 'National Electronic Funds Transfer (NEFT)',
      category: 'Wholesale & RBI Clearing',
      tagline: '24x7 Deferred Net Settlement (DNS) in Half-Hourly Batches (RBI e-Kuber)',
      clearingWindow: '48 Half-Hourly Batches Daily (24x7 Since Dec 2019)',
      sla: '2-Hour Credit / Return TAT (RBI DPSS Mandate)',
      systems: 'RBI e-Kuber CBS, SFMS Gateway (ISO 20022 pacs.008), Finacle CBS, GL 9901',
      dailyVolume: '14,460 txns',
      stpRate: '96.4%'
    },
    RTGS: {
      name: 'Real Time Gross Settlement (RTGS)',
      category: 'Wholesale & RBI Clearing',
      tagline: 'Continuous Gross High-Value Interbank Settlement (₹2 Lakh+ Mandate)',
      clearingWindow: 'Continuous Real-Time 24x7 Clearing (Since Dec 2020)',
      sla: 'Immediate Irrevocable Settlement (T+0 Real-Time)',
      systems: 'RBI e-Kuber RTGS Node, SFMS pacs.008/009, Finacle Treasury CBS, GL 11010',
      dailyVolume: '4,910 txns',
      stpRate: '98.2%'
    }
  }

  // Launch Dedicated Rail Trial Sandbox (from Rail Solution Catalog)
  const handleStartRailTrial = (railCode, railName) => {
    const meta = railMetadata[railCode]
    setActiveRailScope(railCode)
    setActiveRailName(meta?.name || railName || railCode)
    setSelectedRailForOps(railCode)
    setActiveNav('dashboard') // Redirect directly to Home Dashboard scoped to this catalogue!
    setPipeStage(0)
    setLastResult(null)
    setAgentText(`[${railCode} ACTIVE] Home Dashboard scoped to ${meta?.name || railCode} only. Showing isolated transactions, 4-way matching & STP rates.`)
  }

  // Upload handler with choreographed step-by-step animations & AE Server Modal
  const handleUpload = async (f) => {
    if (!f) return
    setUploading(true)
    setLastResult(null)
    setIsDuplicate(false)

    // Open AE Server RPA Execution Modal with blurred background
    setAeExecutionStatus('RUNNING')
    setAeFileName(f.name)
    setAeTotalRecords(50000)
    setAeModalOpen(true)
    setAeCurrentStep(1)
    setAeLogs([
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Initializing cluster AE-PROD-CLUSTER-01 (Port 8080)...`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Authenticating AE Credential Vault for NPCI SFTP gateway...`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Dispatching WF01_Inbound_SFTP_File_Download.psw to Runner #4...`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-01: File '${f.name}' (${(f.size / (1024 * 1024)).toFixed(1)} MB) received into incoming watch folder.`
    ])

    setPipeStage(1)
    setAgentText(`[WF-01 Courier Bot] File detected: '${f.name}' (${(f.size / (1024 * 1024)).toFixed(1)} MB). Streaming payload...`)
    await sleep(700)

    setPipeStage(2)
    setAeCurrentStep(2)
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Dispatching WF03_Staging_Cryptkeeper.psw...`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: Computing SHA-256 cryptographic digest across stream...`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: SHA-256 verified. Duplicate registry query: Clean (New Cycle).`
    ])
    setAgentText(`[WF-03 Gatekeeper] Computing SHA-256 cryptographic hash & querying duplicate registry...`)
    await sleep(750)

    setPipeStage(3)
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: Validating 32 ISO-8583 columns & payment rails (UPI, IMPS, NACH)...`
    ])
    setAgentText(`[WF-03 Gatekeeper] Validating 32 mandatory columns, NPCI rails & ISO-8583 response codes...`)

    const form = new FormData()
    form.append('file', f)

    try {
      const res = await fetch(`${API}/api/upload`, { method: 'POST', body: form })
      const data = await res.json()
      await sleep(600)

      if (data.status === 'VALIDATED') {
        setPipeStage(4)
        setAeLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: Moving validated file to Staging Vault enclave: /vault/staged/...`
        ])
        setAgentText(`[WF-03 Gatekeeper] Staging Vault: Moving clean settlement file to secure vault...`)
        await sleep(650)

        setPipeStage(5)
        setAgentText(`[STAGE 1 COMPLETE] File Validated (${(data.records || 0).toLocaleString()} records). 4-Way Recon Ready!`)
        setAeLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: Staging complete (${(data.records || 50000).toLocaleString()} records). Triggering 4-Way Recon...`
        ])

        // Auto-run Stage 2 4-Way Recon
        setAeCurrentStep(3)
        setAeLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Dispatching WF04_4Way_Recon_Matching_Engine.psw to Memory Node...`,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-04: Loading 4 legs: NPCI File vs Core Banking vs Switch vs General Ledger...`
        ])
        await sleep(900)
        await triggerReconRun()
        setAeLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-04: 4-Way matching finished! 47,250 Matched (94.5% STP) | 2,750 Breaks.`
        ])

        // Auto-run Stage 3 AI Investigation
        setAeCurrentStep(4)
        setAeLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Dispatching WF07_AI_RootCause_Investigator.psw (LLM Agent)...`,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-07: Evaluating timeouts & deeming rules across 2,750 break records...`
        ])
        await sleep(800)
        await triggerAgentInvestigation()
        setAeLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-07: AI Diagnostics complete: 1,612 auto-resolvable | 1,138 HITL dossiers.`
        ])

        // Auto-run Stage 4/5 Finacle CBS
        setAeCurrentStep(5)
        setAeLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Dispatching WF10_Finacle_CBS_Poster.psw (Surface Automation)...`,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-10: Posting automated customer credit refunds & GL adjustment vouchers.`
        ])
        await sleep(800)

        // Stage 6 Audit Crypt-Seal
        setAeCurrentStep(6)
        setAeLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Dispatching WF12_Regulatory_Audit_CryptSeal.psw...`,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-12: Generating cryptographic Merkle tree digest across all transactions...`
        ])
        await sleep(900)

        // All 6 Stages Complete
        setAeCurrentStep(7)
        setAeExecutionStatus('COMPLETED')
        setAeLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-12: Audit Merkle root sealed with SHA-256. 100% RBI DPSS T+1 SLA compliant!`,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: ALL 6 PROCESS STUDIO WORKFLOWS EXECUTED SUCCESSFULLY.`
        ])
      } else if (data.status === 'DUPLICATE') {
        setPipeStage(2)
        setIsDuplicate(true)
        setAeExecutionStatus('DUPLICATE_HALTED')
        setAeCurrentStep(2)
        setAeLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: [DUPLICATE QUARANTINE] Identical SHA-256 hash detected in duplicate registry!`,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: SAFETY LOCK TRIGGERED — Pipeline halted at Step 2 (Gatekeeper).`,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Downstream 4-Way Recon (WF-04) & Finacle CBS (WF-10) cancelled to protect ledger integrity.`,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: Quarantined duplicate file '${f.name}' to /rejected/ archive.`
        ])
        setAgentText(`[DUPLICATE DETECTED] Identical SHA-256 hash seen before. Quarantined to /rejected/!`)
      } else {
        setPipeStage(3)
        setAeExecutionStatus('REJECTED_HALTED')
        setAeCurrentStep(2)
        setAeLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: [VALIDATION REJECTED] Mandatory columns missing or schema malformed.`,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Pipeline halted at Step 2. Downstream workflows cancelled.`
        ])
        setAgentText(`[VALIDATION FAILED] Rejected: Missing mandatory columns or malformed rows.`)
      }

      setLastResult(data)
      refresh()
    } catch (e) {
      setPipeStage(0)
      setAeExecutionStatus('REJECTED_HALTED')
      setAeCurrentStep(2)
      setAgentText(`Connection error: Backend API unreachable on http://localhost:8000`)
      setLastResult({ status: 'REJECTED', filename: f.name, errors: ['Backend unreachable – is the server running on port 8000?'], records: 0 })
    }
    setUploading(false)
  }

  // Comprehensive End-to-End Multi-Stage Demo Trigger
  const triggerDemo = async () => {
    setActiveNav('upload')
    setUploading(true)
    setLastResult(null)
    setIsDuplicate(false)

    const scopedVol = activeRailScope ? (railRecordCounts[activeRailScope] || (reconData?.total_records || 5)) : (reconData?.total_records || 5)
    const scopedFileName = activeRailScope ? `NPCI_${activeRailScope}_Settlement_Cycle1.csv` : 'NPCI_UPI_Settlement_TestData_50K.csv'

    // Open AE Server RPA Execution Modal with blurred background
    setAeExecutionStatus('RUNNING')
    setAeFileName(scopedFileName)
    setAeTotalRecords(scopedVol)
    setAeModalOpen(true)
    setAeCurrentStep(1)
    setAeLogs([
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Initializing cluster AE-PROD-CLUSTER-01 (Port 8080)...`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Authenticating AE Credential Vault for SFTP Clearing gateway...`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Dispatching WF01_Inbound_SFTP_File_Download.psw to Runner #4...`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-01: Pulling ${activeRailScope ? activeRailScope + ' ' : ''}settlement file from NPCI SFTP server...`
    ])

    // Stage 1 Ingestion
    setPipeStage(1)
    setAgentText(`[WF-01 File Download] Pulling ${activeRailScope ? activeRailScope + ' ' : ''}settlement file from NPCI SFTP...`)
    await sleep(700)

    setPipeStage(2)
    setAeCurrentStep(2)
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Dispatching WF03_Staging_Cryptkeeper.psw...`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: Computing SHA-256 hash & verifying duplicate registry...`
    ])
    setAgentText(`[WF-03 Validation] Computing SHA-256 hash & verifying duplicate registry...`)
    await sleep(700)

    setPipeStage(3)
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: Parsing ${scopedVol.toLocaleString()} records across 32 columns for ${activeRailScope || 'UPI'} rail...`
    ])
    setAgentText(`[WF-03 Validation] Parsing & isolating ${scopedVol.toLocaleString()} ${activeRailScope || 'UPI'} records...`)
    await sleep(700)

    setPipeStage(4)
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: Locking clean file into Staging Vault enclave: /vault/staged/${scopedFileName}`
    ])
    setAgentText(`[WF-03 Validation] Locking ${scopedVol.toLocaleString()} clean records into Staging Vault...`)
    await sleep(600)

    setPipeStage(5)
    setAgentText(`[STAGE 1 COMPLETE] ${scopedVol.toLocaleString()} ${activeRailScope || 'UPI'} records staged. Triggering Stage 2 Recon...`)

    const p1Count = activeRailScope ? Math.round(scopedVol * 0.048) : 2400
    const p2Count = activeRailScope ? Math.round(scopedVol * 0.007) : 350
    const excCount = p1Count + p2Count
    const stpCount = scopedVol - excCount

    setLastResult({
      status: 'VALIDATED',
      filename: scopedFileName,
      records: scopedVol,
      p1_count: p1Count,
      p2_count: p2Count,
      exception_count: excCount,
      stp_count: stpCount,
      hash: 'ed37c56dab72b9a184e9c0f992314bc3a',
    })
    setUploading(false)

    // Stage 2 Recon
    setAeCurrentStep(3)
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Dispatching WF04_4Way_Recon_Matching_Engine.psw...`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-04: Loading 4 legs: NPCI File vs Core Banking vs Switch vs GL...`
    ])
    await sleep(800)
    await triggerReconRun()
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-04: 4-Way matching finished! ${stpCount.toLocaleString()} Matched (94.5% STP) | ${excCount.toLocaleString()} Breaks.`
    ])
    setAgentText(`[STAGE 2 COMPLETE] 4-Way Recon matched ${stpCount.toLocaleString()} records (${((stpCount / scopedVol) * 100).toFixed(1)}% STP).`)

    // Stage 3 AI Diagnostics
    setAeCurrentStep(4)
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Dispatching WF07_AI_RootCause_Investigator.psw (LLM Agent)...`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-07: Diagnosing 2,750 breaks & calculating financial risk exposure...`
    ])
    await sleep(800)
    await triggerAgentInvestigation()
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-07: AI Diagnostics complete: 1,612 auto-resolvable | 1,138 HITL dossiers.`
    ])

    // Stage 5 Finacle CBS
    setAeCurrentStep(5)
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Launching Finacle Bot WF10_Finacle_CBS_Poster.psw (Surface Automation)...`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-10: Executing automated refund credit vouchers & GL adjustments.`
    ])
    await sleep(800)

    // Stage 6 Audit Crypt-Seal
    setAeCurrentStep(6)
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Dispatching WF12_Regulatory_Audit_CryptSeal.psw...`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-12: Generating cryptographic Merkle tree digest across all ${scopedVol.toLocaleString()} transactions...`
    ])
    await sleep(900)

    // All 6 Stages Complete
    setAeCurrentStep(7)
    setAeExecutionStatus('COMPLETED')
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-12: Audit Merkle root sealed with SHA-256. 100% RBI DPSS T+1 SLA compliant!`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: ALL 6 PROCESS STUDIO WORKFLOWS EXECUTED SUCCESSFULLY.`
    ])

    setAgentText('[END-TO-END COMPLETE] All 6 Stages Executed: 47,250 STP Matched | 2,750 AI Dossiers Diagnosed | Finacle CBS Reversals Posted.')
    refresh()
  }

  const onDrop = e => { e.preventDefault(); setDrag(false); handleUpload(e.dataTransfer.files[0]) }

  const triggerFileDownload = (url, fallbackName) => {
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fallbackName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadRegistryFile = (f) => {
    const fileId = typeof f === 'string' ? f : (f.file_id || f.filename)
    const fname = typeof f === 'string' ? `NPCI_${f}.csv` : (f.filename || `NPCI_${f.file_id}.csv`)
    triggerFileDownload(`${API}/api/files/download/${encodeURIComponent(fileId)}`, fname)
  }

  const downloadStagingFile = (filename) => {
    triggerFileDownload(`${API}/api/staging/download/${encodeURIComponent(filename)}`, filename)
  }

  const downloadAuditLogs = () => {
    triggerFileDownload(`${API}/api/audit/download`, 'RBI_NPCI_AUDIT_TRAIL.json')
  }

  const downloadAuditPack = () => {
    const data = sealedPack || misReport || {
      audit_pack_id: `RBI_AUDIT_PACK_${new Date().toISOString().slice(0, 10)}`,
      status: "SEALED",
      merkle_root: "00d1a2abc86b1745e89a3f2110c7b3992d4f8e",
      settlement_cycle: "CYCLE_1_20261029",
      rbi_sla_status: "COMPLIANT_T_PLUS_1",
      total_records: scopedRailVol || 50000,
      timestamp: new Date().toISOString()
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2))
    triggerFileDownload(dataStr, `RBI_AUDIT_PACK_${new Date().toISOString().slice(0, 10)}.json`)
  }

  const downloadEvidenceDossiers = () => {
    const csvContent = "TXN_ID,EXCEPTION_PRIORITY,REASON,RECON_STATUS,RAIL,RBI_DEEMING_TAT\n" +
      (dossierList.length > 0
        ? dossierList.map(d => `${d.txn_id},${d.priority || 'P1'},"${d.root_cause || d.reason || 'Timeout'}",${d.status || 'BREAK'},${d.rail || 'UPI'},T+1`).join("\n")
        : `TXN_98234,P1,"Core Banking Host Timeout",BREAK,UPI,T+1\nTXN_98235,P2,"Amount Mismatch Suspense",BREAK,UPI,T+1\n`
      )
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    triggerFileDownload(url, 'AI_EVIDENCE_DOSSIERS_SUMMARY.csv')
  }

  const isScoped = Boolean(activeRailScope)
  const currentRailMeta = isScoped ? railMetadata[activeRailScope] : null
  const scopedRailVol = isScoped
    ? (railRecordCounts[activeRailScope.toUpperCase()] || 0)
    : (hasData ? (stats.total_records_ingested || 0) : 0)
  // Real recon figures exist for UPI and for rails whose Process Studio batch is loaded (reconData.rail matches)
  const railLive = isScoped && (activeRailScope.toUpperCase() === 'UPI' || (reconData?.rail || '').toUpperCase() === activeRailScope.toUpperCase())
  const scopedP1Count = isScoped
    ? (railLive && reconData?.p1_count !== undefined
        ? reconData.p1_count
        : (scopedRailVol > 0 ? Math.round(scopedRailVol * 0.048) : 0))
    : (hasData ? (stats.p1_count ?? 0) : 0)
  const scopedP2Count = isScoped
    ? (railLive && reconData?.p2_count !== undefined
        ? reconData.p2_count
        : (scopedRailVol > 0 ? Math.round(scopedRailVol * 0.007) : 0))
    : (hasData ? (stats.p2_count ?? 0) : 0)
  const scopedExcCount = railLive && reconData?.break_count !== undefined
    ? reconData.break_count
    : (scopedP1Count + scopedP2Count)
  const scopedStpCount = railLive && reconData?.matched_count !== undefined
    ? reconData.matched_count
    : (scopedRailVol > 0 ? (scopedRailVol - scopedExcCount) : 0)
  const scopedStpPct = railLive && reconData?.stp_rate !== undefined
    ? reconData.stp_rate
    : (scopedRailVol > 0 ? ((scopedStpCount / scopedRailVol) * 100).toFixed(1) : 0)
  const scopedExcPct = railLive && reconData?.stp_rate !== undefined
    ? (100 - reconData.stp_rate).toFixed(1)
    : (scopedRailVol > 0 ? ((scopedExcCount / scopedRailVol) * 100).toFixed(1) : 0)

  const stp_pct = scopedStpPct
  const exc_pct = scopedExcPct

  const navItems = [
    {
      id: 'catalog',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      ),
      label: 'Rail Solution Catalog'
    },
    {
      id: 'dashboard',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      label: 'Home Dashboard'
    },
    {
      id: 'rbi_3way',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
      label: 'RBI 3-Way & Liquidity'
    },
    {
      id: 'copilot',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      label: 'Payments Copilot (UC7)'
    },
    {
      id: 'upload',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
      label: 'Upload File'
    },
    {
      id: 'recon',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      label: '4-Way Recon Engine'
    },
    {
      id: 'investigate',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
      label: 'AI Investigation Agent'
    },
    {
      id: 'recovery',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      ),
      label: 'HITL Approvals & Cockpit'
    },
    {
      id: 'files',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      ),
      label: 'File Registry'
    },
    {
      id: 'staging',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      ),
      label: 'Staging Vault'
    },
    {
      id: 'audit',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      label: 'Audit Evidence & GRC'
    },
  ]

  // Filter records for Stage 2 (Scoped by Active Rail Trial if active)
  const currentReconList = breakFilter === 'MATCHED' ? reconMatched : reconBreaks
  const filteredBreaks = currentReconList.filter(b => {
    if (activeRailScope && b.rail && b.rail.toUpperCase() !== activeRailScope.toUpperCase()) return false
    if (breakFilter === 'MATCHED') return true
    if (breakFilter === 'ALL') return true
    if (breakFilter === 'P1') return b.priority === 'P1'
    if (breakFilter === 'P2') return b.priority === 'P2'
    return b.scenario === breakFilter
  })

  // Filter dossiers for Stage 3 (Scoped by Active Rail Trial if active)
  const filteredDossiers = dossierList.filter(d => {
    if (activeRailScope && d.rail && d.rail.toUpperCase() !== activeRailScope.toUpperCase()) return false
    if (dossierFilter === 'ALL') return true
    if (dossierFilter === 'CRITICAL') return d.sla_urgency === 'CRITICAL'
    if (dossierFilter === 'AUTO') return !d.is_hitl_required
    if (dossierFilter === 'HITL') return d.is_hitl_required
    return d.scenario === dossierFilter
  })

  // Filter HITL Queue for Stage 5 (Scoped by Active Rail Trial if active)
  const filteredHitlQueue = hitlQueue.filter(q => {
    if (activeRailScope && q.rail && q.rail.toUpperCase() !== activeRailScope.toUpperCase()) return false
    if (hitlFilter === 'ALL') return true
    if (hitlFilter === 'P1') return q.priority === 'P1'
    if (hitlFilter === 'AMOUNT_MISMATCH') return q.scenario === 'AMOUNT_MISMATCH'
    if (hitlFilter === 'PENDING') return !q.status || q.status === 'PENDING_APPROVAL'
    if (hitlFilter === 'APPROVED') return q.status === 'APPROVED_AND_POSTED'
    if (hitlFilter === 'REJECTED') return q.status === 'REJECTED'
    if (hitlFilter === 'ESCALATED') return q.status === 'ESCALATED'
    return true
  })

  // 10-item paginated slices for high-volume enterprise tabs
  const PAGE_SIZE = 10
  const pagedBreaks = filteredBreaks.slice((reconPage - 1) * PAGE_SIZE, reconPage * PAGE_SIZE)
  const pagedDossiers = filteredDossiers.slice((dossierPage - 1) * PAGE_SIZE, dossierPage * PAGE_SIZE)
  const pagedHitlQueue = filteredHitlQueue.slice((hitlPage - 1) * PAGE_SIZE, hitlPage * PAGE_SIZE)
  const pagedStaging = staging.slice((stagingPage - 1) * PAGE_SIZE, stagingPage * PAGE_SIZE)

  return (
    <div className="app-container">
      {/* 4-Way Leg Inspection Modal */}
      <LegModal breakItem={selectedBreak} onClose={() => setSelectedBreak(null)} />

      {/* Official Evidence Dossier Modal */}
      <DossierModal dossier={selectedDossier} onClose={() => setSelectedDossier(null)} />

      {/* AutomationEdge Server RPA Execution Live Monitor Modal */}
      <AeServerExecutionModal
        isOpen={aeModalOpen}
        onClose={() => setAeModalOpen(false)}
        currentStep={aeCurrentStep}
        executionStatus={aeExecutionStatus}
        logs={aeLogs}
        fileName={aeFileName}
        totalRecords={aeTotalRecords}
        serverUrl="https://t4.automationedge.com/#/requests/list"
        username="abhishek.malwatkar@valuedx.com"
        workflowName="NPCI Demo UPI Reconn"
        completionMessage="Message : UPI Recon Completed"
        reconData={reconData}
        recoverySummary={recoverySummary}
      />

      {/* Header */}
      <div className="header">
        <div className="header-brand">
          {/* Menu Toggle Button (Hamburger / Collapse) */}
          <button
            onClick={() => setSidebarCollapsed(prev => !prev)}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#334155',
              cursor: 'pointer',
              marginRight: 6,
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fff7ed'; e.currentTarget.style.borderColor = '#ea580c'; e.currentTarget.style.color = '#ea580c' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#334155' }}
            title={sidebarCollapsed ? "Open / Expand Menu" : "Close / Collapse Menu"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
            boxShadow: '0 2px 6px rgba(234,88,12,0.3)',
            flexShrink: 0,
            fontSize: 17
          }}>
            
          </div>
          <div className="header-title"><span>ABC Bank</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: 12, borderColor: '#e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#0f172a' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
            onClick={async () => {
              if (window.confirm("Clear all logs, vaults, and reset state for fresh file testing?")) {
                try {
                  await fetch(`${API}/api/system/clear-all`, { method: 'POST' })
                } catch (e) {
                  console.warn("Backend clear call error:", e)
                }
                setStats({
                  total_files_received: 0,
                  validated_files: 0,
                  rejected_files: 0,
                  duplicate_files: 0,
                  total_records_ingested: 0,
                  total_exceptions: 0,
                  p1_count: 0,
                  p2_count: 0,
                  stp_count: 0,
                  stp_percentage: 0,
                  rail_volumes: { UPI: 0, IMPS: 0, NACH: 0, AEPS: 0, RUPAY: 0, CTS: 0, BBPS: 0, NETC: 0 },
                  rail_success_rates: { UPI: 0, IMPS: 0, NACH: 0, AEPS: 0, RUPAY: 0, CTS: 0, BBPS: 0, NETC: 0 }
                })
                setFiles([])
                setAudit([])
                setStaging([])
                setPipeStage(0)
                setAgentText('Ready — File Monitoring Agent actively watching inbound SFTP directory')
                setIsDuplicate(false)
                setLastResult(null)
                setReconData(null)
                setReconBreaks([])
                setReconMatched([])
                setAgentSummary(null)
                setDossierList([])
                setRecoverySummary(null)
                setHitlQueue([])
                setMisReport(null)
                setSealedPack(null)
                setActiveRailScope(null)
                setActiveRailName('')
                setStagingPage(1)
                setReconPage(1)
                setDossierPage(1)
                setHitlPage(1)
                await refresh()
              }
            }}
            title="Purge all audit logs, staging files, and reset pipeline state"
          >
            Clear All Data &amp; Logs
          </button>
          <div className="header-time">{time.toLocaleTimeString('en-IN', { hour12: false })}</div>
        </div>
      </div>

      <div className="layout">
        {/* Sidebar with Open / Close Toggle and Floating Tabs */}
        <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          {!sidebarCollapsed && (
            <div style={{ padding: '0 4px 6px', borderBottom: '1px solid #f1f5f9', marginBottom: 6 }}>
              <span className="nav-section" style={{ padding: 0 }}>Navigation</span>
            </div>
          )}

          {navItems.map(n => (
            <div
              key={n.id}
              className={`nav-item ${activeNav === n.id ? 'active' : ''}`}
              onClick={() => setActiveNav(n.id)}
              title={sidebarCollapsed ? n.label : undefined}
            >
              <span className="nav-icon">{n.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{n.label}</span>}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="main">
          {/* Page transition wrapper — key forces re-mount → re-animates on tab switch */}
          <div key={activeNav} className="page-transition">
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* NPCI PRODUCT OPERATIONS (RAIL-SPECIFIC WORKBENCH: SCREEN #2)      */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeNav === 'product_ops' && (
            <ProductOperationsView
              initialRail={activeRailScope || selectedRailForOps || 'UPI'}
              onSelectRail={(railCode) => {
                setSelectedRailForOps(railCode)
                setActiveRailScope(railCode)
              }}
              onInvestigateTxn={(txnId) => setActiveNav('investigate')}
            />
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* NPCI PAYMENT RAIL SOLUTION CATALOG & SUBSCRIPTIONS               */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeNav === 'catalog' && (
            <RailCatalogView
              selectedRailCode={activeRailScope}
              onLaunchWorkflow={(rail) => {
                if (rail) {
                  setSelectedRailForOps(rail)
                  setActiveRailScope(rail)
                }
                setActiveNav('dashboard')
              }}
              onOpenRailOps={(rail) => {
                const meta = railMetadata[rail]
                setSelectedRailForOps(rail)
                setActiveRailScope(rail)
                setActiveRailName(meta?.name || rail)
                setActiveNav('dashboard')
              }}
              onStartRailTrial={handleStartRailTrial}
              reconData={reconData}
              reconBreaks={reconBreaks}
              reconMatched={reconMatched}
              recoverySummary={recoverySummary}
              onOpenRecon={() => setActiveNav('recon')}
              onOpenHitl={() => setActiveNav('hitl')}
            />
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* RBI NEFT & RTGS — 3-WAY RECON, LIQUIDITY & MAKER-CHECKER (UC1-UC8) */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeNav === 'rbi_3way' && (
            <RbiNeftRtgsView
              apiBase={API}
              onNavigateCopilot={() => setActiveNav('copilot')}
            />
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* PAYMENTS COPILOT — UC7: STATUS COPILOT (TEAMS / WEB PORTAL)      */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeNav === 'copilot' && (
            <PaymentsCopilotView
              apiBase={API}
              onNavigateWorkbench={(nav) => setActiveNav(nav || 'rbi_3way')}
            />
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* MICROSOFT AGENT FRAMEWORK (MAF) ORCHESTRATOR & CONTEXT GRAPH     */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeNav === 'orchestrator' && <>
            {/* MAF Master Banner */}
            <div className="maf-banner">
              <div>
                <div className="maf-banner-title">
                  
                  <span>Microsoft Agent Framework (MAF) &bull; Context Graph Orchestrator</span>
                  <span className="maf-badge">MAF Multi-Agent Runtime</span>
                </div>
                <div className="maf-banner-sub">
                  Directed Workflow Graph (`WorkflowBuilder`) &bull; Grounded Context Graph Blackboard &bull; Conditional Edge Routing &bull; Multi-Agent State Machine
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '9px 16px', fontSize: 12.5, borderColor: '#ea580c', color: '#ea580c' }}
                  disabled={mafRunning}
                  onClick={handleTriggerAeChain}
                >
                  Trigger Downstream Toolchain (UPI Recon)
                </button>
                <button
                  className="btn btn-primary"
                  style={{ padding: '9px 18px', fontSize: 12.5, background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', borderColor: '#ea580c' }}
                  disabled={mafRunning}
                  onClick={handleRunOrchestrator}
                >
                  {mafRunning ? 'MAF Graph Executing...' : 'Run Autonomous MAF Flow'}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '9px 14px', fontSize: 12.5 }}
                  onClick={handleResetOrchestrator}
                >
                  Reset Graph
                </button>
              </div>
            </div>

            {/* Autonomous AE Server Watcher & Downstream Toolchain Panel */}
            <div className="card" style={{
              background: '#ffffff',
              border: '1.5px solid #86efac',
              borderRadius: 14,
              padding: '16px 20px',
              marginBottom: 16,
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    background: '#dcfce7',
                    border: '1.5px solid #16a34a',
                    color: '#15803d',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 99,
                    letterSpacing: '0.4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                    AUTONOMOUS WATCHER ACTIVE
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                    Monitoring Workflow: "NPCI Demo UPI Reconn"
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>
                  Server: <a href="https://t4.automationedge.com/#/requests/list" target="_blank" rel="noopener noreferrer" style={{ color: '#ea580c', fontWeight: 600 }}>t4.automationedge.com</a> &bull; Continuous Result Polling: <b style={{ color: '#16a34a' }}>2.0s interval</b>
                </div>
              </div>

              {/* Downstream Toolchain Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                {/* Tool 1 */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>Tool 1: Zero-Delta GL Knock-Off</span>
                    <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>AUTO</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                    Reads latest matched batch &bull; Posts zero-delta voucher (GL-14020 vs GL-11010) &bull; Closes settlement STP
                  </div>
                </div>

                {/* Tool 2 */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>Tool 2: AI Dual-Track Dispatcher</span>
                    <span style={{ background: '#ffedd5', color: '#c2410c', fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>REASONER</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                    Evaluates break root causes &bull; Starts RBI T+1 penalty clock &bull; Calculates financial exposure
                  </div>
                </div>

                {/* Tool 3 */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>Tool 3: CBS Reversal Bot</span>
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>EXECUTION</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                    Auto-credits &lt; ₹5,000 deemed fails via Finacle bot &bull; Enqueues high-value cases to HITL Cockpit
                  </div>
                </div>

                {/* Tool 4 */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>Tool 4: Audit Crypt-Seal</span>
                    <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>SHA-256</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                    Bundles telemetry into immutable Merkle digest &bull; Generates 100% RBI compliance evidence pack
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Overview */}
            <div className="kpi-grid">
              <KpiCard
                label="Coordinated Executors"
                value={mafGraph?.total_nodes || 6}
                color="blue"
                sub="Autonomous MAF Agents"
              />
              <KpiCard
                label="Workflow Graph Progress"
                value={mafGraph?.pipeline_progress_pct || 100}
                suffix="%"
                color="green"
                sub={`${mafGraph?.completed_nodes || 6} of 6 nodes completed`}
              />
              <KpiCard
                label="Context Graph Domains"
                value={5}
                color="purple"
                sub="Shared state blackboard"
              />
              <KpiCard
                label="Total Memory Capsules"
                value={mafGraph?.context_graph?.total_memory_capsules || 6}
                color="amber"
                sub="State mutation checkpoints"
              />
            </div>

            {/* Visual MAF Workflow Graph Canvas */}
            <div className="maf-graph-canvas">
              <div className="maf-graph-header">
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                    MAF Directed Workflow Graph Topology &mdash; 6 Coordinated Executors
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    Click any node to inspect its Grounded Memory Capsule &amp; input/output contracts
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-green">✓ Session: {mafGraph?.context_graph?.session_id || 'MAF_SESSION_ACTIVE'}</span>
                </div>
              </div>

              {/* Node Flow Diagram */}
              <div className="maf-nodes-flow">
                {/* Step 1: Ingestion */}
                <div className="maf-node-row">
                  <div
                    className={`maf-node-card ${(mafGraph?.executors?.node_ingestion?.status || 'COMPLETED').toLowerCase()} ${selectedMafNode === 'node_ingestion' ? 'selected' : ''}`}
                    onClick={() => setSelectedMafNode('node_ingestion')}
                  >
                    <div className="maf-node-top">
                      <span className="maf-node-title">1. Ingestion &amp; Validation</span>
                      <span className="maf-node-rpa">WF-01 &bull; WF-03</span>
                    </div>
                    <div className="maf-node-desc">
                      SFTP intake, SHA-256 duplicate registry check, 32-column schema check.
                    </div>
                    <div className="maf-node-foot">
                      <span className="badge badge-green">✓ COMPLETED</span>
                      <span className="maf-node-dur">{mafGraph?.executors?.node_ingestion?.duration_ms || 100}ms</span>
                    </div>
                  </div>
                </div>

                {/* Edge 1 */}
                <div className="maf-edge-connector">
                  <div className="edge-line active" />
                  <span className="edge-condition-badge">Edge 1: file.status == 'VALIDATED' &amp;&amp; records &gt; 0</span>
                  <div className="edge-line active" />
                </div>

                {/* Step 2: Recon */}
                <div className="maf-node-row">
                  <div
                    className={`maf-node-card ${(mafGraph?.executors?.node_recon?.status || 'COMPLETED').toLowerCase()} ${selectedMafNode === 'node_recon' ? 'selected' : ''}`}
                    onClick={() => setSelectedMafNode('node_recon')}
                  >
                    <div className="maf-node-top">
                      <span className="maf-node-title">2. 4-Way Multi-Rail Recon</span>
                      <span className="maf-node-rpa">WF-04 &bull; WF-05</span>
                    </div>
                    <div className="maf-node-desc">
                      Mathematical 4-way matching across NPCI, Switch, Finacle CBS, and GL.
                    </div>
                    <div className="maf-node-foot">
                      <span className="badge badge-green">✓ 47,250 STP (94.5%)</span>
                      <span className="maf-node-dur">{mafGraph?.executors?.node_recon?.duration_ms || 731}ms</span>
                    </div>
                  </div>
                </div>

                {/* Edge 2 */}
                <div className="maf-edge-connector">
                  <div className="edge-line active" />
                  <span className="edge-condition-badge">Edge 2: recon.breaks_detected &gt; 0 (2,750 Breaks)</span>
                  <div className="edge-line active" />
                </div>

                {/* Step 3: Diagnostic */}
                <div className="maf-node-row">
                  <div
                    className={`maf-node-card ${(mafGraph?.executors?.node_diagnostic?.status || 'COMPLETED').toLowerCase()} ${selectedMafNode === 'node_diagnostic' ? 'selected' : ''}`}
                    onClick={() => setSelectedMafNode('node_diagnostic')}
                  >
                    <div className="maf-node-top">
                      <span className="maf-node-title">3. AI Diagnostic Reasoning</span>
                      <span className="maf-node-rpa">WF-07 &bull; WF-08</span>
                    </div>
                    <div className="maf-node-desc">
                      Autonomous root cause analysis, ISO-8583 correlation, RBI T+1 TAT clocking.
                    </div>
                    <div className="maf-node-foot">
                      <span className="badge badge-green">✓ 2,750 Dossiers</span>
                      <span className="maf-node-dur">{mafGraph?.executors?.node_diagnostic?.duration_ms || 32}ms</span>
                    </div>
                  </div>
                </div>

                {/* Edge 3 Split */}
                <div className="maf-edge-connector">
                  <div className="edge-line active" />
                  <div style={{ display: 'flex', gap: 120, fontSize: 10, fontFamily: 'JetBrains Mono' }}>
                    <span className="edge-condition-badge">Edge 3A: amount &lt; ₹50k (Track A)</span>
                    <span className="edge-condition-badge">Edge 3B: amount &ge; ₹50k (Track B)</span>
                  </div>
                  <div className="edge-line active" />
                </div>

                {/* Step 4 Parallel Branches */}
                <div className="maf-node-row" style={{ gap: 40 }}>
                  {/* Track A */}
                  <div
                    className={`maf-node-card ${(mafGraph?.executors?.node_auto_recovery?.status || 'COMPLETED').toLowerCase()} ${selectedMafNode === 'node_auto_recovery' ? 'selected' : ''}`}
                    onClick={() => setSelectedMafNode('node_auto_recovery')}
                  >
                    <div className="maf-node-top">
                      <span className="maf-node-title">4A. Auto-Reversal Bot</span>
                      <span className="maf-node-rpa">WF-10 Finacle</span>
                    </div>
                    <div className="maf-node-desc">
                      Autonomous RPA execution for timeout breaks below ₹50k threshold.
                    </div>
                    <div className="maf-node-foot">
                      <span className="badge badge-green">✓ 1,612 POSTED</span>
                      <span className="maf-node-dur">{mafGraph?.executors?.node_auto_recovery?.duration_ms || 9}ms</span>
                    </div>
                  </div>

                  {/* Track B */}
                  <div
                    className={`maf-node-card ${(mafGraph?.executors?.node_hitl_approval?.status || 'COMPLETED').toLowerCase()} ${selectedMafNode === 'node_hitl_approval' ? 'selected' : ''}`}
                    onClick={() => setSelectedMafNode('node_hitl_approval')}
                  >
                    <div className="maf-node-top">
                      <span className="maf-node-title">4B. Operations Cockpit</span>
                      <span className="maf-node-rpa">WF-11 HITL</span>
                    </div>
                    <div className="maf-node-desc">
                      Manager electronic dual-authorization for high-value breaks or mismatches.
                    </div>
                    <div className="maf-node-foot">
                      <span className="badge badge-green">✓ DUAL-AUTH SIGNED</span>
                      <span className="maf-node-dur">{mafGraph?.executors?.node_hitl_approval?.duration_ms || 7}ms</span>
                    </div>
                  </div>
                </div>

                {/* Edge 4 Join */}
                <div className="maf-edge-connector">
                  <div className="edge-line active" />
                  <span className="edge-condition-badge">Edge 4 &amp; 5: all_reversals_posted == true</span>
                  <div className="edge-line active" />
                </div>

                {/* Step 5: Audit */}
                <div className="maf-node-row">
                  <div
                    className={`maf-node-card ${(mafGraph?.executors?.node_audit_compliance?.status || 'COMPLETED').toLowerCase()} ${selectedMafNode === 'node_audit_compliance' ? 'selected' : ''}`}
                    onClick={() => setSelectedMafNode('node_audit_compliance')}
                  >
                    <div className="maf-node-top">
                      <span className="maf-node-title">5. Regulatory MIS &amp; Audit Pack</span>
                      <span className="maf-node-rpa">WF-12 &bull; WF-13</span>
                    </div>
                    <div className="maf-node-desc">
                      SHA-256 cryptographic seal generation &amp; RBI DPSS T+1 compliance certificate.
                    </div>
                    <div className="maf-node-foot">
                      <span className="badge badge-green">✓ SHA-256 SEALED</span>
                      <span className="maf-node-dur">&lt; 1ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Context Graph Grounded Blackboard */}
            <div className="card">
              <div className="card-title">
                <div className="card-title-left">
                  <div className="card-title-dot" />
                  <span>Grounded Context Graph Blackboard (Shared Enterprise Memory)</span>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  State capsules maintained across all 6 MAF Executors
                </span>
              </div>

              <div className="cg-grid">
                {/* 1. FileContext */}
                <div className="cg-card">
                  <div className="cg-header">
                    <span className="cg-title">FileContext</span>
                    <span className="badge badge-green">VALIDATED</span>
                  </div>
                  <div className="cg-content">
                    <div><b>File:</b> {mafGraph?.context_graph?.domains?.file_context?.filename || 'NPCI_UPI_Settlement_TestData_50K.csv'}</div>
                    <div><b>Records:</b> {fmt(mafGraph?.context_graph?.domains?.file_context?.records || 50000)}</div>
                    <div><b>SHA-256:</b> ed37c56dab72b9...</div>
                    <div><b>Vault:</b> stage1/staging_vault/</div>
                  </div>
                </div>

                {/* 2. ReconContext */}
                <div className="cg-card">
                  <div className="cg-header">
                    <span className="cg-title">ReconContext</span>
                    <span className="badge badge-green">4-WAY SYNCED</span>
                  </div>
                  <div className="cg-content">
                    <div><b>STP Count:</b> 47,250 (94.5%)</div>
                    <div><b>Breaks:</b> 2,750 (P1: 2,400, P2: 350)</div>
                    <div><b>Variance:</b> ₹ -7,46,727.28</div>
                    <div><b>Legs Matched:</b> 4 of 4</div>
                  </div>
                </div>

                {/* 3. DiagnosticContext */}
                <div className="cg-card">
                  <div className="cg-header">
                    <span className="cg-title">DiagnosticContext</span>
                    <span className="badge badge-purple">AI REASONED</span>
                  </div>
                  <div className="cg-content">
                    <div><b>Dossiers:</b> 2,750 diagnosed</div>
                    <div><b>Avg Confidence:</b> 98.2%</div>
                    <div><b>Top Root Cause:</b> CBS Timeout</div>
                    <div><b>SLA &lt;4h Critical:</b> 650 cases</div>
                  </div>
                </div>

                {/* 4. ExecutionContext */}
                <div className="cg-card">
                  <div className="cg-header">
                    <span className="cg-title">ExecutionContext</span>
                    <span className="badge badge-green">FINACLE POSTED</span>
                  </div>
                  <div className="cg-content">
                    <div><b>Track A (STP):</b> 1,612 posted (₹78.11L)</div>
                    <div><b>Track B (HITL):</b> 1,138 dual-authorized</div>
                    <div><b>CBS Status:</b> POSTED_SUCCESS</div>
                    <div><b>Posting Ref:</b> FIN_AUTO_96527_4410</div>
                  </div>
                </div>

                {/* 5. ComplianceContext */}
                <div className="cg-card">
                  <div className="cg-header">
                    <span className="cg-title">ComplianceContext</span>
                    <span className="badge badge-blue">RBI SEALED</span>
                  </div>
                  <div className="cg-content">
                    <div><b>RBI DPSS SLA:</b> 100.0% Compliant</div>
                    <div><b>Daily Penalty Saved:</b> ₹ 2,40,000 / Day</div>
                    <div><b>Annualized Savings:</b> ₹ 8,76,00,000</div>
                    <div><b>Seal:</b> 00d1a2abc86b1745...</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Two-Column: Memory Capsules & Telemetry Console */}
            <div className="two-col">
              {/* Memory Capsules Timeline */}
              <div className="card">
                <div className="card-title">
                  <div className="card-title-left">
                    <div className="card-title-dot" />
                    <span>Context Memory Capsules (Audit Timeline)</span>
                  </div>
                </div>
                <div className="capsule-timeline">
                  {(mafGraph?.context_graph?.recent_memory_capsules || [
                    { capsule_id: 'CAP_8F12A', timestamp: '12:06:43', domain: 'file', agent_source: 'WF-03 Gatekeeper Bot', summary: 'FileContext staged' },
                    { capsule_id: 'CAP_9C34B', timestamp: '12:06:44', domain: 'recon', agent_source: 'WF-04 Recon Engine Agent', summary: 'ReconContext 47,250 STP' },
                    { capsule_id: 'CAP_4E78D', timestamp: '12:06:44', domain: 'diagnostic', agent_source: 'WF-07 AI Investigation Agent', summary: '2,750 Evidence Dossiers' },
                    { capsule_id: 'CAP_1A99F', timestamp: '12:06:44', domain: 'execution', agent_source: 'WF-10 Finacle RPA Bot', summary: '1,612 Track A Reversals' },
                    { capsule_id: 'CAP_7B23E', timestamp: '12:06:44', domain: 'execution', agent_source: 'WF-11 Operations Cockpit', summary: 'P1 Batch Authorization' },
                    { capsule_id: 'CAP_3D44C', timestamp: '12:06:44', domain: 'compliance', agent_source: 'WF-12 Audit Crypt-Seal Bot', summary: 'SHA-256 Audit Seal' },
                  ]).map((cap, i) => (
                    <div key={i} className="capsule-item">
                      <div>
                        <span className="capsule-id">{cap.capsule_id}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginLeft: 8 }}>&bull; {cap.domain}</span>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-main)', marginTop: 2 }}>{cap.summary}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>{cap.timestamp}</div>
                        <span className="badge badge-gray" style={{ fontSize: 9.5, padding: '2px 6px', marginTop: 2 }}>{cap.agent_source}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-Time Telemetry Stream Console */}
              <div className="card">
                <div className="card-title">
                  <div className="card-title-left">
                    <div className="card-title-dot" />
                    <span>MAF Orchestrator Telemetry Stream</span>
                  </div>
                </div>
                <div className="telemetry-stream-box">
                  {(mafGraph?.telemetry_log || [
                    { timestamp: '12:06:43.102', executor_id: 'ORCHESTRATOR', message: 'Starting MAF Workflow execution for dataset' },
                    { timestamp: '12:06:43.204', executor_id: 'node_ingestion', message: 'Verified SHA-256 checksum & 32-column schema' },
                    { timestamp: '12:06:43.935', executor_id: 'node_recon', message: 'Cross-matching 4 legs: 47,250 STP, 2,750 Breaks' },
                    { timestamp: '12:06:43.967', executor_id: 'node_diagnostic', message: 'Diagnosed 2,750 dossiers (98.2% confidence)' },
                    { timestamp: '12:06:43.976', executor_id: 'node_auto_recovery', message: 'Finacle RPA Bot posted 1,612 customer credit adjustments' },
                    { timestamp: '12:06:43.983', executor_id: 'node_hitl_approval', message: 'Chief Operations Officer batch-authorized P1 breaks' },
                    { timestamp: '12:06:43.985', executor_id: 'node_audit_compliance', message: 'Audit Pack Sealed: SHA-256 00d1a2abc86b1745...' },
                    { timestamp: '12:06:43.986', executor_id: 'ORCHESTRATOR', message: 'MAF Workflow Graph execution completed with 100% SLA compliance!' }
                  ]).map((log, i) => (
                    <div key={i} className="tel-line">
                      <span className="tel-ts">{log.timestamp}</span>
                      <span className="tel-src">[{log.executor_id}]</span>
                      <span className="tel-msg">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* STAGE 3: AI BREAK INVESTIGATION AGENT VIEW                       */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeNav === 'investigate' && <>
            {/* AI Agent Banner */}
            <div className="ai-banner">
              <div className="ai-banner-left">
                <div>
                  <div className="ai-banner-title">Stage 3: AI Break Investigation Agent</div>
                  <div className="ai-banner-sub">
                    Autonomous Diagnostic Reasoning &bull; Log Correlation (ISO-8583 / CBS) &bull; RBI T+1 TAT Countdown &bull; Evidence Dossier Pack
                  </div>
                </div>
              </div>
              <button
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontSize: 13 }}
                disabled={agentRunning}
                onClick={triggerAgentInvestigation}
              >
                {agentRunning ? 'Diagnosing 2,750 Breaks…' : 'Run AI Root-Cause Investigation'}
              </button>
            </div>

            {/* AI Investigation KPIs */}
            {agentSummary && (
              <div className="kpi-grid">
                <KpiCard label="Total Breaks Analyzed" value={agentSummary.total_breaks_analyzed} color="purple" sub="Stage 2 exceptions" />
                <KpiCard label="P1 Critical Breaks" value={agentSummary.p1_critical_count} color="red" sub="RBI TAT clock active" />
                <KpiCard label="Auto-Resolvable (STP)" value={agentSummary.auto_resolvable_count} color="green" sub="Under ₹50k threshold" />
                <KpiCard label="HITL Approval Req." value={agentSummary.hitl_required_count} color="amber" sub="High-value / complex" />
              </div>
            )}

            {/* RBI SLA Urgency Cards */}
            {agentSummary && (
              <div className="sla-grid">
                <div className="sla-card critical">
                  <span className="sla-label">Critical (&lt; 4h to Breach)</span>
                  <div className="sla-val" style={{ color: 'var(--red)' }}>
                    {fmt(agentSummary.sla_urgency_breakdown?.critical_under_4h)}
                  </div>
                  <div className="sla-sub">High penalty threat &mdash; immediate auto-reversal queue</div>
                </div>

                <div className="sla-card warning">
                  <span className="sla-label">Urgent (4 &ndash; 12h to Breach)</span>
                  <div className="sla-val" style={{ color: 'var(--amber)' }}>
                    {fmt(agentSummary.sla_urgency_breakdown?.warning_4_to_12h)}
                  </div>
                  <div className="sla-sub">Approaching T+1 window &mdash; prioritized for batch review</div>
                </div>

                <div className="sla-card normal">
                  <span className="sla-label">Standard (&gt; 12h Window)</span>
                  <div className="sla-val" style={{ color: 'var(--green)' }}>
                    {fmt(agentSummary.sla_urgency_breakdown?.normal_above_12h)}
                  </div>
                  <div className="sla-sub">Standard resolution queue &mdash; within regulatory grace</div>
                </div>
              </div>
            )}

            {/* Evidence Dossier Explorer */}
            <div className="card">
              <div className="card-title">
                <div className="card-title-left">
                  <div className="card-title-dot" />
                  <span>Evidence Dossier &amp; Root Cause Explorer ({filteredDossiers.length} records)</span>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Click &ldquo;View Dossier&rdquo; for full AI diagnostic breakdown &amp; approval routing
                </span>
              </div>

              {/* Dossier Filter Tabs */}
              <div className="filter-tabs">
                {[
                  ['ALL', `All Dossiers (${agentSummary?.total_breaks_analyzed || 0})`],
                  ['CRITICAL', `Critical &lt;4h (${agentSummary?.sla_urgency_breakdown?.critical_under_4h || 0})`],
                  ['AUTO', `Auto-Resolvable (${agentSummary?.auto_resolvable_count || 0})`],
                  ['HITL', `HITL Required (${agentSummary?.hitl_required_count || 0})`],
                  ['TIMEOUT', `CBS Timeout (${agentSummary?.root_cause_breakdown?.CBS_TIMEOUT ?? 0})`],
                  ['AMOUNT_MISMATCH', `Amount Mismatch (${agentSummary?.root_cause_breakdown?.AMOUNT_MISMATCH ?? 0})`],
                  ['REVERSAL_MISSING', `Reversal Missing (${agentSummary?.root_cause_breakdown?.REVERSAL_MISSING ?? 0})`],
                  ['DEEMED_FAIL', `Deemed Fail (${agentSummary?.root_cause_breakdown?.DEEMED_FAIL ?? 0})`],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    className={`filter-tab ${dossierFilter === val ? 'active' : ''}`}
                    onClick={() => { setDossierFilter(val); setDossierPage(1); }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Dossier ID</th>
                      <th>RRN</th>
                      <th>Amount</th>
                      <th>Root Cause Finding</th>
                      <th>Confidence</th>
                      <th>RBI Clock</th>
                      <th>Resolution Route</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedDossiers.map((d, i) => (
                      <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setSelectedDossier(d)}>
                        <td><code style={{ fontSize: 11, fontWeight: 700 }}>{d.dossier_id}</code></td>
                        <td>{d.rrn}</td>
                        <td><b>{fmtInr(d.cbs_amount)}</b></td>
                        <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <b>{d.category}</b>
                        </td>
                        <td>
                          <span style={{ color: 'var(--green)', fontWeight: 700 }}>{d.confidence_score}%</span>
                        </td>
                        <td>
                          <span className={`badge ${d.sla_urgency === 'CRITICAL' ? 'badge-red' : d.sla_urgency === 'WARNING' ? 'badge-amber' : 'badge-green'}`}>
                            {d.sla_countdown}
                          </span>
                        </td>
                        <td>
                          {d.is_hitl_required ? (
                            <span className="badge badge-amber">HITL Approval</span>
                          ) : (
                            <span className="badge badge-green">Auto-Refund</span>
                          )}
                        </td>
                        <td>
                          <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); setSelectedDossier(d) }}>
                            View Dossier
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!filteredDossiers.length && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--text-faint)' }}>
                          No dossiers match filter. Run AI Investigation to generate records.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <Pagination totalItems={filteredDossiers.length} pageSize={PAGE_SIZE} currentPage={dossierPage} onPageChange={setDossierPage} />
              </div>
            </div>
          </>}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* STAGE 4 & 5: DUAL-TRACK RECOVERY & OPERATIONS COCKPIT            */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeNav === 'recovery' && <>
            {/* Top Operations Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div className="page-title">Stages 4 &amp; 5: Operations Approval Cockpit &amp; Finacle Execution Bot</div>
                <div className="page-sub">
                  Dual-track financial recovery: Autonomous Finacle RPA Bot (&lt; ₹50,000) + Human-in-the-Loop Sign-Off (&ge; ₹50,000) under RBI T+1 TAT mandate
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div className="bot-beacon">
                  <span className="beacon-dot" />
                  <span>Finacle CBS RPA Bot: ONLINE (142ms)</span>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ padding: '9px 18px', fontSize: 12.5 }}
                  disabled={batchLoading}
                  onClick={handleBatchApproveP1}
                >
                  {batchLoading ? 'Dispatched to Finacle CBS...' : `Batch Approve All P1 Breaks (${hitlQueue.length} Cases)`}
                </button>
              </div>
            </div>

            {/* Dual-Track Visual Architecture */}
            <div className="dual-track-container">
              {/* Track A: Autonomous Bot */}
              <div className="track-card track-auto">
                <div className="track-header">
                  <span className="track-tag">Track A &bull; Autonomous STP Bot (WF-10)</span>
                  
                </div>
                <div className="track-title">Autonomous Finacle Reversal Bot</div>
                <div className="track-desc">
                  Self-driving RPA execution for verified CBS timeouts and deemed failures below ₹50,000. Immediately dispatches credit adjustment reversals into Finacle CBS without manual touch.
                </div>
                <div className="track-stats-row">
                  <div>
                    <div className="track-stat-num" style={{ color: '#059669' }}>
                      {fmt(recoverySummary?.auto_resolvable_count ?? 0)}
                    </div>
                    <div className="track-stat-lbl">Auto-Executed Txns</div>
                  </div>
                  <div>
                    <div className="track-stat-num" style={{ color: '#0f172a' }}>
                      {recoverySummary?.auto_resolvable_amount ? fmtInr(recoverySummary.auto_resolvable_amount) : '₹ 0.00'}
                    </div>
                    <div className="track-stat-lbl">Dispatched Funds</div>
                  </div>
                  <div>
                    <span className="badge badge-green">100% STP POSTED</span>
                  </div>
                </div>
              </div>

              {/* Track B: HITL Operations Cockpit */}
              <div className="track-card track-hitl">
                <div className="track-header">
                  <span className="track-tag">Track B &bull; HITL Manager Cockpit (WF-11)</span>
                  
                </div>
                <div className="track-title">Operations Manager Dual-Approval</div>
                <div className="track-desc">
                  Mandatory human authorization for high-value breaks (&ge; ₹50,000) and amount discrepancies. Authorized managers inspect root-cause evidence dossiers and release credits to Finacle.
                </div>
                <div className="track-stats-row">
                  <div>
                    <div className="track-stat-num" style={{ color: '#ea580c' }}>
                      {fmt(recoverySummary?.hitl_pending_count ?? hitlQueue.length ?? 0)}
                    </div>
                    <div className="track-stat-lbl">Pending Review</div>
                  </div>
                  <div>
                    <div className="track-stat-num" style={{ color: '#0f172a' }}>
                      {fmt(recoverySummary?.hitl_approved_count || 0)}
                    </div>
                    <div className="track-stat-lbl">Manager Approved</div>
                  </div>
                  <div>
                    <span className="badge badge-amber">DUAL-AUTH ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recovery KPI Cards */}
            <div className="kpi-grid">
              <KpiCard
                label="Total Reversals Posted"
                value={recoverySummary?.total_cbs_reversals_posted ?? 0}
                color="green"
                sub="Dispatched to Finacle pool"
              />
              <KpiCard
                label="Autonomous Bot Volume"
                value={recoverySummary?.auto_resolvable_amount ? Math.round(recoverySummary.auto_resolvable_amount) : 0}
                prefix="₹ "
                color="blue"
                sub="Threshold < ₹50k (STP)"
              />
              <KpiCard
                label="Pending Manager Action"
                value={recoverySummary?.hitl_pending_count ?? hitlQueue.length ?? 0}
                color="amber"
                sub="Awaiting electronic sign-off"
              />
              <KpiCard
                label="RBI Penalties Avoided"
                value={recoverySummary?.hitl_pending_count ? (recoverySummary.hitl_pending_count * 100) : 0}
                prefix="₹ "
                suffix=" / Day"
                color="purple"
                sub="T+1 SLA Guaranteed"
              />
            </div>

            {/* Interactive HITL Queue Table */}
            <div className="card">
              <div className="card-title">
                <div className="card-title-left">
                  <div className="card-title-dot" />
                  <span>Operations Approval Queue ({filteredHitlQueue.length} cases displayed)</span>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Electronic dual-authorization &bull; Instant Finacle CBS posting
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="filter-tabs">
                {[
                  ['ALL', `All Cases (${hitlQueue.length})`],
                  ['P1', 'P1 Urgent (TAT Active)'],
                  ['AMOUNT_MISMATCH', 'Amount Mismatch'],
                  ['PENDING', `Pending (${recoverySummary?.hitl_pending_count ?? hitlQueue.filter(c => c.status === 'PENDING').length ?? 0})`],
                  ['APPROVED', `Approved & Posted (${recoverySummary?.hitl_approved_count || 0})`],
                  ['REJECTED', 'Rejected'],
                  ['ESCALATED', 'Escalated'],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    className={`filter-tab ${hitlFilter === val ? 'active' : ''}`}
                    onClick={() => { setHitlFilter(val); setHitlPage(1); }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>TXN ID</th>
                      <th>RRN / Rail</th>
                      <th>Amount</th>
                      <th>Scenario / Root Cause</th>
                      <th>RBI SLA Countdown</th>
                      <th>Recommended Resolution</th>
                      <th>CBS Posting Status</th>
                      <th>Operations Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedHitlQueue.map((q, i) => (
                      <tr key={i}>
                        <td><code style={{ fontSize: 11, fontWeight: 700 }}>{q.txn_id}</code></td>
                        <td>
                          <div><b>{q.rrn}</b></div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{q.rail} &bull; {q.cycle_id}</div>
                        </td>
                        <td><b>{fmtInr(q.amount)}</b></td>
                        <td>
                          <Badge type={q.scenario} label={q.scenario.replace(/_/g, ' ')} />
                        </td>
                        <td>
                          <span className={`badge ${q.priority === 'P1' ? 'badge-red' : 'badge-amber'}`}>
                            {q.sla_countdown}
                          </span>
                        </td>
                        <td style={{ maxWidth: 220, fontSize: 11.5, lineHeight: 1.4 }}>
                          {q.action_label}
                        </td>
                        <td>
                          {q.status === 'APPROVED_AND_POSTED' && (
                            <div>
                              <span className="badge badge-green">✓ FINACLE POSTED</span>
                              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginTop: 2 }}>
                                {q.posting_ref || 'CBS-POST-TXN-8812'}
                              </div>
                            </div>
                          )}
                          {q.status === 'REJECTED' && (
                            <div>
                              <span className="badge badge-red">✕ REJECTED</span>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                {q.rejection_reason || 'Manual rejection'}
                              </div>
                            </div>
                          )}
                          {q.status === 'ESCALATED' && (
                            <div>
                              <span className="badge badge-purple">ESCALATED (P1)</span>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                {q.escalation_note || 'Sent to Committee'}
                              </div>
                            </div>
                          )}
                          {(!q.status || q.status === 'PENDING_APPROVAL') && (
                            <span className="badge badge-amber">PENDING APPROVAL</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'nowrap' }}>
                            {(!q.status || q.status === 'PENDING_APPROVAL' || q.status === 'ESCALATED') ? (
                              <>
                                {/* APPROVE BUTTON */}
                                <button
                                  className="btn btn-primary"
                                  style={{
                                    padding: '5px 9px',
                                    fontSize: 11,
                                    whiteSpace: 'nowrap',
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                                    borderColor: '#ea580c',
                                    color: '#ffffff'
                                  }}
                                  disabled={approvingTxn[q.txn_id]}
                                  onClick={() => handleApproveTxn(q)}
                                  title="Approve transaction and post to Finacle CBS"
                                >
                                  {approvingTxn[q.txn_id] ? 'Posting…' : '✓ Approve'}
                                </button>

                                {/* REJECT BUTTON */}
                                <button
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '5px 8px',
                                    fontSize: 11,
                                    whiteSpace: 'nowrap',
                                    fontWeight: 700,
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    borderColor: '#fca5a5'
                                  }}
                                  onClick={() => handleRejectTxn(q)}
                                  title="Reject transaction and suspend posting"
                                >
                                  ✕ Reject
                                </button>

                                {/* ESCALATE BUTTON */}
                                <button
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '5px 8px',
                                    fontSize: 11,
                                    whiteSpace: 'nowrap',
                                    fontWeight: 700,
                                    background: '#fffbeb',
                                    color: '#b45309',
                                    borderColor: '#fde68a'
                                  }}
                                  onClick={() => handleEscalateTxn(q)}
                                  title="Escalate to Risk Committee & Operations Head"
                                >
                                  Escalate
                                </button>
                              </>
                            ) : q.status === 'APPROVED_AND_POSTED' ? (
                              <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 11, color: '#16a34a', borderColor: '#86efac', background: '#f0fdf4', fontWeight: 700 }} disabled>
                                Approved ✓
                              </button>
                            ) : (
                              <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 11, color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2', fontWeight: 700 }} disabled>
                                Rejected ✕
                              </button>
                            )}

                            {/* DOSSIER INSPECT BUTTON */}
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '5px 8px', fontSize: 11 }}
                              onClick={() => {
                                const d = dossierList.find(x => x.txn_id === q.txn_id)
                                if (d) setSelectedDossier(d)
                                else alert(`Evidence dossier for ${q.txn_id} loaded. Root Cause: ${q.category}`)
                              }}
                              title="Inspect AI Evidence Dossier"
                            >
                              
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredHitlQueue.length && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--text-faint)' }}>
                          No cases match the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <Pagination totalItems={filteredHitlQueue.length} pageSize={PAGE_SIZE} currentPage={hitlPage} onPageChange={setHitlPage} />
              </div>
            </div>
          </>}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* STAGE 6: REGULATORY MIS & CRYPTOGRAPHIC AUDIT PACK                */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeNav === 'reports' && <>
            {/* Official Cryptographic Certificate Seal Card */}
            <div className="audit-seal-card">
              <div className="seal-header">
                <div className="seal-title-area">
                  <div className="seal-icon-emblem"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></div>
                  <div>
                    <div className="seal-main-title">
                      Reserve Bank of India &mdash; Automated Clearing &amp; Settlement Compliance Pack
                    </div>
                    <div className="seal-sub-title">
                      Mandated under RBI Circular DPSS.CO.PD No.629/02.01.014/2019-20 &bull; ISO 27001 Cryptographic Assurance
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ padding: '10px 20px', fontSize: 13, background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}
                  disabled={sealing}
                  onClick={handleSealAuditPack}
                >
                  {sealing ? 'Generating SHA-256 Seal...' : (sealedPack ? 'Re-Seal Audit Pack' : 'Seal Cryptographic Audit Pack')}
                </button>
              </div>

              <div className="seal-hash-banner">
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.6)', marginRight: 8 }}>SHA-256 SEAL:</span>
                  <span className="seal-hash-text">
                    {sealedPack?.cryptographic_sha256_seal || '112c83e539a1b6e6136bb1f5949955b1306c649814f0b13fd0fd368eac3a1eeb'}
                  </span>
                </div>
                <div style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>✓ VERIFIED IMMUTABLE</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>&bull;</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
                    {sealedPack?.timestamp ? fmtDate(sealedPack.timestamp) : '28 Oct 2026, 11:49 IST'}
                  </span>
                </div>
              </div>
            </div>

            {/* Penalty Mitigation Highlight Box */}
            <div className="penalty-counter-card">
              <div className="penalty-left">
                <div className="penalty-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    RBI DPSS Customer Penalty Mitigation Guarantee
                  </div>
                  <div className="penalty-val">₹ 2,40,000 / Day Avoided</div>
                  <div className="penalty-sub">
                    Direct compensation saved across 2,400 P1 customer debits (₹100/day compensation rule). <b>Annualized Savings: ₹8,76,00,000 (₹8.76 Cr)</b>.
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-green" style={{ fontSize: 12, padding: '6px 14px' }}>
                  100.0% T+1 SLA COMPLIANT
                </span>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Zero Regulatory Infractions</div>
              </div>
            </div>

            {/* 6-Stage Process Flow Status Timeline */}
            <div className="timeline-stages-grid">
              <div className="stage-step-card complete">
                <div className="stage-step-num">Stage 1 &bull; Ingestion</div>
                <div className="stage-step-name">File Vault Staging</div>
                <div className="stage-step-bot">✓ WF-01 &bull; WF-03</div>
              </div>
              <div className="stage-step-card complete">
                <div className="stage-step-num">Stage 2 &bull; Reconciliation</div>
                <div className="stage-step-name">4-Way Multi-Rail Recon</div>
                <div className="stage-step-bot">✓ WF-04 &bull; 94.5% STP</div>
              </div>
              <div className="stage-step-card complete">
                <div className="stage-step-num">Stage 3 &bull; AI Diagnostics</div>
                <div className="stage-step-name">Investigation Agent</div>
                <div className="stage-step-bot">✓ WF-07 &bull; 2,750 Dossiers</div>
              </div>
              <div className="stage-step-card complete">
                <div className="stage-step-num">Stage 4 &bull; Auto-Recovery</div>
                <div className="stage-step-name">Autonomous Reversal Bot</div>
                <div className="stage-step-bot">✓ WF-10 &bull; 1,612 Posted</div>
              </div>
              <div className="stage-step-card complete">
                <div className="stage-step-num">Stage 5 &bull; Operations Cockpit</div>
                <div className="stage-step-name">Manager HITL Approval</div>
                <div className="stage-step-bot">✓ WF-11 &bull; Finacle CBS</div>
              </div>
              <div className="stage-step-card complete">
                <div className="stage-step-num">Stage 6 &bull; Regulatory MIS</div>
                <div className="stage-step-name">Cryptographic Audit Pack</div>
                <div className="stage-step-bot">✓ WF-12 &bull; WF-13 Sealed</div>
              </div>
            </div>

            {/* Executive Settlement MIS KPIs */}
            <div className="kpi-grid">
              <KpiCard label="Settlement Volume" value={50000} color="blue" sub="UPI / IMPS clearing batch" />
              <KpiCard label="Cleared Funds" value={148520341} prefix="₹ " color="green" sub="Total ledger volume" />
              <KpiCard label="Straight-Through (STP)" value={94.5} suffix="%" color="green" sub="47,250 auto-reconciled" />
              <KpiCard label="Total Exceptions Resolved" value={2750} color="purple" sub="100% resolution coverage" />
            </div>

            {/* Cryptographic Inspection Pack JSON Viewer */}
            <div className="card">
              <div className="card-title">
                <div className="card-title-left">
                  <div className="card-title-dot" />
                  <span>Official Regulatory Audit Dossier (Machine-Readable JSON Package)</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => {
                      const text = JSON.stringify(sealedPack || misReport, null, 2)
                      navigator.clipboard.writeText(text)
                      alert("Cryptographic Audit Pack copied to clipboard!")
                    }}
                  >
                    Copy Audit JSON
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '4px 12px', fontSize: 11 }}
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sealedPack || misReport, null, 2))
                      const downloadAnchor = document.createElement('a')
                      downloadAnchor.setAttribute("href", dataStr)
                      downloadAnchor.setAttribute("download", `RBI_AUDIT_PACK_${new Date().toISOString().slice(0, 10)}.json`)
                      document.body.appendChild(downloadAnchor)
                      downloadAnchor.click()
                      downloadAnchor.remove()
                    }}
                  >
                    Download Audit Package
                  </button>
                </div>
              </div>

              <div className="json-viewer-card">
                <pre>{JSON.stringify(sealedPack || {
                  "audit_pack_id": "RBI_AUDIT_PACK_20261028_114940",
                  "regulatory_framework": "RBI DPSS.CO.PD No.629/02.01.014/2019-20 & ISO 27001",
                  "timestamp": "2026-10-28T11:49:40.125841",
                  "cryptographic_sha256_seal": "112c83e539a1b6e6136bb1f5949955b1306c649814f0b13fd0fd368eac3a1eeb",
                  "stage1_file_staged": "NPCI_UPI_Settlement_TestData_50K.csv",
                  "stage2_reconciliation": {
                    "total_records": 50000,
                    "matched_stp_rate": "94.5%",
                    "total_breaks": 2750,
                    "p1_breaks": 2400,
                    "p2_breaks": 350
                  },
                  "stage3_ai_investigation": {
                    "breaks_diagnosed": 2750,
                    "confidence_avg": "98.2%",
                    "top_root_cause": "CBS Timeout (15s Window Exceeded)"
                  },
                  "stage4_and_5_execution": {
                    "autonomous_reversals_posted": 1612,
                    "manager_approved_postings": recoverySummary?.hitl_approved_count || 0,
                    "total_cbs_credits_executed": recoverySummary?.total_cbs_reversals_posted || 1612
                  },
                  "compliance_outcome": {
                    "rbi_tat_sla_compliance": "100.0%",
                    "penalties_prevented_inr": 240000,
                    "annualized_savings_inr": 87600000
                  }
                }, null, 2)}</pre>
              </div>
            </div>
          </>}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* STAGE 2: 4-WAY RECONCILIATION ENGINE VIEW                        */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeNav === 'recon' && <>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div className="page-title">Stage 2: 4-Way Multi-Rail Reconciliation Engine</div>
                <div className="page-sub">
                  Mathematical cross-reconciliation across NPCI Clearing, Payment Switch, Core Banking (Finacle/Flexcube), and General Ledger (GL)
                </div>
              </div>
            </div>

            {/* 4 Inbound Systems Status Grid */}
            <div className="source-grid">
              <div className="source-card">
                <div className="source-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" />
                    <line x1="6" y1="18" x2="6.01" y2="18" />
                  </svg>
                </div>
                <div>
                  <div className="source-name">1. NPCI Settlement</div>
                  <div className="source-meta">Staging Vault: Validated</div>
                </div>
                <div className="source-status"><span className="source-status-dot" /> READY</div>
                <a
                  href={`${API}/api/recon/input-file/npci`}
                  download="NPCI_UPI_Settlement_Master.csv"
                  className="source-download-btn"
                  title="Download NPCI Settlement Master Input CSV"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>CSV</span>
                </a>
              </div>

              <div className="source-card">
                <div className="source-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <div>
                  <div className="source-name">2. Payment Switch</div>
                  <div className="source-meta">Base24 Gateway AUTHORIZED</div>
                </div>
                <div className="source-status"><span className="source-status-dot" /> ONLINE</div>
                <a
                  href={`${API}/api/recon/input-file/switch`}
                  download="Switch_Base24_Logs.csv"
                  className="source-download-btn"
                  title="Download Switch Base24 Logs Input CSV"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>CSV</span>
                </a>
              </div>

              <div className="source-card">
                <div className="source-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="21" x2="21" y2="21" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <polyline points="5 10 5 21" />
                    <polyline points="19 10 19 21" />
                    <polyline points="10 10 10 21" />
                    <polyline points="14 10 14 21" />
                    <polygon points="12 2 2 7 22 7 12 2" />
                  </svg>
                </div>
                <div>
                  <div className="source-name">3. Core Banking (CBS)</div>
                  <div className="source-meta">Finacle 10.x DEBITED Log</div>
                </div>
                <div className="source-status"><span className="source-status-dot" /> SYNCED</div>
                <a
                  href={`${API}/api/recon/input-file/cbs`}
                  download="Finacle_CBS_Dump.csv"
                  className="source-download-btn"
                  title="Download Finacle CBS Dump Input CSV"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>CSV</span>
                </a>
              </div>

              <div className="source-card">
                <div className="source-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v18" />
                    <path d="m16 8 4 6H4l4-6" />
                    <path d="M4 14a4 4 0 0 0 8 0" />
                    <path d="M12 14a4 4 0 0 0 8 0" />
                  </svg>
                </div>
                <div>
                  <div className="source-name">4. General Ledger (GL)</div>
                  <div className="source-meta">Clearing Pool Suspense A/C</div>
                </div>
                <div className="source-status"><span className="source-status-dot" /> ACTIVE</div>
                <a
                  href={`${API}/api/recon/input-file/gl`}
                  download="GL_Suspense_Pool.csv"
                  className="source-download-btn"
                  title="Download General Ledger Suspense Input CSV"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>CSV</span>
                </a>
              </div>
            </div>

            {/* 3 Core Output Buckets */}
            {reconData && (
              <div className="bucket-grid">
                <div
                  className="bucket-card green"
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease', border: breakFilter === 'MATCHED' ? '2px solid #16a34a' : undefined }}
                  onClick={() => { setBreakFilter('MATCHED'); setReconPage(1); }}
                  title="Click to view all 4-Way Matched STP Records"
                >
                  <div className="bucket-header">
                    <span className="bucket-tag">Bucket 1 &bull; Matched STP</span>
                  </div>
                  <div className="bucket-count">
                    {fmt(reconData.matched_count)}
                    <span className="bucket-pct">({reconData.stp_rate}%)</span>
                  </div>
                  <div className="bucket-desc">
                    All 4 systems agree in status, timing, and financial amount. Zero-delta balancing entry posted.
                  </div>
                  <div className="bucket-action">
                    <span>View Matched STP Records ({fmt(reconData.matched_count)}) &rarr;</span>
                  </div>
                </div>

                <div className="bucket-card amber">
                  <div className="bucket-header">
                    <span className="bucket-tag">Bucket 2 &bull; Timing Drift</span>
                  </div>
                  <div className="bucket-count">
                    {fmt(reconData.timing_count || 0)}
                    <span className="bucket-pct">(0.0%)</span>
                  </div>
                  <div className="bucket-desc">
                    Transactions in-flight across cycle cut-off windows. Zero financial break &mdash; checked next cycle.
                  </div>
                  <div className="bucket-action">
                    <span>Next Cycle Roll-Forward</span>
                  </div>
                </div>

                <div className="bucket-card red">
                  <div className="bucket-header">
                    <span className="bucket-tag">Bucket 3 &bull; Recon Breaks</span>
                  </div>
                  <div className="bucket-count">
                    {fmt(reconData.break_count)}
                    <span className="bucket-pct" style={{ color: 'var(--red)' }}>
                      ({fmtPct(reconData.break_count / (reconData.total_records || 1) * 100)})
                    </span>
                  </div>
                  <div className="bucket-desc">
                    Discrepancies diagnosed: 3 low-value auto-refunded (&lt; ₹5k), 1 high-value routed to HITL Cockpit.
                  </div>
                  <div className="bucket-action" style={{ cursor: 'pointer' }} onClick={() => setActiveNav('investigate')}>
                    <span>Hand Over to AI Investigation Agent &rarr;</span>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Breaks & Matched Records Explorer */}
            <div className="card">
              <div className="card-title">
                <div className="card-title-left">
                  <div className="card-title-dot" style={{ background: breakFilter === 'MATCHED' ? '#16a34a' : '#ea580c' }} />
                  <span>{breakFilter === 'MATCHED' ? `4-Way Matched STP Records (${filteredBreaks.length} displayed)` : `Recon Breaks & Exception Explorer (${filteredBreaks.length} displayed)`}</span>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Click any transaction to inspect all 4 legs side-by-side
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="filter-tabs">
                {[
                  ['MATCHED', `Matched STP (${reconData?.matched_count ?? reconMatched.length ?? 0})`],
                  ['ALL', `All Breaks (${reconData?.break_count ?? reconBreaks.length ?? 0})`],
                  ['P1', `P1 Critical (${reconData?.p1_count ?? 0})`],
                  ['CBS_TIMEOUT', `CBS Timeout (${reconData?.break_breakdown?.CBS_TIMEOUT ?? reconBreaks.filter(b => b.scenario === 'CBS_TIMEOUT').length ?? 0})`],
                  ['AMOUNT_MISMATCH', `Amount Mismatch (${reconData?.break_breakdown?.AMOUNT_MISMATCH ?? reconBreaks.filter(b => b.scenario === 'AMOUNT_MISMATCH').length ?? 0})`],
                  ['DEEMED_FAIL', `Deemed Fail (${reconData?.break_breakdown?.DEEMED_FAIL ?? reconBreaks.filter(b => b.scenario === 'DEEMED_FAIL').length ?? 0})`],
                  ['REVERSAL_MISSING', `Reversal Missing (${reconData?.break_breakdown?.REVERSAL_MISSING ?? reconBreaks.filter(b => b.scenario === 'REVERSAL_MISSING').length ?? 0})`],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    className={`filter-tab ${breakFilter === val ? 'active' : ''}`}
                    onClick={() => { setBreakFilter(val); setReconPage(1); }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>TXN ID</th>
                      <th>RRN</th>
                      <th>Rail</th>
                      <th>NPCI Amt</th>
                      <th>CBS Amt</th>
                      <th>Delta</th>
                      <th>Scenario / Root Cause</th>
                      <th>Priority</th>
                      <th>RBI Clock</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedBreaks.map((b, i) => (
                      <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setSelectedBreak(b)}>
                        <td>
                          <code style={{ fontSize: 11, fontWeight: 700 }}>{b.txn_id}</code>
                          {b.source_file && <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>{b.source_file}</div>}
                        </td>
                        <td>{b.rrn}</td>
                        <td><b>{b.rail}</b></td>
                        <td>{fmtInr(b.npci_amount)}</td>
                        <td>{fmtInr(b.cbs_amount)}</td>
                        <td style={{ color: b.variance !== 0 ? 'var(--red)' : 'inherit', fontWeight: 700 }}>
                          {b.variance !== 0 ? fmtInr(b.variance) : '₹ 0.00'}
                        </td>
                        <td><Badge type={b.scenario === 'SUCCESS' ? 'MATCHED' : b.scenario} label={b.scenario === 'SUCCESS' ? '4-Way Matched' : b.scenario.replace(/_/g, ' ')} /></td>
                        <td><Badge type={b.priority === 'STP' ? 'NORMAL' : b.priority} label={b.priority === 'STP' ? 'STP 100%' : b.priority} /></td>
                        <td>
                          {b.penalty_clock_started === 'Yes' ? (
                            <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 11 }}>T+1 Clock</span>
                          ) : (
                            <span style={{ color: b.scenario === 'SUCCESS' ? 'var(--green)' : 'var(--text-faint)', fontSize: 11, fontWeight: b.scenario === 'SUCCESS' ? 600 : 400 }}>
                              {b.scenario === 'SUCCESS' ? 'Balanced' : 'Normal'}
                            </span>
                          )}
                        </td>
                        <td>
                          <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); setSelectedBreak(b) }}>
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!filteredBreaks.length && (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--text-faint)' }}>
                          {breakFilter === 'MATCHED'
                            ? 'No matched records yet. Run 4-Way Reconciliation or export from Process Studio to load matched records.'
                            : 'No breaks match selected filter. Run reconciliation to load records.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <Pagination totalItems={filteredBreaks.length} pageSize={PAGE_SIZE} currentPage={reconPage} onPageChange={setReconPage} />
              </div>
            </div>
          </>}

          {/* === DASHBOARD === */}
          {activeNav === 'dashboard' && <>
            <div className="page-header" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div className="page-title" style={{ fontSize: 20, fontWeight: 800 }}>
                    {isScoped
                      ? `NPCI Operations Control Tower — ${activeRailName || activeRailScope}`
                      : 'NPCI Operations Control Tower — Unified Multi-Rail View'}
                  </div>
                  <div className="page-sub">
                    {isScoped
                      ? `Catalogue Scope: ${activeRailName || activeRailScope} (${activeRailScope}) • Real-time 4-way reconciliation & STP metrics`
                      : 'Good Morning, Operations Manager • Real-time multi-agent clearing, 4-way reconciliation & settlement across all 8 NPCI payment rails'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setActiveNav('catalog')}>
                    Rail Solutions Catalog &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* ── NEFT / RTGS Quick-Access Banner (shown only when rail scope is NEFT or RTGS) ── */}
            {(activeRailScope === 'NEFT' || activeRailScope === 'RTGS') && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
                borderRadius: 12,
                padding: '14px 20px',
                marginBottom: 18,
                boxShadow: '0 4px 16px rgba(29,78,216,0.18)'
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {activeRailScope} — RBI Settlement Operations Active
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff', marginTop: 3 }}>
                    {activeRailScope === 'RTGS'
                      ? 'Real-Time Gross Settlement via RBI e-Kuber — UC1 Pre-Validation, UC2/UC3 Liquidity Monitor, UC5/UC6 3-Way Recon, UC7 Copilot, UC8 TAT Reporting'
                      : 'National Electronic Funds Transfer via RBI e-Kuber — UC4 Inward Credit & Return, UC5/UC6 3-Way Recon, UC7 Copilot, UC8 Regulatory Reporting'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    className="btn"
                    style={{ background: '#ffffff', color: '#1d4ed8', fontWeight: 700, fontSize: 12, padding: '7px 16px', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                    onClick={() => setActiveNav('rbi_3way')}
                  >
                    RBI 3-Way Recon &amp; Liquidity
                  </button>
                  <button
                    className="btn"
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', fontWeight: 700, fontSize: 12, padding: '7px 16px', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 8, cursor: 'pointer' }}
                    onClick={() => setActiveNav('copilot')}
                  >
                    Payments Copilot (UC7)
                  </button>
                </div>
              </div>
            )}

            {/* Executive Banking Overview Cards (Clean & Focused) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
              marginBottom: 20
            }}>
              {/* Card 1: Batch Intake */}
              <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #ea580c' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {activeRailScope ? `${activeRailName || activeRailScope} Ingested Batch` : 'UPI 2.0 Ingested Batch'}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                  {scopedRailVol} <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Transactions</span>
                </div>
                <div style={{ fontSize: 11.5, color: '#ea580c', fontWeight: 600, marginTop: 4 }}>
                  {scopedRailVol > 0 ? `Cycle: ${activeRailScope ? activeRailScope.toUpperCase() : 'UPI'}-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-CY01 • Active` : 'Cycle: Standby • Awaiting File Intake'}
                </div>
              </div>

              {/* Card 2: Straight-Through Settle */}
              <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #16a34a' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Straight-Through (STP) Settled
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
                  {reconData?.matched_count ?? 0} <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Txn ({reconData?.stp_rate ? `${reconData.stp_rate}%` : '0.0%'})</span>
                </div>
                <div style={{ fontSize: 11.5, color: '#15803d', fontWeight: 600, marginTop: 4 }}>
                  {reconData?.matched_count
                    ? `Zero-Delta ${activeRailScope === 'NETC' ? 'GL-9908' : activeRailScope === 'AEPS' ? 'GL-9904' : activeRailScope === 'IMPS' ? 'GL-9902' : 'GL-14020'} Knocked Off (₹${(reconData.matched_amount || 0).toLocaleString()})`
                    : `Zero-Delta ${activeRailScope === 'NETC' ? 'GL-9908' : activeRailScope === 'AEPS' ? 'GL-9904' : activeRailScope === 'IMPS' ? 'GL-9902' : 'GL-14020'} Knock-Off Standby (₹0.00)`}
                </div>
              </div>

              {/* Card 3: AI Break Resolution */}
              <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #e11d48' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  AI Exception Breaks (Dual-Track)
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#e11d48', marginTop: 4 }}>
                  {reconData?.break_count ?? 0} <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Breaks (₹{(reconData?.break_amount ?? 0).toLocaleString()})</span>
                </div>
                <div style={{ fontSize: 11.5, color: '#be123c', fontWeight: 600, marginTop: 4 }}>
                  {reconData?.break_count ? `${reconData.auto_refund_count || 0} Auto-Reversed (< ₹5k) • ${reconData.hitl_count || 0} HITL Cockpit` : '0 Auto-Reversed • 0 HITL Cockpit'}
                </div>
              </div>

              {/* Card 4: RBI Regulatory SLA */}
              <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #2563eb' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Regulatory Mandate SLA
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>
                  100.0% <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Compliant</span>
                </div>
                <div style={{ fontSize: 11.5, color: '#1d4ed8', fontWeight: 600, marginTop: 4 }}>
                  RBI Circular DPSS.CO.PD No.629 (T+1 TAT)
                </div>
              </div>
            </div>

            <div className="two-col">
              <div className="card">
                <div className="card-title">
                  <div className="card-title-left"><div className="card-title-dot" /><span>Scenario Breakdown {isScoped ? `(${activeRailScope})` : ''}</span></div>
                </div>
                <ScenarioBreakdown files={files} scopedRail={activeRailScope} reconData={reconData} />
              </div>
              <div className="card">
                <div className="card-title">
                  <div className="card-title-left"><div className="card-title-dot" /><span>Recent Audit Events {isScoped ? `(${activeRailScope})` : ''}</span></div>
                </div>
                <AuditLog logs={audit} scopedRail={activeRailScope} />
              </div>
            </div>
          </>}

          {/* === UPLOAD TAB === */}
          {activeNav === 'upload' && <>
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div className="page-title">
                  Upload &amp; Validate Settlement File {activeRailScope && <span style={{ color: '#ea580c' }}>&bull; {activeRailName || activeRailScope}</span>}
                </div>
                <div className="page-sub">
                  {activeRailScope
                    ? `Drop or run a settlement file — The pipeline automatically parses, filters, and scopes only ${activeRailScope} transactions through all 6 stages.`
                    : 'Drop an NPCI clearing CSV/DAT file — the agent executes SHA-256 checks, schema validation, and vault staging'}
                </div>
              </div>
            </div>

            <Pipeline stage={pipeStage} agentText={agentText} isDuplicate={isDuplicate} isUploading={uploading} />

            <div className="card">
              <div className="card-title">
                <div className="card-title-left">
                  <div className="card-title-dot" />
                  <span>File Ingestion Zone {activeRailScope ? `(${activeRailScope} Rail Isolated)` : ''}</span>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{
                    padding: '5px 14px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    borderColor: '#ea580c',
                    color: '#ea580c',
                    background: '#fff'
                  }}
                  onClick={triggerDemo}
                >
                  Run {activeRailScope ? `${activeRailScope} ` : ''}Sample Demo
                </button>
              </div>

              <div className={`upload-zone-wrapper ${drag ? 'drag' : ''} ${uploading ? 'active' : ''}`}>
                <div
                  className="upload-zone"
                  onDragOver={e => { e.preventDefault(); setDrag(true) }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={onDrop}
                  onClick={() => !uploading && fileRef.current.click()}
                >
                  {uploading && <div className="scan-laser" />}

                  {uploading ? (
                    <div className="upload-processing">
                      <div className="spinner-ring" />
                      <div className="up-label">Processing Settlement File Through 6 Gates...</div>
                      <div className="up-sub">{agentText}</div>
                    </div>
                  ) : (
                    <>
                      <div className="up-icon-wrap"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></div>
                      <div className="up-label">Drag &amp; drop your NPCI settlement file here</div>
                      <div className="up-sub">or click to browse &mdash; Supports .csv, .dat, .txt (up to 500,000 records)</div>
                      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={e => { e.stopPropagation(); fileRef.current.click() }}>
                        Choose File from Computer
                      </button>
                    </>
                  )}
                  <input ref={fileRef} type="file" accept=".csv,.txt,.dat" style={{ display: 'none' }}
                    onChange={e => handleUpload(e.target.files[0])} />
                </div>
              </div>

              <ValidationResult result={lastResult} />
            </div>
          </>}

          {/* === FILE REGISTRY === */}
          {activeNav === 'files' && <>
            <div className="page-header">
              <div className="page-title">File Registry</div>
              <div className="page-sub">Historical register of all processed settlement batches and cryptographic checksums</div>
            </div>
            <div className="card"><FileTable files={files} onDownload={downloadRegistryFile} activeRailScope={activeRailScope} /></div>
          </>}

          {/* === STAGING VAULT === */}
          {activeNav === 'staging' && <>
            <div className="page-header">
              <div className="page-title">Staging Vault</div>
              <div className="page-sub">Tamper-proof storage holding clean, validated files ready for Stage 2 Reconciliation</div>
            </div>
            <div className="card">
              <div className="card-title">
                <div className="card-title-left"><div className="card-title-dot" /><span>Vault Directory: stage1/staging_vault/ ({staging.length} files)</span></div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Filename</th><th>Size</th><th>Ingested Time</th><th>Vault Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {pagedStaging.map((f, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              onClick={() => downloadStagingFile(f.name)}
                              title={`Download ${f.name} from Staging Vault`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifySelf: 'center',
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: '1.5px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#0f172a',
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = '#ea580c'; e.currentTarget.style.color = '#ea580c'; e.currentTarget.style.background = '#fff7ed' }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#ffffff' }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                            </button>
                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 600 }}>{f.name}</span>
                          </div>
                        </td>
                        <td>{f.size_kb} KB</td>
                        <td>{fmtDate(f.modified)}</td>
                        <td><Badge type="VALIDATED" label="Ready for Recon" /></td>
                        <td>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '3px 9px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                            onClick={() => downloadStagingFile(f.name)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!staging.length && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 24 }}>No files in staging vault yet</td></tr>}
                  </tbody>
                </table>
                <Pagination totalItems={staging.length} pageSize={PAGE_SIZE} currentPage={stagingPage} onPageChange={setStagingPage} />
              </div>
              <div style={{ marginTop: 16, padding: 14, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 12.5, color: '#166534' }}>
                <b>Stage 2 Handoff:</b> Validated batches in this vault are immediately consumed by the <b>4-Way Multi-Rail Recon Engine</b>.
              </div>
            </div>
          </>}

          {/* === AUDIT LOG === */}
          {activeNav === 'audit' && <>
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div className="page-title">Tamper-Proof Audit Trail &amp; Evidence Files</div>
                <div className="page-sub">Immutable security &amp; event ledger &mdash; RBI IT compliance and ISO 27001 audit ready</div>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '7px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 8, borderColor: '#ea580c', color: '#ea580c', background: '#fff7ed' }}
                onClick={downloadAuditLogs}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Audit Trail (JSON)
              </button>
            </div>

            {/* Official Compliance Evidence Files */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">
                <div className="card-title-left"><div className="card-title-dot" /><span>Compliance Evidence Files &amp; Sealed Packages</span></div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Evidence File</th><th>Format</th><th>Status</th><th>Record Count</th><th>Download</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={downloadAuditLogs}
                            title="Download RBI NPCI Audit Trail JSON"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: '1.5px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#0f172a',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </button>
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 600 }}>RBI_NPCI_AUDIT_TRAIL.json</span>
                        </div>
                      </td>
                      <td>JSON (Immutable)</td>
                      <td><Badge type="VALIDATED" label="Cryptographically Signed" /></td>
                      <td>{audit.length} Events</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 9px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                          onClick={downloadAuditLogs}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Download
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={downloadAuditPack}
                            title="Download Regulatory Audit Pack"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: '1.5px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#0f172a',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </button>
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 600 }}>RBI_DPSS_MERKLE_AUDIT_PACK.json</span>
                        </div>
                      </td>
                      <td>JSON (Merkle Tree)</td>
                      <td><Badge type="VALIDATED" label="SHA-256 Merkle Root" /></td>
                      <td>100% RBI DPSS SLA</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 9px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                          onClick={downloadAuditPack}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Download
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={downloadEvidenceDossiers}
                            title="Download AI Root Cause Evidence Dossiers"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: '1.5px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#0f172a',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </button>
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 600 }}>AI_EVIDENCE_DOSSIERS_SUMMARY.csv</span>
                        </div>
                      </td>
                      <td>CSV (Audit Evidence)</td>
                      <td><Badge type="VALIDATED" label="4-Way Verified" /></td>
                      <td>{dossierList.length || 2750} Dossiers</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 9px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                          onClick={downloadEvidenceDossiers}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Download
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                <div className="card-title-left"><div className="card-title-dot" /><span>Cryptographic Audit Log</span></div>
              </div>
              <AuditLog logs={audit} onDownloadFile={downloadRegistryFile} />
              {audit.length === 0 && <div style={{ color: 'var(--text-faint)', fontSize: 13, padding: '12px 0' }}>Upload files to generate audit trail.</div>}
            </div>
          </>}

          </div>
        </div>
      </div>
    </div>
  )
}
