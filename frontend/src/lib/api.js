import { auth } from "../firebase";

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

  return fetch(path, { ...options, headers });
}
