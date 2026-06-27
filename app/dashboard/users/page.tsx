"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Users, Coins, Plus, ShieldAlert, RefreshCw, Search, Filter,
  ArrowUpDown, Star, Key, Lock, CheckCircle2, UserCheck, ShieldPlus
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import {
  getUserWiseStatsAction,
  grantTokensAction,
  updateUserRoleAction,
  toggleUserStatusAction,
  UserStatsRow
} from "../../actions/token-actions";

export default function UserManagementPage() {
  const { userEmail, userRole, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const [users, setUsers] = useState<UserStatsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Manual Grant Modal/Form States
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState(50);
  const [grantDesc, setGrantDesc] = useState("Promotional balance load");
  const [isGranting, setIsGranting] = useState(false);
  const [grantSuccess, setGrantSuccess] = useState<string | null>(null);

  // Role toggle loading state
  const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!userEmail || userRole !== "SUPERADMIN") return;
    setLoading(true);
    const res = await getUserWiseStatsAction(userEmail);
    if (res.success && res.stats) {
      setUsers(res.stats);
    }
    setLoading(false);
  }, [userEmail, userRole]);

  useEffect(() => {
    if (isReady && userEmail && userRole === "SUPERADMIN") {
      loadUsers();
    }
  }, [isReady, userEmail, userRole, loadUsers]);

  if (!isReady) return null;

  // Gate access to SUPERADMIN role
  if (userRole !== "SUPERADMIN") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: "70vh", padding: 24, gap: 16
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, background: "rgba(239, 68, 68, 0.08)",
          border: "2.5px solid #ef4444", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444"
        }}>
          <ShieldAlert size={36} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 900, fontFamily: "var(--handwriting-font)", margin: 0 }}>
          Access Denied
        </h2>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", maxWidth: 360, textAlign: "center", margin: 0 }}>
          This page requires **SUPERADMIN** permissions. Please contact support or log in using administrative credentials.
        </p>
      </div>
    );
  }

  // Handle Token Grant Form Submission
  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserEmail || grantAmount <= 0) return;
    setIsGranting(true);
    setGrantSuccess(null);

    const res = await grantTokensAction(userEmail!, selectedUserEmail, grantAmount, grantDesc);
    if (res.success) {
      setGrantSuccess(`Successfully granted ${grantAmount} tokens to ${selectedUserEmail}!`);
      // Reload stats
      await loadUsers();
      setTimeout(() => {
        setGrantSuccess(null);
        setSelectedUserEmail(null);
        setSelectedUserName(null);
        setGrantAmount(50);
        setGrantDesc("Promotional balance load");
      }, 2000);
    } else {
      alert("Failed to grant tokens: " + res.error);
    }
    setIsGranting(false);
  };

  // Handle User Status toggles (Deactivate / Activate)
  const [updatingStatusFor, setUpdatingStatusFor] = useState<string | null>(null);
  const handleToggleStatus = async (targetEmail: string, currentStatus: string) => {
    const actionText = currentStatus === "ACTIVE" ? "Deactivate" : "Activate";
    if (!confirm(`Are you sure you want to ${actionText} the account ${targetEmail}?`)) return;

    setUpdatingStatusFor(targetEmail);
    const res = await toggleUserStatusAction(userEmail!, targetEmail, currentStatus);
    if (res.success) {
      await loadUsers();
    } else {
      alert("Failed to toggle status: " + res.error);
    }
    setUpdatingStatusFor(null);
  };

  // Handle User Role Updates
  const handleToggleRole = async (targetEmail: string, currentRole: string) => {
    const nextRole = currentRole === "SUPERADMIN" ? "Developer" : "SUPERADMIN";
    const confirmMsg = currentRole === "SUPERADMIN"
      ? `Are you sure you want to demote ${targetEmail} to Developer?`
      : `Are you sure you want to promote ${targetEmail} to SUPERADMIN?`;
      
    if (!confirm(confirmMsg)) return;

    setUpdatingRoleFor(targetEmail);
    const res = await updateUserRoleAction(userEmail!, targetEmail, nextRole);
    if (res.success) {
      await loadUsers();
    } else {
      alert("Failed to update role: " + res.error);
    }
    setUpdatingRoleFor(null);
  };

  // Filtered list
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    
    if (filterRole === "admin" && u.email !== "superadmin@example.com" && u.email !== "admin@props.ai") {
      // rough heuristic check
      return matchesQuery && (u.email.includes("admin") || u.email === "superadmin@example.com");
    }
    return matchesQuery;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Users size={18} color="#fff" />
            </div>
            User Credit &amp; Role Management
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0 44px" }}>
            Monitor credit balances, toggle user administration permissions, and grant adhoc tokens globally.
          </p>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
            borderRadius: 10, border: "2.5px solid var(--foreground)", background: "var(--card)",
            color: "var(--foreground)", fontSize: 13, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "3px 3px 0px 0px var(--foreground)",
            transition: "all 0.1s"
          }}
          onMouseEnter={e => { if(!loading) e.currentTarget.style.transform = "translate(-1px,-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}
        >
          <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          <span>Sync Users</span>
        </button>
      </div>

      {/* Stats Summary Bento Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <div className="bento-card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(99,102,241,0.08)", border: "1.5px solid #6366f1", display: "flex", alignItems: "center", justifyContent: "center", color: "#6366f1" }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 800, textTransform: "uppercase" }}>Registered Users</div>
            <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "var(--handwriting-font)" }}>{users.length}</div>
          </div>
        </div>

        <div className="bento-card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1.5px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center", color: "#22c55e" }}>
            <Coins size={20} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 800, textTransform: "uppercase" }}>Total Balances</div>
            <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "var(--handwriting-font)" }}>
              {users.reduce((sum, u) => sum + u.tokenBalance, 0)} Tokens
            </div>
          </div>
        </div>

        <div className="bento-card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1.5px solid #f59e0b", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b" }}>
            <RefreshCw size={20} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 800, textTransform: "uppercase" }}>Total AI Operations</div>
            <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "var(--handwriting-font)" }}>
              {users.reduce((sum, u) => sum + u.totalCalls, 0)} Runs
            </div>
          </div>
        </div>
      </div>

      {/* Users management table */}
      <div className="bento-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        
        {/* Search & filters */}
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative", maxWidth: 300, width: "100%" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search users by name/email..."
              className="glow-input"
              style={{ paddingLeft: 32, fontSize: 13 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              style={{
                height: 38, borderRadius: 8, fontSize: 12.5, padding: "0 12px",
                border: "2.5px solid var(--foreground)", background: "var(--card)", cursor: "pointer", outline: "none",
                fontWeight: 800, boxShadow: "1.5px 1.5px 0px 0px var(--foreground)"
              }}
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrators</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div style={{ border: "2.5px solid var(--foreground)", borderRadius: 12, overflow: "hidden", boxShadow: "3px 3px 0px 0px var(--foreground)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--input)", borderBottom: "2px solid var(--foreground)" }}>
                <th style={{ padding: "12px 14px", fontWeight: 800 }}>User name &amp; Email</th>
                <th style={{ padding: "12px 14px", fontWeight: 800 }}>Role</th>
                <th style={{ padding: "12px 14px", fontWeight: 800, textAlign: "right" }}>Token Balance</th>
                <th style={{ padding: "12px 14px", fontWeight: 800, textAlign: "right" }}>AI Calls Run</th>
                <th style={{ padding: "12px 14px", fontWeight: 800, textAlign: "right" }}>Actual API cost</th>
                <th style={{ padding: "12px 14px", fontWeight: 800, textAlign: "right" }}>Total Purchases</th>
                <th style={{ padding: "12px 14px", fontWeight: 800, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)" }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                    <span>Loading platform users database...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)" }}>
                    No users match search filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const initials = u.name
                    .split(" ")
                    .map(n => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "US";

                  // determine role dynamically from database role property
                  const isUserAdmin = u.role === "SUPERADMIN";

                  return (
                    <tr key={u.email} style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
                      {/* Name / Email */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: "linear-gradient(135deg, #6366f1, #a855f7)",
                            color: "#fff", display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: 11, fontWeight: "bold"
                          }}>
                            {initials}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 700 }}>{u.name}</span>
                            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role & Status */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                          <span style={{
                            padding: "2px 6px", borderRadius: 4, fontSize: 9.5, fontWeight: 800, textTransform: "uppercase",
                            background: isUserAdmin ? "rgba(168,85,247,0.08)" : "rgba(107,114,128,0.08)",
                            color: isUserAdmin ? "#a855f7" : "var(--muted-foreground)",
                            border: `1.5px solid ${isUserAdmin ? "#a855f7" : "var(--border)"}`
                          }}>
                            {isUserAdmin ? "SUPERADMIN" : "Developer"}
                          </span>
                          <span style={{
                            padding: "1px 5px", borderRadius: 4, fontSize: 9, fontWeight: 800, textTransform: "uppercase",
                            background: u.status === "ACTIVE" ? "rgba(34,197,94,0.08)" : u.status === "INACTIVE" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
                            color: u.status === "ACTIVE" ? "#22c55e" : u.status === "INACTIVE" ? "#ef4444" : "#f59e0b",
                            border: `1.5px solid ${u.status === "ACTIVE" ? "#22c55e" : u.status === "INACTIVE" ? "#ef4444" : "#f59e0b"}`
                          }}>
                            {u.status}
                          </span>
                        </div>
                      </td>

                      {/* Token Balance */}
                      <td style={{ padding: "12px 14px", fontWeight: 800, textAlign: "right" }}>
                        <span style={{
                          padding: "3px 8px", borderRadius: 6,
                          background: u.tokenBalance > 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                          color: u.tokenBalance > 0 ? "#22c55e" : "#ef4444",
                          border: `1.5px solid ${u.tokenBalance > 0 ? "#22c55e" : "#ef4444"}`
                        }}>
                          {u.tokenBalance} Tokens
                        </span>
                      </td>

                      {/* AI Calls Run */}
                      <td style={{ padding: "12px 14px", fontWeight: 700, textAlign: "right" }}>
                        {u.totalCalls} runs
                      </td>

                      {/* Actual API Cost */}
                      <td style={{ padding: "12px 14px", fontWeight: 800, textAlign: "right", color: "#ef4444" }}>
                        ₹{u.actualCostInr.toFixed(2)}
                      </td>

                      {/* Total Purchases */}
                      <td style={{ padding: "12px 14px", fontWeight: 800, textAlign: "right", color: "#22c55e" }}>
                        ₹{u.revenueInr.toFixed(2)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button
                            onClick={() => {
                              setSelectedUserEmail(u.email);
                              setSelectedUserName(u.name);
                            }}
                            style={{
                              padding: "4px 8px", fontSize: 11, fontWeight: 800,
                              borderRadius: 6, border: "1.5px solid var(--foreground)",
                              background: "#10b981", color: "#fff", cursor: "pointer",
                              boxShadow: "1px 1px 0px 0px var(--foreground)"
                            }}
                          >
                            Grant
                          </button>
                          
                          {/* Toggle role button (exclude self) */}
                          {u.email !== userEmail && (
                            <>
                              <button
                                disabled={updatingRoleFor === u.email}
                                onClick={() => handleToggleRole(u.email, isUserAdmin ? "SUPERADMIN" : "Developer")}
                                style={{
                                  padding: "4px 8px", fontSize: 11, fontWeight: 800,
                                  borderRadius: 6, border: "1.5px solid var(--foreground)",
                                  background: isUserAdmin ? "var(--input)" : "#a855f7",
                                  color: isUserAdmin ? "var(--foreground)" : "#fff",
                                  cursor: "pointer", boxShadow: "1px 1px 0px 0px var(--foreground)"
                                }}
                              >
                                {updatingRoleFor === u.email ? "..." : (isUserAdmin ? "Demote" : "Promote")}
                              </button>

                              <button
                                disabled={updatingStatusFor === u.email}
                                onClick={() => handleToggleStatus(u.email, u.status)}
                                style={{
                                  padding: "4px 8px", fontSize: 11, fontWeight: 800,
                                  borderRadius: 6, border: "1.5px solid var(--foreground)",
                                  background: u.status === "ACTIVE" ? "#ef4444" : "#10b981",
                                  color: "#fff",
                                  cursor: "pointer", boxShadow: "1px 1px 0px 0px var(--foreground)"
                                }}
                              >
                                {updatingStatusFor === u.email ? "..." : (u.status === "ACTIVE" ? "Deactivate" : "Activate")}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Manual Credits Modal Popup */}
      {selectedUserEmail && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16
        }}>
          <div style={{
            background: "var(--card)", border: "3px solid var(--foreground)", borderRadius: 16,
            boxShadow: "6px 6px 0px 0px var(--foreground)", maxWidth: 440, width: "100%", padding: 24,
            display: "flex", flexDirection: "column", gap: 16, animation: "fadeSlideIn 0.2s ease"
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, fontFamily: "var(--handwriting-font)", margin: 0 }}>
              Allocate Tokens to {selectedUserName}
            </h3>

            {grantSuccess ? (
              <div style={{
                background: "rgba(34, 197, 94, 0.08)", border: "2px solid #22c55e",
                borderRadius: 8, padding: 10, color: "#22c55e", fontSize: 12.5, fontWeight: 700
              }}>
                {grantSuccess}
              </div>
            ) : (
              <form onSubmit={handleGrantSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 800 }}>Account Email</label>
                  <input type="email" disabled value={selectedUserEmail} className="glow-input" style={{ opacity: 0.6 }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 800 }}>Amount of Tokens</label>
                  <input
                    type="number" required min="1"
                    value={grantAmount}
                    onChange={e => setGrantAmount(parseInt(e.target.value))}
                    className="glow-input"
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 800 }}>Reason / Description</label>
                  <input
                    type="text" required
                    value={grantDesc}
                    onChange={e => setGrantDesc(e.target.value)}
                    placeholder="E.g. Bonus customer credits"
                    className="glow-input"
                  />
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => { setSelectedUserEmail(null); setSelectedUserName(null); }}
                    style={{
                      padding: "8px 14px", border: "2px solid var(--foreground)", borderRadius: 8,
                      background: "var(--card)", fontSize: 12, fontWeight: 800, cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGranting}
                    style={{
                      padding: "8px 14px", border: "2px solid var(--foreground)", borderRadius: 8,
                      background: "#10b981", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer",
                      boxShadow: "2px 2px 0px 0px var(--foreground)"
                    }}
                  >
                    {isGranting ? "Crediting..." : "Grant Tokens"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
