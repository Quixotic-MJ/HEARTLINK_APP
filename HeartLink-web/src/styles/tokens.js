
/**
 * HeartLink Web Centralized Design System
 * 
 * Single source of truth for design tokens, typography, color palettes,
 * and reusable class names across all administrative, clinical, and management portals.
 */

// ─── 1. Color Palette Tokens ──────────────────────────────────────────────────
// The HeartLink design system (documentation/design-system/HEARTLINK.md). The same values are
// the ds-* Tailwind colours in App.css; use these only where a class can't (charts, inline SVG).
export const COLORS = {
  ink: "#1a1a1a",        // Headings & main text
  inkSoft: "#5d5b54",    // Secondary text (ds-slate)
  inkFaint: "#787671",   // Captions, placeholders (ds-steel)
  paper: "#f6f5f4",      // Info boxes, subtle surfaces (ds-surface)
  paperRaise: "#ffffff", // Page, cards, modals (ds-canvas)
  line: "#e5e3df",       // Card borders & dividers (ds-hairline)

  // Brand Accents
  coral: "#1478b8",      // Primary button (ds-primary)
  coralDeep: "#0f639a",  // Primary pressed (ds-primary-pressed)
  coralSoft: "#dcecfa",  // Soft tag & selected (ds-tint)
  garnet: "#e03131",     // Danger (ds-danger)
  brandLine: "#2e9ae8",  // Lines, rings, chart series (ds-line)

  // Status & Categorical Tones (pastel tag + dark text, never coloured text on a tint)
  teal: "#1aae39",       // Success marks (ds-success)
  tealSoft: "#d9f3e1",   // ds-mint
  amber: "#793400",      // Text on yellow/peach (ds-warm-text)
  amberSoft: "#fef7d6",  // ds-yellow
  red: "#e03131",        // Danger (ds-danger)
  redSoft: "#fde0ec",    // ds-rose
};

// ─── 2. Typography Declarations ───────────────────────────────────────────────
// The design system uses one sans family for headings and body, so `serif` points at it too.
export const FONTS = {
  serif: "'Inter', sans-serif",
  sans: "'Inter', sans-serif",
  mono: "monospace",
};

