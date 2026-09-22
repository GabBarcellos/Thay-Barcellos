import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Save, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Expense {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
}

export function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: "",
    amount: 0,
    due_date: new Date().toISOString().split('T')[0],
    status: "Pendente"
  });

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('due_date', { ascending: false });
        
      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Erro ao carregar despesas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();

    const channel = supabase
      .channel('expenses-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        fetchExpenses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenNew = () => {
    setEditingId(null);
    setForm({
      description: "",
      amount: 0,
      due_date: new Date().toISOString().split('T')[0],
      status: "Pendente"
    });
    setOpen(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setForm({
      description: expense.description,
      amount: expense.amount,
      due_date: expense.due_date,
      status: expense.status
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta despesa?")) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Despesa excluída.");
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Erro ao excluir despesa.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description) {
      toast.error("Descrição é obrigatória.");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const payload = {
        description: form.description,
        amount: Number(form.amount),
        due_date: form.due_date,
        status: form.status,
        owner_id: userData.user.id
      };

      if (editingId) {
        const { error } = await supabase
          .from('expenses')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        toast.success("Despesa atualizada!");
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([payload]);
        if (error) throw error;
        toast.success("Despesa criada!");
      }
      setOpen(false);
      fetchExpenses();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("Erro ao salvar despesa.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleOpenNew} className="rounded-full bg-primary shadow-lg shadow-primary/20 gap-2">
          <Plus className="w-4 h-4" /> Nova Despesa
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardContent className="p-0">
          {/* Mobile sem rolagem horizontal */}
          <div className="block sm:hidden divide-y divide-gray-100">
            {expenses.map((e) => (
              <div key={e.id} className="p-4 space-y-2.5 bg-white hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-sm truncate">{e.description}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Vencimento: {new Date(e.due_date).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1 shrink-0">
                    <span className="font-bold text-gray-900 text-sm">R$ {Number(e.amount).toFixed(2)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      e.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {e.status}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end items-center gap-2 pt-1 border-t border-gray-50">
                  <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs rounded-full text-muted-foreground hover:text-foreground gap-1.5" onClick={() => handleOpenEdit(e)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5" onClick={() => handleDelete(e.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </div>
            ))}
            {!loading && expenses.length === 0 && (
              <div className="text-center py-10 px-4 text-muted-foreground italic text-sm">
                Nenhuma despesa registrada.
              </div>
            )}
          </div>

          {/* Desktop em Tabela */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="pl-6">Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="font-medium pl-6">{e.description}</TableCell>
                    <TableCell>{new Date(e.due_date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="font-bold">R$ {Number(e.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        e.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {e.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => handleOpenEdit(e)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-red-500" onClick={() => handleDelete(e.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                      Nenhuma despesa registrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="font-serif">
                {editingId ? "Editar Despesa" : "Nova Despesa"}
              </DialogTitle>
              <DialogDescription>
                Informe os detalhes da despesa para controle financeiro.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Aluguel, Energia, Materiais..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Vencimento</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" /> Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}