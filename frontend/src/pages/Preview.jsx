import React from "react";
import PublicPreview from "../components/PublicPreview";

function Preview({ shareSlug, isPublicOnly, onBack, showToast }) {
  return (
    <div className="page-container">
      <PublicPreview 
        shareSlug={shareSlug} 
        isPublicOnly={isPublicOnly} 
        onBack={onBack}
        showToast={showToast} 
      />
    </div>
  );
}

export default Preview;
