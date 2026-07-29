import React from "react";
import FormBuilder from "../components/FormBuilder";

function Builder({ formId, onBack, showToast }) {
  return (
    <div className="page-container">
      <FormBuilder 
        formId={formId} 
        onBack={onBack} 
        showToast={showToast} 
      />
    </div>
  );
}

export default Builder;
