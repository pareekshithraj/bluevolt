"use client";

import React, { useState } from "react";
import { Lock, Unlock, Search, Check, RefreshCw, FileText, User, ShieldAlert } from "lucide-react";

// 1. Unified Records Interactive Widget (Glass Dark Version)
export function UnifiedRecordsWidget() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const profiles = [
    { name: "Aria Chen", role: "Student", gpa: "3.98", campus: "East Wing" },
    { name: "Lucas Carter", role: "Instructor", dept: "Physics", campus: "Main Labs" },
    { name: "Sofia Kim", role: "Student", gpa: "3.85", campus: "West Wing" }
  ];

  return (
    <div style={{ width: "100%", height: "100%", padding: "10px", display: "flex", gap: "8px", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: "6px", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "6px" }}>
        <Search size={12} style={{ color: "#94a3b8" }} />
        <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500 }}>Global Student Registry</span>
      </div>

      <div style={{ display: "flex", gap: "8px", flex: 1, minHeight: 0 }}>
        {/* Profile List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "45%" }}>
          {profiles.map((p, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              style={{
                textAlign: "left",
                padding: "4px 8px",
                fontSize: "0.68rem",
                borderRadius: "6px",
                border: "none",
                background: selectedIdx === i ? "rgba(255, 255, 255, 0.08)" : "transparent",
                color: selectedIdx === i ? "#ffffff" : "#94a3b8",
                fontWeight: selectedIdx === i ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Profile Preview Panel */}
        <div style={{ 
          flex: 1, 
          backgroundColor: "rgba(0, 0, 0, 0.25)", 
          border: "1px solid rgba(255, 255, 255, 0.06)", 
          borderRadius: "8px", 
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          fontSize: "0.65rem",
          color: "#cbd5e1"
        }}>
          <div style={{ fontWeight: 600, color: "#ffffff", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
            <User size={10} style={{ color: "#635bff" }} />
            <span>{profiles[selectedIdx].name}</span>
          </div>
          <div>Role: {profiles[selectedIdx].role}</div>
          {profiles[selectedIdx].gpa && <div>GPA: <strong style={{ color: "#4ade80" }}>{profiles[selectedIdx].gpa}</strong></div>}
          {profiles[selectedIdx].dept && <div>Dept: <strong style={{ color: "#818cf8" }}>{profiles[selectedIdx].dept}</strong></div>}
          <div style={{ fontSize: "0.6rem", color: "#64748b", marginTop: "2px" }}>Location: {profiles[selectedIdx].campus}</div>
        </div>
      </div>
    </div>
  );
}

// 2. Granular Security Interactive Widget (Glass Dark Version)
export function SecurityWidget() {
  const [isLocked, setIsLocked] = useState(true);

  return (
    <div style={{ 
      width: "100%", 
      height: "100%", 
      padding: "12px", 
      display: "flex", 
      flexDirection: "column", 
      justifyContent: "space-between",
      alignItems: "center"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "6px" }}>
        <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
          <ShieldAlert size={12} style={{ color: "#ec4899" }} />
          RBAC Field Gate
        </span>
        <span style={{ fontSize: "0.62rem", color: isLocked ? "#64748b" : "#f43f5e", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
          {isLocked ? "ENCRYPTED" : "DECRYPTED"}
        </span>
      </div>

      <div style={{ 
        width: "100%", 
        backgroundColor: isLocked ? "rgba(0, 0, 0, 0.2)" : "rgba(244, 63, 94, 0.08)", 
        border: `1px solid ${isLocked ? "rgba(255, 255, 255, 0.05)" : "rgba(244, 63, 94, 0.18)"}`,
        borderRadius: "8px", 
        padding: "8px",
        fontFamily: "var(--font-mono)",
        fontSize: "0.68rem",
        textAlign: "center",
        color: isLocked ? "#94a3b8" : "#fda4af",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }}>
        {isLocked ? (
          <span>hash_key: ••••••••••••••••</span>
        ) : (
          <span>pareekshith@bluevolt.group</span>
        )}
      </div>

      <button
        onClick={() => setIsLocked(!isLocked)}
        style={{
          width: "100%",
          padding: "6px",
          borderRadius: "6px",
          border: "none",
          backgroundColor: isLocked ? "#ffffff" : "#ec4899",
          color: isLocked ? "#030712" : "#ffffff",
          fontSize: "0.72rem",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          transition: "all 0.2s"
        }}
      >
        {isLocked ? (
          <>
            <Lock size={11} />
            <span>Decipher Database Row</span>
          </>
        ) : (
          <>
            <Unlock size={11} />
            <span>Re-encrypt Records</span>
          </>
        )}
      </button>
    </div>
  );
}

// 3. Automated Invoicing Interactive Widget (Glass Dark Version)
export function InvoicingWidget() {
  const [invoiceState, setInvoiceState] = useState("unpaid"); // unpaid, paying, paid
  const [revenueTotal, setRevenueTotal] = useState(3840);

  const handlePay = () => {
    if (invoiceState !== "unpaid") return;
    setInvoiceState("paying");
    setTimeout(() => {
      setInvoiceState("paid");
      setRevenueTotal(prev => prev + 1200);
    }, 1200);
  };

  return (
    <div style={{ 
      width: "100%", 
      height: "100%", 
      padding: "10px", 
      display: "flex", 
      flexDirection: "column",
      justifyContent: "space-between" 
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "6px" }}>
        <span style={{ fontSize: "0.72rem", color: "#cbd5e1", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
          <FileText size={12} style={{ color: "#4ade80" }} />
          Invoice #INV-2940
        </span>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4ade80" }}>$1,200.00</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.68rem" }}>
        <span style={{ color: "#94a3b8" }}>Billing Batch Net Total</span>
        <strong style={{ color: "#ffffff" }}>${revenueTotal.toLocaleString()}.00</strong>
      </div>

      <button
        onClick={handlePay}
        disabled={invoiceState !== "unpaid"}
        style={{
          width: "100%",
          padding: "6px",
          borderRadius: "6px",
          border: "none",
          backgroundColor: invoiceState === "paid" ? "#22c55e" : invoiceState === "paying" ? "rgba(255, 255, 255, 0.12)" : "#ffffff",
          color: invoiceState === "paid" || invoiceState === "paying" ? "#ffffff" : "#030712",
          fontSize: "0.72rem",
          fontWeight: 600,
          cursor: invoiceState === "unpaid" ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          transition: "all 0.2s"
        }}
      >
        {invoiceState === "paying" ? (
          <>
            <RefreshCw size={11} className="animate-spin" />
            <span>Authorizing card...</span>
          </>
        ) : invoiceState === "paid" ? (
          <>
            <Check size={11} />
            <span>Payment Approved</span>
          </>
        ) : (
          <span>Dispatch Invoice Payment</span>
        )}
      </button>
    </div>
  );
}
