// HL-165 (panel revision): the Cardiologist approves a case before it can be used as a dataset. These helpers word the
// "Use for the dataset" panel on a case; caseReviewDetail.jsx draws it.

const VERDICT_WORDS = { ok: "suitable", changes: "suitable with changes", no: "not suitable" };

/** "2 suitable, 1 not suitable" for a food or exercise check; null when it wasn't done. */
export function verdictSummary(section) {
  const verdicts = section?.item_verdicts || [];
  if (!verdicts.length) return null;
  const counts = {};
  for (const v of verdicts) counts[v.verdict] = (counts[v.verdict] || 0) + 1;
  return Object.keys(VERDICT_WORDS)
    .filter((k) => counts[k])
    .map((k) => `${counts[k]} ${VERDICT_WORDS[k]}`)
    .join(", ");
}

const STATUS = {
  approved: { label: "Approved for the dataset", tone: "done" },
  left_out: { label: "Left out of the dataset", tone: "out" },
  waiting: { label: "Waiting for the Cardiologist's approval", tone: "waiting" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The status line everyone sees, e.g. "Approved by Dr Cruz on Nov 23". */
export function datasetStatusView(dataset) {
  const d = dataset || {};
  const status = STATUS[d.status] ? d.status : "waiting";
  const at = d.decided_at ? new Date(d.decided_at) : null;
  const when = at && !Number.isNaN(at.getTime()) ? ` on ${MONTHS[at.getMonth()]} ${at.getDate()}` : "";
  const by = d.decided_by_name ? ` by ${d.decided_by_name}` : "";
  let detail;
  if (status === "approved") detail = `Approved${by}${when}.`;
  else if (status === "left_out") detail = `Left out${by}${when}: ${d.note || "no reason given"}.`;
  else if (d.practice) detail = "This is a practice review, so it can't be used for the dataset.";
  else if (d.waiting_for) detail = `Waiting for ${d.waiting_for} before the Cardiologist can approve it.`;
  else detail = "Every part is in. The Cardiologist can now approve it or leave it out.";
  return { ...STATUS[status], status, detail };
}
