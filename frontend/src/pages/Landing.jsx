import React from "react";
import { 
  Layers, ChevronRight, Zap, CloudOff, Eye, QrCode, 
  Clock, Shield, Settings, Activity, ArrowRight, BookOpen
} from "lucide-react";
import "../styles/navbar.css";
import "../styles/dashboard.css";
import "../styles/form.css";

function Landing() {
  const handleNav = (path) => {
    window.location.pathname = path;
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#050914", 
      color: "#F8FAFC", 
      fontFamily: "Inter, sans-serif",
      position: "relative",
      overflowX: "hidden",
      paddingBottom: "4rem"
    }}>
      {/* Soft Ambient Glows */}
      <div style={{
        position: "absolute",
        top: "-10%",
        left: "20%",
        width: "600px",
        height: "600px",
        background: "radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(0, 0, 0, 0) 70%)",
        pointerEvents: "none",
        zIndex: 0
      }} />
      <div style={{
        position: "absolute",
        top: "40%",
        right: "-10%",
        width: "500px",
        height: "500px",
        background: "radial-gradient(circle, rgba(34, 211, 238, 0.08) 0%, rgba(0, 0, 0, 0) 70%)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      {/* Navigation Header */}
      <nav className="navbar fade-in" style={{ 
        position: "sticky", 
        top: 0, 
        zIndex: 100, 
        backdropFilter: "blur(20px) saturate(160%)", 
        background: "rgba(5, 9, 20, 0.75)", 
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0.75rem 2rem"
      }}>
        <div className="logo-section" style={{ cursor: "pointer" }} onClick={() => handleNav("/")}>
          <div className="logo-badge">
            <Layers size={16} className="text-white" />
          </div>
          <div className="logo-text">
            <h1 style={{ fontSize: "1.1rem" }}>FormFlow Studio</h1>
            <p>Low-Code Form Builder Engine</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <a href="#features" style={{ color: "var(--text-muted)", fontSize: "0.85rem", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.target.style.color = "#22D3EE"} onMouseLeave={(e) => e.target.style.color = "var(--text-muted)"}>Features</a>
          <a href="#how-it-works" style={{ color: "var(--text-muted)", fontSize: "0.85rem", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.target.style.color = "#22D3EE"} onMouseLeave={(e) => e.target.style.color = "var(--text-muted)"}>How It Works</a>
          <a href="#about" style={{ color: "var(--text-muted)", fontSize: "0.85rem", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.target.style.color = "#22D3EE"} onMouseLeave={(e) => e.target.style.color = "var(--text-muted)"}>About</a>
          <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.15)" }} />
          <button className="btn btn-secondary" style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", border: "1px solid rgba(255,255,255,0.08)" }} onClick={() => handleNav("/login")}>
            Log In
          </button>
          <button className="btn btn-primary" style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }} onClick={() => handleNav("/register")}>
            Register
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ maxCwd: "1200px", margin: "0 auto", padding: "0 2rem", position: "relative", zIndex: 1 }}>
        
        {/* Hero Section */}
        <section style={{ textAlign: "center", padding: "6rem 0 4rem", maxWidth: "800px", margin: "0 auto" }}>
          <div className="badge badge-published" style={{ marginBottom: "1.5rem", padding: "0.4rem 1rem", letterSpacing: "1px", fontSize: "0.75rem" }}>
            🚀 EXTENDED EDITION WITH AI & OFFLINE FILLING
          </div>
          <h1 style={{ 
            fontFamily: "var(--font-display)", 
            fontSize: "3.2rem", 
            fontWeight: 800, 
            lineHeight: 1.15,
            marginBottom: "1.5rem",
            background: "linear-gradient(135deg, #FFF 30%, #94A3B8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            Build Dynamic Forms & Workflows <span style={{ background: "linear-gradient(135deg, #22D3EE, #8B5CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>In Seconds</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", lineHeight: 1.6, marginBottom: "2.5rem" }}>
            An enterprise-grade low-code schema engine that works offline, supports AI-driven form creation, schedules form releases, generates one-time submission URLs, and visualizes logic rules.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <button className="btn btn-primary" style={{ padding: "0.75rem 2rem", fontSize: "0.95rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }} onClick={() => handleNav("/register")}>
              Create Your First Form <ArrowRight size={16} />
            </button>
            <button className="btn btn-secondary" style={{ padding: "0.75rem 2rem", fontSize: "0.95rem", border: "1px solid rgba(255,255,255,0.08)" }} onClick={() => { window.location.href = "#features"; }}>
              Explore Features
            </button>
          </div>
        </section>

        {/* Dashboard Mockup Showcase */}
        <section style={{ margin: "2rem auto 6rem", maxWidth: "1000px" }}>
          <div className="glass-card" style={{ 
            padding: "0.75rem", 
            borderRadius: "14px", 
            background: "rgba(15, 23, 42, 0.45)", 
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
          }}>
            <div style={{ display: "flex", gap: "0.4rem", padding: "0.5rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.15)", borderTopLeftRadius: "8px", borderTopRightRadius: "8px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#EF4444" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#F59E0B" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10B981" }} />
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "1.5rem" }}>https://formflow.studio/dashboard</span>
            </div>
            <div style={{ 
              height: "350px", 
              background: "radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0.3) 100%)",
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              flexDirection: "column",
              gap: "1rem"
            }}>
              <Layers size={48} style={{ color: "#6366F1" }} />
              <div style={{ textAlign: "center" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "0.25rem" }}>Interactive Flow Builder Active</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Drag-and-drop elements and define conditional branching rules</p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span className="badge badge-published">Conditional rules</span>
                <span className="badge badge-published" style={{ background: "rgba(34, 211, 238, 0.15)", color: "#22D3EE" }}>AI Engine</span>
                <span className="badge badge-published" style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8B5CF6" }}>Offline cache</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" style={{ padding: "4rem 0 2rem" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Engineered For Modern Collection</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Everything you need to gather, validate, and analyze feedback.</p>
          </div>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
            gap: "2rem" 
          }}>
            {/* Feature 1 */}
            <div className="glass-card" style={{ padding: "2rem", transition: "transform 0.25s, border-color 0.25s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6366F1"; e.currentTarget.style.transform = "translateY(-4px)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ color: "#6366F1", marginBottom: "1rem" }}><Zap size={24} /></div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>✨ AI Form Generation</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>Simply prompt the AI with your requirements (e.g. "college registration form") to generate fully structured form drafts in seconds.</p>
            </div>
            {/* Feature 2 */}
            <div className="glass-card" style={{ padding: "2rem", transition: "transform 0.25s, border-color 0.25s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#22D3EE"; e.currentTarget.style.transform = "translateY(-4px)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ color: "#22D3EE", marginBottom: "1rem" }}><CloudOff size={24} /></div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>🌐 Offline Form Filling</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>Public responders can enter, review, and save answers even without internet. Submissions sync automatically when the connection returns.</p>
            </div>
            {/* Feature 3 */}
            <div className="glass-card" style={{ padding: "2rem", transition: "transform 0.25s, border-color 0.25s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B5CF6"; e.currentTarget.style.transform = "translateY(-4px)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ color: "#8B5CF6", marginBottom: "1rem" }}><Eye size={24} /></div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>👁️ Preview & Review Step</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>Provides an elegant summary of answers to let users inspect and edit their inputs before locking in final submissions.</p>
            </div>
            {/* Feature 4 */}
            <div className="glass-card" style={{ padding: "2rem", transition: "transform 0.25s, border-color 0.25s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#10B981"; e.currentTarget.style.transform = "translateY(-4px)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ color: "#10B981", marginBottom: "1rem" }}><Shield size={24} /></div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>🔗 One-Time Submission Links</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>Generate secure, single-use public submission links. The token automatically expires and rejects subsequent submissions upon use.</p>
            </div>
            {/* Feature 5 */}
            <div className="glass-card" style={{ padding: "2rem", transition: "transform 0.25s, border-color 0.25s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#EF4444"; e.currentTarget.style.transform = "translateY(-4px)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ color: "#EF4444", marginBottom: "1rem" }}><Clock size={24} /></div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>📅 Release & Expiry Scheduling</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>Publish forms automatically at scheduled times and configure strict end-dates or submission count caps enforced natively by the backend.</p>
            </div>
            {/* Feature 6 */}
            <div className="glass-card" style={{ padding: "2rem", transition: "transform 0.25s, border-color 0.25s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F59E0B"; e.currentTarget.style.transform = "translateY(-4px)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ color: "#F59E0B", marginBottom: "1rem" }}><QrCode size={24} /></div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>📱 Shareable Links & QR Codes</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>Generate QR codes dynamically for every single published form version, supporting instant link copies, downloads, and mobile fillings.</p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" style={{ padding: "5rem 0 2rem" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>How FormFlow Works</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>A unified process from design ideas to rich data collection.</p>
          </div>
          
          <div style={{ display: "flex", gap: "2rem", flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
            <div className="glass-card" style={{ flex: "1 1 240px", padding: "1.5rem", textAlign: "center", border: "1px dashed rgba(255,255,255,0.15)" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#6366F1", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: "0.9rem", fontWeight: "700" }}>1</div>
              <h4 style={{ fontWeight: "700", marginBottom: "0.5rem" }}>Describe Idea</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Prompt the AI assistant or build it manually using structural form controls.</p>
            </div>
            <div className="glass-card" style={{ flex: "1 1 240px", padding: "1.5rem", textAlign: "center", border: "1px dashed rgba(255,255,255,0.15)" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#22D3EE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: "0.9rem", fontWeight: "700" }}>2</div>
              <h4 style={{ fontWeight: "700", marginBottom: "0.5rem" }}>Apply Rules & Release</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Add conditional logic, set scheduling, and generate sharing URLs/QR Codes.</p>
            </div>
            <div className="glass-card" style={{ flex: "1 1 240px", padding: "1.5rem", textAlign: "center", border: "1px dashed rgba(255,255,255,0.15)" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: "0.9rem", fontWeight: "700" }}>3</div>
              <h4 style={{ fontWeight: "700", marginBottom: "0.5rem" }}>Collect & Sync</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Collect responses online or offline. Review responses before committing.</p>
            </div>
            <div className="glass-card" style={{ flex: "1 1 240px", padding: "1.5rem", textAlign: "center", border: "1px dashed rgba(255,255,255,0.15)" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: "0.9rem", fontWeight: "700" }}>4</div>
              <h4 style={{ fontWeight: "700", marginBottom: "0.5rem" }}>Analyze Analytics</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Track submission logs and data analytics with charts in your admin dashboard.</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="about" style={{ padding: "4rem 0 2rem", textAlign: "center" }}>
          <div className="glass-card" style={{ 
            padding: "4rem 2rem", 
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(15, 23, 42, 0.3) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            maxWidth: "800px",
            margin: "0 auto"
          }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" }}>Ready to Streamline Your Workflows?</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "2.5rem", maxWidth: "500px", margin: "0 auto 2.5rem" }}>
              Join the low-code dynamic form builder movement. Start creating forms and collecting data securely today.
            </p>
            <button className="btn btn-primary" style={{ padding: "0.75rem 2.5rem", fontSize: "1rem" }} onClick={() => handleNav("/register")}>
              Get Started For Free
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ 
        marginTop: "4rem", 
        borderTop: "1px solid rgba(255,255,255,0.05)", 
        paddingTop: "2rem",
        textAlign: "center"
      }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Layers size={14} style={{ color: "#6366F1" }} />
          <span style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "1px" }}>FORMFLOW STUDIO</span>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>&copy; 2026 FormFlow Studio. Low-Code Form Builder Engine. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Landing;
