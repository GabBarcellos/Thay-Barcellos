import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ReminderAppointment {
  client_name: string;
  appointment_time: string;
  services: { name: string } | null;
}

interface NotificationSchedule {
  time: string;
  days: string[];
  target?: "today" | "tomorrow";
}

const DAYS_OF_WEEK = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function getLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildReminderMessage(appointments: ReminderAppointment[]) {
  const preview = appointments
    .slice(0, 3)
    .map((appointment) => {
      const time = new Date(appointment.appointment_time).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const service = appointment.services?.name || "Atendimento";
      return `${time} · ${appointment.client_name} (${service})`;
    })
    .join("\n");

  const remaining = appointments.length - 3;
  return `${preview}${remaining > 0 ? `\n+ ${remaining} agendamento(s)` : ""}`;
}

export function useAdminReminders(ownerId?: string) {
  useEffect(() => {
    if (!ownerId || typeof window === "undefined" || !("Notification" in window)) return;

    let timeoutId: number | undefined;
    let cancelled = false;

    const sendScheduledReminder = async (time: string, target: "today" | "tomorrow") => {
      if (cancelled || Notification.permission !== "granted") return;

      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (target === "tomorrow" ? 1 : 0));
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (target === "tomorrow" ? 2 : 1));
      const reminderKey = `admin-reminder:${ownerId}:${target}:${getLocalDate(startDate)}:${time}`;

      if (localStorage.getItem(reminderKey)) return;

      const { data, error } = await supabase
        .from("appointments")
        .select("client_name, appointment_time, services(name)")
        .gte("appointment_time", startDate.toISOString())
        .lt("appointment_time", endDate.toISOString())
        .not("status", "in", "(Cancelado,Concluído)")
        .order("appointment_time", { ascending: true });

      if (cancelled || error || !data?.length) return;

      const appointments = data as ReminderAppointment[];
      const notification = new Notification(`${appointments.length} agendamento(s) para ${target === "today" ? "hoje" : "amanhã"}`, {
        body: buildReminderMessage(appointments),
        tag: reminderKey,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      localStorage.setItem(reminderKey, "sent");
    };

    const scheduleReminder = async () => {
      const { data: settings } = await supabase
        .from("settings")
        .select("key, value")
        .eq("owner_id", ownerId)
        .in("key", ["daily_notifications_enabled", "admin_notification_schedule"]);

      if (cancelled) return;

      const enabled = settings?.find((setting) => setting.key === "daily_notifications_enabled")?.value === "true";
      if (!enabled) return;

      const savedSchedule = settings?.find((setting) => setting.key === "admin_notification_schedule")?.value;
      let schedules: NotificationSchedule[] = [{ time: "20:00", days: DAYS_OF_WEEK }];

      if (savedSchedule) {
        try {
          const parsed = JSON.parse(savedSchedule) as NotificationSchedule[];
          const valid = parsed.filter((item) =>
            /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) &&
            Array.isArray(item.days) &&
            item.days.some((day) => DAYS_OF_WEEK.includes(day)) &&
            (!item.target || item.target === "today" || item.target === "tomorrow"),
          );
          if (valid.length) schedules = valid;
        } catch {
          console.error("Erro ao ler a programação de notificações");
        }
      }

      const now = new Date();
      let nextReminder: { date: Date; time: string; target: "today" | "tomorrow" } | null = null;

      for (let offset = 0; offset < 8; offset += 1) {
        const candidateDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
        const dayName = DAYS_OF_WEEK[candidateDay.getDay()];

        for (const schedule of schedules) {
          if (!schedule.days.includes(dayName)) continue;
          const [hours, minutes] = schedule.time.split(":").map(Number);
          const candidate = new Date(candidateDay);
          candidate.setHours(hours, minutes, 0, 0);

          if (candidate > now && (!nextReminder || candidate < nextReminder.date)) {
            nextReminder = { date: candidate, time: schedule.time, target: schedule.target || "tomorrow" }; 
          }
        }
      }

      if (!nextReminder) return;

      timeoutId = window.setTimeout(async () => {
        await sendScheduledReminder(nextReminder.time, nextReminder.target);
        scheduleReminder();
      }, nextReminder.date.getTime() - now.getTime());
    };

    scheduleReminder();
    window.addEventListener("settings-updated", scheduleReminder);

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      window.removeEventListener("settings-updated", scheduleReminder);
    };
  }, [ownerId]);
}
