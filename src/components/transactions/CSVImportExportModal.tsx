"use client";

import { useMemo, useState } from "react";
import { Check, Download, FileSpreadsheet, FileText, HelpCircle, Info, Upload, X } from "lucide-react";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import type { Account, Category, Ownership, Transaction, TransactionType } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useToast } from "@/contexts/ToastContext";
import { Modal } from "@/components/ui/overlay";
import { NeuButton, NeuSelect, Segmented } from "@/components/ui/primitives";
import { getDb } from "@/lib/firebase/firestore";
import { logActivity } from "@/lib/firebase/activity";
import { todayISO } from "@/lib/dates";

interface CSVImportExportModalProps {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onImportComplete?: () => void;
}

interface ParsedRow {
  raw: Record<string, string>;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string | null;
  ownership: Ownership;
  paidBy: string;
  isValid: boolean;
  error?: string;
}

export function CSVImportExportModal({
  open,
  onClose,
  transactions,
  onImportComplete,
}: CSVImportExportModalProps) {
  const { profile } = useAuth();
  const { householdId, categories, accounts, members, memberUids } = useHousehold();
  const toast = useToast();

  const [mode, setMode] = useState<"export" | "import">("export");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  
  // Mapping state
  const [mapDate, setMapDate] = useState("");
  const [mapDesc, setMapDesc] = useState("");
  const [mapAmount, setMapAmount] = useState("");
  const [mapType, setMapType] = useState("");
  const [mapCategory, setMapCategory] = useState("");
  const [mapAccount, setMapAccount] = useState("");
  
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");

  // Export CSV generator
  function handleExport() {
    if (transactions.length === 0) {
      toast.error("No transactions available to export.");
      return;
    }

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
    const memberMap = new Map(members.map((m) => [m.uid, m.displayName]));

    const header = ["Date", "Type", "Description", "Category", "Amount", "Currency", "Account", "Paid By", "Ownership", "Notes", "Tags"];
    const lines = [header.join(",")];

    for (const t of transactions) {
      if (t.deletedAt) continue;
      const row = [
        t.date,
        t.type,
        `"${(t.description || "").replace(/"/g, '""')}"`,
        `"${(categoryMap.get(t.categoryId) || "").replace(/"/g, '""')}"`,
        t.amount.toFixed(2),
        t.currency || "BDT",
        `"${(t.accountId ? accountMap.get(t.accountId) || "" : "").replace(/"/g, '""')}"`,
        `"${(t.paidBy === "both" ? "Both" : memberMap.get(t.paidBy) || "").replace(/"/g, '""')}"`,
        t.ownership,
        `"${(t.notes || "").replace(/"/g, '""')}"`,
        `"${(t.tags || []).join("; ").replace(/"/g, '""')}"`,
      ];
      lines.push(row.join(","));
    }

    const csvBlob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `our-money-transactions-${todayISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${lines.length - 1} transactions to CSV.`);
  }

  // Handle file drop / select
  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || "");
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  }

  function parseCSV(text: string) {
    const lines = text
      .split(/\r\n|\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length < 2) {
      toast.error("The CSV file must contain a header row and at least one data row.");
      return;
    }

    // Basic CSV parser accounting for quotes
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          result.push(cur.trim());
          cur = "";
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const parsedHeaders = parseLine(lines[0]);
    const parsedRows = lines.slice(1).map(parseLine);

    setHeaders(parsedHeaders);
    setRawRows(parsedRows);

    // Auto-detect mappings
    parsedHeaders.forEach((h) => {
      const low = h.toLowerCase();
      if (low.includes("date") || low.includes("time")) setMapDate(h);
      else if (low.includes("desc") || low.includes("name") || low.includes("memo") || low.includes("payee"))
        setMapDesc(h);
      else if (low.includes("amount") || low.includes("total") || low.includes("debit") || low.includes("spent"))
        setMapAmount(h);
      else if (low.includes("type") || low.includes("kind")) setMapType(h);
      else if (low.includes("cat") || low.includes("group")) setMapCategory(h);
      else if (low.includes("acc") || low.includes("wallet") || low.includes("bank")) setMapAccount(h);
    });

    setStep("map");
  }

  // Prepared parsed rows for preview
  const parsedPreviewRows = useMemo<ParsedRow[]>(() => {
    if (!headers.length || !rawRows.length) return [];
    const dateIdx = headers.indexOf(mapDate);
    const descIdx = headers.indexOf(mapDesc);
    const amtIdx = headers.indexOf(mapAmount);
    const typeIdx = headers.indexOf(mapType);
    const catIdx = headers.indexOf(mapCategory);
    const accIdx = headers.indexOf(mapAccount);

    const defaultCat = categories.find((c) => c.kind === "expense")?.id || categories[0]?.id || "general";
    const defaultAcc = accounts[0]?.id || null;
    const defaultUid = profile?.uid || members[0]?.uid || "";

    return rawRows.map((row) => {
      const rawObj: Record<string, string> = {};
      headers.forEach((h, i) => {
        rawObj[h] = row[i] || "";
      });

      let rawDate = dateIdx >= 0 ? row[dateIdx] : todayISO();
      // Normalize simple date
      if (rawDate && rawDate.includes("/")) {
        const parts = rawDate.split("/");
        if (parts.length === 3) {
          if (parts[0].length === 4) rawDate = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
          else rawDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }
      if (!rawDate || !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        rawDate = todayISO();
      }

      const desc = descIdx >= 0 ? row[descIdx] || "Imported expense" : "Imported transaction";
      const rawAmtStr = amtIdx >= 0 ? (row[amtIdx] || "").replace(/[^0-9.-]/g, "") : "0";
      const amount = Math.abs(parseFloat(rawAmtStr) || 0);

      let type: TransactionType = "expense";
      if (typeIdx >= 0) {
        const tStr = (row[typeIdx] || "").toLowerCase();
        if (tStr.includes("inc") || tStr.includes("credit") || tStr.includes("deposit")) type = "income";
        else if (tStr.includes("trans")) type = "transfer";
      }

      let categoryId = defaultCat;
      if (catIdx >= 0 && row[catIdx]) {
        const matched = categories.find(
          (c) => c.name.toLowerCase() === row[catIdx].toLowerCase()
        );
        if (matched) categoryId = matched.id;
      }

      let accountId = defaultAcc;
      if (accIdx >= 0 && row[accIdx]) {
        const matchedAcc = accounts.find(
          (a) => a.name.toLowerCase() === row[accIdx].toLowerCase()
        );
        if (matchedAcc) accountId = matchedAcc.id;
      }

      const isValid = amount > 0 && desc.trim().length > 0;

      return {
        raw: rawObj,
        date: rawDate,
        description: desc,
        amount,
        type,
        categoryId,
        accountId,
        ownership: "shared" as Ownership,
        paidBy: defaultUid,
        isValid,
        error: !isValid ? "Amount or description invalid" : undefined,
      };
    });
  }, [headers, rawRows, mapDate, mapDesc, mapAmount, mapType, mapCategory, mapAccount, categories, accounts, members, profile]);

  async function executeImport() {
    if (!householdId || !profile) return;
    const validRows = parsedPreviewRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error("No valid rows to import.");
      return;
    }

    setImporting(true);
    try {
      const db = getDb();
      // Chunk batches by 400
      const CHUNK_SIZE = 400;
      for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
        const chunk = validRows.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        for (const row of chunk) {
          const ref = doc(collection(db, "households", householdId, "transactions"));
          batch.set(ref, {
            householdId,
            type: row.type,
            amount: row.amount,
            currency: "BDT",
            categoryId: row.categoryId,
            description: row.description,
            notes: "Imported via CSV",
            date: row.date,
            accountId: row.accountId,
            fromAccountId: null,
            toAccountId: null,
            createdBy: profile.uid,
            updatedBy: profile.uid,
            paidBy: row.paidBy,
            ownership: row.ownership,
            isRecurring: false,
            recurringId: null,
            recurrence: null,
            nextDueDate: null,
            attachmentUrl: null,
            tags: ["csv-import"],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            deletedAt: null,
          });
        }

        await batch.commit();
      }

      await logActivity(householdId, {
        actorId: profile.uid,
        action: "transactions.imported",
        entityType: "transaction",
        entityId: "csv_import",
        description: `imported ${validRows.length} transactions from CSV`,
        metadata: { count: validRows.length },
      });

      toast.success(`Successfully imported ${validRows.length} transactions!`);
      setStep("done");
      onImportComplete?.();
      setTimeout(() => {
        onClose();
        setStep("upload");
        setCsvText("");
      }, 1200);
    } catch {
      toast.error("Failed to import transactions. Please check your data.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="CSV Import & Export">
      <div className="flex flex-col gap-5">
        <Segmented
          ariaLabel="CSV Action"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setStep("upload");
          }}
          options={[
            { value: "export", label: "Export CSV" },
            { value: "import", label: "Import CSV / Spreadsheet" },
          ]}
        />

        {mode === "export" ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="neu-inset flex flex-col gap-2 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-ink font-semibold">
                <FileSpreadsheet size={18} className="text-teal" />
                <span>Export Transaction Ledger</span>
              </div>
              <p className="text-[13px] text-sub">
                Downloads all active transactions with dates, descriptions, categories, accounts, ownership, and paid-by
                splits formatted for Excel, Google Sheets, or backup.
              </p>
            </div>

            <div className="flex justify-between items-center px-1 text-[13px] text-sub">
              <span>Ready to export:</span>
              <span className="font-semibold text-ink">{transactions.filter((t) => !t.deletedAt).length} records</span>
            </div>

            <NeuButton variant="primary" size="lg" onClick={handleExport} className="w-full">
              <Download size={16} aria-hidden /> Download CSV
            </NeuButton>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {step === "upload" && (
              <div className="flex flex-col gap-4">
                <div
                  className="neu-inset flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-teal/40 cursor-pointer text-center hover:bg-[rgba(138,206,209,0.08)] transition-all"
                  onClick={() => document.getElementById("csv-file-input")?.click()}
                >
                  <Upload size={32} className="text-teal" />
                  <div>
                    <p className="font-semibold text-ink text-[14.5px]">Click or drag a CSV file here</p>
                    <p className="text-[12px] text-sub mt-0.5">Supports bank statements, Excel exports, Google Sheets</p>
                  </div>
                  <input
                    id="csv-file-input"
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[12px] font-semibold text-sub">Or paste raw CSV text:</span>
                  <textarea
                    rows={4}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="Date,Description,Amount&#10;2026-09-01,Groceries,3500&#10;2026-09-02,Internet,1500"
                    className="neu-input font-mono text-[12px] p-3 w-full rounded-xl"
                  />
                  <NeuButton
                    variant="primary"
                    disabled={!csvText.trim()}
                    onClick={() => parseCSV(csvText)}
                    className="self-end"
                  >
                    Parse Text
                  </NeuButton>
                </div>
              </div>
            )}

            {step === "map" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink text-[14px]">Map CSV Columns ({rawRows.length} rows found)</span>
                  <NeuButton variant="ghost" size="sm" onClick={() => setStep("upload")}>
                    Back
                  </NeuButton>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11.5px] font-semibold text-sub">Date Column *</label>
                    <NeuSelect value={mapDate} onChange={(e) => setMapDate(e.target.value)}>
                      <option value="">Select column</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </NeuSelect>
                  </div>

                  <div>
                    <label className="text-[11.5px] font-semibold text-sub">Description Column *</label>
                    <NeuSelect value={mapDesc} onChange={(e) => setMapDesc(e.target.value)}>
                      <option value="">Select column</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </NeuSelect>
                  </div>

                  <div>
                    <label className="text-[11.5px] font-semibold text-sub">Amount Column *</label>
                    <NeuSelect value={mapAmount} onChange={(e) => setMapAmount(e.target.value)}>
                      <option value="">Select column</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </NeuSelect>
                  </div>

                  <div>
                    <label className="text-[11.5px] font-semibold text-sub">Type Column (Optional)</label>
                    <NeuSelect value={mapType} onChange={(e) => setMapType(e.target.value)}>
                      <option value="">Default to Expense</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </NeuSelect>
                  </div>

                  <div>
                    <label className="text-[11.5px] font-semibold text-sub">Category Column (Optional)</label>
                    <NeuSelect value={mapCategory} onChange={(e) => setMapCategory(e.target.value)}>
                      <option value="">Auto match or General</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </NeuSelect>
                  </div>

                  <div>
                    <label className="text-[11.5px] font-semibold text-sub">Account Column (Optional)</label>
                    <NeuSelect value={mapAccount} onChange={(e) => setMapAccount(e.target.value)}>
                      <option value="">Default to first account</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </NeuSelect>
                  </div>
                </div>

                <NeuButton
                  variant="primary"
                  disabled={!mapDate || !mapDesc || !mapAmount}
                  onClick={() => setStep("preview")}
                  className="w-full mt-2"
                >
                  Preview & Validate Data ({rawRows.length} Rows)
                </NeuButton>
              </div>
            )}

            {step === "preview" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-ink text-[14px]">Import Preview</span>
                    <p className="text-[11.5px] text-sub">
                      {parsedPreviewRows.filter((r) => r.isValid).length} of {parsedPreviewRows.length} rows valid
                    </p>
                  </div>
                  <NeuButton variant="ghost" size="sm" onClick={() => setStep("map")}>
                    Edit Mapping
                  </NeuButton>
                </div>

                <div className="neu-inset max-h-[260px] overflow-auto rounded-xl p-2">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="text-faint font-semibold uppercase tracking-wider text-[10px] border-b border-[var(--c-border)] pb-1">
                        <th className="p-1.5">Date</th>
                        <th className="p-1.5">Description</th>
                        <th className="p-1.5 text-right">Amount</th>
                        <th className="p-1.5">Type</th>
                        <th className="p-1.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--c-border)]">
                      {parsedPreviewRows.slice(0, 15).map((row, idx) => (
                        <tr key={idx} className="hover:bg-[rgba(138,206,209,0.06)]">
                          <td className="p-1.5 text-sub">{row.date}</td>
                          <td className="p-1.5 font-medium text-ink truncate max-w-[140px]">{row.description}</td>
                          <td className="p-1.5 text-right font-display text-ink">{row.amount.toFixed(2)}</td>
                          <td className="p-1.5 capitalize text-sub">{row.type}</td>
                          <td className="p-1.5">
                            {row.isValid ? (
                              <span className="text-teal font-semibold">Valid</span>
                            ) : (
                              <span className="text-danger font-semibold">{row.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedPreviewRows.length > 15 && (
                    <p className="text-center text-[11px] text-faint py-2">
                      ... and {parsedPreviewRows.length - 15} more rows
                    </p>
                  )}
                </div>

                <NeuButton
                  variant="primary"
                  size="lg"
                  loading={importing}
                  onClick={executeImport}
                  className="w-full"
                >
                  <Check size={16} aria-hidden /> Confirm & Import {parsedPreviewRows.filter((r) => r.isValid).length} Transactions
                </NeuButton>
              </div>
            )}

            {step === "done" && (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <span className="neu-inset flex h-14 w-14 items-center justify-center rounded-full text-teal">
                  <Check size={28} />
                </span>
                <p className="font-display text-lg font-semibold text-ink">Import Completed</p>
                <p className="text-[13px] text-sub">Your financial ledger has been updated live.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
