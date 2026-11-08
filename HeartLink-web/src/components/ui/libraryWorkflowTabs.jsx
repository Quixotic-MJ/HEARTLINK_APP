import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { LIBRARY_WORKFLOW } from "../../utils/libraryWorkflow.js";

export function LibraryWorkflowTabs({
  value,
  onChange,
  counts,
  unavailable,
  label,
}) {
  const layoutId = useId();
  const reduceMotion = useReducedMotion();
  return (
    <div className="library-workflow-tabs" role="group" aria-label={label}>
      {LIBRARY_WORKFLOW.map(([key, name]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          title={
            key === "approved" ? "Approved drafts ready to publish" : undefined
          }
        >
          {value === key && (
            <motion.span
              className="library-workflow-active"
              layoutId={layoutId}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 420, damping: 34 }
              }
            />
          )}
          <span>{name}</span>
          <span className="library-workflow-count">
            {unavailable ? "—" : counts[key]}
          </span>
        </button>
      ))}
    </div>
  );
}
