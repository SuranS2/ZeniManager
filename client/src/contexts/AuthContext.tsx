/**
 * AuthContext
 *
 * Supports two modes:
 * 1. Supabase Auth — when Supabase URL + anon key are configured in Settings
 * 2. Local demo — when Supabase is not configured (mock users)
 *
 * SECURITY: No API keys are hardcoded. All credentials come from localStorage.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { normalizeAppRole, ROLE_ADMIN, ROLE_COUNSELOR, type AppRole } from '@shared/const';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export type UserRole = AppRole;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profileImage?: string;
  branch?: string;
  counselorId?: string; // Supabase counselors.id
}

export interface LoginResult {
  success: boolean;
  error?: string;
  user?: User;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Demo users (used only when Supabase is not configured) ──────────────────
const DEMO_USERS: Record<string, User & { password: string }> = {
  'counselor@demo.com': {
    id: 'demo-c001',
    name: '최인수',
    email: 'counselor@demo.com',
    password: 'demo1234',
    role: ROLE_COUNSELOR,
    branch: '울산지점',
  },
  'admin@demo.com': {
    id: 'demo-a001',
    name: '관리자',
    email: 'admin@demo.com',
    password: 'demo1234',
    role: ROLE_ADMIN,
    branch: '본사',
  },
};

const USER_STORAGE_KEY = 'counsel_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as Partial<User> & { role?: unknown };
      return {
        ...parsed,
        role: normalizeAppRole(parsed.role),
      } as User;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  // Listen for Supabase session changes when configured
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const sb = getSupabaseClient();
    if (!sb) return;

    // Check existing session
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        resolveSupabaseUser(session.user.id, session.user.email || '');
      }
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        resolveSupabaseUser(session.user.id, session.user.email || '');
      } else {
        setUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const resolveSupabaseUser = useCallback(async (authUserId: string, email: string): Promise<User | null> => {
    const sb = getSupabaseClient();
    if (!sb) return null;

    try {
      const { data } = await sb
        .from('counselors')
        .select('id, name, branch, role')
        .eq('auth_user_id', authUserId)
        .single();

      if (data) {
        const resolvedUser: User = {
          id: authUserId,
          name: data.name,
          email,
          role: normalizeAppRole(data.role),
          branch: data.branch || undefined,
          counselorId: data.id,
        };
        setUser(resolvedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(resolvedUser));
        return resolvedUser;
      }
    } catch {
      // Fall through to the local fallback profile.
    }

    const fallbackUser: User = {
      id: authUserId,
      name: email.split('@')[0] || '사용자',
      email,
      role: ROLE_COUNSELOR,
    };
    setUser(fallbackUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fallbackUser));
    return fallbackUser;
  }, []);

  const login = useCallback(async (
    email: string,
    password: string
  ): Promise<LoginResult> => {
    setIsLoading(true);
    try {
      // ── Supabase Auth ──────────────────────────────────────────────────────
      if (isSupabaseConfigured()) {
        const sb = getSupabaseClient();
        if (!sb) throw new Error('Supabase 클라이언트 초기화 실패');

        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return { success: false, error: error.message };

        if (data.user) {
          const resolvedUser = await resolveSupabaseUser(data.user.id, data.user.email || email);
          return resolvedUser
            ? { success: true, user: resolvedUser }
            : { success: false, error: '사용자 정보를 확인할 수 없습니다.' };
        }
        return { success: false, error: '로그인 실패' };
      }

      // ── Demo / local mode ─────────────────────────────────────────────────
      await new Promise(r => setTimeout(r, 500)); // simulate latency

      const demo = DEMO_USERS[email];
      if (demo && demo.password === password) {
        const { password: _, ...resolvedUser } = demo;
        setUser(resolvedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(resolvedUser));
        return { success: true, user: resolvedUser };
      }

      // Fallback: accept any credentials in demo mode as a counselor profile.
      const fallbackUser: User = {
        id: `local_${Date.now()}`,
        name: email.split('@')[0] || '상담사',
        email,
        role: ROLE_COUNSELOR,
        branch: '서울지점',
      };
      setUser(fallbackUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fallbackUser));
      return { success: true, user: fallbackUser };
    } catch (e: any) {
      return { success: false, error: e.message || '로그인 중 오류 발생' };
    } finally {
      setIsLoading(false);
    }
  }, [resolveSupabaseUser]);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      if (sb) await sb.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
