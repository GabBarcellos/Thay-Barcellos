import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { formatPhone } from "@/lib/utils";

interface ConfirmationFormProps {
  clientName: string;
  onNameChange: (name: string) => void;
  clientPhone: string;
  onPhoneChange: (phone: string) => void;
  selectedServices?: Array<{ name: string; price: number; duration?: string }>;
  selectedService?: { name: string; price: number } | null;
  date: Date | undefined;
  selectedTime: string | null;
  isLoading: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export function ConfirmationForm({
  clientName,
  onNameChange,
  clientPhone,
  onPhoneChange,
  selectedServices = [],
  selectedService,
  date,
  selectedTime,
  isLoading,
  onBack,
  onConfirm
}: ConfirmationFormProps) {
  const servicesList = selectedServices.length > 0 
    ? selectedServices 
    : (selectedService ? [selectedService] : []);
  const totalPrice = servicesList.reduce((acc, s) => acc + (s.price || 0), 0);
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
      <h2 className="text-xl sm:text-2xl font-serif text-[#b0486e] mb-2 sm:mb-4">Seus Dados</h2>
      <div className="space-y-4 sm:space-y-6">
        <div className="grid gap-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Nome Completo</Label>
          <Input 
            value={clientName} 
            onChange={(e) => onNameChange(e.target.value)} 
            className="h-12 rounded-xl bg-white border-gray-100" 
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">WhatsApp</Label>
          <Input 
            value={clientPhone} 
            onChange={(e) => onPhoneChange(formatPhone(e.target.value))} 
            className="h-12 rounded-xl bg-white border-gray-100" 
            placeholder="(43) 99999-9999" 
          />
        </div>
      </div>
      
      {servicesList.length > 0 && (
        <Card className="border-[#b0486e]/20 bg-[#b0486e]/5 p-4 sm:p-6 rounded-2xl space-y-4">
          <div className="border-b border-[#b0486e]/10 pb-3">
            <p className="text-xs uppercase font-bold text-[#b0486e] mb-2">Serviços Selecionados ({servicesList.length})</p>
            <div className="space-y-1.5">
              {servicesList.map((s, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-stone-800">• {s.name}</span>
                  <span className="font-bold text-[#b0486e]">R$ {s.price}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-[#b0486e]/10 font-bold">
              <span className="text-stone-700">Valor Total</span>
              <span className="text-lg text-[#b0486e]">R$ {totalPrice}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase font-bold text-[#b0486e]">Data</p>
              <p className="font-medium">{date?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-[#b0486e]">Horário</p>
              <p className="font-bold text-lg">{selectedTime}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-between gap-4">
        <Button variant="ghost" onClick={onBack} className="rounded-full flex-1">Voltar</Button>
        <Button 
          onClick={onConfirm} 
          disabled={isLoading} 
          className="bg-[#b0486e] text-white rounded-full flex-[2] h-12 font-bold shadow-lg shadow-primary/20"
        >
          {isLoading ? "Enviando..." : "Confirmar Agendamento"}
        </Button>
      </div>
    </div>
  );
}
