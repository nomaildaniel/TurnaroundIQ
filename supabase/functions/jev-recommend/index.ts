const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface JevRequest {
  model: string;
  state: string;
  questions: Record<string, { type: "choice"; instructions: string; criteria: Record<string, string> }>;
}
interface JevResponse {
  results?: Record<string, { choice: string; probabilities: Record<string, number>; confidence: number }>;
  model?: string;
}
interface AdapterRequest {
  scenarioSummary: string;
  candidates: { id: string; name: string; description: string; departureDelay: number; delaySaved: number; affectedTaskCount: number; resourceConflictCount: number; dependencyViolations: number; feasible: boolean }[];
}
interface AdapterResponse {
  status: "success" | "no_feasible_candidates" | "integration_unavailable" | "api_error" | "invalid_response";
  recommendation: { selectedPlanId: string; selectedPlanName: string; confidence: number; probabilities: Record<string, number> } | null;
  model: string | null;
  error: string | null;
  latencyMs: number | null;
}

function buildState(summary: string, cands: AdapterRequest["candidates"]): string {
  const lines = cands.map((c, i) => `Option ${i + 1} [key=${c.id}]: ${c.name} — ${c.description}. Departure delay: ${c.departureDelay}m, delay saved: ${c.delaySaved}m, affected tasks: ${c.affectedTaskCount}, resource conflicts: ${c.resourceConflictCount}, dependency violations: ${c.dependencyViolations}.`).join("\n");
  return `${summary}\n\nAvailable recovery options:\n${lines}`;
}

async function callJev(body: JevRequest, apiKey: string, maxRetries = 2): Promise<{ ok: boolean; data: JevResponse | null; error: string | null }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("https://api.typesafe.ai/v1/systemone", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.status === 401 || res.status === 403) return { ok: false, data: null, error: "Authentication failed — check JEV_API_KEY" };
      if (res.status === 422) return { ok: false, data: null, error: "Request validation failed" };
      if (res.status === 429) return { ok: false, data: null, error: "Rate limit exceeded" };
      if (res.status >= 500 && attempt < maxRetries) continue;
      if (!res.ok) return { ok: false, data: null, error: `API returned ${res.status}` };
      const data: JevResponse = await res.json();
      return { ok: true, data, error: null };
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === "AbortError") {
        if (attempt < maxRetries) continue;
        return { ok: false, data: null, error: "Request timed out" };
      }
      if (attempt < maxRetries) continue;
      return { ok: false, data: null, error: err instanceof Error ? err.message : "Network error" };
    }
  }
  return { ok: false, data: null, error: "Max retries exceeded" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("JEV_API_KEY");
    if (!apiKey) {
      const resp: AdapterResponse = { status: "integration_unavailable", recommendation: null, model: null, error: "Jev integration is not configured. Set JEV_API_KEY in edge function secrets.", latencyMs: null };
      return new Response(JSON.stringify(resp), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body: AdapterRequest = await req.json();
    if (!body.candidates || !Array.isArray(body.candidates)) {
      const resp: AdapterResponse = { status: "api_error", recommendation: null, model: null, error: "Invalid request: candidates array required", latencyMs: null };
      return new Response(JSON.stringify(resp), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const feasible = body.candidates.filter((c) => c.feasible);
    if (feasible.length === 0) {
      const resp: AdapterResponse = { status: "no_feasible_candidates", recommendation: null, model: null, error: "No feasible recovery plans available for Jev evaluation.", latencyMs: null };
      return new Response(JSON.stringify(resp), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const apiStart = Date.now();
    const state = buildState(body.scenarioSummary, feasible);
    const criteria: Record<string, string> = {};
    for (const c of feasible) criteria[c.id] = `${c.name}: ${c.description}. Delay ${c.departureDelay}m (saves ${c.delaySaved}m), ${c.affectedTaskCount} affected tasks.`;
    const jevBody: JevRequest = {
      model: "jev-latest", state,
      questions: { recovery_plan: { type: "choice", instructions: "Select the best recovery plan for this aircraft turnaround disruption. Consider delay minimization, operational impact, and constraint compliance.", criteria } },
    };
    const result = await callJev(jevBody, apiKey);
    const latencyMs = Date.now() - apiStart;
    if (!result.ok || !result.data) {
      const resp: AdapterResponse = { status: "api_error", recommendation: null, model: null, error: result.error ?? "Unknown API error", latencyMs };
      return new Response(JSON.stringify(resp), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const choice = result.data.results?.recovery_plan;
    if (!choice || !choice.choice) {
      const resp: AdapterResponse = { status: "invalid_response", recommendation: null, model: result.data.model ?? null, error: "Jev response missing recovery_plan choice result", latencyMs };
      return new Response(JSON.stringify(resp), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const validIds = new Set(feasible.map((c) => c.id));
    if (!validIds.has(choice.choice)) {
      const resp: AdapterResponse = { status: "invalid_response", recommendation: null, model: result.data.model ?? null, error: `Jev selected "${choice.choice}" which is not a valid candidate identifier`, latencyMs };
      return new Response(JSON.stringify(resp), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const selected = feasible.find((c) => c.id === choice.choice)!;
    const resp: AdapterResponse = { status: "success", recommendation: { selectedPlanId: choice.choice, selectedPlanName: selected.name, confidence: choice.confidence, probabilities: choice.probabilities }, model: result.data.model ?? null, error: null, latencyMs };
    return new Response(JSON.stringify(resp), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const resp: AdapterResponse = { status: "api_error", recommendation: null, model: null, error: err instanceof Error ? err.message : "Internal error", latencyMs: null };
    return new Response(JSON.stringify(resp), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
