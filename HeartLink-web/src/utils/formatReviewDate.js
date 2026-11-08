export function formatReviewDate(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return (
    date.toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
    }) + " (Asia/Manila)"
  );
}
