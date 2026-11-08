import { AlertCircle, RotateCw } from "lucide-react";

/** HL-035: what a screen shows when its data couldn't load, instead of looking empty. */
export default function LoadError({ what = "this page", onRetry, className = "py-14" }) {
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
