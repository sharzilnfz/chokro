import { GET } from '../app/api/health/route';

describe('T0 API Test Harness', () => {
  it('health endpoint should return status ok', async () => {
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.db).toBe('connected');
  });
});
