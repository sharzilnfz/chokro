import { POST as signupHandler } from '../app/api/auth/signup/route';
import { POST as loginHandler } from '../app/api/auth/login/route';
import { GET as meHandler } from '../app/api/auth/me/route';
import { db, users } from '@chokro/db';
import { eq } from 'drizzle-orm';

describe('TA1: Auth & RBAC API', () => {
  const testEmail = `test_${Date.now()}@chokro.org`;
  const testPassword = 'password123';
  let authToken = '';

  it('should register a new user via signup route', async () => {
    const req = new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        role: 'INDIVIDUAL',
      }),
    });

    const res = await signupHandler(req as any);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.user.email).toBe(testEmail);
    expect(data.user.role).toBe('INDIVIDUAL');
    expect(data.token).toBeDefined();
  });

  it('should login an existing user and return a valid JWT token', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const res = await loginHandler(req as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.token).toBeDefined();
    authToken = data.token;
  });

  it('should retrieve current user profile with valid JWT header', async () => {
    const req = new Request('http://localhost/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const res = await meHandler(req as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.user.email).toBe(testEmail);
  });

  it('should reject unauthenticated request to /api/auth/me with 401', async () => {
    const req = new Request('http://localhost/api/auth/me', {
      method: 'GET',
    });

    const res = await meHandler(req as any);
    expect(res.status).toBe(401);
  });
});
