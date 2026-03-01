import { useState, useRef, useEffect, useCallback } from "react";
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
  FileText, Plus, Printer, Send, Trash2, Pen, RotateCcw,
  Upload, User, Stethoscope, Pill, Settings, X, Eye, ChevronLeft,
  Phone, Mail, Building2, BadgeCheck, Save, Pencil, Download
} from "lucide-react";
import { generatePrescriptionPdf } from "@/lib/generatePrescriptionPdf";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Medication {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

// ─── Componente de Firma Digital ─────────────────────────────────────────────
function SignatureCanvas({
  onSave,
  onClear,
  savedUrl,
}: {
  onSave: (base64: string) => void;
  onClear: () => void;
  savedUrl?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top };
  };

  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext("2d");
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
    setHasDrawn(true);
  }, [isDrawing]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", endDraw);
    canvas.addEventListener("mouseleave", endDraw);
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", endDraw);
    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", endDraw);
      canvas.removeEventListener("mouseleave", endDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", endDraw);
    };
  }, [startDraw, draw, endDraw]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onClear();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    onSave(canvas.toDataURL("image/png"));
    toast.success("Firma guardada");
  };

  return (
    <div className="space-y-2">
      <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={480}
          height={140}
          className="w-full cursor-crosshair touch-none"
          style={{ display: "block" }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">Firma con el mouse o con el dedo en pantalla táctil</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleClear} className="flex-1">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Limpiar
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={!hasDrawn} className="flex-1">
          <Save className="w-3.5 h-3.5 mr-1" /> Guardar Firma
        </Button>
      </div>
      {savedUrl && (
        <div className="mt-2 p-2 bg-green-50 rounded border border-green-200 text-center">
          <p className="text-xs text-green-700 font-medium">✓ Firma guardada</p>
          <img src={savedUrl} alt="Firma" className="h-12 mx-auto mt-1 object-contain" />
        </div>
      )}
    </div>
  );
}

