import { campusRepo } from '@/lib/repos/campuses';
import { userRepo } from '@/lib/repos/users';

// Uppercase [A-Z0-9_] slug, e.g. "BRAC University" -> "BRAC_UNIVERSITY".
export function slugifyCampusName(name: string): string {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'CAMPUS';
}

export const CampusDomain = {
  // Public list returns only VERIFIED campuses by default.
  async list(status: string = 'VERIFIED') {
    return campusRepo.findAll({ status });
  },

  // Admin list returns all campuses or filtered by status.
  async listAll(status?: string) {
    return campusRepo.findAll(status ? { status } : undefined);
  },

  // Create with dedup: caller-supplied slug wins, else slugify(name); append _2, _3…
  async create(input: {
    name: string;
    division: string;
    zilla: string;
    upazilla?: string | null;
    slug?: string;
    status?: string;
    reason?: string | null;
    createdBy?: string | null;
  }) {
    const base = (input.slug && input.slug.trim())
      ? input.slug.toUpperCase()
      : slugifyCampusName(input.name);
    let slug = base;
    let suffix = 2;
    while (await campusRepo.findBySlug(slug)) {
      slug = `${base}_${suffix}`;
      suffix += 1;
    }
    return campusRepo.create({ ...input, slug });
  },

  // Update campus lifecycle status (e.g. VERIFIED, BLACKLISTED) with optional reason
  async updateStatus(id: string, status: string, reason?: string | null) {
    const campus = await campusRepo.findById(id);
    if (!campus) throw new Error('Campus not found');
    const updated = await campusRepo.updateStatus(id, status, reason);
    if (!updated) throw new Error('Failed to update campus status');
    return updated;
  },

  // Refuse to delete a campus that still has linked student members.
  async remove(id: string) {
    const campus = await campusRepo.findById(id);
    if (!campus) throw new Error('Campus not found');
    const members = await userRepo.countByInstitution(campus.slug);
    if (members > 0) {
      throw new Error(`Cannot delete "${campus.name}": ${members} student(s) are linked to it. Unlink them first.`);
    }
    await campusRepo.remove(id);
    return campus;
  },
};
