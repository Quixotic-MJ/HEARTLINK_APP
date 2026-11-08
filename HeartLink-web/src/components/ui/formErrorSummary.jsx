import { useEffect, useId, useRef, useState } from "react";

function errorItems(errors, path = "") {
  if (!errors || typeof errors !== "object") return [];
  if (typeof errors.message === "string") {
    return [{ name: path.replace(/\.root$/, ""), message: errors.message }];
  }
  return Object.entries(errors)
    .filter(([key]) => !["ref", "type", "types"].includes(key))
    .flatMap(([key, value]) =>
      errorItems(value, path ? `${path}.${key}` : key),
    );
}

export function FormErrorSummary({
  errors,
  submitCount,
  describeField,
  onSelect,
  disabled,
}) {
  const summaryRef = useRef(null);
  const headingId = useId();
  const [target, setTarget] = useState(null);
  const items = errorItems(errors);

  useEffect(() => {
    if (submitCount) summaryRef.current?.focus();
  }, [submitCount]);

  useEffect(() => {
    if (target) document.getElementById(target.id)?.focus();
  }, [target]);

  if (!submitCount || !items.length) return null;

  return (
    <section
      ref={summaryRef}
      role="alert"
      aria-labelledby={headingId}
      tabIndex={-1}
      data-validation-summary
      className="mb-5 rounded-[10px] border border-cal-error/40 bg-cal-error/5 p-4 text-[13px] text-cal-ink focus:outline-2 focus:outline-cal-error"
    >
      <h4 id={headingId} className="font-semibold">
        There is a problem
      </h4>
      <p className="mt-1">
        Your changes are still here. Fix these fields before saving.
      </p>
      <ul className="mt-2 list-disc space-y-1 break-words pl-5">
        {items.map(({ name, message }) => {
          const field = describeField(name);
          return (
            <li key={name}>
              <a
                href={`#${field.id}`}
                aria-disabled={disabled || undefined}
                tabIndex={disabled ? -1 : undefined}
                className="underline underline-offset-2 hover:text-cal-primary focus:outline-2"
                onClick={(event) => {
                  event.preventDefault();
                  if (disabled) return;
                  onSelect(name);
                  setTarget({ id: field.id });
                }}
              >
                {field.label}: {message}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
