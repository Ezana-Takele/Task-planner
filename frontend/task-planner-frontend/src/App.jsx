import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Search,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  X,
  Calendar,
  Download,
  CheckSquare,
  Square,
  ListPlus,
  LayoutGrid,
  List,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ChevronRight,
  Check,
  Share2,
  Users,
  UserCheck,
  UserMinus,
  User,
  Layers,
  Copy,
  Link2
} from "lucide-react";
import "./App.css";
import { apiRequest } from "./services/api";

const CATEGORIES = [
  "General",
  "Development",
  "Bugs & Fixes",
  "Design",
  "Work",
  "Personal",
  "Learning & Research",
  "Finance",
  "Health"
];

function App() {
  // Theme Mode: 'dark' (obsidian) | 'light' (studio)
  const [theme, setTheme] = useState(() => localStorage.getItem("tp_theme") || "dark");

  // Auth State
  const [token, setToken] = useState(() => localStorage.getItem("tp_token") || "");
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("tp_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState("login"); // 'login' | 'signup'
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // 2-Step Login / Signup Email OTP State
  const [authOtpPending, setAuthOtpPending] = useState(false);
  const [authOtpCode, setAuthOtpCode] = useState("");
  const [authOtpEmail, setAuthOtpEmail] = useState("");
  const [authOtpNotice, setAuthOtpNotice] = useState("");

  // Password Reset State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetDevCodeNotice, setResetDevCodeNotice] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  // Email Verification State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyDevCodeNotice, setVerifyDevCodeNotice] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // View Preferences
  const [viewMode, setViewMode] = useState("kanban"); // 'kanban' | 'list'
  const [mobileActiveTab, setMobileActiveTab] = useState("pending");

  // Tasks State
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterOwnership, setFilterOwnership] = useState("all"); // 'all' | 'shared' | 'mine'

  // Task Sharing State (Multi-User Collaboration)
  const [sharingTask, setSharingTask] = useState(null);
  const [shareCollaborator, setShareCollaborator] = useState("");
  const [sharePermission, setSharePermission] = useState("edit");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState("");

  // Create Task Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newCategory, setNewCategory] = useState("General");
  const [newStatus, setNewStatus] = useState("pending");
  const [newEstMinutes, setNewEstMinutes] = useState(30);
  const [newDueDate, setNewDueDate] = useState("");
  const [newSubtasks, setNewSubtasks] = useState([]);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Edit Task Modal State
  const [editingTask, setEditingTask] = useState(null);
  const [editSubtaskInput, setEditSubtaskInput] = useState("");

  // Toast Notification
  const [toast, setToast] = useState(null);
  const searchInputRef = useRef(null);

  const showToast = (message, type = "default") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3600);
  };

  // Toggle Theme
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("tp_theme", next);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
        if (e.key === "Escape") document.activeElement.blur();
        return;
      }

      if (e.key?.toLowerCase() === "n" && token) {
        e.preventDefault();
        setIsCreateOpen(true);
      } else if (e.key === "/" && token) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        setIsCreateOpen(false);
        setEditingTask(null);
        setIsForgotModalOpen(false);
        setIsVerifyModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [token]);

  // Session verification
  useEffect(() => {
    if (token) {
      apiRequest("/auth/me")
        .then((data) => {
          if (data && data.user) {
            setUser(data.user);
            localStorage.setItem("tp_user", JSON.stringify(data.user));
          }
        })
        .catch(() => {
          handleLogout();
        });
    }
  }, [token]);

  // Fetch tasks
  useEffect(() => {
    if (token) {
      fetchTasks();
    } else {
      setTasks([]);
    }
  }, [token]);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const data = await apiRequest("/tasks");
      if (Array.isArray(data)) {
        setTasks(data);
      } else {
        setTasks([]);
      }
    } catch (err) {
      showToast("Unable to load tasks from server", "error");
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Auth Handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const endpoint = authMode === "login" ? "/auth/login" : "/auth/signup";
    const payload = authMode === "login"
      ? { email: authEmail, password: authPassword }
      : { username: authUsername, email: authEmail, password: authPassword };

    try {
      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (data.requiresOtp) {
        setAuthOtpPending(true);
        setAuthOtpEmail(data.email || authEmail.trim().toLowerCase());
        setAuthOtpNotice(data.message || `A 6-digit verification code has been sent to ${data.email || authEmail}.`);
        setAuthOtpCode("");
        showToast("Verification code sent to your email");
        return;
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("tp_token", data.token);
      localStorage.setItem("tp_user", JSON.stringify(data.user));
      showToast(authMode === "login" ? `Signed in as ${data.user.username}` : "Account created successfully");
      setAuthPassword("");
    } catch (err) {
      setAuthError(err.message || "Invalid email or password.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyLoginOtpSubmit = async (e) => {
    e.preventDefault();
    if (!authOtpCode.trim()) return;
    setAuthLoading(true);
    setAuthError("");

    try {
      const data = await apiRequest("/auth/verify-login-otp", {
        method: "POST",
        body: JSON.stringify({
          email: authOtpEmail,
          code: authOtpCode.trim()
        })
      });

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("tp_token", data.token);
      localStorage.setItem("tp_user", JSON.stringify(data.user));
      showToast(`Signed in as ${data.user.username}`);
      setAuthOtpPending(false);
      setAuthOtpCode("");
      setAuthPassword("");
    } catch (err) {
      setAuthError(err.message || "Invalid verification code.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const data = await apiRequest("/auth/resend-login-otp", {
        method: "POST",
        body: JSON.stringify({ email: authOtpEmail })
      });
      setAuthOtpNotice(data.message || "A new verification code has been sent to your email.");
      setAuthOtpCode("");
      showToast("New code sent to your email");
    } catch (err) {
      setAuthError(err.message || "Failed to resend code.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
    setTasks([]);
    localStorage.removeItem("tp_token");
    localStorage.removeItem("tp_user");
    showToast("Signed out", "default");
  };

  // Password Reset Handlers
  const handleRequestResetCode = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    setResetError("");
    setResetDevCodeNotice("");

    try {
      const data = await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: resetEmail.trim() })
      });

      setResetStep(2);
      setResetDevCodeNotice("");
      setResetCode("");
      showToast("Reset code sent to your email");
    } catch (err) {
      setResetError(err.message || "Unable to process password reset request.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetCode.trim() || !resetNewPassword) return;
    setResetLoading(true);
    setResetError("");

    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: resetEmail.trim(),
          code: resetCode.trim(),
          newPassword: resetNewPassword
        })
      });

      showToast("Password updated. Please sign in.");
      setIsForgotModalOpen(false);
      setResetStep(1);
      setResetEmail("");
      setResetCode("");
      setResetNewPassword("");
      setAuthMode("login");
    } catch (err) {
      setResetError(err.message || "Failed to update password.");
    } finally {
      setResetLoading(false);
    }
  };

  // Email Verification Handlers
  const handleSendVerification = async () => {
    setVerifyLoading(true);
    setVerifyError("");
    try {
      await apiRequest("/auth/send-verification", {
        method: "POST"
      });

      setVerifyDevCodeNotice("");
      setVerifyCode("");
      showToast("Verification code sent to your email");
    } catch (err) {
      setVerifyError(err.message || "Failed to generate verification code.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyEmailSubmit = async (e) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;
    setVerifyLoading(true);
    setVerifyError("");

    try {
      await apiRequest("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ code: verifyCode.trim() })
      });

      setUser((prev) => ({ ...prev, is_verified: true }));
      const updatedUser = { ...user, is_verified: true };
      localStorage.setItem("tp_user", JSON.stringify(updatedUser));
      showToast("Email verified successfully");
      setIsVerifyModalOpen(false);
      setVerifyCode("");
    } catch (err) {
      setVerifyError(err.message || "Invalid verification code.");
    } finally {
      setVerifyLoading(false);
    }
  };

  // Task Handlers
  const handleAddSubtask = (isEdit = false) => {
    const input = isEdit ? editSubtaskInput : subtaskInput;
    if (!input.trim()) return;

    const newSub = {
      id: Date.now().toString(),
      title: input.trim(),
      completed: false
    };

    if (isEdit) {
      setEditingTask((prev) => ({
        ...prev,
        subtasks: [...(prev.subtasks || []), newSub]
      }));
      setEditSubtaskInput("");
    } else {
      setNewSubtasks((prev) => [...prev, newSub]);
      setSubtaskInput("");
    }
  };

  const handleToggleSubtask = async (task, subtaskId) => {
    const updatedSubs = (task.subtasks || []).map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, subtasks: updatedSubs } : t))
    );

    try {
      await apiRequest(`/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...task, subtasks: updatedSubs })
      });
    } catch (err) {
      fetchTasks();
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setFormSubmitting(true);
    try {
      const data = await apiRequest("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          priority: newPriority,
          category: newCategory,
          status: newStatus,
          estimated_minutes: Number(newEstMinutes) || 30,
          due_date: newDueDate || null,
          subtasks: newSubtasks
        })
      });

      setTasks((prev) => [data, ...prev]);
      setNewTitle("");
      setNewDescription("");
      setNewPriority("medium");
      setNewCategory("General");
      setNewStatus("pending");
      setNewDueDate("");
      setNewSubtasks([]);
      setIsCreateOpen(false);
      showToast("Task created");
    } catch (err) {
      showToast(err.message || "Failed to create task", "error");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title.trim()) return;

    try {
      const data = await apiRequest(`/tasks/${editingTask.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editingTask.title.trim(),
          description: editingTask.description ? editingTask.description.trim() : "",
          priority: editingTask.priority,
          category: editingTask.category,
          status: editingTask.status,
          estimated_minutes: Number(editingTask.estimated_minutes) || 30,
          due_date: editingTask.due_date || null,
          subtasks: editingTask.subtasks || []
        })
      });

      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? (data.task || editingTask) : t))
      );
      setEditingTask(null);
      showToast("Task updated");
    } catch (err) {
      showToast(err.message || "Failed to update task", "error");
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm("Delete this task?")) return;

    try {
      await apiRequest(`/tasks/${id}`, {
        method: "DELETE"
      });

      setTasks((prev) => prev.filter((t) => t.id !== id));
      showToast("Task deleted", "default");
    } catch (err) {
      showToast(err.message || "Failed to delete task", "error");
    }
  };

  const handleQuickStatus = async (task, nextStatus) => {
    try {
      await apiRequest(`/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...task, status: nextStatus })
      });

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
      const label = nextStatus === "pending" ? "To Do" : nextStatus === "in_progress" ? "In Progress" : "Completed";
      showToast(`Moved to ${label}`);
    } catch (err) {
      showToast("Status update failed", "error");
    }
  };

  // Task Sharing Handlers
  const handleOpenShare = (task) => {
    setSharingTask(task);
    setShareCollaborator("");
    setShareError("");
    setSharePermission("edit");
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    if (!shareCollaborator.trim() || !sharingTask) return;
    setShareLoading(true);
    setShareError("");

    try {
      const res = await apiRequest(`/tasks/${sharingTask.id}/share`, {
        method: "POST",
        body: JSON.stringify({
          collaborator: shareCollaborator.trim(),
          permission: sharePermission
        })
      });

      showToast(res.message || "Task shared successfully");

      const updatedCollabs = [
        ...(sharingTask.collaborators || []).filter((c) => c.id !== res.collaborator.id),
        res.collaborator
      ];

      setTasks((prev) =>
        prev.map((t) => (t.id === sharingTask.id ? { ...t, collaborators: updatedCollabs } : t))
      );

      setSharingTask((prev) => ({
        ...prev,
        collaborators: updatedCollabs
      }));

      setShareCollaborator("");
    } catch (err) {
      setShareError(err.message || "Failed to share task");
    } finally {
      setShareLoading(false);
    }
  };

  const handleRevokeShare = async (taskId, collaboratorId) => {
    try {
      await apiRequest(`/tasks/${taskId}/share/${collaboratorId}`, {
        method: "DELETE"
      });

      showToast("Access revoked");

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, collaborators: (t.collaborators || []).filter((c) => c.id !== collaboratorId) }
            : t
        )
      );

      if (sharingTask && sharingTask.id === taskId) {
        setSharingTask((prev) => ({
          ...prev,
          collaborators: (prev.collaborators || []).filter((c) => c.id !== collaboratorId)
        }));
      }
    } catch (err) {
      showToast(err.message || "Failed to revoke access", "error");
    }
  };

  // Export Tasks to JSON
  const handleExportData = () => {
    const exportBlob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(exportBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Tasks exported to JSON");
  };

  // Analytics & Filtering
  const filteredTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    return tasks.filter((t) => {
      const q = searchQuery.toLowerCase();
      const matchQ =
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.owner_username?.toLowerCase().includes(q);
      const matchP = filterPriority === "all" || t.priority === filterPriority;
      const matchC = filterCategory === "all" || t.category === filterCategory;
      const matchS = filterStatus === "all" || t.status === filterStatus;
      const matchO =
        filterOwnership === "all" ||
        (filterOwnership === "shared" && t.is_shared) ||
        (filterOwnership === "mine" && !t.is_shared);
      return matchQ && matchP && matchC && matchS && matchO;
    });
  }, [tasks, searchQuery, filterPriority, filterCategory, filterStatus, filterOwnership]);

  const stats = useMemo(() => {
    if (!Array.isArray(tasks)) return { total: 0, pending: 0, in_progress: 0, done: 0, completionRate: 0, estHours: 0 };
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const in_progress = tasks.filter((t) => t.status === "in_progress").length;
    const done = tasks.filter((t) => t.status === "done").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const estMinutesRemaining = tasks
      .filter((t) => t.status !== "done")
      .reduce((sum, t) => sum + (Number(t.estimated_minutes) || 30), 0);
    const estHours = (estMinutesRemaining / 60).toFixed(1);
    return { total, pending, in_progress, done, completionRate, estHours };
  }, [tasks]);

  // =========================================================================
  // VIEW: Unauthenticated Executive Front Landing Page & Auth Flow
  // =========================================================================
  if (!token) {
    return (
      <div className={`app-canvas theme-${theme} landing-canvas`}>
        {/* Top Landing Navigation */}
        <header className="landing-navbar">
          <div className="landing-nav-container">
            <div className="brand-badge">
              <span className="brand-logo-box">EZ</span>
              <span className="brand-title">TaskPlanner</span>
            </div>

            <nav className="landing-nav-links">
            </nav>

            <div className="landing-nav-actions">
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle visual theme"
              >
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <button
                type="button"
                className="btn-landing-cta"
                onClick={() => {
                  const card = document.getElementById("auth-panel");
                  if (card) card.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {authMode === "login" ? "Sign In" : "Get Started"} &rarr;
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section: Split Showcase & Auth Card */}
        <main className="landing-main">
          <section className="landing-hero-section">
            <div className="landing-hero-grid">
              {/* Left Column: Hero Value Proposition & 3D Workspace */}
              <div className="hero-content">
                <div className="hero-pill">
                  <span className="hero-pip">●</span> Cloud-Native Task Orchestration Platform
                </div>

                <h1 className="hero-headline">
                  Deliver with <span className="hero-gradient-text">Precision</span>.<br />
                  Collaborate with <span className="hero-gradient-text">Velocity</span>.
                </h1>

                <p className="hero-description">
                  The executive task planner engineered for high-performing engineering and design teams. Track deliverables across Kanban and List views, estimate subtask effort, and share tasks in real-time by numeric User ID.
                </p>

                {/* 3D Hero Workspace Preview */}
                <div className="hero-image-frame">
                  <img
                    src="/images/calendar_board.jpg"
                    alt="Calendar Task Board with Kanban Workflow"
                    className="hero-3d-img"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              </div>

              {/* Right Column: Embedded Auth Card */}
              <div className="hero-auth-column" id="auth-panel">
                <div className="auth-card auth-card-landing">
                  <div className="auth-header">
                    <div className="brand-badge" style={{ justifyContent: "center", marginBottom: "8px" }}>
                      <span className="brand-logo-box">EZ</span>
                      <span className="brand-title">TaskPlanner</span>
                    </div>

                    <h2 className="auth-title">
                      {authOtpPending
                        ? "Security Verification"
                        : authMode === "login"
                        ? "Sign in to workspace"
                        : "Create your account"}
                    </h2>

                    <p className="auth-sub">
                      {authOtpPending
                        ? `Enter the 6-digit code sent to ${authOtpEmail} to complete sign in.`
                        : authMode === "login"
                        ? "Enter your credentials to access your tasks."
                        : "Get started with your team workspace today."}
                    </p>
                  </div>

                  {/* 3D Security Shield when in OTP mode */}
                  {authOtpPending && (
                    <div className="security-shield-banner">
                      <img
                        src="/images/security_3d.jpg"
                        alt="Cybersecurity Verification Shield"
                        className="security-shield-img"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  {!authOtpPending && (
                    <div className="auth-tabs">
                      <button
                        type="button"
                        className={`auth-tab ${authMode === "login" ? "active" : ""}`}
                        onClick={() => {
                          setAuthMode("login");
                          setAuthError("");
                        }}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        className={`auth-tab ${authMode === "signup" ? "active" : ""}`}
                        onClick={() => {
                          setAuthMode("signup");
                          setAuthError("");
                        }}
                      >
                        Sign Up
                      </button>
                    </div>
                  )}

                  {authError && (
                    <div className="alert-banner error">
                      <AlertCircle size={15} />
                      <span>{authError}</span>
                    </div>
                  )}

                  {authOtpNotice && authOtpPending && (
                    <div className="alert-banner info">
                      <span>{authOtpNotice}</span>
                    </div>
                  )}

                  {authOtpPending ? (
                    <form onSubmit={handleVerifyLoginOtpSubmit} className="ui-form">
                      <div className="form-group">
                        <label>6-Digit Verification Code</label>
                        <input
                          type="text"
                          placeholder="123456"
                          value={authOtpCode}
                          onChange={(e) => setAuthOtpCode(e.target.value)}
                          style={{ textAlign: "center", fontSize: "22px", letterSpacing: "6px", fontFamily: "var(--font-mono)" }}
                          autoFocus
                          required
                        />
                      </div>

                      <button type="submit" className="btn-primary" disabled={authLoading || !authOtpCode.trim()}>
                        {authLoading ? "Verifying..." : "Verify & Sign In"}
                      </button>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => {
                            setAuthOtpPending(false);
                            setAuthOtpCode("");
                            setAuthError("");
                          }}
                        >
                          &larr; Back to {authMode === "login" ? "Sign In" : "Sign Up"}
                        </button>

                        <button
                          type="button"
                          className="link-btn"
                          onClick={handleResendLoginOtp}
                          disabled={authLoading}
                        >
                          Resend Code
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleAuthSubmit} className="ui-form">
                      {authMode === "signup" && (
                        <div className="form-group">
                          <label>Username</label>
                          <input
                            type="text"
                            placeholder="johndoe"
                            value={authUsername}
                            onChange={(e) => setAuthUsername(e.target.value)}
                            required
                          />
                        </div>
                      )}

                      <div className="form-group">
                        <label>Email Address</label>
                        <input
                          type="email"
                          placeholder="name@company.com"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <div className="field-header">
                          <label>Password</label>
                          {authMode === "login" && (
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => {
                                setResetEmail(authEmail);
                                setIsForgotModalOpen(true);
                                setResetStep(1);
                                setResetError("");
                              }}
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                        <div className="password-wrapper">
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label="Toggle password visibility"
                          >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      <button type="submit" className="btn-primary" disabled={authLoading}>
                        {authLoading ? "Processing..." : authMode === "login" ? "Sign In & Get OTP" : "Create Account & Verify"}
                      </button>

                      <div className="auth-footer-badge">
                        <ShieldCheck size={13} className="text-cyan" />
                        <span>Protected by 2-Step Cryptographic Email Verification</span>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Real-Time Team Collaboration Spotlight */}
          <section className="landing-section" id="collaboration">
            <div className="section-header-centered">
              <span className="section-eyebrow">MULTI-USER COLLABORATION</span>
              <h2 className="section-heading">Share Deliverables Instantly by User ID</h2>
              <p className="section-sub">
                Collaborate with colleagues seamlessly. No complicated invites needed — just enter their numeric <strong>User ID (#X)</strong> for instant real-time synchronization.
              </p>
            </div>

            <div className="collab-showcase-grid">
              <div className="collab-image-card">
                <img
                  src="/images/collab_3d.jpg"
                  alt="3D Team Collaboration Network"
                  className="collab-3d-img"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>

              <div className="collab-features-list">
                <div className="collab-feature-item">
                  <div className="collab-icon-box">
                    <User size={18} />
                  </div>
                  <div>
                    <h3 className="collab-feature-title">Numeric User ID Resolution</h3>
                    <p className="collab-feature-desc">
                      Every team member has a unique ID (e.g. <code>ID: #10</code>) prominently displayed in their topbar. Click to copy and share in one step.
                    </p>
                  </div>
                </div>

                <div className="collab-feature-item">
                  <div className="collab-icon-box">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="collab-feature-title">Granular Permission Matrix</h3>
                    <p className="collab-feature-desc">
                      Choose between <strong>Can Edit & Complete Subtasks</strong> (read/write access) or <strong>View Only</strong> (read-only monitoring).
                    </p>
                  </div>
                </div>

                <div className="collab-feature-item">
                  <div className="collab-icon-box">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h3 className="collab-feature-title">Subtask Checklist Tracking</h3>
                    <p className="collab-feature-desc">
                      Break tasks into clear subtasks with estimated minutes and real-time progress calculations automatically updating across the workspace.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>



        </main>

        {/* Landing Page Footer */}
        <footer className="landing-footer">
          <div className="landing-footer-container">
            <div className="brand-badge">
              <span className="brand-logo-box">EZ</span>
              <span className="brand-title">TaskPlanner</span>
            </div>
            <div className="footer-meta">
              <span>Academic Defense Project • Ezana Takele</span>
            </div>
          </div>
        </footer>

        {/* FORGOT PASSWORD MODAL */}
        {isForgotModalOpen && (
          <div className="modal-backdrop" onClick={() => setIsForgotModalOpen(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-heading">Reset Password</h3>
                  <p className="modal-subheading">We will send a 6-digit one-time verification code to your email.</p>
                </div>
                <button className="icon-btn-ghost" onClick={() => setIsForgotModalOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              {resetError && (
                <div className="alert-banner error">
                  <AlertCircle size={15} />
                  <span>{resetError}</span>
                </div>
              )}

              {resetDevCodeNotice && (
                <div className="alert-banner info">
                  <span>{resetDevCodeNotice}</span>
                </div>
              )}

              {resetStep === 1 ? (
                <form onSubmit={handleRequestResetCode} className="ui-form">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn-secondary" onClick={() => setIsForgotModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={resetLoading}>
                      {resetLoading ? "Sending..." : "Send Verification Code"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="ui-form">
                  <div className="form-group">
                    <label>Verification Code</label>
                    <input
                      type="text"
                      placeholder="123456"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn-secondary" onClick={() => setResetStep(1)}>
                      Back
                    </button>
                    <button type="submit" className="btn-primary" disabled={resetLoading}>
                      {resetLoading ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW: Authenticated Executive Monochrome Dashboard
  // =========================================================================
  return (
    <div className={`app-canvas theme-${theme}`}>
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Shared Executive Top Navigation */}
      <header className="executive-navbar">
        <div className="nav-container">
          <div className="nav-left">
            <div className="brand-badge">
              <span className="brand-mark"></span>
              <span className="brand-title">Task Planner</span>
            </div>
          </div>

          <div className="nav-center">
            <div className="search-bar">
              <Search size={14} className="search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search tasks (Press '/' to focus)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search" onClick={() => setSearchQuery("")}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="nav-right">
            {/* View Mode Toggle */}
            <div className="segmented-control">
              <button
                className={`segment-btn ${viewMode === "kanban" ? "active" : ""}`}
                onClick={() => setViewMode("kanban")}
                title="Board View"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                className={`segment-btn ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <List size={14} />
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="icon-btn"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* User Profile Pill */}
            <div className="user-profile">
              <span className="user-avatar">{user?.username?.[0]?.toUpperCase() || "U"}</span>
              <span className="user-name">{user?.username}</span>
              {user?.id && (
                <span
                  className="user-id-chip"
                  onClick={() => {
                    navigator.clipboard?.writeText(user.id.toString());
                    showToast(`User ID #${user.id} copied to clipboard`);
                  }}
                  title="Your User ID (Click to copy for task sharing)"
                >
                  ID: #{user.id}
                </span>
              )}
              <span className="verification-status verified" title="Email Verified">
                <ShieldCheck size={13} />
                <span>Verified</span>
              </span>
            </div>

            {/* Export JSON */}
            <button onClick={handleExportData} className="icon-btn" title="Export Tasks (JSON)">
              <Download size={15} />
            </button>

            {/* Log Out */}
            <button onClick={handleLogout} className="icon-btn danger" title="Sign Out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Stage */}
      <main className="executive-stage">
        <div className="stage-container">

          {/* Executive Metrics Overview Deck */}
          <section className="metrics-deck">
            <div
              className={`metric-tile ${filterStatus === "all" ? "active" : ""}`}
              onClick={() => setFilterStatus("all")}
            >
              <span className="metric-eyebrow">Total Tasks</span>
              <div className="metric-row">
                <span className="metric-number">{stats.total}</span>
                <span className="metric-pill">All</span>
              </div>
            </div>

            <div
              className={`metric-tile ${filterStatus === "pending" ? "active" : ""}`}
              onClick={() => setFilterStatus(filterStatus === "pending" ? "all" : "pending")}
            >
              <span className="metric-eyebrow">To Do</span>
              <div className="metric-row">
                <span className="metric-number">{stats.pending}</span>
                <span className="metric-status-dot pending"></span>
              </div>
            </div>

            <div
              className={`metric-tile ${filterStatus === "in_progress" ? "active" : ""}`}
              onClick={() => setFilterStatus(filterStatus === "in_progress" ? "all" : "in_progress")}
            >
              <span className="metric-eyebrow">In Progress</span>
              <div className="metric-row">
                <span className="metric-number">{stats.in_progress}</span>
                <span className="metric-status-dot progress"></span>
              </div>
            </div>

            <div
              className={`metric-tile ${filterStatus === "done" ? "active" : ""}`}
              onClick={() => setFilterStatus(filterStatus === "done" ? "all" : "done")}
            >
              <span className="metric-eyebrow">Completion Rate</span>
              <div className="metric-row">
                <span className="metric-number">{stats.completionRate}%</span>
                <span className="metric-status-dot done"></span>
              </div>
            </div>
          </section>

          {/* Mobile Search Bar (Only visible on small devices) */}
          <div className="mobile-search-bar">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search tasks by title, note, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery("")} aria-label="Clear search">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Action Toolbar */}
          <section className="stage-toolbar">
            <div className="toolbar-filters">
              <div className="select-container">
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="all">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="select-container">
                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              <button
                type="button"
                className={`filter-pill-btn ${filterOwnership === "shared" ? "active" : ""}`}
                onClick={() => setFilterOwnership((prev) => (prev === "shared" ? "all" : "shared"))}
                title="Filter tasks shared with you"
              >
                <Users size={13} />
                <span>Shared with me</span>
              </button>
            </div>

            <button onClick={() => setIsCreateOpen(true)} className="btn-primary">
              <Plus size={15} />
              <span>New Task</span>
            </button>
          </section>

          {/* Mobile Column Switcher */}
          <div className="mobile-view-tabs">
            <button
              className={`mobile-tab ${mobileActiveTab === "pending" ? "active" : ""}`}
              onClick={() => setMobileActiveTab("pending")}
            >
              To Do ({filteredTasks.filter((t) => t.status === "pending").length})
            </button>
            <button
              className={`mobile-tab ${mobileActiveTab === "in_progress" ? "active" : ""}`}
              onClick={() => setMobileActiveTab("in_progress")}
            >
              In Progress ({filteredTasks.filter((t) => t.status === "in_progress").length})
            </button>
            <button
              className={`mobile-tab ${mobileActiveTab === "done" ? "active" : ""}`}
              onClick={() => setMobileActiveTab("done")}
            >
              Completed ({filteredTasks.filter((t) => t.status === "done").length})
            </button>
          </div>

          {/* Main Board / List Canvas */}
          {loadingTasks ? (
            <div className="empty-stage-state">
              <div className="stage-spinner"></div>
              <span>Loading tasks...</span>
            </div>
          ) : viewMode === "kanban" ? (
            <div className="kanban-stage">
              {/* COLUMN: TO DO */}
              <div className={`kanban-column ${mobileActiveTab === "pending" ? "mobile-show" : "mobile-hide"}`}>
                <div className="column-header">
                  <div className="column-title-wrap">
                    <span className="status-indicator pending"></span>
                    <h3 className="column-title">To Do</h3>
                  </div>
                  <span className="column-count">
                    {filteredTasks.filter((t) => t.status === "pending").length}
                  </span>
                </div>

                <div className="column-cards">
                  {filteredTasks
                    .filter((t) => t.status === "pending")
                    .map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={() => setEditingTask(task)}
                        onDelete={() => handleDeleteTask(task.id)}
                        onMove={(status) => handleQuickStatus(task, status)}
                        onToggleSubtask={(subId) => handleToggleSubtask(task, subId)}
                        onShare={() => handleOpenShare(task)}
                      />
                    ))}
                  {filteredTasks.filter((t) => t.status === "pending").length === 0 && (
                    <div className="empty-column-box">
                      <span>No tasks to do</span>
                      <button
                        className="text-action-link"
                        onClick={() => {
                          setIsCreateOpen(true);
                          setNewStatus("pending");
                        }}
                      >
                        + Create a task
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMN: IN PROGRESS */}
              <div className={`kanban-column ${mobileActiveTab === "in_progress" ? "mobile-show" : "mobile-hide"}`}>
                <div className="column-header">
                  <div className="column-title-wrap">
                    <span className="status-indicator progress"></span>
                    <h3 className="column-title">In Progress</h3>
                  </div>
                  <span className="column-count">
                    {filteredTasks.filter((t) => t.status === "in_progress").length}
                  </span>
                </div>

                <div className="column-cards">
                  {filteredTasks
                    .filter((t) => t.status === "in_progress")
                    .map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={() => setEditingTask(task)}
                        onDelete={() => handleDeleteTask(task.id)}
                        onMove={(status) => handleQuickStatus(task, status)}
                        onToggleSubtask={(subId) => handleToggleSubtask(task, subId)}
                        onShare={() => handleOpenShare(task)}
                      />
                    ))}
                  {filteredTasks.filter((t) => t.status === "in_progress").length === 0 && (
                    <div className="empty-column-box">
                      <span>No active tasks in progress</span>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMN: COMPLETED */}
              <div className={`kanban-column ${mobileActiveTab === "done" ? "mobile-show" : "mobile-hide"}`}>
                <div className="column-header">
                  <div className="column-title-wrap">
                    <span className="status-indicator done"></span>
                    <h3 className="column-title">Completed</h3>
                  </div>
                  <span className="column-count">
                    {filteredTasks.filter((t) => t.status === "done").length}
                  </span>
                </div>

                <div className="column-cards">
                  {filteredTasks
                    .filter((t) => t.status === "done")
                    .map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={() => setEditingTask(task)}
                        onDelete={() => handleDeleteTask(task.id)}
                        onMove={(status) => handleQuickStatus(task, status)}
                        onToggleSubtask={(subId) => handleToggleSubtask(task, subId)}
                        onShare={() => handleOpenShare(task)}
                      />
                    ))}
                  {filteredTasks.filter((t) => t.status === "done").length === 0 && (
                    <div className="empty-column-box">
                      <span>No completed tasks yet</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Table / List View */
            <div className="list-table-container">
              <div className="table-header">
                <span className="col-title">Task</span>
                <span className="col-cat">Category</span>
                <span className="col-pri">Priority</span>
                <span className="col-date">Due Date</span>
                <span className="col-sub">Subtasks</span>
                <span className="col-status">Status</span>
                <span className="col-actions">Actions</span>
              </div>
              <div className="table-body">
                {filteredTasks.length === 0 ? (
                  <div className="empty-table-row">
                    <span>No tasks found matching criteria.</span>
                  </div>
                ) : (
                  filteredTasks.map((t) => (
                    <div key={t.id} className={`table-row ${t.status === "done" ? "completed" : ""}`}>
                      <div className="col-title cell-title">
                        <strong>{t.title}</strong>
                        {t.description && <p className="cell-desc">{t.description}</p>}
                      </div>
                      <div className="col-cat">
                        <span className="badge category">{t.category}</span>
                      </div>
                      <div className="col-pri">
                        <span className={`badge priority-${t.priority || "medium"}`}>
                          {t.priority?.toUpperCase()}
                        </span>
                      </div>
                      <div className="col-date cell-mono">{t.due_date || "None"}</div>
                      <div className="col-sub cell-mono">
                        {(t.subtasks || []).length > 0
                          ? `${(t.subtasks || []).filter((s) => s.completed).length}/${(t.subtasks || []).length}`
                          : "None"}
                      </div>
                      <div className="col-status">
                        <select
                          className="table-status-select"
                          value={t.status}
                          onChange={(e) => handleQuickStatus(t, e.target.value)}
                        >
                          <option value="pending">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Completed</option>
                        </select>
                      </div>
                      <div className="col-actions cell-actions">
                        <button className="icon-btn-sm" onClick={() => handleOpenShare(t)} title="Share Task">
                          <Share2 size={13} />
                        </button>
                        <button className="icon-btn-sm" onClick={() => setEditingTask(t)} title="Edit Task">
                          <Edit3 size={13} />
                        </button>
                        <button className="icon-btn-sm danger" onClick={() => handleDeleteTask(t.id)} title="Delete Task">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* CREATE TASK MODAL */}
      {isCreateOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-card modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-heading">Create Task</h3>
                <p className="modal-subheading">Define project deliverables, assign category and timeline.</p>
              </div>
              <button className="icon-btn-ghost" onClick={() => setIsCreateOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="ui-form">
              <div className="form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Implement user authentication endpoint"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label>Description & Scope</label>
                <textarea
                  rows={3}
                  placeholder="Provide context, acceptance criteria, or implementation notes..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label>Category</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="pending">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Completed</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Estimated Minutes</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={newEstMinutes}
                    onChange={(e) => setNewEstMinutes(e.target.value)}
                  />
                </div>
              </div>

              {/* Subtasks Checklist */}
              <div className="form-group">
                <label>Subtasks</label>
                <div className="subtask-input-bar">
                  <input
                    type="text"
                    placeholder="Add step (e.g. Write integration test)..."
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubtask(false);
                      }
                    }}
                  />
                  <button type="button" className="btn-secondary btn-sm" onClick={() => handleAddSubtask(false)}>
                    <ListPlus size={14} />
                    <span>Add</span>
                  </button>
                </div>

                {newSubtasks.length > 0 && (
                  <div className="subtasks-tag-list">
                    {newSubtasks.map((st, i) => (
                      <div key={st.id || i} className="subtask-chip">
                        <span>{st.title}</span>
                        <button
                          type="button"
                          onClick={() => setNewSubtasks(newSubtasks.filter((_, idx) => idx !== i))}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={formSubmitting || !newTitle.trim()}>
                  {formSubmitting ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {editingTask && (
        <div className="modal-backdrop" onClick={() => setEditingTask(null)}>
          <div className="modal-card modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-heading">Edit Task</h3>
                <p className="modal-subheading">Update task properties, subtasks, or priority level.</p>
              </div>
              <button className="icon-btn-ghost" onClick={() => setEditingTask(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateTask} className="ui-form">
              <div className="form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description & Scope</label>
                <textarea
                  rows={3}
                  value={editingTask.description || ""}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                />
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={editingTask.category || "General"}
                    onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={editingTask.priority || "medium"}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editingTask.status || "pending"}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                  >
                    <option value="pending">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Completed</option>
                  </select>
                </div>
              </div>

              {/* Edit Subtasks */}
              <div className="form-group">
                <label>Subtasks</label>
                <div className="subtask-input-bar">
                  <input
                    type="text"
                    placeholder="Add step..."
                    value={editSubtaskInput}
                    onChange={(e) => setEditSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubtask(true);
                      }
                    }}
                  />
                  <button type="button" className="btn-secondary btn-sm" onClick={() => handleAddSubtask(true)}>
                    <ListPlus size={14} />
                    <span>Add</span>
                  </button>
                </div>

                {(editingTask.subtasks || []).length > 0 && (
                  <div className="subtasks-tag-list">
                    {(editingTask.subtasks || []).map((st, idx) => (
                      <div key={st.id || idx} className="subtask-chip">
                        <span>{st.title}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingTask({
                              ...editingTask,
                              subtasks: editingTask.subtasks.filter((_, i) => i !== idx)
                            })
                          }
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditingTask(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMAIL VERIFICATION MODAL */}
      {isVerifyModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsVerifyModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-heading">Verify Email Address</h3>
                <p className="modal-subheading">Enter the 6-digit confirmation code sent to {user?.email}.</p>
              </div>
              <button className="icon-btn-ghost" onClick={() => setIsVerifyModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {verifyError && (
              <div className="alert-banner error">
                <AlertCircle size={15} />
                <span>{verifyError}</span>
              </div>
            )}

            {verifyDevCodeNotice && (
              <div className="alert-banner info">
                <span>{verifyDevCodeNotice}</span>
              </div>
            )}

            <form onSubmit={handleVerifyEmailSubmit} className="ui-form">
              <div className="form-group">
                <label>Verification Code</label>
                <input
                  type="text"
                  placeholder="123456"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleSendVerification} disabled={verifyLoading}>
                  Resend Code
                </button>
                <button type="submit" className="btn-primary" disabled={verifyLoading || !verifyCode.trim()}>
                  {verifyLoading ? "Verifying..." : "Verify Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK SHARING & COLLABORATION MODAL */}
      {sharingTask && (
        <div className="modal-backdrop" onClick={() => setSharingTask(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-heading">Share Task</h3>
                <p className="modal-subheading">Collaborate on &ldquo;{sharingTask.title}&rdquo; with team members.</p>
              </div>
              <button className="icon-btn-ghost" onClick={() => setSharingTask(null)}>
                <X size={16} />
              </button>
            </div>

            {shareError && (
              <div className="alert-banner error">
                <AlertCircle size={15} />
                <span>{shareError}</span>
              </div>
            )}

            {!sharingTask.is_shared ? (
              <form onSubmit={handleShareSubmit} className="ui-form">
                {/* Share Via Direct Invite Link */}
                <div className="form-group" style={{ marginBottom: "18px" }}>
                  <label>Direct Task Share Link</label>
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/#task-${sharingTask.id}`}
                      style={{ background: "var(--surface-subtle)", color: "var(--text-muted)", fontSize: "12px", fontFamily: "var(--font-mono)" }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ flexShrink: 0, padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/#task-${sharingTask.id}`);
                        showToast("Task invite link copied to clipboard!");
                      }}
                    >
                      <Copy size={13} />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Collaborator User ID, Username or Email</label>
                  <label>Or Delegate to User ID, Username or Email</label>
                  <input
                    type="text"
                    placeholder="Enter User ID (e.g. 5), username, or email"
                    value={shareCollaborator}
                    onChange={(e) => setShareCollaborator(e.target.value)}
                    autoFocus
                    required
                  />
                  <p style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                    Tip: Enter a colleague&apos;s numeric User ID (displayed in their topbar) for instant sharing.
                  </p>
                </div>

                <div className="form-group">
                  <label>Permission Level</label>
                  <select value={sharePermission} onChange={(e) => setSharePermission(e.target.value)}>
                    <option value="edit">Can Edit & Complete Subtasks</option>
                    <option value="view">View Only</option>
                  </select>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setSharingTask(null)}>
                    Done
                  </button>
                  <button type="submit" className="btn-primary" disabled={shareLoading || !shareCollaborator.trim()}>
                    <Share2 size={13} />
                    <span>{shareLoading ? "Sharing..." : "Invite Collaborator"}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="share-info-box" style={{ padding: "12px 0" }}>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  This task was shared with you by <strong>@{sharingTask.owner_username}</strong> (User ID: #{sharingTask.user_id}).
                </p>
                <div className="modal-footer" style={{ marginTop: "16px" }}>
                  <button type="button" className="btn-secondary" onClick={() => setSharingTask(null)}>
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Existing Collaborators List */}
            {(sharingTask.collaborators || []).length > 0 && (
              <div className="share-collaborators-section">
                <h4 className="share-section-title">Active Collaborators ({sharingTask.collaborators.length})</h4>
                <div className="collaborators-list">
                  {sharingTask.collaborators.map((c) => (
                    <div key={c.id} className="collaborator-item">
                      <div className="collab-details">
                        <span className="collab-name">
                          @{c.username} <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#38bdf8" }}>ID: #{c.id}</span>
                        </span>
                        <span className="collab-email">{c.email}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="collab-perm">{c.permission}</span>
                        {!sharingTask.is_shared && (
                          <button
                            type="button"
                            className="btn-revoke"
                            onClick={() => handleRevokeShare(sharingTask.id, c.id)}
                            title="Revoke access"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// COMPONENT: Executive Task Card (No AI Slop / Grounded Architecture)
// =========================================================================
function TaskCard({ task, onEdit, onDelete, onMove, onToggleSubtask, onShare }) {
  const isDone = task.status === "done";
  const subtasks = task.subtasks || [];
  const completedSubs = subtasks.filter((s) => s.completed).length;

  return (
    <div className={`task-card ${isDone ? "completed" : ""}`}>
      {/* Top Metadata Row */}
      <div className="card-meta-row">
        <div className="card-badges">
          <span className={`badge priority-${task.priority || "medium"}`}>
            {task.priority?.toUpperCase()}
          </span>
          <span className="badge category">{task.category || "General"}</span>

          {task.is_shared && (
            <span className="badge shared" title={`Shared by @${task.owner_username}`}>
              <Users size={10} />
              <span>@{task.owner_username}</span>
            </span>
          )}

          {!task.is_shared && (task.collaborators || []).length > 0 && (
            <span className="badge collaborator-count" title={`Shared with ${task.collaborators.length} collaborator(s)`}>
              <Users size={10} />
              <span>{task.collaborators.length} shared</span>
            </span>
          )}
        </div>

        <div className="card-actions">
          <button className="icon-btn-sm" onClick={onShare} title={task.is_shared ? "View Collaborators" : "Share Task"}>
            <Share2 size={13} />
          </button>
          <button className="icon-btn-sm" onClick={onEdit} title="Edit Task">
            <Edit3 size={13} />
          </button>
          {!task.is_shared && (
            <button className="icon-btn-sm danger" onClick={onDelete} title="Delete Task">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Task Heading & Brief */}
      <h4 className="card-title">{task.title}</h4>
      {task.description && <p className="card-desc">{task.description}</p>}

      {/* Subtasks Checklist */}
      {subtasks.length > 0 && (
        <div className="card-subtasks">
          <div className="subtasks-summary">
            <span>Subtasks</span>
            <span className="subtasks-counter">{completedSubs}/{subtasks.length}</span>
          </div>

          <div className="subtasks-list">
            {subtasks.map((st) => (
              <button
                key={st.id}
                type="button"
                className={`subtask-item ${st.completed ? "completed" : ""}`}
                onClick={() => onToggleSubtask(st.id)}
              >
                {st.completed ? <CheckSquare size={13} /> : <Square size={13} />}
                <span>{st.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Card Footer: Timeline & Quick Status Actions */}
      <div className="card-footer">
        <div className="timeline-info">
          {task.due_date && (
            <span className="due-date">
              <Calendar size={11} />
              <span>{task.due_date}</span>
            </span>
          )}
          <span className="duration">
            <Clock size={11} />
            <span>{task.estimated_minutes || 30}m</span>
          </span>
        </div>

        <div className="status-actions">
          {task.status === "pending" && (
            <button className="action-btn" onClick={() => onMove("in_progress")}>
              <span>Start</span>
              <ChevronRight size={12} />
            </button>
          )}

          {task.status === "in_progress" && (
            <>
              <button className="action-btn-ghost" onClick={() => onMove("pending")} title="Move back to To Do">
                <span>To Do</span>
              </button>
              <button className="action-btn primary" onClick={() => onMove("done")}>
                <Check size={12} />
                <span>Complete</span>
              </button>
            </>
          )}

          {task.status === "done" && (
            <button className="action-btn-ghost" onClick={() => onMove("pending")}>
              <span>Reopen</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
