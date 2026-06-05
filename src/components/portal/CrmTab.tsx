"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Handshake } from "lucide-react";
import {
  approveCrmSheet,
  deleteEmployeeEntity,
  getEmployeePortalData,
  saveCrmSheetRequest,
} from "@/app/actions/employee-portal";
import styles from "@/app/employee/portal.module.css";

type PortalData = Awaited<ReturnType<typeof getEmployeePortalData>>;

interface SelectedCrmCell {
  rowId: number;
  rowIndex: number;
  column: string;
  columnIndex: number;
  value: string;
}

interface CrmTabProps {
  data: PortalData;
  runAction: (handler: () => Promise<{ success: boolean; error?: string }>) => void;
  activeCrmSheetId: number | null;
  setActiveCrmSheetId: (id: number | null) => void;
  selectedCrmRowId: number | null;
  setSelectedCrmRowId: (id: number | null) => void;
  selectedCrmCell: SelectedCrmCell | null;
  setSelectedCrmCell: (cell: SelectedCrmCell | null) => void;
  setError: (err: string) => void;
  submit: <T extends Record<string, string>>(handler: (payload: T) => Promise<{ success: boolean; error?: string }>, cb?: () => void) => (e: React.FormEvent<HTMLFormElement>) => void;
  handleCellChange: (rowId: number, colName: string, newValue: string) => void;
  handleRowStatusChange: (rowId: number, status: string) => void;
}

