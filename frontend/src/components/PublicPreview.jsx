import React, { useState, useEffect } from "react";
import { api } from "../api";
import { Star, FileUp, Globe, CheckCircle, ArrowLeft, Loader, Check } from "lucide-react";
import { jsPDF } from "jspdf";
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

function PublicPreview({ shareSlug, oneTimeToken = null, isPublicOnly = false, onBack, showToast }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [responseId, setResponseId] = useState("");
  const [loadedSuccessfully, setLoadedSuccessfully] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Connection and Review States
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  // File states
  const [uploadingField, setUploadingField] = useState({});
  const [fileNames, setFileNames] = useState({});
  const [fileSizes, setFileSizes] = useState({});
  const [dragOverField, setDragOverField] = useState({});

  useEffect(() => {
    fetchPublicForm();
  }, [shareSlug]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingSubmissions();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [shareSlug]);

  const syncPendingSubmissions = async () => {
    const queue = JSON.parse(localStorage.getItem("pending_submissions") || "[]");
    if (queue.length === 0) return;

    setSyncing(true);
    const remaining = [];
    for (const sub of queue) {
      try {
        await api.submitResponse(sub.shareSlug, sub.data, sub.responseId, sub.token);
        showToast("✓ Submission synced successfully.");
      } catch (err) {
        console.error("Failed to sync submission:", err);
        if (err.status === 400 || err.message?.includes("already") || err.message?.includes("invalid")) {
          // Discard invalid/expired
        } else {
          remaining.push(sub);
        }
      }
    }
    localStorage.setItem("pending_submissions", JSON.stringify(remaining));
    setSyncing(false);
  };

  // Save response draft state on change
  useEffect(() => {
    if (form && Object.keys(responses).length > 0) {
      localStorage.setItem(`form_draft_${shareSlug}`, JSON.stringify(responses));
    }
  }, [responses, form]);

  const fetchPublicForm = async () => {
    try {
      setLoading(true);
      setError(null);
      setValidationErrors({});
      
      let data;
      if (navigator.onLine) {
        data = await api.getPublicForm(shareSlug, oneTimeToken);
        localStorage.setItem(`form_schema_${shareSlug}`, JSON.stringify(data));
      } else {
        const cached = localStorage.getItem(`form_schema_${shareSlug}`);
        if (cached) {
          data = JSON.parse(cached);
          showToast("Loaded form from offline cache.", "info");
        } else {
          throw new Error("Internet is unavailable and this form has not been cached on this device yet.");
        }
      }

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

      // Load draft if exists
      const cachedDraft = localStorage.getItem(`form_draft_${shareSlug}`);
      if (cachedDraft) {
        try {
          const parsed = JSON.parse(cachedDraft);
          setResponses({ ...initialResponses, ...parsed });
        } catch (e) {
          setResponses(initialResponses);
        }
      } else {
        setResponses(initialResponses);
      }
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

    const isPhoneField = (f) => {
      if (!f) return false;
      const labelLower = (f.label || "").toLowerCase();
      const typeLower = (f.field_type || "").toLowerCase();
      return (
        typeLower === "tel" || 
        typeLower === "phone" || 
        typeLower === "mobile" ||
        labelLower.includes("phone") || 
        labelLower.includes("mobile") || 
        labelLower.includes("tel") || 
        labelLower.includes("contact")
      );
    };

    if (isPhoneField(field)) {
      const valStr = String(val);
      const len = valStr.length;
      
      const minLen = rules.min_value !== undefined && rules.min_value !== null && rules.min_value !== "" ? Number(rules.min_value) : (rules.min_length !== undefined && rules.min_length !== null && rules.min_length !== "" ? Number(rules.min_length) : null);
      const maxLen = rules.max_value !== undefined && rules.max_value !== null && rules.max_value !== "" ? Number(rules.max_value) : (rules.max_length !== undefined && rules.max_length !== null && rules.max_length !== "" ? Number(rules.max_length) : null);
      
      if (minLen !== null && len < minLen) {
        return `Mobile number must be at least ${minLen} digits.`;
      }
      if (maxLen !== null && len > maxLen) {
        return `Mobile number cannot exceed ${maxLen} digits.`;
      }
      return null;
    }

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
      const minLen = rules.min_length !== undefined && rules.min_length !== null && rules.min_length !== "" ? Number(rules.min_length) : (rules.min_value !== undefined && rules.min_value !== null && rules.min_value !== "" ? Number(rules.min_value) : null);
      const maxLen = rules.max_length !== undefined && rules.max_length !== null && rules.max_length !== "" ? Number(rules.max_length) : (rules.max_value !== undefined && rules.max_value !== null && rules.max_value !== "" ? Number(rules.max_value) : null);
      
      if (minLen !== null && len < minLen) {
        return `Text must be at least ${minLen} characters long.`;
      }
      if (maxLen !== null && len > maxLen) {
        return `Text cannot exceed ${maxLen} characters.`;
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

    setReviewMode(true);
  };

  const handleConfirmSubmit = async () => {
    const visibleData = {};
    form.fields.forEach(field => {
      const state = fieldStates[field.id];
      if (state && state.visible) {
        visibleData[field.id] = responses[field.id];
      }
    });

    if (!navigator.onLine) {
      const offlineId = "OFFLINE-" + Math.random().toString(36).substr(2, 9).toUpperCase();
      const newSub = {
        shareSlug,
        data: visibleData,
        responseId: offlineId,
        token: oneTimeToken
      };
      
      const queue = JSON.parse(localStorage.getItem("pending_submissions") || "[]");
      queue.push(newSub);
      localStorage.setItem("pending_submissions", JSON.stringify(queue));
      
      localStorage.removeItem(`form_draft_${shareSlug}`);
      
      setResponseId(offlineId);
      setSubmitted(true);
      setReviewMode(false);
      showToast("Offline mode: response saved locally.");
      return;
    }

    try {
      setSubmitting(true);
      setValidationErrors({});
      const res = await api.submitResponse(shareSlug, visibleData, form.response_id, oneTimeToken);
      
      localStorage.removeItem(`form_draft_${shareSlug}`);
      
      setResponseId(res.response_id);
      setSubmitted(true);
      setReviewMode(false);
      showToast("Responses submitted successfully!");
    } catch (err) {
      if (err.errors) {
        setValidationErrors(err.errors);
        setReviewMode(false);
        showToast("Server validation failed. Please review field inputs.", "error");
      } else {
        showToast(err.message || "Failed to submit responses. Please check network connection.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      let y = 20;
      const marginX = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const checkPageOverflow = (neededHeight) => {
        if (y + neededHeight > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
      };

      // Header block
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(99, 102, 241); // Indigo Primary
      doc.text("FORMFLOW STUDIO", marginX, y);
      y += 8;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); // Muted grey
      doc.text("Completed Form Response Record", marginX, y);
      y += 6;

      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 10;

      // Form details
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // Dark slate
      const titleLines = doc.splitTextToSize(`Form: ${form.title}`, pageWidth - marginX * 2);
      doc.text(titleLines, marginX, y);
      y += (titleLines.length * 6) + 2;

      // Timestamp
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const nowStr = new Date().toLocaleString();
      doc.text(`Generated: ${nowStr}`, marginX, y);
      y += 12;

      // Divider
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 12;

      // Render fields
      form.fields.forEach((field) => {
        const state = fieldStates[field.id];
        if (!state || !state.visible) return;

        let displayVal = responses[field.id];
        if (displayVal === undefined || displayVal === null || displayVal === "" || (Array.isArray(displayVal) && displayVal.length === 0)) {
          displayVal = "Not answered";
        } else if (field.field_type === "file") {
          const fileName = fileNames[field.id] || displayVal.split('/').pop();
          displayVal = `Attachment: ${fileName}`;
        } else if (Array.isArray(displayVal)) {
          displayVal = displayVal.join(", ");
        } else {
          displayVal = String(displayVal);
        }

        const labelLines = doc.splitTextToSize(field.label, pageWidth - marginX * 2);
        const valueLines = doc.splitTextToSize(displayVal, pageWidth - marginX * 2);
        
        const blockHeight = (labelLines.length * 5) + (valueLines.length * 5) + 8;
        checkPageOverflow(blockHeight);

        // Label
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(labelLines, marginX, y);
        y += (labelLines.length * 5) + 1;

        // Value
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(valueLines, marginX, y);
        y += (valueLines.length * 5) + 8;
      });

      // Footer
      checkPageOverflow(15);
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 8;
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Generated securely by FormFlow Studio Engine", marginX, y);

      doc.save(`FormFlow_Response_${form.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
      showToast("PDF response document downloaded successfully!");
    } catch (err) {
      console.error(err);
      showToast("Failed to generate PDF document", "error");
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

  if (reviewMode) {
    return (
      <div className="preview-wrapper fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <button className="btn btn-secondary" onClick={() => setReviewMode(false)}>
            <ArrowLeft size={16} /> Edit Answers
          </button>
          
          <div className="badge badge-published" style={{ display: "inline-flex", gap: "0.25rem", padding: "0.4rem 0.8rem", textTransform: "none" }}>
            Reviewing Your Answers
          </div>
        </div>

        <div className="glass-card" style={{ padding: "2rem" }}>
          <div className="preview-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "1.5rem", marginBottom: "1.5rem" }}>
            <span className="preview-header-version">Review Submission</span>
            <h2>{form.title}</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Please verify your entries before confirming submission.</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "2rem" }}>
            {form.fields.map((field) => {
              const state = fieldStates[field.id];
              if (!state || !state.visible) return null;

              let displayVal = responses[field.id];
              if (displayVal === undefined || displayVal === null || displayVal === "" || (Array.isArray(displayVal) && displayVal.length === 0)) {
                displayVal = <em style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Not answered</em>;
              } else if (field.field_type === "file") {
                displayVal = (
                  <a href={displayVal} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontSize: "0.85rem", display: "inline-flex", gap: "0.25rem", textDecoration: "none" }}>
                    View Uploaded File Link
                  </a>
                );
              } else if (Array.isArray(displayVal)) {
                displayVal = displayVal.join(", ");
              }

              return (
                <div key={field.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.15rem" }}>
                    {field.label}
                  </span>
                  <span style={{ fontSize: "0.9rem", color: "var(--text-main)", fontWeight: 500 }}>
                    {displayVal}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "1rem", flexDirection: "row", flexWrap: "wrap" }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ flex: "1 1 120px" }} 
              onClick={() => setReviewMode(false)} 
              disabled={submitting}
            >
              Back to Edit
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ flex: "1 1 120px", borderColor: "rgba(34, 211, 238, 0.25)", color: "#22D3EE" }} 
              onClick={handleDownloadPDF} 
              disabled={submitting}
            >
              Download PDF
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              style={{ flex: "2 1 200px" }} 
              onClick={handleConfirmSubmit} 
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Confirm & Submit"}
            </button>
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
        
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {isOnline ? (
            <div className="badge badge-published" style={{ display: "inline-flex", gap: "0.25rem", padding: "0.4rem 0.8rem", textTransform: "none", background: "rgba(16, 185, 129, 0.12)", color: "var(--success)" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--success)", alignSelf: "center", marginRight: "0.2rem" }} />
              {syncing ? "Online — Syncing..." : "Online"}
            </div>
          ) : (
            <div className="badge badge-archived" style={{ display: "inline-flex", gap: "0.25rem", padding: "0.4rem 0.8rem", textTransform: "none" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--danger)", alignSelf: "center", marginRight: "0.2rem" }} />
              Offline — progress saved locally
            </div>
          )}
          
          {loadedSuccessfully && (
            <div className="badge badge-published" style={{ display: "inline-flex", gap: "0.25rem", padding: "0.4rem 0.8rem", textTransform: "none" }}>
              <Check size={12} /> Loaded Successfully
            </div>
          )}
        </div>
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
