import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ptBR } from "date-fns/locale";
import { NailPolishLoader } from "@/components/ui/nail-polish-loader";

const ALL_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
  "20:00", "21:00"
];

interface DateTimeSelectionProps {
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  customTime: string;
  onCustomTimeChange: (time: string) => void;
  isSlotOccupied: (time: string) => boolean;
  loadingSlots: boolean;
  onBack: () => void;
  onNext: () => void;
  slots?: string[];
  disabledWeekdays?: number[]; // 0=Dom, 1=Seg, ...
  closedDates?: string[]; // YYYY-MM-DD
}

export function DateTimeSelection({
  date,
  onDateSelect,
  selectedTime,
  onTimeSelect,
  customTime,
  onCustomTimeChange,
  isSlotOccupied,
  slots,
  loadingSlots,
  onBack,
  onNext,
  disabledWeekdays = [0],
  closedDates = [],
}: DateTimeSelectionProps) {
  const baseSlots = (slots && slots.length > 0) ? slots : ALL_SLOTS.filter(s => s <= "19:00");

  const isToday = (() => {
    if (!date) return false;
    const now = new Date();
    return date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
  })();

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const timeSlots = isToday
    ? baseSlots.filter(t => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m > nowMinutes;
      })
    : baseSlots;
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
      <h2 className="text-xl sm:text-2xl font-serif text-[#b0486e] mb-2 sm:mb-4">Data e Horário</h2>
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white p-2 sm:p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-center w-full overflow-hidden">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onDateSelect}
            locale={ptBR}
            className="w-full max-w-full h-auto"
            disabled={(day: Date) => {
              // Past days
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              if (day < today) return true;
              // Weekday closed (Sundays etc.)
              if (disabledWeekdays.includes(day.getDay())) return true;
              // Explicit closed date
              const y = day.getFullYear();
              const m = String(day.getMonth() + 1).padStart(2, '0');
              const d = String(day.getDate()).padStart(2, '0');
              const key = `${y}-${m}-${d}`;
              return closedDates.includes(key);
            }}
          />
        </div>
        <div className="space-y-4">
          {loadingSlots ? (
            <div className="flex justify-center py-8">
              <NailPolishLoader size={40} />
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
              {timeSlots.map((time) => {
                const occupied = isSlotOccupied(time);
                const isSelected = selectedTime === time && !customTime;
                return (
                  <Button
                    key={time}
                    disabled={occupied}
                    variant={isSelected ? "default" : "outline"}
                    className={`rounded-lg h-12 font-bold ${isSelected ? 'bg-[#b0486e] text-white' : ''} ${occupied ? 'opacity-50 grayscale' : ''}`}
                    onClick={() => onTimeSelect(time)}
                  >
                    {time}
                  </Button>
                );
              })}
            </div>
          )}
          
          <div className="pt-4 border-t border-[#b0486e]/10">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#654f4e] mb-2 block">Ou insira um horário manual</Label>
            <div className="flex gap-2">
              <Input 
                type="time" 
                value={customTime} 
                onChange={(e) => onCustomTimeChange(e.target.value)}
                className="h-12 rounded-xl bg-white border-gray-100 flex-1"
              />
            </div>
            {selectedTime && isSlotOccupied(selectedTime) && (
              <p className="text-xs text-red-600 mt-2 font-medium">
                Este horário está indisponível. Escolha outro.
              </p>
            )}
            <Button 
              disabled={!selectedTime || isSlotOccupied(selectedTime)}
              onClick={onNext}
              className="w-full bg-[#b0486e] text-white rounded-xl h-12 font-bold mt-4"
            >
              Próximo passo
            </Button>
          </div>
        </div>
      </div>
      <Button variant="ghost" onClick={onBack} className="rounded-full">Voltar</Button>
    </div>
  );
}
