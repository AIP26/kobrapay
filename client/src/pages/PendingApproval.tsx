import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, Mail, CheckCircle2 } from "lucide-react";

const KOBRAPAY_ICON = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663381362445/yMTQoaqGYTxuRnnF.png";

interface PendingApprovalProps {
  email?: string | null;
  name?: string | null;
  status: "pending" | "blocked";
}

export default function PendingApproval({ email, name, status }: PendingApprovalProps) {
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  const isBlocked = status === "blocked";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <img src={KOBRAPAY_ICON} alt="KobraPay" className="w-16 h-16 mx-auto mb-4" />

        {isBlocked ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🚫</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso denegado</h1>
            <p className="text-gray-500 mb-6">
              Tu cuenta ha sido bloqueada. Si crees que esto es un error, contacta al administrador de KobraPay.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-red-700 text-sm">
                <strong>Cuenta:</strong> {email || "Sin email"}
              </p>
              <p className="text-red-700 text-sm mt-1">
                <strong>Estado:</strong> Bloqueada
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Cuenta en revisión</h1>
            <p className="text-gray-500 mb-6">
              Tu registro fue recibido correctamente. El equipo de KobraPay está revisando tu solicitud y recibirás una respuesta pronto.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <p className="text-gray-700 text-sm">Registro completado</p>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-gray-700 text-sm">Esperando aprobación del administrador</p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-gray-700 text-sm">Recibirás un email cuando tu cuenta sea activada</p>
              </div>
            </div>
            {name && (
              <p className="text-gray-400 text-sm mb-4">Hola, <strong>{name}</strong>. Gracias por tu paciencia.</p>
            )}
          </>
        )}

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </Button>

        <p className="text-gray-400 text-xs mt-4">
          ¿Tienes dudas? Escríbenos a{" "}
          <a href="mailto:soporte@kobrapay.mx" className="text-blue-600 hover:underline">
            soporte@kobrapay.mx
          </a>
        </p>
      </div>
    </div>
  );
}
