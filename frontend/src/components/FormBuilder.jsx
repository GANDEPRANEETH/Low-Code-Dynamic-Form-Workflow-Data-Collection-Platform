import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  ArrowLeft, Type, Hash, Mail, List, CheckSquare, Calendar, Star, FileUp, 
  Settings, Eye, Loader, Globe, Trash2
} from "lucide-react";
import FieldCard from "./FieldCard";
import FieldSettings from "./FieldSettings";
import "../styles/builder.css";
import "../styles/form.css";
import "../styles/preview.css";

const FIELD_TEMPLATES = [
  { type: "text", label: "Short Text Field", icon: Type, defaultProps: { placeholder: "Enter text..." } },
  { type: "number", label: "Number Input", icon: Hash, defaultProps: { placeholder: "Enter number...", validation_rules: { min_value: null, max_value: null } } },
  { type: "email", label: "Email Address", icon: Mail, defaultProps: { placeholder: "name@example.com" } },
  { type: "dropdown", label: "Dropdown Select", icon: List, defaultProps: { placeholder: "Select option...", options: ["Option 1", "Option 2"] } },
  { type: "checkbox", label: "Checkboxes Group", icon: CheckSquare, defaultProps: { options: ["Choice 1", "Choice 2"] } },
  { type: "date", label: "Calendar Date", icon: Calendar, defaultProps: { placeholder: "Select date" } },
  { type: "rating", label: "Star Rating", icon: Star, defaultProps: { validation_rules: { min_value: 1, max_value: 5 } } },
  { type: "file", label: "File Attachment", icon: FileUp, defaultProps: { placeholder: "Choose file" } },
];

