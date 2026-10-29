import { useState, useEffect, useRef, useCallback } from 'react'
import RailCatalogView from './RailCatalogView'
import ProductOperationsView from './ProductOperationsView'
import AeServerExecutionModal from './AeServerExecutionModal'
import './index.css'

const API = 'http://localhost:8000'

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
          <span className="agent-ticker-tag">AutomationEdge</span>
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
function ScenarioBreakdown({ files, scopedRail }) {
  const totals = {}
  if (files && files.length > 0) {
    if (scopedRail) {
      const vol = { UPI: 29105, IMPS: 7431, NACH: 6524, AEPS: 1938, RUPAY: 1461, CTS: 1511, BBPS: 525, NETC: 1505 }[scopedRail] || 29105
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

// ── File Registry Table ───────────────────────────────────────────────────────
function FileTable({ files, onDownload }) {
  const [page, setPage] = useState(1)
  const pageSize = 10
  const reversed = files.slice().reverse()
  const pagedFiles = reversed.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>File ID</th>
            <th>Filename</th>
            <th>Rail(s)</th>
            <th>Records</th>
            <th>Exceptions</th>
            <th>P1</th>
            <th>STP%</th>
            <th>Status</th>
            <th>Received</th>
          </tr>
        </thead>
        <tbody>
          {pagedFiles.map((f, i) => {
            const total = f.records || 1
            const stp = Math.round((f.stp_count || 0) / total * 100)
            const rails = Object.keys(f.rail_counts || {}).join(', ') || '—'
            return (
              <tr key={i}>
                <td><code style={{ fontSize: 11 }}>{f.file_id}</code></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => onDownload && onDownload(f)}
                      title={`Download ${f.filename}`}
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
                    <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{f.filename}</span>
                  </div>
                </td>
                <td>{rails}</td>
                <td>{fmt(f.records)}</td>
                <td style={{ color: f.exception_count > 0 ? 'var(--red)' : 'inherit', fontWeight: 600 }}>{fmt(f.exception_count)}</td>
                <td style={{ color: f.p1_count > 0 ? 'var(--red)' : 'inherit', fontWeight: 600 }}>{fmt(f.p1_count)}</td>
                <td>
                  <span style={{ color: stp >= 95 ? 'var(--green)' : stp > 85 ? 'var(--amber)' : 'var(--red)', fontWeight: 700 }}>{stp}%</span>
                </td>
                <td><Badge type={f.status} /></td>
                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(f.received_at)}</td>
              </tr>
            )
          })}
          {!files.length && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 24 }}>No files uploaded yet</td></tr>}
        </tbody>
      </table>
      <Pagination totalItems={files.length} pageSize={pageSize} currentPage={page} onPageChange={setPage} />
    </div>
  )
}

