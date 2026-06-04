"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Lock, 
  ShieldCheck, 
  AlertTriangle, 
  LogOut, 
  Globe, 
  ArrowLeft,
  Eye,
  EyeOff,
  RotateCcw
} from "lucide-react";
import { 
  getStudioProjects, 
  saveStudioProject, 
  deleteStudioProject, 
  seedStudioProjects,
  authenticateStudioAdmin,
  StudioProjectData 
} from "@/app/actions/studio";
import styles from "./page.module.css";

const DEFAULT_PROJECTS = [
  {
    id: "schools24-pilot",
    name: "Schools24 Administrative Core",
    client: "Oakridge International School",
    status: "ACTIVE",
    latency: "4.8ms",
    url: "https://schools24.in",
    passwordHash: "configured-in-admin",
  },
  {
    id: "stores24-erp",
    name: "Stores24 POS Settlement Portal",
    client: "Vemgal Mart Group",
    status: "ACTIVE",
    latency: "6.2ms",
    url: "https://stores24.bluevolt.group",
    passwordHash: "configured-in-admin",
  },
  {
    id: "project-nexus",
    name: "Autonomous Logistics Node",
    client: "Alpha Logistics Solutions",
    status: "PENDING",
    latency: "--",
    url: "https://bluevolt.group",
    passwordHash: "configured-in-admin",
  }
];

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Dashboard Projects State
  const [projects, setProjects] = useState<StudioProjectData[]>([]);
  
  // Project Node Form States
  const [client, setClient] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [passwordHash, setPasswordHash] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "PENDING">("ACTIVE");
  const [latency, setLatency] = useState("4.5ms");
  
  const [editingProject, setEditingProject] = useState<StudioProjectData | null>(null);
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");
  
  // Toggle password visibility in dashboard lists
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});

  // Sync state on client mount
  useEffect(() => {
    setMounted(true);
    
    // Check session authentication
    const authSession = sessionStorage.getItem("bluevolt_admin_logged_in");
    if (authSession === "true") {
      setIsLoggedIn(true);
    }
    
    // Load projects from cloud database
    refreshProjects();
  }, []);

  const refreshProjects = () => {
    getStudioProjects()
      .then((data) => {
        setProjects(data);
      })
      .catch((err) => {
        console.error("Failed to load studio projects from database", err);
        setProjects(DEFAULT_PROJECTS);
      });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const result = await authenticateStudioAdmin({ email: loginEmail, password: loginPassword });
    if (result.success) {
      sessionStorage.setItem("bluevolt_admin_logged_in", "true");
      setIsLoggedIn(true);
      setLoginEmail("");
      setLoginPassword("");
    } else {
      setLoginError(result.message || "ACCESS DENIED. INVALID SECURITY SIGNATURE NODE.");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("bluevolt_admin_logged_in");
    setIsLoggedIn(false);
    setEditingProject(null);
    clearForm();
  };

  const clearForm = () => {
    setClient("");
    setName("");
    setUrl("");
    setPasswordHash("");
    setStatus("ACTIVE");
    setLatency("4.5ms");
    setEditingProject(null);
  };

  const handleStartEdit = (project: StudioProjectData) => {
    setEditingProject(project);
    setClient(project.client);
    setName(project.name);
    setUrl(project.url);
    setPasswordHash(project.passwordHash);
    setStatus(project.status === "PENDING" ? "PENDING" : "ACTIVE");
    setLatency(project.latency || "4.5ms");
    setFormSuccess("");
    setFormError("");
  };

  const handleAbortEdit = () => {
    clearForm();
    setFormSuccess("");
    setFormError("");
  };

  const handleDelete = async (id: string) => {
    setFormError("");
    setFormSuccess("");
    
    const result = await deleteStudioProject(id);
    if (result.success) {
      setFormSuccess("WORKSPACE NODE DECOMMISSIONED SUCCESSFULLY FROM CLOUD DATABASE.");
      refreshProjects();
      if (editingProject?.id === id) {
        clearForm();
      }
    } else {
      setFormError(result.message);
    }
  };

  const handleRestoreDefaults = async () => {
    setFormError("");
    setFormSuccess("");
    
    if (confirm("Are you sure you want to reset all workspace nodes in the database to the original defaults? This will erase all custom configurations!")) {
      const result = await seedStudioProjects();
      if (result.success) {
        setFormSuccess("DEFAULT WORKSPACE NODES SUCCESSFULLY RESTORED IN NEON DATABASE.");
        refreshProjects();
      } else {
        setFormError(result.message);
      }
    }
  };

  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!client.trim() || !name.trim() || !url.trim() || !passwordHash.trim()) {
      setFormError("All workspace node fields are mandatory.");
      return;
    }

    let nodeId = "";
    let finalLatency = status === "PENDING" ? "--" : latency;

    if (editingProject) {
      nodeId = editingProject.id;
    } else {
      nodeId = client.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4);
      if (status === "ACTIVE" && latency === "4.5ms") {
        finalLatency = (Math.random() * 5 + 3).toFixed(1) + "ms";
      }
    }

    const payload: StudioProjectData = {
      id: nodeId,
      client: client.trim(),
      name: name.trim(),
      url: url.trim(),
      passwordHash: passwordHash.trim(),
      status: status,
      latency: finalLatency
    };

    const result = await saveStudioProject(payload);
    if (result.success) {
      setFormSuccess(editingProject 
        ? `WORKSPACE NODE "${name}" UPDATED SUCCESSFULLY IN CLOUD DATABASE.` 
        : `WORKSPACE NODE "${name}" DEPLOYED SUCCESSFULLY TO NEON POSTGRESQL.`
      );
      clearForm();
      refreshProjects();
    } else {
      setFormError(result.message);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (!mounted) {
    return (
      <main className={styles.adminWrapper}>
        <div className={styles.structuralGrid} />
        <div className={styles.content} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            INITIALIZING SECURE CLOUD SHELL CONNECTOR...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.adminWrapper}>
      {/* Background Tech Grids & Neon Backlights */}
      <div className={styles.structuralGrid} />
      <div className={styles.glowLeft} />
      <div className={styles.glowRight} />

      <div className={styles.content}>
        
        {/* SECURE LOGIN CARD */}
        {!isLoggedIn ? (
          <div className={styles.loginContainer}>
            <div className={styles.loginCard}>
              <div className={styles.loginTitle}>
                <Lock size={22} style={{ color: "#f59e0b" }} />
                <span>Admin Gateway</span>
              </div>
              <p className={styles.loginSubtitle}>SYS SECURITY CLOUD ACCESS</p>

              {loginError && (
                <div className={styles.errorBanner}>
                  <AlertTriangle size={14} />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="email">Security Token (Email)</label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="name@schools24.in"
                    className={styles.formInput}
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="password">Institutional Signature Key</label>
                  <input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••••••"
                    className={styles.formInput}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>

                <button type="submit" className={styles.btnBlock}>
                  Authorize Admin Node
                </button>
                
                <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                  <Link href="/studio" style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    <ArrowLeft size={10} /> ABORT TO STUDIO
                  </Link>
                </div>
              </form>
            </div>
          </div>
        ) : (
          
          /* AUTHENTICATED ADMIN CONSOLE */
          <div>
            <header className={styles.dashHeader}>
              <div className={styles.dashTitleArea}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "#00ff66", marginBottom: "0.8rem" }}>
                  <span style={{ display: "inline-block", width: "6px", height: "6px", backgroundColor: "#00ff66", borderRadius: "50%", boxShadow: "0 0 8px #00ff66" }} />
                  <span>SYS CORE LEVEL: SECURE CLOUD CONNECTION OPERATIONAL</span>
                </div>
                <h1>Studio Control Panel</h1>
                <p>Manage and deploy client sandboxes in live cloud database.</p>
              </div>
              
              <div style={{ display: "flex", gap: "1rem" }}>
                <button 
                  className={styles.btnLogout} 
                  onClick={handleRestoreDefaults}
                  style={{ borderColor: "rgba(0, 210, 255, 0.25)", color: "var(--neon-blue)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(0, 210, 255, 0.03)";
                    e.currentTarget.style.borderColor = "var(--neon-blue)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderColor = "rgba(0, 210, 255, 0.25)";
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                    <RotateCcw size={12} /> RESTORE DEFAULTS
                  </span>
                </button>
                <button className={styles.btnLogout} onClick={handleLogout}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                    <LogOut size={12} /> TERMINATE SESSION
                  </span>
                </button>
              </div>
            </header>

            {/* Dashboard Grid */}
            <div className={styles.dashGrid}>
              
              {/* LEFT COLUMN: CRUD FORM */}
              <div>
                <h2 className={styles.panelTitle}>
                  {editingProject ? `Edit Workspace Node` : "Deploy Workspace Node"}
                </h2>
                
                <div className={styles.formCard}>
                  {formSuccess && (
                    <div style={{ color: "#00ff66", border: "1px solid rgba(0,255,102,0.15)", background: "rgba(0,255,102,0.02)", padding: "0.8rem 1.2rem", borderRadius: "6px", fontSize: "0.72rem", fontFamily: "var(--font-mono)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <ShieldCheck size={14} />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  {formError && (
                    <div className={styles.errorBanner}>
                      <AlertTriangle size={14} />
                      <span>{formError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveNode}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Client Enterprise Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Oakridge International School"
                        className={styles.formInput}
                        value={client}
                        onChange={(e) => setClient(e.target.value)}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Project System Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Schools24 Administrative Core"
                        className={styles.formInput}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Redirect Node Destination (URL)</label>
                      <input
                        type="url"
                        required
                        placeholder="https://schools24.in"
                        className={styles.formInput}
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Cryptographic Access Key (Password)</label>
                      <input
                        type="text"
                        required
                        placeholder="Set password for redirect gateway..."
                        className={styles.formInput}
                        value={passwordHash}
                        onChange={(e) => setPasswordHash(e.target.value)}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Deployment Node Status</label>
                      <select 
                        className={styles.formInput}
                        style={{ appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}
                        value={status}
                        onChange={(e) => setStatus(e.target.value as "ACTIVE" | "PENDING")}
                      >
                        <option value="ACTIVE" style={{ background: "#050505" }}>ACTIVE / OPERATIONAL</option>
                        <option value="PENDING" style={{ background: "#050505" }}>PENDING / STAGED</option>
                      </select>
                    </div>

                    {status === "ACTIVE" && (
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Workspace Node Latency</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 4.5ms"
                          className={styles.formInput}
                          value={latency}
                          onChange={(e) => setLatency(e.target.value)}
                        />
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
                      {editingProject && (
                        <button 
                          type="button" 
                          onClick={handleAbortEdit}
                          style={{
                            flex: 1,
                            background: "transparent",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            color: "var(--text-secondary)",
                            padding: "0.8rem",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "500",
                            fontSize: "0.9rem",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = "#ef4444"}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)"}
                        >
                          Abort Edit
                        </button>
                      )}
                      
                      <button 
                        type="submit" 
                        className={styles.btnBlock} 
                        style={{ flex: 2, margin: 0 }}
                      >
                        {editingProject ? "Update Node Configuration" : "Deploy Workspace Node"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* RIGHT COLUMN: ACTIVE LIST */}
              <div>
                <h2 className={styles.panelTitle}>Active Workspace Nodes</h2>
                
                <div className={styles.listPanel}>
                  {projects.length === 0 ? (
                    <div style={{ padding: "4rem 2rem", textAlign: "center", border: "1px dashed rgba(255, 255, 255, 0.06)", borderRadius: "12px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        NO ACTIVE WORKSPACES DEPLOYED.
                      </span>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <div 
                        key={project.id} 
                        className={styles.nodeItem}
                        style={{
                          borderColor: editingProject?.id === project.id ? "var(--neon-blue)" : "rgba(255, 255, 255, 0.05)",
                          boxShadow: editingProject?.id === project.id ? "0 0 15px rgba(0, 210, 255, 0.04)" : "none"
                        }}
                      >
                        <div className={styles.nodeInfo}>
                          <h3>{project.name}</h3>
                          <div className={styles.nodeMeta}>
                            <span>CLIENT: {project.client}</span>
                            <span>/</span>
                            <span style={{ color: project.status === "ACTIVE" ? "#00ff66" : "#f59e0b" }}>
                              {project.status}
                            </span>
                            <span>/</span>
                            <span>LATENCY: {project.latency}</span>
                          </div>
                          
                          {/* Secure redirect URL & password showcase */}
                          <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.68rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                              <Globe size={11} style={{ color: "var(--neon-blue)" }} />
                              <a href={project.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }} onMouseEnter={(e) => e.currentTarget.style.color = "#ffffff"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>
                                {project.url}
                              </a>
                            </span>

                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.68rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", background: "rgba(255,255,255,0.02)", padding: "0.15rem 0.5rem", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.04)" }}>
                              <Lock size={10} style={{ color: "#f59e0b" }} />
                              <span>KEY:</span>
                              <span style={{ color: "#ffffff", letterSpacing: visiblePasswords[project.id] ? "0" : "0.15em" }}>
                                {visiblePasswords[project.id] ? project.passwordHash : "••••••••"}
                              </span>
                              <button 
                                type="button" 
                                onClick={() => togglePasswordVisibility(project.id)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0.1rem", display: "inline-flex" }}
                              >
                                {visiblePasswords[project.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                              </button>
                            </span>
                          </div>
                        </div>

                        {/* Controls */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginLeft: "1.5rem" }}>
                          <button 
                            className={styles.btnDelete}
                            onClick={() => handleStartEdit(project)}
                            style={{
                              borderColor: editingProject?.id === project.id ? "var(--neon-blue)" : "rgba(255, 255, 255, 0.08)",
                              color: editingProject?.id === project.id ? "var(--neon-blue)" : "var(--text-muted)"
                            }}
                            onMouseEnter={(e) => {
                              if (editingProject?.id !== project.id) {
                                e.currentTarget.style.borderColor = "var(--neon-blue)";
                                e.currentTarget.style.color = "var(--neon-blue)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (editingProject?.id !== project.id) {
                                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                                e.currentTarget.style.color = "var(--text-muted)";
                              }
                            }}
                          >
                            EDIT NODE
                          </button>
                          <button 
                            className={styles.btnDelete}
                            onClick={() => handleDelete(project.id)}
                          >
                            DECOMMISSION
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}
