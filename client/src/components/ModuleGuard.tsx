import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Lock, ShieldCheck, Clock, Send, CheckCircle2, Pill, ClipboardList } from "lucide-react";

const MODULE_INFO: Record<string, { label: string; icon: any; description: string; color: string }> = {
  prescriptions: {
    label: "Prescripciones Médicas",
    icon: ClipboardList,
    description: "Módulo para crear recetas médicas digitales con firma del doctor, impresión y envío por WhatsApp/correo.",
    color: "text-blue-600",
  },
  pharmacy: {
    label: "Farmacia",
    icon: Pill,
    description: "Módulo para registrar clientes de farmacia, subir prescripciones escaneadas y llevar historial de surtido.",
    color: "text-green-600",
  },
};

interface ModuleGuardProps {
  module: string;
  children: React.ReactNode;
}

/**
 * Envuelve una página y verifica si el usuario tiene acceso al módulo.
 * Si no tiene acceso, muestra una pantalla de solicitud.
 * Si ya solicitó acceso, muestra estado de espera.
 * El superadmin siempre pasa.
 */
export function ModuleGuard({ module, children }: ModuleGuardProps) {
  const { data: access, isLoading } = trpc.moduleAccess.check.useQuery({ module });
  const requestMutation = trpc.moduleAccess.requestAccess.useMutation({
    onSuccess: (data: any) => {
      if (data.alreadyGranted) {
        toast.success("Ya tienes acceso a este módulo");
      } else if (data.alreadyRequested) {
        toast.info("Ya tienes una solicitud pendiente");
      } else {
        toast.success("✅ Solicitud enviada. El administrador revisará tu solicitud.");
      }
    },
    onError: (e) => toast.error("Error al enviar solicitud: " + e.message),
  });

  const [businessType, setBusinessType] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Tiene acceso → mostrar el contenido
  if (access?.hasAccess) {
    return <>{children}</>;
  }

  const info = MODULE_INFO[module] || { label: module, icon: Lock, description: "", color: "text-primary" };
  const ModuleIcon = info.icon;

  // Pantalla de solicitud de acceso
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Ícono */}
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Lock className="w-9 h-9 text-muted-foreground" />
        </div>

        {/* Título */}
        <div>
          <div className={`flex items-center justify-center gap-2 mb-2 ${info.color}`}>
            <ModuleIcon className="w-5 h-5" />
            <span className="font-semibold text-lg">{info.label}</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">Módulo Restringido</h2>
          <p className="text-muted-foreground text-sm mt-2">{info.description}</p>
          <p className="text-muted-foreground text-sm mt-1">
            Este módulo requiere autorización especial del administrador de la plataforma.
          </p>
        </div>

        {submitted ? (
          // Estado: solicitud enviada
          <div className="p-5 bg-green-50 border border-green-200 rounded-xl space-y-3">
            <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
            <p className="font-semibold text-green-800">¡Solicitud enviada!</p>
            <p className="text-sm text-green-700">
              El administrador de KobraPay revisará tu solicitud y te notificará cuando sea aprobada.
              Una vez aprobada, podrás acceder a este módulo.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
              <Clock className="w-4 h-4" /> Revisión en proceso...
            </div>
          </div>
        ) : (
          // Formulario de solicitud
          <div className="text-left space-y-4 p-5 bg-card border rounded-xl">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="w-4 h-4 text-primary" /> Solicitar Acceso
            </div>

            <div className="space-y-1">
              <Label>Tipo de negocio *</Label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu tipo de negocio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="farmacia">Farmacia</SelectItem>
                  <SelectItem value="clinica">Clínica médica</SelectItem>
                  <SelectItem value="consultorio">Consultorio médico</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="dentista">Consultorio dental</SelectItem>
                  <SelectItem value="estetica">Medicina estética</SelectItem>
                  <SelectItem value="spa">Spa / Centro de bienestar</SelectItem>
                  <SelectItem value="nutricion">Nutrición / Dietista</SelectItem>
                  <SelectItem value="psicologia">Psicología / Salud mental</SelectItem>
                  <SelectItem value="fisioterapia">Fisioterapia / Rehabilitación</SelectItem>
                  <SelectItem value="veterinaria">Veterinaria</SelectItem>
                  <SelectItem value="laboratorio">Laboratorio clínico</SelectItem>
                  <SelectItem value="optometria">Optometría / Óptica</SelectItem>
                  <SelectItem value="quiropraxia">Quiropraxia / Osteopatía</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Mensaje (opcional)</Label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Cuéntanos brevemente para qué necesitas este módulo..."
                rows={3}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => {
                if (!businessType) { toast.error("Selecciona el tipo de negocio"); return; }
                requestMutation.mutate({ module, businessType, message });
                setSubmitted(true);
              }}
              disabled={requestMutation.isPending || !businessType}
            >
              <Send className="w-4 h-4 mr-2" />
              {requestMutation.isPending ? "Enviando..." : "Enviar Solicitud de Acceso"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              El administrador recibirá una notificación y revisará tu solicitud.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
