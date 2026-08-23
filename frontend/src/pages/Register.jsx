import React, { useState } from "react";
import { api } from "../api";
import { Layers, User, Mail, Lock, Loader, ArrowLeft } from "lucide-react";
import "../styles/navbar.css";
import "../styles/form.css";
import "../styles/dashboard.css";

function Register({ showToast }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    window.location.pathname = "/landing";
  };

  const handleNavLogin = () => {
    window.location.pathname = "/login";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      showToast("All registration fields are required", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    if (password.length < 8) {
      showToast("Password must be at least 8 characters long", "error");
      return;
    }

    try {
      setLoading(true);
      const res = await api.register({
        name: name.trim(),
        email: email.trim(),
        password: password,
        confirm_password: confirmPassword
      });
      localStorage.setItem("token", res.token);
      localStorage.setItem("username", res.user.username);
      showToast("Registered account successfully!");
      
      // Redirect to Root Dashboard
      window.location.pathname = "/";
    } catch (err) {
      showToast(err.message || "Registration failed. Verify credentials.", "error");
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
        background: "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(0,0,0,0) 70%)",
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
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>Create Account</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Sign up to start building dynamic forms</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div className="form-group">
            <label className="form-label" style={{ color: "var(--text-muted)", marginBottom: "0.4rem", fontSize: "0.75rem" }}>
              Full Name
            </label>
            <div style={{ position: "relative" }}>
              <User size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input 
                type="text"
                className="form-control"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                style={{ paddingLeft: "2.5rem" }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: "var(--text-muted)", marginBottom: "0.4rem", fontSize: "0.75rem" }}>
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input 
                type="email"
                className="form-control"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ paddingLeft: "2.5rem" }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: "var(--text-muted)", marginBottom: "0.4rem", fontSize: "0.75rem" }}>
              Confirm Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input 
                type="password"
                className="form-control"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                Registering...
              </>
            ) : "Register Account"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <span onClick={handleNavLogin} style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}>
            Sign In here
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

export default Register;
