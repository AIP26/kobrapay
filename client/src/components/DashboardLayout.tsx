import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  CreditCard,
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
  HelpCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import PendingApproval from "@/pages/PendingApproval";

const KOBRAPAY_LOGO = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663381362445/BlaEgmymroahADGF.png";
const KOBRAPAY_ICON = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663381362445/yMTQoaqGYTxuRnnF.png";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Panel", section: "main" },
  { href: "/dashboard/sales", icon: BarChart3, label: "Mis Ventas", section: "main" },
  { href: "/dashboard/links", icon: Link2, label: "Links de Pago", section: "main" },
  { href: "/dashboard/create", icon: Plus, label: "Nuevo Cobro", section: "main" },
  { href: "/dashboard/recurring", icon: RefreshCw, label: "Cobros Recurrentes", section: "main" },
  { href: "/dashboard/chargebacks", icon: AlertTriangle, label: "Aclaraciones", section: "main" },
  { href: "/dashboard/payers", icon: Users, label: "Mis Pagadores", section: "main" },
  { href: "/dashboard/expedientes", icon: FolderOpen, label: "Expedientes", section: "main" },
  { href: "/dashboard/staff", icon: UserCheck, label: "Colaboradores", section: "main" },
  { href: "/dashboard/invoices", icon: FileText, label: "Mis Facturas", section: "main" },
  { href: "/dashboard/widget", icon: Code2, label: "Widget de Pago", section: "main" },
  { href: "/dashboard/reader", icon: ShoppingCart, label: "Compra tu Lector", section: "main" },
  { href: "/dashboard/catalog", icon: Package, label: "Catálogo", section: "main" },
  { href: "/dashboard/pos", icon: MonitorSmartphone, label: "Punto de Venta", section: "main" },
  { href: "/dashboard/clients", icon: Users, label: "Mis Clientes", section: "admin", adminOnly: true },
  { href: "/dashboard/security", icon: Shield, label: "Seguridad", section: "admin", adminOnly: true },
  { href: "/dashboard/registrations", icon: UserCog, label: "Registros", section: "superadmin" },
  { href: "/dashboard/contracts", icon: Handshake, label: "Contratos", section: "superadmin" },
  { href: "/dashboard/agents", icon: UserPlus, label: "Vendedores", section: "superadmin" },
  { href: "/dashboard/commissions", icon: TrendingUp, label: "Comisiones", section: "superadmin" },
  { href: "/dashboard/report", icon: FileText, label: "Reporte Mensual", section: "main" },
  { href: "/dashboard/help", icon: HelpCircle, label: "Ayuda", section: "settings" },
  { href: "/dashboard/settings", icon: Settings, label: "Configuración", section: "settings" },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

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

  // Verificar estado de la cuenta (pending o blocked)
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

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={cn("flex flex-col h-full", mobile ? "w-72" : "w-64")}
      style={{ background: "#1a1f2e" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <img
          src={KOBRAPAY_ICON}
          alt="KobraPay"
          className="w-9 h-9 object-contain flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight text-white">KobraPay</p>
          <p className="text-xs text-gray-400">Cobra fácil, cobra global</p>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          <p className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Principal</p>
          {navItems.filter(i => i.section === "main").map(({ href, icon: Icon, label }) => {
            const isActive = location === href;
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                className={cn("flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-gray-300 hover:bg-white/8 hover:text-white"
                )}>
                <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-emerald-400" : "")} />
                {label}
              </Link>
            );
          })}
        </div>
        {user?.role === "admin" && (
          <div className="space-y-0.5 mt-4">
            <p className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Administración</p>
            {navItems.filter(i => i.section === "admin").map(({ href, icon: Icon, label }) => {
              const isActive = location === href;
              return (
                <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                  className={cn("flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-gray-300 hover:bg-white/8 hover:text-white"
                  )}>
                  <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-emerald-400" : "")} />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
        {/* Super-admin: Gestión de registros */}
        {(user as Record<string, unknown>)?.isSuperAdmin === true && (
          <div className="space-y-0.5 mt-4">
            <p className="px-4 py-1.5 text-xs font-semibold text-amber-500/70 uppercase tracking-wider">Super Admin</p>
            {navItems.filter(i => i.section === "superadmin").map(({ href, icon: Icon, label }) => {
              const isActive = location === href;
              return (
                <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                  className={cn("flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30"
                      : "text-amber-300/70 hover:bg-white/8 hover:text-amber-300"
                  )}>
                  <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-amber-400" : "")} />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
        <div className="space-y-0.5 mt-4">
          <p className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sistema</p>
          {navItems.filter(i => i.section === "settings").map(({ href, icon: Icon, label }) => {
            const isActive = location === href;
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                className={cn("flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-gray-300 hover:bg-white/8 hover:text-white"
                )}>
                <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-emerald-400" : "")} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-emerald-500/30 text-emerald-300 text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name || "Usuario"}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email || ""}</p>
          </div>
          <button
            onClick={() => logout.mutate()}
            className="text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <SidebarContent mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#1a1f2e] border-b border-white/10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <img src={KOBRAPAY_ICON} alt="KobraPay" className="w-7 h-7 object-contain" />
          <span className="font-bold text-white text-sm">KobraPay</span>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
