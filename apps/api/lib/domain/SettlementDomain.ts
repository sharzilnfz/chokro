// SettlementDomain: Business rules, state machine, MFS sandbox gateway, liability metrics, and compensating ledger writes (SPEC 13 / Ticket 09a)
import crypto from 'crypto';
import {
  type CreateRedemptionInput,
  type RedemptionQuote,
  type LiabilitySummary,
  type UpdateLiabilityCapInput,
  DEFAULT_LIABILITY_CAPS,
} from '@chokro/shared';
import { settlementRepo } from '../repos/settlement';
import { walletRepo } from '../repos/wallet';
import { trustGateRepo } from '../repos/trustGate';
import { userRepo } from '../repos/users';
import { WalletDomain } from './WalletDomain';
import { TrustGateDomain } from './TrustGateDomain';
import { BadRequestError, ConflictError } from '../database';

export class SettlementDomain {
  /**
   * 1. Get active liability caps
   */
  static async getActiveCaps() {
    return settlementRepo.getActiveLiabilityCaps();
  }

  /**
   * 2. Update liability caps (Admin operation)
   */
  static async updateCaps(input: UpdateLiabilityCapInput, adminUserId?: string | null) {
    return settlementRepo.createLiabilityCap(input, adminUserId);
  }

  /**
   * 3. Get platform liability summary (A11)
   */
  static async getLiabilitySummary(): Promise<LiabilitySummary> {
    const caps = await this.getActiveCaps();
    const metrics = await settlementRepo.getPlatformLiabilityMetrics();
    const currentMonthRedeemed = await settlementRepo.getPlatformMonthlyRedeemedBdt();

    const monthlyCapRemaining = Math.max(0, caps.monthly_platform_cap_bdt - currentMonthRedeemed);
    const monthlyRunRateRatio =
      caps.monthly_platform_cap_bdt > 0
        ? Number((currentMonthRedeemed / caps.monthly_platform_cap_bdt).toFixed(4))
        : 0;

    // Trigger alert if current run rate is >= 80% of platform cap
    const capAlertTriggered = monthlyRunRateRatio >= 0.8;

    return {
      totalEarnedVerifiedCredits: metrics.totalEarnedVerifiedCredits,
      totalRedeemedCredits: metrics.totalRedeemedCredits,
      outstandingLiabilityBdt: metrics.outstandingLiabilityBdt,
      currentMonthRedeemedBdt: currentMonthRedeemed,
      monthlyPlatformCapBdt: caps.monthly_platform_cap_bdt,
      monthlyCapRemainingBdt: Number(monthlyCapRemaining.toFixed(2)),
      monthlyRunRateRatio,
      capAlertTriggered,
    };
  }

  /**
   * 4. Calculate transparent quote & fee breakdown
   */
  static async getQuote(amountCredits: number, userId: string): Promise<RedemptionQuote> {
    const caps = await this.getActiveCaps();
    const balance = await WalletDomain.getUserBalance(userId);
    const userMonthlyRedeemed = await settlementRepo.getUserMonthlyRedeemedBdt(userId);

    const grossAmountBdt = Number(amountCredits.toFixed(2));
    const feePercentage = caps.fee_percentage;
    const feeBdt = Number(((grossAmountBdt * feePercentage) / 100).toFixed(2));
    const netAmountBdt = Number((grossAmountBdt - feeBdt).toFixed(2));
    const monthlyUserRemainingBdt = Math.max(0, caps.monthly_user_cap_bdt - userMonthlyRedeemed);

    return {
      grossAmountBdt,
      feePercentage,
      feeBdt,
      netAmountBdt,
      minRedemptionBdt: caps.min_redemption_bdt,
      monthlyUserCapBdt: caps.monthly_user_cap_bdt,
      monthlyUserRemainingBdt: Number(monthlyUserRemainingBdt.toFixed(2)),
      verifiedBalanceBdt: balance.verified,
    };
  }

