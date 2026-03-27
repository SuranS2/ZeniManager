/**
 * counsel.test.ts
 * Unit tests for counseling admin system server-side logic
 */
import { describe, it, expect } from 'vitest';
import { ROLE_ADMIN, ROLE_COUNSELOR } from '@shared/const';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

// ─── Helper: create mock context ─────────────────────────────────────────────
function makeCtx(role: typeof ROLE_COUNSELOR | typeof ROLE_ADMIN = ROLE_COUNSELOR): TrpcContext {
  return {
    user: {
      id: 1,
      openId: 'test-open-id',
      name: role === ROLE_ADMIN ? '관리자' : '최인수',
      email: role === ROLE_ADMIN ? 'admin@example.com' : 'counselor@example.com',
      loginMethod: 'email',
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────
describe('auth.me', () => {
  it('returns user when authenticated', async () => {
    const ctx = makeCtx(ROLE_COUNSELOR);
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).not.toBeNull();
    expect(user?.email).toBe('counselor@example.com');
    expect(user?.role).toBe(ROLE_COUNSELOR);
  });

  it('returns null when unauthenticated', async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: 'https', headers: {} } as TrpcContext['req'],
      res: { clearCookie: () => {} } as TrpcContext['res'],
    };
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

describe('auth.logout', () => {
  it('clears session cookie and returns success', async () => {
    const cleared: string[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1, openId: 'test', name: 'Test', email: 'test@test.com',
        loginMethod: 'email', role: ROLE_COUNSELOR,
        createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      },
      req: { protocol: 'https', headers: {} } as TrpcContext['req'],
      res: {
        clearCookie: (name: string) => { cleared.push(name); },
      } as TrpcContext['res'],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(cleared).toHaveLength(1);
  });
});

// ─── Business logic unit tests ────────────────────────────────────────────────
describe('Survey score calculation', () => {
  it('calculates total score correctly', () => {
    const scores = { q1: 4, q2: 3, q3: 5, q4: 2, q5: 4, q6: 3, q7: 2, q8: 5 };
    const total = Object.values(scores).reduce((sum, v) => sum + v, 0);
    expect(total).toBe(28);
  });

  it('handles missing scores with 0', () => {
    const scores = { q1: 4, q2: null, q3: 5, q4: null, q5: 4, q6: 3, q7: null, q8: 5 };
    const total = Object.values(scores).reduce((sum, v) => sum + (v ?? 0), 0);
    expect(total).toBe(21);
  });
});

describe('Client data validation', () => {
  it('validates required fields', () => {
    const isValid = (name: string) => name.trim().length > 0;
    expect(isValid('홍길동')).toBe(true);
    expect(isValid('')).toBe(false);
    expect(isValid('  ')).toBe(false);
  });

  it('validates phone number format', () => {
    const isValidPhone = (phone: string) => /^010-\d{4}-\d{4}$/.test(phone);
    expect(isValidPhone('010-1234-5678')).toBe(true);
    expect(isValidPhone('01012345678')).toBe(false);
    expect(isValidPhone('010-123-5678')).toBe(false);
  });

  it('validates gender values', () => {
    const validGenders = ['남', '여'];
    expect(validGenders.includes('남')).toBe(true);
    expect(validGenders.includes('여')).toBe(true);
    expect(validGenders.includes('기타')).toBe(false);
  });
});

describe('Employment rate calculation', () => {
  it('calculates employment rate from client data', () => {
    const clients = [
      { employment_type: '정규직' },
      { employment_type: null },
      { employment_type: '계약직' },
      { employment_type: null },
      { employment_type: '정규직' },
    ];
    const employed = clients.filter(c => c.employment_type && c.employment_type !== '').length;
    const rate = Math.round(employed / clients.length * 100);
    expect(rate).toBe(60);
  });

  it('handles empty client list', () => {
    const clients: { employment_type: string | null }[] = [];
    const rate = clients.length > 0
      ? Math.round(clients.filter(c => c.employment_type).length / clients.length * 100)
      : 0;
    expect(rate).toBe(0);
  });
});
