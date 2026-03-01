import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { ModuleGuard } from "@/components/ModuleGuard";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search, Plus, Trash2, User, Phone, Mail, ChevronLeft,
  Upload, FileText, CheckCircle2, Clock, AlertCircle,
  Eye, X, Pill, Calendar, Edit2, Building2
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Customer = {
  id: number; name: string; phone?: string | null; email?: string | null;
  birthDate?: string | null; gender?: string | null; address?: string | null;
  allergies?: string | null; notes?: string | null; isActive: boolean;
  createdAt: Date;
};

type PharmacyPrescription = {
  id: number; customerId: number; doctorName?: string | null;
  prescriptionDate?: string | null; fileUrl?: string | null;
  fileName?: string | null; fileMimeType?: string | null;
  medications?: string | null; notes?: string | null;
  status: string; dispensedAt?: Date | null; createdAt: Date;
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Por surtir", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  dispensed: { label: "Surtida", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  partial: { label: "Parcial", color: "bg-blue-100 text-blue-700 border-blue-200", icon: AlertCircle },
};

// ─── Modal Nuevo/Editar Cliente ───────────────────────────────────────────────
function CustomerModal({
  open, onClose, customer,
}: { open: boolean; onClose: () => void; customer?: Customer | null }) {
  const utils = trpc.useUtils();
  const createMutation = trpc.pharmacy.createCustomer.useMutation({
    onSuccess: () => { toast.success("Cliente registrado"); utils.pharmacy.listCustomers.invalidate(); onClose(); },
    onError: (e) => toast.error("Error: " + e.message),
  });
  const updateMutation = trpc.pharmacy.updateCustomer.useMutation({
    onSuccess: () => { toast.success("Cliente actualizado"); utils.pharmacy.listCustomers.invalidate(); onClose(); },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const [form, setForm] = useState({
    name: customer?.name || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
    birthDate: customer?.birthDate || "",
    gender: customer?.gender || "",
    address: customer?.address || "",
    allergies: customer?.allergies || "",
    notes: customer?.notes || "",
  });

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("El nombre es requerido"); return; }
    if (customer) {
      updateMutation.mutate({ id: customer.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {customer ? "Editar Cliente" : "Nuevo Cliente"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Nombre completo *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del cliente" />
            </div>
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(55) 1234-5678" />
            </div>
            <div className="space-y-1">
              <Label>Correo electrónico</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" />
            </div>
            <div className="space-y-1">
              <Label>Fecha de nacimiento</Label>
              <Input type="date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Género</Label>
              <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="femenino">Femenino</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Dirección</Label>
            <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Calle, Colonia, Ciudad" />
          </div>
          <div className="space-y-1">
            <Label>Alergias conocidas</Label>
            <Input value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder="Ej: Penicilina, Aspirina..." />
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observaciones adicionales..." rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Guardando..." : (customer ? "Actualizar" : "Registrar")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal Subir Prescripción ─────────────────────────────────────────────────
function UploadPrescriptionModal({
  open, onClose, customerId, customerName,
}: { open: boolean; onClose: () => void; customerId: number; customerName: string }) {
  const utils = trpc.useUtils();
  const uploadMutation = trpc.pharmacy.uploadPrescription.useMutation({
    onSuccess: () => {
      toast.success("Prescripción registrada");
      utils.pharmacy.listPrescriptions.invalidate({ customerId });
      onClose();
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const [form, setForm] = useState({
    doctorName: "", prescriptionDate: "", medications: "", notes: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("El archivo no debe superar 10 MB"); return; }
    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) { toast.error("Selecciona un archivo"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadMutation.mutate({
        customerId,
        ...form,
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Subir Prescripción
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cliente: <span className="font-medium text-foreground">{customerName}</span>
          </p>

          {/* Subida de archivo */}
          <div className="space-y-2">
            <Label>Archivo de la prescripción *</Label>
            <label className="cursor-pointer block">
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-40 mx-auto object-contain rounded" />
                ) : file ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                    <FileText className="w-8 h-8 text-primary" />
                    <span>{file.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Clic para subir foto, imagen o PDF</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF · máx. 10 MB</p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {file && (
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => { setFile(null); setPreview(null); }}>
                <X className="w-3.5 h-3.5 mr-1" /> Quitar archivo
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nombre del doctor</Label>
              <Input value={form.doctorName} onChange={e => setForm(f => ({ ...f, doctorName: e.target.value }))} placeholder="Dr. García" />
            </div>
            <div className="space-y-1">
              <Label>Fecha de la receta</Label>
              <Input type="date" value={form.prescriptionDate} onChange={e => setForm(f => ({ ...f, prescriptionDate: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Medicamentos (resumen)</Label>
            <Textarea
              value={form.medications}
              onChange={e => setForm(f => ({ ...f, medications: e.target.value }))}
              placeholder="Lista de medicamentos de la receta..."
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label>Notas del farmacéutico</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Observaciones, precio, disponibilidad..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={uploadMutation.isPending || !file}>
              {uploadMutation.isPending ? "Subiendo..." : "Guardar Prescripción"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Vista de Perfil del Cliente ──────────────────────────────────────────────
function CustomerProfile({ customer, onBack }: { customer: Customer; onBack: () => void }) {
  const utils = trpc.useUtils();
  const { data: prescriptions = [], isLoading } = trpc.pharmacy.listPrescriptions.useQuery({ customerId: customer.id });
  const updateStatus = trpc.pharmacy.updatePrescriptionStatus.useMutation({
    onSuccess: () => { toast.success("Estado actualizado"); utils.pharmacy.listPrescriptions.invalidate({ customerId: customer.id }); },
    onError: (e) => toast.error("Error: " + e.message),
  });
  const deletePrescription = trpc.pharmacy.deletePrescription.useMutation({
    onSuccess: () => { toast.success("Prescripción eliminada"); utils.pharmacy.listPrescriptions.invalidate({ customerId: customer.id }); },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const [showUpload, setShowUpload] = useState(false);
  const [viewFile, setViewFile] = useState<string | null>(null);
  const [editCustomer, setEditCustomer] = useState(false);

  const age = customer.birthDate
    ? Math.floor((Date.now() - new Date(customer.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
      </div>

      {/* Info del cliente */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{customer.name}</h2>
                <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                  {age !== null && <span>{age} años</span>}
                  {customer.gender && <span>{customer.gender}</span>}
                  {customer.phone && (
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {customer.phone}</span>
                  )}
                  {customer.email && (
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {customer.email}</span>
                  )}
                </div>
                {customer.allergies && (
                  <div className="mt-2 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700 inline-flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Alergias: {customer.allergies}
                  </div>
                )}
                {customer.address && (
                  <p className="text-xs text-muted-foreground mt-1">{customer.address}</p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditCustomer(true)}>
              <Edit2 className="w-4 h-4 mr-1" /> Editar
            </Button>
          </div>
          {customer.notes && (
            <p className="mt-3 text-sm text-muted-foreground border-t pt-3">{customer.notes}</p>
          )}
        </CardContent>
      </Card>

      {/* Prescripciones */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Historial de Prescripciones
            <Badge variant="secondary">{prescriptions.length}</Badge>
          </h3>
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Upload className="w-4 h-4 mr-1" /> Subir Prescripción
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : prescriptions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-3" />
              <p className="text-muted-foreground text-sm">No hay prescripciones registradas</p>
              <Button className="mt-3" size="sm" onClick={() => setShowUpload(true)}>
                <Upload className="w-4 h-4 mr-1" /> Subir Primera Prescripción
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(prescriptions as PharmacyPrescription[]).map((rx) => {
              const statusInfo = STATUS_MAP[rx.status] || STATUS_MAP.pending;
              const StatusIcon = statusInfo.icon;
              return (
                <Card key={rx.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      {/* Miniatura del archivo */}
                      {rx.fileUrl && (
                        <button
                          onClick={() => setViewFile(rx.fileUrl!)}
                          className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border bg-muted hover:opacity-80 transition-opacity"
                        >
                          {rx.fileMimeType?.startsWith("image/") ? (
                            <img src={rx.fileUrl} alt="Receta" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="w-7 h-7 text-muted-foreground" />
                            </div>
                          )}
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {rx.doctorName && (
                                <span className="font-medium text-sm">{rx.doctorName}</span>
                              )}
                              {rx.prescriptionDate && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {new Date(rx.prescriptionDate).toLocaleDateString("es-MX")}
                                </span>
                              )}
                            </div>
                            {rx.medications && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rx.medications}</p>
                            )}
                            {rx.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5 italic">{rx.notes}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Registrada: {new Date(rx.createdAt).toLocaleDateString("es-MX")}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {rx.fileUrl && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewFile(rx.fileUrl!)} title="Ver archivo">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm("¿Eliminar esta prescripción?")) {
                                  deletePrescription.mutate({ id: rx.id });
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Estado */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${statusInfo.color}`}>
                            <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                          </span>
                          {rx.status !== "dispensed" && (
                            <Select
                              value={rx.status}
                              onValueChange={(v) => updateStatus.mutate({ id: rx.id, status: v as any })}
                            >
                              <SelectTrigger className="h-6 text-xs w-auto border-none shadow-none p-0 pl-1 text-muted-foreground hover:text-foreground">
                                <span>Cambiar estado</span>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Por surtir</SelectItem>
                                <SelectItem value="partial">Surtida parcialmente</SelectItem>
                                <SelectItem value="dispensed">Surtida completa</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modales */}
      <UploadPrescriptionModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        customerId={customer.id}
        customerName={customer.name}
      />
      <CustomerModal
        open={editCustomer}
        onClose={() => setEditCustomer(false)}
        customer={customer}
      />

      {/* Visor de archivo */}
      {viewFile && (
        <Dialog open={!!viewFile} onOpenChange={() => setViewFile(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Prescripción</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center min-h-64">
              {viewFile.includes(".pdf") || viewFile.includes("pdf") ? (
                <iframe src={viewFile} className="w-full h-96 rounded" title="Prescripción PDF" />
              ) : (
                <img src={viewFile} alt="Prescripción" className="max-h-96 object-contain rounded" />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => window.open(viewFile, "_blank")}>
                <Eye className="w-4 h-4 mr-1" /> Abrir en nueva pestaña
              </Button>
              <Button variant="outline" onClick={() => setViewFile(null)}>Cerrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
function FarmaciaInner() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const { data: customers = [], isLoading } = trpc.pharmacy.listCustomers.useQuery({ search: search || undefined });
  const deleteMutation = trpc.pharmacy.deleteCustomer.useMutation({
    onSuccess: () => { toast.success("Cliente eliminado"); utils.pharmacy.listCustomers.invalidate(); },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const [showNew, setShowNew] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  if (selectedCustomer) {
    return <CustomerProfile customer={selectedCustomer} onBack={() => setSelectedCustomer(null)} />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Pill className="w-6 h-6 text-primary" /> Farmacia — Clientes y Prescripciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {customers.length} cliente{customers.length !== 1 ? "s" : ""} registrado{customers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Cliente
        </Button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre, teléfono o correo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <User className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
            <p className="text-muted-foreground">
              {search ? "No se encontraron clientes con esa búsqueda" : "Aún no has registrado clientes"}
            </p>
            {!search && (
              <Button className="mt-4" onClick={() => setShowNew(true)}>
                <Plus className="w-4 h-4 mr-1" /> Registrar Primer Cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(customers as Customer[]).map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
              onClick={() => setSelectedCustomer(c)}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{c.name}</p>
                    {c.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </p>
                    )}
                    {c.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <Mail className="w-3 h-3" /> {c.email}
                      </p>
                    )}
                    {c.allergies && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {c.allergies}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Desde {new Date(c.createdAt).toLocaleDateString("es-MX")}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm(`¿Eliminar a ${c.name} del registro?`)) {
                        deleteMutation.mutate({ id: c.id });
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

      <CustomerModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

export default function Farmacia() {
  return (
    <DashboardLayout>
      <ModuleGuard module="pharmacy">
        <FarmaciaInner />
      </ModuleGuard>
    </DashboardLayout>
  );
}
