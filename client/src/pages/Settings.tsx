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
  MessageSquare, Save, Info, CreditCard, ExternalLink,
} from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

interface SettingsForm {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  commissionRate: number;
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
      commissionRate: 7, usdExchangeRate: 0,
      otpEnabled: false, selfieEnabled: false, chargebackText: "",
    },
  });

  const otpEnabled = watch("otpEnabled");
  const selfieEnabled = watch("selfieEnabled");
  const usdRate = watch("usdExchangeRate");
  const commRate = watch("commissionRate");

  useEffect(() => {
    if (settings) {
      reset({
        businessName: settings.businessName || "",
        businessEmail: settings.businessEmail || "",
        businessPhone: settings.businessPhone || "",
        commissionRate: parseFloat(String(settings.commissionRate || 7)),
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
              <p className="text-xs text-gray-500 mb-2 font-medium">
                Ejemplo para un cobro de $1,000 MXN:
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Monto bruto:</span>
                  <span className="font-medium text-gray-800">$1,000.00 MXN</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Tu comision ({commRate || 7}%):</span>
                  <span className="font-medium text-cyan-600">
                    ${((commRate || 7) * 10).toFixed(2)} MXN
                  </span>
                </div>
                <div className="flex justify-between text-xs border-t border-gray-200 pt-1 mt-1">
                  <span className="text-gray-600">Neto para el comercio:</span>
                  <span className="font-bold text-green-600">
                    ${(1000 - (commRate || 7) * 10).toFixed(2)} MXN
                  </span>
                </div>
              </div>
            </div>
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

        {/* Stripe */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyan-500" />
              Procesador de Pagos (Stripe)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-sm text-amber-800 font-medium mb-1">Modo de prueba activo</p>
              <p className="text-sm text-amber-700">
                Para recibir pagos reales, reclama y activa tu cuenta de Stripe.
              </p>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-800">Tarjeta de prueba</p>
                <p className="text-xs text-gray-400 font-mono">
                  4242 4242 4242 4242 - CVV: 123 - Fecha: cualquier futura
                </p>
              </div>
              <Badge variant="secondary">Test</Badge>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ir al Dashboard de Stripe
              </a>
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end pb-4">
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
