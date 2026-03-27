import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ROLE_ADMIN,
  normalizeAppRole,
  ROLE_COUNSELOR,
  type AppRole,
} from '@shared/const';

export interface UserIdentity {
  authUserId: string;
  email: string;
}

export interface CounselorProfileRecord {
  id: string;
  name: string;
  branch: string | null;
  role: unknown;
}

export interface AuthenticatedUserProfile {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  branch?: string;
  counselorId?: string;
}

export interface CounselorProfileResolution {
  profile: CounselorProfileRecord | null;
  hadLookupError: boolean;
}

type SupabaseLike = Pick<SupabaseClient, 'from' | 'rpc'>;
export type ProfileLookup = (
  identity: UserIdentity,
) => Promise<CounselorProfileRecord | null>;

const AUTH_EMAIL_FALLBACKS: Record<string, {
  name: string;
  role: AppRole;
  branch?: string;
  counselorId?: string;
}> = {
  'senior@test.com': {
    name: '관리자',
    role: ROLE_ADMIN,
    branch: '본사',
  },
  'counselor@test.com': {
    name: '김상담',
    role: ROLE_COUNSELOR,
    branch: '서울 강남지점',
    counselorId: 'c001',
  },
};

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function mapCounselorProfileToUser(
  identity: UserIdentity,
  profile: CounselorProfileRecord,
): AuthenticatedUserProfile {
  return {
    id: identity.authUserId,
    name: profile.name,
    email: identity.email,
    role: normalizeAppRole(profile.role),
    branch: profile.branch || undefined,
    counselorId: profile.id,
  };
}

export function buildFallbackUser(
  identity: UserIdentity,
): AuthenticatedUserProfile {
  return {
    id: identity.authUserId,
    name: identity.email.split('@')[0] || '사용자',
    email: identity.email,
    role: ROLE_COUNSELOR,
  };
}

export function buildAuthSchemaFallbackUser(
  identity: UserIdentity,
): AuthenticatedUserProfile | null {
  const mapped = AUTH_EMAIL_FALLBACKS[identity.email];
  if (!mapped) {
    return null;
  }

  return {
    id: identity.authUserId,
    name: mapped.name,
    email: identity.email,
    role: mapped.role,
    branch: mapped.branch,
    counselorId: mapped.counselorId,
  };
}

export async function resolveCounselorProfile(
  identity: UserIdentity,
  lookups: ProfileLookup[],
): Promise<CounselorProfileResolution> {
  let hadLookupError = false;

  for (const lookup of lookups) {
    try {
      const profile = await lookup(identity);
      if (profile) {
        return {
          profile,
          hadLookupError,
        };
      }
    } catch {
      hadLookupError = true;
    }
  }

  return {
    profile: null,
    hadLookupError,
  };
}

export function createCounselorProfileLookups(
  sb: SupabaseLike,
): ProfileLookup[] {
  return [
    async ({ authUserId }) => {
      const { data, error } = await sb
        .from('user')
        .select('user_id, user_name, role')
        .eq('user_id', authUserId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.user_id,
        name: data.user_name,
        branch: null,
        role: data.role,
      };
    },
    async ({ authUserId }) => {
      const { data, error } = await sb
        .from('counselors')
        .select('id, name, branch, role')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
    async ({ email }) => {
      if (!email) return null;

      const { data, error } = await sb.rpc(
        'resolve_current_counselor_profile',
        { user_email: email },
      );

      if (error) {
        throw error;
      }

      if (Array.isArray(data)) {
        return (data[0] as CounselorProfileRecord | undefined) ?? null;
      }

      return (data as CounselorProfileRecord | null) ?? null;
    },
    async ({ email }) => {
      if (!email) return null;

      const { data, error } = await sb
        .from('counselors')
        .select('id, name, branch, role')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
  ];
}
