import React, { Component } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('Root Crash Caught:', error, info)
    this.setState({ info })
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 30,
          margin: 20,
          background: '#fff1f2',
          border: '2px solid #e11d48',
          borderRadius: 8,
          fontFamily: 'Consolas, monospace',
          color: '#881337'
        }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#be123c' }}>Workbench Runtime Error Encountered</h2>
          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>
            {String(this.state.error?.message || this.state.error)}
          </div>
          <pre style={{
            background: '#ffffff',
            padding: 14,
            borderRadius: 6,
            border: '1px solid #fecdd3',
            fontSize: 12,
            overflowX: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => {
              window.location.hash = '#/catalog?rail=UPI'
              window.location.reload()
            }}
            style={{
              marginTop: 14,
              padding: '8px 16px',
              background: '#e11d48',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
)
