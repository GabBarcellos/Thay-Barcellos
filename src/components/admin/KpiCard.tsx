import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
}

export const KpiCard = memo(function KpiCard({ icon, label, value, trend, trendUp }: KpiCardProps) {
  return (
    <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden group hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            {icon}
          </div>
          {trend ? (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend}
            </div>
          ) : null}
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-1">{label}</p>
          <h3 className="text-2xl font-bold font-serif text-gray-900">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
});
