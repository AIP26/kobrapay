import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  ArrowRight,
  Wallet,
  Building2,
  ShieldCheck,
  RefreshCw,
  DollarSign,
  ExternalLink,
  ArrowDownToLine,
  Hourglass,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  Star,
  ChevronLeft,
  CreditCard,
  Landmark,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type BankAccount = {
  id: number;
  connectType: "express" | "custom";
  stripeAccountId: string | null;
  stripeStatus: string;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeDetailsSubmitted: boolean;
  accountAlias: string | null;
  bankName: string | null;
  clabe: string | null;
  accountNumber: string | null;
  cardNumber: string | null;
  accountHolderName: string | null;
  rfc: string | null;
  curp: string | null;
  razonSocial: string | null;
  regimenFiscal: string | null;
  isPrimary: boolean;
  isActive: boolean;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
};

const BANCOS_MX = [
  "BBVA", "Banamex (Citibanamex)", "Santander", "Banorte", "HSBC",
  "Scotiabank", "Inbursa", "Bajío", "Afirme", "BanBajío",
  "Multiva", "Bansí", "Mifel", "Monexcb", "CIBanco",
  "Invex", "Ve por Más", "Actinver", "Intercam", "Otro",
];

const REGIMENES_FISCALES = [
  "601 - General de Ley Personas Morales",
  "603 - Personas Morales con Fines no Lucrativos",
  "605 - Sueldos y Salarios e Ingresos Asimilados",
  "606 - Arrendamiento",
  "607 - Régimen de Enajenación o Adquisición de Bienes",
  "608 - Demás ingresos",
  "610 - Residentes en el Extranjero sin Establecimiento Permanente",
  "611 - Ingresos por Dividendos",
  "612 - Personas Físicas con Actividades Empresariales",
  "614 - Ingresos por intereses",
  "615 - Régimen de los ingresos por obtención de premios",
  "616 - Sin obligaciones fiscales",
  "620 - Sociedades Cooperativas de Producción",
  "621 - Incorporación Fiscal",
  "622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras",
  "623 - Opcional para Grupos de Sociedades",
  "624 - Coordinados",
  "625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas",
  "626 - Régimen Simplificado de Confianza (RESICO)",
];

const emptyForm = {
  connectType: "express" as "express" | "custom",
  accountAlias: "",
  bankName: "",
  clabe: "",
  accountNumber: "",
  cardNumber: "",
  accountHolderName: "",
  rfc: "",
  curp: "",
  razonSocial: "",
  regimenFiscal: "",
  isPrimary: false,
  notes: "",
};

