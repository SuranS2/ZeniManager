/**
 * Settings Page
 * 
 * SECURITY: All API keys are stored ONLY in localStorage.
 * No keys are hardcoded, committed to git, or sent to any server.
 * This file is safe to publish on GitHub publicly.
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { isAdminRole, ROLE_ADMIN, ROLE_COUNSELOR } from '@shared/const';
import { useAuth } from '@/contexts/AuthContext';
import {
  Key, Globe, LogOut, Save, Eye, EyeOff, User,
  ChevronLeft, Database, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, Cpu, Info, Copy, Check
} from 'lucide-react';
import { toast } from 'sonner';
import {
  STORAGE_KEYS,
  getSupabaseUrl, getSupabaseAnonKey,
  isSupabaseConfigured, resetSupabaseClient,
} from '@/lib/supabase';

interface SecretField {
  storageKey: string;
  label: string;
  placeholder: string;
  hint: string;
  icon: React.ReactNode;
  isUrl?: boolean;
}

const FIELDS: SecretField[] = [
  {
    storageKey: STORAGE_KEYS.SUPABASE_URL,
    label: 'Supabase URL',
    placeholder: 'https://xxxxxxxxxxxx.supabase.co',
    hint: 'Supabase 대시보드 → Settings → API → Project URL',
    icon: <Globe size={14} />,
    isUrl: true,
  },
  {
    storageKey: STORAGE_KEYS.SUPABASE_ANON_KEY,
    label: 'Supabase Anon Key (공개 키)',
    placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    hint: 'Supabase 대시보드 → Settings → API → anon public',
    icon: <Key size={14} />,
  },
  {
    storageKey: STORAGE_KEYS.OPENAI_API_KEY,
    label: 'OpenAI API Key (선택)',
    placeholder: 'sk-...',
    hint: 'platform.openai.com → API keys (AI 기능 사용 시 필요)',
    icon: <Cpu size={14} />,
  },
];

function SecretInput({ field }: { field: SecretField }) {
  const [value, setValue] = useState(() => localStorage.getItem(field.storageKey) || '');
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed) {
      localStorage.setItem(field.storageKey, trimmed);
    } else {
      localStorage.removeItem(field.storageKey);
    }
    resetSupabaseClient();
    setSaved(true);
    toast.success(`${field.label} 저장됨`);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setValue('');
    localStorage.removeItem(field.storageKey);
    resetSupabaseClient();
    toast.info(`${field.label} 삭제됨`);
  };

  const isSet = !!localStorage.getItem(field.storageKey);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-1.5">
          {field.icon}
          {field.label}
        </label>
        {isSet ? (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <CheckCircle2 size={12} /> 설정됨
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <XCircle size={12} /> 미설정
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder={field.placeholder}
            className="w-full pr-9 pl-3 py-2 rounded-sm border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button
          onClick={handleSave}
          className="px-3 py-2 rounded-sm text-sm font-medium text-white flex items-center gap-1.5 transition-colors"
          style={{ background: saved ? '#16a34a' : '#009C64' }}
        >
          {saved ? <Check size={13} /> : <Save size={13} />}
          {saved ? '저장됨' : '저장'}
        </button>
        {isSet && (
          <button
            onClick={handleClear}
            className="px-3 py-2 rounded-sm text-sm border border-input hover:bg-muted transition-colors text-muted-foreground"
          >
            삭제
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Info size={11} />
        {field.hint}
      </p>
    </div>
  );
}

function ConnectionStatus() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error' | 'unconfigured'>('checking');
  const [errorMsg, setErrorMsg] = useState('');

  const check = async () => {
    setStatus('checking');
    setErrorMsg('');
    if (!isSupabaseConfigured()) {
      setStatus('unconfigured');
      return;
    }
    try {
      const { getSupabaseClient } = await import('@/lib/supabase');
      const sb = getSupabaseClient();
      if (!sb) { setStatus('unconfigured'); return; }
      const { error } = await sb.from('counselors').select('id').limit(1);
      if (error) {
        setStatus('error');
        setErrorMsg(error.message);
      } else {
        setStatus('ok');
      }
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e.message || '연결 실패');
    }
  };

  useEffect(() => { check(); }, []);

  return (
    <div className="flex items-center justify-between p-3 rounded-sm border border-border bg-muted/30">
      <div className="flex items-center gap-2">
        {status === 'checking' && <RefreshCw size={14} className="animate-spin text-muted-foreground" />}
        {status === 'ok' && <CheckCircle2 size={14} className="text-green-600" />}
        {status === 'error' && <XCircle size={14} className="text-destructive" />}
        {status === 'unconfigured' && <AlertTriangle size={14} className="text-yellow-500" />}
        <span className="text-sm">
          {status === 'checking' && '연결 확인 중...'}
          {status === 'ok' && 'Supabase 연결 정상'}
          {status === 'error' && `연결 실패: ${errorMsg}`}
          {status === 'unconfigured' && 'Supabase 미설정 (목업 데이터 사용 중)'}
        </span>
      </div>
      <button onClick={check} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
        <RefreshCw size={12} />
        재확인
      </button>
    </div>
  );
}

function SqlSchemaSection() {
  const [copied, setCopied] = useState(false);

  const schemaUrl = 'https://github.com/your-repo/blob/main/supabase/schema.sql';

  const handleCopy = () => {
    const sql = `-- 상담 관리 시스템 Supabase 스키마
-- Supabase 대시보드 → SQL Editor에서 실행하세요

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 상담사 테이블
CREATE TABLE IF NOT EXISTS public.counselors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  branch TEXT,
  role INTEGER NOT NULL DEFAULT ${ROLE_COUNSELOR} CHECK (role IN (${ROLE_ADMIN}, ${ROLE_COUNSELOR})),
  client_count INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  joined_at DATE,
  status TEXT NOT NULL DEFAULT '재직' CHECK (status IN ('재직', '휴직', '퇴직')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 상담자(참여자) 테이블
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seq_no INTEGER, year INTEGER, assignment_type TEXT,
  name TEXT NOT NULL, resident_id_masked TEXT, phone TEXT,
  last_counsel_date DATE, age INTEGER,
  gender TEXT CHECK (gender IN ('남', '여')),
  business_type TEXT, participation_type TEXT, participation_stage TEXT,
  competency_grade TEXT, recognition_date DATE, desired_job TEXT,
  counsel_notes TEXT, address TEXT, school TEXT, major TEXT, education_level TEXT,
  initial_counsel_date DATE, iap_date DATE, iap_duration TEXT,
  allowance_apply_date TEXT, rediagnosis_date DATE, rediagnosis_yn TEXT,
  work_exp_type TEXT, work_exp_intent TEXT, work_exp_company TEXT,
  work_exp_period TEXT, work_exp_completed TEXT,
  training_type TEXT, training_name TEXT, training_start DATE,
  training_end TEXT, training_allowance TEXT,
  intensive_start TEXT, intensive_end TEXT, support_end_date TEXT,
  employment_type TEXT, employment_date DATE, employer TEXT,
  job_title TEXT, salary TEXT, employment_duration TEXT, resignation_date DATE,
  retention_1m_date TEXT, retention_1m_yn TEXT,
  retention_6m_date TEXT, retention_6m_yn TEXT,
  retention_12m_date TEXT, retention_12m_yn TEXT,
  retention_18m_date TEXT, retention_18m_yn TEXT,
  counselor_id UUID REFERENCES public.counselors(id) ON DELETE SET NULL,
  counselor_name TEXT, branch TEXT,
  follow_up BOOLEAN NOT NULL DEFAULT FALSE,
  score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 상담 세션 테이블
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  counselor_id UUID REFERENCES public.counselors(id) ON DELETE SET NULL,
  counselor_name TEXT,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('초기상담','심층상담','취업지원','사후관리','집단상담','기타')),
  content TEXT, next_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 구직준비도 설문 테이블
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  counselor_id UUID REFERENCES public.counselors(id) ON DELETE SET NULL,
  survey_date DATE NOT NULL DEFAULT CURRENT_DATE,
  q1_job_goal INTEGER CHECK (q1_job_goal BETWEEN 1 AND 3),
  q2_will_3months INTEGER CHECK (q2_will_3months BETWEEN 1 AND 3),
  q3_job_plan INTEGER CHECK (q3_job_plan BETWEEN 1 AND 3),
  q4_skill_need INTEGER CHECK (q4_skill_need BETWEEN 1 AND 3),
  q5_info_need INTEGER CHECK (q5_info_need BETWEEN 1 AND 3),
  q6_competency INTEGER CHECK (q6_competency BETWEEN 1 AND 3),
  q7_barrier INTEGER CHECK (q7_barrier BETWEEN 1 AND 3),
  q7_barrier_detail TEXT,
  q8_health INTEGER CHECK (q8_health BETWEEN 1 AND 3),
  total_score INTEGER GENERATED ALWAYS AS (
    COALESCE(q1_job_goal,0)+COALESCE(q2_will_3months,0)+COALESCE(q3_job_plan,0)+
    COALESCE(q4_skill_need,0)+COALESCE(q5_info_need,0)+COALESCE(q6_competency,0)+
    COALESCE(q7_barrier,0)+COALESCE(q8_health,0)
  ) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 칸반 메모 테이블
CREATE TABLE IF NOT EXISTS public.memo_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  counselor_id UUID NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL DEFAULT 'todo' CHECK (column_id IN ('todo','inprogress','done')),
  title TEXT NOT NULL, content TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  due_date DATE, client_name TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_clients_counselor_id ON public.clients(counselor_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON public.sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_survey_client_id ON public.survey_responses(client_id);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER trg_counselors_updated_at BEFORE UPDATE ON public.counselors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_memo_updated_at BEFORE UPDATE ON public.memo_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS 활성화
ALTER TABLE public.counselors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memo_cards ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_my_counselor_id() RETURNS UUID AS $$
  SELECT id FROM public.counselors WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.counselors WHERE auth_user_id = auth.uid() AND role = ${ROLE_ADMIN});
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS Policies: counselors
CREATE POLICY "counselors_select" ON public.counselors FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "counselors_insert" ON public.counselors FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "counselors_update" ON public.counselors FOR UPDATE USING (public.is_admin() OR auth_user_id = auth.uid());
CREATE POLICY "counselors_delete" ON public.counselors FOR DELETE USING (public.is_admin());

-- RLS Policies: clients
CREATE POLICY "clients_select" ON public.clients FOR SELECT USING (public.is_admin() OR counselor_id = public.get_my_counselor_id());
CREATE POLICY "clients_insert" ON public.clients FOR INSERT WITH CHECK (public.is_admin() OR counselor_id = public.get_my_counselor_id());
CREATE POLICY "clients_update" ON public.clients FOR UPDATE USING (public.is_admin() OR counselor_id = public.get_my_counselor_id());
CREATE POLICY "clients_delete" ON public.clients FOR DELETE USING (public.is_admin() OR counselor_id = public.get_my_counselor_id());

-- RLS Policies: sessions
CREATE POLICY "sessions_select" ON public.sessions FOR SELECT USING (public.is_admin() OR counselor_id = public.get_my_counselor_id() OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = sessions.client_id AND c.counselor_id = public.get_my_counselor_id()));
CREATE POLICY "sessions_insert" ON public.sessions FOR INSERT WITH CHECK (public.is_admin() OR counselor_id = public.get_my_counselor_id());
CREATE POLICY "sessions_update" ON public.sessions FOR UPDATE USING (public.is_admin() OR counselor_id = public.get_my_counselor_id());
CREATE POLICY "sessions_delete" ON public.sessions FOR DELETE USING (public.is_admin() OR counselor_id = public.get_my_counselor_id());

-- RLS Policies: survey_responses
CREATE POLICY "surveys_select" ON public.survey_responses FOR SELECT USING (public.is_admin() OR counselor_id = public.get_my_counselor_id() OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = survey_responses.client_id AND c.counselor_id = public.get_my_counselor_id()));
CREATE POLICY "surveys_insert" ON public.survey_responses FOR INSERT WITH CHECK (public.is_admin() OR counselor_id = public.get_my_counselor_id());
CREATE POLICY "surveys_update" ON public.survey_responses FOR UPDATE USING (public.is_admin() OR counselor_id = public.get_my_counselor_id());
CREATE POLICY "surveys_delete" ON public.survey_responses FOR DELETE USING (public.is_admin() OR counselor_id = public.get_my_counselor_id());

-- RLS Policies: memo_cards
CREATE POLICY "memos_all" ON public.memo_cards USING (counselor_id = public.get_my_counselor_id() OR public.is_admin());`;

    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true);
      toast.success('SQL이 클립보드에 복사되었습니다.');
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="bg-card rounded-md p-5 shadow-sm border border-border space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Database size={15} />
        Supabase 스키마 설정 안내
      </h2>
      <div className="text-sm text-muted-foreground space-y-1">
        <p>처음 사용 시 Supabase 대시보드에서 스키마를 생성해야 합니다.</p>
        <ol className="list-decimal list-inside space-y-1 text-xs mt-2">
          <li><a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-primary underline">Supabase 대시보드</a> → 프로젝트 선택</li>
          <li>좌측 메뉴 <strong>SQL Editor</strong> 클릭</li>
          <li>아래 버튼으로 SQL을 복사하여 붙여넣고 실행</li>
          <li>Authentication → Users에서 테스트 계정 생성</li>
        </ol>
      </div>
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium text-white transition-colors"
        style={{ background: copied ? '#16a34a' : '#009C64' }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'SQL 복사됨!' : 'SQL 스키마 복사'}
      </button>
    </div>
  );
}

export default function Settings() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('로그아웃되었습니다.');
    navigate('/login');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1 as any)}
          className="p-1.5 rounded-sm hover:bg-muted transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">설정</h1>
          <p className="text-sm text-muted-foreground mt-0.5">API 연결 및 계정 관리</p>
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-sm border border-amber-200 bg-amber-50 text-amber-800 text-xs">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <div>
          <strong>보안 안내:</strong> 모든 API 키는 이 기기의 브라우저 localStorage에만 저장됩니다.
          서버로 전송되지 않으며, 코드에 포함되지 않아 GitHub 공개 저장소에 안전하게 배포할 수 있습니다.
        </div>
      </div>

      {/* Profile */}
      <div className="bg-card rounded-md p-5 shadow-sm border border-border space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <User size={15} />
          계정 정보
        </h2>
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-sm flex items-center justify-center text-white text-lg font-bold"
            style={{ background: '#009C64' }}
          >
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="font-semibold text-foreground">{user?.name}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={isAdminRole(user?.role) ? 'badge-pending' : 'badge-active'}>
                {isAdminRole(user?.role) ? '관리자' : '상담사'}
              </span>
              {user?.branch && (
                <span className="text-xs text-muted-foreground">{user.branch}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-card rounded-md p-5 shadow-sm border border-border space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Database size={15} />
          연결 상태
        </h2>
        <ConnectionStatus />
      </div>

      {/* API Keys */}
      <div className="bg-card rounded-md p-5 shadow-sm border border-border space-y-5">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Key size={15} />
          API 키 설정
          <span className="ml-auto text-xs font-normal text-muted-foreground">localStorage에만 저장됨</span>
        </h2>
        {FIELDS.map(field => (
          <SecretInput key={field.storageKey} field={field} />
        ))}
      </div>

      {/* Schema Setup Guide */}
      <SqlSchemaSection />

      {/* Logout */}
      <div className="bg-card rounded-md p-5 shadow-sm border border-border">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <LogOut size={15} />
          계정 관리
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          로그아웃하면 현재 세션이 종료됩니다. API 키 설정은 유지됩니다.
        </p>
        <button onClick={handleLogout} className="btn-destructive">
          <LogOut size={14} className="mr-1.5" />
          로그아웃
        </button>
      </div>
    </div>
  );
}
