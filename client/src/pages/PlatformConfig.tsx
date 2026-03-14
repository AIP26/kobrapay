import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Settings,
  Percent,
  DollarSign,
  CreditCard,
  Banknote,
  ToggleLeft,
  ToggleRight,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface ConfigField {
  key: string;
  label: string;
  description: string;
  type: "number" | "boolean";
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  icon: React.ElementType;
  color: string;
  category: "fees" | "methods";
}

const CONFIG_FIELDS: ConfigField[] = [
  {
    key: "kobrapay_fee_rate",
    label: "Comisión KobraPay",
    description: "Porcentaje de comisión que cobra KobraPay por cada transacción procesada.",
    type: "number",
    unit: "%",
    min: 0,
    max: 10,
    step: 0.1,
    icon: Percent,
    color: "text-orange-500",
    category: "fees",
  },
  {
    key: "stripe_fee_rate",
    label: "Comisión Procesador*",
    description: "Porcentaje de comisión del procesador de pagos por transacción. (*Tarifa todo incluido, sin costos adicionales)",
    type: "number",
    unit: "%",
    min: 0,
    max: 5,
    step: 0.1,
    icon: CreditCard,
    color: "text-blue-500",
    category: "fees",
  },
  {
    key: "stripe_fee_fixed_mxn",
    label: "Comisión Fija Procesador*",
    description: "Monto fijo en MXN que cobra el procesador de pagos por cada transacción. (*Tarifa todo incluido)",
    type: "number",
    unit: "MXN",
    min: 0,
    max: 20,
    step: 0.5,
    icon: DollarSign,
    color: "text-green-500",
    category: "fees",
  },
  {
    key: "iva_rate",
    label: "IVA sobre Comisión KobraPay",
    description: "Porcentaje de IVA aplicado sobre la comisión de KobraPay (no sobre el monto total).",
    type: "number",
    unit: "%",
    min: 0,
    max: 20,
    step: 1,
    icon: Percent,
    color: "text-purple-500",
    category: "fees",
  },
  {
    key: "oxxo_enabled",
    label: "Pago en OXXO",
    description: "Habilitar o deshabilitar el método de pago en efectivo via OXXO.",
    type: "boolean",
    icon: Banknote,
    color: "text-red-500",
    category: "methods",
  },
  {
    key: "spei_enabled",
    label: "Pago por SPEI",
    description: "Habilitar o deshabilitar el método de pago por transferencia bancaria SPEI.",
    type: "boolean",
    icon: Banknote,
    color: "text-teal-500",
    category: "methods",
  },
];

function fmtPct(v: number) {
  return `${v.toFixed(2)}%`;
}

