// Shared Zod enums and domain helpers for roles, categories, units, and statuses.
import { z } from 'zod';

// Account roles controlling what a user can do
export const RoleEnum = z.enum(['INDIVIDUAL', 'PARTNER', 'ADMIN']);
export type Role = z.infer<typeof RoleEnum>;

// Reclaimable/reusable goods categories accepted by the platform
export const CategoryEnum = z.enum([
  'CLOTHES',
  'BOOKS',
  'PLASTICS',
  'PAPER',
  'METAL',
  'GLASS',
  'FURNITURE',
  'APPLIANCES',
  'E_WASTE'
]);
export type Category = z.infer<typeof CategoryEnum>;

// Measurement units a listing can be priced by
export const UnitEnum = z.enum(['kg', 'piece']);
export type Unit = z.infer<typeof UnitEnum>;

// Declared physical condition of a listed item
export const ConditionEnum = z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']);
export type Condition = z.infer<typeof ConditionEnum>;

// Allowed downstream disposition for reclaimed goods
export const PathEnum = z.enum(['REUSE', 'DONATE', 'REPAIR', 'RESELL', 'RECYCLE']);
export type Path = z.infer<typeof PathEnum>;

// Lifecycle state of a partner application
export const PartnerStatusEnum = z.enum(['APPLIED', 'VERIFIED', 'REJECTED']);
export type PartnerStatus = z.infer<typeof PartnerStatusEnum>;

// Lifecycle state of an item listing
export const ListingStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'CANCELLED', 'MATCHED', 'EXPIRED']);
export type ListingStatus = z.infer<typeof ListingStatusEnum>;

// Kind of movement on the credit ledger
export const CreditTxnKindEnum = z.enum(['EARN', 'REDEEM', 'ADJUST']);
export type CreditTxnKind = z.infer<typeof CreditTxnKindEnum>;

// Review outcome of a credit transaction
export const CreditTxnStatusEnum = z.enum(['PENDING', 'VERIFIED', 'REJECTED']);
export type CreditTxnStatus = z.infer<typeof CreditTxnStatusEnum>;

// Convenience arrays for UI iteration
export const CATEGORIES = CategoryEnum.options;
export const CONDITIONS = ConditionEnum.options;
export const LISTING_STATUSES = ListingStatusEnum.options;
export const ROLES = RoleEnum.options;
export const UNITS = UnitEnum.options;
export const PATHS = PathEnum.options;
export const PARTNER_STATUSES = PartnerStatusEnum.options;
export const CREDIT_TXN_KINDS = CreditTxnKindEnum.options;
export const CREDIT_TXN_STATUSES = CreditTxnStatusEnum.options;

// Category & Unit Domain Rules
export function isPieceCategory(category: Category | string): boolean {
  return category === 'APPLIANCES' || category === 'E_WASTE';
}

export function getCategoryUnit(category: Category | string): Unit {
  return isPieceCategory(category) ? 'piece' : 'kg';
}

export function formatQuantityWithUnit(
  unit: Unit | string,
  quantity: number | string | null | undefined
): string {
  if (quantity === null || quantity === undefined || quantity === '') {
    return 'Not stated';
  }
  if (unit === 'piece') {
    return `${quantity} ${Number(quantity) === 1 ? 'piece' : 'pieces'}`;
  }
  if (unit === 'kg') {
    return `${quantity} kg`;
  }
  return `${quantity} ${unit}`;
}

// Badge milestones awarded from verified activity only
export const BadgeTypeEnum = z.enum([
  'FIRST_VERIFIED_DEPOSIT',
  'WASTE_10KG',
  'WASTE_100KG',
  'E_WASTE_STEWARD',
  'STREAK_7',
  'STREAK_30',
  'CAMPUS_TOP_3',
]);
export type BadgeType = z.infer<typeof BadgeTypeEnum>;
export const BADGE_TYPES = BadgeTypeEnum.options;

// Time windows for the materialized campus leaderboards
export const LeaderboardPeriodEnum = z.enum(['WEEKLY', 'MONTHLY', 'ALL_TIME']);
export type LeaderboardPeriod = z.infer<typeof LeaderboardPeriodEnum>;
export const LEADERBOARD_PERIODS = LeaderboardPeriodEnum.options;

// Service-provider organization types a partner application can claim
export const PartnerTypeEnum = z.enum(['COLLECTOR', 'RECYCLER', 'REPAIR_SHOP', 'VENDOR', 'NGO']);
export type PartnerType = z.infer<typeof PartnerTypeEnum>;
export const PARTNER_TYPES = PartnerTypeEnum.options;

// Metadata definition interface for milestone badges
export interface BadgeDefinition {
  type: BadgeType;
  title: string;
  description: string;
  icon: string;
  criteria: string;
}

// Canonical dictionary of badge definitions with display details
export const BADGE_DEFINITIONS: Record<BadgeType, BadgeDefinition> = {
  FIRST_VERIFIED_DEPOSIT: {
    type: 'FIRST_VERIFIED_DEPOSIT',
    title: 'First Step',
    description: 'Completed your first verified recycling deposit.',
    icon: 'seedling',
    criteria: '1st verified credit deposit',
  },
  WASTE_10KG: {
    type: 'WASTE_10KG',
    title: 'Eco Warrior',
    description: 'Diverted at least 10 kg of waste from landfills.',
    icon: 'scale',
    criteria: 'Cumulative 10kg/points verified',
  },
  WASTE_100KG: {
    type: 'WASTE_100KG',
    title: 'Centurion of Clean',
    description: 'Diverted 100 kg of waste from landfills.',
    icon: 'shield-star',
    criteria: 'Cumulative 100kg/points verified',
  },
  E_WASTE_STEWARD: {
    type: 'E_WASTE_STEWARD',
    title: 'E-Waste Champion',
    description: 'Licensed e-waste partner championing safe electronic disposal.',
    icon: 'chip',
    criteria: 'Verified e-waste licensed partner',
  },
  STREAK_7: {
    type: 'STREAK_7',
    title: '7-Day Streak',
    description: 'Maintained 7 consecutive active recycling days.',
    icon: 'fire',
    criteria: '7-day active streak',
  },
  STREAK_30: {
    type: 'STREAK_30',
    title: 'Monthly Habit',
    description: 'Maintained 30 consecutive active recycling days.',
    icon: 'lightning',
    criteria: '30-day active streak',
  },
  CAMPUS_TOP_3: {
    type: 'CAMPUS_TOP_3',
    title: 'Campus Podium',
    description: 'Ranked in the top 3 contributors for your campus.',
    icon: 'trophy',
    criteria: 'Top 3 campus leaderboard contributor',
  },
};

export const BADGE_DEFINITIONS_LIST: BadgeDefinition[] = Object.values(BADGE_DEFINITIONS);

// Bangladesh administrative divisions (8) for campus geo-context
export const DivisionEnum = z.enum([
  'DHAKA',
  'CHITTAGONG',
  'RAJSHAHI',
  'KHULNA',
  'BARISAL',
  'SYLHET',
  'RANGPUR',
  'MYMENSINGH',
]);
export type Division = z.infer<typeof DivisionEnum>;
export const DIVISIONS = DivisionEnum.options;

// Lifecycle status of a campus (verified by admin, user-submitted pending, or blacklisted)
export const CampusStatusEnum = z.enum(['VERIFIED', 'PENDING', 'BLACKLISTED']);
export type CampusStatus = z.infer<typeof CampusStatusEnum>;
export const CAMPUS_STATUSES = CampusStatusEnum.options;

