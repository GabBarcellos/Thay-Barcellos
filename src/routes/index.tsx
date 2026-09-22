import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resolvePublicTenant } from "@/lib/auth-helpers";
import { parseDuration } from "@/lib/utils";
import { z } from "zod";
import { useServices, useCreateAppointment } from "@/hooks/use-api-hooks";
import { useServerFn } from "@tanstack/react-start";
import { sendNewPublicBookingPush } from "@/lib/push.functions";
import { ServiceSelection } from "@/components/booking/ServiceSelection";
import { DateTimeSelection } from "@/components/booking/DateTimeSelection";
import { ConfirmationForm } from "@/components/booking/ConfirmationForm";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      t: typeof search.t === 'string' ? search.t : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Agendamento Online" },
      { name: "description", content: "Agende seu horário online." },
    ],
    links: [
      { rel: "preconnect", href: "https://kvzguromaiewthpachsa.supabase.co", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://kvzguromaiewthpachsa.supabase.co" },
    ],
  }),
  component: () => {
    const { t } = Route.useSearch();
    return <Index key={t || 'thaynabarcellosnails'} />;
  },
});

type ServiceItem = {
  id: string;
  name: string;
  price: number;
  duration: string;
  description: string;
  image: string;
};

function Index() {
  const { t } = Route.useSearch();
  const { queryClient } = Route.useRouteContext();
  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [tenant, setTenant] = useState<{ ownerId: string; businessName: string; slug: string } | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Queries & Mutations
  const { data: servicesRaw, isLoading: loadingServices } = useServices(tenant?.ownerId);
  const createMutation = useCreateAppointment();
  const notifyNewPublicBooking = useServerFn(sendNewPublicBookingPush);

  const services = useMemo(() => {
    return (servicesRaw || [])
      .filter((s: any) => s.show_on_homepage !== false)
      .map((s: any) => ({
        id: s.id,
        name: s.name,
        price: Number(s.price) || 0,
        duration: s.duration || "",
        description: s.description || "",
        image: s.image_url || "",
      }));
  }, [servicesRaw]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resolvedTenant = await resolvePublicTenant();
        if (cancelled) return;
        setTenant(resolvedTenant);

        const savedName = localStorage.getItem("nailcontrol:clientName");
        const savedPhone = localStorage.getItem("nailcontrol:clientPhone");
        if (savedName) setClientName(savedName);
        if (savedPhone) setClientPhone(savedPhone);
      } catch (err) {
        console.error("Error resolving tenant:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [t]);

  const { data: occupiedSlotsData, isLoading: loadingSlots } = useQuery({
    queryKey: ['occupied-slots', tenant?.ownerId, date ? date.toISOString().split('T')[0] : null],
    queryFn: async () => {
      if (!tenant || !date) return [];
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('appointments')
        .select('appointment_time, service_id, services(duration)')
        .eq('owner_id', tenant.ownerId)
        .gte('appointment_time', startOfDay.toISOString())
        .lte('appointment_time', endOfDay.toISOString())
        .neq('status', 'Cancelado');

      if (error) throw error;

      return data.map((appt: any) => {
        const startTime = new Date(appt.appointment_time);
        const durationMinutes = parseDuration(appt.services?.duration);
        const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
        return { start: startTime, end: endTime };
      });
    },
    enabled: !!tenant && !!date,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: tenantSettings } = useQuery({
    queryKey: ['public-tenant-settings', tenant?.ownerId],
    queryFn: async () => {
      if (!tenant) return { closedSlots: [] as any[], workStart: "08:00", workEnd: "19:00" };
      const { data } = await supabase
        .from('settings')
        .select('key,value')
        .eq('owner_id', tenant.ownerId)
        .in('key', ['closed_slots', 'closed_slots_recurring', 'working_hours_start', 'working_hours_end', 'working_days', 'closed_dates']);

      let closedSlots: any[] = [];
      let closedSlotsRecurring: any[] = [];
      let workStart = "08:00";
      let workEnd = "19:00";
      let workingDays: string[] = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
      let closedDates: string[] = [];
      (data || []).forEach((row: any) => {
        if (row.key === 'closed_slots' && row.value) {
          try { closedSlots = JSON.parse(row.value); } catch {}
        } else if (row.key === 'closed_slots_recurring' && row.value) {
          try { closedSlotsRecurring = JSON.parse(row.value); } catch {}
        } else if (row.key === 'working_hours_start' && row.value) {
          workStart = row.value;
        } else if (row.key === 'working_hours_end' && row.value) {
          workEnd = row.value;
        } else if (row.key === 'working_days' && row.value) {
          try { workingDays = JSON.parse(row.value); } catch {}
        } else if (row.key === 'closed_dates' && row.value) {
          try { closedDates = JSON.parse(row.value); } catch {}
        }
      });
      return { closedSlots, closedSlotsRecurring, workStart, workEnd, workingDays, closedDates };
    },
    enabled: !!tenant,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const closedSlots = tenantSettings?.closedSlots || [];
  const closedSlotsRecurring = tenantSettings?.closedSlotsRecurring || [];
  const workStart = tenantSettings?.workStart || "08:00";
  const workEnd = tenantSettings?.workEnd || "19:00";
  const workingDays = tenantSettings?.workingDays || ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
  const closedDates = tenantSettings?.closedDates || [];

  const disabledWeekdays = useMemo(() => {
    // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
    const map: Record<string, number> = { "Domingo":0, "Segunda":1, "Terça":2, "Quarta":3, "Quinta":4, "Sexta":5, "Sábado":6 };
    const openIdx = new Set(workingDays.map(d => map[d]).filter(n => n !== undefined));
    return [0,1,2,3,4,5,6].filter(n => !openIdx.has(n));
  }, [workingDays]);

  const availableSlots = useMemo(() => {
    const all = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00"];
    // 12:00 é horário de almoço — bloqueado todos os dias
    return all.filter(t => t >= workStart && t <= workEnd && t !== "12:00" && t !== "19:00");
  }, [workStart, workEnd]);

  useEffect(() => {
    if (!tenant) return;

    const channel = supabase
      .channel('public-appointments-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'appointments',
        filter: `owner_id=eq.${tenant.ownerId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['occupied-slots', tenant.ownerId] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'settings',
        filter: `owner_id=eq.${tenant.ownerId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['public-tenant-settings', tenant.ownerId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant, queryClient]);

  const totalDurationMinutes = useMemo(() => {
    if (selectedServices.length === 0) return 60;
    return selectedServices.reduce((acc, s) => acc + parseDuration(s.duration), 0);
  }, [selectedServices]);

  const totalPrice = useMemo(() => {
    return selectedServices.reduce((acc, s) => acc + (s.price || 0), 0);
  }, [selectedServices]);

  const isSlotOccupied = useCallback((timeStr: string) => {
    if (!date || selectedServices.length === 0) return false;
    
    const [hours, minutes] = timeStr.split(":").map(Number);
    const slotStart = new Date(date);
    slotStart.setHours(hours, minutes, 0, 0);
    
    const slotEnd = new Date(slotStart.getTime() + totalDurationMinutes * 60000);

    // Bloqueio fixo do horário de almoço (12:00 - 13:00) todos os dias
    const lunchStart = new Date(date);
    lunchStart.setHours(12, 0, 0, 0);
    const lunchEnd = new Date(date);
    lunchEnd.setHours(13, 0, 0, 0);
    if (slotStart < lunchEnd && slotEnd > lunchStart) return true;

    // Closed slots represent full 60-min blocks. Any overlap = blocked
    // (also catches custom manual times inside a closed hour).
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const isClosed = closedSlots.some((cs: any) => {
      if (cs.date !== dateStr) return false;
      const [ch, cm] = String(cs.time).split(':').map(Number);
      const csStart = new Date(date);
      csStart.setHours(ch, cm, 0, 0);
      const csEnd = new Date(csStart.getTime() + 60 * 60000);
      return slotStart < csEnd && slotEnd > csStart;
    });
    if (isClosed) return true;

    // Recurring closed slots (always, or specific month)
    const monthStr = `${y}-${m}`;
    const isRecClosed = closedSlotsRecurring.some((rc: any) => {
      if (rc.scope === 'month' && rc.month !== monthStr) return false;
      if (rc.scope !== 'month' && rc.scope !== 'always') return false;
      const [sh, sm] = String(rc.startTime).split(':').map(Number);
      const [eh, em] = String(rc.endTime).split(':').map(Number);
      const rcStart = new Date(date);
      rcStart.setHours(sh, sm, 0, 0);
      const rcEnd = new Date(date);
      rcEnd.setHours(eh, em, 0, 0);
      return slotStart < rcEnd && slotEnd > rcStart;
    });
    if (isRecClosed) return true;

    // Enforce working hours (slot must start within [workStart, workEnd])
    if (timeStr < workStart || timeStr > workEnd) return true;

    return (occupiedSlotsData || []).some(occupied => {
      return slotStart < occupied.end && slotEnd > occupied.start;
    });
  }, [date, selectedServices, totalDurationMinutes, occupiedSlotsData, closedSlots, closedSlotsRecurring, workStart, workEnd]);

  const handleBooking = async () => {
    if (!clientName || !clientPhone) {
      toast.error("Preencha todos os campos.");
      return;
    }

    if (selectedServices.length === 0) {
      toast.error("Selecione pelo menos um serviço.");
      return;
    }

    if (createMutation.isPending) return;

    if (selectedTime && isSlotOccupied(selectedTime)) {
      toast.error("Este horário acabou de ser ocupado. Por favor, escolha outro.");
      return;
    }

    if (!tenant) return;
    
    const [hours, minutes] = (selectedTime || "00:00").split(":");
    const appointmentDate = new Date(date || new Date());
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const servicesText = selectedServices.map(s => s.name).join(" + ");
    const obs = selectedServices.length > 1 ? `Serviços: ${servicesText}` : "";

    createMutation.mutate({
      client_name: clientName,
      phone: clientPhone,
      service_id: selectedServices[0]?.id,
      appointment_time: appointmentDate.toISOString(),
      price: totalPrice,
      observation: obs,
      status: 'Confirmado',
      owner_id: tenant.ownerId,
      booking_source: 'public',
    }, {
      onSuccess: (appointment) => {
        void notifyNewPublicBooking({ data: { appointmentId: appointment.id } }).catch((error) => {
          console.error("Não foi possível enviar a notificação do novo agendamento", error);
        });
        try {
          localStorage.setItem("nailcontrol:clientName", clientName);
          localStorage.setItem("nailcontrol:clientPhone", clientPhone);
        } catch {}
        setIsConfirmOpen(true);
      }
    });
  };

  return (
    <div className="relative min-h-screen bg-[#fff7f5] text-[#271515] selection:bg-primary/10">
      <section id="inicio" className="pt-4 sm:pt-8 pb-12 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-6 sm:mb-10 flex flex-col justify-center">
          <div className="animate-in fade-in duration-700">
            <p className="text-[#654f4e] text-sm sm:text-base md:text-lg font-light tracking-widest uppercase">
              Sua beleza em primeiro lugar
            </p>
          </div>
        </div>

        <div id="agendamento" className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
          <div className="hidden lg:block lg:col-span-1 space-y-4">
            {[
              { 
                id: 1, 
                label: selectedServices.length > 1 ? 'Serviços' : 'Serviço', 
                active: step === 1, 
                done: step > 1, 
                subtitle: selectedServices.length > 0 ? (selectedServices.length === 1 ? selectedServices[0].name : `${selectedServices.length} serviços selecionados (R$ ${totalPrice})`) : null 
              },
              { id: 2, label: 'Data e Hora', active: step === 2, done: step > 2, subtitle: date && selectedTime ? `${date.toLocaleDateString('pt-BR')} às ${selectedTime}` : null },
              { id: 3, label: 'Confirmação', active: step === 3, done: step > 3 }
            ].map((s) => (
              <button 
                key={s.id}
                onClick={() => (s.id < step || (s.id === 2 && selectedServices.length > 0)) && setStep(s.id)}
                className={`w-full p-4 rounded-xl border text-left transition-all ${s.active ? 'border-[#b0486e] bg-[#b0486e]/5 shadow-sm' : 'bg-white opacity-60 hover:opacity-100'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${s.active || s.done ? 'bg-[#b0486e] text-white' : 'bg-gray-100 text-gray-400'}`}>{s.id}</div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-tight">{s.label}</p>
                    {s.subtitle && <p className="text-xs text-[#b0486e] font-medium">{s.subtitle}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 min-h-[400px]">
            <div className="lg:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-2xl border border-[#b0486e]/10 shadow-sm">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === i ? 'bg-[#b0486e] text-white' : step > i ? 'bg-[#b0486e]/20 text-[#b0486e]' : 'bg-gray-100 text-gray-400'}`}>
                    {i}
                  </div>
                  {step === i && (
                    <span className="text-xs font-bold uppercase tracking-tight text-[#b0486e]">
                      {i === 1 ? 'Serviço' : i === 2 ? 'Horário' : 'Dados'}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {tenant && step === 1 && (
              <ServiceSelection 
                services={services} 
                loading={loadingServices} 
                selectedServices={selectedServices}
                onToggleService={(s) => {
                  setSelectedServices(prev => {
                    const exists = prev.some(item => item.id === s.id);
                    return exists ? prev.filter(item => item.id !== s.id) : [...prev, s];
                  });
                }}
                onContinue={() => {
                  if (selectedServices.length > 0) {
                    setStep(2);
                  } else {
                    toast.error("Selecione ao menos um serviço para continuar.");
                  }
                }}
              />
            )}

            {tenant && step === 2 && (
              <DateTimeSelection 
                date={date}
                onDateSelect={setDate}
                selectedTime={selectedTime}
                onTimeSelect={(t) => { setSelectedTime(t); setCustomTime(""); }}
                customTime={customTime}
                onCustomTimeChange={(t) => { setCustomTime(t); setSelectedTime(t); }}
                isSlotOccupied={isSlotOccupied}
                loadingSlots={loadingSlots}
                slots={availableSlots}
                disabledWeekdays={disabledWeekdays}
                closedDates={closedDates}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            )}

            {tenant && step === 3 && (
              <ConfirmationForm 
                clientName={clientName}
                onNameChange={setClientName}
                clientPhone={clientPhone}
                onPhoneChange={setClientPhone}
                selectedServices={selectedServices}
                date={date}
                selectedTime={selectedTime}
                isLoading={createMutation.isPending}
                onBack={() => setStep(2)}
                onConfirm={handleBooking}
              />
            )}
          </div>
        </div>
      </section>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="rounded-[2rem] text-center p-12 border-none">
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-serif text-[#b0486e]">Agendamento Realizado!</h2>
              <p className="text-muted-foreground">Tudo certo! Seu horário foi reservado com sucesso.</p>
            </div>
            <div className="w-full bg-gray-50 rounded-2xl p-6 text-left space-y-3">
              <div className="space-y-1.5">
                <span className="text-xs uppercase font-bold text-gray-400">Serviços</span>
                <p className="font-bold text-stone-800">{selectedServices.map(s => s.name).join(", ")}</p>
                <p className="text-sm text-[#b0486e] font-bold">Total: R$ {totalPrice}</p>
              </div>
              <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                <span className="text-xs uppercase font-bold text-gray-400">Data e Hora</span>
                <span className="font-bold">{date?.toLocaleDateString('pt-BR')} às {selectedTime}</span>
              </div>
            </div>
            <Button 
              onClick={() => {
                setIsConfirmOpen(false);
                setStep(1);
                setSelectedServices([]);
                setSelectedTime(null);
              }}
              className="w-full bg-[#b0486e] text-white rounded-full h-14 text-lg font-bold"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
