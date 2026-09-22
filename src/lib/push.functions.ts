import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Envia uma notificação de teste para todos os aparelhos do usuário logado. */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title?: string; body?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPushToOwner } = await import("./push.server");

    return sendPushToOwner(supabaseAdmin as never, context.userId, {
      title: data.title || "Notificação de teste",
      body: data.body || "Tudo certo! Você receberá os lembretes mesmo com o app fechado.",
      tag: `test-${Date.now()}`,
      url: "/admin",
    });
  });

/** Envia um alerta imediato quando uma cliente agenda pela página pública. */
export const sendNewPublicBookingPush = createServerFn({ method: "POST" })
  .inputValidator((input: { appointmentId?: string } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    if (!data.appointmentId) return { sent: 0, ignored: true };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPushToOwner } = await import("./push.server");

    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from("appointments")
      .select("id, owner_id, client_name, appointment_time, status, booking_source, services(name)")
      .eq("id", data.appointmentId)
      .eq("booking_source", "public")
      .maybeSingle();

    if (appointmentError || !appointment || appointment.status === "Cancelado") {
      return { sent: 0, ignored: true };
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from("push_booking_events")
      .insert({ appointment_id: appointment.id, owner_id: appointment.owner_id })
      .select("id")
      .maybeSingle();

    if (eventError || !event) {
      return { sent: 0, ignored: true };
    }

    const appointmentDate = new Date(appointment.appointment_time);
    const date = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(appointmentDate);
    const time = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(appointmentDate);
    const serviceName = appointment.services?.name || "Serviço agendado";

    return sendPushToOwner(supabaseAdmin as never, appointment.owner_id, {
      title: "Novo agendamento!",
      body: `${appointment.client_name} agendou ${serviceName} para ${date} às ${time}`,
      tag: `new-booking-${appointment.id}`,
      url: "/admin",
    });
  });

/** Dispara agora o lembrete dos agendamentos de amanhã (para conferência). */
export const sendTomorrowPushNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPushToOwner, nowInSaoPaulo, toLocalDateKey, saoPauloToIso } = await import(
      "./push.server"
    );

    const now = nowInSaoPaulo();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const startKey = toLocalDateKey(tomorrow);
    const endKey = toLocalDateKey(dayAfter);

    const { data } = await supabaseAdmin
      .from("appointments")
      .select("client_name, appointment_time, status")
      .eq("owner_id", context.userId)
      .gte("appointment_time", saoPauloToIso(startKey, "00:00"))
      .lt("appointment_time", saoPauloToIso(endKey, "00:00"))
      .order("appointment_time", { ascending: true });

    const list = (data ?? []).filter(
      (item) => item.status !== "Cancelado" && item.status !== "Concluído",
    );

    if (!list.length) {
      return sendPushToOwner(supabaseAdmin as never, context.userId, {
        title: "Nenhum agendamento para amanhã",
        body: "Sua agenda de amanhã está livre.",
        tag: `tomorrow-${startKey}`,
        url: "/admin",
      });
    }

    const preview = list
      .slice(0, 4)
      .map((item) => {
        const time = new Date(new Date(item.appointment_time).getTime() - 3 * 60 * 60 * 1000);
        const hh = String(time.getUTCHours()).padStart(2, "0");
        const mm = String(time.getUTCMinutes()).padStart(2, "0");
        return `${hh}:${mm} · ${item.client_name}`;
      })
      .join("\n");

    const remaining = list.length - 4;

    return sendPushToOwner(supabaseAdmin as never, context.userId, {
      title: `${list.length} agendamento(s) para amanhã`,
      body: `${preview}${remaining > 0 ? `\n+ ${remaining} agendamento(s)` : ""}`,
      tag: `tomorrow-${startKey}`,
      url: "/admin",
    });
  });
