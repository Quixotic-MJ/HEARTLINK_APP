import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(({
  children,
  onClick,
  isLoading = false,
  loadingText,
  disabled,
  className = "",
  variant = "primary",
  type = "button",
  ...props
}, ref) => {
  const isDisabled = disabled || isLoading;
  
  const baseStyles = "relative inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all outline-none focus:ring-2 focus:ring-offset-1";
  
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600",
    outline: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-200",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-200"
  };

  const stateStyles = isDisabled 
    ? "opacity-70 cursor-not-allowed" 
    : "active:scale-[0.98]";

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isLoading}
      aria-disabled={isDisabled}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${stateStyles} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 size={16} className="animate-spin shrink-0" />}
      {isLoading && loadingText ? (
        <span>{loadingText}</span>
      ) : (
        children
      )}
    </button>
  );
});

Button.displayName = "Button";
