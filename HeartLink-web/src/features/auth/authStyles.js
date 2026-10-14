// Shared look for the sign-in and set-password pages (HL-044).

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9AE8]";

export const inputBase =
  "w-full h-11 rounded-[10px] border bg-white px-3.5 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[border-color,box-shadow]";

export const inputState = (hasError) =>
  hasError
    ? "border-[#F1A9A0] focus:border-[#D9534F] focus:shadow-[0_0_0_4px_rgba(217,83,79,0.12)]"
    : "border-[#DCE1E8] hover:border-[#C5CDD8] focus:border-[#2E9AE8] focus:shadow-[0_0_0_4px_rgba(46,154,232,0.14)]";

export const labelText = "block text-[13.5px] font-medium text-[#334155]";

export const primaryButton =
  `w-full h-11 rounded-[10px] bg-[#2E9AE8] hover:bg-[#2489D4] active:bg-[#1C7AC8] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.14)] transition-colors cursor-pointer ${focusRing}`;

export const textLink =
  `font-medium text-[#1C7AC8] hover:text-[#155E9C] cursor-pointer rounded-[4px] disabled:text-[#94A3B8] disabled:cursor-not-allowed ${focusRing}`;
