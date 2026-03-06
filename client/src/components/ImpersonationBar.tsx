import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Eye, LogOut, AlertTriangle } from "lucide-react";
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
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white px-4 py-2 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Eye className="w-4 h-4" />
        <span>Modo Impersonación activo</span>
        <AlertTriangle className="w-4 h-4 ml-1" />
        <span className="font-normal opacity-90">Estás viendo la plataforma como este usuario. Las acciones afectan su cuenta real.</span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-white/40 text-white hover:bg-amber-600 hover:text-white bg-amber-600/30 gap-1.5 text-xs"
        onClick={() => restoreSession.mutate()}
        disabled={restoreSession.isPending}
      >
        {restoreSession.isPending ? (
          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <LogOut className="w-3 h-3" />
        )}
        Volver a mi cuenta
      </Button>
    </div>
  );
}
