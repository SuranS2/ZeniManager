import { getSupabaseClient, isSupabaseConfigured } from "./supabase";
import type {
  CompetencyScoring,
  RecommendationResult,
  StructuredSummaryJson,
} from "./summaryAnalysisPipeline";

const SUMMARY_ANALYSIS_TIMEOUT_MS = 15000;
const SUMMARY_ANALYSIS_TABLE = "client_summary_analysis";

function getElectronApi() {
  if (typeof window === "undefined") return undefined;
  return window.electronAPI;
}

export interface StoredSummaryAnalysis {
  client_id: number;
  structured_json: StructuredSummaryJson;
  competency_scoring: CompetencyScoring;
  recommendation: RecommendationResult;
  prompt_snapshot: Record<string, unknown>;
  file_refs?: Array<{
    name: string;
    path: string;
    url: string;
    uploaded_at: string;
  }> | null;
  updated_at: string;
}

function isMissingSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? error.code : undefined;
  return code === "PGRST202" || code === "PGRST205";
}

async function withTimeout<T>(
  promise: PromiseLike<T>,
  message: string,
  timeoutMs = SUMMARY_ANALYSIS_TIMEOUT_MS
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function fetchClientSummaryAnalysis(
  clientId: string
): Promise<StoredSummaryAnalysis | null> {
  console.log("[summaryAnalysisStore] fetch:start", {
    clientId,
    table: SUMMARY_ANALYSIS_TABLE,
    isSupabaseConfigured: isSupabaseConfigured(),
  });
  if (!isSupabaseConfigured()) return null;
  const client = getSupabaseClient();
  if (!client) {
    console.warn("[summaryAnalysisStore] fetch:no-client", {
      clientId,
      table: SUMMARY_ANALYSIS_TABLE,
    });
    return null;
  }

  const { data, error } = await withTimeout(
    client
      .from(SUMMARY_ANALYSIS_TABLE)
      .select(
        "client_id, structured_json, competency_scoring, recommendation, prompt_snapshot, file_refs, updated_at"
      )
      .eq("client_id", Number(clientId))
      .maybeSingle(),
    "요약/분석 데이터를 불러오는 중 응답이 지연되고 있습니다."
  );

  if (error) {
    console.error("[summaryAnalysisStore] fetch:error", {
      clientId,
      table: SUMMARY_ANALYSIS_TABLE,
      error,
    });
    if (isMissingSchemaError(error)) return null;
    throw error;
  }

  console.log("[summaryAnalysisStore] fetch:success", {
    clientId,
    table: SUMMARY_ANALYSIS_TABLE,
    hasData: Boolean(data),
  });
  return data as StoredSummaryAnalysis | null;
}

export async function upsertClientSummaryAnalysis(input: {
  clientId: string;
  structuredJson?: StructuredSummaryJson;
  competencyScoring?: CompetencyScoring;
  recommendation?: RecommendationResult;
  promptSnapshot?: Record<string, unknown>;
  fileRefs?: Array<{
    name: string;
    path: string;
    url: string;
    uploaded_at: string;
  }>;
}): Promise<void> {
  console.log("[summaryAnalysisStore] upsert:start", {
    clientId: input.clientId,
    table: SUMMARY_ANALYSIS_TABLE,
    hasStructuredJson: Boolean(input.structuredJson),
    hasCompetencyScoring: Boolean(input.competencyScoring),
    hasRecommendation: Boolean(input.recommendation),
    hasPromptSnapshot: Boolean(input.promptSnapshot),
    fileRefCount: input.fileRefs?.length ?? 0,
  });
  const electronAPI = getElectronApi();
  if (electronAPI?.isElectron && electronAPI.saveSummaryAnalysis) {
    const result = await electronAPI.saveSummaryAnalysis({
      clientId: input.clientId,
      structuredJson: input.structuredJson,
      competencyScoring: input.competencyScoring,
      recommendation: input.recommendation,
      promptSnapshot: input.promptSnapshot,
      fileRefs: input.fileRefs,
    });

    if (!result?.success) {
      throw new Error(result?.error || "Electron 저장에 실패했습니다.");
    }

    console.log("[summaryAnalysisStore] upsert:success", {
      clientId: input.clientId,
      table: SUMMARY_ANALYSIS_TABLE,
      mode: result.mode ?? "electron-main",
    });
    return;
  }
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase가 설정되지 않아 저장할 수 없습니다.");
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase client를 초기화할 수 없습니다.");
  }

  const payload: Record<string, unknown> = {
    client_id: Number(input.clientId),
    updated_at: new Date().toISOString(),
  };

  if (input.structuredJson) payload.structured_json = input.structuredJson;
  if (input.competencyScoring)
    payload.competency_scoring = input.competencyScoring;
  if (input.recommendation) payload.recommendation = input.recommendation;
  if (input.promptSnapshot) payload.prompt_snapshot = input.promptSnapshot;
  if (input.fileRefs) payload.file_refs = input.fileRefs;

  // Avoid a pre-read before saving; the extra fetch is the request that is
  // timing out in Electron during save.
  const { error } = await withTimeout(
    client.from(SUMMARY_ANALYSIS_TABLE).upsert(payload, {
      onConflict: "client_id",
    }),
    "분석 결과 저장 중 응답이 지연되고 있습니다."
  );

  if (error) {
    if (isMissingSchemaError(error)) {
      throw new Error(
        `${SUMMARY_ANALYSIS_TABLE} 테이블이 없어 저장할 수 없습니다. SQL 스키마를 먼저 적용해 주세요.`
      );
    }
    throw error;
  }

  console.log("[summaryAnalysisStore] upsert:success", {
    clientId: input.clientId,
    table: SUMMARY_ANALYSIS_TABLE,
    mode: "upsert",
  });
}

