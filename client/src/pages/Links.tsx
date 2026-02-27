import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useState } from "react";
import { Link } from "wouter";
import {
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Link2,
  Mail,
  MessageCircle,
  Plus,
  XCircle,
} from "lucide-react";

function formatCurrency(amount: number | string, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(amount));
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const statusConfig = {
  pending: { label: "Pendiente", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  paid: { label: "Pagado", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  expired: { label: "Expirado", color: "bg-gray-100 text-gray-500 border-gray-200", icon: XCircle },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-600 border-red-200", icon: XCircle },
};

export default function Links() {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const { data: links, isLoading } = trpc.paymentLinks.list.useQuery();
  const cancelLink = trpc.paymentLinks.cancel.useMutation({
    onSuccess: () => {
      utils.paymentLinks.list.invalidate();
      toast.success("Enlace cancelado");
    },
    onError: (err) => toast.error(err.message),
  });

  const getUrl = (token: string) => `${window.location.origin}/pay/${token}`;

  const handleCopy = async (id: number, token: string) => {
    await navigator.clipboard.writeText(getUrl(token));
    setCopiedId(id);
    toast.success("Enlace copiado");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleWhatsApp = (token: string, clientName: string, amount: string | number, currency: string, description: string) => {
    const url = getUrl(token);
    const msg = encodeURIComponent(
      `Hola ${clientName}, te comparto tu enlace de pago por ${formatCurrency(amount, currency)} para "${description}":\n\n${url}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleEmail = (token: string, clientName: string, amount: string | number, currency: string, description: string) => {
    const url = getUrl(token);
    const subject = encodeURIComponent(`Enlace de pago: ${formatCurrency(amount, currency)}`);
    const body = encodeURIComponent(
      `Hola ${clientName},\n\nTe comparto tu enlace de pago por ${formatCurrency(amount, currency)} para "${description}":\n\n${url}\n\nGracias.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <DashboardLayout title="Links de Pago">
      <div className="space-y-4">
        {/* Header action */}
        <div className="flex justify-end">
          <Button asChild className="bg-cyan-500 hover:bg-cyan-400 text-white">
            <Link href="/dashboard/create">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo enlace
            </Link>
          </Button>
        </div>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-3">
            <CardTitle className="text-base font-semibold text-gray-800">
              Mis enlaces de pago
              {links && links.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">({links.length})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-0">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
                    <div className="w-8 h-8 bg-gray-100 animate-pulse rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-100 animate-pulse rounded w-32" />
                      <div className="h-3 bg-gray-100 animate-pulse rounded w-48" />
                    </div>
                    <div className="h-4 bg-gray-100 animate-pulse rounded w-20" />
                  </div>
                ))}
              </div>
            ) : !links || links.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Link2 className="w-7 h-7 text-gray-400" />
                </div>
                <p className="font-medium text-gray-600 mb-1">Sin enlaces aún</p>
                <p className="text-sm text-gray-400 mb-4">Crea tu primer enlace de pago para comenzar a cobrar</p>
                <Button asChild className="bg-cyan-500 hover:bg-cyan-400 text-white">
                  <Link href="/dashboard/create">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear enlace
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {links.map((link) => {
                  const cfg = statusConfig[link.status] ?? statusConfig.pending;
                  const StatusIcon = cfg.icon;
                  const isPending = link.status === "pending";
                  const url = getUrl(link.token);

                  return (
                    <div key={link.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${link.status === "paid" ? "bg-green-100" : link.status === "pending" ? "bg-cyan-100" : "bg-gray-100"}`}>
                          <Link2 className={`w-4 h-4 ${link.status === "paid" ? "text-green-600" : link.status === "pending" ? "text-cyan-600" : "text-gray-400"}`} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-800">{link.clientName}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{link.description}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-sm font-bold text-gray-800">{formatCurrency(link.amount, link.currency)}</span>
                            <span className="text-xs text-gray-400">{formatDate(link.createdAt)}</span>
                            {link.expiresAt && (
                              <span className="text-xs text-amber-500">Vence: {formatDate(link.expiresAt)}</span>
                            )}
                          </div>

                          {/* URL preview */}
                          {isPending && (
                            <p className="text-xs text-gray-400 font-mono mt-1.5 truncate max-w-xs">{url}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleCopy(link.id, link.token)}
                                className={`p-1.5 rounded-lg transition-all ${copiedId === link.id ? "bg-green-100 text-green-600" : "hover:bg-gray-100 text-gray-500 hover:text-cyan-600"}`}
                                title="Copiar enlace"
                              >
                                {copiedId === link.id ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleWhatsApp(link.token, link.clientName, link.amount, link.currency, link.description)}
                                className="p-1.5 rounded-lg hover:bg-green-50 text-gray-500 hover:text-green-600 transition-all"
                                title="Enviar por WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEmail(link.token, link.clientName, link.amount, link.currency, link.description)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-all"
                                title="Enviar por Email"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all"
                                title="Ver página de pago"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => {
                                  if (confirm("¿Cancelar este enlace?")) {
                                    cancelLink.mutate({ id: link.id });
                                  }
                                }}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                                title="Cancelar enlace"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {link.status === "paid" && (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Cobrado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
