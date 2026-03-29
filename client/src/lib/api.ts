/**
 * api.ts — Supabase data access layer
 * All functions read credentials from localStorage at call time.
 * Some legacy APIs still fall back to mock data when Supabase is not configured.
 * Dashboard memo/calendar APIs require a live DB runtime contract.
 */
import { ROLE_COUNSELOR, normalizeAppRole } from '@shared/const';
import { getSupabaseClient, getSupabaseUrl, isSupabaseConfigured } from './supabase';
import type {
  ClientRow, ClientInsert,
  SessionRow, SessionInsert,
  CounselorRow, CounselorInsert,
  SurveyRow, SurveyInsert,
  MemoCardRow, MemoCardInsert,
} from './supabase';
import {
  MOCK_CLIENTS, MOCK_COUNSELORS, INITIAL_KANBAN,
  type Client, type Counselor, type Session,
} from './mockData';

// ─── Helper ───────────────────────────────────────────────────────────────────

function sb() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase가 설정되지 않았습니다. 설정 메뉴에서 Supabase URL과 API 키를 입력하세요.');
  return client;
}

const SESSION_META_MARKER = '\n\n[__CALENDAR_FLOW_META__]\n';
const SURVEY_RESPONSES_TABLE = 'survey_responses';
const SURVEY_SCHEMA_UNAVAILABLE_CODE = 'SURVEY_SCHEMA_UNAVAILABLE';
const ISO_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type LiveClientRecord = {
  client_id: number;
  client_name: string;
  counselor_id: string | null;
  age: number | null;
  gender_code: string | null;
  phone_encrypted: string | null;
  education_level: string | null;
  school_name: string | null;
  major: string | null;
  business_type_code: number | null;
  participation_type: string | null;
  participation_stage: string | null;
  desired_job_1: string | null;
  hire_type: string | null;
  job_place_start: string | null;
  job_place_end: string | null;
  iap_to: string | null;
  retest_stat: number | null;
  continue_serv_1_stat: string | null;
  driving_yn?: string | null;
  own_car_yn?: string | null;
  memo: string | null;
  business_code?: { participate_type: string | null }[] | null;
  created_at: string | null;
  update_at: string | null;
};

type LiveCounselHistoryRecord = {
  counsel_id: number;
  client_id: number;
  user_id: string | null;
  counsel_date: string;
  start_time: string | null;
  end_time: string | null;
  session_number: number | null;
  counselor_opinion: string | null;
  counsel_type: string | null;
  create_at: string | null;
  document_link?: string | null;
  economic_situation?: number | null;
  social_situation_family?: number | null;
  social_situation_society?: number | null;
  self_esteem?: number | null;
  self_efficacy?: number | null;
  holland_code?: string | null;
  career_fluidity?: number | null;
  info_gathering?: number | null;
  personality_test_result?: string | null;
  life_history_result?: string | null;
  profiling_grade?: string | null;
  memo?: string | null;
};

type LiveUserMemoRecord = {
  memo: string | null;
};

type LiveCounselorRecord = {
  user_id: string | null;
  user_name: string | null;
  department: string | null;
  role: unknown;
};

type ApiModeOptions = {
  strict?: boolean;
};

const DEMO_CLIENT_MEMO_PREFIX = 'counsel_demo_client_memo:';
const missingOptionalTablesByUrl = new Map<string, Set<string>>();

function normalizeMockCounselorId(counselorId?: string): string | undefined {
  if (!counselorId) return undefined;
  const demoMatch = counselorId.match(/^demo-(c\d+)$/);
  return demoMatch?.[1] ?? counselorId;
}

function encodeSessionPayload(type: string, content: string, nextAction?: string | null): string {
  const meta = JSON.stringify({ type, nextAction: nextAction || null });
  return `${content}${SESSION_META_MARKER}${meta}`;
}

function decodeSessionPayload(
  rawContent: string | null | undefined,
  fallbackType?: string | null,
): { content: string | null; type: string; nextAction: string | null } {
  if (!rawContent) {
    return { content: null, type: fallbackType || '상담기록', nextAction: null };
  }

  const markerIndex = rawContent.indexOf(SESSION_META_MARKER);
  if (markerIndex < 0) {
    return { content: rawContent, type: fallbackType || '상담기록', nextAction: null };
  }

  const content = rawContent.slice(0, markerIndex);
  const metaRaw = rawContent.slice(markerIndex + SESSION_META_MARKER.length);

  try {
    const meta = JSON.parse(metaRaw) as { type?: string; nextAction?: string | null };
    return {
      content,
      type: meta.type || fallbackType || '상담기록',
      nextAction: meta.nextAction || null,
    };
  } catch {
    return { content: rawContent, type: fallbackType || '상담기록', nextAction: null };
  }
}

function isMissingSchemaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? error.code : undefined;
  return code === 'PGRST202' || code === 'PGRST205';
}