// ─── 3. Unified CSS Class Groupings ──────────────────────────────────────────
export const UI = {
  // Page Scaffolding
  page: {
    container: "max-w-[1180px] mx-auto text-ds-ink selection:bg-ds-primary selection:text-white",
    header: "flex flex-wrap gap-4 justify-between items-end mb-6",
    eyebrow: "block text-[12px] text-ds-steel font-medium mb-1 flex items-center gap-1.5",
    title: "text-[28px] font-semibold tracking-tight text-ds-ink m-0",
    description: "text-[14px] text-ds-slate mt-1.5 max-w-[55ch] leading-[1.5]",
    actions: "flex items-center gap-2.5",
  },

  // KPI Metric Cards
  kpi: {
    grid: "grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6",
    card: "bg-ds-canvas p-4 rounded-xl border border-ds-hairline flex items-center justify-between",
    label: "text-[11px] font-semibold text-ds-steel uppercase tracking-wider mb-1",
    value: "text-[22px] font-semibold text-ds-ink leading-none",
    iconBox: "w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 border",
  },

  // Interactive Buttons
  button: {
    primary:
      "flex items-center justify-center gap-1.5 px-4 h-10 text-[14px] font-medium text-white bg-ds-primary hover:bg-ds-primary-pressed rounded-[8px] transition-colors cursor-pointer disabled:bg-ds-hairline disabled:text-ds-steel disabled:cursor-not-allowed",
    secondary:
      "flex items-center justify-center gap-1.5 px-4 h-10 text-[14px] font-medium text-ds-ink bg-ds-canvas hover:bg-ds-surface border border-ds-hairline-strong rounded-[8px] transition-colors cursor-pointer disabled:opacity-50",
    danger:
      "flex items-center justify-center gap-1.5 px-4 h-10 text-[14px] font-medium text-white bg-ds-danger hover:bg-ds-danger/90 rounded-[8px] transition-colors cursor-pointer disabled:opacity-50",
    dangerSoft:
      "flex items-center justify-center gap-1.5 px-3.5 h-9 text-[13px] font-medium text-ds-ink bg-ds-rose hover:bg-ds-rose/80 rounded-[8px] transition-colors cursor-pointer",
    ghost:
      "flex items-center justify-center gap-1.5 px-3 h-9 text-[13px] font-medium text-ds-slate hover:text-ds-ink hover:bg-ds-surface rounded-[6px] transition-colors cursor-pointer",
    icon:
      "p-2 rounded-[8px] text-ds-slate hover:text-ds-ink hover:bg-ds-surface transition-colors cursor-pointer",
  },

  // Surface Cards & Containers
  card: {
    root: "bg-ds-canvas rounded-xl border border-ds-hairline flex flex-col overflow-hidden",
    header: "p-4 border-b border-ds-hairline bg-ds-canvas flex flex-wrap items-center justify-between gap-3",
    body: "p-6",
    footer: "p-3.5 border-t border-ds-hairline bg-ds-canvas flex items-center justify-between",
  },

  // Data Tables
  table: {
    container: "w-full overflow-x-auto",
    root: "w-full text-left border-collapse min-w-[700px]",
    thead: "border-b border-ds-hairline bg-ds-surface",
    th: "py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.08em]",
    tbody: "divide-y divide-ds-hairline-soft",
    tr: "hover:bg-ds-surface/60 transition-colors group cursor-default",
    trClickable: "hover:bg-ds-surface/60 transition-colors group cursor-pointer",
    td: "py-3.5 px-4 sm:px-5 align-middle",
  },

  // Form Controls
  input: {
    text: "w-full px-3.5 h-11 text-[14px] bg-ds-canvas border border-ds-hairline-strong text-ds-ink rounded-[8px] focus:outline-none focus:border-ds-line focus:ring-1 focus:ring-ds-line transition-colors placeholder:text-ds-steel",
    select: "px-3 h-10 text-[14px] font-medium bg-ds-canvas border border-ds-hairline-strong text-ds-ink rounded-[8px] focus:outline-none focus:border-ds-line focus:ring-1 focus:ring-ds-line transition-colors cursor-pointer",
    textarea: "w-full px-3.5 py-2.5 text-[14px] bg-ds-canvas border border-ds-hairline-strong text-ds-ink rounded-[8px] focus:outline-none focus:border-ds-line focus:ring-1 focus:ring-ds-line transition-colors resize-none leading-relaxed placeholder:text-ds-steel",
    label: "block text-[13px] font-medium text-ds-ink mb-1.5",
    error: "text-[12px] font-medium text-ds-danger mt-1 flex items-center gap-1",
    search: "w-full pl-9 pr-4 h-10 text-[14px] border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-line focus:ring-1 focus:ring-ds-line transition-colors bg-ds-surface text-ds-ink placeholder:text-ds-steel",
  },

  // Modals & Dialogs
  modal: {
    backdrop: "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/55",
    overlay: "absolute inset-0 bg-black/55 transition-opacity cursor-pointer",
    container: "relative w-full max-w-lg bg-ds-canvas max-h-full rounded-2xl shadow-[0_16px_48px_-8px_rgba(15,15,15,0.16)] border border-ds-hairline flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-ds-ink",
    header: "flex items-center justify-between px-6 py-4.5 border-b border-ds-hairline bg-ds-canvas z-10",
    title: "text-[18px] font-semibold text-ds-ink leading-tight",
    body: "flex-1 overflow-y-auto p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4",
    footer: "px-6 py-4 border-t border-ds-hairline bg-ds-canvas flex justify-between items-center shrink-0",
  },

  // Pagination Toolbar
  pagination: {
    bar: "p-3.5 border-t border-ds-hairline bg-ds-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-3",
    text: "text-[12px] text-ds-slate font-medium",
    buttonGroup: "flex items-center gap-2",
    button: "flex items-center gap-1 px-3 h-9 text-[13px] font-medium rounded-[8px] border border-ds-hairline-strong bg-ds-canvas transition-colors cursor-pointer text-ds-ink hover:bg-ds-surface disabled:text-ds-steel disabled:cursor-not-allowed disabled:opacity-40",
  },
};

// ─── 4. Standardized Status & Badge Styles ───────────────────────────────────
// Pastel tag with dark text: mint = good, yellow = in progress, rose = critical, sky = new, grey = other.
export const getBadgeConfig = (type) => {
  const t = (type || "").toLowerCase().trim();

  // Success / Online / Approved / Evaluated
  if (["active", "resolved", "completed", "evaluated", "stable", "low", "operational", "online", "recipe", "dataset"].includes(t)) {
    return {
      label: type,
      bg: "bg-ds-mint",
      text: "text-ds-charcoal",
      border: "border-ds-mint",
      cls: "bg-ds-mint text-ds-charcoal border-ds-mint",
    };
  }

  // Warning / In Progress / Moderate Risk / Maintenance / Feedback
  if (["in progress", "moderate", "medium", "pending", "maintenance", "feedback", "suggestion"].includes(t)) {
    return {
      label: type,
      bg: "bg-ds-yellow",
      text: "text-ds-warm-text",
      border: "border-ds-yellow",
      cls: "bg-ds-yellow text-ds-warm-text border-ds-yellow",
    };
  }

  // Danger / Critical / High Risk / Bug / Disabled
  if (["critical", "high", "bug", "bug report", "disabled", "rejected", "safety", "safety reminder", "case", "security"].includes(t)) {
    return {
      label: type,
      bg: "bg-ds-rose",
      text: "text-ds-ink",
      border: "border-ds-rose",
      cls: "bg-ds-rose text-ds-ink border-ds-rose",
    };
  }

  // Primary Brand / Broadcast
  if (["broadcast", "new", "unread"].includes(t)) {
    return {
      label: type,
      bg: "bg-ds-tint",
      text: "text-ds-on-tint",
      border: "border-ds-tint",
      cls: "bg-ds-tint text-ds-on-tint border-ds-tint",
    };
  }

  // Neutral / General / Staff / User
  return {
    label: type || "General",
    bg: "bg-ds-surface-alt",
    text: "text-ds-slate",
    border: "border-ds-surface-alt",
    cls: "bg-ds-surface-alt text-ds-slate border-ds-surface-alt",
  };
};
