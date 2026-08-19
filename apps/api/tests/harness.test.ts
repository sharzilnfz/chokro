// Smoke test for the T0 contract: the health endpoint must report ok + DB connected.
import { GET } from '../app/api/health/route';

// Verifies the basic request pipeline responds as expected.
describe('T0 API Test Harness', () => {
  // Health endpoint reports service and database status together.
  it('health endpoint should return status ok', async () => {
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.db).toBe('connected');
  });
});
