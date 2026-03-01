import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  Home,
  Link2,
  LogOut,
  Menu,
  Plus,
  Settings,
  X,
  Users,
  Code2,
  RefreshCw,
  FileText,
  AlertTriangle,
  ShoppingCart,
  Shield,
  UserCheck,
  Package,
  MonitorSmartphone,
  UserCog,
  Handshake,
  UserPlus,
  FolderOpen,
  TrendingUp,
  Briefcase,
  HelpCircle,
  UserCircle2,
  Clock,
  Calculator,
  ChevronDown,
  Building2,
  Zap,
  DollarSign,
  Stethoscope,
  GraduationCap,
  BookUser,
  Pill,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import GlobalSearch from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import PendingApproval from "@/pages/PendingApproval";

const KOBRAPAY_ICON = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663381362445/yMTQoaqGYTxuRnnF.png";

// ─── Mapa de permisos por ítem del sidebar ────────────────────────────────────
const ITEM_PERMISSION_MAP: Record<string, string> = {
  "/dashboard/links": "canCreateLinks",
  "/dashboard/create": "canCreateLinks",
  "/dashboard/sales": "canViewSales",
  "/dashboard/report": "canViewReports",
  "/dashboard/contracts": "canManageContracts",
  "/dashboard/payers": "canManageClients",
  "/dashboard/expedientes": "canManageExpedientes",
  "/dashboard/staff": "canManageStaff",
  "/dashboard/hr": "canManageHR",
  "/dashboard/nomina": "canManageNomina",
  "/dashboard/catalog": "canManageCatalog",
  "/dashboard/chargebacks": "canManageChargebacks",
  "/dashboard/invoices": "canManageInvoices",
  "/dashboard/recurring": "canManageRecurring",
  "/dashboard/pos": "canManagePOS",
  "/dashboard/settings": "canAccessSettings",
};

