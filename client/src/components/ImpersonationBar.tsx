import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Eye, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Barra de aviso que aparece cuando el superadmin está impersonando a otro usuario.
 * Se detecta por la cookie kobrapay_superadmin_restore.
 */
export default function ImpersonationBar() {
  const utils = trpc.useUtils();

  // Detectar si hay cookie de restauración (impersonación activa)
  const hasRestoreCookie =
    typeof document !== "undefined" &&
    document.cookie.includes("kobrapay_superadmin_restore");

  const restoreSession = trpc.impersonate.restoreSession.useMutation({
    onSuccess: () => {
      toast.success("Sesión restaurada. Volviste a tu cuenta de superadmin.");
      utils.auth.me.invalidate();
      setTimeout(() => {
        window.location.href = "/dashboard/impersonate";
      }, 600);
    },
    onError: (err) => {
      toast.error(err.message || "Error al restaurar sesión");
    },
  });

  if (!hasRestoreCookie) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 py-2.5 shadow-lg"
      style={{ background: "linear-gradient(90deg, #d97706 0%, #b45309 100%)" }}
    >
      {/* Izquierda: ícono + texto */}
      <div className="flex items-center gap-2.5 text-foreground">
        <Eye className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold leading-tight">Modo Impersonación Activo</p>
          <p className="text-xs opacity-80 leading-tight">
            Estás viendo la plataforma como este cliente. Las acciones afectan su cuenta real.
          </p>
        </div>
        <AlertTriangle className="w-4 h-4 ml-1 opacity-70 flex-shrink-0" />
      </div>

      {/* Derecha: botón de regreso prominente */}
      <Button
        size="sm"
        className="bg-white text-amber-700 hover:bg-amber-50 font-bold gap-2 px-4 shadow-md flex-shrink-0"
        onClick={() => restoreSession.mutate()}
        disabled={restoreSession.isPending}
      >
        {restoreSession.isPending ? (
          <div className="w-4 h-4 border-2 border-amber-700/30 border-t-amber-700 rounded-full animate-spin" />
        ) : (
          <ArrowLeft className="w-4 h-4" />
        )}
        Volver a mi cuenta
      </Button>
    </div>
  );
}
