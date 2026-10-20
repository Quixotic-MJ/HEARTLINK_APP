// Shared look for the sign-in and set-password pages (HL-044).

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-line";

export const inputBase =
  "w-full h-11 rounded-[8px] border bg-ds-canvas px-3.5 text-[14px] text-ds-ink placeholder:text-ds-steel shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[border-color,box-shadow]";

export const inputState = (hasError) =>
  hasError
    ? "border-ds-danger focus:border-ds-danger focus:shadow-[0_0_0_4px_rgba(217,83,79,0.12)]"
    : "border-ds-hairline-strong hover:border-ds-steel focus:border-ds-line focus:shadow-[0_0_0_4px_rgba(46,154,232,0.14)]";

export const labelText = "block text-[14px] font-medium text-ds-ink";

export const primaryButton =
  `w-full h-11 rounded-[8px] bg-ds-primary hover:bg-ds-primary-pressed active:bg-ds-primary-pressed disabled:opacity-60 disabled:cursor-not-allowed text-white text-[15px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${focusRing}`;

export const textLink =
  `font-medium text-ds-link hover:underline cursor-pointer rounded-[4px] disabled:text-ds-steel disabled:cursor-not-allowed ${focusRing}`;
