/**
 * Login Page
 * Design: 모던 웰니스 미니멀리즘
 * Features: 역할 선택(상담사/관리자), Supabase 설정, 로그인
 *
 * SECURITY: No API keys are hardcoded. All credentials stored in localStorage via Settings.
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import {
  BarChart3, Eye, EyeOff, Key, Globe, ChevronDown,
  CheckCircle2, AlertTriangle, Save
} from 'lucide-react';
import { toast } from 'sonner';
import {
  STORAGE_KEYS, isSupabaseConfigured, resetSupabaseClient,
} from '@/lib/supabase';

function ApiSettingsPanel({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState(() => localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || '');
  const [anonKey, setAnonKey] = useState(() => localStorage.getItem(STORAGE_KEYS.SUPABASE_ANON_KEY) || '');
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    if (url.trim()) localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url.trim());
    else localStorage.removeItem(STORAGE_KEYS.SUPABASE_URL);

    if (anonKey.trim()) localStorage.setItem(STORAGE_KEYS.SUPABASE_ANON_KEY, anonKey.trim());
    else localStorage.removeItem(STORAGE_KEYS.SUPABASE_ANON_KEY);

    resetSupabaseClient();
    toast.success('Supabase 설정이 저장되었습니다.');
    onClose();
  };

  const configured = isSupabaseConfigured();

  return (
    <div className="mt-3 space-y-3 p-3 rounded-sm border border-border bg-muted/20">
      <div className="flex items-center gap-1.5 text-xs">
        {configured
          ? <><CheckCircle2 size={12} className="text-green-600" /><span className="text-green-700">Supabase 연결됨</span></>
          : <><AlertTriangle size={12} className="text-amber-500" /><span className="text-amber-700">미설정 (데모 모드)</span></>
        }
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Supabase URL</label>
        <div className="relative">
          <Globe size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://xxxxxxxxxxxx.supabase.co"
            className="w-full pl-7 pr-3 py-2 rounded-sm border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring font-mono"
            autoComplete="off"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Settings → API → Project URL</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Supabase Anon Key</label>
        <div className="relative">
          <Key size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type={showKey ? 'text' : 'password'}
            value={anonKey}
            onChange={e => setAnonKey(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="w-full pl-7 pr-8 py-2 rounded-sm border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring font-mono"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Settings → API → anon public</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium text-white"
          style={{ background: '#009C64' }}
        >
          <Save size={11} />
          저장
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-sm text-xs border border-input hover:bg-muted transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

export default function Login() {
  const [, navigate] = useLocation();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('counselor');
  const [showPassword, setShowPassword] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setError('');

    const result = await login(email, password, role);
    if (result.success) {
      toast.success('로그인되었습니다.');
      navigate(role === 'admin' ? '/admin/dashboard' : '/dashboard');
    } else {
      setError(result.error || '이메일 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  const configured = isSupabaseConfigured();

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'oklch(0.958 0.008 75)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663477530955/KJzdo2y2Lmf5RsBh2TqxqF/zeniel_d6e9bacb.png"
            alt="ZENIEL"
            className="h-16 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold text-foreground">상담 관리 시스템</h1>
          <p className="text-sm text-muted-foreground mt-1">로그인하여 시스템에 접속하세요</p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-md shadow-sm border border-border p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">역할 선택</label>
              <div className="grid grid-cols-2 gap-2">
                {(['counselor', 'admin'] as UserRole[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className="py-2.5 px-4 rounded-sm text-sm font-medium border transition-all duration-150"
                    style={role === r
                      ? { background: 'oklch(0.588 0.152 162.5)', borderColor: 'oklch(0.588 0.152 162.5)', color: 'white' }
                      : {}
                    }
                  >
                    {r === 'counselor' ? '상담사' : '관리자'}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                className="w-full px-3 py-2.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">비밀번호</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full px-3 py-2.5 pr-10 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-sm">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-2.5 disabled:opacity-60"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* Demo hint — shown only when Supabase not configured */}
          {!configured && (
            <div className="mt-4 p-3 rounded-sm text-xs text-muted-foreground" style={{ background: 'oklch(0.94 0.006 75)' }}>
              <div className="font-medium mb-1">데모 계정 (Supabase 미설정 시)</div>
              <div>상담사: counselor@demo.com / demo1234</div>
              <div>관리자: admin@demo.com / demo1234</div>
            </div>
          )}

          {/* Supabase Settings Toggle */}
          <div className="mt-4 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setShowApiSettings(!showApiSettings)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <Key size={14} />
              <span>Supabase 연결 설정</span>
              {configured && <CheckCircle2 size={12} className="text-green-600" />}
              <ChevronDown
                size={14}
                className="ml-auto transition-transform duration-200"
                style={{ transform: showApiSettings ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {showApiSettings && (
              <ApiSettingsPanel onClose={() => setShowApiSettings(false)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
