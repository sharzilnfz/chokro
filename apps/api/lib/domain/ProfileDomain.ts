import { userRepo } from '@/lib/repos/users';
import { campusRepo } from '@/lib/repos/campuses';
import { CampusDomain } from './CampusDomain';
import type { UnlistedCampusInput } from '@chokro/shared';

// Caller-facing profile shape (camelCase) with the campus display name resolved.
export interface Profile {
  id: string;
  email: string;
  role: string;
  fullName: string | null;
  phone: string | null;
  institutionId: string | null;
  campusName: string | null;
  campusStatus: string | null;
  campusReason: string | null;
  studentIdDoc: string | null;
}

export const ProfileDomain = {
  async getProfile(userId: string): Promise<Profile | null> {
    const user = await userRepo.findById(userId);
    if (!user) return null;

    let campusName: string | null = null;
    let campusStatus: string | null = null;
    let campusReason: string | null = null;
    if (user.institution_id) {
      const campus = await campusRepo.findBySlug(user.institution_id);
      campusName = campus?.name ?? null;
      campusStatus = campus?.status ?? null;
      campusReason = campus?.reason ?? null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name ?? null,
      phone: user.phone ?? null,
      institutionId: user.institution_id ?? null,
      campusName,
      campusStatus,
      campusReason,
      studentIdDoc: user.student_id_doc ?? null,
    };
  },

  // Partial update. campusSlug: a registered slug attaches the campus; null/"" detaches.
  // newCampus: unlisted campus submission automatically registered with status 'PENDING'.
  async update(userId: string, input: {
    fullName?: string;
    phone?: string | null;
    campusSlug?: string | null;
    studentIdDoc?: string | null;
    newCampus?: UnlistedCampusInput;
  }): Promise<Profile | null> {
    const currentUser = await userRepo.findById(userId);
    if (!currentUser) return null;

    let institutionId: string | null | undefined;
    const effectiveDoc = input.studentIdDoc !== undefined ? input.studentIdDoc : currentUser.student_id_doc;

    // Handle unlisted campus registration request
    if (input.newCampus) {
      if (!effectiveDoc || effectiveDoc.trim() === '') {
        throw new Error('Student ID card photo is required when submitting a campus.');
      }
      const createdCampus = await CampusDomain.create({
        name: input.newCampus.name,
        division: input.newCampus.division,
        zilla: input.newCampus.zilla,
        upazilla: input.newCampus.upazilla,
        status: 'PENDING',
        createdBy: userId,
      });
      institutionId = createdCampus.slug;
    } else if ('campusSlug' in input && input.campusSlug !== undefined) {
      if (input.campusSlug && input.campusSlug.length > 0) {
        const campus = await campusRepo.findBySlug(input.campusSlug);
        if (!campus) throw new Error('The selected campus is not registered. Contact Chokro to add it.');
        if (campus.status === 'BLACKLISTED') {
          throw new Error(`The campus "${campus.name}" is blacklisted and cannot be joined.`);
        }
        if (!effectiveDoc || effectiveDoc.trim() === '') {
          throw new Error('Student ID card photo is required when selecting a campus.');
        }
        institutionId = campus.slug;
      } else {
        institutionId = null; // "not a student" clears the campus tag
      }
    }

    const normalized = {
      fullName: input.fullName !== undefined && input.fullName?.trim() === '' ? undefined : input.fullName,
      phone: input.phone !== undefined && input.phone?.trim() === '' ? null : input.phone,
      institutionId,
      studentIdDoc: input.studentIdDoc !== undefined && input.studentIdDoc?.trim() === '' ? null : input.studentIdDoc,
    };

    await userRepo.updateProfile(userId, normalized);
    return this.getProfile(userId);
  },
};
