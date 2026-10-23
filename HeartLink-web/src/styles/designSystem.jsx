/** HeartLink design system components; the tokens they use are in ./tokens.js. */
import { FONTS, UI, getBadgeConfig } from "./tokens";

// ─── 5. Reusable Component Helpers ────────────────────────────────────────────

/**
 * Standardized Page Header Component
 */
export function PageHeader({ eyebrow, eyebrowIcon: Icon, title, description, actions, className = "" }) {
  return (
    <div className={`${UI.page.header} ${className}`} style={{ fontFamily: FONTS.sans }}>
      <div>
        {eyebrow && (
          <span className={UI.page.eyebrow}>
            {Icon && <Icon size={13} className="text-ds-primary" />} {eyebrow}
          </span>
        )}
        <h1 className={UI.page.title}>
          {title}
        </h1>
        {description && <p className={UI.page.description}>{description}</p>}
      </div>
      {actions && <div className={UI.page.actions}>{actions}</div>}
    </div>
  );
}

/**
 * Standardized KPI Metric Card Component
 */
export function KpiCard({ label, value, icon: Icon, iconBg = "bg-ds-surface", iconColor = "text-ds-slate", iconBorder = "border-ds-hairline", valueColor = "text-ds-ink", className = "" }) {
  return (
    <div className={`${UI.kpi.card} ${className}`} style={{ fontFamily: FONTS.sans }}>
      <div>
        <p className={UI.kpi.label}>{label}</p>
        <p className={`${UI.kpi.value} ${valueColor}`}>
          {value}
        </p>
      </div>
      {Icon && (
        <div className={`${UI.kpi.iconBox} ${iconBg} ${iconColor} ${iconBorder}`}>
          <Icon size={16} />
        </div>
      )}
    </div>
  );
}

/**
 * Standardized Status Badge Component
 */
export function StatusBadge({ status, label, icon: Icon, dot = false, className = "" }) {
  const cfg = getBadgeConfig(status);
  const displayLabel = label || cfg.label;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[12px] font-semibold border ${cfg.cls} ${className}`}
      style={{ fontFamily: FONTS.sans }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {Icon && <Icon size={10} />}
      <span>{displayLabel}</span>
    </span>
  );
}

