import React from "react";

/**
 * HeartLink Web Centralized Design System
 * 
 * Single source of truth for design tokens, typography, color palettes,
 * and reusable class names across all administrative, clinical, and management portals.
 */

// ─── 1. Color Palette Tokens ──────────────────────────────────────────────────
export const COLORS = {
  ink: "#152131",        // Primary deep text & dark accents
  inkSoft: "#5C6B66",    // Secondary & descriptive text
  inkFaint: "#8B9893",   // Captions, placeholders, inactive labels
  paper: "#EDF1EF",      // Light page canvas & subtle inputs
  paperRaise: "#FFFFFF", // Card, modal, drawer, and header surface
  line: "#DCE3DF",       // Consistent border dividers & outlines

  // Brand Accents
  coral: "#E8532E",      // Primary interactive brand color
  coralDeep: "#C13E20",  // Primary hover & active states
  coralSoft: "#FBEAE6",  // Subtle coral badge & icon containers
  garnet: "#8A1F1A",     // Logo secondary deep accent

  // Status & Categorical Tones
  teal: "#1B6E63",       // Success, active status, evaluated cases
  tealSoft: "#E3EFEC",
  amber: "#A9741B",      // Warning, pending review, maintenance
  amberSoft: "#F6EDDD",
  red: "#A93226",        // Critical alert, high risk, danger actions
  redSoft: "#F7E4E1",
};

// ─── 2. Typography Declarations ───────────────────────────────────────────────
export const FONTS = {
  serif: "'Fraunces', serif",
  sans: "'Inter', sans-serif",
  mono: "monospace",
};

// ─── 3. Unified CSS Class Groupings ──────────────────────────────────────────
export const UI = {
  // Page Scaffolding
  page: {
    container: "max-w-[1180px] mx-auto text-[#152131] selection:bg-[#E8532E] selection:text-white",
    header: "flex flex-wrap gap-4 justify-between items-end mb-6",
    eyebrow: "block text-[12px] text-[#8B9893] font-medium mb-1 flex items-center gap-1.5",
    title: "text-[26px] font-medium tracking-tight text-[#152131] m-0",
    description: "text-[13px] text-[#5C6B66] mt-1.5 max-w-[55ch] leading-[1.5]",
    actions: "flex items-center gap-2.5",
  },

  // KPI Metric Cards
  kpi: {
    grid: "grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6",
    card: "bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex items-center justify-between shadow-2xs",
    label: "text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1",
    value: "text-[20px] font-medium text-[#152131] leading-none",
    iconBox: "w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 border",
  },

  // Interactive Buttons
  button: {
    primary:
      "flex items-center justify-center gap-1.5 px-4 py-2 text-[12.5px] font-semibold text-white bg-[#E8532E] hover:bg-[#C13E20] rounded-[8px] shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
    secondary:
      "flex items-center justify-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold text-[#152131] bg-[#FFFFFF] hover:bg-[#EDF1EF] border border-[#DCE3DF] rounded-[8px] transition-colors shadow-2xs cursor-pointer disabled:opacity-50",
    danger:
      "flex items-center justify-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold text-white bg-[#A93226] hover:bg-[#8A1F1A] rounded-[8px] shadow-2xs transition-colors cursor-pointer disabled:opacity-50",
    dangerSoft:
      "flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold text-[#A93226] bg-[#F7E4E1] hover:bg-[#F0C4B8] border border-[#F0C4B8] rounded-[6px] transition-colors cursor-pointer",
    ghost:
      "flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#5C6B66] hover:text-[#152131] hover:bg-[#EDF1EF] rounded-[6px] transition-colors cursor-pointer",
    icon:
      "p-1.5 rounded-[8px] text-[#5C6B66] hover:text-[#152131] hover:bg-[#EDF1EF] transition-colors cursor-pointer",
  },

  // Surface Cards & Containers
  card: {
    root: "bg-[#FFFFFF] rounded-[10px] border border-[#DCE3DF] flex flex-col overflow-hidden shadow-2xs",
    header: "p-4 border-b border-[#DCE3DF] bg-[#FFFFFF] flex flex-wrap items-center justify-between gap-3",
    body: "p-6",
    footer: "p-3.5 border-t border-[#DCE3DF] bg-[#FFFFFF] flex items-center justify-between",
  },

  // Data Tables
  table: {
    container: "w-full overflow-x-auto",
    root: "w-full text-left border-collapse min-w-[700px]",
    thead: "border-b border-[#DCE3DF] bg-[#EDF1EF]/40",
    th: "py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]",
    tbody: "divide-y divide-[#DCE3DF]",
    tr: "hover:bg-[#EDF1EF]/60 transition-colors group cursor-default",
    trClickable: "hover:bg-[#EDF1EF]/60 transition-colors group cursor-pointer",
    td: "py-3.5 px-4 sm:px-5 align-middle",
  },

  // Form Controls
  input: {
    text: "w-full px-3.5 py-2 text-[13px] bg-[#EDF1EF] border border-[#DCE3DF] text-[#152131] rounded-[8px] focus:outline-none focus:border-[#152131] transition-colors placeholder:text-[#8B9893]",
    select: "px-3 py-2 text-[12.5px] font-semibold bg-[#EDF1EF] border border-[#DCE3DF] text-[#152131] rounded-[8px] focus:outline-none focus:border-[#152131] transition-colors cursor-pointer",
    textarea: "w-full px-3.5 py-2 text-[12.5px] bg-[#EDF1EF] border border-[#DCE3DF] text-[#152131] rounded-[8px] focus:outline-none focus:border-[#152131] transition-colors resize-none leading-relaxed placeholder:text-[#8B9893]",
    label: "block text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1",
    error: "text-[11px] font-semibold text-[#A93226] mt-1 flex items-center gap-1",
    search: "w-full pl-9 pr-4 py-2 text-[13px] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] transition-colors bg-[#EDF1EF] text-[#152131] placeholder:text-[#8B9893]",
  },

  // Modals & Dialogs
  modal: {
    backdrop: "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs",
    overlay: "absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer",
    container: "relative w-full max-w-lg bg-[#FFFFFF] max-h-full rounded-2xl shadow-2xl border border-[#DCE3DF] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-[#152131]",
    header: "flex items-center justify-between px-6 py-4.5 border-b border-[#DCE3DF] bg-[#FFFFFF] z-10",
    title: "text-[17px] font-medium text-[#152131] leading-tight",
    body: "flex-1 overflow-y-auto p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4",
    footer: "px-6 py-4 border-t border-[#DCE3DF] bg-[#FFFFFF] flex justify-between items-center shrink-0",
  },

  // Pagination Toolbar
  pagination: {
    bar: "p-3.5 border-t border-[#DCE3DF] bg-[#FFFFFF] flex flex-col sm:flex-row sm:items-center justify-between gap-3",
    text: "text-[12px] text-[#5C6B66] font-medium",
    buttonGroup: "flex items-center gap-2",
    button: "flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold rounded-[6px] border border-[#DCE3DF] bg-[#EDF1EF] transition-colors cursor-pointer text-[#152131] hover:bg-[#DCE3DF] disabled:text-[#8B9893] disabled:cursor-not-allowed disabled:opacity-40",
  },
};

