import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class AppRootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // Send to backend for debugging
    fetch(`${window.location.origin}/api/debug-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    }).catch(() => {});
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Something went wrong.';
      let technicalDetails = this.state.error?.stack || '';
      
      try {
        const parsedError = JSON.parse(this.state.error?.message || '{}');
        if (parsedError.error) {
          errorMessage = `Firestore Error: ${parsedError.error}`;
          technicalDetails = `Operation: ${parsedError.operationType}\nPath: ${parsedError.path}\n\n${technicalDetails}`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-mono p-8 selection:bg-[#141414] selection:text-[#E4E3E0]">
          <div className="max-w-4xl mx-auto border border-[#141414] bg-white shadow-[8px_8px_0px_#141414]">
            <div className="border-b border-[#141414] p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-red-600 animate-pulse" />
                <h1 className="font-bold italic tracking-tighter uppercase text-sm">System Halt // Error Detected</h1>
              </div>
              <span className="text-[10px] opacity-40">UTC: {new Date().toISOString()}</span>
            </div>

            <div className="p-8 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] italic opacity-50 uppercase tracking-widest font-serif">Diagnostic Message</label>
                <p className="text-xl font-bold tracking-tight leading-none text-red-600">{errorMessage}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] italic opacity-50 uppercase tracking-widest font-serif">Technical Stack Trace</label>
                <div className="bg-[#141414] text-[#E4E3E0] p-6 text-xs overflow-auto max-h-[300px] leading-relaxed opacity-90">
                  <pre className="whitespace-pre-wrap font-mono">{technicalDetails}</pre>
                </div>
              </div>

              <div className="pt-8 border-t border-[#141414] flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => window.location.reload()}
                  className="bg-[#141414] text-[#E4E3E0] px-8 py-4 font-bold text-sm uppercase tracking-widest hover:bg-white hover:text-[#141414] transition-all border border-transparent hover:border-[#141414]"
                >
                  Restart Application
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-8 py-4 font-bold text-sm uppercase tracking-widest border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
                >
                  Return to Base
                </button>
              </div>
            </div>

            <div className="border-t border-[#141414] p-4 bg-[#141414]/5">
              <p className="text-[10px] opacity-40 italic font-serif">
                If this error persists, please clear your browser cache or contact the system administrator with the stack trace above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppRootErrorBoundary;
