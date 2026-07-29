import React from "react";
import Dashboard from "../components/Dashboard";

function Home({ onEditForm, onViewPreview, showToast }) {
  return (
    <div className="page-container">
      <Dashboard 
        onEditForm={onEditForm} 
        onViewPreview={onViewPreview} 
        showToast={showToast} 
      />
    </div>
  );
}

export default Home;
