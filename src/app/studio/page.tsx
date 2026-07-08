"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Lock, Play, ShieldCheck, X, AlertTriangle } from "lucide-react";
import { getPublicStudioProjects, verifyStudioProjectPassword, StudioProjectData } from "@/app/actions/studio";
import styles from "./page.module.css";

const DEFAULT_PROJECTS = [
  {
    id: "schools24-pilot",
    name: "Schools24 Administrative Core",
    client: "Oakridge International School",
    status: "ACTIVE",
    latency: "4.8ms",
    url: "https://schools24.in",
    passwordHash: "schools24",
  },

  {
    id: "project-nexus",
    name: "Autonomous Logistics Node",
    client: "Alpha Logistics Solutions",
    status: "PENDING",
    latency: "--",
    url: "https://bluevolt.group",
    passwordHash: "nexus24",
  }
];

export default function StudioPage() {
  const [projects, setProjects] = useState<StudioProjectData[]>([]);
  const [selectedProject, setSelectedProject] = useState<StudioProjectData | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  // Load from Cloud Database on mount
  useEffect(() => {
    setMounted(true);
    getPublicStudioProjects().then((data) => {
      setProjects(data);
    }).catch((err) => {
      console.error("Failed to load studio projects from database, using fallback", err);
      setProjects(DEFAULT_PROJECTS);
    });
  }, []);

  const handleCardClick = (project: StudioProjectData) => {
    if (project.status === "PENDING") return; // Keep locked if pending deployment
    setSelectedProject(project);
    setPasswordInput("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleCloseModal = () => {
    setSelectedProject(null);
    setPasswordInput("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const result = await verifyStudioProjectPassword({ id: selectedProject.id, passwordHash: passwordInput });
    if (result.success) {
      setSuccessMsg("Access granted. Redirecting...");
      setErrorMsg("");
      
      // Smoothly redirect client to their demo site after 1.5 seconds of tech animation
      setTimeout(() => {
        window.location.href = selectedProject.url;
      }, 1500);
    } else {
      setErrorMsg("Invalid password.");
      setSuccessMsg("");
    }
  };

  return (
    <main className={styles.studioWrapper}>
      <div className={styles.content}>
        {/* Header Node */}
        <header className={styles.header}>
          <div className={styles.statusIndicator}>
            <span>Admin Gateway</span>
          </div>
          <h1 className={styles.title}>BLUEVOLT Studio</h1>
          <p className={styles.subtitle}>
            Access and manage client workspaces. Authenticate below using your project password.
          </p>
        </header>

        {/* Client Demos Grid */}
        <div className={styles.projectGrid}>
          {mounted ? (
            projects.map((project) => (
              <div 
                key={project.id}
                className={`${styles.projectCard} ${project.status === "PENDING" ? styles.disabledCard : ""}`}
                onClick={() => handleCardClick(project)}
                style={{ opacity: project.status === "PENDING" ? 0.5 : 1, cursor: project.status === "PENDING" ? "not-allowed" : "pointer" }}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.clientName}>{project.client}</span>
                  <span className={`${styles.statusBadge} ${project.status === "ACTIVE" ? styles.statusActive : styles.statusPending}`}>
                    {project.status}
                  </span>
                </div>

                <div>
                  <h3 className={styles.projectName}>{project.name}</h3>
                  <span className={styles.actionText}>
                    {project.status === "ACTIVE" ? (
                      <>
                        Connect <ArrowRight size={14} />
                      </>
                    ) : (
                      <>
                        Awaiting Deployment <Lock size={12} />
                      </>
                    )}
                  </span>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.latency}>Latency: {project.latency}</span>
                  <Play size={14} style={{ color: "#2563eb", opacity: project.status === "PENDING" ? 0.2 : 0.8 }} />
                </div>
              </div>
            ))
          ) : (
            // Server-side / Hydration placeholder
            DEFAULT_PROJECTS.map((project) => (
              <div 
                key={project.id}
                className={styles.projectCard}
                style={{ opacity: 0.5 }}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.clientName}>{project.client}</span>
                  <span className={styles.statusBadge}>{project.status}</span>
                </div>
                <div>
                  <h3 className={styles.projectName}>{project.name}</h3>
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.latency}>Latency: {project.latency}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Password Authentication Glassmorphic Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className={styles.modalOverlay} onClick={handleCloseModal}>
            <motion.div 
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <button className={styles.closeButton} onClick={handleCloseModal} aria-label="Close modal">
                <X size={18} />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "1rem" }}>
                <Lock size={20} style={{ color: "var(--text-primary)" }} />
                <h2 className={styles.modalTitle}>Authenticate</h2>
              </div>
              <p className={styles.modalSubtitle}>PROJECT: {selectedProject.name}</p>

              <form onSubmit={handleVerifyPassword}>
                <div className={styles.inputGroup}>
                  <label htmlFor="password-field" className={styles.inputLabel}>
                    Password
                  </label>
                  <input
                    id="password-field"
                    type="password"
                    placeholder="Enter password..."
                    className={styles.inputField}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                    autoFocus
                  />
                  
                  {/* Status Logs */}
                  {errorMsg && (
                    <div className={styles.errorText}>
                      <AlertTriangle size={12} />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className={styles.successText}>
                      <ShieldCheck size={12} />
                      <span>{successMsg}</span>
                    </div>
                  )}
                </div>

                <div className={styles.modalButtons}>
                  <button type="button" className={styles.btnCancel} onClick={handleCloseModal}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.btnSubmit} disabled={!!successMsg}>
                    Login
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
