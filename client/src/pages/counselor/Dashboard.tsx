/**
 * Counselor Dashboard
 * Design: 모던 웰니스 미니멀리즘
 * Features: 전체 상담자 수, 프로세스 현황, 캘린더, 메모장(칸반)
 */
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MOCK_CLIENTS, MONTHLY_STATS, PROCESS_STAGES, INITIAL_KANBAN, type KanbanColumn, type MemoCard } from '@/lib/mockData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Area, AreaChart,
} from 'recharts';
import {
  Users, TrendingUp, CheckCircle2, Clock, Search, Plus, X, ChevronLeft, ChevronRight,
  AlertCircle, Calendar as CalendarIcon, StickyNote,
} from 'lucide-react';
import { toast } from 'sonner';

const PRIMARY = 'oklch(0.588 0.152 162.5)';
const PRIMARY_HEX = '#009C64';

// Mini stat card
function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="stat-card flex items-start gap-4">
      <div className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0" style={{ background: color || 'oklch(0.92 0.05 162.5)' }}>
        {icon}
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold text-foreground mt-0.5">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// Simple calendar
function MiniCalendar() {
  const [date, setDate] = useState(new Date());
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  // Mock events
  const events: Record<number, string> = { 5: '상담', 12: '회의', 18: '상담', 25: '교육' };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setDate(new Date(year, month - 1, 1))} className="p-1 rounded-sm hover:bg-muted">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold">{year}년 {month + 1}월</span>
        <button onClick={() => setDate(new Date(year, month + 1, 1))} className="p-1 rounded-sm hover:bg-muted">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['일', '월', '화', '수', '목', '금', '토'].map(d => (
          <div key={d} className="text-xs text-muted-foreground py-1 font-medium">{d}</div>
        ))}
        {days.map((day, i) => (
          <div key={i} className={`
            text-xs py-1.5 rounded-sm relative
            ${day === null ? '' : 'hover:bg-muted cursor-pointer'}
            ${day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              ? 'text-white font-bold'
              : 'text-foreground'}
          `}
            style={day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              ? { background: PRIMARY_HEX }
              : {}
            }
          >
            {day}
            {day && events[day] && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: PRIMARY_HEX }}></span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {Object.entries(events).map(([day, label]) => (
          <div key={day} className="flex items-center gap-2 text-xs">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PRIMARY_HEX }}></span>
            <span className="text-muted-foreground">{month + 1}/{day}</span>
            <span className="text-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Kanban board
function KanbanBoard() {
  const [columns, setColumns] = useState<KanbanColumn[]>(INITIAL_KANBAN);
  const [newCardColumn, setNewCardColumn] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  const addCard = (colId: string) => {
    if (!newCardTitle.trim()) return;
    const newCard: MemoCard = {
      id: `m${Date.now()}`,
      title: newCardTitle,
      content: '',
      priority: 'medium',
    };
    setColumns(cols => cols.map(col =>
      col.id === colId ? { ...col, cards: [...col.cards, newCard] } : col
    ));
    setNewCardTitle('');
    setNewCardColumn(null);
  };

  const removeCard = (colId: string, cardId: string) => {
    setColumns(cols => cols.map(col =>
      col.id === colId ? { ...col, cards: col.cards.filter(c => c.id !== cardId) } : col
    ));
  };

  const priorityColor = (p: string) => {
    if (p === 'high') return 'badge-cancelled';
    if (p === 'medium') return 'badge-pending';
    return 'badge-active';
  };
  const priorityLabel = (p: string) => p === 'high' ? '높음' : p === 'medium' ? '보통' : '낮음';

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map(col => (
        <div key={col.id} className="flex-shrink-0 w-64 bg-muted/50 rounded-md p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">{col.title}</span>
            <span className="text-xs text-muted-foreground bg-background rounded-sm px-1.5 py-0.5">{col.cards.length}</span>
          </div>
          <div className="space-y-2">
            {col.cards.map(card => (
              <div key={card.id} className="bg-card rounded-sm p-3 shadow-sm border border-border group">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-foreground leading-tight">{card.title}</div>
                  <button
                    onClick={() => removeCard(col.id, card.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-destructive"
                  >
                    <X size={12} />
                  </button>
                </div>
                {card.content && <div className="text-xs text-muted-foreground mt-1">{card.content}</div>}
                <div className="flex items-center gap-2 mt-2">
                  <span className={priorityColor(card.priority)}>{priorityLabel(card.priority)}</span>
                  {card.clientName && <span className="text-xs text-muted-foreground">{card.clientName}</span>}
                  {card.dueDate && <span className="text-xs text-muted-foreground ml-auto">{card.dueDate}</span>}
                </div>
              </div>
            ))}
          </div>
          {newCardColumn === col.id ? (
            <div className="mt-2">
              <input
                autoFocus
                value={newCardTitle}
                onChange={e => setNewCardTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCard(col.id); if (e.key === 'Escape') setNewCardColumn(null); }}
                placeholder="카드 제목..."
                className="w-full px-2 py-1.5 text-xs rounded-sm border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex gap-1 mt-1">
                <button onClick={() => addCard(col.id)} className="btn-primary text-xs py-1 px-2">추가</button>
                <button onClick={() => setNewCardColumn(null)} className="btn-cancel text-xs py-1 px-2">취소</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setNewCardColumn(col.id)}
              className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full py-1.5 rounded-sm hover:bg-background transition-colors"
            >
              <Plus size={12} />
              카드 추가
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function CounselorDashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'memo'>('overview');

  const myClients = MOCK_CLIENTS.filter(c => c.counselorId === 'c001');
  const totalClients = myClients.length;
  const completedClients = myClients.filter(c => c.employmentStatus === '취업완료').length;
  const pendingClients = myClients.filter(c => c.followUp).length;
  const activeProcesses = myClients.filter(c => c.processStage !== '취업완료').length;

  const searchResults = searchQuery
    ? MOCK_CLIENTS.filter(c =>
        c.name.includes(searchQuery) ||
        c.phone.includes(searchQuery) ||
        c.counselorName.includes(searchQuery)
      )
    : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">업무 대시보드</h1>
          <p className="text-sm text-muted-foreground mt-0.5">안녕하세요, {user?.name}님. 오늘도 좋은 하루 되세요.</p>
        </div>
        <div className="text-sm text-muted-foreground">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="상담자 검색 (이름, 전화번호...)"
          className="w-full pl-9 pr-4 py-2.5 rounded-sm border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="bg-card rounded-md border border-border shadow-sm overflow-hidden">
          {searchResults.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">검색 결과가 없습니다.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">이름</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">연락처</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">담당 상담사</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">단계</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map(c => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer">
                    <td className="px-4 py-2.5 font-medium">{c.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.phone}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.counselorName}</td>
                    <td className="px-4 py-2.5">
                      <span className="badge-active">{c.processStage}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={18} color={PRIMARY_HEX} />}
          label="전체 상담자 수"
          value={totalClients}
          sub="담당 상담자"
          color="oklch(0.92 0.05 162.5)"
        />
        <StatCard
          icon={<TrendingUp size={18} color="#4299E1" />}
          label="진행 중"
          value={activeProcesses}
          sub="프로세스 진행"
          color="oklch(0.92 0.04 240)"
        />
        <StatCard
          icon={<CheckCircle2 size={18} color={PRIMARY_HEX} />}
          label="취업 완료"
          value={completedClients}
          sub={`성사율 ${Math.round(completedClients / totalClients * 100)}%`}
          color="oklch(0.92 0.05 162.5)"
        />
        <StatCard
          icon={<AlertCircle size={18} color="#F6AD55" />}
          label="후속 상담 필요"
          value={pendingClients}
          sub="팔로업 대상"
          color="oklch(0.95 0.06 85)"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'overview', label: '현황', icon: <TrendingUp size={14} /> },
          { id: 'calendar', label: '캘린더', icon: <CalendarIcon size={14} /> },
          { id: 'memo', label: '메모장', icon: <StickyNote size={14} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            style={activeTab === tab.id ? { borderColor: PRIMARY_HEX, color: PRIMARY_HEX } : {}}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Monthly chart */}
          <div className="lg:col-span-2 bg-card rounded-md p-5 shadow-sm border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">월별 상담 현황</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={MONTHLY_STATS} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.008 75)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'oklch(0.55 0.015 65)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'oklch(0.55 0.015 65)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '6px', border: '1px solid oklch(0.88 0.008 75)', fontSize: '12px' }}
                />
                <Bar dataKey="clients" name="상담자" fill={PRIMARY_HEX} radius={[3, 3, 0, 0]} />
                <Bar dataKey="completed" name="취업완료" fill="#4299E1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Process stages */}
          <div className="bg-card rounded-md p-5 shadow-sm border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">프로세스 과정 수</h3>
            <div className="space-y-3">
              {PROCESS_STAGES.map(stage => (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground">{stage.stage}</span>
                    <span className="text-xs font-semibold text-foreground">{stage.count}명</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(stage.count / 50) * 100}%`,
                        background: stage.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sessions trend */}
          <div className="lg:col-span-3 bg-card rounded-md p-5 shadow-sm border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">상담 세션 추이</h3>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={MONTHLY_STATS}>
                <defs>
                  <linearGradient id="sessionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PRIMARY_HEX} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={PRIMARY_HEX} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.008 75)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'oklch(0.55 0.015 65)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'oklch(0.55 0.015 65)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid oklch(0.88 0.008 75)', fontSize: '12px' }} />
                <Area type="monotone" dataKey="sessions" name="세션 수" stroke={PRIMARY_HEX} strokeWidth={2} fill="url(#sessionGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-card rounded-md p-5 shadow-sm border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">캘린더</h3>
            <MiniCalendar />
          </div>
          <div className="lg:col-span-2 bg-card rounded-md p-5 shadow-sm border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">이번 달 일정</h3>
            <div className="space-y-3">
              {[
                { date: '4/5', time: '10:00', title: '홍길동 상담', type: '심층상담', client: '홍길동' },
                { date: '4/12', time: '14:00', title: '팀 회의', type: '회의', client: '' },
                { date: '4/18', time: '11:00', title: '이수진 초기상담', type: '초기상담', client: '이수진' },
                { date: '4/25', time: '09:00', title: '상담사 교육', type: '교육', client: '' },
              ].map((ev, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-sm border border-border hover:bg-muted/30 transition-colors">
                  <div className="text-center w-10 flex-shrink-0">
                    <div className="text-xs text-muted-foreground">{ev.date.split('/')[0]}월</div>
                    <div className="text-lg font-bold" style={{ color: PRIMARY_HEX }}>{ev.date.split('/')[1]}</div>
                  </div>
                  <div className="w-px h-8 bg-border flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{ev.title}</div>
                    <div className="text-xs text-muted-foreground">{ev.time} · {ev.type}</div>
                  </div>
                  {ev.client && <span className="badge-active">{ev.client}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Memo Tab */}
      {activeTab === 'memo' && (
        <div className="bg-card rounded-md p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">메모장 (칸반)</h3>
            <button onClick={() => toast.info('새 컬럼 추가 기능')} className="btn-primary text-xs py-1.5 px-3">
              <Plus size={12} className="mr-1" />
              컬럼 추가
            </button>
          </div>
          <KanbanBoard />
        </div>
      )}
    </div>
  );
}
