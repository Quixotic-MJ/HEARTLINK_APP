import { matchesLibraryWorkflow } from "../../utils/libraryWorkflow.js";

export function dashboardContent(response, kind) {
  const rows = Array.isArray(response) ? response : response?.data;
  if (!Array.isArray(rows)) throw new Error("Content list unavailable");
  return rows.flatMap((row) => {
    if (!row?.id || typeof row.name !== "string" || !row.name.trim()) return [];
    const reviewedAt = Date.parse(row.reviewed_at);
    const updatedAt = Date.parse(row.updated_at || row.created_at);
    const expertValidated = row.expert_validated === true &&
      typeof row.reviewed_by === "string" && !!row.reviewed_by.trim() &&
      Number.isFinite(reviewedAt);
    const item = {
      id: row.id,
      name: row.name,
      kind,
      status: row.status,
      expertValidated,
      stage: contentStage(row.status, expertValidated, row.review_note),
      reviewedAt: expertValidated ? reviewedAt : null,
      activityAt: expertValidated ? reviewedAt : Number.isFinite(updatedAt) ? updatedAt : 0,
      image: kind === "recipes" ? row.image_url : row.media_url,
    };
    return matchesLibraryWorkflow(item, "draft") || matchesLibraryWorkflow(item, "published") ? [item] : [];
  }).sort((a, b) => b.activityAt - a.activityAt || a.name.localeCompare(b.name) || String(a.id).localeCompare(String(b.id)));
}
/** Where an item really is, for its card: an expert sent it back (it waits for the Admin, not the expert), it's
 * published without an approval (patients don't see it), it's approved and published, or it waits for review. */
export function contentStage(status, expertValidated, reviewNote) {
  if (expertValidated) return status === "published" ? "published" : "approved";
  if (status === "published") return "unapproved";
  return typeof reviewNote === "string" && reviewNote.trim() ? "changes" : "waiting";
}

export function contentLibraryLink(item) {
  return `${item.kind === "recipes" ? "/foods" : "/exercises"}?search=${encodeURIComponent(item.name)}`;
}
