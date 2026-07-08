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
import Modal from "./Modal";

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
  activeModal: { id: string; payload?: unknown } | null;
  setActiveModal: (modal: { id: string; payload?: unknown } | null) => void;
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
  activeModal,
  setActiveModal,
}: CrmTabProps) {
  const [crmSheetPaste, setCrmSheetPaste] = useState("");
  const [crmSheetFileName, setCrmSheetFileName] = useState("");
  const [crmPanel, setCrmPanel] = useState<"none" | "source">("none");
  const [sheetScrollTop, setSheetScrollTop] = useState(0);

  const canEditCrmSheet = data.capabilities.canManageCrmSheets;
  const activeRoleOptions = (data.roleDefinitions || [])
    .filter((role) => role.status !== "Inactive")
    .map((role) => ({ label: role.label, value: role.key }));
  const audienceRoleOptions = [{ label: "All roles", value: "all" }, ...activeRoleOptions];
  const assignableEmployees = data.users.filter((user) => user.status === "Active");
  const activeCrmSheet = activeCrmSheetId ? data.crmSheets.find((sheet) => sheet.id === activeCrmSheetId) : null;

  const normalizeRole = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const roleList = (value?: string | null) => (value || "").split(",").map((role) => normalizeRole(role)).filter(Boolean);
  const userList = (value?: string | null) => (value || "").split(",").filter(Boolean);
  const currentUserId = data.session.userId.toString();
  const canEditActiveSheet = activeCrmSheet ? (
    canEditCrmSheet ||
    (
      activeCrmSheet.status === "Approved" &&
      !activeCrmSheet.locked &&
      (
        roleList(activeCrmSheet.editorRoles).includes("all") ||
        roleList(activeCrmSheet.editorRoles).includes(data.session.role) ||
        userList(activeCrmSheet.editorUsers).includes(currentUserId)
      )
    )
  ) : false;

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
      const { readSheet } = await import("read-excel-file/browser");
      const rows = await readSheet(file);
      const tsv = rows
        .map((row) => row.map((cell) => String(cell ?? "").replace(/\t/g, " ").trim()).join("\t"))
        .filter((line) => line.trim().length > 0)
        .join("\n");
      setCrmSheetPaste(tsv);
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

  const crmImportPreview = React.useMemo(() => {
    const source = crmSheetPaste.trim();
    if (!source) return null;
    const lines = source.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) return null;
    const delimiter = lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0].split(delimiter).map((cell) => cell.trim()).filter(Boolean);
    const rows = Math.max(lines.length - 1, 0);
    const phoneIndexes = headers
      .map((header, index) => ({ header, index }))
      .filter((item) => isPhoneColumn(item.header))
      .map((item) => item.index);
    const phones = lines.slice(1).flatMap((line) => {
      const cells = line.split(delimiter);
      return phoneIndexes.map((index) => cells[index]?.replace(/\D/g, "") || "").filter(Boolean);
    });
    const duplicatePhones = phones.length - new Set(phones).size;
    return { rows, columns: headers.length, phoneColumns: phoneIndexes.length, duplicatePhones };
  }, [crmSheetPaste]);

  const formatSheetDate = (value: Date | string | null | undefined) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
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
              <button className={styles.button} type="button" onClick={() => { setActiveCrmSheetId(null); setActiveModal({ id: "create-crm-sheet" }); }}>Import sheet</button>
            </>
          )}
          {activeCrmSheet && <button className={styles.ghostButton} type="button" onClick={() => setActiveCrmSheetId(null)}>Back to list</button>}
        </div>
      </div>}


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
                  <p className={styles.muted}>Visible to {sheet.audienceRoles === "all" ? "all roles" : sheet.audienceRoles || "selected roles"}{sheet.audienceUsers && sheet.audienceUsers !== "," ? " + selected people" : ""}</p>
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
        const rowHeight = 42;
        const virtualViewportRows = 34;
        const overscanRows = 14;
        const visibleStart = Math.max(0, Math.floor(sheetScrollTop / rowHeight) - overscanRows);
        const visibleEnd = Math.min(sheetRows.length, visibleStart + virtualViewportRows + overscanRows * 2);
        const visibleRows = sheetRows.slice(visibleStart, visibleEnd);
        const topSpacerHeight = visibleStart * rowHeight;
        const bottomSpacerHeight = Math.max(0, (sheetRows.length - visibleEnd) * rowHeight);
        const selectedCrmRow = sheetRows.find((row) => row.id === selectedCrmRowId) || sheetRows[0] || null;
        const canMarkRows = data.capabilities.canUseCrm && canEditActiveSheet && Boolean(selectedCrmRow);
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
            <div className={styles.sheetAppHeader} style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button className={styles.sheetLogoButton} type="button" onClick={() => setActiveCrmSheetId(null)} aria-label="Back to CRM sheets">
                  <Image src="/logo.png" alt="BLUEVOLT Logo" width={70} height={36} className={styles.bluevoltSheetLogo} />
                </button>
                <button className={styles.ghostButton} type="button" onClick={() => setActiveCrmSheetId(null)} style={{ padding: "6px 12px", minHeight: "unset", fontSize: "0.85rem" }}>
                  &larr; Back to CRM
                </button>
              </div>
              <div className={styles.sheetTitleBlock}>
                <div className={styles.sheetDocumentName}>{activeCrmSheet.title || "Untitled spreadsheet"} <span>*</span></div>
                <div className={styles.sheetSubTitle}>{activeCrmSheet.sourceName || "BLUEVOLT CRM source"} - {doneRows}/{totalRows} done</div>
              </div>
              <div className={styles.sheetHeaderActions}>
                <span className={activeCrmSheet.status === "Approved" ? `${styles.sheetStatusPill} ${styles.sheetStatusApproved}` : styles.sheetStatusPill}>{activeCrmSheet.status}{activeCrmSheet.locked ? " / Locked" : ""}</span>
                {!canEditActiveSheet && <span className={styles.sheetStatusPill}>Read only</span>}
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
                <strong>{canEditActiveSheet ? "Mark selected row" : "Selected row"}</strong>
                <span>{selectedCrmRow ? `Row ${sheetRows.findIndex((row) => row.id === selectedCrmRow.id) + 2}: ${selectedCrmRow.status}${selectedCrmRow.updatedByName ? ` - by ${selectedCrmRow.updatedByName}` : ""}${selectedCrmRow.updatedAt ? ` - ${formatSheetDate(selectedCrmRow.updatedAt)}` : ""}` : "Select a row in the sheet"}</span>
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

            <div className={styles.sheetAccessStrip}>
              <span><strong>Access</strong> {activeCrmSheet.audienceRoles === "all" ? "All roles" : activeCrmSheet.audienceRoles || "Role restricted"}</span>
              <span><strong>People</strong> {(() => {
                const ids = (activeCrmSheet.audienceUsers || "").split(",").filter(Boolean);
                if (ids.length === 0) return "Everyone";
                const names = ids.map((id) => data.users.find((u) => u.id.toString() === id.trim())?.name ?? `#${id}`);
                if (names.length <= 2) return names.join(", ");
                return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
              })()}</span>
              <span><strong>Editors</strong> {activeCrmSheet.editorRoles === "all" ? "All roles" : activeCrmSheet.editorRoles || "Owner role"}</span>
              <span><strong>Requested by</strong> {activeCrmSheet.requestedByName || "Unknown"}</span>
            </div>

            {canEditCrmSheet && (
              <button className={styles.vercelButtonPrimary} style={{ margin: "16px 0", padding: "8px 12px", minHeight: "unset", width: "fit-content" }} type="button" onClick={() => setActiveModal({ id: "edit-crm-sheet", payload: activeCrmSheet })}>
                Edit sheet access
              </button>
            )}

            <div className={styles.sheetFormulaRow}>
              <span>{selectedReference}</span>
              <span>fx</span>
              <input className={styles.sheetFormulaInput} readOnly value={selectedValue} placeholder="Select a cell to preview its value" />
            </div>

            <div className={styles.sheetGridShell} onScroll={(event) => setSheetScrollTop(event.currentTarget.scrollTop)}>
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
                    <>
                    {topSpacerHeight > 0 && (
                      <tr aria-hidden="true">
                        <td className={styles.virtualSpacerCell} colSpan={columns.length + 2} style={{ height: topSpacerHeight }} />
                      </tr>
                    )}
                    {visibleRows.map((row, visibleRowIndex: number) => {
                      const rowIndex = visibleStart + visibleRowIndex;
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
                                {activeCrmSheet.locked || !canEditActiveSheet ? (
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
                    })}
                    {bottomSpacerHeight > 0 && (
                      <tr aria-hidden="true">
                        <td className={styles.virtualSpacerCell} colSpan={columns.length + 2} style={{ height: bottomSpacerHeight }} />
                      </tr>
                    )}
                    </>
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
      {activeModal?.id === "create-crm-sheet" && (
        <Modal title="Create / Import CRM Sheet" subtitle="Upload or paste Excel/CSV data. Roles with CRM Manage access can create and change sheets." onClose={() => setActiveModal(null)}>
          <form className={styles.formGrid} onSubmit={submit(saveCrmSheetRequest, () => setActiveModal(null))}>
          <div className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Sheet Title</span>
            <input className={styles.input} name="title" placeholder="e.g. May leads - Bengaluru" required />
          </div>
          <input type="hidden" name="sourceName" value="Imported Data" />
          <input type="hidden" name="ownerRole" value={data.session.role} />
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Visible Roles</span>
            <select className={styles.select} name="audienceRoles" multiple size={Math.min(Math.max(audienceRoleOptions.length, 3), 8)} defaultValue={["all"]}>
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
            <span className={styles.label}>Editor Roles</span>
            <select className={styles.select} name="editorRoles" multiple size={Math.min(Math.max(audienceRoleOptions.length, 3), 8)} defaultValue={[data.session.role]}>
              {audienceRoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
            <span className={styles.muted}>Editors can mark rows and edit cells. They are automatically kept visible.</span>
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Editor Employees</span>
            <select className={styles.select} name="editorUsers" multiple size={Math.min(Math.max(assignableEmployees.length, 3), 8)}>
              {assignableEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} ({employee.email})</option>)}
            </select>
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
          {crmImportPreview && (
            <div className={`${styles.importPreview} ${styles.fieldWide}`}>
              <div>
                <span className={styles.label}>Import Preview</span>
                <strong>{crmImportPreview.rows} rows, {crmImportPreview.columns} columns</strong>
              </div>
              <div className={styles.miniStatGrid}>
                <span>{crmImportPreview.phoneColumns} phone columns</span>
                <span>{crmImportPreview.duplicatePhones} duplicate phones</span>
                <span>{crmImportPreview.rows > 1000 ? "Large sheet: virtual scroll ready" : "Ready for quick import"}</span>
              </div>
            </div>
          )}
          <div className={`${styles.fieldWide}`} style={{ display: "flex", gap: 12 }}>
            <button className={styles.button} type="submit" style={{ flex: 1 }}>Create Sheet</button>
            <button className={styles.ghostButton} type="button" onClick={() => setCrmPanel("none")} style={{ flex: 1 }}>Cancel</button>
          </div>
            <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Create / Import Sheet</button>
          </form>
        </Modal>
      )}

      {activeModal?.id === "edit-crm-sheet" && Boolean(activeModal.payload) && (
        <Modal title="Edit sheet access" subtitle="Update roles and users who can view/edit this sheet." onClose={() => setActiveModal(null)}>
                <form className={styles.formGrid} onSubmit={submit(saveCrmSheetRequest, () => setActiveModal(null))}>
                  <input type="hidden" name="id" value={activeCrmSheet.id} />
                  <input type="hidden" name="sourceName" value={activeCrmSheet.sourceName || "Imported Data"} />
                  <input type="hidden" name="pasteData" value="" />
                  <label>
                    <span className={styles.label}>Sheet title</span>
                    <input className={styles.input} name="title" defaultValue={activeCrmSheet.title} required />
                  </label>
                  <label>
                    <span className={styles.label}>Owner role</span>
                    <select className={styles.select} name="ownerRole" defaultValue={activeCrmSheet.ownerRole || data.session.role}>
                      {activeRoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className={styles.label}>Visible roles</span>
                    <select className={styles.select} name="audienceRoles" multiple size={Math.min(Math.max(audienceRoleOptions.length, 3), 6)} defaultValue={(activeCrmSheet.audienceRoles || "all").split(",").filter(Boolean)}>
                      {audienceRoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className={styles.label}>Visible employees</span>
                    <select className={styles.select} name="audienceUsers" multiple size={Math.min(Math.max(assignableEmployees.length, 3), 6)} defaultValue={(activeCrmSheet.audienceUsers || "").split(",").filter(Boolean)}>
                      {assignableEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} ({employee.email})</option>)}
                    </select>
                  </label>
                  <label>
                    <span className={styles.label}>Editor roles</span>
                    <select className={styles.select} name="editorRoles" multiple size={Math.min(Math.max(audienceRoleOptions.length, 3), 6)} defaultValue={(activeCrmSheet.editorRoles || activeCrmSheet.ownerRole || data.session.role).split(",").filter(Boolean)}>
                      {audienceRoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className={styles.label}>Editor employees</span>
                    <select className={styles.select} name="editorUsers" multiple size={Math.min(Math.max(assignableEmployees.length, 3), 6)} defaultValue={(activeCrmSheet.editorUsers || "").split(",").filter(Boolean)}>
                      {assignableEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} ({employee.email})</option>)}
                    </select>
                  </label>
                  <label className={styles.sheetAccessNotes}>
                    <span className={styles.label}>Notes</span>
                    <textarea className={styles.textarea} name="description" defaultValue={activeCrmSheet.description || ""} placeholder="Internal notes for this sheet" />
                  </label>
                  <button className={styles.button} type="submit">Save access</button>
          <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Changes</button>
          </form>
        </Modal>
      )}
    </div>
        );
      })()}
    </section>
  );
}
