import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Plus,
  Clock,
  Calendar,
  Zap,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";

const features = [
  {
    icon: RefreshCw,
    title: "Cobros automáticos",
    description: "Configura cobros que se repiten diario, semanal o mensualmente sin intervención manual.",
    color: "text-cyan-600",
    bg: "bg-cyan-100",
  },
  {
    icon: Calendar,
    title: "Cobro programado",
    description: "Programa un cobro para una fecha futura específica. Ideal para pagos diferidos o apartados.",
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  {
    icon: Zap,
    title: "Notificaciones automáticas",
    description: "El cliente recibe un recordatorio antes de cada cobro y un recibo al completarse.",
    color: "text-amber-600",
    bg: "bg-amber-100",
  },
  {
    icon: CheckCircle2,
    title: "Gestión de suscripciones",
    description: "Pausa, cancela o modifica suscripciones desde el panel. El cliente también puede cancelar.",
    color: "text-green-600",
    bg: "bg-green-100",
  },
];

const useCases = [
  { title: "Membresías mensuales", example: "Gimnasio, club, asociación" },
  { title: "Servicios de mantenimiento", example: "Limpieza, jardinería, vigilancia" },
  { title: "Suscripciones digitales", example: "Software, contenido, cursos" },
  { title: "Pagos en parcialidades", example: "Dividir un monto en cuotas fijas" },
  { title: "Rentas mensuales", example: "Arrendamiento de local o equipo" },
  { title: "Honorarios recurrentes", example: "Contabilidad, asesoría, consultoría" },
];

export default function Recurring() {
  return (
    <DashboardLayout title="Cobros Recurrentes">
      <div className="space-y-5 max-w-4xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Cobros Recurrentes</h2>
                <Badge className="bg-white/20 text-white border-white/30 text-xs">Próximamente</Badge>
              </div>
              <p className="text-blue-100 text-sm">Automatiza tus cobros periódicos y suscripciones</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map(({ icon: Icon, title, description, color, bg }) => (
            <Card key={title} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
                <p className="text-sm text-gray-500">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Use Cases */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Casos de uso comunes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {useCases.map(({ title, example }) => (
                <div key={title} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-sm font-medium text-gray-800">{title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{example}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="border-blue-200 bg-blue-50 shadow-sm">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">¿Necesitas cobros recurrentes ahora?</h3>
              <p className="text-sm text-blue-700">
                Por el momento puedes crear múltiples enlaces de pago individuales. Los cobros recurrentes automatizados
                estarán disponibles en la próxima actualización.
              </p>
            </div>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0">
              <Link href="/dashboard/create">
                <Plus className="w-4 h-4 mr-2" />
                Crear enlace de pago
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
