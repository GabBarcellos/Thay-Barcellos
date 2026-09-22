import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { 
  Sparkles, 
  Calendar, 
  Loader2, 
  ArrowRight,
  Heart,
  Star,
  Clock,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useServices } from "@/hooks/use-api-hooks";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { NailPolishLoader } from "@/components/ui/nail-polish-loader";

export const Route = createFileRoute("/admin/tablet-mode")({
  validateSearch: z.object({
    t: z.string().optional(),
  }),
  component: TabletModePage,
});

function TabletModePage() {
  const { t } = Route.useSearch();
  const [showBooking, setShowBooking] = useState(false);
  const [tenant, setTenant] = useState<{ ownerId: string; businessName: string; slug: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (t) {
        const { data } = await supabase
          .from("tenants")
          .select("owner_user_id, business_name, slug")
          .eq("slug", t)
          .maybeSingle();
        
        if (data) {
          setTenant({
            ownerId: data.owner_user_id,
            businessName: data.business_name,
            slug: data.slug
          });
        }
      }
      setLoading(false);
    })();
  }, [t]);

  const { data: servicesRaw = [], isLoading: loadingServices } = useServices(tenant?.ownerId);

  const services = useMemo(() => {
    return (servicesRaw || []).slice(0, 4).map((s: any) => ({
      id: s.id,
      name: s.name,
      image: s.image_url,
      price: s.price
    }));
  }, [servicesRaw]);

  if (loading || (loadingServices && !services.length)) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#fff7f5]">
        <NailPolishLoader size={56} />
        <p className="font-serif text-xl text-primary animate-pulse">Preparando seu momento...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-white relative font-sans">
      <AnimatePresence mode="wait">
        {!showBooking ? (
          <motion.div 
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#fff7f5] via-white to-[#fff0f3]"
          >
            {/* Background decorative elements */}
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ duration: 8, repeat: Infinity }}
              className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-primary/5 rounded-full blur-3xl" 
            />
            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 10, repeat: Infinity, delay: 1 }}
              className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] bg-primary/10 rounded-full blur-3xl" 
            />
            
            <div className="max-w-5xl w-full text-center space-y-12 relative z-20">
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  className="inline-block px-6 py-2 rounded-full bg-primary/10 text-primary font-serif italic text-xl mb-6"
                >
                  {tenant?.businessName || "Seu Momento de Beleza"}
                </motion.div>
                <h1 className="text-6xl md:text-8xl font-serif text-gray-900 leading-[1.1] tracking-tight">
                  Sua beleza merece <br />
                  <span className="text-primary italic font-light">um novo capítulo.</span>
                </h1>
                <p className="text-2xl text-gray-500 mt-8 max-w-3xl mx-auto font-light leading-relaxed">
                  Não deixe para depois o cuidado que você merece hoje. <br />
                  <span className="font-medium text-gray-700">Que tal já garantir seu próximo horário?</span>
                </p>
              </motion.div>

              <motion.div 
                className="grid grid-cols-2 md:grid-cols-4 gap-8 py-4"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                {services.map((svc) => (
                  <motion.div 
                    key={svc.id} 
                    whileHover={{ y: -10 }}
                    className="group relative"
                  >
                    <div className="aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-primary/10 bg-white border border-white transition-all duration-500">
                      <img 
                        src={svc.image || "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&q=80&w=800"} 
                        alt={svc.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                      <div className="absolute bottom-6 left-6 right-6 text-left">
                        <p className="text-white font-serif text-xl leading-tight mb-1">{svc.name}</p>
                        <p className="text-primary-foreground/80 text-sm font-medium">A partir de R$ {svc.price}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="pt-10"
              >
                <Button 
                  onClick={() => setShowBooking(true)}
                  className="rounded-full h-24 px-16 text-3xl font-serif bg-primary hover:bg-primary/95 text-white shadow-[0_20px_50px_rgba(176,72,110,0.3)] transition-all hover:scale-105 active:scale-95 group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-4">
                    Vamos reagendar?
                    <ArrowRight className="w-10 h-10 group-hover:translate-x-3 transition-transform duration-300" />
                  </span>
                  <motion.div 
                    className="absolute inset-0 bg-white/10"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </Button>
                
                <div className="flex items-center justify-center gap-12 mt-16">
                  <div className="flex flex-col items-center gap-2 group">
                    <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Star className="w-6 h-6 fill-current" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Exclusivo</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 group">
                    <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Heart className="w-6 h-6 fill-current" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Cuidado</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 group">
                    <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Sparkles className="w-6 h-6 fill-current" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Beleza</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="booking"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-20 bg-white flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-30">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Calendar className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl leading-none text-gray-900">Agendamento Online</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Sessão Exclusiva · {tenant?.businessName}</p>
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => setShowBooking(false)}
                className="rounded-full h-12 px-6 text-gray-400 hover:text-primary hover:bg-primary/5 font-medium transition-all"
              >
                Voltar ao Painel
              </Button>
            </div>
            <div className="flex-1 overflow-hidden relative bg-[#fff7f5]">
              <iframe 
                src={`/?t=${tenant?.slug || ""}`}
                className="w-full h-full border-none"
                title="Agendamento"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}