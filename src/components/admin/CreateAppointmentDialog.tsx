import { useState, useEffect } from "react";
import { Check, ChevronDown, Plus, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServices, useAppointments } from "@/hooks/use-api-hooks";
import { getAppointmentErrorMessage } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
}

export function CreateAppointmentDialog({ open, onOpenChange, initialDate }: CreateAppointmentDialogProps) {
  const { data: servicesData = [] } = useServices();
  const { refetch: refetchAppts } = useAppointments();
  const [saving, setSaving] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "" });
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-autocomplete'],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from('clients')
        .select('id, name, phone')
        .eq('owner_id', u.user.id)
        .order('name');
      return data || [];
    },
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    client_name: "",
    phone: "",
    service_id: "",
    appointment_time: "",
    status: "Confirmado",
    is_exchange: false,
    custom_price: "",
  });

  useEffect(() => {
    if (open) {
      const baseDate = initialDate || new Date();
      // Adjust to local ISO string format YYYY-MM-DDThh:mm
      const tzOffset = baseDate.getTimezoneOffset() * 60000;
      const localISOTime = new Date(baseDate.getTime() - tzOffset).toISOString().slice(0, 16);
      
      setSelectedServiceIds([]);
      setServicesOpen(false);
      setForm({
        client_name: "",
        phone: "",
        service_id: "",
        appointment_time: localISOTime,
        status: "Confirmado",
        is_exchange: false,
        custom_price: "",
      });
    }
  }, [open, initialDate]);

  const services = servicesData.map(s => ({
    id: s.id,
    name: s.name,
    price: Number(s.price) || 0
  }));

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newClient.name.trim();
    const phone = newClient.phone.trim();

    if (!name || !phone) {
      toast.error("Preencha o nome e o WhatsApp da cliente.");
      return;
    }

    setCreatingClient(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("clients")
        .insert({ name, phone, owner_id: userData.user.id })
        .select("id, name, phone")
        .single();

      if (error) {
        if (error.message.toLowerCase().includes("duplicate key")) {
          throw new Error("Já existe uma cliente cadastrada com esse nome.");
        }
        throw error;
      }

      setForm((previous) => ({
        ...previous,
        client_name: data.name,
        phone: data.phone || "",
      }));
      setNewClient({ name: "", phone: "" });
      setNewClientOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["clients-autocomplete"] });
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente cadastrada e selecionada!");
    } catch (error: any) {
      toast.error(error?.message === "Não autenticado" ? "Você precisa entrar na sua conta para cadastrar uma cliente." : error?.message || "Não foi possível cadastrar a cliente.");
    } finally {
      setCreatingClient(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const primaryServiceId = selectedServiceIds[0] || form.service_id || null;
      const selectedServicesList = services.filter(s => selectedServiceIds.includes(s.id));
      const calculatedTotal = selectedServicesList.reduce((acc, s) => acc + s.price, 0);
      const finalPrice = form.custom_price !== "" ? Number(form.custom_price) : (calculatedTotal || (services.find(s => s.id === form.service_id)?.price || 0));

      const finalObservation = selectedServicesList.length > 1
        ? `Serviços: ${selectedServicesList.map(s => s.name).join(" + ")}`
        : null;

      const { error } = await supabase
        .from('appointments')
        .insert([{
          client_name: form.client_name,
          phone: form.phone,
          service_id: primaryServiceId,
          appointment_time: new Date(form.appointment_time).toISOString(),
          status: form.status || 'Confirmado',
          owner_id: userData.user.id,
          price: finalPrice,
          observation: finalObservation,
          discount: 0,
          is_exchange: form.is_exchange,
          custom_price: form.custom_price !== "" ? Number(form.custom_price) : null
        }]);

      if (error) throw error;

      toast.success("Agendamento criado com sucesso");
      onOpenChange(false);
      refetchAppts();
    } catch (error: any) {
      console.error(error);
      toast.error(getAppointmentErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 border-none shadow-2xl max-h-[90vh] flex flex-col">
        <form onSubmit={handleCreate} className="flex flex-col h-full overflow-hidden">
          <DialogHeader className="mb-2 text-left">
            <DialogTitle className="font-serif text-xl sm:text-2xl text-primary">Novo Agendamento</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">Crie um novo atendimento manualmente de forma rápida.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto pr-1 sm:pr-2 scrollbar-thin">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="global_client">Cliente</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewClientOpen(true)}
                  className="rounded-full border-primary/25 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova cliente
                </Button>
              </div>
              <Select
                value={clients.find((client) => client.name === form.client_name)?.id || ""}
                onValueChange={(clientId) => {
                  const client = clients.find((item) => item.id === clientId);
                  if (!client) return;
                  setForm((previous) => ({
                    ...previous,
                    client_name: client.name,
                    phone: client.phone || "",
                  }));
                }}
                required
              >
                <SelectTrigger id="global_client" className="h-11 rounded-xl bg-background">
                  <SelectValue placeholder={clients.length ? "Selecione uma cliente" : "Nenhuma cliente cadastrada"} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clients.length === 0 && (
                <p className="text-xs text-muted-foreground">Cadastre uma cliente antes de criar o agendamento.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Serviços
                </Label>
                {selectedServiceIds.length > 0 && (
                  <span className="text-[11px] font-medium text-primary">
                    {selectedServiceIds.length} selecionado{selectedServiceIds.length === 1 ? '' : 's'} • Total: R$ {services.filter(s => selectedServiceIds.includes(s.id)).reduce((acc, curr) => acc + curr.price, 0)}
                  </span>
                )}
              </div>

              <div className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-card/60 backdrop-blur-xs ${
                servicesOpen ? 'border-primary/40 shadow-sm ring-2 ring-primary/10' : 'border-input hover:border-primary/30'
              }`}>
                <button
                  type="button"
                  onClick={() => setServicesOpen(prev => !prev)}
                  className="w-full flex items-center justify-between p-3 text-left transition-colors hover:bg-muted/30 cursor-pointer"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    {selectedServiceIds.length === 0 ? (
                      <span className="text-xs sm:text-sm text-muted-foreground font-normal">
                        Toque para escolher os serviços...
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {services.filter(s => selectedServiceIds.includes(s.id)).map(s => (
                          <span 
                            key={s.id} 
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                          >
                            <span className="truncate max-w-[130px] sm:max-w-[200px]">{s.name}</span>
                            <span className="font-semibold text-[10px] opacity-80">R${s.price}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pl-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${servicesOpen ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${servicesOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </button>

                {servicesOpen && (
                  <div className="border-t border-border/60 p-2.5 bg-muted/20 space-y-2 animate-in fade-in-0 duration-150">
                    <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                      <span>Escolha um ou múltiplos serviços:</span>
                      {selectedServiceIds.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedServiceIds([]);
                            setForm(prev => ({ ...prev, service_id: "", custom_price: "" }));
                          }}
                          className="text-primary hover:underline font-medium text-[11px] cursor-pointer"
                        >
                          Limpar seleção
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {services.map((s) => {
                        const isSelected = selectedServiceIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              const updated = isSelected 
                                ? selectedServiceIds.filter(id => id !== s.id)
                                : [...selectedServiceIds, s.id];
                              setSelectedServiceIds(updated);
                              const sum = services.filter(srv => updated.includes(srv.id)).reduce((acc, curr) => acc + curr.price, 0);
                              setForm(prev => ({ 
                                ...prev,
                                service_id: updated[0] || "",
                                custom_price: sum > 0 ? String(sum) : ""
                              }));
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-medium border text-left transition-all duration-150 cursor-pointer ${
                              isSelected 
                                ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold' 
                                : 'bg-background hover:bg-muted/80 hover:border-primary/30 border-border/70 text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-1">
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                isSelected ? 'border-white bg-white/20 text-white' : 'border-muted-foreground/30 bg-muted/30'
                              }`}>
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                              <span className="truncate">{s.name}</span>
                            </div>
                            <span className={`font-bold whitespace-nowrap ml-1.5 px-2 py-0.5 rounded-md text-[11px] ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary border border-primary/20'
                            }`}>
                              R$ {s.price}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="global_custom_price" className="text-xs sm:text-sm">Preço Final (R$)</Label>
              <Input 
                id="global_custom_price" 
                type="number" 
                step="0.01" 
                value={form.custom_price} 
                onChange={(e) => setForm({ ...form, custom_price: e.target.value })} 
                placeholder="Valor total"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-muted/30 border border-border/50 cursor-pointer" onClick={() => setForm(f => ({ ...f, is_exchange: !f.is_exchange }))}>
              <input 
                type="checkbox" 
                id="global_is_exchange" 
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                checked={form.is_exchange} 
                onChange={(e) => setForm({ ...form, is_exchange: e.target.checked })}
                onClick={(e) => e.stopPropagation()}
              />
              <Label htmlFor="global_is_exchange" className="text-xs sm:text-sm font-medium leading-none cursor-pointer flex-1">
                Este agendamento é uma Permuta
              </Label>
            </div>

            <div className="space-y-3 p-3 rounded-2xl bg-muted/20 border border-border/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="global_appointment_date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</Label>
                  <Input
                    id="global_appointment_date"
                    type="date"
                    className="h-10 rounded-xl bg-background"
                    value={form.appointment_time.split('T')[0]}
                    onChange={(e) => {
                      const time = form.appointment_time.split('T')[1] || "08:00";
                      setForm({ ...form, appointment_time: `${e.target.value}T${time}` });
                    }}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horário</Label>
                  <Input 
                    type="time" 
                    className="h-10 rounded-xl bg-background w-full"
                    value={form.appointment_time.split('T')[1]?.slice(0, 5) || ""}
                    onChange={(e) => {
                      const date = form.appointment_time.split('T')[0] || new Date().toISOString().split('T')[0];
                      setForm({ ...form, appointment_time: `${date}T${e.target.value}` });
                    }}
                    required
                  />
                </div>
              </div>

              <div className="pt-1">
                <span className="text-[11px] text-muted-foreground block mb-1.5 font-medium">Horários rápidos:</span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"].map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={form.appointment_time.includes(t) ? "default" : "outline"}
                      className={`text-xs h-8 p-0 rounded-lg font-medium transition-all ${
                        form.appointment_time.includes(t) ? 'bg-[#b0486e] text-white shadow-sm' : 'bg-background hover:bg-muted'
                      }`}
                      onClick={() => {
                        const date = form.appointment_time.split('T')[0] || new Date().toISOString().split('T')[0];
                        setForm({ ...form, appointment_time: `${date}T${t}` });
                      }}
                    >{t}</Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 mt-2 border-t border-border/40 flex-col-reverse sm:flex-row gap-2 sm:gap-2">
            <Button type="button" variant="ghost" className="rounded-full w-full sm:w-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-white rounded-full w-full sm:w-auto h-11 px-6 font-semibold shadow-md shadow-primary/25">
              {saving ? 'Criando...' : 'Confirmar Agendamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-[28px] p-5 sm:p-6">
          <form onSubmit={handleCreateClient}>
            <DialogHeader className="text-left">
              <DialogTitle className="font-serif text-xl text-primary">Nova cliente</DialogTitle>
              <DialogDescription>
                Cadastre a cliente e ela será selecionada neste agendamento.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-5">
              <div className="space-y-2">
                <Label htmlFor="new_client_name">Nome completo</Label>
                <Input
                  id="new_client_name"
                  value={newClient.name}
                  onChange={(e) => setNewClient((previous) => ({ ...previous, name: e.target.value }))}
                  placeholder="Nome da cliente"
                  autoFocus
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_client_phone">WhatsApp</Label>
                <Input
                  id="new_client_phone"
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient((previous) => ({ ...previous, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  required
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="ghost" onClick={() => setNewClientOpen(false)} disabled={creatingClient} className="rounded-full">
                Cancelar
              </Button>
              <Button type="submit" disabled={creatingClient} className="rounded-full bg-primary px-6 shadow-md shadow-primary/20">
                {creatingClient ? "Cadastrando..." : "Cadastrar cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
