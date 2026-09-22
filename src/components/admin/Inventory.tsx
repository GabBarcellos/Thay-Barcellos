import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  item_name: string;
  stock_quantity: number;
  status: string;
  category: string | null;
}

function computeStatus(qty: number): string {
  if (qty <= 1) return "Crítico";
  if (qty <= 3) return "Baixo";
  return "Normal";
}

export function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ item_name: "", stock_quantity: 0 });

  async function fetchInventory() {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("item_name", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar estoque: " + error.message);
      return;
    }
    if (data) setItems(data);
  }

  useEffect(() => {
    fetchInventory();

    const channel = supabase
      .channel('inventory-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        fetchInventory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function openNew() {
    setEditingId(null);
    setForm({ item_name: "", stock_quantity: 0 });
    setOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditingId(item.id);
    setForm({
      item_name: item.item_name,
      stock_quantity: item.stock_quantity,
    });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.item_name.trim()) {
      toast.error("Informe o nome do item.");
      return;
    }
    setSaving(true);
    const base = {
      item_name: form.item_name.trim(),
      stock_quantity: Number(form.stock_quantity) || 0,
      status: computeStatus(Number(form.stock_quantity) || 0),
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from("inventory").update(base).eq("id", editingId));
    } else {
      const owner_id = await getCurrentUserId();
      ({ error } = await supabase.from("inventory").insert({ ...base, owner_id }));
    }

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success(editingId ? "Item atualizado!" : "Item adicionado!");
    setOpen(false);
    fetchInventory();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este item?")) return;
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    toast.success("Item excluído.");
    fetchInventory();
  }

  const filtered = items.filter((i) =>
    i.item_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <Input
          placeholder="Buscar item..."
          className="w-full sm:max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="button" className="rounded-full bg-primary w-full sm:w-auto" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Novo Item
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardContent className="p-0">
          {/* Mobile sem rolagem horizontal */}
          <div className="block sm:hidden divide-y divide-gray-100">
            {filtered.map((item) => (
              <div key={item.id} className="p-4 space-y-2.5 bg-white hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-sm truncate">{item.item_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Quantidade: <span className="font-bold text-gray-800">{item.stock_quantity}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.status === "Crítico"
                        ? "bg-red-100 text-red-700"
                        : item.status === "Baixo"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="flex justify-end items-center gap-2 pt-1 border-t border-gray-50">
                  <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs rounded-full text-muted-foreground hover:text-foreground gap-1.5" onClick={() => openEdit(item)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-10 px-4 text-muted-foreground italic text-sm">
                Nenhum item em estoque.
              </div>
            )}
          </div>

          {/* Desktop em Tabela */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="pl-6">Item</TableHead>
                  <TableHead>Qtd. Atual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="font-medium pl-6">{item.item_name}</TableCell>
                    <TableCell>{item.stock_quantity}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          item.status === "Crítico"
                            ? "bg-red-100 text-red-700"
                            : item.status === "Baixo"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full text-red-500"
                          onClick={() => handleDelete(item.id)}
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
                      Nenhum item em estoque.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar item" : "Novo item"}</DialogTitle>
              <DialogDescription>
                Preencha os dados do item de estoque.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="item_name">Nome do item</Label>
                <Input
                  id="item_name"
                  value={form.item_name}
                  onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Quantidade</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  min={0}
                  value={form.stock_quantity}
                  onChange={(e) =>
                    setForm({ ...form, stock_quantity: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