export default function PlatformConfig() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (user && !user.isSuperAdmin && user.role !== "superadmin") {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const { data: configs, isLoading, refetch } = trpc.platformConfig.getAll.useQuery(undefined, {
    enabled: !!user && (user.isSuperAdmin || user.role === "superadmin"),
  });

  const updateMany = trpc.platformConfig.updateMany.useMutation({
    onSuccess: () => {
      toast.success("Configuración guardada", {
        description: "Los cambios se aplicarán inmediatamente en toda la plataforma.",
      });
      refetch();
    },
    onError: (err) => {
      toast.error("Error al guardar", {
        description: err.message,
      });
    },
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (configs) {
      const map: Record<string, string> = {};
      for (const c of configs) {
        map[c.key] = c.value;
      }
      setValues(map);
      setDirty(false);
    }
  }, [configs]);

  const getValue = (key: string) => values[key] ?? "";

  const setValue = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const handleSave = () => {
    const updates = Object.entries(values).map(([key, value]) => ({ key, value }));
    updateMany.mutate(updates);
    setDirty(false);
  };

  // Calcular comisión total en tiempo real
  const kobrapayFee = parseFloat(getValue("kobrapay_fee_rate") || "1.5");
  const stripeFee = parseFloat(getValue("stripe_fee_rate") || "1.5");
  const stripeFixed = parseFloat(getValue("stripe_fee_fixed_mxn") || "3");
  const ivaRate = parseFloat(getValue("iva_rate") || "16");
  const totalPct = kobrapayFee + stripeFee;
  const kobrapayWithIva = kobrapayFee * (1 + ivaRate / 100);
  const totalWithIva = kobrapayWithIva + stripeFee;

  const feeFields = CONFIG_FIELDS.filter((f) => f.category === "fees");
  const methodFields = CONFIG_FIELDS.filter((f) => f.category === "methods");

  return (
    <DashboardLayout title="Configuración de Plataforma">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6 text-orange-500" />
              Configuración de Plataforma
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Panel exclusivo para superadmin — Modifica comisiones y métodos de pago en tiempo real.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Recargar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!dirty || updateMany.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-foreground"
            >
              <Save className="w-4 h-4 mr-1" />
              {updateMany.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>

        {dirty && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Tienes cambios sin guardar. Haz clic en "Guardar Cambios" para aplicarlos.
          </div>
        )}

        {/* Resumen de comisión total */}
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-orange-500" />
              Resumen de Comisión Total (Vista Previa)
            </CardTitle>
            <CardDescription>
              Así se verá la comisión en el simulador de ventas y en los materiales de marketing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-3 border border-orange-100 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">KobraPay</p>
                <p className="text-2xl font-bold text-orange-600">{fmtPct(kobrapayFee)}</p>
                <p className="text-xs text-muted-foreground">sin IVA</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Procesador*</p>
                <p className="text-2xl font-bold text-blue-600">{fmtPct(stripeFee)} + ${stripeFixed} MXN</p>
                <p className="text-xs text-muted-foreground">tarifa todo incluido</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-purple-100 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total sin IVA</p>
                <p className="text-2xl font-bold text-purple-600">{fmtPct(totalPct)}</p>
                <p className="text-xs text-muted-foreground">+ ${stripeFixed} MXN fijo</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total con IVA</p>
                <p className="text-2xl font-bold text-green-600">~{fmtPct(totalWithIva)}</p>
                <p className="text-xs text-muted-foreground">lo que ve el cliente</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              * La comisión del procesador se muestra al cliente como "Tarifa todo incluido, sin costos adicionales" para simplificar la propuesta comercial.
            </p>
          </CardContent>
        </Card>

        {/* Comisiones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="w-4 h-4 text-orange-500" />
              Estructura de Comisiones
            </CardTitle>
            <CardDescription>
              Modifica los porcentajes y montos fijos que se cobran por cada transacción.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando configuración...</div>
            ) : (
              feeFields.map((field) => {
                const Icon = field.icon;
                return (
                  <div key={field.key} className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg bg-gray-50 mt-1`}>
                      <Icon className={`w-4 h-4 ${field.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm font-semibold text-foreground">{field.label}</Label>
                      <p className="text-xs text-muted-foreground mt-0.5 mb-2">{field.description}</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          value={getValue(field.key)}
                          onChange={(e) => setValue(field.key, e.target.value)}
                          className="w-32 text-right font-mono"
                        />
                        <span className="text-sm text-muted-foreground font-medium">{field.unit}</span>
                        {field.key === "kobrapay_fee_rate" && (
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                            Con IVA: {fmtPct(kobrapayWithIva)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Métodos de pago */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-500" />
              Métodos de Pago Habilitados
            </CardTitle>
            <CardDescription>
              Activa o desactiva métodos de pago para todos los negocios en la plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">Cargando...</div>
            ) : (
              methodFields.map((field) => {
                const Icon = field.icon;
                const isEnabled = getValue(field.key) === "true";
                return (
                  <div key={field.key} className="flex items-center justify-between py-2">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-gray-50 mt-0.5">
                        <Icon className={`w-4 h-4 ${field.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{field.label}</p>
                        <p className="text-xs text-muted-foreground">{field.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isEnabled ? "default" : "secondary"}
                        className={isEnabled ? "bg-green-100 text-green-700 border-green-200" : ""}
                      >
                        {isEnabled ? "Activo" : "Inactivo"}
                      </Badge>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => setValue(field.key, checked ? "true" : "false")}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Nota de seguridad */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
          <div>
            <p className="font-semibold">Los cambios son efectivos inmediatamente</p>
            <p className="text-xs mt-0.5 text-blue-600">
              Al guardar, los nuevos valores se aplican a todos los nuevos cobros creados en la plataforma.
              Los cobros existentes ya procesados no se ven afectados.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
