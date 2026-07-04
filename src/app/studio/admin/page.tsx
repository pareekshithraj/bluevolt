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
      setLoginError(result.message || "Invalid email or password.");
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
      setFormSuccess("Project deleted successfully.");
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
    
    if (confirm("Are you sure you want to reset all projects to the original defaults? This will erase all custom configurations!")) {
      const result = await seedStudioProjects();
      if (result.success) {
        setFormSuccess("Default projects restored successfully.");
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
      setFormError("All project fields are required.");
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
        ? `Project "${name}" updated successfully.` 
        : `Project "${name}" created successfully.`
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
        <div className={styles.content} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>
            Loading dashboard...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.adminWrapper}>
      <div className={styles.content}>
        
        {/* SECURE LOGIN CARD */}
        {!isLoggedIn ? (
          <div className={styles.loginContainer}>
            <div className={styles.loginCard}>
              <div className={styles.loginTitle}>
                <Lock size={22} style={{ color: "#2563eb" }} />
                <span>Admin Login</span>
              </div>
              <p className={styles.loginSubtitle}>Access the studio dashboard</p>

              {loginError && (
                <div className={styles.errorBanner}>
                  <AlertTriangle size={14} />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="admin@bluevolt.group"
                    className={styles.formInput}
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="password">Password</label>
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
                  Login
                </button>
                
                <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                  <Link href="/studio" style={{ fontSize: "0.85rem", color: "#6b7280", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    <ArrowLeft size={14} /> Back to Studio
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
                <h1>Studio Control Panel</h1>
                <p>Manage and deploy client projects.</p>
              </div>
              
              <div style={{ display: "flex", gap: "1rem" }}>
                <button 
                  className={styles.btnLogout} 
                  onClick={handleRestoreDefaults}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                    <RotateCcw size={14} /> Restore Defaults
                  </span>
                </button>
                <button className={styles.btnLogout} onClick={handleLogout}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                    <LogOut size={14} /> Logout
                  </span>
                </button>
              </div>
            </header>

            {/* Dashboard Grid */}
            <div className={styles.dashGrid}>
              
              {/* LEFT COLUMN: CRUD FORM */}
              <div>
                <h2 className={styles.panelTitle}>
                  {editingProject ? `Edit Project` : "New Project"}
                </h2>
                
                <div className={styles.formCard}>
                  {formSuccess && (
                    <div className={styles.successBanner}>
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
                      <label className={styles.formLabel}>Client Name</label>
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
                      <label className={styles.formLabel}>Project Name</label>
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
                      <label className={styles.formLabel}>URL</label>
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
                      <label className={styles.formLabel}>Password</label>
                      <input
                        type="text"
                        required
                        placeholder="Set password for project..."
                        className={styles.formInput}
                        value={passwordHash}
                        onChange={(e) => setPasswordHash(e.target.value)}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Status</label>
                      <select 
                        className={styles.formInput}
                        style={{ appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}
                        value={status}
                        onChange={(e) => setStatus(e.target.value as "ACTIVE" | "PENDING")}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="PENDING">PENDING</option>
                      </select>
                    </div>

                    {status === "ACTIVE" && (
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Latency Simulation</label>
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
                          className={styles.btnCancel}
                          style={{ flex: 1 }}
                        >
                          Cancel
                        </button>
                      )}
                      
                      <button 
                        type="submit" 
                        className={styles.btnBlock} 
                        style={{ flex: 2, margin: 0 }}
                      >
                        {editingProject ? "Update Project" : "Create Project"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* RIGHT COLUMN: ACTIVE LIST */}
              <div>
                <h2 className={styles.panelTitle}>Active Projects</h2>
                
                <div className={styles.listPanel}>
                  {projects.length === 0 ? (
                    <div style={{ padding: "4rem 2rem", textAlign: "center", border: "1px dashed #e5e7eb", borderRadius: "12px" }}>
                      <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                        No projects available.
                      </span>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <div 
                        key={project.id} 
                        className={styles.nodeItem}
                        style={{
                          borderColor: editingProject?.id === project.id ? "#2563eb" : "#e5e7eb",
                          boxShadow: editingProject?.id === project.id ? "0 0 0 2px rgba(37,99,235,0.1)" : "none"
                        }}
                      >
                        <div className={styles.nodeInfo}>
                          <h3>{project.name}</h3>
                          <div className={styles.nodeMeta}>
                            <span>{project.client}</span>
                            <span>•</span>
                            <span style={{ color: project.status === "ACTIVE" ? "#059669" : "#d97706" }}>
                              {project.status}
                            </span>
                            {project.status === "ACTIVE" && (
                              <>
                                <span>•</span>
                                <span>Latency: {project.latency}</span>
                              </>
                            )}
                          </div>
                          
                          <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem", color: "#4b5563" }}>
                              <Globe size={14} style={{ color: "#2563eb" }} />
                              <a href={project.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }} onMouseEnter={(e) => e.currentTarget.style.color = "#111827"} onMouseLeave={(e) => e.currentTarget.style.color = "#4b5563"}>
                                {project.url}
                              </a>
                            </span>

                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "#4b5563", background: "#f9fafb", padding: "0.2rem 0.6rem", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
                              <Lock size={12} style={{ color: "#4b5563" }} />
                              <span>Key:</span>
                              <span style={{ color: "#111827", letterSpacing: visiblePasswords[project.id] ? "0" : "0.15em" }}>
                                {visiblePasswords[project.id] ? project.passwordHash : "••••••••"}
                              </span>
                              <button 
                                type="button" 
                                onClick={() => togglePasswordVisibility(project.id)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: "0.1rem", display: "inline-flex" }}
                              >
                                {visiblePasswords[project.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </span>
                          </div>
                        </div>

                        {/* Controls */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginLeft: "1.5rem" }}>
                          <button 
                            className={styles.btnAction}
                            onClick={() => handleStartEdit(project)}
                          >
                            Edit
                          </button>
                          <button 
                            className={styles.btnDelete}
                            onClick={() => handleDelete(project.id)}
                          >
                            Delete
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
