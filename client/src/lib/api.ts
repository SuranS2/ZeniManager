/**
 * api.ts — Supabase data access layer
 * All functions read credentials from localStorage at call time.
 * Falls back to mock data when Supabase is not configured.
 */
import { ROLE_COUNSELOR } from '@shared/const';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import type {
  ClientRow, ClientInsert,
  SessionRow, SessionInsert,
  CounselorRow, CounselorInsert,
  SurveyRow, SurveyInsert,
  MemoCardRow, MemoCardInsert,
} from './supabase';
import {
  MOCK_CLIENTS, MOCK_COUNSELORS, INITIAL_KANBAN,
  type Client, type Counselor, type Session, type KanbanColumn, type MemoCard,
} from './mockData';

// ─── Helper ───────────────────────────────────────────────────────────────────

function sb() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase가 설정되지 않았습니다. 설정 메뉴에서 Supabase URL과 API 키를 입력하세요.');
  return client;
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function fetchClients(counselorId?: string): Promise<ClientRow[]> {
  if (!isSupabaseConfigured()) {
    // Return mock data mapped to ClientRow shape
    return MOCK_CLIENTS.map(c => mockClientToRow(c));
  }
  let q = sb().from('clients').select('*').order('created_at', { ascending: false });
  if (counselorId) q = q.eq('counselor_id', counselorId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchClientById(id: string): Promise<ClientRow | null> {
  if (!isSupabaseConfigured()) {
    const c = MOCK_CLIENTS.find(c => c.id === id);
    return c ? mockClientToRow(c) : null;
  }
  const { data, error } = await sb().from('clients').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createClient(input: ClientInsert): Promise<ClientRow> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const { data, error } = await sb().from('clients').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateClient(id: string, input: Partial<ClientInsert>): Promise<ClientRow> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const { data, error } = await sb()
    .from('clients')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const { error } = await sb().from('clients').delete().eq('id', id);
  if (error) throw error;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function fetchSessions(clientId: string): Promise<SessionRow[]> {
  if (!isSupabaseConfigured()) {
    const c = MOCK_CLIENTS.find(c => c.id === clientId);
    return (c?.sessions ?? []).map(s => mockSessionToRow(s, clientId));
  }
  const { data, error } = await sb()
    .from('sessions')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createSession(input: SessionInsert): Promise<SessionRow> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const { data, error } = await sb().from('sessions').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSession(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const { error } = await sb().from('sessions').delete().eq('id', id);
  if (error) throw error;
}

// ─── Counselors ───────────────────────────────────────────────────────────────

export async function fetchCounselors(): Promise<CounselorRow[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_COUNSELORS.map(c => mockCounselorToRow(c));
  }
  const { data, error } = await sb().from('counselors').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createCounselor(input: CounselorInsert): Promise<CounselorRow> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const { data, error } = await sb().from('counselors').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateCounselor(id: string, input: Partial<CounselorInsert>): Promise<CounselorRow> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const { data, error } = await sb()
    .from('counselors')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCounselor(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const { error } = await sb().from('counselors').delete().eq('id', id);
  if (error) throw error;
}

// ─── Survey Responses ─────────────────────────────────────────────────────────

export async function fetchSurveys(clientId: string): Promise<SurveyRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await sb()
    .from('survey_responses')
    .select('*')
    .eq('client_id', clientId)
    .order('survey_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createSurvey(input: SurveyInsert): Promise<SurveyRow> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const { data, error } = await sb().from('survey_responses').insert(input).select().single();
  if (error) throw error;
  return data;
}

// ─── Memo Cards (Kanban) ──────────────────────────────────────────────────────

export async function fetchMemoCards(counselorId: string): Promise<MemoCardRow[]> {
  if (!isSupabaseConfigured()) {
    const all: MemoCardRow[] = [];
    INITIAL_KANBAN.forEach(col => {
      col.cards.forEach((card, idx) => {
        all.push({
          id: card.id,
          counselor_id: counselorId,
          column_id: col.id,
          title: card.title,
          content: card.content,
          priority: card.priority,
          due_date: card.dueDate ?? null,
          client_name: card.clientName ?? null,
          sort_order: idx,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });
    });
    return all;
  }
  const { data, error } = await sb()
    .from('memo_cards')
    .select('*')
    .eq('counselor_id', counselorId)
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function upsertMemoCard(input: MemoCardInsert): Promise<MemoCardRow> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const { data, error } = await sb()
    .from('memo_cards')
    .upsert({ ...input, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMemoCard(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const { error } = await sb().from('memo_cards').delete().eq('id', id);
  if (error) throw error;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalClients: number;
  inProgress: number;
  employed: number;
  followUpNeeded: number;
  stageBreakdown: { stage: string; count: number }[];
}

export async function fetchDashboardStats(counselorId?: string): Promise<DashboardStats> {
  if (!isSupabaseConfigured()) {
    const clients = counselorId
      ? MOCK_CLIENTS.filter(c => c.counselorId === counselorId)
      : MOCK_CLIENTS;
    const stages = ['초기상담', '심층상담', '취업지원', '취업완료', '사후관리'];
    return {
      totalClients: clients.length,
      inProgress: clients.filter(c => c.processStage !== '취업완료').length,
      employed: clients.filter(c => c.processStage === '취업완료').length,
      followUpNeeded: clients.filter(c => c.followUp).length,
      stageBreakdown: stages.map(s => ({ stage: s, count: clients.filter(c => c.processStage === s).length })),
    };
  }

  let q = sb().from('clients').select('participation_stage, follow_up, employment_type');
  if (counselorId) q = q.eq('counselor_id', counselorId);
  const { data, error } = await q;
  if (error) throw error;

  const rows = data ?? [];
  const stages = ['초기상담', '심층상담', '취업지원', '취업완료', '사후관리'];
  return {
    totalClients: rows.length,
    inProgress: rows.filter(r => r.participation_stage !== '취업완료').length,
    employed: rows.filter(r => r.employment_type != null).length,
    followUpNeeded: rows.filter(r => r.follow_up).length,
    stageBreakdown: stages.map(s => ({
      stage: s,
      count: rows.filter(r => r.participation_stage === s).length,
    })),
  };
}

// ─── Mock → Row converters ────────────────────────────────────────────────────

function mockClientToRow(c: Client): ClientRow {
  return {
    id: c.id,
    seq_no: null,
    year: new Date(c.registeredAt).getFullYear(),
    assignment_type: null,
    name: c.name,
    resident_id_masked: null,
    phone: c.phone,
    last_counsel_date: c.sessions.at(-1)?.date ?? null,
    age: c.age,
    gender: c.gender,
    business_type: null,
    participation_type: null,
    participation_stage: c.processStage,
    competency_grade: null,
    recognition_date: null,
    desired_job: null,
    counsel_notes: c.notes ?? null,
    address: null,
    school: null,
    major: null,
    education_level: null,
    initial_counsel_date: c.registeredAt,
    iap_date: null,
    iap_duration: null,
    allowance_apply_date: null,
    rediagnosis_date: null,
    rediagnosis_yn: null,
    work_exp_type: null,
    work_exp_intent: null,
    work_exp_company: null,
    work_exp_period: null,
    work_exp_completed: null,
    training_name: null,
    training_start: null,
    training_end: null,
    training_allowance: null,
    intensive_start: null,
    intensive_end: null,
    support_end_date: null,
    employment_type: c.employmentStatus === '취업완료' ? '본인' : null,
    employment_date: null,
    employer: null,
    job_title: null,
    salary: null,
    employment_duration: null,
    resignation_date: null,
    retention_1m_date: null,
    retention_1m_yn: null,
    retention_6m_date: null,
    retention_6m_yn: null,
    retention_12m_date: null,
    retention_12m_yn: null,
    retention_18m_date: null,
    retention_18m_yn: null,
    counselor_name: c.counselorName,
    counselor_id: c.counselorId,
    branch: c.branch,
    follow_up: c.followUp,
    score: c.score ?? null,
    created_at: c.registeredAt,
    updated_at: c.registeredAt,
  };
}

function mockSessionToRow(s: Session, clientId: string): SessionRow {
  return {
    id: s.id,
    client_id: clientId,
    date: s.date,
    type: s.type,
    content: s.content,
    counselor_name: s.counselorName,
    counselor_id: null,
    next_action: s.nextAction ?? null,
    created_at: s.date,
  };
}

function mockCounselorToRow(c: Counselor): CounselorRow {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    branch: c.branch,
    client_count: c.clientCount,
    completed_count: c.completedCount,
    joined_at: c.joinedAt,
    status: c.status,
    role: ROLE_COUNSELOR,
    auth_user_id: null,
    created_at: c.joinedAt,
    updated_at: c.joinedAt,
  };
}