// ─── Modal de Configuración del Doctor ───────────────────────────────────────
function DoctorProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: profile } = trpc.prescriptions.getDoctorProfile.useQuery();
  const saveMutation = trpc.prescriptions.saveDoctorProfile.useMutation({
    onSuccess: () => { toast.success("Perfil guardado"); utils.prescriptions.getDoctorProfile.invalidate(); onClose(); },
    onError: (e) => toast.error("Error: " + e.message),
  });
  const uploadMembrete = trpc.prescriptions.uploadMembrete.useMutation({
    onSuccess: () => { toast.success("Membrete subido"); utils.prescriptions.getDoctorProfile.invalidate(); },
    onError: (e) => toast.error("Error al subir membrete: " + e.message),
  });
  const uploadStamp = trpc.prescriptions.uploadStamp.useMutation({
    onSuccess: () => { toast.success("Sello subido correctamente"); utils.prescriptions.getDoctorProfile.invalidate(); },
    onError: (e) => toast.error("Error al subir sello: " + e.message),
  });
  const saveSignature = trpc.prescriptions.saveSignature.useMutation({
    onSuccess: () => { toast.success("Firma guardada en perfil"); utils.prescriptions.getDoctorProfile.invalidate(); },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const [form, setForm] = useState({
    fullName: "", specialty: "", licenseNumber: "", institution: "", officePhone: "", officeAddress: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName || "",
        specialty: profile.specialty || "",
        licenseNumber: profile.licenseNumber || "",
        institution: profile.institution || "",
        officePhone: profile.officePhone || "",
        officeAddress: profile.officeAddress || "",
      });
    }
  }, [profile]);

  const handleMembreteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("El archivo no debe superar 5 MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadMembrete.mutate({ fileName: file.name, fileBase64: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error("El sello no debe superar 3 MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadStamp.mutate({ fileName: file.name, fileBase64: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" /> Perfil del Doctor
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nombre completo</Label>
              <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Dr. Juan Pérez" />
            </div>
            <div className="space-y-1">
              <Label>Especialidad</Label>
              <Input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="Medicina General" />
            </div>
            <div className="space-y-1">
              <Label>Cédula Profesional</Label>
              <Input value={form.licenseNumber} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))} placeholder="12345678" />
            </div>
            <div className="space-y-1">
              <Label>Institución / Clínica</Label>
              <Input value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="Clínica San José" />
            </div>
            <div className="space-y-1">
              <Label>Teléfono de consultorio</Label>
              <Input value={form.officePhone} onChange={e => setForm(f => ({ ...f, officePhone: e.target.value }))} placeholder="(55) 1234-5678" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Dirección del consultorio</Label>
            <Textarea value={form.officeAddress} onChange={e => setForm(f => ({ ...f, officeAddress: e.target.value }))} placeholder="Calle, Colonia, Ciudad..." rows={2} />
          </div>

          {/* Membrete */}
          <div className="space-y-2 border rounded-lg p-3">
            <Label className="flex items-center gap-1.5 font-semibold">
              <Upload className="w-4 h-4" /> Imagen del Membrete / Encabezado
            </Label>
            <p className="text-xs text-muted-foreground">Sube la imagen de tu membrete oficial con logo, nombre y datos. Aparecerá en la parte superior de cada receta.</p>
            {profile?.membreteUrl && (
              <img src={profile.membreteUrl} alt="Membrete" className="w-full max-h-32 object-contain border rounded" />
            )}
            <label className="cursor-pointer">
              <div className="border-2 border-dashed border-border rounded-lg p-3 text-center hover:border-primary/50 transition-colors">
                <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">{uploadMembrete.isPending ? "Subiendo..." : "Clic para subir imagen (JPG, PNG, PDF)"}</p>
              </div>
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleMembreteUpload} disabled={uploadMembrete.isPending} />
            </label>
          </div>

          {/* Sello */}
          <div className="space-y-2 border rounded-lg p-3">
            <Label className="flex items-center gap-1.5 font-semibold">
              <Upload className="w-4 h-4" /> Sello del Doctor / Clínica
            </Label>
            <p className="text-xs text-muted-foreground">Sube la imagen de tu sello oficial. Aparecerá en la parte inferior de cada receta junto a la firma.</p>
            {(profile as any)?.stampUrl && (
              <img src={(profile as any).stampUrl} alt="Sello" className="max-h-24 object-contain border rounded" />
            )}
            <label className="cursor-pointer">
              <div className="border-2 border-dashed border-border rounded-lg p-3 text-center hover:border-primary/50 transition-colors">
                <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">{uploadStamp.isPending ? "Subiendo..." : "Clic para subir sello (JPG, PNG)"}</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleStampUpload} disabled={uploadStamp.isPending} />
            </label>
          </div>

          {/* Firma */}
          <div className="space-y-2 border rounded-lg p-3">
            <Label className="flex items-center gap-1.5 font-semibold">
              <Pen className="w-4 h-4" /> Firma Digital (guardada en perfil)
            </Label>
            <p className="text-xs text-muted-foreground">Dibuja tu firma para usarla automáticamente en las recetas.</p>
            <SignatureCanvas
              onSave={(b64) => saveSignature.mutate({ signatureBase64: b64 })}
              onClear={() => {}}
              savedUrl={profile?.savedSignatureUrl}
            />
          </div>

          <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Guardando..." : "Guardar Perfil"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal Nueva Receta ───────────────────────────────────────────────────────
function NewPrescriptionModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const utils = trpc.useUtils();
  const { data: profile } = trpc.prescriptions.getDoctorProfile.useQuery();
  const createMutation = trpc.prescriptions.create.useMutation({
    onSuccess: () => { toast.success("Receta creada"); utils.prescriptions.list.invalidate(); onCreated(); onClose(); },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const [form, setForm] = useState({
    patientName: "", patientAge: "", patientGender: "", diagnosis: "", instructions: "",
  });
  const [medications, setMedications] = useState<Medication[]>([
    { name: "", dose: "", frequency: "", duration: "", instructions: "" }
  ]);
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [useProfileSignature, setUseProfileSignature] = useState(true);

  const addMed = () => setMedications(m => [...m, { name: "", dose: "", frequency: "", duration: "", instructions: "" }]);
  const removeMed = (i: number) => setMedications(m => m.filter((_, idx) => idx !== i));
  const updateMed = (i: number, field: keyof Medication, value: string) =>
    setMedications(m => m.map((med, idx) => idx === i ? { ...med, [field]: value } : med));

  const handleSubmit = () => {
    if (!form.patientName) { toast.error("El nombre del paciente es requerido"); return; }
    const validMeds = medications.filter(m => m.name.trim());
    if (validMeds.length === 0) { toast.error("Agrega al menos un medicamento"); return; }
    const sig = useProfileSignature && profile?.savedSignatureUrl ? undefined : (signatureBase64 || undefined);
    createMutation.mutate({
      ...form,
      medications: JSON.stringify(validMeds),
      signatureBase64: sig,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Nueva Receta Médica
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Datos del paciente */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Datos del Paciente</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nombre completo *</Label>
                <Input value={form.patientName} onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))} placeholder="Nombre del paciente" />
              </div>
              <div className="space-y-1">
                <Label>Edad</Label>
                <Input value={form.patientAge} onChange={e => setForm(f => ({ ...f, patientAge: e.target.value }))} placeholder="Ej: 35 años" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Género</Label>
                <Select value={form.patientGender} onValueChange={v => setForm(f => ({ ...f, patientGender: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="femenino">Femenino</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Diagnóstico</Label>
                <Input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} placeholder="Diagnóstico principal" />
              </div>
            </div>
          </div>

          {/* Medicamentos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Medicamentos</h3>
              <Button type="button" variant="outline" size="sm" onClick={addMed}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
              </Button>
            </div>
            {medications.map((med, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Medicamento {i + 1}</span>
                  {medications.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeMed(i)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Nombre del medicamento *</Label>
                    <Input value={med.name} onChange={e => updateMed(i, "name", e.target.value)} placeholder="Ej: Amoxicilina 500mg" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dosis</Label>
                    <Input value={med.dose} onChange={e => updateMed(i, "dose", e.target.value)} placeholder="Ej: 1 cápsula" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Frecuencia</Label>
                    <Input value={med.frequency} onChange={e => updateMed(i, "frequency", e.target.value)} placeholder="Ej: cada 8 horas" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Duración</Label>
                    <Input value={med.duration} onChange={e => updateMed(i, "duration", e.target.value)} placeholder="Ej: 7 días" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Indicaciones especiales</Label>
                    <Input value={med.instructions} onChange={e => updateMed(i, "instructions", e.target.value)} placeholder="Ej: con alimentos" className="h-8 text-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Indicaciones generales */}
          <div className="space-y-1">
            <Label>Indicaciones generales</Label>
            <Textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} placeholder="Reposo, dieta, cuidados especiales..." rows={2} />
          </div>

          {/* Firma */}
          <div className="space-y-3 border rounded-lg p-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Pen className="w-4 h-4" /> Firma del Doctor
            </h3>
            {profile?.savedSignatureUrl && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="useProfileSig"
                  checked={useProfileSignature}
                  onChange={e => setUseProfileSignature(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="useProfileSig" className="text-sm cursor-pointer">
                  Usar firma guardada en mi perfil
                </label>
                {useProfileSignature && (
                  <img src={profile.savedSignatureUrl} alt="Firma" className="h-10 object-contain border rounded ml-auto" />
                )}
              </div>
            )}
            {(!useProfileSignature || !profile?.savedSignatureUrl) && (
              <SignatureCanvas
                onSave={(b64) => setSignatureBase64(b64)}
                onClear={() => setSignatureBase64(null)}
                savedUrl={signatureBase64}
              />
            )}
            <p className="text-xs text-muted-foreground">
              La firma es opcional. Si no firmas digitalmente, puedes imprimir y firmar manualmente.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creando..." : "Crear Receta"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Vista de Receta para Impresión ──────────────────────────────────────────
function PrescriptionView({ prescription, profile, onClose }: {
  prescription: any;
  profile: any;
  onClose: () => void;
}) {
  const medications: Medication[] = (() => {
    try { return JSON.parse(prescription.medications); } catch { return []; }
  })();

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    try {
      const meds: Medication[] = (() => {
        try { return JSON.parse(prescription.medications); } catch { return []; }
      })();
      await generatePrescriptionPdf({
        doctorName: profile?.fullName || "Doctor",
        specialty: profile?.specialty,
        licenseNumber: profile?.licenseNumber,
        phone: profile?.phone,
        email: profile?.email,
        address: profile?.address,
        headerImageUrl: profile?.membreteUrl,
        stampUrl: profile?.stampUrl,
        signatureDataUrl: prescription.signatureDataUrl || null,
        patientName: prescription.patientName,
        patientAge: prescription.patientAge,
        prescriptionDate: prescription.prescriptionDate,
        diagnosis: prescription.diagnosis,
        medications: meds.map(m => ({ name: m.name, dose: m.dose, instructions: [m.frequency, m.duration, m.instructions].filter(Boolean).join(" · ") })),
        notes: prescription.instructions,
        folio: prescription.id ? `RX-${String(prescription.id).padStart(5, "0")}` : undefined,
      });
    } catch (e) {
      toast.error("Error al generar PDF");
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `*RECETA MÉDICA*\n\n` +
      `*Doctor:* ${profile?.fullName || "Dr."}\n` +
      `*Especialidad:* ${profile?.specialty || ""}\n` +
      `*Cédula:* ${profile?.licenseNumber || ""}\n\n` +
      `*Paciente:* ${prescription.patientName}\n` +
      `*Edad:* ${prescription.patientAge || "N/A"}\n` +
      `*Fecha:* ${new Date(prescription.prescriptionDate).toLocaleDateString("es-MX")}\n\n` +
      `*Diagnóstico:* ${prescription.diagnosis || "N/A"}\n\n` +
      `*Medicamentos:*\n` +
      medications.map((m, i) =>
        `${i + 1}. ${m.name}\n   Dosis: ${m.dose} | ${m.frequency} | ${m.duration}${m.instructions ? `\n   Indicaciones: ${m.instructions}` : ""}`
      ).join("\n") +
      (prescription.instructions ? `\n\n*Indicaciones generales:*\n${prescription.instructions}` : "")
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Receta Médica - ${prescription.patientName}`);
    const body = encodeURIComponent(
      `Receta Médica\n\nDoctor: ${profile?.fullName || ""}\nEspecialidad: ${profile?.specialty || ""}\nCédula: ${profile?.licenseNumber || ""}\n\nPaciente: ${prescription.patientName}\nEdad: ${prescription.patientAge || "N/A"}\nFecha: ${new Date(prescription.prescriptionDate).toLocaleDateString("es-MX")}\n\nDiagnóstico: ${prescription.diagnosis || "N/A"}\n\nMedicamentos:\n${medications.map((m, i) => `${i + 1}. ${m.name} - ${m.dose} ${m.frequency} por ${m.duration}`).join("\n")}\n\n${prescription.instructions ? `Indicaciones: ${prescription.instructions}` : ""}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Acciones */}
      <div className="flex gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={onClose}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
        <Button size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-1" /> Imprimir
        </Button>
        <Button size="sm" variant="outline" onClick={handleDownloadPdf} className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100">
          <Download className="w-4 h-4 mr-1" /> PDF
        </Button>
        <Button size="sm" variant="outline" onClick={handleWhatsApp} className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100">
          <Send className="w-4 h-4 mr-1" /> WhatsApp
        </Button>
        <Button size="sm" variant="outline" onClick={handleEmail}>
          <Mail className="w-4 h-4 mr-1" /> Correo
        </Button>
      </div>

      {/* Receta imprimible */}
      <div id="prescription-print" className="border rounded-xl p-6 bg-white max-w-2xl mx-auto shadow-sm">
        {/* Membrete */}
        {profile?.membreteUrl ? (
          <div className="mb-4 border-b pb-4">
            <img src={profile.membreteUrl} alt="Membrete" className="max-h-28 object-contain" />
          </div>
        ) : (
          <div className="mb-4 border-b pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">{profile?.fullName || "Doctor"}</h2>
                <p className="text-sm text-muted-foreground">{profile?.specialty}</p>
                <p className="text-xs text-muted-foreground">Cédula Prof.: {profile?.licenseNumber}</p>
                {profile?.institution && <p className="text-xs text-muted-foreground">{profile.institution}</p>}
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {profile?.officePhone && <p>{profile.officePhone}</p>}
                {profile?.officeAddress && <p className="max-w-48">{profile.officeAddress}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Datos del paciente */}
        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Paciente:</span>
            <p className="font-semibold">{prescription.patientName}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Edad:</span>
            <p className="font-semibold">{prescription.patientAge || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Fecha:</span>
            <p className="font-semibold">{new Date(prescription.prescriptionDate).toLocaleDateString("es-MX")}</p>
          </div>
        </div>

        {prescription.diagnosis && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
            <span className="font-semibold text-blue-800">Diagnóstico: </span>
            <span className="text-blue-700">{prescription.diagnosis}</span>
          </div>
        )}

        {/* Medicamentos */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm">MEDICAMENTOS</h3>
          </div>
          <div className="space-y-3">
            {medications.map((med, i) => (
              <div key={i} className="pl-4 border-l-2 border-primary/30">
                <p className="font-semibold text-sm">{i + 1}. {med.name}</p>
                <p className="text-xs text-muted-foreground">
                  {med.dose && `Dosis: ${med.dose}`}
                  {med.frequency && ` · ${med.frequency}`}
                  {med.duration && ` · por ${med.duration}`}
                </p>
                {med.instructions && <p className="text-xs text-muted-foreground italic">{med.instructions}</p>}
              </div>
            ))}
          </div>
        </div>

        {prescription.instructions && (
          <div className="mb-4 p-3 bg-muted/30 rounded-lg text-sm">
            <p className="font-semibold mb-1">Indicaciones generales:</p>
            <p className="text-muted-foreground">{prescription.instructions}</p>
          </div>
        )}

        {/* Firma */}
        <div className="mt-6 pt-4 border-t flex items-end justify-between">
          <div className="text-center">
            {prescription.signatureUrl ? (
              <img src={prescription.signatureUrl} alt="Firma" className="h-16 object-contain mx-auto mb-1" />
            ) : profile?.savedSignatureUrl ? (
              <img src={profile.savedSignatureUrl} alt="Firma" className="h-16 object-contain mx-auto mb-1" />
            ) : (
              <div className="h-16 w-40 border-b border-dashed border-muted-foreground mb-1" />
            )}
            <p className="text-xs text-muted-foreground">Firma del médico</p>
            <p className="text-xs font-medium">{profile?.fullName || ""}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Cédula: {profile?.licenseNumber || "___________"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Editar Receta ─────────────────────────────────────────────────────
function EditPrescriptionModal({ prescription, open, onClose, onUpdated }: {
  prescription: any; open: boolean; onClose: () => void; onUpdated: () => void;
}) {
  const updateMutation = trpc.prescriptions.update.useMutation({
    onSuccess: () => { toast.success("Receta actualizada"); onUpdated(); },
    onError: (e) => toast.error("Error al actualizar: " + e.message),
  });

  const meds: Medication[] = (() => { try { return JSON.parse(prescription.medications); } catch { return []; } })();

  const [form, setForm] = useState({
    patientName: prescription.patientName || "",
    patientAge: prescription.patientAge || "",
    patientGender: prescription.patientGender || "",
    diagnosis: prescription.diagnosis || "",
    instructions: prescription.instructions || "",
  });
  const [medications, setMedications] = useState<Medication[]>(meds.length > 0 ? meds : [{ name: "", dose: "", frequency: "", duration: "", instructions: "" }]);

  const addMed = () => setMedications(m => [...m, { name: "", dose: "", frequency: "", duration: "", instructions: "" }]);
  const removeMed = (i: number) => setMedications(m => m.filter((_, idx) => idx !== i));
  const updateMed = (i: number, field: keyof Medication, value: string) =>
    setMedications(m => m.map((med, idx) => idx === i ? { ...med, [field]: value } : med));

  const handleSave = () => {
    if (!form.patientName.trim()) { toast.error("El nombre del paciente es obligatorio"); return; }
    if (medications.some(m => !m.name.trim())) { toast.error("Todos los medicamentos deben tener nombre"); return; }
    updateMutation.mutate({
      id: prescription.id,
      ...form,
      medications: JSON.stringify(medications),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" /> Editar Receta
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Datos del paciente */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 space-y-1">
              <Label>Nombre del Paciente *</Label>
              <Input value={form.patientName} onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Edad</Label>
              <Input value={form.patientAge} onChange={e => setForm(f => ({ ...f, patientAge: e.target.value }))} placeholder="Ej. 35 años" />
            </div>
            <div className="space-y-1">
              <Label>Género</Label>
              <Select value={form.patientGender} onValueChange={v => setForm(f => ({ ...f, patientGender: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="femenino">Femenino</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Diagnóstico</Label>
              <Input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} />
            </div>
          </div>

          {/* Medicamentos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Medicamentos</Label>
              <Button variant="outline" size="sm" onClick={addMed}><Plus className="w-3.5 h-3.5 mr-1" /> Agregar</Button>
            </div>
            {medications.map((med, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 p-3 border rounded-lg">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Medicamento *</Label>
                  <Input value={med.name} onChange={e => updateMed(i, "name", e.target.value)} placeholder="Nombre" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dosis</Label>
                  <Input value={med.dose} onChange={e => updateMed(i, "dose", e.target.value)} placeholder="500mg" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Frecuencia</Label>
                  <Input value={med.frequency} onChange={e => updateMed(i, "frequency", e.target.value)} placeholder="c/8h" className="h-8 text-sm" />
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMed(i)} disabled={medications.length === 1}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label>Indicaciones adicionales</Label>
            <Textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} rows={2} />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-1" /> {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
function PrescriptionsInner() {
  const utils = trpc.useUtils();
  const { data: prescriptions = [], isLoading } = trpc.prescriptions.list.useQuery();
  const { data: profile } = trpc.prescriptions.getDoctorProfile.useQuery();
  const deleteMutation = trpc.prescriptions.delete.useMutation({
    onSuccess: () => { toast.success("Receta eliminada"); utils.prescriptions.list.invalidate(); },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const [showNew, setShowNew] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [viewPrescription, setViewPrescription] = useState<any | null>(null);
  const [editPrescription, setEditPrescription] = useState<any | null>(null);

  if (viewPrescription) {
    return (
      <div className="max-w-3xl mx-auto">
        <PrescriptionView
          prescription={viewPrescription}
          profile={profile}
          onClose={() => setViewPrescription(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Prescripciones Médicas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {prescriptions.length} receta{prescriptions.length !== 1 ? "s" : ""} emitida{prescriptions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowProfile(true)}>
            <Settings className="w-4 h-4 mr-1" /> Mi Perfil / Membrete
          </Button>
          <Button onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-1" /> Nueva Receta
          </Button>
        </div>
      </div>

      {/* Aviso si no hay perfil */}
      {!profile?.fullName && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 flex items-center gap-3">
            <BadgeCheck className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Completa tu perfil de doctor</p>
              <p className="text-xs text-amber-700">Agrega tu nombre, cédula profesional y membrete para que aparezcan en tus recetas.</p>
            </div>
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-700" onClick={() => setShowProfile(true)}>
              Configurar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista de recetas */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : prescriptions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
            <p className="text-muted-foreground">No has emitido recetas todavía</p>
            <Button className="mt-4" onClick={() => setShowNew(true)}>
              <Plus className="w-4 h-4 mr-1" /> Crear Primera Receta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx: any) => {
            const meds: Medication[] = (() => { try { return JSON.parse(rx.medications); } catch { return []; } })();
            return (
              <Card key={rx.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">{rx.patientName}</p>
                          {rx.patientAge && <span className="text-xs text-muted-foreground">{rx.patientAge}</span>}
                          <Badge variant={rx.status === "signed" ? "default" : "secondary"} className="text-xs">
                            {rx.status === "signed" ? "Firmada" : "Borrador"}
                          </Badge>
                        </div>
                        {rx.diagnosis && <p className="text-sm text-muted-foreground mt-0.5">Dx: {rx.diagnosis}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {meds.length} medicamento{meds.length !== 1 ? "s" : ""} · {new Date(rx.prescriptionDate).toLocaleDateString("es-MX")}
                        </p>
                        {meds.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">{meds.map(m => m.name).join(", ")}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewPrescription(rx)} title="Ver / Imprimir">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700" onClick={() => setEditPrescription(rx)} title="Editar receta">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewPrescription(rx)} title="Imprimir">
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`¿Eliminar la receta de ${rx.patientName}?`)) {
                            deleteMutation.mutate({ id: rx.id });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modales */}
      <DoctorProfileModal open={showProfile} onClose={() => setShowProfile(false)} />
      <NewPrescriptionModal open={showNew} onClose={() => setShowNew(false)} onCreated={() => {}} />
      {editPrescription && (
        <EditPrescriptionModal
          prescription={editPrescription}
          open={!!editPrescription}
          onClose={() => setEditPrescription(null)}
          onUpdated={() => { utils.prescriptions.list.invalidate(); setEditPrescription(null); }}
        />
      )}

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          body > *:not(#prescription-print) { display: none !important; }
          #prescription-print { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function Prescriptions() {
  return (
    <DashboardLayout>
      <ModuleGuard module="prescriptions">
        <PrescriptionsInner />
      </ModuleGuard>
    </DashboardLayout>
  );
}
