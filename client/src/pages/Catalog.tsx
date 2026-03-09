import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Search,
} from "lucide-react";

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  category: string | null;
  imageUrl: string | null;
  trackStock: boolean;
  stock: number;
  lowStockAlert: number;
  isActive: boolean;
  createdAt: Date;
};

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  category: "",
  imageUrl: "",
  trackStock: false,
  stock: 0,
  lowStockAlert: 5,
};

export default function Catalog() {
  const utils = trpc.useUtils();

  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data: products = [], isLoading } = trpc.products.list.useQuery(
    { includeInactive: showInactive },
    { refetchOnWindowFocus: false }
  );

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      toast.success("Producto creado", { description: "El producto fue agregado al catálogo." });
      closeForm();
    },
    onError: (e) => toast.error(e.message || "Error"),
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      toast.success("Producto actualizado");
      closeForm();
    },
    onError: (e) => toast.error(e.message || "Error"),
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      toast.success("Producto eliminado");
      setDeleteTarget(null);
    },
  });

  const toggleActiveMutation = trpc.products.update.useMutation({
    onSuccess: () => utils.products.list.invalidate(),
  });

  const adjustStockMutation = trpc.products.adjustStock.useMutation({
    onSuccess: () => utils.products.list.invalidate(),
  });

  function openCreate() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditingProduct(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: p.price,
      category: p.category ?? "",
      imageUrl: p.imageUrl ?? "",
      trackStock: p.trackStock,
      stock: p.stock,
      lowStockAlert: p.lowStockAlert,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error("El nombre es requerido");
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) return toast.error("Precio inválido");

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price,
        category: form.category.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        trackStock: form.trackStock,
        stock: form.trackStock ? form.stock : 0,
        lowStockAlert: form.lowStockAlert,
      };
      if (editingProduct) {
        await updateMutation.mutateAsync({ id: editingProduct.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } finally {
      setSaving(false);
    }
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const formatPrice = (price: string) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(parseFloat(price));

  return (
    <DashboardLayout title="Catálogo / Inventario">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Catálogo de Productos</h1>
            <p className="text-muted-foreground text-sm mt-1">Administra tus productos y su inventario</p>
          </div>
          <Button onClick={openCreate} className="bg-emerald-500 hover:bg-emerald-600 text-foreground gap-2">
            <Plus className="w-4 h-4" /> Agregar Producto
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            <span>Mostrar inactivos</span>
          </div>
        </div>

        {/* Lista de productos */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-muted rounded-xl h-64 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-foreground font-semibold text-lg">Sin productos</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs">
              {search ? "No hay productos que coincidan con tu búsqueda." : "Agrega tu primer producto al catálogo para comenzar."}
            </p>
            {!search && (
              <Button onClick={openCreate} className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-foreground gap-2">
                <Plus className="w-4 h-4" /> Agregar Producto
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((product) => (
              <div
                key={product.id}
                className={`bg-muted rounded-xl overflow-hidden border transition-all ${
                  product.isActive ? "border-border/50 hover:border-emerald-500/30" : "border-red-900/30 opacity-60"
                }`}
              >
                {/* Imagen */}
                <div className="h-40 bg-muted flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-foreground font-semibold text-sm truncate">{product.name}</h3>
                      {product.category && (
                        <span className="text-xs text-muted-foreground">{product.category}</span>
                      )}
                    </div>
                    {!product.isActive && <Badge variant="destructive" className="text-xs shrink-0">Inactivo</Badge>}
                  </div>

                  <p className="text-emerald-400 font-bold text-lg">{formatPrice(product.price)}</p>

                  {product.description && (
                    <p className="text-muted-foreground text-xs line-clamp-2">{product.description}</p>
                  )}

                  {/* Stock */}
                  {product.trackStock && (
                    <div className={`flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 ${
                      product.stock <= product.lowStockAlert
                        ? "bg-red-900/30 text-red-400"
                        : "bg-emerald-900/20 text-emerald-400"
                    }`}>
                      {product.stock <= product.lowStockAlert && <AlertTriangle className="w-3 h-3" />}
                      <span>Stock: {product.stock} unidades</span>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs border-border text-muted-foreground hover:text-foreground hover:border-emerald-500"
                      onClick={() => openEdit(product)}
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-8 px-2 border-border ${product.isActive ? "text-yellow-400 hover:border-yellow-500" : "text-emerald-400 hover:border-emerald-500"}`}
                      onClick={() => toggleActiveMutation.mutate({ id: product.id, isActive: !product.isActive })}
                      title={product.isActive ? "Desactivar" : "Activar"}
                    >
                      {product.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 border-border text-red-400 hover:border-red-500"
                      onClick={() => setDeleteTarget(product)}
                      title="Eliminar"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Ajuste de stock rápido */}
                  {product.trackStock && product.isActive && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-muted-foreground flex-1">Ajustar stock:</span>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-border text-foreground" onClick={() => adjustStockMutation.mutate({ id: product.id, delta: -1 })}>−</Button>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-border text-foreground" onClick={() => adjustStockMutation.mutate({ id: product.id, delta: 1 })}>+</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      <Dialog open={showForm} onOpenChange={(v) => !v && closeForm()}>
        <DialogContent className="bg-muted border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground">Nombre del producto *</Label>
              <Input
                placeholder="Ej: Camisa talla M"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Precio (MXN) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Categoría</Label>
                <Input
                  placeholder="Ej: Ropa, Electrónica"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="bg-muted border-border text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground">Descripción (opcional)</Label>
              <Textarea
                placeholder="Describe el producto..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-muted border-border text-foreground resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> URL de imagen (opcional)
              </Label>
              <Input
                placeholder="https://..."
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="bg-muted border-border text-foreground"
              />
              {form.imageUrl && (
                <img src={form.imageUrl} alt="preview" className="w-full h-32 object-cover rounded-lg mt-2" onError={(e) => (e.currentTarget.style.display = "none")} />
              )}
            </div>

            {/* Control de stock */}
            <div className="bg-muted rounded-xl p-4 space-y-3 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground font-medium text-sm">Control de inventario</p>
                  <p className="text-muted-foreground text-xs">Activa para llevar conteo de stock</p>
                </div>
                <Switch
                  checked={form.trackStock}
                  onCheckedChange={(v) => setForm({ ...form, trackStock: v })}
                />
              </div>

              {form.trackStock && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Stock inicial</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                      className="bg-muted border-border text-foreground h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Alerta de stock bajo</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.lowStockAlert}
                      onChange={(e) => setForm({ ...form, lowStockAlert: parseInt(e.target.value) || 0 })}
                      className="bg-muted border-border text-foreground h-8 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeForm} className="border-border text-muted-foreground">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-foreground">
              {saving ? "Guardando..." : editingProduct ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-muted border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              El producto <strong className="text-foreground">"{deleteTarget?.name}"</strong> será desactivado y ya no aparecerá en el catálogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-muted-foreground bg-transparent">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-foreground"
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
