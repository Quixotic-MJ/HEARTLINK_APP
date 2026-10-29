// Shared Cal.com Design System styles for the staff sign-in and set-password pages (HL-044).
// Uses scoped --color-cal-* and --font-cal-* tokens from App.css.

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cal-ink";

export const inputBase =
  "w-full h-10 rounded-[8px] border bg-cal-canvas px-3.5 font-cal-sans text-[14px] text-cal-ink placeholder:text-cal-muted-soft outline-none transition-colors";

export const inputState = (hasError) =>
  hasError
    ? "border-cal-error focus:border-cal-error focus:ring-1 focus:ring-cal-error"
    : "border-cal-hairline focus:border-cal-ink focus:ring-1 focus:ring-cal-ink";

export const labelText =
  "block font-cal-sans text-[13px] font-medium leading-[1.4] text-cal-ink";

export const primaryButton =
  `w-full h-10 rounded-[8px] bg-cal-primary active:bg-cal-primary-active disabled:bg-cal-primary-disabled disabled:text-cal-muted disabled:cursor-not-allowed text-cal-on-primary font-cal-sans text-[14px] font-semibold leading-none flex items-center justify-center gap-2 cursor-pointer ${focusRing}`;

export const secondaryButton =
  `inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-5 font-cal-sans text-[14px] font-semibold leading-none text-cal-ink active:bg-cal-surface-soft disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${focusRing}`;

export const textLink =
  `font-cal-sans font-semibold text-cal-ink hover:underline cursor-pointer rounded-[4px] disabled:text-cal-muted-soft disabled:no-underline disabled:cursor-not-allowed ${focusRing}`;
