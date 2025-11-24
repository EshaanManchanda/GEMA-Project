import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { ErrorHandler } from '../../utils/errorHandler';
import { logger } from '../../utils/logger';
import Button from '../ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  context?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Ignore hot module reload errors in development
    if (import.meta.env.VITE_DEV && (
      error.message?.includes('removeChild') ||
      error.message?.includes('NotFoundError') ||
      error.name === 'NotFoundError'
    )) {
      // Don't set error state for hot reload issues
      return {
        hasError: false,
        errorId: ''
      };
    }

    // Generate unique error ID for tracking
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Ignore hot module reload errors in development
    if (import.meta.env.VITE_DEV && (
      error.message.includes('removeChild') ||
      error.message.includes('NotFoundError') ||
      error.name === 'NotFoundError'
    )) {
      console.warn('[Dev Only] Hot module reload error (safe to ignore):', error.message);
      // Reset error state silently
      setTimeout(() => {
        this.setState({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          errorId: ''
        });
      }, 100);
      return;
    }

    // Log error with context
    ErrorHandler.handleComponentError(error, errorInfo, {
      component: 'ErrorBoundary',
      additionalData: {
        context: this.props.context,
        retryCount: this.retryCount,
        errorId: this.state.errorId
      }
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Update state with error info
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      logger.info('Retrying after error', {
        errorId: this.state.errorId,
        retryCount: this.retryCount
      });
      
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: ''
      });
    } else {
      logger.warn('Maximum retry attempts reached', {
        errorId: this.state.errorId,
        maxRetries: this.maxRetries
      });
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleGoBack = () => {
    window.history.back();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Show custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full">
            {/* Error Icon */}
            <div className="text-center mb-8">
              <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-600">
                We're sorry for the inconvenience. Our team has been notified.
              </p>
            </div>

            {/* Error Details (Development Only) */}
            {this.props.showDetails && import.meta.env.VITE_MODE === 'development' && this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-red-800 mb-2">
                  Error Details (Development Only)
                </h3>
                <div className="text-xs text-red-700 font-mono space-y-1">
                  <p><strong>Error:</strong> {this.state.error.message}</p>
                  <p><strong>ID:</strong> {this.state.errorId}</p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-red-600 hover:text-red-800">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-x-auto">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Error Actions */}
            <div className="space-y-3">
              {/* Retry Button */}
              {this.retryCount < this.maxRetries && (
                <Button
                  onClick={this.handleRetry}
                  variant="primary"
                  fullWidth
                  leftIcon={<RefreshCw className="w-5 h-5" />}
                >
                  Try Again ({this.maxRetries - this.retryCount} attempts left)
                </Button>
              )}

              {/* Navigation Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={this.handleGoBack}
                  variant="outline"
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Go Back
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  leftIcon={<Home className="w-4 h-4" />}
                >
                  Home
                </Button>
              </div>
            </div>

            {/* Support Information */}
            <div className="mt-8 text-center text-sm text-gray-500">
              <p>Error ID: {this.state.errorId}</p>
              <p className="mt-2">
                If this problem persists, please contact support with the error ID above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundaries
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Specialized error boundaries for different contexts
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary context="Page" showDetails={true}>
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode;
  componentName?: string;
}> = ({ children, componentName }) => (
  <ErrorBoundary 
    context={componentName || 'Component'} 
    fallback={
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <p className="text-red-800 font-medium">Component Error</p>
        <p className="text-red-600 text-sm mt-1">
          Something went wrong loading this section.
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </Button>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;