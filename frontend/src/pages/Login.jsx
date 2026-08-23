import React, { useState } from "react";
import { api } from "../api";
import { Layers, Mail, Lock, Loader, ArrowLeft } from "lucide-react";
import "../styles/navbar.css";
import "../styles/form.css";
import "../styles/dashboard.css";

function Login({ showToast }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    window.location.pathname = "/landing";
  };

  const handleNavRegister = () => {
    window.location.pathname = "/register";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      showToast("Username/Email and password are required", "error");
      return;
    }

    try {
      setLoading(true);
      const res = await api.login({
        username: username.trim(),
        password: password.trim()
      });
      localStorage.setItem("token", res.token);
      localStorage.setItem("username", res.user.username);
      showToast("Signed in successfully!");
      
      // Redirect to Root Dashboard
      window.location.pathname = "/";
    } catch (err) {
      showToast(err.message || "Failed to sign in. Please verify credentials.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#050914", 
      color: "#F8FAFC", 
      fontFamily: "Inter, sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      position: "relative"
    }}>
      {/* Glow Effects */}
      <div style={{
        position: "absolute",
        width: "400px",
        height: "400px",
        background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      <div className="glass-card" style={{ 
        maxWidth: "400px", 
        width: "100%", 
        padding: "2.5rem 2rem", 
        position: "relative", 
        zIndex: 1,
        borderRadius: "16px"
      }}>
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2rem", textAlign: "center" }}>
          <div className="logo-badge" style={{ marginBottom: "0.75rem", width: "40px", height: "40px" }}>
            <Layers size={20} className="text-white" />
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>Welcome Back</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Sign in to continue to FormFlow Studio</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="form-group">
            <label className="form-label" style={{ color: "var(--text-muted)", marginBottom: "0.4rem", fontSize: "0.75rem" }}>
              Username or Email
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input 
                type="text"
                className="form-control"
                placeholder="Enter username or email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                style={{ paddingLeft: "2.5rem" }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: "var(--text-muted)", marginBottom: "0.4rem", fontSize: "0.75rem" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input 
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ paddingLeft: "2.5rem" }}
              />
            </div>
          </div>

          <button 
            type="submit"
            className="btn btn-primary" 
            style={{ width: "100%", padding: "0.7rem", marginTop: "0.5rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
                Signing In...
              </>
            ) : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Don't have an account?{" "}
          <span onClick={handleNavRegister} style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}>
            Register here
          </span>
        </div>

        <div style={{ marginTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1rem", textAlign: "center" }}>
          <button className="btn btn-secondary" style={{ padding: "0.35rem 1rem", fontSize: "0.75rem", border: "none" }} onClick={handleBack}>
            <ArrowLeft size={12} style={{ marginRight: "0.25rem" }} /> Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
