import { useState, useRef, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  User, Building2, CreditCard, FileText, Camera, Upload,
  CheckCircle2, AlertCircle, Eye, ExternalLink, Loader2, Save
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Section = "personal" | "negocio" | "bancario" | "documentos" | "capacitaciones";

const SECTIONS: { id: Section; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "personal", label: "Datos Personales", icon: User, desc: "Nombre, CURP, RFC, fecha de nacimiento" },
  { id: "negocio", label: "Mi Negocio", icon: Building2, desc: "Razón social, dirección fiscal, giro" },
  { id: "bancario", label: "Datos Bancarios", icon: CreditCard, desc: "CLABE, banco, titular de cuenta" },
  { id: "documentos", label: "Documentos", icon: FileText, desc: "INE, comprobante de domicilio, acta" },
  { id: "capacitaciones", label: "Perfil Profesional", icon: CheckCircle2, desc: "Cursos completados y evidencias" },
];

const ESTADOS_MX = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua",
  "Ciudad de México","Coahuila","Colima","Durango","Estado de México","Guanajuato","Guerrero",
  "Hidalgo","Jalisco","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro",
  "Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala",
  "Veracruz","Yucatán","Zacatecas",
];

const BANCOS_MX = [
  "BBVA","Banamex (Citibanamex)","Santander","Banorte","HSBC","Scotiabank","Inbursa",
  "Azteca","BanBajío","Afirme","Multiva","Bansí","Mifel","Monexcb","Ve por Más",
  "Intercam","Actinver","Invex","CIBanco","Compartamos","Hey Banco","Nu (Nubank)",
  "Spin by OXXO","Mercado Pago","Otro",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function calcProgress(profile: Record<string, unknown> | null | undefined): number {
  if (!profile) return 0;
  const fields = [
    "fullName","birthDate","curp","rfc","phone",
    "businessName","razonSocial","direccionFiscal","ciudad","estado",
    "clabe","banco","titularCuenta",
    "ineUrl","domicilioUrl","avatarUrl",
  ];
  const filled = fields.filter(f => !!profile[f]).length;
  return Math.round((filled / fields.length) * 100);
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function MyProfile() {
  const [activeSection, setActiveSection] = useState<Section>("personal");
  const utils = trpc.useUtils();

  const { data: profile, isLoading } = trpc.profile.get.useQuery();

  const updateMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Datos guardados correctamente");
      utils.profile.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadAvatarMutation = trpc.profile.uploadAvatar.useMutation({
    onSuccess: (data) => {
      toast.success("Foto de perfil actualizada");
      setAvatarPreview(data.url);
      utils.profile.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadDocMutation = trpc.profile.uploadDocument.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`Documento "${vars.docType}" subido correctamente`);
      utils.profile.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("La imagen no puede superar 5MB"); return; }
    const base64 = await fileToBase64(file);
    setAvatarPreview(base64);
    uploadAvatarMutation.mutate({ base64, mimeType: file.type });
  }, [uploadAvatarMutation]);

  const handleDocUpload = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: "ine" | "domicilio" | "acta"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("El archivo no puede superar 10MB"); return; }
    const base64 = await fileToBase64(file);
    uploadDocMutation.mutate({ base64, mimeType: file.type, docType });
  }, [uploadDocMutation]);

  const progress = calcProgress(profile as Record<string, unknown> | null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const p = profile as unknown as Record<string, string | null | undefined> | null;

  return (
    <DashboardLayout>
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      {/* Header con foto y progreso */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center bg-card border rounded-xl p-6">
        {/* Avatar */}
        <div className="relative group">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-4 border-background shadow-lg">
            {(avatarPreview || p?.avatarUrl) ? (
              <img
                src={avatarPreview || p?.avatarUrl || ""}
                alt="Foto de perfil"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                <User className="h-10 w-10 text-primary/50" />
              </div>
            )}
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            disabled={uploadAvatarMutation.isPending}
          >
            {uploadAvatarMutation.isPending
              ? <Loader2 className="h-6 w-6 text-white animate-spin" />
              : <Camera className="h-6 w-6 text-white" />
            }
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Info y progreso */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold truncate">
              {p?.fullName || "Mi Perfil"}
            </h1>
            {p?.accountType && (
              <Badge variant="secondary" className="capitalize">
                {p.accountType === "business" ? "Negocio" :
                 p.accountType === "admin" ? "Administrador" :
                 p.accountType === "employee" ? "Empleado" : p.accountType}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">{p?.businessName || "Sin negocio registrado"}</p>
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Perfil completado</span>
              <span className="font-semibold text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          {progress < 100 && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Completa tu perfil para acceder a todas las funciones
            </p>
          )}
        </div>
      </div>

      {/* Navegación de secciones */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {SECTIONS.map(({ id, label, icon: Icon, desc }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`text-left p-4 rounded-xl border transition-all ${
              activeSection === id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/40 hover:bg-muted/50"
            }`}
          >
            <Icon className={`h-5 w-5 mb-2 ${activeSection === id ? "text-primary" : "text-muted-foreground"}`} />
            <div className={`font-semibold text-sm ${activeSection === id ? "text-primary" : ""}`}>{label}</div>
            <div className="text-xs text-muted-foreground mt-0.5 hidden md:block">{desc}</div>
          </button>
        ))}
      </div>

      {/* Sección Datos Personales */}
      {activeSection === "personal" && (
        <PersonalSection profile={p} onSave={(data) => updateMutation.mutate(data)} saving={updateMutation.isPending} />
      )}

      {/* Sección Negocio */}
      {activeSection === "negocio" && (
        <NegocioSection profile={p} onSave={(data) => updateMutation.mutate(data)} saving={updateMutation.isPending} />
      )}

      {/* Sección Bancario */}
      {activeSection === "bancario" && (
        <BancarioSection profile={p} onSave={(data) => updateMutation.mutate(data)} saving={updateMutation.isPending} />
      )}

      {/* Sección Documentos */}
      {activeSection === "documentos" && (
        <DocumentosSection
          profile={p}
          onUpload={handleDocUpload}
          uploading={uploadDocMutation.isPending}
          uploadingDocType={uploadDocMutation.variables?.docType}
        />
      )}
      {/* Sección Perfil Profesional */}
      {activeSection === "capacitaciones" && (
        <CapacitacionesSection />
      )}
    </div>
    </DashboardLayout>
  );
}

// ─── Sección: Datos Personales ────────────────────────────────────────────────
function PersonalSection({
  profile, onSave, saving
}: {
  profile: Record<string, string | null | undefined> | null;
  onSave: (data: Record<string, string>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    fullName: profile?.fullName || "",
    birthDate: profile?.birthDate || "",
    curp: profile?.curp || "",
    rfc: profile?.rfc || "",
    phone: profile?.phone || "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Datos Personales</CardTitle>
        <CardDescription>Información personal requerida para verificación de identidad</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre completo <span className="text-destructive">*</span></Label>
            <Input id="fullName" value={form.fullName} onChange={set("fullName")} placeholder="Nombre Apellido Apellido" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">Fecha de nacimiento <span className="text-destructive">*</span></Label>
            <Input id="birthDate" type="date" value={form.birthDate} onChange={set("birthDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="curp">CURP <span className="text-destructive">*</span></Label>
            <Input
              id="curp"
              value={form.curp}
              onChange={set("curp")}
              placeholder="XXXX000000XXXXXX00"
              maxLength={18}
              className="uppercase"
            />
            <p className="text-xs text-muted-foreground">18 caracteres. <a href="https://www.gob.mx/curp/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Consultar CURP</a></p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rfc">RFC <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input
              id="rfc"
              value={form.rfc}
              onChange={set("rfc")}
              placeholder="XXXX000000XXX"
              maxLength={13}
              className="uppercase"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="phone">Teléfono celular <span className="text-destructive">*</span></Label>
            <Input id="phone" value={form.phone} onChange={set("phone")} placeholder="+52 55 1234 5678" />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button
            onClick={() => {
              if (!form.fullName || form.fullName.trim().length < 2) {
                toast.error("El nombre completo debe tener al menos 2 caracteres");
                return;
              }
              if (!form.birthDate) {
                toast.error("La fecha de nacimiento es requerida");
                return;
              }
              if (!form.curp || form.curp.trim().length !== 18) {
                toast.error("La CURP debe tener exactamente 18 caracteres");
                return;
              }
              if (!form.phone || form.phone.replace(/\D/g, '').length < 10) {
                toast.error("El teléfono debe tener al menos 10 dígitos");
                return;
              }
              onSave(form);
            }}
            disabled={saving}
          >
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : <><Save className="h-4 w-4 mr-2" />Guardar datos personales</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const REGIMENES_FISCALES = [
  "601 - General de Ley Personas Morales",
  "603 - Personas Morales con Fines no Lucrativos",
  "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios",
  "606 - Arrendamiento",
  "607 - Régimen de Enajenación o Adquisición de Bienes",
  "608 - Demás ingresos",
  "610 - Residentes en el Extranjero sin Establecimiento Permanente en México",
  "611 - Ingresos por Dividendos (socios y accionistas)",
  "612 - Personas Físicas con Actividades Empresariales y Profesionales",
  "614 - Ingresos por intereses",
  "615 - Régimen de los ingresos por obtención de premios",
  "616 - Sin obligaciones fiscales",
  "620 - Sociedades Cooperativas de Producción",
  "621 - Incorporación Fiscal",
  "622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras",
  "623 - Opcional para Grupos de Sociedades",
  "624 - Coordinados",
  "625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas",
  "626 - Régimen Simplificado de Confianza (RESICO)",
];

const USOS_CFDI = [
  "G01 - Adquisición de mercancias",
  "G02 - Devoluciones, descuentos o bonificaciones",
  "G03 - Gastos en general",
  "I01 - Construcciones",
  "I02 - Mobilario y equipo de oficina por inversiones",
  "I03 - Equipo de transporte",
  "I04 - Equipo de computo y accesorios",
  "I05 - Dados, troqueles, moldes, matrices y herramental",
  "I06 - Comunicaciones telefónicas",
  "I07 - Comunicaciones satelitales",
  "I08 - Otra maquinaria y equipo",
  "D01 - Honorarios médicos, dentales y gastos hospitalarios",
  "D02 - Gastos médicos por incapacidad o discapacidad",
  "D03 - Gastos funerales",
  "D04 - Donativos",
  "D05 - Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)",
  "D06 - Aportaciones voluntarias al SAR",
  "D07 - Primas por seguros de gastos médicos",
  "D08 - Gastos de transportación escolar obligatoria",
  "D09 - Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones",
  "D10 - Pagos por servicios educativos (colegiaturas)",
  "S01 - Sin efectos fiscales",
  "CP01 - Pagos",
  "CN01 - Nómina",
];

// ─── Sección: Negocio ─────────────────────────────────────────────────────────
function NegocioSection({
  profile, onSave, saving
}: {
  profile: Record<string, string | null | undefined> | null;
  onSave: (data: Record<string, string>) => void;
  saving: boolean;
}) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string>(profile?.logoUrl || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const utils = trpc.useUtils();

  const uploadLogoMutation = trpc.profile.uploadAvatar.useMutation({
    onSuccess: (data) => {
      setLogoPreview(data.url);
      setUploadingLogo(false);
      toast.success("Logo del negocio actualizado");
      // Guardar la URL del logo en el perfil del negocio
      onSave({ logoUrl: data.url });
      utils.profile.get.invalidate();
    },
    onError: () => {
      setUploadingLogo(false);
      toast.error("Error al subir el logo");
    },
  });

  const handleLogoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("El logo no debe superar 2MB"); return; }
    setUploadingLogo(true);
    const base64 = await fileToBase64(file);
    uploadLogoMutation.mutate({ base64, mimeType: file.type });
  }, [uploadLogoMutation]);

  const [form, setForm] = useState({
    businessName: profile?.businessName || "",
    businessType: profile?.businessType || "",
    razonSocial: profile?.razonSocial || "",
    rfcEmpresa: profile?.rfcEmpresa || "",
    regimenFiscal: profile?.regimenFiscal || "",
    usoCFDI: profile?.usoCFDI || "G03 - Gastos en general",
    direccionFiscal: profile?.direccionFiscal || "",
    codigoPostal: profile?.codigoPostal || "",
    ciudad: profile?.ciudad || "",
    estado: profile?.estado || "",
    sitioWeb: profile?.sitioWeb || "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      {/* Logo del negocio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Camera className="h-4 w-4" /> Logo del Negocio</CardTitle>
          <CardDescription>Aparece en tus recibos, facturas y página de pago</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-24 h-24 rounded-xl object-contain border-2 border-dashed border-border bg-muted" />
              ) : (
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center text-muted-foreground">
                  <Building2 className="h-8 w-8 mb-1" />
                  <span className="text-[10px]">Sin logo</span>
                </div>
              )}
              {uploadingLogo && (
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm text-muted-foreground">Formato PNG o JPG. Máximo 2MB. Recomendado: 400×400px con fondo transparente.</p>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
              <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                <Upload className="h-4 w-4 mr-2" />
                {uploadingLogo ? "Subiendo..." : logoPreview ? "Cambiar logo" : "Subir logo"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos del negocio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Datos del Negocio</CardTitle>
          <CardDescription>Información de tu empresa para facturación y cobros</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Nombre comercial <span className="text-destructive">*</span></Label>
              <Input id="businessName" value={form.businessName} onChange={set("businessName")} placeholder="Mi Empresa SA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessType">Giro del negocio</Label>
              <Input id="businessType" value={form.businessType} onChange={set("businessType")} placeholder="Ej: Venta de ropa, Servicios médicos..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="razonSocial">
                Razón social
                <Badge variant="outline" className="ml-2 text-xs">Requerida para facturación</Badge>
              </Label>
              <Input id="razonSocial" value={form.razonSocial} onChange={set("razonSocial")} placeholder="MI EMPRESA SOCIEDAD ANONIMA DE CV" className="uppercase" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rfcEmpresa">RFC de la empresa <span className="text-muted-foreground text-xs">(para facturas)</span></Label>
              <Input id="rfcEmpresa" value={form.rfcEmpresa} onChange={set("rfcEmpresa")} placeholder="ABC123456XYZ" maxLength={13} className="uppercase" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regimenFiscal">Régimen fiscal</Label>
              <select id="regimenFiscal" value={form.regimenFiscal} onChange={set("regimenFiscal")} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Seleccionar régimen</option>
                {REGIMENES_FISCALES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="usoCFDI">Uso CFDI por defecto</Label>
              <select id="usoCFDI" value={form.usoCFDI} onChange={set("usoCFDI")} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
                {USOS_CFDI.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="direccionFiscal">Dirección fiscal</Label>
              <Input id="direccionFiscal" value={form.direccionFiscal} onChange={set("direccionFiscal")} placeholder="Calle, Número, Colonia" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigoPostal">Código postal</Label>
              <Input id="codigoPostal" value={form.codigoPostal} onChange={set("codigoPostal")} placeholder="06600" maxLength={5} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input id="ciudad" value={form.ciudad} onChange={set("ciudad")} placeholder="Ciudad de México" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <select id="estado" value={form.estado} onChange={set("estado")} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Seleccionar estado</option>
                {ESTADOS_MX.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sitioWeb">Sitio web</Label>
              <Input id="sitioWeb" value={form.sitioWeb} onChange={set("sitioWeb")} placeholder="https://minegocio.com" type="url" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => onSave(form)} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : <><Save className="h-4 w-4 mr-2" />Guardar datos del negocio</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sección: Bancario ────────────────────────────────────────────────────────
function BancarioSection({
  profile, onSave, saving
}: {
  profile: Record<string, string | null | undefined> | null;
  onSave: (data: Record<string, string>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    clabe: profile?.clabe || "",
    banco: profile?.banco || "",
    titularCuenta: profile?.titularCuenta || "",
    rfcTitular: profile?.rfcTitular || "",
  });
  const [showClabe, setShowClabe] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const clabeDisplay = showClabe ? form.clabe : form.clabe.replace(/\d(?=\d{4})/g, "•");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Datos Bancarios</CardTitle>
        <CardDescription>Información para recibir transferencias y pagos a tu cuenta</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Esta información es confidencial y solo se usa para procesar transferencias a tu cuenta. Nunca se comparte con terceros.</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="clabe">CLABE interbancaria (18 dígitos)</Label>
            <div className="relative">
              <Input
                id="clabe"
                value={showClabe ? form.clabe : clabeDisplay}
                onChange={set("clabe")}
                placeholder="000000000000000000"
                maxLength={18}
                className="pr-10 font-mono"
                onFocus={() => setShowClabe(true)}
                onBlur={() => setShowClabe(false)}
              />
              <button
                type="button"
                onClick={() => setShowClabe(!showClabe)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">18 dígitos. La puedes encontrar en tu app bancaria o estado de cuenta.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="banco">Banco</Label>
            <select
              id="banco"
              value={form.banco}
              onChange={set("banco")}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Seleccionar banco</option>
              {BANCOS_MX.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="titularCuenta">Titular de la cuenta</Label>
            <Input id="titularCuenta" value={form.titularCuenta} onChange={set("titularCuenta")} placeholder="Nombre completo del titular" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="rfcTitular">RFC del titular <span className="text-muted-foreground text-xs">(para transferencias SPEI)</span></Label>
            <Input
              id="rfcTitular"
              value={form.rfcTitular}
              onChange={set("rfcTitular")}
              placeholder="XXXX000000XXX"
              maxLength={13}
              className="uppercase"
            />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={() => onSave(form)} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : <><Save className="h-4 w-4 mr-2" />Guardar datos bancarios</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sección: Documentos ──────────────────────────────────────────────────────
type DocType = "ine" | "domicilio" | "acta";

function DocumentosSection({
  profile, onUpload, uploading, uploadingDocType
}: {
  profile: Record<string, string | null | undefined> | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, docType: DocType) => void;
  uploading: boolean;
  uploadingDocType?: string;
}) {
  const docs: { id: DocType; label: string; desc: string; urlKey: string; required: boolean }[] = [
    { id: "ine", label: "INE / Pasaporte", desc: "Identificación oficial vigente (ambos lados)", urlKey: "ineUrl", required: true },
    { id: "domicilio", label: "Comprobante de domicilio", desc: "No mayor a 3 meses (CFE, agua, teléfono, etc.)", urlKey: "domicilioUrl", required: true },
    { id: "acta", label: "Acta constitutiva", desc: "Solo para personas morales (SA, SAPI, SC, etc.)", urlKey: "actaConstitutiva", required: false },
  ];

  const inputRefs = useRef<Record<DocType, HTMLInputElement | null>>({ ine: null, domicilio: null, acta: null });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Documentos de Verificación</CardTitle>
        <CardDescription>Sube tus documentos para verificar tu identidad y habilitar cobros</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          Formatos aceptados: JPG, PNG, PDF. Tamaño máximo: 10MB por archivo.
        </div>
        <div className="space-y-4">
          {docs.map(({ id, label, desc, urlKey, required }) => {
            const uploaded = !!profile?.[urlKey];
            const isUploading = uploading && uploadingDocType === id;

            return (
              <div key={id} className="flex items-center gap-4 p-4 border rounded-xl">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${uploaded ? "bg-green-100" : "bg-muted"}`}>
                  {uploaded
                    ? <CheckCircle2 className="h-6 w-6 text-green-600" />
                    : <FileText className="h-6 w-6 text-muted-foreground" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{label}</span>
                    {required && <Badge variant="outline" className="text-xs">Requerido</Badge>}
                    {uploaded && <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">Subido</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {uploaded && (
                    <a
                      href={profile?.[urlKey] || ""}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Ver
                    </a>
                  )}
                  <input
                    ref={el => { inputRefs.current[id] = el; }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => onUpload(e, id)}
                  />
                  <Button
                    variant={uploaded ? "outline" : "default"}
                    size="sm"
                    onClick={() => inputRefs.current[id]?.click()}
                    disabled={isUploading}
                  >
                    {isUploading
                      ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Subiendo...</>
                      : <><Upload className="h-3 w-3 mr-1" />{uploaded ? "Reemplazar" : "Subir"}</>
                    }
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Categorías de cursos ─────────────────────────────────────────────────────
const COURSE_CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  english:   { label: "Inglés",           emoji: "🇺🇸", color: "bg-blue-100 text-blue-800" },
  office:    { label: "Microsoft Office",  emoji: "💼", color: "bg-indigo-100 text-indigo-800" },
  first_aid: { label: "Primeros Auxilios", emoji: "🚑", color: "bg-red-100 text-red-800" },
  sales:     { label: "Ventas",            emoji: "📈", color: "bg-green-100 text-green-800" },
  books:     { label: "Libros",            emoji: "📚", color: "bg-yellow-100 text-yellow-800" },
  health:    { label: "Salud & Bienestar", emoji: "🌿", color: "bg-emerald-100 text-emerald-800" },
  other:     { label: "Otros",             emoji: "🎓", color: "bg-gray-100 text-gray-800" },
};

// ─── Sección: Perfil Profesional (Cursos Completados) ─────────────────────────
function CapacitacionesSection() {
  const { data: cv, isLoading } = trpc.training.getMyCV.useQuery();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const completed = cv || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Perfil Profesional — Capacitaciones
        </CardTitle>
        <CardDescription>
          Historial de cursos completados. Cada curso completado queda registrado aquí con fecha y evidencia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {completed.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-5xl mb-3">🎓</div>
            <p className="font-medium text-base">Aún no has completado ningún curso</p>
            <p className="text-sm mt-1">
              Ve a <span className="font-semibold text-primary">Capacitaciones</span> y marca tus primeros cursos como completados para que aparezcan aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="text-4xl">🏆</div>
              <div>
                <p className="font-bold text-green-800 text-lg">{completed.length} curso{completed.length !== 1 ? "s" : ""} completado{completed.length !== 1 ? "s" : ""}</p>
                <p className="text-green-600 text-sm">Excelente progreso en tu desarrollo profesional</p>
              </div>
            </div>

            {/* Lista de cursos */}
            <div className="grid gap-3">
              {completed.map((item: any) => {
                const course = item.course;
                if (!course) return null;
                const cat = COURSE_CATEGORIES[course.category] || COURSE_CATEGORIES.other;
                return (
                  <div key={item.id} className="border border-gray-200 rounded-xl p-4 bg-white hover:border-green-300 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl shrink-0">{cat.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{course.title}</h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
                          {course.ownerId === null && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">KobraPay</span>
                          )}
                          <span className="ml-auto text-xs text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Completado
                          </span>
                        </div>
                        {course.description && (
                          <p className="text-gray-500 text-sm mt-1 line-clamp-2">{course.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          {item.completedAt && (
                            <span className="text-xs text-gray-400">
                              📅 {new Date(item.completedAt).toLocaleDateString("es-MX", {
                                day: "numeric", month: "long", year: "numeric"
                              })}
                            </span>
                          )}
                          {course.durationMinutes && (
                            <span className="text-xs text-gray-400">⏱ {course.durationMinutes} min</span>
                          )}
                          {item.evidenceUrl && (
                            <a
                              href={item.evidenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {item.evidenceName || "Ver evidencia"}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Nota al pie */}
            <p className="text-xs text-muted-foreground text-center pt-2">
              Este historial es parte de tu perfil profesional dentro de KobraPay.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
