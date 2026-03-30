/**
 * Client Detail Page (상담자 상세 정보)
 */
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useParams } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import {
  ChevronLeft, User, Phone, Edit3, ClipboardList,
  Loader2, Trash2, Save, AlertTriangle, ChevronRight, Plus,
  Check, X
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchClientById, fetchSessions, createSession,
  deleteSession, fetchSurveys, createSurvey, updateClient, updateSession, createAllowanceLog
} from '@/lib/api';
import type { ClientRow, SessionRow, SurveyRow } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ClientSummaryAnalysisTab } from './ClientSummaryAnalysisTab';
import { EmploymentSuccessCaseCard } from './EmploymentSuccessCaseCard';
import './ClientDetail.css';

const PRIMARY = '#009C64';

type ClientTab = 'manage' | 'history' | 'input' | 'survey' | 'summary';

// ─── Survey Definitions ──────────────────────────────────────────────────────

const SURVEY_QUESTIONS = [
  { key: 'q1_job_goal', label: '구직목표 수립', desc: '취업하고자 하는 직종이나 분야에 대한 목표가 있습니까?' },
  { key: 'q2_will_3months', label: '3개월 내 구직의지', desc: '3개월 이내에 취업하고자 하는 의지가 있습니까?' },
  { key: 'q3_job_plan', label: '희망직종 구직계획', desc: '희망 직종에 취업하기 위한 구체적인 계획이 있습니까?' },
  { key: 'q4_skill_need', label: '구직기술 필요도', desc: '이력서 작성, 면접 준비 등 구직기술 지원이 필요합니까?' },
  { key: 'q5_info_need', label: '구직정보 필요도', desc: '취업처 발굴, 채용정보 등 구직정보 지원이 필요합니까?' },
  { key: 'q6_competency', label: '취업역량 향상도', desc: '직업훈련, 자격증 취득 등 취업역량 향상 지원이 필요합니까?' },
  { key: 'q7_barrier', label: '취업장애요인', desc: '건강, 가족돌봄, 교통 등 취업에 장애가 되는 요인이 있습니까?' },
  { key: 'q8_health', label: '건강상태', desc: '현재 건강상태는 취업활동에 지장이 없습니까?' },
] as const;

const SURVEY_OPTIONS = [
  { value: 3, label: '예', color: '#009C64' },
  { value: 2, label: '보통', color: '#f59e0b' },
  { value: 1, label: '아니오', color: '#ef4444' },
];

