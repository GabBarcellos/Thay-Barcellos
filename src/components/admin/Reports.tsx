import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
} from 'recharts';
import { useMemo, useState, memo } from "react";
import { TrendingUp, Calendar, DollarSign, Loader2, Info, Filter, X, ArrowLeftRight, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePayments, useAppointments, useUserIdentity } from "@/hooks/use-api-hooks";
import { NailPolishLoader } from "@/components/ui/nail-polish-loader";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MetricWithDetailsProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  details: React.ReactNode;
}

function MetricWithDetails({ title, value, icon, iconBg, iconColor, details }: MetricWithDetailsProps) {
  return (
    <Popover>
      <HoverCard openDelay={0} closeDelay={100}>
        <HoverCardTrigger asChild>
          <PopoverTrigger asChild>
            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden group hover:shadow-md transition-all cursor-pointer relative">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform", iconBg, iconColor)}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                    {title}
                    <Info className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <h3 className="text-2xl font-bold font-serif truncate">{value}</h3>
                </div>
              </CardContent>
            </Card>
          </PopoverTrigger>
        </HoverCardTrigger>
        <HoverCardContent className="w-80 rounded-3xl p-4 shadow-xl border-none bg-white hidden md:block" side="top">
          {details}
        </HoverCardContent>
        <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 rounded-3xl p-6 shadow-2xl border-none bg-white md:hidden" side="top">
          {details}
        </PopoverContent>
      </HoverCard>
    </Popover>
  );
}

