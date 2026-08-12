'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AdminButton } from './AdminButton';

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AdminErrorBoundary] Uncaught rendering error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="admin-state" role="alert" aria-live="assertive">
          <div className="admin-state-content">
            <h3 className="admin-state-title">
              {this.props.fallbackTitle || 'Something went wrong in the console'}
            </h3>
            <p className="admin-state-copy">
              {this.state.error?.message ||
                'An unexpected error occurred while rendering this section.'}
            </p>
            <div style={{ marginTop: '16px' }}>
              <AdminButton variant="secondary" type="button" onClick={this.handleReset}>
                Retry section
              </AdminButton>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
