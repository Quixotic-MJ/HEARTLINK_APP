import { queryClient } from "./app/queryClient";

// HL-033: default to same-origin ("") so the HttpOnly, SameSite=Strict session
// cookie is sent. Dev proxies /api via Vite, prod via the vercel.json rewrite.
export const BASE_URL = import.meta.env.VITE_API_URL ?? "";

const CSRF_COOKIE_NAME = "heartlink_csrf";
const CSRF_HEADER_NAME = "X-CSRF-Token";
const CSRF_SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

// HL-035: loaded data is cached by React Query (app/queryClient.js, hooks/useApiQuery.js), not here.

// Reads the double-submit CSRF token the backend sets alongside the session cookie.
export const getCsrfToken = () => {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
};

const withCsrf = (headers, method) => {
  if (!CSRF_SAFE_METHODS.includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }
  return headers;
};

// HL-047: the access cookie only lasts an hour. On a 401 the portal quietly asks for a new one
// (one request shared by every call that failed at the same moment) and then retries the call once.
// The retry also runs when the refresh fails, because another tab may have just refreshed for us.
const NO_REFRESH_ENDPOINTS = [
  "/auth/web-login", "/auth/login", "/auth/refresh", "/auth/logout",
  "/auth/request-code", "/auth/verify-code", "/auth/forgot-password",
];
const canRefresh = (endpoint) => !NO_REFRESH_ENDPOINTS.some((path) => endpoint.includes(path));

let refreshInFlight = null;
export const refreshSession = () => {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: withCsrf({}, "POST"),
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

const fetchWithRefresh = async (endpoint, send) => {
  const response = await send();
  if (response.status !== 401 || !canRefresh(endpoint)) {
    return response;
  }
  await refreshSession();
  return send();
};

export const apiFetch = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const method = (options.method || "GET").toUpperCase();
  
  // Perform the network request (auth travels in the HttpOnly cookie, never in JS). Headers are built
  // per attempt, because a refresh replaces the CSRF cookie.
  try {
    const fetchOptions = { ...options };
    const send = () => {
      const headers = withCsrf({
        "Content-Type": "application/json",
        ...options.headers,
      }, method);
      return fetch(url, { ...fetchOptions, headers, credentials: "include" });
    };
    const response = await fetchWithRefresh(endpoint, send);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const isAuthEndpoint = endpoint.includes("/auth/web-login") || 
                             endpoint.includes("/auth/login") || 
                             endpoint.includes("/auth/me") || 
                             endpoint.includes("/auth/logout") || 
                             endpoint.includes("/auth/request-code") || 
                             endpoint.includes("/auth/verify-code") || 
                             endpoint.includes("/auth/forgot-password");
      if (response.status === 401 && !isAuthEndpoint) {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
      if (response.status === 403 && data?.detail === "PASSWORD_CHANGE_REQUIRED") {
        window.dispatchEvent(new Event('auth:password-change-required'));
      }
      throw { status: response.status, data };
    }

    // A save (POST, PUT, DELETE, PATCH) may change anything on screen, so every loaded address refreshes
    if (method !== "GET") {
      queryClient.invalidateQueries();
    }

    return data;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw { status: 500, data: { detail: error.message || "Network Error" } };
  }
};

export const apiUpload = async (file, bucket = "exercises") => {
  const url = `${BASE_URL}/api/upload/`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);

  try {
    const response = await fetchWithRefresh("/api/upload/", () => fetch(url, {
      method: "POST",
      headers: withCsrf({}, "POST"),
      body: formData,
      credentials: "include",
    }));
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
      throw { status: response.status, data };
    }

    return data;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw { status: 500, data: { detail: error.message || "Upload Error" } };
  }
};