export async function uploadSummaryAnalysisFiles(input: {
  clientId: string;
  files: File[];
}): Promise<
  Array<{ name: string; path: string; url: string; uploaded_at: string }>
> {
  console.log("[summaryAnalysisStore] upload:start", {
    clientId: input.clientId,
    fileCount: input.files.length,
  });
  const electronAPI = getElectronApi();
  if (electronAPI?.isElectron && electronAPI.uploadSummaryAnalysisFiles) {
    const files = await Promise.all(
      input.files.map(async file => ({
        name: file.name,
        type: file.type,
        data: new Uint8Array(await file.arrayBuffer()),
      }))
    );
    const refs = await electronAPI.uploadSummaryAnalysisFiles({
      clientId: input.clientId,
      files,
    });
    console.log("[summaryAnalysisStore] upload:success", {
      clientId: input.clientId,
      fileCount: refs.length,
      mode: "electron-main",
    });
    return refs;
  }
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase가 설정되지 않아 파일을 업로드할 수 없습니다.");
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase client를 초기화할 수 없습니다.");
  }

  const bucket = "summary-analysis-files";
  const uploadedAt = new Date().toISOString();
  const refs: Array<{
    name: string;
    path: string;
    url: string;
    uploaded_at: string;
  }> = [];

  for (const file of input.files) {
    const safeName = file.name.replace(/[^\w.\-가-힣]/g, "_");
    const path = `${input.clientId}/${Date.now()}-${safeName}`;
    console.log("[summaryAnalysisStore] upload:file:start", {
      clientId: input.clientId,
      bucket,
      name: file.name,
      path,
      size: file.size,
      type: file.type,
    });
    const { error } = await withTimeout(
      client.storage.from(bucket).upload(path, file, {
        upsert: true,
      }),
      "분석 파일 업로드 중 응답이 지연되고 있습니다."
    );

    if (error) {
      console.error("[summaryAnalysisStore] upload:file:error", {
        clientId: input.clientId,
        bucket,
        name: file.name,
        path,
        error,
      });
      throw error;
    }

    const { data } = client.storage.from(bucket).getPublicUrl(path);
    console.log("[summaryAnalysisStore] upload:file:success", {
      clientId: input.clientId,
      bucket,
      name: file.name,
      path,
      publicUrl: data.publicUrl,
    });
    refs.push({
      name: file.name,
      path,
      url: data.publicUrl,
      uploaded_at: uploadedAt,
    });
  }

  console.log("[summaryAnalysisStore] upload:success", {
    clientId: input.clientId,
    fileCount: refs.length,
  });
  return refs;
}
