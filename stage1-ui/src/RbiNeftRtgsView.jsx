import React, { useState, useEffect } from 'react'

export default function RbiNeftRtgsView({ apiBase = 'http://localhost:8000', onNavigateCopilot }) {
  const [liquidity, setLiquidity] = useState(null)
  const [reconRecords, setReconRecords] = useState([])
  const [actions, setActions] = useState([])
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL' | 'MATCHED' | 'BREAKS'
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

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

  const filteredRecords = reconRecords.filter(r => {
    if (activeTab === 'MATCHED') return r.recon_status === 'MATCHED_STP'
    if (activeTab === 'BREAKS') return r.recon_status !== 'MATCHED_STP'
    return true
  })

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1440, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ── 1. Page Title & Overview ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              RBI NEFT &amp; RTGS Central Operations Workbench
            </h1>
            <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 4, fontWeight: 700, border: '1px solid #fde68a' }}>
              WHOLESALE CLEARING • 24x7 e-KUBER
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Continuous 3-Way Reconciliation across Core Banking (Finacle), SFMS Gateway (ISO 20022), and RBI e-Kuber Statement with L2 Maker-Checker Governance.
          </p>
        </div>

        {onNavigateCopilot && (
          <button
            onClick={() => onNavigateCopilot('copilot')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#464775',
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(70,71,117,0.25)'
            }}
          >
            <span>Launch Payments Copilot (Teams / Web) &rarr;</span>
          </button>
        )}
      </div>

      {/* ── 2. Top Telemetry: RBI e-Kuber Liquidity & In-Flight Queues (UC2 & UC3) ── */}
      {liquidity && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
          
          {/* Card 1: RBI Settlement Account Balance */}
          <div style={{ background: '#ffffff', borderRadius: 10, padding: 18, border: '1px solid #e2e8f0', borderLeft: '4px solid #0d9488', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                RBI e-Kuber Settlement Float (UC3)
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 700, background: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: 4, border: '1px solid #a7f3d0' }}>
                {liquidity.liquidity_status}
              </span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
              ₹ {(liquidity.current_balance_inr / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Crores</span>
            </div>
            <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span>Intraday Facility (ILF): ₹{(liquidity.intraday_liquidity_facility_limit_inr/10000000).toFixed(0)} Cr</span>
              <span style={{ color: '#059669', fontWeight: 600 }}>Gridlock Risk: {(liquidity.gridlock_risk_score * 100).toFixed(0)}% (Low)</span>
            </div>
            <div style={{ marginTop: 8, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: '82%', height: '100%', background: '#0d9488' }} />
            </div>
          </div>

          {/* Card 2: RTGS In-Flight Queue Depth */}
          <div style={{ background: '#ffffff', borderRadius: 10, padding: 18, border: '1px solid #e2e8f0', borderLeft: '4px solid #7c3aed', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                RTGS Outward Queue Depth (UC2)
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 700, background: '#f5f3ff', color: '#6d28d9', padding: '2px 6px', borderRadius: 4, border: '1px solid #ddd6fe' }}>
                {liquidity.rtgs_queue.status}
              </span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
              {liquidity.rtgs_queue.queue_depth} <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Active Orders</span>
            </div>
            <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span>Queued Value: ₹{(liquidity.rtgs_queue.total_queued_value_inr/10000000).toFixed(2)} Cr</span>
              <span style={{ color: '#7c3aed', fontWeight: 600 }}>Oldest: {liquidity.rtgs_queue.oldest_item_age_seconds}s</span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
              Avg Gross Latency: {liquidity.rtgs_queue.avg_processing_time_sec}s • No Stuck Queues
            </div>
          </div>

          {/* Card 3: NEFT Half-Hourly Batch Monitor */}
          <div style={{ background: '#ffffff', borderRadius: 10, padding: 18, border: '1px solid #e2e8f0', borderLeft: '4px solid #ea580c', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                NEFT Half-Hourly Batch (UC2)
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 700, background: '#fff7ed', color: '#c2410c', padding: '2px 6px', borderRadius: 4, border: '1px solid #fed7aa' }}>
                CYCLE {liquidity.neft_batch.current_cycle_no} OF 48
              </span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#ea580c', marginTop: 6 }}>
              {Math.floor(liquidity.neft_batch.seconds_to_cutoff / 60)}m {liquidity.neft_batch.seconds_to_cutoff % 60}s <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>to Cut-Off</span>
            </div>
            <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span>Accumulated: {liquidity.neft_batch.in_flight_outward_txns.toLocaleString()} txns</span>
              <span style={{ color: '#ea580c', fontWeight: 600 }}>Est. Net: +₹{(liquidity.neft_batch.multilateral_net_position_estimate/10000000).toFixed(2)} Cr</span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
              Cut-off at {liquidity.neft_batch.cut_off_time_ist} • Multilateral DNS settlement
            </div>
          </div>

        </div>
      )}

      {/* ── 3. Middle Section: 3-Way Triangulation Reconciliation (UC5 & UC6) ── */}
      <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20, marginBottom: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              3-Way Triangulation Reconciliation Table (UC5 &amp; UC6)
            </h3>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 12 }}>
              Side-by-side reconciliation of Finacle CBS vs SFMS Switch vs RBI e-Kuber Statement.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'ALL', label: `All Orders (${reconRecords.length})` },
              { id: 'MATCHED', label: `STP Matched (${reconRecords.filter(r => r.recon_status === 'MATCHED_STP').length})` },
              { id: 'BREAKS', label: `Exceptions & Breaks (${reconRecords.filter(r => r.recon_status !== 'MATCHED_STP').length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: activeTab === tab.id ? '1px solid #0f172a' : '1px solid #cbd5e1',
                  background: activeTab === tab.id ? '#0f172a' : '#ffffff',
                  color: activeTab === tab.id ? '#ffffff' : '#475569',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3-Way Comparison Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>UTR &amp; Rail</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Leg 1: Finacle CBS</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Leg 2: SFMS Switch</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Leg 3: RBI e-Kuber</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Amount (INR)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Variance</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Recon Status &amp; Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, i) => {
                const isMatched = r.recon_status === 'MATCHED_STP'
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: isMatched ? '#ffffff' : '#fffbeb' }}>
                    
                    {/* UTR */}
                    <td style={{ padding: '12px 12px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>{r.utr}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: r.rail === 'RTGS' ? '#ede9fe' : '#ccfbf1', color: r.rail === 'RTGS' ? '#6d28d9' : '#0f766e' }}>
                          {r.rail}
                        </span>
                        <span style={{ fontSize: 10, color: '#64748b' }}>RRN: {r.rrn}</span>
                      </div>
                    </td>

                    {/* Leg 1: CBS */}
                    <td style={{ padding: '12px 12px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, color: r.cbs_status === 'DEBITED' ? '#15803d' : '#b91c1c' }}>
                        {r.cbs_status}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{r.cbs_gl_leg}</div>
                      <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{r.cbs_timestamp}</div>
                    </td>

                    {/* Leg 2: SFMS */}
                    <td style={{ padding: '12px 12px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, color: r.sfms_status.includes('ACK') ? '#15803d' : '#ea580c' }}>
                        {r.sfms_status}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{r.sfms_msg_type}</div>
                      <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{r.sfms_timestamp}</div>
                    </td>

                    {/* Leg 3: RBI e-Kuber */}
                    <td style={{ padding: '12px 12px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, color: r.rbi_status === 'SETTLED' ? '#15803d' : '#b91c1c' }}>
                        {r.rbi_status}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{r.rbi_voucher_no}</div>
                      <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{r.rbi_timestamp}</div>
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '12px 12px', verticalAlign: 'top', fontWeight: 800, color: '#0f172a' }}>
                      ₹ {r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Variance */}
                    <td style={{ padding: '12px 12px', verticalAlign: 'top', fontWeight: 700, color: r.variance === 0 ? '#15803d' : '#b91c1c' }}>
                      ₹ {r.variance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Root Cause & Status */}
                    <td style={{ padding: '12px 12px', verticalAlign: 'top', maxWidth: 300 }}>
                      <span style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: isMatched ? '#ecfdf5' : '#fee2e2',
                        color: isMatched ? '#047857' : '#b91c1c'
                      }}>
                        {r.recon_status}
                      </span>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 4, lineHeight: 1.4 }}>
                        {r.root_cause}
                      </div>
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. Bottom Section: L2 Maker-Checker Approval Cockpit (UC1, UC4, UC6, UC8) ── */}
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

        {/* Action Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {actions.map(act => {
            const isPending = act.status === 'PENDING_APPROVAL'
            return (
              <div
                key={act.id}
                style={{
                  background: isPending ? '#fafafa' : '#f8fafc',
                  border: isPending ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  opacity: isPending ? 1 : 0.8
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 3 }}>
                      {act.use_case}
                    </span>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                      {act.action_type}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: isPending ? '#fef3c7' : act.status === 'APPROVED' ? '#ecfdf5' : '#fee2e2',
                    color: isPending ? '#92400e' : act.status === 'APPROVED' ? '#047857' : '#991b1b'
                  }}>
                    {act.status}
                  </span>
                </div>

                {/* Amount & Customer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                  <div>
                    <span style={{ color: '#64748b' }}>UTR:</span> <b style={{ fontFamily: 'monospace' }}>{act.utr}</b>
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{act.customer}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#64748b' }}>Amount:</span>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                      ₹ {act.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Evidence Dossier Box */}
                <div style={{ background: '#ffffff', borderRadius: 6, padding: 10, border: '1px solid #e2e8f0', fontSize: 11.5 }}>
                  <div style={{ fontWeight: 700, color: '#475569', marginBottom: 4 }}>Agent Evidence Dossier ({act.agent_name}):</div>
                  <ul style={{ margin: 0, paddingLeft: 16, color: '#334155', lineHeight: 1.4 }}>
                    {Object.entries(act.evidence_dossier).map(([k, v], idx) => (
                      <li key={idx}><b>{k.replace(/_/g, ' ').toUpperCase()}:</b> {v}</li>
                    ))}
                  </ul>
                </div>

                {/* Decision Footer */}
                {isPending ? (
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button
                      onClick={() => handleDecision(act.id, 'APPROVE')}
                      disabled={actionLoading === act.id}
                      style={{
                        flex: 1,
                        padding: '8px 14px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#15803d',
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {actionLoading === act.id ? 'Executing via AE...' : 'Approve & Release via AE'}
                    </button>
                    <button
                      onClick={() => handleDecision(act.id, 'REJECT')}
                      disabled={actionLoading === act.id}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#b91c1c',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Decided by: {act.decided_by} ({act.decided_at})</span>
                    <span style={{ fontFamily: 'monospace' }}>{act.audit_seal}</span>
                  </div>
                )}

              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

