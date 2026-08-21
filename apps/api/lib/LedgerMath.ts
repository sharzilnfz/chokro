// LedgerMath: the single home of the append-only ledger's balance invariant.
// Verified Balance = SUM(amount) WHERE status='VERIFIED'; Pending Balance = SUM(amount) WHERE status='PENDING'.
// One row-classifier below decides every cell of that truth table; both entry points
// (sumUser for wallet balances, sumPlatform for liability) interpret its verdicts.

export interface LedgerTxn {
  amount: string | number;
  status: string;
  kind?: string;
}

export interface BalanceSummary {
  verified: number;
  pending: number;
}

export interface PlatformLiability {
  totalEarnedVerifiedCredits: number;
  totalRedeemedCredits: number;
  outstandingLiabilityBdt: number;
}

type RowVerdict =
  | { type: 'EARNED'; bucket: 'VERIFIED' | 'PENDING'; amount: number }
  | { type: 'REDEEMED'; bucket: 'VERIFIED' | 'PENDING'; amount: number }
  | { type: 'IGNORED' };

const round2 = (n: number) => Number(n.toFixed(2));

// The one row-classifier. Maps a single ledger row (or a GROUP BY kind/status
// aggregate of rows — the per-bucket sums are additive) to its ledger verdict.
function classifyRow(txn: LedgerTxn): RowVerdict {
  const amount = Number(txn.amount);
  if (!Number.isFinite(amount)) return { type: 'IGNORED' };

  const kind = txn.kind || 'EARN';
  if (kind === 'EARN' || kind === 'ADJUST') {
    if (txn.status === 'VERIFIED') return { type: 'EARNED', bucket: 'VERIFIED', amount };
    if (txn.status === 'PENDING') return { type: 'EARNED', bucket: 'PENDING', amount };
  } else if (kind === 'REDEEM') {
    // Both PENDING (held while open) and VERIFIED (paid) subtract from spendable verified balance
    if (txn.status === 'VERIFIED' || txn.status === 'PENDING') {
      return { type: 'REDEEMED', bucket: txn.status === 'VERIFIED' ? 'VERIFIED' : 'PENDING', amount: Math.abs(amount) };
    }
  }

  return { type: 'IGNORED' };
}

export const LedgerMath = {
  // Sum a user's ledger rows into their verified/pending balance split.
  sumUser(transactions: LedgerTxn[]): BalanceSummary {
    let verified = 0;
    let pending = 0;

    for (const txn of transactions) {
      const verdict = classifyRow(txn);
      if (verdict.type === 'EARNED') {
        if (verdict.bucket === 'VERIFIED') verified += verdict.amount;
        else pending += verdict.amount;
      } else if (verdict.type === 'REDEEMED') {
        verified -= verdict.amount;
      }
    }

    return { verified: Math.max(0, round2(verified)), pending: Math.max(0, round2(pending)) };
  },

  // Sum the whole ledger into platform liability: earned-verified credits minus redeemed credits.
  sumPlatform(rows: LedgerTxn[]): PlatformLiability {
    let totalEarnedVerified = 0;
    let totalRedeemed = 0;

    for (const row of rows) {
      const verdict = classifyRow(row);
      if (verdict.type === 'EARNED' && verdict.bucket === 'VERIFIED') totalEarnedVerified += verdict.amount;
      else if (verdict.type === 'REDEEMED') totalRedeemed += verdict.amount;
    }

    const outstanding = Math.max(0, totalEarnedVerified - totalRedeemed);

    return {
      totalEarnedVerifiedCredits: round2(totalEarnedVerified),
      totalRedeemedCredits: round2(totalRedeemed),
      outstandingLiabilityBdt: round2(outstanding),
    };
  },
};
