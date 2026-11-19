import React, { useState } from 'react'

// ── Pre-configured User Roles ───────────────────────────────────────────────
export const USERS = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    displayName: 'Administrator',
    roleLabel: 'System Administrator',
    access: 'Full Access (All Rails, Settings & System Reset)'
  },
  {
    username: 'employee',
    password: 'employee123',
    role: 'employee',
    displayName: 'Recon Officer',
    roleLabel: 'Reconciliation Officer',
    access: 'Recon Operations, Breaks & Approvals'
  },
  {
    username: 'manager',
    password: 'manager123',
    role: 'manager',
    displayName: 'Operations Manager',
    roleLabel: 'Operations Supervisor',
    access: 'Executive MIS, Liquidity & Maker-Checker'
  }
]

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    setError('')

    const u = username.trim()
    const p = password.trim()

    if (!u || !p) {
      setError('Please enter both username and password.')
      return
    }

    setLoading(true)
    setTimeout(() => {
      const found = USERS.find(
        user => user.username.toLowerCase() === u.toLowerCase() && user.password === p
      )
      if (found) {
        onLogin(found)
      } else {
        setError('Invalid username or password. Check credentials below.')
        setLoading(false)
      }
    }, 400)
  }

  const handleQuickSelect = (u) => {
    setUsername(u.username)
    setPassword(u.password)
    setError('')
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      overflow: 'hidden',
      background: '#f8fafc'
    }}>

      {/* ── LEFT PANEL: Orange Brand Showcase ─────────────────────────────── */}
      <div style={{
        flex: '1 1 52%',
        background: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
        padding: '56px 64px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        color: '#ffffff'
      }}>
        {/* Soft background glow circles */}
        <div style={{
          position: 'absolute', top: '-10%', right: '-8%',
          width: '420px', height: '420px', borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-10%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.06)', pointerEvents: 'none'
        }} />

        {/* Top Logo */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              background: '#ffffff',
              color: '#ea580c',
              fontWeight: 900,
              fontSize: 16,
              letterSpacing: '0.5px',
              padding: '6px 14px',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
            }}>
              NPCI
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.3px', lineHeight: 1.2 }}>
                NPCI Workbench
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 500 }}>
                Autonomous Multi-Rail Clearing &amp; Settlement
              </div>
            </div>
          </div>
        </div>

        {/* Middle Main Content */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 540 }}>
          <h1 style={{
            fontSize: 38,
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: '-0.5px',
            marginBottom: 18,
            color: '#ffffff'
          }}>
            Every reconciliation break, answered in seconds.
          </h1>
          <p style={{
            fontSize: 15,
            lineHeight: 1.6,
            opacity: 0.92,
            marginBottom: 32,
            fontWeight: 400
          }}>
            Unified operations platform for UPI, IMPS, AePS, NETC, NEFT, and RTGS.
            Autonomous 4-way matching, AI root cause diagnostics, and instant CBS reversals.
          </p>

          {/* Translucent Value Props (No icons / clean text) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              borderRadius: 10,
              padding: '12px 18px',
              fontSize: 13.5,
              fontWeight: 600,
              backdropFilter: 'blur(8px)'
            }}>
              Live KPIs: 96.4% STP rate, zero-delta GL balance, real-time SLA
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              borderRadius: 10,
              padding: '12px 18px',
              fontSize: 13.5,
              fontWeight: 600,
              backdropFilter: 'blur(8px)'
            }}>
              4-Way reconciliation engine across NPCI, Switch, CBS and GL
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              borderRadius: 10,
              padding: '12px 18px',
              fontSize: 13.5,
              fontWeight: 600,
              backdropFilter: 'blur(8px)'
            }}>
              Cryptographic Merkle audit trail — 100% RBI DPSS T+1 compliant
            </div>
          </div>
        </div>

        {/* Bottom Notice */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            fontSize: 12,
            opacity: 0.75,
            fontWeight: 500,
            letterSpacing: '0.2px'
          }}>
            Authorised NPCI operations staff only.
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Clean Floating Login Card ─────────────────────────── */}
      <div style={{
        flex: '1 1 48%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        background: '#f8fafc'
      }}>
        <div style={{
          width: '100%',
          maxWidth: 420,
          background: '#ffffff',
          borderRadius: 16,
          padding: '36px 34px',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0'
        }}>

          {/* Heading */}
          <div style={{ marginBottom: 26 }}>
            <h2 style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 6px 0',
              letterSpacing: '-0.3px'
            }}>
              Welcome back
            </h2>
            <p style={{
              fontSize: 13.5,
              color: '#64748b',
              margin: 0
            }}>
              Sign in to continue to the dashboard.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: 12.5,
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 18,
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            {/* Username Field */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#334155',
                marginBottom: 6
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin or employee"
                autoComplete="username"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 14,
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s'
                }}
                onFocus={e => { e.target.style.borderColor = '#ea580c' }}
                onBlur={e => { e.target.style.borderColor = '#cbd5e1' }}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#334155'
                }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ea580c',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="admin123"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 14,
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s'
                }}
                onFocus={e => { e.target.style.borderColor = '#ea580c' }}
                onBlur={e => { e.target.style.borderColor = '#cbd5e1' }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                color: '#ffffff',
                fontSize: 14.5,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1,
                boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)',
                transition: 'transform 0.1s, box-shadow 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 16px rgba(234, 88, 12, 0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.3)' }}
            >
              {loading ? 'Authenticating...' : 'Sign in \u2192'}
            </button>
          </form>

          {/* Secured Session Footer */}
          <div style={{
            marginTop: 18,
            textAlign: 'center',
            fontSize: 11.5,
            color: '#94a3b8',
            fontWeight: 500
          }}>
            Secured session — audit trail enabled
          </div>

          {/* Quick Role Selection Options */}
          <div style={{
            marginTop: 26,
            paddingTop: 20,
            borderTop: '1px solid #f1f5f9'
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              marginBottom: 10
            }}>
              Quick Select Role:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {USERS.map(u => {
                const isSelected = username.toLowerCase() === u.username.toLowerCase()
                return (
                  <button
                    key={u.username}
                    type="button"
                    onClick={() => handleQuickSelect(u)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: isSelected ? '1.5px solid #ea580c' : '1px solid #e2e8f0',
                      background: isSelected ? '#fff7ed' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                        {u.username}
                      </span>
                      <span style={{ fontSize: 11.5, color: '#64748b', marginLeft: 8 }}>
                        ({u.roleLabel})
                      </span>
                    </div>
                    <span style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: u.role === 'admin' ? '#fed7aa' : u.role === 'employee' ? '#bbf7d0' : '#e0e7ff',
                      color: u.role === 'admin' ? '#9a3412' : u.role === 'employee' ? '#166534' : '#3730a3',
                      textTransform: 'uppercase'
                    }}>
                      {u.role}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
