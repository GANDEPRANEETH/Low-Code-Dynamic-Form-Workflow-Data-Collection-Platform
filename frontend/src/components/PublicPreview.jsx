import React, { useState, useEffect } from "react";
import { api } from "../api";
import { Star, FileUp, Globe, CheckCircle, ArrowLeft, Loader, Check } from "lucide-react";
import "../styles/preview.css";
import "../styles/form.css";

function PublicPreview({ shareSlug, isPublicOnly = false, onBack, showToast }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loadedSuccessfully, setLoadedSuccessfully] = useState(false);

  useEffect(() => {
    fetchPublicForm();
  }, [shareSlug]);

  const fetchPublicForm = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPublicForm(shareSlug);
      setForm(data);
      setLoadedSuccessfully(true);

      // Initialize responses
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
      setError(err.message || "Failed to load public form schema");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldId, value) => {
    setResponses({
      ...responses,
      [fieldId]: value
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

    // Field requirements validation
    for (const field of form.fields) {
      const val = responses[field.id];
      if (field.required) {
        if (field.field_type === "checkbox" && (!val || val.length === 0)) {
          showToast(`Please select at least one choice for: ${field.label}`, "error");
          return;
        }
        if (field.field_type === "rating" && !val) {
          showToast(`Please rate: ${field.label}`, "error");
          return;
        }
        if (!field.options && !val) {
          showToast(`Please fill in required field: ${field.label}`, "error");
          return;
        }
      }
    }

    setSubmitted(true);
    showToast("Response simulation verified!");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <Loader size={32} className="animate-spin text-indigo-500" style={{ animation: "spin 1s linear infinite", marginBottom: "1rem" }} />
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Resolving form snapshot...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="preview-wrapper fade-in">
        <div className="glass-card" style={{ textAlign: "center", padding: "4rem 2rem", borderColor: "var(--danger)" }}>
          <Globe size={40} style={{ color: "var(--danger)", marginBottom: "1rem" }} />
          <h2 style={{ fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>Resolution Error</h2>
          <p style={{ color: "var(--danger)", fontSize: "0.95rem", marginBottom: "2rem" }}>{error}</p>
          {!isPublicOnly && (
            <button className="btn btn-secondary" onClick={onBack}>
              <ArrowLeft size={16} /> Return to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="preview-wrapper fade-in">
        <div className="success-container">
          <CheckCircle size={48} className="success-icon" />
          <h2>Submission Simulated</h2>
          <p>
            Thank you! Your response simulation for "{form.title}" was successfully verified. Form layout rendering works correctly.
          </p>
          <div className="success-actions">
            <button className="btn btn-primary" onClick={() => setSubmitted(false)}>
              Fill Out Again
            </button>
            {!isPublicOnly && (
              <button className="btn btn-secondary" onClick={onBack}>
                <ArrowLeft size={16} /> Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-wrapper fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        {!isPublicOnly ? (
          <button className="btn btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} /> Dashboard
          </button>
        ) : (
          <div></div>
        )}
        
        {loadedSuccessfully && (
          <div className="badge badge-published" style={{ display: "inline-flex", gap: "0.25rem", padding: "0.4rem 0.8rem", textTransform: "none" }}>
            <Check size={12} /> Form Loaded Successfully
          </div>
        )}
      </div>

      <form className="glass-card" onSubmit={handleSubmit}>
        <div className="preview-header">
          <span className="preview-header-version">Version {form.version}</span>
          <h2>{form.title}</h2>
          {form.description && <p>{form.description}</p>}
        </div>

        <div className="preview-body">
          {form.fields.map((field) => {
            const val = responses[field.id];
            
            return (
              <div key={field.id} className="form-group">
                <label className="form-label" style={{ color: "var(--text-main)", marginBottom: "0.5rem" }}>
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
                    {(field.options || []).map((option, idx) => (
                      <option key={idx} value={option}>{option}</option>
                    ))}
                  </select>
                )}

                {field.field_type === "checkbox" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {(field.options || []).map((option, idx) => {
                      const isChecked = (val || []).includes(option);
                      return (
                        <label key={idx} className="checkbox-option">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleCheckboxToggle(field.id, option, e.target.checked)}
                          />
                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {field.field_type === "rating" && (
                  <div className="rating-container">
                    {[1, 2, 3, 4, 5].map((s) => {
                      const isFilled = s <= (val || 0);
                      return (
                        <Star 
                          key={s}
                          size={24}
                          className={isFilled ? "star-filled" : "star-empty"}
                          onClick={() => handleInputChange(field.id, s)}
                        />
                      );
                    })}
                  </div>
                )}

                {field.field_type === "file" && (
                  <div className="file-dropzone">
                    <FileUp size={24} className="file-dropzone-icon" />
                    <span className="file-dropzone-text">
                      {field.placeholder || "Drag and drop or click to upload attachment"}
                    </span>
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

        <div style={{ marginTop: "2.5rem" }}>
          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "1rem" }}>
            Submit Mock Responses
          </button>
        </div>
      </form>
    </div>
  );
}

export default PublicPreview;
