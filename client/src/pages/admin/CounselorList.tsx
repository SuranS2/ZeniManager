/**
 * Admin Counselor List Page (상담사 목록)
 * Design: 모던 웰니스 미니멀리즘
 */
import { useState } from 'react';
import { MOCK_COUNSELORS, type Counselor } from '@/lib/mockData';
import { Search, Plus, Edit3, Trash2, X, Phone, Mail, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const PRIMARY_HEX = '#009C64';

function CounselorModal({ counselor, onClose, onSave }: {
  counselor: Partial<Counselor> | null;
  onClose: () => void;
  onSave: (data: Partial<Counselor>) => void;
}) {
  const [form, setForm] = useState({
    name: counselor?.name || '',
    email: counselor?.email || '',
    phone: counselor?.phone || '',
    branch: counselor?.branch || '',
    status: counselor?.status || '재직',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-card rounded-md shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{counselor?.id ? '상담사 수정' : '상담사 등록'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-muted"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">이름 <span className="text-destructive">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="홍길동"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">이메일</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">연락처</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="010-0000-0000"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">지점</label>
              <input
                type="text"
                value={form.branch}
                onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
                className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="서울 강남지점"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">상태</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="재직">재직</option>
                <option value="휴직">휴직</option>
                <option value="퇴직">퇴직</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end px-5 pb-5">
          <button onClick={onClose} className="btn-cancel">취소</button>
          <button
            onClick={() => {
              if (!form.name) { toast.error('이름을 입력하세요.'); return; }
              onSave(form);
            }}
            className="btn-primary"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CounselorList() {
  const [counselors, setCounselors] = useState(MOCK_COUNSELORS);
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState<Partial<typeof MOCK_COUNSELORS[0]> | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = counselors.filter(c =>
    !search || c.name.includes(search) || c.branch.includes(search) || c.email.includes(search)
  );

  const handleSave = (data: any) => {
    if (editTarget?.id) {
      setCounselors(cs => cs.map(c => c.id === editTarget.id ? { ...c, ...data } : c));
      toast.success('상담사 정보가 수정되었습니다.');
    } else {
      const newC = { ...data, id: `c${Date.now()}`, clientCount: 0, completedCount: 0, joinedAt: new Date().toISOString().split('T')[0] };
      setCounselors(cs => [...cs, newC]);
      toast.success('상담사가 등록되었습니다.');
    }
    setEditTarget(undefined);
  };

  const handleDelete = (id: string) => {
    setCounselors(cs => cs.filter(c => c.id !== id));
    toast.success('상담사가 삭제되었습니다.');
    setDeleteTarget(null);
  };

  const statusColor = (s: string) => s === '재직' ? 'badge-active' : s === '휴직' ? 'badge-pending' : 'badge-cancelled';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">상담사 목록</h1>
          <p className="text-sm text-muted-foreground mt-0.5">전체 {counselors.length}명의 상담사</p>
        </div>
        <button onClick={() => setEditTarget(null)} className="btn-primary">
          <Plus size={15} className="mr-1" />
          상담사 등록
        </button>
      </div>

      <div className="bg-card rounded-md p-4 shadow-sm border border-border">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름, 지점, 이메일로 검색..."
            className="w-full pl-9 pr-4 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="bg-card rounded-md shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">이름</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">연락처</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">지점</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">담당자 수</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">완료</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">상태</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">액션</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-sm flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: PRIMARY_HEX }}>
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.phone}</td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{c.branch}</td>
                <td className="px-4 py-3 text-right font-semibold text-foreground">{c.clientCount}</td>
                <td className="px-4 py-3 text-right hidden sm:table-cell">
                  <span style={{ color: PRIMARY_HEX }} className="font-semibold">{c.completedCount}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={statusColor(c.status)}>{c.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditTarget(c)} className="p-1.5 rounded-sm hover:bg-muted transition-colors">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(c.id)} className="p-1.5 rounded-sm hover:bg-destructive/10 transition-colors text-destructive">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editTarget !== undefined && (
        <CounselorModal
          counselor={editTarget}
          onClose={() => setEditTarget(undefined)}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-card rounded-md shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-foreground mb-2">상담사 삭제</h3>
            <p className="text-sm text-muted-foreground mb-5">이 상담사를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
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
