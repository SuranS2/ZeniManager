/**
 * Admin Client List Page (상담자 목록 - 관리자)
 * Design: 모던 웰니스 미니멀리즘
 * Data: Supabase API with mock fallback
 */
import { useState, useEffect, useRef } from 'react';
import { usePageGuard } from '@/hooks/usePageGuard';
import { fetchClients, fetchCounselors, createClient } from '@/lib/api'; // ✅ createClient 추가
import type { ClientRow, CounselorRow } from '@/lib/supabase';
import { Search, Download, Upload, Filter, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PRIMARY_HEX = '#009C64';

const stageColors: Record<string, string> = {
  '초기상담': 'badge-active',
  '심층상담': 'badge-pending',
  '취업지원': 'badge-pending',
  '취업완료': 'badge-completed',
  '사후관리': 'badge-active',
};

export default function AdminClientList() {
  const { canRender } = usePageGuard('admin');
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [counselors, setCounselors] = useState<CounselorRow[]>([]); // ✅ 매핑용 상담사 목록 상태 추가
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false); // ✅ CSV 업로드 로딩 상태
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadClients = () => {
    setLoading(true);
    Promise.all([fetchClients(), fetchCounselors()])
      .then(([clientsData, counselorsData]) => {
        setCounselors(counselorsData); // 상담사 목록 저장

        const counselorMap = new Map(counselorsData.map(c => [c.user_id, c]));

        const enrichedClients = clientsData.map(client => {
          const counselor = client.counselor_id ? counselorMap.get(client.counselor_id) : undefined;
          return {
            ...client,
            counselor_name: counselor ? counselor.user_name : null,
            branch: counselor && counselor.department ? counselor.department : null
          };
        });

        setClients(enrichedClients);
        setLoading(false);
      })
      .catch(err => {
        toast.error('데이터 로드 실패: ' + err.message);
        setLoading(false);
      });
  };

  useEffect(() => { loadClients(); }, []);

  const branches = ['all', ...Array.from(new Set(clients.map(c => c.branch).filter(Boolean) as string[]))];
  const stages = ['all', '초기상담', '심층상담', '취업지원', '취업완료', '사후관리'];

  const filtered = clients.filter(c => {
    const matchSearch = !search ||
      c.name.includes(search) ||
      (c.phone || '').includes(search) ||
      (c.counselor_name || '').includes(search);
    const matchBranch = branchFilter === 'all' || c.branch === branchFilter;
    const matchStage = stageFilter === 'all' || c.participation_stage === stageFilter;
    return matchSearch && matchBranch && matchStage;
  });

  // ─── CSV 내보내기 ───
  const handleExport = () => {
    const headers = ['이름', '성별', '나이', '연락처', '담당상담사', '지점', '참여단계', '사업유형', '취업구분', '취업일자'];
    const rows = filtered.map(c => [
      c.name,
      c.gender || '',
      c.age || '',
      c.phone || '',
      c.counselor_name || '',
      c.branch || '',
      c.participation_stage || '',
      c.business_type || '',
      c.employment_type || '',
      c.employment_date || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `상담자목록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV 파일이 다운로드되었습니다.');
  };

  // ─── CSV 가져오기 (추가하기) ───
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();

    // 한국어 윈도우 엑셀의 기본 인코딩(EUC-KR)을 우선 적용하여 한글 깨짐 방지
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').filter(r => r.trim());
        if (rows.length < 2) throw new Error("데이터가 없거나 부족합니다.");

        // CSV 정규식 파서: 쌍따옴표 안의 쉼표는 무시하고 분리
        const parseRow = (rowStr: string) => 
          rowStr.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/^"|"$/g, '').trim());

        const headers = parseRow(rows[0]);
        const nameIdx = headers.indexOf('이름');
        const phoneIdx = headers.indexOf('연락처');

        if (nameIdx === -1 || phoneIdx === -1) {
          throw new Error("'이름'과 '연락처' 열이 필수적으로 포함되어 있어야 합니다.");
        }

        let successCount = 0;
        let failCount = 0;

        toast.info(`총 ${rows.length - 1}개의 데이터 처리를 시작합니다...`);

        // DB 부하 방지를 위해 순차적(await)으로 API 호출
        for (let i = 1; i < rows.length; i++) {
          const cols = parseRow(rows[i]);
          if (cols.length < 2 || !cols[nameIdx]) continue; // 빈 줄 무시

          const name = cols[nameIdx];
          const phone = cols[phoneIdx];
          const genderRaw = headers.indexOf('성별') !== -1 ? cols[headers.indexOf('성별')] : '';
          const ageRaw = headers.indexOf('나이') !== -1 ? cols[headers.indexOf('나이')] : '';
          const counselorName = headers.indexOf('담당상담사') !== -1 ? cols[headers.indexOf('담당상담사')] : '';
          const stageRaw = headers.indexOf('참여단계') !== -1 ? cols[headers.indexOf('참여단계')] : '';
          const bizTypeRaw = headers.indexOf('사업유형') !== -1 ? cols[headers.indexOf('사업유형')] : '';
          const empTypeRaw = headers.indexOf('취업구분') !== -1 ? cols[headers.indexOf('취업구분')] : '';
          
          // 담당상담사 이름으로 user_id 찾기
          const matchedCounselor = counselors.find(c => c.user_name === counselorName);

          try {
            await createClient({
              name,
              phone,
              gender: genderRaw === '남' ? '남' : (genderRaw === '여' ? '여' : null),
              age: parseInt(ageRaw) || null,
              counselor_id: matchedCounselor ? matchedCounselor.user_id : undefined,
              participation_stage: stageRaw || undefined,
              business_type: bizTypeRaw || undefined,
              employment_type: empTypeRaw || undefined,
            });
            successCount++;
          } catch (err) {
            console.error(`Failed to import client [${name}]:`, err);
            failCount++;
          }
        }

        if (failCount === 0) {
          toast.success(`${successCount}명의 상담자 데이터가 성공적으로 추가되었습니다.`);
        } else {
          toast.warning(`${successCount}명 성공, ${failCount}명 실패했습니다.`);
        }
        
        loadClients(); // 전체 목록 새로고침
      } catch (err: any) {
        toast.error('CSV 처리 중 오류: ' + err.message);
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = ''; // input 초기화
      }
    };

    reader.readAsText(file, 'euc-kr');
  };

  if (!canRender) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">상담자 목록</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            전체 {clients.length}명 · 검색 결과 {filtered.length}명
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={loadClients} className="btn-cancel flex items-center gap-1.5" disabled={loading || importing}>
            <RefreshCw size={14} className={loading && !importing ? 'animate-spin' : ''} />
            새로고침
          </button>
          
          {/* 숨겨진 파일 인풋 */}
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
          
          <button onClick={handleImportClick} className="btn-primary flex items-center gap-1.5" disabled={importing || loading}>
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            CSV 추가하기
          </button>

          <button onClick={handleExport} className="btn-cancel flex items-center gap-1.5" disabled={loading || importing}>
            <Download size={14} />
            CSV 내보내기
          </button>
        </div>
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
        {loading && !importing ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
            <RefreshCw size={16} className="animate-spin" />
            데이터 로딩 중...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">이름</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">연락처</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">담당 상담사</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">지점</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">참여단계</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">사업 유형</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">취업구분</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {search || branchFilter !== 'all' || stageFilter !== 'all'
                      ? '검색 결과가 없습니다.'
                      : '등록된 상담자가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-sm flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: PRIMARY_HEX }}
                        >
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{c.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.gender && `${c.gender}`}{c.age && `, ${c.age}세`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.phone || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{c.counselor_name || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">{c.branch || '-'}</td>
                    <td className="px-4 py-3">
                      {c.participation_stage
                        ? <span className={stageColors[c.participation_stage] || 'badge-active'}>{c.participation_stage}</span>
                        : <span className="text-muted-foreground">-</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.business_type || '-'}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {c.employment_type
                        ? <span className="badge-completed">{c.employment_type}</span>
                        : <span className="text-muted-foreground text-xs">미취업</span>
                      }
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}