import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Phone,
  Mail,
  Building2,
  User,
  Edit3,
  Trash2,
  BookUser,
  X,
  StickyNote,
  ChevronDown,
} from "lucide-react";

// ─── Categorías de proveedores ────────────────────────────────────────────────
const SUPPLIER_CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  food:        { label: "Alimentos y Bebidas",  emoji: "🥩", color: "bg-orange-100 text-orange-800" },
  tech:        { label: "Tecnología",           emoji: "💻", color: "bg-blue-100 text-blue-800" },
  cleaning:    { label: "Limpieza",             emoji: "🧹", color: "bg-cyan-100 text-cyan-800" },
  health:      { label: "Salud y Farmacia",     emoji: "💊", color: "bg-red-100 text-red-800" },
  transport:   { label: "Transporte y Logística", emoji: "🚚", color: "bg-yellow-100 text-yellow-800" },
  office:      { label: "Papelería y Oficina",  emoji: "📎", color: "bg-indigo-100 text-indigo-800" },
  maintenance: { label: "Mantenimiento",        emoji: "🔧", color: "bg-gray-100 text-foreground" },
  marketing:   { label: "Marketing y Publicidad", emoji: "📣", color: "bg-pink-100 text-pink-800" },
  finance:     { label: "Finanzas y Contabilidad", emoji: "💰", color: "bg-green-100 text-green-800" },
  legal:       { label: "Legal y Notaría",      emoji: "⚖️", color: "bg-purple-100 text-purple-800" },
  other:       { label: "Otros",                emoji: "📦", color: "bg-slate-100 text-slate-800" },
};

