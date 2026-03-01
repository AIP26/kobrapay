import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Search,
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  FileText,
  Upload,
  Trash2,
  Eye,
  Download,
  Camera,
  IdCard,
  Home,
  Star,
  UserCheck,
  ChevronLeft,
  Edit2,
  X,
  Calendar,
} from "lucide-react";

const DOC_TYPES = [
  { value: "cv", label: "CV Laboral", icon: FileText, color: "text-blue-500" },
  { value: "ine", label: "Identificación (INE/Pasaporte)", icon: IdCard, color: "text-green-500" },
  { value: "domicilio", label: "Comprobante de Domicilio", icon: Home, color: "text-orange-500" },
  { value: "referencia_laboral", label: "Referencia Laboral", icon: Briefcase, color: "text-purple-500" },
  { value: "referencia_personal", label: "Referencia Personal", icon: Star, color: "text-yellow-500" },
  { value: "otro", label: "Otro Documento", icon: FileText, color: "text-gray-500" },
] as const;

type DocType = typeof DOC_TYPES[number]["value"];

function formatDate(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Componente de Avatar ────────────────────────────────────────────────────
function EmployeeAvatar({ name, photoUrl, size = "md" }: { name: string; photoUrl?: string | null; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "w-10 h-10 text-sm" : size === "lg" ? "w-24 h-24 text-3xl" : "w-14 h-14 text-xl";
  const initials = name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className={`${sizeClass} rounded-full object-cover border-2 border-border`} />;
  }
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center font-bold text-primary border-2 border-border`}>
      {initials}
    </div>
  );
}

// ─── Modal de Nuevo/Editar Empleado ──────────────────────────────────────────
function EmployeeFormModal({
  open,
  onClose,
  employee,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  employee?: {
    id: number;
    fullName: string;
    position?: string | null;
    department?: string | null;
    email?: string | null;
    phone?: string | null;
    curp?: string | null;
    rfc?: string | null;
    address?: string | null;
    startDate?: Date | string | null;
    notes?: string | null;
    photoUrl?: string | null;
    photoKey?: string | null;
  } | null;
  onSuccess: () => void;
}) {
  const utils = trpc.useUtils();
  const createMutation = trpc.employees.create.useMutation({
    onSuccess: (data) => {
      toast.success("Colaborador registrado exitosamente");
      utils.employees.list.invalidate();
      // Si hay foto pendiente, subirla
      if (pendingPhoto && data.id) {
        uploadPhotoMutation.mutate({ employeeId: data.id, fileBase64: pendingPhoto.base64, mimeType: pendingPhoto.mimeType });
      }
      onSuccess(); onClose();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.employees.update.useMutation({
    onSuccess: () => { toast.success("Colaborador actualizado"); utils.employees.list.invalidate(); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const uploadPhotoMutation = trpc.employees.uploadPhoto.useMutation({
    onSuccess: () => utils.employees.list.invalidate(),
  });
  const nextNumberQuery = trpc.employees.nextNumber.useQuery(undefined, { enabled: !employee });

  const [form, setForm] = useState({
    fullName: employee?.fullName ?? "",
    position: employee?.position ?? "",
    department: employee?.department ?? "",
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    curp: employee?.curp ?? "",
    rfc: employee?.rfc ?? "",
    address: employee?.address ?? "",
    startDate: employee?.startDate ? new Date(employee.startDate).toISOString().split("T")[0] : "",
    notes: employee?.notes ?? "",
    employeeNumber: "",
  });
  const [pendingPhoto, setPendingPhoto] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);

  // Auto-fill employee number when available
  useEffect(() => {
    if (!employee && nextNumberQuery.data) {
      setForm(f => ({ ...f, employeeNumber: nextNumberQuery.data.employeeNumber }));
    }
  }, [nextNumberQuery.data, employee]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setPendingPhoto({ base64, mimeType: file.type, preview: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.fullName.trim()) { toast.error("El nombre completo es requerido"); return; }
    if (employee) {
      const { employeeNumber: _en, ...updateForm } = form;
      updateMutation.mutate({ id: employee.id, ...updateForm });
      // Si hay foto nueva para edición, subirla directamente
      if (pendingPhoto) {
        uploadPhotoMutation.mutate({ employeeId: employee.id, fileBase64: pendingPhoto.base64, mimeType: pendingPhoto.mimeType });
      }
    } else {
      const { employeeNumber, ...createForm } = form;
      createMutation.mutate({ ...createForm, employeeNumber: employeeNumber || undefined });
    }
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? "Editar Colaborador" : "Nuevo Colaborador"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Foto de perfil */}
          <div className="md:col-span-2 flex items-center gap-4">
            <div className="relative">
              {pendingPhoto?.preview || employee?.photoUrl ? (
                <img src={pendingPhoto?.preview || employee?.photoUrl || ""} alt="Foto" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <Label className="block mb-1">Foto del Colaborador</Label>
              <input type="file" accept="image/*" className="hidden" id="photo-upload" onChange={handlePhotoChange} />
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("photo-upload")?.click()}>
                <Camera className="w-4 h-4 mr-2" />{pendingPhoto ? "Cambiar foto" : "Subir foto"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG o WEBP. Máx 5MB.</p>
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Nombre Completo *</Label>
            <Input value={form.fullName} onChange={e => set("fullName", e.target.value)} placeholder="Juan Pérez García" />
          </div>
          {!employee && (
            <div>
              <Label>Número de Colaborador</Label>
              <Input value={form.employeeNumber} onChange={e => set("employeeNumber", e.target.value)} placeholder={nextNumberQuery.isLoading ? "Generando..." : "001"} />
              <p className="text-xs text-muted-foreground mt-1">Se asigna automáticamente. Puedes cambiarlo.</p>
            </div>
          )}
          <div>
            <Label>Puesto / Cargo</Label>
            <Input value={form.position} onChange={e => set("position", e.target.value)} placeholder="Ej: Vendedor, Asistente" />
          </div>
          <div>
            <Label>Departamento / Área</Label>
            <Input value={form.department} onChange={e => set("department", e.target.value)} placeholder="Ej: Ventas, Administración" />
          </div>
          <div>
            <Label>Correo Electrónico</Label>
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="juan@empresa.com" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+52 55 1234 5678" />
          </div>
          <div>
            <Label>CURP</Label>
            <Input value={form.curp} onChange={e => set("curp", e.target.value.toUpperCase())} placeholder="PEGJ900101HDFRZN01" maxLength={18} />
          </div>
          <div>
            <Label>RFC</Label>
            <Input value={form.rfc} onChange={e => set("rfc", e.target.value.toUpperCase())} placeholder="PEGJ900101ABC" maxLength={13} />
          </div>
          <div>
            <Label>Fecha de Ingreso</Label>
            <Input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Domicilio</Label>
            <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Calle, Número, Colonia, Ciudad, Estado, CP" />
          </div>
          <div className="md:col-span-2">
            <Label>Notas internas</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Observaciones, referencias, etc." rows={3} />
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardando..." : employee ? "Guardar Cambios" : "Registrar Colaborador"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal de Subir Documento ─────────────────────────────────────────────────
function UploadDocumentModal({
  open,
  onClose,
  employeeId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: number;
  onSuccess: () => void;
}) {
  const utils = trpc.useUtils();
  const [docType, setDocType] = useState<DocType>("cv");
  const [docName, setDocName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadDocMutation = trpc.employees.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success("Documento subido exitosamente");
      utils.employees.get.invalidate({ id: employeeId });
      onSuccess();
      onClose();
      setFile(null);
      setDocName("");
      setUploading(false);
    },
    onError: (e) => { toast.error(e.message); setUploading(false); },
  });

  const handleUpload = async () => {
    if (!file) { toast.error("Selecciona un archivo"); return; }
    if (!docName.trim()) { toast.error("Ingresa un nombre para el documento"); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const fileBase64 = reader.result as string;
        uploadDocMutation.mutate({
          employeeId,
          type: docType,
          name: docName,
          fileBase64,
          mimeType: file.type,
          fileSize: file.size,
        });
      };
      reader.readAsDataURL(file);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Error al subir");
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Subir Documento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Tipo de Documento</Label>
            <Select value={docType} onValueChange={v => setDocType(v as DocType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(dt => (
                  <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nombre del Documento</Label>
            <Input value={docName} onChange={e => setDocName(e.target.value)} placeholder="Ej: INE Frontal, CV Actualizado 2025" />
          </div>
          <div>
            <Label>Archivo (PDF, JPG, PNG)</Label>
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center gap-2 justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Haz clic para seleccionar un archivo</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG — máx. 10 MB</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancelar</Button>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? "Subiendo..." : "Subir Documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Vista de Detalle de Empleado ─────────────────────────────────────────────
function EmployeeDetail({
  employeeId,
  onBack,
}: {
  employeeId: number;
  onBack: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: emp, isLoading } = trpc.employees.get.useQuery({ id: employeeId });
  const [showUpload, setShowUpload] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const uploadPhotoMutation = trpc.employees.uploadPhoto.useMutation({
    onSuccess: () => { toast.success("Foto actualizada"); utils.employees.get.invalidate({ id: employeeId }); utils.employees.list.invalidate(); setUploadingPhoto(false); },
    onError: (e) => { toast.error(e.message); setUploadingPhoto(false); },
  });

  const deleteDocMutation = trpc.employees.deleteDocument.useMutation({
    onSuccess: () => { toast.success("Documento eliminado"); utils.employees.get.invalidate({ id: employeeId }); },
    onError: (e) => toast.error(e.message),
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const fileBase64 = reader.result as string;
        uploadPhotoMutation.mutate({ employeeId, fileBase64, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Error al subir");
      setUploadingPhoto(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!emp) return null;

  const docsByType = DOC_TYPES.map(dt => ({
    ...dt,
    docs: (emp.documents ?? []).filter(d => d.type === dt.value),
  }));

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Expediente del Colaborador</h1>
        </div>

        {/* Perfil */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Foto */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <EmployeeAvatar name={emp.fullName} photoUrl={emp.photoUrl} size="lg" />
                  <button
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md hover:bg-primary/90 transition-colors"
                    onClick={() => photoRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input ref={photoRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                </div>
                <Badge variant={emp.status === "active" ? "default" : "secondary"} className={emp.status === "active" ? "bg-green-600 text-white" : ""}>
                  {emp.status === "active" ? "Activo" : "Inactivo"}
                </Badge>
              </div>

              {/* Info */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Nombre Completo</p>
                  <p className="font-semibold text-foreground">{emp.fullName}</p>
                </div>
                {emp.position && (
                  <div>
                    <p className="text-xs text-muted-foreground">Puesto</p>
                    <p className="font-medium text-foreground flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {emp.position}</p>
                  </div>
                )}
                {emp.department && (
                  <div>
                    <p className="text-xs text-muted-foreground">Departamento</p>
                    <p className="font-medium text-foreground flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {emp.department}</p>
                  </div>
                )}
                {emp.email && (
                  <div>
                    <p className="text-xs text-muted-foreground">Correo</p>
                    <p className="font-medium text-foreground flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {emp.email}</p>
                  </div>
                )}
                {emp.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="font-medium text-foreground flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {emp.phone}</p>
                  </div>
                )}
                {emp.curp && (
                  <div>
                    <p className="text-xs text-muted-foreground">CURP</p>
                    <p className="font-mono text-sm text-foreground">{emp.curp}</p>
                  </div>
                )}
                {emp.rfc && (
                  <div>
                    <p className="text-xs text-muted-foreground">RFC</p>
                    <p className="font-mono text-sm text-foreground">{emp.rfc}</p>
                  </div>
                )}
                {emp.startDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha de Ingreso</p>
                    <p className="font-medium text-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(emp.startDate)}</p>
                  </div>
                )}
                {emp.address && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground">Domicilio</p>
                    <p className="font-medium text-foreground flex items-start gap-1"><Home className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {emp.address}</p>
                  </div>
                )}
                {emp.notes && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground">Notas</p>
                    <p className="text-sm text-foreground bg-muted/30 rounded p-2">{emp.notes}</p>
                  </div>
                )}
                {(emp as any).dailyRate && parseFloat((emp as any).dailyRate) > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Salario Diario</p>
                    <p className="font-semibold text-primary text-lg">
                      ${parseFloat((emp as any).dailyRate).toFixed(2)}<span className="text-xs text-muted-foreground font-normal ml-1">/día</span>
                    </p>
                  </div>
                )}
                {(emp as any).dailyHours && parseFloat((emp as any).dailyHours) > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Horas de Trabajo al Día</p>
                    <p className="font-medium text-foreground">{parseFloat((emp as any).dailyHours)} hrs/día</p>
                  </div>
                )}
                {(emp as any).restDay && (
                  <div>
                    <p className="text-xs text-muted-foreground">Día de Descanso</p>
                    <p className="font-medium text-foreground">{{ monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo" }[(emp as any).restDay as string] ?? (emp as any).restDay}</p>
                  </div>
                )}
                {(emp as any).paymentCycle && (
                  <div>
                    <p className="text-xs text-muted-foreground">Ciclo de Pago</p>
                    <p className="font-medium text-foreground">
                      {(emp as any).paymentCycle === 'weekly' ? '🗓 Semanal' : (emp as any).paymentCycle === 'biweekly' ? '🗓 Quincenal' : '🗓 Mensual'}
                    </p>
                  </div>
                )}
                {(emp as any).bankName && (
                  <div>
                    <p className="text-xs text-muted-foreground">Banco</p>
                    <p className="font-medium text-foreground">{(emp as any).bankName}</p>
                  </div>
                )}
                {(emp as any).clabe && (
                  <div>
                    <p className="text-xs text-muted-foreground">CLABE Interbancaria</p>
                    <p className="font-mono text-sm text-foreground">{(emp as any).clabe}</p>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
                  <Edit2 className="w-4 h-4 mr-1" /> Editar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documentos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Documentos del Expediente</CardTitle>
            <Button size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="w-4 h-4 mr-1" /> Subir Documento
            </Button>
          </CardHeader>
          <CardContent>
            {(emp.documents ?? []).length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay documentos en el expediente</p>
                <p className="text-xs mt-1">Sube CV, INE, comprobante de domicilio y referencias</p>
              </div>
            ) : (
              <div className="space-y-4">
                {docsByType.filter(dt => dt.docs.length > 0).map(dt => (
                  <div key={dt.value}>
                    <div className="flex items-center gap-2 mb-2">
                      <dt.icon className={`w-4 h-4 ${dt.color}`} />
                      <span className="text-sm font-medium text-foreground">{dt.label}</span>
                      <Badge variant="secondary" className="text-xs">{dt.docs.length}</Badge>
                    </div>
                    <div className="space-y-2 pl-6">
                      {dt.docs.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.mimeType?.includes("pdf") ? "PDF" : "Imagen"} · {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : ""} · {formatDate(doc.uploadedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(doc.fileUrl, "_blank")}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <a href={doc.fileUrl} download={doc.name} target="_blank" rel="noreferrer">
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm("¿Eliminar este documento?")) deleteDocMutation.mutate({ id: doc.id });
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showUpload && (
        <UploadDocumentModal
          open={showUpload}
          onClose={() => setShowUpload(false)}
          employeeId={employeeId}
          onSuccess={() => {}}
        />
      )}

      {showEdit && emp && (
        <EmployeeFormModal
          open={showEdit}
          onClose={() => setShowEdit(false)}
          employee={emp}
          onSuccess={() => utils.employees.get.invalidate({ id: employeeId })}
        />
      )}
    </DashboardLayout>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Colaboradores() {
  const utils = trpc.useUtils();
  const { data: employees = [], isLoading } = trpc.employees.list.useQuery();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const deleteMutation = trpc.employees.delete.useMutation({
    onSuccess: () => {
      toast.success("Colaborador eliminado");
      utils.employees.list.invalidate();
      utils.employees.list.refetch();
    },
    onError: (e) => toast.error("Error al eliminar: " + e.message),
  });

  if (selectedId !== null) {
    return <EmployeeDetail employeeId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  const filtered = employees.filter(e =>
    e.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (e.position ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (e.department ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const active = employees.filter(e => e.status === "active").length;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> Expedientes de Colaboradores
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {active} activo{active !== 1 ? "s" : ""} · {employees.length} total
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo Colaborador
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: employees.length, icon: Users, color: "text-blue-500" },
            { label: "Activos", value: active, icon: UserCheck, color: "text-green-500" },
            { label: "Con Documentos", value: employees.filter(e => (e as unknown as { documentsCount?: number }).documentsCount ?? 0 > 0).length, icon: FileText, color: "text-orange-500" },
            { label: "Inactivos", value: employees.filter(e => e.status !== "active").length, icon: X, color: "text-red-500" },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color} opacity-70`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, puesto o área..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
              <p className="text-muted-foreground">
                {search ? "No se encontraron colaboradores con esa búsqueda" : "Aún no has registrado colaboradores"}
              </p>
              {!search && (
                <Button className="mt-4" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Registrar Primer Colaborador
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(emp => (
              <Card
                key={emp.id}
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
                onClick={() => setSelectedId(emp.id)}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-3">
                    <EmployeeAvatar name={emp.fullName} photoUrl={emp.photoUrl} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold text-foreground truncate">{emp.fullName}</p>
                        <Badge
                          variant={emp.status === "active" ? "default" : "secondary"}
                          className={`text-xs shrink-0 ${emp.status === "active" ? "bg-green-600 text-white" : ""}`}
                        >
                          {emp.status === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      {emp.position && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Briefcase className="w-3 h-3" /> {emp.position}
                        </p>
                      )}
                      {emp.department && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" /> {emp.department}
                        </p>
                      )}
                      {emp.startDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" /> Desde {formatDate(emp.startDate)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {emp.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email</span>}
                      {emp.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> Tel</span>}
                      {emp.curp && <span className="flex items-center gap-1"><IdCard className="w-3 h-3" /> CURP</span>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm(`¿Eliminar el expediente de ${emp.fullName}?`)) {
                          deleteMutation.mutate({ id: emp.id });
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <EmployeeFormModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          employee={null}
          onSuccess={() => {}}
        />
      )}
    </DashboardLayout>
  );
}
