import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: Date;
}

function timeAgo(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHr < 24) return `Hace ${diffHr}h`;
  if (diffDay < 7) return `Hace ${diffDay}d`;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function notificationIcon(type: string): string {
  switch (type) {
    case "new_registration": return "🆕";
    case "pending_reminder": return "⏰";
    case "chargeback": return "⚠️";
    case "payment": return "💳";
    case "contract_signed": return "✍️";
    case "module_approved": return "✅";
    case "module_rejected": return "❌";
    case "appointment_reminder": return "📅";
    case "birthday": return "🎂";
    case "new_payment": return "💰";
    case "payment_received": return "✅";
    case "transfer": return "🏦";
    default: return "🔔";
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: countData, refetch: refetchCount } = trpc.notifications.countUnread.useQuery(undefined, {
    refetchInterval: 15000, // refrescar cada 15s para pagos en tiempo real
  });
  const { data: notifications = [], refetch: refetchList } = trpc.notifications.list.useQuery(undefined, {
    enabled: open,
  });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.countUnread.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.countUnread.invalidate();
      utils.notifications.list.invalidate();
      toast.success("Todas las notificaciones marcadas como leídas");
    },
  });

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Refrescar al abrir
  useEffect(() => {
    if (open) {
      refetchList();
      refetchCount();
    }
  }, [open]);

  const unreadCount = countData?.count ?? 0;

  function handleNotificationClick(notif: Notification) {
    if (!notif.isRead) {
      markRead.mutate({ id: notif.id });
    }
    if (notif.actionUrl) {
      setOpen(false);
      navigate(notif.actionUrl as string);
    }
  }

  return (
    <div className="relative" ref={ref}>
      {/* Botón campana */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de notificaciones */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-foreground text-sm">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} nueva{unreadCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm font-medium">Sin notificaciones</p>
                <p className="text-muted-foreground text-xs mt-1">Aquí aparecerán los nuevos registros y alertas</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif as Notification)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors flex gap-3 items-start ${
                    !notif.isRead ? "bg-blue-50/50" : ""
                  }`}
                >
                  {/* Icono */}
                  <span className="text-xl flex-shrink-0 mt-0.5 leading-none">
                    {notificationIcon(notif.type)}
                  </span>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${!notif.isRead ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[11px] text-muted-foreground">
                        {timeAgo(new Date(notif.createdAt))}
                      </span>
                      {notif.actionUrl && (
                        <span className="flex items-center gap-0.5 text-[11px] text-blue-500 font-medium">
                          <ExternalLink className="w-3 h-3" />
                          Ver
                        </span>
                      )}
                      {(notif.type === 'payment_received' || notif.type === 'new_payment') && (
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent('\u00a1Gracias por tu pago! \u2705 Hemos recibido tu transacci\u00f3n correctamente. Cualquier duda estamos a tus \u00f3rdenes. - KobraPay')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-full transition-colors"
                        >
                          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          Agradecer
                        </a>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => { setOpen(false); navigate("/dashboard/registrations"); }}
                className="w-full text-center text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Ver panel de registros →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
