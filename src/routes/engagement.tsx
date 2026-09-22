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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { NailPolishLoader } from "@/components/ui/nail-polish-loader";
import { useServices } from "@/hooks/use-api-hooks";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";

export const Route = createFileRoute("/engagement")({
  validateSearch: z.object({
    t: z.string().optional(),
  }),
  component: EngagementPage,
});

function EngagementPage() {
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

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#fff7f5]">
        <NailPolishLoader size={56} />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#fff7f5] relative font-sans">
      <AnimatePresence mode="wait">
        {!showBooking ? (
          <motion.div 
            key="attract"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            onClick={() => setShowBooking(true)}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 cursor-pointer overflow-hidden"
          >
            {/* Animated Background Gradients */}
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-[#b0486e]/10 rounded-full blur-[120px]" 
            />
            <motion.div 
              animate={{ 
                scale: [1.2, 1, 1.2],
                rotate: [0, -90, 0],
                opacity: [0.2, 0.4, 0.2]
              }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-[-20%] right-[-10%] w-[90vw] h-[90vw] bg-[#654f4e]/5 rounded-full blur-[140px]" 
            />

            {/* Floating Particles/Shapes */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [0, -100, 0],
                    x: [0, Math.random() * 40 - 20, 0],
                    opacity: [0, 0.3, 0],
                  }}
                  transition={{
                    duration: 5 + Math.random() * 5,
                    repeat: Infinity,
                    delay: Math.random() * 5,
                  }}
                  className="absolute rounded-full bg-[#b0486e]/5"
                  style={{
                    width: Math.random() * 100 + 50,
                    height: Math.random() * 100 + 50,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                />
              ))}
            </div>

            <div className="text-center space-y-16 relative z-20">
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 1.2, ease: "easeOut" }}
                className="space-y-6"
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="inline-block"
                >
                  <span className="px-6 py-2 rounded-full bg-[#b0486e]/5 border border-[#b0486e]/10 text-[#b0486e] font-medium tracking-[0.3em] uppercase text-xs md:text-sm backdrop-blur-sm mb-8 inline-block">
                    {tenant?.businessName || "Bem-vinda"}
                  </span>
                </motion.div>
                
                <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-serif text-[#271515] leading-[1] sm:leading-[0.9] tracking-tighter">
                  Gostaria de <br />
                  <span className="text-[#b0486e] italic font-light drop-shadow-[0_0_30px_rgba(176,72,110,0.2)]">Remarcar?</span>
                </h1>
                
                <p className="text-[#654f4e]/60 font-light text-base sm:text-lg md:text-2xl tracking-[0.2em] sm:tracking-widest uppercase mt-4">
                  Toque para garantir sua vaga
                </p>
              </motion.div>

              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  boxShadow: ["0 0 20px rgba(176,72,110,0.1)", "0 0 40px rgba(176,72,110,0.3)", "0 0 20px rgba(176,72,110,0.1)"]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mx-auto w-24 h-24 rounded-full bg-[#b0486e] flex items-center justify-center text-white shadow-2xl relative overflow-hidden group"
              >
                <motion.div 
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                />
                <Calendar className="w-10 h-10 relative z-10" />
              </motion.div>

              <div className="absolute bottom-[-15vh] left-0 right-0 flex justify-center gap-16">
                {[Heart, Sparkles, Star].map((Icon, idx) => (
                  <motion.div
                    key={idx}
                    animate={{ 
                      y: [0, -20, 0],
                      rotate: [0, 15, -15, 0],
                      opacity: [0.1, 0.3, 0.1]
                    }}
                    transition={{ 
                      duration: 4, 
                      repeat: Infinity, 
                      delay: idx * 0.5,
                      ease: "easeInOut" 
                    }}
                  >
                    <Icon className="w-12 h-12 text-[#b0486e]" />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="booking"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-20 bg-[#fff7f5] flex flex-col"
          >
            <div className="p-6 border-b border-[#b0486e]/10 flex justify-between items-center bg-white sticky top-0 z-30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#b0486e]/10 flex items-center justify-center text-[#b0486e] shadow-inner">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl text-[#271515] leading-none">Reservar Horário</h3>
                  <p className="text-xs text-[#654f4e]/60 mt-1 uppercase tracking-widest font-bold">Escolha seu melhor momento</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                onClick={(e) => { e.stopPropagation(); setShowBooking(false); }}
                className="rounded-full w-12 h-12 p-0 hover:bg-[#b0486e]/10 hover:text-[#b0486e] transition-colors"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto bg-[#fff7f5]">
              <iframe 
                src={`/?t=${t || ""}`}
                className="w-full h-full border-none shadow-2xl"
                title="Agendamento"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}