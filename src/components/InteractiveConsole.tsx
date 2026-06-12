"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, Search, Database, Shield, Activity,
  Cpu, CheckCircle2, Play, RefreshCw,
  Globe, GraduationCap, ShoppingBag, HeartPulse, Ticket, Plus 
} from "lucide-react";

// Mock log pool for live terminal animation
const LOG_MESSAGES = [
  { type: "info", text: "Supabase DB connection pool scaled to 16 nodes" },
  { type: "success", text: "Synced academic records for Schools24 portal in 24ms" },
  { type: "info", text: "GET /api/v1/auth/session - 200 OK (User: pareekshith@bluevolt.group)" },
  { type: "warning", text: "API Rate-limiting warning: Token usage at 82% of threshold" },
  { type: "success", text: "Processed Stores24 Stripe Webhook: charge.succeeded (+$420.00)" },
  { type: "info", text: "Cron job 'nightly-backup' completed. Snapshot size: 1.42 GB" },
  { type: "success", text: "Hoscore diagnostic pipeline initial scan complete. Accuracy: 99.8%" },
  { type: "info", text: "Routing customer traffic through Europe (Frankfurt) AWS Cluster" },
  { type: "success", text: "Events24: Ticket scan webhook processed successfully (Ticket: #EV-9204)" },
  { type: "warning", text: "High latency detected on auxiliary search index. Re-indexing..." }
];

