import { memo } from "react";
import { formatDuration } from "@/lib/utils";
import heroImg from "@/assets/hero-manicure.jpg";
import { optimizedImageUrl, optimizedSrcSet } from "@/lib/image-url";

type ServiceItem = {
  id: string;
  name: string;
  price: number;
  duration: string;
  description: string;
  image: string;
};

interface ServiceSelectionProps {
  services: ServiceItem[];
  loading: boolean;
  selectedServices?: ServiceItem[];
  onToggleService?: (service: ServiceItem) => void;
  onContinue?: () => void;
  selectedServiceId?: string;
  onSelect?: (service: ServiceItem) => void;
}

function ServiceSelectionInner({ 
  services, 
  loading, 
  selectedServices = [], 
  onToggleService, 
  onContinue, 
  selectedServiceId, 
  onSelect 
}: ServiceSelectionProps) {
  if (loading) {
    return (
      <div className="space-y-6 pb-10">
        <h2 className="text-xl sm:text-2xl font-serif text-[#b0486e] mb-2 sm:mb-4">Escolha o serviço</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-white border-2 border-transparent">
              <div className="aspect-[4/3] w-full bg-gray-100 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-5 w-2/3 bg-gray-100 animate-pulse rounded" />
                <div className="flex justify-between mt-2">
                  <div className="h-4 w-16 bg-gray-100 animate-pulse rounded" />
                  <div className="h-3 w-20 bg-gray-100 animate-pulse rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12 italic">
        Nenhum serviço disponível no momento.
      </p>
    );
  }

  const isSelected = (id: string) => {
    if (selectedServices.length > 0) {
      return selectedServices.some(s => s.id === id);
    }
    return selectedServiceId === id;
  };

  const handleItemClick = (service: ServiceItem) => {
    if (onToggleService) {
      onToggleService(service);
    } else if (onSelect) {
      onSelect(service);
    }
  };

  const totalSelectedPrice = selectedServices.reduce((acc, s) => acc + (s.price || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-28">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <h2 className="text-xl sm:text-2xl font-serif text-[#b0486e]">Escolha os serviços</h2>
        <p className="text-xs text-stone-500">Você pode selecionar mais de um serviço</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
        {services.map((service, index) => {
          const isAboveFold = index < 4;
          const rawSrc = service.image || heroImg;
          const src = optimizedImageUrl(rawSrc, { width: 600 });
          const srcSet = optimizedSrcSet(rawSrc);
          const active = isSelected(service.id);
          return (
          <div 
            key={service.id} 
            className={`group relative cursor-pointer rounded-2xl border-2 overflow-hidden transition-all flex flex-col bg-white ${active ? 'border-[#b0486e] shadow-md ring-2 ring-[#b0486e]/20' : 'border-stone-100 hover:border-[#eca19a]/50'}`}
            onClick={() => handleItemClick(service)}
          >
            <div className="aspect-[4/3] w-full overflow-hidden relative">
              <img
                src={src}
                srcSet={srcSet}
                sizes="(min-width: 640px) 300px, 100vw"
                alt={service.name}
                width={600}
                height={450}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                loading={isAboveFold ? "eager" : "lazy"}
                fetchPriority={isAboveFold ? "high" : "auto"}
                decoding="async"
              />
              <div className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all ${active ? 'bg-[#b0486e] text-white shadow-md' : 'bg-white/90 text-stone-400 border border-stone-200'}`}>
                {active ? (
                  <span className="text-xs font-bold">✓</span>
                ) : (
                  <span className="text-xs font-light">+</span>
                )}
              </div>
            </div>
            <div className="p-4 flex flex-col gap-1">
              <h3 className="font-serif text-lg leading-tight">{service.name}</h3>
              <div className="flex justify-between items-center mt-2">
                <span className="font-bold text-[#b0486e]">R$ {service.price}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#654f4e]">{formatDuration(service.duration)}</span>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {selectedServices.length > 0 && onContinue && (
        <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto z-40 bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-[#b0486e]/20 shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
          <div className="min-w-0">
            <p className="text-xs text-stone-500 font-medium truncate">
              {selectedServices.length} {selectedServices.length === 1 ? 'serviço selecionado' : 'serviços selecionados'}
            </p>
            <p className="text-base font-bold text-[#b0486e]">Total: R$ {totalSelectedPrice}</p>
          </div>
          <button
            type="button"
            onClick={onContinue}
            className="bg-[#b0486e] hover:bg-[#9d3c5f] text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            Continuar Horário →
          </button>
        </div>
      )}
    </div>
  );
}

export const ServiceSelection = memo(ServiceSelectionInner);
