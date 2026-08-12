import { POST as signup } from '../app/api/auth/signup/route';
import { POST as login } from '../app/api/auth/login/route';
import { GET as me } from '../app/api/auth/me/route';
import { signToken } from '../lib/auth';
import { userRepo } from '../lib/repos/users';
import { DatabaseUnavailableError } from '../lib/database';
import { resetTestStore } from './test-utils';

describe('auth API', () => {
  beforeEach(async () => {
    await resetTestStore();
    jest.restoreAllMocks();
  });

  it('always creates an individual even when a privileged role is submitted', async () => {
    const response = await signup(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'privileged@test.chokro.org', password: 'password123', role: 'ADMIN' }),
    }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user.role).toBe('INDIVIDUAL');
    expect(data.token).toEqual(expect.any(String));
  });

  it('logs in and returns the authenticated profile', async () => {
    await signup(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.chokro.org', password: 'password123' }),
    }));
    const loginResponse = await login(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.chokro.org', password: 'password123' }),
    }));
    const loginData = await loginResponse.json();
    const meResponse = await me(new Request('http://localhost/api/auth/me', {
      headers: { Authorization: `Bearer ${loginData.token}` },
    }));
    const meData = await meResponse.json();

    expect(loginResponse.status).toBe(200);
    expect(meResponse.status).toBe(200);
    expect(meData.user.email).toBe('user@test.chokro.org');
  });

  it('uses the same generic error for unknown users and wrong passwords', async () => {
    await signup(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'known@test.chokro.org', password: 'password123' }),
    }));
    const unknown = await login(new Request('http://localhost/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email: 'unknown@test.chokro.org', password: 'wrong' }),
    }));
    const wrong = await login(new Request('http://localhost/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email: 'known@test.chokro.org', password: 'wrong' }),
    }));

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(await unknown.json()).toEqual(await wrong.json());
  });

  it('rejects missing and invalid bearer tokens', async () => {
    const missing = await me(new Request('http://localhost/api/auth/me'));
    const invalid = await me(new Request('http://localhost/api/auth/me', { headers: { Authorization: 'Bearer invalid' } }));
    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
  });

  it('requires JWT_SECRET in production', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;
    Object.assign(process.env, { NODE_ENV: 'production' });
    delete process.env.JWT_SECRET;
    try {
      expect(() => signToken({ userId: 'user', email: 'user@test.chokro.org', role: 'INDIVIDUAL' }))
        .toThrow('JWT_SECRET is required in production');
    } finally {
      Object.assign(process.env, { NODE_ENV: originalNodeEnv });
      if (originalSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = originalSecret;
    }
  });

  it('returns 503 instead of a memory success when the database fails', async () => {
    jest.spyOn(userRepo, 'findByEmail').mockRejectedValueOnce(new DatabaseUnavailableError());
    const response = await signup(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'no-db@test.chokro.org', password: 'password123' }),
    }));
    expect(response.status).toBe(503);
  });
});
