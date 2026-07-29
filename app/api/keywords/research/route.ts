import { normalizeHttpUrl } from "@/lib/competitor-intelligence/validation";
import {
  normalizeKeywordRecommendations,
} from "@/lib/keyword-intelligence/validation";
import type {
  KeywordResearchRunDto,
  KeywordSourceMode,
} from "@/lib/keyword-intelligence/types";
import {
  createAndEnqueueKeywordRun,
  type KeywordBusinessRow,
  type KeywordProductRow,
} from "@/lib/server/keyword-research";
import {
  isUuid,
  normalizeOptionalHttpUrl,
  stringValue,
} from "@/lib/validation";
import { getApiAuth } from "@/utils/api-auth";
import { enforceApiQuota } from "@/utils/api-quota";
import { readJsonObjectRequest } from "@/utils/http-security";

export const runtime = "nodejs";

const businessSelect =
  "id, name, website, industry, description, target_audience, brand_voice, value_proposition, competitors, markets, campaign_goal, price_range, target_keywords";
const productSelect =
  "id, product_name, category, price, value_prop, target_sub_demographic, key_features, creative_hooks";

function hasUsefulProfile(business: KeywordBusinessRow): boolean {
  return Boolean(
    business.website ||
      business.industry ||
      business.description ||
      business.target_audience ||
      business.value_proposition ||
      business.markets ||
      business.campaign_goal ||
      business.target_keywords,
  );
}

async function ownedBusiness(businessId: string) {
  const auth = await getApiAuth();
  if (!auth) {
    return {
      error: "Sign in to research keywords.",
      status: 401 as const,
    };
  }
  const { data, error } = await auth.supabase
    .from("businesses")
    .select(businessSelect)
    .eq("id", businessId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (error) {
    return { error: "Could not load the business.", status: 500 as const };
  }
  if (!data) {
    return { error: "Business not found.", status: 404 as const };
  }
  return { auth, business: data as KeywordBusinessRow };
}

export async function POST(request: Request) {
  const parsed = await readJsonObjectRequest(request, 16_384);
  if (!parsed.success) return parsed.response;
  const value = parsed.data;
  const businessId = stringValue(value.businessId, 100);
  const sourceMode: KeywordSourceMode | null =
    value.sourceMode === "url" || value.sourceMode === "profile"
      ? value.sourceMode
      : null;
  const productId = stringValue(value.productId, 100) ?? null;
  if (
    !businessId ||
    !isUuid(businessId) ||
    !sourceMode ||
    (productId !== null && !isUuid(productId))
  ) {
    return Response.json(
      { error: "A valid business and source are required." },
      { status: 400 },
    );
  }

  const owned = await ownedBusiness(businessId);
  if ("error" in owned) {
    return Response.json({ error: owned.error }, { status: owned.status });
  }
  const quota = await enforceApiQuota(
    owned.auth.supabase,
    "keyword_generate",
  );
  if (quota) return quota;

  let sourceUrl: string | null = null;
  if (sourceMode === "url") {
    const normalized = normalizeOptionalHttpUrl(
      stringValue(value.sourceUrl, 2_048),
    );
    sourceUrl =
      normalized.success && normalized.value
        ? normalizeHttpUrl(normalized.value)
        : null;
    if (!sourceUrl) {
      return Response.json(
        { error: "Enter a valid public website or profile URL." },
        { status: 400 },
      );
    }
  } else if (!hasUsefulProfile(owned.business)) {
    return Response.json(
      {
        error:
          "Add a website, audience, description, or keywords to the Business profile first.",
      },
      { status: 400 },
    );
  }

  let product: KeywordProductRow | null = null;
  if (productId) {
    const { data, error } = await owned.auth.supabase
      .from("products")
      .select(productSelect)
      .eq("id", productId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (error) {
      return Response.json(
        { error: "Could not load the selected product." },
        { status: 500 },
      );
    }
    if (!data) {
      return Response.json(
        { error: "The selected product was not found." },
        { status: 404 },
      );
    }
    product = data as KeywordProductRow;
  }

  try {
    const queued = await createAndEnqueueKeywordRun({
      business: owned.business,
      product,
      sourceMode,
      sourceUrl,
    });
    return Response.json(
      {
        runId: queued.runId,
        status: queued.status,
        existing: queued.existing,
      },
      { status: 202 },
    );
  } catch {
    return Response.json(
      { error: "Keyword research could not be queued. Try again shortly." },
      { status: 503 },
    );
  }
}

export async function GET(request: Request) {
  const businessId = new URL(request.url).searchParams.get("businessId");
  if (!isUuid(businessId)) {
    return Response.json(
      { error: "A valid businessId is required." },
      { status: 400 },
    );
  }
  const owned = await ownedBusiness(businessId);
  if ("error" in owned) {
    return Response.json({ error: owned.error }, { status: owned.status });
  }

  const { data: run, error } = await owned.auth.supabase
    .from("keyword_research_runs")
    .select(
      "id, business_id, product_id, source_mode, source_url, status, stage, model_id, source_count, error_code, error_message, queued_at, started_at, completed_at, recommendations",
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return Response.json(
      { error: "Could not load keyword research." },
      { status: 500 },
    );
  }

  let runDto: KeywordResearchRunDto | null = null;
  if (
    run &&
    (run.source_mode === "url" || run.source_mode === "profile") &&
    (run.status === "queued" ||
      run.status === "running" ||
      run.status === "completed" ||
      run.status === "failed") &&
    (run.stage === "queued" ||
      run.stage === "searching" ||
      run.stage === "synthesizing" ||
      run.stage === "finalizing" ||
      run.stage === "completed" ||
      run.stage === "failed")
  ) {
    runDto = {
      id: run.id,
      business_id: run.business_id,
      product_id: run.product_id,
      source_mode: run.source_mode,
      source_url: run.source_url,
      status: run.status,
      stage: run.stage,
      model_id: run.model_id,
      source_count: run.source_count,
      error_code: run.error_code,
      error_message: run.error_message,
      queued_at: run.queued_at,
      started_at: run.started_at,
      completed_at: run.completed_at,
      recommendations: normalizeKeywordRecommendations(run.recommendations),
    };
  }
  return Response.json(
    { run: runDto },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
