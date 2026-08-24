// ZoneEmptyingDomain: Physical Scale Emptying, Proportional Mass Apportionment & Divergence Signals (SPEC 11)
import { dropZoneRepo } from '../repos/dropZones';
import { depositRepo } from '../repos/deposits';
import { walletRepo } from '../repos/wallet';
import { rateCardRepo } from '../repos/rateCards';
import { BadRequestError } from '../database';

export interface EmptyZoneParams {
  zoneId: string;
  collectorPartnerId?: string | null;
  scaleReadings: Record<string, number>;
  evidenceUrl?: string | null;
}

export const ZoneEmptyingDomain = {
  // Execute scale emptying, distribute mass proportionally across window deposits,
  // update pending credits to verified amount, and record divergence ratios.
  async emptyZone(params: EmptyZoneParams) {
    const zone = await dropZoneRepo.findById(params.zoneId);
    if (!zone) {
      throw new BadRequestError('Drop zone not found');
    }

    // Find all deposits recorded since last emptying
    const deposits = await depositRepo.findRecordedDepositsByZone(
      params.zoneId,
      zone.last_emptied_at
    );

    // Group deposits by category
    const categoryDepositsMap = new Map<string, typeof deposits>();
    for (const d of deposits) {
      const list = categoryDepositsMap.get(d.category) || [];
      list.push(d);
      categoryDepositsMap.set(d.category, list);
    }

    const updatedDeposits = [];

    // Apportion verified mass per category
    for (const [category, catDeposits] of categoryDepositsMap.entries()) {
      const scaleReading = params.scaleReadings[category] ?? 0;
      const totalDeclared = catDeposits.reduce(
        (sum, d) => sum + Number(d.declared_quantity),
        0
      );

      for (const deposit of catDeposits) {
        const declared = Number(deposit.declared_quantity);
        const proportionalVerifiedQty =
          totalDeclared > 0 ? (declared / totalDeclared) * scaleReading : 0;

        // Compute unit price from initial estimate or published rate
        let unitPrice = 0;
        if (declared > 0 && Number(deposit.estimated_bdt) > 0) {
          unitPrice = Number(deposit.estimated_bdt) / declared;
        }

        const verifiedBdt = Number((unitPrice * proportionalVerifiedQty).toFixed(2));
        const divergenceRatio =
          declared > 0
            ? Number((Math.abs(declared - proportionalVerifiedQty) / declared).toFixed(3))
            : 0;

        // Update deposit record
        const updated = await depositRepo.updateDepositVerification(
          deposit.id,
          proportionalVerifiedQty,
          verifiedBdt,
          divergenceRatio,
          'RECORDED' // Remains recorded / pending until Trust Gate in SPEC 12
        );

        // Update pending credit amount to verified BDT
        if (deposit.id) {
          await walletRepo.updatePendingCreditAmount(deposit.id, verifiedBdt);
        }

        updatedDeposits.push(updated);
      }
    }

    const totalMassKg = Object.values(params.scaleReadings).reduce(
      (sum, val) => sum + (Number(val) || 0),
      0
    );

    // Persist emptying record
    const emptyingRecord = await depositRepo.createEmptyingRecord({
      zone_id: zone.id,
      collector_partner_id: params.collectorPartnerId || null,
      scale_readings_json: params.scaleReadings,
      evidence_url: params.evidenceUrl || null,
      total_mass_kg: totalMassKg,
      emptied_at: new Date(),
    });

    // Reset zone fill level and stamp last_emptied_at
    await dropZoneRepo.update(zone.id, {
      current_fill_kg: '0.00',
      last_emptied_at: new Date(),
    });

    return {
      emptyingRecord,
      updatedDepositsCount: updatedDeposits.length,
      totalMassKg,
    };
  },
};
