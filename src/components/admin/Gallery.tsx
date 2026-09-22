import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, Upload, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useMemo, memo } from "react";
import { NailPolishLoader } from "@/components/ui/nail-polish-loader";
import { optimizedImageUrl, optimizedSrcSet } from "@/lib/image-url";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { useServices, useUpdateService, useCreateService, useDeleteService, useUserIdentity } from "@/hooks/use-api-hooks";
import { formatDuration } from "@/lib/utils";

type ServiceRow = {
  id: string;
  name: string;
  image: string;
  description: string;
  price: number;
  duration: string;
  show_on_homepage: boolean;
};

function GalleryInner() {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<{ 
    name: string; 
    image: string; 
    description: string; 
    price: number; 
    duration: string;
    show_on_homepage: boolean;
  }>(
    { name: "", image: "", description: "", price: 0, duration: "", show_on_homepage: true }
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries & Mutations
  const { data: identity } = useUserIdentity();
  const { data: servicesRaw = [], isLoading: loadingServices, refetch: refetchServices } = useServices(identity?.user?.id);
  const updateMutation = useUpdateService();
  const createMutation = useCreateService();
  const deleteMutation = useDeleteService();

  const services = useMemo(() => {
    return (servicesRaw || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      image: s.image_url || '',
      description: s.description || '',
      price: Number(s.price) || 0,
      duration: s.duration || '',
      show_on_homepage: !!s.show_on_homepage,
    }));
  }, [servicesRaw]);

  useEffect(() => {
    const channel = supabase
      .channel('gallery-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        refetchServices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchServices]);

  const handleEdit = (service: ServiceRow) => {
    setIsEditing(service.id);
    setForm({
      name: service.name,
      image: service.image,
      description: service.description,
      price: service.price,
      duration: service.duration,
      show_on_homepage: service.show_on_homepage,
    });
  };

  const handleDelete = async (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleSave = async () => {
    if (!form.image) {
      toast.error("Selecione uma foto do dispositivo.");
      return;
    }
    if (!form.name) {
      toast.error("Informe um nome para o serviço.");
      return;
    }

    const serviceData = {
      name: form.name,
      image_url: form.image,
      description: form.description,
      price: form.price,
      duration: form.duration,
      show_on_homepage: form.show_on_homepage,
    };

    if (isEditing) {
      updateMutation.mutate({ id: isEditing, updates: serviceData }, {
        onSuccess: () => {
          setIsEditing(null);
          resetForm();
        }
      });
    } else {
      const owner_id = await getCurrentUserId();
      createMutation.mutate({ ...serviceData, owner_id }, {
        onSuccess: () => {
          setIsAdding(false);
          resetForm();
        }
      });
    }
  };

  const resetForm = () => {
    setForm({ name: "", image: "", description: "", price: 0, duration: "", show_on_homepage: true });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("gallery").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast.error("Erro ao enviar imagem.");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("gallery").getPublicUrl(path);
    setForm((f) => ({ ...f, image: data.publicUrl }));
    setUploading(false);
    toast.success("Foto carregada!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-xl font-serif text-primary">Meus Serviços</h3>
          <p className="text-sm text-muted-foreground">Edite as fotos e informações — as mudanças aparecem na tela inicial imediatamente.</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="rounded-full bg-primary shadow-lg shadow-primary/20 w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Anexar Nova Foto
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loadingServices ? (
          <div className="col-span-full flex justify-center py-12">
            <NailPolishLoader size={44} />
          </div>
        ) : services.map((service) => (
          <Card key={service.id} className="overflow-hidden border-none shadow-sm rounded-3xl group relative bg-white">
            <div className="aspect-[4/3] relative overflow-hidden">
              <img 
                src={optimizedImageUrl(service.image, { width: 500, quality: 75 }) || service.image} 
                srcSet={optimizedSrcSet(service.image, [300, 500, 800])}
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                alt={service.name} 
                loading="lazy" 
                decoding="async" 
                className="w-full h-full object-cover transition-transform group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button variant="secondary" size="icon" className="rounded-full" onClick={() => handleEdit(service)}>
                  <Edit className="w-4 h-4" />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon" className="rounded-full">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[2rem]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente a foto do serviço "{service.name}" da sua galeria.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDelete(service.id)}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <div className="p-4 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-gray-800 truncate">{service.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-1">{service.description} • {formatDuration(service.duration)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full h-8 w-8 text-primary hover:bg-primary/10" 
                  onClick={() => handleEdit(service)}
                  title="Editar serviço"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" 
                      title="Excluir serviço"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[2rem]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente a foto do serviço "{service.name}" da sua galeria.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDelete(service.id)}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={isEditing !== null || isAdding} onOpenChange={(open) => { if (!open) { setIsEditing(null); setIsAdding(false); resetForm(); } }}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary">{isEditing ? "Editar Foto" : "Anexar Nova Foto"}</DialogTitle>
            <DialogDescription>Altere a imagem e informações do serviço que o cliente verá.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Serviço</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Unha de Gel" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  placeholder="120"
                />
              </div>
              <div className="space-y-2">
                <Label>Duração</Label>
                <Input
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  placeholder="Ex: 60 min"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Foto do Serviço</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              {form.image ? (
                <div className="relative rounded-2xl overflow-hidden border border-gray-100 group">
                  <img src={form.image} alt="prévia" className="w-full h-48 object-cover" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-32 rounded-2xl border-dashed flex flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-xs">Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span className="text-xs">Escolher do dispositivo</span>
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label>Descrição Curta</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Breve resumo..." />
            </div>
            <div className="flex items-center space-x-2 py-2">
              <input 
                type="checkbox" 
                id="show_on_homepage" 
                checked={form.show_on_homepage}
                onChange={(e) => setForm({ ...form, show_on_homepage: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="show_on_homepage" className="text-sm font-medium leading-none cursor-pointer">
                Exibir na página inicial
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setIsEditing(null); setIsAdding(false); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={uploading || updateMutation.isPending || createMutation.isPending} className="rounded-full px-8 bg-primary">
              {(updateMutation.isPending || createMutation.isPending) ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Gallery = memo(GalleryInner);
