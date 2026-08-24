// App-side domain types, shared re-exports, and label formatting helpers.
// Re-export shared domain enums, types, and category/unit helpers for local use.
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

// Authenticated app user with role and optional institution/profile link.
export type User = {
  id: string;
  email: string;
  role: 'INDIVIDUAL' | 'PARTNER' | 'ADMIN';
  institutionId?: string | null;
  fullName?: string | null;
  phone?: string | null;
  studentIdDoc?: string | null;
};

// Session bundling the auth token with the signed-in user.
export type AuthSession = {
  token: string;
  user: User;
};

// Convert snake_case enum keys into readable Title Case labels.
export function categoryLabel(category: string): string {
  return category
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
