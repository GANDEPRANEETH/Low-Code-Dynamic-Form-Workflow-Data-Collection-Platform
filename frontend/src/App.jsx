import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Builder from "./pages/Builder";
import Preview from "./pages/Preview";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  const [route, setRoute] = useState(getRouteFromLocation());
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleLocationChange = () => {
      setRoute(getRouteFromLocation());
    };
    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  function getRouteFromLocation() {
    const path = window.location.pathname;

    // Check one-time token link: /form/:slug/token/:token or /forms/:slug/token/:token
    if ((path.startsWith("/form/") || path.startsWith("/forms/")) && path.includes("/token/")) {
      const parts = path.split("/");
      const slug = parts[2];
      const token = parts[4];
      return { type: "public", slug, token };
    }

    if (path.startsWith("/forms/")) {
      const slug = path.split("/forms/")[1];
      return { type: "public", slug };
    }
    if (path.startsWith("/form/")) {
      const slug = path.split("/form/")[1];
      return { type: "public", slug };
    }
    if (path === "/landing") {
      return { type: "landing" };
    }
    if (path === "/login") {
      return { type: "login" };
    }
    if (path === "/register") {
      return { type: "register" };
    }

    const hash = window.location.hash;
    if (hash.startsWith("#/builder/")) {
      const id = hash.split("#/builder/")[1];
      return { type: "builder", id };
    }
    if (hash.startsWith("#/preview/")) {
      const slug = hash.split("#/preview/")[1];
      return { type: "preview", slug };
    }

    const token = localStorage.getItem("token");
    if (token) {
      return { type: "home" };
    } else {
      return { type: "landing" };
    }
  }

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleBackToDashboard = () => {
    window.location.hash = "";
    window.location.pathname = "/";
  };

  // Standalone pages
  if (route.type === "landing") {
    return <Landing />;
  }

  if (route.type === "login") {
    return (
      <div className="fade-in">
        <Login showToast={showToast} />
        {toast && (
          <div className="toast" style={{ borderLeftColor: toast.type === "error" ? "var(--danger)" : "var(--primary)" }}>
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  if (route.type === "register") {
    return (
      <div className="fade-in">
        <Register showToast={showToast} />
        {toast && (
          <div className="toast" style={{ borderLeftColor: toast.type === "error" ? "var(--danger)" : "var(--primary)" }}>
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  if (route.type === "public") {
    return (
      <div className="fade-in">
        <Preview shareSlug={route.slug} oneTimeToken={route.token} isPublicOnly={true} showToast={showToast} />
        {toast && (
          <div className="toast" style={{ borderLeftColor: toast.type === "error" ? "var(--danger)" : "var(--primary)" }}>
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-container fade-in">
      <Navbar onLogoClick={handleBackToDashboard} />

      <main style={{ padding: "0 2rem 2rem" }}>
        {route.type === "home" && (
          <Home 
            onEditForm={(id) => (window.location.hash = `#/builder/${id}`)}
            onViewPreview={(slug) => (window.location.hash = `#/preview/${slug}`)}
            showToast={showToast}
          />
        )}
        {route.type === "builder" && (
          <Builder 
            formId={route.id}
            onBack={handleBackToDashboard}
            showToast={showToast}
          />
        )}
        {route.type === "preview" && (
          <Preview 
            shareSlug={route.slug}
            isPublicOnly={false}
            onBack={handleBackToDashboard}
            showToast={showToast}
          />
        )}
      </main>

      {toast && (
        <div className="toast" style={{ borderLeftColor: toast.type === "error" ? "var(--danger)" : "var(--primary)" }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;
