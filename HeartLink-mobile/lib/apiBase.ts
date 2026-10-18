/**
 * HL-023: the one place the backend address comes from (EXPO_PUBLIC_API_URL in the .env file).
 * There is no "localhost" fallback on purpose: a missing setting should fail loudly instead of
 * quietly sending a phone's requests to a server that isn't there.
 */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");

if (!API_BASE_URL) {
  console.error("[HeartLink] EXPO_PUBLIC_API_URL is not set. Add it to HeartLink-mobile/.env (see .env.example).");
}

/** Full address for an API path such as "/api/meals/123". */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
