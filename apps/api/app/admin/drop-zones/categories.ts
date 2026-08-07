import { CATEGORIES, type Category } from '@chokro/shared';
import { formatLabel } from '../lib/formatters';

export const CATEGORY_OPTIONS: readonly { value: Category; label: string }[] = CATEGORIES.map(
  (value) => ({
    value,
    label: formatLabel(value),
  }),
);