function SurveyTab({ clientId, counselorId }: { clientId: string; counselorId?: string }) {
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [barrierDetail, setBarrierDetail] = useState('');
  const [surveyDate, setSurveyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSurveys(clientId);
      setSurveys(data);
    } catch (e: any) {
      toast.error('설문 데이터 로드 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const totalScore = SURVEY_QUESTIONS.reduce((sum, q) => sum + (answers[q.key] || 0), 0);
  const maxScore = SURVEY_QUESTIONS.length * 3;

  const handleSave = async () => {
    if (Object.keys(answers).length < SURVEY_QUESTIONS.length) {
      toast.error('모든 항목에 응답해주세요.');
      return;
    }
    if (!isSupabaseConfigured()) {
      toast.error('Supabase 설정이 필요합니다.');
      return;
    }
    setSaving(true);
    try {
      await createSurvey({
        client_id: clientId,
        counselor_id: counselorId || null,
        survey_date: surveyDate,
        q1_job_goal: answers['q1_job_goal'] || null,
        q2_will_3months: answers['q2_will_3months'] || null,
        q3_job_plan: answers['q3_job_plan'] || null,
        q4_skill_need: answers['q4_skill_need'] || null,
        q5_info_need: answers['q5_info_need'] || null,
        q6_competency: answers['q6_competency'] || null,
        q7_barrier: answers['q7_barrier'] || null,
        q7_barrier_detail: barrierDetail || null,
        q8_health: answers['q8_health'] || null,
      } as any);
      toast.success('설문이 저장되었습니다.');
      setShowForm(false);
      setAnswers({});
      setBarrierDetail('');
      load();
    } catch (e: any) {
      toast.error('저장 실패: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={20} className="animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-foreground">구직준비도 설문 이력</div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium text-white"
          style={{ background: PRIMARY }}
        >
          <Plus size={12} />
          새 설문 입력
        </button>
      </div>

      {showForm && (
        <div className="border border-border rounded-sm p-4 space-y-4 bg-muted/10">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">구직준비도 점검 설문지</div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">설문일</label>
              <input
                type="date"
                value={surveyDate}
                onChange={e => setSurveyDate(e.target.value)}
                className="text-xs px-2 py-1 rounded-sm border border-input bg-background"
              />
            </div>
          </div>

          <div className="space-y-3">
            {SURVEY_QUESTIONS.map((q, idx) => (
              <div key={q.key} className="space-y-1.5">
                <div className="text-xs font-medium text-foreground">{idx + 1}. {q.label}</div>
                <div className="text-xs text-muted-foreground">{q.desc}</div>
                <div className="flex gap-2">
                  {SURVEY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswers(a => ({ ...a, [q.key]: opt.value }))}
                      className="flex-1 py-1.5 rounded-sm text-xs font-medium border transition-all"
                      style={answers[q.key] === opt.value
                        ? { background: opt.color, borderColor: opt.color, color: 'white' }
                        : { borderColor: '#e5e7eb', color: '#6b7280' }
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="text-sm">총점: <span className="font-bold" style={{ color: PRIMARY }}>{totalScore}</span></div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary py-1.5 px-3 text-xs">저장</button>
              <button onClick={() => setShowForm(false)} className="btn-cancel py-1.5 px-3 text-xs">취소</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {surveys.map(s => (
          <div key={s.id} className="counsel_survey_item">
            <div>
              <div className="text-sm font-medium">{s.survey_date} 설문</div>
              <div className="text-xs text-muted-foreground">총점: {s.total_score}점</div>
            </div>
            <div className="text-sm font-bold" style={{ color: PRIMARY }}>{Math.round(((s.total_score || 0) / 24) * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [client, setClient] = useState<ClientRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ClientTab>('manage');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newSession, setNewSession] = useState({
    type: '초기상담',
    content: '',
    next_action: '',
    date: new Date().toISOString().split('T')[0],
    session_number: 1,
    start_time: '09:00',
    end_time: '10:00',
    holland_code: '',
    profiling_grade: '',
    document_link: '',
    economic_situation: null,
    social_situation_family: null,
    social_situation_society: null,
    self_esteem: null,
    self_efficacy: null,
    career_fluidity: null,
    info_gathering: null,
    personality_test_result: '',
    life_history_result: '',
    memo: '',
  });



  // Sync client master update state when client data loads

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionContent, setEditSessionContent] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchClientById(id);
      if (data) setClient(data);
      else toast.error('상담자 정보를 찾을 수 없습니다.');
    } catch (e: any) {
      toast.error('데이터 로드 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadSessions = useCallback(async () => {
    if (!id) return;
    setSessionsLoading(true);
    try {
      const data = await fetchSessions(id);
      setSessions(data);
    } catch (e: any) {
      toast.error('상담 이력 로드 실패');
    } finally {
      setSessionsLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'input') loadSessions();
  }, [activeTab, loadSessions]);

  const startEdit = (field: string, initialValue: any) => {
    setEditingField(field);
    setEditValue(String(initialValue ?? ''));
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleUpdateField = async (field: string) => {
    if (!id || !client) return;
    setSaving(true);
    try {
      if (field === 'memo') {
        await updateClient(id, { memo: editValue });
        setClient({ ...client, memo: editValue } as ClientRow);
        toast.success('적용되었습니다.');
        setEditingField(null);
        return;
      }

      // Map frontend fields (ClientRow) back to Supabase column names
      let dbKey = field;
      let val: any = editValue;

      if (field === 'name') dbKey = 'client_name';
      if (field === 'phone') dbKey = 'phone_encrypted';
      if (field === 'gender') {
        dbKey = 'gender_code';
        val = editValue === '남' ? 'M' : 'F';
      }
      if (field === 'school') dbKey = 'school';
      if (field === 'desired_job') dbKey = 'desired_job';
      if (field === 'business_type') {
        dbKey = 'business_type_code';
        const num = Number(editValue);
        val = isNaN(num) ? null : num;
      }

      // Numeric fields conversion
      if (field === 'age' || field === 'retest_stat') {
        const num = Number(editValue);
        val = isNaN(num) ? null : num;
      }

      await updateClient(id, { [dbKey]: val });

      // Update local state with the same key used in ClientRow
      setClient({ ...client, [field]: val } as ClientRow);
      toast.success('적용되었습니다.');
      setEditingField(null);
    } catch (e: any) {
      toast.error('수정 실패: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSession = async (session: SessionRow) => {
    try {
      await updateSession(session.id, {
        ...session,
        content: editSessionContent
      });
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, content: editSessionContent } : s));
      toast.success('상담 이력이 수정되었습니다.');
      setEditingSessionId(null);
    } catch (e: any) {
      toast.error('수정 실패: ' + e.message);
    }
  };

  useEffect(() => {
    const used = sessions.filter(s => (s.type === newSession.type || (newSession.type === '일반상담' && !s.type))).map(s => s.session_number);
    let nextNum = 1;
    while (used.includes(nextNum)) nextNum++;
    setNewSession(prev => ({ ...prev, session_number: nextNum }));
  }, [newSession.type, sessions]);

  const formatTime = (value: string) => {
    // Only numbers allowed initially
    const nums = value.replace(/[^0-9]/g, '');
    if (nums.length >= 4) {
      return `${nums.slice(0, 2)}:${nums.slice(2, 4)}`;
    }
    if (nums.length === 3) {
      return `${nums.slice(0, 2)}:${nums.slice(2, 3)}`;
    }
    return nums;
  };

  const handleTimeChange = (field: 'start_time' | 'end_time', value: string) => {
    setNewSession(prev => ({ ...prev, [field]: formatTime(value) }));
  };

  const handleSaveSession = async () => {
    if (!newSession.content.trim()) { toast.error('상담 내용을 입력해주세요.'); return; }
    if (!id) return;
    setSaving(true);
    try {
      // 1. 상담 기록 저장 (+ 참여 단계 자동 업데이트 포함됨)
      await createSession({
        client_id: id,
        ...newSession,
        counselor_name: user?.name || null,
        counselor_id: user?.id || null, // context has user.id or user.counselorId, using id for user_id fk
      });


      toast.success('저장되었습니다.');
      setNewSession({
        type: '초기상담',
        content: '',
        next_action: '',
        date: new Date().toISOString().split('T')[0],
        session_number: (newSession.session_number || 1) + 1,
        start_time: '09:00',
        end_time: '10:00',
        personality_test_result: '',
        life_history_result: '',
        memo: '',
        economic_situation: null,
        social_situation_family: null,
        social_situation_society: null,
        self_esteem: null,
        self_efficacy: null,
        career_fluidity: null,
        info_gathering: null,
      });
      loadSessions();
      loadData(); // 내담자 정보(참여 단계) 새로고침
      setActiveTab('history');
    } catch (e: any) {
      toast.error('저장 실패: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSession = async (sid: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await deleteSession(sid);
      setSessions(prev => prev.filter(s => s.id !== sid));
      toast.success('삭제되었습니다.');
    } catch (e: any) {
      toast.error('삭제 실패');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <Loader2 size={24} className="animate-spin text-muted-foreground mb-2" />
      <span className="text-sm text-muted-foreground">상담자 정보를 불러오는 중...</span>
    </div>
  );

  if (!client) return (
    <div className="p-8 text-center text-muted-foreground">상담자를 찾을 수 없습니다.</div>
  );

  const stageColors: Record<string, string> = {
    '초기상담': 'badge-active', '심층상담': 'badge-pending',
    '취업지원': 'badge-pending', '취업완료': 'badge-completed', '사후관리': 'badge-active',
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="counsel_header">
        <button onClick={() => navigate('/clients/list')} className="counsel_back_btn">
          <ChevronLeft size={18} />
        </button>
        <div className="counsel_header">
          <div className="counsel_avatar" style={{ background: PRIMARY }}>
            {client.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              {client.name} 
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">#{client.id}</span>
            </h1>
            <p className="text-sm text-muted-foreground">{client.phone || '연락처 없음'} · {client.counselor_name || '담당자 미지정'}</p>
          </div>
        </div>
      </div>

      {/* Progress Board */}
      <div className="counsel_progress_board">
        <div className="flex items-center justify-between mb-4">
          <h3 className="counsel_section_title flex items-center gap-2">
            <ClipboardList size={14} className="text-primary" />
            참여 진행도
          </h3>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            현재 단계: {client.participation_stage || '미정'}
          </span>
        </div>
        
        <div className="relative flex items-center justify-between px-2">
          {/* Background Line */}
          <div className="absolute left-0 right-0 h-0.5 bg-muted top-1/2 -translate-y-1/2 z-0 mx-8"></div>
          
          {['초기상담', '심층상담', '취업지원', '취업완료', '사후관리'].map((stage, idx, arr) => {
            const currentIdx = ['초기상담', '심층상담', '취업지원', '취업완료', '사후관리'].indexOf(client.participation_stage || '초기상담');
            const isActive = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            
            return (
              <div key={stage} className="counsel_progress_step">
                <div 
                  className={`counsel_step_circle ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
                >
                  {isActive && idx < currentIdx ? <Check size={12} strokeWidth={3} /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                </div>
                <span className={`text-[11px] font-bold transition-all ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {stage}
                </span>
                
                {/* Active Progress Line */}
                {idx < arr.length - 1 && idx < currentIdx && (
                  <div className="absolute left-1/2 w-full h-0.5 bg-primary top-3 -translate-y-1/2 -z-10 translate-x-3"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <EmploymentSuccessCaseCard clientId={client.id} />

      {/* Tabs */}
      <div className="counsel_tab_wrapper">
        {[
          { id: 'manage', label: '상담관리' },
          { id: 'history', label: '상담이력' },
          { id: 'input', label: '상담입력' },
          { id: 'survey', label: '구직준비도' },
          { id: 'summary', label: '요약 및 분석' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ClientTab)}
            className={`counsel_tab_btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="counsel_content_card">
        {activeTab === 'manage' && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <section>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">기본 정보</h3>
                <div className="space-y-4">
                  {/* Name */}
                  <div className="group">
                    <label className="counsel_inline_label">성함</label>
                    {editingField === 'name' ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="counsel_inline_input"
                        />
                        <button onClick={() => handleUpdateField('name')} className="counsel_btn_confirm"><Check size={16} /></button>
                        <button onClick={cancelEdit} className="counsel_btn_cancel"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="counsel_inline_display">
                        <div className="flex items-center gap-2"><User size={14} className="text-muted-foreground" /> {client.name}</div>
                        <button onClick={() => startEdit('name', client.name)} className="counsel_btn_edit"><Edit3 size={13} /></button>
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="group">
                    <label className="counsel_inline_label">연락처</label>
                    {editingField === 'phone' ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="counsel_inline_input"
                        />
                        <button onClick={() => handleUpdateField('phone')} className="counsel_btn_confirm"><Check size={16} /></button>
                        <button onClick={cancelEdit} className="counsel_btn_cancel"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="counsel_inline_display">
                        <div className="flex items-center gap-2"><Phone size={14} className="text-muted-foreground" /> {client.phone || '-'}</div>
                        <button onClick={() => startEdit('phone', client.phone)} className="counsel_btn_edit"><Edit3 size={13} /></button>
                      </div>
                    )}
                  </div>

                  {/* Age/Gender */}
                  <div className="group">
                    <label className="counsel_inline_label">나이 / 성별</label>
                    <div className="counsel_inline_display">
                      <div className="flex items-center gap-4">
                        {/* Age Edit */}
                        <div className="flex items-center gap-1 group/age">
                          {editingField === 'age' ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="w-12 text-sm bg-background border border-primary px-1 rounded-sm outline-none"
                              />
                              <span>세</span>
                              <button onClick={() => handleUpdateField('age')} className="counsel_btn_confirm p-0.5"><Check size={14} /></button>
                              <button onClick={cancelEdit} className="counsel_btn_cancel p-0.5"><X size={14} /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span>{client.age}세</span>
                              <button onClick={() => startEdit('age', client.age)} className="counsel_btn_edit opacity-0 group-hover/age:opacity-100 p-0.5"><Edit3 size={11} /></button>
                            </div>
                          )}
                        </div>

                        <div className="w-[1px] h-3 bg-border"></div>

                        {/* Gender Edit */}
                        <div className="flex items-center gap-1 group/gender">
                          {editingField === 'gender' ? (
                            <div className="flex items-center gap-1">
                              <select
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="text-sm bg-background border border-primary rounded-sm outline-none cursor-pointer"
                              >
                                <option value="남">남</option>
                                <option value="여">여</option>
                              </select>
                              <button onClick={() => handleUpdateField('gender')} className="counsel_btn_confirm p-0.5"><Check size={14} /></button>
                              <button onClick={cancelEdit} className="counsel_btn_cancel p-0.5"><X size={14} /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span>{client.gender || '성별 미지정'}</span>
                              <button onClick={() => startEdit('gender', client.gender)} className="counsel_btn_edit opacity-0 group-hover/gender:opacity-100 p-0.5"><Edit3 size={11} /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Education */}
                  <div className="group">
                    <label className="counsel_inline_label">학력</label>
                    {editingField === 'education_level' ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="counsel_inline_input"
                        />
                        <button onClick={() => handleUpdateField('education_level')} className="counsel_btn_confirm"><Check size={16} /></button>
                        <button onClick={cancelEdit} className="counsel_btn_cancel"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="counsel_inline_display">
                        <div>{client.education_level || '-'}</div>
                        <button onClick={() => startEdit('education_level', client.education_level)} className="counsel_btn_edit"><Edit3 size={13} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">진행 현황</h3>
                <div className="space-y-4">
                  <div className="group">
                    <label className="counsel_inline_label">참여단계</label>
                    {editingField === 'participation_stage' ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="counsel_inline_input cursor-pointer"
                        >
                          {Object.keys(stageColors).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button onClick={() => handleUpdateField('participation_stage')} className="counsel_btn_confirm"><Check size={16} /></button>
                        <button onClick={cancelEdit} className="counsel_btn_cancel"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="counsel_inline_display cursor-pointer" onClick={() => startEdit('participation_stage', client.participation_stage)}>
                        <span className={stageColors[client.participation_stage || ''] || 'badge-active'}>{client.participation_stage || '초기'}</span>
                        <button className="counsel_btn_edit"><Edit3 size={13} /></button>
                      </div>
                    )}
                  </div>

                  {/* Score uses retest_stat only so detail/list/dashboard all share one live source of truth. */}
                  <div className="group">
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="counsel_inline_label">점수</label>
                    </div>
                    {editingField === 'retest_stat' ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="w-20 counsel_inline_input font-bold text-primary"
                        />
                        <span className="text-sm font-bold text-primary">점</span>
                        <div className="flex-1"></div>
                        <button onClick={() => handleUpdateField('retest_stat')} className="counsel_btn_confirm"><Check size={16} /></button>
                        <button onClick={cancelEdit} className="counsel_btn_cancel"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="counsel_inline_display">
                        <div className="text-lg font-bold" style={{ color: PRIMARY }}>{client.retest_stat ?? '-'}</div>
                        <button onClick={() => startEdit('retest_stat', client.retest_stat)} className="counsel_btn_edit"><Edit3 size={13} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Memo */}
              <section className="group">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="counsel_section_title">메모</h3>
                  {editingField !== 'memo' && (
                    <button onClick={() => startEdit('memo', client.memo)} className="counsel_btn_edit opacity-100"><Edit3 size={13} /></button>
                  )}
                </div>
                {editingField === 'memo' ? (
                  <div className="space-y-2">
                    <textarea
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      rows={5}
                      className="w-full text-sm bg-background border border-primary px-3 py-2 rounded-sm outline-none resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1 text-xs border border-border rounded-sm hover:bg-muted transition-colors"><X size={14} /> 취소</button>
                      <button onClick={() => handleUpdateField('memo')} className="flex items-center gap-1 px-3 py-1 text-xs text-white rounded-sm transition-colors" style={{ background: PRIMARY }}><Check size={14} /> 저장</button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-muted/30 rounded-sm text-sm whitespace-pre-wrap group-hover:bg-muted/50 transition-colors">{client.memo || '메모가 없습니다.'}</div>
                )}
              </section>
            </div>

            {/* Second Column: Detailed Info */}
            <div className="space-y-6">
              <section>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">상세 정보</h3>
                <div className="space-y-4">
                  {/* Business Type */}
                  <div className="group">
                    <label className="counsel_inline_label">사업 유형</label>
                    {editingField === 'business_type' ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="counsel_inline_input"
                        />
                        <button onClick={() => handleUpdateField('business_type')} className="counsel_btn_confirm"><Check size={16} /></button>
                        <button onClick={cancelEdit} className="counsel_btn_cancel"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="counsel_inline_display">
                        <div>{client.business_type || '-'}</div>
                        <button onClick={() => startEdit('business_type', client.business_type)} className="counsel_btn_edit"><Edit3 size={13} /></button>
                      </div>
                    )}
                  </div>

                  {/* Participation Type */}
                  <div className="group">
                    <label className="counsel_inline_label">참여 유형</label>
                    {editingField === 'participation_type' ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="counsel_inline_input"
                        />
                        <button onClick={() => handleUpdateField('participation_type')} className="counsel_btn_confirm"><Check size={16} /></button>
                        <button onClick={cancelEdit} className="counsel_btn_cancel"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="counsel_inline_display">
                        <div>{client.participation_type || '-'}</div>
                        <button onClick={() => startEdit('participation_type', client.participation_type)} className="counsel_btn_edit"><Edit3 size={13} /></button>
                      </div>
                    )}
                  </div>

                  {/* Desired Job */}
                  <div className="group">
                    <label className="counsel_inline_label">희망 직종</label>
                    {editingField === 'desired_job' ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="counsel_inline_input"
                        />
                        <button onClick={() => handleUpdateField('desired_job')} className="counsel_btn_confirm"><Check size={16} /></button>
                        <button onClick={cancelEdit} className="counsel_btn_cancel"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="counsel_inline_display">
                        <div>{client.desired_job || '-'}</div>
                        <button onClick={() => startEdit('desired_job', client.desired_job)} className="counsel_btn_edit"><Edit3 size={13} /></button>
                      </div>
                    )}
                  </div>

                  {/* School & Major Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="group">
                      <label className="counsel_inline_label">학교</label>
                      {editingField === 'school' ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="counsel_inline_input w-full"
                          />
                          <button onClick={() => handleUpdateField('school')} className="counsel_btn_confirm"><Check size={16} /></button>
                          <button onClick={cancelEdit} className="counsel_btn_cancel"><X size={16} /></button>
                        </div>
                      ) : (
                        <div className="counsel_inline_display">
                          <div className="truncate">{client.school || '-'}</div>
                          <button onClick={() => startEdit('school', client.school)} className="counsel_btn_edit shrink-0"><Edit3 size={13} /></button>
                        </div>
                      )}
                    </div>
                    
                    <div className="group">
                      <label className="counsel_inline_label">전공</label>
                      {editingField === 'major' ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="counsel_inline_input w-full"
                          />
                          <button onClick={() => handleUpdateField('major')} className="counsel_btn_confirm"><Check size={16} /></button>
                          <button onClick={cancelEdit} className="counsel_btn_cancel"><X size={16} /></button>
                        </div>
                      ) : (
                        <div className="counsel_inline_display">
                          <div className="truncate">{client.major || '-'}</div>
                          <button onClick={() => startEdit('major', client.major)} className="counsel_btn_edit shrink-0"><Edit3 size={13} /></button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Driving & Car Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="group">
                      <label className="counsel_inline_label">운전가능 여부</label>
                      {editingField === 'driving_yn' ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="counsel_inline_input w-full"
                            placeholder="Y/N"
                          />
                          <button onClick={() => handleUpdateField('driving_yn')} className="counsel_btn_confirm"><Check size={16} /></button>
                          <button onClick={cancelEdit} className="counsel_btn_cancel"><X size={16} /></button>
                        </div>
                      ) : (
                        <div className="counsel_inline_display">
                          <div>{client.driving_yn === 'Y' || client.driving_yn === 'y' || client.driving_yn === '가능' ? '가능' : client.driving_yn === 'N' || client.driving_yn === 'n' || client.driving_yn === '불가능' ? '불가능' : (client.driving_yn || '-')}</div>
                          <button onClick={() => startEdit('driving_yn', client.driving_yn)} className="counsel_btn_edit shrink-0"><Edit3 size={13} /></button>
                        </div>
                      )}
                    </div>
                    
                    <div className="group">
                      <label className="counsel_inline_label">자차 여부</label>
                      {editingField === 'own_car_yn' ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="counsel_inline_input w-full"
                            placeholder="Y/N"
                          />
                          <button onClick={() => handleUpdateField('own_car_yn')} className="counsel_btn_confirm"><Check size={16} /></button>
                          <button onClick={cancelEdit} className="counsel_btn_cancel"><X size={16} /></button>
                        </div>
                      ) : (
                        <div className="counsel_inline_display">
                          <div>{client.own_car_yn === 'Y' || client.own_car_yn === 'y' || client.own_car_yn === '있음' ? '있음' : client.own_car_yn === 'N' || client.own_car_yn === 'n' || client.own_car_yn === '없음' ? '없음' : (client.own_car_yn || '-')}</div>
                          <button onClick={() => startEdit('own_car_yn', client.own_car_yn)} className="counsel_btn_edit shrink-0"><Edit3 size={13} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {sessionsLoading ? <Loader2 className="animate-spin mx-auto mt-8 opacity-20" /> :
              sessions.length === 0 ? <p className="text-center py-12 text-muted-foreground text-sm">기록된 상담 이력이 없습니다.</p> :
                sessions.map(s => (
                  <div key={s.id} className="counsel_history_item group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="badge-active px-2 py-0.5">{s.type || '일반상담'}</span>
                        {s.session_number != null && (
                          <>
                            <span className="text-muted-foreground text-xs">-</span>
                            <span className="badge-pending px-2 py-0.5">{s.session_number}회차</span>
                          </>
                        )}
                        <span className="text-xs text-muted-foreground ml-1">{s.date}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {editingSessionId !== s.id && (
                          <button onClick={() => { setEditingSessionId(s.id); setEditSessionContent(s.content || ''); }} className="p-1 hover:text-primary transition-colors"><Edit3 size={14} /></button>
                        )}
                        <button onClick={() => handleDeleteSession(s.id)} className="p-1 hover:text-destructive transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>

                    {editingSessionId === s.id ? (
                      <div className="space-y-2">
                        <textarea
                          autoFocus
                          value={editSessionContent}
                          onChange={e => setEditSessionContent(e.target.value)}
                          rows={4}
                          className="w-full text-sm bg-background border border-primary px-3 py-2 rounded-sm outline-none resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingSessionId(null)} className="flex items-center gap-1 px-3 py-1 text-[11px] border border-border rounded-sm hover:bg-muted transition-colors"><X size={12} /> 취소</button>
                          <button onClick={() => handleUpdateSession(s)} className="flex items-center gap-1 px-3 py-1 text-[11px] text-white rounded-sm transition-colors" style={{ background: PRIMARY }}><Check size={12} /> 저장</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{s.content}</p>
                    )}
                  </div>
                ))}
          </div>
        )}

        {activeTab === 'input' && (
          <div className="max-w-4xl mx-auto space-y-8 pb-10">
            {/* 1. 기본 상담 정보 */}
            <section className="bg-card border border-border rounded-md overflow-hidden">
              <div className="bg-muted/30 px-4 py-2 border-b border-border">
                <h3 className="text-xs font-bold text-muted-foreground uppercase">1. 기본 상담 정보</h3>
              </div>
              <div className="counsel_data_basic">
                {/* 1. 상담유형 */}
                <div className="counsel_item">
                  <label className="counsel_label">상담유형</label>
                  <select
                    value={newSession.type}
                    onChange={e => setNewSession({ ...newSession, type: e.target.value })}
                    className="counsel_input"
                  >
                    {['초기상담', '심층상담', '취업지원', '사후관리', '집단상담', '기기', '기타'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* 2. 상담회차 */}
                <div className="counsel_item">
                  <label className="counsel_label">상담회차</label>
                  <select
                    value={newSession.session_number || 1}
                    onChange={e => setNewSession({ ...newSession, session_number: Number(e.target.value) })}
                    className="counsel_input text-center"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(n => (
                      <option key={n} value={n}>{n}회차</option>
                    ))}
                  </select>
                </div>

                {/* 3. 상담일 */}
                <div className="counsel_item">
                  <label className="counsel_label">상담일</label>
                  <input
                    type="date"
                    value={newSession.date}
                    onChange={e => setNewSession({ ...newSession, date: e.target.value })}
                    className="counsel_input"
                  />
                </div>

                {/* 4. 상담시간 */}
                <div className="counsel_item">
                  <label className="counsel_label">상담시간</label>
                  <div className="counsel_time_wrapper">
                    <input
                      type="text"
                      maxLength={5}
                      value={newSession.start_time || ''}
                      onChange={e => handleTimeChange('start_time', e.target.value)}
                      placeholder="시작"
                      className="counsel_time_input"
                    />
                    <span className="counsel_time_separator">-</span>
                    <input
                      type="text"
                      maxLength={5}
                      value={newSession.end_time || ''}
                      onChange={e => handleTimeChange('end_time', e.target.value)}
                      placeholder="종료"
                      className="counsel_time_input"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 2. 상담 상세 기록 */}
            <section className="counsel_section">
              <div className="counsel_section_header">
                <h3 className="counsel_section_title">2. 상담 상세 기록</h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="counsel_label">주요 상담내용</label>
                  <textarea
                    rows={6}
                    value={newSession.content}
                    onChange={e => setNewSession({ ...newSession, content: e.target.value })}
                    className="counsel_input resize-none h-auto outline-none"
                    placeholder="상담 내용을 상세히 입력하세요..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="counsel_label">향후 계획 (Next Action)</label>
                    <input
                      type="text"
                      value={newSession.next_action || ''}
                      onChange={e => setNewSession({...newSession, next_action: e.target.value})}
                      className="counsel_input"
                      placeholder="예: 2차 심층상담 예정"
                    />
                  </div>
                  <div>
                    <label className="counsel_label">내부 메모 <span className="text-muted-foreground font-normal">(비공개)</span></label>
                    <input
                      type="text"
                      value={newSession.memo || ''}
                      onChange={e => setNewSession({...newSession, memo: e.target.value})}
                      className="counsel_input"
                      placeholder="상담사 참고용 메모"
                    />
                  </div>
                </div>
              </div>
            </section>


              {/* 검사 및 프로파일링 */}
              <section className="counsel_section flex flex-col">
                <div className="counsel_section_header">
                  <h3 className="counsel_section_title">4. 추가 검사 및 결과</h3>
                </div>
                <div className="p-5 space-y-4 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="counsel_label">프로파일링 등급</label>
                      <input
                        type="text"
                        value={newSession.profiling_grade || ''}
                        onChange={e => setNewSession({...newSession, profiling_grade: e.target.value})}
                        placeholder="예: A등급"
                        className="counsel_input"
                      />
                    </div>
                    <div>
                      <label className="counsel_label">홀랜드 코드</label>
                      <input
                        type="text"
                        value={newSession.holland_code || ''}
                        onChange={e => setNewSession({...newSession, holland_code: e.target.value})}
                        placeholder="예: RIA"
                        className="counsel_input"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="counsel_label">성격검사 결과</label>
                    <input
                      type="text"
                      value={newSession.personality_test_result || ''}
                      onChange={e => setNewSession({...newSession, personality_test_result: e.target.value})}
                      placeholder="주요 강점 및 특징"
                      className="counsel_input"
                    />
                  </div>
                  <div>
                    <label className="counsel_label">생활사/성장배경 결과</label>
                    <textarea
                      rows={2}
                      value={newSession.life_history_result || ''}
                      onChange={e => setNewSession({...newSession, life_history_result: e.target.value})}
                      placeholder="특이사항 기록"
                      className="counsel_input resize-none"
                    />
                  </div>
                  <div>
                    <label className="counsel_label">문서/파일 링크 (URL)</label>
                    <input
                      type="text"
                      value={newSession.document_link || ''}
                      onChange={e => setNewSession({...newSession, document_link: e.target.value})}
                      placeholder="https://..."
                      className="counsel_input"
                    />
                  </div>
                </div>
              </section>


            {/* 5. 심리/환경 진단 척도 (0-5점) - 최하단 이동 */}
            <section className="counsel_section">
              <div className="counsel_section_header">
                <h3 className="counsel_section_title">5. 심리/환경 진단 척도 (0-5점)</h3>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
                {[
                  { key: 'economic_situation', label: '경제적 상황' },
                  { key: 'social_situation_family', label: '사회적 환경 (가족/지지체계)' },
                  { key: 'social_situation_society', label: '사회적 환경 (인간관계)' },
                  { key: 'self_esteem', label: '자아존중감' },
                  { key: 'self_efficacy', label: '자기효능감' },
                  { key: 'career_fluidity', label: '진로유연성' },
                  { key: 'info_gathering', label: '정보수집능력' },
                ].map((item) => (
                  <div key={item.key} className="counsel_item">
                    <label className="counsel_label">{item.label}</label>
                    <div className="scale_group">
                      {[0, 1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setNewSession({ ...newSession, [item.key]: score })}
                          className={`scale_btn ${newSession[item.key as keyof typeof newSession] === score ? 'active' : ''}`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <button
              onClick={handleSaveSession}
              disabled={saving}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-base font-bold shadow-lg shadow-primary/20"
            >
              {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              상담 일지 최종 저장
            </button>
          </div>
        )}

        {activeTab === 'survey' && (
          <SurveyTab clientId={id!} counselorId={user?.counselorId} />
        )}

        {activeTab === 'summary' && (
          <ClientSummaryAnalysisTab client={client} />
        )}
      </div>
    </div>
  );
}
