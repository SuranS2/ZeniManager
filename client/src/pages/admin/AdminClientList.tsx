/**
 * Admin Client List Page (상담자 목록 - 관리자)
 * Design: 모던 웰니스 미니멀리즘
 */
import { useState } from 'react';
import { MOCK_CLIENTS } from '@/lib/mockData';
import { Search, Download, Filter } from 'lucide-react';
import { toast } from 'sonner';

const PRIMARY_HEX = '#009C64';

export default function AdminClientList() {
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');

  const branches = ['all', ...Array.from(new Set(MOCK_CLIENTS.map(c => c.branch)))];
  const stages = ['all', '초기상담', '심층상담', '취업지원', '취업완료', '사후관리'];

  const filtered = MOCK_CLIENTS.filter(c => {
    const matchSearch = !search || c.name.includes(search) || c.phone.includes(search) || c.counselorName.includes(search);
    const matchBranch = branchFilter === 'all' || c.branch === branchFilter;
    const matchStage = stageFilter === 'all' || c.processStage === stageFilter;
    return matchSearch && matchBranch && matchStage;
  });

  const stageColors: Record<string, string> = {
    '초기상담': 'badge-active',
    '심층상담': 'badge-pending',
    '취업지원': 'badge-pending',
    '취업완료': 'badge-completed',
    '사후관리': 'badge-active',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">상담자 목록</h1>
          <p className="text-sm text-muted-foreground mt-0.5">전체 {MOCK_CLIENTS.length}명 · 검색 결과 {filtered.length}명</p>
        </div>
        <button onClick={() => toast.info('엑셀 내보내기 기능')} className="btn-cancel flex items-center gap-1.5">
          <Download size={14} />
          내보내기
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-md p-4 shadow-sm border border-border space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름, 연락처, 담당 상담사로 검색..."
            className="w-full pl-9 pr-4 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="px-3 py-1.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">전체 지점</option>
              {branches.filter(b => b !== 'all').map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="px-3 py-1.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">전체 단계</option>
            {stages.filter(s => s !== 'all').map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-card rounded-md shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">이름</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">연락처</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">담당 상담사</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">지점</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">단계</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">사업 유형</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">점수</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-sm flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: PRIMARY_HEX }}>
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.gender}, {c.age}세</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{c.counselorName}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">{c.branch}</td>
                  <td className="px-4 py-3">
                    <span className={stageColors[c.processStage]}>{c.processStage}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.businessType}</td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    {c.score !== undefined
                      ? <span className="font-semibold" style={{ color: PRIMARY_HEX }}>{c.score}</span>
                      : <span className="text-muted-foreground">-</span>
                    }
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
