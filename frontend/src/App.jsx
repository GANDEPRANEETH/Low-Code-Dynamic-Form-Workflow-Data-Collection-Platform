import React, { useState, useEffect } from "react";
import FormList from "./components/FormList";
import FormBuilder from "./components/FormBuilder";
import PublicPreview from "./components/PublicPreview";
import { Layers } from "lucide-react";

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
    return { type: "dashboard" };
  }

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // If public responder URL is active, bypass standard admin headers
  if (route.type === "public") {
    return (
      <div className="fade-in">
        <PublicPreview shareSlug={route.slug} isPublicOnly={true} showToast={showToast} />
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
      <header>
        <div className="logo-container" style={{ cursor: "pointer" }} onClick={() => (window.location.hash = "")}>
          <div className="logo-icon">
            <Layers size={22} className="text-white" />
          </div>
          <div>
            <h1>FormFlow Studio</h1>
            <div className="subtitle">Low-Code Form Builder Engine</div>
          </div>
        </div>
      </header>

      <main>
        {route.type === "dashboard" && (
          <FormList 
            onEditForm={(id) => (window.location.hash = `#/builder/${id}`)} 
            showToast={showToast} 
          />
        )}
        {route.type === "builder" && (
          <FormBuilder 
            formId={route.id} 
            onBack={() => (window.location.hash = "")} 
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
