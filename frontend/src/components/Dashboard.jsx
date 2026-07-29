import React, { useState, useEffect } from "react";
import { api } from "../api";
import { Plus, Edit2, Trash2, Globe, Archive, Copy, ExternalLink, Loader, ServerCrash } from "lucide-react";
import "../styles/dashboard.css";
import "../styles/form.css";

function Dashboard({ onEditForm, onViewPreview, showToast }) {
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
      showToast(err.message || "Failed to load forms from engine", "error");
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
      onEditForm(created.id);
    } catch (err) {
      showToast(err.message || "Failed to create form draft", "error");
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
      showToast("Form version published successfully! Public link is active.");
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
    // Generate public URL path format /forms/{share_slug}
    const link = `${window.location.origin}/forms/${shareSlug}`;
    navigator.clipboard.writeText(link)
      .then(() => showToast("Public URL copied to clipboard!"))
      .catch(() => showToast("Failed to copy URL", "error"));
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px" }}>
        <Loader size={32} className="animate-spin text-indigo-500" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>Your Forms</h2>
          <p>Create, manage, and publish dynamic schemas</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Create Form
        </button>
      </div>

      {forms.length === 0 ? (
        <div className="empty-dashboard">
          <ServerCrash size={40} className="empty-dashboard-icon" />
          <h3>No forms configured</h3>
          <p style={{ color: "var(--text-muted)", margin: "0.5rem 0 1.5rem", fontSize: "0.9rem" }}>
            Add your first custom form draft to populate the workspace.
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Create Form
          </button>
        </div>
      ) : (
        <div className="forms-grid">
          {forms.map((form) => {
            const isDraft = form.status === "Draft";
            const isPublished = form.status === "Published";
            const isArchived = form.status === "Archived";
            
            // Version display: if published, show current_version - 1 (since current_version represents next draft version)
            const displayVersion = isPublished ? form.current_version - 1 : form.current_version;

            return (
              <div key={form.id} className="glass-card form-card">
                <div className="form-card-top">
                  <div>
                    <span className="form-card-version">v{displayVersion}</span>
                    <h3 className="form-card-title" title={form.title}>{form.title}</h3>
                  </div>
                  {isDraft && <span className="badge badge-draft">Draft</span>}
                  {isPublished && <span className="badge badge-published">Published</span>}
                  {isArchived && <span className="badge badge-archived">Archived</span>}
                </div>

                <p className="form-card-desc">
                  {form.description || "No description provided."}
                </p>

                <div className="form-card-actions">
                  <div className="action-group">
                    <button 
                      className="btn btn-secondary btn-icon" 
                      onClick={() => onEditForm(form.id)}
                      title="Edit Form"
                    >
                      <Edit2 size={14} />
                    </button>
                    {isPublished ? (
                      <>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          onClick={() => copyShareLink(form.share_slug)}
                          title="Copy Public URL"
                        >
                          <Copy size={14} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          onClick={() => onViewPreview(form.share_slug)}
                          title="Open Public Preview"
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          style={{ color: "var(--warning)" }}
                          onClick={() => handleArchiveForm(form.id)}
                          title="Archive Form"
                        >
                          <Archive size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                          onClick={() => handlePublishForm(form.id)}
                        >
                          Publish
                        </button>
                        {isArchived && (
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
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE FORM POPUP MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content fade-in">
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
                  placeholder="E.g., Event Registration"
                  value={newFormTitle}
                  onChange={(e) => setNewFormTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea 
                  className="form-control" 
                  placeholder="Describe the purpose of this form schema..."
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

export default Dashboard;