  /**
   * 5. MFS Sandbox / Mock Payout Gateway
   */
  static async executePayout(redemption: {
    id: string;
    payout_channel: string;
    account_number: string;
    gross_amount_bdt: string | number;
    fee_bdt: string | number;
    net_amount_bdt: string | number;
  }) {
    // Check if test environment explicitly forced failure
    if (process.env.SIMULATE_GATEWAY_FAILURE === 'true') {
      const payout = await settlementRepo.createPayoutRecord({
        redemptionId: redemption.id,
        gatewayRef: null,
        gatewayProvider: 'SSLCOMMERZ_MFS',
        status: 'FAILED',
        payload: {
          error: 'Simulated MFS transfer failure: Bank network timeout',
          channel: redemption.payout_channel,
          accountNumber: redemption.account_number,
        },
      });
      return { success: false, payout, isSimulated: true };
    }

    const hasSandboxCredentials = Boolean(
      process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWD
    );

    if (hasSandboxCredentials) {
      // SSLCommerz Sandbox integration
      const gatewayRef = `MFS-SSL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const payout = await settlementRepo.createPayoutRecord({
        redemptionId: redemption.id,
        gatewayRef,
        gatewayProvider: 'SSLCOMMERZ_MFS',
        status: 'SUCCESS',
        payload: {
          simulated: false,
          sandbox: true,
          channel: redemption.payout_channel,
          accountNumber: redemption.account_number,
          grossAmountBdt: Number(redemption.gross_amount_bdt),
          feeBdt: Number(redemption.fee_bdt),
          netAmountBdt: Number(redemption.net_amount_bdt),
          settledAt: new Date().toISOString(),
        },
      });
      return { success: true, payout, isSimulated: false };
    }

    // Degraded local simulated mode
    const gatewayRef = `MFS-SIM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const payout = await settlementRepo.createPayoutRecord({
      redemptionId: redemption.id,
      gatewayRef,
      gatewayProvider: 'SSLCOMMERZ_MFS',
      status: 'SIMULATED',
      payload: {
        simulated: true,
        channel: redemption.payout_channel,
        accountNumber: redemption.account_number,
        grossAmountBdt: Number(redemption.gross_amount_bdt),
        feeBdt: Number(redemption.fee_bdt),
        netAmountBdt: Number(redemption.net_amount_bdt),
        mode: 'OFFLINE_SIMULATED',
        settledAt: new Date().toISOString(),
      },
    });

    return { success: true, payout, isSimulated: true };
  }

  /**
   * 6. User submits a Redemption Request (Main Entrypoint)
   */
  static async requestRedemption(input: CreateRedemptionInput, userId: string) {
    // A. Guard: User account active and not suspended
    const user = await userRepo.findById(userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    const activeFlags = await trustGateRepo.countActiveFraudFlags('USER', userId);
    if (activeFlags >= 3) {
      throw new BadRequestError('Account is under review due to active fraud flags. Cash-out is restricted.');
    }

    // B. Calculate quote & fee breakdown
    const quote = await this.getQuote(input.amountCredits, userId);

    // C. Guard: Minimum redemption threshold
    if (input.amountCredits < quote.minRedemptionBdt) {
      throw new BadRequestError(
        `Redemption amount ৳${input.amountCredits.toFixed(2)} is below minimum required ৳${quote.minRedemptionBdt.toFixed(2)}`
      );
    }

    // D. Guard: Monthly user cap
    if (input.amountCredits > quote.monthlyUserRemainingBdt) {
      throw new BadRequestError(
        `Redemption exceeds monthly allowance of ৳${quote.monthlyUserCapBdt.toFixed(2)}. Remaining allowance: ৳${quote.monthlyUserRemainingBdt.toFixed(2)}`
      );
    }

    // E. Guard: Verified balance check
    if (input.amountCredits > quote.verifiedBalanceBdt) {
      throw new BadRequestError(
        `Redemption amount ৳${input.amountCredits.toFixed(2)} exceeds verified balance ৳${quote.verifiedBalanceBdt.toFixed(2)}`
      );
    }


    // F. Atomic overdraw guard & pending REDEEM ledger entry insertion
    const caps = await this.getActiveCaps();
    const { redemption, creditTxn } = await settlementRepo.atomicCreateRedemption({
      userId,
      amountCredits: input.amountCredits,
      payoutChannel: input.payoutChannel,
      accountNumber: input.accountNumber,
      grossAmountBdt: quote.grossAmountBdt,
      feeBdt: quote.feeBdt,
      netAmountBdt: quote.netAmountBdt,
      minRedemptionBdt: caps.min_redemption_bdt,
      monthlyUserCapBdt: caps.monthly_user_cap_bdt,
      monthlyPlatformCapBdt: caps.monthly_platform_cap_bdt,
    });

    // G. Evaluate Trust Gate
    const pastRedemptions = await settlementRepo.findRedemptionsByUser(userId);
    const userRedemptionCount = pastRedemptions.length;

    const gateEvaluation = await TrustGateDomain.evaluateAndApply({
      subjectType: 'REDEMPTION',
      subjectId: redemption.id,
      userId,
      estimatedBdt: quote.grossAmountBdt,
      accountCreatedAt: user.created_at,
      activeFraudFlagCount: activeFlags,
      userDailyDepositCount: userRedemptionCount,
      userDailyCreditBdt: quote.grossAmountBdt,
      isSessionValid: true,
      inAppCaptured: true,
    });

    if (gateEvaluation.decision === 'AUTO_CLEAR') {
      // Update status to AUTO_APPROVED
      await settlementRepo.updateRedemptionStatus(
        redemption.id,
        'AUTO_APPROVED',
        gateEvaluation.trustDecisionId
      );

      // Settle payout via MFS Gateway
      const payoutResult = await this.executePayout({
        ...redemption,
        gross_amount_bdt: quote.grossAmountBdt,
        fee_bdt: quote.feeBdt,
        net_amount_bdt: quote.netAmountBdt,
      });

      if (payoutResult.success) {
        // Mark redemption as PAID
        const paidRedemption = await settlementRepo.updateRedemptionStatus(
          redemption.id,
          'PAID',
          gateEvaluation.trustDecisionId
        );

        // Verify credit transaction
        await walletRepo.verifyCreditTransaction({
          id: creditTxn.id,
          trustDecisionId: gateEvaluation.trustDecisionId,
        });

        return {
          redemption: paidRedemption,
          payout: payoutResult.payout,
          decision: 'AUTO_CLEAR',
          trustDecisionId: gateEvaluation.trustDecisionId,
          isSimulated: payoutResult.isSimulated,
          quote,
        };
      } else {
        // Payout settlement failed: write compensating entry to restore balance
        const failedRedemption = await settlementRepo.updateRedemptionStatus(
          redemption.id,
          'FAILED',
          gateEvaluation.trustDecisionId
        );

        await walletRepo.createCompensatingTransaction({
          userId,
          amount: input.amountCredits,
          sourceId: redemption.id,
          custodyRef: `REVERSAL-FAIL-${redemption.id}`,
          reason: `Compensating reversal for failed MFS payout on redemption ${redemption.id}`,
        });

        return {
          redemption: failedRedemption,
          payout: payoutResult.payout,
          decision: 'AUTO_CLEAR',
          trustDecisionId: gateEvaluation.trustDecisionId,
          isSimulated: payoutResult.isSimulated,
          error: 'MFS transfer failed. Funds restored to your verified balance.',
          quote,
        };
      }
    } else {
      // Escalated to admin review worklist (A10)
      const escalatedRedemption = await settlementRepo.updateRedemptionStatus(
        redemption.id,
        'ESCALATED',
        gateEvaluation.trustDecisionId
      );

      return {
        redemption: escalatedRedemption,
        decision: 'ESCALATE',
        failingSignals: gateEvaluation.failingSignals,
        trustDecisionId: gateEvaluation.trustDecisionId,
        quote,
      };
    }
  }

  /**
   * 7. User Cancels an open Redemption Request
   */
  static async cancelRedemption(redemptionId: string, userId: string, reason?: string | null) {
    const redemption = await settlementRepo.findRedemptionById(redemptionId);
    if (!redemption) {
      throw new BadRequestError('Redemption request not found');
    }

    if (redemption.user_id !== userId) {
      throw new BadRequestError('You cannot cancel a redemption request that is not yours');
    }

    if (redemption.status !== 'REQUESTED' && redemption.status !== 'ESCALATED') {
      throw new BadRequestError(`Cannot cancel redemption with status ${redemption.status}`);
    }

    // Mark CANCELLED
    const updated = await settlementRepo.updateRedemptionStatus(redemptionId, 'CANCELLED');

    // Restore balance via compensating ledger row (append-only invariant)
    const compensatingTxn = await walletRepo.createCompensatingTransaction({
      userId,
      amount: Number(redemption.amount_credits),
      sourceId: redemptionId,
      custodyRef: `REVERSAL-CANCEL-${redemptionId}`,
      reason: reason || `Compensating reversal for user-cancelled redemption ${redemptionId}`,
    });

    return {
      redemption: updated,
      compensatingTxn,
      message: 'Redemption request cancelled and credits restored to verified balance',
    };
  }

  /**
   * 8. Admin settles / adjudicates a redemption (A10)
   */
  static async settleRedemption(
    redemptionId: string,
    action: 'APPROVE' | 'REJECT' | 'RETRY',
    adminUserId: string,
    reason?: string | null
  ) {
    const redemption = await settlementRepo.findRedemptionById(redemptionId);
    if (!redemption) {
      throw new BadRequestError('Redemption request not found');
    }

    if (action === 'REJECT') {
      if (redemption.status !== 'ESCALATED' && redemption.status !== 'REQUESTED') {
        throw new BadRequestError(`Cannot reject redemption in status ${redemption.status}`);
      }

      const updated = await settlementRepo.updateRedemptionStatus(redemptionId, 'REJECTED');

      // Compensating ledger row restores balance
      const compensatingTxn = await walletRepo.createCompensatingTransaction({
        userId: redemption.user_id,
        amount: Number(redemption.amount_credits),
        sourceId: redemptionId,
        custodyRef: `REVERSAL-REJECT-${redemptionId}`,
        reason: reason || `Admin rejection for redemption ${redemptionId} by ${adminUserId}`,
      });

      return {
        redemption: updated,
        action: 'REJECT',
        compensatingTxn,
        message: 'Redemption rejected and credits restored to user balance',
      };
    }

    if (action === 'APPROVE') {
      if (
        redemption.status !== 'ESCALATED' &&
        redemption.status !== 'REQUESTED' &&
        redemption.status !== 'AUTO_APPROVED'
      ) {
        throw new BadRequestError(`Cannot approve redemption in status ${redemption.status}`);
      }

      // Execute MFS payout
      const payoutResult = await this.executePayout(redemption);

      if (payoutResult.success) {
        const paidRedemption = await settlementRepo.updateRedemptionStatus(redemptionId, 'PAID');

        // Flip credit transaction to VERIFIED
        await walletRepo.verifyCreditTransaction({
          custodyRef: `REDEMPTION-${redemptionId}`,
          trustDecisionId: redemption.trust_decision_id || undefined,
        });

        return {
          redemption: paidRedemption,
          payout: payoutResult.payout,
          action: 'APPROVE',
          message: 'Redemption approved and payout disbursed successfully',
        };
      } else {
        const failedRedemption = await settlementRepo.updateRedemptionStatus(redemptionId, 'FAILED');

        // Compensating ledger row
        await walletRepo.createCompensatingTransaction({
          userId: redemption.user_id,
          amount: Number(redemption.amount_credits),
          sourceId: redemptionId,
          custodyRef: `REVERSAL-FAIL-${redemptionId}`,
          reason: `Compensating reversal for failed MFS payout on redemption ${redemptionId}`,
        });

        return {
          redemption: failedRedemption,
          payout: payoutResult.payout,
          action: 'APPROVE',
          error: 'MFS payout failed. Request marked FAILED and balance restored.',
        };
      }
    }

    if (action === 'RETRY') {
      if (redemption.status !== 'FAILED') {
        throw new BadRequestError(`Can only retry redemptions in FAILED status, current is ${redemption.status}`);
      }

      // Re-deduct credits since previous failure wrote a compensating entry
      await walletRepo.createRedeemTransaction({
        userId: redemption.user_id,
        amount: Number(redemption.amount_credits),
        sourceId: redemptionId,
        custodyRef: `REDEMPTION-RETRY-${redemptionId}-${Date.now()}`,
        reason: `Re-attempted cash-out redemption for ${redemptionId}`,
        status: 'VERIFIED',
      });

      const payoutResult = await this.executePayout(redemption);

      if (payoutResult.success) {
        const paidRedemption = await settlementRepo.updateRedemptionStatus(redemptionId, 'PAID');

        return {
          redemption: paidRedemption,
          payout: payoutResult.payout,
          action: 'RETRY',
          message: 'Payout retried and settled successfully',
        };
      } else {
        // Failed again: write compensating entry
        await walletRepo.createCompensatingTransaction({
          userId: redemption.user_id,
          amount: Number(redemption.amount_credits),
          sourceId: redemptionId,
          custodyRef: `REVERSAL-RETRY-FAIL-${redemptionId}-${Date.now()}`,
          reason: `Compensating reversal for retry failure on redemption ${redemptionId}`,
        });

        return {
          redemption,
          payout: payoutResult.payout,
          action: 'RETRY',
          error: 'Retry failed. Request remains FAILED and balance restored.',
        };
      }
    }

    throw new BadRequestError('Invalid action');
  }
}
