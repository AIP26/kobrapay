import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export default function Staff() {
  const { user } = useAuth();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<{ id: number; name: string } | null>(null);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: staffList, isLoading, refetch } = trpc.staff.list.useQuery();

  const inviteMutation = trpc.staff.invite.useMutation({
    onSuccess: () => {
      toast.success("Colaborador invitado correctamente");
      setShowInviteDialog(false);
      setInviteName("");
      setInviteEmail("");
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
    inviteMutation.mutate({ name: inviteName.trim(), email: inviteEmail.trim() });
  };

  const handleCopyEmail = (email: string, id: number) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <DashboardLayout title="Colaboradores">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Colaboradores</h1>
            <p className="text-sm text-gray-500 mt-1">
              Agrega empleados que puedan crear cobros en tu nombre
            </p>
          </div>
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Invitar colaborador
          </Button>
        </div>

        {/* Info card */}
        <Card className="border-cyan-100 bg-cyan-50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <ShieldCheck className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-cyan-800">
                <p className="font-medium mb-1">¿Qué pueden hacer los colaboradores?</p>
                <ul className="space-y-0.5 text-cyan-700">
                  <li>• Crear y enviar enlaces de cobro</li>
                  <li>• Ver el historial de ventas</li>
                  <li>• Consultar el estado de pagos</li>
                </ul>
                <p className="mt-2 text-xs text-cyan-600">
                  No pueden cambiar configuraciones, ver comisiones ni acceder a datos bancarios.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
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
                  <UserCheck className="w-7 h-7 text-gray-400" />
                </div>
                <p className="font-medium text-gray-600 mb-1">Sin colaboradores aún</p>
                <p className="text-sm text-gray-400 mb-4">
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
                {staffList.map((member) => (
                  <div key={member.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {(member.name || member.email || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {member.name || "Sin nombre"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-500 truncate">{member.email}</p>
                        <button
                          onClick={() => handleCopyEmail(member.email || "", member.id)}
                          className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
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
                      <p className="text-xs text-gray-400 hidden sm:block">
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
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
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
              <label className="text-sm font-medium text-gray-700">Nombre completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Ej. María García"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              El colaborador recibirá un email con instrucciones para acceder a la plataforma con acceso limitado.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviteMutation.isPending}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
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
          <p className="text-sm text-gray-500 py-2">
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
