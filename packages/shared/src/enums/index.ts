import { z } from 'zod';

export const RoleEnum = z.enum(['INDIVIDUAL', 'PARTNER', 'ADMIN']);
export type Role = z.infer<typeof RoleEnum>;

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

export const UnitEnum = z.enum(['kg', 'piece']);
export type Unit = z.infer<typeof UnitEnum>;

export const ConditionEnum = z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']);
export type Condition = z.infer<typeof ConditionEnum>;

export const PathEnum = z.enum(['REUSE', 'DONATE', 'REPAIR', 'RESELL', 'RECYCLE']);
export type Path = z.infer<typeof PathEnum>;

export const PartnerStatusEnum = z.enum(['APPLIED', 'VERIFIED', 'REJECTED']);
export type PartnerStatus = z.infer<typeof PartnerStatusEnum>;

export const ListingStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'CANCELLED', 'MATCHED', 'EXPIRED']);
export type ListingStatus = z.infer<typeof ListingStatusEnum>;

export const CreditTxnKindEnum = z.enum(['EARN', 'REDEEM', 'ADJUST']);
export type CreditTxnKind = z.infer<typeof CreditTxnKindEnum>;

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
export const PIECE_CATEGORIES: ReadonlyArray<Category> = ['APPLIANCES', 'E_WASTE'] as const;

export function isPieceCategory(category: Category | string): boolean {
  return PIECE_CATEGORIES.includes(category as Category);
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
