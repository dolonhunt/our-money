import type { HouseholdMember, HouseholdSplitRule, SplitMode, Transaction } from "@/types";
import { activeTransactions } from "@/lib/finance";
import { convertCurrency } from "@/lib/currency";

export interface CoupleMemberContribution {
  member: HouseholdMember;
  income: number;
  incomeRatio: number; // 0 to 1
  sharedPaid: number;
  personalPaid: number;
  targetShare: number;
  targetRatio: number; // 0 to 1
  netBalance: number; // positive = owed money; negative = owes money
}

export interface CoupleSettlementSummary {
  totalShared: number;
  totalPersonal: number;
  splitMode: SplitMode;
  contributions: CoupleMemberContribution[];
  owesMember: HouseholdMember | null; // who needs to pay
  owedMember: HouseholdMember | null; // who receives the payment
  settleAmount: number; // amount to pay to balance out
  isSettled: boolean;
}

/**
 * Calculates the advanced couple balance and settlement breakdown based on PRD §14.
 * Automatically normalizes foreign currency amounts to BDT using active FX rates.
 */
export function computeCoupleSettlement(
  transactions: Transaction[],
  members: HouseholdMember[],
  rule?: HouseholdSplitRule,
  customRates?: Record<string, number>
): CoupleSettlementSummary {
  const active = activeTransactions(transactions);
  const mode: SplitMode = rule?.mode ?? "equal_50_50";

  // Setup member maps
  const memberList = members.slice(0, 2);
  const m0 = memberList[0];
  const m1 = memberList[1];

  let totalShared = 0;
  let totalPersonal = 0;

  const paidMap: Record<string, { shared: number; personal: number; income: number }> = {};
  for (const m of memberList) {
    paidMap[m.uid] = { shared: 0, personal: 0, income: 0 };
  }

  // Also track previously recorded settlement transfers to offset balance
  let settlementTransfers0to1 = 0;
  let settlementTransfers1to0 = 0;

  for (const t of active) {
    const isSettlement = t.tags?.includes("settlement");
    const amountInBDT = convertCurrency(t.amount, t.currency || "BDT", "BDT", customRates);

    if (t.type === "transfer" && isSettlement && m0 && m1) {
      // Settlement transfer from one member to another.
      // Prioritize explicit paidBy over createdBy to avoid attribution inversion
      // when partner A records a payment made by partner B.
      const payerUid =
        t.paidBy === m0.uid || t.paidBy === m1.uid
          ? t.paidBy
          : t.createdBy === m0.uid || t.createdBy === m1.uid
            ? t.createdBy
            : null;

      if (payerUid === m0.uid) {
        settlementTransfers0to1 += amountInBDT;
      } else if (payerUid === m1.uid) {
        settlementTransfers1to0 += amountInBDT;
      }
      continue;
    }

    if (t.type === "income") {
      if (t.paidBy !== "both" && paidMap[t.paidBy]) {
        paidMap[t.paidBy].income += amountInBDT;
      } else if (paidMap[t.createdBy]) {
        paidMap[t.createdBy].income += amountInBDT;
      }
      continue;
    }

    if (t.type === "expense") {
      if (t.ownership === "shared") {
        totalShared += amountInBDT;
        if (t.paidBy === "both") {
          const half = amountInBDT / (memberList.length || 1);
          for (const m of memberList) {
            paidMap[m.uid].shared += half;
          }
        } else if (paidMap[t.paidBy]) {
          paidMap[t.paidBy].shared += amountInBDT;
        } else if (paidMap[t.createdBy]) {
          paidMap[t.createdBy].shared += amountInBDT;
        }
      } else {
        totalPersonal += amountInBDT;
        if (paidMap[t.paidBy]) {
          paidMap[t.paidBy].personal += amountInBDT;
        } else if (paidMap[t.createdBy]) {
          paidMap[t.createdBy].personal += amountInBDT;
        }
      }
    }
  }

  // Calculate target split ratios
  let ratio0 = 0.5;
  let ratio1 = 0.5;

  if (m0 && m1) {
    if (mode === "income_proportional") {
      const inc0 = rule?.partnerIncomes?.[m0.uid] ?? paidMap[m0.uid].income;
      const inc1 = rule?.partnerIncomes?.[m1.uid] ?? paidMap[m1.uid].income;
      const totalInc = inc0 + inc1;
      if (totalInc > 0) {
        ratio0 = inc0 / totalInc;
        ratio1 = inc1 / totalInc;
      } else {
        ratio0 = 0.5;
        ratio1 = 0.5;
      }
    } else if (mode === "custom_ratio") {
      const custom0 = rule?.customRatio?.[m0.uid] ?? 50;
      const custom1 = rule?.customRatio?.[m1.uid] ?? 50;
      const totalPct = custom0 + custom1 || 100;
      ratio0 = custom0 / totalPct;
      ratio1 = custom1 / totalPct;
    }
  }

  const contributions: CoupleMemberContribution[] = memberList.map((m, idx) => {
    const targetRatio = idx === 0 ? ratio0 : ratio1;
    const targetShare = totalShared * targetRatio;
    const stats = paidMap[m.uid] || { shared: 0, personal: 0, income: 0 };
    
    // Settlement adjustment
    let settlementPaid = 0;
    let settlementReceived = 0;
    if (idx === 0) {
      settlementPaid = settlementTransfers0to1;
      settlementReceived = settlementTransfers1to0;
    } else {
      settlementPaid = settlementTransfers1to0;
      settlementReceived = settlementTransfers0to1;
    }

    // Effective paid towards shared obligations including settlements
    const effectivePaid = stats.shared + settlementPaid - settlementReceived;
    const netBalance = effectivePaid - targetShare;

    const totalIncome = (paidMap[m0?.uid]?.income || 0) + (paidMap[m1?.uid]?.income || 0);
    const incomeRatio = totalIncome > 0 ? stats.income / totalIncome : 0.5;

    return {
      member: m,
      income: stats.income,
      incomeRatio,
      sharedPaid: stats.shared,
      personalPaid: stats.personal,
      targetShare,
      targetRatio,
      netBalance,
    };
  });

  let owesMember: HouseholdMember | null = null;
  let owedMember: HouseholdMember | null = null;
  let settleAmount = 0;

  if (contributions.length === 2) {
    const [c0, c1] = contributions;
    if (c0.netBalance < -0.01) {
      owesMember = c0.member;
      owedMember = c1.member;
      settleAmount = Math.abs(c0.netBalance);
    } else if (c1.netBalance < -0.01) {
      owesMember = c1.member;
      owedMember = c0.member;
      settleAmount = Math.abs(c1.netBalance);
    }
  }

  const isSettled = settleAmount < 1;

  return {
    totalShared,
    totalPersonal,
    splitMode: mode,
    contributions,
    owesMember,
    owedMember,
    settleAmount: Math.round(settleAmount * 100) / 100,
    isSettled,
  };
}
