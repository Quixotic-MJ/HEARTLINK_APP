export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const apiFetch = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw { status: response.status, data };
    }

    return data;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw { status: 500, data: { detail: error.message || "Network Error" } };
  }
};