function getCurrentSchemaCacheKey(): string {
  return getSupabaseUrl() || 'unconfigured';
}

function isOptionalTableMarkedMissing(tableName: string): boolean {
  return missingOptionalTablesByUrl.get(getCurrentSchemaCacheKey())?.has(tableName) ?? false;
}

function markOptionalTableMissing(tableName: string): void {
  const cacheKey = getCurrentSchemaCacheKey();
  const missingTables = missingOptionalTablesByUrl.get(cacheKey) ?? new Set<string>();
  missingTables.add(tableName);
  missingOptionalTablesByUrl.set(cacheKey, missingTables);
}

function createUnsupportedSurveySchemaError(): Error & { code: string } {
  const error = new Error('현재 연결된 DB 스키마에서는 구직준비도 설문 기능을 지원하지 않습니다.') as Error & { code: string };
  error.code = SURVEY_SCHEMA_UNAVAILABLE_CODE;
  return error;
}

function normalizeMemoValue(memo: string | null | undefined): string | null {
  if (memo == null) return null;
  return memo.trim().length > 0 ? memo : null;
}

function assertDashboardSupabaseConfigured(scopeLabel: string): void {
  if (!isSupabaseConfigured()) {
    throw new Error(`${scopeLabel} 기능을 사용하려면 Supabase 설정이 필요합니다.`);
  }
}

function assertDashboardRuntimeContract(scopeLabel: string, authUserId: string | null | undefined): string {
  assertDashboardSupabaseConfigured(scopeLabel);

  const normalizedAuthUserId = authUserId?.trim();
  if (!normalizedAuthUserId) {
    throw new Error(`${scopeLabel} 기능을 호출하려면 로그인한 상담사 user_id가 필요합니다.`);
  }

  return normalizedAuthUserId;
}

function assertClientApiConfiguredIfStrict(scopeLabel: string, options: ApiModeOptions = {}): void {
  if (options.strict) {
    assertDashboardSupabaseConfigured(scopeLabel);
  }
}

function assertDashboardDateRange(scopeLabel: string, rangeStart: string, rangeEnd: string): void {
  if (!ISO_DATE_KEY_PATTERN.test(rangeStart) || !ISO_DATE_KEY_PATTERN.test(rangeEnd)) {
    throw new Error(`${scopeLabel} 기능을 호출하려면 YYYY-MM-DD 형식의 조회 기간이 필요합니다.`);
  }

  if (rangeStart > rangeEnd) {
    throw new Error(`${scopeLabel} 기능을 호출하려면 시작일이 종료일보다 늦지 않은 조회 기간이 필요합니다.`);
  }
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function fetchClients(
  counselorId?: string,
  options: ApiModeOptions = {},
): Promise<ClientRow[]> {
  // Shared API default keeps existing fallback; counselor callers pass strict for live-only behavior.
  if (!isSupabaseConfigured()) {
    assertClientApiConfiguredIfStrict('상담자 목록 조회', options);

    const normalizedCounselorId = normalizeMockCounselorId(counselorId);
    return MOCK_CLIENTS
      .filter(c => !normalizedCounselorId || c.counselorId === normalizedCounselorId)
      .map(c => mockClientToRow(c));
  }

  let q = sb()
    .from('client')
    .select(`
      client_id,
      client_name,
      counselor_id,
      age,
      gender_code,
      phone_encrypted,
      education_level,
      school_name,
      major,
      business_type_code,
      participation_type,
      participation_stage,
      desired_job_1,
      hire_type,
      job_place_start,
      job_place_end,
      iap_to,
      retest_stat,
      continue_serv_1_stat,
      memo,
      business_code (
        participate_type
      ),
      created_at,
      update_at
    `)
    .order('iap_to', { ascending: true, nullsFirst: false });

  if (counselorId) q = q.eq('counselor_id', counselorId);

  const { data, error } = await q;
  if (error) {
    if (isMissingSchemaError(error)) {
      const mockClients = MOCK_CLIENTS.map(c => mockClientToRow(c));
      return counselorId
        ? mockClients.filter(client => client.counselor_id === counselorId)
        : mockClients;
    }
    throw error;
  }
  return ((data ?? []) as LiveClientRecord[]).map(row => liveClientToRow(row));
}

export async function fetchClientById(
  id: string,
  options: ApiModeOptions = {},
): Promise<ClientRow | null> {
  if (!isSupabaseConfigured()) {
    assertClientApiConfiguredIfStrict('상담자 상세 조회', options);

    const c = MOCK_CLIENTS.find(c => c.id === id);
    return c ? mockClientToRow(c) : null;
  }

  const numericId = Number(id);
  if (Number.isNaN(numericId)) return null;

  const { data, error } = await sb()
    .from('client')
    .select(`
      client_id,
      client_name,
      counselor_id,
      age,
      gender_code,
      phone_encrypted,
      education_level,
      school_name,
      major,
      business_type_code,
      participation_type,
      participation_stage,
      desired_job_1,
      hire_type,
      job_place_start,
      job_place_end,
      iap_to,
      retest_stat,
      continue_serv_1_stat,
      memo,
      created_at,
      update_at
    `)
    .eq('client_id', numericId)
    .single();

  if (error) {
    if (isMissingSchemaError(error)) {
      const c = MOCK_CLIENTS.find(client => client.id === id);
      return c ? mockClientToRow(c) : null;
    }
    throw error;
  }
  return liveClientToRow(data as LiveClientRecord);
}

export async function createClient(
  input: Partial<ClientInsert> & Pick<ClientInsert, 'name' | 'phone'>,
): Promise<ClientRow> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const normalizedName = input.name.trim();
  const normalizedPhone = input.phone?.trim() ?? '';

  if (!normalizedName || !normalizedPhone) {
    throw new Error('이름과 연락처는 필수 입력 항목입니다.');
  }

  const businessTypeCode = input.business_type ? Number(input.business_type) : null;
  const payload = {
    client_name: normalizedName,
    counselor_id: input.counselor_id || null,
    age: input.age ?? null,
    gender_code:
      input.gender === '남' ? 'M' :
      input.gender === '여' ? 'F' :
      null,
    phone_encrypted: normalizedPhone,
    education_level: input.education_level ?? null,
    school_name: input.school ?? null,
    major: input.major ?? null,
    business_type_code: Number.isNaN(businessTypeCode) ? null : businessTypeCode,
    participation_type: input.participation_type ?? input.business_type ?? null,
    participation_stage: input.participation_stage ?? null,
    desired_job_1: input.desired_job ?? null,
    iap_to: input.iap_to ?? null,
    retest_stat: input.retest_stat ?? null,
    continue_serv_1_stat: input.continue_serv_1_stat ?? null,
    memo: input.memo ?? input.counsel_notes ?? null,
    update_at: new Date().toISOString().slice(0, 10),
  };

  const { data, error } = await sb()
    .from('client')
    .insert(payload)
    .select(`
      client_id,
      client_name,
      counselor_id,
      age,
      gender_code,
      phone_encrypted,
      education_level,
      school_name,
      major,
      business_type_code,
      participation_type,
      participation_stage,
      desired_job_1,
      hire_type,
      job_place_start,
      job_place_end,
      iap_to,
      retest_stat,
      continue_serv_1_stat,
      memo,
      business_code (
        participate_type
      ),
      created_at,
      update_at
    `)
    .single();
  if (error) throw error;
  return liveClientToRow(data as LiveClientRecord);
}

