import { Component } from 'react';

export default class AssetErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(
      `[AssetErrorBoundary:${this.props.label || 'boundary'}] Caught error:`,
      error,
      info?.componentStack
    );
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps) {
    const { resetKeys } = this.props;
    if (this.state.hasError && Array.isArray(resetKeys) && Array.isArray(prevProps.resetKeys)) {
      const changed =
        resetKeys.length !== prevProps.resetKeys.length ||
        resetKeys.some((key, idx) => key !== prevProps.resetKeys[idx]);
      if (changed) {
        this.reset();
      }
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({
          error: this.state.error,
          reset: this.reset,
        });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="asset-error-fallback" role="alert">
          <p>
            <strong>{this.props.label || 'Component'} failed to load:</strong>{' '}
            {this.state.error?.message || 'Unexpected rendering error.'}
          </p>
          <button type="button" onClick={this.reset}>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
