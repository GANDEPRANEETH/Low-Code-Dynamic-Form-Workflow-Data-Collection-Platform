import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  Plus, Edit2, Trash2, Globe, Archive, Copy, ExternalLink, Loader, 
  ServerCrash, MessageSquare, ArrowLeft, Download, Eye, Star, FileUp
} from "lucide-react";
import "../styles/dashboard.css";
import "../styles/form.css";

function Dashboard({ onEditForm, onViewPreview, showToast }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Responses Dashboard State
  const [viewingResponsesFor, setViewingResponsesFor] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);

  // Create Form Modal
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
    const link = `${window.location.origin}/forms/${shareSlug}`;
    navigator.clipboard.writeText(link)
      .then(() => showToast("Public URL copied to clipboard!"))
      .catch(() => showToast("Failed to copy URL", "error"));
  };

  // Submissions Dashboard Logic
  const handleViewResponses = async (formObj) => {
    setViewingResponsesFor(formObj);
    setSelectedResponse(null);
    try {
      setLoadingResponses(true);
      const data = await api.getResponses(formObj.id);
      setResponses(data);
    } catch (err) {
      showToast(err.message || "Failed to load form responses", "error");
    } finally {
      setLoadingResponses(false);
    }
  };

  const handleExportCSV = (formId) => {
    const csvUrl = api.exportCSVUrl(formId);
    // Open in a new tab to trigger native HTTP attachment download
    window.open(csvUrl, "_blank");
    showToast("CSV Export triggered");
  };

  const getFieldLabel = (fieldId) => {
    if (!viewingResponsesFor) return `Field #${fieldId}`;
    const f = viewingResponsesFor.fields?.find(x => String(x.id) === String(fieldId));
    return f ? f.label : `Field #${fieldId}`;
  };

  const getFieldType = (fieldId) => {
    if (!viewingResponsesFor) return "text";
    const f = viewingResponsesFor.fields?.find(x => String(x.id) === String(fieldId));
    return f ? f.field_type : "text";
  };

  // Helper to format values in the submissions view
  const renderResponseValue = (fieldId, val) => {
    const type = getFieldType(fieldId);
    if (type === "rating") {
      const starsCount = Number(val) || 0;
      return "⭐".repeat(starsCount) || "No Rating";
    }
    if (type === "file" && val && (val.startsWith("http://") || val.startsWith("https://"))) {
      // Clean up UUID prefixes if visible
      const displayFilename = val.split("/").pop().replace(/^[a-f0-9]{32}_/, "");
      return (
        <a 
          href={val} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ color: "var(--primary)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
          onClick={(e) => e.stopPropagation()} // Prevent row click
        >
          <FileUp size={12} /> {displayFilename}
        </a>
      );
    }
    if (Array.isArray(val)) {
      return val.join(", ");
    }
    return String(val || "N/A");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px" }}>
        <Loader size={32} className="animate-spin text-indigo-500" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  // --- RENDERING SUBMISSIONS SUBVIEW ---
  if (viewingResponsesFor) {
    return (
      <div className="fade-in">
        <div className="dashboard-header" style={{ marginBottom: "1.5rem" }}>
          <div className="dashboard-title">
            <button 
              className="btn btn-secondary" 
              style={{ padding: "0.4rem 0.8rem", marginBottom: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
              onClick={() => setViewingResponsesFor(null)}
            >
              <ArrowLeft size={14} /> Back to Forms
            </button>
            <h2>Submissions for "{viewingResponsesFor.title}"</h2>
            <p>Analyze response metrics and export submission spreadsheets</p>
          </div>
          
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
            <button 
              className="btn btn-primary" 
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              onClick={() => handleExportCSV(viewingResponsesFor.id)}
              disabled={responses.length === 0}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div className="stats-panel" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <div className="glass-card" style={{ padding: "1.25rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Total Responses</div>
            <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--primary)", marginTop: "0.25rem" }}>
              {responses.length}
            </div>
          </div>
          <div className="glass-card" style={{ padding: "1.25rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Form Status</div>
            <div style={{ fontSize: "1.2rem", fontWeight: "700", marginTop: "0.5rem" }}>
              <span className={`badge badge-${viewingResponsesFor.status.toLowerCase()}`}>
                {viewingResponsesFor.status}
              </span>
            </div>
          </div>
        </div>

        {loadingResponses ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
            <Loader size={24} className="animate-spin text-indigo-500" style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : responses.length === 0 ? (
          <div className="empty-dashboard" style={{ padding: "3rem 1.5rem" }}>
            <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
            <h3>No responses logged yet</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Share your public URL to start gathering dynamic submissions.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: selectedResponse ? "1.5fr 1fr" : "1fr", gap: "1.5rem", alignItems: "start" }}>
            
            {/* SUBMITTED USERS LIST TABLE */}
            <div className="glass-card" style={{ padding: "1rem", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                    <th style={{ padding: "0.75rem", color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>Name</th>
                    <th style={{ padding: "0.75rem", color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>Email</th>
                    <th style={{ padding: "0.75rem", color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>Submission Time</th>
                    <th style={{ padding: "0.75rem", textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((resp) => {
                    const isSelected = selectedResponse && selectedResponse.id === resp.id;
                    return (
                      <tr 
                        key={resp.id} 
                        style={{ 
                          borderBottom: "1px solid var(--border-color)", 
                          cursor: "pointer",
                          backgroundColor: isSelected ? "rgba(79, 70, 229, 0.08)" : "transparent"
                        }}
                        onClick={() => setSelectedResponse(resp)}
                      >
                        <td style={{ padding: "0.85rem 0.75rem", fontWeight: "600", color: "var(--text-main)" }}>{resp.name}</td>
                        <td style={{ padding: "0.85rem 0.75rem", color: "var(--text-main)" }}>{resp.email}</td>
                        <td style={{ padding: "0.85rem 0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                          {new Date(resp.submitted_at).toLocaleString()}
                        </td>
                        <td style={{ padding: "0.85rem 0.75rem", textAlign: "right" }}>
                          <button className="btn btn-secondary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}>
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* DETAILS PANEL DRAWER */}
            {selectedResponse && (
              <div className="glass-card fade-in" style={{ padding: "1.25rem", borderLeft: "3px solid var(--primary)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                  <h4 style={{ fontFamily: "var(--font-display)", fontWeight: "700" }}>Submission Details</h4>
                  <button 
                    className="btn btn-secondary btn-icon" 
                    style={{ width: "24px", height: "24px", padding: 0 }}
                    onClick={() => setSelectedResponse(null)}
                  >
                    &times;
                  </button>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Submitted: {new Date(selectedResponse.submitted_at).toLocaleString()} (v{selectedResponse.version})
                  </div>
                  
                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                    <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "var(--text-main)" }}>Submitter Info</div>
                    <div style={{ marginTop: "0.25rem", fontSize: "0.85rem" }}>
                      <strong>Name:</strong> {selectedResponse.name}<br/>
                      <strong>Email:</strong> {selectedResponse.email}
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                    <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "var(--text-main)", marginBottom: "0.5rem" }}>Response Breakdown</div>
                    {Object.entries(selectedResponse.submitted_data).map(([fieldId, value]) => (
                      <div key={fieldId} style={{ marginBottom: "0.75rem" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {getFieldLabel(fieldId)}
                        </div>
                        <div style={{ fontSize: "0.9rem", fontWeight: "500", marginTop: "0.1rem", color: "var(--text-main)" }}>
                          {renderResponseValue(fieldId, value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
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
                          style={{ color: "var(--primary)" }}
                          onClick={() => handleViewResponses(form)}
                          title="View Submissions"
                        >
                          <MessageSquare size={14} />
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
                          <>
                            <button 
                              className="btn btn-secondary btn-icon" 
                              style={{ color: "var(--primary)" }}
                              onClick={() => handleViewResponses(form)}
                              title="View Submissions"
                            >
                              <MessageSquare size={14} />
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                              onClick={() => handlePublishForm(form.id)}
                            >
                              Re-Publish
                            </button>
                          </>
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
