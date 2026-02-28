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
    case "new_registration": return "🔆";
    case "pending_reminder": return "⏰";
    case "chargeback": return "⚠️";
    case "payment": return "💳";
    case "contract_signed": return "✍️";
    default: return "🔔";
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: countData, refetch: refetchCount } = trpc.notifications.countUnread.useQuery(undefined, {
    refetchInterval: 30000, // refrescar cada 30s
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
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
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
              <Bell className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-gray-800 text-sm">Notificaciones</span>
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
                <p className="text-gray-400 text-sm font-medium">Sin notificaciones</p>
                <p className="text-gray-300 text-xs mt-1">Aquí aparecerán los nuevos registros y alertas</p>
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
                      <p className={`text-sm leading-snug ${!notif.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] text-gray-400">
                        {timeAgo(new Date(notif.createdAt))}
                      </span>
                      {notif.actionUrl && (
                        <span className="flex items-center gap-0.5 text-[11px] text-blue-500 font-medium">
                          <ExternalLink className="w-3 h-3" />
                          Ver
                        </span>
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
