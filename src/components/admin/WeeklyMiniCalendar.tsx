import { memo, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Plus, Pencil, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateAppointmentDialog } from "./CreateAppointmentDialog";
import { useServices } from "@/hooks/use-api-hooks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface WeeklyMiniCalendarProps {
  onDateSelect?: (date: Date) => void;
}

export const WeeklyMiniCalendar = memo(function WeeklyMiniCalendar({ onDateSelect }: WeeklyMiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    client_name: "",
    service_id: "",
    appointment_time: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<any | null>(null);
  const [isDeletingAppointment, setIsDeletingAppointment] = useState(false);

  const { data: servicesData = [] } = useServices();
  const services = (servicesData || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price) || 0,
  }));
  
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const fetchMonthData = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const { data } = await supabase
      .from('appointments')
      .select('id, client_name, phone, appointment_time, status, service_id, price, observation, services(id, name, price)')
      .gte('appointment_time', startOfMonth.toISOString())
      .lte('appointment_time', endOfMonth.toISOString())
      .order('appointment_time', { ascending: true });

    if (data) {
      setAppointments(data);
    }
  };

  useEffect(() => {
    fetchMonthData();

    const channel = supabase
      .channel('calendar-appointments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchMonthData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentDate]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const selectDay = (day: number) => {
    setSelectedDay(day);
    onDateSelect?.(new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 9, 0));
  };

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getAppointmentsForDay = (day: number) => {
    return appointments.filter(app => {
      const d = new Date(app.appointment_time);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  };

  const selectedAppointments = selectedDay ? getAppointmentsForDay(selectedDay) : [];

  const getServiceLabel = (app: any) => {
    const savedServices = app.observation?.match(/^Serviços:\s*(.+)$/m)?.[1]?.trim();
    return savedServices || app.services?.name || "Serviço não especificado";
  };

  const openEditModal = (app: any) => {
    setEditingApp(app);
    setEditForm({
      client_name: app.client_name || "",
      service_id: app.service_id || app.services?.id || "",
      appointment_time: app.appointment_time ? app.appointment_time.slice(0, 16) : "",
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;
    setIsSavingEdit(true);
    try {
      const selectedService = services.find((s: any) => s.id === editForm.service_id);
      const updates: any = {
        client_name: editForm.client_name.trim(),
        service_id: editForm.service_id || null,
        appointment_time: new Date(editForm.appointment_time).toISOString(),
      };
      if (selectedService) {
        updates.price = Number(selectedService.price) || 0;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', editingApp.id);

      if (error) throw error;

      toast.success("Agendamento atualizado com sucesso!");
      setEditingApp(null);
      fetchMonthData();
    } catch (err: any) {
      toast.error("Erro ao atualizar agendamento: " + (err?.message || "Tente novamente"));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteAppointment = async () => {
    if (!appointmentToDelete) return;

    setIsDeletingAppointment(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentToDelete.id);

      if (error) throw error;

      toast.success("Agendamento excluído com sucesso!");
      setAppointmentToDelete(null);
      fetchMonthData();
    } catch {
      toast.error("Não foi possível excluir o agendamento. Tente novamente.");
    } finally {
      setIsDeletingAppointment(false);
    }
  };

  return (
    <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8 items-start">
      {/* Coluna do Calendário */}
      <div className="space-y-3 lg:col-span-5 xl:col-span-5 lg:max-w-sm">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-serif text-lg text-gray-900">
            {monthNames[currentDate.getMonth()]} <span className="text-muted-foreground font-sans text-sm">{currentDate.getFullYear()}</span>
          </h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <span key={i} className="text-[10px] font-bold text-muted-foreground uppercase">{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {blanks.map(b => <div key={`b-${b}`} />)}
          {days.map((day) => {
            const dayAppts = getAppointmentsForDay(day);
            const count = dayAppts.length;
            const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
            const isSelected = day === selectedDay;
            
            return (
              <button 
                key={day} 
                onClick={() => selectDay(day)}
                className="flex flex-col items-center gap-1 group outline-none cursor-pointer"
              >
                <div className={`w-full aspect-square rounded-lg sm:rounded-xl flex flex-col items-center justify-center transition-all relative ${
                  isSelected 
                    ? 'bg-primary text-white shadow-sm font-bold scale-[1.03]' 
                    : isToday
                      ? 'bg-primary/15 text-primary font-bold border border-primary/30'
                      : 'bg-gray-50/70 text-gray-700 hover:bg-gray-100 hover:scale-[1.02]'
                }`}>
                  <span className="text-xs">{day}</span>
                  {count > 0 && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                  )}
                  {count > 0 && isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-white" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Coluna da Agenda do Dia Selecionado */}
      <div className="mt-4 pt-4 border-t border-gray-100 lg:mt-0 lg:pt-0 lg:border-t-0 lg:border-l lg:border-gray-100 lg:pl-8 lg:col-span-7 xl:col-span-7 flex flex-col min-h-[260px]">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
            {selectedDay ? `Agenda de ${selectedDay} de ${monthNames[currentDate.getMonth()].toLowerCase()}` : 'Selecione um dia'}
          </p>
          {selectedDay && selectedAppointments.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                {selectedAppointments.length} {selectedAppointments.length === 1 ? 'horário' : 'horários'}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-full text-primary hover:bg-primary/10 cursor-pointer"
                onClick={() => setIsAddDialogOpen(true)}
                title="Novo agendamento"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
          {selectedDay && selectedAppointments.length === 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2.5 text-[10px] rounded-full gap-1 border-primary/20 text-primary hover:bg-primary/5 cursor-pointer font-medium"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Agendar
            </Button>
          )}
        </div>
        <div className="space-y-2 max-h-[260px] lg:max-h-[290px] overflow-y-auto pr-1 scrollbar-none">
          {selectedDay && selectedAppointments.length > 0 ? (
            selectedAppointments.map((app) => (
              <div key={app.id} className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-gray-50/80 hover:bg-gray-100/90 transition-all border border-gray-100 group">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="font-bold text-xs sm:text-sm text-gray-900 truncate">{app.client_name}</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground break-words" title={getServiceLabel(app)}>{getServiceLabel(app)}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-primary bg-white px-2.5 py-1 rounded-lg shadow-xs border border-primary/15">
                    {new Date(app.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-white hover:shadow-xs transition-all shrink-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(app);
                    }}
                    title="Editar horário ou serviço"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all shrink-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAppointmentToDelete(app);
                    }}
                    title="Excluir agendamento"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-xs text-muted-foreground italic">
                {selectedDay ? 'Nenhum agendamento para este dia.' : 'Toque em um dia para ver a agenda.'}
              </p>
              {selectedDay && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 rounded-full gap-1.5 text-xs text-primary border-primary/20 hover:bg-primary/5 cursor-pointer"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar primeiro agendamento
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <CreateAppointmentDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
        initialDate={selectedDay ? new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay, 9, 0) : undefined}
      />

      <Dialog open={!!appointmentToDelete} onOpenChange={(open) => { if (!open && !isDeletingAppointment) setAppointmentToDelete(null); }}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-gray-900">Excluir agendamento?</DialogTitle>
            <DialogDescription>
              {appointmentToDelete
                ? `O horário de ${appointmentToDelete.client_name} será removido da agenda e ficará disponível novamente.`
                : "Este horário será removido da agenda."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAppointmentToDelete(null)}
              disabled={isDeletingAppointment}
              className="rounded-full"
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAppointment}
              disabled={isDeletingAppointment}
              className="rounded-full px-6"
            >
              {isDeletingAppointment ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</>
              ) : (
                "Excluir horário"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingApp} onOpenChange={(open) => { if (!open) setEditingApp(null); }}>
        <DialogContent className="rounded-3xl max-w-md">
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl text-primary">Editar Agendamento</DialogTitle>
              <DialogDescription>
                Altere o horário ou o serviço da cliente diretamente por aqui.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label htmlFor="edit_dash_client_name">Nome da Cliente</Label>
                <Input
                  id="edit_dash_client_name"
                  value={editForm.client_name}
                  onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_dash_service">Serviço</Label>
                <Select
                  value={editForm.service_id}
                  onValueChange={(v) => setEditForm({ ...editForm, service_id: v })}
                >
                  <SelectTrigger id="edit_dash_service" className="rounded-xl">
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {services.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.price ? `(R$ ${Number(s.price).toFixed(2)})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="edit_dash_date">Data</Label>
                  <Input
                    id="edit_dash_date"
                    type="date"
                    value={editForm.appointment_time.split('T')[0] || ""}
                    onChange={(e) => {
                      const time = editForm.appointment_time.split('T')[1] || "09:00";
                      setEditForm({ ...editForm, appointment_time: `${e.target.value}T${time}` });
                    }}
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Horário</Label>
                    <Input
                      type="time"
                      className="w-28 h-8 text-xs rounded-lg"
                      value={editForm.appointment_time.split('T')[1]?.slice(0, 5) || "09:00"}
                      onChange={(e) => {
                        const date = editForm.appointment_time.split('T')[0] || new Date().toISOString().split('T')[0];
                        setEditForm({ ...editForm, appointment_time: `${date}T${e.target.value}` });
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"].map((t) => (
                      <Button
                        key={t}
                        type="button"
                        variant={editForm.appointment_time.includes(t) ? "default" : "outline"}
                        className="text-xs h-7 p-0 rounded-lg"
                        onClick={() => {
                          const date = editForm.appointment_time.split('T')[0] || new Date().toISOString().split('T')[0];
                          setEditForm({ ...editForm, appointment_time: `${date}T${t}` });
                        }}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingApp(null)}
                disabled={isSavingEdit}
                className="rounded-full"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-primary rounded-full px-6 shadow-md shadow-primary/20"
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
});