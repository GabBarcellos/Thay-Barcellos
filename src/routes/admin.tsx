import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, memo, lazy, Suspense, useCallback } from "react";
import { 
  LayoutDashboard, 
  CalendarDays, 
  Package, 
  BarChart3, 
  Settings, 
  TrendingUp, 
  Users, 
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Image as ImageIcon,
  Receipt,
  Wallet,
  Clock,
  Menu,
  LogOut,
  Link2, 
  Copy, 
  MessageCircle, 
  Check,
  Shield,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NailPolishLoader } from "@/components/ui/nail-polish-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserIdentity, useAppointments, useInventory, useSettings, useClients } from "@/hooks/use-api-hooks";
import { KpiCard } from "@/components/admin/KpiCard";
import { SidebarItem } from "@/components/admin/SidebarItem";
import { WeeklyMiniCalendar } from "@/components/admin/WeeklyMiniCalendar";
import { ShareBookingLink } from "@/components/admin/ShareBookingLink";
import { CreateAppointmentDialog } from "@/components/admin/CreateAppointmentDialog";
import { SupportButton } from "@/components/admin/SupportButton";
import { PwaInstallButton } from "@/components/PwaInstallButton";
import { useAdminReminders } from "@/hooks/use-admin-reminders";

// Lazy-load heavy chart modules
const Reports = lazy(() => import("@/components/admin/Reports").then(m => ({ default: m.Reports })));
const Appointments = lazy(() => import("@/components/admin/Appointments").then(m => ({ default: m.Appointments })));
const Inventory = lazy(() => import("@/components/admin/Inventory").then(m => ({ default: m.Inventory })));
const Gallery = lazy(() => import("@/components/admin/Gallery").then(m => ({ default: m.Gallery })));
const Expenses = lazy(() => import("@/components/admin/Expenses").then(m => ({ default: m.Expenses })));
const Payments = lazy(() => import("@/components/admin/Payments").then(m => ({ default: m.Payments })));
const SettingsPanel = lazy(() => import("@/components/admin/Settings").then(m => ({ default: m.Settings })));
const WhatsAppIntegration = lazy(() => import("@/components/admin/WhatsAppIntegration").then(m => ({ default: m.WhatsAppIntegration })));
const Clients = lazy(() => import("@/components/admin/Clients").then(m => ({ default: m.Clients })));
const RevenueAreaChart = lazy(() => import("@/components/admin/DashboardCharts").then(m => ({ default: m.RevenueAreaChart })));
const ServicesPieChart = lazy(() => import("@/components/admin/DashboardCharts").then(m => ({ default: m.ServicesPieChart })));

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    // A sessão do Supabase fica armazenada no dispositivo e pode ser lida
    // somente no navegador. No servidor, a verificação acontece após a hidratação.
    if (typeof window === "undefined") return;

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) return;

    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return;

    throw redirect({ to: "/login" });
  },
  loader: async ({ context: { queryClient } }) => {
    // No servidor não existe sessão: pré-carregar aqui gravaria `null` no cache
    // e a tela ficaria presa no carregamento após a hidratação.
    if (typeof window === "undefined") return;

    // Pre-fetch identity for smoother transition
    await queryClient.ensureQueryData({
      queryKey: ["user-identity"],
      queryFn: async () => {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return null;
        
        const [{ data: userRole }, { data: tenant }, { data: salonSetting }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "super_admin").maybeSingle(),
          supabase.from("tenants").select("business_name, slug, active, username, display_name").eq("owner_user_id", u.user.id).maybeSingle(),
          supabase.from('settings').select('value').eq('owner_id', u.user.id).eq('key', 'salon_name').maybeSingle()
        ]);

        return {
          user: u.user,
          role: userRole?.role,
          tenant,
          salonSetting
        };
      },
    });
  },
  component: AdminDashboard,
});

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [chartPeriod, setChartPeriod] = useState("week");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isGlobalCreateOpen, setIsGlobalCreateOpen] = useState(false);
  const [selectedDashboardDate, setSelectedDashboardDate] = useState<Date | undefined>(undefined);

  // Queries
  const { data: identity, isLoading: identityLoading, refetch: refetchIdentity } = useUserIdentity();
  const { data: allAppointments = [] } = useAppointments();
  const { data: inventoryData = [] } = useInventory(identity?.user?.id);
  const { data: settingsData = [] } = useSettings(identity?.user?.id);

  const hiddenMenuItems = useMemo(() => {
    const setting = settingsData.find(s => s.key === 'hidden_menu_items');
    if (!setting?.value) return [];
    try {
      return JSON.parse(setting.value);
    } catch {
      return [];
    }
  }, [settingsData]);

  const user = identity?.user;
  useAdminReminders(user?.id);
  const isSuperAdmin = !!identity?.role;
  const tenant = identity?.tenant;
  const salonSetting = identity?.salonSetting;

  // Super admin (gvbsilva) only manages users — redirect to dedicated panel
  useEffect(() => {
    if (isSuperAdmin) {
      navigate({ to: "/super-admin" });
    }
  }, [isSuperAdmin, navigate]);

  const businessName = useMemo(() => 
    salonSetting?.value || tenant?.business_name || tenant?.username || "",
  [salonSetting, tenant]);

  const userName = useMemo(() => 
    tenant?.display_name || salonSetting?.value || tenant?.business_name || tenant?.username || "Usuária",
  [tenant, salonSetting]);

  const tenantSlug = tenant?.slug || "";

  useEffect(() => {
    const handleUpdate = () => refetchIdentity();
    window.addEventListener('settings-updated', handleUpdate);
    return () => window.removeEventListener('settings-updated', handleUpdate);
  }, [refetchIdentity]);

  const copySchedulingLink = useCallback(() => {
    const link = `${window.location.origin}/?t=${tenantSlug}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [tenantSlug]);

  const navItems = [
    { id: "overview", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "appointments", label: "Agendamentos", icon: <CalendarDays className="w-5 h-5" /> },
    { id: "inventory", label: "Estoque", icon: <Package className="w-5 h-5" /> },
    { id: "payments", label: "Pagamentos", icon: <Wallet className="w-5 h-5" /> },
    { id: "expenses", label: "Despesas", icon: <Receipt className="w-5 h-5" /> },
    { id: "reports", label: "Faturamento", icon: <BarChart3 className="w-5 h-5" /> },
    { id: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="w-5 h-5" /> },
    { id: "gallery", label: "Meus Serviços", icon: <ImageIcon className="w-5 h-5" /> },
    { id: "clients", label: "Clientes", icon: <Users className="w-5 h-5" /> },
  ];

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  // Memoized KPIs and Data
  const dashboardData = useMemo(() => {
    const now = new Date();
    const hasAppointments = !!(allAppointments && allAppointments.length);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    // Using simple loops instead of multiple filters for performance with large datasets
    let todayRevenue = 0;
    let monthRevenue = 0;
    let yearRevenue = 0;
    let yRevenue = 0;
    let prevMonthRevenue = 0;
    let monthCount = 0;
    let prevMonthCount = 0;
    const todayAppts = [];
    const tomorrowAppts = [];
    const recentAppts = [];
    
    const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(endOfToday); endOfYesterday.setDate(endOfYesterday.getDate() - 1);
    const startOfTomorrow = new Date(startOfToday); startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const endOfTomorrow = new Date(endOfToday); endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 6); startOfWeek.setHours(0, 0, 0, 0);

    const counts: Record<string, number> = {};
    const svcCounts: Record<string, number> = {};
    const since90 = new Date(now); since90.setDate(now.getDate() - 90);
    
    // Single pass over appointments
    for (const a of (allAppointments || [])) {
      const t = new Date(a.appointment_time);
      const isExchange = !!a.is_exchange;
      const price = isExchange ? 0 : Number(a.price || 0);
      const clientName = (a.client_name || '').toLowerCase().trim();

      if (t >= startOfToday && t <= endOfToday) {
        todayRevenue += price;
        todayAppts.push(a);
        recentAppts.push(a);
      } else if (t >= startOfYesterday && t <= endOfYesterday) {
        yRevenue += price;
      } else if (t >= startOfTomorrow && t <= endOfTomorrow) {
        tomorrowAppts.push(a);
      }

      if (t >= startOfMonth && t <= endOfToday) {
        monthCount++;
        monthRevenue += price;
      } else if (t >= startOfPrevMonth && t <= endOfPrevMonth) {
        prevMonthCount++;
        prevMonthRevenue += price;
      }

      if (t >= startOfYear && t <= endOfToday) {
        yearRevenue += price;
      }

      if (t >= since90) {
        if (clientName) counts[clientName] = (counts[clientName] || 0) + 1;
        const svcName = a.services?.name || 'Outros';
        svcCounts[svcName] = (svcCounts[svcName] || 0) + 1;
      }
    }

    const todayRevenueTrend = yRevenue > 0 ? Math.round(((todayRevenue - yRevenue) / yRevenue) * 100) : 0;
    const monthAppointmentsTrend = prevMonthCount > 0 ? Math.round(((monthCount - prevMonthCount) / prevMonthCount) * 100) : 0;
    const monthRevenueTrend = prevMonthRevenue > 0 ? Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100) : 0;

    const totalClients = Object.keys(counts).length;
    const returning = Object.values(counts).filter((c) => c > 1).length;
    const returnRate = totalClients > 0 ? Math.round((returning / totalClients) * 100) : 0;

    const todayAppointments = todayAppts
      .slice()
      .sort((a: any, b: any) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime())
      .slice(0, 5);
    const recentAppointments = recentAppts.slice(0, 5);
    const tomorrowAppointments = tomorrowAppts.slice(0, 5);
    const lowStock = inventoryData.filter(i => i.status !== 'Normal').slice(0, 5);

    // Weekly revenue
    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekBuckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(now.getDate() - (6 - i)); d.setHours(0, 0, 0, 0);
      return { name: dayLabels[d.getDay()], valor: 0, date: d };
    });
    
    const startOf4Weeks = new Date(now); startOf4Weeks.setDate(now.getDate() - 27); startOf4Weeks.setHours(0, 0, 0, 0);
    const monthBuckets = [{ name: 'Sem 1', valor: 0 }, { name: 'Sem 2', valor: 0 }, { name: 'Sem 3', valor: 0 }, { name: 'Sem 4', valor: 0 }];

    // Yearly buckets (Jan until current month)
    const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const yearBuckets = Array.from({ length: now.getMonth() + 1 }, (_, i) => ({
      name: monthsShort[i],
      valor: 0
    }));

    for (const a of (allAppointments || [])) {
      if (a.is_exchange) continue;
      const d = new Date(a.appointment_time);
      if (d > endOfToday) continue;
      const price = Number(a.price || 0);
      
      const dayBucket = weekBuckets.find(b => b.date.getTime() === new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
      if (dayBucket) dayBucket.valor += price;

      if (d >= startOf4Weeks) {
        const diffDays = Math.floor((d.getTime() - startOf4Weeks.getTime()) / 86400000);
        const week = Math.min(3, Math.max(0, Math.floor(diffDays / 7)));
        monthBuckets[week].valor += price;
      }

      if (d.getFullYear() === now.getFullYear() && d.getMonth() <= now.getMonth()) {
        yearBuckets[d.getMonth()].valor += price;
      }
    }

    const weekRevenue = weekBuckets.reduce((sum, b) => sum + b.valor, 0);

    const palette = ['#f9a8d4', '#fbcfe8', '#ec4899', '#be185d', '#f472b6', '#db2777'];
    const serviceStats = Object.entries(svcCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }));

    const workingDaysSetting = settingsData.find(s => s.key === 'working_days');
    const workingDays = workingDaysSetting ? JSON.parse(workingDaysSetting.value || '[]') : ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

    return {
      kpis: { todayRevenue, weekRevenue, monthRevenue, yearRevenue, monthAppointments: monthCount, returnRate, todayRevenueTrend, monthAppointmentsTrend, monthRevenueTrend },
      todayAppointments,
      tomorrowAppointments,
      recentAppointments,
      lowStock,
      revenueWeek: weekBuckets,
      revenueMonth: monthBuckets,
      revenueYear: yearBuckets,
      serviceStats,
      workingDays,
      hasAppointments,
    };
  }, [allAppointments, inventoryData, settingsData]);

  const filteredChartData = useMemo(() => {
    if (!dashboardData) return [];
    if (chartPeriod === "month") return dashboardData.revenueMonth;
    if (chartPeriod === "year") return dashboardData.revenueYear;
    const dayMap: Record<string, string> = {
      'Segunda': 'Seg', 'Terça': 'Ter', 'Quarta': 'Qua', 'Quinta': 'Qui', 'Sexta': 'Sex', 'Sábado': 'Sáb', 'Domingo': 'Dom'
    };
    const activeShortDays = dashboardData.workingDays.map((d: string) => dayMap[d]);
    return dashboardData.revenueWeek.filter(d => activeShortDays.includes(d.name));
  }, [chartPeriod, dashboardData]);

  if (!identity && !identityLoading) {
    // Sem sessão válida neste dispositivo: volta para o login em vez de girar para sempre.
    return <RedirectToLogin />;
  }

  if (!identity) return <div className="min-h-screen flex items-center justify-center bg-[#fafafa]"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <aside className="w-72 bg-white border-r border-gray-100 hidden lg:flex lg:flex-col">
        <div className="p-8 border-b border-gray-50">
          <h1 className="font-serif text-3xl text-primary tracking-tight truncate" title={businessName || userName}>
            {businessName || userName}
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1 truncate">{userName} · Conectado</p>
        </div>
        <nav className="flex-1 p-6 space-y-1 overflow-y-auto scrollbar-none">
          {navItems.filter(item => !hiddenMenuItems.includes(item.id)).map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => handleNavClick(item.id)}
            />
          ))}
          <div className="pt-8 pb-4"><p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sistema</p></div>
          <SidebarItem icon={<Settings className="w-5 h-5" />} label="Configurações" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
          <div className="px-3 pt-2">
            <PwaInstallButton className="w-full justify-center" />
          </div>
          {isSuperAdmin && (
            <SidebarItem icon={<Shield className="w-5 h-5" />} label="Super Admin" active={false} onClick={() => navigate({ to: "/super-admin" })} />
          )}
        </nav>
        <div className="p-6 border-t border-gray-50 space-y-4">
          <div className="px-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Usuário Logado</p>
            <p className="text-sm font-bold text-gray-900 truncate">{userName}</p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              localStorage.removeItem("thaynails:businessName");
              localStorage.removeItem("thaynails_remember_v2");
              sessionStorage.setItem("thaynails_logged_out", "true");
              navigate({ to: "/login" });
            }}
            className="w-full flex items-center justify-start gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-2 px-1"
          >
            <LogOut className="w-4 h-4" /> Sair do Sistema
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-12 min-w-0">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-10">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button aria-label="Abrir menu" className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50 shrink-0">
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] sm:w-72 p-0 flex flex-col">
                <SheetHeader className="p-6 border-b border-gray-50 text-left">
                  <SheetTitle className="font-serif text-2xl text-primary tracking-tight truncate">{userName}</SheetTitle>
                </SheetHeader>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                  {navItems.filter(item => !hiddenMenuItems.includes(item.id)).map((item) => (
                    <SidebarItem key={item.id} icon={item.icon} label={item.label} active={activeTab === item.id} onClick={() => handleNavClick(item.id)} />
                  ))}
                  <div className="pt-6 pb-2"><p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sistema</p></div>
                  <SidebarItem icon={<Settings className="w-5 h-5" />} label="Configurações" active={activeTab === "settings"} onClick={() => handleNavClick("settings")} />
                  <div className="px-3 pt-2">
                    <PwaInstallButton className="w-full justify-center" />
                  </div>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      localStorage.removeItem("thaynails:businessName");
                      localStorage.removeItem("thaynails_remember_v2");
                      sessionStorage.setItem("thaynails_logged_out", "true");
                      navigate({ to: "/login" });
                    }}
                    className="w-full mt-auto flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-2"
                  >
                    <LogOut className="w-4 h-4" /> Sair do Sistema
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-gray-900 capitalize">
                {activeTab === "overview" && "Dashboard"}
                {activeTab === "appointments" && "Agendamentos"}
                {activeTab === "inventory" && "Controle de Estoque"}
                {activeTab === "payments" && "Gerenciamento de Pagamentos"}
                {activeTab === "expenses" && "Gestão de Despesas"}
                {activeTab === "reports" && "Relatórios e Análises"}
                {activeTab === "gallery" && "Fotos"}
                {activeTab === "whatsapp" && "Marketing WhatsApp"}
                {activeTab === "settings" && "Configurações"}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">Bem-vinda de volta, <span className="text-primary font-bold">{userName}</span>.</p>
            </div>
          </div>
          {activeTab !== "payments" && (
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button 
                onClick={() => setIsGlobalCreateOpen(true)}
                className="rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 gap-2 h-11 px-6 flex-1 md:flex-initial"
              >
                <Plus className="w-5 h-5" /> Novo Agendamento
              </Button>
            </div>
          )}
        </header>

        {activeTab === "overview" && (
          <div className="space-y-6 sm:space-y-8">
            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <WeeklyMiniCalendar onDateSelect={setSelectedDashboardDate} />
              </CardContent>
            </Card>


            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              <ShareBookingLink slug={tenantSlug} businessName={businessName} copied={linkCopied} onCopy={copySchedulingLink} />
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                <div className="p-4 sm:p-5 md:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 h-full">
                  <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                      <ExternalLink className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-serif text-base md:text-lg text-gray-900 leading-tight">Modo Engajamento</h4>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">Para deixar no tablet da mesa e engajar clientes.</p>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-nowrap gap-2 w-full sm:w-auto shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="rounded-full flex-1 sm:flex-none border-primary/20 text-primary hover:bg-primary/5 gap-2 h-9 md:h-10 text-xs md:text-sm bg-white"
                      onClick={() => {
                        const link = `${window.location.origin}/engagement?t=${tenantSlug}`;
                        navigator.clipboard.writeText(link);
                        toast.success("Link copiado!");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar
                    </Button>
                    <Button 
                      size="sm"
                      className="rounded-full flex-1 sm:flex-none gap-2 bg-purple-600 hover:bg-purple-700 h-9 md:h-10 text-xs md:text-sm"
                      onClick={() => window.open(`/engagement?t=${tenantSlug}`, "_blank")}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Abrir
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary opacity-20" /></div>}>
          {activeTab === "appointments" && <Appointments />}
          {activeTab === "inventory" && <Inventory />}
          {activeTab === "payments" && <Payments />}
          {activeTab === "expenses" && <Expenses />}
          {activeTab === "reports" && <Reports />}
          {activeTab === "whatsapp" && <WhatsAppIntegration businessName={businessName} tenantSlug={tenantSlug} userName={userName} />}
          {activeTab === "gallery" && <Gallery />}
          {activeTab === "clients" && <Clients />}
          {activeTab === "settings" && <SettingsPanel />}
        </Suspense>

        <CreateAppointmentDialog 
          open={isGlobalCreateOpen} 
          onOpenChange={setIsGlobalCreateOpen}
          initialDate={selectedDashboardDate}
        />
      </main>
      <SupportButton />
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = className;
  return <NailPolishLoader size={40} />;
}

function RedirectToLogin() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/login" });
  }, [navigate]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <NailPolishLoader size={40} />
    </div>
  );
}
