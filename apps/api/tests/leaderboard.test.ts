// Covers campus leaderboard materialization, period filtering, and caller campus rank resolution.
import { db, creditTxns } from '@chokro/db';
import crypto from 'crypto';
import { GET as getLeaderboard } from '../app/api/leaderboard/route';
import { POST as refreshLeaderboard } from '../app/api/admin/leaderboard/refresh/route';
import { POST as setOptOut } from '../app/api/streaks/opt-out/route';
import { LeaderboardDomain } from '../lib/domain/LeaderboardDomain';
import { authHeaders, createTestUser, resetTestStore, tokenFor } from './test-utils';

describe('leaderboard API & domain', () => {
  beforeEach(async () => {
    await resetTestStore();
  });

  it('rejects invalid period parameter with 400', async () => {
    const res = await getLeaderboard(new Request('http://localhost/api/leaderboard?period=INVALID'));
    expect(res.status).toBe(400);
  });

  it('enforces admin-only on leaderboard refresh', async () => {
    const user = await createTestUser('INDIVIDUAL');
    const admin = await createTestUser('ADMIN');

    const anon = await refreshLeaderboard(new Request('http://localhost/api/admin/leaderboard/refresh', {
      method: 'POST',
    }));
    const forbidden = await refreshLeaderboard(new Request('http://localhost/api/admin/leaderboard/refresh', {
      method: 'POST',
      headers: authHeaders(tokenFor(user)),
    }));
    const ok = await refreshLeaderboard(new Request('http://localhost/api/admin/leaderboard/refresh', {
      method: 'POST',
      headers: authHeaders(tokenFor(admin)),
    }));

    expect(anon.status).toBe(401);
    expect(forbidden.status).toBe(403);
    expect(ok.status).toBe(200);
  });

  it('materializes campus scores and resolves my_row for authenticated user', async () => {
    const user1 = await createTestUser('INDIVIDUAL', 'u1@buet.ac.bd', 'BUET');
    const user2 = await createTestUser('INDIVIDUAL', 'u2@buet.ac.bd', 'BUET');
    const user3 = await createTestUser('INDIVIDUAL', 'u3@du.ac.bd', 'DU');
    const admin = await createTestUser('ADMIN');

    // Seed verified credits
    await db.insert(creditTxns).values([
      {
        id: crypto.randomUUID(),
        user_id: user1.id,
        amount: '100.00',
        kind: 'EARN',
        status: 'VERIFIED',
        created_at: new Date(),
      },
      {
        id: crypto.randomUUID(),
        user_id: user2.id,
        amount: '50.00',
        kind: 'EARN',
        status: 'VERIFIED',
        created_at: new Date(),
      },
      {
        id: crypto.randomUUID(),
        user_id: user3.id,
        amount: '80.00',
        kind: 'EARN',
        status: 'VERIFIED',
        created_at: new Date(),
      },
    ]);

    // Materialize
    await refreshLeaderboard(new Request('http://localhost/api/admin/leaderboard/refresh', {
      method: 'POST',
      headers: authHeaders(tokenFor(admin)),
    }));

    // Public fetch
    const publicRes = await getLeaderboard(new Request('http://localhost/api/leaderboard?period=WEEKLY'));
    const publicData = await publicRes.json();
    expect(publicRes.status).toBe(200);
    expect(publicData.campuses).toHaveLength(2);
    expect(publicData.campuses[0].campus_id).toBe('BUET');
    expect(Number(publicData.campuses[0].total_points)).toBe(150.0);
    expect(publicData.campuses[0].member_count).toBe(2);
    expect(publicData.campuses[0].top_scorer_user_id).toBe(user1.id);
    expect(publicData.my_row).toBeNull();

    // Authenticated fetch
    const authRes = await getLeaderboard(new Request('http://localhost/api/leaderboard?period=WEEKLY', {
      headers: authHeaders(tokenFor(user1)),
    }));
    const authData = await authRes.json();
    expect(authRes.status).toBe(200);
    expect(authData.my_row).toBeDefined();
    expect(authData.my_row.campus_id).toBe('BUET');
  });

  it('excludes users who have opted out from campus aggregates and my_row', async () => {
    const user = await createTestUser('INDIVIDUAL', 'optout@nsu.edu', 'NSU');
    const admin = await createTestUser('ADMIN');

    // Opt out
    await setOptOut(new Request('http://localhost/api/streaks/opt-out', {
      method: 'POST',
      headers: authHeaders(tokenFor(user)),
      body: JSON.stringify({ leaderboard_opt_out: true }),
    }));

    // Credit transaction
    await db.insert(creditTxns).values({
      id: crypto.randomUUID(),
      user_id: user.id,
      amount: '500.00',
      kind: 'EARN',
      status: 'VERIFIED',
      created_at: new Date(),
    });

    // Materialize
    await LeaderboardDomain.materializeAll();

    // Rankings should not include NSU points from opted-out user
    const res = await getLeaderboard(new Request('http://localhost/api/leaderboard?period=ALL_TIME', {
      headers: authHeaders(tokenFor(user)),
    }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.campuses).toHaveLength(0);
    expect(data.my_row).toBeNull();
  });
});
