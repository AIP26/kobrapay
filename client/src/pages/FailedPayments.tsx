import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AlertCircle, XCircle, RefreshCw, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type FailedTx = {
  id: number;
  operationNumber: string | null;
  payerName: string | null;
  payerEmail: string | null;
  amount: number;
  errorMessage: string;
  createdAt: Date;
  cardBrand: string | null;
  cardLast4: string | null;
  userId: number | null;
  ownerName: string | null;
  ownerEmail: string | null;
};

function getErrorCategory(msg: string): { color: string; label: string } {
  const m = msg.toLowerCase();
  if (m.includes("fondos insuficientes")) return { color: "bg-orange-100 text-orange-700 border-orange-200", label: "Sin fondos" };
  if (m.includes("vencida")) return { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Tarjeta vencida" };
  if (m.includes("cvv") || m.includes("cvc")) return { color: "bg-purple-100 text-purple-700 border-purple-200", label: "CVV incorrecto" };
  if (m.includes("seguridad") || m.includes("fraude") || m.includes("bloqueado")) return { color: "bg-red-100 text-red-700 border-red-200", label: "Bloqueado" };
  if (m.includes("robada") || m.includes("perdida")) return { color: "bg-red-200 text-red-800 border-red-300", label: "Tarjeta reportada" };
  if (m.includes("autenticación")) return { color: "bg-blue-100 text-blue-700 border-blue-200", label: "Requiere auth" };
  if (m.includes("límite")) return { color: "bg-amber-100 text-amber-700 border-amber-200", label: "Límite excedido" };
  if (m.includes("banco")) return { color: "bg-gray-100 text-gray-700 border-gray-200", label: "Banco rechazó" };
  return { color: "bg-red-100 text-red-700 border-red-200", label: "Rechazado" };
}

export default function FailedPayments() {
  const { data: failed = [], isLoading, refetch, isFetching } = trpc.transactions.listAllFailed.useQuery();
  const [search, setSearch] = useState("");

  const filtered = failed.filter((tx: FailedTx) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (tx.payerName || "").toLowerCase().includes(q) ||
      (tx.payerEmail || "").toLowerCase().includes(q) ||
      (tx.ownerName || "").toLowerCase().includes(q) ||
      (tx.errorMessage || "").toLowerCase().includes(q) ||
      (tx.operationNumber || "").toLowerCase().includes(q)
    );
  });

  // Agrupar por tipo de error
  const errorCounts: Record<string, number> = {};
  failed.forEach((tx: FailedTx) => {
    const cat = getErrorCategory(tx.errorMessage).label;
    errorCounts[cat] = (errorCounts[cat] || 0) + 1;
  });

  const totalAmount = failed.reduce((s: number, t: FailedTx) => s + t.amount, 0);

  function exportCsv() {
    const rows = [
      ["Fecha", "Operación", "Pagador", "Email Pagador", "Negocio", "Email Negocio", "Monto", "Motivo"].join(","),
      ...filtered.map((t: FailedTx) => [
        new Date(t.createdAt).toLocaleDateString("es-MX"),
        t.operationNumber || "",
        `"${t.payerName || ""}"`,
        t.payerEmail || "",
        `"${t.ownerName || ""}"`,
        t.ownerEmail || "",
        t.amount.toFixed(2),
        `"${t.errorMessage}"`,
      ].join(","))
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cobros-fallidos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <XCircle className="w-6 h-6 text-red-500" />
            Cobros Fallidos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Todos los cobros rechazados en la plataforma con motivo de error
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-1" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Total fallidos</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{failed.length}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Monto perdido</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">
            ${totalAmount.toLocaleString("es-MX", { minimumFractionDigits: 0 })} MXN
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Error más común</p>
          <p className="text-sm font-bold text-amber-700 mt-1">
            {Object.entries(errorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Negocios afectados</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {new Set(failed.map((t: FailedTx) => t.userId)).size}
          </p>
        </div>
      </div>

      {/* Desglose por tipo de error */}
      {Object.keys(errorCounts).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-foreground mb-3">Desglose por motivo</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(errorCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([label, count]) => {
                const cat = getErrorCategory(label);
                return (
                  <span key={label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cat.color}`}>
                    {label}
                    <span className="bg-white/60 rounded-full px-1.5 py-0.5 font-bold">{count}</span>
                  </span>
                );
              })}
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por pagador, negocio, motivo u operación..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Cargando cobros fallidos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <AlertCircle className="w-10 h-10 mb-3 text-green-400" />
          <p className="font-semibold text-foreground">Sin cobros fallidos</p>
          <p className="text-sm mt-1">
            {search ? "No hay resultados para tu búsqueda." : "¡Excelente! No hay cobros rechazados en la plataforma."}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
            <div className="col-span-2">Fecha</div>
            <div className="col-span-2">Pagador</div>
            <div className="col-span-2">Negocio</div>
            <div className="col-span-1 text-right">Monto</div>
            <div className="col-span-5">Motivo del rechazo</div>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((tx: FailedTx) => {
              const cat = getErrorCategory(tx.errorMessage);
              return (
                <div key={tx.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {new Date(tx.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-foreground truncate">{tx.payerName || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{tx.payerEmail || ""}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-foreground truncate">{tx.ownerName || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{tx.ownerEmail || ""}</p>
                  </div>
                  <div className="md:col-span-1 text-right">
                    <p className="text-sm font-bold text-red-600">
                      ${tx.amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </p>
                    {tx.cardBrand && (
                      <p className="text-xs text-muted-foreground">{tx.cardBrand} ****{tx.cardLast4}</p>
                    )}
                  </div>
                  <div className="md:col-span-5 flex items-center gap-2">
                    <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${cat.color}`}>
                      <XCircle className="w-3 h-3" />
                      {cat.label}
                    </span>
                    <p className="text-sm text-foreground">{tx.errorMessage}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
