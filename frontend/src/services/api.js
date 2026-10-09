const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("smartdesk_token");
}

export function saveAuthSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("smartdesk_token", token);
  localStorage.setItem("smartdesk_user", JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("smartdesk_token");
  localStorage.removeItem("smartdesk_user");
}

export async function requestApi(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }
  return data;
}

export const authApi = {
  login: (credentials) =>
    requestApi("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    }),

  register: (userData) =>
    requestApi("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData)
    }),

  getMe: () => requestApi("/api/auth/me"),

  updateProfile: (profileData) =>
    requestApi("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(profileData)
    }),

  changePassword: (passwordData) =>
    requestApi("/api/auth/change-password", {
      method: "PUT",
      body: JSON.stringify(passwordData)
    })
};

export const ticketApi = {
  getTickets: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page);
    if (params.limit) query.set("limit", params.limit);
    if (params.status && params.status !== "All") query.set("status", params.status);
    if (params.priority && params.priority !== "All") query.set("priority", params.priority);
    if (params.category && params.category !== "All") query.set("category", params.category);
    if (params.search && params.search.trim()) query.set("search", params.search.trim());

    const qs = query.toString();
    return requestApi(`/api/requests${qs ? `?${qs}` : ""}`);
  },

  getTicketById: (id) => requestApi(`/api/requests/${id}`),

  createTicket: (data) =>
    requestApi("/api/requests", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateStatus: (id, status) =>
    requestApi(`/api/requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),

  deleteTicket: (id) =>
    requestApi(`/api/requests/${id}`, {
      method: "DELETE"
    }),

  getStats: () => requestApi("/api/requests/stats"),

  getComments: (id) => requestApi(`/api/requests/${id}/comments`),

  addComment: (id, commentData) =>
    requestApi(`/api/requests/${id}/comments`, {
      method: "POST",
      body: JSON.stringify(commentData)
    }),

  generateAiSuggestion: (id) =>
    requestApi(`/api/requests/${id}/ai-suggest`, {
      method: "POST"
    })
};
