/**
 * Admin Counselor List Page (상담사 목록)
 * Data: Supabase API (mock fallback when not configured) & Electron IPC for Registration/Deletion
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ROLE_ADMIN, ROLE_COUNSELOR, isAdminRole, type AppRole } from '@shared/const';
import { Search, Plus, Edit3, Trash2, X, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { usePageGuard } from '@/hooks/usePageGuard';
import { fetchCounselors, updateCounselor } from '@/lib/api';
import type { CounselorRow } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useElectron } from '@/hooks/useElectron';

const PRIMARY_HEX = '#009C64';

interface CounselorForm {
  user_name: string;
  email: string;
  password: string;
  department: string;
  memo: string;
  role: AppRole;
}

const EMPTY_FORM: CounselorForm = {
  user_name: '', email: '', password: '', department: '', memo: '', role: ROLE_COUNSELOR,
};

function CounselorModal({
  counselor,
  existingBranches,
  onSave,
  onClose,
}: {
  counselor: CounselorRow | null;
  existingBranches: string[];
  onSave: (form: CounselorForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CounselorForm>(() =>
    counselor
      ? {
          user_name: counselor.user_name,
          email: '',
          password: '',
          department: counselor.department || '',
          memo: counselor.memo || '',
          role: ROLE_COUNSELOR,
        }
      : { ...EMPTY_FORM, department: existingBranches.length > 0 ? '' : '' } // 초기값 세팅
  );

  // 현재 입력 방식이 '직접 입력'인지 확인하는 상태
  const [isCustomBranch, setIsCustomBranch] = useState(() => {
    // 지점 목록이 아예 없거나, 수정 중인 상담사의 지점이 기존 목록에 없으면 직접 입력 모드 켬
    if (existingBranches.length === 0) return true;
    if (counselor?.department && !existingBranches.includes(counselor.department)) return true;
    return false;
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.user_name.trim()) { toast.error('이름을 입력해주세요.'); return; }
    if (!form.department.trim()) { toast.error('지점을 선택하거나 입력해주세요.'); return; }
    
    if (!counselor) {
      if (!form.email.trim()) { toast.error('이메일을 입력해주세요.'); return; }
      if (!form.password.trim()) { toast.error('비밀번호를 입력해주세요.'); return; }
      if (form.password.length < 6) { toast.error('비밀번호는 6자리 이상이어야 합니다.'); return; }
    }

    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-card rounded-md shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{counselor ? '상담사 수정' : '상담사 등록'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-muted"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!isSupabaseConfigured() && (
            <div className="flex items-center gap-2 p-3 rounded-sm border border-amber-200 bg-amber-50 text-amber-800 text-xs">
              <AlertTriangle size={13} />
              Supabase 미설정 — 저장이 실제 DB에 반영되지 않습니다.
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1.5">이름 <span className="text-destructive">*</span></label>
            <input
              type="text"
              value={form.user_name}
              onChange={e => setForm(f => ({ ...f, user_name: e.target.value }))}
              className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="홍길동"
            />
          </div>

          {!counselor && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">이메일 (아이디) <span className="text-destructive">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="counselor@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">비밀번호 <span className="text-destructive">*</span></label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="6자리 이상"
                />
              </div>
            </>
          )}

          {/* 지점 선택/입력 영역 */}
          {isCustomBranch ? (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium">지점 <span className="text-destructive">*</span></label>
                {existingBranches.length > 0 && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsCustomBranch(false);
                      setForm(f => ({ ...f, department: '' }));
                    }} 
                    className="text-xs hover:underline"
                    style={{ color: PRIMARY_HEX }}
                  >
                    목록에서 선택하기
                  </button>
                )}
              </div>
              <input
                type="text"
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="새 지점명 직접 입력 (예: 서울 강남지점)"
                autoFocus
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1.5">지점 <span className="text-destructive">*</span></label>
              <select
                value={form.department}
                onChange={e => {
                  if (e.target.value === '__NEW__') {
                    setIsCustomBranch(true);
                    setForm(f => ({ ...f, department: '' }));
                  } else {
                    setForm(f => ({ ...f, department: e.target.value }));
                  }
                }}
                className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="" disabled>지점을 선택하세요</option>
                {existingBranches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
                <option value="__NEW__">+ 새 지점 직접 입력</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">메모</label>
            <textarea
              value={form.memo}
              onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
              className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
              placeholder="상담사에 대한 참고 사항..."
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-1.5 disabled:opacity-60">
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              저장
            </button>
            <button type="button" onClick={onClose} className="btn-cancel">취소</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CounselorList() {
  const { canRender } = usePageGuard('admin');
  const { isElectron, adminRegisterCounselor, adminDeleteCounselor } = useElectron(); 
  
  const [counselors, setCounselors] = useState<CounselorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<CounselorRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CounselorRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCounselors();
      setCounselors(data);
    } catch (e: any) {
      toast.error('데이터 로드 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // 존재하는 지점 목록 추출 (오름차순 정렬)
  const existingBranches = useMemo(() => {
    // (b): b is string 을 추가하여 TypeScript에게 null이 제거되었음을 확실히 알려줍니다.
    const branches = counselors
      .map(c => c.department)
      .filter((b): b is string => Boolean(b)); 
    return Array.from(new Set(branches)).sort();
  }, [counselors]);

  const counselorOnlyList = counselors.filter(c => c.role === 5);

  const filtered = counselorOnlyList.filter(c =>
    !search ||
    c.user_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.department || '').includes(search)
  );

  const handleSave = async (form: CounselorForm) => {
    if (!isSupabaseConfigured()) {
      if (editTarget) {
        setCounselors(prev => prev.map(c => c.user_id === editTarget.user_id ? { ...c, ...form } : c));
        toast.success('수정되었습니다. (데모 모드)');
      } else {
        const newC: CounselorRow = {
          user_id: `demo_${Date.now()}`,
          ...form,
          client_count: 0,
          completed_count: 0,
        };
        setCounselors(prev => [newC, ...prev]);
        toast.success('등록되었습니다. (데모 모드)');
      }
      setShowModal(false);
      setEditTarget(null);
      return;
    }
    
    try {
      if (editTarget) {
        const updated = await updateCounselor(editTarget.user_id, {
          user_name: form.user_name,
          department: form.department,
          memo: form.memo,
          role: 5 
        } as any);
        setCounselors(prev => prev.map(c => c.user_id === updated.user_id ? { ...updated, client_count: c.client_count, completed_count: c.completed_count } : c));
        toast.success('상담사 정보가 수정되었습니다.');
        setShowModal(false);
        setEditTarget(null);
      } else {
        if (!isElectron) {
          toast.error("데스크톱 앱(관리자 모드)에서만 상담사 등록이 가능합니다.");
          return;
        }

        const result = await adminRegisterCounselor({
          email: form.email,
          password: form.password,
          user_name: form.user_name,
          department: form.department
        });

        if (result.success) {
          toast.success('상담사가 안전하게 등록되었습니다.');
          load(); 
          setShowModal(false);
          setEditTarget(null);
        } else {
          toast.error(`등록 실패: ${result.error}`);
        }
      }
    } catch (e: any) {
      toast.error('작업 실패: ' + e.message);
    }
  };

  const handleDelete = async (c: CounselorRow) => {
    if (!isSupabaseConfigured()) {
      setCounselors(prev => prev.filter(x => x.user_id !== c.user_id));
      toast.success('삭제되었습니다. (데모 모드)');
      setDeleteTarget(null);
      return;
    }
    
    try {
      if (!isElectron) {
        toast.error("데스크톱 앱(관리자 모드)에서만 상담사 삭제가 가능합니다.");
        return;
      }

      const result = await adminDeleteCounselor(c.user_id);

      if (result.success) {
        setCounselors(prev => prev.filter(x => x.user_id !== c.user_id));
        toast.success(`${c.user_name} 상담사가 완전히 삭제되었습니다.`);
        setDeleteTarget(null);
      } else {
        toast.error(`삭제 실패: ${result.error}`);
      }
    } catch (e: any) {
      toast.error('오류 발생: ' + e.message);
    }
  };

  if (!canRender) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">상담사 목록</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            전체 {counselors.length}명
            {!isSupabaseConfigured() && <span className="ml-2 text-amber-600">(데모 데이터)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-sm hover:bg-muted" title="새로고침">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { setEditTarget(null); setShowModal(true); }}
            className="btn-primary"
          >
            <Plus size={15} className="mr-1" />
            상담사 등록
          </button>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 shadow-sm border border-border">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름, 지점으로 검색..."
            className="w-full pl-9 pr-4 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="bg-card rounded-md shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-muted-foreground mr-2" />
            <span className="text-sm text-muted-foreground">데이터 로드 중...</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">이름</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">지점</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">담당자 수</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">상담 완료</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">역할</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">수정</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">삭제</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {search ? '검색 결과가 없습니다.' : '등록된 상담사가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.user_id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-sm flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: PRIMARY_HEX }}>
                          {c.user_name.charAt(0)}
                        </div>
                        <div className="font-medium text-foreground">{c.user_name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.department || '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{c.client_count ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <span style={{ color: PRIMARY_HEX }} className="font-semibold">{c.completed_count ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={isAdminRole(c.role) ? 'badge-pending' : 'badge-active'}>
                        {isAdminRole(c.role) ? '관리자' : '상담사'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right w-[40px]">
                      <button
                        onClick={() => { setEditTarget(c); setShowModal(true); }}
                        className="p-1.5 rounded-sm hover:bg-muted transition-colors inline-flex items-center"
                      >
                        <Edit3 size={14} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-left w-[40px]">
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="p-1.5 rounded-sm hover:bg-destructive/10 transition-colors text-destructive inline-flex items-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <CounselorModal
          counselor={editTarget}
          existingBranches={existingBranches}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-card rounded-md shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-foreground mb-2">상담사 삭제</h3>
            <p className="text-sm text-muted-foreground mb-5">
              <strong>{deleteTarget.user_name}</strong> 상담사를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="btn-cancel">취소</button>
              <button onClick={() => handleDelete(deleteTarget)} className="btn-destructive">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}