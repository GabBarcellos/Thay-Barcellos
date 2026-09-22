import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Save,
  DollarSign,
  Clock,
  Type,
  Link,
  Loader2
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from "@/components/ui/card";
import { NailPolishLoader } from "@/components/ui/nail-polish-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/services")({
  component: AdminServices,
});

interface Service {
  id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  price: number;
  duration: string | null;
}

function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ 
    name: "", 
    image_url: "", 
    description: "",
    price: 0,
    duration: ""
  });

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Erro ao carregar serviços.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleEdit = (service: Service) => {
    setIsEditing(service.id);
    setEditForm({ 
      name: service.name, 
      image_url: service.image_url || "", 
      description: service.description || "",
      price: service.price,
      duration: service.duration || ""
    });
  };

  const handleSave = async () => {
    if (!editForm.name) {
      toast.error("O nome do serviço é obrigatório.");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      if (isEditing) {
        const { error } = await supabase
          .from('services')
          .update({
            name: editForm.name,
            image_url: editForm.image_url,
            description: editForm.description,
            price: editForm.price,
            duration: editForm.duration
          })
          .eq('id', isEditing);

        if (error) throw error;
        toast.success("Serviço atualizado!");
      } else {
        const { error } = await supabase
          .from('services')
          .insert([{
            name: editForm.name,
            image_url: editForm.image_url,
            description: editForm.description,
            price: editForm.price,
            duration: editForm.duration,
            owner_id: userData.user.id
          }]);

        if (error) throw error;
        toast.success("Novo serviço adicionado!");
      }
      setIsEditing(null);
      setIsAdding(false);
      fetchServices();
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error("Erro ao salvar serviço.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este serviço?")) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Serviço removido.");
      fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("Erro ao remover serviço.");
    }
  };

  const openAddModal = () => {
    setEditForm({ name: "", image_url: "", description: "", price: 0, duration: "" });
    setIsAdding(true);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen bg-[#fafafa]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-serif text-primary">Gestão Total de Conteúdo</h1>
          <p className="text-muted-foreground">Personalize preços, textos, fotos e durações de todos os serviços.</p>
        </div>
        <Button onClick={openAddModal} className="rounded-full gap-2 shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Novo Serviço
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full flex justify-center py-20">
            <NailPolishLoader size={48} />
          </div>
        ) : services.map((service) => (
          <Card key={service.id} className="overflow-hidden border-none shadow-sm rounded-[32px] group bg-white hover:shadow-xl transition-all duration-500">
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                src={service.image_url || "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&q=80&w=800"}
                alt={service.name}
                loading="lazy"
                decoding="async"
                className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <Button variant="secondary" size="icon" className="rounded-full w-12 h-12 shadow-lg" onClick={() => handleEdit(service)}>
                  <Edit className="w-5 h-5" />
                </Button>
                <Button variant="destructive" size="icon" className="rounded-full w-12 h-12 shadow-lg" onClick={() => handleDelete(service.id)}>
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-primary shadow-sm border border-white/20">
                R$ {service.price}
              </div>
            </div>
            <CardHeader className="p-8">
              <div className="flex justify-between items-center mb-2">
                 <CardTitle className="font-serif text-2xl text-gray-800">{service.name}</CardTitle>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {service.duration}
                 </span>
              </div>
              <CardDescription className="text-gray-500 leading-relaxed italic">"{service.description}"</CardDescription>
            </CardHeader>
          </Card>
        ))}
        {!loading && services.length === 0 && (
          <div className="col-span-full text-center py-20">
            <p className="text-muted-foreground italic">Nenhum serviço cadastrado.</p>
          </div>
        )}
      </div>

      <Dialog open={isEditing !== null || isAdding} onOpenChange={(open) => {
        if (!open) {
          setIsEditing(null);
          setIsAdding(false);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary/5 p-8 border-b border-primary/10">
            <DialogHeader>
              <DialogTitle className="text-3xl font-serif text-primary">
                {isAdding ? "Novo Serviço" : "Personalizar Serviço"}
              </DialogTitle>
              <DialogDescription className="text-gray-600 font-medium pt-1">
                Altere qualquer detalhe para personalizar o sistema NailControl.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Type className="w-3 h-3" /> Nome
                </Label>
                <Input 
                  id="name" 
                  value={editForm.name} 
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all h-12"
                  placeholder="Ex: Unha de Fibra"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price" className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <DollarSign className="w-3 h-3" /> Valor (R$)
                </Label>
                <Input 
                  id="price" 
                  type="number"
                  value={editForm.price} 
                  onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                  className="rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url" className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <Link className="w-3 h-3" /> URL da Imagem
              </Label>
              <Input 
                id="image_url" 
                value={editForm.image_url} 
                onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                className="rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all h-12"
                placeholder="https://images.unsplash.com/..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Duração
                </Label>
                <Input 
                  id="duration" 
                  value={editForm.duration} 
                  onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                  className="rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all h-12"
                  placeholder="Ex: 60 min"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Type className="w-3 h-3" /> Descrição
                </Label>
                <Input 
                  id="description" 
                  value={editForm.description} 
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all h-12"
                  placeholder="Breve resumo..."
                />
              </div>
            </div>
            
            <div className="aspect-[21/9] relative rounded-2xl overflow-hidden border-2 border-primary/10 group">
              <img src={editForm.image_url || "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800"} alt="Preview" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] flex items-center justify-center">
                 <span className="bg-white/90 text-primary px-4 py-1.5 rounded-full text-[10px] font-bold shadow-xl border border-primary/20 uppercase tracking-widest">Visualização em Tempo Real</span>
              </div>
            </div>
          </div>

          <div className="p-8 bg-gray-50 border-t border-gray-100">
            <DialogFooter className="flex sm:justify-between items-center gap-4">
              <Button variant="ghost" onClick={() => { setIsEditing(null); setIsAdding(false); }} className="rounded-full font-bold text-gray-400 hover:text-gray-600">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="rounded-full gap-2 px-10 h-12 font-bold shadow-xl shadow-primary/30">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Configurações
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}