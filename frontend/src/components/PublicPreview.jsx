import React, { useState, useEffect } from "react";
import { api } from "../api";
import { Star, FileUp, Globe, CheckCircle, ArrowLeft, Loader } from "lucide-react";

function PublicPreview({ shareSlug, isPublicOnly = false, showToast }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchPublicForm();
  }, [shareSlug]);

  const fetchPublicForm = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPublicForm(shareSlug);
      setForm(data);
      
      // Initialize response state
      const initialResponses = {};
      data.fields.forEach((field) => {
        if (field.field_type === "checkbox") {
          initialResponses[field.id] = [];
        } else if (field.field_type === "rating") {
          initialResponses[field.id] = 0;
        } else {
          initialResponses[field.id] = "";
        }
      });
      setResponses(initialResponses);
    } catch (err) {
      setError(err.message || "Failed to load public form");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldId, value) => {
    setResponses({
      ...responses,
      [fieldId]: value,
    });
  };

  const handleCheckboxToggle = (fieldId, option, isChecked) => {
    const current = responses[fieldId] || [];
    let updated;
    if (isChecked) {
      updated = [...current, option];
    } else {
      updated = current.filter((o) => o !== option);
    }
    handleInputChange(fieldId, updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    for (const field of form.fields) {
      const val = responses[field.id];
      if (field.required) {
        if (field.field_type === "checkbox" && (!val || val.length === 0)) {
          showToast(`Please check at least one option for "${field.label}"`, "error");
          return;
        }
        if (field.field_type === "rating" && !val) {
          showToast(`Please select a rating for "${field.label}"`, "error");
          return;
        }
        if (!field.options && !val) {
          showToast(`Please fill out: "${field.label}"`, "error");
          return;
        }
      }
    }

    setSubmitted(true);
    if (showToast) {
      showToast("Form response simulated successfully!");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "var(--bg-main)" }}>
        <div style={{ textAlign: "center" }}>
          <Loader size={36} className="animate-spin text-indigo-500" style={{ animation: "spin 1s linear infinite", marginBottom: "1rem" }} />
          <p className="subtitle">Retrieving form layout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-form-wrapper fade-in">
        <div className="glass-card" style={{ textAlign: "center", padding: "4rem 2rem", borderColor: "var(--danger)" }}>
          <Globe size={48} style={{ color: "var(--danger)", marginBottom: "1rem" }} />
          <h2 style={{ fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>Access Denied</h2>
          <p className="subtitle" style={{ color: "var(--danger)", marginBottom: "2rem" }}>{error}</p>
          {!isPublicOnly && (
            <button className="btn btn-secondary" onClick={() => (window.location.hash = "")}>
              <ArrowLeft size={16} /> Return to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="public-form-wrapper fade-in">
        <div className="glass-card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <CheckCircle size={56} style={{ color: "var(--success)", marginBottom: "1.5rem" }} />
          <h2 style={{ fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>Thank You!</h2>
          <p className="subtitle" style={{ marginBottom: "2rem" }}>
            Your response simulation for "{form.title}" was completed. Layout presentation verified successfully.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
            <button className="btn btn-primary" onClick={() => setSubmitted(false)}>
              Submit Another Response
            </button>
            {!isPublicOnly && (
              <button className="btn btn-secondary" onClick={() => (window.location.hash = "")}>
                <ArrowLeft size={16} /> Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-form-wrapper fade-in">
      {!isPublicOnly && (
        <button 
          className="btn btn-secondary" 
          style={{ marginBottom: "1.5rem" }} 
          onClick={() => (window.location.hash = "")}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      )}

      <form className="glass-card" onSubmit={handleSubmit}>
        <div className="public-form-header">
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "inline-block", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "1px" }}>
            Published Version {form.version}
          </span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700 }}>
            {form.title}
          </h2>
          {form.description && (
            <p className="subtitle" style={{ marginTop: "0.5rem", fontSize: "0.95rem" }}>
              {form.description}
            </p>
          )}
        </div>

        <div className="public-form-body">
          {form.fields.map((field) => {
            const val = responses[field.id];
            
            return (
              <div key={field.id} className="form-group">
                <label className="form-label" style={{ display: "flex", gap: "0.25rem", color: "var(--text-main)", marginBottom: "0.5rem" }}>
                  {field.label} {field.required && <span style={{ color: "var(--danger)" }}>*</span>}
                </label>

                {field.field_type === "dropdown" && (
                  <select 
                    className="form-control" 
                    value={val} 
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.required}
                  >
                    <option value="">{field.placeholder || "Select option..."}</option>
                    {(field.options || []).map((o, idx) => (
                      <option key={idx} value={o}>{o}</option>
                    ))}
                  </select>
                )}

                {field.field_type === "checkbox" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }}>
                    {(field.options || []).map((o, idx) => {
                      const isChecked = (val || []).includes(o);
                      return (
                        <label key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            style={{ width: "16px", height: "16px" }} 
                            checked={isChecked}
                            onChange={(e) => handleCheckboxToggle(field.id, o, e.target.checked)}
                          /> {o}
                        </label>
                      );
                    })}
                  </div>
                )}

                {field.field_type === "rating" && (
                  <div className="rating-container" style={{ padding: "0.25rem 0" }}>
                    {[1, 2, 3, 4, 5].map((s) => {
                      const isFilled = s <= (val || 0);
                      return (
                        <Star 
                          key={s} 
                          size={24} 
                          className={isFilled ? "star-filled" : "star-empty"} 
                          style={{ cursor: "pointer" }}
                          onClick={() => handleInputChange(field.id, s)}
                        />
                      );
                    })}
                  </div>
                )}

                {field.field_type === "file" && (
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: "1.5rem", border: "2px dashed var(--border-color)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                    <FileUp size={24} style={{ color: "var(--primary)" }} />
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Drag and drop file or click to select</span>
                    <input 
                      type="file" 
                      style={{ display: "none" }} 
                      required={field.required && !val}
                    />
                  </div>
                )}

                {["text", "number", "email", "date"].includes(field.field_type) && (
                  <input 
                    type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"} 
                    className="form-control" 
                    placeholder={field.placeholder || ""}
                    value={val}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.required}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "2.5rem", display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "1rem" }}>
            Submit Responses
          </button>
        </div>
      </form>
    </div>
  );
}

export default PublicPreview;
