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
    <div className={`space-y-1 w-full ${className}`} style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Top Label & Hint Row */}
      {(label || hint) && (
        <div className="flex items-center justify-between mb-1">
          {label && (
            <label 
              htmlFor={id} 
              className={`text-[11px] font-semibold uppercase tracking-wider ${hasError ? 'text-[#A93226]' : 'text-[#5C6B66]'}`}
            >
              {label}
            </label>
          )}
          {hint && (
            <a 
              href={hintHref || "#"} 
              onClick={onHintClick}
              className="text-[11px] text-[#E8532E] hover:text-[#C13E20] transition-colors cursor-pointer font-medium"
            >
              {hint}
            </a>
          )}
        </div>
      )}

      {/* Input Container */}
      <div className="relative">
        {left && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8B9893]">
            {left}
          </div>
        )}
        
        <input
          id={id}
          ref={ref}
          type={type}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`w-full bg-[#EDF1EF] border ${
            hasError 
              ? 'border-[#A93226] focus:border-[#A93226] text-[#A93226]' 
              : 'border-[#DCE3DF] focus:border-[#152131] text-[#152131]'
          } rounded-[8px] text-[13px] placeholder:text-[#8B9893] outline-none transition-colors ${inputClassName}`}
          style={{ 
            paddingTop: 8, 
            paddingBottom: 8, 
            paddingLeft: left ? 36 : 12, 
            paddingRight: right ? 36 : 12 
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
        <div className="min-h-[16px] flex items-center mt-1">
          <p id={`${id}-error`} role="alert" className="text-[11px] text-[#A93226] flex items-center gap-1.5 font-medium m-0">
            <AlertCircle size={12} className="shrink-0 text-[#A93226]" />
            {error.message}
          </p>
        </div>
      )}
    </div>
  );
});

InputField.displayName = "InputField";
