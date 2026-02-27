import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart,
  Wifi,
  Battery,
  CreditCard,
  Shield,
  CheckCircle2,
  Smartphone,
  Zap,
  Package,
  MapPin,
  Phone,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const READERS = [
  {
    id: "bbpos-chipper",
    name: "KobraPay Nano",
    subtitle: "Lector Bluetooth compacto",
    price: 1299,
    image: "📱",
    features: [
      "Conexión Bluetooth con tu teléfono",
      "Acepta chip, banda magnética y NFC",
      "Batería de larga duración (8 hrs)",
      "Compatible con iOS y Android",
      "Sin cuotas mensuales",
    ],
    badge: "Más popular",
    badgeColor: "bg-emerald-500",
  },
  {
    id: "wispos-e",
    name: "KobraPay Pro",
    subtitle: "Terminal con pantalla táctil",
    price: 3499,
    image: "🖥️",
    features: [
      "Pantalla táctil de 5 pulgadas",
      "WiFi + 4G integrado",
      "Impresora de tickets incorporada",
      "Batería de 12 horas",
      "Teclado físico para PIN",
      "Acepta chip, banda y NFC (contactless)",
    ],
    badge: "Recomendado para negocios",
    badgeColor: "bg-blue-500",
  },
];

export default function Reader() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", quantity: "1" });

  const selectedReader = READERS.find(r => r.id === selected);

  const handleOrder = () => {
    if (!form.name || !form.phone || !form.address || !form.city) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    toast.success(`¡Solicitud enviada! Te contactaremos en 24 hrs para confirmar tu pedido de ${selectedReader?.name}.`);
    setShowForm(false);
    setForm({ name: "", phone: "", address: "", city: "", quantity: "1" });
    setSelected(null);
  };

  return (
    <DashboardLayout title="Compra tu Lector">
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Compra tu Lector KobraPay</h1>
          <p className="text-gray-500">Acepta pagos con tarjeta en tu negocio físico. Sin rentas mensuales, solo pagas por transacción exitosa.</p>
        </div>

        {/* Benefits bar */}
        <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-100 rounded-2xl p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Shield, text: "Sin mensualidades" },
              { icon: Zap, text: "Activación inmediata" },
              { icon: Wifi, text: "WiFi + Bluetooth" },
              { icon: Package, text: "Envío a todo México" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reader Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {READERS.map((reader) => (
            <div
              key={reader.id}
              className={`relative bg-white rounded-2xl border-2 transition-all cursor-pointer ${
                selected === reader.id
                  ? "border-emerald-500 shadow-lg shadow-emerald-100"
                  : "border-gray-100 hover:border-emerald-200 shadow-sm"
              }`}
              onClick={() => setSelected(reader.id)}
            >
              {reader.badge && (
                <div className={`absolute -top-3 left-6 ${reader.badgeColor} text-white text-xs font-semibold px-3 py-1 rounded-full`}>
                  {reader.badge}
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-4xl mb-2">{reader.image}</div>
                    <h3 className="text-lg font-bold text-gray-900">{reader.name}</h3>
                    <p className="text-sm text-gray-500">{reader.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">${reader.price.toLocaleString("es-MX")}</p>
                    <p className="text-xs text-gray-400">MXN + IVA</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {reader.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {selected === reader.id && (
                  <Button
                    className="w-full mt-5 bg-emerald-500 hover:bg-emerald-400 text-white"
                    onClick={(e) => { e.stopPropagation(); setShowForm(true); }}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Solicitar este lector
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">¿Cómo funciona?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Solicita tu lector", desc: "Llena el formulario y te contactamos en 24 hrs para confirmar el pedido.", icon: ShoppingCart },
              { step: "2", title: "Recíbelo en casa", desc: "Envío a todo México en 3-5 días hábiles. Activación inmediata al conectar.", icon: Package },
              { step: "3", title: "Empieza a cobrar", desc: "Conecta el lector a tu teléfono o WiFi y acepta tarjetas en segundos.", icon: Zap },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="bg-gray-50 rounded-xl p-5 text-center">
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">{step}</div>
                <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Order Form Modal */}
        {showForm && selectedReader && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Solicitar {selectedReader.name}</h3>
                  <p className="text-sm text-gray-500">${selectedReader.price.toLocaleString("es-MX")} MXN + IVA</p>
                </div>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Nombre completo *</Label>
                  <Input placeholder="Tu nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Teléfono de contacto *</Label>
                  <Input placeholder="55 1234 5678" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Dirección de envío *</Label>
                  <Input placeholder="Calle, número, colonia" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Ciudad / Estado *</Label>
                    <Input placeholder="Ciudad de México" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Cantidad</Label>
                    <Input type="number" min="1" max="10" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                  </div>
                </div>
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                  Un asesor de KobraPay te contactará en las próximas 24 horas para confirmar el pedido y coordinar el pago.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white" onClick={handleOrder}>
                    Enviar solicitud
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
