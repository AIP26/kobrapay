import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShoppingCart,
  Package,
  Plus,
  Minus,
  Trash2,
  Search,
  CreditCard,
  Copy,
  CheckCircle,
  X,
  QrCode,
  MessageCircle,
  ReceiptText,
  Keyboard,
  ChevronRight,
} from "lucide-react";
import { useLocation } from "wouter";
import { QRCodeSVG } from "qrcode.react";

type CartItem = {
  id: number;
  name: string;
  price: string;
  imageUrl: string | null;
  quantity: number;
  stock: number;
  trackStock: boolean;
};

export default function POS() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [creatingLink, setCreatingLink] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Cobro manual (sin productos del catálogo)
  const [manualAmount, setManualAmount] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualCreatedLink, setManualCreatedLink] = useState<string | null>(null);
  const [manualCreating, setManualCreating] = useState(false);
  const [manualCopied, setManualCopied] = useState(false);
  const [showManualQR, setShowManualQR] = useState(false);

  const { data: products = [], isLoading } = trpc.products.list.useQuery(
    { includeInactive: false },
    { refetchOnWindowFocus: false }
  );

  const createLinkMutation = trpc.paymentLinks.create.useMutation({
    onSuccess: (data) => {
      const url = `${window.location.origin}/pay/${data.token}`;
      setCreatedLink(url);
      setCreatingLink(false);
    },
    onError: (e) => {
      toast.error(e.message || "Error al crear el cobro");
      setCreatingLink(false);
    },
  });

  const createManualLinkMutation = trpc.paymentLinks.create.useMutation({
    onSuccess: (data) => {
      const url = `${window.location.origin}/pay/${data.token}`;
      setManualCreatedLink(url);
      setManualCreating(false);
    },
    onError: (e) => {
      toast.error(e.message || "Error al crear el cobro");
      setManualCreating(false);
    },
  });

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.category ?? "").toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0),
    [cart]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  function addToCart(product: typeof products[0]) {
    if (product.trackStock && product.stock <= 0) {
      toast.error("Sin stock disponible");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (product.trackStock && existing.quantity >= product.stock) {
          toast.error("No hay más stock disponible");
          return prev;
        }
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          quantity: 1,
          stock: product.stock,
          trackStock: product.trackStock,
        },
      ];
    });
  }

  function updateQty(id: number, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  function removeFromCart(id: number) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  function clearCart() {
    setCart([]);
    setShowCheckout(false);
    setCreatedLink(null);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setShowQR(false);
  }

  function clearManual() {
    setManualAmount("");
    setManualDescription("");
    setManualEmail("");
    setManualName("");
    setManualCreatedLink(null);
    setShowManualQR(false);
  }

  async function handleCreateLink() {
    if (cart.length === 0) return;
    if (!customerEmail.trim()) {
      toast.error("El email del cliente es requerido");
      return;
    }
    setCreatingLink(true);
    const description = cart.map((i) => `${i.name} x${i.quantity}`).join(", ");
    await createLinkMutation.mutateAsync({
      clientName: customerName.trim() || customerEmail.trim(),
      clientEmail: customerEmail.trim(),
      amount: cartTotal,
      description,
      currency: "MXN",
      expiresInDays: 1,
    });
  }

  async function handleCreateManualLink() {
    const amt = parseFloat(manualAmount);
    if (isNaN(amt) || amt <= 0) { toast.error("Ingresa un monto válido"); return; }
    if (!manualDescription.trim()) { toast.error("Ingresa una descripción"); return; }
    if (!manualEmail.trim()) { toast.error("El email del cliente es requerido"); return; }
    setManualCreating(true);
    await createManualLinkMutation.mutateAsync({
      clientName: manualName.trim() || manualEmail.trim(),
      clientEmail: manualEmail.trim(),
      amount: amt,
      description: manualDescription.trim(),
      currency: "MXN",
      expiresInDays: 1,
    });
  }

  async function copyLink() {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink);
    setCopied(true);
    toast.success("Enlace copiado");
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyManualLink() {
    if (!manualCreatedLink) return;
    await navigator.clipboard.writeText(manualCreatedLink);
    setManualCopied(true);
    toast.success("Enlace copiado");
    setTimeout(() => setManualCopied(false), 2000);
  }

  function shareWhatsApp(link: string) {
    const msg = encodeURIComponent(`Hola, aquí está tu enlace de pago: ${link}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(price);

  return (
    <DashboardLayout title="Punto de Venta">
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* ── Panel izquierdo: catálogo / cobro manual ─────────────────── */}
        <div className="flex-1 space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Punto de Venta</h1>
              <p className="text-muted-foreground text-sm">Selecciona productos o ingresa un cobro manual</p>
            </div>
            <Button
              variant="outline"
              className="border-gray-600 text-muted-foreground gap-2 hidden sm:flex"
              onClick={() => navigate("/dashboard/catalog")}
            >
              <Package className="w-4 h-4" /> Catálogo
            </Button>
          </div>

          <Tabs defaultValue="catalog">
            <TabsList className="bg-[#1e2436] border border-border">
              <TabsTrigger
                value="catalog"
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-foreground text-muted-foreground gap-2"
              >
                <Package className="w-4 h-4" /> Productos
              </TabsTrigger>
              <TabsTrigger
                value="manual"
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-foreground text-muted-foreground gap-2"
              >
                <Keyboard className="w-4 h-4" /> Cobro manual
              </TabsTrigger>
            </TabsList>

            {/* ── Tab: Catálogo ── */}
            <TabsContent value="catalog" className="mt-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-[#1e2436] border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-[#1e2436] rounded-xl h-44 animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Package className="w-14 h-14 text-muted-foreground mb-3" />
                  <p className="text-foreground font-semibold">
                    {search ? "Sin resultados" : "Sin productos en el catálogo"}
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {search
                      ? "Prueba con otro término."
                      : "Agrega productos en el módulo de Catálogo."}
                  </p>
                  {!search && (
                    <Button
                      className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-foreground gap-2"
                      onClick={() => navigate("/dashboard/catalog")}
                    >
                      <Plus className="w-4 h-4" /> Ir al Catálogo
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filtered.map((product) => {
                    const inCart = cart.find((i) => i.id === product.id);
                    const outOfStock = product.trackStock && product.stock <= 0;
                    return (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        disabled={outOfStock}
                        className={`relative bg-[#1e2436] rounded-xl overflow-hidden border text-left transition-all group ${
                          outOfStock
                            ? "border-border/30 opacity-50 cursor-not-allowed"
                            : inCart
                            ? "border-emerald-500/60 hover:border-emerald-400"
                            : "border-border/50 hover:border-emerald-500/40"
                        }`}
                      >
                        <div className="h-28 bg-[#151929] flex items-center justify-center overflow-hidden">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <Package className="w-10 h-10 text-muted-foreground" />
                          )}
                          {outOfStock && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-red-400 text-xs font-semibold">Sin stock</span>
                            </div>
                          )}
                        </div>
                        {inCart && (
                          <div className="absolute top-2 right-2 bg-emerald-500 text-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {inCart.quantity}
                          </div>
                        )}
                        <div className="p-3">
                          <p className="text-foreground text-sm font-semibold truncate">{product.name}</p>
                          {product.category && (
                            <p className="text-muted-foreground text-xs truncate">{product.category}</p>
                          )}
                          <p className="text-emerald-400 font-bold text-sm mt-1">
                            {formatPrice(parseFloat(product.price))}
                          </p>
                          {product.trackStock && (
                            <p
                              className={`text-xs mt-0.5 ${
                                product.stock <= product.lowStockAlert
                                  ? "text-amber-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              Stock: {product.stock}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── Tab: Cobro manual ── */}
            <TabsContent value="manual" className="mt-4">
              <div className="bg-[#1e2436] rounded-xl p-6 border border-border max-w-md space-y-4">
                <div>
                  <p className="text-foreground font-semibold">Cobro rápido</p>
                  <p className="text-muted-foreground text-sm mt-0.5">
                    Genera un cobro sin usar el catálogo de productos.
                  </p>
                </div>

                {!manualCreatedLink ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Monto (MXN) *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          placeholder="0.00"
                          value={manualAmount}
                          onChange={(e) => setManualAmount(e.target.value)}
                          className="pl-7 bg-[#151929] border-gray-600 text-foreground text-xl font-bold h-12"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Descripción *</Label>
                      <Input
                        placeholder="Ej: Servicio de consultoría"
                        value={manualDescription}
                        onChange={(e) => setManualDescription(e.target.value)}
                        className="bg-[#151929] border-gray-600 text-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Email del cliente *</Label>
                      <Input
                        type="email"
                        placeholder="cliente@email.com"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        className="bg-[#151929] border-gray-600 text-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Nombre (opcional)</Label>
                      <Input
                        placeholder="Nombre del cliente"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        className="bg-[#151929] border-gray-600 text-foreground"
                      />
                    </div>
                    <Button
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-foreground gap-2 h-11"
                      onClick={handleCreateManualLink}
                      disabled={manualCreating}
                    >
                      {manualCreating ? (
                        "Generando..."
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" /> Generar cobro
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center py-2">
                      <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                      </div>
                      <p className="text-foreground font-bold text-lg">
                        {formatPrice(parseFloat(manualAmount))}
                      </p>
                      <p className="text-muted-foreground text-sm">{manualDescription}</p>
                    </div>
                    <div className="bg-[#151929] rounded-xl p-3 flex items-center gap-2">
                      <p className="text-emerald-400 text-sm flex-1 truncate">{manualCreatedLink}</p>
                      <button
                        onClick={copyManualLink}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {manualCopied ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-foreground gap-1 text-xs"
                        onClick={() => shareWhatsApp(manualCreatedLink)}
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        className="border-gray-600 text-muted-foreground gap-1 text-xs"
                        onClick={copyManualLink}
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar
                      </Button>
                      <Button
                        variant="outline"
                        className="border-gray-600 text-muted-foreground gap-1 text-xs"
                        onClick={() => setShowManualQR(true)}
                      >
                        <QrCode className="w-3.5 h-3.5" /> QR
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full border-gray-600 text-muted-foreground"
                      onClick={clearManual}
                    >
                      Nuevo cobro
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Panel derecho: Carrito ─────────────────────────────────── */}
        <div className="lg:w-80 xl:w-96 shrink-0">
          <div className="bg-[#1e2436] rounded-xl border border-border overflow-hidden sticky top-6">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <span className="text-foreground font-semibold">Carrito</span>
                {cartCount > 0 && (
                  <Badge className="bg-emerald-500 text-foreground text-xs">{cartCount}</Badge>
                )}
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Items */}
            <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">El carrito está vacío</p>
                  <p className="text-muted-foreground text-xs mt-1">Toca un producto para agregarlo</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-10 h-10 bg-[#151929] rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium truncate">{item.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {formatPrice(parseFloat(item.price))}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="w-6 h-6 rounded-md bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-foreground transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-foreground text-sm font-semibold w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="w-6 h-6 rounded-md bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-foreground transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-6 h-6 rounded-md hover:bg-red-900/30 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors ml-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total y cobrar */}
            {cart.length > 0 && (
              <div className="border-t border-border p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">
                    {cartCount} {cartCount === 1 ? "producto" : "productos"}
                  </span>
                  <span className="text-foreground font-bold text-xl">{formatPrice(cartTotal)}</span>
                </div>
                <Button
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-foreground gap-2 h-11 font-semibold"
                  onClick={() => setShowCheckout(true)}
                >
                  <CreditCard className="w-4 h-4" /> Cobrar {formatPrice(cartTotal)}
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Checkout (carrito) ───────────────────────────────────── */}
      <Dialog
        open={showCheckout}
        onOpenChange={(v) => {
          if (!v && !createdLink) setShowCheckout(false);
        }}
      >
        <DialogContent className="bg-[#1e2436] border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-emerald-400" />
              {createdLink ? "¡Cobro generado!" : "Datos del cliente"}
            </DialogTitle>
          </DialogHeader>

          {createdLink ? (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-9 h-9 text-emerald-400" />
                </div>
                <p className="text-foreground font-bold text-lg">{formatPrice(cartTotal)}</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Enlace de pago listo. Compártelo con tu cliente.
                </p>
              </div>
              <div className="bg-[#151929] rounded-xl p-3 flex items-center gap-2">
                <p className="text-emerald-400 text-sm flex-1 truncate">{createdLink}</p>
                <button
                  onClick={copyLink}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="bg-[#151929] rounded-xl p-3 space-y-1">
                <p className="text-muted-foreground text-xs font-medium mb-2">Resumen</p>
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.name} ×{item.quantity}
                    </span>
                    <span className="text-foreground">
                      {formatPrice(parseFloat(item.price) * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-2 border-t border-border mt-1">
                  <span className="text-foreground">Total</span>
                  <span className="text-emerald-400">{formatPrice(cartTotal)}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-foreground gap-1 text-xs"
                  onClick={() => shareWhatsApp(createdLink)}
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="border-gray-600 text-muted-foreground gap-1 text-xs"
                  onClick={copyLink}
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </Button>
                <Button
                  variant="outline"
                  className="border-gray-600 text-muted-foreground gap-1 text-xs"
                  onClick={() => setShowQR(true)}
                >
                  <QrCode className="w-3.5 h-3.5" /> QR
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-muted-foreground text-sm">
                Ingresa los datos del cliente para generar el enlace de pago.
              </p>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Email del cliente *</Label>
                <Input
                  type="email"
                  placeholder="cliente@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="bg-[#151929] border-gray-600 text-foreground"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Nombre (opcional)</Label>
                <Input
                  placeholder="Nombre del cliente"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-[#151929] border-gray-600 text-foreground"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Teléfono (opcional)</Label>
                <Input
                  placeholder="+52 55 1234 5678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="bg-[#151929] border-gray-600 text-foreground"
                />
              </div>
              <div className="bg-[#151929] rounded-xl p-3 space-y-1">
                <p className="text-muted-foreground text-xs font-medium mb-2">Resumen del cobro</p>
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.name} ×{item.quantity}
                    </span>
                    <span className="text-foreground">
                      {formatPrice(parseFloat(item.price) * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-2 border-t border-border mt-1">
                  <span className="text-foreground">Total</span>
                  <span className="text-emerald-400">{formatPrice(cartTotal)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {createdLink ? (
              <>
                <Button
                  variant="outline"
                  onClick={clearCart}
                  className="border-gray-600 text-muted-foreground"
                >
                  Nuevo cobro
                </Button>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 text-foreground gap-2"
                  onClick={() => window.open(createdLink, "_blank")}
                >
                  <CreditCard className="w-4 h-4" /> Abrir enlace
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowCheckout(false)}
                  className="border-gray-600 text-muted-foreground"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateLink}
                  disabled={creatingLink}
                  className="bg-emerald-500 hover:bg-emerald-600 text-foreground gap-2"
                >
                  {creatingLink ? (
                    "Generando..."
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" /> Generar cobro
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal QR (carrito) ─────────────────────────────────────────── */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="bg-[#1e2436] border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-400" /> Código QR de pago
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4 gap-4">
            <div className="bg-white p-4 rounded-2xl">
              {createdLink && <QRCodeSVG value={createdLink} size={200} />}
            </div>
            <p className="text-muted-foreground text-sm text-center">
              El cliente puede escanear este código para acceder al enlace de pago.
            </p>
            <p className="text-emerald-400 text-xs text-center break-all">{createdLink}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowQR(false)}
              className="border-gray-600 text-muted-foreground w-full"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal QR (cobro manual) ────────────────────────────────────── */}
      <Dialog open={showManualQR} onOpenChange={setShowManualQR}>
        <DialogContent className="bg-[#1e2436] border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-400" /> Código QR de pago
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4 gap-4">
            <div className="bg-white p-4 rounded-2xl">
              {manualCreatedLink && <QRCodeSVG value={manualCreatedLink} size={200} />}
            </div>
            <p className="text-muted-foreground text-sm text-center">
              El cliente puede escanear este código para acceder al enlace de pago.
            </p>
            <p className="text-emerald-400 text-xs text-center break-all">{manualCreatedLink}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowManualQR(false)}
              className="border-gray-600 text-muted-foreground w-full"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
