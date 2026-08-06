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

export const ListingStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'CANCELLED']);
export type ListingStatus = z.infer<typeof ListingStatusEnum>;

export const CreditTxnKindEnum = z.enum(['EARN', 'REDEEM', 'ADJUST']);
export type CreditTxnKind = z.infer<typeof CreditTxnKindEnum>;

export const CreditTxnStatusEnum = z.enum(['PENDING', 'VERIFIED', 'REJECTED']);
export type CreditTxnStatus = z.infer<typeof CreditTxnStatusEnum>;
