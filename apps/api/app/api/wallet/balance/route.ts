import { requireAuth } from '../../../../lib/auth';
import { apiData, safeRoute } from '../../../../lib/http';
import { walletRepo } from '../../../../lib/repos/wallet';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const txns = await walletRepo.findTransactionsByOwner(auth.user.userId);

  let verifiedSum = 0;
  let pendingSum = 0;

  for (const txn of txns) {
    const amount = Number(txn.amount);
    if (txn.status === 'VERIFIED') verifiedSum += amount;
    if (txn.status === 'PENDING') pendingSum += amount;
  }

  return apiData({ balance: { verified: verifiedSum, pending: pendingSum } });
});


