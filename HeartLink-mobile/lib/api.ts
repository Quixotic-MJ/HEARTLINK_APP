import { apiUrl } from "./apiBase";
import { getToken } from "./secureTokenStore";
import { refreshSession } from "../services/SessionService";

export { API_BASE_URL, apiUrl } from "./apiBase";

/**
 * HL-023: every request to the HeartLink backend goes through apiFetch.
 * - The address comes from apiBase (one env setting).
 * - The saved login token is added automatically (pass `auth: false` for login/sign-up calls).
 * - When the server says the token has expired (401), the session is refreshed once and the
 *   request retried (HL-047). If the refresh token no longer works, the session-ended handler
 *   (set by UserContext) signs the patient out.
 * It returns the normal fetch Response, so callers keep checking `response.ok` as before.
 */

type ApiOptions = RequestInit & {
  /** Add the saved login token. Default true. */
  auth?: boolean;
};

let onSessionEnded: (() => void) | null = null;

/** UserContext registers what to do when the session can't be renewed (sign out). */
export function setSessionEndedHandler(handler: (() => void) | null): void {
  onSessionEnded = handler;
}

/**
 * Adds the token. A caller's own Authorization header is kept on the first try (e.g. login uses
 * the token it just received), but replaced after a refresh (`replace`), since it is then stale.
 * A blank one ("Bearer " from a screen whose token hadn't loaded yet) counts as missing.
 */
function withToken(headers: HeadersInit | undefined, token: string | null, replace = false): Record<string, string> {
  const out: Record<string, string> = {};
  if (headers instanceof Headers) headers.forEach((v, k) => (out[k] = v));
  else if (Array.isArray(headers)) headers.forEach(([k, v]) => (out[k] = v));
  else if (headers) Object.assign(out, headers);
  const authKey = Object.keys(out).find((k) => k.toLowerCase() === "authorization");
  const callerHasToken = !!authKey && sentToken(out) !== null;
  if (authKey && (replace || !callerHasToken)) delete out[authKey];
  if (token && (!callerHasToken || replace)) out.Authorization = `Bearer ${token}`;
  return out;
}

function sentToken(headers: Record<string, string>): string | null {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === "authorization");
  const value = key ? headers[key] : "";
  const token = value.startsWith("Bearer ") ? value.slice(7).trim() : "";
  return token && token !== "null" && token !== "undefined" ? token : null;
}

export async function apiFetch(path: string, options: ApiOptions = {}): Promise<Response> {
  const { auth = true, headers, ...init } = options;
  const token = auth ? await getToken() : null;
  const firstHeaders = withToken(headers, token);
  const response = await fetch(apiUrl(path), { ...init, headers: firstHeaders });

  // Only a request that carried a token can be fixed by renewing it.
  if (response.status !== 401 || !auth || !sentToken(firstHeaders)) return response;

  // The access token expired or was revoked early: renew once and try again.
  const result = await refreshSession();
  if (result.status === "refreshed") {
    return fetch(apiUrl(path), { ...init, headers: withToken(headers, result.token, true) });
  }
  if (result.status === "expired") onSessionEnded?.();
  return response;
}
