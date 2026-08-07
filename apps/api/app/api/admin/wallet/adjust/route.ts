import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '../../../../../lib/auth';
import { apiError, safeRoute } from '../../../../../lib/http';
import { walletRepo } from '../../../../../lib/repos/wallet';

const AdjustSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().finite().refine((amount) => amount !== 0),
  reason: z.string().min(5),
});

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const body = await req.json();
  const parsed = AdjustSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid adjustment data. Reason is mandatory.', 400, parsed.error.format());
  }

  const txn = await walletRepo.createAdjustmentTransaction(parsed.data);

  return NextResponse.json({ message: 'Wallet adjusted successfully', txn }, { status: 201 });
});

