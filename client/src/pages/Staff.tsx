import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  UserCheck,
  UserPlus,
  Mail,
  User,
  Trash2,
  ShieldCheck,
  Copy,
  Check,
  Briefcase,
  CreditCard,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

type StaffRole = "asistente" | "operador";

const ROLE_INFO: Record<StaffRole, { label: string; color: string; description: string; permissions: string[] }> = {
  asistente: {
    label: "Asistente",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    description: "Puede gestionar contratos y crear cobros",
    permissions: [
      "Crear y enviar enlaces de cobro",
      "Ver historial de ventas",
      "Gestionar contratos de clientes",
      "Ver expedientes de clientes",
      "Usar el punto de venta (POS)",
    ],
  },
  operador: {
    label: "Operador",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    description: "Solo puede crear y gestionar cobros",
    permissions: [
      "Crear y enviar enlaces de cobro",
      "Ver historial de ventas",
      "Usar el punto de venta (POS)",
    ],
  },
};

export default function Staff() {
  const { user } = useAuth();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<{ id: number; name: string } | null>(null);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("operador");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: staffList, isLoading, refetch } = trpc.staff.list.useQuery();

  const inviteMutation = trpc.staff.invite.useMutation({
    onSuccess: () => {
      toast.success("Colaborador invitado correctamente");
      setShowInviteDialog(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("operador");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Error al invitar colaborador");
    },
  });

  const removeMutation = trpc.staff.remove.useMutation({
    onSuccess: () => {
      toast.success("Colaborador eliminado");
      setShowDeleteDialog(false);
      setSelectedStaff(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Error al eliminar colaborador");
    },
  });

  const handleInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error("Completa nombre y email");
      return;
    }
    inviteMutation.mutate({ name: inviteName.trim(), email: inviteEmail.trim(), staffRole: inviteRole });
  };

  const handleCopyEmail = (email: string, id: number) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const asistentes = staffList?.filter(m => m.staffRole === "asistente") ?? [];
  const operadores = staffList?.filter(m => m.staffRole !== "asistente") ?? [];

  return (
    <DashboardLayout title="Colaboradores">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Colaboradores</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Agrega empleados con roles específicos para tu negocio
            </p>
          </div>
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-foreground gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Invitar colaborador
          </Button>
        </div>

        {/* Role comparison cards */}
        <div className="grid grid-cols-2 gap-4">
          {(["asistente", "operador"] as StaffRole[]).map(role => {
            const info = ROLE_INFO[role];
            const Icon = role === "asistente" ? Briefcase : CreditCard;
            return (
              <Card key={role} className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-1.5 rounded-lg ${role === "asistente" ? "bg-purple-100" : "bg-blue-100"}`}>
                      <Icon className={`w-4 h-4 ${role === "asistente" ? "text-purple-600" : "text-blue-600"}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{info.label}</p>
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                    </div>
                    <Badge className={`ml-auto text-xs ${info.color}`} variant="outline">
                      {role === "asistente" ? asistentes.length : operadores.length}
                    </Badge>
                  </div>
                  <ul className="space-y-1">
                    {info.permissions.map(p => (
                      <li key={p} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                    {role === "operador" && (
                      <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-3 h-3 flex-shrink-0 text-center">✗</span>
                        No accede a contratos
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Staff list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-500" />
              Equipo activo
              {staffList && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {staffList.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-0">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
                    <div className="w-10 h-10 bg-gray-100 animate-pulse rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-100 animate-pulse rounded w-32" />
                      <div className="h-3 bg-gray-100 animate-pulse rounded w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !staffList || staffList.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <UserCheck className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground mb-1">Sin colaboradores aún</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Invita a tu equipo para que puedan crear cobros
                </p>
                <Button
                  onClick={() => setShowInviteDialog(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Invitar primer colaborador
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {staffList.map((member) => {
                  const role = (member.staffRole || "operador") as StaffRole;
                  const roleInfo = ROLE_INFO[role];
                  return (
                    <div key={member.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${role === "asistente" ? "bg-gradient-to-br from-purple-400 to-violet-500" : "bg-gradient-to-br from-cyan-400 to-teal-500"}`}>
                        <span className="text-foreground font-semibold text-sm">
                          {(member.name || member.email || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground text-sm truncate">
                            {member.name || "Sin nombre"}
                          </p>
                          <Badge className={`text-xs ${roleInfo.color}`} variant="outline">
                            {roleInfo.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          <button
                            onClick={() => handleCopyEmail(member.email || "", member.id)}
                            className="text-muted-foreground hover:text-muted-foreground transition-colors flex-shrink-0"
                          >
                            {copiedId === member.id ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                      {/* Status */}
                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            member.isActive
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-yellow-100 text-yellow-700 border-yellow-200"
                          }
                          variant="outline"
                        >
                          {member.isActive ? "Activo" : "Pendiente"}
                        </Badge>
                        <p className="text-xs text-muted-foreground hidden sm:block">
                          {new Date(member.createdAt).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <button
                          onClick={() => {
                            setSelectedStaff({ id: member.id, name: member.name || member.email || "" });
                            setShowDeleteDialog(true);
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-cyan-500" />
              Invitar colaborador
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nombre completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Ej. María García"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="colaborador@empresa.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-9"
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Rol del colaborador</label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as StaffRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operador">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="font-medium">Operador</p>
                        <p className="text-xs text-muted-foreground">Solo puede crear y gestionar cobros</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="asistente">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="font-medium">Asistente</p>
                        <p className="text-xs text-muted-foreground">Cobros + contratos de clientes</p>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Role preview */}
            <div className={`rounded-lg p-3 text-sm ${inviteRole === "asistente" ? "bg-purple-50 border border-purple-100" : "bg-blue-50 border border-blue-100"}`}>
              <p className={`font-medium mb-1 ${inviteRole === "asistente" ? "text-purple-800" : "text-blue-800"}`}>
                Permisos del {ROLE_INFO[inviteRole].label}:
              </p>
              <ul className="space-y-0.5">
                {ROLE_INFO[inviteRole].permissions.map(p => (
                  <li key={p} className={`text-xs flex items-center gap-1 ${inviteRole === "asistente" ? "text-purple-700" : "text-blue-700"}`}>
                    <Check className="w-3 h-3" /> {p}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted-foreground bg-gray-50 rounded-lg p-3">
              El colaborador recibirá un email con instrucciones para acceder a la plataforma.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviteMutation.isPending}
              className="bg-cyan-500 hover:bg-cyan-600 text-foreground"
            >
              {inviteMutation.isPending ? "Enviando..." : "Invitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar colaborador?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Se eliminará el acceso de <strong>{selectedStaff?.name}</strong> a tu cuenta. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedStaff && removeMutation.mutate({ staffId: selectedStaff.id })}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
