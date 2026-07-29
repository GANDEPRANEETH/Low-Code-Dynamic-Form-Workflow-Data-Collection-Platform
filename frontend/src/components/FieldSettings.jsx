import React from "react";
import { Trash2 } from "lucide-react";
import "../styles/form.css";

function FieldSettings({ field, onUpdate, showToast }) {
  if (!field) {
    return (
      <div style={{ textAlign: "center", padding: "2rem 0" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Select a field on the canvas to configure properties.
        </p>
      </div>
    );
  }

  const handlePropertyChange = (key, value) => {
    onUpdate(field.id, { [key]: value });
  };

  const handleValidationChange = (ruleKey, value) => {
    const currentRules = field.validation_rules || {};
    const updatedRules = {
      ...currentRules,
      [ruleKey]: value === "" ? null : Number(value)
    };
    onUpdate(field.id, { validation_rules: updatedRules });
  };

  // Choice Options Helpers
  const handleAddOption = () => {
    const currentOptions = field.options || [];
    const updated = [...currentOptions, `Option ${currentOptions.length + 1}`];
    handlePropertyChange("options", updated);
  };

  const handleUpdateOption = (index, value) => {
    const updated = [...field.options];
    updated[index] = value;
    handlePropertyChange("options", updated);
  };

  const handleDeleteOption = (index) => {
    if (field.options.length <= 1) {
      showToast("Fields must contain at least one option", "error");
      return;
    }
    const updated = field.options.filter((_, idx) => idx !== index);
    handlePropertyChange("options", updated);
  };

  const rules = field.validation_rules || {};

  return (
    <div className="fade-in">
      <div className="form-group">
        <label className="form-label">Field Label</label>
        <input 
          type="text" 
          className="form-control" 
          value={field.label || ""}
          onChange={(e) => handlePropertyChange("label", e.target.value)}
          placeholder="E.g., What is your age?"
        />
      </div>

      {field.field_type !== "rating" && (
        <div className="form-group">
          <label className="form-label">Placeholder Text</label>
          <input 
            type="text" 
            className="form-control" 
            value={field.placeholder || ""}
            onChange={(e) => handlePropertyChange("placeholder", e.target.value)}
            placeholder="E.g., Choose framework..."
          />
        </div>
      )}

      <div className="toggle-group" onClick={() => handlePropertyChange("required", !field.required)}>
        <input 
          type="checkbox" 
          checked={field.required || false}
          onChange={() => {}} // Controlled by outer click
          style={{ cursor: "pointer" }}
        />
        <label>Required Field</label>
      </div>

      {/* Validation settings (Min/Max values) for Number and Rating fields */}
      {(field.field_type === "number" || field.field_type === "rating") && (
        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginTop: "1rem" }}>
          <label className="form-label" style={{ marginBottom: "0.75rem" }}>Validation Constraints</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Min Value</label>
              <input 
                type="number" 
                className="form-control"
                value={rules.min_value !== undefined && rules.min_value !== null ? rules.min_value : ""}
                onChange={(e) => handleValidationChange("min_value", e.target.value)}
                placeholder="None"
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Max Value</label>
              <input 
                type="number" 
                className="form-control"
                value={rules.max_value !== undefined && rules.max_value !== null ? rules.max_value : ""}
                onChange={(e) => handleValidationChange("max_value", e.target.value)}
                placeholder="None"
              />
            </div>
          </div>
        </div>
      )}

      {/* Configure Options for choice fields */}
      {["dropdown", "checkbox"].includes(field.field_type) && (
        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginTop: "1rem" }}>
          <label className="form-label" style={{ marginBottom: "0.75rem" }}>Choices Options</label>
          {(field.options || []).map((option, idx) => (
            <div key={idx} className="option-edit-row">
              <input 
                type="text" 
                className="form-control" 
                value={option}
                onChange={(e) => handleUpdateOption(idx, e.target.value)}
              />
              <button 
                type="button" 
                className="btn btn-danger btn-icon"
                onClick={() => handleDeleteOption(idx)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ width: "100%", marginTop: "0.5rem" }}
            onClick={handleAddOption}
          >
            + Add Option
          </button>
        </div>
      )}
    </div>
  );
}

export default FieldSettings;
