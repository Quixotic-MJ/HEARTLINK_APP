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
      reviewedAt: expertValidated ? reviewedAt : null,
      activityAt: expertValidated ? reviewedAt : Number.isFinite(updatedAt) ? updatedAt : 0,
      image: kind === "recipes" ? row.image_url : row.media_url,
    };
    return matchesLibraryWorkflow(item, "draft") || matchesLibraryWorkflow(item, "published") ? [item] : [];
  }).sort((a, b) => b.activityAt - a.activityAt || a.name.localeCompare(b.name) || String(a.id).localeCompare(String(b.id)));
}
export function contentLibraryLink(item) {
  return `${item.kind === "recipes" ? "/foods" : "/exercises"}?search=${encodeURIComponent(item.name)}`;
}
