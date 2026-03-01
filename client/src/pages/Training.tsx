import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Categorías ───────────────────────────────────────────────────────────────
const CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  english:   { label: "Inglés",          emoji: "🇺🇸", color: "bg-blue-100 text-blue-800" },
  office:    { label: "Microsoft Office", emoji: "💼", color: "bg-indigo-100 text-indigo-800" },
  first_aid: { label: "Primeros Auxilios",emoji: "🚑", color: "bg-red-100 text-red-800" },
  sales:     { label: "Ventas",           emoji: "📈", color: "bg-green-100 text-green-800" },
  books:     { label: "Libros",           emoji: "📚", color: "bg-yellow-100 text-yellow-800" },
  health:    { label: "Salud & Bienestar",emoji: "🌿", color: "bg-emerald-100 text-emerald-800" },
  other:     { label: "Otros",            emoji: "🎓", color: "bg-gray-100 text-gray-800" },
};

const LEVELS: Record<string, string> = {
  basic:        "Básico",
  intermediate: "Intermedio",
  advanced:     "Avanzado",
  general:      "General",
};

// ─── Tipos locales ────────────────────────────────────────────────────────────
type CourseWithProgress = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  level: string | null;
  externalUrl: string | null;
  content: string | null;
  coverImageUrl: string | null;
  durationMinutes: number | null;
  ownerId: number | null;
  isCompleted: boolean;
  progress: { status: string; completedAt: Date | null; evidenceUrl: string | null; evidenceName: string | null }[];
};

