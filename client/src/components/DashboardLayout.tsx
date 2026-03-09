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
  ShieldBan,
  Wallet,
  Bot,
  LifeBuoy,
  ArrowLeftRight,
  Brain,
  Mail,
  Star,
  Banknote,
  Activity,
  Eye,
  Key,
} from "lucide-react";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import GlobalSearch from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import PendingApproval from "@/pages/PendingApproval";
import ImpersonationBar from "./ImpersonationBar";

const KOBRAPAY_ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_v2_52d63331.png";

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

// Rutas básicas que todo cliente admin ve por defecto (sin necesidad de permisos adicionales)
const ADMIN_BASIC_ROUTES = new Set([
  "/dashboard",
  "/dashboard/sales",
  "/dashboard/report",
  "/dashboard/business-advisor",
  "/dashboard/create",
  "/dashboard/links",
  "/dashboard/recurring",
  "/dashboard/chargebacks",
  "/dashboard/invoices",
  "/dashboard/payers",
  "/dashboard/expedientes",
  "/dashboard/connect",
  "/dashboard/transfers",
  "/dashboard/my-deposits",
  "/dashboard/security",
  "/dashboard/blacklist",
  "/dashboard/help",
  "/dashboard/support",
  "/dashboard/settings",
]);

// Módulos avanzados que el superadmin puede habilitar por cliente
const ADMIN_ADVANCED_PERMISSION_MAP: Record<string, string> = {
  // Empresa
  "/dashboard/hr": "canManageHR",
  "/dashboard/staff": "canManageStaff",
  "/dashboard/checador": "canManageStaff",
  "/dashboard/nomina": "canManageNomina",
  "/dashboard/proveedores": "canManageProveedores",
  // Sector Salud
  "/dashboard/module-access": "canUseSectorSalud",
  "/dashboard/module-manager": "canUseSectorSalud",
  "/dashboard/assistant-panel": "canUseSectorSalud",
  "/dashboard/medical": "canUseSectorSalud",
  "/dashboard/prescriptions": "canUseSectorSalud",
  "/dashboard/farmacia": "canUseSectorSalud",
  // Herramientas
  "/dashboard/pos": "canManagePOS",
  "/dashboard/widget": "canUseWidget",
  "/dashboard/catalog": "canManageCatalog",
  "/dashboard/reader": "canUseReader",
};

// ─── Grupos del sidebar ───────────────────────────────────────────────────────
// Rutas esenciales para clientes normales (rol user sin permisos especiales)
const USER_ESSENTIAL_ROUTES = new Set([
  "/dashboard",
  "/dashboard/create",
  "/dashboard/links",
  "/dashboard/sales",
  "/dashboard/transfers",
  "/dashboard/my-deposits",
  "/dashboard/support",
  "/dashboard/settings",
  "/dashboard/help",
]);

