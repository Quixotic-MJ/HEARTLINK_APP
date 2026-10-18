import { getRefreshAt, getRefreshToken, setSession } from "../lib/secureTokenStore";
import { apiUrl } from "../lib/apiBase";

/**
 * HL-047: the access token now lasts 24 hours. The refresh token (30 days, renewed on every use)
 * quietly gets a new one, so the patient stays logged in without typing their password again.
 */

/** What the backend returns from login, sign-up, refresh and password change. */
export type SessionTokens = {
  token: string;
  refresh_token: string;
  expires_in: number;
};

export type RefreshResult =
  | { status: "refreshed"; token: string }
  | { status: "expired" } // the refresh token no longer works: log in again
  | { status: "unavailable" }; // offline or server trouble: keep the current token and try later

export function isSessionTokens(data: unknown): data is SessionTokens {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return typeof d.token === "string" && typeof d.refresh_token === "string" && typeof d.expires_in === "number";
}

export async function storeSession(tokens: SessionTokens): Promise<void> {
  await setSession(tokens.token, tokens.refresh_token, tokens.expires_in);
}

let inFlight: Promise<RefreshResult> | null = null;

/** Gets a new access token. Several callers at once share one request (the old refresh token works only once). */
export function refreshSession(): Promise<RefreshResult> {
  if (!inFlight) {
    inFlight = doRefresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function doRefresh(): Promise<RefreshResult> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return { status: "expired" };
  try {
    // Plain fetch on purpose: apiFetch would try to refresh again on a 401 (HL-023)
    const response = await fetch(apiUrl("/api/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (response.ok) {
      const data: unknown = await response.json();
      if (!isSessionTokens(data)) return { status: "unavailable" };
      await storeSession(data);
      return { status: "refreshed", token: data.token };
    }
    return response.status === 401 ? { status: "expired" } : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

/**
 * Milliseconds until the access token should be renewed (0 when it is due now), or null when unknown
 * (logins from before HL-047 have no refresh token; their old token keeps working until it expires).
 */
export async function msUntilRefresh(): Promise<number | null> {
  const refreshAt = await getRefreshAt();
  if (refreshAt === null || !(await getRefreshToken())) return null;
  return Math.max(0, refreshAt - Date.now());
}
