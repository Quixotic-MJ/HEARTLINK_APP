export function comparisonLabel(value, description) {
  const comparison = value ?? null;
  if (comparison === null) return "Comparison unavailable";
  return `${comparison}${typeof comparison === "number" ? "%" : ""} ${description}`;
}
