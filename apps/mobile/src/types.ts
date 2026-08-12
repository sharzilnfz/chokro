export {
  CategoryEnum,
  ConditionEnum,
  ListingStatusEnum,
  UnitEnum,
  type Category,
  type Condition,
  type ListingStatus,
  type Unit,
  CATEGORIES,
  CONDITIONS,
  LISTING_STATUSES,
  PIECE_CATEGORIES,
  isPieceCategory,
  getCategoryUnit,
  formatQuantityWithUnit,
} from '@chokro/shared';

export type User = {
  id: string;
  email: string;
  role: 'INDIVIDUAL' | 'PARTNER' | 'ADMIN';
  institutionId?: string | null;
};

export type AuthSession = {
  token: string;
  user: User;
};

export function categoryLabel(category: string): string {
  return category
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
