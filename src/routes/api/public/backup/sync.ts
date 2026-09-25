import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

const TARGET_URL = "https://hqnfffktyodunxxgdzeo.supabase.co";
const PAGE_SIZE = 500;

const BACKUP_TABLES = [
  "tenants", "user_roles", "clients", "services", "settings", "expenses",
  "inventory", "payments", "appointments", "push_subscriptions",
  "push_reminder_log", "push_booking_events", "support_requests",
  "whatsapp_backgrounds", "billing_plans", "billing_subscriptions", "billing_events",
] as const;

type BackupTable = (typeof BACKUP_TABLES)[number];

async function copyTable(table: BackupTable, source: any, target: ReturnType<typeof createClient>) {
  let processed = 0;
  while (true) {
    const { data, error } = await source.from(table).select("*").order("id", { ascending: true }).range(processed, processed + PAGE_SIZE - 1);
    if (error) throw new Error(table + ": falha ao ler a origem: " + error.message);
    if (!data?.length) break;
    const { error: upsertError } = await target.from(table).upsert(data as Array<Record<string, unknown>>, { onConflict: "id" });
    if (upsertError) throw new Error(table + ": falha ao gravar no destino: " + upsertError.message);
    processed += data.length;
    if (data.length < PAGE_SIZE) break;
  }
  return processed;
}

async function handle(request: Request) {
  const suppliedSecret = request.headers.get("x-cron-secret");
  const cronSecret = process.env["PUSH_CRON_SECRET"];
  if (!cronSecret || !suppliedSecret || suppliedSecret !== cronSecret) return new Response("Unauthorized", { status: 401 });

  const targetKey = process.env["BACKUP_TARGET_KEY"];
  if (!targetKey) return new Response(JSON.stringify({ ok: false, error: "BACKUP_TARGET_KEY não configurada." }), { status: 500, headers: { "content-type": "application/json" } });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: run, error: runError } = await supabaseAdmin.from("external_backup_runs").insert({ status: "running", trigger_source: "scheduled" }).select("id").single();
  if (runError || !run) return new Response(JSON.stringify({ ok: false, error: "Falha ao iniciar o registro do backup." }), { status: 500, headers: { "content-type": "application/json" } });

  const target = createClient(TARGET_URL, targetKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const tableCounts: Record<string, number> = {};
  let total = 0;

  try {
    for (const table of BACKUP_TABLES) {
      const count = await copyTable(table, supabaseAdmin, target);
      tableCounts[table] = count;
      total += count;
    }

    await supabaseAdmin.from("external_backup_runs").update({
      finished_at: new Date().toISOString(), status: "success",
      records_processed: total, table_counts: tableCounts, error_message: null,
    }).eq("id", run.id);

    return new Response(JSON.stringify({ ok: true, runId: run.id, recordsProcessed: total, tableCounts }), { headers: { "content-type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido no backup.";
    await supabaseAdmin.from("external_backup_runs").update({
      finished_at: new Date().toISOString(), status: "failed",
      records_processed: total, table_counts: tableCounts, error_message: message.slice(0, 4000),
    }).eq("id", run.id);
    return new Response(JSON.stringify({ ok: false, runId: run.id, error: message }), { status: 500, headers: { "content-type": "application/json" } });
  }
}

export const Route = createFileRoute("/api/public/backup/sync")({
  server: { handlers: { POST: ({ request }) => handle(request) } },
});
