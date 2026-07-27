import React, { useState, useEffect } from "react";
import { api } from "../api";
import { Plus, Edit2, Trash2, Globe, Archive, Copy, ExternalLink, Loader } from "lucide-react";

function FormList({ onEditForm, showToast }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState("");
  const [newFormDesc, setNewFormDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const data = await api.getForms();
      setForms(data);
    } catch (err) {
      showToast(err.message || "Failed to load forms", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForm = async (e) => {
    e.preventDefault();
    if (!newFormTitle.trim()) {
      showToast("Form title is required", "error");
      return;
    }
    try {
      setSubmitting(true);
      const created = await api.createForm({
        title: newFormTitle.trim(),
        description: newFormDesc.trim(),
      });
      setForms([created, ...forms]);
      setNewFormTitle("");
      setNewFormDesc("");
      setShowCreateModal(false);
      showToast("Form draft created successfully!");
      // Automatically redirect to builder for the new form
      onEditForm(created.id);
    } catch (err) {
      showToast(err.message || "Failed to create form", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteForm = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await api.deleteForm(id);
      setForms(forms.filter((f) => f.id !== id));
      showToast("Form deleted successfully");
    } catch (err) {
      showToast(err.message || "Failed to delete form", "error");
    }
  };

  const handlePublishForm = async (id) => {
    try {
      const updated = await api.publishForm(id);
      setForms(forms.map((f) => (f.id === id ? updated : f)));
      showToast("Form published successfully! Public URL is now active.");
    } catch (err) {
      showToast(err.message || "Failed to publish form. Make sure to add fields first.", "error");
    }
  };

  const handleArchiveForm = async (id) => {
    try {
      const updated = await api.archiveForm(id);
      setForms(forms.map((f) => (f.id === id ? updated : f)));
      showToast("Form archived. Public URL is now deactivated.");
    } catch (err) {
      showToast(err.message || "Failed to archive form", "error");
    }
  };

  const copyShareLink = (shareSlug) => {
    const link = `${window.location.origin}/forms/${shareSlug}`;
    navigator.clipboard.writeText(link)
      .then(() => showToast("Share URL copied to clipboard!"))
      .catch(() => showToast("Failed to copy URL", "error"));
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px" }}>
        <Loader size={36} className="animate-spin text-indigo-500" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>Your Forms</h2>
          <p className="subtitle">Manage, edit, publish, and track form configurations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> Create Form
        </button>
      </div>

      {forms.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <Globe size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem", opacity: 0.4 }} />
          <h3>No forms created yet</h3>
          <p className="subtitle" style={{ margin: "0.5rem 0 1.5rem" }}>Create your first dynamic form to start collecting schema configurations.</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> Create Form
          </button>
        </div>
      ) : (
        <div className="forms-grid">
          {forms.map((form) => {
            const isDraft = !form.is_published && !form.is_archived;
            return (
              <div key={form.id} className="glass-card form-card">
                <div className="form-card-header">
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      v{form.is_published ? form.current_version - 1 : form.current_version}
                    </span>
                    <h3 className="form-card-title" title={form.title}>{form.title}</h3>
                  </div>
                  {isDraft && <span className="badge badge-draft">Draft</span>}
                  {form.is_published && <span className="badge badge-published">Published</span>}
                  {form.is_archived && <span className="badge badge-archived">Archived</span>}
                </div>

                <p className="form-card-desc">
                  {form.description || "No description provided."}
                </p>

                <div className="form-card-footer">
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button 
                      className="btn btn-secondary btn-icon" 
                      onClick={() => onEditForm(form.id)}
                      title="Edit Form Layout"
                    >
                      <Edit2 size={15} />
                    </button>
                    {form.is_published ? (
                      <>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          onClick={() => copyShareLink(form.share_slug)}
                          title="Copy Share Link"
                        >
                          <Copy size={15} />
                        </button>
                        <a 
                          href={`/forms/${form.share_slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-icon"
                          title="Open Public Preview"
                        >
                          <ExternalLink size={15} />
                        </a>
                        <button 
                          className="btn btn-secondary btn-icon"
                          style={{ color: "var(--warning)" }}
                          onClick={() => handleArchiveForm(form.id)}
                          title="Archive Form"
                        >
                          <Archive size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                          onClick={() => handlePublishForm(form.id)}
                        >
                          <Globe size={13} /> Publish
                        </button>
                        {form.is_archived && (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                            onClick={() => handlePublishForm(form.id)}
                          >
                            Re-Publish
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <button 
                    className="btn btn-danger btn-icon" 
                    onClick={() => handleDeleteForm(form.id, form.title)}
                    title="Delete Form"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE FORM MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content fade-in" style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>New Form Draft</h3>
              <button 
                className="btn btn-secondary btn-icon" 
                style={{ borderRadius: "50%", width: "30px", height: "30px" }}
                onClick={() => setShowCreateModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateForm}>
              <div className="form-group">
                <label className="form-label">Form Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="E.g., Customer Feedback Form"
                  value={newFormTitle}
                  onChange={(e) => setNewFormTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea 
                  className="form-control" 
                  placeholder="Provide details about this form..."
                  rows="3"
                  value={newFormDesc}
                  onChange={(e) => setNewFormDesc(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Creating..." : "Create Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FormList;
