import { AlertCircle } from "lucide-react";
import { UI } from "../../styles/tokens";

/** HL-035: what a screen shows when its data couldn't load, instead of looking empty. */
export default function LoadError({ what = "this page", onRetry, className = "py-16" }) {
  return (
    <div role="alert" className={`${className} text-center`}>
      <div className="w-12 h-12 bg-ds-rose text-ds-ink rounded-full flex items-center justify-center mx-auto mb-3">
        <AlertCircle size={22} aria-hidden="true" />
      </div>
      <h4 className="text-[16px] font-semibold text-ds-ink mb-1">Couldn&apos;t load {what}</h4>
      <p className="text-[13px] text-ds-slate max-w-sm mx-auto mb-4">Check your connection, then try again.</p>
      {onRetry && (
        <button type="button" onClick={() => onRetry()} className={`${UI.button.primary} mx-auto`}>
          Try again
        </button>
      )}
    </div>
  );
}
