const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const hostname = window.location.hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.");
  if (!isLocal) {
    return window.location.origin;
  }
  return "http://localhost:8000";
};

const API_BASE = getApiBase();

async function request(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add Authorization token if present
  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = `Token ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const error = new Error(errData.detail || errData.message || "Something went wrong");
    error.errors = errData.errors;
    error.detail = errData.detail;
    throw error;
  }

  return response.json();
}

export const api = {
  // Auth APIs
  register: (data) => request("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => request("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => request("/api/auth/me"),
  
  // Forms
  getForms: () => request("/api/forms"),
  getForm: (id) => request(`/api/forms/${id}`),
  createForm: (data) => request("/api/forms", { method: "POST", body: JSON.stringify(data) }),
  updateForm: (id, data) => request(`/api/forms/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteForm: (id) => request(`/api/forms/${id}`, { method: "DELETE" }),
  
  // Fields
  addField: (formId, data) => request(`/api/forms/${formId}/fields`, { method: "POST", body: JSON.stringify(data) }),
  updateField: (id, data) => request(`/api/fields/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteField: (id) => request(`/api/fields/${id}`, { method: "DELETE" }),
  
  // Lifecycle
  publishForm: (id) => request(`/api/forms/${id}/publish`, { method: "POST" }),
  archiveForm: (id) => request(`/api/forms/${id}/archive`, { method: "POST" }),
  
  // Rules
  getRules: (formId) => request(`/api/forms/${formId}/rules`),
  createRule: (formId, data) => request(`/api/forms/${formId}/rules`, { method: "POST", body: JSON.stringify(data) }),
  deleteRule: (id) => request(`/api/rules/${id}`, { method: "DELETE" }),

  // Responses Submissions
  getResponses: (formId) => request(`/api/forms/${formId}/responses`),
  exportCSVUrl: (formId) => `${API_BASE}/api/forms/${formId}/export`,

  // Public Client
  getPublicForm: (slug) => request(`/api/public/${slug}`),
  submitResponse: (slug, data) => request(`/api/public/${slug}/submit`, { method: "POST", body: JSON.stringify({ submitted_data: data }) }),
  
  // Direct file upload using native fetch (since request uses JSON content-type)
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/api/public/upload`, {
      method: "POST",
      body: formData
    }).then(res => {
      if (!res.ok) {
        return res.json().then(e => {
          throw new Error(e.detail || "Upload failed");
        });
      }
      return res.json();
    });
  }
};