export default function InteractiveConsole() {
  const [activeTab, setActiveTab] = useState("control");
  const [logs, setLogs] = useState<string[]>([
    "Initializing BLUEVOLT Studio OS...",
    "Registering edge functions...",
    "Connected to Supabase PostgreSQL cluster...",
    "All gateways active [Region: global-edge]"
  ]);
  const [logCounter, setLogCounter] = useState(0);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  // Schools24 state
  const [searchQuery, setSearchQuery] = useState("");
  const students = [
    { name: "Alice Johnson", class: "Grade 12A", gpa: "3.95", status: "Active" },
    { name: "Bob Chen", class: "Grade 11B", gpa: "3.68", status: "Active" },
    { name: "Charlie Patel", class: "Grade 12C", gpa: "3.84", status: "Active" },
    { name: "Diana Prince", class: "Grade 10A", gpa: "3.91", status: "Active" },
    { name: "Ethan Hunt", class: "Grade 11A", gpa: "3.42", status: "On Leave" },
  ];

  // Stores24 state
  const [transactions, setTransactions] = useState([
    { id: "TX-781", item: "Math Texbook Set", amount: "$120.00", status: "Success" },
    { id: "TX-780", item: "Student Science Kit", amount: "$85.00", status: "Success" }
  ]);
  const [checkoutStatus, setCheckoutStatus] = useState("idle"); // idle, processing, success
  const [revenue, setRevenue] = useState(12840);

  // Hoscore state
  const [mriStatus, setMriStatus] = useState("idle"); // idle, scanning, complete
  const [scanProgress, setScanProgress] = useState(0);

  // Events24 state
  const [ticketInput, setTicketInput] = useState("");
  const [tickets, setTickets] = useState([
    { code: "BV-EVT-901", holder: "Sarah Miller", time: "Just now", status: "Valid" },
    { code: "BV-EVT-892", holder: "James Taylor", time: "5m ago", status: "Valid" }
  ]);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // Auto-scrolling terminal (fixing scrollIntoView page jump bug)
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Feed log stream
  useEffect(() => {
    const interval = setInterval(() => {
      const nextLog = LOG_MESSAGES[logCounter % LOG_MESSAGES.length];
      const time = new Date().toLocaleTimeString();
      const prefix = nextLog.type === "success" ? "✓" : nextLog.type === "warning" ? "⚠" : "ℹ";
      setLogs(prev => [...prev, `[${time}] ${prefix} ${nextLog.text}`]);
      setLogCounter(prev => prev + 1);
    }, 2800);
    return () => clearInterval(interval);
  }, [logCounter]);

  // Simulate Stores24 Transaction
  const handleSimulateOrder = () => {
    if (checkoutStatus !== "idle") return;
    setCheckoutStatus("processing");
    setTimeout(() => {
      const randomId = `TX-${Math.floor(Math.random() * 800) + 100}`;
      const randomItems = ["Smart Chromebook", "Campus Hoodie", "Chemistry Lab Pass", "EdTech Suite Pro"];
      const randomItem = randomItems[Math.floor(Math.random() * randomItems.length)];
      const randomAmount = Math.floor(Math.random() * 150) + 25;
      
      setTransactions(prev => [
        { id: randomId, item: randomItem, amount: `$${randomAmount}.00`, status: "Success" },
        ...prev
      ]);
      setRevenue(prev => prev + randomAmount);
      setCheckoutStatus("success");
      
      // Log to terminal
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✓ Live Checkout: ${randomItem} ($${randomAmount}.00) completed`]);

      setTimeout(() => {
        setCheckoutStatus("idle");
      }, 2000);
    }, 1200);
  };

  // Simulate Hoscore Diagnostics Run
  const handleMriScan = () => {
    if (mriStatus === "scanning") return;
    setMriStatus("scanning");
    setScanProgress(0);
    
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setMriStatus("complete");
          setLogs(prevLogs => [...prevLogs, `[${new Date().toLocaleTimeString()}] ✓ Hoscore MRI Pipeline completed scan analysis. No anomalies found.`]);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  // Simulate Ticket Scan
  const handleTicketScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketInput.trim()) return;

    const names = ["Marcus Aurelius", "Ada Lovelace", "Alan Turing", "Grace Hopper", "Nikola Tesla"];
    const randomName = names[Math.floor(Math.random() * names.length)];

    setTickets(prev => [
      { code: ticketInput.toUpperCase(), holder: randomName, time: "Just now", status: "Valid" },
      ...prev
    ]);
    
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✓ Events24: Ticket ${ticketInput.toUpperCase()} checked in for ${randomName}`]);
    setScanResult(`Check-in Successful: ${randomName}`);
    setTicketInput("");

    setTimeout(() => {
      setScanResult(null);
    }, 3000);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.class.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="browser-mockup-window" style={{ display: "flex", flexDirection: "column", width: "100%", height: "580px", maxWidth: "980px" }}>
      
      {/* 1. Header with Dots & Browser Bar */}
      <div className="browser-mockup-header" style={{ flexShrink: 0 }}>
        <div className="browser-mockup-dots">
          <div className="browser-mockup-dot red" />
          <div className="browser-mockup-dot yellow" />
          <div className="browser-mockup-dot green" />
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "rgba(99, 91, 255, 0.05)",
          border: "1px solid rgba(99, 91, 255, 0.08)",
          borderRadius: "6px",
          padding: "2px 24px",
          fontSize: "0.75rem",
          color: "#635bff",
          fontFamily: "var(--font-mono)",
          gap: "6px"
        }}>
          <Globe size={11} />
          <span>studio.bluevolt.group/console</span>
        </div>
        <div style={{ width: "52px" }} />
      </div>

      {/* 2. Main Sidebar & Content Container */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        
        {/* Sidebar */}
        <div style={{ 
          width: "220px", 
          backgroundColor: "rgba(248, 250, 252, 0.8)", 
          borderRight: "1px solid rgba(99, 91, 255, 0.06)", 
          padding: "1.25rem 0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          flexShrink: 0
        }}>
          <div style={{ 
            fontFamily: "var(--font-mono)", 
            fontSize: "0.68rem", 
            letterSpacing: "0.1em", 
            color: "#94a3b8", 
            paddingLeft: "0.75rem", 
            marginBottom: "0.5rem",
            textTransform: "uppercase"
          }}>
            Operational Modules
          </div>

          <button 
            className={`sim-sidebar-btn ${activeTab === "control" ? "active" : ""}`}
            onClick={() => setActiveTab("control")}
          >
            <Activity size={15} />
            <span>SaaS Control Plane</span>
          </button>

          <button 
            className={`sim-sidebar-btn ${activeTab === "education" ? "active" : ""}`}
            onClick={() => setActiveTab("education")}
          >
            <GraduationCap size={15} />
            <span>Schools24 (EdTech)</span>
          </button>

          <button 
            className={`sim-sidebar-btn ${activeTab === "ecommerce" ? "active" : ""}`}
            onClick={() => setActiveTab("ecommerce")}
          >
            <ShoppingBag size={15} />
            <span>Stores24 (Shop)</span>
          </button>

          <button 
            className={`sim-sidebar-btn ${activeTab === "healthcare" ? "active" : ""}`}
            onClick={() => setActiveTab("healthcare")}
          >
            <HeartPulse size={15} />
            <span>Hoscore (Health)</span>
          </button>

          <button 
            className={`sim-sidebar-btn ${activeTab === "events" ? "active" : ""}`}
            onClick={() => setActiveTab("events")}
          >
            <Ticket size={15} />
            <span>Events24 (Tickets)</span>
          </button>
        </div>

        {/* Content Body Area */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, backgroundColor: "#ffffff", overflow: "hidden" }}>
          
          <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto", position: "relative" }}>
            <AnimatePresence mode="wait">
              
              {/* Tab: CONTROL PLANE */}
              {activeTab === "control" && (
                <motion.div
                  key="control"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{ height: "100%", display: "flex", flexDirection: "column", gap: "1.25rem" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>System Gateways</h3>
                      <p style={{ fontSize: "0.78rem", color: "#64748b" }}>Real-time database, Auth server and API gateway metrics.</p>
                    </div>
                    <span style={{ 
                      fontSize: "0.75rem", 
                      backgroundColor: "rgba(34, 197, 94, 0.1)", 
                      color: "#16a34a", 
                      fontWeight: 600, 
                      padding: "0.25rem 0.6rem", 
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      <span style={{ width: "6px", height: "6px", backgroundColor: "#16a34a", borderRadius: "50%", display: "inline-block" }} />
                      Operational
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                    <div style={{ border: "1px solid rgba(99, 91, 255, 0.08)", borderRadius: "12px", padding: "1rem", background: "#f8fafc", position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#16a34a", display: "inline-block", boxShadow: "0 0 6px #16a34a" }} />
                          CPU Latency
                        </span>
                        <Cpu size={14} style={{ color: "#635bff" }} />
                      </div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0f172a" }}>4.2 ms</div>
                      <div style={{ fontSize: "0.68rem", color: "#16a34a", fontWeight: 500 }}>Optimal bandwidth</div>
                    </div>

                    <div style={{ border: "1px solid rgba(99, 91, 255, 0.08)", borderRadius: "12px", padding: "1rem", background: "#f8fafc", position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#00d2ff", display: "inline-block", boxShadow: "0 0 6px #00d2ff" }} />
                          DB Connections
                        </span>
                        <Database size={14} style={{ color: "#00d2ff" }} />
                      </div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0f172a" }}>182 / 500</div>
                      <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 500 }}>Active replication</div>
                    </div>

                    <div style={{ border: "1px solid rgba(99, 91, 255, 0.08)", borderRadius: "12px", padding: "1rem", background: "#f8fafc", position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#22c55e", display: "inline-block", boxShadow: "0 0 6px #22c55e" }} />
                          WAF Gateway
                        </span>
                        <Shield size={14} style={{ color: "#ec4899" }} />
                      </div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0f172a" }}>0 Threats</div>
                      <div style={{ fontSize: "0.68rem", color: "#16a34a", fontWeight: 500 }}>Zero injection alerts</div>
                    </div>
                  </div>

                  <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.5rem" }}>
                      <span style={{ 
                        width: "6px", 
                        height: "6px", 
                        backgroundColor: "#635bff", 
                        borderRadius: "50%", 
                        display: "inline-block",
                        boxShadow: "0 0 6px #635bff"
                      }} />
                      Live CPU Utilization
                    </div>
                    <div style={{ 
                      flex: 1, 
                      backgroundColor: "#0a0a0f", 
                      borderRadius: "12px", 
                      padding: "1rem", 
                      display: "flex", 
                      alignItems: "flex-end", 
                      gap: "6px",
                      position: "relative",
                      overflow: "hidden",
                      border: "1px solid rgba(255, 255, 255, 0.05)"
                    }}>
                      {/* Background horizontal grid lines */}
                      <div style={{ position: "absolute", inset: "0 0", display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none", padding: "12px 0" }}>
                        {[0, 1, 2, 3, 4].map((n) => (
                          <div key={n} style={{ width: "100%", height: "1px", backgroundColor: "rgba(255, 255, 255, 0.03)" }} />
                        ))}
                      </div>

                      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", width: "100%", height: "100%", zIndex: 2 }}>
                        {[30, 45, 38, 55, 42, 60, 32, 50, 45, 58, 62, 38, 48, 52, 65, 40, 35, 55].map((val, i) => (
                          <motion.div 
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${val}%` }}
                            transition={{ delay: i * 0.01, type: "spring", stiffness: 85 }}
                            style={{
                              flex: 1,
                              backgroundColor: i === 14 ? "#ec4899" : i > 10 ? "#635bff" : "#00d2ff",
                              borderRadius: "2px",
                              boxShadow: i === 14 
                                ? "0 0 8px rgba(236, 72, 153, 0.5)" 
                                : i > 10 
                                  ? "0 0 8px rgba(99, 91, 255, 0.4)" 
                                  : "0 0 8px rgba(0, 210, 255, 0.4)"
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab: EDUCATION */}
              {activeTab === "education" && (
                <motion.div
                  key="education"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>Schools24 Student Hub</h3>
                      <p style={{ fontSize: "0.78rem", color: "#64748b" }}>Lookup, grades & attendance profiles database.</p>
                    </div>
                    
                    <div style={{ position: "relative", width: "200px" }}>
                      <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                      <input 
                        type="text" 
                        placeholder="Search student or grade..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.35rem 0.5rem 0.35rem 1.75rem",
                          fontSize: "0.8rem",
                          border: "1px solid rgba(99, 91, 255, 0.12)",
                          borderRadius: "6px",
                          outline: "none"
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ border: "1px solid rgba(99, 91, 255, 0.08)", borderRadius: "12px", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8fafc", textAlign: "left", borderBottom: "1px solid rgba(99, 91, 255, 0.08)" }}>
                          <th style={{ padding: "0.75rem" }}>Student Name</th>
                          <th style={{ padding: "0.75rem" }}>Class</th>
                          <th style={{ padding: "0.75rem" }}>GPA Avg</th>
                          <th style={{ padding: "0.75rem" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((st, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                              <td style={{ padding: "0.75rem", fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                                <div style={{
                                  width: "22px",
                                  height: "22px",
                                  borderRadius: "50%",
                                  backgroundColor: "rgba(99, 91, 255, 0.08)",
                                  color: "#635bff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.65rem",
                                  fontWeight: 700
                                }}>
                                  {st.name.split(" ").map(n => n[0]).join("")}
                                </div>
                                {st.name}
                              </td>
                              <td style={{ padding: "0.75rem", color: "#475569" }}>{st.class}</td>
                              <td style={{ padding: "0.75rem", fontWeight: "bold", color: "#635bff" }}>{st.gpa}</td>
                              <td style={{ padding: "0.75rem" }}>
                                <span style={{ 
                                  backgroundColor: st.status === "Active" ? "rgba(34, 197, 94, 0.1)" : "rgba(245, 158, 11, 0.1)", 
                                  color: st.status === "Active" ? "#16a34a" : "#d97706",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "0.7rem",
                                  fontWeight: 500
                                }}>
                                  {st.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={{ padding: "1.5rem", textAlign: "center", color: "#64748b" }}>
                              No student profiles match search criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* Tab: E-COMMERCE */}
              {activeTab === "ecommerce" && (
                <motion.div
                  key="ecommerce"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>Stores24 Checkout Terminal</h3>
                      <p style={{ fontSize: "0.78rem", color: "#64748b" }}>Live simulated transaction logs & instant checkout testing.</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Total Revenue</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#16a34a" }}>
                        ${revenue.toLocaleString()}.00
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.25rem", flex: 1, minHeight: 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>Recent Orders</div>
                      <div style={{ border: "1px solid rgba(99, 91, 255, 0.08)", borderRadius: "12px", padding: "0.5rem", height: "160px", overflowY: "auto" }}>
                        {transactions.map((tx, i) => (
                          <div key={i} style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center", 
                            padding: "0.5rem", 
                            borderBottom: i === transactions.length - 1 ? "none" : "1px solid rgba(0,0,0,0.03)",
                            fontSize: "0.78rem" 
                          }}>
                            <div>
                              <div style={{ fontWeight: 600, color: "#0f172a" }}>{tx.item}</div>
                              <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>ID: {tx.id}</span>
                            </div>
                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                              <span style={{ fontWeight: 600, color: "#0f172a" }}>{tx.amount}</span>
                              <span style={{ fontSize: "0.65rem", color: "#16a34a", backgroundColor: "rgba(34, 197, 94, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>Success</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", border: "1px dashed rgba(99, 91, 255, 0.15)", borderRadius: "12px", padding: "1.25rem", background: "#f8fafc" }}>
                      <ShoppingBag size={24} style={{ color: "#635bff", marginBottom: "0.5rem" }} />
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0f172a", textAlign: "center" }}>
                        Process Simulated Checkout
                      </div>
                      <p style={{ fontSize: "0.68rem", color: "#64748b", textAlign: "center", margin: "4px 0 12px 0" }}>
                        Creates random transaction item, increments revenue, and fires database webhooks.
                      </p>

                      <button
                        onClick={handleSimulateOrder}
                        disabled={checkoutStatus !== "idle"}
                        style={{
                          width: "100%",
                          padding: "0.6rem",
                          borderRadius: "8px",
                          border: "none",
                          background: checkoutStatus === "processing" ? "#64748b" : "#635bff",
                          color: "#ffffff",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          cursor: checkoutStatus === "idle" ? "pointer" : "not-allowed",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: "8px",
                          boxShadow: "0 4px 10px rgba(99, 91, 255, 0.15)"
                        }}
                      >
                        {checkoutStatus === "processing" ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : checkoutStatus === "success" ? (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Confetti Triggered!</span>
                          </>
                        ) : (
                          <>
                            <Plus size={14} />
                            <span>Simulate Checkout</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab: HEALTHCARE */}
              {activeTab === "healthcare" && (
                <motion.div
                  key="healthcare"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}
                >
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>Hoscore Diagnostic Scan Desk</h3>
                    <p style={{ fontSize: "0.78rem", color: "#64748b" }}>MRI & clinical data analysis analyzer with automated diagnostics.</p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "1rem", flex: 1, minHeight: 0 }}>
                    
                    {/* Visual MRI scanning pane */}
                    <div style={{ 
                      position: "relative", 
                      backgroundColor: "#090d16", 
                      borderRadius: "12px", 
                      border: "1px solid rgba(0, 210, 255, 0.15)", 
                      overflow: "hidden", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center" 
                    }}>
                      
                      {/* Scanning Grid Line */}
                      {mriStatus === "scanning" && <div className="mri-scanner-line" />}
                      
                      {/* Circular scan representation */}
                      <div style={{ 
                        width: "120px", 
                        height: "120px", 
                        borderRadius: "50%", 
                        border: "2px dashed #00d2ff", 
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        animation: mriStatus === "scanning" ? "spin 8s infinite linear" : "none"
                      }}>
                        <div style={{ 
                          width: "80px", 
                          height: "80px", 
                          borderRadius: "50%", 
                          border: "1px solid rgba(99, 91, 255, 0.4)",
                          background: mriStatus === "scanning" ? "radial-gradient(circle, rgba(0, 210, 255, 0.25) 0%, transparent 80%)" : "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <HeartPulse size={36} style={{ color: mriStatus === "scanning" ? "#00d2ff" : "#64748b" }} />
                        </div>
                      </div>

                      {/* Diagnostic Status Box */}
                      <div style={{ position: "absolute", bottom: "10px", left: "10px", fontSize: "0.68rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
                        SYSTEM_FEED: {mriStatus.toUpperCase()}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", justifyContent: "center" }}>
                      <div style={{ border: "1px solid rgba(99, 91, 255, 0.08)", borderRadius: "10px", padding: "0.75rem", backgroundColor: "#f8fafc" }}>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Analysis Method</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>Neural Tissue Profiler v2</div>
                      </div>

                      {mriStatus === "scanning" && (
                        <div style={{ width: "100%" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#64748b", marginBottom: "4px" }}>
                            <span>Re-aligning tissue slices...</span>
                            <span>{scanProgress}%</span>
                          </div>
                          <div style={{ width: "100%", height: "6px", backgroundColor: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${scanProgress}%`, height: "100%", backgroundColor: "#00d2ff", transition: "width 0.15s ease" }} />
                          </div>
                        </div>
                      )}

                      {mriStatus === "complete" && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          style={{ border: "1px solid #bbf7d0", backgroundColor: "#f0fdf4", color: "#15803d", padding: "0.75rem", borderRadius: "8px", fontSize: "0.75rem" }}
                        >
                          <div style={{ fontWeight: "bold", marginBottom: "2px" }}>✓ Report Generated</div>
                          Scan check completed in 1.5s. Clinical abnormalities: 0 detected. Confidence: 99.8%.
                        </motion.div>
                      )}

                      <button
                        onClick={handleMriScan}
                        disabled={mriStatus === "scanning"}
                        style={{
                          padding: "0.6rem",
                          borderRadius: "8px",
                          border: "none",
                          background: mriStatus === "scanning" ? "#94a3b8" : "#00d2ff",
                          color: "#ffffff",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          cursor: mriStatus === "scanning" ? "not-allowed" : "pointer",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: "6px",
                          boxShadow: "0 4px 12px rgba(0, 210, 255, 0.2)"
                        }}
                      >
                        <Play size={12} />
                        <span>Run Diagnostics Scan</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab: EVENTS */}
              {activeTab === "events" && (
                <motion.div
                  key="events"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>Events24 Ticketing Terminal</h3>
                      <p style={{ fontSize: "0.78rem", color: "#64748b" }}>Live attendee scan logger & check-in gate manager.</p>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", flex: 1, minHeight: 0 }}>
                    
                    {/* Log ticket scans */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>Checked-in Attendees</div>
                      <div style={{ border: "1px solid rgba(99, 91, 255, 0.08)", borderRadius: "12px", padding: "0.5rem", overflowY: "auto", flex: 1 }}>
                        {tickets.map((tk, i) => (
                          <div key={i} style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center", 
                            padding: "0.45rem 0.5rem", 
                            borderBottom: i === tickets.length - 1 ? "none" : "1px solid rgba(0,0,0,0.03)",
                            fontSize: "0.75rem" 
                          }}>
                            <div>
                              <div style={{ fontWeight: 600, color: "#0f172a" }}>{tk.holder}</div>
                              <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>Code: {tk.code}</span>
                            </div>
                            <span style={{ fontSize: "0.65rem", color: "#16a34a", fontWeight: 500 }}>{tk.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Scanner Input Panel */}
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "1rem", padding: "0.5rem" }}>
                      <form onSubmit={handleTicketScan} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>Scan Barcode / Enter Ticket Code</label>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <input 
                            type="text" 
                            placeholder="e.g. BV-EVT-498"
                            value={ticketInput}
                            onChange={(e) => setTicketInput(e.target.value)}
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              fontSize: "0.8rem",
                              border: "1px solid rgba(99, 91, 255, 0.12)",
                              borderRadius: "8px",
                              outline: "none"
                            }}
                          />
                          <button 
                            type="submit"
                            style={{
                              padding: "0.5rem 1rem",
                              borderRadius: "8px",
                              border: "none",
                              backgroundColor: "#635bff",
                              color: "#ffffff",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            Scan
                          </button>
                        </div>
                      </form>

                      {scanResult && (
                        <motion.div 
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            border: "1px solid #bbf7d0",
                            backgroundColor: "#f0fdf4",
                            color: "#15803d",
                            padding: "0.6rem",
                            borderRadius: "8px",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>{scanResult}</span>
                        </motion.div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const randomCode = `BV-EVT-${Math.floor(Math.random() * 800) + 100}`;
                          setTicketInput(randomCode);
                        }}
                        style={{
                          padding: "0.5rem",
                          border: "1px solid rgba(99, 91, 255, 0.12)",
                          borderRadius: "8px",
                          background: "#ffffff",
                          color: "#635bff",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          cursor: "pointer"
                        }}
                      >
                        Generate Random Valid Ticket
                      </button>
                    </div>

                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* 3. Real-time Log Streams Terminal */}
          <div style={{ 
            height: "140px", 
            backgroundColor: "#0a0a0f", 
            borderTop: "1px solid rgba(99, 91, 255, 0.12)", 
            padding: "0.75rem 1.25rem",
            fontFamily: "var(--font-mono)",
            fontSize: "0.7rem",
            color: "#818cf8",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "4px", marginBottom: "4px", flexShrink: 0 }}>
              <Terminal size={12} />
              <span style={{ textTransform: "uppercase", fontSize: "0.62rem", letterSpacing: "0.08em", color: "#64748b" }}>Live DB & Gateway Stream</span>
            </div>
            
            <div 
              ref={terminalContainerRef}
              className="terminal-scroll-container" 
              style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}
            >
              {logs.map((log, i) => (
                <div key={i} style={{ 
                  color: log.includes("✓") ? "#4ade80" : log.includes("⚠") ? "#fbbf24" : "rgba(255, 255, 255, 0.7)",
                  textShadow: log.includes("✓") ? "0 0 8px rgba(74, 222, 128, 0.15)" : "none"
                }}>
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
      
    </div>
  );
}
