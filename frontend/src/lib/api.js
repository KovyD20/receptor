import { auth } from "../firebase";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}

export async function authedFetch(path, options = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated");
  }

  const token = await user.getIdToken();
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  return fetch(apiUrl(path), { ...options, headers });
}