type Supplier = {
  id: number;
  ownerId: number;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  category: string;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Modal de Crear/Editar Proveedor ─────────────────────────────────────────
function SupplierFormModal({
  supplier,
  onClose,
  onSaved,
}: {
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    name: supplier?.name || "",
    company: supplier?.company || "",
    phone: supplier?.phone || "",
    email: supplier?.email || "",
    category: supplier?.category || "other",
    notes: supplier?.notes || "",
  });

  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      toast.success("Proveedor agregado ✅");
      utils.suppliers.list.invalidate();
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.suppliers.update.useMutation({
    onSuccess: () => {
      toast.success("Proveedor actualizado ✅");
      utils.suppliers.list.invalidate();
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    if (supplier) {
      updateMutation.mutate({ id: supplier.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookUser className="w-5 h-5 text-orange-500" />
            {supplier ? "Editar Proveedor" : "Nuevo Proveedor"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nombre */}
          <div>
            <Label>Nombre del contacto *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Carlos Ramírez"
              className="mt-1"
            />
          </div>

          {/* Empresa */}
          <div>
            <Label>Empresa / Negocio</Label>
            <Input
              value={form.company}
              onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              placeholder="Ej: Distribuidora La Fruta S.A."
              className="mt-1"
            />
          </div>

          {/* Teléfono y Email en grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Teléfono</Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+52 55 1234 5678"
                className="mt-1"
                type="tel"
              />
            </div>
            <div>
              <Label>Correo electrónico</Label>
              <Input
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="contacto@empresa.com"
                className="mt-1"
                type="email"
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <Label>Categoría</Label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-background"
            >
              {Object.entries(SUPPLIER_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {v.label}</option>
              ))}
            </select>
          </div>

          {/* Notas */}
          <div>
            <Label>Notas <span className="text-muted-foreground font-normal">(dirección, horarios, condiciones, etc.)</span></Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Ej: Entrega los martes y jueves. Mínimo de compra $500. Acepta transferencia."
              rows={3}
              className="mt-1 text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !form.name.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-foreground"
          >
            {isPending ? "Guardando..." : supplier ? "Guardar cambios" : "Agregar proveedor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tarjeta de proveedor ─────────────────────────────────────────────────────
function SupplierCard({
  supplier,
  onEdit,
  onDelete,
}: {
  supplier: Supplier;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const cat = SUPPLIER_CATEGORIES[supplier.category] || SUPPLIER_CATEGORIES.other;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-foreground font-bold text-base">{supplier.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{supplier.name}</p>
            {supplier.company && (
              <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                <Building2 className="w-3 h-3 shrink-0" />
                {supplier.company}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={onEdit}
            className="p-1.5 text-muted-foreground hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Categoría */}
      <div className="mb-3">
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>
          {cat.emoji} {cat.label}
        </span>
      </div>

      {/* Datos de contacto */}
      <div className="space-y-1.5">
        {supplier.phone && (
          <a
            href={`tel:${supplier.phone}`}
            className="flex items-center gap-2 text-sm text-foreground hover:text-orange-600 transition-colors group"
          >
            <Phone className="w-3.5 h-3.5 text-muted-foreground group-hover:text-orange-500 shrink-0" />
            <span className="truncate">{supplier.phone}</span>
          </a>
        )}
        {supplier.email && (
          <a
            href={`mailto:${supplier.email}`}
            className="flex items-center gap-2 text-sm text-foreground hover:text-orange-600 transition-colors group"
          >
            <Mail className="w-3.5 h-3.5 text-muted-foreground group-hover:text-orange-500 shrink-0" />
            <span className="truncate">{supplier.email}</span>
          </a>
        )}
        {!supplier.phone && !supplier.email && (
          <p className="text-xs text-muted-foreground italic">Sin datos de contacto</p>
        )}
      </div>

      {/* Notas expandibles */}
      {supplier.notes && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => setShowNotes(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
          >
            <StickyNote className="w-3 h-3" />
            <span>Notas</span>
            <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showNotes ? "rotate-180" : ""}`} />
          </button>
          {showNotes && (
            <p className="mt-2 text-xs text-muted-foreground bg-amber-50 rounded-lg p-2 border border-amber-100 leading-relaxed">
              {supplier.notes}
            </p>
          )}
        </div>
      )}

      {/* Botones de acción rápida */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
        {supplier.phone && (
          <a
            href={`https://wa.me/${supplier.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg py-1.5 transition-colors"
          >
            <span>📱</span> WhatsApp
          </a>
        )}
        {supplier.email && (
          <a
            href={`mailto:${supplier.email}`}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg py-1.5 transition-colors"
          >
            <Mail className="w-3 h-3" /> Email
          </a>
        )}
        {!supplier.phone && !supplier.email && (
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg py-1.5 transition-colors"
          >
            <Edit3 className="w-3 h-3" /> Agregar contacto
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Proveedores() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const utils = trpc.useUtils();

  const { data: suppliers = [], isLoading } = trpc.suppliers.list.useQuery({
    category: activeCategory !== "all" ? activeCategory : undefined,
  });

  const deleteMutation = trpc.suppliers.delete.useMutation({
    onSuccess: () => {
      toast.success("Proveedor eliminado");
      utils.suppliers.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Filtrar por búsqueda en el cliente (instantáneo)
  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers as Supplier[];
    const q = search.toLowerCase();
    return (suppliers as Supplier[]).filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.company || "").toLowerCase().includes(q) ||
      (s.phone || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.notes || "").toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const handleDelete = (supplier: Supplier) => {
    if (confirm(`¿Eliminar a "${supplier.name}" de tu agenda?`)) {
      deleteMutation.mutate({ id: supplier.id });
    }
  };

  // Contar por categoría
  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    (suppliers as Supplier[]).forEach(s => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, [suppliers]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BookUser className="w-6 h-6 text-orange-500" />
              Agenda de Proveedores
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Registra y encuentra rápidamente tus contactos de proveedores
            </p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-orange-500 hover:bg-orange-600 text-foreground"
          >
            <Plus className="w-4 h-4 mr-1" /> Nuevo Proveedor
          </Button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, empresa, teléfono, correo o notas..."
            className="w-full pl-11 pr-10 py-3 border border-gray-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtros por categoría */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === "all"
                ? "bg-card text-foreground"
                : "bg-white border border-gray-300 text-muted-foreground hover:border-gray-400"
            }`}
          >
            Todos {suppliers.length > 0 && <span className="ml-1 opacity-70">({suppliers.length})</span>}
          </button>
          {Object.entries(SUPPLIER_CATEGORIES).map(([k, v]) => {
            const count = countByCategory[k] || 0;
            if (count === 0 && activeCategory !== k) return null;
            return (
              <button
                key={k}
                onClick={() => setActiveCategory(k)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === k
                    ? "bg-card text-foreground"
                    : "bg-white border border-gray-300 text-muted-foreground hover:border-gray-400"
                }`}
              >
                {v.emoji} {v.label} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Estadísticas rápidas */}
        {!isLoading && suppliers.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{suppliers.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total proveedores</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {(suppliers as Supplier[]).filter(s => s.phone).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Con teléfono</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {(suppliers as Supplier[]).filter(s => s.email).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Con correo</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {Object.keys(countByCategory).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Categorías</p>
            </div>
          </div>
        )}

        {/* Resultado de búsqueda */}
        {search && (
          <p className="text-sm text-muted-foreground">
            {filtered.length === 0
              ? `Sin resultados para "${search}"`
              : `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""} para "${search}"`}
          </p>
        )}

        {/* Lista de proveedores */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-1 w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-gray-100 rounded mb-2 w-1/3" />
                <div className="h-3 bg-gray-100 rounded mb-1" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            {suppliers.length === 0 ? (
              // Estado vacío inicial
              <div className="max-w-sm mx-auto">
                <div className="text-6xl mb-4">📒</div>
                <h3 className="text-xl font-bold text-foreground mb-2">Tu agenda está vacía</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Agrega tus proveedores para tenerlos siempre a la mano. Podrás buscarlos rápidamente cuando los necesites.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                  {[
                    { icon: "🥩", text: "Proveedor de alimentos" },
                    { icon: "🔧", text: "Técnico de mantenimiento" },
                    { icon: "🚚", text: "Empresa de logística" },
                    { icon: "💊", text: "Farmacia o laboratorio" },
                  ].map((item, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                      <span className="text-xl">{item.icon}</span>
                      <p className="text-xs text-muted-foreground mt-1">{item.text}</p>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => setShowCreate(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-foreground"
                >
                  <Plus className="w-4 h-4 mr-1" /> Agregar primer proveedor
                </Button>
              </div>
            ) : (
              // Sin resultados de búsqueda
              <div>
                <div className="text-5xl mb-3">🔍</div>
                <p className="text-lg font-medium text-foreground">Sin resultados</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No encontramos proveedores con "{search}"
                </p>
                <button
                  onClick={() => setSearch("")}
                  className="mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Limpiar búsqueda
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(supplier => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                onEdit={() => setEditingSupplier(supplier)}
                onDelete={() => handleDelete(supplier)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modales */}
      {showCreate && (
        <SupplierFormModal
          supplier={null}
          onClose={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
        />
      )}
      {editingSupplier && (
        <SupplierFormModal
          supplier={editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onSaved={() => setEditingSupplier(null)}
        />
      )}
    </DashboardLayout>
  );
}
