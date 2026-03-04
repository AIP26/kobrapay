// ─── Plantillas de acceso por sector ─────────────────────────────────────────
// Cada plantilla define qué permisos se activan para un tipo de negocio.
// Usado en: panel de Registros (al aprobar usuario) y Control de Módulos.

export interface SectorPermissions {
  canCreateLinks: boolean;
  canViewSales: boolean;
  canViewReports: boolean;
  canManageContracts: boolean;
  canManageClients: boolean;
  canManageExpedientes: boolean;
  canManageStaff: boolean;
  canManageHR: boolean;
  canManageNomina: boolean;
  canManageCatalog: boolean;
  canManageChargebacks: boolean;
  canManageInvoices: boolean;
  canManageRecurring: boolean;
  canManagePOS: boolean;
  canAccessSettings: boolean;
  // Módulos especializados
  canAccessMedical: boolean;
  canAccessPrescriptions: boolean;
  canAccessFarmacia: boolean;
}

export interface SectorTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  examples: string[];
  permissions: SectorPermissions;
}

const BASE_PERMISSIONS: SectorPermissions = {
  canCreateLinks: false,
  canViewSales: false,
  canViewReports: false,
  canManageContracts: false,
  canManageClients: false,
  canManageExpedientes: false,
  canManageStaff: false,
  canManageHR: false,
  canManageNomina: false,
  canManageCatalog: false,
  canManageChargebacks: false,
  canManageInvoices: false,
  canManageRecurring: false,
  canManagePOS: false,
  canAccessSettings: false,
  canAccessMedical: false,
  canAccessPrescriptions: false,
  canAccessFarmacia: false,
};

export const SECTOR_TEMPLATES: SectorTemplate[] = [
  {
    id: "restaurante",
    name: "Restaurante / Comercio",
    description: "Cobros en punto de venta, catálogo de productos, cobros recurrentes para membresías.",
    icon: "🍽️",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    examples: ["Restaurante", "Cafetería", "Tienda", "Boutique", "Panadería", "Farmacia"],
    permissions: {
      ...BASE_PERMISSIONS,
      canCreateLinks: true,
      canViewSales: true,
      canViewReports: true,
      canManageClients: true,
      canManageCatalog: true,
      canManageChargebacks: true,
      canManageInvoices: true,
      canManageRecurring: true,
      canManagePOS: true,
      canAccessSettings: true,
    },
  },
  {
    id: "clinica",
    name: "Consultorio / Clínica",
    description: "Cobros por consulta, expedientes de pacientes, agenda médica, prescripciones.",
    icon: "🏥",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    examples: ["Consultorio médico", "Clínica dental", "Consultorio psicológico", "Hospital", "Centro de salud"],
    permissions: {
      ...BASE_PERMISSIONS,
      canCreateLinks: true,
      canViewSales: true,
      canViewReports: true,
      canManageContracts: true,
      canManageClients: true,
      canManageExpedientes: true,
      canManageChargebacks: true,
      canManageInvoices: true,
      canManageRecurring: true,
      canAccessSettings: true,
      canAccessMedical: true,
      canAccessPrescriptions: true,
      canAccessFarmacia: true,
    },
  },
  {
    id: "escuela",
    name: "Escuela / Academia",
    description: "Cobros de colegiatura, inscripciones, contratos de servicio educativo.",
    icon: "🎓",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    examples: ["Escuela primaria", "Preparatoria", "Universidad", "Academia de idiomas", "Centro de capacitación"],
    permissions: {
      ...BASE_PERMISSIONS,
      canCreateLinks: true,
      canViewSales: true,
      canViewReports: true,
      canManageContracts: true,
      canManageClients: true,
      canManageChargebacks: true,
      canManageInvoices: true,
      canManageRecurring: true,
      canAccessSettings: true,
    },
  },
  {
    id: "spa",
    name: "Spa / Servicios",
    description: "Cobros por cita, membresías, catálogo de tratamientos, clientes frecuentes.",
    icon: "💆",
    color: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    examples: ["Spa", "Salón de belleza", "Barbería", "Estudio de yoga", "Gimnasio", "Centro estético"],
    permissions: {
      ...BASE_PERMISSIONS,
      canCreateLinks: true,
      canViewSales: true,
      canViewReports: true,
      canManageClients: true,
      canManageCatalog: true,
      canManageChargebacks: true,
      canManageInvoices: true,
      canManageRecurring: true,
      canAccessSettings: true,
    },
  },
  {
    id: "profesional",
    name: "Profesional / Despacho",
    description: "Honorarios, contratos de servicio, facturas, clientes corporativos.",
    icon: "💼",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    examples: ["Abogado", "Contador", "Arquitecto", "Consultor", "Agencia", "Despacho"],
    permissions: {
      ...BASE_PERMISSIONS,
      canCreateLinks: true,
      canViewSales: true,
      canViewReports: true,
      canManageContracts: true,
      canManageClients: true,
      canManageExpedientes: true,
      canManageChargebacks: true,
      canManageInvoices: true,
      canManageRecurring: true,
      canAccessSettings: true,
    },
  },
  {
    id: "basico",
    name: "Acceso Básico",
    description: "Solo links de pago y visualización de ventas. Ideal para vendedores individuales.",
    icon: "⚡",
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    examples: ["Vendedor independiente", "Freelancer", "Emprendedor"],
    permissions: {
      ...BASE_PERMISSIONS,
      canCreateLinks: true,
      canViewSales: true,
      canAccessSettings: true,
    },
  },
];

/**
 * Convierte los permisos de una plantilla a un objeto JSON para guardar en la BD.
 * Solo incluye los permisos que están en true para mantener el JSON compacto.
 */
export function templateToPermissionsJson(template: SectorTemplate): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(template.permissions)) {
    if (value === true) {
      result[key] = true;
    }
  }
  return result;
}

/**
 * Obtiene una plantilla por su ID.
 */
export function getTemplateById(id: string): SectorTemplate | undefined {
  return SECTOR_TEMPLATES.find(t => t.id === id);
}
