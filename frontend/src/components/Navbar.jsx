import React from "react";
import { Layers, LogOut } from "lucide-react";
import "../styles/navbar.css";

function Navbar({ onLogoClick }) {
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.reload();
  };

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
        {token && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginRight: "1rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Hello, <strong>{username}</strong>
            </span>
            <button 
              className="btn btn-secondary btn-icon" 
              onClick={handleLogout} 
              title="Sign Out"
              style={{ padding: "0.4rem" }}
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
        <div className="indicator">
          <span className="indicator-dot"></span>
          <span>Engine Active</span>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
