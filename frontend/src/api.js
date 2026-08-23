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
  getResponses: (formId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/forms/${formId}/responses${query ? `?${query}` : ""}`);
  },
  bulkDeleteResponses: (formId, submissionIds) => request(`/api/forms/${formId}/responses/bulk-delete`, {
    method: "POST",
    body: JSON.stringify({ submission_ids: submissionIds })
  }),
  exportCSVUrl: (formId, params = {}) => {
    const token = localStorage.getItem("token");
    const allParams = { ...params };
    if (token) allParams.token = token;
    const query = new URLSearchParams(allParams).toString();
    return `${API_BASE}/api/forms/${formId}/export${query ? `?${query}` : ""}`;
  },
  exportJSONUrl: (formId, params = {}) => {
    const token = localStorage.getItem("token");
    const allParams = { ...params };
    if (token) allParams.token = token;
    const query = new URLSearchParams(allParams).toString();
    return `${API_BASE}/api/forms/${formId}/export/json${query ? `?${query}` : ""}`;
  },
  getAnalytics: (formId) => request(`/api/forms/${formId}/analytics`),
  duplicateForm: (formId) => request(`/api/forms/${formId}/duplicate`, { method: "POST" }),
  applyRetentionPolicy: (formId, retentionDays) => request(`/api/forms/${formId}/retention`, {
    method: "POST",
    body: JSON.stringify({ retention_days: retentionDays })
  }),
  getAuditLogs: () => request("/api/audit-logs"),

  // Public Client
  getPublicForm: (slug, token = null) => {
    const query = token ? `?token=${encodeURIComponent(token)}` : "";
    return request(`/api/public/${slug}${query}`);
  },
  submitResponse: (slug, data, responseId = null, token = null) => {
    const body = { submitted_data: data };
    if (responseId) body.response_id = responseId;
    if (token) body.token = token;
    return request(`/api/public/${slug}/submit`, { method: "POST", body: JSON.stringify(body) });
  },
  
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
  },

  // AI and One-Time Token Additions
  aiGenerate: (prompt) => request("/api/forms/ai-generate", { method: "POST", body: JSON.stringify({ prompt }) }),
  getOneTimeTokens: (formId) => request(`/api/forms/${formId}/one-time-tokens`),
  createOneTimeToken: (formId, expiresDays = null) => request(`/api/forms/${formId}/one-time-tokens`, {
    method: "POST",
    body: JSON.stringify({ expires_days: expiresDays })
  }),
  revokeOneTimeToken: (formId, token) => request(`/api/forms/${formId}/one-time-tokens/${token}`, { method: "DELETE" })
};
