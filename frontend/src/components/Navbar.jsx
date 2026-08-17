import React from "react";
import { Layers, LogOut } from "lucide-react";
import "../styles/navbar.css";

function Navbar({ onLogoClick }) {
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username") || "User";
  const userInitials = username.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.reload();
  };

  return (
    <nav className="navbar fade-in">
      <div className="logo-section" onClick={onLogoClick}>
        <div className="logo-badge">
          <Layers size={16} className="text-white" />
        </div>
        <div className="logo-text">
          <h1>FormFlow Studio</h1>
          <p>Low-Code Form Builder Engine</p>
        </div>
      </div>
      <div className="nav-actions">
        {token && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginRight: "0.5rem" }}>
            <div className="avatar-badge" title={username}>
              {userInitials}
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "inline-flex", gap: "0.25rem" }}>
              Hello, <strong style={{ color: "var(--text-main)" }}>{username}</strong>
            </span>
            <button 
              className="btn btn-secondary btn-icon" 
              onClick={handleLogout} 
              title="Sign Out"
              style={{ padding: "0.35rem", display: "inline-flex", alignSelf: "center", border: "1px solid var(--border-color)" }}
            >
              <LogOut size={12} style={{ color: "var(--text-muted)" }} />
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
