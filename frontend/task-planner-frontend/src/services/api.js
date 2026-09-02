// frontend/src/services/api.js
// Centralized API client matching WabiSeminar apiRequest pattern

const API_URL = import.meta.env.VITE_API_URL || "/api";

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("tp_token");
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || "Something went wrong");
  }

  return data;
}

