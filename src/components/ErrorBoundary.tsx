import React from 'react';

interface Props {
    children: React.ReactNode;
}

interface State {
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary] Unhandled error:', error, info);
    }

    handleReset = () => {
        this.setState({ error: null });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.error) {
            return (
                <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
                    <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-red-200 dark:border-red-900 p-6">
                        <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Something went wrong</h1>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                            The app hit an unexpected error. Your data is safe &mdash; try reloading the page.
                        </p>
                        <details className="mb-4">
                            <summary className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">
                                Technical details
                            </summary>
                            <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-900 rounded text-xs text-slate-700 dark:text-slate-300 overflow-auto max-h-60">
                                {this.state.error.message}
                                {this.state.error.stack && '\n\n' + this.state.error.stack}
                            </pre>
                        </details>
                        <div className="flex gap-2">
                            <button
                                onClick={this.handleReload}
                                className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium"
                            >
                                Reload page
                            </button>
                            <button
                                onClick={this.handleReset}
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
