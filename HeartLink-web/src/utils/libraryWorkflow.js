export const LIBRARY_WORKFLOW = [
  ["all", "All"],
  ["draft", "Drafts"],
  ["approved", "Approved"],
  ["published", "Published"],
  ["archived", "Archived"],
];

export function matchesLibraryWorkflow(item, filter) {
  if (filter === "all") return true;
  if (filter === "draft")
    return item.status === "draft" && !item.expertValidated;
  if (filter === "approved")
    return item.status === "draft" && !!item.expertValidated;
  return item.status === filter;
}

export function libraryWorkflowCounts(items) {
  return Object.fromEntries(
    LIBRARY_WORKFLOW.map(([key]) => [
      key,
      items.filter((item) => matchesLibraryWorkflow(item, key)).length,
    ]),
  );
}
