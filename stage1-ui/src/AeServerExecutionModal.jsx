import React from 'react'

export default function AeServerExecutionModal({
  isOpen,
  onClose,
  currentStep = 0, // 0: Idle, 1: SFTP Courier, 2: Cryptkeeper, 3: 4-Way Recon, 4: AI Diagnostic, 5: Finacle Poster, 6: Audit Crypt-Seal, 7: All Complete
  executionStatus = 'RUNNING', // 'RUNNING' | 'COMPLETED' | 'DUPLICATE_HALTED' | 'REJECTED_HALTED'
  fileName = 'NPCI_UPI_Settlement_TestData_50K.csv',
  totalRecords = 50000,
  serverUrl = 'https://t4.automationedge.com/#/requests/list',
  username = 'abhishek.malwatkar@valuedx.com',
  workflowName = 'NPCI Demo UPI Reconn',
  completionMessage = 'Message : UPI Recon Completed',
  reconData = null,
  recoverySummary = null
}) {
  if (!isOpen) return null

  const isDuplicateHalted = executionStatus === 'DUPLICATE_HALTED'
  const isRejectedHalted = executionStatus === 'REJECTED_HALTED'
  const isHalted = isDuplicateHalted || isRejectedHalted

  const isAllComplete = !isHalted && currentStep >= 7
  const completedCount = isHalted ? 1 : (isAllComplete ? 6 : Math.max(0, currentStep - 1))
  const progressPercent = isHalted ? 33 : (isAllComplete ? 100 : Math.round((completedCount / 6) * 100))

  const workflows = [
    {
      id: 1,
      name: 'Inbound SFTP Courier',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
      target: 'NPCI SFTP Gateway',
      desc: 'Retrieves raw cycle settlement packages via AE Credential Vault into staging watch folder.'
    },
    {
      id: 2,
      name: 'Staging Cryptkeeper & Gatekeeper',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      target: 'Secure Staging Enclave',
      desc: 'Computes cryptographic SHA-256 fingerprint, enforces 32-column schema, and blocks duplicates.'
    },
    {
      id: 3,
      name: '4-Way Multi-Rail Recon Engine',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      target: 'NPCI + CBS + Switch + GL',
      desc: 'High-speed in-memory 4-way matrix reconciliation across all records. Segregates STP matches & breaks.'
    },
    {
      id: 4,
      name: 'AI Diagnostic & Root-Cause Agent',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
      target: 'AI Cognitive Reasoner',
      desc: 'Evaluates timeout scenarios, applies RBI deeming rules, and generates evidence dossiers.'
    },
    {
      id: 5,
      name: 'Finacle CBS Direct Posting',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      target: 'Core Banking System (CBS)',
      desc: 'Executes adjustment vouchers, customer refund credits, and GL balance rectifications via RPA automation.'
    },
    {
      id: 6,
      name: 'Regulatory Audit Crypt-Seal',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      target: 'RBI DPSS Compliance Register',
      desc: 'Cryptographically signs execution trail into tamper-proof immutable audit pack.'
    }
  ]

  // Flow line helper component with flowing glowing laser animation
  const FlowConnector = ({ isActive, isCompleted }) => {
    const strokeColor = isCompleted ? '#16a34a' : (isActive ? '#ea580c' : '#cbd5e1')
    const glowColor = isCompleted ? 'rgba(22, 163, 74, 0.5)' : (isActive ? 'rgba(234, 88, 12, 0.8)' : 'none')

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        flexShrink: 0,
        position: 'relative'
      }}>
        <svg width="36" height="16" viewBox="0 0 36 16" style={{ overflow: 'visible' }}>
          {/* Base background line */}
          <line x1="2" y1="8" x2="34" y2="8" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
          
          {/* Active / completed glowing flowing beam */}
          {(isActive || isCompleted) && (
            <>
              <line
                x1="2"
                y1="8"
                x2="30"
                y2="8"
                stroke={strokeColor}
                strokeWidth="2.5"
                strokeDasharray="6 4"
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 5px ${glowColor})`,
                  animation: 'flowLaser 0.8s linear infinite'
                }}
              />
              <polygon
                points="30,4 36,8 30,12"
                fill={strokeColor}
                style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}
              />
            </>
          )}
        </svg>
      </div>
    )
  }

  // S-Curve Turnaround connector from Row 1 (Step 3 on right) to Row 2 (Step 4 on left)
  const TurnaroundConnector = ({ isActive, isCompleted }) => {
    const strokeColor = isCompleted ? '#16a34a' : (isActive ? '#ea580c' : '#cbd5e1')
    const glowColor = isCompleted ? 'rgba(22, 163, 74, 0.5)' : (isActive ? 'rgba(234, 88, 12, 0.8)' : 'none')
    const pathD = "M 845 0 L 845 15 Q 845 19 839 19 L 161 19 Q 155 19 155 23 L 155 31"

    return (
      <div style={{
        width: '100%',
        height: 38,
        margin: '-2px 0',
        position: 'relative',
        zIndex: 5
      }}>
        <svg
          width="100%"
          height="38"
          viewBox="0 0 1000 38"
          preserveAspectRatio="none"
          style={{ overflow: 'visible', display: 'block' }}
        >
          {/* Base background track connecting Step 3 to Step 4 */}
          <path
            d={pathD}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <polygon
            points="150,29 155,38 160,29"
            fill="#cbd5e1"
          />

          {/* Active / Completed Glowing Laser Beam */}
          {(isActive || isCompleted) && (
            <>
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.5"
                strokeDasharray="6 4"
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 6px ${glowColor})`,
                  animation: 'flowLaser 1s linear infinite'
                }}
              />
              <polygon
                points="150,29 155,38 160,29"
                fill={strokeColor}
                style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}
              />
            </>
          )}
        </svg>
      </div>
    )
  }

  const renderCard = (wf) => {
    const isStep2Halted = isHalted && wf.id === 2
    const isStepBlocked = isHalted && wf.id > 2
    const isDone = !isHalted && (isAllComplete || currentStep > wf.id)
    const isRunning = !isHalted && !isAllComplete && currentStep === wf.id
    const isQueued = !isHalted && !isAllComplete && currentStep < wf.id
    const isStep1Done = isHalted && wf.id === 1

    return (
      <div
        key={wf.id}
        style={{
          flex: 1,
          minWidth: 0,
          background: isStepBlocked ? '#f8fafc' : '#ffffff',
          border: isStep2Halted
            ? '2px solid #ef4444'
            : (isRunning
                ? '2px solid #ea580c'
                : (isDone || isStep1Done ? '1.5px solid #22c55e' : '1px solid #e2e8f0')),
          borderRadius: 14,
          padding: '16px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxShadow: isStep2Halted
            ? '0 0 0 3px rgba(239, 68, 68, 0.2), 0 8px 24px rgba(239, 68, 68, 0.25)'
            : (isRunning
                ? '0 0 0 3px rgba(249, 115, 22, 0.25), 0 0 22px rgba(234, 88, 12, 0.5), 0 8px 24px rgba(234, 88, 12, 0.18)'
                : (isDone || isStep1Done ? '0 4px 14px rgba(34, 197, 94, 0.12)' : '0 2px 6px rgba(0, 0, 0, 0.04)')),
          animation: isRunning ? 'executingBoxGlow 1.6s ease-in-out infinite' : 'none',
          opacity: isStepBlocked ? 0.6 : 1,
          transition: 'all 0.3s ease',
          overflow: 'hidden'
        }}
      >
        {/* Glowing Orange Laser Accent Bar on Top of Executing Box */}
        {isRunning && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #ea580c, #f97316, #ea580c)',
            boxShadow: '0 0 10px #f97316',
            animation: 'pulse 1.2s infinite'
          }} />
        )}

        {/* Red Accent Bar on Top of Halted Box 2 */}
        {isStep2Halted && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: '#ef4444',
            boxShadow: '0 0 10px #ef4444'
          }} />
        )}

        <div>
          {/* Card Top: Icon & Live Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 9,
              background: isStep2Halted
                ? '#ef4444'
                : (isRunning
                    ? 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)'
                    : (isDone || isStep1Done ? '#16a34a' : '#f1f5f9')),
              color: isStep2Halted || isRunning || isDone || isStep1Done ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isStep2Halted
                ? '0 0 14px rgba(239, 68, 68, 0.5)'
                : (isRunning
                    ? '0 0 14px rgba(234, 88, 12, 0.65)'
                    : (isDone || isStep1Done ? '0 2px 8px rgba(22, 163, 74, 0.35)' : 'none')),
              transition: 'all 0.3s ease'
            }}>
              {wf.icon}
            </div>

            {/* Status Indicator */}
            {isStep2Halted && (
              <span style={{
                background: '#fef2f2',
                border: '1.5px solid #ef4444',
                color: '#b91c1c',
                fontSize: 10,
                fontWeight: 800,
                padding: '3.5px 9px',
                borderRadius: 99,
                letterSpacing: '0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                {isDuplicateHalted ? 'DUPLICATE DETECTED' : 'VALIDATION REJECTED'}
              </span>
            )}
            {isStepBlocked && (
              <span style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#94a3b8',
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 99
              }}>
                CANCELLED
              </span>
            )}
            {(isDone || isStep1Done) && (
              <span style={{
                background: '#dcfce7',
                border: '1px solid #86efac',
                color: '#15803d',
                fontSize: 10,
                fontWeight: 800,
                padding: '3.5px 9px',
                borderRadius: 99,
                letterSpacing: '0.4px',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                ✓ COMPLETED
              </span>
            )}
            {isRunning && (
              <span style={{
                background: '#ffedd5',
                border: '1.5px solid #ea580c',
                color: '#c2410c',
                fontSize: 10,
                fontWeight: 800,
                padding: '3.5px 9px',
                borderRadius: 99,
                letterSpacing: '0.4px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 0 10px rgba(234, 88, 12, 0.4)'
              }}>
                <span style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#ea580c',
                  display: 'inline-block',
                  animation: 'pulse 0.9s infinite'
                }} />
                PROCESSING
              </span>
            )}
            {isQueued && (
              <span style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#94a3b8',
                fontSize: 10,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 99
              }}>
                STANDBY
              </span>
            )}
          </div>

          {/* Workflow Name */}
          <div style={{
            fontSize: 13.5,
            fontWeight: 800,
            color: isStep2Halted ? '#b91c1c' : (isRunning ? '#0f172a' : (isDone || isStep1Done ? '#0f172a' : '#475569')),
            marginBottom: 6,
            lineHeight: 1.3
          }}>
            {wf.name}
          </div>

          {/* Description */}
          <div style={{
            fontSize: 11,
            color: isRunning ? '#334155' : (isDone || isStep1Done ? '#475569' : '#64748b'),
            lineHeight: 1.45,
            marginBottom: 8
          }}>
            {wf.desc}
          </div>

          {/* Quarantined Banner inside Step 2 */}
          {isStep2Halted && (
            <div style={{
              marginTop: 6,
              marginBottom: 8,
              padding: '6px 9px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              fontSize: 10.5,
              color: '#991b1b',
              fontWeight: 600,
              lineHeight: 1.4
            }}>
              {isDuplicateHalted
                ? 'Identical SHA-256 hash detected in duplicate registry. File quarantined to /rejected/. Downstream workflows halted.'
                : 'Mandatory columns missing or schema rejected. File quarantined to /rejected/.'}
            </div>
          )}
        </div>

        {/* Footer: Target System */}
        <div style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 10.5,
          color: '#64748b'
        }}>
          <span style={{ fontWeight: 600 }}>Target:</span>
          <b style={{ color: isStep2Halted ? '#b91c1c' : (isRunning ? '#ea580c' : (isDone || isStep1Done ? '#16a34a' : '#475569')) }}>
            {wf.target}
          </b>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      animation: 'fadeIn 0.25s ease'
    }}>
      <style>{`
        @keyframes flowLaser {
          0% { stroke-dashoffset: 20; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes executingBoxGlow {
          0%, 100% {
            box-shadow: 0 0 0 2px #ea580c, 0 0 16px rgba(234, 88, 12, 0.5), 0 8px 24px rgba(234, 88, 12, 0.18);
            border-color: #ea580c;
          }
          50% {
            box-shadow: 0 0 0 3px #f97316, 0 0 30px rgba(249, 115, 22, 0.85), 0 12px 30px rgba(249, 115, 22, 0.28);
            border-color: #f97316;
          }
        }
      `}</style>

      {/* Main White Modal Dialog */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 18,
        boxShadow: '0 25px 70px -15px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        width: '100%',
        maxWidth: 1040,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#0f172a'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 26px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: '#ffffff',
              border: '1.5px solid #fed7aa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.15)',
              padding: 6
            }}>
              <img src="/favicon.svg" alt="AutomationEdge" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16.5, fontWeight: 900, letterSpacing: '-0.3px', color: '#0f172a' }}>
                  AutomationEdge Server &bull; RPA Workflow Orchestration Engine
                </span>
                <span style={{
                  background: isHalted ? '#fef2f2' : (isAllComplete ? '#dcfce7' : '#ffedd5'),
                  border: isHalted ? '1.5px solid #ef4444' : (isAllComplete ? '1px solid #86efac' : '1.5px solid #ea580c'),
                  color: isHalted ? '#b91c1c' : (isAllComplete ? '#15803d' : '#c2410c'),
                  fontSize: 10.5,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 99,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  boxShadow: isHalted ? '0 0 8px rgba(239, 68, 68, 0.25)' : (isAllComplete ? 'none' : '0 0 8px rgba(234, 88, 12, 0.25)')
                }}>
                  {isHalted
                    ? `● PIPELINE HALTED — ${isDuplicateHalted ? 'DUPLICATE FILE DETECTED' : 'VALIDATION FAILED'}`
                    : (isAllComplete ? '● All Workflows Executed' : '● Live Execution Active')}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                AE Server: <a href={serverUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#ea580c', fontWeight: 700, textDecoration: 'none' }}>{serverUrl}</a> &bull; User: <b style={{ color: '#0f172a' }}>{username}</b> &bull; WF: <b style={{ color: '#0f172a' }}>{workflowName}</b>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b' }}
            title="Minimize or close modal"
          >
            ✕
          </button>
        </div>

        {/* Progress Track */}
        <div style={{ width: '100%', height: 4, background: '#f1f5f9', position: 'relative' }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: isHalted
              ? '#ef4444'
              : (isAllComplete
                  ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                  : 'linear-gradient(90deg, #ea580c, #f97316, #fb923c)'),
            boxShadow: isHalted ? '0 0 10px rgba(239, 68, 68, 0.7)' : '0 0 10px rgba(249, 115, 22, 0.7)',
            transition: 'width 0.4s ease'
          }} />
        </div>

        {/* Modal Main Body: Flow Diagram with Animated Glowing Lines */}
        <div style={{ padding: '26px 30px', display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11.5,
            fontWeight: 800,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: 6
          }}>
            <span>Automated End-to-End RPA Execution Flow</span>
            <span style={{ color: isHalted ? '#dc2626' : (isAllComplete ? '#16a34a' : '#ea580c'), fontWeight: 900 }}>
              {isHalted
                ? 'PIPELINE HALTED AT STEP 2 (DUPLICATE DETECTED — WORKFLOW CANCELLED)'
                : `Pipeline Progress: ${progressPercent}% (${completedCount} of 6 Workflows Completed)`}
            </span>
          </div>

          {/* AutomationEdge Server Message Banner & Post-Recon Next Steps */}
          {isAllComplete && (
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #86efac',
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 10,
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    background: '#dcfce7',
                    border: '1px solid #16a34a',
                    color: '#15803d',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 99,
                    letterSpacing: '0.3px'
                  }}>
                    {completionMessage}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                    Workflow "{workflowName}" executed on AE Server
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Target: <b style={{ color: '#0f172a' }}>NPCI UPI Multi-Rail Settlement</b>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Matched Data Track */}
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  padding: '10px 12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                      Matched Data &bull; Zero-Delta GL Knock-Off
                    </span>
                    <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>
                      STP_SETTLED_CLOSED
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#14532d', lineHeight: 1.45 }}>
                    Posted zero-delta GL knock-off voucher between <b>GL-14020 UPI Outward Suspense</b> and <b>GL-11010 RBI Settlement Reserve</b> (Delta: ₹0.00). Settlement cycle closed straight-through.
                  </div>
                </div>

                {/* Unmatched Data Track */}
                <div style={{
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: 8,
                  padding: '10px 12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#9a3412', textTransform: 'uppercase' }}>
                      Unmatched Data &bull; Dual-Track AI Execution
                    </span>
                    <span style={{ background: '#ffedd5', color: '#c2410c', fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>
                      RBI T+1 ACTIVE
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#7c2d12', lineHeight: 1.45 }}>
                    Root causes diagnosed &amp; penalty clocks started. <b>Low-value txns (&lt; ₹5k)</b> auto-refunded via Finacle CBS bot; <b>High-value txns (&gt; ₹10k / Mismatches)</b> routed to Operations Manager for 1-click approval.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Row 1: Steps 1, 2, 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: '100%' }}>
            {renderCard(workflows[0])}
            <FlowConnector isActive={currentStep === 1 && !isHalted} isCompleted={currentStep > 1} />
            {renderCard(workflows[1])}
            <FlowConnector isActive={currentStep === 2 && !isHalted} isCompleted={currentStep > 2 && !isHalted} />
            {renderCard(workflows[2])}
          </div>

          {/* Turnaround flow connector between Row 1 and Row 2 */}
          <TurnaroundConnector isActive={currentStep === 3 && !isHalted} isCompleted={currentStep > 3 && !isHalted} />

          {/* Row 2: Steps 4, 5, 6 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: '100%' }}>
            {renderCard(workflows[3])}
            <FlowConnector isActive={currentStep === 4 && !isHalted} isCompleted={currentStep > 4 && !isHalted} />
            {renderCard(workflows[4])}
            <FlowConnector isActive={currentStep === 5 && !isHalted} isCompleted={currentStep > 5 && !isHalted} />
            {renderCard(workflows[5])}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#64748b' }}>
            <span style={{ fontWeight: 600 }}>Role of AutomationEdge Server:</span>
            <b style={{ color: isHalted ? '#dc2626' : '#16a34a' }}>
              {isHalted
                ? 'Automated Gatekeeper Protection • Duplicate Blocked • Zero Ledger Pollution'
                : 'Autonomous 4-Way In-Memory Recon • Direct Core Banking API Reversals • Immutable Audit Sealing'}
            </b>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {isHalted ? (
              <button
                onClick={onClose}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
                  borderColor: '#b91c1c',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 12.5,
                  padding: '9px 24px',
                  borderRadius: 8,
                  boxShadow: '0 4px 14px rgba(185, 28, 28, 0.4)',
                  cursor: 'pointer'
                }}
              >
                View Quarantined Result &rarr;
              </button>
            ) : isAllComplete ? (
              <button
                onClick={onClose}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  borderColor: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 12.5,
                  padding: '9px 24px',
                  borderRadius: 8,
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
                  cursor: 'pointer'
                }}
              >
                ✓ View Reconciled Workbench
              </button>
            ) : (
              <button
                onClick={onClose}
                className="btn btn-secondary"
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '8px 18px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#ffffff' }}
              >
                Hide &amp; Run in Background
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
