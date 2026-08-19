// DTOs for the user-editable profile (name, phone, campus link, student-ID card photo, unlisted campus request).
import { z } from 'zod';
import { DivisionEnum } from '../enums';

export const UnlistedCampusInputSchema = z.object({
  name: z.string().trim().min(2).max(255),
  division: DivisionEnum.default('DHAKA'),
  zilla: z.string().trim().min(1).max(120),
  upazilla: z.string().trim().min(1).max(120),
});
export type UnlistedCampusInput = z.infer<typeof UnlistedCampusInputSchema>;

export const ProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(7).max(20).nullable().optional(),
  // campus.slug to attach; null/"" to detach ("not a student"). Undefined = leave unchanged.
  campusSlug: z.string().trim().max(255).nullable().optional(),
  // Compressed JPEG data URI from the mobile PhotoUploader flow (cap ~500 KB source).
  studentIdDoc: z.string().max(900_000).nullable().optional(),
  // When the student's campus is unlisted, they submit details to officially add it to the database
  newCampus: UnlistedCampusInputSchema.optional(),
});
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