export default function StripeConnect() {
  const [, navigate] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [payoutModal, setPayoutModal] = useState<{ open: boolean; accountId: number | null; max: number }>({ open: false, accountId: null, max: 0 });
  const [payoutAmount, setPayoutAmount] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Detectar retorno del onboarding de Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectStatus = params.get("connect");
    if (connectStatus === "success") {
      toast.success("¡Proceso completado! Verificando estado de tu cuenta...");
      window.history.replaceState({}, "", window.location.pathname);
      refetchAccounts();
    } else if (connectStatus === "refresh") {
      toast.info("El enlace expiró. Inicia el proceso nuevamente.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const { data: accounts = [], isLoading, refetch: refetchAccounts } = trpc.bankAccounts.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.bankAccounts.create.useMutation({
    onSuccess: () => {
      toast.success("Cuenta bancaria registrada correctamente");
      setShowForm(false);
      setForm({ ...emptyForm });
      utils.bankAccounts.list.invalidate();
    },
    onError: (e) => toast.error(e.message || "Error al guardar la cuenta"),
  });

  const updateMutation = trpc.bankAccounts.update.useMutation({
    onSuccess: () => {
      toast.success("Cuenta actualizada");
      setEditingAccount(null);
      setShowForm(false);
      setForm({ ...emptyForm });
      utils.bankAccounts.list.invalidate();
    },
    onError: (e) => toast.error(e.message || "Error al actualizar"),
  });

  const deleteMutation = trpc.bankAccounts.delete.useMutation({
    onSuccess: () => {
      toast.success("Cuenta eliminada");
      setDeleteConfirm(null);
      utils.bankAccounts.list.invalidate();
    },
    onError: (e) => toast.error(e.message || "Error al eliminar"),
  });

  const onboardMutation = trpc.bankAccounts.startStripeOnboarding.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (e) => toast.error(e.message || "Error al iniciar verificación de Stripe"),
  });

  const payoutMutation = trpc.bankAccounts.requestPayout.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ Retiro de $${data.amount.toFixed(2)} MXN solicitado. Llegará el ${new Date(data.arrivalDate).toLocaleDateString("es-MX")}`);
      setPayoutModal({ open: false, accountId: null, max: 0 });
      setPayoutAmount("");
    },
    onError: (e) => toast.error(e.message || "Error al solicitar retiro"),
  });

  const handleSave = () => {
    if (!form.accountAlias.trim()) {
      toast.error("El alias/nombre de la cuenta es requerido");
      return;
    }
    if (form.clabe && form.clabe.length !== 18) {
      toast.error("La CLABE debe tener exactamente 18 dígitos");
      return;
    }
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (acc: BankAccount) => {
    setEditingAccount(acc);
    setForm({
      connectType: acc.connectType,
      accountAlias: acc.accountAlias || "",
      bankName: acc.bankName || "",
      clabe: acc.clabe || "",
      accountNumber: acc.accountNumber || "",
      cardNumber: acc.cardNumber || "",
      accountHolderName: acc.accountHolderName || "",
      rfc: acc.rfc || "",
      curp: acc.curp || "",
      razonSocial: acc.razonSocial || "",
      regimenFiscal: acc.regimenFiscal || "",
      isPrimary: acc.isPrimary,
      notes: acc.notes || "",
    });
    setShowForm(true);
  };

  const handleConnectStripe = (acc: BankAccount) => {
    onboardMutation.mutate({
      bankAccountId: acc.id,
      returnUrl: `${window.location.origin}/dashboard/stripe-connect`,
    });
  };

  const getStatusBadge = (acc: BankAccount) => {
    if (acc.stripeStatus === "active" && acc.stripeChargesEnabled) {
      return <Badge className="bg-emerald-500 text-foreground gap-1 text-xs"><CheckCircle2 className="w-3 h-3" /> Activa</Badge>;
    }
    if (acc.stripeStatus === "pending" || acc.stripeDetailsSubmitted) {
      return <Badge className="bg-amber-500 text-foreground gap-1 text-xs"><Clock className="w-3 h-3" /> En proceso</Badge>;
    }
    if (acc.stripeAccountId) {
      return <Badge className="bg-orange-400 text-foreground gap-1 text-xs"><AlertCircle className="w-3 h-3" /> Sin completar</Badge>;
    }
    return <Badge className="bg-gray-400 text-foreground gap-1 text-xs"><AlertCircle className="w-3 h-3" /> Sin conectar</Badge>;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Encabezado con botón regresar */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Menú
        </Button>
        <div className="h-5 w-px bg-gray-200" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cuenta de Cobros</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestiona tus cuentas bancarias para recibir pagos con Stripe Connect</p>
        </div>
      </div>

      {/* Botón agregar cuenta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Landmark className="w-4 h-4" />
          {accounts.length === 0 ? "Sin cuentas registradas" : `${accounts.length} cuenta${accounts.length !== 1 ? "s" : ""} registrada${accounts.length !== 1 ? "s" : ""}`}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchAccounts()}
            className="gap-1 text-muted-foreground"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
          <Button
            onClick={() => { setEditingAccount(null); setForm({ ...emptyForm }); setShowForm(true); }}
            className="bg-[#00C896] hover:bg-[#00a87e] text-foreground gap-2"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            Agregar cuenta
          </Button>
        </div>
      </div>

      {/* Lista de cuentas */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Cargando cuentas...
        </div>
      ) : accounts.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-200">
          <CardContent className="py-12 text-center">
            <Landmark className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">No tienes cuentas bancarias registradas</p>
            <p className="text-muted-foreground text-sm mt-1 mb-4">Agrega una cuenta para empezar a recibir pagos directamente</p>
            <Button
              onClick={() => { setEditingAccount(null); setForm({ ...emptyForm }); setShowForm(true); }}
              className="bg-[#00C896] hover:bg-[#00a87e] text-foreground gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar mi primera cuenta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(accounts as BankAccount[]).map((acc) => (
            <Card key={acc.id} className={`border-2 ${acc.isPrimary ? "border-[#00C896]" : "border-gray-100"} transition-all`}>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {acc.connectType === "express" ? (
                      <div className="w-8 h-8 rounded-full bg-[#00C896]/10 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-[#00C896]" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-purple-600" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{acc.accountAlias || "Cuenta sin nombre"}</span>
                        {acc.isPrimary && (
                          <span className="inline-flex items-center gap-1 text-xs text-[#00C896] font-medium">
                            <Star className="w-3 h-3 fill-[#00C896]" /> Principal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground uppercase font-medium">
                          {acc.connectType === "express" ? "Connect Express" : "Connect Custom"}
                        </span>
                        {acc.bankName && <span className="text-xs text-muted-foreground">• {acc.bankName}</span>}
                        {acc.clabe && <span className="text-xs text-muted-foreground">• CLABE: ···{acc.clabe.slice(-4)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(acc)}
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(acc)} className="text-muted-foreground hover:text-foreground h-7 w-7 p-0">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(acc.id)} className="text-red-400 hover:text-red-600 h-7 w-7 p-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setExpandedId(expandedId === acc.id ? null : acc.id)} className="text-muted-foreground h-7 w-7 p-0">
                      {expandedId === acc.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedId === acc.id && (
                <CardContent className="pt-0 pb-4">
                  <div className="border-t border-gray-100 pt-4 space-y-4">
                    {/* Datos bancarios */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      {acc.accountHolderName && (
                        <div><p className="text-xs text-muted-foreground">Titular</p><p className="font-medium text-foreground">{acc.accountHolderName}</p></div>
                      )}
                      {acc.rfc && (
                        <div><p className="text-xs text-muted-foreground">RFC</p><p className="font-medium text-foreground">{acc.rfc}</p></div>
                      )}
                      {acc.curp && (
                        <div><p className="text-xs text-muted-foreground">CURP</p><p className="font-medium text-foreground">{acc.curp}</p></div>
                      )}
                      {acc.razonSocial && (
                        <div><p className="text-xs text-muted-foreground">Razón Social</p><p className="font-medium text-foreground">{acc.razonSocial}</p></div>
                      )}
                      {acc.regimenFiscal && (
                        <div className="col-span-2"><p className="text-xs text-muted-foreground">Régimen Fiscal</p><p className="font-medium text-foreground">{acc.regimenFiscal}</p></div>
                      )}
                      {acc.clabe && (
                        <div><p className="text-xs text-muted-foreground">CLABE</p><p className="font-medium text-foreground font-mono">{acc.clabe}</p></div>
                      )}
                      {acc.accountNumber && (
                        <div><p className="text-xs text-muted-foreground">No. de cuenta</p><p className="font-medium text-foreground">{acc.accountNumber}</p></div>
                      )}
                    </div>

                    {/* Acciones de Stripe */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {!acc.stripeAccountId || acc.stripeStatus === "not_started" ? (
                        <Button
                          onClick={() => handleConnectStripe(acc)}
                          disabled={onboardMutation.isPending}
                          className="bg-[#00C896] hover:bg-[#00a87e] text-foreground gap-2"
                          size="sm"
                        >
                          {onboardMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                          Conectar con Stripe
                        </Button>
                      ) : acc.stripeStatus === "pending" ? (
                        <Button
                          onClick={() => handleConnectStripe(acc)}
                          disabled={onboardMutation.isPending}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          {onboardMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                          Continuar verificación
                        </Button>
                      ) : acc.stripeStatus === "active" && acc.stripePayoutsEnabled ? (
                        <Button
                          onClick={() => setPayoutModal({ open: true, accountId: acc.id, max: 0 })}
                          className="bg-emerald-500 hover:bg-emerald-600 text-foreground gap-2"
                          size="sm"
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                          Solicitar retiro
                        </Button>
                      ) : null}

                      {acc.stripeAccountId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground gap-1"
                          onClick={() => {
                            toast.info("Verificando estado con Stripe...");
                            refetchAccounts();
                          }}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Verificar estado
                        </Button>
                      )}
                    </div>

                    {acc.stripeStatus === "active" && acc.stripeChargesEnabled && (
                      <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-emerald-700">Cuenta verificada. Los pagos se depositarán automáticamente en tu cuenta bancaria.</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Cómo funciona */}
      <Card className="bg-gray-50 border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-semibold">¿Cómo funciona Stripe Connect?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { step: "1", icon: Plus, title: "Agrega tu cuenta", desc: "Registra datos bancarios y RFC" },
              { step: "2", icon: ShieldCheck, title: "Verifica con Stripe", desc: "KYC en ~5 min, 100% seguro" },
              { step: "3", icon: CreditCard, title: "Recibe pagos", desc: "Tus clientes pagan con tarjeta" },
              { step: "4", icon: Wallet, title: "Retira cuando quieras", desc: "1-2 días hábiles a tu CLABE" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-[#00C896] text-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700">
              <strong>Express</strong> = 1 cuenta bancaria, onboarding rápido (ideal para negocios pequeños/medianos).{" "}
              <strong>Custom</strong> = múltiples cuentas, mayor control, requiere más configuración (ideal para empresas grandes).
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Formulario de cuenta bancaria */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingAccount(null); setForm({ ...emptyForm }); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Editar cuenta bancaria" : "Agregar cuenta bancaria"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Tipo de cuenta */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Tipo de cuenta Stripe Connect</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "express", label: "Express", desc: "1 cuenta bancaria, onboarding rápido (~5 min)", icon: Zap, color: "text-[#00C896]", bg: "bg-[#00C896]/10" },
                  { value: "custom", label: "Custom", desc: "Múltiples cuentas, mayor control, para empresas", icon: Building2, color: "text-purple-600", bg: "bg-purple-100" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, connectType: opt.value as "express" | "custom" }))}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${form.connectType === opt.value ? "border-[#00C896] bg-[#00C896]/5" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className={`w-7 h-7 rounded-full ${opt.bg} flex items-center justify-center mb-2`}>
                      <opt.icon className={`w-4 h-4 ${opt.color}`} />
                    </div>
                    <p className="font-semibold text-sm text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Alias y banco */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Nombre / Alias <span className="text-red-500">*</span></label>
                <input
                  value={form.accountAlias}
                  onChange={e => setForm(f => ({ ...f, accountAlias: e.target.value }))}
                  placeholder="Ej: Cuenta Principal, Cuenta Nómina"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C896]/40"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Banco</label>
                <select
                  value={form.bankName}
                  onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C896]/40 bg-white"
                >
                  <option value="">Seleccionar banco...</option>
                  {BANCOS_MX.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            {/* CLABE y número de cuenta */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">CLABE Interbancaria (18 dígitos)</label>
                <input
                  value={form.clabe}
                  onChange={e => setForm(f => ({ ...f, clabe: e.target.value.replace(/\D/g, "").slice(0, 18) }))}
                  placeholder="000000000000000000"
                  maxLength={18}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00C896]/40"
                />
                {form.clabe && form.clabe.length !== 18 && (
                  <p className="text-xs text-red-500 mt-1">{form.clabe.length}/18 dígitos</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Número de cuenta</label>
                <input
                  value={form.accountNumber}
                  onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                  placeholder="Ej: 0123456789"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C896]/40"
                />
              </div>
            </div>

            {/* Separador */}
            <div className="border-t border-gray-100 pt-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Datos del titular / Fiscales</p>
            </div>

            {/* Nombre del titular y RFC */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Nombre del titular</label>
                <input
                  value={form.accountHolderName}
                  onChange={e => setForm(f => ({ ...f, accountHolderName: e.target.value }))}
                  placeholder="Nombre completo"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C896]/40"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">RFC</label>
                <input
                  value={form.rfc}
                  onChange={e => setForm(f => ({ ...f, rfc: e.target.value.toUpperCase().slice(0, 13) }))}
                  placeholder="XAXX010101000"
                  maxLength={13}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00C896]/40"
                />
              </div>
            </div>

            {/* CURP y Razón Social */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">CURP (persona física)</label>
                <input
                  value={form.curp}
                  onChange={e => setForm(f => ({ ...f, curp: e.target.value.toUpperCase().slice(0, 18) }))}
                  placeholder="XAXX010101HXXXXXX00"
                  maxLength={18}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00C896]/40"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Razón Social (persona moral)</label>
                <input
                  value={form.razonSocial}
                  onChange={e => setForm(f => ({ ...f, razonSocial: e.target.value }))}
                  placeholder="Mi Empresa S.A. de C.V."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C896]/40"
                />
              </div>
            </div>

            {/* Régimen fiscal */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Régimen Fiscal SAT</label>
              <select
                value={form.regimenFiscal}
                onChange={e => setForm(f => ({ ...f, regimenFiscal: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C896]/40 bg-white"
              >
                <option value="">Seleccionar régimen fiscal...</option>
                {REGIMENES_FISCALES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Cuenta principal */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={form.isPrimary}
                onChange={e => setForm(f => ({ ...f, isPrimary: e.target.checked }))}
                className="w-4 h-4 accent-[#00C896]"
              />
              <label htmlFor="isPrimary" className="text-sm text-foreground cursor-pointer">
                Marcar como cuenta principal (para recibir pagos por defecto)
              </label>
            </div>

            {/* Notas */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Notas internas (opcional)</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Ej: Cuenta para cobros de sucursal norte"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C896]/40 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingAccount(null); setForm({ ...emptyForm }); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-[#00C896] hover:bg-[#00a87e] text-foreground"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingAccount ? "Guardar cambios" : "Registrar cuenta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Solicitar retiro */}
      <Dialog open={payoutModal.open} onOpenChange={(open) => { if (!open) setPayoutModal({ open: false, accountId: null, max: 0 }); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Solicitar retiro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Ingresa el monto a retirar a tu cuenta bancaria. El dinero llegará en 1-2 días hábiles.</p>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Monto (MXN)</label>
              <input
                type="number"
                value={payoutAmount}
                onChange={e => setPayoutAmount(e.target.value)}
                placeholder="0.00"
                min="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C896]/40"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutModal({ open: false, accountId: null, max: 0 })}>Cancelar</Button>
            <Button
              onClick={() => {
                const amount = parseFloat(payoutAmount);
                if (!amount || amount <= 0) { toast.error("Ingresa un monto válido"); return; }
                if (payoutModal.accountId) payoutMutation.mutate({ bankAccountId: payoutModal.accountId, amount });
              }}
              disabled={payoutMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-foreground"
            >
              {payoutMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : null}
              Solicitar retiro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar eliminación */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar cuenta bancaria?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Esta acción no se puede deshacer. La cuenta será eliminada permanentemente.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button
              onClick={() => { if (deleteConfirm !== null) deleteMutation.mutate({ id: deleteConfirm }); }}
              disabled={deleteMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-foreground"
            >
              {deleteMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
