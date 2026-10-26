import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled Application Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 50%, #F0FDFA 100%)',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '540px',
              width: '100%',
              padding: '36px 32px',
              textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              borderRadius: '16px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'inline-block', marginBottom: '16px' }}>
              <img
                src="/college-logo.png"
                alt="STERS College Logo"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  objectFit: 'contain',
                  background: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)',
                  border: '2px solid #E0E7FF',
                }}
              />
            </div>

            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertTriangle size={26} />
            </div>

            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: '8px',
              }}
            >
              Something Went Wrong
            </h2>

            <p
              style={{
                fontSize: '0.875rem',
                color: '#64748B',
                marginBottom: '20px',
                lineHeight: 1.5,
              }}
            >
              The application encountered an unexpected error while rendering this page.
              Your data and session are safe. Please reload the page or return to the dashboard.
            </p>

            {this.state.error && (
              <details
                style={{
                  textAlign: 'left',
                  background: '#F8FAFC',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  marginBottom: '20px',
                  fontSize: '0.75rem',
                  color: '#475569',
                  overflowX: 'auto',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#6366F1' }}>
                  Click to inspect technical details
                </summary>
                <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.error?.toString()}
                </pre>
              </details>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="btn btn-primary"
                onClick={this.handleReload}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RefreshCw size={16} />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={this.handleGoHome}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Home size={16} />
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
