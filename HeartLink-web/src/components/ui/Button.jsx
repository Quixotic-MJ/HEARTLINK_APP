import React from 'react';
import { Loader2 } from 'lucide-react';
import { UI, FONTS } from '../../styles/designSystem';

export const Button = React.forwardRef(({
  children,
  onClick,
  isLoading = false,
  loadingText,
  disabled,
  className = "",
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}, ref) => {
  const isDisabled = disabled || isLoading;
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-[12px]",
    md: "px-4 py-2 text-[12.5px]",
    lg: "px-5 py-2.5 text-[13.5px]",
  };

  const variants = {
    primary: "bg-[#2E9AE8] hover:bg-[#1C7AC8] text-white shadow-2xs",
    secondary: "bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] shadow-2xs",
    danger: "bg-[#A93226] hover:bg-[#8A1F1A] text-white shadow-2xs",
    dangerSoft: "bg-[#F7E4E1] hover:bg-[#F0C4B8] text-[#A93226] border border-[#F0C4B8]",
    ghost: "bg-transparent hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A]",
  };

  const baseStyles = "relative inline-flex items-center justify-center gap-1.5 font-semibold rounded-[8px] transition-colors outline-none cursor-pointer";
  const stateStyles = isDisabled 
    ? "opacity-50 cursor-not-allowed pointer-events-none" 
    : "active:scale-[0.99]";

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isLoading}
      aria-disabled={isDisabled}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variants[variant] || variants.primary} ${stateStyles} ${className}`}
      style={{ fontFamily: FONTS.sans }}
      {...props}
    >
      {isLoading && <Loader2 size={13} className="animate-spin shrink-0" />}
      {isLoading && loadingText ? (
        <span>{loadingText}</span>
      ) : (
        children
      )}
    </button>
  );
});

Button.displayName = "Button";
export default Button;