export async function updateClient(id: string, input: Partial<ClientInsert>): Promise<ClientRow> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const { data, error } = await sb()
    .from('client')
    .update({ ...input, update_at: new Date().toISOString() })
    .eq('client_id', Number(id))
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const { error } = await sb().from('client').delete().eq('client_id', Number(id));
  if (error) throw error;
}

export async function fetchClientMemo(
  clientId: string,
  options: ApiModeOptions = {},
): Promise<string | null> {
  if (!clientId) return null;

  if (!isSupabaseConfigured()) {
    assertClientApiConfiguredIfStrict('상담자 메모 조회', options);
    return localStorage.getItem(`${DEMO_CLIENT_MEMO_PREFIX}${clientId}`) || null;
  }

  const numericId = Number(clientId);
  if (Number.isNaN(numericId)) return null;

  const { data, error } = await sb()
    .from('client')
    .select('memo')
    .eq('client_id', numericId)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) {
      return null;
    }
    throw error;
  }

  return normalizeMemoValue((data as LiveUserMemoRecord | null)?.memo ?? null);
}

export async function updateClientMemo(
  clientId: string,
  memo: string | null,
  options: ApiModeOptions = {},
): Promise<string | null> {
  const normalizedMemo = normalizeMemoValue(memo);

  if (!clientId) throw new Error('유효한 상담자 ID가 아닙니다.');

  if (!isSupabaseConfigured()) {
    assertClientApiConfiguredIfStrict('상담자 메모 저장', options);
    const key = `${DEMO_CLIENT_MEMO_PREFIX}${clientId}`;
    if (normalizedMemo == null) localStorage.removeItem(key);
    else localStorage.setItem(key, normalizedMemo);
    return normalizedMemo;
  }

  const numericId = Number(clientId);
  if (Number.isNaN(numericId)) throw new Error('유효한 상담자 ID가 아닙니다.');

  const { error } = await sb()
    .from('client')
    .update({
      memo: normalizedMemo,
      update_at: new Date().toISOString().slice(0, 10),
    })
    .eq('client_id', numericId);

  if (error) throw error;

  const refreshedMemo = await fetchClientMemo(clientId, options);
  if (refreshedMemo !== normalizedMemo) {
    if (refreshedMemo == null && normalizedMemo == null) {
      return null;
    }
    throw new Error('피상담자 메모 저장 후 값을 다시 확인하지 못했습니다.');
  }

  return refreshedMemo;
}

