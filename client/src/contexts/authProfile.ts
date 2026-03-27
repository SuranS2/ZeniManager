import type { SupabaseClient } from '@supabase/supabase-js';
import {
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

type SupabaseLike = Pick<SupabaseClient, 'from' | 'rpc'>;
export type ProfileLookup = (
  identity: UserIdentity,
) => Promise<CounselorProfileRecord | null>;

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

export async function resolveCounselorProfile(
  identity: UserIdentity,
  lookups: ProfileLookup[],
): Promise<CounselorProfileRecord | null> {
  for (const lookup of lookups) {
    try {
      const profile = await lookup(identity);
      if (profile) {
        return profile;
      }
    } catch {
      // Fall through so older environments can continue to the next strategy.
    }
  }

  return null;
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
