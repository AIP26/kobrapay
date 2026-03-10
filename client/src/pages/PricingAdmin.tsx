import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Save, RefreshCw, DollarSign, Percent, Tag, Layers } from "lucide-react";

const COLOR_OPTIONS = [
  { value: "emerald", label: "Verde", class: "bg-emerald-500" },
  { value: "cyan", label: "Cian", class: "bg-cyan-500" },
  { value: "violet", label: "Violeta", class: "bg-violet-500" },
  { value: "amber", label: "Ámbar", class: "bg-amber-500" },
  { value: "blue", label: "Azul", class: "bg-blue-500" },
  { value: "rose", label: "Rosa", class: "bg-rose-500" },
];

type PlanData = {
  id: number;
  planKey: string;
  name: string;
  description: string | null;
  totalRate: number;
  stripeRate: number;
  stripeFixed: number;
  kobrapayRate: number;
  kobrapayFixed: number;
  fixedFee: number;
  minVolume: number;
  maxVolume: number;
  color: string;
  features: string[];
  badge: string | null;
  isActive: boolean;
};

export default function PricingAdmin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<PlanData>>({});
  const [featuresText, setFeaturesText] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: plans = [], refetch, isLoading } = trpc.pricing.getAll.useQuery();
  const updateMutation = trpc.pricing.update.useMutation();

  if (!user?.isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Acceso restringido a superadmin.</p>
      </div>
    );
  }

  const startEdit = (plan: PlanData) => {
    setEditingId(plan.id);
    setEditData({ ...plan });
    setFeaturesText(plan.features.join("\n"));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
    setFeaturesText("");
  };

  const saveEdit = async () => {
    if (!editingId || !editData) return;
    setSaving(true);
    try {
      const features = featuresText.split("\n").map(f => f.trim()).filter(Boolean);
      await updateMutation.mutateAsync({
        id: editingId,
        name: editData.name,
        description: editData.description ?? undefined,
        totalRate: editData.totalRate,
        stripeRate: editData.stripeRate,
        stripeFixed: editData.stripeFixed,
        kobrapayRate: editData.kobrapayRate,
        kobrapayFixed: editData.kobrapayFixed,
        fixedFee: editData.fixedFee,
        minVolume: editData.minVolume,
        maxVolume: editData.maxVolume,
        color: editData.color,
        features,
        badge: editData.badge ?? null,
        isActive: editData.isActive,
      });
      toast.success("Plan actualizado", { description: "Los cambios se reflejan en la landing page inmediatamente." });
      await refetch();
      cancelEdit();
    } catch (e: any) {
      toast.error("Error al guardar", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const colorClass = (color: string) => {
    const map: Record<string, string> = {
      emerald: "bg-emerald-500", cyan: "bg-cyan-500", violet: "bg-violet-500",
      amber: "bg-amber-500", blue: "bg-blue-500", rose: "bg-rose-500",
    };
    return map[color] || "bg-gray-500";
  };

  const borderClass = (color: string) => {
    const map: Record<string, string> = {
      emerald: "border-emerald-500/40", cyan: "border-cyan-500/40", violet: "border-violet-500/40",
      amber: "border-amber-500/40", blue: "border-blue-500/40", rose: "border-rose-500/40",
    };
    return map[color] || "border-gray-500/40";
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestionar Precios</h1>
            <p className="text-sm text-muted-foreground">Los cambios se reflejan inmediatamente en la landing page, simuladores y calculadoras.</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3" />
            Actualizar
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(plans as PlanData[]).map((plan) => (
              <div key={plan.id} className={`rounded-xl border-2 ${borderClass(plan.color)} bg-card p-5`}>
                {editingId === plan.id ? (
                  /* ── MODO EDICIÓN ── */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-foreground text-lg">Editando: {plan.name}</h3>
                      <div className={`w-3 h-3 rounded-full ${colorClass(plan.color)}`} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Nombre del plan</Label>
                        <Input value={editData.name || ""} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} className="h-8 text-sm mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Badge (ej: Popular)</Label>
                        <Input value={editData.badge || ""} onChange={e => setEditData(d => ({ ...d, badge: e.target.value || null }))} className="h-8 text-sm mt-1" placeholder="Opcional" />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Descripción</Label>
                      <Input value={editData.description || ""} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))} className="h-8 text-sm mt-1" />
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Percent className="h-3 w-3" /> Tarifas</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Total %</Label>
                          <Input type="number" step="0.1" value={editData.totalRate ?? ""} onChange={e => setEditData(d => ({ ...d, totalRate: parseFloat(e.target.value) }))} className="h-8 text-sm mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Stripe %</Label>
                          <Input type="number" step="0.1" value={editData.stripeRate ?? ""} onChange={e => setEditData(d => ({ ...d, stripeRate: parseFloat(e.target.value) }))} className="h-8 text-sm mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">KobraPay %</Label>
                          <Input type="number" step="0.1" value={editData.kobrapayRate ?? ""} onChange={e => setEditData(d => ({ ...d, kobrapayRate: parseFloat(e.target.value) }))} className="h-8 text-sm mt-1" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Fijo total $MXN</Label>
                          <Input type="number" step="0.5" value={editData.fixedFee ?? ""} onChange={e => setEditData(d => ({ ...d, fixedFee: parseFloat(e.target.value) }))} className="h-8 text-sm mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Stripe fijo $</Label>
                          <Input type="number" step="0.5" value={editData.stripeFixed ?? ""} onChange={e => setEditData(d => ({ ...d, stripeFixed: parseFloat(e.target.value) }))} className="h-8 text-sm mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">KobraPay fijo $</Label>
                          <Input type="number" step="0.1" value={editData.kobrapayFixed ?? ""} onChange={e => setEditData(d => ({ ...d, kobrapayFixed: parseFloat(e.target.value) }))} className="h-8 text-sm mt-1" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Vol. mínimo $MXN/mes</Label>
                        <Input type="number" value={editData.minVolume ?? ""} onChange={e => setEditData(d => ({ ...d, minVolume: parseInt(e.target.value) }))} className="h-8 text-sm mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Vol. máximo $MXN/mes</Label>
                        <Input type="number" value={editData.maxVolume ?? ""} onChange={e => setEditData(d => ({ ...d, maxVolume: parseInt(e.target.value) }))} className="h-8 text-sm mt-1" />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Color del plan</Label>
                      <div className="flex gap-2 mt-1">
                        {COLOR_OPTIONS.map(c => (
                          <button key={c.value} onClick={() => setEditData(d => ({ ...d, color: c.value }))}
                            className={`w-6 h-6 rounded-full ${c.class} ring-2 ring-offset-2 ${editData.color === c.value ? 'ring-foreground' : 'ring-transparent'}`}
                            title={c.label} />
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Características (una por línea)</Label>
                      <textarea
                        value={featuresText}
                        onChange={e => setFeaturesText(e.target.value)}
                        rows={4}
                        className="w-full mt-1 text-sm rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Sin mensualidad&#10;Soporte por WhatsApp&#10;Links ilimitados"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={saveEdit} disabled={saving} className="gap-2 flex-1">
                        <Save className="h-3 w-3" />
                        {saving ? "Guardando..." : "Guardar cambios"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* ── MODO VISTA ── */
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${colorClass(plan.color)}`} />
                        <h3 className="font-bold text-foreground text-lg">{plan.name}</h3>
                        {plan.badge && <Badge variant="secondary" className="text-xs">{plan.badge}</Badge>}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => startEdit(plan)}>
                        Editar
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-muted/50 rounded-lg p-2 text-center">
                        <p className="text-lg font-black text-foreground">{plan.totalRate}%</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2 text-center">
                        <p className="text-lg font-black text-foreground">{plan.kobrapayRate}%</p>
                        <p className="text-xs text-muted-foreground">KobraPay</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2 text-center">
                        <p className="text-lg font-black text-foreground">${plan.fixedFee}</p>
                        <p className="text-xs text-muted-foreground">Fijo MXN</p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1 mb-4">
                      <p className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Stripe: {plan.stripeRate}% + ${plan.stripeFixed} MXN</p>
                      <p className="flex items-center gap-1"><Layers className="h-3 w-3" /> Volumen: ${plan.minVolume.toLocaleString()} — ${plan.maxVolume.toLocaleString()} MXN/mes</p>
                    </div>

                    <div className="space-y-1">
                      {plan.features.map((f, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${colorClass(plan.color)}`} />
                          {f}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-muted/30 rounded-xl border border-border">
          <p className="text-xs text-muted-foreground text-center">
            <strong>Nota:</strong> Los cambios se aplican inmediatamente en la landing page, el simulador de comisiones y la calculadora interactiva. No es necesario publicar de nuevo.
          </p>
        </div>
      </div>
    </div>
  );
}
