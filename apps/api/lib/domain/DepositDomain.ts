// DepositDomain: Verified Deposit Path — Drop-Zone Sessions, Evidence Bundling & Pending Credits (SPEC 11)
import crypto from 'crypto';
import { dropZoneRepo } from '../repos/dropZones';
import { depositRepo } from '../repos/deposits';
import { walletRepo } from '../repos/wallet';
import { rateCardRepo } from '../repos/rateCards';
import { partnerRepo } from '../repos/partners';
import { isPieceCategory, type Category } from '@chokro/shared';
import { BadRequestError, ConflictError } from '../database';

export interface CreateSessionParams {
  userId: string;
  qrToken: string;
  zoneId?: string;
}

export interface RecordDepositParams {
  userId: string;
  sessionId: string;
  category: Category;
  declaredQuantity: number;
  unit: 'kg' | 'piece';
  evidenceUrl: string;
}

export const DepositDomain = {
  // 1. Open or resume a 15-minute single-use session bound to a user and drop zone
  async createSession(params: CreateSessionParams) {
    let zone = null;
    if (params.zoneId) {
      zone = await dropZoneRepo.findById(params.zoneId);
    } else {
      zone = await dropZoneRepo.findByQrToken(params.qrToken);
    }

    if (!zone) {
      throw new BadRequestError('Drop zone not found');
    }

    if (zone.status === 'PAUSED' || zone.status === 'RETIRED') {
      throw new BadRequestError('Drop zone is not accepting deposits');
    }

    // Check for existing active open session
    const existing = await depositRepo.findActiveSession(params.userId, zone.id);
    if (existing) {
      return {
        sessionId: existing.id,
        shortCode: existing.short_code,
        expiresAt: existing.expires_at,
        zone: {
          id: zone.id,
          name: zone.name,
          acceptedCategories: zone.accepted_categories,
          maxCapacityKg: zone.max_capacity_kg,
          currentFillKg: zone.current_fill_kg,
        },
      };
    }

    // Generate single-use secret and human-readable 6-digit short code
    const sessionSecret = crypto.randomBytes(16).toString('hex');
    const shortCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL

    const session = await depositRepo.createSession({
      zone_id: zone.id,
      user_id: params.userId,
      session_secret: sessionSecret,
      short_code: shortCode,
      expires_at: expiresAt,
    });

    return {
      sessionId: session.id,
      shortCode: session.short_code,
      expiresAt: session.expires_at,
      zone: {
        id: zone.id,
        name: zone.name,
        acceptedCategories: zone.accepted_categories,
        maxCapacityKg: zone.max_capacity_kg,
        currentFillKg: zone.current_fill_kg,
      },
    };
  },

  // 2. Record deposit, consume session, and mint pending credit
  async recordDeposit(params: RecordDepositParams) {
    const session = await depositRepo.findSessionById(params.sessionId);
    if (!session || session.user_id !== params.userId) {
      throw new BadRequestError('Invalid or unowned deposit session');
    }

    if (session.status !== 'OPEN' || new Date(session.expires_at) <= new Date()) {
      throw new BadRequestError('Session is expired or already consumed');
    }

    const zone = await dropZoneRepo.findById(session.zone_id);
    if (!zone || zone.status !== 'ACTIVE') {
      throw new BadRequestError('Drop zone is not currently active');
    }

    const accepted = (zone.accepted_categories as string[]) || [];
    if (!accepted.includes(params.category)) {
      throw new BadRequestError(`Category ${params.category} not accepted at this drop zone`);
    }

    // Unit discipline
    const pieceCategory = isPieceCategory(params.category);
    if (pieceCategory && params.unit !== 'piece') {
      throw new BadRequestError('Appliances and e-waste require piece unit');
    }
    if (!pieceCategory && params.unit !== 'kg') {
      throw new BadRequestError('This category requires kg unit');
    }

    // E-waste licence gating
    if (params.category === 'E_WASTE') {
      if (!zone.contracted_partner_id) {
        throw new BadRequestError('E-waste not permitted at this zone - no contracted partner');
      }
      const partner = await partnerRepo.findById(zone.contracted_partner_id);
      if (!partner || !partner.e_waste_licensed) {
        throw new BadRequestError('E-waste not permitted at this zone - unlicensed partner');
      }
    }

    // Price lookup from effective rate card
    const published = await rateCardRepo.findPublished();
    const rateEntry = published.find(
      (r) => r.category === params.category && r.unit === params.unit
    );

    let estimatedBdt = 0;
    let rateCardEntryId: string | null = null;
    if (rateEntry) {
      rateCardEntryId = rateEntry.id;
      estimatedBdt = Number(rateEntry.price_bdt) * params.declaredQuantity;
    }

    // Atomically consume session
    const consumed = await depositRepo.consumeSession(session.id);
    if (!consumed) {
      throw new BadRequestError('Session was already consumed');
    }

    // Persist deposit record
    const deposit = await depositRepo.createDeposit({
      session_id: session.id,
      zone_id: zone.id,
      user_id: params.userId,
      category: params.category,
      unit: params.unit,
      declared_quantity: params.declaredQuantity,
      evidence_url: params.evidenceUrl,
      rate_card_entry_id: rateCardEntryId,
      estimated_bdt: estimatedBdt,
      status: 'RECORDED',
    });

    // Mint exactly one PENDING EARN credit referencing the deposit
    const credit = await walletRepo.createEarnTransaction({
      userId: params.userId,
      amount: estimatedBdt,
      custodyRef: deposit.id,
      rateCardEntryId,
      reason: `Drop zone deposit: ${params.declaredQuantity} ${params.unit} of ${params.category} at ${zone.name}`,
      status: 'PENDING',
    });

    // Update cumulative fill level estimate
    const massKg = params.unit === 'kg' ? params.declaredQuantity : params.declaredQuantity * 2.0;
    const currentFill = Number(zone.current_fill_kg) + massKg;
    await dropZoneRepo.update(zone.id, {
      current_fill_kg: String(currentFill.toFixed(2)),
    });

    return {
      deposit,
      credit,
      estimatedBdt,
      status: 'RECORDED',
    };
  },
};