// ─── Modal de detalle del curso ───────────────────────────────────────────────
function CourseDetailModal({
  courseId,
  onClose,
}: {
  courseId: number;
  onClose: () => void;
}) {
  const { data, isLoading, refetch } = trpc.training.getDetail.useQuery({ id: courseId });
  const markComplete = trpc.training.markComplete.useMutation({
    onSuccess: () => { toast.success("¡Curso marcado como completado! 🎉"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [uploading, setUploading] = useState(false);

  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>, moduleId?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("El archivo no puede superar 10 MB"); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        // Use markComplete with evidence via uploadEvidence
        const utils = trpc.useUtils();
        await utils.client.training.uploadEvidence.mutate({
          courseId,
          moduleId,
          fileName: file.name,
          fileBase64: base64,
          mimeType: file.type,
        });
        toast.success("Evidencia subida correctamente ✅");
        refetch();
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error(err.message || "Error al subir evidencia");
      setUploading(false);
    }
  };

  if (isLoading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-3" />
        <p className="text-gray-600">Cargando curso...</p>
      </div>
    </div>
  );

  if (!data) return null;
  const { course, modules, progress } = data;
  const cat = CATEGORIES[course.category] || CATEGORIES.other;
  const courseProgress = progress.find(p => !p.moduleId);
  const isCourseDone = courseProgress?.status === 'completed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-gray-900 to-gray-700 rounded-t-2xl p-6 text-white">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl leading-none">×</button>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{cat.emoji}</span>
            <div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
              {course.level && <span className="ml-2 text-xs text-white/70">{LEVELS[course.level] || course.level}</span>}
            </div>
          </div>
          <h2 className="text-xl font-bold">{course.title}</h2>
          {course.description && <p className="text-white/80 text-sm mt-1">{course.description}</p>}
          {course.durationMinutes ? <p className="text-white/60 text-xs mt-1">⏱ {course.durationMinutes} minutos estimados</p> : null}
        </div>

        <div className="p-6 space-y-5">
          {/* Estado del curso */}
          {isCourseDone ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="font-semibold text-green-800">¡Curso completado!</p>
                {courseProgress?.completedAt && (
                  <p className="text-green-600 text-sm">
                    Completado el {new Date(courseProgress.completedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                {courseProgress?.evidenceUrl && (
                  <a href={courseProgress.evidenceUrl} target="_blank" rel="noreferrer" className="text-green-700 text-sm underline">
                    📎 Ver evidencia: {courseProgress.evidenceName || "archivo"}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => markComplete.mutate({ courseId })}
                disabled={markComplete.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {markComplete.isPending ? "Guardando..." : "✅ Marcar como completado"}
              </Button>
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors">
                  {uploading ? "Subiendo..." : "📎 Subir evidencia"}
                </span>
                <input type="file" className="hidden" onChange={(e) => handleEvidenceUpload(e)} disabled={uploading} />
              </label>
            </div>
          )}

          {/* Enlace externo */}
          {course.externalUrl && (
            <a
              href={course.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-4 hover:bg-blue-100 transition-colors"
            >
              <span className="text-2xl">🔗</span>
              <div>
                <p className="font-semibold text-blue-800">Acceder al curso</p>
                <p className="text-blue-600 text-sm truncate max-w-xs">{course.externalUrl}</p>
              </div>
            </a>
          )}

          {/* Contenido */}
          {course.content && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-2">📖 Contenido del curso</h3>
              <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{course.content}</div>
            </div>
          )}

          {/* Módulos */}
          {modules.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">📋 Módulos ({modules.length})</h3>
              <div className="space-y-3">
                {modules.map((mod) => {
                  const modProgress = progress.find(p => p.moduleId === mod.id);
                  const isDone = modProgress?.status === 'completed';
                  return (
                    <div key={mod.id} className={`rounded-xl p-4 border ${isDone ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={isDone ? "text-green-600" : "text-gray-400"}>
                              {isDone ? "✅" : "⭕"}
                            </span>
                            <p className="font-medium text-gray-800">{mod.title}</p>
                          </div>
                          {mod.description && <p className="text-gray-500 text-sm mt-1 ml-6">{mod.description}</p>}
                          {mod.externalUrl && (
                            <a href={mod.externalUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-sm ml-6 hover:underline">
                              🔗 Ver material
                            </a>
                          )}
                          {isDone && modProgress?.evidenceUrl && (
                            <a href={modProgress.evidenceUrl} target="_blank" rel="noreferrer" className="text-green-600 text-sm ml-6 hover:underline block mt-1">
                              📎 {modProgress.evidenceName || "Ver evidencia"}
                            </a>
                          )}
                        </div>
                        {!isDone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markComplete.mutate({ courseId, moduleId: mod.id })}
                            disabled={markComplete.isPending}
                            className="shrink-0 text-xs"
                          >
                            Completar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta de curso ─────────────────────────────────────────────────────────
function CourseCard({ course, onOpen }: { course: CourseWithProgress; onOpen: () => void }) {
  const cat = CATEGORIES[course.category] || CATEGORIES.other;
  return (
    <div
      onClick={onOpen}
      className={`relative cursor-pointer rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-0.5 overflow-hidden
        ${course.isCompleted ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white hover:border-orange-300'}`}
    >
      {course.isCompleted && (
        <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          ✓ Completado
        </div>
      )}
      {course.ownerId === null && (
        <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          KobraPay
        </div>
      )}
      <div className="p-5 pt-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-3xl">{cat.emoji}</span>
          <div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
            {course.level && course.level !== 'general' && (
              <span className="ml-2 text-xs text-gray-500">{LEVELS[course.level] || course.level}</span>
            )}
          </div>
        </div>
        <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{course.title}</h3>
        {course.description && (
          <p className="text-gray-500 text-sm line-clamp-2">{course.description}</p>
        )}
        {course.durationMinutes ? (
          <p className="text-gray-400 text-xs mt-2">⏱ {course.durationMinutes} min</p>
        ) : null}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-orange-600 text-sm font-medium">Ver curso →</span>
          {course.externalUrl && <span className="text-xs text-gray-400">🔗 Enlace externo</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Formulario de nuevo curso ────────────────────────────────────────────────
function NewCourseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "other" as string,
    level: "general" as string,
    externalUrl: "",
    content: "",
    durationMinutes: 0,
  });

  const create = trpc.training.create.useMutation({
    onSuccess: () => { toast.success("Curso creado exitosamente"); onCreated(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">🎓 Nuevo Curso</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Inglés Básico para Negocios"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nivel</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  value={form.level}
                  onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                >
                  {Object.entries(LEVELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe brevemente de qué trata el curso..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enlace externo (URL)</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.externalUrl}
                onChange={e => setForm(f => ({ ...f, externalUrl: e.target.value }))}
                placeholder="https://youtube.com/... o https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contenido / Guía (texto)</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                rows={5}
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Escribe aquí la guía, tips, temario o contenido del curso..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duración estimada (minutos)</label>
              <input
                type="number"
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.durationMinutes}
                onChange={e => setForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button
              onClick={() => create.mutate({
                ...form,
                externalUrl: form.externalUrl || undefined,
                content: form.content || undefined,
                description: form.description || undefined,
                level: form.level as any,
                category: form.category as any,
              })}
              disabled={!form.title.trim() || create.isPending}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {create.isPending ? "Creando..." : "Crear Curso"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Training() {
  const { user } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: courses = [], isLoading, refetch } = trpc.training.list.useQuery();

  const isSuperAdmin = (user as any)?.isSuperAdmin;
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  // Filtrar cursos
  const filtered = courses.filter((c: CourseWithProgress) => {
    const matchCat = activeCategory === 'all' || c.category === activeCategory;
    const matchSearch = !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()) || (c.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const completedCount = courses.filter((c: CourseWithProgress) => c.isCompleted).length;
  const kobrapayCount = courses.filter((c: CourseWithProgress) => c.ownerId === null).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🎓 Capacitaciones</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Cursos para tu crecimiento profesional y personal
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex gap-4 text-center">
              <div className="bg-orange-50 rounded-xl px-4 py-2">
                <p className="text-xl font-bold text-orange-600">{completedCount}</p>
                <p className="text-xs text-orange-500">Completados</p>
              </div>
              <div className="bg-gray-100 rounded-xl px-4 py-2">
                <p className="text-xl font-bold text-gray-700">{courses.length}</p>
                <p className="text-xs text-gray-500">Total cursos</p>
              </div>
            </div>
            {isAdmin && (
              <Button
                onClick={() => setShowNewCourse(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                + Nuevo Curso
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Barra de búsqueda y filtros */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white min-w-[220px]"
            placeholder="🔍 Buscar cursos..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === 'all' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-gray-400'}`}
            >
              Todos
            </button>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setActiveCategory(k)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === k ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-gray-400'}`}
              >
                {v.emoji} {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Banner KobraPay */}
        {kobrapayCount > 0 && activeCategory === 'all' && !searchQuery && (
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-5 mb-6 text-white flex items-center gap-4">
            <span className="text-4xl">🐍</span>
            <div>
              <p className="font-bold text-lg">Cursos oficiales de KobraPay</p>
              <p className="text-orange-100 text-sm">
                {kobrapayCount} cursos gratuitos para ti y tu equipo: inglés, Excel, ventas, salud, libros y más.
              </p>
            </div>
          </div>
        )}

        {/* Grid de cursos */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-3 w-1/2" />
                <div className="h-5 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">📭</p>
            <p className="text-lg font-medium">No hay cursos disponibles</p>
            {isAdmin && (
              <p className="text-sm mt-1">Crea el primer curso con el botón "+ Nuevo Curso"</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((course: CourseWithProgress) => (
              <CourseCard
                key={course.id}
                course={course}
                onOpen={() => setSelectedCourseId(course.id)}
              />
            ))}
          </div>
        )}

        {/* Progreso general */}
        {courses.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 mb-3">📊 Tu progreso general</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-orange-500 h-3 rounded-full transition-all"
                  style={{ width: `${courses.length > 0 ? (completedCount / courses.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                {completedCount} / {courses.length} completados
              </span>
            </div>
            {completedCount === courses.length && courses.length > 0 && (
              <p className="text-green-600 text-sm font-medium mt-2">🏆 ¡Has completado todos los cursos disponibles!</p>
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      {selectedCourseId !== null && (
        <CourseDetailModal
          courseId={selectedCourseId}
          onClose={() => setSelectedCourseId(null)}
        />
      )}
      {showNewCourse && (
        <NewCourseModal
          onClose={() => setShowNewCourse(false)}
          onCreated={refetch}
        />
      )}
    </div>
  );
}