// ─── Grupos del sidebar ───────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    id: "principal",
    label: "Principal",
    icon: Home,
    color: "text-gray-500",
    items: [
      { href: "/dashboard", icon: Home, label: "Panel" },
      { href: "/dashboard/sales", icon: BarChart3, label: "Mis Ventas" },
      { href: "/dashboard/report", icon: FileText, label: "Reporte Mensual" },
    ],
  },
  {
    id: "cobros",
    label: "Cobros y Pagos",
    icon: DollarSign,
    color: "text-emerald-500/70",
    items: [
      { href: "/dashboard/create", icon: Plus, label: "Nuevo Cobro" },
      { href: "/dashboard/links", icon: Link2, label: "Links de Pago" },
      { href: "/dashboard/recurring", icon: RefreshCw, label: "Cobros Recurrentes" },
      { href: "/dashboard/chargebacks", icon: AlertTriangle, label: "Aclaraciones" },
      { href: "/dashboard/invoices", icon: FileText, label: "Mis Facturas" },
      { href: "/dashboard/payers", icon: Users, label: "Mis Pagadores" },
      { href: "/dashboard/expedientes", icon: FolderOpen, label: "Expedientes" },
    ],
  },
  {
    id: "empresa",
    label: "Empresa",
    icon: Building2,
    color: "text-blue-500/70",
    items: [
      { href: "/dashboard/hr", icon: Briefcase, label: "Expedientes RH" },
      { href: "/dashboard/staff", icon: UserCheck, label: "Colaboradores" },
      { href: "/dashboard/checador", icon: Clock, label: "Reloj Checador" },
      { href: "/dashboard/nomina", icon: Calculator, label: "Nómina" },
      { href: "/dashboard/contracts", icon: Handshake, label: "Contratos" },
      { href: "/dashboard/agents", icon: UserPlus, label: "Vendedores" },
      { href: "/dashboard/commissions", icon: TrendingUp, label: "Comisiones" },
      { href: "/dashboard/training", icon: GraduationCap, label: "Capacitaciones" },
      { href: "/dashboard/proveedores", icon: BookUser, label: "Proveedores" },
    ],
  },
  {
    id: "sector_salud",
    label: "Sector Salud",
    icon: Stethoscope,
    color: "text-emerald-500/70",
    items: [
      { href: "/dashboard/medical", icon: Stethoscope, label: "Agenda Médica" },
      { href: "/dashboard/prescriptions", icon: ClipboardList, label: "Prescripciones" },
      { href: "/dashboard/farmacia", icon: Pill, label: "Farmacia" },
      { href: "/dashboard/module-access", icon: ShieldCheck, label: "Control de Módulos" },
      { href: "/dashboard/module-manager", icon: ShieldCheck, label: "Accesos Equipo" },
      { href: "/dashboard/assistant-panel", icon: UserCog, label: "Panel Asistente" },
    ],
  },
  {
    id: "herramientas",
    label: "Herramientas",
    icon: Zap,
    color: "text-purple-500/70",
    items: [
      { href: "/dashboard/pos", icon: MonitorSmartphone, label: "Punto de Venta" },
      { href: "/dashboard/widget", icon: Code2, label: "Widget de Pago" },
      { href: "/dashboard/catalog", icon: Package, label: "Catálogo" },
      { href: "/dashboard/reader", icon: ShoppingCart, label: "Compra tu Lector" },
    ],
  },
  {
    id: "admin",
    label: "Administración",
    icon: Shield,
    color: "text-amber-500/70",
    adminOnly: true,
    items: [
      { href: "/dashboard/clients", icon: Users, label: "Mis Clientes" },
      { href: "/dashboard/registrations", icon: UserCog, label: "Registros" },
      { href: "/dashboard/security", icon: Shield, label: "Seguridad" },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    icon: Settings,
    color: "text-gray-500",
    items: [
      { href: "/dashboard/help", icon: HelpCircle, label: "Ayuda" },
      { href: "/dashboard/settings", icon: Settings, label: "Configuración" },
    ],
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

// ─── Sidebar standalone (fuera del DashboardLayout para evitar re-renders) ────
function Sidebar({
  mobile,
  location,
  collapsed,
  toggleGroup,
  isAdmin,
  isSuperAdmin,
  initials,
  userName,
  permissions,
  onClose,
  onLogout,
}: {
  mobile?: boolean;
  location: string;
  collapsed: Record<string, boolean>;
  toggleGroup: (id: string) => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  initials: string;
  userName: string;
  permissions: Record<string, boolean>;
  onClose: () => void;
  onLogout: () => void;
}) {
  const isGroupActive = (groupId: string) => {
    const group = NAV_GROUPS.find(g => g.id === groupId);
    return group?.items.some(i => location === i.href) ?? false;
  };

  const isItemVisible = (href: string) => {
    if (isSuperAdmin) return true;
    const permKey = ITEM_PERMISSION_MAP[href];
    if (!permKey) return true; // sin restricción = siempre visible
    return permissions[permKey] !== false;
  };

  return (
    <aside
      className={cn("flex flex-col", mobile ? "w-72 h-full" : "w-64 h-screen")}
      style={{ background: "#1a1f2e" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 flex-shrink-0">
        <Link href="/dashboard" onClick={onClose}>
          <a className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity" title="Ir al Panel Principal">
            <img
              src={KOBRAPAY_ICON}
              alt="KobraPay"
              className="w-9 h-9 object-contain flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight text-white">KobraPay</p>
              <p className="text-xs text-gray-400">Cobra fácil, cobra global</p>
            </div>
          </a>
        </Link>
        {mobile && (
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation — scroll interno, nunca empuja el perfil */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto min-h-0">
        <div className="space-y-1">
          {NAV_GROUPS.map((group) => {
            if (group.adminOnly && !isAdmin && !isSuperAdmin) return null;

            // Filtrar ítems visibles según permisos
            const visibleItems = group.items.filter(({ href }) => isItemVisible(href));
            if (visibleItems.length === 0) return null;

            const groupActive = isGroupActive(group.id);
            const isCollapsed = collapsed[group.id] && !groupActive;
            const GroupIcon = group.icon;

            return (
              <div key={group.id}>
                {/* Encabezado del grupo */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all",
                    groupActive
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  )}
                >
                  <GroupIcon className={cn("w-3.5 h-3.5 flex-shrink-0", groupActive ? "text-emerald-400" : group.color)} />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 transition-transform duration-200",
                      isCollapsed ? "-rotate-90" : "rotate-0"
                    )}
                  />
                </button>

                {/* Ítems del grupo con animación CSS */}
                <div
                  style={{
                    maxHeight: isCollapsed ? "0px" : `${visibleItems.length * 44}px`,
                    overflow: "hidden",
                    transition: "max-height 0.22s ease",
                  }}
                >
                  <div className="mt-0.5 ml-2 space-y-0.5 border-l border-white/10 pl-2">
                    {visibleItems.map(({ href, icon: Icon, label }) => {
                      const isActive = location === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                            isActive
                              ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                              : "text-gray-300 hover:bg-white/8 hover:text-white"
                          )}
                        >
                          <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-emerald-400" : "text-gray-500")} />
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {/* User Profile — siempre visible al fondo */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1 flex-shrink-0">
        <Link href="/dashboard/profile" onClick={onClose}>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-emerald-500/30 text-emerald-300 text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-emerald-400/70 group-hover:text-emerald-400 truncate transition-colors">Ver mi perfil</p>
            </div>
            <UserCircle2 className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
          </div>
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Grupos colapsados por defecto
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    empresa: true,
    herramientas: true,
    admin: true,
  });

  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  const toggleGroup = useCallback((id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const handleLogout = useCallback(() => logout.mutate(), [logout]);

  const initials = useMemo(() =>
    user?.name
      ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
      : "U",
    [user?.name]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1f2e]">
        <div className="flex flex-col items-center gap-3">
          <img src={KOBRAPAY_ICON} alt="KobraPay" className="w-12 h-12 animate-pulse" />
          <p className="text-gray-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  const accountStatus = (user as Record<string, unknown>)?.accountStatus as string | undefined;
  if (isAuthenticated && (accountStatus === "pending" || accountStatus === "blocked")) {
    return (
      <PendingApproval
        email={user?.email}
        name={user?.name}
        status={accountStatus as "pending" | "blocked"}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1f2e]">
        <div className="text-center space-y-4 max-w-sm mx-auto px-4">
          <img src={KOBRAPAY_ICON} alt="KobraPay" className="w-16 h-16 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Acceso requerido</h1>
          <p className="text-gray-400">Inicia sesión para acceder al panel de KobraPay.</p>
          <Button asChild className="w-full bg-emerald-500 hover:bg-emerald-400 text-white" size="lg">
            <a href={getLoginUrl("/dashboard")}>Iniciar Sesión</a>
          </Button>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  // isSuperAdmin viene del campo que ahora retorna auth.me
  const isSuperAdmin = (user as Record<string, unknown>)?.isSuperAdmin === true;

  // Permisos del usuario: superadmin siempre tiene todo, otros leen de su perfil
  const rawPerms = (user as Record<string, unknown>)?.permissions as string | null | undefined;
  const userPermissions = (() => {
    if (isSuperAdmin) {
      // Todos los permisos activos para el superadmin
      return Object.fromEntries(Object.keys(ITEM_PERMISSION_MAP).map(k => [k, true]));
    }
    if (!rawPerms) return {} as Record<string, boolean>;
    try { return JSON.parse(rawPerms) as Record<string, boolean>; } catch { return {} as Record<string, boolean>; }
  })();

  const sidebarProps = {
    location,
    collapsed,
    toggleGroup,
    isAdmin,
    isSuperAdmin,
    initials,
    userName: user?.name || "Usuario",
    permissions: userPermissions,
    onClose: closeSidebar,
    onLogout: handleLogout,
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar — altura fija h-screen */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar {...sidebarProps} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={closeSidebar} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar {...sidebarProps} mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 flex items-center gap-3 px-4 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <GlobalSearch />
          </div>
          <NotificationBell />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
