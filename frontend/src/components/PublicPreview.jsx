import React, { useState, useEffect } from "react";
import { api } from "../api";
import { Star, FileUp, Globe, CheckCircle, ArrowLeft, Loader, Check } from "lucide-react";
import "../styles/preview.css";
import "../styles/form.css";

// Helper functions for conditional logic evaluation
function evaluateCondition(triggerVal, operator, comparisonVal) {
  if (triggerVal === undefined || triggerVal === null) {
    triggerVal = "";
  }
  const compStr = String(comparisonVal || "");

  if (operator === "is_empty") {
    return triggerVal === "" || (Array.isArray(triggerVal) && triggerVal.length === 0);
  }

  if (Array.isArray(triggerVal)) {
    if (operator === "equals") {
      return triggerVal.length === 1 && String(triggerVal[0]).toLowerCase() === compStr.toLowerCase();
    } else if (operator === "not_equals") {
      return !(triggerVal.length === 1 && String(triggerVal[0]).toLowerCase() === compStr.toLowerCase());
    } else if (operator === "contains") {
      return triggerVal.some(item => String(item).toLowerCase().includes(compStr.toLowerCase()));
    } else if (operator === "greater_than") {
      return false;
    }
  } else {
    const valStr = String(triggerVal);
    if (operator === "equals") {
      return valStr.toLowerCase() === compStr.toLowerCase();
    } else if (operator === "not_equals") {
      return valStr.toLowerCase() !== compStr.toLowerCase();
    } else if (operator === "contains") {
      return valStr.toLowerCase().includes(compStr.toLowerCase());
    } else if (operator === "greater_than") {
      const v = parseFloat(valStr);
      const c = parseFloat(compStr);
      return !isNaN(v) && !isNaN(c) && v > c;
    }
  }
  return false;
}

function getFieldStates(fields, rules, responses) {
  const states = {};
  fields.forEach(f => {
    states[f.id] = {
      visible: true,
      required: f.required || false
    };
  });

  // Default to hidden if targeted by any show rule
  rules.forEach(r => {
    if (r.action === "show" && states[r.target_field_id]) {
      states[r.target_field_id].visible = false;
    }
  });

  for (let i = 0; i < 5; i++) {
    let stateChanged = false;
    rules.forEach(r => {
      if (!states[r.trigger_field_id] || !states[r.target_field_id]) return;

      const triggerVisible = states[r.trigger_field_id].visible;
      const triggerVal = triggerVisible ? responses[r.trigger_field_id] : null;

      const conditionMet = evaluateCondition(triggerVal, r.operator, r.comparison_value);
      if (conditionMet) {
        if (r.action === "show" && !states[r.target_field_id].visible) {
          states[r.target_field_id].visible = true;
          stateChanged = true;
        } else if (r.action === "hide" && states[r.target_field_id].visible) {
          states[r.target_field_id].visible = false;
          stateChanged = true;
        } else if (r.action === "require" && !states[r.target_field_id].required) {
          states[r.target_field_id].required = true;
          stateChanged = true;
        }
      }
    });
    if (!stateChanged) break;
  }

  return states;
}

