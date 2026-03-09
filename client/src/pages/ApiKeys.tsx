import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Key, Plus, Copy, Trash2, CheckCircle, AlertCircle, Code2, ExternalLink } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function ApiKeys() {
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newEnv, setNewEnv] = useState<"live" | "test">("live");
  const [generatedKey, setGeneratedKey] = useState<{ key: string; name: string; environment: string } | null>(null);
  const [revokeId, setRevokeId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const utils = trpc.useUtils();
  const { data: keys = [], isLoading } = trpc.apiKeys.list.useQuery();
  const { data: merchantInfo } = trpc.apiKeys.getMerchantInfo.useQuery();

  const generate = trpc.apiKeys.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedKey(data);
      setShowCreate(false);
      setNewKeyName("");
      utils.apiKeys.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const revoke = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => {
      toast.success("API Key revocada correctamente");
      setRevokeId(null);
      utils.apiKeys.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const activeKeys = keys.filter((k) => k.isActive);
  const revokedKeys = keys.filter((k) => !k.isActive);

  return (
    <DashboardLayout title="API Keys">
      <div className="max-w-4xl mx-auto space-y-8 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">API Keys</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Conecta tu plataforma o tienda con KobraPay usando estas credenciales.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva API Key
          </Button>
        </div>

        {/* Merchant Info */}
        {merchantInfo && (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Key className="h-4 w-4 text-sky-500" />
              Tus Credenciales de Integración
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Merchant ID</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded-lg flex-1">
                    {merchantInfo.merchantId}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => copyToClipboard(merchantInfo.merchantId)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">API Base URL</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded-lg flex-1 truncate">
                    https://kobrapay.mx/api/v1
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => copyToClipboard("https://kobrapay.mx/api/v1")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Keys */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            API Keys Activas ({activeKeys.length}/5)
          </h2>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Cargando...</div>
          ) : activeKeys.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-8 text-center">
              <Key className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No tienes API Keys activas.</p>
              <p className="text-xs text-muted-foreground mt-1">Crea una para conectar tu plataforma.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeKeys.map((key) => (
                <div
                  key={key.id}
                  className="rounded-xl border bg-card p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                      <Key className="h-4 w-4 text-sky-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{key.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-xs text-muted-foreground font-mono">{key.keyPrefix}••••••••</code>
                        <Badge
                          variant={key.environment === "live" ? "default" : "secondary"}
                          className="text-xs py-0"
                        >
                          {key.environment}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground hidden md:block">
                      {key.requestCount} requests
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setRevokeId(key.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Integration Guide */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Code2 className="h-4 w-4 text-purple-500" />
            Guía Rápida de Integración
          </h2>
          <p className="text-xs text-muted-foreground">
            Usa tu API Key para crear sesiones de pago desde tu plataforma. El cliente es redirigido a la página de pago de KobraPay.
          </p>

          <div className="space-y-3">
            <p className="text-xs font-medium text-foreground">Ejemplo en JavaScript / Node.js:</p>
            <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto text-foreground leading-relaxed">
{`const response = await fetch('https://kobrapay.mx/api/v1/checkout', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer kp_live_TU_API_KEY_AQUI',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 50000,          // $500.00 MXN en centavos
    description: 'Orden #1234 - Producto Premium',
    customer_email: 'cliente@email.com',
    success_url: 'https://tutienda.com/gracias',
    cancel_url: 'https://tutienda.com/cancelado'
  })
});

const { checkout_url } = await response.json();
window.location.href = checkout_url; // Redirigir al cliente`}
            </pre>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-foreground">Ejemplo en PHP:</p>
            <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto text-foreground leading-relaxed">
{`$ch = curl_init('https://kobrapay.mx/api/v1/checkout');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer kp_live_TU_API_KEY_AQUI',
    'Content-Type: application/json'
  ],
  CURLOPT_POSTFIELDS => json_encode([
    'amount' => 50000,
    'description' => 'Orden #1234',
    'customer_email' => 'cliente@email.com',
    'success_url' => 'https://tutienda.com/gracias',
    'cancel_url' => 'https://tutienda.com/cancelado'
  ])
]);
$response = json_decode(curl_exec($ch), true);
header('Location: ' . $response['checkout_url']);`}
            </pre>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <strong>Nota:</strong> El monto se envía en centavos. $100 MXN = 10000. El mínimo es $0.50 MXN (50 centavos).
          </div>
        </div>

        {/* Revoked Keys */}
        {revokedKeys.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Keys Revocadas</h2>
            <div className="space-y-2">
              {revokedKeys.map((key) => (
                <div
                  key={key.id}
                  className="rounded-xl border bg-muted/30 p-4 flex items-center gap-3 opacity-60"
                >
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground line-through">{key.name}</p>
                    <code className="text-xs text-muted-foreground font-mono">{key.keyPrefix}••••••••</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dialog: Crear nueva key */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear nueva API Key</DialogTitle>
            <DialogDescription>
              Dale un nombre descriptivo para identificarla (ej: "Mi Tienda Online", "App Móvil").
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre de la API Key</Label>
              <Input
                placeholder="Ej: Mi Tienda Online"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newKeyName.trim()) {
                    generate.mutate({ name: newKeyName.trim(), environment: newEnv });
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Entorno</Label>
              <div className="flex gap-2">
                <Button
                  variant={newEnv === "live" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewEnv("live")}
                  className="flex-1"
                >
                  Live (Producción)
                </Button>
                <Button
                  variant={newEnv === "test" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewEnv("test")}
                  className="flex-1"
                >
                  Test (Pruebas)
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => generate.mutate({ name: newKeyName.trim(), environment: newEnv })}
              disabled={!newKeyName.trim() || generate.isPending}
            >
              {generate.isPending ? "Generando..." : "Generar API Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Mostrar key generada (solo una vez) */}
      <Dialog open={!!generatedKey} onOpenChange={() => setGeneratedKey(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              API Key generada exitosamente
            </DialogTitle>
            <DialogDescription>
              <strong className="text-destructive">Guarda esta key ahora.</strong> No podrás verla de nuevo.
            </DialogDescription>
          </DialogHeader>
          {generatedKey && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Tu API Key</Label>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-muted px-3 py-2 rounded-lg flex-1 break-all">
                    {generatedKey.key}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => copyToClipboard(generatedKey.key)}
                  >
                    {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Esta es la única vez que verás la key completa. Cópiala y guárdala en un lugar seguro (ej: variable de entorno de tu servidor).
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Úsala así en tu código:</p>
                <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto">
{`Authorization: Bearer ${generatedKey.key}`}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setGeneratedKey(null)}>
              Ya la guardé, cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirmar revocación */}
      <AlertDialog open={!!revokeId} onOpenChange={() => setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar esta API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Cualquier integración que use esta key dejará de funcionar inmediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeId && revoke.mutate({ id: revokeId })}
            >
              Revocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
