import React from "react";
import { Layers } from "lucide-react";
import "../styles/navbar.css";

function Navbar({ onLogoClick }) {
  return (
    <nav className="navbar fade-in">
      <div className="logo-section" onClick={onLogoClick}>
        <div className="logo-badge">
          <Layers size={18} className="text-white" />
        </div>
        <div className="logo-text">
          <h1>FormFlow Studio</h1>
          <p>Low-Code Form Builder Engine</p>
        </div>
      </div>
      <div className="nav-actions">
        <div className="indicator">
          <span className="indicator-dot"></span>
          <span>Engine Active</span>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