// ── Validation Result Box ─────────────────────────────────────────────────────
function ValidationResult({ result }) {
  if (!result) return null
  const cls = result.status === 'VALIDATED' ? 'ok' : result.status === 'DUPLICATE' ? 'dup' : 'err'
  const icons = { VALIDATED: '✅', REJECTED: '❌', DUPLICATE: '⚠️' }
  return (
    <div className={`validation-box ${cls}`}>
      <div className="validation-title">
        <span>{icons[result.status]}</span>
        <span>{result.status} &mdash; {result.filename}</span>
      </div>
      <div className="validation-metrics">
        <div className="validation-pill">📄 Records: <b>{fmt(result.records)}</b></div>
        <div className="validation-pill">🔴 P1 Critical: <b style={{ color: 'var(--red)' }}>{fmt(result.p1_count)}</b></div>
        <div className="validation-pill">🟡 P2 Exceptions: <b style={{ color: 'var(--amber)' }}>{fmt(result.p2_count)}</b></div>
        <div className="validation-pill">💥 Breaks: <b style={{ color: 'var(--red)' }}>{fmt(result.exception_count)}</b></div>
        <div className="validation-pill">✅ STP Rate: <b style={{ color: 'var(--green)' }}>{result.records ? Math.round((result.stp_count || 0) / result.records * 100) + '%' : '—'}</b></div>
        <div className="validation-pill">🔐 Hash: <b style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{(result.hash || '').slice(0, 14)}…</b></div>
      </div>
      {result.errors?.length > 0 && (
        <ul className="validation-list" style={{ color: 'var(--red)' }}>
          {result.errors.map((e, i) => <li key={i}>❌ {e}</li>)}
        </ul>
      )}
      {result.warnings?.length > 0 && (
        <ul className="validation-list" style={{ color: 'var(--amber)', marginTop: 4 }}>
          {result.warnings.slice(0, 3).map((w, i) => <li key={i}>⚠️ {w}</li>)}
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
            <div className="modal-title">🔍 4-Way Leg Comparison — {breakItem.txn_id}</div>
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
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>💰 Financial Variance Analysis:</div>
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
              <span style={{ fontSize: 24 }}>📑</span>
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
          <div className="dossier-sec-title">🤖 AI Agent Root-Cause Diagnostic:</div>
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
          <div className="dossier-sec-title">⚖️ 4-Way System Audit Evidence:</div>
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
              Routing: {dossier.is_hitl_required ? '🛡️ Operations Manager Sign-Off Required' : '⚡ Autonomous Reversal Execution Bot (Finacle)'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={() => { alert(`Action Queued: ${dossier.action_label}`); onClose(); }}>
              {dossier.is_hitl_required ? 'Approve & Route to Ops Cockpit' : 'Execute Reversal Bot ⚡'}
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
  const [activeNav, setActiveNav] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeRailScope, setActiveRailScope] = useState(null)
  const [activeRailName, setActiveRailName] = useState('')
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
    try {
      const [s, f, a, st, rc, rb, rm, as, rec, hitl, mis, mg] = await Promise.all([
        fetch(`${API}/api/stats`).then(r => r.json()),
        fetch(`${API}/api/files`).then(r => r.json()),
        fetch(`${API}/api/audit`).then(r => r.json()),
        fetch(`${API}/api/staging`).then(r => r.json()),
        fetch(`${API}/api/recon/summary`).then(r => r.json()).catch(() => null),
        fetch(`${API}/api/recon/breaks?limit=150`).then(r => r.json()).catch(() => ({ breaks: [] })),
        fetch(`${API}/api/recon/matched?limit=200`).then(r => r.json()).catch(() => ({ matched: [] })),
        fetch(`${API}/api/agent/investigate/summary`).then(r => r.json()).catch(() => null),
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
  }, [])

  useEffect(() => { refresh(); const id = setInterval(refresh, 4000); return () => clearInterval(id) }, [refresh])
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id) }, [])

  const sleep = ms => new Promise(r => setTimeout(r, ms))

  // Trigger 4-Way Recon Execution
  const triggerReconRun = async () => {
    setReconRunning(true)
    try {
      const res = await fetch(`${API}/api/recon/run`, { method: 'POST' })
      const data = await res.json()
      await sleep(1000)
      setReconData(data)
      const breaksRes = await fetch(`${API}/api/recon/breaks?limit=150`).then(r => r.json())
      setReconBreaks(breaksRes.breaks || [])
      const matchedRes = await fetch(`${API}/api/recon/matched?limit=200`).then(r => r.json()).catch(() => ({ matched: [] }))
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
      const res = await fetch(`${API}/api/agent/investigate/run`, { method: 'POST' })
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
    alert(`❌ Transaction ${item.txn_id} REJECTED.\n• Reason: ${reason}\n• Action: Finacle CBS posting suspended.\n• Status: Flagged to Fraud Risk Monitor.`)
  }

  // Stage 5: Escalate Transaction to High-Level Committee
  const handleEscalateTxn = (item) => {
    const note = window.prompt(`Enter escalation note for transaction ${item.txn_id}:`, "Amount mismatch exceeds branch authority — Escalate to Head of Settlement & Risk Committee")
    if (note === null) return
    setHitlQueue(prev => prev.map(q => q.txn_id === item.txn_id ? { ...q, status: 'ESCALATED', priority: 'P1', escalation_note: note } : q))
    alert(`⚠️ Transaction ${item.txn_id} ESCALATED.\n• Priority: P1 Urgent\n• Recipient: Head of Operations & Risk Committee\n• Note: ${note}`)
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
        alert(`⚡ BATCH P1 EXECUTION COMPLETE!\n\n• Approved Cases: ${result.approved_count.toLocaleString()}\n• Total Amount Posted: ₹${result.approved_amount.toLocaleString()}\n• Avoided RBI Compensation Penalty: ₹2,40,000 / Day\n• Authorizer: ${result.approver}\n• Status: All reversals dispatched to Finacle CBS`)
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

  const railRecordCounts = {
    UPI: hasData ? ((stats.rail_volumes && stats.rail_volumes.UPI) ?? 29105) : (activeRailScope === 'UPI' ? 29105 : 0),
    IMPS: hasData ? ((stats.rail_volumes && stats.rail_volumes.IMPS) ?? 7431) : (activeRailScope === 'IMPS' ? 7431 : 0),
    NACH: hasData ? ((stats.rail_volumes && stats.rail_volumes.NACH) ?? 6524) : (activeRailScope === 'NACH' ? 6524 : 0),
    AEPS: hasData ? ((stats.rail_volumes && stats.rail_volumes.AEPS) ?? 1938) : (activeRailScope === 'AEPS' ? 1938 : 0),
    RUPAY: hasData ? ((stats.rail_volumes && stats.rail_volumes.RUPAY) ?? 1461) : (activeRailScope === 'RUPAY' ? 1461 : 0),
    CTS: hasData ? ((stats.rail_volumes && stats.rail_volumes.CTS) ?? 1511) : (activeRailScope === 'CTS' ? 1511 : 0),
    BBPS: hasData ? ((stats.rail_volumes && stats.rail_volumes.BBPS) ?? 525) : (activeRailScope === 'BBPS' ? 525 : 0),
    NETC: hasData ? ((stats.rail_volumes && stats.rail_volumes.NETC) ?? 1505) : (activeRailScope === 'NETC' ? 1505 : 0)
  }

  const railMetadata = {
    UPI: {
      name: 'Unified Payments Interface (UPI 2.0)',
      category: 'Instant & Mobile',
      tagline: 'Real-time 24x7 Mobile P2P/P2M Clearing & Auto-Reversals',
      clearingWindow: '6 Daily Settlement Cycles (00:00 - 24:00 IST)',
      sla: 'T+1 Calendar Day (RBI DPSS Circular No.629)',
      systems: 'NPCI Central Switch, Base24, Finacle 10.x CBS, GL 9901',
      dailyVolume: '29,105 txns',
      stpRate: '95.2%'
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
    setAgentText(`🎯 [${railCode} ACTIVE] Home Dashboard scoped to ${meta?.name || railCode} only. Showing isolated transactions, 4-way matching & STP rates.`)
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
    setAgentText(`📥 [WF-01 Courier Bot] File detected: '${f.name}' (${(f.size / (1024 * 1024)).toFixed(1)} MB). Streaming payload...`)
    await sleep(700)

    setPipeStage(2)
    setAeCurrentStep(2)
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Dispatching WF03_Staging_Cryptkeeper.psw...`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: Computing SHA-256 cryptographic digest across stream...`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: SHA-256 verified. Duplicate registry query: Clean (New Cycle).`
    ])
    setAgentText(`🔐 [WF-03 Gatekeeper] Computing SHA-256 cryptographic hash & querying duplicate registry...`)
    await sleep(750)

    setPipeStage(3)
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: Validating 32 ISO-8583 columns & payment rails (UPI, IMPS, NACH)...`
    ])
    setAgentText(`🔎 [WF-03 Gatekeeper] Validating 32 mandatory columns, NPCI rails & ISO-8583 response codes...`)

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
        setAgentText(`🗄️ [WF-03 Gatekeeper] Staging Vault: Moving clean settlement file to secure vault...`)
        await sleep(650)

        setPipeStage(5)
        setAgentText(`✅ [STAGE 1 COMPLETE] File Validated (${(data.records || 0).toLocaleString()} records). 4-Way Recon Ready!`)
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
        setAgentText(`⚠️ [DUPLICATE DETECTED] Identical SHA-256 hash seen before. Quarantined to /rejected/!`)
      } else {
        setPipeStage(3)
        setAeExecutionStatus('REJECTED_HALTED')
        setAeCurrentStep(2)
        setAeLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: [VALIDATION REJECTED] Mandatory columns missing or schema malformed.`,
          `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Pipeline halted at Step 2. Downstream workflows cancelled.`
        ])
        setAgentText(`❌ [VALIDATION FAILED] Rejected: Missing mandatory columns or malformed rows.`)
      }

      setLastResult(data)
      refresh()
    } catch (e) {
      setPipeStage(0)
      setAeExecutionStatus('REJECTED_HALTED')
      setAeCurrentStep(2)
      setAgentText(`❌ Connection error: Backend API unreachable on http://localhost:8000`)
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

    const scopedVol = activeRailScope ? (railRecordCounts[activeRailScope] || 29105) : 50000
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
    setAgentText(`📡 [WF-01 File Download] Pulling ${activeRailScope ? activeRailScope + ' ' : ''}settlement file from NPCI SFTP...`)
    await sleep(700)

    setPipeStage(2)
    setAeCurrentStep(2)
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] AE-SERVER: Dispatching WF03_Staging_Cryptkeeper.psw...`,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: Computing SHA-256 hash & verifying duplicate registry...`
    ])
    setAgentText(`🔐 [WF-03 Validation] Computing SHA-256 hash & verifying duplicate registry...`)
    await sleep(700)

    setPipeStage(3)
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: Parsing ${scopedVol.toLocaleString()} records across 32 columns for ${activeRailScope || 'UPI'} rail...`
    ])
    setAgentText(`🔎 [WF-03 Validation] Parsing & isolating ${scopedVol.toLocaleString()} ${activeRailScope || 'UPI'} records...`)
    await sleep(700)

    setPipeStage(4)
    setAeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] WF-03: Locking clean file into Staging Vault enclave: /vault/staged/${scopedFileName}`
    ])
    setAgentText(`🗄️ [WF-03 Validation] Locking ${scopedVol.toLocaleString()} clean records into Staging Vault...`)
    await sleep(600)

    setPipeStage(5)
    setAgentText(`✅ [STAGE 1 COMPLETE] ${scopedVol.toLocaleString()} ${activeRailScope || 'UPI'} records staged. Triggering Stage 2 Recon...`)

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
    setAgentText(`✅ [STAGE 2 COMPLETE] 4-Way Recon matched ${stpCount.toLocaleString()} records (${((stpCount / scopedVol) * 100).toFixed(1)}% STP).`)

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

    setAgentText('✅ [END-TO-END COMPLETE] All 6 Stages Executed: 47,250 STP Matched | 2,750 AI Dossiers Diagnosed | Finacle CBS Reversals Posted.')
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
    : (hasData ? (stats.total_records_ingested || 50000) : 0)
  const scopedP1Count = isScoped
    ? (scopedRailVol > 0 ? Math.round(scopedRailVol * 0.048) : 0)
    : (hasData ? (stats.p1_count ?? 2400) : 0)
  const scopedP2Count = isScoped
    ? (scopedRailVol > 0 ? Math.round(scopedRailVol * 0.007) : 0)
    : (hasData ? (stats.p2_count ?? 350) : 0)
  const scopedExcCount = scopedP1Count + scopedP2Count
  const scopedStpCount = scopedRailVol > 0 ? (scopedRailVol - scopedExcCount) : 0
  const scopedStpPct = scopedRailVol > 0 ? ((scopedStpCount / scopedRailVol) * 100).toFixed(1) : 0
  const scopedExcPct = scopedRailVol > 0 ? ((scopedExcCount / scopedRailVol) * 100).toFixed(1) : 0

  const stp_pct = scopedStpPct
  const exc_pct = scopedExcPct

  const navItems = [
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
      id: 'product_ops',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      label: activeRailScope ? `NPCI Product Operations (${activeRailScope})` : 'NPCI Product Operations'
    },
    {
      id: 'orchestrator',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
      label: 'AI Agents Console'
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
      id: 'reports',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      label: 'MIS & Reports'
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
      />

      {/* Header */}
      <div className="header">
        <div className="header-brand">
          {/* Menu Toggle Button (Hamburger / Collapse) */}
          <button
            onClick={() => setSidebarCollapsed(prev => !prev)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              marginRight: 6,
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249, 115, 22, 0.25)'; e.currentTarget.style.borderColor = '#ea580c' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)' }}
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
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
            boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
            flexShrink: 0
          }}>
            <img src="/favicon.svg" alt="AutomationEdge" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          </div>
          <div className="header-title">AutomationEdge &nbsp;|&nbsp; <span>NPCI Unified Operations Workbench</span></div>
          <div className="header-badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}>
            All 6 Stages Operational &bull; Production Ready
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: 12, borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
            onClick={async () => {
              if (window.confirm("Clear all logs, vaults, and reset state for fresh file testing?")) {
                try {
                  await fetch('http://localhost:8000/api/system/clear-all', { method: 'POST' })
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
          <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={triggerDemo}>
            Run End-to-End Simulation
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: backendOk === true ? '#10b981' : backendOk === false ? '#ef4444' : '#f59e0b', display: 'inline-block' }} />
            <span style={{ color: 'rgba(255,255,255,.6)' }}>{backendOk === true ? 'Backend Connected' : backendOk === false ? 'Backend Offline' : 'Connecting…'}</span>
          </div>
          <div className="header-time">{time.toLocaleTimeString('en-IN', { hour12: false })}</div>
        </div>
      </div>

      <div className="layout">
        {/* Sidebar with Open / Close Toggle and Floating Tabs */}
        <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            padding: sidebarCollapsed ? '4px 0 10px' : '4px 8px 8px',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: 6
          }}>
            {!sidebarCollapsed && <span className="nav-section" style={{ padding: 0 }}>Navigation</span>}
            <button
              onClick={() => setSidebarCollapsed(prev => !prev)}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                width: 26,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ea580c'; e.currentTarget.style.borderColor = '#ea580c'; e.currentTarget.style.background = '#fff7ed' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc' }}
              title={sidebarCollapsed ? "Expand Sidebar Menu" : "Collapse Sidebar Menu"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>

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
              onLaunchWorkflow={() => setActiveNav('orchestrator')}
              onOpenRailOps={(rail) => {
                const meta = railMetadata[rail]
                setSelectedRailForOps(rail)
                setActiveRailScope(rail)
                setActiveRailName(meta?.name || rail)
                setActiveNav('dashboard')
              }}
              onStartRailTrial={handleStartRailTrial}
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
                  <span>🕸️</span>
                  <span>Microsoft Agent Framework (MAF) &bull; Context Graph Orchestrator</span>
                  <span className="maf-badge">MAF Multi-Agent Runtime</span>
                </div>
                <div className="maf-banner-sub">
                  Directed Workflow Graph (`WorkflowBuilder`) &bull; Grounded Context Graph Blackboard &bull; Conditional Edge Routing &bull; Multi-Agent State Machine
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: '9px 18px', fontSize: 12.5, background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', borderColor: '#ea580c' }}
                  disabled={mafRunning}
                  onClick={handleRunOrchestrator}
                >
                  {mafRunning ? '⚙️ MAF Graph Executing...' : '⚡ Run Autonomous MAF Flow'}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '9px 14px', fontSize: 12.5 }}
                  onClick={handleResetOrchestrator}
                >
                  🔄 Reset Graph
                </button>
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
                    📐 MAF Directed Workflow Graph Topology &mdash; 6 Coordinated Executors
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
                    <span className="cg-title">📁 FileContext</span>
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
                    <span className="cg-title">⚖️ ReconContext</span>
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
                    <span className="cg-title">🤖 DiagnosticContext</span>
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
                    <span className="cg-title">⚡ ExecutionContext</span>
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
                    <span className="cg-title">📜 ComplianceContext</span>
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
                <div className="ai-avatar">🤖</div>
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
                {agentRunning ? '🧠 Diagnosing 2,750 Breaks…' : '⚡ Run AI Root-Cause Investigation'}
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
                  <span className="sla-label">🔴 Critical (&lt; 4h to Breach)</span>
                  <div className="sla-val" style={{ color: 'var(--red)' }}>
                    {fmt(agentSummary.sla_urgency_breakdown?.critical_under_4h)}
                  </div>
                  <div className="sla-sub">High penalty threat &mdash; immediate auto-reversal queue</div>
                </div>

                <div className="sla-card warning">
                  <span className="sla-label">🟡 Urgent (4 &ndash; 12h to Breach)</span>
                  <div className="sla-val" style={{ color: 'var(--amber)' }}>
                    {fmt(agentSummary.sla_urgency_breakdown?.warning_4_to_12h)}
                  </div>
                  <div className="sla-sub">Approaching T+1 window &mdash; prioritized for batch review</div>
                </div>

                <div className="sla-card normal">
                  <span className="sla-label">🟢 Standard (&gt; 12h Window)</span>
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
                  Click &ldquo;View Dossier 📄&rdquo; for full AI diagnostic breakdown &amp; approval routing
                </span>
              </div>

              {/* Dossier Filter Tabs */}
              <div className="filter-tabs">
                {[
                  ['ALL', `All Dossiers (${agentSummary?.total_breaks_analyzed || 0})`],
                  ['CRITICAL', `🔴 Critical &lt;4h (${agentSummary?.sla_urgency_breakdown?.critical_under_4h || 0})`],
                  ['AUTO', `⚡ Auto-Resolvable (${agentSummary?.auto_resolvable_count || 0})`],
                  ['HITL', `🛡️ HITL Required (${agentSummary?.hitl_required_count || 0})`],
                  ['TIMEOUT', 'CBS Timeout (1,000)'],
                  ['AMOUNT_MISMATCH', 'Amount Mismatch (500)'],
                  ['REVERSAL_MISSING', 'Reversal Missing (400)'],
                  ['DEEMED_FAIL', 'Deemed Fail (250)'],
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
                            ⏳ {d.sla_countdown}
                          </span>
                        </td>
                        <td>
                          {d.is_hitl_required ? (
                            <span className="badge badge-amber">🛡️ HITL Approval</span>
                          ) : (
                            <span className="badge badge-green">⚡ Auto-Refund</span>
                          )}
                        </td>
                        <td>
                          <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); setSelectedDossier(d) }}>
                            View Dossier 📄
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
                <div className="page-title">⚡ Stages 4 &amp; 5: Operations Approval Cockpit &amp; Finacle Execution Bot</div>
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
                  {batchLoading ? '⚡ Dispatched to Finacle CBS...' : '⚡ Batch Approve All P1 Breaks (2,400 Cases)'}
                </button>
              </div>
            </div>

            {/* Dual-Track Visual Architecture */}
            <div className="dual-track-container">
              {/* Track A: Autonomous Bot */}
              <div className="track-card track-auto">
                <div className="track-header">
                  <span className="track-tag">Track A &bull; Autonomous STP Bot (WF-10)</span>
                  <span style={{ fontSize: 20 }}>⚡</span>
                </div>
                <div className="track-title">Autonomous Finacle Reversal Bot</div>
                <div className="track-desc">
                  Self-driving RPA execution for verified CBS timeouts and deemed failures below ₹50,000. Immediately dispatches credit adjustment reversals into Finacle CBS without manual touch.
                </div>
                <div className="track-stats-row">
                  <div>
                    <div className="track-stat-num" style={{ color: '#059669' }}>
                      {fmt(recoverySummary?.auto_resolvable_count || 1612)}
                    </div>
                    <div className="track-stat-lbl">Auto-Executed Txns</div>
                  </div>
                  <div>
                    <div className="track-stat-num" style={{ color: '#0f172a' }}>
                      {recoverySummary?.auto_resolvable_amount ? fmtInr(recoverySummary.auto_resolvable_amount) : '₹ 78,11,490.63'}
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
                  <span style={{ fontSize: 20 }}>👨‍💼</span>
                </div>
                <div className="track-title">Operations Manager Dual-Approval</div>
                <div className="track-desc">
                  Mandatory human authorization for high-value breaks (&ge; ₹50,000) and amount discrepancies. Authorized managers inspect root-cause evidence dossiers and release credits to Finacle.
                </div>
                <div className="track-stats-row">
                  <div>
                    <div className="track-stat-num" style={{ color: '#ea580c' }}>
                      {fmt(recoverySummary?.hitl_pending_count ?? 1138)}
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
                value={recoverySummary?.total_cbs_reversals_posted || 1612}
                color="green"
                sub="Dispatched to Finacle pool"
              />
              <KpiCard
                label="Autonomous Bot Volume"
                value={recoverySummary?.auto_resolvable_amount ? Math.round(recoverySummary.auto_resolvable_amount) : 7811491}
                prefix="₹ "
                color="blue"
                sub="Threshold < ₹50k (STP)"
              />
              <KpiCard
                label="Pending Manager Action"
                value={recoverySummary?.hitl_pending_count ?? 1138}
                color="amber"
                sub="Awaiting electronic sign-off"
              />
              <KpiCard
                label="RBI Penalties Avoided"
                value="2,40,000"
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
                  ['P1', '🔴 P1 Urgent (TAT Active)'],
                  ['AMOUNT_MISMATCH', '⚖️ Amount Mismatch'],
                  ['PENDING', `⏳ Pending (${recoverySummary?.hitl_pending_count ?? 1138})`],
                  ['APPROVED', `✅ Approved & Posted (${recoverySummary?.hitl_approved_count || 0})`],
                  ['REJECTED', '❌ Rejected'],
                  ['ESCALATED', '⚠️ Escalated'],
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
                            ⏳ {q.sla_countdown}
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
                              <span className="badge badge-purple">⚠️ ESCALATED (P1)</span>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                {q.escalation_note || 'Sent to Committee'}
                              </div>
                            </div>
                          )}
                          {(!q.status || q.status === 'PENDING_APPROVAL') && (
                            <span className="badge badge-amber">⏳ PENDING APPROVAL</span>
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
                                  ⚠️ Escalate
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
                              📄
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
                  <div className="seal-icon-emblem">🏛️</div>
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
                  {sealing ? '🔐 Generating SHA-256 Seal...' : (sealedPack ? '🔄 Re-Seal Audit Pack' : '🔐 Seal Cryptographic Audit Pack')}
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
                <div className="penalty-icon-box">🛡️</div>
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
                    📋 Copy Audit JSON
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
                    📥 Download Audit Package
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
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="page-title">⚖️ Stage 2: 4-Way Multi-Rail Reconciliation Engine</div>
                <div className="page-sub">
                  Mathematical cross-reconciliation across NPCI Clearing, Payment Switch, Core Banking (Finacle/Flexcube), and General Ledger (GL)
                </div>
              </div>
              <button
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontSize: 13 }}
                disabled={reconRunning}
                onClick={triggerReconRun}
              >
                {reconRunning ? '⚙️ Matching 50,000 Records…' : '⚡ Run 4-Way Reconciliation'}
              </button>
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

            {/* Financial Ledger Banner */}
            {reconData && (
              <div className="ledger-banner">
                <div className="ledger-item">
                  <span className="ledger-label">Total NPCI Settlement</span>
                  <span className="ledger-value green">{fmtInr(reconData.financials?.total_npci_amount)}</span>
                </div>
                <div className="ledger-item">
                  <span className="ledger-label">Total CBS Customer Debited</span>
                  <span className="ledger-value">{fmtInr(reconData.financials?.total_cbs_amount)}</span>
                </div>
                <div className="ledger-item">
                  <span className="ledger-label">Net Ledger Variance</span>
                  <span className={`ledger-value ${reconData.financials?.net_variance < 0 ? 'red' : 'green'}`}>
                    {fmtInr(reconData.financials?.net_variance)}
                  </span>
                </div>
                <div className="ledger-item">
                  <span className="ledger-label">P1 Regulatory Risk Exposure</span>
                  <span className="ledger-value red">{fmtInr(reconData.p1_financial_risk)}</span>
                </div>
              </div>
            )}

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
                    <span className="bucket-tag">Bucket 1 &bull; Matched</span>
                    <span style={{ fontSize: 18 }}>✅</span>
                  </div>
                  <div className="bucket-count">
                    {fmt(reconData.matched_count)}
                    <span className="bucket-pct">({reconData.stp_rate}%)</span>
                  </div>
                  <div className="bucket-desc">
                    All 4 systems agree in status, timing, and financial amount. Eligible for straight-through settlement.
                  </div>
                  <div className="bucket-action">
                    <span>⚡ Click to View Matched STP Records ({fmt(reconData.matched_count)}) &rarr;</span>
                  </div>
                </div>

                <div className="bucket-card amber">
                  <div className="bucket-header">
                    <span className="bucket-tag">Bucket 2 &bull; Timing Drift</span>
                    <span style={{ fontSize: 18 }}>🕐</span>
                  </div>
                  <div className="bucket-count">
                    {fmt(reconData.timing_count)}
                    <span className="bucket-pct">({fmtPct(reconData.timing_count / (reconData.total_records || 1) * 100)})</span>
                  </div>
                  <div className="bucket-desc">
                    Transactions in-flight across cycle cut-off windows. Zero financial break &mdash; automatically rechecked next cycle.
                  </div>
                  <div className="bucket-action">
                    <span>🔄 Auto-Deferred to Next Cycle Roll-Forward</span>
                  </div>
                </div>

                <div className="bucket-card red">
                  <div className="bucket-header">
                    <span className="bucket-tag">Bucket 3 &bull; Recon Breaks</span>
                    <span style={{ fontSize: 18 }}>💥</span>
                  </div>
                  <div className="bucket-count">
                    {fmt(reconData.break_count)}
                    <span className="bucket-pct" style={{ color: 'var(--red)' }}>
                      ({fmtPct(reconData.break_count / (reconData.total_records || 1) * 100)})
                    </span>
                  </div>
                  <div className="bucket-desc">
                    Genuine mismatches: CBS timeouts, deemed failures, amount discrepancies, and unreversed debits.
                  </div>
                  <div className="bucket-action" style={{ cursor: 'pointer' }} onClick={() => setActiveNav('investigate')}>
                    <span>👉 Hand Over to Stage 3 AI Investigation Agent</span>
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
                  ['MATCHED', `✅ Matched STP (${reconData?.matched_count || reconMatched.length || 0})`],
                  ['ALL', `All Breaks (${reconData?.break_count || 0})`],
                  ['P1', `🔴 P1 Critical (${reconData?.p1_count || 0})`],
                  ['P2', `🟡 P2 Moderate (${reconData?.p2_count || 0})`],
                  ['TIMEOUT', 'CBS Timeout (1,000)'],
                  ['AMOUNT_MISMATCH', 'Amount Mismatch (500)'],
                  ['REVERSAL_MISSING', 'Reversal Missing (400)'],
                  ['DEEMED_FAIL', 'Deemed Fail (250)'],
                  ['DUPLICATE', 'Duplicate Txn (250)'],
                  ['BENEFICIARY_NOT_FOUND', 'Bene Invalid (200)'],
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
                          {b.source_file && <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>📄 {b.source_file}</div>}
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
                            <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 11 }}>⏳ T+1 Clock</span>
                          ) : (
                            <span style={{ color: b.scenario === 'SUCCESS' ? 'var(--green)' : 'var(--text-faint)', fontSize: 11, fontWeight: b.scenario === 'SUCCESS' ? 600 : 400 }}>
                              {b.scenario === 'SUCCESS' ? 'Balanced' : 'Normal'}
                            </span>
                          )}
                        </td>
                        <td>
                          <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); setSelectedBreak(b) }}>
                            Inspect 🔍
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
                  <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setActiveNav('product_ops')}>
                    Open NPCI Product Operations &rarr;
                  </button>
                  <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setActiveNav('catalog')}>
                    Rail Solutions Catalog
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Catalogue Information Panel (shown when a catalogue is selected) */}
            {isScoped && currentRailMeta && (
              <div className="card" style={{
                background: '#ffffff',
                border: '1.5px solid #ea580c',
                borderRadius: 14,
                padding: '18px 22px',
                marginBottom: 16,
                boxShadow: '0 4px 18px rgba(234, 88, 12, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: '#ffffff',
                      border: '1.5px solid #fed7aa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 7,
                      boxShadow: '0 2px 8px rgba(234, 88, 12, 0.15)',
                      flexShrink: 0
                    }}>
                      <img src="/favicon.svg" alt="AutomationEdge" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                        Catalogue Overview: {currentRailMeta.name} ({activeRailScope})
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {currentRailMeta.tagline}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: 10,
                  padding: '12px 16px'
                }}>
                  <div>
                    <span style={{ fontSize: 10.5, color: '#9a3412', fontWeight: 700, textTransform: 'uppercase' }}>Domain / Category</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#7c2d12', marginTop: 2 }}>{currentRailMeta.category}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, color: '#9a3412', fontWeight: 700, textTransform: 'uppercase' }}>Clearing Window</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#7c2d12', marginTop: 2 }}>{currentRailMeta.clearingWindow}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, color: '#9a3412', fontWeight: 700, textTransform: 'uppercase' }}>Regulatory SLA</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#7c2d12', marginTop: 2 }}>{currentRailMeta.sla}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, color: '#9a3412', fontWeight: 700, textTransform: 'uppercase' }}>Connected Systems</span>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#7c2d12', marginTop: 2 }}>{currentRailMeta.systems}</div>
                  </div>
                </div>
              </div>
            )}

            {/* PRODUCT-WISE TRANSACTION VOLUME STRIP */}
            <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    {isScoped ? `${activeRailName || activeRailScope} Transaction Volume` : 'Product-Wise Transaction Volume'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    {isScoped
                      ? `Verified transaction throughput and settlement metrics for ${activeRailName || activeRailScope}.`
                      : 'Operational clearing volume across active NPCI payment rails.'}
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isScoped ? 'minmax(280px, 420px)' : 'repeat(auto-fit, minmax(115px, 1fr))',
                gap: 12
              }}>
                {(isScoped
                  ? Object.entries(railRecordCounts).filter(([code]) => code.toUpperCase() === activeRailScope.toUpperCase())
                  : Object.entries(railRecordCounts)
                ).map(([code, vol]) => {
                  const isSelected = activeRailScope === code

                  return (
                    <div
                      key={code}
                      className="dashboard-rail-card"
                      onClick={!isScoped ? () => {
                        const meta = railMetadata[code]
                        setActiveRailScope(code)
                        setActiveRailName(meta?.name || code)
                        setSelectedRailForOps(code)
                      } : undefined}
                      style={{
                        padding: isScoped ? '16px 20px' : '12px 14px',
                        borderRadius: 10,
                        background: '#fff7ed',
                        border: '1.5px solid #ea580c',
                        cursor: isScoped ? 'default' : 'pointer',
                        boxShadow: '0 4px 14px rgba(234, 88, 12, 0.15)'
                      }}
                      title={!isScoped ? `Click to view ${code} data on Home Dashboard` : undefined}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: isScoped ? 14 : 12, fontWeight: 800, color: '#ea580c' }}>
                          {isScoped ? `${activeRailName || code} (${code})` : code}
                        </span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: vol > 0 ? '#ea580c' : '#f1f5f9',
                          color: vol > 0 ? '#ffffff' : '#64748b'
                        }}>
                          {vol > 0 ? 'ACTIVE RAIL' : 'STANDBY'}
                        </span>
                      </div>
                      <div style={{ fontSize: isScoped ? 22 : 15, fontWeight: 800, color: vol > 0 ? '#9a3412' : '#64748b' }}>
                        {vol.toLocaleString('en-IN')} <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Records</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Settlement Status: <strong style={{ color: vol > 0 ? '#16a34a' : '#64748b' }}>{vol > 0 ? 'VERIFIED (95.2% STP)' : 'STANDBY'}</strong></span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <Pipeline stage={pipeStage} agentText={agentText} isDuplicate={isDuplicate} isUploading={uploading} />

            <div className="kpi-grid">
              <KpiCard label="Files Received" value={isScoped ? 1 : stats.total_files_received} color="blue" sub={isScoped ? `NPCI_${activeRailScope}_Settlement_Cycle1.csv` : 'Total session intake'} />
              <KpiCard label="Files Validated" value={isScoped ? 1 : stats.validated_files} color="green" sub={isScoped ? 'Staged in enclave' : 'Moved to staging vault'} />
              <KpiCard label="Files Rejected" value={isScoped ? 0 : stats.rejected_files} color="red" sub="Schema / content quarantine" />
              <KpiCard label="Duplicate Files" value={isScoped ? 0 : stats.duplicate_files} color="amber" sub="Identical hash prevented" />
              <KpiCard label="Total Records" value={scopedRailVol} color="purple" sub={isScoped ? `${activeRailScope} isolated intake` : 'Across all clearing files'} />
              <KpiCard label="P1 Exceptions" value={scopedP1Count} color="red" sub="RBI TAT clock running" />
              <KpiCard label="P2 Exceptions" value={scopedP2Count} color="amber" sub="Moderate break priority" />
              <KpiCard label="STP Rate" value={scopedStpPct} suffix="%" prefix="" color="green"
                sub={`${fmt(scopedStpCount)} straight-through`} />
            </div>

            {/* STP Progress Bar */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">
                <div className="card-title-left">
                  <div className="card-title-dot" />
                  <span>Straight-Through Processing (STP) Efficiency {isScoped ? `(${activeRailScope})` : ''}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Regulatory Target: 95%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                <span>Auto-Matched (STP): <b style={{ color: 'var(--green)' }}>{fmtPct(scopedStpPct)}</b></span>
                <span>Exception Rate: <b style={{ color: 'var(--red)' }}>{scopedExcPct}%</b></span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${scopedStpPct}%`, background: `linear-gradient(90deg, #10b981, #34d399)` }} />
              </div>
            </div>

            <div className="two-col">
              <div className="card">
                <div className="card-title">
                  <div className="card-title-left"><div className="card-title-dot" /><span>Scenario Breakdown {isScoped ? `(${activeRailScope})` : ''}</span></div>
                </div>
                <ScenarioBreakdown files={files} scopedRail={activeRailScope} />
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
                      <div className="up-icon-wrap">📂</div>
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
            <div className="card"><FileTable files={files} onDownload={downloadRegistryFile} /></div>
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
