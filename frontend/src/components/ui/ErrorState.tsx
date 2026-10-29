import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Failed to load deliverables",
  message = "An unexpected error occurred while communicating with the engine. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-rose-950/20 border border-rose-900/40 my-6">
      <div className="w-12 h-12 rounded-2xl bg-rose-900/40 border border-rose-700/60 flex items-center justify-center text-rose-400 mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-rose-200">{title}</h3>
      <p className="text-sm text-rose-300/80 max-w-md mt-1 mb-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-all active:scale-95 border border-slate-700 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      )}
    </div>
  );
}
