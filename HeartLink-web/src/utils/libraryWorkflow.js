export const LIBRARY_WORKFLOW = [
  ["all", "All"],
  ["draft", "Waiting"],
  ["approved", "Approved"],
  ["published", "Published"],
  ["archived", "Archived"],
];

export function matchesLibraryWorkflow(item, filter) {
  // "All" is the working library: archived items live only under Archived (2026-11-18). Unknown older statuses stay
  // under All so nothing disappears.
  if (filter === "all") return item.status !== "archived";
  if (filter === "draft")
    return ["draft", "published"].includes(item.status) && !item.expertValidated;
  if (filter === "approved")
    return item.status === "draft" && !!item.expertValidated;
  if (filter === "published")
    return item.status === "published" && !!item.expertValidated;
  return item.status === filter;
}

/** The status to show: a published item still waiting for approval is hidden from patients, so it says so. */
export function shownStatus(item) {
  return item.status === "published" && !item.expertValidated ? "waiting" : item.status;
}

/** The pill colour: waiting looks like a draft. */
export function statusTone(item) {
  return shownStatus(item) === "waiting" ? "draft" : item.status;
}

export function libraryWorkflowCounts(items) {
  return Object.fromEntries(
    LIBRARY_WORKFLOW.map(([key]) => [
      key,
      items.filter((item) => matchesLibraryWorkflow(item, key)).length,
    ]),
  );
}
