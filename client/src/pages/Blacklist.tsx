import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldBan, Plus, Trash2, Mail, CreditCard, AlertTriangle, Search, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Blacklist() {
  const [search, setSearch] = useState("");
  const [newType, setNewType] = useState<"email" | "card_last4">("email");
  const [newValue, setNewValue] = useState("");
  const [newReason, setNewReason] = useState("");
  const [newPayerName, setNewPayerName] = useState("");
  const [removeId, setRemoveId] = useState<number | null>(null);

  const { data: blacklist = [], refetch } = trpc.blacklist.list.useQuery();

  const addMutation = trpc.blacklist.add.useMutation({
    onSuccess: () => {
      toast.success("Pagador bloqueado. Se agregó a la lista negra correctamente.");
      setNewValue("");
      setNewReason("");
      setNewPayerName("");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const removeMutation = trpc.blacklist.remove.useMutation({
    onSuccess: () => {
      toast.success("El pagador fue removido de la lista negra.");
      setRemoveId(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const filtered = blacklist.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.value.toLowerCase().includes(q) ||
      (item.payerName || "").toLowerCase().includes(q) ||
      (item.reason || "").toLowerCase().includes(q)
    );
  });

  const handleAdd = () => {
    if (!newValue.trim()) {
      toast.error("Ingresa el email o últimos 4 dígitos.");
      return;
    }
    if (newType === "email" && !newValue.includes("@")) {
      toast.error("Ingresa un correo electrónico válido.");
      return;
    }
    if (newType === "card_last4" && !/^\d{4}$/.test(newValue)) {
      toast.error("Ingresa exactamente 4 dígitos.");
      return;
    }
    addMutation.mutate({ type: newType, value: newValue.trim(), reason: newReason.trim() || undefined, payerName: newPayerName.trim() || undefined });
  };

  const [, navigate] = useLocation();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Botón Atrás */}
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al Panel
      </button>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-red-500/10">
          <ShieldBan className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lista Negra</h1>
          <p className="text-sm text-muted-foreground">Pagadores bloqueados — no podrán completar ningún pago en tu plataforma</p>
        </div>
      </div>

      {/* Alerta informativa */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-6 mt-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-700 dark:text-amber-400">
          <span className="font-semibold">Protección automática:</span> Cuando Stripe reporta un contracargo, el email del pagador se agrega automáticamente a esta lista. También puedes agregar pagadores manualmente.
        </div>
      </div>

      {/* Formulario para agregar */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Agregar pagador manualmente
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex gap-2">
            <Select value={newType} onValueChange={(v) => setNewType(v as "email" | "card_last4")}>
              <SelectTrigger className="w-36 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="card_last4">Últimos 4 dígitos</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={newType === "email" ? "correo@ejemplo.com" : "1234"}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              maxLength={newType === "card_last4" ? 4 : 320}
            />
          </div>
          <Input
            placeholder="Nombre del pagador (opcional)"
            value={newPayerName}
            onChange={(e) => setNewPayerName(e.target.value)}
          />
          <Input
            placeholder="Motivo del bloqueo (opcional)"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            className="md:col-span-2"
          />
        </div>
        <Button
          className="mt-3 bg-red-600 hover:bg-red-700 text-white"
          onClick={handleAdd}
          disabled={addMutation.isPending}
        >
          {addMutation.isPending ? "Bloqueando..." : "Bloquear pagador"}
        </Button>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por email, nombre o motivo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShieldBan className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{search ? "Sin resultados" : "Lista negra vacía"}</p>
          <p className="text-sm mt-1">{search ? "Intenta con otro término" : "Los pagadores bloqueados aparecerán aquí"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${item.type === "email" ? "bg-blue-500/10" : "bg-purple-500/10"}`}>
                  {item.type === "email" ? (
                    <Mail className="w-4 h-4 text-blue-500" />
                  ) : (
                    <CreditCard className="w-4 h-4 text-purple-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground truncate">{item.value}</span>
                    {item.payerName && (
                      <span className="text-xs text-muted-foreground">— {item.payerName}</span>
                    )}
                    <Badge variant={item.isActive ? "destructive" : "secondary"} className="text-xs">
                      {item.isActive ? "Bloqueado" : "Inactivo"}
                    </Badge>
                    {item.chargebackId && (
                      <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600">
                        Contracargo
                      </Badge>
                    )}
                  </div>
                  {item.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.reason}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Bloqueado el {new Date(item.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                    {item.chargebackAmount && (
                      <span className="ml-2 text-red-500 font-medium">
                        Monto disputa: ${(item.chargebackAmount / 100).toFixed(2)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                onClick={() => setRemoveId(item.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={removeId !== null} onOpenChange={(open) => !open && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desbloquear pagador?</AlertDialogTitle>
            <AlertDialogDescription>
              Este pagador podrá volver a realizar pagos en tu plataforma. Puedes volver a bloquearlo en cualquier momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => removeId !== null && removeMutation.mutate({ id: removeId })}
            >
              Sí, desbloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