// ─── 4. Standardized Status & Badge Styles ───────────────────────────────────
export const getBadgeConfig = (type) => {
  const t = (type || "").toLowerCase().trim();

  // Success / Online / Approved / Evaluated
  if (["active", "resolved", "completed", "evaluated", "stable", "low", "operational", "online", "recipe", "dataset"].includes(t)) {
    return {
      label: type,
      bg: "bg-[#E3EFEC]",
      text: "text-[#1B6E63]",
      border: "border-[#C5DFD8]",
      cls: "bg-[#E3EFEC] text-[#1B6E63] border-[#C5DFD8]",
    };
  }

  // Warning / In Progress / Moderate Risk / Maintenance / Feedback
  if (["in progress", "moderate", "medium", "pending", "maintenance", "feedback", "suggestion"].includes(t)) {
    return {
      label: type,
      bg: "bg-[#F6EDDD]",
      text: "text-[#A9741B]",
      border: "border-[#EBD7B8]",
      cls: "bg-[#F6EDDD] text-[#A9741B] border-[#EBD7B8]",
    };
  }

  // Danger / Critical / High Risk / Bug / Disabled
  if (["critical", "high", "bug", "bug report", "disabled", "rejected", "safety", "safety reminder", "case", "security"].includes(t)) {
    return {
      label: type,
      bg: "bg-[#F7E4E1]",
      text: "text-[#A93226]",
      border: "border-[#F0C4B8]",
      cls: "bg-[#F7E4E1] text-[#A93226] border-[#F0C4B8]",
    };
  }

  // Primary Brand / Super Admin / Broadcast
  if (["super_admin", "super admin", "broadcast", "new", "unread"].includes(t)) {
    return {
      label: type,
      bg: "bg-[#FBEAE6]",
      text: "text-[#E8532E]",
      border: "border-[#F5C7BD]",
      cls: "bg-[#FBEAE6] text-[#E8532E] border-[#F5C7BD]",
    };
  }

  // Neutral / General / Staff / User
  return {
    label: type || "General",
    bg: "bg-[#EDF1EF]",
    text: "text-[#152131]",
    border: "border-[#DCE3DF]",
    cls: "bg-[#EDF1EF] text-[#152131] border-[#DCE3DF]",
  };
};

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
            {Icon && <Icon size={13} className="text-[#E8532E]" />} {eyebrow}
          </span>
        )}
        <h1 className={UI.page.title} style={{ fontFamily: FONTS.serif }}>
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
export function KpiCard({ label, value, icon: Icon, iconBg = "bg-[#EDF1EF]", iconColor = "text-[#5C6B66]", iconBorder = "border-[#DCE3DF]", valueColor = "text-[#152131]", className = "" }) {
  return (
    <div className={`${UI.kpi.card} ${className}`} style={{ fontFamily: FONTS.sans }}>
      <div>
        <p className={UI.kpi.label}>{label}</p>
        <p className={`${UI.kpi.value} ${valueColor}`} style={{ fontFamily: FONTS.serif }}>
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
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9.5px] font-bold uppercase tracking-wider border ${cfg.cls} ${className}`}
      style={{ fontFamily: FONTS.sans }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {Icon && <Icon size={10} />}
      <span>{displayLabel}</span>
    </span>
  );
}

export default {
  COLORS,
  FONTS,
  UI,
  getBadgeConfig,
  PageHeader,
  KpiCard,
  StatusBadge,
};
