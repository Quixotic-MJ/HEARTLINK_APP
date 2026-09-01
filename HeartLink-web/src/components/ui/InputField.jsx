import React from "react";
import { AlertCircle } from "lucide-react";

export const InputField = React.forwardRef(({
  id,
  label,
  hint,
  hintHref,
  onHintClick,
  left,
  right,
  error,
  type = "text",
  className = "",
  inputClassName = "",
  ...props
}, ref) => {
  const hasError = !!error;

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {/* Top Label & Hint Row */}
      {(label || hint) && (
        <div className="flex items-center justify-between mb-1">
          {label && (
            <label 
              htmlFor={id} 
              className={`text-[11px] font-bold uppercase tracking-widest ${hasError ? 'text-red-400' : 'text-[#89899C]'}`}
            >
              {label}
            </label>
          )}
          {hint && (
            <a 
              href={hintHref || "#"} 
              onClick={onHintClick}
              className="text-[11px] text-[#E55F37] hover:text-[#D4542E] transition-colors cursor-pointer font-medium"
            >
              {hint}
            </a>
          )}
        </div>
      )}

      {/* Input Container */}
      <div className="relative">
        {left && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            {left}
          </div>
        )}
        
        <input
          id={id}
          ref={ref}
          type={type}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`w-full bg-[#1A1A1A] border ${
            hasError 
              ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20 text-red-200' 
              : 'border-white/10 focus:border-[#E55F37] focus:ring-1 focus:ring-[#E55F37] text-white'
          } rounded-xl text-xs sm:text-sm placeholder:text-slate-500 outline-none transition-all ${inputClassName}`}
          style={{ 
            paddingTop: 10, 
            paddingBottom: 10, 
            paddingLeft: left ? 38 : 14, 
            paddingRight: right ? 38 : 14 
          }}
          {...props}
        />
        
        {right && (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
            {right}
          </div>
        )}
      </div>

      {/* Fixed height wrapper for error message */}
      {hasError && (
        <div className="min-h-[18px] flex items-center mt-1">
          <p id={`${id}-error`} role="alert" className="text-[11px] text-red-400 flex items-center gap-1.5 font-medium m-0">
            <AlertCircle size={12} className="shrink-0 text-red-400" />
            {error.message}
          </p>
        </div>
      )}
    </div>
  );
});

InputField.displayName = "InputField";
