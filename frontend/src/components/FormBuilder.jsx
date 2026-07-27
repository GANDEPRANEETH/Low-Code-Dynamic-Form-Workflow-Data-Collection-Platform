import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  ArrowLeft, Type, Hash, Mail, List, CheckSquare, Calendar, Star, FileUp, 
  Trash2, ChevronUp, ChevronDown, Settings, Save, Eye, Loader, Globe
} from "lucide-react";
import PublicPreview from "./PublicPreview";

const FIELD_LIBRARY = [
  { type: "text", label: "Short Text Field", icon: Type },
  { type: "number", label: "Number Field", icon: Hash },
  { type: "email", label: "Email Address Field", icon: Mail },
  { type: "dropdown", label: "Dropdown Select Field", icon: List },
  { type: "checkbox", label: "Multiple Checkboxes", icon: CheckSquare },
  { type: "date", label: "Calendar Date Field", icon: Calendar },
  { type: "rating", label: "Star Rating Field", icon: Star },
  { type: "file", label: "File Attachment Field", icon: FileUp },
];

function FormBuilder({ formId, onBack, showToast }) {
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedField, setSelectedField] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [savingFormDetails, setSavingFormDetails] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

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
    } catch (err) {
      showToast(err.message || "Failed to load form details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFormDetails = async () => {
    try {
      setSavingFormDetails(true);
      const updated = await api.updateForm(formId, {
        title: editTitle.trim(),
        description: editDesc.trim(),
      });
      setForm(updated);
      showToast("Form details saved successfully");
    } catch (err) {
      showToast(err.message || "Failed to save form details", "error");
    } finally {
      setSavingFormDetails(false);
    }
  };

  const handleAddField = async (fieldType) => {
    try {
      const defaultLabel = `New ${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Field`;
      const options = ["dropdown", "checkbox"].includes(fieldType) ? ["Option 1", "Option 2"] : null;
      
      const newField = await api.addField(formId, {
        label: defaultLabel,
        field_type: fieldType,
        required: false,
        placeholder: fieldType === "rating" ? "" : "Enter response...",
        options: options,
        order: fields.length,
      });

      const updatedFields = [...fields, newField];
      setFields(updatedFields);
      setSelectedField(newField);
      showToast(`${fieldType} field added to layout`);
    } catch (err) {
      showToast(err.message || "Failed to add field", "error");
    }
  };

  const handleUpdateFieldProperty = async (fieldId, updates) => {
    try {
      const updated = await api.updateField(fieldId, updates);
      
      // Update local state lists
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
    if (!window.confirm("Are you sure you want to remove this field?")) return;
    try {
      await api.deleteField(fieldId);
      const remaining = fields.filter((f) => f.id !== fieldId);
      setFields(remaining);
      
      if (selectedField && selectedField.id === fieldId) {
        setSelectedField(remaining.length > 0 ? remaining[0] : null);
      }
      showToast("Field removed");
    } catch (err) {
      showToast(err.message || "Failed to delete field", "error");
    }
  };

  const handleReorderField = async (index, direction) => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === fields.length - 1) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...fields];
    
    // Swap order values in local array
    const temp = reordered[index];
    reordered[index] = reordered[swapIndex];
    reordered[swapIndex] = temp;

    // Apply orders
    reordered[index].order = index;
    reordered[swapIndex].order = swapIndex;

    setFields(reordered);

    try {
      // Sync swap to backend
      await api.updateField(reordered[index].id, { order: index });
      await api.updateField(reordered[swapIndex].id, { order: swapIndex });
    } catch (err) {
      showToast("Failed to sync field order to server", "error");
    }
  };

  const handlePublishForm = async () => {
    if (fields.length === 0) {
      showToast("Cannot publish an empty form. Add fields first.", "error");
      return;
    }
    try {
      const updated = await api.publishForm(formId);
      setForm(updated);
      showToast("Form version published successfully! Public link is active.");
    } catch (err) {
      showToast(err.message || "Failed to publish form", "error");
    }
  };

  // Choice options helpers
  const handleAddOption = (field) => {
    const currentOptions = field.options || [];
    const newOptions = [...currentOptions, `Option ${currentOptions.length + 1}`];
    handleUpdateFieldProperty(field.id, { options: newOptions });
  };

  const handleUpdateOption = (field, optionIndex, value) => {
    const newOptions = [...field.options];
    newOptions[optionIndex] = value;
    handleUpdateFieldProperty(field.id, { options: newOptions });
  };

  const handleDeleteOption = (field, optionIndex) => {
    if (field.options.length <= 1) {
      showToast("Fields must have at least one option", "error");
      return;
    }
    const newOptions = field.options.filter((_, idx) => idx !== optionIndex);
    handleUpdateFieldProperty(field.id, { options: newOptions });
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
      {/* BUILDER HEADER */}
      <div className="glass-card" style={{ marginBottom: "1.5rem", padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <button className="btn btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-secondary" onClick={() => setShowPreviewModal(true)}>
              <Eye size={16} /> Live Preview
            </button>
            <button className="btn btn-primary" onClick={handlePublishForm}>
              <Globe size={16} /> Publish version
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1.5rem", marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
          <div style={{ flexGrow: 1 }}>
            <input 
              type="text" 
              className="form-control" 
              style={{ fontSize: "1.25rem", fontWeight: "700", background: "transparent", border: "none", padding: "0 0 0.25rem", borderBottom: "1px dashed var(--border-color)", borderRadius: 0 }}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Form Title"
              onBlur={handleUpdateFormDetails}
            />
            <input 
              type="text" 
              className="form-control" 
              style={{ fontSize: "0.9rem", color: "var(--text-muted)", background: "transparent", border: "none", padding: "0.25rem 0", marginTop: "0.5rem" }}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Form description..."
              onBlur={handleUpdateFormDetails}
            />
          </div>
          {savingFormDetails && (
            <div style={{ display: "flex", alignItems: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Saving...
            </div>
          )}
        </div>
      </div>

      {/* BUILDER WORKSPACE */}
      <div className="builder-layout">
        
        {/* PANEL 1: FIELD LIBRARY */}
        <div className="glass-card">
          <h3 className="panel-title">Field Library</h3>
          <p className="subtitle" style={{ fontSize: "0.8rem", marginBottom: "1rem" }}>Click to add a field element to your form layout.</p>
          <div className="field-library-list">
            {FIELD_LIBRARY.map((item) => {
              const Icon = item.icon;
              return (
                <div 
                  key={item.type} 
                  className="library-item" 
                  onClick={() => handleAddField(item.type)}
                >
                  <span className="library-item-icon"><Icon size={16} /></span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL 2: CANVAS */}
        <div className="builder-canvas">
          {fields.length === 0 ? (
            <div className="canvas-empty">
              <Settings size={40} style={{ opacity: 0.3 }} />
              <div>
                <h4>Your Canvas is Empty</h4>
                <p className="subtitle" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Select fields from the library on the left to start building.</p>
              </div>
            </div>
          ) : (
            fields.map((field, index) => {
              const libraryItem = FIELD_LIBRARY.find((item) => item.type === field.field_type) || { icon: Type };
              const FieldIcon = libraryItem.icon;
              const isSelected = selectedField && selectedField.id === field.id;

              return (
                <div 
                  key={field.id}
                  className={`canvas-field ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedField(field)}
                >
                  <div className="field-drag-handle">
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <ChevronUp 
                        size={14} 
                        style={{ cursor: index === 0 ? "not-allowed" : "pointer", opacity: index === 0 ? 0.3 : 1 }}
                        onClick={(e) => { e.stopPropagation(); handleReorderField(index, "up"); }} 
                      />
                      <ChevronDown 
                        size={14} 
                        style={{ cursor: index === fields.length - 1 ? "not-allowed" : "pointer", opacity: index === fields.length - 1 ? 0.3 : 1 }}
                        onClick={(e) => { e.stopPropagation(); handleReorderField(index, "down"); }} 
                      />
                    </div>
                  </div>

                  <div className="field-content">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        {field.label || "Untitled Field"}
                      </span>
                      {field.required && <span style={{ color: "var(--danger)" }}>*</span>}
                    </div>
                    
                    {/* Tiny field representation */}
                    <div style={{ marginTop: "0.5rem" }}>
                      {field.field_type === "dropdown" && (
                        <select className="form-control" style={{ pointerEvents: "none", opacity: 0.6 }} readOnly>
                          <option>{field.placeholder || "Select option..."}</option>
                        </select>
                      )}
                      {field.field_type === "checkbox" && (
                        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", pointerEvents: "none" }}>
                          {(field.options || []).map((o, idx) => (
                            <label key={idx} style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", opacity: 0.7 }}>
                              <input type="checkbox" readOnly /> {o}
                            </label>
                          ))}
                        </div>
                      )}
                      {field.field_type === "rating" && (
                        <div className="rating-container" style={{ pointerEvents: "none" }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={16} className="star-empty" />
                          ))}
                        </div>
                      )}
                      {["text", "number", "email", "date"].includes(field.field_type) && (
                        <input 
                          type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"} 
                          className="form-control" 
                          placeholder={field.placeholder || "Response..."}
                          style={{ pointerEvents: "none", opacity: 0.6 }}
                          readOnly 
                        />
                      )}
                      {field.field_type === "file" && (
                        <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.5rem 1rem", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", opacity: 0.6, pointerEvents: "none" }}>
                          <FileUp size={14} /> Upload attachment placeholder...
                        </div>
                      )}
                    </div>

                    <div className="field-meta">
                      <span className="field-type-badge">{field.field_type}</span>
                    </div>
                  </div>

                  <div className="field-actions">
                    <button 
                      className="btn btn-danger btn-icon" 
                      onClick={(e) => { e.stopPropagation(); handleDeleteField(field.id); }}
                      title="Delete Field"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PANEL 3: FIELD PROPERTIES */}
        <div className="glass-card">
          <h3 className="panel-title">Field Properties</h3>
          {selectedField ? (
            <div className="fade-in">
              <div className="form-group">
                <label className="form-label">Field Label</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={selectedField.label}
                  onChange={(e) => handleUpdateFieldProperty(selectedField.id, { label: e.target.value })}
                  placeholder="Label"
                />
              </div>

              {selectedField.field_type !== "rating" && (
                <div className="form-group">
                  <label className="form-label">Placeholder Text</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={selectedField.placeholder || ""}
                    onChange={(e) => handleUpdateFieldProperty(selectedField.id, { placeholder: e.target.value })}
                    placeholder="Enter placeholder..."
                  />
                </div>
              )}

              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "1.5rem 0" }}>
                <input 
                  type="checkbox" 
                  id="required-checkbox" 
                  checked={selectedField.required}
                  onChange={(e) => handleUpdateFieldProperty(selectedField.id, { required: e.target.checked })}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="required-checkbox" style={{ fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}>
                  Required Field
                </label>
              </div>

              {/* Selection options details for dropdown & checkboxes */}
              {["dropdown", "checkbox"].includes(selectedField.field_type) && (
                <div className="form-group" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginTop: "1rem" }}>
                  <label className="form-label">Configure Options</label>
                  {(selectedField.options || []).map((opt, idx) => (
                    <div key={idx} className="option-row">
                      <input 
                        type="text" 
                        className="form-control" 
                        value={opt} 
                        onChange={(e) => handleUpdateOption(selectedField, idx, e.target.value)}
                      />
                      <button 
                        type="button" 
                        className="btn btn-danger btn-icon" 
                        onClick={() => handleDeleteOption(selectedField, idx)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ width: "100%", marginTop: "0.5rem", padding: "0.5rem" }}
                    onClick={() => handleAddOption(selectedField)}
                  >
                    + Add Option
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="subtitle" style={{ textAlign: "center", padding: "2rem 0" }}>No field selected. Select a canvas field to edit properties.</p>
          )}
        </div>
      </div>

      {/* DRAFT PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="modal-overlay" style={{ display: "flex", padding: "2rem" }}>
          <div className="modal-content fade-in" style={{ maxWidth: "680px", width: "100%", overflowY: "auto", maxHeight: "90vh" }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>Live Layout Preview</h3>
              <button 
                className="btn btn-secondary btn-icon" 
                style={{ borderRadius: "50%", width: "30px", height: "30px" }}
                onClick={() => setShowPreviewModal(false)}
              >
                &times;
              </button>
            </div>
            
            <div className="preview-only-banner">
              <Eye size={16} /> This is a draft visualization. Submission is disabled.
            </div>

            {/* Render mock dynamic layout from local canvas fields state */}
            <div className="public-form-header">
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>{editTitle || "Untitled Form"}</h2>
              {editDesc && <p className="subtitle" style={{ marginTop: "0.5rem" }}>{editDesc}</p>}
            </div>

            <div className="public-form-body" style={{ marginTop: "1rem" }}>
              {fields.length === 0 ? (
                <p className="subtitle" style={{ textAlign: "center", padding: "2rem" }}>No fields to render in layout. Add fields to see them here.</p>
              ) : (
                fields.map((field) => (
                  <div key={field.id} className="form-group">
                    <label className="form-label" style={{ display: "flex", gap: "0.25rem", color: "var(--text-main)" }}>
                      {field.label} {field.required && <span style={{ color: "var(--danger)" }}>*</span>}
                    </label>
                    {field.field_type === "dropdown" && (
                      <select className="form-control">
                        <option value="">{field.placeholder || "Select option..."}</option>
                        {(field.options || []).map((o, idx) => (
                          <option key={idx} value={o}>{o}</option>
                        ))}
                      </select>
                    )}
                    {field.field_type === "checkbox" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                        {(field.options || []).map((o, idx) => (
                          <label key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", cursor: "pointer" }}>
                            <input type="checkbox" style={{ width: "16px", height: "16px" }} /> {o}
                          </label>
                        ))}
                      </div>
                    )}
                    {field.field_type === "rating" && (
                      <div className="rating-container">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={20} className="star-empty" style={{ cursor: "pointer" }} />
                        ))}
                      </div>
                    )}
                    {field.field_type === "file" && (
                      <div style={{ background: "rgba(255,255,255,0.02)", padding: "1.5rem", border: "2px dashed var(--border-color)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                        <FileUp size={24} style={{ color: "var(--primary)" }} />
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Drag and drop file or click to upload</span>
                      </div>
                    )}
                    {["text", "number", "email", "date"].includes(field.field_type) && (
                      <input 
                        type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"} 
                        className="form-control" 
                        placeholder={field.placeholder || ""}
                      />
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="modal-footer" style={{ marginTop: "2rem" }}>
              <button className="btn btn-secondary" onClick={() => setShowPreviewModal(false)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FormBuilder;
