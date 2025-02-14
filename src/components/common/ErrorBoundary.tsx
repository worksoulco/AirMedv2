import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { errorService } from '@/lib/errors/service';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    errorService.handleError({
      name: error.name,
      message: error.message,
      code: 'REACT_ERROR',
      context: { errorInfo },
      timestamp: new Date().toISOString(),
      handled: true
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-lg">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={this.handleReload}>Reload Page</Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}