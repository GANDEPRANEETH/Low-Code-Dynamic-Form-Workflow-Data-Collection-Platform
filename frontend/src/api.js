const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Something went wrong");
  }

  return response.json();
}

export const api = {
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
  
  // Public Client
  getPublicForm: (slug) => request(`/api/public/forms/${slug}`),
};
