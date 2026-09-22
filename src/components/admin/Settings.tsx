import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, BellRing, Building2, Save, CalendarDays, X, Plus, Clock, LayoutDashboard, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useServerFn } from "@tanstack/react-start";
import { sendTestPush, sendTomorrowPushNow } from "@/lib/push.functions";

const DAYS_OF_WEEK = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

interface ClosedSlot {
  date: string;
  time: string;
}

interface NotificationSchedule {
  time: string;
  days: string[];
  target?: "today" | "tomorrow";
}

export function Settings() {
  const [dailyNotif, setDailyNotif] = useState(true);
  const [notificationSchedules, setNotificationSchedules] = useState<NotificationSchedule[]>([
    { time: "20:00", days: [...DAYS_OF_WEEK] },
  ]);
  const [newNotificationTime, setNewNotificationTime] = useState("20:00");
  const [newNotificationDays, setNewNotificationDays] = useState<string[]>([...DAYS_OF_WEEK]);
  const [newNotificationTarget, setNewNotificationTarget] = useState<"today" | "tomorrow">("tomorrow");
  const [salonName, setSalonName] = useState("");
  const [workingDays, setWorkingDays] = useState<string[]>(["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]);
  const [hiddenMenuItems, setHiddenMenuItems] = useState<string[]>([]);
  const [closedSlots, setClosedSlots] = useState<ClosedSlot[]>([]);
  const [newClosedDate, setNewClosedDate] = useState("");
  const [newClosedTime, setNewClosedTime] = useState("");
  const [rangeStartDate, setRangeStartDate] = useState("");
  const [rangeEndDate, setRangeEndDate] = useState("");
  const [rangeStartTime, setRangeStartTime] = useState("");
  const [rangeEndTime, setRangeEndTime] = useState("");
  const [recurringBlocks, setRecurringBlocks] = useState<Array<{ startTime: string; endTime: string; scope: 'always' | 'month'; month?: string }>>([]);
  const [recStart, setRecStart] = useState("");
  const [recEnd, setRecEnd] = useState("");
  const [recScope, setRecScope] = useState<'always' | 'month'>('always');
  const [recMonth, setRecMonth] = useState("");
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("19:00");
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [newClosedDay, setNewClosedDay] = useState("");
  const [loading, setLoading] = useState(true);
  const { isSupported: pushSupported, isSubscribed, isActivating, needsNewTab, activatePushNotifications } = usePushNotifications();
  const runTestPush = useServerFn(sendTestPush);
  const runTomorrowPush = useServerFn(sendTomorrowPushNow);

  const availableNavItems = [
    { id: "overview", label: "Dashboard" },
    { id: "appointments", label: "Agendamentos" },
    { id: "inventory", label: "Estoque" },
    { id: "payments", label: "Pagamentos" },
    { id: "expenses", label: "Despesas" },
    { id: "reports", label: "Faturamento" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "gallery", label: "Meus Serviços" },
    { id: "clients", label: "Clientes" },
  ];

  useEffect(() => {
    async function fetchSettings() {
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*');
      
      if (!settingsError && settingsData) {
        const notif = settingsData.find(s => s.key === 'daily_notifications_enabled');
        const notificationSchedule = settingsData.find(s => s.key === 'admin_notification_schedule');
        const days = settingsData.find(s => s.key === 'working_days');
        const name = settingsData.find(s => s.key === 'salon_name');
        const closed = settingsData.find(s => s.key === 'closed_slots');
        const recurring = settingsData.find(s => s.key === 'closed_slots_recurring');
        const hiddenMenu = settingsData.find(s => s.key === 'hidden_menu_items');
        const wStart = settingsData.find(s => s.key === 'working_hours_start');
        const wEnd = settingsData.find(s => s.key === 'working_hours_end');
        const cDates = settingsData.find(s => s.key === 'closed_dates');
        if (wStart && wStart.value) setWorkStart(wStart.value);
        if (wEnd && wEnd.value) setWorkEnd(wEnd.value);
        if (cDates && cDates.value) {
          try { setClosedDates(JSON.parse(cDates.value)); } catch {}
        }
        
        if (notif) setDailyNotif(notif.value === 'true');
        if (notificationSchedule?.value) {
          try {
            const parsed = JSON.parse(notificationSchedule.value) as NotificationSchedule[];
            const validSchedules = parsed.filter((item) =>
              /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) &&
              Array.isArray(item.days) &&
              item.days.some((day) => DAYS_OF_WEEK.includes(day)) &&
              (!item.target || item.target === "today" || item.target === "tomorrow"),
            );
            if (validSchedules.length) setNotificationSchedules(validSchedules);
          } catch {
            console.error("Erro ao carregar a programação de notificações");
          }
        }
        if (name && name.value) setSalonName(name.value);
        if (hiddenMenu && hiddenMenu.value) {
          try {
            setHiddenMenuItems(JSON.parse(hiddenMenu.value));
          } catch (e) {
            console.error("Error parsing hidden menu items", e);
          }
        }
        if (closed && closed.value) {
          try {
            setClosedSlots(JSON.parse(closed.value));
          } catch (e) {
            console.error("Error parsing closed slots", e);
          }
        }
        if (recurring && recurring.value) {
          try { setRecurringBlocks(JSON.parse(recurring.value)); } catch {}
        }
        if (days && days.value) {
          try {
            setWorkingDays(JSON.parse(days.value));
          } catch (e) {
            console.error("Error parsing working days", e);
          }
        }
      }

      if (!salonName) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('display_name')
            .eq('owner_user_id', userData.user.id)
            .maybeSingle();
          
          if (tenantData?.display_name) setSalonName(tenantData.display_name);
        }
      }
      setLoading(false);
    }
    fetchSettings();
  }, [salonName]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const results = await Promise.all([
        supabase.from('settings').upsert({ key: 'salon_name', value: salonName, owner_id: userData.user.id }, { onConflict: 'owner_id,key' }),
        supabase.from('settings').upsert({ key: 'working_days', value: JSON.stringify(workingDays), owner_id: userData.user.id }, { onConflict: 'owner_id,key' }),
        supabase.from('settings').upsert({ key: 'closed_slots', value: JSON.stringify(closedSlots), owner_id: userData.user.id }, { onConflict: 'owner_id,key' }),
        supabase.from('settings').upsert({ key: 'closed_slots_recurring', value: JSON.stringify(recurringBlocks), owner_id: userData.user.id }, { onConflict: 'owner_id,key' }),
        supabase.from('settings').upsert({ key: 'daily_notifications_enabled', value: dailyNotif.toString(), owner_id: userData.user.id }, { onConflict: 'owner_id,key' }),
        supabase.from('settings').upsert({ key: 'admin_notification_schedule', value: JSON.stringify(notificationSchedules), owner_id: userData.user.id }, { onConflict: 'owner_id,key' }),
        supabase.from('settings').upsert({ key: 'hidden_menu_items', value: JSON.stringify(hiddenMenuItems), owner_id: userData.user.id }, { onConflict: 'owner_id,key' }),
        supabase.from('settings').upsert({ key: 'working_hours_start', value: workStart, owner_id: userData.user.id }, { onConflict: 'owner_id,key' }),
        supabase.from('settings').upsert({ key: 'working_hours_end', value: workEnd, owner_id: userData.user.id }, { onConflict: 'owner_id,key' }),
        supabase.from('settings').upsert({ key: 'closed_dates', value: JSON.stringify(closedDates), owner_id: userData.user.id }, { onConflict: 'owner_id,key' }),
        supabase.from('tenants').update({ display_name: salonName }).eq('owner_user_id', userData.user.id)
      ]);

      const failed = results.find((result) => result.error);
      if (failed?.error) {
        console.error("Erro ao salvar configurações", failed.error);
        toast.error(`Erro ao salvar: ${failed.error.message}`);
        return;
      }

      toast.success("Configurações salvas!");
      window.dispatchEvent(new CustomEvent('settings-updated'));
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      toast.error("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  const persistSchedules = async (schedules: NotificationSchedule[]) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Sessão expirada. Entre novamente.");
      return false;
    }

    const { error } = await supabase.from('settings').upsert(
      { key: 'admin_notification_schedule', value: JSON.stringify(schedules), owner_id: userData.user.id },
      { onConflict: 'owner_id,key' },
    );

    if (error) {
      console.error("Erro ao salvar lembretes", error);
      toast.error(`Não foi possível salvar o lembrete: ${error.message}`);
      return false;
    }

    window.dispatchEvent(new CustomEvent('settings-updated'));
    return true;
  };

  const addNotificationSchedule = async () => {
    if (!newNotificationTime || newNotificationDays.length === 0) {
      toast.error("Escolha um horário e pelo menos um dia.");
      return;
    }

    const exists = notificationSchedules.some(
      (schedule) => schedule.time === newNotificationTime &&
        (schedule.target || "tomorrow") === newNotificationTarget &&
        schedule.days.length === newNotificationDays.length &&
        schedule.days.every((day) => newNotificationDays.includes(day)), 
    );

    if (exists) {
      toast.error("Essa programação já foi adicionada.");
      return;
    }

    const updated = [
      ...notificationSchedules,
      {
        time: newNotificationTime,
        days: DAYS_OF_WEEK.filter((day) => newNotificationDays.includes(day)),
        target: newNotificationTarget,
      },
    ];

    setNotificationSchedules(updated);
    const saved = await persistSchedules(updated);
    if (saved) toast.success("Horário de lembrete salvo!");
  };

  const removeNotificationSchedule = async (index: number) => {
    const updated = notificationSchedules.filter((_, itemIndex) => itemIndex !== index);
    setNotificationSchedules(updated);
    const saved = await persistSchedules(updated);
    if (saved) toast.success("Lembrete removido.");
  };

  const toggleNotificationDay = (day: string) => {
    setNewNotificationDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  };

  const sendTestNotification = async () => {
    if (!pushSupported) {
      toast.error("Este dispositivo não oferece suporte a notificações.");
      return;
    }

    if (needsNewTab && !isSubscribed) {
      toast.error("Abra o aplicativo em uma aba própria (ou instalado na tela inicial) para ativar as notificações.");
      return;
    }

    const activated = await activatePushNotifications();
    if (!activated) {
      toast.error("Permita as notificações do aplicativo para receber os lembretes.");
      return;
    }

    try {
      const result = await runTestPush({ data: {} });
      if (result.sent > 0) {
        toast.success(`Notificação enviada para ${result.sent} dispositivo(s).`);
      } else {
        toast.error("Nenhum dispositivo recebeu a notificação. Tente ativar novamente.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível enviar a notificação de teste.");
    }
  };

  const sendTomorrowAppointmentsNotification = async () => {
    const activated = await activatePushNotifications();
    if (!activated) {
      toast.error("Permita as notificações do aplicativo para receber os lembretes.");
      return;
    }

    try {
      const result = await runTomorrowPush({});
      if (result.sent > 0) {
        toast.success(`Lembrete de amanhã enviado para ${result.sent} dispositivo(s).`);
      } else {
        toast.error("Nenhum dispositivo cadastrado para receber o lembrete.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível enviar o lembrete agora.");
    }
  };

  const addClosedSlot = () => {
    if (!newClosedDate || !newClosedTime) {
      toast.error("Selecione data e hora");
      return;
    }
    const exists = closedSlots.find(s => s.date === newClosedDate && s.time === newClosedTime);
    if (exists) {
      toast.error("Horário já bloqueado");
      return;
    }
    setClosedSlots([...closedSlots, { date: newClosedDate, time: newClosedTime }]);
    setNewClosedTime("");
    toast.success("Horário bloqueado!");
  };

  const removeClosedSlot = (index: number) => {
    setClosedSlots(closedSlots.filter((_, i) => i !== index));
  };

  const addClosedRange = () => {
    if (!rangeStartDate || !rangeStartTime || !rangeEndTime) {
      toast.error("Preencha data inicial e horários");
      return;
    }
    const endDate = rangeEndDate || rangeStartDate;
    if (endDate < rangeStartDate) {
      toast.error("Data final antes da inicial");
      return;
    }
    const startIdx = TIME_SLOTS.indexOf(rangeStartTime);
    const endIdx = TIME_SLOTS.indexOf(rangeEndTime);
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
      toast.error("Intervalo de horário inválido");
      return;
    }
    const times = TIME_SLOTS.slice(startIdx, endIdx + 1);

    const dates: string[] = [];
    const cur = new Date(rangeStartDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    while (cur <= end) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }

    const existing = new Set(closedSlots.map(s => `${s.date}|${s.time}`));
    const additions: ClosedSlot[] = [];
    for (const d of dates) {
      for (const t of times) {
        const key = `${d}|${t}`;
        if (!existing.has(key)) {
          existing.add(key);
          additions.push({ date: d, time: t });
        }
      }
    }
    if (additions.length === 0) {
      toast.error("Todos os horários já estavam bloqueados");
      return;
    }
    setClosedSlots([...closedSlots, ...additions]);
    setRangeStartTime("");
    setRangeEndTime("");
    toast.success(`${additions.length} horário(s) bloqueado(s)!`);
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando...</div>;

  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
          <CardHeader className="p-5 sm:p-8 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="font-serif text-xl">Perfil da Empresa</CardTitle>
                <CardDescription>Informações básicas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-8 space-y-6">
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Nome do Salão</Label>
              <Input value={salonName} onChange={(e) => setSalonName(e.target.value)} className="rounded-xl h-12" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
          <CardHeader className="p-5 sm:p-8 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="font-serif text-xl">Sistema</CardTitle>
                <CardDescription>Notificações</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-8 space-y-4">
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50">
              <div>
                <Label className="text-sm font-bold">Lembretes de agendamentos</Label>
                <p className="text-xs text-muted-foreground mt-1">Receba os agendamentos do próximo dia nos horários escolhidos.</p>
              </div>
              <Switch checked={dailyNotif} onCheckedChange={setDailyNotif} />
            </div>

            <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-4 space-y-4">
              <div>
                <Label className="text-xs font-bold uppercase tracking-widest text-primary">Programar notificações</Label>
                <p className="text-[11px] text-muted-foreground mt-1">Adicione um ou mais horários, como 11:00 e 20:00, e escolha os dias desejados.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification_time" className="text-xs font-semibold">Horário</Label>
                <Input
                  id="notification_time"
                  type="time"
                  value={newNotificationTime}
                  onChange={(event) => setNewNotificationTime(event.target.value)}
                  className="h-10 rounded-xl bg-white focus:ring-2 focus:ring-primary/25"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Agendamentos para notificar</Label>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-1.5 border border-border/60">
                  <Button
                    type="button"
                    variant={newNotificationTarget === "today" ? "default" : "ghost"}
                    onClick={() => setNewNotificationTarget("today")}
                    className="rounded-lg text-xs"
                  >
                    Dia atual
                  </Button>
                  <Button
                    type="button"
                    variant={newNotificationTarget === "tomorrow" ? "default" : "ghost"}
                    onClick={() => setNewNotificationTarget("tomorrow")}
                    className="rounded-lg text-xs"
                  >
                    Próximo dia
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {newNotificationTarget === "today"
                    ? "Você receberá os horários agendados para hoje."
                    : "Você receberá os horários agendados para amanhã."}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Dias para notificar</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const selected = newNotificationDays.includes(day);
                    return (
                      <Button
                        key={day}
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        onClick={() => toggleNotificationDay(day)}
                        className={`rounded-full px-3 transition-all duration-200 ${selected ? "bg-primary shadow-sm" : "bg-white hover:border-primary/40"}`}
                      >
                        {day.slice(0, 3)}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addNotificationSchedule}
                className="w-full rounded-xl h-10 gap-2 border-primary/25 text-primary hover:bg-primary/5"
              >
                <Plus className="w-4 h-4" /> Adicionar horário
              </Button>

              {notificationSchedules.length > 0 && (
                <div className="space-y-2 border-t border-primary/10 pt-3">
                  {notificationSchedules.map((schedule, index) => (
                    <div key={`${schedule.time}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white p-3 shadow-sm">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">{schedule.time}</p>
                        <p className="text-[11px] font-medium text-primary">
                          {(schedule.target || "tomorrow") === "today" ? "Horários de hoje" : "Horários de amanhã"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{schedule.days.join(", ")}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover lembrete das ${schedule.time}`}
                        onClick={() => removeNotificationSchedule(index)}
                        className="h-8 w-8 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label className="text-sm font-bold">Notificações em segundo plano</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isSubscribed
                      ? "Este dispositivo está pronto para receber alertas mesmo com o aplicativo fechado."
                      : "Ative neste dispositivo para receber os lembretes programados mesmo com o aplicativo fechado."}
                  </p>
                </div>
                <span className={`mt-0.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${isSubscribed ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {isSubscribed ? "ATIVO" : "PENDENTE"}
                </span>
              </div>
              <Button
                type="button"
                onClick={sendTestNotification}
                disabled={!pushSupported || isActivating}
                className="w-full rounded-xl h-11 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <BellRing className="w-4 h-4" />
                {isActivating ? "Ativando notificações..." : isSubscribed ? "Enviar notificação de teste" : "Ativar e testar notificações"}
              </Button>
              {!pushSupported && (
                <p className="text-[11px] leading-relaxed text-destructive">
                  Este navegador não oferece suporte a notificações push.
                </p>
              )}
              {pushSupported && needsNewTab && !isSubscribed && (
                <p className="text-[11px] leading-relaxed text-amber-700">
                  Abra o aplicativo em uma aba própria (ou instalado na tela inicial) para liberar a permissão de notificações.
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={sendTomorrowAppointmentsNotification}
              className="w-full rounded-xl h-11 gap-2 border-primary/20 text-primary hover:bg-primary/5"
            >
              <BellRing className="w-4 h-4" /> Enviar agora os agendamentos de amanhã
            </Button>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Ative as notificações em cada aparelho que você usa: todos receberão os lembretes ao mesmo tempo, mesmo com o aplicativo fechado. No iPhone, instale o aplicativo na tela inicial antes de permitir as notificações.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
        <CardHeader className="p-5 sm:p-8 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="font-serif text-xl">Bloqueio de Horários</CardTitle>
              <CardDescription>Feche horários específicos para agendamentos</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="grid gap-2 flex-1">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Data</Label>
              <Input 
                type="date" 
                value={newClosedDate} 
                onChange={(e) => setNewClosedDate(e.target.value)} 
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2 flex-1">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Horário</Label>
              <select 
                value={newClosedTime} 
                onChange={(e) => setNewClosedTime(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Selecione...</option>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Button onClick={addClosedSlot} variant="outline" className="rounded-xl h-10 gap-2">
              <Plus className="w-4 h-4" /> Bloquear
            </Button>
          </div>

          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-4">
            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-primary">Bloquear intervalo em vários dias</Label>
              <p className="text-[11px] text-muted-foreground mt-1">Ex: das 08:00 às 13:00, do dia 10/06 ao 15/06.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Data inicial</Label>
                <Input type="date" value={rangeStartDate} onChange={(e) => setRangeStartDate(e.target.value)} className="rounded-xl h-10" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Data final (opcional)</Label>
                <Input type="date" value={rangeEndDate} onChange={(e) => setRangeEndDate(e.target.value)} className="rounded-xl h-10" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Das</Label>
                <select
                  value={rangeStartTime}
                  onChange={(e) => setRangeStartTime(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">--:--</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Até</Label>
                <select
                  value={rangeEndTime}
                  onChange={(e) => setRangeEndTime(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">--:--</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <Button onClick={addClosedRange} className="w-full rounded-xl h-11 gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Bloquear intervalo
            </Button>
          </div>

          <div className="rounded-2xl border border-dashed border-purple-300 bg-purple-50/40 p-4 sm:p-5 space-y-4">
            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-purple-700">Bloquear horário recorrente</Label>
              <p className="text-[11px] text-muted-foreground mt-1">Ex: bloquear das 19:00 às 21:00 sempre, ou apenas em um mês específico.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Das</Label>
                <select
                  value={recStart}
                  onChange={(e) => setRecStart(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">--:--</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Até</Label>
                <select
                  value={recEnd}
                  onChange={(e) => setRecEnd(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">--:--</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Abrangência</Label>
                <select
                  value={recScope}
                  onChange={(e) => setRecScope(e.target.value as 'always' | 'month')}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="always">Sempre (todos os dias)</option>
                  <option value="month">Um mês específico</option>
                </select>
              </div>
              {recScope === 'month' && (
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Mês</Label>
                  <Input type="month" value={recMonth} onChange={(e) => setRecMonth(e.target.value)} className="rounded-xl h-10" />
                </div>
              )}
            </div>
            <Button
              onClick={() => {
                if (!recStart || !recEnd) { toast.error("Escolha os horários"); return; }
                if (recEnd <= recStart) { toast.error("Horário final deve ser maior que o inicial"); return; }
                if (recScope === 'month' && !recMonth) { toast.error("Escolha o mês"); return; }
                const block = { startTime: recStart, endTime: recEnd, scope: recScope, ...(recScope === 'month' ? { month: recMonth } : {}) };
                setRecurringBlocks([...recurringBlocks, block]);
                setRecStart(""); setRecEnd(""); setRecMonth("");
                toast.success("Bloqueio recorrente adicionado!");
              }}
              className="w-full rounded-xl h-11 gap-2 bg-purple-600 text-white hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" /> Adicionar bloqueio recorrente
            </Button>

            {recurringBlocks.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {recurringBlocks.map((rb, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-purple-100">
                    <span className="text-sm font-medium">
                      {rb.startTime} - {rb.endTime} · {rb.scope === 'always' ? 'Sempre' : `Mês ${rb.month}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setRecurringBlocks(recurringBlocks.filter((_, i) => i !== idx))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 mt-4">
            <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Horários Bloqueados</Label>
            {closedSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum horário bloqueado.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {closedSlots.map((slot, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-sm font-medium">
                      {new Date(slot.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {slot.time}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeClosedSlot(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
        <CardHeader className="p-5 sm:p-8 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="font-serif text-xl">Funcionamento</CardTitle>
              <CardDescription>Dias de atendimento</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-8 pb-0">
          <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/40 p-4 sm:p-5 space-y-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-red-700">Fechar dia inteiro (folga/férias)</Label>
              <p className="text-[11px] text-muted-foreground mt-1">
                Nesses dias, a data fica bloqueada no calendário público e a cliente não consegue selecionar.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="grid gap-1.5 flex-1 w-full">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Data</Label>
                <Input
                  type="date"
                  value={newClosedDay}
                  onChange={(e) => setNewClosedDay(e.target.value)}
                  className="rounded-xl h-10"
                />
              </div>
              <Button
                onClick={() => {
                  if (!newClosedDay) { toast.error("Selecione uma data"); return; }
                  if (closedDates.includes(newClosedDay)) { toast.error("Dia já fechado"); return; }
                  setClosedDates([...closedDates, newClosedDay].sort());
                  setNewClosedDay("");
                  toast.success("Dia adicionado à lista!");
                }}
                variant="outline"
                className="rounded-xl h-10 gap-2 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" /> Fechar dia
              </Button>
            </div>
            {closedDates.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {closedDates.map((d) => (
                  <div key={d} className="flex items-center justify-between p-3 rounded-xl bg-white border border-red-100">
                    <span className="text-sm font-medium">
                      {new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setClosedDates(closedDates.filter(x => x !== d))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardContent className="p-5 sm:p-8 pb-0">
          <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-4 sm:p-5 space-y-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-orange-700">Horário de atendimento</Label>
              <p className="text-[11px] text-muted-foreground mt-1">
                Define os horários disponíveis para agendamento online. Padrão: 08:00 às 19:00.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Abre às</Label>
                <select
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Fecha às</Label>
                <select
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
        <CardContent className="p-5 sm:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
            {DAYS_OF_WEEK.map((day) => (
              <div 
                key={day} 
                className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${workingDays.includes(day) ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 bg-gray-50/50 text-gray-400 opacity-60'}`}
                onClick={() => setWorkingDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
              >
                <Checkbox checked={workingDays.includes(day)} className="mb-3" />
                <Label className="text-xs font-bold uppercase cursor-pointer">{day}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
        <CardHeader className="p-5 sm:p-8 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="font-serif text-xl">Personalização do Menu</CardTitle>
              <CardDescription>Escolha quais itens exibir no menu administrativo</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableNavItems.map((item) => {
              const isHidden = hiddenMenuItems.includes(item.id);
              return (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${!isHidden ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 bg-gray-50/50 text-gray-400 opacity-60'}`}
                  onClick={() => setHiddenMenuItems(prev => isHidden ? prev.filter(i => i !== item.id) : [...prev, item.id])}
                >
                  <div className="flex flex-col">
                    <Label className="text-sm font-bold cursor-pointer">{item.label}</Label>
                    <span className="text-[10px] uppercase tracking-widest mt-1">
                      {isHidden ? "Oculto" : "Visível"}
                    </span>
                  </div>
                  {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} className="rounded-full bg-primary px-12 h-14 font-bold shadow-xl shadow-primary/20 gap-2">
          <Save className="w-5 h-5" /> Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