const NAV_GROUPS = [
  {
    id: "principal",
    label: "Principal",
    icon: Home,
    color: "text-muted-foreground",
    items: [
      { href: "/dashboard", icon: Home, label: "Panel" },
      { href: "/dashboard/sales", icon: BarChart3, label: "Mis Ventas" },
      { href: "/dashboard/report", icon: FileText, label: "Reporte Mensual" },
      // Solo superadmin ve KobraPay Advisor y Advisor IA
      { href: "/dashboard/advisor", icon: Bot, label: "KobraPay Advisor", superAdminOnly: true },
      { href: "/dashboard/assistant-advisor", icon: Bot, label: "Advisor IA", assistantOnly: true },
      // Business Advisor visible para clientes (admin)
      { href: "/dashboard/business-advisor", icon: Bot, label: "Business Advisor", adminOnly: true },
      { href: "/dashboard/associate", icon: Users, label: "Cuenta de Asociado", associateOnly: true },
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
      { href: "/dashboard/connect", icon: Wallet, label: "Cuenta de Cobros" },
      { href: "/dashboard/transfers", icon: ArrowLeftRight, label: "Transferencias" },
      { href: "/dashboard/my-deposits", icon: Banknote, label: "Mis Depósitos" },
    ],
  },
  {
    id: "empresa",
    label: "Empresa",
    icon: Building2,
    color: "text-blue-500/70",
    items: [
      // Contratos, Vendedores, Comisiones: solo superadmin
      { href: "/dashboard/contracts", icon: Handshake, label: "Contratos", superAdminOnly: true },
      { href: "/dashboard/agents", icon: UserPlus, label: "Vendedores", superAdminOnly: true },
      { href: "/dashboard/commissions", icon: TrendingUp, label: "Comisiones", superAdminOnly: true },
      // Estos módulos SÍ son para clientes (admin)
      { href: "/dashboard/hr", icon: Briefcase, label: "Expedientes RH" },
      { href: "/dashboard/staff", icon: UserCheck, label: "Colaboradores" },
      { href: "/dashboard/checador", icon: Clock, label: "Reloj Checador" },
      { href: "/dashboard/nomina", icon: Calculator, label: "Nómina" },
      // Capacitaciones: solo superadmin
      { href: "/dashboard/training", icon: GraduationCap, label: "Capacitaciones", superAdminOnly: true },
      { href: "/dashboard/proveedores", icon: BookUser, label: "Proveedores" },
    ],
  },
  {
    id: "sector_salud",
    label: "Sector Salud",
    icon: Stethoscope,
    color: "text-emerald-500/70",
    items: [
      { href: "/dashboard/module-access", icon: ShieldCheck, label: "Control de Módulos" },
      { href: "/dashboard/module-manager", icon: ShieldCheck, label: "Accesos Equipo" },
      { href: "/dashboard/assistant-panel", icon: UserCog, label: "Panel Asistente" },
      // Agenda Médica, Prescripciones y Farmacia visibles para clientes (admin)
      { href: "/dashboard/medical", icon: Stethoscope, label: "Agenda Médica" },
      { href: "/dashboard/prescriptions", icon: ClipboardList, label: "Prescripciones" },
      { href: "/dashboard/farmacia", icon: Pill, label: "Farmacia" },
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
    id: "integraciones",
    label: "Integraciones",
    icon: Key,
    color: "text-sky-500/70",
    items: [
      { href: "/dashboard/api-keys", icon: Key, label: "API Keys" },
      { href: "/dashboard/api-docs", icon: FileText, label: "Documentación API" },
    ],
  },
  {
    id: "admin",
    label: "Administración",
    icon: Shield,
    color: "text-amber-500/70",
    adminOnly: true,
    items: [
      // Todo el bloque de administración es solo para superadmin
      { href: "/dashboard/metrics", icon: Activity, label: "Panel de Métricas", superAdminOnly: true },
      { href: "/dashboard/platform-config", icon: Settings, label: "Config. Plataforma", superAdminOnly: true },
      { href: "/dashboard/clients", icon: Users, label: "Mis Clientes", superAdminOnly: true },
      { href: "/dashboard/registrations", icon: UserCog, label: "Registros", superAdminOnly: true },
      { href: "/dashboard/ai-scoring", icon: Brain, label: "Scoring IA", superAdminOnly: true },
      { href: "/dashboard/kobra-score", icon: Star, label: "KobraScore", superAdminOnly: true },
      { href: "/dashboard/quote-logs", icon: Mail, label: "Cotizaciones", superAdminOnly: true },
      // Seguridad SÍ visible para clientes (admin)
      { href: "/dashboard/security", icon: Shield, label: "Seguridad" },
      { href: "/dashboard/blacklist", icon: ShieldBan, label: "Lista Negra" },
      { href: "/dashboard/impersonate", icon: Eye, label: "Ver como Cliente", superAdminOnly: true },
      { href: "/dashboard/associate-liquidation", icon: TrendingUp, label: "Liquidación Asociados", superAdminOnly: true },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    icon: Settings,
    color: "text-muted-foreground",
    items: [
      { href: "/dashboard/help", icon: HelpCircle, label: "Ayuda" },
      { href: "/dashboard/support", icon: LifeBuoy, label: "Soporte Técnico" },
      { href: "/dashboard/brochure", icon: FileText, label: "Brochure de Ventas" },
      { href: "/dashboard/settings", icon: Settings, label: "Configuración" },
    ],
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

// ─── Logo con dropdown de perfiles (solo SuperAdmin puede cambiar de vista) ─────
function LogoWithProfileSwitcher({
  isSuperAdmin,
  onClose,
  mobile,
}: {
  isSuperAdmin: boolean;
  onClose: () => void;
  mobile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { data: usersData } = trpc.moduleAccess.listAllUsers.useQuery(undefined, {
    enabled: isSuperAdmin,
    staleTime: 60000,
  });
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const startSession = trpc.impersonate.startSession.useMutation({
    onSuccess: (data) => {
      setOpen(false);
      onClose();
      utils.auth.me.invalidate();
      setTimeout(() => { window.location.href = '/dashboard'; }, 600);
    },
    onError: (err) => {
      import('sonner').then(({ toast }) => toast.error(err.message || 'Error al iniciar impersonación'));
      setImpersonatingId(null);
    },
  });

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const profiles = useMemo(() => {
    if (!usersData) return [];
    return usersData.filter(u => u.id !== undefined).map(u => ({
      id: u.id,
      name: u.name || u.email || `Usuario ${u.id}`,
      email: u.email || '',
      role: u.role,
      initials: (u.name || u.email || 'U').slice(0, 2).toUpperCase(),
    }));
  }, [usersData]);

  const roleLabel = (role: string) => {
    if (role === 'superadmin') return 'Super Admin';
    if (role === 'admin') return 'Admin';
    if (role === 'assistant') return 'Asistente';
    if (role === 'associate') return 'Asociado';
    return role;
  };
  const roleColor = (role: string) => {
    if (role === 'superadmin') return 'bg-violet-100 text-violet-700 ring-1 ring-violet-300';
    if (role === 'admin') return 'bg-emerald-100 text-emerald-700';
    if (role === 'assistant') return 'bg-blue-100 text-blue-700';
    if (role === 'associate') return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-muted-foreground';
  };;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
        {/* Logo clickeable — abre dropdown si es superadmin */}
        <button
          onClick={() => {
            if (isSuperAdmin) {
              setOpen(v => !v);
            } else {
              navigate('/dashboard');
              onClose();
            }
          }}
          className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left"
          title={isSuperAdmin ? 'Ver perfiles de usuarios' : 'Ir al Panel Principal'}
        >
          <img
            src={KOBRAPAY_ICON}
            alt="KobraPay"
            className="h-8 w-auto max-w-[140px] object-contain flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground leading-tight">Cobra fácil, cobra global</p>
          </div>
          {isSuperAdmin && (
            <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform flex-shrink-0', open && 'rotate-180')} />
          )}
        </button>
        {mobile && (
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Dropdown de perfiles */}
      {isSuperAdmin && open && (
        <div
          className="absolute left-0 right-0 top-full z-50 shadow-2xl border border-border rounded-b-xl overflow-hidden bg-popover"
        >
          <div className="px-3 pt-3 pb-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Perfiles de usuarios</p>
            {profiles.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 pb-2">Cargando...</p>
            ) : (
              <div className="space-y-0.5 max-h-64 overflow-y-auto">
                {profiles.map(profile => (
                  <button
                    key={profile.id}
                    onClick={() => {
                      if (impersonatingId) return;
                      setImpersonatingId(profile.id);
                      startSession.mutate({ userId: profile.id });
                    }}
                    disabled={impersonatingId !== null}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-60"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      {impersonatingId === profile.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <span className="text-xs font-bold text-primary">{profile.initials}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{profile.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                    </div>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0', roleColor(profile.role))}>
                      {impersonatingId === profile.id ? 'Entrando...' : roleLabel(profile.role)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="px-3 pb-3 pt-1 border-t border-border mt-1 space-y-0.5">
            <button
              onClick={() => { navigate('/dashboard/impersonate'); setOpen(false); onClose(); }}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <Eye className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span className="text-xs text-purple-600 font-medium">Ver lista completa</span>
            </button>
            <button
              onClick={() => { navigate('/dashboard/registrations'); setOpen(false); onClose(); }}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <UserPlus className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs text-primary font-medium">Gestionar registros</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
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

  // Un usuario es "cliente básico" si no es superadmin, admin, asistente ni asociado
  const isBasicUser = !isSuperAdmin && !isAdmin &&
    permissions['__isAssistant'] !== true &&
    permissions['__isAssociate'] !== true;

  const isItemVisible = (href: string, superAdminOnly?: boolean, assistantOnly?: boolean, adminOnly?: boolean, associateOnly?: boolean) => {
    // Ítems exclusivos de superadmin: solo él los ve
    if (superAdminOnly && !isSuperAdmin) return false;
    if (assistantOnly) return isSuperAdmin || permissions['__isAssistant'] === true;
    if (adminOnly) return isSuperAdmin || isAdmin;
    if (associateOnly) return isSuperAdmin || permissions['__isAssociate'] === true;
    if (isSuperAdmin) return true;

    if (isBasicUser) {
      // Siempre visible para clientes básicos (rutas esenciales)
      if (USER_ESSENTIAL_ROUTES.has(href)) return true;
      // Módulos avanzados: solo si el admin los habilitó explicitamente en permisos
      const permKey = ITEM_PERMISSION_MAP[href];
      if (!permKey) return false; // sin permiso mapeado = oculto para clientes básicos
      return permissions[permKey] === true;
    }

    // Para admin (clientes de la plataforma): solo rutas básicas por defecto
    // Los módulos avanzados (Empresa, Sector Salud, Herramientas) solo si el superadmin los habilitó
    if (isAdmin && !isSuperAdmin) {
      // Rutas básicas siempre visibles
      if (ADMIN_BASIC_ROUTES.has(href)) return true;
      // Módulos avanzados: requieren permiso explícito del superadmin
      const advancedPermKey = ADMIN_ADVANCED_PERMISSION_MAP[href];
      if (advancedPermKey) return permissions[advancedPermKey] === true;
      // Cualquier otra ruta no mapeada: oculta para clientes admin
      return false;
    }

    // Fallback: mostrar todo
    return true;
  };

  return (
    <aside
      className={cn("flex flex-col bg-sidebar border-r border-sidebar-border", mobile ? "w-72 h-full" : "w-64 h-screen")}
    >
      {/* Logo con dropdown de perfiles para superadmin */}
      <LogoWithProfileSwitcher
        isSuperAdmin={isSuperAdmin}
        onClose={onClose}
        mobile={mobile}
      />

      {/* Navigation — scroll interno, nunca empuja el perfil */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto min-h-0">
        <div className="space-y-1">
          {NAV_GROUPS.map((group) => {
            if (group.adminOnly && !isAdmin && !isSuperAdmin) return null;

            // Filtrar ítems visibles según permisos
            const visibleItems = group.items.filter(({ href, superAdminOnly, assistantOnly, adminOnly, associateOnly }: { href: string; superAdminOnly?: boolean; assistantOnly?: boolean; adminOnly?: boolean; associateOnly?: boolean }) => isItemVisible(href, superAdminOnly, assistantOnly, adminOnly, associateOnly));
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
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <GroupIcon className={cn("w-3.5 h-3.5 flex-shrink-0", groupActive ? "text-primary" : "text-muted-foreground")} />
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
                  <div className="mt-0.5 ml-2 space-y-0.5 border-l border-border pl-2">
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
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
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
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1 flex-shrink-0">
        <Link href="/dashboard/profile" onClick={onClose}>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer group">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
              {isSuperAdmin ? (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700 ring-1 ring-violet-300">Super Admin</span>
              ) : (
                <p className="text-xs text-primary/70 group-hover:text-primary truncate transition-colors">Ver mi perfil</p>
              )}
            </div>
            <UserCircle2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </div>
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors text-sm"
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
  // Encuesta de onboarding: verificar si ya fue completada
  const { data: surveyStatus, isLoading: surveyLoading } = trpc.onboarding.getSurveyStatus.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
    staleTime: 10 * 60 * 1000,
  });
  // isSuperAdmin y role del usuario (disponible desde auth.me)
  const userRole = (user as Record<string, unknown>)?.role as string | undefined;
  const userIsSuperAdmin = (user as Record<string, unknown>)?.isSuperAdmin === true;
  // Redirigir al welcome screen si es cliente admin recién aprobado y no ha visto la bienvenida
  useEffect(() => {
    if (
      isAuthenticated &&
      !loading &&
      userRole === 'admin' &&
      !userIsSuperAdmin &&
      (user as Record<string, unknown>)?.welcomeShown === false &&
      location !== "/welcome"
    ) {
      window.location.href = "/welcome";
    }
  }, [isAuthenticated, loading, user, userRole, userIsSuperAdmin, location]);

  // Redirigir a /onboarding si no ha completado la encuesta
  // EXCLUIR: superadmin, asistente, admin
  useEffect(() => {
    if (
      isAuthenticated &&
      !loading &&
      !surveyLoading &&
      surveyStatus &&
      !surveyStatus.completed &&
      !userIsSuperAdmin &&
      userRole !== 'assistant' &&
      userRole !== 'admin' &&
      userRole !== 'associate' &&
      location !== "/onboarding"
    ) {
      window.location.href = "/onboarding";
    }
  }, [isAuthenticated, loading, surveyLoading, surveyStatus, location, userIsSuperAdmin, userRole]);
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img src={KOBRAPAY_ICON} alt="KobraPay" className="w-12 h-12 animate-pulse" />
          <p className="text-muted-foreground text-sm">Cargando...</p>
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
    // Redirigir al login propio (no al OAuth de Manus)
    window.location.replace("/login");
    return null;
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
    const base: Record<string, boolean> = {};
    if (!rawPerms) {
      // Agregar flags de rol especial
      if (userRole === 'assistant') base['__isAssistant'] = true;
      if (userRole === 'associate') base['__isAssociate'] = true;
      return base;
    }
    try {
      const parsed = JSON.parse(rawPerms) as Record<string, boolean>;
      if (userRole === 'assistant') parsed['__isAssistant'] = true;
      if (userRole === 'associate') parsed['__isAssociate'] = true;
      return parsed;
    } catch {
      if (userRole === 'assistant') base['__isAssistant'] = true;
      if (userRole === 'associate') base['__isAssociate'] = true;
      return base;
    }
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
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Barra de impersonación — visible cuando superadmin está viendo como cliente */}
      <ImpersonationBar />
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
        <header className="h-14 flex items-center gap-3 px-4 bg-card border-b border-border flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
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
