"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money, moneyCompact } from "@/lib/currency";

/* ------------------------------ Shared tooltip ----------------------------- */

function NeuTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="neu-chart-tooltip">
      {label && <div className="label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden />
          <span className="text-sub">{p.name}</span>
          <span className="ml-auto pl-3 font-semibold text-ink">{money(Number(p.value ?? 0))}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ Spending donut ----------------------------- */

export interface DonutSlice {
  key: string;
  name: string;
  value: number;
  color: string;
}

/**
 * Donut/ring visualization with a soft raised center — reference visual
 * language (PRD §25). Clicking a slice routes to filtered transactions.
 */
export function SpendingDonut({
  slices,
  centerLabel,
  centerValue,
  onSliceClick,
}: {
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: string;
  onSliceClick?: (key: string) => void;
}) {
  const top = useMemo(() => slices.filter((s) => s.value > 0).slice(0, 6), [slices]);
  const rest = useMemo(() => slices.filter((s) => s.value > 0).slice(6), [slices]);
  const data = rest.length
    ? [...top, { key: "__other", name: "Other", value: rest.reduce((s, r) => s + r.value, 0), color: "#B9C4C9" }]
    : top;

  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="64%"
            outerRadius="94%"
            paddingAngle={3}
            cornerRadius={7}
            stroke="none"
            isAnimationActive
            animationDuration={700}
            onClick={(entry) => {
              const key = (entry as unknown as { payload?: { key?: string } })?.payload?.key;
              if (key && key !== "__other" && onSliceClick) onSliceClick(key);
            }}
            style={{ cursor: onSliceClick ? "pointer" : "default" }}
          >
            {data.map((s) => (
              <Cell key={s.key} fill={s.color} />
            ))}
          </Pie>
          <Tooltip content={<NeuTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="neu-card-sm flex h-[54%] w-[54%] max-w-[130px] flex-col items-center justify-center !rounded-full text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">{centerLabel}</span>
          <span className="display-number mt-0.5 text-lg text-ink md:text-xl">{centerValue}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Money flow -------------------------------- */

export interface FlowPoint {
  label: string;
  income: number;
  expense: number;
}

/** Income vs expense vs net — soft teal/orange lines in a recessed well (PRD §23, §67). */
export function MoneyFlowChart({ data, height = 260 }: { data: FlowPoint[]; height?: number }) {
  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Money flow chart: income versus expenses over time">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="flowIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--c-teal)" stopOpacity={0.38} />
              <stop offset="100%" stopColor="var(--c-teal)" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="flowExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--c-orange)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--c-orange)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tickLine={false} axisLine={false} dy={8} interval="preserveStartEnd" />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => moneyCompact(v)}
          />
          <Tooltip content={<NeuTooltip />} cursor={{ stroke: "var(--c-mint)", strokeDasharray: "4 4", strokeOpacity: 0.6 }} />
          <Area
            type="monotone"
            dataKey="income"
            name="Income"
            stroke="var(--c-teal)"
            strokeWidth={2.6}
            fill="url(#flowIncome)"
            animationDuration={800}
            activeDot={{ r: 5, strokeWidth: 0, fill: "var(--c-teal-deep)" }}
          />
          <Area
            type="monotone"
            dataKey="expense"
            name="Expenses"
            stroke="var(--c-orange)"
            strokeWidth={2.6}
            fill="url(#flowExpense)"
            animationDuration={800}
            activeDot={{ r: 5, strokeWidth: 0, fill: "var(--c-orange)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
