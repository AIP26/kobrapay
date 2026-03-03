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
  MessageSquare, Save, Info, CreditCard, ExternalLink, Receipt,
} from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

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
}

export default function Settings() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.vendor.getSettings.useQuery();
  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { isDirty },
  } = useForm<SettingsForm>({
    defaultValues: {
      businessName: "", businessEmail: "", businessPhone: "",
      commissionRate: 7, ivaRate: 16, ivaEnabled: true, usdExchangeRate: 0,
      otpEnabled: false, selfieEnabled: false, chargebackText: "",
    },
  });

  const otpEnabled = watch("otpEnabled");
  const selfieEnabled = watch("selfieEnabled");
  const ivaEnabled = watch("ivaEnabled");
  const ivaRate = watch("ivaRate");
  const usdRate = watch("usdExchangeRate");
  const commRate = watch("commissionRate");

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
              <p className="text-xs text-gray-500 mb-2 font-medium">Ejemplo para un cobro de $1,000 MXN:</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Monto bruto:</span>
                  <span className="font-medium text-gray-800">$1,000.00 MXN</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Comisión KobraPay ({commRate || 7}%):</span>
                  <span className="font-medium text-cyan-600">${((commRate || 7) * 10).toFixed(2)} MXN</span>
                </div>
                {ivaEnabled && (ivaRate || 0) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">IVA sobre comisión ({ivaRate}%):</span>
                    <span className="font-medium text-orange-500">${((commRate || 7) * 10 * (ivaRate || 16) / 100).toFixed(2)} MXN</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Total cobrado por KobraPay:</span>
                  <span className="font-semibold text-cyan-700">${((commRate || 7) * 10 * (1 + (ivaEnabled ? (ivaRate || 16) / 100 : 0))).toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between text-xs border-t border-gray-200 pt-1 mt-1">
                  <span className="text-gray-600">Neto para el comercio:</span>
                  <span className="font-bold text-green-600">${(1000 - (commRate || 7) * 10 * (1 + (ivaEnabled ? (ivaRate || 16) / 100 : 0))).toFixed(2)} MXN</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuración Fiscal - IVA */}
        <Card className="border-orange-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-orange-100">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-orange-500" />
              Configuración Fiscal — IVA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-200">
              <div>
                <p className="text-sm font-medium text-gray-800">Cobrar IVA sobre la comisión</p>
                <p className="text-xs text-gray-500 mt-0.5">Activa para sumar IVA a tu comisión de plataforma</p>
              </div>
              <Switch
                checked={ivaEnabled}
                onCheckedChange={(v) => setValue("ivaEnabled", v, { shouldDirty: true })}
              />
            </div>
            {ivaEnabled && (
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-700">Tasa de IVA (%)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="16"
                    {...register("ivaRate", { valueAsNumber: true })}
                    className="pr-8 text-lg font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[0, 8, 16].map((rate) => (
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
                      {rate === 0 ? "0% (Exento)" : rate === 8 ? "8% (Frontera)" : "16% (Estándar)"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg border border-orange-100 mt-2">
                  💡 <strong>Estrategia fiscal:</strong> Zona fronteriza = 8% · Exento/RESICO = 0% · Estándar = 16%.
                  Escribe el porcentaje exacto que necesites.
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
              Tipo de Cambio USD / MXN
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-700">Tipo de cambio (USD a MXN)</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="18.50"
                  {...register("usdExchangeRate", { valueAsNumber: true })}
                  className="pr-20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  MXN/USD
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Si pones 0, no se mostrara equivalente en USD. Con un valor (ej: 18.50), los
                clientes de USA veran cuanto pagaran en dolares.
              </p>
            </div>
            {usdRate > 0 && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-xs text-blue-700 font-medium mb-1">
                  Vista previa en pagina de pago:
                </p>
                <p className="text-xs text-blue-600">
                  Un cobro de <strong>$1,000 MXN</strong> mostrara como{" "}
                  <strong>aprox. ${(1000 / usdRate).toFixed(2)} USD</strong> al tipo de cambio
                  de ${usdRate} MXN/USD
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
