import { resetTestStore, createTestUser, tokenFor, authHeaders, routeParams } from './test-utils';
import { GET as getCampuses } from '../app/api/campuses/route';
import { GET as getProfile, PATCH as patchProfile } from '../app/api/profile/route';
import { GET as getAdminCampuses, POST as postCampus } from '../app/api/admin/campuses/route';
import { PATCH as patchAdminCampus, DELETE as deleteCampus } from '../app/api/admin/campuses/[id]/route';
import { userRepo } from '../lib/repos/users';

describe('Campus & Profile API', () => {
  beforeEach(async () => {
    await resetTestStore();
  });

  it('lists verified campuses for a signed-in user', async () => {
    const admin = await createTestUser('ADMIN');
    await postCampus(new Request('http://localhost/api/admin/campuses', {
      method: 'POST',
      headers: authHeaders(tokenFor(admin)),
      body: JSON.stringify({ name: 'North South University', division: 'DHAKA', zilla: 'Dhaka', upazilla: 'Bashundhara' }),
    }));

    const user = await createTestUser();
    const res = await getCampuses(new Request('http://localhost/api/campuses', { headers: authHeaders(tokenFor(user)) }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.campuses)).toBe(true);
    expect(body.campuses).toHaveLength(1);
    expect(body.campuses[0].slug).toBe('NORTH_SOUTH_UNIVERSITY');
    expect(body.campuses[0].status).toBe('VERIFIED');
  });

  it('rejects unauthenticated campus list', async () => {
    const res = await getCampuses(new Request('http://localhost/api/campuses'));
    expect(res.status).toBe(401);
  });

  it('admin creates a campus and slug is auto-derived + deduped', async () => {
    const admin = await createTestUser('ADMIN');
    const headers = authHeaders(tokenFor(admin));
    const first = await postCampus(new Request('http://localhost/api/admin/campuses', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'BRAC University', division: 'DHAKA', zilla: 'Dhaka', upazilla: 'Mohakhali' }),
    }));
    expect(first.status).toBe(201);
    const firstBody = await first.json();
    expect(firstBody.campus.slug).toBe('BRAC_UNIVERSITY');
    expect(firstBody.campus.status).toBe('VERIFIED');

    const second = await postCampus(new Request('http://localhost/api/admin/campuses', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'BRAC University', division: 'DHAKA', zilla: 'Dhaka', upazilla: 'Mohakhali' }),
    }));
    expect(second.status).toBe(201);
    const secondBody = await second.json();
    expect(secondBody.campus.slug).toBe('BRAC_UNIVERSITY_2');
  });

  it('admin create rejects invalid division', async () => {
    const admin = await createTestUser('ADMIN');
    const res = await postCampus(new Request('http://localhost/api/admin/campuses', {
      method: 'POST',
      headers: authHeaders(tokenFor(admin)),
      body: JSON.stringify({ name: 'X College', division: 'COMILLA', zilla: 'Cumilla', upazilla: 'X' }),
    }));
    expect(res.status).toBe(400);
  });

  it('rejects non-admin campus creation', async () => {
    const user = await createTestUser('INDIVIDUAL');
    const res = await postCampus(new Request('http://localhost/api/admin/campuses', {
      method: 'POST',
      headers: authHeaders(tokenFor(user)),
      body: JSON.stringify({ name: 'DU', division: 'DHAKA', zilla: 'Dhaka', upazilla: 'Shahbag' }),
    }));
    expect(res.status).toBe(403);
  });

  it('cannot delete a campus that still has linked members', async () => {
    const admin = await createTestUser('ADMIN');
    const headers = authHeaders(tokenFor(admin));

    const createRes = await postCampus(new Request('http://localhost/api/admin/campuses', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Dhaka University', division: 'DHAKA', zilla: 'Dhaka', upazilla: 'Shahbag', slug: 'DU' }),
    }));
    const { campus } = await createRes.json();

    // Link a user to this campus
    const user = await createTestUser('INDIVIDUAL');
    await userRepo.updateProfile(user.id, { institutionId: 'DU' });

    // Attempt to delete
    const delRes1 = await deleteCampus(
      new Request(`http://localhost/api/admin/campuses/${campus.id}`, { method: 'DELETE', headers }),
      routeParams(campus.id)
    );
    expect(delRes1.status).toBe(400);
    const errBody = await delRes1.json();
    expect(errBody.error).toContain('linked to it');

    // Unlink the user
    await userRepo.updateProfile(user.id, { institutionId: null });

    // Now delete succeeds
    const delRes2 = await deleteCampus(
      new Request(`http://localhost/api/admin/campuses/${campus.id}`, { method: 'DELETE', headers }),
      routeParams(campus.id)
    );
    expect(delRes2.status).toBe(200);
  });

  it('updates profile and resolves campus name correctly', async () => {
    const admin = await createTestUser('ADMIN');
    await postCampus(new Request('http://localhost/api/admin/campuses', {
      method: 'POST',
      headers: authHeaders(tokenFor(admin)),
      body: JSON.stringify({ name: 'North South University', division: 'DHAKA', zilla: 'Dhaka', upazilla: 'Bashundhara', slug: 'NSU' }),
    }));

    const user = await createTestUser('INDIVIDUAL');
    const userHeaders = authHeaders(tokenFor(user));

    // Initial profile
    const initRes = await getProfile(new Request('http://localhost/api/profile', { headers: userHeaders }));
    const initData = await initRes.json();
    expect(initRes.status).toBe(200);
    expect(initData.user.fullName).toBeNull();
    expect(initData.user.campusName).toBeNull();

    // Update profile with valid campus and student ID doc
    const sampleDoc = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD';
    const updateRes = await patchProfile(new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: userHeaders,
      body: JSON.stringify({
        fullName: 'Sadat Nafis',
        phone: '01711223344',
        campusSlug: 'NSU',
        studentIdDoc: sampleDoc,
      }),
    }));
    expect(updateRes.status).toBe(200);
    const updateData = await updateRes.json();
    expect(updateData.user.fullName).toBe('Sadat Nafis');
    expect(updateData.user.phone).toBe('01711223344');
    expect(updateData.user.institutionId).toBe('NSU');
    expect(updateData.user.campusName).toBe('North South University');
    expect(updateData.user.campusStatus).toBe('VERIFIED');
    expect(updateData.user.studentIdDoc).toBe(sampleDoc);

    // Verify GET profile round-trip
    const getRes = await getProfile(new Request('http://localhost/api/profile', { headers: userHeaders }));
    const getData = await getRes.json();
    expect(getData.user.fullName).toBe('Sadat Nafis');
    expect(getData.user.campusName).toBe('North South University');

    // Unlink campus (not a student)
    const unlinkRes = await patchProfile(new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: userHeaders,
      body: JSON.stringify({ campusSlug: null }),
    }));
    expect(unlinkRes.status).toBe(200);
    const unlinkData = await unlinkRes.json();
    expect(unlinkData.user.institutionId).toBeNull();
    expect(unlinkData.user.campusName).toBeNull();
  });

  it('rejects profile update with unregistered campus slug', async () => {
    const user = await createTestUser();
    const res = await patchProfile(new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: authHeaders(tokenFor(user)),
      body: JSON.stringify({ campusSlug: 'UNKNOWN_VARSITY' }),
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('not registered');
  });

  it('student submits unlisted campus which creates a PENDING campus and links it', async () => {
    const user = await createTestUser('INDIVIDUAL');
    const userHeaders = authHeaders(tokenFor(user));
    const sampleDoc = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD';

    // Submit unlisted campus
    const res = await patchProfile(new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: userHeaders,
      body: JSON.stringify({
        fullName: 'Campus Pioneer',
        newCampus: {
          name: 'Independent University Bangladesh',
          division: 'DHAKA',
          zilla: 'Dhaka',
          upazilla: 'Bashundhara',
        },
        studentIdDoc: sampleDoc,
      }),
    }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.institutionId).toBe('INDEPENDENT_UNIVERSITY_BANGLADESH');
    expect(data.user.campusName).toBe('Independent University Bangladesh');
    expect(data.user.campusStatus).toBe('PENDING');

    // Verify unlisted campus is NOT returned in public campus list until verified
    const pubListRes = await getCampuses(new Request('http://localhost/api/campuses', { headers: userHeaders }));
    const pubListData = await pubListRes.json();
    expect(pubListData.campuses.find((c: any) => c.slug === 'INDEPENDENT_UNIVERSITY_BANGLADESH')).toBeUndefined();

    // Verify admin can see pending campus
    const admin = await createTestUser('ADMIN');
    const adminHeaders = authHeaders(tokenFor(admin));
    const adminPendingRes = await getAdminCampuses(new Request('http://localhost/api/admin/campuses?status=PENDING', {
      headers: adminHeaders,
    }));
    const adminPendingData = await adminPendingRes.json();
    const pendingCampus = adminPendingData.campuses.find((c: any) => c.slug === 'INDEPENDENT_UNIVERSITY_BANGLADESH');
    expect(pendingCampus).toBeDefined();
    expect(pendingCampus.status).toBe('PENDING');

    // Admin verifies the campus
    const verifyRes = await patchAdminCampus(
      new Request(`http://localhost/api/admin/campuses/${pendingCampus.id}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'VERIFIED' }),
      }),
      routeParams(pendingCampus.id)
    );
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.campus.status).toBe('VERIFIED');

    // Now public list contains the verified campus
    const pubListRes2 = await getCampuses(new Request('http://localhost/api/campuses', { headers: userHeaders }));
    const pubListData2 = await pubListRes2.json();
    expect(pubListData2.campuses.find((c: any) => c.slug === 'INDEPENDENT_UNIVERSITY_BANGLADESH')).toBeDefined();
  });

  it('admin can blacklist a campus with a reason and users cannot select it', async () => {
    const admin = await createTestUser('ADMIN');
    const adminHeaders = authHeaders(tokenFor(admin));

    const createRes = await postCampus(new Request('http://localhost/api/admin/campuses', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ name: 'Fake Diploma Mill', division: 'DHAKA', zilla: 'Dhaka', upazilla: 'Dhanmondi', slug: 'FDM' }),
    }));
    const { campus } = await createRes.json();

    // Admin blacklists the campus
    const blacklistRes = await patchAdminCampus(
      new Request(`http://localhost/api/admin/campuses/${campus.id}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'BLACKLISTED', reason: 'Unaccredited institution violating platform policies.' }),
      }),
      routeParams(campus.id)
    );
    expect(blacklistRes.status).toBe(200);
    const blacklistData = await blacklistRes.json();
    expect(blacklistData.campus.status).toBe('BLACKLISTED');
    expect(blacklistData.campus.reason).toContain('Unaccredited');

    // User tries to select the blacklisted campus
    const user = await createTestUser('INDIVIDUAL');
    const userHeaders = authHeaders(tokenFor(user));
    const sampleDoc = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD';

    const joinRes = await patchProfile(new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: userHeaders,
      body: JSON.stringify({ campusSlug: 'FDM', studentIdDoc: sampleDoc }),
    }));
    expect(joinRes.status).toBe(400);
    const joinData = await joinRes.json();
    expect(joinData.error).toContain('blacklisted');
  });
});
