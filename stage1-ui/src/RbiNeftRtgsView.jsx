import React, { useState, useEffect } from 'react'
import { fmtInrAudit, toPaisa, inrToWords, InrAuditBadge } from './currencyHelper.jsx'
import IsoXmlModal from './IsoXmlModal.jsx'

function TablePagination({
  totalItems,
  currentPage,
  pageSize = 3,
  onPageChange,
  onPageSizeChange
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIdx = Math.min(totalItems, currentPage * pageSize)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 14px',
      borderTop: '1px solid #e2e8f0',
      background: '#f8fafc',
      fontSize: 11,
      color: '#64748b',
      flexWrap: 'wrap',
      gap: 10,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>
          Showing <strong style={{ color: '#0f172a' }}>{startIdx}</strong>–<strong style={{ color: '#0f172a' }}>{endIdx}</strong> of <strong style={{ color: '#0f172a' }}>{totalItems}</strong> entries
        </span>
        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 6 }}>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                padding: '1.5px 5px',
                fontSize: 10.5,
                borderRadius: 4,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          style={{
            padding: '3px 8px',
            fontSize: 10.5,
            fontWeight: 700,
            borderRadius: 4,
            border: '1px solid #cbd5e1',
            background: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
            color: currentPage <= 1 ? '#94a3b8' : '#334155',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          &larr; Prev
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
          <button
            key={pg}
            onClick={() => onPageChange(pg)}
            style={{
              padding: '2px 7px',
              fontSize: 10.5,
              fontWeight: currentPage === pg ? 800 : 600,
              borderRadius: 4,
              border: currentPage === pg ? '1px solid #ea580c' : '1px solid #cbd5e1',
              background: currentPage === pg ? '#ea580c' : '#ffffff',
              color: currentPage === pg ? '#ffffff' : '#334155',
              cursor: 'pointer',
              minWidth: 22,
              textAlign: 'center'
            }}
          >
            {pg}
          </button>
        ))}

        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          style={{
            padding: '3px 8px',
            fontSize: 10.5,
            fontWeight: 700,
            borderRadius: 4,
            border: '1px solid #cbd5e1',
            background: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
            color: currentPage >= totalPages ? '#94a3b8' : '#334155',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Next &rarr;
        </button>
      </div>
    </div>
  )
}

