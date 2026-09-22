import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listTenants,
  listDeletedTenants,
  createTenantAccount,
  setTenantActive,
  resetTenantPassword,
  deleteTenantAccount,
  permanentlyDeleteTenant,
  restoreTenant,
  checkIsSuperAdmin,
  resetTenantData,
  updateTenantInfo,
  setTenantExpiry,
  setTenantPermissions,
  bootstrapAdminUser,
  listTenantBackgrounds,
  addTenantBackground,
  deleteTenantBackground,
} from "@/lib/tenants.functions";
import { listSupportRequests, setSupportRequestResolved, resendResolvedNotification } from "@/lib/support.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, KeyRound, Trash2, Power, ArrowLeft, Copy, ExternalLink,
  RotateCcw, Edit, Eye, EyeOff, CalendarClock, Shield, SlidersHorizontal,
  Search, Users, Ban, ArchiveRestore, AlertTriangle,
  ImageIcon, Upload, Loader2, LifeBuoy, Bug, Sparkles, HelpCircle, Check, Star, Bell,
} from "lucide-react";

export const Route = createFileRoute("/super-admin")({
  component: SuperAdminPage,
});

type Tenant = {
  id: string;
  slug: string;
  business_name: string;
  active: boolean;
  owner_user_id: string;
  created_at: string | null;
  username: string | null;
  raw_password: string | null;
  recovery_email: string | null;
  expires_at: string | null;
  deleted_at?: string | null;
  hidden_menu_items?: string[];
  is_super_admin?: boolean;
};

const ALL_MODULES: { id: string; label: string }[] = [
  { id: "overview", label: "Dashboard" },
  { id: "appointments", label: "Agendamentos" },
  { id: "inventory", label: "Estoque" },
  { id: "payments", label: "Pagamentos" },
  { id: "expenses", label: "Despesas" },
  { id: "reports", label: "Faturamento" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "gallery", label: "Meus Serviços" },
  { id: "clients", label: "Clientes" },
];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() ?? "").join("") || "?";
}

