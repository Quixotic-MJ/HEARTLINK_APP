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
    sm: "px-3 h-9 text-[13px]",
    md: "px-4 h-10 text-[14px]",
    lg: "px-5 h-11 text-[15px]",
  };

  const variants = {
    primary: "bg-ds-primary hover:bg-ds-primary-pressed text-white ",
    secondary: "bg-ds-canvas hover:bg-ds-surface text-ds-ink border border-ds-hairline-strong ",
    danger: "bg-ds-danger hover:bg-ds-danger/90 text-white ",
    dangerSoft: "bg-ds-rose hover:bg-ds-rose/80 text-ds-ink",
    ghost: "bg-transparent hover:bg-ds-surface text-ds-slate hover:text-ds-ink",
  };

  const baseStyles = "relative inline-flex items-center justify-center gap-1.5 font-medium rounded-[8px] transition-colors outline-none cursor-pointer";
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
