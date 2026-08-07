export {
  CategoryEnum,
  ConditionEnum,
  ListingStatusEnum,
  type Category,
  type Condition,
  type ListingStatus,
  CATEGORIES,
  CONDITIONS,
  LISTING_STATUSES,
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
