import React from "react";
import PublicPreview from "../components/PublicPreview";

function Preview({ shareSlug, oneTimeToken, isPublicOnly, onBack, showToast }) {
  return (
    <div className="page-container">
      <PublicPreview 
        shareSlug={shareSlug} 
        oneTimeToken={oneTimeToken} 
        isPublicOnly={isPublicOnly} 
        onBack={onBack}
        showToast={showToast} 
      />
    </div>
  );
}

export default Preview;
