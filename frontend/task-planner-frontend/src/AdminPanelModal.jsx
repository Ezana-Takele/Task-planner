import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  Trash2,
  Search,
  X,
  RefreshCw,
  UserCheck,
  UserX,
  AlertCircle
} from "lucide-react";
import { apiRequest } from "./services/api";

export default function AdminPanelModal({ isOpen, onClose, showToast }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadAdminData();
    }
  }, [isOpen]);

  const loadAdminData = async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, usersRes] = await Promise.all([
        apiRequest("/admin/stats"),
        apiRequest(`/admin/users?search=${encodeURIComponent(search)}&role=${roleFilter}&status=${statusFilter}`)
      ]);
      setStats(statsRes.stats);
      setUsers(usersRes.users || []);
    } catch (err) {
      console.error("Admin load error:", err);
      setError(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (user) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    if (!window.confirm(`Are you sure you want to change @${user.username}'s role to ${nextRole.toUpperCase()}?`)) {
      return;
    }

    setActionLoadingId(user.id);
    try {
      await apiRequest(`/admin/users/${user.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole })
      });
      showToast(`User @${user.username} is now ${nextRole}`);
      loadAdminData();
    } catch (err) {
      showToast(err.message || "Failed to update role", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleVerify = async (user) => {
    const nextStatus = !user.is_verified;
    setActionLoadingId(user.id);
    try {
      await apiRequest(`/admin/users/${user.id}/verify`, {
        method: "PATCH",
        body: JSON.stringify({ is_verified: nextStatus })
      });
      showToast(`User @${user.username} verification updated`);
      loadAdminData();
    } catch (err) {
      showToast(err.message || "Failed to update verification", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`PERMANENT ACTION: Delete user @${user.username} and all their tasks?`)) {
      return;
    }

    setActionLoadingId(user.id);
    try {
      await apiRequest(`/admin/users/${user.id}`, {
        method: "DELETE"
      });
      showToast(`User @${user.username} deleted`);
      loadAdminData();
    } catch (err) {
      showToast(err.message || "Failed to delete user", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card admin-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "860px", width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "rgba(37, 99, 235, 0.15)", padding: "8px", borderRadius: "8px", color: "#38bdf8" }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="modal-heading" style={{ fontSize: "18px", margin: 0 }}>Executive Admin Control Panel</h3>
              <p className="modal-subheading" style={{ fontSize: "12px", margin: 0 }}>
                PostgreSQL Live Database Overview & User Permission Management
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button className="icon-btn-ghost" onClick={loadAdminData} title="Refresh Live Data" disabled={loading}>
              <RefreshCw size={15} className={loading ? "spin" : ""} />
            </button>
            <button className="icon-btn-ghost" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {error && (
          <div className="alert-banner error" style={{ margin: "12px 0" }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Content Scroll Area */}
        <div style={{ overflowY: "auto", paddingRight: "4px", flex: 1, marginTop: "12px" }}>
          {/* Metrics Grid */}
          {stats && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "10px",
                marginBottom: "20px"
              }}
            >
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Total Users</span>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#38bdf8", marginTop: "2px" }}>{stats.totalUsers}</div>
              </div>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Verified Users</span>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#10b981", marginTop: "2px" }}>{stats.verifiedUsers}</div>
              </div>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Total Tasks</span>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#f59e0b", marginTop: "2px" }}>{stats.totalTasks}</div>
              </div>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Completed Tasks</span>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#10b981", marginTop: "2px" }}>{stats.completedTasks}</div>
              </div>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Completion Rate</span>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#a855f7", marginTop: "2px" }}>{stats.completionRate}%</div>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "11px", color: "var(--text-dim)" }} />
              <input
                type="text"
                placeholder="Search username or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadAdminData()}
                style={{
                  width: "100%",
                  paddingLeft: "32px",
                  paddingRight: "10px",
                  paddingTop: "7px",
                  paddingBottom: "7px",
                  borderRadius: "6px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-main)",
                  fontSize: "12px"
                }}
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setTimeout(loadAdminData, 50); }}
              style={{ padding: "7px 10px", borderRadius: "6px", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-main)", fontSize: "12px" }}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins Only</option>
              <option value="user">Users Only</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setTimeout(loadAdminData, 50); }}
              style={{ padding: "7px 10px", borderRadius: "6px", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-main)", fontSize: "12px" }}
            >
              <option value="all">All Verification</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Unverified Only</option>
            </select>
          </div>

          {/* Users Table */}
          <div style={{ overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid var(--border-color)", color: "var(--text-dim)" }}>
                  <th style={{ padding: "10px 12px" }}>User</th>
                  <th style={{ padding: "10px 12px" }}>Role</th>
                  <th style={{ padding: "10px 12px" }}>Status</th>
                  <th style={{ padding: "10px 12px" }}>Tasks</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isPrimaryAdmin = u.email === "drtakeleezana@gmail.com";
                  const isCurrentAction = actionLoadingId === u.id;
                  return (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: "600", color: "var(--text-main)" }}>
                          @{u.username} <span style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "monospace" }}>#{u.id}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>{u.email}</div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "10.5px",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            background: u.role === "admin" ? "rgba(239, 68, 68, 0.15)" : "rgba(100, 116, 139, 0.15)",
                            color: u.role === "admin" ? "#f87171" : "var(--text-muted)",
                            border: u.role === "admin" ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid var(--border-color)"
                          }}
                        >
                          {u.role || "user"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            color: u.is_verified ? "#10b981" : "#f59e0b"
                          }}
                        >
                          {u.is_verified ? <ShieldCheck size={13} /> : <AlertCircle size={13} />}
                          {u.is_verified ? "Verified" : "Unverified"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontWeight: "600", color: "#38bdf8" }}>{u.task_count}</span>
                        <span style={{ fontSize: "11px", color: "var(--text-dim)" }}> ({u.completed_task_count} done)</span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          {/* Role Toggle */}
                          {!isPrimaryAdmin && (
                            <button
                              onClick={() => handleToggleRole(u)}
                              disabled={isCurrentAction}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                cursor: "pointer",
                                border: "1px solid var(--border-color)",
                                background: "var(--bg-card)",
                                color: u.role === "admin" ? "#f87171" : "#38bdf8"
                              }}
                              title={u.role === "admin" ? "Demote to User" : "Promote to Admin"}
                            >
                              {u.role === "admin" ? "Demote" : "Promote"}
                            </button>
                          )}

                          {/* Verify Toggle */}
                          <button
                            onClick={() => handleToggleVerify(u)}
                            disabled={isCurrentAction}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              cursor: "pointer",
                              border: "1px solid var(--border-color)",
                              background: "var(--bg-card)",
                              color: u.is_verified ? "#f59e0b" : "#10b981"
                            }}
                            title={u.is_verified ? "Mark Unverified" : "Mark Verified"}
                          >
                            {u.is_verified ? "Unverify" : "Verify"}
                          </button>

                          {/* Delete */}
                          {!isPrimaryAdmin && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={isCurrentAction}
                              style={{
                                padding: "4px 6px",
                                borderRadius: "4px",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                background: "rgba(239, 68, 68, 0.1)",
                                color: "#f87171",
                                cursor: "pointer"
                              }}
                              title="Delete User"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "24px", color: "var(--text-dim)" }}>
                      No users match your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
            Connected to <strong>Neon PostgreSQL Cloud (AWS us-east-2)</strong>
          </span>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}