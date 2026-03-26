/**
 * Client List Page (상담자 목록)
 * Design: 모던 웰니스 미니멀리즘
 * Features: 검색, 필터(전체/점수미확정/후속상담/취업처리), 목록, 탭(상담관리/상담이력/상담내용입력)
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { MOCK_CLIENTS, type Client } from '@/lib/mockData';
import { Search, Plus, X, ChevronRight, Phone, Mail, User, FileText, Edit3 } from 'lucide-react';
import { toast } from 'sonner';

const PRIMARY_HEX = '#009C64';

type FilterType = 'all' | 'no-score' | 'follow-up' | 'employed';

function FilterTab({ label, active, count, onClick }: { label: string; active: boolean; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-sm transition-all ${
        active ? 'text-white font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
      style={active ? { background: PRIMARY_HEX } : {}}
    >
      {label}
      <span className={`text-xs px-1.5 py-0.5 rounded-sm ${active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
        {count}
      </span>
    </button>
  );
}

function ClientDetailModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'manage' | 'history' | 'input'>('manage');
  const [newSession, setNewSession] = useState({ type: '초기상담', content: '', nextAction: '' });

  const stageColors: Record<string, string> = {
    '초기상담': 'badge-active',
    '심층상담': 'badge-pending',
    '취업지원': 'badge-pending',
    '취업완료': 'badge-completed',
    '사후관리': 'badge-active',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-card rounded-md shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm flex items-center justify-center text-white font-bold text-sm" style={{ background: PRIMARY_HEX }}>
              {client.name.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-foreground">{client.name}</div>
              <div className="text-xs text-muted-foreground">{client.phone}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5">
          {[
            { id: 'manage', label: '상담관리' },
            { id: 'history', label: '상담이력' },
            { id: 'input', label: '상담내용 입력' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                activeTab === tab.id ? 'border-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              style={activeTab === tab.id ? { borderColor: PRIMARY_HEX, color: PRIMARY_HEX } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'manage' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">기본 정보</div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <User size={14} className="text-muted-foreground" />
                        <span>{client.name} ({client.gender}, {client.age}세)</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone size={14} className="text-muted-foreground" />
                        <span>{client.phone}</span>
                      </div>
                      {client.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail size={14} className="text-muted-foreground" />
                          <span>{client.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">담당 정보</div>
                    <div className="text-sm space-y-1">
                      <div>담당 상담사: <span className="font-medium">{client.counselorName}</span></div>
                      <div>지점: <span className="font-medium">{client.branch}</span></div>
                      <div>등록일: <span className="font-medium">{client.registeredAt}</span></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">진행 현황</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">프로세스 단계</span>
                        <span className={stageColors[client.processStage]}>{client.processStage}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">취업 상태</span>
                        <span className={client.employmentStatus === '취업완료' ? 'badge-completed' : 'badge-pending'}>
                          {client.employmentStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">사업 유형</span>
                        <span className="text-sm font-medium">{client.businessType}</span>
                      </div>
                      {client.score !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">점수</span>
                          <span className="text-sm font-bold" style={{ color: PRIMARY_HEX }}>{client.score}점</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm">후속 상담</span>
                        <span className={client.followUp ? 'badge-cancelled' : 'badge-active'}>
                          {client.followUp ? '필요' : '불필요'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {client.sessions.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">상담 이력이 없습니다.</div>
              ) : (
                client.sessions.map(session => (
                  <div key={session.id} className="border border-border rounded-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="badge-active">{session.type}</span>
                        <span className="text-xs text-muted-foreground">{session.date}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{session.counselorName}</span>
                    </div>
                    <p className="text-sm text-foreground">{session.content}</p>
                    {session.nextAction && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ChevronRight size={12} />
                        다음 액션: {session.nextAction}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">상담 유형</label>
                <select
                  value={newSession.type}
                  onChange={e => setNewSession(s => ({ ...s, type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {['초기상담', '심층상담', '취업지원', '사후관리'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">상담 내용</label>
                <textarea
                  value={newSession.content}
                  onChange={e => setNewSession(s => ({ ...s, content: e.target.value }))}
                  placeholder="상담 내용을 입력하세요..."
                  rows={5}
                  className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">다음 액션</label>
                <input
                  type="text"
                  value={newSession.nextAction}
                  onChange={e => setNewSession(s => ({ ...s, nextAction: e.target.value }))}
                  placeholder="다음 단계 계획..."
                  className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { toast.success('상담 내용이 저장되었습니다.'); setNewSession({ type: '초기상담', content: '', nextAction: '' }); }}
                  className="btn-primary"
                >
                  저장
                </button>
                <button onClick={onClose} className="btn-cancel">취소</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClientList() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const filtered = MOCK_CLIENTS.filter(c => {
    const matchSearch = !search || c.name.includes(search) || c.phone.includes(search);
    const matchFilter =
      filter === 'all' ? true :
      filter === 'no-score' ? c.score === undefined :
      filter === 'follow-up' ? c.followUp :
      filter === 'employed' ? c.employmentStatus === '취업완료' : true;
    return matchSearch && matchFilter;
  });

  const counts = {
    all: MOCK_CLIENTS.length,
    'no-score': MOCK_CLIENTS.filter(c => c.score === undefined).length,
    'follow-up': MOCK_CLIENTS.filter(c => c.followUp).length,
    employed: MOCK_CLIENTS.filter(c => c.employmentStatus === '취업완료').length,
  };

  const stageColors: Record<string, string> = {
    '초기상담': 'badge-active',
    '심층상담': 'badge-pending',
    '취업지원': 'badge-pending',
    '취업완료': 'badge-completed',
    '사후관리': 'badge-active',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">상담자 목록</h1>
          <p className="text-sm text-muted-foreground mt-0.5">전체 {MOCK_CLIENTS.length}명의 상담자</p>
        </div>
        <button
          onClick={() => navigate('/clients/register')}
          className="btn-primary"
        >
          <Plus size={15} className="mr-1" />
          상담자 등록
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-card rounded-md p-4 shadow-sm border border-border space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름, 전화번호로 검색..."
            className="w-full pl-9 pr-4 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <FilterTab label="전체" active={filter === 'all'} count={counts.all} onClick={() => setFilter('all')} />
          <FilterTab label="점수 미확정" active={filter === 'no-score'} count={counts['no-score']} onClick={() => setFilter('no-score')} />
          <FilterTab label="후속 상담" active={filter === 'follow-up'} count={counts['follow-up']} onClick={() => setFilter('follow-up')} />
          <FilterTab label="취업처리" active={filter === 'employed'} count={counts.employed} onClick={() => setFilter('employed')} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-md shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">이름</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">연락처</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">담당 상담사</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">사업 유형</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">단계</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">점수</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">후속</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">액션</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map(client => (
                <tr
                  key={client.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => setSelectedClient(client)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-sm flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: PRIMARY_HEX }}>
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{client.name}</div>
                        <div className="text-xs text-muted-foreground">{client.gender}, {client.age}세</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{client.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{client.counselorName}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{client.businessType}</td>
                  <td className="px-4 py-3">
                    <span className={stageColors[client.processStage]}>{client.processStage}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {client.score !== undefined
                      ? <span className="font-semibold" style={{ color: PRIMARY_HEX }}>{client.score}</span>
                      : <span className="text-muted-foreground">-</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {client.followUp
                      ? <span className="badge-cancelled">필요</span>
                      : <span className="text-muted-foreground text-xs">-</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedClient(client); }}
                      className="p-1.5 rounded-sm hover:bg-muted transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedClient && (
        <ClientDetailModal client={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
    </div>
  );
}
