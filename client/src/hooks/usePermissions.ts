import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

export interface Permissions {
  canCreateLinks: boolean;
  canViewSales: boolean;
  canManageContracts: boolean;
  canManageClients: boolean;
  canViewReports: boolean;
  canManageStaff: boolean;
  canAccessSettings: boolean;
  canViewCommissions: boolean;
  canManageHR: boolean;
  canManageNomina: boolean;
  canManageCatalog: boolean;
  canManageChargebacks: boolean;
  canManageInvoices: boolean;
  canManageExpedientes: boolean;
  canManageRecurring: boolean;
  canManagePOS: boolean;
}

// Permisos por defecto para cada tipo de cuenta
const DEFAULT_PERMISSIONS_BY_TYPE: Record<string, Permissions> = {
  business: {
    canCreateLinks: true,
    canViewSales: true,
    canManageContracts: false,
    canManageClients: true,
    canViewReports: true,
    canManageStaff: false,
    canAccessSettings: true,
    canViewCommissions: false,
    canManageHR: false,
    canManageNomina: false,
    canManageCatalog: true,
    canManageChargebacks: true,
    canManageInvoices: true,
    canManageExpedientes: true,
    canManageRecurring: true,
    canManagePOS: true,
  },
  admin: {
    canCreateLinks: true,
    canViewSales: true,
    canManageContracts: true,
    canManageClients: true,
    canViewReports: true,
    canManageStaff: true,
    canAccessSettings: true,
    canViewCommissions: false,
    canManageHR: true,
    canManageNomina: true,
    canManageCatalog: true,
    canManageChargebacks: true,
    canManageInvoices: true,
    canManageExpedientes: true,
    canManageRecurring: true,
    canManagePOS: true,
  },
  employee: {
    canCreateLinks: true,
    canViewSales: true,
    canManageContracts: false,
    canManageClients: false,
    canViewReports: false,
    canManageStaff: false,
    canAccessSettings: false,
    canViewCommissions: false,
    canManageHR: false,
    canManageNomina: false,
    canManageCatalog: false,
    canManageChargebacks: false,
    canManageInvoices: false,
    canManageExpedientes: false,
    canManageRecurring: false,
    canManagePOS: true,
  },
  assistant: {
    canCreateLinks: false,
    canViewSales: true,
    canManageContracts: true,
    canManageClients: true,
    canViewReports: true,
    canManageStaff: false,
    canAccessSettings: false,
    canViewCommissions: false,
    canManageHR: false,
    canManageNomina: false,
    canManageCatalog: false,
    canManageChargebacks: true,
    canManageInvoices: true,
    canManageExpedientes: true,
    canManageRecurring: false,
    canManagePOS: false,
  },
};

// Permisos totales para superadmin
const SUPERADMIN_PERMISSIONS: Permissions = {
  canCreateLinks: true,
  canViewSales: true,
  canManageContracts: true,
  canManageClients: true,
  canViewReports: true,
  canManageStaff: true,
  canAccessSettings: true,
  canViewCommissions: true,
  canManageHR: true,
  canManageNomina: true,
  canManageCatalog: true,
  canManageChargebacks: true,
  canManageInvoices: true,
  canManageExpedientes: true,
  canManageRecurring: true,
  canManagePOS: true,
};

export function usePermissions() {
  const { user } = useAuth();
  const isSuperAdmin = (user as Record<string, unknown>)?.isSuperAdmin === true;

  // Cargar perfil del usuario para obtener permisos asignados
  const { data: profile } = trpc.profile.get.useQuery(undefined, {
    enabled: !!user && !isSuperAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const permissions = useMemo<Permissions>(() => {
    // Superadmin: acceso total sin restricciones
    if (isSuperAdmin) return SUPERADMIN_PERMISSIONS;

    // Sin usuario: sin permisos
    if (!user) {
      const noPerms = Object.fromEntries(
        Object.keys(SUPERADMIN_PERMISSIONS).map((k) => [k, false])
      );
      return noPerms as unknown as Permissions;
    }

    // Intentar leer permisos del perfil (asignados por el superadmin al aprobar)
    if (profile?.permissions) {
      try {
        const saved = JSON.parse(profile.permissions) as Partial<Permissions>;
        // Mezclar con defaults del tipo de cuenta
        const accountType = profile.accountType || "business";
        const defaults = DEFAULT_PERMISSIONS_BY_TYPE[accountType] || DEFAULT_PERMISSIONS_BY_TYPE.business;
        return { ...defaults, ...saved };
      } catch {
        // Si hay error al parsear, usar defaults
      }
    }

    // Usar defaults según tipo de cuenta
    const accountType = profile?.accountType || "business";
    return DEFAULT_PERMISSIONS_BY_TYPE[accountType] || DEFAULT_PERMISSIONS_BY_TYPE.business;
  }, [isSuperAdmin, user, profile]);

  return {
    permissions,
    isSuperAdmin,
    isLoaded: isSuperAdmin || !!profile || !user,
  };
}