export async function fetchMyMemo(authUserId: string): Promise<string | null> {
  const scopedAuthUserId = assertDashboardRuntimeContract('개인 메모', authUserId);

  const { data, error } = await sb()
    .from('user')
    .select('memo')
    .eq('user_id', scopedAuthUserId)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) {
      return null;
    }
    throw error;
  }

  return normalizeMemoValue((data as LiveUserMemoRecord | null)?.memo ?? null);
}

export async function updateMyMemo(authUserId: string, memo: string | null): Promise<string | null> {
  const normalizedMemo = normalizeMemoValue(memo);
  const scopedAuthUserId = assertDashboardRuntimeContract('개인 메모', authUserId);

  const { error, count } = await sb()
    .from('user')
    .update({ memo: normalizedMemo }, { count: 'exact' })
    .eq('user_id', scopedAuthUserId);

  if (error) throw error;
  if (count === 0) {
    throw new Error('상담사 메모 UPDATE가 적용되지 않았습니다. public.user의 UPDATE 정책과 user_id/auth.uid() 매핑을 확인하세요.');
  }

  const refreshedMemo = await fetchMyMemo(scopedAuthUserId);
  if (refreshedMemo !== normalizedMemo) {
    if (refreshedMemo == null && normalizedMemo == null) {
      return null;
    }
    throw new Error('상담사 메모 저장 후 재조회가 되지 않았습니다. public.user SELECT/UPDATE 정책을 함께 확인하세요.');
  }

  return refreshedMemo;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function fetchSessions(
  clientId: string,
  options: ApiModeOptions = {},
): Promise<SessionRow[]> {
  if (!isSupabaseConfigured()) {
    assertClientApiConfiguredIfStrict('상담 이력 조회', options);

    const c = MOCK_CLIENTS.find(c => c.id === clientId);
    return (c?.sessions ?? []).map(s => mockSessionToRow(s, clientId));
  }

  const numericClientId = Number(clientId);
  if (Number.isNaN(numericClientId)) return [];

  const { data, error } = await sb()
    .from('counsel_history')
    .select('counsel_id, client_id, user_id, counsel_date, start_time, end_time, session_number, counselor_opinion, counsel_type, document_link, economic_situation, social_situation_family, social_situation_society, self_esteem, self_efficacy, holland_code, career_fluidity, info_gathering, personality_test_result, life_history_result, profiling_grade, memo, create_at')
    .eq('client_id', numericClientId)
    .order('counsel_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) {
      const c = MOCK_CLIENTS.find(client => client.id === clientId);
      return (c?.sessions ?? []).map(s => mockSessionToRow(s, clientId));
    }
    throw error;
  }
  return ((data ?? []) as LiveCounselHistoryRecord[]).map(row => liveCounselHistoryToSessionRow(row));
}

export async function createSession(input: SessionInsert): Promise<SessionRow> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');

  const numericClientId = Number(input.client_id);
  if (Number.isNaN(numericClientId)) throw new Error('유효한 상담자 ID가 아닙니다.');
  if (!input.counselor_id) throw new Error('로그인한 상담사 정보가 없습니다.');

  const payload: any = {
    client_id: numericClientId,
    user_id: input.counselor_id,
    counsel_date: input.date,
    create_at: input.date,
    counselor_opinion: input.content || '',
    counsel_type: input.type || '상담기록',
    start_time: input.start_time || null,
    end_time: input.end_time || null,
    document_link: input.document_link || null,
    economic_situation: input.economic_situation ?? null,
    social_situation_family: input.social_situation_family ?? null,
    social_situation_society: input.social_situation_society ?? null,
    self_esteem: input.self_esteem ?? null,
    self_efficacy: input.self_efficacy ?? null,
    holland_code: input.holland_code || null,
    career_fluidity: input.career_fluidity ?? null,
    info_gathering: input.info_gathering ?? null,
    personality_test_result: input.personality_test_result || null,
    life_history_result: input.life_history_result || null,
    profiling_grade: input.profiling_grade || null,
    memo: input.memo || null,
  };

  const { data, error } = await sb()
    .from('counsel_history')
    .insert(payload)
    .select('counsel_id, client_id, user_id, counsel_date, start_time, end_time, session_number, counselor_opinion, counsel_type, document_link, economic_situation, social_situation_family, social_situation_society, self_esteem, self_efficacy, holland_code, career_fluidity, info_gathering, personality_test_result, life_history_result, profiling_grade, memo, create_at')
    .single();

  if (error) throw error;
  return liveCounselHistoryToSessionRow(data as LiveCounselHistoryRecord);
}

export async function updateSession(
  id: string,
  input: Partial<SessionInsert>,
  options: ApiModeOptions = {},
): Promise<void> {
  if (!isSupabaseConfigured()) {
    assertClientApiConfiguredIfStrict('상담 이력 수정', options);
    return;
  }

  const { error } = await sb()
    .from('counsel_history')
    .update({ 
      counselor_opinion: input.content || '',
      counsel_type: input.type || '상담기록',
      counsel_date: input.date,
    })
    .eq('counsel_id', Number(id));

  if (error) throw error;
}

