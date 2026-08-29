"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Copy, Pencil, Search, Trash2, X } from "lucide-react";
import type { Transaction, TransactionType } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useToast } from "@/contexts/ToastContext";
import { Avatar, NeuButton, NeuInput, NeuSelect, Segmented } from "@/components/ui/primitives";
import { ConfirmDialog, Modal } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/feedback";
import { DynamicIcon } from "@/components/ui/icon";
import { TransactionForm } from "./TransactionForm";
import { deleteTransaction } from "@/lib/firebase/transactions";
import { dayLabel, dateLabel } from "@/lib/dates";
import { money, signedMoney } from "@/lib/currency";

export interface TxFilters {
  search: string;
  type: TransactionType | "all";
  categoryId: string;
  person: string; // uid | "" 
  accountId: string;
  ownership: "all" | "shared" | "personal";
}

export const EMPTY_FILTERS: TxFilters = { search: "", type: "all", categoryId: "", person: "", accountId: "", ownership: "all" };

export function filterTransactions(txs: Transaction[], f: TxFilters): Transaction[] {
  return txs.filter((t) => {
    if (t.deletedAt) return false;
    if (f.type !== "all" && t.type !== f.type) return false;
    if (f.categoryId && t.categoryId !== f.categoryId) return false;
    if (f.accountId && t.accountId !== f.accountId && t.fromAccountId !== f.accountId && t.toAccountId !== f.accountId) return false;
    if (f.person && t.paidBy !== f.person) return false;
    if (f.ownership !== "all" && t.ownership !== f.ownership) return false;
    if (f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      const hay = `${t.description} ${t.notes} ${t.tags.join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function activeFilterCount(f: TxFilters): number {
  let n = 0;
  if (f.type !== "all") n++;
  if (f.categoryId) n++;
  if (f.person) n++;
  if (f.accountId) n++;
  if (f.ownership !== "all") n++;
  return n;
}

/** Date-grouped transaction list with search & filters (PRD §35–36). */
export function TransactionList({ transactions, presetFilters, presetLabel }: { transactions: Transaction[]; presetFilters?: Partial<TxFilters>; presetLabel?: string }) {
  const { profile } = useAuth();
  const { categories, accounts, members, memberUids, householdId } = useHousehold();
  const toast = useToast();

  const [filters, setFilters] = useState<TxFilters>({ ...EMPTY_FILTERS, ...presetFilters });
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const visible = useMemo(() => filterTransactions(transactions, filters), [transactions, filters]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of visible) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [visible]);

  const catOf = (id: string) => categories.find((c) => c.id === id);
  const memberOf = (uid: string | null) => members.find((m) => m.uid === uid);

  async function doDelete() {
    if (!confirmingDelete || !householdId || !profile) return;
    setDeleting(true);
    try {
      await deleteTransaction(householdId, confirmingDelete.id, profile.uid, memberUids);
      toast.success("Transaction deleted");
      setConfirmingDelete(null);
      setEditing(null);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Couldn't delete. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search + filter toggle */}
      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
          <NeuInput
            className="!pl-10"
            placeholder="Search description, notes, tags…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            aria-label="Search transactions"
          />
        </div>
        <NeuButton onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
          Filters{activeFilterCount(filters) > 0 ? ` · ${activeFilterCount(filters)}` : ""}
        </NeuButton>
      </div>

      {showFilters && (
        <div className="neu-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="mb-1.5 ml-1 text-[12px] font-semibold text-sub">Type</p>
            <Segmented
              ariaLabel="Filter type"
              value={filters.type}
              onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
              options={[
                { value: "all", label: "All" },
                { value: "expense", label: "Expense" },
                { value: "income", label: "Income" },
                { value: "transfer", label: "Transfer" },
              ]}
            />
          </div>
          <div>
            <p className="mb-1.5 ml-1 text-[12px] font-semibold text-sub">Category</p>
            <NeuSelect value={filters.categoryId} onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))} aria-label="Filter category">
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NeuSelect>
          </div>
          <div>
            <p className="mb-1.5 ml-1 text-[12px] font-semibold text-sub">Person</p>
            <NeuSelect value={filters.person} onChange={(e) => setFilters((f) => ({ ...f, person: e.target.value }))} aria-label="Filter person">
              <option value="">Anyone</option>
              {members.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {m.displayName}
                </option>
              ))}
            </NeuSelect>
          </div>
          <div>
            <p className="mb-1.5 ml-1 text-[12px] font-semibold text-sub">Account</p>
            <NeuSelect value={filters.accountId} onChange={(e) => setFilters((f) => ({ ...f, accountId: e.target.value }))} aria-label="Filter account">
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NeuSelect>
          </div>
          <div>
            <p className="mb-1.5 ml-1 text-[12px] font-semibold text-sub">Visibility</p>
            <Segmented
              ariaLabel="Filter visibility"
              value={filters.ownership}
              onChange={(v) => setFilters((f) => ({ ...f, ownership: v }))}
              options={[
                { value: "all", label: "All" },
                { value: "shared", label: "Shared" },
                { value: "personal", label: "Personal" },
              ]}
            />
          </div>
          <div className="flex items-end">
            <NeuButton variant="ghost" onClick={() => setFilters({ ...EMPTY_FILTERS, ...presetFilters })}>
              <X size={14} aria-hidden /> Clear filters
            </NeuButton>
          </div>
        </div>
      )}

      {/* List */}
      {groups.length === 0 ? (
        <div className="neu-card">
          <EmptyState
            icon={<Search size={26} />}
            title={presetLabel ? `No ${presetLabel.toLowerCase()} yet` : "No transactions found"}
            description={
              filters.search || activeFilterCount(filters) > 0
                ? "Try clearing the filters to see everything."
                : "Add your first income or expense to see your financial picture."
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(([date, items]) => (
            <section key={date} aria-label={dayLabel(date)}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h3 className="font-display text-[13px] font-bold uppercase tracking-wider text-sub">{dayLabel(date)}</h3>
                <span className="text-[11px] text-faint">{dateLabel(date)}</span>
              </div>
              <div className="neu-card divide-y divide-[var(--c-border)] overflow-hidden p-1.5">
                {items.map((t) => {
                  const cat = catOf(t.categoryId);
                  const who = memberOf(t.paidBy === "both" ? t.createdBy : t.paidBy);
                  return (
                    <button
                      key={t.id}
                      onClick={() => setEditing(t)}
                      className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-colors hover:bg-[rgba(138,206,209,0.08)]"
                      aria-label={`Edit ${t.description}, ${signedMoney(t.type === "income" ? t.amount : -t.amount)}`}
                    >
                      <Avatar name={who?.displayName ?? "?"} photoURL={who?.photoURL} size={36} />
                      <span className="neu-inset-sm flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ color: t.type === "income" ? "var(--c-teal)" : t.type === "transfer" ? "var(--c-text-sub)" : "var(--c-orange)" }}>
                        {t.type === "transfer" ? <ArrowLeftRight size={15} aria-hidden /> : <DynamicIcon name={cat?.icon ?? "CircleEllipsis"} size={15} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[14px] font-semibold text-ink">{t.description || cat?.name}</span>
                          {t.ownership === "personal" && <span className="neu-chip !cursor-default !py-0.5 !px-2 !text-[10px]">Personal</span>}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-sub">
                          {t.type !== "transfer" && cat && (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.color }} aria-hidden />
                              {cat.name} ·
                            </>
                          )}
                          {t.paidBy === "both" ? "Both" : who?.displayName.split(" ")[0] ?? "—"}
                          {t.isRecurring && <span className="font-semibold text-teal"> · repeats</span>}
                        </span>
                      </span>
                      <span className={`display-number shrink-0 text-[15px] ${t.type === "income" ? "metric-up" : t.type === "expense" ? "metric-down" : "text-sub"}`}>
                        {signedMoney(t.type === "income" ? t.amount : -t.amount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Transaction">
        {editing && (
          <div className="flex flex-col gap-4">
            <TransactionForm
              key={`${editing.id}-${refreshKey}`}
              editing={editing}
              onClose={() => setEditing(null)}
              onSaved={() => setRefreshKey((k) => k + 1)}
            />
            <div className="neu-divider" />
            <div className="flex justify-between">
              <NeuButton variant="danger" size="sm" onClick={() => setConfirmingDelete(editing)}>
                <Trash2 size={14} aria-hidden /> Delete
              </NeuButton>
              <NeuButton
                size="sm"
                onClick={() => {
                  setEditing(null);
                  toast.info("Opening a copy…");
                  setTimeout(() => setEditing({ ...editing, id: "", createdAt: editing.createdAt, createdBy: editing.createdBy } as Transaction), 50);
                }}
              >
                <Copy size={14} aria-hidden /> Duplicate
              </NeuButton>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmingDelete)}
        onClose={() => setConfirmingDelete(null)}
        onConfirm={doDelete}
        loading={deleting}
        title="Delete transaction?"
        message={`This removes ${confirmingDelete?.description ?? "the transaction"} (${money(confirmingDelete?.amount ?? 0)}) for both partners. Balances and budgets update immediately.`}
        confirmLabel="Delete"
      />

      {/* Detail hint for a11y */}
      <span className="sr-only">
        <Pencil size={1} aria-hidden /> Tap a transaction to view, edit, duplicate or delete it.
      </span>
    </div>
  );
}
