import { useState, useEffect, useRef, useMemo, memo } from "react";
import { optimizedImageUrl } from "@/lib/image-url";
import "./WhatsAppIntegration.css";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  RefreshCw,
  Share2,
  Download,
  Image as ImageIcon,
  Plus,
  X,
  Edit2,
  Trash2,
  Upload,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, startOfDay, endOfDay, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as modernScreenshot from "modern-screenshot";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NailPolishLoader } from "@/components/ui/nail-polish-loader";
import { parseDuration } from "@/lib/utils";

const DEFAULT_TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
];

interface WhatsAppIntegrationProps {
  businessName: string;
  tenantSlug: string;
  userName?: string;
}

function WhatsAppIntegrationInner({ businessName, tenantSlug, userName }: WhatsAppIntegrationProps) {
  const queryClient = useQueryClient();
  const [targetDate, setTargetDate] = useState<Date>(() => {
    const now = new Date();
    return now.getHours() >= 19 ? addDays(now, 1) : now;
  });

  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [newTime, setNewTime] = useState("");
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const DEFAULT_BACKGROUNDS = [
    "https://kvzguromaiewthpachsa.supabase.co/storage/v1/object/public/gallery/d8045deb-983e-443e-8973-efc609f41ef7/7fe1a0f5-4b67-4247-9ef9-737b29c0a370.png?t=1780488930065",
    "https://kvzguromaiewthpachsa.supabase.co/storage/v1/object/public/gallery/d8045deb-983e-443e-8973-efc609f41ef7/8b28038b-9e98-497c-b57a-093d4c1c1507.png?t=1780489825482",
    "https://kvzguromaiewthpachsa.supabase.co/storage/v1/object/public/gallery/d8045deb-983e-443e-8973-efc609f41ef7/63ce1128-9314-4a84-b68a-f87c1724489a.png?t=1780489999239",
  ];
  const [selectedBgUrl, setSelectedBgUrl] = useState(() => localStorage.getItem('thaynails:lastWhatsAppBg') || DEFAULT_BACKGROUNDS[0]);
  const [isUploading, setIsUploading] = useState(false);

  // Queries
  const { data: backgrounds = [], isLoading: loadingBackgrounds } = useQuery({
    queryKey: ['whatsapp-backgrounds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_backgrounds')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const hiddenDefaults: string[] = JSON.parse(localStorage.getItem('hide_whatsapp_default_bgs') || '[]');
      const defaults = DEFAULT_BACKGROUNDS
        .filter(url => !hiddenDefaults.includes(url))
        .map((url, i) => ({ id: `default-${i}`, url, is_default: true }));
      return [...defaults, ...(data || []).map(bg => ({ id: bg.id, url: bg.url, is_default: !!bg.is_default }))];
    },
    staleTime: 1000 * 60 * 30,
  });

  const { data: availableSlots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['available-slots-whatsapp', format(targetDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const start = startOfDay(targetDate).toISOString();
      const end = endOfDay(targetDate).toISOString();

      const { data: appts, error } = await supabase
        .from('appointments')
        .select('appointment_time, services(duration)')
        .gte('appointment_time', start)
        .lte('appointment_time', end)
        .neq('status', 'Cancelado');

      if (error) throw error;

      // Build occupied time ranges based on appointment start + service duration
      const occupiedRanges = (appts || []).map((a: any) => {
        const apptStart = new Date(a.appointment_time);
        const durationMin = parseDuration(a.services?.duration);
        const apptEnd = new Date(apptStart.getTime() + durationMin * 60000);
        return { start: apptStart, end: apptEnd };
      });
      const now = new Date();
      const isToday = format(targetDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
      
      const available = DEFAULT_TIME_SLOTS.filter(slot => {
        const [hour, minute] = slot.split(':').map(Number);
        const slotDate = new Date(targetDate);
        slotDate.setHours(hour, minute, 0, 0);
        const slotEnd = new Date(slotDate.getTime() + 60 * 60000); // 1h slot window
        const isOccupied = occupiedRanges.some(r => slotDate < r.end && slotEnd > r.start);
        return !isOccupied && !(isToday && isAfter(now, slotDate));
      });

      return available;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Sync selected slots when available slots change
  useEffect(() => {
    if (availableSlots) {
      setSelectedSlots(availableSlots);
    }
  }, [availableSlots]);

  const handleUploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Enviando imagem...");

    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Usuário não autenticado");

      const fileExt = file.name.split('.').pop();
      const fileName = `${u.user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(fileName);

      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      const { error: dbError } = await supabase
        .from('whatsapp_backgrounds')
        .insert({ url: urlWithCacheBuster, user_id: u.user.id });

      if (dbError) throw dbError;

      toast.success("Fundo adicionado!", { id: toastId });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-backgrounds'] });
      setSelectedBgUrl(urlWithCacheBuster);
      localStorage.setItem('thaynails:lastWhatsAppBg', urlWithCacheBuster);
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteBackground = async (id: string, url: string) => {
    if (id.startsWith('default')) {
      const hidden: string[] = JSON.parse(localStorage.getItem('hide_whatsapp_default_bgs') || '[]');
      if (!hidden.includes(url)) hidden.push(url);
      localStorage.setItem('hide_whatsapp_default_bgs', JSON.stringify(hidden));
      toast.success("Fundo padrão ocultado.");
      queryClient.invalidateQueries({ queryKey: ['whatsapp-backgrounds'] });
      if (selectedBgUrl === url) setSelectedBgUrl(DEFAULT_BACKGROUNDS[0]);
      return;
    }

    const toastId = toast.loading("Removendo fundo...");
    try {
      const { error } = await supabase.from('whatsapp_backgrounds').delete().eq('id', id);
      if (error) throw error;
      toast.success("Fundo removido!", { id: toastId });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-backgrounds'] });
      if (selectedBgUrl === url) setSelectedBgUrl("/uploads/colado-1780485743646.png");
    } catch (error: any) {
      toast.error("Erro ao excluir", { id: toastId });
    }
  };

  const handleDownloadImage = async () => {
    if (!previewRef.current) return;
    setIsGeneratingImage(true);
    const toastId = toast.loading("Gerando imagem...");
    try {
      const dataUrl = await modernScreenshot.domToPng(previewRef.current, { scale: 3 });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `status-${format(targetDate, "dd-MM")}.png`;
      link.click();
      toast.success("Sucesso!", { id: toastId });
    } catch (error) {
      toast.error("Erro ao gerar imagem.", { id: toastId });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 space-y-6 min-w-0">
          <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="p-4 sm:p-8 bg-gray-50/50 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="font-serif text-xl">Vagas de {format(targetDate, "dd/MM")}</CardTitle>
                  <CardDescription>{format(targetDate, "EEEE", { locale: ptBR })}</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ['available-slots-whatsapp'] })}>
                <RefreshCw className={`w-4 h-4 ${loadingSlots ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = addDays(new Date(), i);
                  const isSelected = format(d, "yyyy-MM-dd") === format(targetDate, "yyyy-MM-dd");
                  return (
                    <button
                      key={i}
                      onClick={() => setTargetDate(d)}
                      className={`flex flex-col items-center min-w-[70px] p-3 rounded-2xl transition-all border ${isSelected ? "bg-primary text-white border-primary shadow-md" : "bg-gray-50 text-gray-500 border-gray-100"}`}
                    >
                      <span className="text-[10px] uppercase font-bold mb-1 opacity-80">{format(d, "EEE", { locale: ptBR })}</span>
                      <span className="text-lg font-bold">{format(d, "dd")}</span>
                    </button>
                  );
                })}
              </div>

              {loadingSlots ? (
                <div className="flex justify-center py-8"><NailPolishLoader size={40} /></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {availableSlots.map(slot => (
                    <Button
                      key={slot}
                      variant={selectedSlots.includes(slot) ? "default" : "outline"}
                      onClick={() => setSelectedSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot].sort())}
                      className="rounded-xl h-12"
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-[2rem]">
            <CardHeader className="p-8"><CardTitle className="font-serif text-xl">Fundo do Status</CardTitle></CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <label className="aspect-[9/16] rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadBackground} disabled={isUploading} />
                  {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="w-6 h-6 text-gray-400" />}
                </label>
                {backgrounds.map(bg => (
                  <div key={bg.id} className={`relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${selectedBgUrl === bg.url ? "border-primary shadow-lg" : "border-transparent"}`} onClick={() => { setSelectedBgUrl(bg.url); localStorage.setItem('thaynails:lastWhatsAppBg', bg.url); }}>
                    <img 
                      src={optimizedImageUrl(bg.url, { width: 320, quality: 70 }) || bg.url} 
                      className="w-full h-full object-cover" 
                      loading="lazy" 
                      decoding="async" 
                      alt="Fundo de status"
                    />
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteBackground(bg.id, bg.url); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-red-500 hover:bg-white"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full xl:w-[450px] space-y-6">
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl">Prévia do Status</h3>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleDownloadImage} disabled={isGeneratingImage} className="rounded-full"><Download className="w-4 h-4 mr-2" /> Baixar</Button>
              </div>
            </div>

            <div ref={previewRef} className="aspect-[9/16] w-full bg-black rounded-[2.5rem] shadow-2xl overflow-hidden relative border-8 border-white">
              {selectedBgUrl && <img src={selectedBgUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" />}
              <div className="absolute inset-0 flex items-center justify-center px-8 text-white">
                <div className="grid grid-cols-2 gap-4 w-full max-w-[280px]">
                  {selectedSlots.map(slot => (
                    <div key={slot} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl py-3 px-4 flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-bold">{slot}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const WhatsAppIntegration = memo(WhatsAppIntegrationInner);