function ReportsInner() {
  const { data: identity } = useUserIdentity();
  const { data: payments = [], isLoading: loadingPayments } = usePayments(identity?.user?.id);
  const { data: appts = [], isLoading: loadingAppts } = useAppointments();

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const toInput = (d: Date) => d.toISOString().slice(0, 10);
  const [rangeStart, setRangeStart] = useState<string>(toInput(firstOfMonth));
  const [rangeEnd, setRangeEnd] = useState<string>(toInput(today));

  // Revenue is based on scheduled appointments (excluding cancelled ones and exchanges)
  const apptRevenue = (a: any) => {
    if (String(a.status || "").toLowerCase().startsWith("cancel")) return 0;
    if (a.is_exchange) return 0;
    return Number(a.custom_price ?? a.price ?? a.services?.price ?? 0) || 0;
  };

  const apptExchangeValue = (a: any) => {
    if (String(a.status || "").toLowerCase().startsWith("cancel")) return 0;
    if (!a.is_exchange) return 0;
    return Number(a.custom_price ?? a.price ?? a.services?.price ?? 0) || 0;
  };

  const rangeData = useMemo(() => {
    if (!rangeStart || !rangeEnd) return null;
    const start = new Date(`${rangeStart}T00:00:00`);
    const end = new Date(`${rangeEnd}T23:59:59.999`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;
    const byDay: Record<string, number> = {};
    const exchangeByDay: Record<string, number> = {};
    const byMethod: Record<string, number> = {};
    let total = 0;
    let count = 0;
    let exchangeTotal = 0;
    let exchangeCount = 0;
    appts.forEach((a: any) => {
      const d = new Date(a.appointment_time);
      if (d < start || d > end) return;
      
      if (a.is_exchange && !String(a.status || "").toLowerCase().startsWith("cancel")) {
        const exVal = apptExchangeValue(a);
        exchangeTotal += exVal;
        exchangeCount += 1;
        const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        exchangeByDay[key] = (exchangeByDay[key] || 0) + exVal;
        return;
      }

      const amount = apptRevenue(a);
      if (amount <= 0) return;
      total += amount;
      count += 1;
      const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      byDay[key] = (byDay[key] || 0) + amount;
    });
    payments.filter((p: any) => p.status === "Pago" && p.method !== "Permuta").forEach((p: any) => {
      const d = new Date(p.payment_date);
      if (d < start || d > end) return;
      const m = p.method || "Outros";
      byMethod[m] = (byMethod[m] || 0) + (Number(p.amount) || 0);
    });
    // Build ordered day list for the range
    const days: { name: string; receita: number; permuta: number }[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const key = cur.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      days.push({
        name: key,
        receita: byDay[key] || 0,
        permuta: exchangeByDay[key] || 0,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return {
      total,
      count,
      average: count ? total / count : 0,
      exchangeTotal,
      exchangeCount,
      exchangeAverage: exchangeCount ? exchangeTotal / exchangeCount : 0,
      days,
      methods: Object.entries(byMethod).sort((a, b) => b[1] - a[1]),
    };
  }, [payments, appts, rangeStart, rangeEnd]);


  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const fmtDate = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString("pt-BR");

  function setQuickRange(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days + 1);
    setRangeStart(toInput(start));
    setRangeEnd(toInput(end));
  }
  function setThisMonth() {
    const now = new Date();
    setRangeStart(toInput(new Date(now.getFullYear(), now.getMonth(), 1)));
    setRangeEnd(toInput(now));
  }
  function setLastMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    setRangeStart(toInput(start));
    setRangeEnd(toInput(end));
  }

  const reportData = useMemo(() => {
    if (loadingPayments || loadingAppts) return null;

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    const weeklyData: Record<string, number> = {};
    const monthlyData: Record<string, number> = {};
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let totalRevenue = 0;
    let monthRevenue = 0;
    let yearRevenue = 0;
    
    let totalExchange = 0;
    let monthExchange = 0;
    let yearExchange = 0;
    let totalExchangeCount = 0;
    let monthExchangeCount = 0;
    let yearExchangeCount = 0;
    
    const monthRevenueByMethod: Record<string, number> = {};
    const yearRevenueByMonth: Record<string, number> = {};
    const monthApptsByService: Record<string, number> = {};
    const monthRevenueByDay: Record<number, number> = {};
    const exchangeMonthlyData: Record<string, number> = {};
    const exchangeSvcCounts: Record<string, { count: number; total: number }> = {};
    const exchangeApptsList: any[] = [];
    
    let todayRevenue = 0;
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

    // Helper to get week number
    const getWeek = (date: Date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    // Method breakdown still comes from registered payments (excluding permuta)
    payments.filter(p => p.status === 'Pago' && p.method !== 'Permuta').forEach(p => {
      const date = new Date(p.payment_date);
      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        const method = p.method || 'Outros';
        monthRevenueByMethod[method] = (monthRevenueByMethod[method] || 0) + (Number(p.amount) || 0);
      }
    });

    const todayItems: { name: string; service: string; value: number }[] = [];

    appts.forEach((a: any) => {
      const date = new Date(a.appointment_time);
      const apptYear = date.getFullYear();
      const apptMonth = date.getMonth();
      const isCancelled = String(a.status || "").toLowerCase().startsWith("cancel");
      if (isCancelled) return;

      if (a.is_exchange) {
        const exVal = Number(a.custom_price ?? a.price ?? a.services?.price ?? 0) || 0;
        totalExchange += exVal;
        totalExchangeCount += 1;
        exchangeApptsList.push(a);

        if (apptYear === currentYear && date <= endOfToday) {
          yearExchange += exVal;
          yearExchangeCount += 1;
          const monthKey = months[apptMonth];
          exchangeMonthlyData[monthKey] = (exchangeMonthlyData[monthKey] || 0) + exVal;

          if (apptMonth === currentMonth) {
            monthExchange += exVal;
            monthExchangeCount += 1;
          }
        }

        const svcName = a.services?.name || 'Procedimento';
        if (!exchangeSvcCounts[svcName]) exchangeSvcCounts[svcName] = { count: 0, total: 0 };
        exchangeSvcCounts[svcName].count += 1;
        exchangeSvcCounts[svcName].total += exVal;
        return;
      }

      const amount = apptRevenue(a);
      if (amount > 0 && date <= endOfToday) {
        totalRevenue += amount;
        const weekKey = `Sem ${getWeek(date)}/${apptYear}`;
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + amount;

        if (apptYear === currentYear) {
          yearRevenue += amount;
          const monthKey = months[apptMonth];
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + amount;
          yearRevenueByMonth[monthKey] = (yearRevenueByMonth[monthKey] || 0) + amount;
          if (apptMonth === currentMonth) {
            monthRevenue += amount;
            monthRevenueByDay[date.getDate()] = (monthRevenueByDay[date.getDate()] || 0) + amount;
          }
        }
        if (`${apptYear}-${apptMonth}-${date.getDate()}` === todayKey) {
          todayRevenue += amount;
          todayItems.push({
            name: a.client_name || 'Cliente',
            service: a.services?.name || 'Serviço',
            value: amount,
          });
        }
      }

      if (apptYear === currentYear && apptMonth === currentMonth && date <= endOfToday) {
        const svcName = a.services?.name || 'Outros';
        monthApptsByService[svcName] = (monthApptsByService[svcName] || 0) + 1;
      }
    });


    // Generate last 12 weeks if no data, or show all weeks of the current year
    const chartData = Object.entries(weeklyData)
      .map(([key, value]) => {
        const [sem, year] = key.split('/');
        const weekNum = parseInt(sem.replace('Sem ', ''));
        return {
          name: key,
          week: weekNum,
          year: parseInt(year),
          vendas: value
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.week - b.week;
      })
      .slice(-12) // Show last 12 weeks for better visibility
      .map(item => ({
        name: item.name,
        receita: item.vendas
      }));

    const monthlyChartData = months
      .filter(m => monthlyData[m] !== undefined)
      .map(m => ({ name: m, receita: monthlyData[m] }));

    // Build daily chart for the current month (all days up to today)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const lastDay = Math.min(daysInMonth, now.getDate());
    const dailyChartData = Array.from({ length: lastDay }, (_, i) => {
      const d = i + 1;
      return { name: String(d).padStart(2, '0'), receita: monthRevenueByDay[d] || 0 };
    });
    const dailyList = Array.from({ length: lastDay }, (_, i) => {
      const d = lastDay - i; // most recent first
      return { day: d, value: monthRevenueByDay[d] || 0 };
    }).filter(x => x.value > 0);

    const palette = ['#f9a8d4', '#fbcfe8', '#ec4899', '#be185d', '#f472b6', '#db2777'];
    const svcCounts: Record<string, number> = {};
    appts.forEach((a: any) => {
      const name = a.services?.name || 'Outros';
      svcCounts[name] = (svcCounts[name] || 0) + 1;
    });
    const serviceStats = Object.entries(svcCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }));

    const exchangeServices = Object.entries(exchangeSvcCounts)
      .map(([name, data]) => ({ name, count: data.count, total: data.total }))
      .sort((a, b) => b.count - a.count);

    const exchangeMonthlyChartData = months.map(m => ({
      name: m,
      permuta: exchangeMonthlyData[m] || 0
    }));

    const sortedExchangeList = [...exchangeApptsList]
      .sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime())
      .slice(0, 15);

    return {
      chartData,
      monthlyChartData,
      dailyChartData,
      serviceStats,
      exchangeServices,
      exchangeMonthlyChartData,
      sortedExchangeList,
      stats: {
        totalRevenue,
        monthRevenue,
        yearRevenue,
        todayRevenue,
        totalAppointments: appts.filter((a: any) => !a.is_exchange && new Date(a.appointment_time) <= endOfToday && !String(a.status || "").toLowerCase().startsWith("cancel")).length,
        averageTicket: appts.filter((a: any) => !a.is_exchange && new Date(a.appointment_time) <= endOfToday && !String(a.status || "").toLowerCase().startsWith("cancel")).length ? totalRevenue / appts.filter((a: any) => !a.is_exchange && new Date(a.appointment_time) <= endOfToday && !String(a.status || "").toLowerCase().startsWith("cancel")).length : 0,
        monthRevenueByMethod: Object.entries(monthRevenueByMethod).sort((a, b) => b[1] - a[1]),
        yearRevenueByMonth: Object.entries(yearRevenueByMonth).sort((a, b) => months.indexOf(a[0]) - months.indexOf(b[0])),
        monthApptsByService: Object.entries(monthApptsByService).sort((a, b) => b[1] - a[1]),
        dailyList,
        todayItems,
        exchange: {
          totalValue: totalExchange,
          monthValue: monthExchange,
          yearValue: yearExchange,
          totalCount: totalExchangeCount,
          monthCount: monthExchangeCount,
          yearCount: yearExchangeCount,
          averageValue: totalExchangeCount ? totalExchange / totalExchangeCount : 0,
        }
      }
    };
  }, [payments, appts, loadingPayments, loadingAppts]);

  if (loadingPayments || loadingAppts || !reportData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <NailPolishLoader size={48} />
        <p className="text-muted-foreground animate-pulse">Gerando relatórios e análises...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-serif text-primary">Faturamento</h2>
        <p className="text-muted-foreground">Visão geral do desempenho financeiro do seu negócio.</p>
      </div>

      <Tabs defaultValue="revenue" className="w-full space-y-6">
        <TabsList className="bg-white p-1 rounded-2xl sm:rounded-full border flex flex-col sm:flex-row w-full sm:w-auto h-auto gap-1">
          <TabsTrigger value="revenue" className="rounded-xl sm:rounded-full w-full sm:w-auto justify-center data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2.5 sm:py-2">
            <DollarSign className="w-4 h-4" /> Faturamento Real (Lucro)
          </TabsTrigger>
          <TabsTrigger value="exchange" className="rounded-xl sm:rounded-full w-full sm:w-auto justify-center data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2.5 sm:py-2">
            <ArrowLeftRight className="w-4 h-4" /> Permutas
            {reportData.stats.exchange.totalCount > 0 && (
              <span className="text-[10px] bg-pink-100 text-pink-700 data-[state=active]:bg-white/20 data-[state=active]:text-white font-bold px-2 py-0.5 rounded-full">
                {reportData.stats.exchange.totalCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-8 animate-in fade-in duration-500">
          {/* Destaque: receita do mês e do ano */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-none rounded-3xl overflow-hidden shadow-lg bg-gradient-to-br from-pink-500 to-rose-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest font-bold opacity-90">
                      Receita do Mês ({new Date().toLocaleDateString('pt-BR', { month: 'long' })})
                    </p>
                    <h3 className="text-4xl md:text-5xl font-serif mt-1 leading-tight">
                      {fmt(reportData.stats.monthRevenue)}
                    </h3>
                    <p className="text-xs opacity-90 mt-2">
                      Receita anual: {fmt(reportData.stats.yearRevenue)}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none rounded-3xl overflow-hidden shadow-lg bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">
                      Receita Anual ({new Date().getFullYear()})
                    </p>
                    <h3 className="text-4xl md:text-5xl font-serif mt-1 leading-tight text-primary">
                      {fmt(reportData.stats.yearRevenue)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2">
                      Total de {reportData.stats.totalAppointments} atendimentos realizados
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center">
                    <Calendar className="w-7 h-7" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" /> Filtrar por período
              </CardTitle>
              <CardDescription>Escolha as datas para ver o faturamento no intervalo desejado.</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">De</label>
                  <input
                    type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} max={rangeEnd || undefined}
                    className="mt-1 w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Até</label>
                  <input
                    type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} min={rangeStart || undefined}
                    className="mt-1 w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary/50"
                  />
                </div>
                <button
                  type="button" onClick={() => { setRangeStart(""); setRangeEnd(""); }}
                  className="h-10 px-3 rounded-xl border border-gray-200 text-xs text-muted-foreground hover:bg-gray-50 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Limpar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Hoje", fn: () => setQuickRange(1) },
                  { label: "Últimos 7 dias", fn: () => setQuickRange(7) },
                  { label: "Últimos 15 dias", fn: () => setQuickRange(15) },
                  { label: "Últimos 30 dias", fn: () => setQuickRange(30) },
                  { label: "Este mês", fn: setThisMonth },
                  { label: "Mês passado", fn: setLastMonth },
                ].map((p) => (
                  <button key={p.label} type="button" onClick={p.fn}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>

              {rangeData ? (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100/50 border border-pink-100 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-pink-700 font-bold">Faturamento no período</p>
                    <p className="text-2xl font-serif text-pink-900 mt-1">{fmt(rangeData.total)}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {fmtDate(rangeStart)} até {fmtDate(rangeEnd)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-green-50 border border-green-100 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-green-700 font-bold">Atendimentos</p>
                    <p className="text-2xl font-serif text-green-900 mt-1">{rangeData.count}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Ticket médio {fmt(rangeData.average)}</p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-blue-700 font-bold mb-1">Por método</p>
                    {rangeData.methods.length > 0 ? (
                      <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                        {rangeData.methods.map(([m, v]) => (
                          <div key={m} className="flex justify-between text-xs">
                            <span className="text-blue-900">{m}</span>
                            <span className="font-bold text-blue-900">{fmt(v)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">Sem registros.</p>
                    )}
                  </div>

                  {rangeData.days.length > 0 && (
                    <div className="md:col-span-3 h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rangeData.days}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                          <RechartsTooltip
                            cursor={{ fill: '#fdf2f8' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            formatter={(value: number) => [fmt(Number(value)), 'Receita']}
                            labelFormatter={(label) => `Dia ${label}`}
                          />
                          <Bar name="Receita" dataKey="receita" fill="#ec4899" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs italic text-muted-foreground">Escolha duas datas válidas para ver o faturamento do período.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricWithDetails
              title="Receita Mensal"
              value={`R$ ${reportData.stats.monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={<DollarSign className="w-6 h-6" />}
              iconBg="bg-green-50"
              iconColor="text-green-500"
              details={
                <div className="space-y-3">
                  <p className="text-sm font-bold border-b pb-2 text-primary font-serif">Arrecadação por Método (Mês)</p>
                  {reportData.stats.monthRevenueByMethod.length > 0 ? (
                    reportData.stats.monthRevenueByMethod.map(([method, val], i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{method}</span>
                        <span className="font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic text-center py-2">Nenhum dado este mês.</p>
                  )}
                </div>
              }
            />

            <MetricWithDetails
              title="Receita Anual"
              value={`R$ ${reportData.stats.yearRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={<TrendingUp className="w-6 h-6" />}
              iconBg="bg-blue-50"
              iconColor="text-blue-500"
              details={
                <div className="space-y-3">
                  <p className="text-sm font-bold border-b pb-2 text-primary font-serif">Faturamento Mensal ({new Date().getFullYear()})</p>
                  <div className="max-h-48 overflow-y-auto pr-1 scrollbar-none space-y-2">
                    {reportData.stats.yearRevenueByMonth.map(([month, val], i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{month}</span>
                        <span className="font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              }
            />

            <MetricWithDetails
              title="Total de Agendamentos"
              value={String(reportData.stats.totalAppointments)}
              icon={<Calendar className="w-6 h-6" />}
              iconBg="bg-pink-50"
              iconColor="text-pink-500"
              details={
                <div className="space-y-3">
                  <p className="text-sm font-bold border-b pb-2 text-primary font-serif">Agendamentos este Mês</p>
                  <div className="max-h-48 overflow-y-auto pr-1 scrollbar-none space-y-2">
                    {reportData.stats.monthApptsByService.length > 0 ? (
                      reportData.stats.monthApptsByService.map(([svc, count], i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground truncate max-w-[140px]">{svc}</span>
                          <span className="font-bold bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full">{count} agend.</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic text-center py-2">Nenhum agendamento este mês.</p>
                    )}
                  </div>
                  <div className="pt-2 border-t mt-2">
                    <p className="text-[10px] text-muted-foreground text-center">Total histórico: {reportData.stats.totalAppointments}</p>
                  </div>
                </div>
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="exchange" className="space-y-8 animate-in fade-in duration-500">
          {/* Destaque de Permutas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-none rounded-3xl overflow-hidden shadow-lg bg-gradient-to-br from-pink-500 to-rose-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest font-bold opacity-90">
                      Permutas do Mês ({new Date().toLocaleDateString('pt-BR', { month: 'long' })})
                    </p>
                    <h3 className="text-4xl md:text-5xl font-serif mt-1 leading-tight">
                      {fmt(reportData.stats.exchange.monthValue)}
                    </h3>
                    <p className="text-xs opacity-90 mt-2">
                      {reportData.stats.exchange.monthCount} procedimento(s) em permuta no mês
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <ArrowLeftRight className="w-7 h-7" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none rounded-3xl overflow-hidden shadow-lg bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">
                      Total em Permutas ({new Date().getFullYear()})
                    </p>
                    <h3 className="text-4xl md:text-5xl font-serif mt-1 leading-tight text-primary">
                      {fmt(reportData.stats.exchange.yearValue)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2">
                      Total de {reportData.stats.exchange.yearCount} atendimentos permutados no ano
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center">
                    <Sparkles className="w-7 h-7" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico e Análise de Permutas por Período */}
          <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" /> Permutas por Período
              </CardTitle>
              <CardDescription>Acompanhe o valor estimado dos serviços trocados no intervalo selecionado.</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">De</label>
                  <input
                    type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} max={rangeEnd || undefined}
                    className="mt-1 w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Até</label>
                  <input
                    type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} min={rangeStart || undefined}
                    className="mt-1 w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary/50"
                  />
                </div>
                <button
                  type="button" onClick={() => { setRangeStart(""); setRangeEnd(""); }}
                  className="h-10 px-3 rounded-xl border border-gray-200 text-xs text-muted-foreground hover:bg-gray-50 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Limpar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Hoje", fn: () => setQuickRange(1) },
                  { label: "Últimos 7 dias", fn: () => setQuickRange(7) },
                  { label: "Últimos 15 dias", fn: () => setQuickRange(15) },
                  { label: "Últimos 30 dias", fn: () => setQuickRange(30) },
                  { label: "Este mês", fn: setThisMonth },
                  { label: "Mês passado", fn: setLastMonth },
                ].map((p) => (
                  <button key={p.label} type="button" onClick={p.fn}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>

              {rangeData ? (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100/50 border border-pink-100 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-pink-700 font-bold">Total em Permuta no período</p>
                    <p className="text-2xl font-serif text-pink-900 mt-1">{fmt(rangeData.exchangeTotal)}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {fmtDate(rangeStart)} até {fmtDate(rangeEnd)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-pink-50 border border-pink-100 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-pink-700 font-bold">Atendimentos Permutados</p>
                    <p className="text-2xl font-serif text-pink-900 mt-1">{rangeData.exchangeCount}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Média estimada {fmt(rangeData.exchangeAverage)}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-gray-600 font-bold mb-1">Impacto no Fluxo</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      Os valores aqui listados são baseados no preço de tabela dos serviços e <strong>não entram no caixa</strong>.
                    </p>
                  </div>

                  {rangeData.days.length > 0 && (
                    <div className="md:col-span-3 h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rangeData.days}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                          <RechartsTooltip
                            cursor={{ fill: '#fdf2f8' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            formatter={(value: number) => [fmt(Number(value)), 'Valor Permutado']}
                            labelFormatter={(label) => `Dia ${label}`}
                          />
                          <Bar name="Permuta" dataKey="permuta" fill="#ec4899" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs italic text-muted-foreground">Escolha duas datas válidas para ver as permutas do período.</p>
              )}
            </CardContent>
          </Card>

          {/* Detalhes: Serviços mais permutados & Histórico recente */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
              <CardHeader className="p-6 pb-3">
                <CardTitle className="font-serif text-lg text-primary">Serviços Mais Permutados</CardTitle>
                <CardDescription>Procedimentos mais frequentes em acordos de permuta.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-3">
                {reportData.exchangeServices.length > 0 ? (
                  reportData.exchangeServices.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-pink-50/50 border border-pink-100/60">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.count} atendimento(s) em permuta</p>
                      </div>
                      <span className="font-bold text-sm text-pink-700">{fmt(s.total)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-muted-foreground text-center py-6">Nenhum registro de permuta encontrado.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
              <CardHeader className="p-6 pb-3">
                <CardTitle className="font-serif text-lg text-primary">Últimas Permutas Registradas</CardTitle>
                <CardDescription>Histórico de atendimentos com permuta marcada.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-2 max-h-[360px] overflow-y-auto scrollbar-none">
                {reportData.sortedExchangeList.length > 0 ? (
                  reportData.sortedExchangeList.map((a: any) => {
                    const exVal = Number(a.custom_price ?? a.price ?? a.services?.price ?? 0) || 0;
                    return (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{a.client_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(a.appointment_time).toLocaleDateString("pt-BR")} · {a.services?.name || "Procedimento"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-pink-700 bg-pink-100 px-2.5 py-1 rounded-full">
                            {fmt(exVal)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs italic text-muted-foreground text-center py-6">Nenhum atendimento de permuta realizado.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Reports = memo(ReportsInner);