export async function deleteSession(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const counselId = Number(id);
  if (Number.isNaN(counselId)) throw new Error('유효한 상담 이력 ID가 아닙니다.');
  const { error } = await sb().from('counsel_history').delete().eq('counsel_id', counselId);
  if (error) throw error;
}

// ─── Counselors ───────────────────────────────────────────────────────────────

export async function fetchCounselors(): Promise<CounselorRow[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_COUNSELORS.map(c => mockCounselorToRow(c));
  }

  const { data, error } = await sb().from('user').select(`
    user_id,
    role,
    user_name,
    department,
    memo,
    client (
      client_id,
      job_place_support_end
    )
  `).order('user_name');

  if (error) {
    if (isMissingSchemaError(error)) {
      return MOCK_COUNSELORS.map(c => mockCounselorToRow(c));
    }
    throw error;
  }

  const today = new Date().toISOString().split('T')[0];

  return (data ?? []).map((row: any) => {
    const clients = row.client || [];
    
    const completedCount = clients.filter((c: any) => 
      c.job_place_support_end && c.job_place_support_end > today
    ).length;

    const inProgressCount = clients.length - completedCount;

    return {
      user_id: row.user_id,
      role: row.role,
      user_name: row.user_name,
      department: row.department,
      memo: row.memo,
      client_count: inProgressCount,
      completed_count: completedCount,
    } as CounselorRow;
  });
}

export async function createCounselor(input: CounselorInsert): Promise<CounselorRow> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  
  // 주의: user 테이블에 insert 하려면 auth.users와 연동된 UUID가 필요합니다.
  const { data, error } = await sb().from('user').insert(input).select().single();
  
  if (error) throw error;
  return data;
}

export async function updateCounselor(id: string, input: Partial<CounselorInsert>): Promise<CounselorRow> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const { data, error } = await sb()
    .from('user')
    .update({ ...input })
    .eq('user_id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCounselor(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const { error } = await sb().from('user').delete().eq('user_id', id);
  if (error) throw error;
}

// ─── Survey Responses ─────────────────────────────────────────────────────────

export async function fetchSurveys(
  clientId: string,
  options: ApiModeOptions = {},
): Promise<SurveyRow[]> {
  if (!isSupabaseConfigured()) {
    assertClientApiConfiguredIfStrict('구직준비도 설문 조회', options);
    return [];
  }
  if (isOptionalTableMarkedMissing(SURVEY_RESPONSES_TABLE)) return [];
  const { data, error } = await sb()
    .from(SURVEY_RESPONSES_TABLE)
    .select('*')
    .eq('client_id', clientId)
    .order('survey_date', { ascending: false });
  if (error) {
    if (isMissingSchemaError(error)) {
      markOptionalTableMissing(SURVEY_RESPONSES_TABLE);
      return [];
    }
    throw error;
  }
  return data ?? [];
}

export async function createSurvey(input: SurveyInsert): Promise<SurveyRow> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  if (isOptionalTableMarkedMissing(SURVEY_RESPONSES_TABLE)) {
    throw createUnsupportedSurveySchemaError();
  }
  const { data, error } = await sb().from(SURVEY_RESPONSES_TABLE).insert(input).select().single();
  if (error) {
    if (isMissingSchemaError(error)) {
      markOptionalTableMissing(SURVEY_RESPONSES_TABLE);
      throw createUnsupportedSurveySchemaError();
    }
    throw error;
  }
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
          update_at: new Date().toISOString(),
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
  if (error) {
    if (isMissingSchemaError(error)) {
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
            update_at: new Date().toISOString(),
          });
        });
      });
      return all;
    }
    throw error;
  }
  return data ?? [];
}

export async function upsertMemoCard(input: MemoCardInsert): Promise<MemoCardRow> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 설정이 필요합니다.');
  const { data, error } = await sb()
    .from('memo_cards')
    .upsert({ ...input, update_at: new Date().toISOString() })
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
  averageScore: number | null;
  scoredClients: number;
  unscoredClients: number;
  scoreDistribution: { range: string; count: number }[];
  stageBreakdown: { stage: string; count: number }[];
}

export interface DashboardMonthlyStat {
  month: string;
  clients: number;
  sessions: number;
}

export interface DashboardCalendarEntry {
  counselId: string;
  clientId: string;
  clientName: string;
  counselDate: string;
  startTime: string | null;
  endTime: string | null;
  participationStage: string | null;
}

const DASHBOARD_STAGE_ORDER = [
  '초기상담',
  '심층상담',
  '취업지원',
  '직업훈련',
  '취업알선',
  '취업완료',
  '사후관리',
];

