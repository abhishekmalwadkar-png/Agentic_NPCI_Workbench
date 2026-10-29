import React, { useState, useEffect } from 'react'

const API = 'http://localhost:8000'

const RAILS = [
  { code: 'UPI',   label: 'UPI',   name: 'Unified Payments Interface (UPI 2.0)', color: '#0284c7' },
  { code: 'IMPS',  label: 'IMPS',  name: 'Immediate Payment Service (IMPS)', color: '#6366f1' },
  { code: 'NACH',  label: 'NACH',  name: 'National Automated Clearing House (NACH)', color: '#059669' },
  { code: 'AEPS',  label: 'AePS',  name: 'Aadhaar Enabled Payment System (AePS)', color: '#d97706' },
  { code: 'RUPAY', label: 'RuPay', name: 'RuPay Multi-Channel Card Scheme', color: '#ea580c' },
  { code: 'CTS',   label: 'CTS',   name: 'Cheque Truncation System (CTS-2010)', color: '#475569' },
  { code: 'BBPS',  label: 'BBPS',  name: 'Bharat Bill Payment System (BBPS)', color: '#0284c7' },
  { code: 'NETC',  label: 'NETC',  name: 'National Electronic Toll Collection (FASTag)', color: '#16a34a' },
]

export default function ProductOperationsView({ initialRail = 'UPI', onSelectRail, onInvestigateTxn }) {
  const [activeRail, setActiveRail] = useState(initialRail)
  const [activeSubTab, setActiveSubTab] = useState('summary') // 'summary' | 'recon' | 'exceptions' | 'settlement' | 'disputes'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('28 Apr 2026')
  const [viewFilter, setViewFilter] = useState('ALL')
  const [selectedTxn, setSelectedTxn] = useState(null)

  const handleRailSelect = (railCode) => {
    setActiveRail(railCode)
    if (onSelectRail) {
      onSelectRail(railCode)
    }
  }

  const fetchRailOps = async (railCode) => {
    try {
      setLoading(true)
      const res = await fetch(`${API}/api/product-operations/${railCode}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRailOps(activeRail)
  }, [activeRail])

  useEffect(() => {
    if (initialRail && initialRail !== activeRail) {
      setActiveRail(initialRail)
    }
  }, [initialRail])

  const kpis = data?.kpi_summary || {
    total_transactions: 412538,
    success_rate: 99.5,
    reversals_count: 1203,
    pending_exceptions: 412,
    sla_breaches: 4
  }

  const transactions = (data?.recent_transactions || []).filter(t => {
    if (viewFilter === 'ALL') return true
    if (viewFilter === 'SUCCESS') return t.status === 'Success'
    if (viewFilter === 'FAILED') return t.status === 'Failed'
    if (viewFilter === 'PENDING') return t.recon_status === 'Pending'
    return true
  })

  return (
    <div>
      {/* ── 1. Top Rail Selector Tab Bar (Screen #2) ────────────────────── */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid var(--border)',
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginRight: 6 }}>
            Select Product Rail:
          </span>
          {RAILS.map(r => {
            const isActive = activeRail === r.code
            return (
              <button
                key={r.code}
                className={`filter-tab ${isActive ? 'active' : ''}`}
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: isActive ? '#ea580c' : '#f8fafc',
                  color: isActive ? '#ffffff' : '#334155',
                  borderColor: isActive ? '#ea580c' : '#cbd5e1',
                  boxShadow: isActive ? '0 2px 6px rgba(234, 88, 12, 0.3)' : 'none'
                }}
                onClick={() => handleRailSelect(r.code)}
              >
                {r.label}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-green" style={{ fontSize: 11, padding: '4px 10px' }}>
            ✓ {activeRail} Rail Online
          </span>
        </div>
      </div>

      {/* ── 2. Header & Controls Strip (Screen #2) ───────────────────────── */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>NPCI Product Operations: {data?.rail_meta?.name || activeRail}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {data?.rail_meta?.tagline || 'End-to-End Product Clearing, 4-Way Reconciliation & Automated CBS Reversals'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Product Rail:</span>
              <select
                value={activeRail}
                onChange={e => handleRailSelect(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1.5px solid #ea580c', fontSize: 12, fontWeight: 700, background: '#fff', color: '#ea580c' }}
              >
                {RAILS.map(r => (
                  <option key={r.code} value={r.code}>{r.label} - {r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Date Range:</span>
              <input
                type="text"
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, width: 120 }}
              />
            </div>

            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>View:</span>
              <select
                value={viewFilter}
                onChange={e => setViewFilter(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, background: '#fff' }}
              >
                <option value="ALL">All Transactions</option>
                <option value="SUCCESS">Success Only</option>
                <option value="FAILED">Exceptions / Breaks</option>
                <option value="PENDING">Pending Recon</option>
              </select>
            </div>

            <button
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: 12, marginTop: 14 }}
              onClick={() => fetchRailOps(activeRail)}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* 5 Operational Sub-Tabs (Screen #2) */}
        <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 12 }}>
          {[
            { id: 'summary',    label: 'Transaction Summary' },
            { id: 'recon',      label: 'Reconciliation' },
            { id: 'exceptions', label: 'Exceptions' },
            { id: 'settlement', label: 'Settlement' },
            { id: 'disputes',   label: 'Disputes' },
          ].map(tab => (
            <button
              key={tab.id}
              className={`filter-tab ${activeSubTab === tab.id ? 'active' : ''}`}
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '6px 16px',
                borderRadius: 6,
                background: activeSubTab === tab.id ? '#0f172a' : '#fff',
                color: activeSubTab === tab.id ? '#fff' : '#475569',
                borderColor: activeSubTab === tab.id ? '#0f172a' : '#cbd5e1'
              }}
              onClick={() => setActiveSubTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3. TAB CONTENT: TRANSACTION SUMMARY (Screen #2) ─────────────── */}
      {activeSubTab === 'summary' && (
        <>
          {/* KPI Cards Strip (Matching Screen #2) */}
          <div className="kpi-grid" style={{ marginBottom: 18 }}>
            <div className="kpi-card" style={{ borderLeft: '4px solid #0284c7' }}>
              <div className="kpi-label">Total Transactions</div>
              <div className="kpi-val" style={{ color: '#0284c7' }}>
                {Number(kpis.total_transactions || 0).toLocaleString('en-IN')}
              </div>
              <div className="kpi-sub" style={{ color: '#16a34a', fontWeight: 600 }}>↑ 12% vs yesterday</div>
            </div>

            <div className="kpi-card" style={{ borderLeft: '4px solid #16a34a' }}>
              <div className="kpi-label">Success Rate</div>
              <div className="kpi-val" style={{ color: '#16a34a' }}>
                {kpis.success_rate}%
              </div>
              <div className="kpi-sub" style={{ color: '#16a34a', fontWeight: 600 }}>↑ 0.4% healthy rail</div>
            </div>

            <div className="kpi-card" style={{ borderLeft: '4px solid #f97316' }}>
              <div className="kpi-label">Auto-Reversals</div>
              <div className="kpi-val" style={{ color: '#ea580c' }}>
                {Number(kpis.reversals_count || 0).toLocaleString('en-IN')}
              </div>
              <div className="kpi-sub" style={{ color: '#16a34a', fontWeight: 600 }}>↓ 28% timeouts recovered</div>
            </div>

            <div className="kpi-card" style={{ borderLeft: '4px solid #eab308' }}>
              <div className="kpi-label">Pending Recon</div>
              <div className="kpi-val" style={{ color: '#ca8a04' }}>
                {kpis.pending_exceptions}
              </div>
              <div className="kpi-sub">Awaiting next batch cut-off</div>
            </div>

            <div className="kpi-card" style={{ borderLeft: '4px solid #dc2626' }}>
              <div className="kpi-label">SLA Breaches</div>
              <div className="kpi-val" style={{ color: '#dc2626' }}>
                {kpis.sla_breaches}
              </div>
              <div className="kpi-sub" style={{ color: '#16a34a', fontWeight: 600 }}>99.9% within RBI T+1</div>
            </div>
          </div>

          {/* Main Layout: Recent Transactions Table (Left) + Exception Trend (Right) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 18 }}>
            {/* Recent Transactions Table (Screen #2) */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                  Recent {activeRail} Transactions
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Showing {transactions.length} live stream items
                </span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Txn ID</th>
                      <th>Type</th>
                      <th>Amount (₹)</th>
                      <th>Status</th>
                      <th>Reconciliation</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.txn_id}>
                        <td style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#64748b' }}>
                          {t.time}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-main)', fontFamily: 'JetBrains Mono' }}>
                          {t.txn_id}
                        </td>
                        <td>
                          <span className="badge badge-gray" style={{ fontSize: 10 }}>{t.type}</span>
                        </td>
                        <td style={{ fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                          ₹ {t.amount.toLocaleString('en-IN')}
                        </td>
                        <td>
                          <span className={`badge ${t.status === 'Success' ? 'badge-green' : 'badge-red'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${t.recon_status === 'Matched' ? 'badge-green' : 'badge-amber'}`}>
                            {t.recon_status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '3px 9px', fontSize: 10.5 }}
                            onClick={() => setSelectedTxn(t)}
                          >
                            {t.action}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Side Panel: Exception Trend & Top Exceptions (Screen #2) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Exception Trend Card */}
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
                  Exception Trend (Last 6 Days)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} /> Total Breaks
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} /> Resolved (CBS STP)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 110, padding: '10px 4px', background: '#f8fafc', borderRadius: 6 }}>
                  {(data?.exception_trend?.timeline || []).map((day, idx) => {
                    const tot = data?.exception_trend?.total_breaks[idx] || 1200
                    const res = data?.exception_trend?.resolved_breaks[idx] || 1170
                    const hTot = Math.min(90, Math.max(30, (tot / 1400) * 90))
                    const hRes = Math.min(90, Math.max(30, (res / 1400) * 90))
                    return (
                      <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 90 }}>
                          <div style={{ width: 7, height: hTot, background: '#ef4444', borderRadius: 2 }} title={`Total: ${tot}`} />
                          <div style={{ width: 7, height: hRes, background: '#16a34a', borderRadius: 2 }} title={`Resolved: ${res}`} />
                        </div>
                        <span style={{ fontSize: 9, color: '#64748b' }}>{day}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Top Exceptions Breakdown (Screen #2) */}
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 10 }}>
                  Top {activeRail} Exceptions
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(data?.exception_trend?.breakdown || []).map(item => (
                    <div key={item.category} style={{ fontSize: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ color: '#334155', fontWeight: 600 }}>{item.category}</span>
                        <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#0f172a' }}>{item.percentage}%</span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${item.percentage * 2.8}%`, height: '100%', background: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── 4. TAB CONTENT: RECONCILIATION ──────────────────────────────── */}
      {activeSubTab === 'recon' && (
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
            4-Way Multi-Leg Reconciliation: {activeRail} Rail
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Mathematical reconciliation across NPCI Clearing vs Payment Switch vs Finacle CBS vs General Ledger Suspense.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>1. NPCI Master File</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                ₹ {Number(data?.reconciliation_summary?.npci_master_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <span className="badge badge-green" style={{ fontSize: 9.5, marginTop: 6 }}>CLEARED</span>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>2. Base24 Payment Switch</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                ₹ {Number(data?.reconciliation_summary?.switch_authorized_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <span className="badge badge-green" style={{ fontSize: 9.5, marginTop: 6 }}>AUTHORIZED</span>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>3. Finacle Core Banking</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                ₹ {Number(data?.reconciliation_summary?.cbs_debit_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <span className="badge badge-green" style={{ fontSize: 9.5, marginTop: 6 }}>POSTED</span>
            </div>

            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 700 }}>4. General Ledger Suspense</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
                ₹ {Number(data?.reconciliation_summary?.gl_suspense_variance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <span className="badge badge-red" style={{ fontSize: 9.5, marginTop: 6 }}>VARIANCE MONITORED</span>
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span><b>Automated Match Status:</b> {data?.reconciliation_summary?.legs_matched} &bull; STP Rate: <b>{data?.reconciliation_summary?.stp_match_rate}</b></span>
            <span className="badge badge-green">T+1 Compliant</span>
          </div>
        </div>
      )}

      {/* ── 5. TAB CONTENT: EXCEPTIONS ─────────────────────────────────── */}
      {activeSubTab === 'exceptions' && (
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>
                Active {activeRail} Reconciliation Exceptions ({kpis.pending_exceptions} Cases)
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                System timeouts, amount mismatches, and failed reversal instructions.
              </div>
            </div>
            <span className="badge badge-red">{kpis.sla_breaches} Critical SLA Breaches</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Txn ID</th>
                  <th>RRN</th>
                  <th>Scenario</th>
                  <th>Amount (₹)</th>
                  <th>Sender &bull; Beneficiary</th>
                  <th>SLA Countdown</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.filter(t => t.status === 'Failed' || t.recon_status === 'Pending').map(t => (
                  <tr key={t.txn_id}>
                    <td style={{ fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{t.txn_id}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', color: '#64748b' }}>{t.rrn}</td>
                    <td><span className="badge badge-red">{t.scenario}</span></td>
                    <td style={{ fontWeight: 700 }}>₹ {t.amount.toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: 11, color: '#475569' }}>{t.sender_bank} &rarr; {t.beneficiary_bank}</td>
                    <td><span className="badge badge-amber">4h 15m remaining</span></td>
                    <td>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '3px 10px', fontSize: 10.5 }}
                        onClick={() => {
                          if (onInvestigateTxn) onInvestigateTxn(t.txn_id)
                        }}
                      >
                        AI Investigate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6. TAB CONTENT: SETTLEMENT ─────────────────────────────────── */}
      {activeSubTab === 'settlement' && (
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
            Net Settlement &amp; Clearing Obligation: {activeRail}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Multilateral net settlement cycle positions certified by RBI RTGS.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 18 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Active Clearing Window</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                {data?.settlement_summary?.clearing_cycle}
              </div>
              <div style={{ fontSize: 11, color: '#0284c7', marginTop: 6 }}>
                RBI RTGS Batch Ref: {data?.settlement_summary?.rbi_rtgs_batch_id}
              </div>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>Net Multilateral Obligation</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                ₹ {Number(data?.settlement_summary?.net_settlement_obligation_inr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: 11, color: '#16a34a', marginTop: 6 }}>
                Status: {data?.settlement_summary?.settlement_status}
              </div>
            </div>
          </div>

          <div style={{ background: '#0f172a', color: '#e2e8f0', borderRadius: 8, padding: '12px 16px', fontFamily: 'JetBrains Mono', fontSize: 11 }}>
            Target GL Account: {data?.settlement_summary?.gl_clearing_account}<br/>
            Regulatory Standard: {data?.rail_meta?.sla_standard}
          </div>
        </div>
      )}

      {/* ── 7. TAB CONTENT: DISPUTES ───────────────────────────────────── */}
      {activeSubTab === 'disputes' && (
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
            Customer Disputes &amp; Chargebacks: {activeRail}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Automated dispute resolution via UDIR &bull; Online Dispute Resolution (ODR) Dossier Assembler.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Open Chargebacks</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                {data?.disputes_summary?.open_chargebacks}
              </div>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>Auto-Represented Dossiers</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
                {data?.disputes_summary?.auto_represented_count}
              </div>
            </div>

            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>Pending Dual-Auth</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#b45309', marginTop: 4 }}>
                {data?.disputes_summary?.pending_dual_auth}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
            All chargebacks are evaluated against <b>RBI Circular DPSS.CO.PD No.629</b>. Representment dossiers containing customer debit advice, Switch ACK, and NPCI clearance records are auto-compiled within the {data?.disputes_summary?.pre_arbitration_window} window.
          </div>
        </div>
      )}

      {/* ── Transaction Inspector Modal ─────────────────────────────────── */}
      {selectedTxn && (
        <div className="modal-overlay" onClick={() => setSelectedTxn(null)}>
          <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ fontSize: 16, fontWeight: 800 }}>
                Transaction Details: {selectedTxn.txn_id}
              </div>
              <button className="modal-close" onClick={() => setSelectedTxn(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>RRN:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{selectedTxn.rrn}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>Amount:</span>
                  <span style={{ fontWeight: 700 }}>₹ {selectedTxn.amount.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>Sender &bull; Beneficiary:</span>
                  <span style={{ fontWeight: 600 }}>{selectedTxn.sender_bank} &rarr; {selectedTxn.beneficiary_bank}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>Status &bull; Recon:</span>
                  <span>
                    <span className={`badge ${selectedTxn.status === 'Success' ? 'badge-green' : 'badge-red'}`} style={{ marginRight: 6 }}>
                      {selectedTxn.status}
                    </span>
                    <span className={`badge ${selectedTxn.recon_status === 'Matched' ? 'badge-green' : 'badge-amber'}`}>
                      {selectedTxn.recon_status}
                    </span>
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => setSelectedTxn(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
