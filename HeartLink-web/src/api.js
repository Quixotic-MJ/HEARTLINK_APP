// HL-033: default to same-origin ("") so the HttpOnly, SameSite=Strict session
// cookie is sent. Dev proxies /api via Vite, prod via the vercel.json rewrite.
export const BASE_URL = import.meta.env.VITE_API_URL ?? "";

const CSRF_COOKIE_NAME = "heartlink_csrf";
const CSRF_HEADER_NAME = "X-CSRF-Token";
const CSRF_SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

const apiCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Export this in case you need to manually clear the cache from anywhere
export const clearApiCache = () => apiCache.clear();

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

export const apiFetch = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const method = (options.method || "GET").toUpperCase();
  
  // 1. Check Cache for GET requests
  const isCacheable = method === "GET" && !options.bypassCache;
  const cacheKey = endpoint;

  if (isCacheable) {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data; // Return immediately from cache!
    }
  }

  // 2. Prepare headers (auth travels in the HttpOnly cookie, never in JS)
  const headers = withCsrf({
    "Content-Type": "application/json",
    ...options.headers,
  }, method);

  // 3. Perform network request
  try {
    const fetchOptions = { ...options };
    delete fetchOptions.bypassCache;
    const response = await fetch(url, { ...fetchOptions, headers, credentials: "include" });
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

    // 4. Save to cache if it was a GET request
    if (isCacheable) {
      apiCache.set(cacheKey, { data, timestamp: Date.now() });
    } 
    // 5. If it was a mutation (POST, PUT, DELETE, PATCH), invalidate the cache 
    // so the next GET fetches fresh data (e.g. after adding a user or recipe)
    else if (method !== "GET") {
      apiCache.clear();
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

  const headers = withCsrf({}, "POST");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });
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