function FormBuilder({ formId, onBack, showToast }) {
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedField, setSelectedField] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [activeTab, setActiveTab] = useState("properties"); // "properties" or "rules"
  const [rules, setRules] = useState([]);
  const [previewResponses, setPreviewResponses] = useState({});

  // Auth modal state for publishing
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // "login" or "register"
  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    fetchFormDetails();
  }, [formId]);

  const fetchFormDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getForm(formId);
      setForm(data);
      setFields(data.fields || []);
      setEditTitle(data.title);
      setEditDesc(data.description || "");
      if (data.fields && data.fields.length > 0) {
        setSelectedField(data.fields[0]);
      }
      const rulesData = await api.getRules(formId);
      setRules(rulesData || []);
    } catch (err) {
      showToast(err.message || "Failed to load form details", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showPreviewModal && fields.length > 0) {
      const initialResponses = {};
      fields.forEach((field) => {
        if (field.field_type === "checkbox") {
          initialResponses[field.id] = [];
        } else if (field.field_type === "rating") {
          initialResponses[field.id] = 0;
        } else {
          initialResponses[field.id] = "";
        }
      });
      setPreviewResponses(initialResponses);
    }
  }, [showPreviewModal, fields]);

  const handleUpdateFormDetails = async () => {
    try {
      setSavingForm(true);
      const updated = await api.updateForm(formId, {
        title: editTitle.trim(),
        description: editDesc.trim(),
      });
      setForm(updated);
    } catch (err) {
      showToast(err.message || "Failed to save form details", "error");
    } finally {
      setSavingForm(false);
    }
  };

  const handleAddField = async (template) => {
    try {
      const fieldData = {
        label: `New ${template.label}`,
        field_type: template.type,
        required: false,
        display_order: fields.length,
        placeholder: template.defaultProps.placeholder || "",
        options: template.defaultProps.options || null,
        validation_rules: template.defaultProps.validation_rules || null
      };

      const newField = await api.addField(formId, fieldData);
      const updatedFields = [...fields, newField];
      setFields(updatedFields);
      setSelectedField(newField);
      showToast(`Added ${template.type} field to layout`);
    } catch (err) {
      showToast(err.message || "Failed to add field", "error");
    }
  };

  const handleUpdateField = async (fieldId, updates) => {
    try {
      const updated = await api.updateField(fieldId, updates);
      const newFields = fields.map((f) => (f.id === fieldId ? updated : f));
      setFields(newFields);
      if (selectedField && selectedField.id === fieldId) {
        setSelectedField(updated);
      }
    } catch (err) {
      showToast(err.message || "Failed to update field property", "error");
    }
  };

  const handleDeleteField = async (fieldId) => {
    if (!window.confirm("Are you sure you want to remove this field from layout?")) return;
    try {
      await api.deleteField(fieldId);
      const remaining = fields.filter((f) => f.id !== fieldId);
      setFields(remaining);
      if (selectedField && selectedField.id === fieldId) {
        setSelectedField(remaining.length > 0 ? remaining[0] : null);
      }
      showToast("Field removed from canvas");
    } catch (err) {
      showToast(err.message || "Failed to delete field", "error");
    }
  };

  const handleReorderField = async (index, direction) => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === fields.length - 1) return;

    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const reordered = [...fields];
    
    // Swap items
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    // Reset display orders to index positions
    reordered[index].display_order = index;
    reordered[targetIdx].display_order = targetIdx;

    setFields(reordered);

    try {
      // Sync display order shifts to PostgreSQL
      await api.updateField(reordered[index].id, { display_order: index });
      await api.updateField(reordered[targetIdx].id, { display_order: targetIdx });
    } catch (err) {
      showToast("Failed to sync field order to server", "error");
    }
  };

  const handlePublishForm = async () => {
    if (fields.length === 0) {
      showToast("Cannot publish an empty form. Please add fields first.", "error");
      return;
    }

    if (!localStorage.getItem("token")) {
      setAuthMode("login");
      setShowAuthModal(true);
      return;
    }

    try {
      const updated = await api.publishForm(formId);
      setForm(updated);
      showToast("Form version published successfully! Public link is active.");
    } catch (err) {
      showToast(err.message || "Failed to publish form version", "error");
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authUsername.trim() || !authPassword.trim()) {
      showToast("Username and password are required", "error");
      return;
    }
    if (authMode === "register" && !authEmail.trim()) {
      showToast("Email address is required", "error");
      return;
    }

    try {
      setAuthSubmitting(true);
      let response;
      if (authMode === "login") {
        response = await api.login({
          username: authUsername.trim(),
          password: authPassword.trim()
        });
      } else {
        response = await api.register({
          username: authUsername.trim(),
          email: authEmail.trim(),
          password: authPassword.trim()
        });
      }

      localStorage.setItem("token", response.token);
      localStorage.setItem("username", response.user.username);
      setShowAuthModal(false);
      showToast(authMode === "login" ? "Signed in successfully!" : "Account registered successfully!");

      setAuthUsername("");
      setAuthEmail("");
      setAuthPassword("");

      // Automatically continue publishing
      const updated = await api.publishForm(formId);
      setForm(updated);
      showToast("Form version published successfully! Public link is active.");
    } catch (err) {
      showToast(err.message || "Authentication failed. Please verify credentials.", "error");
    } finally {
      setAuthSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px" }}>
        <Loader size={32} className="animate-spin text-indigo-500" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className="builder-container fade-in">
      {/* BUILDER HEADER CONTROL BAR */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div className="builder-header-bar">
          <button className="btn btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-secondary" onClick={() => setShowPreviewModal(true)}>
              <Eye size={16} /> Live Preview
            </button>
            <button className="btn btn-primary" onClick={handlePublishForm}>
              <Globe size={16} /> Publish Form
            </button>
          </div>
        </div>

        <div className="builder-title-panel">
          <div style={{ display: "flex", justifyContent: "between", alignItems: "center" }}>
            <div style={{ flexGrow: 1 }}>
              <input 
                type="text" 
                className="form-control" 
                style={{ fontSize: "1.3rem", fontWeight: "700", background: "transparent", border: "none", padding: "0 0 0.25rem", borderBottom: "1px dashed var(--border-color)", borderRadius: 0 }}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleUpdateFormDetails}
                placeholder="Form Title"
              />
              <input 
                type="text" 
                className="form-control" 
                style={{ fontSize: "0.85rem", color: "var(--text-muted)", background: "transparent", border: "none", padding: "0.25rem 0", marginTop: "0.5rem" }}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                onBlur={handleUpdateFormDetails}
                placeholder="Describe form..."
              />
            </div>
            {savingForm && (
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "1rem" }}>Saving...</span>
            )}
          </div>
        </div>
      </div>

      {/* 3-COLUMN WORKSPACE GRID */}
      <div className="builder-grid">
        
        {/* COLUMN 1: FIELD LIBRARY */}
        <div className="panel">
          <div className="panel-header">
            <h3>Field Library</h3>
            <p>Click elements to add them to your form canvas</p>
          </div>
          <div className="library-list">
            {FIELD_TEMPLATES.map((item) => {
              const Icon = item.icon;
              return (
                <div 
                  key={item.type} 
                  className="toolbox-item" 
                  onClick={() => handleAddField(item)}
                >
                  <span className="toolbox-item-icon"><Icon size={15} /></span>
                  <span className="toolbox-item-label">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: CANVAS */}
        <div className="canvas">
          {fields.length === 0 ? (
            <div className="canvas-empty">
              <Settings size={36} style={{ opacity: 0.3 }} />
              <div>
                <h4>Canvas is Empty</h4>
                <p className="subtitle" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  Select fields from the library on the left to begin building your layout.
                </p>
              </div>
            </div>
          ) : (
            fields.map((field, idx) => (
              <FieldCard 
                key={field.id}
                field={field}
                index={idx}
                totalFields={fields.length}
                isSelected={selectedField && selectedField.id === field.id}
                onSelect={() => setSelectedField(field)}
                onReorder={handleReorderField}
                onDelete={handleDeleteField}
              />
            ))
          )}
        </div>

        {/* COLUMN 3: PROPERTIES & RULES PANEL */}
        <div className="panel">
          <div className="panel-header" style={{ paddingBottom: "0.5rem" }}>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "0.5rem", borderBottom: "1px solid var(--border-color)" }}>
              <button 
                type="button"
                className={`tab-btn ${activeTab === 'properties' ? 'active' : ''}`}
                onClick={() => setActiveTab('properties')}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === 'properties' ? "2px solid var(--primary)" : "none",
                  color: activeTab === 'properties' ? "var(--text-main)" : "var(--text-muted)",
                  padding: "0.5rem 0",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "0.85rem"
                }}
              >
                Field Properties
              </button>
              <button 
                type="button"
                className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
                onClick={() => setActiveTab('rules')}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === 'rules' ? "2px solid var(--primary)" : "none",
                  color: activeTab === 'rules' ? "var(--text-main)" : "var(--text-muted)",
                  padding: "0.5rem 0",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "0.85rem"
                }}
              >
                Conditional Rules
              </button>
            </div>
            <p style={{ fontSize: "0.75rem", margin: 0, color: "var(--text-muted)", marginTop: "0.25rem" }}>
              {activeTab === 'properties' 
                ? "Configure settings and validations for the selected field"
                : "Configure logic flow to show, hide, or require fields based on trigger values"
              }
            </p>
          </div>
          
          {activeTab === 'properties' ? (
            <FieldSettings 
              field={selectedField}
              onUpdate={handleUpdateField}
              showToast={showToast}
            />
          ) : (
            <ConditionalRulesBuilder 
              formId={formId}
              fields={fields}
              rules={rules}
              setRules={setRules}
              showToast={showToast}
            />
          )}
        </div>

      </div>

      {/* MOCK PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="modal-overlay">
          <div className="modal-content fade-in" style={{ maxWidth: "650px", overflowY: "auto", maxHeight: "90vh" }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>Form Canvas Preview</h3>
              <button 
                className="btn btn-secondary btn-icon" 
                style={{ borderRadius: "50%", width: "30px", height: "30px" }}
                onClick={() => setShowPreviewModal(false)}
              >
                &times;
              </button>
            </div>
            
            <div className="preview-banner">
              <Eye size={15} /> This is a draft mockup preview. Submission is simulated.
            </div>

            <div className="preview-header">
              <h2>{editTitle || "Untitled Form"}</h2>
              {editDesc && <p>{editDesc}</p>}
            </div>

            <div className="preview-body" style={{ marginTop: "1rem" }}>
              {fields.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                  Add fields on the canvas to see them rendered.
                </p>
              ) : (() => {
                const previewFieldStates = getFieldStates(fields, rules, previewResponses);
                return fields.map((field) => {
                  const state = previewFieldStates[field.id];
                  if (!state || !state.visible) return null;

                  const val = previewResponses[field.id];

                  return (
                    <div key={field.id} className="form-group">
                      <label className="form-label" style={{ color: "var(--text-main)", display: "flex", gap: "0.25rem" }}>
                        {field.label} {state.required && <span style={{ color: "var(--danger)" }}>*</span>}
                      </label>
                      
                      {field.field_type === "dropdown" && (
                        <select 
                          className="form-control"
                          value={val || ""}
                          onChange={(e) => {
                            setPreviewResponses(prev => ({ ...prev, [field.id]: e.target.value }));
                          }}
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
                              <label key={idx} className="checkbox-option">
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const current = val || [];
                                    const updated = e.target.checked ? [...current, o] : current.filter(x => x !== o);
                                    setPreviewResponses(prev => ({ ...prev, [field.id]: updated }));
                                  }}
                                /> 
                                <span>{o}</span>
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
                                size={20} 
                                className={isFilled ? "star-filled" : "star-empty"} 
                                onClick={() => {
                                  setPreviewResponses(prev => ({ ...prev, [field.id]: s }));
                                }}
                              />
                            );
                          })}
                        </div>
                      )}

                      {field.field_type === "file" && (
                        <div className="file-dropzone">
                          <FileUp size={20} className="file-dropzone-icon" />
                          <span className="file-dropzone-text">{field.placeholder || "Upload attachment..."}</span>
                        </div>
                      )}

                      {["text", "number", "email", "date"].includes(field.field_type) && (
                        <input 
                          type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"} 
                          className="form-control" 
                          placeholder={field.placeholder || ""}
                          value={val || ""}
                          onChange={(e) => {
                            setPreviewResponses(prev => ({ ...prev, [field.id]: e.target.value }));
                          }}
                        />
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            <div className="modal-footer" style={{ marginTop: "2rem" }}>
              <button className="btn btn-secondary" onClick={() => setShowPreviewModal(false)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTHENTICATION POPUP MODAL */}
      {showAuthModal && (
        <div className="modal-overlay">
          <div className="modal-content fade-in" style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
                {authMode === "login" ? "Sign In to Publish" : "Register to Publish"}
              </h3>
              <button 
                className="btn btn-secondary btn-icon" 
                style={{ borderRadius: "50%", width: "30px", height: "30px" }}
                onClick={() => setShowAuthModal(false)}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleAuthSubmit}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="E.g., formbuilder_user"
                  required
                />
              </div>

              {authMode === "register" && (
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div style={{ marginTop: "1rem", textAlign: "center" }}>
                <a 
                  href="#" 
                  style={{ fontSize: "0.85rem", color: "var(--primary)", textDecoration: "underline" }}
                  onClick={(e) => {
                    e.preventDefault();
                    setAuthMode(authMode === "login" ? "register" : "login");
                  }}
                >
                  {authMode === "login" 
                    ? "Don't have an account? Sign Up" 
                    : "Already have an account? Sign In"}
                </a>
              </div>

              <div className="modal-footer" style={{ marginTop: "1.5rem" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowAuthModal(false)}
                  disabled={authSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={authSubmitting}
                >
                  {authSubmitting ? "Authenticating..." : authMode === "login" ? "Sign In & Publish" : "Register & Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ConditionalRulesBuilder({ formId, fields, rules, setRules, showToast }) {
  const loading = false;

  // Form states for creating a new rule
  const [triggerFieldId, setTriggerFieldId] = useState("");
  const [operator, setOperator] = useState("equals");
  const [comparisonValue, setComparisonValue] = useState("");
  const [targetFieldId, setTargetFieldId] = useState("");
  const [action, setAction] = useState("show");
  const [submitting, setSubmitting] = useState(false);

  const handleSaveRule = async (e) => {
    e.preventDefault();
    if (!triggerFieldId || !operator || !targetFieldId || !action) {
      showToast("Please fill in all rule logic fields", "error");
      return;
    }
    if (operator !== "is_empty" && !comparisonValue.trim()) {
      showToast("Please specify a comparison value for this operator", "error");
      return;
    }
    if (triggerFieldId === targetFieldId) {
      showToast("Trigger field and target field must be different", "error");
      return;
    }

    try {
      setSubmitting(true);
      const newRule = await api.createRule(formId, {
        trigger_field_id: Number(triggerFieldId),
        operator,
        comparison_value: operator === "is_empty" ? "" : comparisonValue.trim(),
        target_field_id: Number(targetFieldId),
        action
      });
      setRules((prev) => [...prev, newRule]);
      showToast("Conditional rule created successfully!");
      
      // Reset inputs
      setTriggerFieldId("");
      setOperator("equals");
      setComparisonValue("");
      setTargetFieldId("");
      setAction("show");
    } catch (err) {
      showToast(err.message || "Failed to save rule logic", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await api.deleteRule(ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      showToast("Conditional rule deleted");
    } catch (err) {
      showToast(err.message || "Failed to delete rule logic", "error");
    }
  };

  const getFieldLabel = (fieldId) => {
    const f = fields.find((x) => x.id === Number(fieldId));
    return f ? f.label : `Field #${fieldId}`;
  };

  return (
    <div className="fade-in" style={{ padding: "0.5rem 0" }}>
      {/* List existing rules */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h4 style={{ fontSize: "0.85rem", color: "var(--text-main)", marginBottom: "0.75rem", fontWeight: "600" }}>
          Active Rules ({rules.length})
        </h4>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
            <Loader size={16} className="animate-spin text-indigo-500" style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : rules.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "1rem 0" }}>
            No conditional logic rules defined yet. Configure trigger rules below.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {rules.map((rule) => (
              <div 
                key={rule.id} 
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  padding: "0.75rem", 
                  border: "1px solid var(--border-color)", 
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.02)"
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "var(--text-main)", lineHeight: "1.4", flexGrow: 1, marginRight: "0.5rem" }}>
                  <span style={{ color: "var(--primary)", fontWeight: "600" }}>IF</span> {getFieldLabel(rule.trigger_field_id)} <br/>
                  <span style={{ color: "var(--text-muted)" }}>{rule.operator}</span> {rule.operator !== 'is_empty' && <strong>"{rule.comparison_value}"</strong>} <br/>
                  <span style={{ color: "var(--primary)", fontWeight: "600" }}>THEN</span> <span style={{ textTransform: "uppercase", fontWeight: "600" }}>{rule.action}</span> {getFieldLabel(rule.target_field_id)}
                </div>
                <button 
                  type="button" 
                  className="btn btn-danger btn-icon"
                  style={{ width: "24px", height: "24px", padding: 0 }}
                  onClick={() => handleDeleteRule(rule.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add new rule form */}
      <form onSubmit={handleSaveRule} style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem" }}>
        <h4 style={{ fontSize: "0.85rem", color: "var(--text-main)", marginBottom: "0.75rem", fontWeight: "600" }}>
          Add Logic Rule
        </h4>
        
        <div className="form-group">
          <label className="form-label" style={{ fontSize: "0.75rem" }}>IF Trigger Field</label>
          <select 
            className="form-control" 
            value={triggerFieldId}
            onChange={(e) => setTriggerFieldId(e.target.value)}
            required
          >
            <option value="">Choose trigger...</option>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontSize: "0.75rem" }}>Operator</label>
          <select 
            className="form-control" 
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            required
          >
            <option value="equals">equals</option>
            <option value="not_equals">not_equals</option>
            <option value="contains">contains</option>
            <option value="greater_than">greater_than</option>
            <option value="is_empty">is_empty</option>
          </select>
        </div>

        {operator !== "is_empty" && (
          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.75rem" }}>Comparison Value</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="E.g., Yes"
              value={comparisonValue}
              onChange={(e) => setComparisonValue(e.target.value)}
              required
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label" style={{ fontSize: "0.75rem" }}>THEN Target Field</label>
          <select 
            className="form-control" 
            value={targetFieldId}
            onChange={(e) => setTargetFieldId(e.target.value)}
            required
          >
            <option value="">Choose target...</option>
            {fields.filter((f) => f.id.toString() !== triggerFieldId).map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontSize: "0.75rem" }}>Action</label>
          <select 
            className="form-control" 
            value={action}
            onChange={(e) => setAction(e.target.value)}
            required
          >
            <option value="show">show</option>
            <option value="hide">hide</option>
            <option value="require">require</option>
          </select>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          style={{ width: "100%", padding: "0.6rem", marginTop: "0.5rem" }}
          disabled={submitting}
        >
          {submitting ? "Adding rule..." : "Add Rule"}
        </button>
      </form>
    </div>
  );
}

export default FormBuilder;

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
