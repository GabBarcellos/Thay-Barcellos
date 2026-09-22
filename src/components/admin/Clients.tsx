import { useState, useEffect, useMemo, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pencil, Loader2, MessageCircle, User, FileText, Trash2 } from "lucide-react";
import { useClients, useDeleteClient, useUpdateClient, useUserIdentity } from "@/hooks/use-api-hooks";
import { NailPolishLoader } from "@/components/ui/nail-polish-loader";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

function ClientsInner() {
  const { data: identity } = useUserIdentity();
  const { data: clients = [], isLoading } = useClients(identity?.user?.id);
  const updateMutation = useUpdateClient();
  const deleteMutation = useDeleteClient();
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });

  // Debounce no input de busca para evitar re-renderizações a cada tecla
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  function openEdit(client: any) {
    setEditingId(client.id);
    setForm({
      name: client.name,
      phone: client.phone,
      notes: client.notes || "",
    });
    setOpen(true);
  }

  function handleDelete(client: any) {
    const confirmed = window.confirm(`Excluir ${client.name}? Os agendamentos já realizados permanecerão no histórico.`);
    if (confirmed) {
      deleteMutation.mutate(client.id);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    updateMutation.mutate({
      id: editingId,
      updates: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim(),
        updated_at: new Date().toISOString()
      }
    }, {
      onSuccess: () => {
        setOpen(false);
      }
    });
  }

  const filtered = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim();
    if (!term) return clients;
    return clients.filter((c: any) =>
      (c.name || "").toLowerCase().includes(term) ||
      (c.phone || "").includes(term)
    );
  }, [clients, debouncedSearch]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <NailPolishLoader size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Input
            placeholder="Buscar por nome ou WhatsApp..."
            className="w-full pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardContent className="p-0">
          {/* Mobile sem rolagem horizontal */}
          <div className="block sm:hidden divide-y divide-gray-100">
            {filtered.map((client: any) => (
              <div key={client.id} className="p-4 space-y-3 bg-white hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 text-sm truncate">{client.name}</div>
                      <a 
                        href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium mt-0.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {client.phone}
                      </a>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(client)}
                      className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Editar cliente"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(client)}
                      disabled={deleteMutation.isPending}
                      className="rounded-full h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      title="Excluir cliente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {client.notes && (
                  <p className="text-xs text-muted-foreground bg-gray-50 p-2.5 rounded-xl border border-gray-100/80 leading-relaxed">
                    {client.notes}
                  </p>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-10 px-4 text-muted-foreground italic text-sm">
                Nenhuma cliente encontrada.
              </div>
            )}
          </div>

          {/* Desktop em Tabela */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="pl-6">Cliente</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client: any) => (
                  <TableRow key={client.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="font-medium pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        {client.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <a 
                        href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline font-medium"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {client.phone}
                      </a>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                        {client.notes || "Sem observações"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(client)}
                          className="rounded-full h-8 w-8"
                          title="Editar cliente"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(client)}
                          disabled={deleteMutation.isPending}
                          className="rounded-full h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                          title="Excluir cliente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">
                      Nenhuma cliente encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl text-primary">Editar Cliente</DialogTitle>
              <DialogDescription>
                Atualize as informações da sua cliente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Observações / Histórico
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Ex: Prefere unhas quadradas, alérgica a tal produto..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="rounded-xl min-h-[100px] resize-none"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={updateMutation.isPending}
                className="rounded-full"
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary rounded-full px-8" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Clients = memo(ClientsInner);
