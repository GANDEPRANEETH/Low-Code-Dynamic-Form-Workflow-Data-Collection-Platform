import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  Plus, Edit2, Trash2, Globe, Archive, Copy, ExternalLink, Loader, 
  ServerCrash, MessageSquare, ArrowLeft, Download, Eye, Star, FileUp,
  Layers, Settings, ShieldAlert, BarChart3, Clock, CheckCircle, QrCode
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, Legend, BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import QRCode from "qrcode";
import "../styles/dashboard.css";
import "../styles/form.css";

function Dashboard({ onEditForm, onViewPreview, showToast }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Responses Dashboard State
  const [viewingResponsesFor, setViewingResponsesFor] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);

  // Milestone 3 Dashboard Tabs & Filters States
  const [activeTab, setActiveTab] = useState("responses"); // responses, analytics, rules, settings, audit
  const [selectedResponseIds, setSelectedResponseIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Response Browser Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterFieldId, setFilterFieldId] = useState("");
  const [filterFieldValue, setFilterFieldValue] = useState("");
  
  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  
  // Rules State
  const [rules, setRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  
  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  
  // Retention Setting
  const [retentionDays, setRetentionDays] = useState("");
  const [savingRetention, setSavingRetention] = useState(false);

  // Create Form Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState("");
  const [newFormDesc, setNewFormDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // AI Modal States
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);

  // Settings & Sharing States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedSettingsForm, setSelectedSettingsForm] = useState(null);
  const [settingsTab, setSettingsTab] = useState("sharing"); // sharing, schedule, onetime
  const [publishAt, setPublishAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxSubmissions, setMaxSubmissions] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // One-time Token States
  const [oneTimeTokens, setOneTimeTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [tokenExpiryDays, setTokenExpiryDays] = useState("");
  const [generatingToken, setGeneratingToken] = useState(false);
  const [selectedTokenQR, setSelectedTokenQR] = useState(null);
  const [tokenQRUrl, setTokenQRUrl] = useState("");

  // Generate form with AI
  const handleAIGenerate = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) {
      showToast("Please describe the form you want to generate.", "error");
      return;
    }

    try {
      setGeneratingAI(true);
      const newForm = await api.aiGenerate(aiPrompt);
      setForms([newForm, ...forms]);
      showToast("Form draft generated with AI!");
      setShowAIModal(false);
      setAiPrompt("");
      onEditForm(newForm.id);
    } catch (err) {
      showToast(err.message || "AI Generation failed", "error");
    } finally {
      setGeneratingAI(false);
    }
  };

  // Open settings & sharing modal
  const handleOpenSettingsModal = (form) => {
    setSelectedSettingsForm(form);
    setPublishAt(toLocalDateTimeString(form.publish_at));
    setExpiresAt(toLocalDateTimeString(form.expires_at));
    setMaxSubmissions(form.max_submissions || "");
    setSettingsTab("sharing");
    setOneTimeTokens([]);
    setSelectedTokenQR(null);
    setTokenQRUrl("");
    setShowSettingsModal(true);
    
    const url = `${window.location.origin}/form/${form.share_slug}`;
    QRCode.toDataURL(url, { width: 180, margin: 2 })
      .then(setQrCodeUrl)
      .catch(err => console.error("QR Code error:", err));

    fetchOneTimeTokens(form.id);
  };

  const fetchOneTimeTokens = async (formId) => {
    try {
      setLoadingTokens(true);
      const tokens = await api.getOneTimeTokens(formId);
      setOneTimeTokens(tokens);
    } catch (err) {
      console.error("Failed to load tokens:", err);
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleGenerateOneTimeLink = async () => {
    if (!selectedSettingsForm) return;
    try {
      setGeneratingToken(true);
      const expiresDays = tokenExpiryDays ? parseInt(tokenExpiryDays) : null;
      await api.createOneTimeToken(selectedSettingsForm.id, expiresDays);
      showToast("One-time submission token generated successfully!");
      setTokenExpiryDays("");
      fetchOneTimeTokens(selectedSettingsForm.id);
    } catch (err) {
      showToast(err.message || "Failed to generate token", "error");
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleRevokeToken = async (tokenVal) => {
    if (!selectedSettingsForm) return;
    try {
      await api.revokeOneTimeToken(selectedSettingsForm.id, tokenVal);
      showToast("One-time submission link revoked.");
      fetchOneTimeTokens(selectedSettingsForm.id);
      if (selectedTokenQR === tokenVal) {
        setSelectedTokenQR(null);
        setTokenQRUrl("");
      }
    } catch (err) {
      showToast(err.message || "Failed to revoke token", "error");
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!selectedSettingsForm) return;

    try {
      setSavingSettings(true);
      const updated = await api.updateForm(selectedSettingsForm.id, {
        publish_at: toIsoString(publishAt),
        expires_at: toIsoString(expiresAt),
        max_submissions: maxSubmissions ? parseInt(maxSubmissions) : null
      });

      setForms(forms.map(f => f.id === updated.id ? updated : f));
      setSelectedSettingsForm(updated);
      showToast("Form release and expiration settings saved successfully.");
    } catch (err) {
      showToast(err.message || "Failed to save settings", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const toIsoString = (localDateTimeStr) => {
    if (!localDateTimeStr) return null;
    return new Date(localDateTimeStr).toISOString();
  };

  const toLocalDateTimeString = (isoDateTimeStr) => {
    if (!isoDateTimeStr) return "";
    const d = new Date(isoDateTimeStr);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleViewTokenQR = (tokenVal, slug) => {
    if (selectedTokenQR === tokenVal) {
      setSelectedTokenQR(null);
      setTokenQRUrl("");
    } else {
      const url = `${window.location.origin}/form/${slug}/token/${tokenVal}`;
      QRCode.toDataURL(url, { width: 180, margin: 2 })
        .then(qrUrl => {
          setSelectedTokenQR(tokenVal);
          setTokenQRUrl(qrUrl);
        })
        .catch(err => console.error(err));
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  // Sync data whenever viewingResponsesFor or filter states change
  useEffect(() => {
    if (viewingResponsesFor) {
      fetchResponsesWithFilters(1);
      fetchAnalytics();
      fetchRules();
      fetchAuditLogs();
      setRetentionDays(viewingResponsesFor.retention_days || "");
    } else {
      setSearch("");
      setStatusFilter("");
      setStartDate("");
      setEndDate("");
      setFilterFieldId("");
      setFilterFieldValue("");
      setSelectedResponseIds([]);
      setActiveTab("responses");
    }
  }, [viewingResponsesFor, search, statusFilter, startDate, endDate, filterFieldId, filterFieldValue]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const data = await api.getForms();
      setForms(data);
    } catch (err) {
      showToast(err.message || "Failed to load forms from engine", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchResponsesWithFilters = async (page = 1) => {
    if (!viewingResponsesFor) return;
    try {
      setLoadingResponses(true);
      const params = {
        paginate: "true",
        page,
        page_size: 10,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (filterFieldId && filterFieldValue.trim()) {
        params[`field_${filterFieldId}`] = filterFieldValue.trim();
      }
      
      const data = await api.getResponses(viewingResponsesFor.id, params);
      setResponses(data.results || []);
      setTotalCount(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / 10));
      setCurrentPage(page);
    } catch (err) {
      showToast(err.message || "Failed to load responses", "error");
    } finally {
      setLoadingResponses(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!viewingResponsesFor) return;
    try {
      setLoadingAnalytics(true);
      const data = await api.getAnalytics(viewingResponsesFor.id);
      setAnalytics(data);
    } catch (err) {
      showToast(err.message || "Failed to load analytics", "error");
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchRules = async () => {
    if (!viewingResponsesFor) return;
    try {
      setLoadingRules(true);
      const data = await api.getRules(viewingResponsesFor.id);
      setRules(data);
    } catch (err) {
      showToast(err.message || "Failed to load rules", "error");
    } finally {
      setLoadingRules(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const data = await api.getAuditLogs();
      setAuditLogs(data);
    } catch (err) {
      showToast(err.message || "Failed to load audit logs", "error");
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleCreateForm = async (e) => {
    e.preventDefault();
    if (!newFormTitle.trim()) {
      showToast("Form title is required", "error");
      return;
    }
    try {
      setSubmitting(true);
      const created = await api.createForm({
        title: newFormTitle.trim(),
        description: newFormDesc.trim(),
      });
      setForms([created, ...forms]);
      setNewFormTitle("");
      setNewFormDesc("");
      setShowCreateModal(false);
      showToast("Form draft created successfully!");
      onEditForm(created.id);
    } catch (err) {
      showToast(err.message || "Failed to create form draft", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteForm = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await api.deleteForm(id);
      setForms(forms.filter((f) => f.id !== id));
      showToast("Form deleted successfully");
    } catch (err) {
      showToast(err.message || "Failed to delete form", "error");
    }
  };

  const handlePublishForm = async (id) => {
    try {
      const updated = await api.publishForm(id);
      setForms(forms.map((f) => (f.id === id ? updated : f)));
      showToast("Form version published successfully! Public link is active.");
    } catch (err) {
      showToast(err.message || "Failed to publish form. Make sure to add fields first.", "error");
    }
  };

  const handleArchiveForm = async (id) => {
    try {
      const updated = await api.archiveForm(id);
      setForms(forms.map((f) => (f.id === id ? updated : f)));
      showToast("Form archived. Public URL is now deactivated.");
    } catch (err) {
      showToast(err.message || "Failed to archive form", "error");
    }
  };

  const copyShareLink = (shareSlug) => {
    const base = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
    const link = `${base}/forms/${shareSlug}`;
    navigator.clipboard.writeText(link)
      .then(() => showToast("Public URL copied to clipboard!"))
      .catch(() => showToast("Failed to copy URL", "error"));
  };

  const handleDuplicateForm = async (formId) => {
    try {
      setLoading(true);
      const duplicated = await api.duplicateForm(formId);
      setForms([duplicated, ...forms]);
      showToast(`Form duplicated as draft: "${duplicated.title}"`);
    } catch (err) {
      showToast(err.message || "Failed to duplicate form", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedResponseIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete the ${selectedResponseIds.length} selected responses?`)) return;
    try {
      setLoadingResponses(true);
      const result = await api.bulkDeleteResponses(viewingResponsesFor.id, selectedResponseIds);
      showToast(`${result.deleted_count} responses deleted successfully.`);
      setSelectedResponseIds([]);
      fetchResponsesWithFilters(1);
      fetchAnalytics();
      fetchAuditLogs();
    } catch (err) {
      showToast(err.message || "Failed to bulk delete responses", "error");
    } finally {
      setLoadingResponses(false);
    }
  };

  const handleSaveRetention = async (e) => {
    e.preventDefault();
    try {
      setSavingRetention(true);
      const val = retentionDays === "" ? "" : parseInt(retentionDays);
      const res = await api.applyRetentionPolicy(viewingResponsesFor.id, val);
      showToast(res.message || "Retention policy updated and applied.");
      fetchForms();
      fetchResponsesWithFilters(1);
      fetchAnalytics();
      fetchAuditLogs();
    } catch (err) {
      showToast(err.message || "Failed to update retention policy", "error");
    } finally {
      setSavingRetention(false);
    }
  };

  const handleViewResponses = async (formObj) => {
    setViewingResponsesFor(formObj);
    setSelectedResponse(null);
  };



  const getFieldLabel = (fieldId) => {
    if (!viewingResponsesFor) return `Field #${fieldId}`;
    const f = viewingResponsesFor.fields?.find(x => String(x.id) === String(fieldId));
    return f ? f.label : `Field #${fieldId}`;
  };

  const getFieldType = (fieldId) => {
    if (!viewingResponsesFor) return "text";
    const f = viewingResponsesFor.fields?.find(x => String(x.id) === String(fieldId));
    return f ? f.field_type : "text";
  };

  // Helper to format values in the submissions view
  const renderResponseValue = (fieldId, val) => {
    const type = getFieldType(fieldId);
    if (type === "rating") {
      const starsCount = Number(val) || 0;
      return "⭐".repeat(starsCount) || "No Rating";
    }
    if (type === "file" && val && (val.startsWith("http://") || val.startsWith("https://"))) {
      const displayFilename = val.split("/").pop().replace(/^[a-f0-9]{32}_/, "");
      return (
        <a 
          href={val} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ color: "var(--cyan)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
          onClick={(e) => e.stopPropagation()} 
        >
          <FileUp size={12} /> {displayFilename}
        </a>
      );
    }
    if (Array.isArray(val)) {
      return val.join(", ");
    }
    return String(val || "N/A");
  };

  const getFilterParams = () => {
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (statusFilter) params.status = statusFilter;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (filterFieldId && filterFieldValue.trim()) {
      params[`field_${filterFieldId}`] = filterFieldValue.trim();
    }
    return params;
  };

  const handleExportCSV = async (formId) => {
    try {
      const token = localStorage.getItem("token");
      const headers = {};
      if (token) {
        headers["Authorization"] = `Token ${token}`;
      }
      const params = getFilterParams();
      const csvUrl = api.exportCSVUrl(formId, params);
      const response = await fetch(csvUrl, { headers });
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You do not have permission to view responses for this form.");
        }
        throw new Error("Failed to export responses.");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `form_${formId}_responses.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      showToast("CSV Export downloaded successfully");
    } catch (err) {
      showToast(err.message || "Failed to export CSV", "error");
    }
  };

  const handleExportJSON = async (formId) => {
    try {
      const token = localStorage.getItem("token");
      const headers = {};
      if (token) {
        headers["Authorization"] = `Token ${token}`;
      }
      const params = getFilterParams();
      const jsonUrl = api.exportJSONUrl(formId, params);
      const response = await fetch(jsonUrl, { headers });
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You do not have permission to view responses for this form.");
        }
        throw new Error("Failed to export responses.");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `form_${formId}_responses.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      showToast("JSON Export downloaded successfully");
    } catch (err) {
      showToast(err.message || "Failed to export JSON", "error");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px" }}>
        <Loader size={32} className="animate-spin text-indigo-500" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  // --- RENDERING SUBMISSIONS & ADMIN DASHBOARD SUBVIEW ---
  if (viewingResponsesFor) {
    return (
      <div className="fade-in">
        {/* Navigation / Header */}
        <div className="dashboard-header" style={{ marginBottom: "1.25rem" }}>
          <div className="dashboard-title">
            <button 
              className="btn btn-secondary" 
              style={{ padding: "0.4rem 0.8rem", marginBottom: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
              onClick={() => setViewingResponsesFor(null)}
            >
              <ArrowLeft size={14} /> Back to Forms
            </button>
            <h2>Admin Console: "{viewingResponsesFor.title}"</h2>
            <p>Monitor analytics, export data, configure retention, and browse submission databases</p>
          </div>
        </div>

        {/* Floating Admin Tabs Bar */}
        <div className="glass-card" style={{ padding: "0.4rem", display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
          <button 
            className={`btn ${activeTab === "responses" ? "btn-primary" : "btn-secondary"}`} 
            style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}
            onClick={() => setActiveTab("responses")}
          >
            📝 Responses Browser
          </button>
          <button 
            className={`btn ${activeTab === "analytics" ? "btn-primary" : "btn-secondary"}`} 
            style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}
            onClick={() => setActiveTab("analytics")}
          >
            📊 Real-time Analytics
          </button>
          <button 
            className={`btn ${activeTab === "rules" ? "btn-primary" : "btn-secondary"}`} 
            style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}
            onClick={() => setActiveTab("rules")}
          >
            🔀 Conditional Rules Flow
          </button>
          <button 
            className={`btn ${activeTab === "settings" ? "btn-primary" : "btn-secondary"}`} 
            style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}
            onClick={() => setActiveTab("settings")}
          >
            ⚙️ Data Retention
          </button>
          <button 
            className={`btn ${activeTab === "audit" ? "btn-primary" : "btn-secondary"}`} 
            style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}
            onClick={() => setActiveTab("audit")}
          >
            📋 System Audit Logs
          </button>
        </div>

        {/* TAB 1: RESPONSES BROWSER */}
        {activeTab === "responses" && (
          <div className="fade-in">
            {/* Filter controls panel */}
            <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                <div>
                  <label className="form-label" style={{ fontSize: "0.7rem" }}>Search submissions</label>
                  <input 
                    type="text" 
                    placeholder="Search response value..." 
                    className="form-control" 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.7rem" }}>Status</label>
                  <select 
                    className="form-control" 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="Completed">Completed Only</option>
                    <option value="Started">Incomplete / Started</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.7rem" }}>From Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.7rem" }}>To Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                  />
                </div>
              </div>

              {/* Advanced Field-Value Filter */}
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ minWidth: "200px" }}>
                  <label className="form-label" style={{ fontSize: "0.7rem" }}>Filter by Specific Field</label>
                  <select 
                    className="form-control" 
                    value={filterFieldId} 
                    onChange={e => {
                      setFilterFieldId(e.target.value);
                      setFilterFieldValue("");
                    }}
                  >
                    <option value="">Choose field...</option>
                    {viewingResponsesFor.fields?.map(f => (
                      <option key={f.id} value={f.id}>{f.label} ({f.field_type})</option>
                    ))}
                  </select>
                </div>
                <div style={{ flexGrow: 1, minWidth: "200px" }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter search value to filter field..." 
                    value={filterFieldValue} 
                    onChange={e => setFilterFieldValue(e.target.value)}
                    disabled={!filterFieldId}
                  />
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: "0.55rem 1rem", fontSize: "0.8rem" }}
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("");
                      setStartDate("");
                      setEndDate("");
                      setFilterFieldId("");
                      setFilterFieldValue("");
                      setSelectedResponseIds([]);
                    }}
                  >
                    Reset Filters
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: "0.55rem 1rem", fontSize: "0.8rem" }}
                    onClick={() => handleExportCSV(viewingResponsesFor.id)}
                  >
                    <Download size={14} /> Export CSV
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: "0.55rem 1rem", fontSize: "0.8rem" }}
                    onClick={() => handleExportJSON(viewingResponsesFor.id)}
                  >
                    <Download size={14} /> Export JSON
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk actions bar */}
            {selectedResponseIds.length > 0 && (
              <div className="glass-card fade-in" style={{ padding: "0.75rem 1.25rem", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderColor: "rgba(239, 68, 68, 0.35)", background: "rgba(239, 68, 68, 0.05)" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                  Selected {selectedResponseIds.length} response(s) for bulk action
                </span>
                <button className="btn btn-danger" onClick={handleBulkDelete} style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                  <Trash2 size={13} /> Delete Selected Responses
                </button>
              </div>
            )}

            {/* Response table & details split screen */}
            {loadingResponses ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
                <Loader size={24} className="animate-spin text-indigo-500" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : responses.length === 0 ? (
              <div className="empty-dashboard" style={{ padding: "3rem 1.5rem" }}>
                <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
                <h3>No responses match search filters</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Adjust your search keyword or selected date/field configurations.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: selectedResponse ? "1.4fr 1fr" : "1fr", gap: "1.5rem", alignItems: "start" }}>
                
                {/* SUBMISSIONS LIST TABLE */}
                <div className="glass-card" style={{ padding: "0", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <th style={{ padding: "0.85rem 0.75rem", width: "40px", textAlign: "center" }}>
                          <input 
                            type="checkbox" 
                            checked={responses.length > 0 && selectedResponseIds.length === responses.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedResponseIds(responses.map(r => r.id));
                              } else {
                                setSelectedResponseIds([]);
                              }
                            }}
                          />
                        </th>
                        <th style={{ padding: "0.85rem 0.75rem", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Response ID</th>
                        <th style={{ padding: "0.85rem 0.75rem", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Submitter Name</th>
                        <th style={{ padding: "0.85rem 0.75rem", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Email</th>
                        <th style={{ padding: "0.85rem 0.75rem", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Status</th>
                        <th style={{ padding: "0.85rem 0.75rem", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Submitted Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {responses.map((resp) => {
                        const isSelected = selectedResponse && selectedResponse.id === resp.id;
                        return (
                          <tr 
                            key={resp.id} 
                            style={{ 
                              borderBottom: "1px solid var(--border-color)", 
                              cursor: "pointer",
                              backgroundColor: isSelected ? "rgba(34, 211, 238, 0.08)" : "transparent"
                            }}
                            onClick={() => setSelectedResponse(resp)}
                          >
                            <td style={{ padding: "0.85rem 0.75rem", textAlign: "center" }} onClick={e => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={selectedResponseIds.includes(resp.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedResponseIds([...selectedResponseIds, resp.id]);
                                  } else {
                                    setSelectedResponseIds(selectedResponseIds.filter(id => id !== resp.id));
                                  }
                                }}
                              />
                            </td>
                            <td style={{ padding: "0.85rem 0.75rem", fontWeight: "700", color: "var(--cyan)" }}>
                              {resp.response_id}
                            </td>
                            <td style={{ padding: "0.85rem 0.75rem", fontWeight: "600", color: "var(--text-main)" }}>
                              {resp.name}
                            </td>
                            <td style={{ padding: "0.85rem 0.75rem", color: "var(--text-muted)" }}>
                              {resp.email}
                            </td>
                            <td style={{ padding: "0.85rem 0.75rem" }}>
                              <span className={`badge ${resp.status === 'Completed' ? 'badge-published' : 'badge-draft'}`}>
                                {resp.status}
                              </span>
                            </td>
                            <td style={{ padding: "0.85rem 0.75rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                              {new Date(resp.submitted_at).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {/* Pagination control */}
                  {totalPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", borderTop: "1px solid var(--border-color)" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Showing Page {currentPage} of {totalPages} ({totalCount} total submissions)
                      </span>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
                          disabled={currentPage <= 1}
                          onClick={() => fetchResponsesWithFilters(currentPage - 1)}
                        >
                          Previous
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
                          disabled={currentPage >= totalPages}
                          onClick={() => fetchResponsesWithFilters(currentPage + 1)}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* DETAILS PANEL DRAWER */}
                {selectedResponse && (
                  <div className="glass-card fade-in" style={{ padding: "1.25rem", borderLeft: "3px solid var(--cyan)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                      <h4 style={{ fontFamily: "var(--font-display)", fontWeight: "800", color: "var(--text-main)" }}>Submission Details</h4>
                      <button 
                        className="btn btn-secondary btn-icon" 
                        style={{ width: "24px", height: "24px", padding: 0, borderRadius: "50%" }}
                        onClick={() => setSelectedResponse(null)}
                      >
                        &times;
                      </button>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.02)", padding: "0.5rem", borderRadius: "6px" }}>
                        <strong>Response ID:</strong> {selectedResponse.response_id}<br/>
                        <strong>Status:</strong> {selectedResponse.status}<br/>
                        <strong>Date:</strong> {new Date(selectedResponse.submitted_at).toLocaleString()}<br/>
                        {selectedResponse.completion_time && (
                          <span><strong>Time to Complete:</strong> {selectedResponse.completion_time}s (v{selectedResponse.version})</span>
                        )}
                      </div>
                      
                      <div>
                        <div style={{ fontWeight: "700", fontSize: "0.82rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Submitter Info</div>
                        <div style={{ marginTop: "0.25rem", fontSize: "0.85rem" }}>
                          <strong>Name:</strong> {selectedResponse.name}<br/>
                          <strong>Email:</strong> {selectedResponse.email}
                        </div>
                      </div>

                      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                        <div style={{ fontWeight: "700", fontSize: "0.82rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>Responses</div>
                        {Object.entries(selectedResponse.submitted_data).map(([fieldId, value]) => (
                          <div key={fieldId} style={{ marginBottom: "0.75rem" }}>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600" }}>
                              {getFieldLabel(fieldId)}
                            </div>
                            <div style={{ fontSize: "0.88rem", fontWeight: "600", marginTop: "0.15rem", color: "var(--text-main)" }}>
                              {renderResponseValue(fieldId, value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="fade-in">
            {loadingAnalytics ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
                <Loader size={32} className="animate-spin text-indigo-500" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : !analytics || analytics.total_submissions === 0 ? (
              <div className="empty-dashboard" style={{ padding: "4rem 2rem" }}>
                <BarChart3 size={40} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
                <h3>No responses yet</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Submit data using the public responder link to display live chart aggregations.
                </p>
              </div>
            ) : (
              <div>
                {/* Metrics Summary cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                  <div className="glass-card" style={{ padding: "1.25rem", borderLeft: "3.5px solid var(--primary-indigo)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>Started Funnel</div>
                    <div style={{ fontSize: "2rem", fontWeight: "800", marginTop: "0.25rem", color: "white" }}>
                      {analytics.started_submissions}
                    </div>
                  </div>
                  <div className="glass-card" style={{ padding: "1.25rem", borderLeft: "3.5px solid var(--cyan)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>Completed Forms</div>
                    <div style={{ fontSize: "2rem", fontWeight: "800", marginTop: "0.25rem", color: "white" }}>
                      {analytics.completed_submissions}
                    </div>
                  </div>
                  <div className="glass-card" style={{ padding: "1.25rem", borderLeft: "3.5px solid var(--violet)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>Completion Rate</div>
                    <div style={{ fontSize: "2rem", fontWeight: "800", marginTop: "0.25rem", color: "white" }}>
                      {analytics.completion_rate}%
                    </div>
                  </div>
                  <div className="glass-card" style={{ padding: "1.25rem", borderLeft: "3.5px solid var(--emerald)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>Avg Completion Time</div>
                    <div style={{ fontSize: "2rem", fontWeight: "800", marginTop: "0.25rem", color: "white" }}>
                      {analytics.average_completion_time}s
                    </div>
                  </div>
                </div>

                {/* Primary Trend Charts */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                  {/* Trend Line Chart */}
                  <div className="glass-card" style={{ padding: "1.25rem" }}>
                    <h3 style={{ fontFamily: "var(--font-display)", fontWeight: "800", fontSize: "1rem", marginBottom: "1rem" }}>Response Submissions over Time</h3>
                    <div style={{ width: "100%", height: 260 }}>
                      <ResponsiveContainer>
                        <LineChart data={analytics.daily_submissions}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} />
                          <YAxis stroke="var(--text-muted)" fontSize={10} allowDecimals={false} />
                          <ChartTooltip contentStyle={{ background: "rgba(15,23,42,0.85)", borderColor: "rgba(255,255,255,0.12)" }} />
                          <Line type="monotone" dataKey="count" name="Submissions" stroke="var(--cyan)" strokeWidth={2.5} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Started vs Completed Funnel Chart */}
                  <div className="glass-card" style={{ padding: "1.25rem" }}>
                    <h3 style={{ fontFamily: "var(--font-display)", fontWeight: "800", fontSize: "1rem", marginBottom: "1rem" }}>Completion Funnel</h3>
                    <div style={{ width: "100%", height: 260 }}>
                      <ResponsiveContainer>
                        <BarChart data={[
                          { name: "Started", count: analytics.started_submissions, fill: "var(--primary-indigo)" },
                          { name: "Completed", count: analytics.completed_submissions, fill: "var(--cyan)" }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                          <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                          <ChartTooltip contentStyle={{ background: "rgba(15,23,42,0.85)", borderColor: "rgba(255,255,255,0.12)" }} />
                          <Bar dataKey="count" name="Count" radius={[6, 6, 0, 0]}>
                            {
                              [
                                <Cell key="started" fill="rgba(99, 102, 241, 0.75)" stroke="var(--primary-indigo)" strokeWidth={1.5} />,
                                <Cell key="completed" fill="rgba(34, 211, 238, 0.75)" stroke="var(--cyan)" strokeWidth={1.5} />
                              ]
                            }
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Per-field Distributions Grid */}
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: "800", fontSize: "1.2rem", marginBottom: "1rem", color: "var(--text-main)" }}>Categorical Field Distributions</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem" }}>
                  {Object.entries(analytics.field_distributions).map(([label, dist]) => {
                    const chartData = Object.entries(dist).map(([key, val]) => ({ name: key, count: val }));
                    return (
                      <div className="glass-card" key={label} style={{ padding: "1.25rem" }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.85rem" }}>{label}</h4>
                        <div style={{ width: "100%", height: 200 }}>
                          <ResponsiveContainer>
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                              <YAxis stroke="var(--text-muted)" fontSize={10} allowDecimals={false} />
                              <ChartTooltip contentStyle={{ background: "rgba(15,23,42,0.85)", borderColor: "rgba(255,255,255,0.10)" }} />
                              <Bar dataKey="count" name="Responses" fill="rgba(139, 92, 246, 0.65)" stroke="var(--violet)" strokeWidth={1} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CONDITIONAL RULES VISUALIZER */}
        {activeTab === "rules" && (
          <div className="fade-in">
            {loadingRules ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
                <Loader size={32} className="animate-spin text-indigo-500" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : rules.length === 0 ? (
              <div className="empty-dashboard" style={{ padding: "4rem 2rem" }}>
                <ShieldAlert size={40} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
                <h3>No conditional rules configured</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Configure conditional logic inside the low-code builder to hide/show fields dynamically.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {rules.map((rule, idx) => (
                  <div key={rule.id || idx} className="glass-card" style={{ padding: "1.1rem 1.5rem", display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(15,23,42,0.30)" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span className="badge badge-draft" style={{ alignSelf: "flex-start", marginBottom: "0.25rem" }}>Trigger Node</span>
                      <strong style={{ color: "white" }}>{rule.trigger_field_label || getFieldLabel(rule.trigger_field_id)}</strong>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--cyan)", fontWeight: "600", fontSize: "0.9rem" }}>
                      <span style={{ border: "1px solid rgba(34,211,238,0.25)", padding: "0.15rem 0.5rem", borderRadius: "6px", fontSize: "0.75rem", background: "rgba(34,211,238,0.05)", textTransform: "uppercase" }}>
                        {rule.operator}
                      </span>
                      <span>"{rule.comparison_value || "Empty"}"</span>
                      <span style={{ fontSize: "1.1rem" }}>&rarr;</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span className="badge badge-published" style={{ alignSelf: "flex-start", marginBottom: "0.25rem", background: "rgba(16,185,129,0.08)", color: "#34d399" }}>
                        {rule.action.toUpperCase()} Action
                      </span>
                      <strong style={{ color: "white" }}>{rule.target_field_label || getFieldLabel(rule.target_field_id)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: RETENTION SETTINGS */}
        {activeTab === "settings" && (
          <div className="fade-in" style={{ maxWidth: "600px", margin: "0 auto" }}>
            <div className="glass-card" style={{ padding: "2rem" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: "800", fontSize: "1.25rem", marginBottom: "0.5rem" }}>
                Response Retention Policy
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem", lineHeight: "1.45" }}>
                Configure automatic data retention rules for this form. Responses older than the configured days will be safely archived and hidden from responder lists.
              </p>

              <form onSubmit={handleSaveRetention}>
                <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                  <label className="form-label">Auto-Archive After (Days)</label>
                  <select 
                    className="form-control" 
                    value={retentionDays} 
                    onChange={e => setRetentionDays(e.target.value)}
                  >
                    <option value="">No Retention Policy (Keep Indefinitely)</option>
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                  </select>
                </div>
                
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={savingRetention}
                  >
                    {savingRetention ? "Saving..." : "Apply Retention Configuration"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === "audit" && (
          <div className="fade-in">
            {loadingAudit ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
                <Loader size={32} className="animate-spin text-indigo-500" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="empty-dashboard" style={{ padding: "4rem 2rem" }}>
                <Settings size={40} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
                <h3>No audit events logged</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Important administrative tasks like duplication or deletion will appear here.
                </p>
              </div>
            ) : (
              <div className="glass-card" style={{ padding: "0", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <th style={{ padding: "0.85rem 0.75rem", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>User</th>
                      <th style={{ padding: "0.85rem 0.75rem", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Action Type</th>
                      <th style={{ padding: "0.85rem 0.75rem", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Target Object</th>
                      <th style={{ padding: "0.85rem 0.75rem", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Timestamp</th>
                      <th style={{ padding: "0.85rem 0.75rem", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Metadata Context</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "0.85rem 0.75rem", fontWeight: "600", color: "white" }}>{log.username}</td>
                        <td style={{ padding: "0.85rem 0.75rem" }}>
                          <span className="type-tag">{log.action}</span>
                        </td>
                        <td style={{ padding: "0.85rem 0.75rem", color: "var(--text-main)" }}>{log.target}</td>
                        <td style={{ padding: "0.85rem 0.75rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: "0.85rem 0.75rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {JSON.stringify(log.context)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>Your Forms Workspace</h2>
          <p>Create, manage, validate, and publish your custom schemas</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            className="btn btn-secondary" 
            style={{ padding: "0.5rem 1rem", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "0.4rem" }} 
            onClick={() => setShowAIModal(true)}
          >
            <span>✨ Generate with AI</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={14} /> Create Form Draft
          </button>
        </div>
      </div>

      {/* SaaS Stats Grid */}
      <div className="stats-grid">
        <div className="stat-widget">
          <span className="stat-widget-label">Total Workspaces</span>
          <span className="stat-widget-value">{forms.length}</span>
        </div>
        <div className="stat-widget">
          <span className="stat-widget-label">Published Live</span>
          <span className="stat-widget-value">{forms.filter(f => f.status === 'Published').length}</span>
        </div>
        <div className="stat-widget">
          <span className="stat-widget-label">Pending Drafts</span>
          <span className="stat-widget-value">{forms.filter(f => f.status === 'Draft').length}</span>
        </div>
        <div className="stat-widget">
          <span className="stat-widget-label">Archived Deactivated</span>
          <span className="stat-widget-value">{forms.filter(f => f.status === 'Archived').length}</span>
        </div>
      </div>

      {forms.length === 0 ? (
        <div className="empty-dashboard">
          <ServerCrash size={32} className="empty-dashboard-icon" />
          <h3>Start building schemas</h3>
          <p style={{ color: "var(--text-muted)", margin: "0.5rem 0 1.5rem", fontSize: "0.85rem" }}>
            Add your first custom form draft to populate the workspace.
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={14} /> Create Form Draft
          </button>
        </div>
      ) : (
        <div className="forms-grid">
          {forms.map((form) => {
            const isDraft = form.status === "Draft";
            const isPublished = form.status === "Published";
            const isArchived = form.status === "Archived";
            const displayVersion = isPublished ? form.current_version - 1 : form.current_version;

            return (
              <div key={form.id} className="glass-card form-card">
                <div className="form-card-top">
                  <div>
                    <span className="form-card-version">Schema v{displayVersion}</span>
                    <h3 className="form-card-title" title={form.title}>{form.title}</h3>
                  </div>
                  {isDraft && <span className="badge badge-draft">Draft</span>}
                  {isPublished && <span className="badge badge-published">Published</span>}
                  {isArchived && <span className="badge badge-archived">Archived</span>}
                </div>

                <p className="form-card-desc">
                  {form.description || "No description provided."}
                </p>

                <div className="form-card-actions">
                  <div className="action-group">
                    <button 
                      className="btn btn-secondary btn-icon" 
                      onClick={() => onEditForm(form.id)}
                      title="Edit Form Canvas"
                    >
                      <Edit2 size={13} style={{ color: "var(--text-muted)" }} />
                    </button>
                    <button 
                      className="btn btn-secondary btn-icon" 
                      onClick={() => handleOpenSettingsModal(form)}
                      title="Sharing, Expiration & Tokens Settings"
                    >
                      <Settings size={13} style={{ color: "var(--text-muted)" }} />
                    </button>
                    {/* Form Duplication action added */}
                    <button 
                      className="btn btn-secondary btn-icon" 
                      onClick={() => handleDuplicateForm(form.id)}
                      title="Duplicate Form Schema"
                    >
                      <Copy size={13} style={{ color: "var(--text-muted)" }} />
                    </button>
                    {isPublished ? (
                      <>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          onClick={() => copyShareLink(form.share_slug)}
                          title="Copy Public URL"
                        >
                          <Globe size={13} style={{ color: "var(--text-muted)" }} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          onClick={() => onViewPreview(form.share_slug)}
                          title="Open Public Preview"
                        >
                          <ExternalLink size={13} style={{ color: "var(--text-muted)" }} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          style={{ borderColor: "rgba(95, 90, 246, 0.2)" }}
                          onClick={() => handleViewResponses(form)}
                          title="View Submissions Database"
                        >
                          <MessageSquare size={13} style={{ color: "var(--primary)" }} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          style={{ borderColor: "rgba(245, 158, 11, 0.2)" }}
                          onClick={() => handleArchiveForm(form.id)}
                          title="Deactivate and Archive"
                        >
                          <Archive size={13} style={{ color: "var(--warning)" }} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
                          onClick={() => handlePublishForm(form.id)}
                        >
                          Publish Live
                        </button>
                        {isArchived && (
                          <>
                            <button 
                              className="btn btn-secondary btn-icon" 
                              style={{ borderColor: "rgba(95, 90, 246, 0.2)" }}
                              onClick={() => handleViewResponses(form)}
                              title="View Submissions Database"
                            >
                              <MessageSquare size={13} style={{ color: "var(--primary)" }} />
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
                              onClick={() => handlePublishForm(form.id)}
                            >
                              Re-Publish
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <button 
                    className="btn btn-danger btn-icon" 
                    onClick={() => handleDeleteForm(form.id, form.title)}
                    title="Delete Form Workspace"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE FORM POPUP MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content fade-in">
            <div className="modal-header">
              <h3>Create Form Workspace</h3>
              <button 
                className="btn btn-secondary btn-icon" 
                style={{ borderRadius: "50%", width: "26px", height: "26px", padding: 0 }}
                onClick={() => setShowCreateModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateForm}>
              <div className="form-group">
                <label className="form-label">Form Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="E.g., Client Intake Survey"
                  value={newFormTitle}
                  onChange={(e) => setNewFormTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea 
                  className="form-control" 
                  placeholder="Describe the purpose of this form workspace..."
                  rows="3"
                  value={newFormDesc}
                  onChange={(e) => setNewFormDesc(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Creating..." : "Create Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI FORM GENERATOR MODAL */}
      {showAIModal && (
        <div className="modal-overlay">
          <div className="modal-content fade-in" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h3>✨ AI Form Generator</h3>
              <button 
                className="btn btn-secondary btn-icon" 
                style={{ borderRadius: "50%", width: "26px", height: "26px", padding: 0 }}
                onClick={() => { setShowAIModal(false); setAiPrompt(""); }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAIGenerate}>
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: "0.5rem" }}>Describe your form idea</label>
                <textarea 
                  className="form-control" 
                  placeholder="E.g., I need a college conference registration form with options for department, year, and a file upload for resumes..."
                  rows="4"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  required
                  disabled={generatingAI}
                />
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.4rem", display: "block" }}>
                  The engine will generate fields like dropdowns, checkboxes, dates, and ratings matching your description.
                </span>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { setShowAIModal(false); setAiPrompt(""); }}
                  disabled={generatingAI}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={generatingAI}
                >
                  {generatingAI ? "AI Generating..." : "Generate Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARING, SCHEDULING, ONE-TIME TOKENS CONFIG MODAL */}
      {showSettingsModal && selectedSettingsForm && (
        <div className="modal-overlay">
          <div className="modal-content fade-in" style={{ maxWidth: "600px", padding: "2rem" }}>
            <div className="modal-header">
              <div>
                <h3 style={{ marginBottom: "0.25rem" }}>Form Settings & Sharing</h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{selectedSettingsForm.title}</p>
              </div>
              <button 
                className="btn btn-secondary btn-icon" 
                style={{ borderRadius: "50%", width: "26px", height: "26px", padding: 0 }}
                onClick={() => { setShowSettingsModal(false); setSelectedSettingsForm(null); }}
              >
                &times;
              </button>
            </div>

            {/* Modal Tabs Header */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "1.5rem", gap: "1rem" }}>
              <button 
                className={`tab-btn ${settingsTab === "sharing" ? "active" : ""}`}
                onClick={() => setSettingsTab("sharing")}
                style={{ padding: "0.5rem 0.25rem", background: "none", border: "none", borderBottom: settingsTab === "sharing" ? "2px solid var(--primary)" : "none", color: settingsTab === "sharing" ? "var(--text-main)" : "var(--text-muted)", fontSize: "0.85rem", cursor: "pointer" }}
              >
                Sharing & QR
              </button>
              <button 
                className={`tab-btn ${settingsTab === "schedule" ? "active" : ""}`}
                onClick={() => setSettingsTab("schedule")}
                style={{ padding: "0.5rem 0.25rem", background: "none", border: "none", borderBottom: settingsTab === "schedule" ? "2px solid var(--primary)" : "none", color: settingsTab === "schedule" ? "var(--text-main)" : "var(--text-muted)", fontSize: "0.85rem", cursor: "pointer" }}
              >
                Scheduling & Expiry
              </button>
              {selectedSettingsForm.status === "Published" && (
                <button 
                  className={`tab-btn ${settingsTab === "onetime" ? "active" : ""}`}
                  onClick={() => setSettingsTab("onetime")}
                  style={{ padding: "0.5rem 0.25rem", background: "none", border: "none", borderBottom: settingsTab === "onetime" ? "2px solid var(--primary)" : "none", color: settingsTab === "onetime" ? "var(--text-main)" : "var(--text-muted)", fontSize: "0.85rem", cursor: "pointer" }}
                >
                  One-Time Links
                </button>
              )}
            </div>

            {/* Tab Contents: Sharing */}
            {settingsTab === "sharing" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div>
                  <label className="form-label" style={{ marginBottom: "0.4rem" }}>Shareable Public Form Link</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      readOnly 
                      value={`${window.location.origin}/form/${selectedSettingsForm.share_slug}`}
                      style={{ background: "rgba(0,0,0,0.15)", color: "var(--text-muted)", fontSize: "0.8rem" }}
                    />
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/form/${selectedSettingsForm.share_slug}`);
                        showToast("Link copied to clipboard!");
                      }}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                  {qrCodeUrl ? (
                    <div style={{ background: "white", padding: "0.4rem", borderRadius: "6px", display: "inline-flex" }}>
                      <img src={qrCodeUrl} alt="QR Code" style={{ width: "120px", height: "120px" }} />
                    </div>
                  ) : (
                    <div style={{ width: "120px", height: "120px", background: "rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Loader className="animate-spin" />
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: "700" }}>Dynamic Form QR Code</h4>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Download or scan to open the published form directly on mobile devices.</p>
                    <a 
                      href={qrCodeUrl} 
                      download={`form_${selectedSettingsForm.share_slug}_qr.png`}
                      className="btn btn-secondary" 
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", width: "fit-content", display: "inline-flex", textDecoration: "none" }}
                    >
                      <Download size={12} style={{ marginRight: "0.25rem", alignSelf: "center" }} /> Download QR Code
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Contents: Scheduling */}
            {settingsTab === "schedule" && (
              <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: "0.4rem" }}>Scheduled Release Date & Time</label>
                  <input 
                    type="datetime-local" 
                    className="form-control"
                    value={publishAt}
                    onChange={(e) => setPublishAt(e.target.value)}
                  />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.3rem", display: "block" }}>
                    If set, the form will remain unavailable until this time. Leave blank to publish immediately.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: "0.4rem" }}>Auto-Expiration Date & Time</label>
                  <input 
                    type="datetime-local" 
                    className="form-control"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.3rem", display: "block" }}>
                    If set, submissions will close automatically after this date.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: "0.4rem" }}>Maximum Submission Count Limit</label>
                  <input 
                    type="number" 
                    min="1"
                    className="form-control"
                    placeholder="E.g., 100 (Leave blank for unlimited)"
                    value={maxSubmissions}
                    onChange={(e) => setMaxSubmissions(e.target.value)}
                  />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.3rem", display: "block" }}>
                    Close submissions automatically when total responses reach this number.
                  </span>
                </div>

                <div className="modal-footer" style={{ padding: 0, marginTop: "1rem" }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={savingSettings}
                    style={{ width: "100%", padding: "0.6rem" }}
                  >
                    {savingSettings ? "Saving Settings..." : "Save Settings"}
                  </button>
                </div>
              </form>
            )}

            {/* Tab Contents: One-Time Links */}
            {settingsTab === "onetime" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* Generate form */}
                <div style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <h4 style={{ fontSize: "0.88rem", fontWeight: "700", marginBottom: "0.5rem" }}>Create Single-Use Submission Link</h4>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input 
                      type="number" 
                      min="1"
                      className="form-control"
                      placeholder="Optional expiration (days)"
                      value={tokenExpiryDays}
                      onChange={(e) => setTokenExpiryDays(e.target.value)}
                      disabled={generatingToken}
                    />
                    <button 
                      className="btn btn-primary"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}
                      onClick={handleGenerateOneTimeLink}
                      disabled={generatingToken}
                    >
                      {generatingToken ? "Generating..." : "Generate Token Link"}
                    </button>
                  </div>
                </div>

                {/* Tokens List */}
                <div>
                  <h4 style={{ fontSize: "0.88rem", fontWeight: "700", marginBottom: "0.75rem" }}>Tokens History</h4>
                  {loadingTokens ? (
                    <div style={{ textAlign: "center", padding: "1rem" }}><Loader className="animate-spin" /></div>
                  ) : oneTimeTokens.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>No one-time submission links generated yet.</p>
                  ) : (
                    <div style={{ maxHeight: "220px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {oneTimeTokens.map((t) => (
                        <div key={t.token} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "6px", padding: "0.75rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: "600", color: t.status === "Active" ? "var(--success)" : "var(--text-muted)" }}>
                              {t.status.toUpperCase()}
                            </span>
                            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                              Created: {new Date(t.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                            <input 
                              type="text" 
                              className="form-control" 
                              readOnly 
                              value={`${window.location.origin}/form/${selectedSettingsForm.share_slug}/token/${t.token}`}
                              style={{ background: "rgba(0,0,0,0.15)", color: "var(--text-muted)", fontSize: "0.72rem", padding: "0.25rem 0.5rem", height: "auto" }}
                            />
                            <button 
                              className="btn btn-secondary btn-icon" 
                              style={{ padding: "0.25rem", borderRadius: "4px" }}
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/form/${selectedSettingsForm.share_slug}/token/${t.token}`);
                                showToast("One-time link copied!");
                              }}
                              title="Copy Link"
                            >
                              <Copy size={11} />
                            </button>
                            <button 
                              className="btn btn-secondary btn-icon" 
                              style={{ padding: "0.25rem", borderRadius: "4px" }}
                              onClick={() => handleViewTokenQR(t.token, selectedSettingsForm.share_slug)}
                              title="Toggle QR Code"
                            >
                              <QrCode size={11} />
                            </button>
                            {t.status === "Active" && (
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem", height: "auto", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.15)" }}
                                onClick={() => handleRevokeToken(t.token)}
                              >
                                Revoke
                              </button>
                            )}
                          </div>

                          {/* Inline QR view */}
                          {selectedTokenQR === t.token && tokenQRUrl && (
                            <div style={{ marginTop: "0.5rem", display: "flex", gap: "1rem", alignItems: "center", padding: "0.5rem", background: "rgba(255,255,255,0.01)", borderRadius: "4px" }}>
                              <div style={{ background: "white", padding: "0.25rem", borderRadius: "4px", display: "inline-flex" }}>
                                <img src={tokenQRUrl} alt="Token QR" style={{ width: "90px", height: "90px" }} />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                <span style={{ fontSize: "0.7rem", fontWeight: "600" }}>Token QR Link</span>
                                <a href={tokenQRUrl} download={`form_token_${t.token.slice(0, 6)}_qr.png`} style={{ fontSize: "0.68rem", color: "var(--primary)", textDecoration: "none" }}>
                                  Download QR
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
