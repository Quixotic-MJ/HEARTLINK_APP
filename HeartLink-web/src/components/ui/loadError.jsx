import { AlertCircle, RotateCw } from "lucide-react";

/** HL-035: what a screen shows when its data couldn't load, instead of looking empty. */
export default function LoadError({ what = "this page", onRetry, className = "py-14", retained = false, retrying = false }) {
  if (retained) return (
    <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-cal-hairline bg-cal-surface-soft px-5 py-4 text-sm">
      <AlertCircle size={18} className="shrink-0 text-cal-error" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Couldn't refresh {what}</p>
        <p className="mt-1 text-cal-muted">Showing previously loaded content. Refresh before opening or changing items.</p>
      </div>
      <button type="button" disabled={retrying} onClick={() => onRetry?.()} className="rounded-lg border border-cal-hairline bg-cal-canvas px-3 py-2 font-medium disabled:opacity-50">
        {retrying ? "Refreshing…" : "Try again"}
      </button>
    </div>
  );
  return (
    <div role="alert" className={`${className} text-center font-cal-sans`}>
      <div className="mx-auto mb-3.5 flex h-10 w-10 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-card text-cal-error">
        <AlertCircle size={18} aria-hidden="true" />
      </div>
      <h4 className="text-[16px] font-semibold text-cal-ink mb-1">
        Couldn&apos;t load {what}
      </h4>
      <p className="mx-auto mb-4 max-w-sm text-[13.5px] text-cal-muted">
        Check your network connection, then try again.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={() => onRetry()}
          className="mx-auto inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
        >
          <RotateCw size={14} />
          <span>Try again</span>
        </button>
      )}
    </div>
  );
}
