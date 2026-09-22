import { useEffect, useState, useMemo, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { formatPhone } from "@/lib/utils";

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413Z" />
    </svg>
  );
}
import { NailPolishLoader } from "@/components/ui/nail-polish-loader";
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
import { useAppointments, useServices, useUpdateAppointment, useDeleteAppointment } from "@/hooks/use-api-hooks";

interface Appointment {
  id: string;
  client_name: string;
  phone: string | null;
  services: { name: string; id: string } | null;
  service_id: string;
  appointment_time: string;
  status: string;
  price: number | null;
  observation: string | null;
  discount: number | null;
  is_exchange: boolean | null;
  custom_price: number | null;
}

type FilterRange = 7 | 15 | 30 | 0 | -1;

function AppointmentsInner() {
  const [range, setRange] = useState<FilterRange>(-1);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
  

  // Queries & Mutations
  const { data: appointments = [], isLoading: loadingAppts, refetch: refetchAppts } = useAppointments(range);
  const { data: servicesData = [] } = useServices();
  const updateMutation = useUpdateAppointment();
  const deleteMutation = useDeleteAppointment();

  const services = (servicesData || []).map(s => ({
    id: s.id,
    name: s.name,
    price: Number(s.price) || 0
  }));

  // Form state
  const [form, setForm] = useState({
    client_name: "",
    phone: "",
    service_id: "",
    appointment_time: "",
    status: "Confirmado",
    observation: "",
    discount: "0",
    is_exchange: false,
    custom_price: "",
  });

  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        refetchAppts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchAppts]);

  const filtered = useMemo(() => appointments as unknown as Appointment[], [appointments]);

  const handleEdit = (app: Appointment) => {
    setSelectedApp(app);
    setForm({
      client_name: app.client_name,
      phone: app.phone || "",
      service_id: app.service_id || "",
      appointment_time: app.appointment_time.slice(0, 16),
      status: app.status,
      observation: app.observation || "",
      discount: String(app.discount || 0),
      is_exchange: !!app.is_exchange,
      custom_price: app.custom_price ? String(app.custom_price) : "",
    });
    setEditOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este agendamento?")) return;
    deleteMutation.mutate(id);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    
    updateMutation.mutate({
      id: selectedApp.id,
      updates: {
        client_name: form.client_name,
        phone: form.phone,
        service_id: form.service_id,
        appointment_time: new Date(form.appointment_time).toISOString(),
        status: form.status,
        observation: form.observation,
        discount: Number(form.discount),
        is_exchange: form.is_exchange,
        custom_price: form.custom_price ? Number(form.custom_price) : null,
        price: form.custom_price ? Number(form.custom_price) : (services.find(s => s.id === form.service_id)?.price || 0),
      }
    }, {
      onSuccess: () => {
        setEditOpen(false);
        toast.success("Agendamento atualizado");
      }
    });
  };


  const resetForm = () => {
    setForm({
      client_name: "",
      phone: "",
      service_id: "",
      appointment_time: "",
      status: "Confirmado",
      observation: "",
      discount: "0",
      is_exchange: false,
      custom_price: "",
    });
    setSelectedApp(null);
  };

  const getServiceLabel = (app: Appointment) => {
    const savedServices = app.observation?.match(/^Serviços:\s*(.+)$/m)?.[1]?.trim();
    return savedServices || app.services?.name || "N/A";
  };

  const buildWhatsappLink = (app: Appointment) => {
    let phone = app.phone;
    if (localStorage.getItem("thaynails:businessName")?.toLowerCase().includes("teste")) {
      phone = "43984761436";
    }
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    const normalized = digits.startsWith("55") ? digits : `55${digits}`;
    const dt = new Date(app.appointment_time);
    const dateStr = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
    const timeStr = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const serviceName = getServiceLabel(app) === "N/A" ? "seu serviço" : getServiceLabel(app);
    const msg = `Oi ${app.client_name.split(" ")[0]}! 💖 Só passando para confirmar seu horário de *${serviceName}* no dia *${dateStr}* às *${timeStr}*. Posso confirmar? 😊`;
    return `https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`;
  };

  const filters: { label: string; value: FilterRange }[] = [
    { label: "Hoje", value: -1 },
    { label: "7 dias", value: 7 },
    { label: "15 dias", value: 15 },
    { label: "30 dias", value: 30 },
    { label: "Todos", value: 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Button
            key={f.value}
            size="sm"
            type="button"
            variant={range === f.value ? "default" : "outline"}
            className={`rounded-full h-8 px-3.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
              range === f.value
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 border-gray-200 shadow-none"
            }`}
            onClick={() => setRange(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="space-y-3 md:hidden">
        {loadingAppts ? (
          <div className="flex justify-center py-12"><NailPolishLoader size={40} /></div>
        ) : filtered.map((app) => {
          const link = buildWhatsappLink(app);
          return (
            <Card key={app.id} className="border-none shadow-sm rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{app.client_name}</p>
                    <p className="text-xs text-muted-foreground">{getServiceLabel(app)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(app.appointment_time).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold ${
                    app.status === 'Confirmado' ? 'bg-green-100 text-green-700' :
                    app.status === 'Concluído' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{app.status}</span>
                </div>
                <div className="flex gap-2">
                  {link && (
                    <Button asChild size="sm" className="flex-1 rounded-full bg-green-600 hover:bg-green-700 text-white gap-2">
                      <a href={link} target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="w-4 h-4" /> WhatsApp</a>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleEdit(app)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" className="rounded-full text-red-500" onClick={() => handleDelete(app.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!loadingAppts && filtered.length === 0 && (
          <p className="text-center py-8 text-muted-foreground italic text-sm">Nenhum agendamento no período.</p>
        )}
      </div>

      <Card className="border-none shadow-sm rounded-3xl hidden md:block">
        <CardContent className="p-3 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingAppts ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8"><div className="flex justify-center"><NailPolishLoader size={36} /></div></TableCell></TableRow>
              ) : filtered.map((app) => {
                const link = buildWhatsappLink(app);
                return (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.client_name}</TableCell>
                    <TableCell>{getServiceLabel(app)}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(app.appointment_time).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        app.status === 'Confirmado' ? 'bg-green-100 text-green-700' :
                        app.status === 'Concluído' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{app.status}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {link && (
                          <Button asChild size="sm" className="rounded-full bg-green-600 hover:bg-green-700 text-white gap-2">
                            <a href={link} target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="w-4 h-4" /> WhatsApp</a>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => handleEdit(app)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="rounded-full text-red-500" onClick={() => handleDelete(app.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loadingAppts && filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">Nenhum agendamento no período.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit & Create Dialogs */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="font-serif">Editar Agendamento</DialogTitle>
              <DialogDescription>Altere as informações do atendimento selecionado.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
              <div className="space-y-2">
                <Label htmlFor="client_name">Nome da Cliente</Label>
                <Input id="client_name" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (WhatsApp)</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(43) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select 
                  value={form.service_id} 
                  onValueChange={(v) => {
                    const selected = services.find(s => s.id === v);
                    setForm({ 
                      ...form, 
                      service_id: v,
                      custom_price: selected ? String(selected.price) : form.custom_price
                    });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione um serviço" /></SelectTrigger>
                  <SelectContent>{services.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="custom_price">Preço Customizado (R$)</Label>
                  <Input 
                    id="custom_price" 
                    type="number" 
                    step="0.01" 
                    value={form.custom_price} 
                    onChange={(e) => setForm({ ...form, custom_price: e.target.value })} 
                    placeholder="Valor total"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Desconto (R$)</Label>
                  <Input 
                    id="discount" 
                    type="number" 
                    step="0.01" 
                    value={form.discount} 
                    onChange={(e) => setForm({ ...form, discount: e.target.value })} 
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="is_exchange" 
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                  checked={form.is_exchange} 
                  onChange={(e) => setForm({ ...form, is_exchange: e.target.checked })}
                />
                <Label htmlFor="is_exchange" className="text-sm font-medium leading-none cursor-pointer">
                  Este agendamento é uma Permuta
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observation">Observações da Cliente</Label>
                <textarea 
                  id="observation"
                  className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.observation}
                  onChange={(e) => setForm({ ...form, observation: e.target.value })}
                  placeholder="Informações importantes sobre a cliente..."
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_appointment_date">Data</Label>
                  <Input
                    id="edit_appointment_date"
                    type="date"
                    value={form.appointment_time.split('T')[0]}
                    onChange={(e) => {
                      const time = form.appointment_time.split('T')[1] || "08:00";
                      setForm({ ...form, appointment_time: `${e.target.value}T${time}` });
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Horário</Label>
                    <Input 
                      type="time" 
                      className="w-32 h-8 text-xs" 
                      value={form.appointment_time.split('T')[1]?.slice(0, 5) || ""}
                      onChange={(e) => {
                        const date = form.appointment_time.split('T')[0] || new Date().toISOString().split('T')[0];
                        setForm({ ...form, appointment_time: `${date}T${e.target.value}` });
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"].map((t) => (
                      <Button
                        key={t}
                        type="button"
                        variant={form.appointment_time.includes(t) ? "default" : "outline"}
                        className="text-xs h-8 p-0"
                        onClick={() => {
                          const date = form.appointment_time.split('T')[0] || new Date().toISOString().split('T')[0];
                          setForm({ ...form, appointment_time: `${date}T${t}` });
                        }}
                      >{t}</Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Confirmado">Confirmado</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export const Appointments = memo(AppointmentsInner);
