import React from "react";
import { Trash2, ChevronUp, ChevronDown, Star, FileUp } from "lucide-react";

function FieldCard({ field, index, totalFields, isSelected, onSelect, onReorder, onDelete }) {
  const getFieldRepresentation = () => {
    switch (field.field_type) {
      case "dropdown":
        return (
          <select className="form-control" style={{ pointerEvents: "none", opacity: 0.6 }} readOnly>
            <option>{field.placeholder || "Select option..."}</option>
          </select>
        );
      case "checkbox":
        return (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", pointerEvents: "none" }}>
            {(field.options || []).map((o, idx) => (
              <label key={idx} className="checkbox-option" style={{ opacity: 0.7 }}>
                <input type="checkbox" readOnly /> <span>{o}</span>
              </label>
            ))}
          </div>
        );
      case "rating":
        return (
          <div className="rating-container" style={{ pointerEvents: "none" }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={15} className="star-empty" />
            ))}
          </div>
        );
      case "file":
        return (
          <div className="file-dropzone" style={{ pointerEvents: "none", opacity: 0.6, padding: "0.5rem 1rem" }}>
            <FileUp size={14} className="file-dropzone-icon" />
            <span className="file-dropzone-text">Upload file attachment...</span>
          </div>
        );
      default:
        // text, number, email, date
        return (
          <input 
            type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"} 
            className="form-control" 
            placeholder={field.placeholder || "Response input..."}
            style={{ pointerEvents: "none", opacity: 0.6 }}
            readOnly 
          />
        );
    }
  };

  return (
    <div 
      className={`field-card ${isSelected ? "selected" : ""}`}
      onClick={onSelect}
    >
      <div className="drag-controls">
        <button 
          className="drag-btn" 
          disabled={index === 0} 
          onClick={(e) => { e.stopPropagation(); onReorder(index, "up"); }}
          title="Move Up"
        >
          <ChevronUp size={14} />
        </button>
        <button 
          className="drag-btn" 
          disabled={index === totalFields - 1} 
          onClick={(e) => { e.stopPropagation(); onReorder(index, "down"); }}
          title="Move Down"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="field-card-body">
        <div className="field-card-title">
          <span>{field.label || "Untitled Field"}</span>
          {field.required && <span style={{ color: "var(--danger)" }}>*</span>}
        </div>

        <div className="field-card-preview">
          {getFieldRepresentation()}
        </div>

        <div className="field-card-meta">
          <span className="type-tag">{field.field_type === "file" ? "File Upload" : field.field_type}</span>
        </div>
      </div>

      <div>
        <button 
          className="btn btn-danger btn-icon"
          onClick={(e) => { e.stopPropagation(); onDelete(field.id); }}
          title="Remove Field"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default FieldCard;
