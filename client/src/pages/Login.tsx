/**
 * Login Page
 * Design: 모던 웰니스 미니멀리즘
 * Features: 역할 선택(상담사/관리자), API 키 등록, API URL 설정, 로그인
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { BarChart3, Eye, EyeOff, Key, Globe, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [, navigate] = useLocation();
  const { login, apiKey, setApiKey, apiUrl, setApiUrl } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('counselor');
  const [showPassword, setShowPassword] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localApiUrl, setLocalApiUrl] = useState(apiUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const success = await login(email, password, role);
      if (success) {
        toast.success('로그인되었습니다.');
        navigate(role === 'admin' ? '/admin/dashboard' : '/dashboard');
      } else {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiSettings = () => {
    setApiKey(localApiKey);
    setApiUrl(localApiUrl);
    toast.success('API 설정이 저장되었습니다.');
    setShowApiSettings(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'oklch(0.958 0.008 75)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-md mb-4" style={{ background: 'oklch(0.588 0.152 162.5)' }}>
            <BarChart3 size={28} color="white" />
          </div>
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
                <button
                  type="button"
                  onClick={() => setRole('counselor')}
                  className={`py-2.5 px-4 rounded-sm text-sm font-medium border transition-all duration-150 ${
                    role === 'counselor'
                      ? 'border-primary text-white'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                  style={role === 'counselor' ? { background: 'oklch(0.588 0.152 162.5)', borderColor: 'oklch(0.588 0.152 162.5)' } : {}}
                >
                  상담사
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`py-2.5 px-4 rounded-sm text-sm font-medium border transition-all duration-150 ${
                    role === 'admin'
                      ? 'border-primary text-white'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                  style={role === 'admin' ? { background: 'oklch(0.588 0.152 162.5)', borderColor: 'oklch(0.588 0.152 162.5)' } : {}}
                >
                  관리자
                </button>
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
              disabled={loading}
              className="btn-primary w-full py-2.5 disabled:opacity-60"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-4 p-3 rounded-sm text-xs text-muted-foreground" style={{ background: 'oklch(0.94 0.006 75)' }}>
            <div className="font-medium mb-1">데모 계정</div>
            <div>상담사: counselor@demo.com / demo1234</div>
            <div>관리자: admin@demo.com / demo1234</div>
          </div>

          {/* API Settings Toggle */}
          <div className="mt-4 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setShowApiSettings(!showApiSettings)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <Key size={14} />
              <span>API 설정</span>
              <ChevronDown
                size={14}
                className="ml-auto transition-transform duration-200"
                style={{ transform: showApiSettings ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {showApiSettings && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">API 키</label>
                  <div className="relative">
                    <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={localApiKey}
                      onChange={e => setLocalApiKey(e.target.value)}
                      placeholder="API 키를 입력하세요"
                      className="w-full pl-8 pr-3 py-2 rounded-sm border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    API 주소 <span className="text-muted-foreground font-normal">(Supabase 외 API 서버)</span>
                  </label>
                  <div className="relative">
                    <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="url"
                      value={localApiUrl}
                      onChange={e => setLocalApiUrl(e.target.value)}
                      placeholder="https://your-api-server.com"
                      className="w-full pl-8 pr-3 py-2 rounded-sm border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveApiSettings}
                  className="btn-primary text-xs py-2 w-full"
                >
                  저장
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