function expiryStatus(t: Tenant) {
  if (!t.expires_at) return { label: "Sem validade", tone: "muted" as const, expired: false };
  const exp = new Date(t.expires_at);
  if (exp.getUTCFullYear() >= 9000) return { label: "Vitalício", tone: "purple" as const, expired: false };
  const days = Math.ceil((exp.getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `Expirado há ${-days}d`, tone: "red" as const, expired: true };
  if (days <= 7) return { label: `Expira em ${days}d`, tone: "orange" as const, expired: false };
  return { label: `Válido até ${exp.toLocaleDateString("pt-BR")}`, tone: "green" as const, expired: false };
}

function SuperAdminPage() {
  const navigate = useNavigate();
  const listFn = useServerFn(listTenants);
  const listDeletedFn = useServerFn(listDeletedTenants);
  const createFn = useServerFn(createTenantAccount);
  const toggleFn = useServerFn(setTenantActive);
  const resetFn = useServerFn(resetTenantPassword);
  const deleteFn = useServerFn(deleteTenantAccount);
  const permaDeleteFn = useServerFn(permanentlyDeleteTenant);
  const restoreFn = useServerFn(restoreTenant);
  const checkFn = useServerFn(checkIsSuperAdmin);
  const resetDataFn = useServerFn(resetTenantData);
  const updateInfoFn = useServerFn(updateTenantInfo);
  const setExpiryFn = useServerFn(setTenantExpiry);
  const setPermsFn = useServerFn(setTenantPermissions);
  const bootstrapFn = useServerFn(bootstrapAdminUser);
  const listBgFn = useServerFn(listTenantBackgrounds);
  const addBgFn = useServerFn(addTenantBackground);
  const delBgFn = useServerFn(deleteTenantBackground);
  const listSupportFn = useServerFn(listSupportRequests);
  const resolveSupportFn = useServerFn(setSupportRequestResolved);
  const resendSupportFn = useServerFn(resendResolvedNotification);

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"active" | "blocked" | "trash">("active");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [deleted, setDeleted] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Tenant | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [resetTarget, setResetTarget] = useState<Tenant | null>(null);
  const [expiryTarget, setExpiryTarget] = useState<Tenant | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [permsTarget, setPermsTarget] = useState<Tenant | null>(null);
  const [permsHidden, setPermsHidden] = useState<string[]>([]);
  const [bgTarget, setBgTarget] = useState<Tenant | null>(null);
  const [bgList, setBgList] = useState<{ id: string; url: string }[]>([]);
  const [bgLoading, setBgLoading] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportList, setSupportList] = useState<any[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportReply, setSupportReply] = useState<Record<string, string>>({});
  const [resolveTarget, setResolveTarget] = useState<any | null>(null);
  const [resolveText, setResolveText] = useState("");
  const [resolveSaving, setResolveSaving] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ username: "", password: "", businessName: "", slug: "", recoveryEmail: "" });
  const [editForm, setEditForm] = useState({ username: "", businessName: "", slug: "", recoveryEmail: "" });
  const [newPassword, setNewPassword] = useState("");

  async function refresh() {
    try {
      const [a, d] = await Promise.all([listFn(), listDeletedFn()]);
      setTenants(a.tenants as Tenant[]);
      setDeleted(d.tenants as Tenant[]);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar");
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) { navigate({ to: "/login" }); return; }
        const { isSuperAdmin } = await checkFn();
        if (!isSuperAdmin) { toast.error("Acesso restrito a super-admin"); navigate({ to: "/admin" }); return; }
        setAuthorized(true);
        refresh();
      } catch { navigate({ to: "/login" }); }
    })();
  }, []);

  const visibleActive = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants.filter((t) => !t.is_super_admin && t.active && (!q ||
      t.business_name.toLowerCase().includes(q) ||
      (t.username || "").toLowerCase().includes(q) ||
      (t.recovery_email || "").toLowerCase().includes(q)));
  }, [tenants, search]);
  const visibleBlocked = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants.filter((t) => !t.is_super_admin && !t.active && (!q ||
      t.business_name.toLowerCase().includes(q) ||
      (t.username || "").toLowerCase().includes(q)));
  }, [tenants, search]);
  const visibleTrash = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deleted.filter((t) => !q ||
      t.business_name.toLowerCase().includes(q) ||
      (t.username || "").toLowerCase().includes(q));
  }, [deleted, search]);

  const stats = useMemo(() => ({
    active: tenants.filter(t => !t.is_super_admin && t.active).length,
    blocked: tenants.filter(t => !t.is_super_admin && !t.active).length,
    trash: deleted.length,
    expiring: tenants.filter(t => {
      if (t.is_super_admin || !t.expires_at) return false;
      const d = Math.ceil((new Date(t.expires_at).getTime() - Date.now()) / 86400000);
      return d >= 0 && d <= 7;
    }).length,
  }), [tenants, deleted]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await createFn({ data: form });
      toast.success("Conta criada!");
      setCreateOpen(false);
      setForm({ username: "", password: "", businessName: "", slug: "", recoveryEmail: "" });
      refresh();
    } catch (e: any) { toast.error(e?.message || "Erro"); } finally { setSaving(false); }
  }
  async function handleToggle(t: Tenant) {
    try { await toggleFn({ data: { tenantId: t.id, active: !t.active } });
      toast.success(t.active ? "Conta bloqueada" : "Conta reativada"); refresh();
    } catch (e: any) { toast.error(e?.message || "Erro"); }
  }
  async function handleReset(e: React.FormEvent) {
    e.preventDefault(); if (!resetTarget) return; setSaving(true);
    try { await resetFn({ data: { userId: resetTarget.owner_user_id, password: newPassword } });
      toast.success("Senha redefinida"); setResetTarget(null); setNewPassword("");
    } catch (e: any) { toast.error(e?.message || "Erro"); } finally { setSaving(false); }
  }
  async function handleSoftDelete(t: Tenant) {
    if (!confirm(`Mover "${t.business_name}" para a lixeira? Você poderá restaurar depois.`)) return;
    try { await deleteFn({ data: { tenantId: t.id, userId: t.owner_user_id } });
      toast.success("Movido para a lixeira"); refresh();
    } catch (e: any) { toast.error(e?.message || "Erro"); }
  }
  async function handleRestore(t: Tenant) {
    try { await restoreFn({ data: { tenantId: t.id } });
      toast.success("Conta restaurada"); refresh();
    } catch (e: any) { toast.error(e?.message || "Erro"); }
  }
  async function handlePermaDelete(t: Tenant) {
    if (!confirm(`EXCLUIR DEFINITIVAMENTE "${t.business_name}"? Esta ação não pode ser desfeita e apaga todos os dados.`)) return;
    try { await permaDeleteFn({ data: { tenantId: t.id, userId: t.owner_user_id } });
      toast.success("Conta excluída permanentemente"); refresh();
    } catch (e: any) { toast.error(e?.message || "Erro"); }
  }
  async function handleResetData(t: Tenant) {
    if (!confirm(`RESETAR todos os dados de "${t.business_name}"? Agendamentos, estoque, despesas e pagamentos serão apagados.`)) return;
    setSaving(true);
    try { await resetDataFn({ data: { userId: t.owner_user_id } }); toast.success("Dados resetados!"); }
    catch (e: any) { toast.error(e?.message || "Erro"); } finally { setSaving(false); }
  }
  async function handleUpdateInfo(e: React.FormEvent) {
    e.preventDefault(); if (!editTarget) return; setSaving(true);
    try { await updateInfoFn({ data: { tenantId: editTarget.id, ...editForm } });
      toast.success("Informações atualizadas!"); setEditTarget(null); refresh();
    } catch (e: any) { toast.error(e?.message || "Erro"); } finally { setSaving(false); }
  }
  function togglePassword(id: string) { setShowPasswords(p => ({ ...p, [id]: !p[id] })); }
  function openEdit(t: Tenant) {
    setEditTarget(t);
    setEditForm({ username: t.username || "", businessName: t.business_name, slug: t.slug, recoveryEmail: t.recovery_email || "" });
  }
  function copyBookingLink(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/?t=${slug}`);
    toast.success("Link copiado!");
  }
  function openExpiry(t: Tenant) {
    setExpiryTarget(t);
    setExpiryDate(t.expires_at ? new Date(t.expires_at).toISOString().slice(0, 10) : "");
  }
  async function handleSaveExpiry(e: React.FormEvent) {
    e.preventDefault(); if (!expiryTarget) return; setSaving(true);
    try {
      const iso = expiryDate ? new Date(expiryDate + "T23:59:59").toISOString() : null;
      await setExpiryFn({ data: { tenantId: expiryTarget.id, expiresAt: iso } });
      toast.success("Validade atualizada"); setExpiryTarget(null); refresh();
    } catch (err: any) { toast.error(err?.message || "Erro"); } finally { setSaving(false); }
  }
  async function quickExtend(t: Tenant, days: number | null) {
    try {
      let iso: string | null;
      if (days === null) iso = "9999-12-31T00:00:00.000Z";
      else {
        const baseDate = t.expires_at ? new Date(t.expires_at) : null;
        const isLifetime = baseDate && baseDate.getUTCFullYear() >= 9000;
        const base = baseDate && !isLifetime && baseDate > new Date() ? baseDate : new Date();
        base.setDate(base.getDate() + days);
        iso = base.toISOString();
      }
      await setExpiryFn({ data: { tenantId: t.id, expiresAt: iso } });
      toast.success(days === null ? "Acesso vitalício concedido" : `+${days} dias adicionados`);
      refresh();
    } catch (err: any) { toast.error(err?.message || "Erro"); }
  }
  function openPerms(t: Tenant) { setPermsTarget(t); setPermsHidden(t.hidden_menu_items ?? []); }
  function toggleModule(id: string, allow: boolean) {
    setPermsHidden(prev => allow ? prev.filter(x => x !== id) : [...new Set([...prev, id])]);
  }
  async function handleSavePerms(e: React.FormEvent) {
    e.preventDefault(); if (!permsTarget) return; setSaving(true);
    try {
      await setPermsFn({ data: { tenantId: permsTarget.id, hiddenItems: permsHidden } });
      toast.success("Permissões atualizadas"); setPermsTarget(null); refresh();
    } catch (err: any) { toast.error(err?.message || "Erro"); } finally { setSaving(false); }
  }
  async function handleBootstrapAdmin() {
    try {
      const res: any = await bootstrapFn();
      toast.success(res?.created ? "Usuário 'admin' criado!" : "Usuário 'admin' sincronizado.");
      refresh();
    } catch (err: any) { toast.error(err?.message || "Erro"); }
  }

  async function openSupport() {
    setSupportOpen(true);
    setSupportLoading(true);
    try {
      const res = await listSupportFn();
      setSupportList(res.requests);
    } catch (e: any) { toast.error(e?.message || "Erro"); }
    finally { setSupportLoading(false); }
  }
  async function toggleResolved(id: string, resolved: boolean) {
    try {
      const reply = resolved ? (supportReply[id] ?? "").trim() : "";
      await resolveSupportFn({ data: { id, resolved, reply: reply || undefined } });
      setSupportList((prev) => prev.map((r) => r.id === id
        ? {
            ...r,
            status: resolved ? "resolved" : "open",
            resolved_at: resolved ? new Date().toISOString() : null,
            admin_reply: resolved ? (reply || r.admin_reply) : r.admin_reply,
          }
        : r));
      if (resolved) toast.success("Chamado resolvido — o usuário será notificado.");
    } catch (e: any) { toast.error(e?.message || "Erro"); }
  }
  function openResolveDialog(r: any) {
    setResolveTarget(r);
    setResolveText(r.admin_reply || "");
  }
  async function confirmResolve() {
    if (!resolveTarget) return;
    const text = resolveText.trim();
    if (!text) { toast.error("Descreva o que foi feito antes de encerrar."); return; }
    setResolveSaving(true);
    try {
      await resolveSupportFn({ data: { id: resolveTarget.id, resolved: true, reply: text } });
      setSupportList((prev) => prev.map((r) => r.id === resolveTarget.id
        ? { ...r, status: "resolved", resolved_at: new Date().toISOString(), admin_reply: text, acknowledged_at: null }
        : r));
      toast.success("Chamado encerrado — o usuário será notificado.");
      setResolveTarget(null);
      setResolveText("");
    } catch (e: any) { toast.error(e?.message || "Erro"); }
    finally { setResolveSaving(false); }
  }
  async function resendNotification(id: string) {
    try {
      await resendSupportFn({ data: { id } });
      setSupportList((prev) => prev.map((r) => r.id === id ? { ...r, acknowledged_at: null } : r));
      toast.success("Notificação reenviada ao usuário.");
    } catch (e: any) { toast.error(e?.message || "Erro"); }
  }

  async function openBackgrounds(t: Tenant) {
    setBgTarget(t);
    setBgList([]);
    setBgLoading(true);
    try {
      const res = await listBgFn({ data: { userId: t.owner_user_id } });
      setBgList(res.backgrounds as any);
    } catch (e: any) { toast.error(e?.message || "Erro"); }
    finally { setBgLoading(false); }
  }
  async function handleUploadBackground(file: File) {
    if (!bgTarget) return;
    setBgUploading(true);
    const tid = toast.loading("Enviando imagem...");
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const ext = file.name.split(".").pop() || "png";
      const path = `${u.user.id}/admin-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
      const url = `${pub.publicUrl}?t=${Date.now()}`;
      await addBgFn({ data: { userId: bgTarget.owner_user_id, url } });
      setBgList((prev) => [{ id: crypto.randomUUID(), url }, ...prev]);
      // Re-fetch to get real ids
      const res = await listBgFn({ data: { userId: bgTarget.owner_user_id } });
      setBgList(res.backgrounds as any);
      toast.success("Fundo adicionado!", { id: tid });
    } catch (e: any) { toast.error(e?.message || "Erro no upload", { id: tid }); }
    finally { setBgUploading(false); }
  }
  async function handleDeleteBackground(id: string) {
    if (!confirm("Remover este fundo da conta?")) return;
    try {
      await delBgFn({ data: { id } });
      setBgList((prev) => prev.filter((b) => b.id !== id));
      toast.success("Fundo removido");
    } catch (e: any) { toast.error(e?.message || "Erro"); }
  }

  if (authorized === null) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <button onClick={() => navigate({ to: "/admin" })} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Voltar ao Admin
            </button>
            <h1 className="font-serif text-2xl sm:text-3xl text-primary mt-1">Painel Super-Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openSupport} className="rounded-full gap-2">
              <LifeBuoy className="w-4 h-4" /> Suporte
              {tenants.length === 0 ? null : null}
            </Button>
            <Button variant="outline" onClick={handleBootstrapAdmin} className="rounded-full gap-2 hidden sm:inline-flex">
              <Shield className="w-4 h-4" /> Provisionar admin
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="rounded-full gap-2 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" /> Nova conta
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<Users className="w-4 h-4" />} label="Ativos" value={stats.active} tone="green" />
          <StatCard icon={<Ban className="w-4 h-4" />} label="Bloqueados" value={stats.blocked} tone="orange" />
          <StatCard icon={<Trash2 className="w-4 h-4" />} label="Lixeira" value={stats.trash} tone="red" />
          <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Expirando ≤7d" value={stats.expiring} tone="yellow" />
        </div>

        {/* Search + Tabs */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, usuário ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-full bg-white border-gray-200"
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="bg-white rounded-full p-1 border border-gray-100">
            <TabsTrigger value="active" className="rounded-full gap-2">
              <Users className="w-3.5 h-3.5" /> Ativos
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">{stats.active}</span>
            </TabsTrigger>
            <TabsTrigger value="blocked" className="rounded-full gap-2">
              <Ban className="w-3.5 h-3.5" /> Bloqueados
              <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">{stats.blocked}</span>
            </TabsTrigger>
            <TabsTrigger value="trash" className="rounded-full gap-2">
              <Trash2 className="w-3.5 h-3.5" /> Lixeira
              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">{stats.trash}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-3">
            {visibleActive.length === 0
              ? <EmptyState message={search ? "Nenhuma conta encontrada." : "Nenhuma conta ativa."} />
              : visibleActive.map((t) => (
                <TenantCard key={t.id} t={t} mode="active"
                  showPassword={!!showPasswords[t.id]} onTogglePw={() => togglePassword(t.id)}
                  onEdit={() => openEdit(t)} onResetPw={() => setResetTarget(t)}
                  onExpiry={() => openExpiry(t)} onPerms={() => openPerms(t)}
                  onQuickExtend={(d) => quickExtend(t, d)} onToggle={() => handleToggle(t)}
                  onResetData={() => handleResetData(t)} onDelete={() => handleSoftDelete(t)}
                  onCopyLink={() => copyBookingLink(t.slug)}
                  onBackgrounds={() => openBackgrounds(t)} />
              ))}
          </TabsContent>

          <TabsContent value="blocked" className="mt-4 space-y-3">
            {visibleBlocked.length === 0
              ? <EmptyState message="Nenhuma conta bloqueada." />
              : visibleBlocked.map((t) => (
                <TenantCard key={t.id} t={t} mode="blocked"
                  showPassword={!!showPasswords[t.id]} onTogglePw={() => togglePassword(t.id)}
                  onEdit={() => openEdit(t)} onResetPw={() => setResetTarget(t)}
                  onExpiry={() => openExpiry(t)} onPerms={() => openPerms(t)}
                  onQuickExtend={(d) => quickExtend(t, d)} onToggle={() => handleToggle(t)}
                  onResetData={() => handleResetData(t)} onDelete={() => handleSoftDelete(t)}
                  onCopyLink={() => copyBookingLink(t.slug)}
                  onBackgrounds={() => openBackgrounds(t)} />
              ))}
          </TabsContent>

          <TabsContent value="trash" className="mt-4 space-y-3">
            {visibleTrash.length === 0
              ? <EmptyState message="A lixeira está vazia." />
              : visibleTrash.map((t) => (
                <TrashCard key={t.id} t={t} onRestore={() => handleRestore(t)} onPermaDelete={() => handlePermaDelete(t)} />
              ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* === Dialogs === */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-[2rem]">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl text-primary">Nova conta</DialogTitle>
              <DialogDescription>Cria login e workspace para uma profissional.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div><Label>Nome do negócio</Label>
                <Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Ex: Maria Nails" required /></div>
              <div><Label>Slug (aparece no link)</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} placeholder="maria-nails" pattern="[a-z0-9\-]+" required />
                <p className="text-[10px] text-muted-foreground mt-1">Link público: /?t=seu-slug</p></div>
              <div><Label>Usuário (login)</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} placeholder="marianails" pattern="[a-z0-9_]+" required /></div>
              <div><Label>Senha inicial</Label>
                <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required /></div>
              <div><Label>E-mail de recuperação (opcional)</Label>
                <Input type="email" value={form.recoveryEmail} onChange={(e) => setForm({ ...form, recoveryEmail: e.target.value })} placeholder="email@exemplo.com" /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="rounded-full bg-primary">{saving ? "Criando..." : "Criar conta"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="rounded-[2rem]">
          <form onSubmit={handleReset}>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Redefinir senha</DialogTitle>
              <DialogDescription>{resetTarget?.business_name}</DialogDescription>
            </DialogHeader>
            <div className="py-4"><Label>Nova senha</Label>
              <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required /></div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setResetTarget(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="rounded-full bg-primary">{saving ? "Salvando..." : "Redefinir"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="rounded-[2rem]">
          <form onSubmit={handleUpdateInfo}>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl text-primary">Editar profissional</DialogTitle>
              <DialogDescription>{editTarget?.business_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div><Label>Nome do negócio</Label>
                <Input value={editForm.businessName} onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })} required /></div>
              <div><Label>Slug</Label>
                <Input value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase() })} pattern="[a-z0-9\-]+" required /></div>
              <div><Label>Usuário</Label>
                <Input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase() })} pattern="[a-z0-9_]+" required /></div>
              <div><Label>E-mail de recuperação</Label>
                <Input type="email" value={editForm.recoveryEmail} onChange={(e) => setEditForm({ ...editForm, recoveryEmail: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditTarget(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="rounded-full bg-primary">{saving ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!expiryTarget} onOpenChange={(o) => !o && setExpiryTarget(null)}>
        <DialogContent className="rounded-[2rem]">
          <form onSubmit={handleSaveExpiry}>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Validade do plano</DialogTitle>
              <DialogDescription>{expiryTarget?.business_name}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label>Data de expiração</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Após essa data o login será bloqueado. Deixe vazio para acesso sem validade.</p>
              {expiryDate && <button type="button" onClick={() => setExpiryDate("")} className="text-xs text-red-600 hover:underline">Remover validade</button>}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setExpiryTarget(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="rounded-full bg-primary">{saving ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!permsTarget} onOpenChange={(o) => !o && setPermsTarget(null)}>
        <DialogContent className="rounded-[2rem]">
          <form onSubmit={handleSavePerms}>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Módulos liberados</DialogTitle>
              <DialogDescription>{permsTarget?.business_name}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-1">
              <p className="text-xs text-muted-foreground mb-2">Marque os módulos que esta profissional poderá acessar.</p>
              {ALL_MODULES.map((m) => {
                const allowed = !permsHidden.includes(m.id);
                return (
                  <label key={m.id} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2">
                    <Checkbox checked={allowed} onCheckedChange={(c) => toggleModule(m.id, !!c)} />
                    <span className="text-sm">{m.label}</span>
                  </label>
                );
              })}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPermsTarget(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="rounded-full bg-primary">{saving ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!bgTarget} onOpenChange={(o) => !o && setBgTarget(null)}>
        <DialogContent className="rounded-[2rem] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary">Fundos do Status</DialogTitle>
            <DialogDescription>{bgTarget?.business_name} — adicione ou remova fundos disponíveis para esta conta.</DialogDescription>
          </DialogHeader>
          <div className="py-2 max-h-[60vh] overflow-y-auto">
            {bgLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                <label className="aspect-[9/16] rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors text-xs text-muted-foreground gap-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={bgUploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadBackground(f); e.target.value = ""; }}
                  />
                  {bgUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  <span>Adicionar</span>
                </label>
                {bgList.map((bg) => (
                  <div key={bg.id} className="relative aspect-[9/16] rounded-2xl overflow-hidden border border-gray-100 group">
                    <img src={bg.url} className="w-full h-full object-cover" loading="lazy" />
                    <button
                      onClick={() => handleDeleteBackground(bg.id)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-red-600 hover:bg-white shadow"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {bgList.length === 0 && !bgUploading && (
                  <p className="col-span-full text-center text-sm text-muted-foreground py-6 italic">
                    Nenhum fundo personalizado adicionado. Os fundos padrão do app ficam sempre disponíveis.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBgTarget(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="rounded-[2rem] max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary flex items-center gap-2">
              <LifeBuoy className="w-5 h-5" /> Mensagens de suporte
            </DialogTitle>
            <DialogDescription>Solicitações enviadas pelas profissionais.</DialogDescription>
          </DialogHeader>
          <div className="py-2 max-h-[65vh] overflow-y-auto space-y-3">
            {supportLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : supportList.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10 italic">Nenhuma mensagem recebida ainda.</p>
            ) : supportList.map((r) => {
              const kindInfo = r.kind === "bug"
                ? { icon: <Bug className="w-3.5 h-3.5" />, label: "Bug", c: "bg-red-50 text-red-700 border-red-200" }
                : r.kind === "request"
                ? { icon: <Sparkles className="w-3.5 h-3.5" />, label: "Solicitação", c: "bg-purple-50 text-purple-700 border-purple-200" }
                : { icon: <HelpCircle className="w-3.5 h-3.5" />, label: "Dúvida", c: "bg-blue-50 text-blue-700 border-blue-200" };
              const resolved = r.status === "resolved";
              return (
                <div key={r.id} className={`rounded-2xl border p-4 ${resolved ? "bg-green-50/40 border-green-100" : "bg-white border-gray-100"}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${kindInfo.c}`}>
                          {kindInfo.icon}{kindInfo.label}
                        </span>
                        {resolved && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700">Resolvido</span>}
                        <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                      </div>
                      <p className="font-medium text-sm mt-1 truncate">{r.subject}</p>
                      <p className="text-[11px] text-muted-foreground">de <b>{r.business_name}</b> {r.username && `· @${r.username}`}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {resolved && (
                        <Button
                          size="sm" variant="outline"
                          className="rounded-full gap-1"
                          onClick={() => resendNotification(r.id)}
                          title={r.acknowledged_at ? "Reenviar notificação ao usuário" : "Notificação ainda não vista pelo usuário"}
                        >
                          <Bell className="w-3 h-3" />
                          {r.acknowledged_at ? "Notificar" : "Reenviar"}
                        </Button>
                      )}
                      <Button
                        size="sm" variant={resolved ? "outline" : "default"}
                        className={`rounded-full gap-1 ${resolved ? "" : "bg-green-600 hover:bg-green-700"}`}
                        onClick={() => resolved ? toggleResolved(r.id, false) : openResolveDialog(r)}
                      >
                        <Check className="w-3 h-3" /> {resolved ? "Reabrir" : "Resolver"}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-gray-700 bg-gray-50 rounded-xl p-3">{r.message}</p>

                  {resolved && r.admin_reply ? (
                    <div className="mt-3 rounded-xl bg-green-50 border border-green-100 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-green-700 font-bold mb-1">Sua resposta</p>
                      <p className="text-sm whitespace-pre-wrap text-green-900">{r.admin_reply}</p>
                    </div>
                  ) : null}

                  {resolved && r.rating ? (
                    <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-3">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">Avaliação</p>
                        <div className="flex">
                          {[1,2,3,4,5].map((n) => (
                            <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? "fill-amber-500 text-amber-500" : "text-amber-200"}`} />
                          ))}
                        </div>
                        {r.rated_at && (
                          <span className="text-[10px] text-muted-foreground">
                            · {new Date(r.rated_at).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                      {r.rating_feedback && (
                        <p className="text-sm text-amber-900 mt-1 whitespace-pre-wrap">{r.rating_feedback}</p>
                      )}
                    </div>
                  ) : resolved ? (
                    <p className="mt-2 text-[11px] italic text-muted-foreground">Aguardando avaliação do usuário.</p>
                  ) : null}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSupportOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resolveTarget} onOpenChange={(o) => { if (!o) { setResolveTarget(null); setResolveText(""); } }}>
        <DialogContent className="rounded-[2rem] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" /> Encerrar chamado
            </DialogTitle>
            <DialogDescription>
              {resolveTarget?.subject && <b>{resolveTarget.subject}</b>}
              <br />Descreva o que foi feito. O usuário verá esta mensagem na notificação.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>O que foi feito?</Label>
            <textarea
              autoFocus
              value={resolveText}
              onChange={(e) => setResolveText(e.target.value)}
              placeholder="Ex: Corrigimos o bug ao salvar o agendamento. Já está funcionando normalmente, pode testar."
              maxLength={4000} rows={5}
              className="mt-1 w-full text-sm rounded-xl border border-gray-200 bg-white p-3 outline-none focus:border-primary/50 resize-none"
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{resolveText.length}/4000</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setResolveTarget(null); setResolveText(""); }}>Cancelar</Button>
            <Button
              onClick={confirmResolve}
              disabled={resolveSaving || !resolveText.trim()}
              className="rounded-full bg-green-600 hover:bg-green-700 gap-2"
            >
              {resolveSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Encerrar e notificar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "green" | "orange" | "red" | "yellow" }) {
  const toneClass = {
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
    yellow: "bg-yellow-50 text-yellow-700",
  }[tone];
  return (
    <Card className="border-none shadow-sm rounded-2xl">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${toneClass}`}>{icon}</div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
          <p className="text-2xl font-serif">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-center text-muted-foreground py-12 italic text-sm">{message}</p>;
}

function TenantCard({
  t, mode, showPassword, onTogglePw, onEdit, onResetPw, onExpiry, onPerms,
  onQuickExtend, onToggle, onResetData, onDelete, onCopyLink, onBackgrounds,
}: {
  t: Tenant; mode: "active" | "blocked"; showPassword: boolean;
  onTogglePw: () => void; onEdit: () => void; onResetPw: () => void;
  onExpiry: () => void; onPerms: () => void;
  onQuickExtend: (days: number | null) => void;
  onToggle: () => void; onResetData: () => void; onDelete: () => void; onCopyLink: () => void;
  onBackgrounds: () => void;
}) {
  const s = expiryStatus(t);
  const toneClass = s.tone === "red" ? "text-red-600" : s.tone === "orange" ? "text-orange-600" : s.tone === "green" ? "text-green-700" : s.tone === "purple" ? "text-purple-700 font-semibold" : "text-muted-foreground";
  return (
    <Card className={`border-none shadow-sm rounded-3xl overflow-hidden ${mode === "blocked" ? "bg-orange-50/30" : ""}`}>
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Identity */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="w-14 h-14 border-2 border-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-serif text-lg">
                {initials(t.business_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif text-xl truncate">{t.business_name}</h3>
                {mode === "blocked" && <Badge tone="orange">Bloqueada</Badge>}
                {s.expired && <Badge tone="red">Expirada</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate">@{t.username || "—"} · {t.recovery_email || "sem e-mail"}</p>
              <p className={`text-xs font-medium mt-0.5 ${toneClass}`}>{s.label}</p>
            </div>
          </div>
        </div>

        {/* All actions, always visible */}
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          {/* Conta */}
          <ActionGroup label="Conta">
            <ActionChip onClick={onEdit} icon={<Edit className="w-3.5 h-3.5" />} label="Editar" />
            <ActionChip onClick={onResetPw} icon={<KeyRound className="w-3.5 h-3.5" />} label="Redefinir senha" />
            <ActionChip onClick={onCopyLink} icon={<Copy className="w-3.5 h-3.5" />} label="Copiar link" />
            <ActionChip as="a" href={`/?t=${t.slug}`} target="_blank" rel="noopener noreferrer"
              icon={<ExternalLink className="w-3.5 h-3.5" />} label="Abrir página" />
            <ActionChip onClick={onTogglePw}
              icon={showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              label={showPassword ? "Ocultar senha" : "Ver senha"} />
          </ActionGroup>

          {/* Acesso & permissões */}
          <ActionGroup label="Acesso & permissões">
            <ActionChip onClick={onPerms} icon={<SlidersHorizontal className="w-3.5 h-3.5" />} label="Módulos" />
            <ActionChip onClick={onExpiry} icon={<CalendarClock className="w-3.5 h-3.5" />} label="Validade" />
            <ActionChip onClick={onBackgrounds} icon={<ImageIcon className="w-3.5 h-3.5" />} label="Fundos do status" />
            <ActionChip
              onClick={onToggle}
              icon={<Power className="w-3.5 h-3.5" />}
              label={mode === "blocked" ? "Desbloquear" : "Bloquear"}
              tone={mode === "blocked" ? "green" : "orange"}
            />
          </ActionGroup>

          {/* Licença rápida */}
          <ActionGroup label="Estender licença">
            <ActionChip onClick={() => onQuickExtend(30)} label="+30 dias" />
            <ActionChip onClick={() => onQuickExtend(60)} label="+60 dias" />
            <ActionChip onClick={() => onQuickExtend(90)} label="+90 dias" />
            <ActionChip onClick={() => onQuickExtend(365)} label="+1 ano" />
            <ActionChip onClick={() => onQuickExtend(null)} label="Vitalício" tone="purple" />
          </ActionGroup>

          {/* Zona de risco */}
          <ActionGroup label="Zona de risco">
            <ActionChip onClick={onResetData} icon={<RotateCcw className="w-3.5 h-3.5" />} label="Resetar dados" tone="orange" />
            <ActionChip onClick={onDelete} icon={<Trash2 className="w-3.5 h-3.5" />} label="Mover p/ lixeira" tone="red" />
          </ActionGroup>
        </div>

        {showPassword && (
          <div className="mt-3 px-3 py-2 bg-gray-50 rounded-xl text-xs font-mono flex items-center justify-between">
            <span>Senha: {t.raw_password || "—"}</span>
            <button onClick={onTogglePw} className="text-primary"><EyeOff className="w-3 h-3" /></button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

type ChipTone = "default" | "green" | "orange" | "red" | "purple";
function ActionChip(props: {
  onClick?: () => void;
  icon?: React.ReactNode;
  label: string;
  tone?: ChipTone;
  as?: "a";
  href?: string;
  target?: string;
  rel?: string;
}) {
  const tone: ChipTone = props.tone ?? "default";
  const toneClass = {
    default: "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300",
    green: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
    orange: "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100",
    red: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
    purple: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
  }[tone];
  const className = `inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${toneClass}`;
  if (props.as === "a") {
    return (
      <a href={props.href} target={props.target} rel={props.rel} className={className}>
        {props.icon}{props.label}
      </a>
    );
  }
  return (
    <button type="button" onClick={props.onClick} className={className}>
      {props.icon}{props.label}
    </button>
  );
}

function TrashCard({ t, onRestore, onPermaDelete }: { t: Tenant; onRestore: () => void; onPermaDelete: () => void }) {
  return (
    <Card className="border-none shadow-sm rounded-3xl bg-red-50/30 opacity-90">
      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="w-12 h-12 grayscale">
            <AvatarFallback className="bg-gray-200 text-gray-500 font-serif">{initials(t.business_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg truncate">{t.business_name}</h3>
              <Badge tone="red">Excluída</Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">@{t.username || "—"}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Excluída em {t.deleted_at ? new Date(t.deleted_at).toLocaleString("pt-BR") : "—"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full gap-1 border-green-200 text-green-700 hover:bg-green-50" onClick={onRestore}>
            <ArchiveRestore className="w-3.5 h-3.5" /> Restaurar
          </Button>
          <Button variant="outline" size="sm" className="rounded-full gap-1 border-red-200 text-red-700 hover:bg-red-50" onClick={onPermaDelete}>
            <Trash2 className="w-3.5 h-3.5" /> Excluir definitivamente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Badge({ tone, children }: { tone: "red" | "orange" | "green"; children: React.ReactNode }) {
  const c = tone === "red" ? "bg-red-100 text-red-700" : tone === "orange" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700";
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${c}`}>{children}</span>;
}