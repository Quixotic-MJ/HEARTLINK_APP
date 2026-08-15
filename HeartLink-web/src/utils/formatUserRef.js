/**
 * formatUserRef
 *
 * Converts an internal opaque user ID into a neutral user-facing reference
 * string that never exposes role information embedded in the ID.
 *
 * Design contract:
 *   - Input:  internal user_id from the backend (any format)
 *   - Output: a neutral "USR-XXXX" reference label for display only
 *   - The internal ID is never mutated or stored back.
 *   - Never throws. Falls back safely on unexpected input.
 *
 * Current mock-database ID formats handled:
 *   "usr-patient-101"   → "USR-101"
 *   "usr-patient-a01"   → "USR-A01"
 *   "usr-patient-d01"   → "USR-D01"
 *   "usr-patient-102"   → "USR-102"
 *
 * Staff / system IDs are passed through unchanged (they are never displayed
 * in the user-facing user list context where this helper is used).
 *
 * Future Supabase UUIDs will also work:
 *   "550e8400-e29b-41d4-a716-446655440000" → "USR-550E8400"
 */
export function formatUserRef(userId) {
  if (!userId || typeof userId !== "string") {
    return "USR-???";
  }

  const lower = userId.toLowerCase().trim();

  // --- Segment extraction helpers ---

  // Pattern: "usr-patient-<suffix>"  (current mock DB format)
  // Captures everything after the second hyphen-delimited segment.
  const mockPatientMatch = lower.match(
    /^usr-(?:patient|user|member|app)-(.+)$/
  );
  if (mockPatientMatch) {
    return "USR-" + mockPatientMatch[1].toUpperCase();
  }

  // Pattern: standard UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  // Display only the first 8 hex chars for brevity.
  const uuidMatch = lower.match(
    /^([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  );
  if (uuidMatch) {
    return "USR-" + uuidMatch[1].toUpperCase();
  }

  // Fallback: strip a leading "usr-" prefix if present, then uppercase.
  if (lower.startsWith("usr-")) {
    return "USR-" + userId.slice(4).toUpperCase();
  }

  // Last resort: truncate to 12 chars and uppercase.
  return "USR-" + userId.slice(0, 12).toUpperCase();
}
