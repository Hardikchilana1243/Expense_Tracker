const API_BASE_URL = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) || "http://localhost:3000/api/v1";

const buildUrl = (path) => {
  if (typeof path !== "string") return path;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (path.startsWith("/api/v1")) {
    const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
    return `${origin}${path}`;
  }
  const cleanBase = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

const getJson = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
};

const request = async (path, { method = "GET", body, headers = {}, requiresAuth = true, ...options } = {}) => {
  const requestHeaders = {
    ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...headers,
  };

  const config = {
    method,
    credentials: "include",
    headers: requestHeaders,
    ...options,
  };

  if (body && !(body instanceof FormData)) {
    config.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    config.body = body;
  }

  const response = await fetch(buildUrl(path), config);
  const data = await getJson(response);

  if (!response.ok) {
    const errorMessage = data?.message || "Request failed";
    const error = new Error(errorMessage);
    error.status = response.status;
    error.code = data?.code || (response.status === 429 ? "RATE_LIMITED" : "UNKNOWN_ERROR");
    error.retryAfter = data?.retryAfter || (response.status === 429 ? 30 : null);
    error.payload = data;
    throw error;
  }

  return data;
};

export const apiClient = {
  get: (path, options = {}) => request(path, { ...options, method: "GET" }),
  post: (path, body, options = {}) => request(path, { ...options, method: "POST", body }),
  put: (path, body, options = {}) => request(path, { ...options, method: "PUT", body }),
  patch: (path, body, options = {}) => request(path, { ...options, method: "PATCH", body }),
  delete: (path, body, options = {}) => request(path, { ...options, method: "DELETE", body }),
};

/** Returns true if an error is an unauthenticated / forbidden response (401 or 403). */
export const isAuthError = (err) => err?.status === 401 || err?.status === 403;

/** Returns true if an error is a rate limit response (429). */
export const isRateLimitError = (err) => err?.status === 429 || err?.code === "RATE_LIMITED";

export default apiClient;
