import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Building2, CheckCircle2, CreditCard, ExternalLink, Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.vendor.getSettings.useQuery();
  const [form, setForm] = useState({
    businessName: "",
    businessEmail: "",
    businessPhone: "",
    currency: "MXN",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        businessName: settings.businessName || "",
        businessEmail: settings.businessEmail || "",
        businessPhone: settings.businessPhone || "",
        currency: settings.currency || "MXN",
      });
    }
  }, [settings]);

  const updateSettings = trpc.vendor.updateSettings.useMutation({
    onSuccess: () => {
      utils.vendor.getSettings.invalidate();
      toast.success("Configuración guardada correctamente");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim()) {
      toast.error("El nombre del negocio es requerido");
      return;
    }
    updateSettings.mutate({
      businessName: form.businessName.trim(),
      businessEmail: form.businessEmail.trim() || undefined,
      businessPhone: form.businessPhone.trim() || undefined,
      currency: form.currency as "MXN" | "USD",
    });
  };

  return (
    <DashboardLayout title="Configuración">
      <div className="max-w-2xl space-y-6">
        {/* Business Info */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Datos de tu negocio</CardTitle>
                <CardDescription>Esta información aparece en los recibos de pago</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="businessName">Nombre del negocio *</Label>
                  <Input
                    id="businessName"
                    placeholder="Ej. Mi Negocio S.A."
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="businessEmail">Email de contacto</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    placeholder="contacto@minegocio.com"
                    value={form.businessEmail}
                    onChange={(e) => setForm({ ...form, businessEmail: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="businessPhone">Teléfono de contacto</Label>
                  <Input
                    id="businessPhone"
                    type="tel"
                    placeholder="+52 55 1234 5678"
                    value={form.businessPhone}
                    onChange={(e) => setForm({ ...form, businessPhone: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Moneda predeterminada</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MXN">MXN - Pesos Mexicanos</SelectItem>
                      <SelectItem value="USD">USD - Dólares Americanos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={updateSettings.isPending} className="w-full sm:w-auto">
                  {updateSettings.isPending ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Guardando...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 mr-2" />Guardar configuración</>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Stripe Info */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-base">Procesador de pagos (Stripe)</CardTitle>
                <CardDescription>Configura tu cuenta de Stripe para recibir pagos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800 font-medium mb-1">⚠️ Modo de prueba activo</p>
              <p className="text-sm text-amber-700">
                Actualmente estás usando el entorno de prueba de Stripe. Para recibir pagos reales, debes reclamar y activar tu cuenta de Stripe.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Tarjeta de prueba</p>
                  <p className="text-xs text-muted-foreground font-mono">4242 4242 4242 4242</p>
                </div>
                <Badge variant="secondary">Test</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Usa cualquier fecha de vencimiento futura y cualquier CVV de 3 dígitos para probar pagos.
              </p>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Ir al Dashboard de Stripe
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Información de la cuenta</CardTitle>
                <CardDescription>Gestiona tu cuenta de PagaFácil</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tu cuenta está vinculada a través de Manus OAuth. Para cambiar tu información de perfil, visita la configuración de tu cuenta Manus.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