function PublicPreview({ shareSlug, isPublicOnly = false, onBack, showToast }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [responseId, setResponseId] = useState("");
  const [loadedSuccessfully, setLoadedSuccessfully] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // File states
  const [uploadingField, setUploadingField] = useState({});
  const [fileNames, setFileNames] = useState({});
  const [fileSizes, setFileSizes] = useState({});
  const [dragOverField, setDragOverField] = useState({});

  useEffect(() => {
    fetchPublicForm();
  }, [shareSlug]);

  const fetchPublicForm = async () => {
    try {
      setLoading(true);
      setError(null);
      setValidationErrors({});
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
    setResponses((prev) => ({
      ...prev,
      [fieldId]: value
    }));
    // Clear validation error when user starts typing/correcting
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated[fieldId];
        return updated;
      });
    }
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

  // Upload attachment file handler
  const handleFileSelect = async (fieldId, file) => {
    if (!file) return;

    const allowed = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      showToast(`Unsupported file format. Allowed types: ${allowed.join(', ')}`, "error");
      return;
    }

    const maxBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxBytes) {
      showToast("File size exceeds the 5 MB limit.", "error");
      return;
    }

    try {
      setUploadingField((prev) => ({ ...prev, [fieldId]: true }));
      const res = await api.uploadFile(file);
      handleInputChange(fieldId, res.file_url);
      setFileNames((prev) => ({ ...prev, [fieldId]: file.name }));
      
      const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + " MB";
      setFileSizes((prev) => ({ ...prev, [fieldId]: sizeFormatted }));
      showToast("File uploaded successfully!");
    } catch (err) {
      showToast(err.message || "Failed to upload file attachment", "error");
    } finally {
      setUploadingField((prev) => ({ ...prev, [fieldId]: false }));
    }
  };

  const handleRemoveFile = (fieldId) => {
    handleInputChange(fieldId, "");
    setFileNames((prev) => {
      const updated = { ...prev };
      delete updated[fieldId];
      return updated;
    });
    setFileSizes((prev) => {
      const updated = { ...prev };
      delete updated[fieldId];
      return updated;
    });
    showToast("File attachment removed");
  };

  const validateField = (field, val, isRequired) => {
    const isValEmpty = val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0);
    if (isRequired && isValEmpty) {
      return "This field is required.";
    }
    if (isValEmpty) return null;

    const rules = field.validation_rules || {};

    if (field.field_type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(val))) {
        return "Please enter a valid email address.";
      }
    }

    if (field.field_type === "number") {
      const num = Number(val);
      if (isNaN(num)) {
        return "Please enter a valid number.";
      }
      if (rules.min_value !== undefined && rules.min_value !== null && rules.min_value !== "" && num < Number(rules.min_value)) {
        return `Value must be at least ${rules.min_value}.`;
      }
      if (rules.max_value !== undefined && rules.max_value !== null && rules.max_value !== "" && num > Number(rules.max_value)) {
        return `Value cannot exceed ${rules.max_value}.`;
      }
    }

    if (field.field_type === "rating") {
      const num = Number(val);
      const minVal = rules.min_value || 1;
      const maxVal = rules.max_value || 5;
      if (isNaN(num) || num < minVal || num > maxVal) {
        return `Rating must be between ${minVal} and ${maxVal}.`;
      }
    }

    if (field.field_type === "text" || field.field_type === "long_text") {
      const len = String(val).length;
      if (rules.min_length !== undefined && rules.min_length !== null && rules.min_length !== "" && len < Number(rules.min_length)) {
        return `Text must be at least ${rules.min_length} characters long.`;
      }
      if (rules.max_length !== undefined && rules.max_length !== null && rules.max_length !== "" && len > Number(rules.max_length)) {
        return `Text cannot exceed ${rules.max_length} characters.`;
      }
    }

    if (field.field_type === "date") {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(String(val)) || isNaN(Date.parse(val))) {
        return "Please select a valid date.";
      }
    }

    return null;
  };

  // Evaluate logic states dynamically
  const fieldStates = form ? getFieldStates(form.fields, form.conditional_rules || [], responses) : {};

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validations
    const errors = {};
    form.fields.forEach(field => {
      const state = fieldStates[field.id];
      if (state && state.visible) {
        const err = validateField(field, responses[field.id], state.required);
        if (err) {
          errors[field.id] = err;
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      showToast("Please correct the validation errors in the form.", "error");
      return;
    }

    // Filter submitted data to only include visible fields
    const visibleData = {};
    form.fields.forEach(field => {
      const state = fieldStates[field.id];
      if (state && state.visible) {
        visibleData[field.id] = responses[field.id];
      }
    });

    try {
      setSubmitting(true);
      setValidationErrors({});
      const res = await api.submitResponse(shareSlug, visibleData);
      setResponseId(res.response_id);
      setSubmitted(true);
      showToast("Responses submitted successfully!");
    } catch (err) {
      if (err.errors) {
        setValidationErrors(err.errors);
        showToast("Server validation failed. Please review field inputs.", "error");
      } else {
        showToast(err.message || "Failed to submit responses. Please check network connection.", "error");
      }
    } finally {
      setSubmitting(false);
    }
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
          <h2>Submission Successful</h2>
          <p>
            Thank you! Your response for "{form.title}" has been successfully recorded.
          </p>
          
          <div style={{ 
            marginTop: "1.25rem", 
            marginBottom: "2rem",
            padding: "1rem", 
            background: "rgba(79, 70, 229, 0.05)", 
            border: "1px solid rgba(79, 70, 229, 0.2)", 
            borderRadius: "8px" 
          }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block" }}>Response ID</span>
            <span style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--primary)", letterSpacing: "1px" }}>
              {responseId || "RESP-XXXXXXXX"}
            </span>
          </div>

          <div className="success-actions">
            <button className="btn btn-primary" onClick={() => { setSubmitted(false); setResponseId(""); fetchPublicForm(); }}>
              Submit Another Response
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
            const state = fieldStates[field.id];
            if (!state || !state.visible) return null;

            const val = responses[field.id];
            const hasError = validationErrors[field.id];
            
            return (
              <div key={field.id} className={`form-group ${hasError ? 'has-error' : ''}`}>
                <label className="form-label" style={{ color: "var(--text-main)", marginBottom: "0.5rem" }}>
                  {field.label} {state.required && <span style={{ color: "var(--danger)" }}>*</span>}
                </label>

                {field.field_type === "dropdown" && (
                  <select 
                    className="form-control"
                    value={val || ""}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    style={{ borderColor: hasError ? "var(--danger)" : "var(--border-color)" }}
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
                  <div style={{ position: "relative" }}>
                    <input 
                      type="file" 
                      id={`file-input-${field.id}`} 
                      style={{ display: "none" }} 
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileSelect(field.id, e.target.files[0])}
                    />
                    
                    {uploadingField[field.id] ? (
                      <div className="file-dropzone" style={{ pointerEvents: "none", opacity: 0.7 }}>
                        <Loader size={20} className="animate-spin text-indigo-500" style={{ animation: "spin 1s linear infinite", marginBottom: "0.5rem" }} />
                        <span className="file-dropzone-text">Uploading attachment...</span>
                      </div>
                    ) : val ? (
                      <div className="file-dropzone" style={{ borderStyle: "solid", borderColor: "var(--primary)", background: "rgba(79, 70, 229, 0.05)" }}>
                        <span className="file-dropzone-text" style={{ color: "var(--text-main)", fontWeight: "600", marginBottom: "0.5rem" }}>
                          ✓ {fileNames[field.id] || "attached_file.bin"} ({fileSizes[field.id] || "N/A"})
                        </span>
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                          onClick={() => handleRemoveFile(field.id)}
                        >
                          Remove File
                        </button>
                      </div>
                    ) : (
                      <div 
                        className={`file-dropzone ${dragOverField[field.id] ? 'drag-over' : ''}`}
                        onClick={() => document.getElementById(`file-input-${field.id}`).click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverField(prev => ({ ...prev, [field.id]: true }));
                        }}
                        onDragLeave={() => {
                          setDragOverField(prev => ({ ...prev, [field.id]: false }));
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverField(prev => ({ ...prev, [field.id]: false }));
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleFileSelect(field.id, e.dataTransfer.files[0]);
                          }
                        }}
                        style={{ 
                          cursor: "pointer", 
                          borderColor: hasError ? "var(--danger)" : "var(--border-color)",
                          background: dragOverField[field.id] ? "rgba(79, 70, 229, 0.05)" : "transparent"
                        }}
                      >
                        <FileUp size={24} className="file-dropzone-icon" />
                        <span className="file-dropzone-text">
                          {field.placeholder || "Drag & drop or Click to upload attachment"}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                          PDF, PNG, JPG, DOC, DOCX • Max 5 MB
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {["text", "number", "email", "date"].includes(field.field_type) && (
                  <input 
                    type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"}
                    className="form-control"
                    placeholder={field.placeholder || ""}
                    value={val || ""}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    style={{ borderColor: hasError ? "var(--danger)" : "var(--border-color)" }}
                  />
                )}

                {hasError && (
                  <p className="validation-error-msg" style={{ color: "var(--danger)", fontSize: "0.78rem", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    ❌ {hasError}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "2.5rem" }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: "100%", padding: "1rem" }}
            disabled={submitting}
          >
            {submitting ? "Submitting response..." : "Submit Responses"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PublicPreview;
