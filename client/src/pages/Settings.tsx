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
  Building2, Percent, DollarSign, Shield, Camera,
  MessageSquare, Save, Info, CreditCard, ExternalLink, Receipt, Globe,
  Link2, Eye, EyeOff, Copy, CheckCircle2,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { COUNTRIES } from "../../../shared/countries";
import { useAuth } from "@/_core/hooks/useAuth";
import { KeyRound, Lock } from "lucide-react";

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

export default function Settings() {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const isSuperAdmin = (user as Record<string, unknown>)?.isSuperAdmin === true;
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
      commissionRate: 7, ivaRate: 16, ivaEnabled: true, usdExchangeRate: 0,
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
        commissionRate: parseFloat(String(settings.commissionRate || 7)),
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
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-500" />
              Datos del Negocio
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-700">Nombre del negocio *</Label>
              <Input
                placeholder="Mi Empresa S.A. de C.V."
                {...register("businessName", { required: true })}
              />
              <p className="text-xs text-gray-400">
                Aparece en la pagina de pago que ven tus clientes
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-700">Email de contacto</Label>
                <Input
                  type="email"
                  placeholder="contacto@minegocio.com"
                  {...register("businessEmail")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-700">Telefono</Label>
                <Input placeholder="+52 55 1234 5678" {...register("businessPhone")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* País de Operación */}
        <Card className="border-cyan-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-cyan-100">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-500" />
              País de Operación
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-700">País donde opera tu negocio</Label>
              <select
                value={businessCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} — {c.currency}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400">
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
                  <p className="text-gray-400">Moneda</p>
                  <p className="font-semibold text-gray-800">{selectedCountry.currency}</p>
                  <p className="text-gray-500">{selectedCountry.currencySymbol}</p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-cyan-100 text-center">
                  <p className="text-gray-400">Impuesto</p>
                  <p className="font-semibold text-gray-800">{selectedCountry.taxName}</p>
                  <p className="text-gray-500">{Math.round(selectedCountry.taxRate * 100)}%</p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-cyan-100 text-center">
                  <p className="text-gray-400">Prefijo tel.</p>
                  <p className="font-semibold text-gray-800">{selectedCountry.phonePrefix}</p>
                  <p className="text-gray-500">Código</p>
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
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Percent className="w-4 h-4 text-cyan-500" />
              Comisiones de la Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-700">Comision por defecto (%)</Label>
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  %
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Aplica a todos los cobros. Puedes personalizarla por cliente en "Mis Clientes".
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500 mb-2 font-medium">
                Ejemplo para un cobro de 1,000 {currencyLabel}:
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Monto bruto:</span>
                  <span className="font-medium text-gray-800">
                    {selectedCountry.currencySymbol}1,000.00 {currencyLabel}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Comisión KobraPay ({commRate || 7}%):</span>
                  <span className="font-medium text-cyan-600">
                    {selectedCountry.currencySymbol}{((commRate || 7) * 10).toFixed(2)} {currencyLabel}
                  </span>
                </div>
                {ivaEnabled && (ivaRate || 0) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">{taxLabel} sobre comisión ({ivaRate}%):</span>
                    <span className="font-medium text-orange-500">
                      {selectedCountry.currencySymbol}{((commRate || 7) * 10 * (ivaRate || 16) / 100).toFixed(2)} {currencyLabel}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Total cobrado por KobraPay:</span>
                  <span className="font-semibold text-cyan-700">
                    {selectedCountry.currencySymbol}{((commRate || 7) * 10 * (1 + (ivaEnabled ? (ivaRate || 16) / 100 : 0))).toFixed(2)} {currencyLabel}
                  </span>
                </div>
                <div className="flex justify-between text-xs border-t border-gray-200 pt-1 mt-1">
                  <span className="text-gray-600">Neto para el comercio:</span>
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
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-orange-500" />
              Configuración Fiscal — {taxLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-200">
              <div>
                <p className="text-sm font-medium text-gray-800">Cobrar {taxLabel} sobre la comisión</p>
                <p className="text-xs text-gray-500 mt-0.5">Activa para sumar {taxLabel} a tu comisión de plataforma</p>
              </div>
              <Switch
                checked={ivaEnabled}
                onCheckedChange={(v) => setValue("ivaEnabled", v, { shouldDirty: true })}
              />
            </div>
            {ivaEnabled && (
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-700">Tasa de {taxLabel} (%)</Label>
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
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
                <div className={`grid gap-2 mt-2`} style={{ gridTemplateColumns: `repeat(${taxRateOptions.length}, 1fr)` }}>
                  {taxRateOptions.map(({ rate, label }) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setValue("ivaRate", rate, { shouldDirty: true })}
                      className={`text-xs py-1.5 rounded-lg border font-medium transition-colors ${
                        ivaRate === rate
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
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
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-cyan-500" />
              Tipo de Cambio USD / {currencyLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-700">Tipo de cambio (USD a {currencyLabel})</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={businessCountry === "MX" ? "18.50" : "1.00"}
                  {...register("usdExchangeRate", { valueAsNumber: true })}
                  className="pr-24"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  {currencyLabel}/USD
                </span>
              </div>
              <p className="text-xs text-gray-400">
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
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
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
                  <p className="text-sm font-medium text-gray-800">Verificacion OTP por email</p>
                  <p className="text-xs text-gray-400">
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
                  <p className="text-sm font-medium text-gray-800">Verificacion con selfie</p>
                  <p className="text-xs text-gray-400">
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
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              Proteccion contra Contracargos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-700">
                Texto de aviso legal (aparece en pagina de pago)
              </Label>
              <Textarea
                rows={3}
                placeholder="Al realizar este pago, usted acepta que el cargo es definitivo y no puede ser cancelado ni reembolsado una vez procesado."
                {...register("chargebackText")}
                className="text-sm resize-none"
              />
              <p className="text-xs text-gray-400">
                Este texto aparece antes de que el cliente confirme el pago. Sirve como evidencia
                en caso de contracargo.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pasarelas de Pago */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
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
                    <span className="text-white font-bold text-sm">S</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Stripe</p>
                    <p className="text-xs text-gray-500">Internacional · Tarjetas, OXXO, transferencias</p>
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
                    <p className="text-xs font-medium text-gray-700">Tarjeta de prueba</p>
                    <p className="text-xs text-gray-400 font-mono">4242 4242 4242 4242 · CVV: 123 · Fecha: cualquier futura</p>
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
                    <span className="text-white font-bold text-sm">C</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Conekta</p>
                    <p className="text-xs text-gray-500">México · OXXO, SPEI, tarjetas nacionales</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-gray-500">Próximamente</Badge>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-xs text-gray-500">Pasarela mexicana ideal para cobros con OXXO y SPEI. Requiere cuenta en Conekta.</p>
                <Button size="sm" className="w-full bg-[#00A651] hover:bg-[#008a44] text-white" disabled>
                  Conectar Conekta — Próximamente
                </Button>
              </div>
            </div>

            {/* OpenPay */}
            <div className="border border-gray-200 rounded-xl overflow-hidden opacity-80">
              <div className="flex items-center justify-between p-4 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0066CC] flex items-center justify-center">
                    <span className="text-white font-bold text-sm">O</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">OpenPay (BBVA)</p>
                    <p className="text-xs text-gray-500">México · Tarjetas, OXXO, transferencias bancarias</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-gray-500">Próximamente</Badge>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-xs text-gray-500">Plataforma de pagos de BBVA México. Acepta tarjetas nacionales e internacionales y pagos en efectivo.</p>
                <Button size="sm" className="w-full bg-[#0066CC] hover:bg-[#0052a3] text-white" disabled>
                  Conectar OpenPay — Próximamente
                </Button>
              </div>
            </div>

            {/* PayPal */}
            <div className="border border-gray-200 rounded-xl overflow-hidden opacity-80">
              <div className="flex items-center justify-between p-4 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#003087] flex items-center justify-center">
                    <span className="text-white font-bold text-sm">P</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">PayPal</p>
                    <p className="text-xs text-gray-500">Internacional · Wallet PayPal, tarjetas, transferencias</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-gray-500">Próximamente</Badge>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-xs text-gray-500">Acepta pagos de clientes con cuenta PayPal o tarjeta en más de 200 países.</p>
                <Button size="sm" className="w-full bg-[#003087] hover:bg-[#002070] text-white" disabled>
                  Conectar PayPal — Próximamente
                </Button>
              </div>
            </div>

            <p className="text-xs text-center text-gray-400">¿Necesitas otra pasarela? Contáctanos en soporte@kobrapay.mx</p>
          </CardContent>
        </Card>

        {/* ─── Perfil Público del Negocio ─── */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="w-4 h-4 text-cyan-500" />
              Perfil Público del Negocio
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Crea una página pública donde tus clientes puedan ver todos tus cobros activos sin necesidad de que compartas cada link individualmente.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle activar perfil */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <Label className="text-sm font-medium text-gray-700">Activar perfil público</Label>
                <p className="text-xs text-gray-500 mt-0.5">Cuando está activo, cualquier persona puede ver tu página en kobrapay.mx/p/tu-slug</p>
              </div>
              <Switch
                checked={publicProfileEnabled}
                onCheckedChange={(v) => setValue("publicProfileEnabled", v, { shouldDirty: true })}
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5 text-cyan-500" />
                URL de tu perfil
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 bg-gray-100 px-3 py-2 rounded-l-lg border border-r-0 border-gray-200 whitespace-nowrap">kobrapay.mx/p/</span>
                <Input
                  {...register("businessSlug")}
                  placeholder="mi-negocio"
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-gray-400">Solo letras minúsculas, números y guiones. Ej: clinica-dental-garcia</p>
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
              <Label className="text-sm font-medium text-gray-700">Descripción del negocio</Label>
              <Textarea
                {...register("publicBio")}
                placeholder="Ej: Clínica dental con más de 10 años de experiencia en CDMX. Aceptamos todas las tarjetas."
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-gray-400">Máximo 500 caracteres. Aparece en tu página pública.</p>
            </div>

            {/* Website */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
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
                className="bg-cyan-500 hover:bg-cyan-400 text-white gap-2"
              >
                <Globe className="w-4 h-4" />
                {updatePublicProfile.isPending ? "Guardando..." : "Guardar Perfil Público"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ─── Sección PIN de Seguridad (solo superadmin) ─── */}
        {isSuperAdmin && (
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-600" />
                PIN de Seguridad
              </CardTitle>
              <p className="text-sm text-gray-500">PIN de 4 dígitos para operaciones sensibles como eliminar transacciones.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Estado actual del PIN */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${pinStatus?.hasPin ? 'bg-green-100' : 'bg-amber-100'}`}>
                    <KeyRound className={`w-4 h-4 ${pinStatus?.hasPin ? 'text-green-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{pinStatus?.hasPin ? 'PIN configurado' : 'Sin PIN configurado'}</p>
                    <p className="text-xs text-gray-500">{pinStatus?.hasPin ? 'Tu PIN está activo y protege las eliminaciones' : 'Crea un PIN para poder eliminar transacciones'}</p>
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
                  <p className="text-sm font-semibold text-gray-700">{pinStatus?.hasPin ? 'Cambiar PIN de seguridad' : 'Crear PIN de seguridad'}</p>

                  {/* PIN actual (solo si ya tiene uno) */}
                  {pinStatus?.hasPin && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">PIN actual</p>
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
                    <p className="text-xs text-gray-500 mb-2">Nuevo PIN (4 dígitos)</p>
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
                    <p className="text-xs text-gray-500 mb-2">Confirmar nuevo PIN</p>
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
                      className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-white"
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

        <div className="flex justify-end pb-8">
          <Button
            type="submit"
            disabled={updateSettings.isPending || !isDirty}
            className="bg-cyan-500 hover:bg-cyan-400 text-white gap-2 px-8"
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
