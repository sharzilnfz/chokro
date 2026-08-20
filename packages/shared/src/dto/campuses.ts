// DTOs for the campus registry and admin campus management.
import { z } from 'zod';
import { DivisionEnum, CampusStatusEnum } from '../enums';

// Optional explicit slug; otherwise derived from the name (uppercase [A-Z0-9_]).
export const CreateCampusSchema = z.object({
  name: z.string().trim().min(2).max(255),
  division: DivisionEnum,
  zilla: z.string().trim().min(1).max(120),
  upazilla: z.string().trim().min(1).max(120),
  slug: z.string().trim().regex(/^[A-Z0-9_]+$/).max(255).optional(),
  status: CampusStatusEnum.default('VERIFIED').optional(),
});
export type CreateCampusInput = z.infer<typeof CreateCampusSchema>;

// Admin status update schema (e.g. verify or blacklist a campus)
export const UpdateCampusStatusSchema = z.object({
  status: CampusStatusEnum,
  reason: z.string().trim().min(2).max(500).optional(),
});
export type UpdateCampusStatusInput = z.infer<typeof UpdateCampusStatusSchema>;

// Canonical campus row as returned by the API (used by admin page + mobile selector).
export const CampusSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  division: DivisionEnum,
  zilla: z.string(),
  upazilla: z.string().nullable(),
  status: CampusStatusEnum.default('VERIFIED'),
  reason: z.string().nullable().optional(),
  created_at: z.string(),
});
export type Campus = z.infer<typeof CampusSchema>;
