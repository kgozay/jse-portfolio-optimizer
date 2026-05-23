import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="border border-nb-amber p-4 bg-nb-amber/5 font-mono text-[10px] text-nb-amber space-y-2">
          <div className="text-[8px] tracking-widest text-nb-amber/70">
            {this.props.label || 'COMPONENT ERROR'}
          </div>
          <div>⚠ {this.state.error?.message || 'An unexpected rendering error occurred.'}</div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="border border-nb-amber px-2 py-1 nb-pop-btn hover:bg-nb-amber/10 text-[9px]"
          >
            RETRY
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
