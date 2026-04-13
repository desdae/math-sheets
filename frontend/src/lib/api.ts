export const resolveApiBaseUrl = (configuredBaseUrl?: string, isDev = false, currentOrigin?: string) => {
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (isDev) {
    return "http://localhost:3000/api";
  }

  if (currentOrigin) {
    return `${currentOrigin}/api`;
  }

  return "/api";
};

const API_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.DEV,
  typeof window !== "undefined" ? window.location.origin : undefined
);

export const authTokenStorageKey = "mathsheets.access_token";

const getStoredToken = () => localStorage.getItem(authTokenStorageKey);

export const setStoredToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(authTokenStorageKey, token);
  } else {
    localStorage.removeItem(authTokenStorageKey);
  }
};

export const apiFetch = async <T>(path: string, init?: RequestInit, hasRetried = false): Promise<T> => {
  const token = getStoredToken();
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers
  });

  if (response.status === 401 && !hasRetried) {
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include"
    });

    if (refreshResponse.ok) {
      const payload = (await refreshResponse.json()) as { accessToken: string };
      setStoredToken(payload.accessToken);
      return apiFetch<T>(path, init, true);
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(payload.message ?? `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};
