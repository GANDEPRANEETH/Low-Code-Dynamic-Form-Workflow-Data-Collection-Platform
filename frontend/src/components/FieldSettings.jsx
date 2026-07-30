import React, { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import "../styles/form.css";

function FieldSettings({ field, onUpdate, showToast }) {
  const [localLabel, setLocalLabel] = useState("");
  const [localPlaceholder, setLocalPlaceholder] = useState("");
  const [localMin, setLocalMin] = useState("");
  const [localMax, setLocalMax] = useState("");
  const [localOptions, setLocalOptions] = useState([]);

  // Sync inputs only when the active field ID changes
  useEffect(() => {
    if (field) {
      setLocalLabel(field.label || "");
      setLocalPlaceholder(field.placeholder || "");
      const rules = field.validation_rules || {};
      setLocalMin(rules.min_value !== undefined && rules.min_value !== null ? rules.min_value : "");
      setLocalMax(rules.max_value !== undefined && rules.max_value !== null ? rules.max_value : "");
      setLocalOptions(field.options || []);
    }
  }, [field?.id]);

  if (!field) {
    return (
      <div style={{ textAlign: "center", padding: "2rem 0" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Select a field on the canvas to configure properties.
        </p>
      </div>
    );
  }

  // Save textual properties on blur to avoid network lag while typing
  const handleLabelBlur = () => {
    if (localLabel.trim() !== (field.label || "")) {
      onUpdate(field.id, { label: localLabel.trim() });
    }
  };

  const handlePlaceholderBlur = () => {
    if (localPlaceholder !== (field.placeholder || "")) {
      onUpdate(field.id, { placeholder: localPlaceholder });
    }
  };

  const handleValidationBlur = () => {
    const currentRules = field.validation_rules || {};
    const minVal = localMin === "" ? null : Number(localMin);
    const maxVal = localMax === "" ? null : Number(localMax);

    if (minVal !== currentRules.min_value || maxVal !== currentRules.max_value) {
      onUpdate(field.id, {
        validation_rules: {
          ...currentRules,
          min_value: minVal,
          max_value: maxVal
        }
      });
    }
  };

  // Choice Options updates
  const handleLocalOptionChange = (index, value) => {
    const updated = [...localOptions];
    updated[index] = value;
    setLocalOptions(updated);
  };

  const handleOptionBlur = () => {
    onUpdate(field.id, { options: localOptions });
  };

  const handleAddOption = () => {
    const updated = [...localOptions, `Option ${localOptions.length + 1}`];
    setLocalOptions(updated);
    onUpdate(field.id, { options: updated });
  };

  const handleDeleteOption = (index) => {
    if (localOptions.length <= 1) {
      showToast("Fields must contain at least one option", "error");
      return;
    }
    const updated = localOptions.filter((_, idx) => idx !== index);
    setLocalOptions(updated);
    onUpdate(field.id, { options: updated });
  };

  return (
    <div className="fade-in">
      <div className="form-group">
        <label className="form-label">Field Label</label>
        <input 
          type="text" 
          className="form-control" 
          value={localLabel}
          onChange={(e) => setLocalLabel(e.target.value)}
          onBlur={handleLabelBlur}
          placeholder="E.g., What is your age?"
        />
      </div>

      {field.field_type !== "rating" && (
        <div className="form-group">
          <label className="form-label">Placeholder Text</label>
          <input 
            type="text" 
            className="form-control" 
            value={localPlaceholder}
            onChange={(e) => setLocalPlaceholder(e.target.value)}
            onBlur={handlePlaceholderBlur}
            placeholder="E.g., Choose framework..."
          />
        </div>
      )}

      {/* Immediate save on checkbox click since there's no typing layout */}
      <div className="toggle-group" onClick={() => onUpdate(field.id, { required: !field.required })}>
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
                value={localMin}
                onChange={(e) => setLocalMin(e.target.value)}
                onBlur={handleValidationBlur}
                placeholder="None"
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Max Value</label>
              <input 
                type="number" 
                className="form-control"
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                onBlur={handleValidationBlur}
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
          {localOptions.map((option, idx) => (
            <div key={idx} className="option-edit-row">
              <input 
                type="text" 
                className="form-control" 
                value={option}
                onChange={(e) => handleLocalOptionChange(idx, e.target.value)}
                onBlur={handleOptionBlur}
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
