import { useState } from "react";

// HL-026 / HL-037: which waiting recipes or exercises a Dietitian or PT has ticked to approve together.

/** Whether an item can be ticked for approval: not approved yet and not archived. */
export const canBulkApprove = (item) => !item.expertValidated && item.status !== "archived";

/** The ticked items, kept to those still on the page and still waiting. */
export function useSelection(items) {
  const [ids, setIds] = useState(() => new Set());
  const toggle = (id) =>
    setIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selected = items.filter((item) => ids.has(item.id) && canBulkApprove(item));
  return { ids, toggle, selected, set: setIds };
}