function compareDashboardStage(a: string, b: string): number {
  const aIndex = DASHBOARD_STAGE_ORDER.indexOf(a);
  const bIndex = DASHBOARD_STAGE_ORDER.indexOf(b);

  if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
  if (aIndex >= 0) return -1;
  if (bIndex >= 0) return 1;
  return a.localeCompare(b, 'ko');
}

const DASHBOARD_SCORE_RANGES = [
  { label: '0-59', min: 0, max: 59 },
  { label: '60-69', min: 60, max: 69 },
  { label: '70-79', min: 70, max: 79 },
  { label: '80-89', min: 80, max: 89 },
  { label: '90-100', min: 90, max: 100 },
];

function buildDashboardScoreDistribution(scores: number[]): { range: string; count: number }[] {
  return DASHBOARD_SCORE_RANGES.map(range => ({
    range: range.label,
    count: scores.filter(score => score >= range.min && score <= range.max).length,
  }));
}

function formatDashboardMonthLabel(monthKey: string): string {
  return `${Number(monthKey.slice(5, 7))}월`;
}

function buildRecentDashboardMonthKeys(monthCount: number): string[] {
  const normalizedMonthCount = Math.max(1, Math.min(24, Math.trunc(monthCount)));
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  cursor.setMonth(cursor.getMonth() - (normalizedMonthCount - 1));

  return Array.from({ length: normalizedMonthCount }, (_, index) => {
    const date = new Date(cursor.getFullYear(), cursor.getMonth() + index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
}

function createDashboardMonthlyBuckets(monthCount: number): DashboardMonthlyStat[] {
  return buildRecentDashboardMonthKeys(monthCount).map(monthKey => ({
    month: formatDashboardMonthLabel(monthKey),
    clients: 0,
    sessions: 0,
  }));
}

export async function searchDashboardClients(
  authUserId: string,
  rawQuery: string,
): Promise<ClientRow[]> {
  const scopedAuthUserId = assertDashboardRuntimeContract('대시보드 검색', authUserId);
  const normalizedQuery = rawQuery.trim();
  if (!normalizedQuery) return [];

  const safeQuery = normalizedQuery.replace(/[%(),]/g, '');
  if (!safeQuery) return [];

  const likeQuery = `%${safeQuery}%`;
  const { data, error } = await sb()
    .from('client')
    .select(`
      client_id,
      client_name,
      counselor_id,
      age,
      gender_code,
      phone_encrypted,
      education_level,
      school_name,
      major,
      business_type_code,
      participation_type,
      participation_stage,
      desired_job_1,
      hire_type,
      job_place_start,
      job_place_end,
      iap_to,
      retest_stat,
      continue_serv_1_stat,
      memo,
      business_code (
        participate_type
      ),
      created_at,
      update_at
    `)
    .eq('counselor_id', scopedAuthUserId)
    .or(`client_name.ilike.${likeQuery},phone_encrypted.ilike.${likeQuery},desired_job_1.ilike.${likeQuery}`)
    .order('update_at', { ascending: false, nullsFirst: false })
    .limit(10);

  if (error) throw error;
  return ((data ?? []) as LiveClientRecord[]).map(row => liveClientToRow(row));
}

export async function fetchDashboardStats(authUserId?: string): Promise<DashboardStats> {
  assertDashboardSupabaseConfigured('대시보드 통계');
  const scopedAuthUserId = authUserId?.trim() || null;

  let query = sb()
    .from('client')
    .select('participation_stage, retest_stat, continue_serv_1_stat');

  if (scopedAuthUserId) {
    query = query.eq('counselor_id', scopedAuthUserId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    participation_stage: string | null;
    retest_stat: number | null;
    continue_serv_1_stat: number | null;
  }>;
  const stageCounts = new Map<string, number>();
  const scores = rows
    .map(row => (typeof row.retest_stat === 'number' ? row.retest_stat : null))
    .filter((score): score is number => score != null);

  rows.forEach(row => {
    const stage = row.participation_stage?.trim();
    if (!stage) return;
    stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);
  });

  const stageBreakdown = Array.from(stageCounts.entries())
    .sort(([stageA], [stageB]) => compareDashboardStage(stageA, stageB))
    .map(([stage, count]) => ({ stage, count }));

  return {
    totalClients: rows.length,
    inProgress: rows.filter(row => row.participation_stage !== '취업완료').length,
    employed: rows.filter(row => row.participation_stage === '취업완료').length,
    followUpNeeded: rows.filter(
      row => typeof row.continue_serv_1_stat === 'number' && row.continue_serv_1_stat > 0,
    ).length,
    averageScore: scores.length > 0 ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)) : null,
    scoredClients: scores.length,
    unscoredClients: rows.length - scores.length,
    scoreDistribution: buildDashboardScoreDistribution(scores),
    stageBreakdown,
  };
}

export async function fetchDashboardMonthlyStats(
  authUserId: string,
  monthCount = 12,
): Promise<DashboardMonthlyStat[]> {
  const scopedAuthUserId = assertDashboardRuntimeContract('대시보드 월간 통계', authUserId);
  const monthKeys = buildRecentDashboardMonthKeys(monthCount);
  const [firstMonthKey, lastMonthKey] = [monthKeys[0], monthKeys[monthKeys.length - 1]];
  const rangeStart = `${firstMonthKey}-01`;
  const rangeEndDate = new Date(Number(lastMonthKey.slice(0, 4)), Number(lastMonthKey.slice(5, 7)), 0);
  const rangeEnd = `${rangeEndDate.getFullYear()}-${String(rangeEndDate.getMonth() + 1).padStart(2, '0')}-${String(rangeEndDate.getDate()).padStart(2, '0')}`;

  const { data: histories, error } = await sb()
    .from('counsel_history')
    .select('client_id, counsel_date')
    .eq('user_id', scopedAuthUserId)
    .gte('counsel_date', rangeStart)
    .lte('counsel_date', rangeEnd);

  if (error) throw error;

  const sessionCountByMonth = new Map<string, number>();
  const clientIdsByMonth = new Map<string, Set<number>>();

  (histories ?? []).forEach(row => {
    if (!row.counsel_date) return;
    const monthKey = row.counsel_date.slice(0, 7);
    if (!monthKeys.includes(monthKey)) return;

    sessionCountByMonth.set(monthKey, (sessionCountByMonth.get(monthKey) ?? 0) + 1);
    if (typeof row.client_id === 'number') {
      const clientIds = clientIdsByMonth.get(monthKey) ?? new Set<number>();
      clientIds.add(row.client_id);
      clientIdsByMonth.set(monthKey, clientIds);
    }
  });

  return monthKeys.map(monthKey => ({
    month: formatDashboardMonthLabel(monthKey),
    clients: clientIdsByMonth.get(monthKey)?.size ?? 0,
    sessions: sessionCountByMonth.get(monthKey) ?? 0,
  }));
}

export async function fetchDashboardCalendarMonthCounts(
  authUserId: string,
  monthStart: string,
  monthEnd: string,
): Promise<Record<string, number>> {
  const scopedAuthUserId = assertDashboardRuntimeContract('캘린더', authUserId);
  assertDashboardDateRange('캘린더', monthStart, monthEnd);

  const { data: histories, error } = await sb()
    .from('counsel_history')
    .select('client_id, counsel_date')
    .eq('user_id', scopedAuthUserId)
    .gte('counsel_date', monthStart)
    .lte('counsel_date', monthEnd);

  if (error) throw error;

  const clientIds = Array.from(
    new Set((histories ?? []).map(row => row.client_id).filter((id): id is number => typeof id === 'number')),
  );
  if (clientIds.length === 0) return {};

  const { data: clients, error: clientError } = await sb()
    .from('client')
    .select('client_id')
    .eq('counselor_id', scopedAuthUserId)
    .in('client_id', clientIds);

  if (clientError) throw clientError;

  const allowedClientIds = new Set((clients ?? []).map(row => row.client_id));

  return (histories ?? []).reduce<Record<string, number>>((acc, row) => {
    if (!row.counsel_date || !allowedClientIds.has(row.client_id)) return acc;
    acc[row.counsel_date] = (acc[row.counsel_date] ?? 0) + 1;
    return acc;
  }, {});
}

export async function fetchDashboardCalendarEntries(
  authUserId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<DashboardCalendarEntry[]> {
  const scopedAuthUserId = assertDashboardRuntimeContract('캘린더', authUserId);
  assertDashboardDateRange('캘린더', rangeStart, rangeEnd);

  const { data: histories, error } = await sb()
    .from('counsel_history')
    .select('counsel_id, client_id, user_id, counsel_date, start_time, end_time, session_number, counselor_opinion, counsel_type, document_link, economic_situation, social_situation_family, social_situation_society, self_esteem, self_efficacy, holland_code, career_fluidity, info_gathering, personality_test_result, life_history_result, profiling_grade, memo, create_at')
    .eq('user_id', scopedAuthUserId)
    .gte('counsel_date', rangeStart)
    .lte('counsel_date', rangeEnd)
    .order('counsel_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) throw error;

  const clientIds = Array.from(
    new Set((histories ?? []).map(row => row.client_id).filter((id): id is number => typeof id === 'number')),
  );
  if (clientIds.length === 0) return [];

  const { data: clients, error: clientError } = await sb()
    .from('client')
    .select('client_id, client_name, counselor_id, participation_stage')
    .eq('counselor_id', scopedAuthUserId)
    .in('client_id', clientIds);

  if (clientError) throw clientError;

  const clientMap = new Map((clients ?? []).map(client => [client.client_id, client]));

  return (histories ?? [])
    .map(row => {
      const client = row.client_id != null ? clientMap.get(row.client_id) : undefined;
      if (!client || !row.counsel_date) return null;
      return {
        counselId: String(row.counsel_id),
        clientId: String(client.client_id),
        clientName: client.client_name,
        counselDate: row.counsel_date,
        startTime: row.start_time,
        endTime: row.end_time,
        participationStage: client.participation_stage,
      } satisfies DashboardCalendarEntry;
    })
    .filter((row): row is DashboardCalendarEntry => row !== null);
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
    iap_to: null,
    retest_stat: null,
    continue_serv_1_stat: null,
    driving_yn: null,
    own_car_yn: null,
    memo: null,
    participate_type: null,
    created_at: c.registeredAt,
    update_at: c.registeredAt,
  };
}

function liveClientToRow(row: LiveClientRecord): ClientRow {
  const createdAt = row.created_at ?? new Date().toISOString();
  const updatedAt = row.update_at
    ? new Date(`${row.update_at}T00:00:00`).toISOString()
    : createdAt;

  return {
    id: String(row.client_id),
    seq_no: row.client_id ?? null,
    year: createdAt ? new Date(createdAt).getFullYear() : null,
    assignment_type: null,
    name: row.client_name,
    resident_id_masked: null,
    phone: row.phone_encrypted ?? null,
    last_counsel_date: null,
    age: row.age ?? null,
    gender: row.gender_code === 'M' ? '남' : row.gender_code === 'F' ? '여' : null,
    business_type: row.business_type_code != null ? String(row.business_type_code) : null,
    participation_type: row.participation_type ?? null,
    participation_stage: row.participation_stage ?? null,
    competency_grade: null,
    recognition_date: null,
    desired_job: row.desired_job_1 ?? null,
    counsel_notes: null,
    address: null,
    school: row.school_name ?? null,
    major: row.major ?? null,
    education_level: row.education_level ?? null,
    initial_counsel_date: createdAt ? createdAt.split('T')[0] : null,
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
    training_end: row.job_place_end ?? null,
    training_allowance: null,
    intensive_start: null,
    intensive_end: null,
    support_end_date: null,
    employment_type: row.hire_type ?? null,
    employment_date: row.job_place_start ?? null,
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
    counselor_name: null,
    counselor_id: row.counselor_id ?? null,
    branch: null,
    follow_up: false,
    score: null,
    iap_to: row.iap_to ?? null,
    retest_stat: row.retest_stat ?? null,
    continue_serv_1_stat: row.continue_serv_1_stat ?? null,
    driving_yn: row.driving_yn ?? null,
    own_car_yn: row.own_car_yn ?? null,
    memo: row.memo ?? null,
    participate_type: Array.isArray(row.business_code) ? row.business_code[0]?.participate_type ?? null : null,
    created_at: createdAt,
    update_at: updatedAt,
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
    session_number: null,
    created_at: s.date,
  };
}

function liveCounselHistoryToSessionRow(row: LiveCounselHistoryRecord): SessionRow {
  const decoded = decodeSessionPayload(
    row.counselor_opinion,
    '일반상담',
  );

  return {
    id: String(row.counsel_id),
    client_id: String(row.client_id),
    date: row.counsel_date,
    type: row.counsel_type || decoded.type, // prioritization
    content: row.counsel_type ? row.counselor_opinion : decoded.content, // only use decoder if no new column data
    counselor_name: null,
    counselor_id: row.user_id ?? null,
    next_action: decoded.nextAction,
    session_number: row.session_number ?? null,
    start_time: row.start_time ?? null,
    end_time: row.end_time ?? null,
    document_link: row.document_link ?? null,
    economic_situation: row.economic_situation ?? null,
    social_situation_family: row.social_situation_family ?? null,
    social_situation_society: row.social_situation_society ?? null,
    self_esteem: row.self_esteem ?? null,
    self_efficacy: row.self_efficacy ?? null,
    holland_code: row.holland_code ?? null,
    career_fluidity: row.career_fluidity ?? null,
    info_gathering: row.info_gathering ?? null,
    personality_test_result: row.personality_test_result ?? null,
    life_history_result: row.life_history_result ?? null,
    profiling_grade: row.profiling_grade ?? null,
    memo: row.memo ?? null,
    created_at: row.create_at ?? row.counsel_date,
  };
}

function mockCounselorToRow(c: Counselor): CounselorRow {
  return {
    user_id: c.user_id,
    user_name: c.user_name,
    department: c.department,
    memo: c.memo || null,
    role: c.role as any,
    client_count: c.clientCount,
    completed_count: c.completedCount,
  };
}


function liveCounselorToRow(c: LiveCounselorRecord): CounselorRow {
  const joinedAt = new Date().toISOString();

  return {
    id: c.user_id ?? crypto.randomUUID(),
    name: c.user_name ?? '이름 미상',
    department: c.department,
    client_count: 0,
    completed_count: 0,
    joined_at: joinedAt,
    role: normalizeAppRole(c.role),
    auth_user_id: c.user_id,
    created_at: joinedAt,
    update_at: joinedAt,
  };
}
