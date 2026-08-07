import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { safeRoute } from '../../../../lib/http';
import { walletRepo } from '../../../../lib/repos/wallet';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const transactions = await walletRepo.findTransactionsByOwner(auth.user.userId);
  return NextResponse.json({ transactions });
});


