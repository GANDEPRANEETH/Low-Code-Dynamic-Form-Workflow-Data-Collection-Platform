import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Builder from "./pages/Builder";
import Preview from "./pages/Preview";

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
    if (path.startsWith("/forms/")) {
      const slug = path.split("/forms/")[1];
      return { type: "public", slug };
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
    return { type: "home" };
  }

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleBackToDashboard = () => {
    window.location.hash = "";
  };

  // If public responder URL is active, bypass standard admin navbar
  if (route.type === "public") {
    return (
      <div className="fade-in">
        <Preview shareSlug={route.slug} isPublicOnly={true} showToast={showToast} />
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
