import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import {
  CheckCircle2,
  Copy,
  Link2,
  Mail,
  MessageCircle,
  Plus,
  Share2,
} from "lucide-react";

function formatCurrency(amount: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount);
}

export default function CreateLink() {
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    amount: "",
    description: "",
    currency: "MXN",
    expiresInDays: "",
  });
  const [createdLink, setCreatedLink] = useState<{
    token: string;
    url: string;
    clientName: string;
    amount: number;
    currency: string;
    description: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const createLink = trpc.paymentLinks.create.useMutation({
    onSuccess: (data) => {
      if (data) {
        const url = `${window.location.origin}/pay/${data.token}`;
        setCreatedLink({
          token: data.token,
          url,
          clientName: form.clientName,
          amount: parseFloat(form.amount),
          currency: form.currency,
          description: form.description,
        });
        toast.success("¡Enlace de pago creado exitosamente!");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Error al crear el enlace");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 10) {
      toast.error("El monto mínimo es $10");
      return;
    }
    createLink.mutate({
      clientName: form.clientName.trim(),
      clientEmail: form.clientEmail.trim() || undefined,
      amount,
      description: form.description.trim(),
      currency: form.currency as "MXN" | "USD",
      expiresInDays: (form.expiresInDays && form.expiresInDays !== "0") ? parseInt(form.expiresInDays) : undefined,
    });
  };

  const handleCopy = async () => {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink.url);
    setCopied(true);
    toast.success("¡Enlace copiado al portapapeles!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    if (!createdLink) return;
    const msg = encodeURIComponent(
      `Hola ${createdLink.clientName}, te comparto tu enlace de pago por ${formatCurrency(createdLink.amount, createdLink.currency)} para "${createdLink.description}":\n\n${createdLink.url}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleEmail = () => {
    if (!createdLink) return;
    const subject = encodeURIComponent(`Enlace de pago: ${formatCurrency(createdLink.amount, createdLink.currency)}`);
    const body = encodeURIComponent(
      `Hola ${createdLink.clientName},\n\nTe comparto tu enlace de pago por ${formatCurrency(createdLink.amount, createdLink.currency)} para "${createdLink.description}":\n\n${createdLink.url}\n\nPor favor realiza el pago a la brevedad posible.\n\nGracias.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleReset = () => {
    setCreatedLink(null);
    setCopied(false);
    setForm({ clientName: "", clientEmail: "", amount: "", description: "", currency: "MXN", expiresInDays: "" });
  };

  if (createdLink) {
    return (
      <DashboardLayout title="Enlace Creado">
        <div className="max-w-lg mx-auto">
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 px-6 py-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">¡Enlace creado!</h2>
              <p className="text-cyan-100 text-sm">
                Cobro de <strong>{formatCurrency(createdLink.amount, createdLink.currency)}</strong> para <strong>{createdLink.clientName}</strong>
              </p>
            </div>

            <CardContent className="p-5 space-y-4">
              {/* Link Display */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">Enlace de pago</p>
                <p className="text-sm text-gray-700 break-all font-mono leading-relaxed">{createdLink.url}</p>
              </div>

              {/* Share Options */}
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">Compartir enlace</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleCopy}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      copied
                        ? "border-green-400 bg-green-50 text-green-600"
                        : "border-gray-200 bg-white hover:border-cyan-300 hover:bg-cyan-50 text-gray-600 hover:text-cyan-600"
                    }`}
                  >
                    {copied ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                    <span className="text-xs font-medium">{copied ? "Copiado" : "Copiar"}</span>
                  </button>

                  <button
                    onClick={handleWhatsApp}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-green-400 hover:bg-green-50 text-gray-600 hover:text-green-600 transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-xs font-medium">WhatsApp</span>
                  </button>

                  <button
                    onClick={handleEmail}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-all"
                  >
                    <Mail className="w-5 h-5" />
                    <span className="text-xs font-medium">Email</span>
                  </button>
                </div>
              </div>

              {/* Payment Details Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cliente</span>
                  <span className="font-medium text-gray-800">{createdLink.clientName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Concepto</span>
                  <span className="text-gray-700 text-right max-w-[200px]">{createdLink.description}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
                  <span className="font-semibold text-gray-700">Total</span>
                  <span className="font-bold text-cyan-600">{formatCurrency(createdLink.amount, createdLink.currency)}</span>
                </div>
              </div>

              <Button onClick={handleReset} variant="outline" className="w-full border-gray-200">
                <Plus className="w-4 h-4 mr-2" />
                Crear otro enlace
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Nuevo Cobro">
      <div className="max-w-lg mx-auto">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                <Link2 className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <CardTitle className="text-base text-gray-800">Crear enlace de pago</CardTitle>
                <CardDescription>Completa los datos para generar el enlace</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="clientName" className="text-gray-700 font-medium">Nombre del cliente *</Label>
                <Input
                  id="clientName"
                  placeholder="Ej. Juan García"
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  className="border-gray-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clientEmail" className="text-gray-700 font-medium">Email del cliente (opcional)</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="juan@ejemplo.com"
                  value={form.clientEmail}
                  onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                  className="border-gray-200"
                />
                <p className="text-xs text-gray-400">Se usará para enviar el recibo de pago al cliente</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="text-gray-700 font-medium">Monto a cobrar *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                    <Input
                      id="amount"
                      type="number"
                      min="10"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7 border-gray-200"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-700 font-medium">Moneda</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger className="border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MXN">MXN (Pesos)</SelectItem>
                      <SelectItem value="USD">USD (Dólares)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-gray-700 font-medium">Descripción / Referencia *</Label>
                <Textarea
                  id="description"
                  placeholder="Ej. Consulta médica, Diseño de logo, Reparación de laptop..."
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="border-gray-200 resize-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-700 font-medium">Vigencia del enlace</Label>
                <Select
                  value={form.expiresInDays}
                  onValueChange={(v) => setForm({ ...form, expiresInDays: v })}
                >
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="Sin vencimiento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin vencimiento</SelectItem>
                    <SelectItem value="1">1 día</SelectItem>
                    <SelectItem value="3">3 días</SelectItem>
                    <SelectItem value="7">7 días</SelectItem>
                    <SelectItem value="15">15 días</SelectItem>
                    <SelectItem value="30">30 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-white"
                size="lg"
                disabled={createLink.isPending}
              >
                {createLink.isPending ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Generando enlace...</>
                ) : (
                  <><Link2 className="w-4 h-4 mr-2" />Generar enlace de pago</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
