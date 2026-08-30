export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const apiFetch = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = localStorage.getItem('heartlink_admin_token') || sessionStorage.getItem('heartlink_admin_token');
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });
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
    throw { status: 500, data: { detail: error.message || "Network Error" } };
  }
};

export const apiUpload = async (file, bucket = "exercises") => {
  const url = `${BASE_URL}/api/upload/`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);

  const headers = {};
  const token = localStorage.getItem('heartlink_admin_token') || sessionStorage.getItem('heartlink_admin_token');
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
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