export default function CrmTab({
  data,
  runAction,
  activeCrmSheetId,
  setActiveCrmSheetId,
  selectedCrmRowId,
  setSelectedCrmRowId,
  selectedCrmCell,
  setSelectedCrmCell,
  setError,
  submit,
  handleCellChange,
  handleRowStatusChange,
}: CrmTabProps) {
  const [crmSheetPaste, setCrmSheetPaste] = useState("");
  const [crmSheetFileName, setCrmSheetFileName] = useState("");
  const [crmPanel, setCrmPanel] = useState<"none" | "source">("none");

  const canEditCrmSheet = data.session.role === "super_admin";
  const activeRoleOptions = (data.roleDefinitions || [])
    .filter((role) => role.status !== "Inactive")
    .map((role) => ({ label: role.label, value: role.key }));
  const audienceRoleOptions = [{ label: "All roles", value: "all" }, ...activeRoleOptions];
  const assignableEmployees = data.users.filter((user) => user.status === "Active");
  const activeCrmSheet = activeCrmSheetId ? data.crmSheets.find((sheet) => sheet.id === activeCrmSheetId) : null;

  const loadCrmSheetFile = async (file?: File) => {
    if (!file) return;
    setError("");
    setCrmSheetFileName(file.name);
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "csv" || extension === "tsv" || extension === "txt") {
      setCrmSheetPaste(await file.text());
      return;
    }
    if (extension === "xlsx" || extension === "xls") {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName], { FS: "\t" });
      setCrmSheetPaste(csv);
      return;
    }
    setError("Upload an Excel, CSV, TSV, or text file.");
  };

  const handleUpdateCrmRowStatus = (rowId: number, status: string) => {
    handleRowStatusChange(rowId, status);
  };



  const sheetColumns = (sheet: PortalData["crmSheets"][number]) => (
    Array.isArray(sheet.columns) && sheet.columns.every((column) => typeof column === "string")
      ? sheet.columns as string[]
      : ["Company", "Contact", "Email", "Phone", "Next Action"]
  );

  const columnName = (index: number) => {
    let value = "";
    let cursor = index + 1;
    while (cursor > 0) {
      const remainder = (cursor - 1) % 26;
      value = String.fromCharCode(65 + remainder) + value;
      cursor = Math.floor((cursor - 1) / 26);
    }
    return value;
  };

  const cellReference = (rowIndex: number, columnIndex: number) => `${columnName(columnIndex)}${rowIndex + 2}`;

  const isPhoneColumn = (column: string) => {
    const value = column.toLowerCase();
    return value.includes("phone") || value.includes("mobile") || value.includes("contact number") || value.includes("call number");
  };

  const formatPhoneValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const digits = trimmed.replace(/\D/g, "");
    if (!digits) return trimmed;
    if (digits.length === 10 && digits.startsWith("11")) return `011-${digits.slice(2)}`;
    if (digits.length === 11 && digits.startsWith("0")) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length === 12 && digits.startsWith("91")) {
      const national = digits.slice(2);
      if (national.startsWith("11")) return `+91-11-${national.slice(2)}`;
      return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
    }
    if (digits.length === 10 && /^[6-9]/.test(digits)) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    return trimmed;
  };

  const displayCellValue = (column: string, value: string) => (
    isPhoneColumn(column) ? formatPhoneValue(value) : value
  );

  const rowData = (row: PortalData["crmSheets"][number]["rows"][number]) => {
    if (!row.data) return {};
    if (typeof row.data === "string") {
      try {
        return JSON.parse(row.data) as Record<string, string>;
      } catch {
        return {};
      }
    }
    return typeof row.data === "object" && !Array.isArray(row.data) ? row.data as Record<string, string> : {};
  };

  const rowTint = (status: string) => {
    if (status === "Done") return styles.crmDone;
    if (status === "Callback") return styles.crmCallback;
    if (status === "Not Interested") return styles.crmNotInterested;
    if (status === "Invalid") return styles.crmInvalid;
    return "";
  };

  return (
    <section className={`${styles.grid} ${activeCrmSheet ? styles.crmFullScreenGrid : ""}`}>
      {!activeCrmSheet && <div className={`${styles.card} ${styles.span12} ${styles.crmCommandBar}`}>
        <div>
          <h2 className={styles.cardTitle}><Handshake size={20} style={{ marginRight: 8, verticalAlign: "middle" }} /> CRM Sheets</h2>
          <p className={styles.muted}>{canEditCrmSheet ? "Open a source list, work it like a sheet, and mark each row by call outcome." : "Open approved source lists in read-only mode."}</p>
        </div>
        <div className={styles.toolbar}>
          {canEditCrmSheet && (
            <>
              <button className={styles.button} type="button" onClick={() => { setActiveCrmSheetId(null); setCrmPanel(crmPanel === "source" ? "none" : "source"); }}>Import sheet</button>
            </>
          )}
          {activeCrmSheet && <button className={styles.ghostButton} type="button" onClick={() => setActiveCrmSheetId(null)}>Back to list</button>}
        </div>
      </div>}

      {!activeCrmSheet && canEditCrmSheet && crmPanel === "source" && (
        <form className={`${styles.card} ${styles.span12} ${styles.formGrid}`} onSubmit={submit(saveCrmSheetRequest, () => setCrmPanel("none"))}>
          <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Create / Import CRM Sheet</h2>
          <p className={`${styles.muted} ${styles.fieldWide}`}>Upload or paste Excel/CSV data. Only super admin can create or change sheets.</p>
          <div className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Sheet Title</span>
            <input className={styles.input} name="title" placeholder="e.g. May leads - Bengaluru" required />
          </div>
          <input type="hidden" name="sourceName" value="Imported Data" />
          <input type="hidden" name="ownerRole" value={data.session.role} />
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Visible Roles</span>
            <select className={styles.select} name="audienceRoles" defaultValue="all">
              {audienceRoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Visible Employees</span>
            <select className={styles.select} name="audienceUsers" multiple size={Math.min(Math.max(assignableEmployees.length, 3), 8)}>
              {assignableEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} ({employee.email})</option>)}
            </select>
            <span className={styles.muted}>Optional. Use Ctrl/Shift to select multiple people. They can see the sheet even if their role is not selected.</span>
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Upload Excel / CSV</span>
            <input className={styles.input} type="file" accept=".xlsx,.xls,.csv,.tsv,.txt" onChange={(event) => loadCrmSheetFile(event.target.files?.[0])} />
            {crmSheetFileName && <span className={styles.muted}>{crmSheetFileName} loaded into the source box.</span>}
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Paste Excel / CSV Rows</span>
            <textarea className={styles.textarea} name="pasteData" value={crmSheetPaste} onChange={(event) => setCrmSheetPaste(event.target.value)} placeholder={"Company\tContact\tEmail\tPhone\tNext Action\nAcme Pvt Ltd\tRavi\travi@example.com\t9999999999\tCall today"} required />
          </label>
          <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Create Sheet</button>
        </form>
      )}

      {!activeCrmSheet && (
        <div className={`${styles.card} ${styles.span12}`}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.cardTitle}>Sheet List</h2>
              <p className={styles.muted}>Click any approved or pending source to open the spreadsheet workspace.</p>
            </div>
            <span className={styles.pill}>{data.crmSheets.length} sheets</span>
          </div>
          <div className={styles.sheetList}>{data.crmSheets.length === 0 ? <div className={styles.emptyState}>No sheets yet{canEditCrmSheet ? ". Use Import sheet above." : "."}</div> : data.crmSheets.map((sheet) => {
            const totalRows = sheet.rows.length;
            const doneRows = sheet.rows.filter((row) => row.status === "Done").length;
            const percent = totalRows ? Math.round((doneRows / totalRows) * 100) : 0;
            return (
              <button className={styles.sheetListItem} key={sheet.id} type="button" onClick={() => { setCrmPanel("none"); setActiveCrmSheetId(sheet.id); }}>
                <div>
                  <strong>{sheet.title}</strong>
                  <p className={styles.muted}>{sheet.sourceName || "Source not named"} - requested by {sheet.requestedByName || "Unknown"}</p>
                </div>
                <div className={styles.sheetMetaGrid}>
                  <span className={sheet.status === "Approved" ? `${styles.pill} ${styles.pillSuccess}` : sheet.status === "Rejected" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{sheet.status}{sheet.locked ? " / Locked" : ""}</span>
                  <span className={styles.pill}>{doneRows}/{totalRows} done</span>
                  <span className={styles.pill}>{percent}%</span>
                </div>
              </button>
            );
          })}</div>
        </div>
      )}

      {activeCrmSheet && (() => {
        const columns = sheetColumns(activeCrmSheet);
        const totalRows = activeCrmSheet.rows.length;
        const doneRows = activeCrmSheet.rows.filter((row) => row.status === "Done").length;
        const callbackRows = activeCrmSheet.rows.filter((row) => row.status === "Callback").length;
        const openRows = activeCrmSheet.rows.filter((row) => row.status === "Open").length;
        const sheetRows = activeCrmSheet.rows;
        const selectedCrmRow = sheetRows.find((row) => row.id === selectedCrmRowId) || sheetRows[0] || null;
        const canMarkRows = data.capabilities.canUseCrm && activeCrmSheet.status === "Approved" && !activeCrmSheet.locked && Boolean(selectedCrmRow);
        const selectedReference = selectedCrmCell ? cellReference(selectedCrmCell.rowIndex, selectedCrmCell.columnIndex) : "A1";
        const selectedValue = selectedCrmCell ? selectedCrmCell.value : "";
        const blankRowCount = Math.max(80 - sheetRows.length, 30);
        
        const markSelectedRow = (status: string) => {
          if (!selectedCrmRow || !canMarkRows) return;
          handleUpdateCrmRowStatus(selectedCrmRow.id, status);
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rIdx: number, cIdx: number) => {
          let targetRow = rIdx;
          let targetCol = cIdx;

          if (e.key === "ArrowUp") {
            targetRow = Math.max(0, rIdx - 1);
            e.preventDefault();
          } else if (e.key === "ArrowDown" || e.key === "Enter") {
            targetRow = Math.min(sheetRows.length - 1, rIdx + 1);
            e.preventDefault();
          } else if (e.key === "ArrowLeft") {
            targetCol = Math.max(1, cIdx - 1);
          } else if (e.key === "ArrowRight" || e.key === "Tab") {
            targetCol = Math.min(columns.length, cIdx + 1);
            e.preventDefault();
          } else {
            return;
          }

          const targetInput = document.querySelector(
            `input[data-row-index="${targetRow}"][data-col-index="${targetCol}"]`
          ) as HTMLInputElement | null;
          
          if (targetInput) {
            targetInput.focus();
            targetInput.select();
          }
        };

        return (
          <div className={styles.fullSheetApp}>
            <div className={styles.sheetAppHeader}>
              <button className={styles.sheetLogoButton} type="button" onClick={() => setActiveCrmSheetId(null)} aria-label="Back to CRM sheets">
                <Image src="/logo.png" alt="BlueVolt Logo" width={70} height={36} className={styles.bluevoltSheetLogo} />
              </button>
              <div className={styles.sheetTitleBlock}>
                <div className={styles.sheetDocumentName}>{activeCrmSheet.title || "Untitled spreadsheet"} <span>*</span></div>
                <div className={styles.sheetSubTitle}>{activeCrmSheet.sourceName || "BlueVolt CRM source"} - {doneRows}/{totalRows} done</div>
              </div>
              <div className={styles.sheetHeaderActions}>
                <span className={activeCrmSheet.status === "Approved" ? `${styles.sheetStatusPill} ${styles.sheetStatusApproved}` : styles.sheetStatusPill}>{activeCrmSheet.status}{activeCrmSheet.locked ? " / Locked" : ""}</span>
                {!canEditCrmSheet && <span className={styles.sheetStatusPill}>Read only</span>}
                {canEditCrmSheet && activeCrmSheet.status === "Pending" && (
                  <>
                    <button className={styles.sheetToolbarButton} type="button" onClick={() => runAction(() => approveCrmSheet({ id: activeCrmSheet.id.toString(), status: "Approved" }))}>Approve</button>
                    <button className={styles.sheetToolbarButton} type="button" onClick={() => runAction(() => approveCrmSheet({ id: activeCrmSheet.id.toString(), status: "Rejected" }))}>Reject</button>
                  </>
                )}
                {canEditCrmSheet && (
                  <button className={styles.sheetToolbarButton} type="button" onClick={() => {
                    if (confirm("Are you sure you want to delete this sheet and all its rows?")) {
                      setActiveCrmSheetId(null);
                      runAction(() => deleteEmployeeEntity({ entityType: "crmSheet", id: activeCrmSheet.id.toString() }));
                    }
                  }}>Delete sheet</button>
                )}
              </div>
            </div>
            <div className={styles.sheetMarkingToolbar}>
              <div className={styles.sheetMarkSummary}>
                <strong>{canEditCrmSheet ? "Mark selected row" : "Selected row"}</strong>
                <span>{selectedCrmRow ? `Row ${sheetRows.findIndex((row) => row.id === selectedCrmRow.id) + 2}: ${selectedCrmRow.status}` : "Select a row in the sheet"}</span>
              </div>
              {canMarkRows && (
                <div className={styles.sheetMarkButtons}>
                  {[
                    { status: "Open", label: "Open" },
                    { status: "Done", label: "Done" },
                    { status: "Callback", label: "Callback" },
                    { status: "Not Interested", label: "Not Interested" },
                    { status: "Invalid", label: "Invalid" },
                  ].map((item) => (
                    <button
                      className={`${styles.sheetMarkButton} ${item.status === "Done" ? styles.sheetMarkDone : item.status === "Callback" ? styles.sheetMarkCallback : item.status === "Not Interested" ? styles.sheetMarkNotInterested : item.status === "Invalid" ? styles.sheetMarkInvalid : ""}`}
                      key={item.status}
                      type="button"
                      onClick={() => markSelectedRow(item.status)}
                      disabled={!canMarkRows}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              <div className={styles.sheetStatusStats}>
                <span>{openRows} open</span>
                <span>{callbackRows} callback</span>
                <span>{doneRows} done</span>
              </div>
            </div>

            <div className={styles.sheetFormulaRow}>
              <span>{selectedReference}</span>
              <span>fx</span>
              <input className={styles.sheetFormulaInput} readOnly value={selectedValue} placeholder="Select a cell to preview its value" />
            </div>

            <div className={styles.sheetGridShell}>
              <table className={styles.googleSheetGrid}>
                <thead>
                  <tr>
                    <th className={styles.sheetCornerCell}></th>
                    {["Status", ...columns].map((column, index) => <th key={column}>{columnName(index)}</th>)}
                  </tr>
                  <tr>
                    <th className={styles.sheetRowNumber}>1</th>
                    <th>Status</th>
                    {columns.map((column) => <th key={column}>{column}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sheetRows.length === 0 ? (
                    Array.from({ length: 36 }).map((_, rowIndex) => (
                      <tr key={`blank-${rowIndex}`}>
                        <td className={styles.sheetRowNumber}>{rowIndex + 2}</td>
                        {["Status", ...columns].map((column, colIndex) => (
                          <td
                            className={(selectedCrmCell?.rowId === 0 && selectedCrmCell.rowIndex === rowIndex && selectedCrmCell.column === column) || (!selectedCrmCell && rowIndex === 0 && colIndex === 0) ? styles.sheetSelectedCell : ""}
                            key={`${rowIndex}-${column}`}
                            onClick={() => setSelectedCrmCell({ rowId: 0, rowIndex, column, columnIndex: colIndex, value: "" })}
                          ></td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    sheetRows.map((row, rowIndex: number) => {
                      const cells = rowData(row);
                      return (
                        <tr className={`${rowTint(row.status)} ${selectedCrmRow?.id === row.id ? styles.sheetSelectedRow : ""}`} key={row.id} onClick={() => setSelectedCrmRowId(row.id)}>
                          <td className={styles.sheetRowNumber}>{rowIndex + 2}</td>
                          <td className={selectedCrmCell && selectedCrmCell.rowId === row.id && selectedCrmCell.column === "Status" ? styles.sheetSelectedCell : ""} onClick={() => {
                            setSelectedCrmRowId(row.id);
                            setSelectedCrmCell({ rowId: row.id, rowIndex, column: "Status", columnIndex: 0, value: row.status });
                          }}>
                            <div className={styles.statusCell}>
                              <span className={styles.pill}>{row.status}</span>
                            </div>
                          </td>
                          {columns.map((column, colIndex) => {
                            const rawValue = cells[column] || "";
                            const shownValue = displayCellValue(column, rawValue);
                            const columnIndex = colIndex + 1;
                            return (
                              <td className={selectedCrmCell && selectedCrmCell.rowId === row.id && selectedCrmCell.column === column ? styles.sheetSelectedCell : ""} key={`${row.id}-${column}`}>
                                {activeCrmSheet.locked || !canEditCrmSheet ? (
                                  <div
                                    className={styles.sheetCellReadOnly}
                                    onClick={() => {
                                      setSelectedCrmRowId(row.id);
                                      setSelectedCrmCell({ rowId: row.id, rowIndex, column, columnIndex, value: shownValue });
                                    }}
                                  >
                                    {shownValue}
                                  </div>
                                ) : (
                                  <input
                                    className={styles.sheetCellInput}
                                    type="text"
                                    data-row-index={rowIndex}
                                    data-col-index={columnIndex}
                                    defaultValue={shownValue}
                                    onFocus={() => {
                                      setSelectedCrmRowId(row.id);
                                      setSelectedCrmCell({ rowId: row.id, rowIndex, column, columnIndex, value: shownValue });
                                    }}
                                    onChange={(e) => {
                                      setSelectedCrmCell({ rowId: row.id, rowIndex, column, columnIndex, value: displayCellValue(column, e.target.value) });
                                    }}
                                    onBlur={(e) => {
                                      const nextValue = displayCellValue(column, e.target.value);
                                      if (nextValue !== shownValue) {
                                        handleCellChange(row.id, column, nextValue);
                                      }
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, rowIndex, columnIndex)}
                                  />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                  {Array.from({ length: blankRowCount }).map((_, blankIndex) => (
                    <tr key={`blank-after-${blankIndex}`}>
                      <td className={styles.sheetRowNumber}>{sheetRows.length + blankIndex + 2}</td>
                      {["Status", ...columns].map((column, colIndex) => (
                        <td
                          className={selectedCrmCell?.rowId === 0 && selectedCrmCell.rowIndex === sheetRows.length + blankIndex && selectedCrmCell.column === column ? styles.sheetSelectedCell : ""}
                          key={`blank-after-${blankIndex}-${column}`}
                          onClick={() => setSelectedCrmCell({
                            rowId: 0,
                            rowIndex: sheetRows.length + blankIndex,
                            column,
                            columnIndex: colIndex,
                            value: "",
                          })}
                        ></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.sheetBottomBar}>
              <span className={styles.sheetTab}>Sheet1</span>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
