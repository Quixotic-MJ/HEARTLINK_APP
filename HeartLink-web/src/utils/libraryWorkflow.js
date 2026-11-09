export const LIBRARY_WORKFLOW = [
  ["all", "All"],
  ["draft", "Waiting"],
  ["approved", "Approved"],
  ["published", "Published"],
  ["archived", "Archived"],
];

export function matchesLibraryWorkflow(item, filter) {
  if (filter === "all") return true;
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
