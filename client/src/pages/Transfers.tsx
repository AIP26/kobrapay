import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
  Building2,
  Globe,
  Zap,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
  DollarSign,
  Banknote,
  Send,
} from "lucide-react";
import { toast } from "sonner";

const TRANSFER_TYPES = [
  {
    id: "spei",
    title: "Transferencia SPEI",
    subtitle: "Transferencias nacionales en Mexico",
    icon: Building2,
    color: "from-emerald-500 to-teal-600",
    badge: "Disponible Pronto",
    badgeColor: "bg-amber-100 text-amber-700",
    time: "Mismo dia habil",
    cost: "Sin costo adicional",
    limit: "Hasta $999,999 MXN por operacion",
    features: [
      "Transferencias a cualquier banco mexicano",
      "CLABE interbancaria de 18 digitos",
      "Confirmacion instantanea",
      "Comprobante descargable",
      "Historial completo en tu panel",
    ],
    available: false,
  },
  {
    id: "wire",
    title: "Wire Transfer Internacional",
    subtitle: "Transferencias a cualquier pais del mundo",
    icon: Globe,
    color: "from-blue-500 to-indigo-600",
    badge: "Roadmap Q3 2026",
    badgeColor: "bg-blue-100 text-blue-700",
    time: "1-3 dias habiles",
    cost: "Comision segun destino",
    limit: "Segun regulacion FAFT",
    features: [
      "Mas de 150 paises disponibles",
      "Tipos de cambio competitivos",
      "Cumplimiento FAFT y SAT",
      "Powered by Wise Business API",
      "Seguimiento en tiempo real",
    ],
    available: false,
  },
  {
    id: "zelle",
    title: "Tipo Zelle (USA-Mexico)",
    subtitle: "Envios rapidos entre Mexico y Estados Unidos",
    icon: Zap,
    color: "from-purple-500 to-violet-600",
    badge: "Roadmap Q4 2026",
    badgeColor: "bg-purple-100 text-purple-700",
    time: "Minutos",
    cost: "Tarifa plana competitiva",
    limit: "Hasta $10,000 USD por dia",
    features: [
      "Envio con solo numero de telefono o email",
      "Conversion automatica MXN-USD",
      "Ideal para pagos a proveedores en USA",
      "Sin cuenta bancaria en USA requerida",
      "Notificaciones instantaneas",
    ],
    available: false,
  },
  {
    id: "wise",
    title: "Wise Business",
    subtitle: "Cuenta multimoneda para negocios globales",
    icon: DollarSign,
    color: "from-cyan-500 to-sky-600",
    badge: "Roadmap Q4 2026",
    badgeColor: "bg-cyan-100 text-cyan-700",
    time: "Instantaneo a Wise",
    cost: "Tasa de cambio real (sin margen)",
    limit: "Sin limite con verificacion",
    features: [
      "Cuenta en USD, EUR, GBP, CAD y mas",
      "Tarjeta de debito Wise Business",
      "Tipo de cambio real sin margen oculto",
      "Ideal para importadores y exportadores",
      "Integracion directa con KobraPay",
    ],
    available: false,
  },
];

export default function Transfers() {
  const handleNotify = () => {
    toast.success("Te avisaremos cuando las transferencias esten disponibles.");
  };

  return (
    <DashboardLayout title="Transferencias">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Centro de Transferencias</h1>
                  <p className="text-gray-400 text-sm">Nacionales, internacionales y tipo Zelle</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm max-w-xl">
                KobraPay esta construyendo el modulo de transferencias mas completo para negocios mexicanos.
                Desde SPEI hasta transferencias internacionales con Wise Business API, todo en un solo panel.
              </p>
            </div>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
              En Desarrollo
            </Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/10">
            {[
              { label: "Paises destino", value: "150+", icon: Globe },
              { label: "Tiempo SPEI", value: "< 2 min", icon: Clock },
              { label: "Monedas", value: "12+", icon: Banknote },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center">
                <Icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transfer Types Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {TRANSFER_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <Card key={type.id} className="border-gray-200 shadow-sm overflow-hidden">
                <div className={`h-1.5 bg-gradient-to-r ${type.color}`} />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${type.color} rounded-xl flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold text-gray-800">{type.title}</CardTitle>
                        <p className="text-xs text-gray-500">{type.subtitle}</p>
                      </div>
                    </div>
                    <Badge className={`${type.badgeColor} border-0 text-xs`}>
                      {type.badge}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Info Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Tiempo", value: type.time, icon: Clock },
                      { label: "Costo", value: type.cost, icon: DollarSign },
                      { label: "Limite", value: type.limit, icon: Lock },
                    ].map(({ label, value, icon: InfoIcon }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                        <InfoIcon className="w-3 h-3 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs font-semibold text-gray-700 leading-tight">{value}</p>
                        <p className="text-xs text-gray-400">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Features */}
                  <ul className="space-y-1.5">
                    {type.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="pt-2 border-t border-gray-100">
                    {type.available ? (
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Transferencia
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full border-gray-200 text-gray-600 hover:bg-gray-50"
                        onClick={handleNotify}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Avisarme cuando este disponible
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Roadmap Banner */}
        <Card className="border-0 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">Roadmap de Transferencias KobraPay</h3>
                <p className="text-sm text-gray-600 max-w-lg">
                  Estamos construyendo la infraestructura de transferencias mas completa para negocios mexicanos.
                  SPEI llega primero en Q2 2026, seguido de transferencias internacionales via Wise Business API.
                </p>
              </div>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0 ml-4"
                onClick={handleNotify}
              >
                Notificarme
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
