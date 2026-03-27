import { describe, expect, it, vi } from 'vitest';
import { ROLE_ADMIN, ROLE_COUNSELOR } from '@shared/const';
import {
  buildAuthSchemaFallbackUser,
  buildFallbackUser,
  mapCounselorProfileToUser,
  normalizeLoginEmail,
  resolveCounselorProfile,
} from './authProfile';

describe('authProfile', () => {
  it('normalizes login email before resolving the app user', () => {
    expect(normalizeLoginEmail(' Senior@Test.com ')).toBe('senior@test.com');
  });

  it('maps an admin profile to the admin app role', () => {
    const user = mapCounselorProfileToUser(
      {
        authUserId: 'auth-admin-1',
        email: 'senior@test.com',
      },
      {
        id: 'auth-admin-1',
        name: '시니어 관리자',
        branch: null,
        role: ROLE_ADMIN,
      },
    );

    expect(user.role).toBe(ROLE_ADMIN);
    expect(user.counselorId).toBe('auth-admin-1');
    expect(user.email).toBe('senior@test.com');
  });

  it('falls back through lookup strategies until it finds a profile', async () => {
    const legacyLookup = vi.fn().mockResolvedValue({
      id: 'auth-admin-1',
      name: '시니어 관리자',
      branch: null,
      role: ROLE_ADMIN,
    });
    const result = await resolveCounselorProfile(
      {
        authUserId: 'auth-admin-1',
        email: 'senior@test.com',
      },
      [
        vi.fn().mockResolvedValue(null),
        legacyLookup,
        vi.fn().mockResolvedValue({
          id: 'ignored',
          name: 'ignored',
          branch: null,
          role: ROLE_COUNSELOR,
        }),
      ],
    );

    expect(result.profile?.role).toBe(ROLE_ADMIN);
    expect(result.hadLookupError).toBe(false);
    expect(legacyLookup).toHaveBeenCalledOnce();
  });

  it('marks lookup failure when every strategy errors or misses', async () => {
    const result = await resolveCounselorProfile(
      {
        authUserId: 'auth-user-1',
        email: 'counselor@test.com',
      },
      [
        vi.fn().mockRejectedValue(new Error('network error')),
        vi.fn().mockResolvedValue(null),
      ],
    );

    expect(result.profile).toBeNull();
    expect(result.hadLookupError).toBe(true);
  });

  it('uses counselor fallback when no profile can be resolved', () => {
    const user = buildFallbackUser({
      authUserId: 'auth-user-1',
      email: 'counselor@test.com',
    });

    expect(user.role).toBe(ROLE_COUNSELOR);
    expect(user.name).toBe('counselor');
  });

  it('maps known auth-only email accounts when profile tables are unavailable', () => {
    const adminUser = buildAuthSchemaFallbackUser({
      authUserId: 'auth-admin-1',
      email: 'senior@test.com',
    });
    const counselorUser = buildAuthSchemaFallbackUser({
      authUserId: 'auth-user-1',
      email: 'counselor@test.com',
    });

    expect(adminUser?.role).toBe(ROLE_ADMIN);
    expect(adminUser?.name).toBe('관리자');
    expect(counselorUser?.role).toBe(ROLE_COUNSELOR);
    expect(counselorUser?.name).toBe('김상담');
    expect(counselorUser?.counselorId).toBe('c001');
  });

  it('does not allow unknown auth-only accounts without a profile row', () => {
    const user = buildAuthSchemaFallbackUser({
      authUserId: 'auth-user-1',
      email: 'someone@test.com',
    });

    expect(user).toBeNull();
  });
});
