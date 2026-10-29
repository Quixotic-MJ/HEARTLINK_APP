import React from "react";
import { AlertCircle } from "lucide-react";

export const InputField = React.forwardRef(
  (
    {
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
    },
    ref
  ) => {
    const hasError = !!error;

    return (
      <div className={`w-full space-y-1.5 font-cal-sans ${className}`}>
        {(label || hint) && (
          <div className="flex items-center justify-between">
            {label && (
              <label
                htmlFor={id}
                className={`text-[13px] font-semibold ${
                  hasError ? "text-cal-error" : "text-cal-ink"
                }`}
              >
                {label}
              </label>
            )}
            {hint && (
              <a
                href={hintHref || "#"}
                onClick={onHintClick}
                className="text-[12.5px] font-medium text-cal-muted hover:text-cal-ink hover:underline transition-colors cursor-pointer"
              >
                {hint}
              </a>
            )}
          </div>
        )}

        <div className="relative">
          {left && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-cal-muted">
              {left}
            </div>
          )}

          <input
            id={id}
            ref={ref}
            type={type}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${id}-error` : undefined}
            className={`h-10 w-full rounded-[8px] border bg-cal-canvas text-[14px] text-cal-ink placeholder:text-cal-muted outline-none transition-colors ${
              hasError
                ? "border-cal-error focus:border-cal-error"
                : "border-cal-hairline focus:border-cal-ink"
            } ${left ? "pl-9" : "pl-3.5"} ${right ? "pr-9" : "pr-3.5"} ${inputClassName}`}
            {...props}
          />

          {right && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
              {right}
            </div>
          )}
        </div>

        {hasError && (
          <div className="flex min-h-[16px] items-center pt-0.5">
            <p
              id={`${id}-error`}
              role="alert"
              className="m-0 flex items-center gap-1.5 text-[12px] font-medium text-cal-error"
            >
              <AlertCircle size={12.5} className="shrink-0 text-cal-error" />
              <span>{error.message}</span>
            </p>
          </div>
        )}
      </div>
    );
  }
);

InputField.displayName = "InputField";
