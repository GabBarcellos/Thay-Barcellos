import { createFileRoute } from "@tanstack/react-router";

const DAYS_OF_WEEK = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface Schedule {
  time: string;
  days: string[];
  target?: "today" | "tomorrow";
}

async function handle(request: Request) {
  const secret =
    request.headers.get("x-cron-secret") ??
    new URL(request.url).searchParams.get("secret");

  if (!secret || secret !== process.env["PUSH_CRON_SECRET"]) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendPushToOwner, nowInSaoPaulo, toLocalDateKey, saoPauloToIso } = await import(
    "@/lib/push.server"
  );

  const now = nowInSaoPaulo();
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const todayName = DAYS_OF_WEEK[now.getUTCDay()];
  const todayKey = toLocalDateKey(now);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const tomorrowKey = toLocalDateKey(tomorrow);
  const dayAfterKey = toLocalDateKey(dayAfter);

  const { data: settingsRows, error: settingsError } = await supabaseAdmin
    .from("settings")
    .select("owner_id, key, value")
    .in("key", ["daily_notifications_enabled", "admin_notification_schedule"]);

  if (settingsError) {
    console.error("[push-cron] erro ao ler configurações", settingsError);
    return new Response(JSON.stringify({ error: settingsError.message }), { status: 500 });
  }

  const byOwner = new Map<string, { enabled: boolean; schedules: Schedule[] }>();
  for (const row of settingsRows ?? []) {
    const entry = byOwner.get(row.owner_id) ?? { enabled: false, schedules: [] };
    if (row.key === "daily_notifications_enabled") entry.enabled = row.value === "true";
    if (row.key === "admin_notification_schedule" && row.value) {
      try {
        const parsed = JSON.parse(row.value) as Schedule[];
        entry.schedules = parsed.filter(
          (item) => /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) && Array.isArray(item.days),
        );
      } catch {
        console.error("[push-cron] programação inválida", row.owner_id);
      }
    }
    byOwner.set(row.owner_id, entry);
  }

  const results: Array<Record<string, unknown>> = [];

  for (const [ownerId, config] of byOwner) {
    if (!config.enabled) continue;
    const schedules = config.schedules.length
      ? config.schedules
      : [{ time: "20:00", days: DAYS_OF_WEEK }];

    for (const schedule of schedules) {
      if (!schedule.days.includes(todayName)) continue;
      const [hours, minutes] = schedule.time.split(":").map(Number);
      const scheduledMinutes = hours * 60 + minutes;
      const diff = nowMinutes - scheduledMinutes;
      if (diff < 0 || diff > 9) continue;

      const target = schedule.target || "tomorrow";
      const targetDateKey = target === "today" ? todayKey : tomorrowKey;
      const nextDateKey = target === "today" ? tomorrowKey : dayAfterKey;
      const reminderKey = `${todayKey}:${schedule.time}:${target}`;
      const { data: logged, error: logError } = await supabaseAdmin
        .from("push_reminder_log")
        .insert({ owner_id: ownerId, reminder_key: reminderKey })
        .select("id");

      if (logError || !logged?.length) continue;

      const { data: appointments } = await supabaseAdmin
        .from("appointments")
        .select("client_name, appointment_time, status")
        .eq("owner_id", ownerId)
        .gte("appointment_time", saoPauloToIso(targetDateKey, "00:00"))
        .lt("appointment_time", saoPauloToIso(nextDateKey, "00:00"))
        .order("appointment_time", { ascending: true });

      const list = (appointments ?? []).filter(
        (item) => item.status !== "Cancelado" && item.status !== "Concluído",
      );

      if (!list.length) continue;

      const preview = list
        .slice(0, 4)
        .map((item) => {
          const local = new Date(new Date(item.appointment_time).getTime() - 3 * 60 * 60 * 1000);
          const hh = String(local.getUTCHours()).padStart(2, "0");
          const mm = String(local.getUTCMinutes()).padStart(2, "0");
          return `${hh}:${mm} · ${item.client_name}`;
        })
        .join("\n");

      const remaining = list.length - 4;
      const outcome = await sendPushToOwner(supabaseAdmin as never, ownerId, {
        title: `${list.length} agendamento(s) para ${target === "today" ? "hoje" : "amanhã"}`,
        body: `${preview}${remaining > 0 ? `\n+ ${remaining} agendamento(s)` : ""}`,
        tag: `${target}-${targetDateKey}`,
        url: "/admin",
      });

      results.push({ ownerId, time: schedule.time, ...outcome });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/push/reminders")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      GET: ({ request }) => handle(request),
    },
  },
});
