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
              className={`text-[11px] font-medium uppercase tracking-widest ${hasError ? 'text-red-500' : 'text-slate-500'}`}
            >
              {label}
            </label>
          )}
          {hint && (
            <a 
              href={hintHref || "#"} 
              onClick={onHintClick}
              className="text-[11px] text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              {hint}
            </a>
          )}
        </div>
      )}

      {/* Input Container */}
      <div className="relative">
        {left && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
            {left}
          </div>
        )}
        
        <input
          id={id}
          ref={ref}
          type={type}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`w-full bg-slate-50 border ${
            hasError 
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10 text-red-900' 
              : 'border-slate-200 focus:border-slate-400 focus:ring-slate-900/5 text-slate-900'
          } rounded-xl text-sm placeholder-slate-300 outline-none transition-all focus:bg-white focus:ring-2`}
          style={{ 
            paddingTop: 11, 
            paddingBottom: 11, 
            paddingLeft: left ? 42 : 16, 
            paddingRight: right ? 42 : 16 
          }}
          {...props}
        />
        
        {right && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            {right}
          </div>
        )}
      </div>

      {/* Fixed height wrapper for error message to prevent CLS */}
      <div className="min-h-[20px] flex items-center mt-1">
        {hasError && (
          <p id={`${id}-error`} role="alert" className="text-[11px] text-red-500 flex items-center gap-1.5 font-medium m-0">
            <AlertCircle size={12} className="shrink-0" />
            {error.message}
          </p>
        )}
      </div>
    </div>
  );
});

InputField.displayName = "InputField";
