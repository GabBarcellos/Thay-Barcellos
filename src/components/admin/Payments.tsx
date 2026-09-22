import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { CheckCircle2, MessageCircle, Wallet, Clock, ExternalLink, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Payment {
  id: string;
  payer_name: string;
  amount: number;
  payment_date: string;
  status: string;
  method: string | null;
}

interface PendingAppointment {
  id: string;
  client_name: string;
  price: number;
  appointment_time: string;
  status: string;
  services: { name: string } | null;
  phone?: string | null;
  is_exchange?: boolean | null;
}

const today = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const emptyForm = () => ({
  payer_name: "",
  amount: "",
  method: "Dinheiro",
  status: "Pago",
  payment_date: today(),
  appointment_id: null as string | null,
});

export function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pending, setPending] = useState<PendingAppointment[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const parseSafeDate = (dateStr: string) => {
    if (!dateStr) return 0;
    if (dateStr.includes("T")) return new Date(dateStr).getTime();
    return new Date(`${dateStr}T00:00:00`).getTime();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    if (dateStr.includes("T")) {
      return new Date(dateStr).toLocaleDateString("pt-BR");
    }
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString("pt-BR");
  };

  async function fetchPayments() {
    const { data } = await supabase
      .from("payments")
      .select("*")
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (data) setPayments(data as Payment[]);
  }

  async function fetchPending() {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const { data } = await supabase
      .from("appointments")
      .select("id, client_name, price, appointment_time, status, phone, is_exchange, services(name)")
      .neq("status", "Concluído")
      .lte("appointment_time", endOfToday.toISOString())
      .order("appointment_time", { ascending: false });
    if (data) setPending(data as any);
  }

  useEffect(() => {
    fetchPayments();
    fetchPending();

    const channelPayments = supabase
      .channel('payments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchPayments();
      })
      .subscribe();

    const channelAppointments = supabase
      .channel('payments-appointments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchPending();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelPayments);
      supabase.removeChannel(channelAppointments);
    };
  }, []);

  function openNew() {
    setForm(emptyForm());
    setOpen(true);
  }

  function finalizeAppointment(app: PendingAppointment) {
    setForm({
      payer_name: app.client_name,
      amount: String(app.price ?? ""),
      method: app.is_exchange ? "Permuta" : "Dinheiro",
      status: "Pago",
      payment_date: today(),
      appointment_id: app.id,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.payer_name.trim() || !form.amount) {
      toast.error("Preencha nome e valor");
      return;
    }
    setSaving(true);
    const owner_id = await getCurrentUserId();
    
    if (selectedPayment) {
      // Edit mode
      const { error } = await supabase
        .from("payments")
        .update({
          payer_name: form.payer_name.trim(),
          amount: Number(form.amount),
          method: form.method,
          status: form.status,
          payment_date: form.payment_date,
        })
        .eq("id", selectedPayment.id);

      if (error) {
        toast.error("Erro ao atualizar pagamento");
        setSaving(false);
        return;
      }
      toast.success("Pagamento atualizado!");
    } else {
      // New mode
      const { error } = await supabase.from("payments").insert({
        payer_name: form.payer_name.trim(),
        amount: Number(form.amount),
        method: form.method,
        status: form.status,
        payment_date: form.payment_date,
        owner_id,
      });
      if (error) {
        toast.error("Erro ao salvar pagamento");
        setSaving(false);
        return;
      }
      if (form.appointment_id) {
        const updateData: { status: string; is_exchange?: boolean } = { status: "Concluído" };
        if (form.method === "Permuta") {
          updateData.is_exchange = true;
        }
        await supabase
          .from("appointments")
          .update(updateData)
          .eq("id", form.appointment_id);
      }
      toast.success("Pagamento registrado!");
    }

    setOpen(false);
    setSelectedPayment(null);
    setSaving(false);
    fetchPayments();
    fetchPending();
  }

  function handleEdit(p: Payment) {
    setSelectedPayment(p);
    setForm({
      payer_name: p.payer_name,
      amount: String(p.amount),
      method: p.method || "Dinheiro",
      status: p.status,
      payment_date: p.payment_date,
      appointment_id: null,
    });
    setOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja excluir este registro de pagamento?")) return;
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Excluído com sucesso");
    fetchPayments();
  }

  const sendReminder = (app: PendingAppointment) => {
    let phone = app.phone;

    // For test user, use the owner's real number
    if (localStorage.getItem("thaynails:businessName")?.toLowerCase().includes("teste")) {
      phone = "43984761436";
    }

    if (!phone) {
      toast.error("Cliente sem telefone cadastrado");
      return;
    }
    const digits = phone.replace(/\D/g, "");
    const normalized = digits.startsWith("55") ? digits : `55${digits}`;
    const serviceName = app.services?.name || "procedimento";
    const valor = Number(app.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const msg = `Olá ${app.client_name.split(" ")[0]}! ✨ Passando para enviar o lembrete do seu procedimento de *${serviceName}* no valor de *${valor}*. \n\nQualquer dúvida estou à disposição para combinarmos o pagamento! 😊`;
    
    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const todayLimit = today();

  const filteredPending = [...pending]
    .filter((a) => {
      const appDate = new Date(a.appointment_time).getTime();
      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      return appDate <= endOfToday;
    })
    .sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime())
    .filter((a) =>
      a.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (a.services?.name && a.services.name.toLowerCase().includes(search.toLowerCase()))
    );

  const filteredPayments = [...payments]
    .filter(p => {
      const pDate = p.payment_date ? p.payment_date.slice(0, 10) : "";
      return !pDate || pDate <= todayLimit;
    })
    .sort((a, b) => {
      const diffDate = parseSafeDate(b.payment_date) - parseSafeDate(a.payment_date);
      if (diffDate !== 0) return diffDate;
      const createdA = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
      const createdB = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
      return createdB - createdA;
    })
    .filter(p => 
      p.payer_name.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-6">
      <div className="w-full sm:max-w-xs">
        <Input 
          placeholder="Buscar por nome..." 
          className="rounded-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-white p-1 rounded-2xl sm:rounded-full border mb-6 flex flex-col sm:flex-row w-full sm:w-auto h-auto gap-1">
          <TabsTrigger value="pending" className="rounded-xl sm:rounded-full w-full sm:w-auto justify-center data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2.5 sm:py-2">
            <Clock className="w-4 h-4" /> Atendimentos Pendentes
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl sm:rounded-full w-full sm:w-auto justify-center data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2.5 sm:py-2">
            <Wallet className="w-4 h-4" /> Histórico de Pagamentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 animate-in fade-in duration-500">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-5 sm:p-6 pb-3 sm:pb-3">
              <CardTitle className="font-serif text-xl">Aguardando Pagamento</CardTitle>
              <CardDescription>Atendimentos realizados que ainda não foram finalizados financeiramente.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {/* Versão Mobile sem rolagem horizontal */}
              <div className="block sm:hidden divide-y divide-gray-100">
                {filteredPending.map((a) => (
                  <div key={a.id} className="p-4 space-y-3 bg-white hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 text-sm truncate">{a.client_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(a.appointment_time).toLocaleDateString("pt-BR")} · {a.services?.name || "Procedimento"}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-primary text-base">R$ {Number(a.price ?? 0).toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 rounded-full gap-1.5 text-xs h-9 border-primary/20 hover:bg-primary/5 text-primary font-medium"
                        onClick={() => finalizeAppointment(a)}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Finalizar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="rounded-full text-green-600 hover:text-green-700 hover:bg-green-50 px-3 h-9 gap-1 text-xs shrink-0"
                        onClick={() => sendReminder(a)}
                        title="Enviar cobrança via WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Cobrar</span>
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredPending.length === 0 && (
                  <div className="text-center py-10 px-4 text-muted-foreground italic text-sm">
                    Nenhum atendimento pendente de pagamento.
                  </div>
                )}
              </div>

              {/* Versão Desktop em Tabela */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="pl-6">Cliente</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Ações</TableHead>
                      <TableHead className="pr-6 text-right">Cobrança</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPending.map((a) => (
                      <TableRow key={a.id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="pl-6">
                          <div className="font-medium">{a.client_name}</div>
                          <div className="text-[10px] text-muted-foreground">{new Date(a.appointment_time).toLocaleDateString("pt-BR")}</div>
                        </TableCell>
                        <TableCell className="text-sm">{a.services?.name || "—"}</TableCell>
                        <TableCell className="font-bold text-primary">R$ {Number(a.price ?? 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="rounded-full gap-2 text-xs h-8 border-primary/20 hover:bg-primary/5 text-primary"
                            onClick={() => finalizeAppointment(a)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Finalizar
                          </Button>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="rounded-full text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => sendReminder(a)}
                            title="Enviar cobrança via WhatsApp"
                          >
                            <MessageCircle className="w-5 h-5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredPending.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                          Nenhum atendimento pendente de pagamento.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 animate-in fade-in duration-500">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-5 sm:p-6 pb-3 sm:pb-3">
              <CardTitle className="font-serif text-xl">Registros de Caixa</CardTitle>
              <CardDescription>Lista completa de todos os pagamentos recebidos.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {/* Versão Mobile sem rolagem horizontal */}
              <div className="block sm:hidden divide-y divide-gray-100">
                {filteredPayments.map((p) => (
                  <div key={p.id} className="p-4 space-y-2.5 bg-white hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 text-sm truncate">{p.payer_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{formatDate(p.payment_date)}</span>
                          <span>•</span>
                          <span className="bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 text-[10px] font-medium">
                            {p.method || "Dinheiro"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1 shrink-0">
                        <span className="font-bold text-gray-900 text-sm">R$ {Number(p.amount).toFixed(2)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'Pago' ? 'bg-green-100 text-green-700' :
                          p.status === 'Não Pago' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end items-center gap-2 pt-1 border-t border-gray-50">
                      <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs rounded-full text-muted-foreground hover:text-foreground gap-1.5" onClick={() => handleEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredPayments.length === 0 && (
                  <div className="text-center py-10 px-4 text-muted-foreground italic text-sm">
                    Nenhum registro de pagamento encontrado.
                  </div>
                )}
              </div>

              {/* Versão Desktop em Tabela */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="pl-6">Pagador</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Forma</TableHead>
                      <TableHead className="pr-6 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((p) => (
                      <TableRow key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="pl-6 font-medium">{p.payer_name}</TableCell>
                        <TableCell className="text-sm">{formatDate(p.payment_date)}</TableCell>
                        <TableCell className="font-bold">R$ {Number(p.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 font-medium">
                            {p.method}
                          </span>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              p.status === 'Pago' ? 'bg-green-100 text-green-700' :
                              p.status === 'Não Pago' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {p.status}
                            </span>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => handleEdit(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-red-500" onClick={() => handleDelete(p.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredPayments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                          Nenhum registro de pagamento encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New / Finalize form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-[92vw] sm:w-full rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 border-none shadow-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <DialogHeader className="mb-6">
              <DialogTitle className="font-serif text-2xl text-primary text-center">
                {form.appointment_id ? "Registrar Recebimento" : "Lançar Pagamento"}
              </DialogTitle>
              <DialogDescription className="text-center">
                Preencha os detalhes financeiros do atendimento.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Pagador / Cliente</Label>
                <Input
                  value={form.payer_name}
                  onChange={(e) => setForm({ ...form, payer_name: e.target.value })}
                  className="rounded-xl border-gray-100 bg-gray-50/50 h-12"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="rounded-xl border-gray-100 bg-gray-50/50 h-12 font-bold text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Data</Label>
                  <Input
                    type="date"
                    value={form.payment_date}
                    onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                    className="rounded-xl border-gray-100 bg-gray-50/50 h-12"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Forma</Label>
                  <Select
                    value={form.method || ""}
                    onValueChange={(v) => setForm({ ...form, method: v })}
                  >
                    <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50/50 h-12"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Pix">Pix</SelectItem>
                      <SelectItem value="Cartão">Cartão</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                      <SelectItem value="Permuta">Permuta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50/50 h-12"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="Pago">Pago</SelectItem>
                      <SelectItem value="Não Pago">Não Pago</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-8 flex-col-reverse sm:flex-row gap-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-full flex-1">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-primary rounded-full flex-1 h-12 text-base font-bold shadow-lg shadow-primary/20">
                {saving ? "Processando..." : "Confirmar Recebimento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}