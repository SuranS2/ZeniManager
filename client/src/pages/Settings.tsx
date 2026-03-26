/**
 * Settings Page
 * Design: 모던 웰니스 미니멀리즘
 * Features: API 키 등록, API 주소 설정, 로그아웃
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Key, Globe, LogOut, Save, Eye, EyeOff, User, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const [, navigate] = useLocation();
  const { user, logout, apiKey, setApiKey, apiUrl, setApiUrl } = useAuth();
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localApiUrl, setLocalApiUrl] = useState(apiUrl);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSave = () => {
    setApiKey(localApiKey);
    setApiUrl(localApiUrl);
    toast.success('설정이 저장되었습니다.');
  };

  const handleLogout = () => {
    logout();
    toast.success('로그아웃되었습니다.');
    navigate('/login');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1 as any)} className="p-1.5 rounded-sm hover:bg-muted transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">설정</h1>
          <p className="text-sm text-muted-foreground mt-0.5">시스템 설정 및 계정 관리</p>
        </div>
      </div>

      {/* Profile */}
      <div className="bg-card rounded-md p-5 shadow-sm border border-border space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <User size={15} />
          계정 정보
        </h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-sm flex items-center justify-center text-white text-lg font-bold" style={{ background: '#009C64' }}>
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="font-semibold text-foreground">{user?.name}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={user?.role === 'admin' ? 'badge-pending' : 'badge-active'}>
                {user?.role === 'admin' ? '관리자' : '상담사'}
              </span>
              {user?.branch && <span className="text-xs text-muted-foreground">{user.branch}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* API Settings */}
      <div className="bg-card rounded-md p-5 shadow-sm border border-border space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Key size={15} />
          API 설정
        </h2>

        <div>
          <label className="block text-sm font-medium mb-1.5">API 키</label>
          <div className="relative">
            <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type={showApiKey ? 'text' : 'password'}
              value={localApiKey}
              onChange={e => setLocalApiKey(e.target.value)}
              placeholder="API 키를 입력하세요"
              className="w-full pl-8 pr-10 py-2.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Supabase 또는 외부 API 서비스의 키를 입력하세요.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">API 주소</label>
          <div className="relative">
            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="url"
              value={localApiUrl}
              onChange={e => setLocalApiUrl(e.target.value)}
              placeholder="https://your-api-server.com"
              className="w-full pl-8 pr-3 py-2.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Supabase 외 별도 API 서버 주소를 입력하세요.</p>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSave} className="btn-primary">
            <Save size={14} className="mr-1.5" />
            저장
          </button>
          <button onClick={() => { setLocalApiKey(''); setLocalApiUrl(''); }} className="btn-cancel">
            초기화
          </button>
        </div>
      </div>

      {/* Logout */}
      <div className="bg-card rounded-md p-5 shadow-sm border border-border">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <LogOut size={15} />
          계정 관리
        </h2>
        <p className="text-sm text-muted-foreground mb-4">로그아웃하면 모든 세션이 종료됩니다.</p>
        <button onClick={handleLogout} className="btn-destructive">
          <LogOut size={14} className="mr-1.5" />
          로그아웃
        </button>
      </div>
    </div>
  );
}
