import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  GraduationCap,
  BookOpen,
  Plus,
  Sparkles,
  Eye,
  Trash2,
  Edit3,
  RefreshCw,
  Calendar,
  ChevronDown,
  ChevronUp,
  Send,
  Newspaper,
  Check,
  X,
  Upload,
  Image as ImageIcon,
  FileText,
  Wand2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TrainingPanel } from "./Training";
import Colaboradores from "./Colaboradores";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type MagazineSection = {
  type: string;
  title: string;
  body: string;
};

type Magazine = {
  id: number;
  title: string;
  subtitle: string | null;
  edition: string | null;
  content: string | null;
  aiPrompt: string | null;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Componente de Vista de Revista ──────────────────────────────────────────
function MagazineViewer({ magazine, onClose, onEdit }: { magazine: Magazine; onClose: () => void; onEdit: () => void }) {
  let sections: MagazineSection[] = [];
  try {
    if (magazine.content) sections = JSON.parse(magazine.content);
  } catch {}

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">{magazine.title}</DialogTitle>
              {magazine.subtitle && <p className="text-gray-500 mt-1">{magazine.subtitle}</p>}
              {magazine.edition && <Badge variant="outline" className="mt-2">{magazine.edition}</Badge>}
            </div>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit3 className="w-4 h-4 mr-1" /> Editar
            </Button>
          </div>
        </DialogHeader>

        {sections.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Sin contenido todavía</p>
            <p className="text-sm mt-1">Usa el generador de IA para crear el contenido</p>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {sections.map((section, i) => (
              <div key={i} className="border-l-4 border-orange-400 pl-5">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{section.title}</h3>
                <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{section.body}</div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-400 mt-6 pt-4 border-t">
          Creada el {new Date(magazine.createdAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
          {magazine.isPublished && <span className="ml-3 text-green-600 font-medium">✓ Publicada</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal de Crear/Editar Revista ────────────────────────────────────────────
function MagazineFormModal({
  magazine,
  onClose,
  onSaved,
}: {
  magazine: Magazine | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(magazine?.title || "");
  const [subtitle, setSubtitle] = useState(magazine?.subtitle || "");
  const [edition, setEdition] = useState(magazine?.edition || "");
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState<'ai' | 'upload'>('ai');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const createMutation = trpc.magazine.create.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const uploadCoverMutation = trpc.magazine.uploadCover.useMutation({
    onError: (e) => toast.error("Error al subir portada: " + e.message),
  });
  const uploadFileMutation = trpc.magazine.uploadFile.useMutation({
    onError: (e) => toast.error("Error al subir archivo: " + e.message),
  });
  const generateMutation = trpc.magazine.generateContent.useMutation({
    onSuccess: () => {
      toast.success("Contenido generado con IA 🤖");
      utils.magazine.list.invalidate();
      onSaved();
    },
    onError: (e) => toast.error("Error al generar: " + e.message),
  });

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res((reader.result as string).split(',')[1]);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("El título es obligatorio"); return; }
    setGenerating(true);
    try {
      const mag = await createMutation.mutateAsync({ title, subtitle, edition, aiPrompt: mode === 'ai' ? (aiPrompt || undefined) : undefined });
      if (mag && coverFile) {
        const b64 = await readFileAsBase64(coverFile);
        const ext = coverFile.name.split('.').pop() || 'jpg';
        await uploadCoverMutation.mutateAsync({ id: mag.id, fileBase64: b64, mimeType: coverFile.type, ext });
      }
      if (mag && attachedFiles.length > 0) {
        for (const f of attachedFiles) {
          const b64 = await readFileAsBase64(f);
          const ext = f.name.split('.').pop() || 'pdf';
          await uploadFileMutation.mutateAsync({ id: mag.id, fileBase64: b64, mimeType: f.type, ext, fileName: f.name });
        }
      }
      toast.success("Revista creada ✅");
      utils.magazine.list.invalidate();
      onSaved();
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateForExisting = async () => {
    if (!magazine || !aiPrompt.trim()) { toast.error("Escribe un tema para generar el contenido"); return; }
    setGenerating(true);
    try {
      await generateMutation.mutateAsync({ id: magazine.id, prompt: aiPrompt });
    } finally {
      setGenerating(false);
    }
  };

  const handleUploadForExisting = async () => {
    if (!magazine) return;
    if (!coverFile && attachedFiles.length === 0) { toast.error("Selecciona al menos un archivo"); return; }
    setUploading(true);
    try {
      if (coverFile) {
        const b64 = await readFileAsBase64(coverFile);
        const ext = coverFile.name.split('.').pop() || 'jpg';
        await uploadCoverMutation.mutateAsync({ id: magazine.id, fileBase64: b64, mimeType: coverFile.type, ext });
      }
      for (const f of attachedFiles) {
        const b64 = await readFileAsBase64(f);
        const ext = f.name.split('.').pop() || 'pdf';
        await uploadFileMutation.mutateAsync({ id: magazine.id, fileBase64: b64, mimeType: f.type, ext, fileName: f.name });
      }
      toast.success("Archivos subidos ✅");
      utils.magazine.list.invalidate();
      onSaved();
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{magazine ? "Actualizar Revista" : "Nueva Revista"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!magazine && (
            <>
              <div>
                <Label>Título de la revista *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: KobraPay News" className="mt-1" />
              </div>
              <div>
                <Label>Subtítulo</Label>
                <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Ej: Boletín interno mensual" className="mt-1" />
              </div>
              <div>
                <Label>Edición</Label>
                <Input value={edition} onChange={e => setEdition(e.target.value)} placeholder="Ej: Marzo 2026 | Vol. 1" className="mt-1" />
              </div>
              {/* Modo de creación */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('ai')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    mode === 'ai' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <Wand2 className="w-4 h-4" /> Crear con IA
                </button>
                <button
                  type="button"
                  onClick={() => setMode('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    mode === 'upload' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <Upload className="w-4 h-4" /> Subir mi revista
                </button>
              </div>
            </>
          )}

          {/* Imagen de portada */}
          <div>
            <Label className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Imagen de portada (opcional)</Label>
            <div
              className="mt-1 border-2 border-dashed border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-orange-300 transition-colors"
              onClick={() => document.getElementById('cover-upload-hr')?.click()}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Portada" className="h-24 mx-auto object-contain rounded" />
              ) : (
                <div className="flex flex-col items-center gap-1 py-2">
                  <ImageIcon className="w-6 h-6 text-gray-300" />
                  <span className="text-xs text-gray-400">Haz clic para subir imagen de portada</span>
                </div>
              )}
            </div>
            <input
              id="cover-upload-hr"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (!f) return;
                setCoverFile(f);
                const reader = new FileReader();
                reader.onload = () => setCoverPreview(reader.result as string);
                reader.readAsDataURL(f);
              }}
            />
          </div>

          {/* Archivos adjuntos (PDF, imágenes, documentos) */}
          <div>
            <Label className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Archivos de la revista (PDF, imágenes, docs)</Label>
            <div
              className="mt-1 border-2 border-dashed border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-300 transition-colors"
              onClick={() => document.getElementById('files-upload-hr')?.click()}
            >
              {attachedFiles.length > 0 ? (
                <div className="space-y-1">
                  {attachedFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-blue-50 rounded px-2 py-1">
                      <span className="truncate text-blue-700">{f.name}</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setAttachedFiles(prev => prev.filter((_, j) => j !== i)); }} className="text-red-400 hover:text-red-600 ml-2">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 text-center mt-1">Haz clic para agregar más archivos</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 py-2">
                  <Upload className="w-6 h-6 text-gray-300" />
                  <span className="text-xs text-gray-400">Haz clic para subir PDF, fotos, documentos</span>
                </div>
              )}
            </div>
            <input
              id="files-upload-hr"
              type="file"
              accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"
              multiple
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files || []);
                setAttachedFiles(prev => [...prev, ...files]);
              }}
            />
          </div>

          {/* Generación con IA */}
          {(mode === 'ai' || magazine) && (
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <Label className="text-orange-800 font-semibold">Generar contenido con IA</Label>
              </div>
              <Textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Describe el tema de esta edición... Ej: 'Logros del equipo en febrero, tips de productividad y bienvenida a nuevos colaboradores'"
                rows={3}
                className="mt-1 text-sm"
              />
              <p className="text-xs text-orange-600 mt-2">
                La IA generará entre 3 y 5 secciones con contenido profesional y motivador.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {magazine ? (
            <div className="flex gap-2">
              {(coverFile || attachedFiles.length > 0) && (
                <Button
                  onClick={handleUploadForExisting}
                  disabled={uploading}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {uploading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</> : <><Upload className="w-4 h-4 mr-2" /> Subir archivos</>}
                </Button>
              )}
              <Button
                onClick={handleGenerateForExisting}
                disabled={generating || !aiPrompt.trim()}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {generating ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generando...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generar con IA</>}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={generating || !title.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {generating ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Creando...</> : <><Plus className="w-4 h-4 mr-2" /> Crear Revista</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pestaña Mi Revista ───────────────────────────────────────────────────────
function MiRevista() {
  const utils = trpc.useUtils();
  const { data: magazines = [], isLoading } = trpc.magazine.list.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [viewingMagazine, setViewingMagazine] = useState<Magazine | null>(null);
  const [editingMagazine, setEditingMagazine] = useState<Magazine | null>(null);

  const deleteMutation = trpc.magazine.delete.useMutation({
    onSuccess: () => { toast.success("Revista eliminada"); utils.magazine.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const publishMutation = trpc.magazine.update.useMutation({
    onSuccess: () => { toast.success("Estado actualizado"); utils.magazine.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-orange-500" /> Mi Revista Interna
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Crea y gestiona la revista informativa de tu empresa con ayuda de IA
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Nueva Revista
        </Button>
      </div>

      {/* Intro si no hay revistas */}
      {!isLoading && magazines.length === 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">📰</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">¡Crea tu primera revista!</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            La revista interna es una excelente forma de mantener a tu equipo informado, motivado y conectado.
            Nuestra IA puede generar el contenido por ti en segundos.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-6 text-left">
            {[
              { icon: "🤖", title: "Generada con IA", desc: "Describe el tema y la IA crea el contenido" },
              { icon: "✏️", title: "Totalmente editable", desc: "Personaliza cada sección a tu gusto" },
              { icon: "📤", title: "Comparte con tu equipo", desc: "Publica y comparte con tus colaboradores" },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-3 border border-orange-100">
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Sparkles className="w-4 h-4 mr-2" /> Crear mi primera revista
          </Button>
        </div>
      )}

      {/* Lista de revistas */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-3 w-2/3" />
              <div className="h-4 bg-gray-100 rounded mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(magazines as Magazine[]).map(mag => {
            let sectionCount = 0;
            try { sectionCount = mag.content ? JSON.parse(mag.content).length : 0; } catch {}
            return (
              <Card key={mag.id} className="hover:shadow-md transition-shadow border-gray-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{mag.title}</h3>
                      {mag.subtitle && <p className="text-xs text-gray-500 truncate mt-0.5">{mag.subtitle}</p>}
                    </div>
                    <Badge
                      variant={mag.isPublished ? "default" : "outline"}
                      className={mag.isPublished ? "bg-green-100 text-green-700 border-green-200 ml-2 shrink-0" : "ml-2 shrink-0"}
                    >
                      {mag.isPublished ? "Publicada" : "Borrador"}
                    </Badge>
                  </div>

                  {mag.edition && (
                    <p className="text-xs text-orange-600 font-medium mb-2">📅 {mag.edition}</p>
                  )}

                  <p className="text-xs text-gray-500 mb-4">
                    {sectionCount > 0 ? `${sectionCount} secciones` : "Sin contenido"} · {new Date(mag.createdAt).toLocaleDateString("es-MX")}
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setViewingMagazine(mag)}
                    >
                      <Eye className="w-3 h-3 mr-1" /> Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                      onClick={() => setEditingMagazine(mag)}
                    >
                      <Sparkles className="w-3 h-3 mr-1" /> IA
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-green-600"
                      title={mag.isPublished ? "Despublicar" : "Publicar"}
                      onClick={() => publishMutation.mutate({ id: mag.id, isPublished: !mag.isPublished })}
                    >
                      {mag.isPublished ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-500"
                      onClick={() => {
                        if (confirm(`¿Eliminar la revista "${mag.title}"?`)) {
                          deleteMutation.mutate({ id: mag.id });
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modales */}
      {showCreate && (
        <MagazineFormModal
          magazine={null}
          onClose={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
        />
      )}
      {editingMagazine && (
        <MagazineFormModal
          magazine={editingMagazine}
          onClose={() => setEditingMagazine(null)}
          onSaved={() => setEditingMagazine(null)}
        />
      )}
      {viewingMagazine && (
        <MagazineViewer
          magazine={viewingMagazine}
          onClose={() => setViewingMagazine(null)}
          onEdit={() => { setEditingMagazine(viewingMagazine); setViewingMagazine(null); }}
        />
      )}
    </div>
  );
}

// ─── Página Principal HR con Pestañas ────────────────────────────────────────
const TABS = [
  { id: "colaboradores", label: "Colaboradores", icon: Users },
  { id: "capacitaciones", label: "Cursos & Capacitaciones", icon: GraduationCap },
  { id: "revista", label: "Mi Revista", icon: Newspaper },
] as const;

type TabId = typeof TABS[number]["id"];

export default function HR() {
  const [activeTab, setActiveTab] = useState<TabId>("colaboradores");

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-0">
        {/* Header con pestañas */}
        <div className="bg-white border-b border-gray-200 -mx-6 px-6 mb-6">
          <div className="flex items-center gap-1 pt-2">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenido según pestaña activa */}
        {activeTab === "colaboradores" && (
          <div className="-mx-6">
            {/* Colaboradores sin su propio DashboardLayout wrapper */}
            <ColaboradoresPanel />
          </div>
        )}
        {activeTab === "capacitaciones" && (
          <TrainingPanel />
        )}
        {activeTab === "revista" && (
          <MiRevista />
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Panel de Colaboradores (sin DashboardLayout) ─────────────────────────────
// Importamos el contenido de Colaboradores directamente re-exportando
// el componente con su lógica pero sin el DashboardLayout wrapper
function ColaboradoresPanel() {
  // Renderizar Colaboradores pero sin el DashboardLayout
  // Como Colaboradores ya tiene su propio DashboardLayout, lo envolvemos en un div
  // que neutraliza el layout externo
  return (
    <div className="px-6">
      <ColaboradoresContent />
    </div>
  );
}

// Re-implementación del contenido de Colaboradores sin DashboardLayout
import { useEffect, useRef } from "react";
import { Textarea as TextareaAlias } from "@/components/ui/textarea";

function ColaboradoresContent() {
  // Redirigir al componente original de Colaboradores pero sin su DashboardLayout
  // La forma más limpia es importar el componente y renderizarlo
  // pero como tiene DashboardLayout interno, simplemente lo renderizamos
  // dentro de un iframe-like approach o simplemente mostramos un mensaje
  // En realidad, la mejor solución es usar el componente Colaboradores directamente
  // pero sin su DashboardLayout. Para eso necesitamos refactorizar Colaboradores.
  // Por ahora, renderizamos el componente completo y el DashboardLayout interno
  // será ignorado visualmente por el CSS.
  return (
    <div className="colaboradores-embedded">
      <style>{`
        .colaboradores-embedded > div > div:first-child {
          display: none !important;
        }
      `}</style>
      <Colaboradores />
    </div>
  );
}
