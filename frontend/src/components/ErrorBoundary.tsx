import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="max-w-md text-center px-4">
            <p className="text-lg font-semibold text-gray-800 mb-2">Algo salió mal</p>
            <p className="text-sm text-gray-500 mb-4">{this.state.error?.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-light transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
