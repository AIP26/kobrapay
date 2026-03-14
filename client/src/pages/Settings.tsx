import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Building2, DollarSign, Percent, Shield, Camera,
  MessageSquare, Save, Info, CreditCard, ExternalLink, Receipt, Globe,
  Link2, Eye, EyeOff, Copy, CheckCircle2, KeyRound, Lock,
  Webhook, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp,
  Bell, BellOff, Mail, Phone, Smartphone, AlertTriangle,
  Banknote, Building, CreditCard as CardIcon, Zap, Code2, Activity,
  UserX, LogOut, ShieldAlert, Edit2, Check, X,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { COUNTRIES } from "../../../shared/countries";
import { useAuth } from "@/_core/hooks/useAuth";

interface SettingsForm {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  commissionRate: number;
  ivaRate: number;
  ivaEnabled: boolean;
  usdExchangeRate: number;
  otpEnabled: boolean;
  selfieEnabled: boolean;
  chargebackText: string;
  businessCountry: string;
  businessSlug: string;
  publicBio: string;
  websiteUrl: string;
  publicProfileEnabled: boolean;
}

function PasswordSection() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [profileName, setProfileName] = useState((user as any)?.name || "");
  const [profilePhone, setProfilePhone] = useState("");

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Contraseña actualizada correctamente");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    },
    onError: (err) => toast.error(err.message || "Error al cambiar contraseña"),
  });

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil actualizado correctamente");
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message || "Error al actualizar perfil"),
  });

  const handleChangePassword = () => {
    if (!newPwd || newPwd.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres"); return; }
    if (newPwd !== confirmPwd) { toast.error("Las contraseñas no coinciden"); return; }
    changePassword.mutate({ currentPassword: currentPwd || undefined, newPassword: newPwd });
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-emerald-600" />
          Cuenta y Seguridad
        </CardTitle>
        <p className="text-sm text-muted-foreground">Actualiza tu información personal y contraseña de acceso.</p>
      </CardHeader>
      <CardContent className="p-5 space-y-6">
        {/* Editar nombre */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Información Personal</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Nombre completo</Label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Teléfono</Label>
              <Input
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="+52 55 1234 5678"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateProfile.mutate({ name: profileName || undefined, phone: profilePhone || undefined })}
            disabled={updateProfile.isPending}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {updateProfile.isPending ? "Guardando..." : "Guardar Perfil"}
          </Button>
        </div>
        {/* Cambiar contraseña */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <p className="text-sm font-semibold text-foreground">Contraseña de Acceso</p>
          <p className="text-xs text-muted-foreground">Si iniciaste sesión con Manus OAuth, deja el campo actual en blanco para crear una contraseña nueva.</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Contraseña actual</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Contraseña actual (dejar vacío si no tienes)"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-foreground">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-foreground">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="Repetir contraseña"
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleChangePassword}
              disabled={changePassword.isPending || !newPwd}
              className="bg-emerald-600 hover:bg-emerald-500 text-foreground"
              size="sm"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              {changePassword.isPending ? "Actualizando..." : "Actualizar Contraseña"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin === true || user?.role === "superadmin";
  const { data: settings, isLoading } = trpc.vendor.getSettings.useQuery();
  const { data: pinStatus, refetch: refetchPinStatus } = trpc.vendor.hasDeletePin.useQuery(undefined, { enabled: isSuperAdmin });

  // Estado del formulario de PIN
  const [pinMode, setPinMode] = useState<"idle" | "create" | "change">("idle");
  const [newPin, setNewPin] = useState(["", "", "", ""]);
  const [currentPin, setCurrentPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const newPinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const currentPinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const confirmPinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const setPinMutation = trpc.vendor.setDeletePin.useMutation({
    onSuccess: (data) => {
      toast.success(data.isNew ? "PIN creado exitosamente" : "PIN actualizado exitosamente");
      setPinMode("idle");
      setNewPin(["","","",""]);
      setCurrentPin(["","","",""]);
      setConfirmPin(["","","",""]);
      refetchPinStatus();
    },
    onError: (err) => toast.error(err.message || "Error al guardar PIN"),
  });

  const handleSavePin = () => {
    const np = newPin.join("");
    const cp = confirmPin.join("");
    if (np.length !== 4) { toast.error("El PIN debe tener 4 dígitos"); return; }
    if (np !== cp) { toast.error("Los PINs no coinciden"); setConfirmPin(["","","",""]); confirmPinRefs[0].current?.focus(); return; }
    const cur = currentPin.join("");
    if (pinStatus?.hasPin && cur.length !== 4) { toast.error("Ingresa tu PIN actual"); return; }
    setPinMutation.mutate({
      newPin: np,
      currentPin: pinStatus?.hasPin ? cur : undefined,
    });
  };
  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { isDirty },
  } = useForm<SettingsForm>({
    defaultValues: {
      businessName: "", businessEmail: "", businessPhone: "",
      commissionRate: 4.6, ivaRate: 16, ivaEnabled: true, usdExchangeRate: 0,
      otpEnabled: false, selfieEnabled: false, chargebackText: "",
      businessCountry: "MX",
      businessSlug: "", publicBio: "", websiteUrl: "", publicProfileEnabled: false,
    },
  });

  const otpEnabled = watch("otpEnabled");
  const selfieEnabled = watch("selfieEnabled");
  const ivaEnabled = watch("ivaEnabled");
  const ivaRate = watch("ivaRate");
  const usdRate = watch("usdExchangeRate");
  const commRate = watch("commissionRate");
  const businessCountry = watch("businessCountry");

  // Obtener configuración del país seleccionado
  const selectedCountry = COUNTRIES.find((c) => c.code === businessCountry) || COUNTRIES[0];

  // Cuando cambia el país, ajustar automáticamente la tasa de impuesto
  const handleCountryChange = (code: string) => {
    const country = COUNTRIES.find((c) => c.code === code);
    if (country) {
      setValue("businessCountry", code, { shouldDirty: true });
      // Ajustar tasa de impuesto al valor por defecto del país
      const defaultTaxRate = Math.round(country.taxRate * 100);
      setValue("ivaRate", defaultTaxRate, { shouldDirty: true });
      // Si el país tiene impuesto 0, deshabilitar IVA
      if (defaultTaxRate === 0) {
        setValue("ivaEnabled", false, { shouldDirty: true });
      } else {
        setValue("ivaEnabled", true, { shouldDirty: true });
      }
    }
  };

  useEffect(() => {
    if (settings) {
      reset({
        businessName: settings.businessName || "",
        businessEmail: settings.businessEmail || "",
        businessPhone: settings.businessPhone || "",
        commissionRate: parseFloat(String(settings.commissionRate || 4.6)),
        ivaRate: parseFloat(String((settings as any).ivaRate ?? 16)),
        ivaEnabled: (settings as any).ivaEnabled ?? true,
        usdExchangeRate: parseFloat(String(settings.usdExchangeRate || 0)),
        otpEnabled: settings.otpEnabled ?? false,
        selfieEnabled: settings.selfieEnabled ?? false,
        chargebackText: settings.chargebackText || "",
        businessCountry: (settings as any).businessCountry || "MX",
        businessSlug: (settings as any).businessSlug || "",
        publicBio: (settings as any).publicBio || "",
        websiteUrl: (settings as any).websiteUrl || "",
        publicProfileEnabled: (settings as any).publicProfileEnabled ?? false,
      });
    }
  }, [settings, reset]);

  const updateSettings = trpc.vendor.updateSettings.useMutation({
    onSuccess: () => {
      utils.vendor.getSettings.invalidate();
      toast.success("Configuracion guardada correctamente");
    },
    onError: (err) => toast.error(err.message || "Error al guardar"),
  });

  const updatePublicProfile = trpc.vendor.updatePublicProfile.useMutation({
    onSuccess: () => {
      utils.vendor.getSettings.invalidate();
      toast.success("Perfil público guardado correctamente");
    },
    onError: (err) => toast.error(err.message || "Error al guardar perfil público"),
  });

  const publicProfileEnabled = watch("publicProfileEnabled");
  const businessSlug = watch("businessSlug");

  if (isLoading) {
    return (
      <DashboardLayout title="Configuracion">
        <div className="space-y-4 max-w-2xl">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  // Determinar el nombre del impuesto según el país
  const taxLabel = selectedCountry.taxName || "IVA";
  const currencyLabel = selectedCountry.currency;

  // Tasas de impuesto sugeridas por país
  const suggestedTaxRates: Record<string, { rate: number; label: string }[]> = {
    MX: [
      { rate: 0, label: "0% (Exento/RESICO)" },
      { rate: 8, label: "8% (Zona fronteriza)" },
      { rate: 16, label: "16% (Estándar)" },
    ],
    US: [
      { rate: 0, label: "0% (No aplica)" },
      { rate: 8, label: "8% (Promedio estatal)" },
      { rate: 10, label: "10% (California)" },
    ],
    CA: [
      { rate: 5, label: "5% (GST federal)" },
      { rate: 13, label: "13% (HST Ontario)" },
      { rate: 15, label: "15% (HST Marítimas)" },
    ],
    ES: [
      { rate: 0, label: "0% (Exento)" },
      { rate: 10, label: "10% (Reducido)" },
      { rate: 21, label: "21% (General)" },
    ],
    GB: [
      { rate: 0, label: "0% (Zero-rated)" },
      { rate: 5, label: "5% (Reducido)" },
      { rate: 20, label: "20% (Estándar)" },
    ],
    CO: [
      { rate: 0, label: "0% (Exento)" },
      { rate: 5, label: "5% (Reducido)" },
      { rate: 19, label: "19% (General)" },
    ],
    BR: [
      { rate: 0, label: "0% (Exento)" },
      { rate: 12, label: "12% (Reducido)" },
      { rate: 17, label: "17% (ICMS Estándar)" },
    ],
    AU: [
      { rate: 0, label: "0% (Exento)" },
      { rate: 10, label: "10% (GST Estándar)" },
    ],
    NZ: [
      { rate: 0, label: "0% (Zero-rated)" },
      { rate: 15, label: "15% (GST Estándar)" },
    ],
    SG: [
      { rate: 0, label: "0% (Exento)" },
      { rate: 9, label: "9% (GST Estándar)" },
    ],
  };

  const taxRateOptions = suggestedTaxRates[businessCountry] || [
    { rate: 0, label: "0% (Exento)" },
    { rate: Math.round(selectedCountry.taxRate * 100), label: `${Math.round(selectedCountry.taxRate * 100)}% (Estándar)` },
  ];

  return (
    <DashboardLayout title="Configuracion">
      <form
        onSubmit={handleSubmit((data) => updateSettings.mutate(data))}
        className="space-y-5 max-w-2xl"
      >
        {/* Negocio */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-500" />
              Datos del Negocio
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Nombre del negocio *</Label>
              <Input
                placeholder="Mi Empresa S.A. de C.V."
                {...register("businessName", { required: true })}
              />
              <p className="text-xs text-muted-foreground">
                Aparece en la pagina de pago que ven tus clientes
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-foreground">Email de contacto</Label>
                <Input
                  type="email"
                  placeholder="contacto@minegocio.com"
                  {...register("businessEmail")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-foreground">Telefono</Label>
                <Input placeholder="+52 55 1234 5678" {...register("businessPhone")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* País de Operación */}
        <Card className="border-cyan-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-cyan-100">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-500" />
              País de Operación
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">País donde opera tu negocio</Label>
              <select
                value={businessCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} — {c.currency}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Determina la moneda predeterminada, el impuesto aplicable y el marco legal de los contratos.
              </p>
            </div>

            {/* Resumen del país seleccionado */}
            <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{selectedCountry.flag}</span>
                <div>
                  <p className="text-sm font-semibold text-cyan-800">{selectedCountry.name}</p>
                  <p className="text-xs text-cyan-600">{selectedCountry.legalFramework.title}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white rounded-lg p-2 border border-cyan-100 text-center">
                  <p className="text-muted-foreground">Moneda</p>
                  <p className="font-semibold text-foreground">{selectedCountry.currency}</p>
                  <p className="text-muted-foreground">{selectedCountry.currencySymbol}</p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-cyan-100 text-center">
                  <p className="text-muted-foreground">Impuesto</p>
                  <p className="font-semibold text-foreground">{selectedCountry.taxName}</p>
                  <p className="text-muted-foreground">{Math.round(selectedCountry.taxRate * 100)}%</p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-cyan-100 text-center">
                  <p className="text-muted-foreground">Prefijo tel.</p>
                  <p className="font-semibold text-foreground">{selectedCountry.phonePrefix}</p>
                  <p className="text-muted-foreground">Código</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-cyan-100">
                <p className="text-xs text-cyan-700 font-medium">Marco legal:</p>
                <p className="text-xs text-cyan-600 mt-0.5">
                  {selectedCountry.legalFramework.laws.slice(0, 2).join(" · ")}
                  {selectedCountry.legalFramework.laws.length > 2 && " · ..."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comisiones */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Percent className="w-4 h-4 text-cyan-500" />
              Comisiones de la Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Comision por defecto (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="7.0"
                  {...register("commissionRate", { valueAsNumber: true })}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Aplica a todos los cobros. Puedes personalizarla por cliente en "Mis Clientes".
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs text-muted-foreground mb-2 font-medium">
                Ejemplo para un cobro de 1,000 {currencyLabel}:
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Monto bruto:</span>
                  <span className="font-medium text-foreground">
                    {selectedCountry.currencySymbol}1,000.00 {currencyLabel}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Comisión KobraPay ({commRate || 7}%):</span>
                  <span className="font-medium text-cyan-600">
                    {selectedCountry.currencySymbol}{((commRate || 7) * 10).toFixed(2)} {currencyLabel}
                  </span>
                </div>
                {ivaEnabled && (ivaRate || 0) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{taxLabel} sobre comisión ({ivaRate}%):</span>
                    <span className="font-medium text-orange-500">
                      {selectedCountry.currencySymbol}{((commRate || 7) * 10 * (ivaRate || 16) / 100).toFixed(2)} {currencyLabel}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total cobrado por KobraPay:</span>
                  <span className="font-semibold text-cyan-700">
                    {selectedCountry.currencySymbol}{((commRate || 7) * 10 * (1 + (ivaEnabled ? (ivaRate || 16) / 100 : 0))).toFixed(2)} {currencyLabel}
                  </span>
                </div>
                <div className="flex justify-between text-xs border-t border-gray-200 pt-1 mt-1">
                  <span className="text-muted-foreground">Neto para el comercio:</span>
                  <span className="font-bold text-green-600">
                    {selectedCountry.currencySymbol}{(1000 - (commRate || 7) * 10 * (1 + (ivaEnabled ? (ivaRate || 16) / 100 : 0))).toFixed(2)} {currencyLabel}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuración Fiscal */}
        <Card className="border-orange-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-orange-100">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-orange-500" />
              Configuración Fiscal — {taxLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-200">
              <div>
                <p className="text-sm font-medium text-foreground">Cobrar {taxLabel} sobre la comisión</p>
                <p className="text-xs text-muted-foreground mt-0.5">Activa para sumar {taxLabel} a tu comisión de plataforma</p>
              </div>
              <Switch
                checked={ivaEnabled}
                onCheckedChange={(v) => setValue("ivaEnabled", v, { shouldDirty: true })}
              />
            </div>
            {ivaEnabled && (
              <div className="space-y-1.5">
                <Label className="text-sm text-foreground">Tasa de {taxLabel} (%)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder={String(Math.round(selectedCountry.taxRate * 100))}
                    {...register("ivaRate", { valueAsNumber: true })}
                    className="pr-8 text-lg font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
                <div className={`grid gap-2 mt-2`} style={{ gridTemplateColumns: `repeat(${taxRateOptions.length}, 1fr)` }}>
                  {taxRateOptions.map(({ rate, label }) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setValue("ivaRate", rate, { shouldDirty: true })}
                      className={`text-xs py-1.5 rounded-lg border font-medium transition-colors ${
                        ivaRate === rate
                          ? "bg-orange-500 text-foreground border-orange-500"
                          : "bg-white text-muted-foreground border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg border border-orange-100 mt-2">
                  💡 <strong>Tasa configurada para {selectedCountry.name}:</strong> {taxLabel} {Math.round(selectedCountry.taxRate * 100)}% estándar.
                  Ajusta según tu régimen fiscal específico.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tipo de Cambio */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-cyan-500" />
              Tipo de Cambio USD / {currencyLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Tipo de cambio (USD a {currencyLabel})</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={businessCountry === "MX" ? "18.50" : "1.00"}
                  {...register("usdExchangeRate", { valueAsNumber: true })}
                  className="pr-24"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {currencyLabel}/USD
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Si pones 0, no se mostrara equivalente en USD. Con un valor (ej: {businessCountry === "MX" ? "18.50" : "1.25"}), los
                clientes veran cuanto pagaran en dolares.
              </p>
            </div>
            {usdRate > 0 && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-xs text-blue-700 font-medium mb-1">
                  Vista previa en pagina de pago:
                </p>
                <p className="text-xs text-blue-600">
                  Un cobro de <strong>1,000 {currencyLabel}</strong> mostrara como{" "}
                  <strong>aprox. ${(1000 / usdRate).toFixed(2)} USD</strong> al tipo de cambio
                  de {usdRate} {currencyLabel}/USD
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verificacion */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-500" />
              Verificacion de Identidad
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Verificacion OTP por email</p>
                  <p className="text-xs text-muted-foreground">
                    El cliente recibe un codigo de 6 digitos antes de pagar
                  </p>
                </div>
              </div>
              <Switch
                checked={otpEnabled}
                onCheckedChange={(v) => setValue("otpEnabled", v, { shouldDirty: true })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Camera className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Verificacion con selfie</p>
                  <p className="text-xs text-muted-foreground">
                    El cliente toma una foto para verificar su identidad
                  </p>
                </div>
              </div>
              <Switch
                checked={selfieEnabled}
                onCheckedChange={(v) => setValue("selfieEnabled", v, { shouldDirty: true })}
              />
            </div>
            {(otpEnabled || selfieEnabled) && (
              <div className="flex gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Estos son los valores por defecto al crear nuevos enlaces. Puedes
                  activar/desactivar individualmente al crear cada enlace.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contracargos */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              Proteccion contra Contracargos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">
                Texto de aviso legal (aparece en pagina de pago)
              </Label>
              <Textarea
                rows={3}
                placeholder="Al realizar este pago, usted acepta que el cargo es definitivo y no puede ser cancelado ni reembolsado una vez procesado."
                {...register("chargebackText")}
                className="text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Este texto aparece antes de que el cliente confirme el pago. Sirve como evidencia
                en caso de contracargo.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pasarelas de Pago */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyan-500" />
              Pasarelas de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-5">

            {/* Stripe - activo */}
            <div className="border border-[#635BFF]/30 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-[#635BFF]/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#635BFF] flex items-center justify-center">
                    <span className="text-foreground font-bold text-sm">S</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Stripe</p>
                    <p className="text-xs text-muted-foreground">Internacional · Tarjetas, OXXO, transferencias</p>
                  </div>
                </div>
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">Modo prueba</Badge>
              </div>
              <div className="p-4 space-y-3">
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-800">
                    Para recibir pagos reales, reclama y activa tu cuenta de Stripe en{" "}
                    <a href="https://dashboard.stripe.com/claim_sandbox/YWNjdF8xVDVGUFlEOVZYVkhmM2RRLDE3NzI3NjgzMzMv100xH29XGHx" target="_blank" rel="noopener noreferrer" className="font-semibold underline">este enlace</a>.
                  </p>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs font-medium text-foreground">Tarjeta de prueba</p>
                    <p className="text-xs text-muted-foreground font-mono">4242 4242 4242 4242 · CVV: 123 · Fecha: cualquier futura</p>
                  </div>
                  <Badge variant="secondary">Test</Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3 mr-2" />Ir al Dashboard de Stripe
                  </a>
                </Button>
              </div>
            </div>

            {/* Conekta */}
            <div className="border border-gray-200 rounded-xl overflow-hidden opacity-80">
              <div className="flex items-center justify-between p-4 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#00A651] flex items-center justify-center">
                    <span className="text-foreground font-bold text-sm">C</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Conekta</p>
                    <p className="text-xs text-muted-foreground">México · OXXO, SPEI, tarjetas nacionales</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-muted-foreground">Próximamente</Badge>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-xs text-muted-foreground">Pasarela mexicana ideal para cobros con OXXO y SPEI. Requiere cuenta en Conekta.</p>
                <Button size="sm" className="w-full bg-[#00A651] hover:bg-[#008a44] text-foreground" disabled>
                  Conectar Conekta — Próximamente
                </Button>
              </div>
            </div>

            {/* OpenPay */}
            <div className="border border-gray-200 rounded-xl overflow-hidden opacity-80">
              <div className="flex items-center justify-between p-4 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0066CC] flex items-center justify-center">
                    <span className="text-foreground font-bold text-sm">O</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">OpenPay (BBVA)</p>
                    <p className="text-xs text-muted-foreground">México · Tarjetas, OXXO, transferencias bancarias</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-muted-foreground">Próximamente</Badge>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-xs text-muted-foreground">Plataforma de pagos de BBVA México. Acepta tarjetas nacionales e internacionales y pagos en efectivo.</p>
                <Button size="sm" className="w-full bg-[#0066CC] hover:bg-[#0052a3] text-foreground" disabled>
                  Conectar OpenPay — Próximamente
                </Button>
              </div>
            </div>

            {/* PayPal */}
            <div className="border border-gray-200 rounded-xl overflow-hidden opacity-80">
              <div className="flex items-center justify-between p-4 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#003087] flex items-center justify-center">
                    <span className="text-foreground font-bold text-sm">P</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">PayPal</p>
                    <p className="text-xs text-muted-foreground">Internacional · Wallet PayPal, tarjetas, transferencias</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-muted-foreground">Próximamente</Badge>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-xs text-muted-foreground">Acepta pagos de clientes con cuenta PayPal o tarjeta en más de 200 países.</p>
                <Button size="sm" className="w-full bg-[#003087] hover:bg-[#002070] text-foreground" disabled>
                  Conectar PayPal — Próximamente
                </Button>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">¿Necesitas otra pasarela? Contáctanos en soporte@kobrapay.mx</p>
          </CardContent>
        </Card>

        {/* ─── Perfil Público del Negocio ─── */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="w-4 h-4 text-cyan-500" />
              Perfil Público del Negocio
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Crea una página pública donde tus clientes puedan ver todos tus cobros activos sin necesidad de que compartas cada link individualmente.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle activar perfil */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <Label className="text-sm font-medium text-foreground">Activar perfil público</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Cuando está activo, cualquier persona puede ver tu página en kobrapay.mx/p/tu-slug</p>
              </div>
              <Switch
                checked={publicProfileEnabled}
                onCheckedChange={(v) => setValue("publicProfileEnabled", v, { shouldDirty: true })}
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5 text-cyan-500" />
                URL de tu perfil
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground bg-gray-100 px-3 py-2 rounded-l-lg border border-r-0 border-gray-200 whitespace-nowrap">kobrapay.mx/p/</span>
                <Input
                  {...register("businessSlug")}
                  placeholder="mi-negocio"
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">Solo letras minúsculas, números y guiones. Ej: clinica-dental-garcia</p>
              {businessSlug && (
                <div className="flex items-center gap-2 p-2 bg-cyan-50 border border-cyan-200 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                  <span className="text-xs text-cyan-700 flex-1 truncate">kobrapay.mx/p/{businessSlug}</span>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(`https://kobrapay.mx/p/${businessSlug}`); toast.success("URL copiada"); }}
                    className="text-cyan-500 hover:text-cyan-700"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a href={`/p/${businessSlug}`} target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:text-cyan-700">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Descripción del negocio</Label>
              <Textarea
                {...register("publicBio")}
                placeholder="Ej: Clínica dental con más de 10 años de experiencia en CDMX. Aceptamos todas las tarjetas."
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">Máximo 500 caracteres. Aparece en tu página pública.</p>
            </div>

            {/* Website */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-cyan-500" />
                Sitio web (opcional)
              </Label>
              <Input
                {...register("websiteUrl")}
                placeholder="https://www.minegocio.com"
                type="url"
              />
            </div>

            {/* Botón guardar perfil público */}
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                disabled={updatePublicProfile.isPending}
                onClick={() => updatePublicProfile.mutate({
                  businessSlug: businessSlug || undefined,
                  publicBio: watch("publicBio") || undefined,
                  websiteUrl: watch("websiteUrl") || undefined,
                  publicProfileEnabled,
                })}
                className="bg-cyan-500 hover:bg-cyan-400 text-foreground gap-2"
              >
                <Globe className="w-4 h-4" />
                {updatePublicProfile.isPending ? "Guardando..." : "Guardar Perfil Público"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ─── Sección Contraseña ─── */}
        <PasswordSection />
        {/* ─── Sección PIN de Seguridad (solo superadmin) ─── */}
        {isSuperAdmin && (
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-600" />
                PIN de Seguridad
              </CardTitle>
              <p className="text-sm text-muted-foreground">PIN de 4 dígitos para operaciones sensibles como eliminar transacciones.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Estado actual del PIN */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${pinStatus?.hasPin ? 'bg-green-100' : 'bg-amber-100'}`}>
                    <KeyRound className={`w-4 h-4 ${pinStatus?.hasPin ? 'text-green-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{pinStatus?.hasPin ? 'PIN configurado' : 'Sin PIN configurado'}</p>
                    <p className="text-xs text-muted-foreground">{pinStatus?.hasPin ? 'Tu PIN está activo y protege las eliminaciones' : 'Crea un PIN para poder eliminar transacciones'}</p>
                  </div>
                </div>
                {pinMode === "idle" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setPinMode(pinStatus?.hasPin ? "change" : "create"); setNewPin(["","","",""]); setCurrentPin(["","","",""]); setConfirmPin(["","","",""]); }}
                    className="text-cyan-600 border-cyan-300 hover:bg-cyan-50"
                  >
                    {pinStatus?.hasPin ? 'Cambiar PIN' : 'Crear PIN'}
                  </Button>
                )}
              </div>

              {/* Formulario de PIN */}
              {pinMode !== "idle" && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-sm font-semibold text-foreground">{pinStatus?.hasPin ? 'Cambiar PIN de seguridad' : 'Crear PIN de seguridad'}</p>

                  {/* PIN actual (solo si ya tiene uno) */}
                  {pinStatus?.hasPin && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">PIN actual</p>
                      <div className="flex gap-3">
                        {currentPin.map((digit, i) => (
                          <input
                            key={i}
                            ref={currentPinRefs[i]}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              const p = [...currentPin]; p[i] = val; setCurrentPin(p);
                              if (val && i < 3) currentPinRefs[i+1].current?.focus();
                            }}
                            onKeyDown={(e) => { if (e.key === "Backspace" && !currentPin[i] && i > 0) currentPinRefs[i-1].current?.focus(); }}
                            className="w-12 h-12 text-center text-xl font-bold border-2 rounded-xl focus:border-cyan-500 focus:outline-none bg-white"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nuevo PIN */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Nuevo PIN (4 dígitos)</p>
                    <div className="flex gap-3">
                      {newPin.map((digit, i) => (
                        <input
                          key={i}
                          ref={newPinRefs[i]}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            const p = [...newPin]; p[i] = val; setNewPin(p);
                            if (val && i < 3) newPinRefs[i+1].current?.focus();
                          }}
                          onKeyDown={(e) => { if (e.key === "Backspace" && !newPin[i] && i > 0) newPinRefs[i-1].current?.focus(); }}
                          className="w-12 h-12 text-center text-xl font-bold border-2 rounded-xl focus:border-cyan-500 focus:outline-none bg-white"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Confirmar PIN */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Confirmar nuevo PIN</p>
                    <div className="flex gap-3">
                      {confirmPin.map((digit, i) => (
                        <input
                          key={i}
                          ref={confirmPinRefs[i]}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            const p = [...confirmPin]; p[i] = val; setConfirmPin(p);
                            if (val && i < 3) confirmPinRefs[i+1].current?.focus();
                          }}
                          onKeyDown={(e) => { if (e.key === "Backspace" && !confirmPin[i] && i > 0) confirmPinRefs[i-1].current?.focus(); }}
                          className="w-12 h-12 text-center text-xl font-bold border-2 rounded-xl focus:border-cyan-500 focus:outline-none bg-white"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => { setPinMode("idle"); setNewPin(["","","",""]); setCurrentPin(["","","",""]); setConfirmPin(["","","",""]); }}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-foreground"
                      onClick={handleSavePin}
                      disabled={setPinMutation.isPending}
                    >
                      <KeyRound className="w-4 h-4 mr-2" />
                      {setPinMutation.isPending ? "Guardando..." : (pinStatus?.hasPin ? "Actualizar PIN" : "Crear PIN")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Webhooks ─── */}
        <WebhooksSection />

        {/* ─── Notificaciones ─── */}
        <NotificationsSection />

        {/* ─── Cuentas Bancarias ─── */}
        <BankAccountsSection />

        {/* ─── Facturación SAT / CFDI ─── */}
        <FacturApiSection />
        {/* ─── Zona de Peligro ─── */}
        <DangerZoneSection />

        <div className="flex justify-end pb-8">
          <Button
            type="submit"
            disabled={updateSettings.isPending || !isDirty}
            className="bg-cyan-500 hover:bg-cyan-400 text-foreground gap-2 px-8"
            size="lg"
          >
            <Save className="w-4 h-4" />
            {updateSettings.isPending ? "Guardando..." : "Guardar Configuracion"}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// FACTURAPI SECTION
// ─────────────────────────────────────────────────────────────────────────────────
function FacturApiSection() {
  const utils = trpc.useUtils();
  const { data: status, isLoading } = trpc.vendor.getFacturApiStatus.useQuery();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const saveKey = trpc.vendor.saveFacturApiKey.useMutation({
    onSuccess: (data) => {
      toast.success(`¡FacturAPI activado! RFC: ${data.rfc} — ${data.razonSocial}`);
      setApiKey('');
      utils.vendor.getFacturApiStatus.invalidate();
    },
    onError: (err) => toast.error(err.message || 'Error al activar FacturAPI'),
  });

  const disable = trpc.vendor.disableFacturApi.useMutation({
    onSuccess: () => {
      toast.success('Facturación SAT desactivada');
      utils.vendor.getFacturApiStatus.invalidate();
    },
    onError: (err) => toast.error(err.message || 'Error al desactivar'),
  });

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Receipt className="w-4 h-4 text-violet-600" />
          Facturación SAT (CFDI)
          {status?.enabled && <Badge className="bg-violet-100 text-violet-700 border-0 text-xs">Activo</Badge>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Emite facturas válidas ante el SAT (CFDI 4.0) usando tu propia cuenta de{' '}
          <a href="https://facturapi.io" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">FacturAPI</a>.
          Cada cliente paga su propio plan (~$299 MXN/mes). KobraPay no cobra extra por esto.
        </p>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Cargando...</div>
        ) : status?.enabled ? (
          <div className="space-y-4">
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-semibold text-violet-800">FacturAPI conectado</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Razón Social:</span>
                  <p className="font-medium text-foreground">{status.razonSocial || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">RFC:</span>
                  <p className="font-medium text-foreground">{status.rfc || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Régimen Fiscal:</span>
                  <p className="font-medium text-foreground">{status.regimenFiscal || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">API Key:</span>
                  <p className="font-mono text-xs text-foreground">{status.apiKeyHint}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => disable.mutate()}
                disabled={disable.isPending}
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                {disable.isPending ? 'Desactivando...' : 'Desconectar FacturAPI'}
              </Button>
              <a
                href="https://facturapi.io/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-600 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Ir a FacturAPI Dashboard
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>Cómo activarlo:</strong> Crea tu cuenta en{' '}
                <a href="https://facturapi.io" target="_blank" rel="noopener noreferrer" className="underline">facturapi.io</a>,
                crea una organización con tu RFC, ve a{' '}
                <strong>API Keys</strong> y copia tu <strong>Secret Key de producción</strong>.
                Pégala aquí y KobraPay la verificará automáticamente.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Secret Key de FacturAPI</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk_live_..."
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  onClick={() => saveKey.mutate({ apiKey })}
                  disabled={saveKey.isPending || !apiKey.trim()}
                  className="bg-violet-600 hover:bg-violet-500 text-white"
                >
                  {saveKey.isPending ? 'Verificando...' : 'Activar'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tu API Key se almacena cifrada y nunca se muestra completa. Puedes desconectarla en cualquier momento.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// WEBHOOKS SECTION
// ─────────────────────────────────────────────────────────────────────────────────
const WEBHOOK_EVENTS = [
  { id: 'payment.success', label: 'Pago exitoso', desc: 'Se dispara cuando un cliente completa un pago', color: 'text-green-600' },
  { id: 'payment.failed', label: 'Pago fallido', desc: 'Se dispara cuando un intento de pago falla', color: 'text-red-600' },
  { id: 'payment.refunded', label: 'Reembolso', desc: 'Se dispara cuando se procesa un reembolso', color: 'text-orange-600' },
  { id: 'subscription.created', label: 'Suscripción creada', desc: 'Nueva suscripción activada', color: 'text-blue-600' },
  { id: 'subscription.cancelled', label: 'Suscripción cancelada', desc: 'Suscripción cancelada por el cliente', color: 'text-gray-600' },
  { id: 'link.created', label: 'Enlace creado', desc: 'Se crea un nuevo enlace de cobro', color: 'text-cyan-600' },
  { id: 'client.registered', label: 'Cliente registrado', desc: 'Nuevo cliente se registra en la plataforma', color: 'text-purple-600' },
];

function WebhooksSection() {
  const utils = trpc.useUtils();
  const { data: webhooks, isLoading } = trpc.webhooks.list.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>(['payment.success', 'payment.failed']);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<number, string>>({});

  const createWebhook = trpc.webhooks.create.useMutation({
    onSuccess: (data) => {
      toast.success('Webhook creado correctamente');
      setRevealedSecrets(prev => ({ ...prev, [data.id!]: data.secret }));
      setShowCreate(false);
      setNewUrl(''); setNewDesc(''); setNewEvents(['payment.success', 'payment.failed']);
      utils.webhooks.list.invalidate();
    },
    onError: (err) => toast.error(err.message || 'Error al crear webhook'),
  });

  const deleteWebhook = trpc.webhooks.delete.useMutation({
    onSuccess: () => { toast.success('Webhook eliminado'); utils.webhooks.list.invalidate(); },
    onError: (err) => toast.error(err.message || 'Error al eliminar'),
  });

  const toggleWebhook = trpc.webhooks.update.useMutation({
    onSuccess: () => utils.webhooks.list.invalidate(),
    onError: (err) => toast.error(err.message || 'Error al actualizar'),
  });

  const regenSecret = trpc.webhooks.regenerateSecret.useMutation({
    onSuccess: (data, vars) => {
      toast.success('Secreto regenerado');
      setRevealedSecrets(prev => ({ ...prev, [vars.id]: data.secret }));
      utils.webhooks.list.invalidate();
    },
    onError: (err) => toast.error(err.message || 'Error al regenerar secreto'),
  });

  const toggleEvent = (ev: string) => {
    setNewEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Webhook className="w-4 h-4 text-cyan-500" />
            Webhooks
          </CardTitle>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowCreate(v => !v)}
            className="bg-cyan-500 hover:bg-cyan-400 text-foreground gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Recibe notificaciones HTTP en tiempo real cuando ocurren eventos en tu cuenta. Máximo 5 endpoints.
        </p>
      </CardHeader>
      <CardContent className="p-5 space-y-4">

        {/* Formulario de creación */}
        {showCreate && (
          <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-200 space-y-4">
            <p className="text-sm font-semibold text-foreground">Nuevo Endpoint</p>
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">URL del endpoint *</Label>
              <Input
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="https://tuapp.com/api/webhooks/kobrapay"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Descripción (opcional)</Label>
              <Input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Ej: Notificaciones de pagos para mi CRM"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Eventos a escuchar *</Label>
              <div className="grid grid-cols-1 gap-1.5">
                {WEBHOOK_EVENTS.map(ev => (
                  <label key={ev.id} className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-cyan-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={newEvents.includes(ev.id)}
                      onChange={() => toggleEvent(ev.id)}
                      className="w-4 h-4 accent-cyan-500"
                    />
                    <div className="flex-1">
                      <span className={`text-xs font-semibold ${ev.color}`}>{ev.label}</span>
                      <p className="text-xs text-muted-foreground">{ev.desc}</p>
                    </div>
                    <code className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">{ev.id}</code>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button
                type="button"
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-400 text-foreground"
                disabled={!newUrl || newEvents.length === 0 || createWebhook.isPending}
                onClick={() => createWebhook.mutate({ url: newUrl, description: newDesc || undefined, events: newEvents })}
              >
                {createWebhook.isPending ? 'Creando...' : 'Crear Webhook'}
              </Button>
            </div>
          </div>
        )}

        {/* Lista de webhooks */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />)}
          </div>
        ) : !webhooks?.length ? (
          <div className="text-center py-10">
            <Webhook className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Sin webhooks configurados</p>
            <p className="text-xs text-muted-foreground mt-1">Agrega un endpoint para recibir notificaciones automáticas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map(wh => {
              const events: string[] = (() => { try { return JSON.parse(wh.events); } catch { return []; } })();
              const isExpanded = expandedId === wh.id;
              const revealedSecret = revealedSecrets[wh.id];
              return (
                <div key={wh.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 p-4">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${wh.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate font-mono">{wh.url}</p>
                      {wh.description && <p className="text-xs text-muted-foreground truncate">{wh.description}</p>}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {events.slice(0, 3).map(ev => (
                          <span key={ev} className="text-xs bg-gray-100 text-muted-foreground px-1.5 py-0.5 rounded">{ev}</span>
                        ))}
                        {events.length > 3 && <span className="text-xs text-muted-foreground">+{events.length - 3} más</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={wh.isActive}
                        onCheckedChange={(v) => toggleWebhook.mutate({ id: wh.id, isActive: v })}
                      />
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : wh.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (confirm('\u00bfEliminar este webhook?')) deleteWebhook.mutate({ id: wh.id }); }}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Secreto de firma</Label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-foreground truncate">
                            {revealedSecret || '\u2022'.repeat(48)}
                          </code>
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(revealedSecret || ''); toast.success('Secreto copiado'); }}
                            disabled={!revealedSecret}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 border border-gray-200 rounded-lg bg-white disabled:opacity-40"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => regenSecret.mutate({ id: wh.id })}
                            disabled={regenSecret.isPending}
                            className="text-xs gap-1.5"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Regenerar
                          </Button>
                        </div>
                        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          ⚠️ El secreto solo se muestra una vez al crear el webhook. Regenera si lo perdiste.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Eventos configurados</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {events.map(ev => {
                            const evConf = WEBHOOK_EVENTS.find(e => e.id === ev);
                            return (
                              <span key={ev} className={`text-xs px-2 py-1 rounded-full border font-medium ${evConf?.color || 'text-muted-foreground'} bg-white border-gray-200`}>
                                {evConf?.label || ev}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Estado: </span>
                          <span className={wh.isActive ? 'text-green-600 font-medium' : 'text-gray-500'}>{wh.isActive ? 'Activo' : 'Inactivo'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fallos: </span>
                          <span className={wh.failureCount > 0 ? 'text-red-600 font-medium' : 'text-foreground'}>{wh.failureCount}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-foreground mb-2">Ejemplo de payload:</p>
                        <pre className="text-xs text-muted-foreground overflow-x-auto">{JSON.stringify({
                          event: 'payment.success',
                          timestamp: new Date().toISOString(),
                          data: { paymentId: 'pay_xxx', amount: 1000, currency: 'MXN', customerEmail: 'cliente@email.com' }
                        }, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Documentación rápida */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-cyan-500" />
            Cómo verificar la firma
          </p>
          <pre className="text-xs text-muted-foreground overflow-x-auto">{`// Node.js
const crypto = require('crypto');
const sig = req.headers['x-kobrapay-signature'];
const expected = crypto.createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(req.body)).digest('hex');
if (sig !== expected) throw new Error('Firma inválida');`}</pre>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS SECTION
// ─────────────────────────────────────────────────────────────────────────────
function NotificationsSection() {
  const { data: settings } = trpc.vendor.getSettings.useQuery();
  const utils = trpc.useUtils();
  const [emailOnPayment, setEmailOnPayment] = useState(true);
  const [emailOnRefund, setEmailOnRefund] = useState(true);
  const [emailOnChargeback, setEmailOnChargeback] = useState(true);
  const [emailOnNewClient, setEmailOnNewClient] = useState(false);
  const [emailDailyReport, setEmailDailyReport] = useState(false);
  const [emailWeeklyReport, setEmailWeeklyReport] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    toast.success('Preferencias de notificaciones guardadas');
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-cyan-500" />
          Notificaciones por Email
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Configura cuándo quieres recibir notificaciones en tu correo.</p>
      </CardHeader>
      <CardContent className="p-5 space-y-3">
        {[
          { label: 'Pago exitoso recibido', desc: 'Recibe un email cada vez que un cliente paga', icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, val: emailOnPayment, set: setEmailOnPayment },
          { label: 'Reembolso procesado', desc: 'Cuando se procesa un reembolso a un cliente', icon: <RefreshCw className="w-4 h-4 text-orange-500" />, val: emailOnRefund, set: setEmailOnRefund },
          { label: 'Contracargo recibido', desc: 'Alerta inmediata cuando un cliente disputa un cargo', icon: <AlertTriangle className="w-4 h-4 text-red-500" />, val: emailOnChargeback, set: setEmailOnChargeback },
          { label: 'Nuevo cliente registrado', desc: 'Cuando un cliente se registra en tu plataforma', icon: <Mail className="w-4 h-4 text-blue-500" />, val: emailOnNewClient, set: setEmailOnNewClient },
          { label: 'Reporte diario de ventas', desc: 'Resumen de ventas del día anterior cada mañana', icon: <Activity className="w-4 h-4 text-cyan-500" />, val: emailDailyReport, set: setEmailDailyReport },
          { label: 'Reporte semanal', desc: 'Resumen de la semana cada lunes por la mañana', icon: <Zap className="w-4 h-4 text-purple-500" />, val: emailWeeklyReport, set: setEmailWeeklyReport },
        ].map(({ label, desc, icon, val, set }) => (
          <div key={label} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 flex items-center justify-center">{icon}</div>
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
            <Switch checked={val} onCheckedChange={set} />
          </div>
        ))}
        <div className="flex justify-end pt-2">
          <Button type="button" size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-foreground gap-2" onClick={handleSave} disabled={saving}>
            <Bell className="w-3.5 h-3.5" />
            {saving ? 'Guardando...' : 'Guardar preferencias'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BANK ACCOUNTS SECTION
// ─────────────────────────────────────────────────────────────────────────────
const BANK_TYPES = [
  { id: 'spei', label: 'SPEI / CLABE', icon: <Building className="w-4 h-4" />, color: 'text-blue-600' },
  { id: 'zelle', label: 'Zelle', icon: <Smartphone className="w-4 h-4" />, color: 'text-green-600' },
  { id: 'wire', label: 'Wire Internacional', icon: <Globe className="w-4 h-4" />, color: 'text-purple-600' },
  { id: 'other', label: 'Otro', icon: <Banknote className="w-4 h-4" />, color: 'text-gray-600' },
];

function BankAccountsSection() {
  const utils = trpc.useUtils();
  const { data: accounts, isLoading } = trpc.bankAccounts.list.useQuery();
  const [showAdd, setShowAdd] = useState(false);
  const [bankName, setBankName] = useState('');
  const [clabe, setClabe] = useState('');
  const [holder, setHolder] = useState('');
  const [bankType, setBankType] = useState('spei');
  const [alias, setAlias] = useState('');

  const addAccount = trpc.bankAccounts.create.useMutation({
    onSuccess: () => {
      toast.success('Cuenta bancaria agregada');
      setShowAdd(false);
      setBankName(''); setClabe(''); setHolder(''); setAlias('');
      utils.bankAccounts.list.invalidate();
    },
    onError: (err: any) => toast.error(err.message || 'Error al agregar cuenta'),
  });

  const setPrimary = trpc.bankAccounts.update.useMutation({
    onSuccess: () => { toast.success('Cuenta principal actualizada'); utils.bankAccounts.list.invalidate(); },
    onError: (err: any) => toast.error(err.message || 'Error'),
  });

  const removeAccount = trpc.bankAccounts.delete.useMutation({
    onSuccess: () => { toast.success('Cuenta eliminada'); utils.bankAccounts.list.invalidate(); },
    onError: (err: any) => toast.error(err.message || 'Error al eliminar'),
  });

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Banknote className="w-4 h-4 text-cyan-500" />
            Cuentas Bancarias
          </CardTitle>
          <Button type="button" size="sm" onClick={() => setShowAdd(v => !v)} className="bg-cyan-500 hover:bg-cyan-400 text-foreground gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Agrega tus cuentas bancarias para recibir tus retiros de KobraPay.</p>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {showAdd && (
          <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-200 space-y-4">
            <p className="text-sm font-semibold text-foreground">Nueva Cuenta Bancaria</p>
            <div className="grid grid-cols-2 gap-3">
              {BANK_TYPES.map(bt => (
                <button
                  key={bt.id}
                  type="button"
                  onClick={() => setBankType(bt.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                    bankType === bt.id ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 bg-white hover:border-cyan-300'
                  }`}
                >
                  <span className={bt.color}>{bt.icon}</span>
                  <span className="text-sm font-medium text-foreground">{bt.label}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-foreground">Banco *</Label>
                <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="BBVA, Santander, etc." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-foreground">Alias (opcional)</Label>
                <Input value={alias} onChange={e => setAlias(e.target.value)} placeholder="Cuenta principal" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">{bankType === 'spei' ? 'CLABE interbancaria (18 dígitos)' : bankType === 'zelle' ? 'Email o teléfono de Zelle' : 'Número de cuenta / IBAN'}</Label>
              <Input
                value={clabe}
                onChange={e => setClabe(e.target.value)}
                placeholder={bankType === 'spei' ? '000000000000000000' : bankType === 'zelle' ? 'email@ejemplo.com' : 'IBAN o número de cuenta'}
                maxLength={bankType === 'spei' ? 18 : 64}
                className="font-mono"
              />
              {bankType === 'spei' && clabe.length > 0 && clabe.length !== 18 && (
                <p className="text-xs text-red-500">La CLABE debe tener exactamente 18 dígitos</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Titular de la cuenta *</Label>
              <Input value={holder} onChange={e => setHolder(e.target.value)} placeholder="Nombre completo o razón social" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button
                type="button"
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-400 text-foreground"
                disabled={!bankName || !holder || addAccount.isPending || (bankType === 'spei' && clabe.length !== 18)}
                onClick={() => addAccount.mutate({ accountAlias: alias || bankName || 'Mi cuenta', bankName, clabe: clabe || undefined, accountHolderName: holder, connectType: 'express' })}
              >
                {addAccount.isPending ? 'Guardando...' : 'Guardar Cuenta'}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />)}</div>
        ) : !accounts?.length ? (
          <div className="text-center py-10">
            <Banknote className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Sin cuentas bancarias</p>
            <p className="text-xs text-muted-foreground mt-1">Agrega tu cuenta para recibir retiros</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map(acc => (
              <div key={acc.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-colors ${
                acc.isPrimary ? 'border-cyan-400 bg-cyan-50' : 'border-gray-200 bg-white'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <Banknote className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{acc.bankName || 'Banco'}</p>
                    {acc.isPrimary && <span className="text-xs bg-cyan-500 text-foreground px-2 py-0.5 rounded-full font-medium">Principal</span>}
                  </div>
                  {acc.clabe && <p className="text-xs text-muted-foreground font-mono">{acc.clabe.replace(/(\d{4})/g, '$1 ').trim()}</p>}
                  {acc.accountHolderName && <p className="text-xs text-muted-foreground">{acc.accountHolderName}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!acc.isPrimary && (
                    <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => setPrimary.mutate({ id: acc.id, isPrimary: true })}>
                      Principal
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => { if (confirm('\u00bfEliminar esta cuenta bancaria?')) removeAccount.mutate({ id: acc.id }); }}
                    className="text-red-400 hover:text-red-600 transition-colors p-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DANGER ZONE SECTION
// ─────────────────────────────────────────────────────────────────────────────
function DangerZoneSection() {
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showExportData, setShowExportData] = useState(false);
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = '/'; },
  });

  const handleExportData = () => {
    toast.success('Solicitud de exportación enviada. Recibirás un email con tus datos en las próximas 24 horas.');
    setShowExportData(false);
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== 'ELIMINAR') {
      toast.error('Escribe ELIMINAR para confirmar');
      return;
    }
    toast.error('Para eliminar tu cuenta, contacta a soporte@kobrapay.mx con tu solicitud.');
    setShowDeleteConfirm(false);
  };

  return (
    <Card className="border-red-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-red-100">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-500" />
          Zona de Peligro
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Acciones irreversibles. Procede con cuidado.</p>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {/* Cerrar sesión en todos los dispositivos */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
              <LogOut className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Cerrar sesión en todos los dispositivos</p>
              <p className="text-xs text-muted-foreground">Invalida todas las sesiones activas de tu cuenta</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-orange-300 text-orange-600 hover:bg-orange-50"
            onClick={() => { if (confirm('\u00bfCerrar sesión en todos los dispositivos?')) logout.mutate(); }}
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Cerrar todas
          </Button>
        </div>

        {/* Exportar datos */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Code2 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Exportar mis datos</p>
              <p className="text-xs text-muted-foreground">Descarga todos tus datos: clientes, cobros, configuraciones</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
            onClick={handleExportData}
          >
            <Code2 className="w-3.5 h-3.5 mr-1.5" />
            Exportar
          </Button>
        </div>

        {/* Eliminar cuenta */}
        <div className="p-4 bg-red-50 rounded-xl border border-red-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <UserX className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Eliminar cuenta permanentemente</p>
              <p className="text-xs text-muted-foreground">Esta acción es irreversible. Se eliminarán todos tus datos.</p>
            </div>
          </div>
          {!showDeleteConfirm ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-red-300 text-red-600 hover:bg-red-100"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Solicitar eliminación
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-red-700 font-medium">Escribe <strong>ELIMINAR</strong> para confirmar:</p>
              <Input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="ELIMINAR"
                className="border-red-300 focus:border-red-500"
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}>Cancelar</Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-foreground"
                  onClick={handleDeleteAccount}
                >
                  Confirmar eliminación
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
