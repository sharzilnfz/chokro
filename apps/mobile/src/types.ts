export {
  CategoryEnum,
  ConditionEnum,
  ListingStatusEnum,
  UnitEnum,
  type Category,
  type Condition,
  type ListingStatus,
  type Unit,
  type Path,
  CATEGORIES,
  CONDITIONS,
  LISTING_STATUSES,
  isPieceCategory,
  getCategoryUnit,
  formatQuantityWithUnit,
} from '@chokro/shared';

import type { Category, Condition, Unit } from '@chokro/shared';
import type { PreparedPhoto } from '@/lib/photo';

export type ListingPrefill = {
  category: Category;
  condition: Condition;
  quantity: number;
  unit: Unit;
  photo: PreparedPhoto | null;
  seededAt: number;
};

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