export default function RbiNeftRtgsView({
  apiBase = 'http://localhost:8000',
  onNavigateCopilot,
  onSimulateFileDrop,
  onNavigateHitl,
  onNavigateInvestigate,
  viewMode = 'full', // 'full' | 'recon' | 'investigate' | 'hitl'
  activeRail = 'NEFT'
}) {
  const [liquidity, setLiquidity] = useState(null)
  const [reconRecords, setReconRecords] = useState([])
  const [actions, setActions] = useState([])
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL' | 'MATCHED' | 'BREAKS'
  const [sortField, setSortField] = useState('amount') // 'amount' | 'utr' | 'variance' | 'status' | 'rail'
  const [sortDir, setSortDir] = useState('desc') // 'asc' | 'desc'
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [selectedDossier, setSelectedDossier] = useState(null)
  const [dossierFilter, setDossierFilter] = useState('ALL') // 'ALL' | 'CRITICAL' | 'HITL' | 'AUTO'
  const [recentTxnFilter, setRecentTxnFilter] = useState('ALL') // 'ALL' | 'RTGS' | 'NEFT'
  const [selectedIsoTx, setSelectedIsoTx] = useState(null)

  // Pagination states for all tables
  const [hitlPage, setHitlPage] = useState(1)
  const [hitlPageSize, setHitlPageSize] = useState(3)
  const [dossierPage, setDossierPage] = useState(1)
  const [dossierPageSize, setDossierPageSize] = useState(3)
  const [reconPage, setReconPage] = useState(1)
  const [reconPageSize, setReconPageSize] = useState(5)
  const [recentTxnPage, setRecentTxnPage] = useState(1)
  const [recentTxnPageSize, setRecentTxnPageSize] = useState(5)

  const currentRail = (activeRail || 'NEFT').toUpperCase()

  const fetchData = async () => {
    try {
      const [liqRes, reconRes, actRes] = await Promise.all([
        fetch(`${apiBase}/api/rbi/liquidity`).then(r => r.json()).catch(() => null),
        fetch(`${apiBase}/api/rbi/neft-rtgs/3way-recon`).then(r => r.json()).catch(() => ({ records: [] })),
        fetch(`${apiBase}/api/maker-checker/actions`).then(r => r.json()).catch(() => ({ actions: [] }))
      ])
      if (liqRes) setLiquidity(liqRes)
      if (reconRes && reconRes.records) setReconRecords(reconRes.records)
      if (actRes && actRes.actions) setActions(actRes.actions)
    } catch (e) {
      console.error("Error fetching RBI NEFT/RTGS data:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 5000)
    return () => clearInterval(id)
  }, [])

  const handleDecision = async (actionId, decision) => {
    setActionLoading(actionId)
    try {
      const res = await fetch(`${apiBase}/api/maker-checker/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: actionId,
          decision: decision,
          approver_name: 'abhishek.malwadkar',
          remarks: decision === 'APPROVE' ? 'Verified 3-way audit logs. Releasing workflow.' : 'Escalated back to maker.'
        })
      })
      const data = await res.json()
      if (data.status === 'SUCCESS') {
        setActions(prev => prev.map(a => a.id === actionId ? {
          ...a,
          status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          decided_by: 'abhishek.malwadkar',
          decided_at: new Date().toLocaleTimeString(),
          audit_seal: data.audit_seal
        } : a))
      }
    } catch (e) {
      alert(`Decision error: ${e.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sortedAndFilteredRecords = [...reconRecords]
    .filter(r => {
      if (activeTab === 'MATCHED') return r.recon_status === 'MATCHED_STP'
      if (activeTab === 'BREAKS') return r.recon_status !== 'MATCHED_STP'
      return true
    })
    .sort((a, b) => {
      let valA = a[sortField]
      let valB = b[sortField]

      if (sortField === 'status') {
        valA = a.recon_status === 'MATCHED_STP' ? 1 : 0
        valB = b.recon_status === 'MATCHED_STP' ? 1 : 0
        return sortDir === 'asc' ? valA - valB : valB - valA
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA
      }

      valA = String(valA || '').toLowerCase()
      valB = String(valB || '').toLowerCase()
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  // ═════════════════════════════════════════════════════════════════
  // SECTION: 3-WAY RECON TABLE COMPONENT
  // ═════════════════════════════════════════════════════════════════
  const renderReconTableSection = () => {
    const pagedReconRecords = sortedAndFilteredRecords.slice((reconPage - 1) * reconPageSize, reconPage * reconPageSize)

    return (
    <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20, marginBottom: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>3-Way Triangulation Reconciliation Table (UC5 &amp; UC6)</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
              Sorted: {sortField.toUpperCase()} ({sortDir === 'desc' ? 'High-to-Low' : 'Low-to-High'})
            </span>
          </h3>
          <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 12 }}>
            Side-by-side transaction reconciliation of Finacle CBS vs SFMS Switch vs RBI e-Kuber Statement.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Filter Tabs */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: 2, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            {[
              { id: 'ALL', label: `All Orders (${reconRecords.length})` },
              { id: 'MATCHED', label: `STP Matched (${reconRecords.filter(r => r.recon_status === 'MATCHED_STP').length})` },
              { id: 'BREAKS', label: `Exceptions & Breaks (${reconRecords.filter(r => r.recon_status !== 'MATCHED_STP').length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setReconPage(1); }}
                style={{
                  padding: '4px 12px',
                  borderRadius: 4,
                  border: 'none',
                  background: activeTab === tab.id ? '#ffffff' : 'transparent',
                  color: activeTab === tab.id ? '#0f172a' : '#64748b',
                  fontWeight: activeTab === tab.id ? 800 : 600,
                  fontSize: 11.5,
                  cursor: 'pointer',
                  boxShadow: activeTab === tab.id ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Sort Dropdown/Buttons */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => { setSortField('amount'); setSortDir(prev => prev === 'desc' ? 'asc' : 'desc') }}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: '1px solid #cbd5e1',
                background: sortField === 'amount' ? '#e0f2fe' : '#ffffff',
                color: sortField === 'amount' ? '#0369a1' : '#475569',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Sort by Transaction Amount"
            >
              Amount {sortField === 'amount' ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
            </button>
            <button
              onClick={() => { setSortField('status'); setSortDir('asc') }}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: '1px solid #cbd5e1',
                background: sortField === 'status' ? '#fee2e2' : '#ffffff',
                color: sortField === 'status' ? '#b91c1c' : '#475569',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Sort Exceptions and Breaks to Top"
            >
              Breaks First
            </button>
          </div>
        </div>
      </div>

      {/* 3-Way Comparison Table */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th
                onClick={() => handleSort('utr')}
                style={{ padding: '10px 14px', fontWeight: 700, cursor: 'pointer', userSelect: 'none', width: '18%' }}
              >
                UTR &amp; Rail {sortField === 'utr' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
              </th>
              <th style={{ padding: '10px 14px', fontWeight: 700, width: '15%' }}>Finacle CBS</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, width: '15%' }}>SFMS Switch</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, width: '15%' }}>RBI e-Kuber</th>
              <th
                onClick={() => handleSort('amount')}
                style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right', cursor: 'pointer', userSelect: 'none', width: '13%' }}
              >
                Amount (INR) {sortField === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
              </th>
              <th
                onClick={() => handleSort('variance')}
                style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right', cursor: 'pointer', userSelect: 'none', width: '9%' }}
              >
                Variance {sortField === 'variance' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
              </th>
              <th
                onClick={() => handleSort('status')}
                style={{ padding: '10px 14px', fontWeight: 700, cursor: 'pointer', userSelect: 'none', width: '15%' }}
              >
                Recon Status &amp; Reasoning {sortField === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedReconRecords.map((r, i) => {
              const isMatched = r.recon_status === 'MATCHED_STP'
              return (
                <tr
                  key={i}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    borderLeft: isMatched ? '4px solid #10b981' : '4px solid #ef4444',
                    background: isMatched ? '#ffffff' : '#fffdfa'
                  }}
                >
                  {/* UTR & Rail */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontFamily: "'JetBrains Mono', Consolas, monospace", fontSize: 12, letterSpacing: -0.2 }}>
                      {r.utr}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: 3,
                        background: r.rail === 'RTGS' ? '#ede9fe' : '#ccfbf1',
                        color: r.rail === 'RTGS' ? '#6d28d9' : '#0f766e',
                        border: r.rail === 'RTGS' ? '1px solid #ddd6fe' : '1px solid #99f6e4'
                      }}>
                        {r.rail}
                      </span>
                      <span style={{ fontSize: 10.5, color: '#64748b' }}>RRN: {r.rrn}</span>
                    </div>
                  </td>

                  {/* Finacle CBS */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                    <span style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: r.cbs_status === 'DEBITED' ? '#ecfdf5' : '#fef2f2',
                      color: r.cbs_status === 'DEBITED' ? '#047857' : '#b91c1c',
                      border: r.cbs_status === 'DEBITED' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                      display: 'inline-block'
                    }}>
                      {r.cbs_status.replace(/_/g, ' ')}
                    </span>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 4, fontWeight: 500 }}>
                      {r.cbs_gl_leg}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                      {r.cbs_timestamp}
                    </div>
                  </td>

                  {/* SFMS Switch */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                    <span style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: r.sfms_status.includes('ACK') ? '#ecfdf5' : r.sfms_status.includes('INWARD') ? '#eff6ff' : '#fffbeb',
                      color: r.sfms_status.includes('ACK') ? '#047857' : r.sfms_status.includes('INWARD') ? '#1d4ed8' : '#b45309',
                      border: r.sfms_status.includes('ACK') ? '1px solid #a7f3d0' : r.sfms_status.includes('INWARD') ? '1px solid #bfdbfe' : '1px solid #fde68a',
                      display: 'inline-block'
                    }}>
                      {r.sfms_status.replace(/_/g, ' ')}
                    </span>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 4, fontWeight: 500 }}>
                      {r.sfms_msg_type}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                      {r.sfms_timestamp}
                    </div>
                  </td>

                  {/* RBI e-Kuber */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                    <span style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: r.rbi_status === 'SETTLED' ? '#ecfdf5' : '#fef2f2',
                      color: r.rbi_status === 'SETTLED' ? '#047857' : '#b91c1c',
                      border: r.rbi_status === 'SETTLED' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                      display: 'inline-block'
                    }}>
                      {r.rbi_status.replace(/_/g, ' ')}
                    </span>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 4, fontFamily: "'JetBrains Mono', Consolas, monospace" }}>
                      {r.rbi_voucher_no || '—'}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                      {r.rbi_timestamp}
                    </div>
                  </td>

                  {/* Amount (INR) with Paisa Accuracy */}
                  <td
                    style={{ padding: '10px 14px', verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap' }}
                    title={`${inrToWords(r.amount)} • [${toPaisa(r.amount).toLocaleString('en-IN')} Paise]`}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', fontFamily: "'JetBrains Mono', Consolas, monospace" }}>
                      {fmtInrAudit(r.amount)}
                    </div>
                    <div style={{ fontSize: 9.5, color: '#0d9488', fontWeight: 600, marginTop: 1 }}>
                      {toPaisa(r.amount).toLocaleString('en-IN')} Paise
                    </div>
                  </td>

                  {/* Variance */}
                  <td style={{ padding: '10px 14px', verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', Consolas, monospace",
                      color: r.variance === 0 ? '#047857' : '#b91c1c'
                    }}>
                      {fmtInrAudit(r.variance)}
                    </div>
                  </td>

                  {/* Recon Status & Reasoning + ISO XML Button */}
                  <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 4,
                        background: isMatched ? '#ecfdf5' : '#fee2e2',
                        color: isMatched ? '#047857' : '#b91c1c',
                        border: isMatched ? '1px solid #a7f3d0' : '1px solid #fecaca',
                        display: 'inline-block'
                      }}>
                        {isMatched ? '● STP MATCHED' : `● ${r.recon_status.replace(/^BREAK_/, '').replace(/_/g, ' ')}`}
                      </span>

                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedIsoTx(r); }}
                        style={{
                          padding: '2px 7px',
                          fontSize: 9.5,
                          fontWeight: 700,
                          borderRadius: 4,
                          border: '1px solid #fed7aa',
                          background: '#fff7ed',
                          color: '#ea580c',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3
                        }}
                        title="Inspect official ISO 20022 XML payload (pacs.008 / pacs.004)"
                      >
                        ⟨/⟩ ISO XML
                      </button>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#475569', marginTop: 4, lineHeight: 1.35 }}>
                      {r.root_cause}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <TablePagination
          totalItems={sortedAndFilteredRecords.length}
          currentPage={reconPage}
          pageSize={reconPageSize}
          onPageChange={setReconPage}
          onPageSizeChange={(sz) => { setReconPageSize(sz); setReconPage(1); }}
        />
      </div>
    </div>
  )
}

  // ═════════════════════════════════════════════════════════════════
  // SECTION: L2 MAKER-CHECKER COCKPIT COMPONENT
  // ═════════════════════════════════════════════════════════════════
  const renderHitlSection = () => {
    const pagedActions = actions.slice((hitlPage - 1) * hitlPageSize, hitlPage * hitlPageSize)

    return (
      <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                L2 Maker-Checker Approval Cockpit (Human Decision Gate)
              </h3>
              <span style={{ fontSize: 11, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                {actions.filter(a => a.status === 'PENDING_APPROVAL').length} ACTIONS PENDING
              </span>
            </div>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 12 }}>
              Autonomous agents prepare actions (L2); money-moving returns, reversals, and high-value releases require a named human approver.
            </p>
          </div>
        </div>

        {/* Action List Table */}
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 14px', fontWeight: 700, width: '22%' }}>Use Case &amp; Action</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, width: '18%' }}>UTR &amp; Counterparty</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, width: '12%' }}>Amount (INR)</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, width: '28%' }}>Agent Evidence Dossier</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, width: '10%' }}>Status</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, width: '10%', textAlign: 'center' }}>Decision</th>
              </tr>
            </thead>
            <tbody>
              {pagedActions.map(act => {
              const isPending = act.status === 'PENDING_APPROVAL'
              return (
                <tr
                  key={act.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: isPending ? '#ffffff' : '#f8fafc'
                  }}
                >
                  {/* Use Case & Action */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 3 }}>
                      {act.use_case}
                    </span>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                      {act.action_type}
                    </div>
                  </td>

                  {/* UTR & Counterparty */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                      {act.utr}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>
                      {act.customer}
                    </div>
                  </td>

                  {/* Amount */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                      ₹ {act.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </td>

                  {/* Agent Evidence Dossier */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                      Agent Evidence Dossier ({act.agent_name}):
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 14, color: '#334155', fontSize: 11, lineHeight: 1.4 }}>
                      {Object.entries(act.evidence_dossier).map(([k, v], idx) => (
                        <li key={idx} style={{ marginBottom: 2 }}>
                          <b>{k.replace(/_/g, ' ').toUpperCase()}:</b> {v}
                        </li>
                      ))}
                    </ul>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                    <span style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: isPending ? '#fef3c7' : act.status === 'APPROVED' ? '#ecfdf5' : '#fee2e2',
                      color: isPending ? '#92400e' : act.status === 'APPROVED' ? '#047857' : '#991b1b',
                      whiteSpace: 'nowrap'
                    }}>
                      {act.status}
                    </span>
                    {!isPending && (
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, lineHeight: 1.3 }}>
                        <div>{act.decided_by}</div>
                        <div style={{ fontFamily: 'monospace', color: '#059669', fontSize: 9.5 }}>{act.audit_seal}</div>
                      </div>
                    )}
                  </td>

                  {/* Decision Buttons */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'top', textAlign: 'center' }}>
                    {isPending ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 90 }}>
                        <button
                          onClick={() => handleDecision(act.id, 'APPROVE')}
                          disabled={actionLoading === act.id}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 4,
                            border: 'none',
                            background: '#15803d',
                            color: '#ffffff',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(21, 128, 61, 0.2)'
                          }}
                        >
                          {actionLoading === act.id ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleDecision(act.id, 'REJECT')}
                          disabled={actionLoading === act.id}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 4,
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#b91c1c',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: act.status === 'APPROVED' ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                        {act.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <TablePagination
          totalItems={actions.length}
          currentPage={hitlPage}
          pageSize={hitlPageSize}
          onPageChange={setHitlPage}
          onPageSizeChange={(sz) => { setHitlPageSize(sz); setHitlPage(1); }}
        />
      </div>
    </div>
  )
}

  // ═════════════════════════════════════════════════════════════════
  // SECTION: AI INVESTIGATION COMPONENT (WHOLESALE DOSSIERS)
  // ═════════════════════════════════════════════════════════════════
  const renderInvestigateSection = () => {
    const wholesaleDossiers = actions.map((act, idx) => ({
      dossier_id: `DOS_${currentRail}_${1001 + idx}`,
      action_id: act.id,
      use_case: act.use_case,
      action_type: act.action_type,
      utr: act.utr,
      customer: act.customer,
      amount: act.amount,
      agent_name: act.agent_name,
      evidence_dossier: act.evidence_dossier,
      status: act.status,
      confidence_score: 96.4,
      sla_countdown: act.use_case.includes('Return') ? '1h 14m' : act.use_case.includes('TAT') ? 'T+1 Clock' : '2h 45m',
      sla_urgency: act.use_case.includes('Return') ? 'CRITICAL' : 'WARNING',
      resolution_route: act.amount >= 5000000 ? 'HITL Dual-Signoff' : 'Automated Agent Proposal'
    }))

    const filteredWholesale = wholesaleDossiers.filter(d => {
      if (dossierFilter === 'CRITICAL') return d.sla_urgency === 'CRITICAL'
      if (dossierFilter === 'HITL') return d.resolution_route.includes('HITL')
      if (dossierFilter === 'AUTO') return d.resolution_route.includes('Automated')
      return true
    })

    const pagedWholesale = filteredWholesale.slice((dossierPage - 1) * dossierPageSize, dossierPage * dossierPageSize)

    return (
      <div>
        {/* AI Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
              Stage 3: Wholesale AI Break Investigation Agent ({currentRail})
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
              Autonomous Diagnostic Reasoning &bull; ISO 20022 Switch Log Correlation (pacs.008 / pacs.004) &bull; RBI T+1 TAT Countdown &bull; Multi-System Evidence Dossier Pack
            </div>
          </div>

          {onNavigateHitl && (
            <button
              onClick={onNavigateHitl}
              style={{
                padding: '6px 14px',
                borderRadius: 5,
                border: 'none',
                background: '#ea580c',
                color: '#ffffff',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(234, 88, 12, 0.2)'
              }}
            >
              Hand Over to HITL Cockpit &rarr;
            </button>
          )}
        </div>

        {/* AI KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 14 }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Wholesale Breaks</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#6d28d9', marginTop: 4 }}>{actions.length}</div>
            <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>Triangulated Exceptions</div>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>P1 Critical Returns</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>1</div>
            <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>2-hour Batch Return SLA</div>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>High-Value Releases (&ge;₹5 Cr)</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#ea580c', marginTop: 4 }}>1</div>
            <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>Dual Maker-Checker Required</div>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Avg AI Diagnostic Confidence</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>96.4%</div>
            <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>Automated Triangulation</div>
          </div>
        </div>

        {/* Evidence Dossier Explorer */}
        <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Wholesale Evidence Dossier Explorer ({filteredWholesale.length} Records)
              </h3>
              <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 12 }}>
                Click &ldquo;View Dossier&rdquo; for full AI diagnostic breakdown, regulatory timeline &amp; audit evidence.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { id: 'ALL', label: `All (${wholesaleDossiers.length})` },
                { id: 'CRITICAL', label: 'Critical (< 2h)' },
                { id: 'HITL', label: 'HITL Required' },
                { id: 'AUTO', label: 'Automated Proposals' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => { setDossierFilter(f.id); setDossierPage(1); }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    border: '1px solid #cbd5e1',
                    background: dossierFilter === f.id ? '#0f172a' : '#ffffff',
                    color: dossierFilter === f.id ? '#ffffff' : '#475569',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Dossier ID</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>UTR &amp; Rail</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Amount (INR)</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>AI Root-Cause Finding</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Confidence</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>RBI TAT Clock</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Routing</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedWholesale.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => setSelectedDossier(d)}>
                    <td style={{ padding: '12px 14px' }}>
                      <code style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{d.dossier_id}</code>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{d.utr}</div>
                      <div style={{ fontSize: 10.5, color: '#64748b' }}>{d.customer}</div>
                    </td>
                    <td
                      style={{ padding: '10px 12px', fontWeight: 800, whiteSpace: 'nowrap' }}
                      title={`${inrToWords(d.amount)} • [${toPaisa(d.amount).toLocaleString('en-IN')} Paise]`}
                    >
                      <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#0f172a' }}>
                        {fmtInrAudit(d.amount)}
                      </div>
                      <div style={{ fontSize: 9.5, color: '#0d9488', fontWeight: 600 }}>
                        {toPaisa(d.amount).toLocaleString('en-IN')} Paise
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: 280 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{d.action_type}</div>
                      <div style={{ fontSize: 10.5, color: '#475569', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {Object.values(d.evidence_dossier)[0]}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: '#059669', fontWeight: 800 }}>{d.confidence_score}%</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: d.sla_urgency === 'CRITICAL' ? '#fef2f2' : '#fffbeb',
                        color: d.sla_urgency === 'CRITICAL' ? '#b91c1c' : '#b45309',
                        border: d.sla_urgency === 'CRITICAL' ? '1px solid #fecaca' : '1px solid #fde68a'
                      }}>
                        {d.sla_countdown}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: '#f1f5f9',
                        color: '#334155'
                      }}>
                        {d.resolution_route}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedDossier(d); }}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            fontSize: 10.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          View Dossier
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedIsoTx(d); }}
                          style={{
                            padding: '2px 7px',
                            borderRadius: 4,
                            border: '1px solid #fed7aa',
                            background: '#fff7ed',
                            color: '#ea580c',
                            fontSize: 9.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                          title="Inspect ISO 20022 XML Message (pacs.004 return)"
                        >
                          ⟨/⟩ ISO XML
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination
              totalItems={filteredWholesale.length}
              currentPage={dossierPage}
              pageSize={dossierPageSize}
              onPageChange={setDossierPage}
              onPageSizeChange={(sz) => { setDossierPageSize(sz); setDossierPage(1); }}
            />
          </div>
        </div>

        {/* Dossier Detail Modal */}
        {selectedDossier && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              maxWidth: 640,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                    {selectedDossier.dossier_id} &bull; {selectedDossier.use_case}
                  </span>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                    {selectedDossier.action_type}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDossier(null)}
                  style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginTop: 14, fontSize: 12.5, lineHeight: 1.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, background: '#f8fafc', padding: 10, borderRadius: 6 }}>
                  <div>
                    <span style={{ color: '#64748b' }}>UTR:</span> <b style={{ fontFamily: 'monospace' }}>{selectedDossier.utr}</b>
                    <div style={{ color: '#64748b', fontSize: 11 }}>{selectedDossier.customer}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#64748b' }}>Amount:</span>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                      ₹ {selectedDossier.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div style={{ fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Multi-System Evidence Pack ({selectedDossier.agent_name}):
                </div>
                <ul style={{ background: '#f1f5f9', padding: '10px 10px 10px 24px', borderRadius: 6, margin: 0, fontSize: 12 }}>
                  {Object.entries(selectedDossier.evidence_dossier).map(([k, v], idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>
                      <b>{k.replace(/_/g, ' ').toUpperCase()}:</b> {v}
                    </li>
                  ))}
                </ul>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <span style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>
                    AI Confidence Score: {selectedDossier.confidence_score}% (Validated)
                  </span>
                  {onNavigateHitl && (
                    <button
                      onClick={() => {
                        setSelectedDossier(null)
                        onNavigateHitl()
                      }}
                      style={{
                        padding: '8px 16px',
                        background: '#15803d',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      Authorize in HITL Cockpit &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════════
  // VIEW MODE ROUTER: 'recon' | 'investigate' | 'hitl' | 'full'
  // ═════════════════════════════════════════════════════════════════
  if (viewMode === 'recon') {
    return (
      <div style={{ padding: '12px 18px', maxWidth: 1440, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Stage 2 Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
              Stage 2: 3-Way Triangulation Reconciliation Engine ({currentRail})
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
              Mathematical 3-Way cross-reconciliation across Core Banking (Finacle CBS), Payment Switch (SFMS ISO 20022), and Central Bank Settlement Statement (RBI e-Kuber).
            </div>
          </div>
        </div>

        {/* 3 Inbound Systems Status Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginBottom: 14 }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 12 }}>1. Core Banking (CBS) Dump</div>
              <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>Finacle 10.x Debits &amp; GL-14022 Suspense</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#ecfdf5', color: '#047857', padding: '2px 7px', borderRadius: 4, border: '1px solid #a7f3d0' }}>
              SYNCED
            </span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 12 }}>2. Payment Switch (SFMS ISO 20022)</div>
              <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>pacs.008 outward/inward &amp; pacs.004 returns</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#ecfdf5', color: '#047857', padding: '2px 7px', borderRadius: 4, border: '1px solid #a7f3d0' }}>
              ONLINE
            </span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 12 }}>3. Central Bank (RBI e-Kuber)</div>
              <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>Multilateral net batch / gross settlement vouchers</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#ecfdf5', color: '#047857', padding: '2px 7px', borderRadius: 4, border: '1px solid #a7f3d0' }}>
              SETTLED
            </span>
          </div>
        </div>

        {/* 3 Core Output Buckets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginBottom: 16 }}>
          <div style={{ background: '#ffffff', border: '1.5px solid #86efac', borderRadius: 8, padding: '10px 14px' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '2px 6px', borderRadius: 3 }}>
              Bucket 1 &bull; Matched STP
            </span>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#166534', marginTop: 4 }}>
              14,460 <span style={{ fontSize: 11.5, fontWeight: 600 }}>(96.4%)</span>
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>
              All 3 systems agree in UTR, amount, and value date. Zero-delta balancing entry posted.
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1.5px solid #fed7aa', borderRadius: 8, padding: '10px 14px' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#9a3412', background: '#ffedd5', padding: '2px 6px', borderRadius: 3 }}>
              Bucket 2 &bull; Timing Drift
            </span>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#c2410c', marginTop: 4 }}>
              0 <span style={{ fontSize: 11.5, fontWeight: 600 }}>(0.0%)</span>
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>
              Transactions in-flight across cycle cut-off windows. Zero financial break &mdash; checked next cycle.
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '10px 14px' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#991b1b', background: '#fee2e2', padding: '2px 6px', borderRadius: 3 }}>
              Bucket 3 &bull; Triangulation Breaks
            </span>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
              540 <span style={{ fontSize: 11.5, fontWeight: 600 }}>(3.6%)</span>
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>
              Closed account rejects, SFMS timeout breaks &amp; pre-submission holds routed to AI agent.
            </div>
            {onNavigateInvestigate && (
              <div
                style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: '#dc2626', cursor: 'pointer' }}
                onClick={onNavigateInvestigate}
              >
                Hand Over to AI Investigation Agent &rarr;
              </div>
            )}
          </div>
        </div>

        {/* Reconciliation Table */}
        {renderReconTableSection()}

        {selectedIsoTx && (
          <IsoXmlModal
            transaction={selectedIsoTx}
            onClose={() => setSelectedIsoTx(null)}
          />
        )}
      </div>
    )
  }

  if (viewMode === 'investigate') {
    return (
      <div style={{ padding: '12px 18px', maxWidth: 1440, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
        {renderInvestigateSection()}

        {selectedIsoTx && (
          <IsoXmlModal
            transaction={selectedIsoTx}
            onClose={() => setSelectedIsoTx(null)}
          />
        )}
      </div>
    )
  }

  if (viewMode === 'hitl') {
    return (
      <div style={{ padding: '12px 18px', maxWidth: 1440, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Stage 5 Header */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
            Stages 4 &amp; 5: L2 Maker-Checker Approval Cockpit ({currentRail})
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
            Dual-track financial recovery: Autonomous Finacle Bot + Human-in-the-Loop Sign-Off under RBI T+1 TAT mandate.
          </div>
        </div>

        {renderHitlSection()}

        {selectedIsoTx && (
          <IsoXmlModal
            transaction={selectedIsoTx}
            onClose={() => setSelectedIsoTx(null)}
          />
        )}
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════════
  // DEFAULT / 'full' MODE (RBI Operations Overview: Metrics, Graphs, Recent Txns)
  // ═════════════════════════════════════════════════════════════════
  const RECENT_WHOLESALE_TRANSACTIONS = [
    {
      utr: 'RBTR20261118000101',
      rail: 'RTGS',
      mode: 'Real-Time Gross',
      time: '15:22:14 IST',
      remitter: 'Reliance Industries Ltd',
      beneficiary: 'State Bank of India Corporate',
      amount: 25000000.00,
      status_label: 'Gross Settled',
      voucher: 'RBI-GROSS-20261118-00101'
    },
    {
      utr: 'NEFT20261118000102',
      rail: 'NEFT',
      mode: 'Batch 29 DNS',
      time: '15:18:30 IST',
      remitter: 'HDFC Corporate Treasury',
      beneficiary: 'Tata Consultancy Services',
      amount: 18500000.00,
      status_label: 'Batch Settled',
      voucher: 'RBI-NET-20261118-B29-002'
    },
    {
      utr: 'RBTR20261118000108',
      rail: 'RTGS',
      mode: 'Real-Time Gross',
      time: '15:12:05 IST',
      remitter: 'Larsen & Toubro Project Div',
      beneficiary: 'ICICI Bank Treasury',
      amount: 54000000.00,
      status_label: 'Gross Settled',
      voucher: 'RBI-GROSS-20261118-00108'
    },
    {
      utr: 'NEFT20261118000109',
      rail: 'NEFT',
      mode: 'Batch 29 DNS',
      time: '15:00:00 IST',
      remitter: 'Infosys Limited Payroll',
      beneficiary: 'Axis Bank Operations',
      amount: 9200000.00,
      status_label: 'Batch Settled',
      voucher: 'RBI-NET-20261118-B29-014'
    },
    {
      utr: 'RBTR20261118000115',
      rail: 'RTGS',
      mode: 'Real-Time Gross',
      time: '14:48:22 IST',
      remitter: 'Adani Green Energy Ltd',
      beneficiary: 'Goldman Sachs Custody',
      amount: 85000000.00,
      status_label: 'Gross Settled',
      voucher: 'RBI-GROSS-20261118-00115'
    },
    {
      utr: 'NEFT20261118000119',
      rail: 'NEFT',
      mode: 'Batch 28 DNS',
      time: '14:30:00 IST',
      remitter: 'Mahindra & Mahindra Ltd',
      beneficiary: 'Kotak Mahindra Bank',
      amount: 6750000.00,
      status_label: 'Batch Settled',
      voucher: 'RBI-NET-20261118-B28-022'
    },
    {
      utr: 'RBTR20261118000122',
      rail: 'RTGS',
      mode: 'Real-Time Gross',
      time: '14:15:39 IST',
      remitter: 'Bharti Airtel Ltd',
      beneficiary: 'Citibank N.A. India',
      amount: 32000000.00,
      status_label: 'Gross Settled',
      voucher: 'RBI-GROSS-20261118-00122'
    },
    {
      utr: 'NEFT20261118000125',
      rail: 'NEFT',
      mode: 'Batch 28 DNS',
      time: '14:00:00 IST',
      remitter: 'ITC Limited Agro Division',
      beneficiary: 'Punjab National Bank',
      amount: 4100000.00,
      status_label: 'Batch Settled',
      voucher: 'RBI-NET-20261118-B28-041'
    }
  ]

  const filteredWholesaleTxns = RECENT_WHOLESALE_TRANSACTIONS.filter(t => {
    if (recentTxnFilter === 'RTGS') return t.rail === 'RTGS'
    if (recentTxnFilter === 'NEFT') return t.rail === 'NEFT'
    return true
  })

  const pagedWholesaleTxns = filteredWholesaleTxns.slice((recentTxnPage - 1) * recentTxnPageSize, recentTxnPage * recentTxnPageSize)

  return (
    <div style={{ padding: '12px 18px', maxWidth: 1440, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ── 1. Page Title & Overview ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            RBI NEFT &amp; RTGS Central Operations Workbench
          </h1>
          <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 11.5 }}>
            Wholesale clearing &amp; settlement intelligence, e-Kuber liquidity float, half-hourly DNS batches, and live gross transaction telemetry.
          </p>
        </div>
      </div>

      {/* ── 2. Top Telemetry Metrics Cards ── */}
      {liquidity && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 14 }}>
          
          {/* Card 1: RBI Settlement Account Balance */}
          <div style={{ background: '#ffffff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0d9488', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                RBI e-Kuber Settlement Float (UC3)
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, background: '#ecfdf5', color: '#047857', padding: '1.5px 6px', borderRadius: 4, border: '1px solid #a7f3d0' }}>
                {liquidity.liquidity_status}
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
              ₹ {(liquidity.current_balance_inr / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Crores</span>
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 3, display: 'flex', justifyContent: 'space-between' }}>
              <span>Intraday Facility (ILF): ₹{(liquidity.intraday_liquidity_facility_limit_inr/10000000).toFixed(0)} Cr</span>
              <span style={{ color: '#059669', fontWeight: 600 }}>Gridlock Risk: {(liquidity.gridlock_risk_score * 100).toFixed(0)}% (Low)</span>
            </div>
            <div style={{ marginTop: 6, height: 3.5, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: '82%', height: '100%', background: '#0d9488' }} />
            </div>
          </div>

          {/* Card 2: RTGS In-Flight Queue Depth */}
          <div style={{ background: '#ffffff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0', borderLeft: '4px solid #7c3aed', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                RTGS Outward Queue Depth (UC2)
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, background: '#f5f3ff', color: '#6d28d9', padding: '1.5px 6px', borderRadius: 4, border: '1px solid #ddd6fe' }}>
                {liquidity.rtgs_queue.status}
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
              {liquidity.rtgs_queue.queue_depth} <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Active Orders</span>
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 3, display: 'flex', justifyContent: 'space-between' }}>
              <span>Queued Value: ₹{(liquidity.rtgs_queue.total_queued_value_inr/10000000).toFixed(2)} Cr</span>
              <span style={{ color: '#7c3aed', fontWeight: 600 }}>Oldest: {liquidity.rtgs_queue.oldest_item_age_seconds}s</span>
            </div>
            <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 4 }}>
              Avg Gross Latency: {liquidity.rtgs_queue.avg_processing_time_sec}s &bull; No Stuck Queues
            </div>
          </div>

          {/* Card 3: NEFT Half-Hourly Batch Monitor */}
          <div style={{ background: '#ffffff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ea580c', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                NEFT Half-Hourly Batch (UC2)
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, background: '#fff7ed', color: '#c2410c', padding: '1.5px 6px', borderRadius: 4, border: '1px solid #fed7aa' }}>
                CYCLE {liquidity.neft_batch.current_cycle_no} OF 48
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#ea580c', marginTop: 4 }}>
              {Math.floor(liquidity.neft_batch.seconds_to_cutoff / 60)}m {liquidity.neft_batch.seconds_to_cutoff % 60}s <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>to Cut-Off</span>
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 3, display: 'flex', justifyContent: 'space-between' }}>
              <span>Accumulated: {liquidity.neft_batch.in_flight_outward_txns.toLocaleString()} txns</span>
              <span style={{ color: '#ea580c', fontWeight: 600 }}>Est. Net: +₹{(liquidity.neft_batch.multilateral_net_position_estimate/10000000).toFixed(2)} Cr</span>
            </div>
            <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 4 }}>
              Cut-off at {liquidity.neft_batch.cut_off_time_ist} &bull; Multilateral DNS settlement
            </div>
          </div>

        </div>
      )}

      {/* ── 3. Visual Settlement Trends & Liquidity Graphs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 12, marginBottom: 16 }}>
        
        {/* Graph 1: NEFT Half-Hourly Batch Volume Trends */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a' }}>NEFT 24-Hour Half-Hourly Batch Trends</div>
              <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>Cycle transaction volume (txns) across half-hourly cut-off windows</div>
            </div>
            <span style={{ fontSize: 10, background: '#f0fdfa', color: '#0f766e', padding: '2px 7px', borderRadius: 4, fontWeight: 700, border: '1px solid #ccfbf1' }}>
              48 Batches / Day (24x7)
            </span>
          </div>

          <div style={{ width: '100%', height: 125 }}>
            <svg viewBox="0 0 540 160" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="neftBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.75" />
                </linearGradient>
                <linearGradient id="neftActiveBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ea580c" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.85" />
                </linearGradient>
              </defs>
              <line x1="38" y1="20" x2="525" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="38" y1="60" x2="525" y2="60" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="38" y1="100" x2="525" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="38" y1="140" x2="525" y2="140" stroke="#e2e8f0" />

              <text x="32" y="24" fontSize="9" fill="#94a3b8" textAnchor="end">2,000</text>
              <text x="32" y="64" fontSize="9" fill="#94a3b8" textAnchor="end">1,500</text>
              <text x="32" y="104" fontSize="9" fill="#94a3b8" textAnchor="end">1,000</text>
              <text x="32" y="144" fontSize="9" fill="#94a3b8" textAnchor="end">0</text>

              {[
                { c: 'B20', v: 920, h: 65, x: 48 },
                { c: 'B21', v: 1100, h: 78, x: 91 },
                { c: 'B22', v: 1350, h: 95, x: 134 },
                { c: 'B23', v: 1680, h: 118, x: 177 },
                { c: 'B24', v: 1420, h: 100, x: 220 },
                { c: 'B25', v: 1250, h: 88, x: 263 },
                { c: 'B26', v: 1540, h: 108, x: 306 },
                { c: 'B27', v: 1720, h: 121, x: 349 },
                { c: 'B28', v: 1610, h: 113, x: 392 },
                { c: 'B29', v: 1850, h: 130, x: 435 },
                { c: 'B30 (Live)', v: 1420, h: 100, x: 478, live: true }
              ].map((bar, idx) => (
                <g key={idx}>
                  <rect
                    x={bar.x}
                    y={140 - bar.h}
                    width="26"
                    height={bar.h}
                    rx="3"
                    fill={bar.live ? "url(#neftActiveBar)" : "url(#neftBarGrad)"}
                  />
                  <text x={bar.x + 13} y={135 - bar.h} fontSize="8.5" fontWeight="700" fill={bar.live ? "#ea580c" : "#0f766e"} textAnchor="middle">
                    {bar.v}
                  </text>
                  <text x={bar.x + 13} y="153" fontSize="8.5" fill="#64748b" textAnchor="middle">
                    {bar.c}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: 10.5, color: '#64748b' }}>
            <span>Average Net Position: <b>+₹ 28.40 Cr</b></span>
            <span style={{ color: '#ea580c', fontWeight: 700 }}>● Batch 30 Open (Cut-off in 12m)</span>
          </div>
        </div>

        {/* Graph 2: RTGS Real-Time Gross Settlement & Liquidity Curve */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a' }}>RTGS Intraday Liquidity &amp; Settlement Curve</div>
              <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>e-Kuber float balance (₹ Cr) with ILF prudential buffer floor</div>
            </div>
            <span style={{ fontSize: 10, background: '#f5f3ff', color: '#6d28d9', padding: '2px 7px', borderRadius: 4, fontWeight: 700, border: '1px solid #ddd6fe' }}>
              T+0 Gross Real-Time
            </span>
          </div>

          <div style={{ width: '100%', height: 125 }}>
            <svg viewBox="0 0 540 160" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="rtgsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="40" y1="20" x2="520" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="40" y1="60" x2="520" y2="60" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="40" y1="100" x2="520" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="40" y1="140" x2="520" y2="140" stroke="#e2e8f0" />

              <text x="32" y="24" fontSize="9" fill="#94a3b8" textAnchor="end">₹600 Cr</text>
              <text x="32" y="64" fontSize="9" fill="#94a3b8" textAnchor="end">₹450 Cr</text>
              <text x="32" y="104" fontSize="9" fill="#94a3b8" textAnchor="end">₹300 Cr</text>
              <text x="32" y="144" fontSize="9" fill="#94a3b8" textAnchor="end">₹0 Cr</text>

              {/* ILF Facility Limit Line (₹150 Cr threshold) */}
              <line x1="40" y1="118" x2="520" y2="118" stroke="#ef4444" strokeDasharray="4 4" strokeWidth="1.5" />
              <text x="515" y="114" fontSize="8.5" fill="#ef4444" textAnchor="end" fontWeight="700">ILF Buffer Floor: ₹150 Cr</text>

              <polygon
                points="50,140 50,55 95,50 140,65 185,45 230,58 275,40 320,52 365,48 410,42 455,45 500,43 500,140"
                fill="url(#rtgsAreaGrad)"
              />
              <polyline
                points="50,55 95,50 140,65 185,45 230,58 275,40 320,52 365,48 410,42 455,45 500,43"
                fill="none"
                stroke="#7c3aed"
                strokeWidth="2.5"
              />
              {[
                { x: 50, y: 55, l: '09:00' },
                { x: 140, y: 65, l: '11:00' },
                { x: 230, y: 58, l: '13:00' },
                { x: 320, y: 52, l: '15:00' },
                { x: 410, y: 42, l: '17:00' },
                { x: 500, y: 43, l: 'Current' }
              ].map((pt, idx) => (
                <g key={idx}>
                  <circle cx={pt.x} cy={pt.y} r="3" fill="#7c3aed" stroke="#ffffff" strokeWidth="1.5" />
                  <text x={pt.x} y="153" fontSize="8.5" fill="#64748b" textAnchor="middle">{pt.l}</text>
                </g>
              ))}
              <circle cx="500" cy="43" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
              <text x="500" y="33" fontSize="9" fill="#047857" fontWeight="800" textAnchor="middle">₹ 482.5 Cr</text>
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: 10.5, color: '#64748b' }}>
            <span>Reserve: <b>₹ 500.00 Cr</b> &bull; Min Float: <b>₹ 420.00 Cr</b></span>
            <span style={{ color: '#047857', fontWeight: 700 }}>● Optimal Liquidity (Gridlock Risk: 2%)</span>
          </div>
        </div>

      </div>

      {/* ── 4. Recent Transactions Done ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Recent Wholesale Transactions &amp; Settlement Confirmations
            </h3>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 11 }}>
              Live audit trail of settled RTGS gross transfers and NEFT half-hourly multilateral batches via RBI e-Kuber.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'ALL', label: `All Settlements (${RECENT_WHOLESALE_TRANSACTIONS.length})` },
              { id: 'RTGS', label: `RTGS Gross (${RECENT_WHOLESALE_TRANSACTIONS.filter(t => t.rail === 'RTGS').length})` },
              { id: 'NEFT', label: `NEFT Batches (${RECENT_WHOLESALE_TRANSACTIONS.filter(t => t.rail === 'NEFT').length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setRecentTxnFilter(tab.id); setRecentTxnPage(1); }}
                style={{
                  padding: '4px 10px',
                  fontSize: 10.5,
                  fontWeight: recentTxnFilter === tab.id ? 700 : 500,
                  borderRadius: 5,
                  border: recentTxnFilter === tab.id ? '1px solid #ea580c' : '1px solid #e2e8f0',
                  background: recentTxnFilter === tab.id ? '#ffedd5' : '#ffffff',
                  color: recentTxnFilter === tab.id ? '#c2410c' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '7px 10px' }}>UTR &amp; Time</th>
                <th style={{ padding: '7px 10px' }}>Rail &amp; Clearing Mode</th>
                <th style={{ padding: '7px 10px' }}>Remitter &rarr; Beneficiary</th>
                <th style={{ padding: '7px 10px' }}>Settlement Voucher ID</th>
                <th style={{ padding: '7px 10px', textAlign: 'right' }}>Gross Amount (INR)</th>
                <th style={{ padding: '7px 10px', textAlign: 'center' }}>Settlement Status</th>
                <th style={{ padding: '7px 10px', textAlign: 'center' }}>ISO 20022 XML</th>
              </tr>
            </thead>
            <tbody>
              {pagedWholesaleTxns.map((tx, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                  <td style={{ padding: '7px 10px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                      {tx.utr}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{tx.time}</div>
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    <span style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '1.5px 6px',
                      borderRadius: 3,
                      background: tx.rail === 'RTGS' ? '#f5f3ff' : '#f0fdfa',
                      color: tx.rail === 'RTGS' ? '#6d28d9' : '#0f766e',
                      border: tx.rail === 'RTGS' ? '1px solid #ddd6fe' : '1px solid #ccfbf1',
                      marginRight: 5
                    }}>
                      {tx.rail}
                    </span>
                    <span style={{ fontSize: 11, color: '#475569' }}>{tx.mode}</span>
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    <div style={{ fontWeight: 650, color: '#0f172a', fontSize: 11.5 }}>{tx.remitter}</div>
                    <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>&rarr; {tx.beneficiary}</div>
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    <code style={{ fontSize: 10.5, color: '#0f766e', background: '#f0fdf4', padding: '1.5px 5px', borderRadius: 3, border: '1px solid #bbf7d0' }}>
                      {tx.voucher}
                    </code>
                  </td>
                  <td
                    style={{ padding: '7px 10px', textAlign: 'right' }}
                    title={`${inrToWords(tx.amount)} • [${toPaisa(tx.amount).toLocaleString('en-IN')} Paise]`}
                  >
                    <div style={{ fontWeight: 800, color: '#0f172a', fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>
                      {fmtInrAudit(tx.amount)}
                    </div>
                    <div style={{ fontSize: 9.5, color: '#0d9488', fontWeight: 600 }}>
                      {toPaisa(tx.amount).toLocaleString('en-IN')} Paise
                    </div>
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: '#ecfdf5',
                      color: '#047857',
                      border: '1px solid #a7f3d0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3
                    }}>
                      ✓ {tx.status_label}
                    </span>
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedIsoTx(tx)}
                      style={{
                        padding: '2.5px 8px',
                        borderRadius: 4,
                        border: '1px solid #fed7aa',
                        background: '#fff7ed',
                        color: '#ea580c',
                        fontSize: 9.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3
                      }}
                      title="Inspect official ISO 20022 XML message (pacs.008)"
                    >
                      ⟨/⟩ Raw XML
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TablePagination
            totalItems={filteredWholesaleTxns.length}
            currentPage={recentTxnPage}
            pageSize={recentTxnPageSize}
            onPageChange={setRecentTxnPage}
            onPageSizeChange={(sz) => { setRecentTxnPageSize(sz); setRecentTxnPage(1); }}
          />
        </div>
      </div>

      {selectedIsoTx && (
        <IsoXmlModal
          transaction={selectedIsoTx}
          onClose={() => setSelectedIsoTx(null)}
        />
      )}

    </div>
  )
}
