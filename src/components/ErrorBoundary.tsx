import React from 'react';

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-bg p-6 flex items-start justify-center">
          <div className="max-w-xl w-full bg-surface rounded-2xl border border-accent/40 p-5 mt-10 shadow-[var(--shadow-card)]">
            <p className="text-sm font-bold text-accent uppercase tracking-wider">Erro de runtime</p>
            <p className="font-semibold text-text mt-2">{this.state.error.message}</p>
            <pre className="text-xs text-text-muted mt-3 whitespace-pre-wrap break-all max-h-96 overflow-auto">
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); location.reload(); }}
              className="mt-4 h-11 px-4 rounded-2xl bg-primary text-cream font-semibold"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
