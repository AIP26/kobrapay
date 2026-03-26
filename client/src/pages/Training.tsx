import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Link } from "wouter";
import { RefreshCw, Upload, X, Image as ImageIcon } from "lucide-react";

// ─── Categorías ───────────────────────────────────────────────────────────────
const CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  english:   { label: "Inglés",           emoji: "🇺🇸", color: "bg-blue-100 text-blue-800" },
  office:    { label: "Microsoft Office",  emoji: "💼", color: "bg-indigo-100 text-indigo-800" },
  first_aid: { label: "Primeros Auxilios", emoji: "🚑", color: "bg-red-100 text-red-800" },
  sales:     { label: "Ventas",            emoji: "📈", color: "bg-green-100 text-green-800" },
  books:     { label: "Libros",            emoji: "📚", color: "bg-yellow-100 text-yellow-800" },
  health:    { label: "Salud & Bienestar", emoji: "🌿", color: "bg-emerald-100 text-emerald-800" },
  other:     { label: "Otros",             emoji: "🎓", color: "bg-gray-100 text-foreground" },
};
const LEVELS: Record<string, string> = {
  basic:        "Básico",
  intermediate: "Intermedio",
  advanced:     "Avanzado",
  general:      "General",
};

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

// ─── Extraer ID de YouTube ────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ─── Renderizador simple de Markdown ─────────────────────────────────────────
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="bg-gray-100 px-1 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-base font-bold text-foreground mt-4 mb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-sm font-semibold text-foreground mt-3 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} className="border-l-4 border-orange-400 pl-3 py-1 my-2 bg-orange-50 rounded-r text-sm text-orange-900 italic">
          {line.slice(2)}
        </blockquote>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="text-sm text-foreground ml-4 list-disc leading-relaxed">
          {renderInline(line.slice(2))}
        </li>
      );
    } else if (/^\d+\. /.test(line)) {
      elements.push(
        <li key={i} className="text-sm text-foreground ml-4 list-decimal leading-relaxed">
          {renderInline(line.replace(/^\d+\. /, ""))}
        </li>
      );
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!lines[i].match(/^\|[-| ]+\|$/)) {
          rows.push(lines[i].split("|").filter(c => c.trim() !== "").map(c => c.trim()));
        }
        i++;
      }
      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-3">
          <table className="text-xs border-collapse w-full">
            {rows.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? "bg-gray-100 font-semibold" : "border-t border-gray-200"}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2 py-1 border border-gray-200 text-foreground">{cell}</td>
                ))}
              </tr>
            ))}
          </table>
        </div>
      );
      continue;
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />);
    } else {
      elements.push(<p key={i} className="text-sm text-foreground leading-relaxed">{renderInline(line)}</p>);
    }
    i++;
  }
  return <div className="space-y-0.5">{elements}</div>;
}

// ─── Subir evidencia (helper reutilizable) ────────────────────────────────────
async function readFileAsBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let j = 0; j < bytes.byteLength; j++) binary += String.fromCharCode(bytes[j]);
  return btoa(binary);
}

// ─── Componente de video YouTube con manejo de errores ───────────────────────
function YouTubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (hasError) {
    return (
      <div className="rounded-xl overflow-hidden bg-card flex flex-col items-center justify-center py-10 px-6 text-center gap-3">
        <span className="text-4xl">▶️</span>
        <p className="text-foreground font-semibold text-sm">Video no disponible para embedding</p>
        <p className="text-muted-foreground text-xs">El propietario del video desactivó la reproducción en sitios externos</p>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          🔗 Ver en YouTube
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden bg-black">
      <div className="relative" style={{ paddingBottom: "56.25%" }}>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-card">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
          </div>
        )}
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={() => setLoaded(true)}
          onError={() => setHasError(true)}
        />
      </div>
    </div>
  );
}

// ─── Módulo individual expandible ────────────────────────────────────────────
function ModuleItem({
  mod,
  courseId,
  isDone,
  modProgress,
  onRefetch,
}: {
  mod: { id: number; title: string; description: string | null; content: string | null; externalUrl: string | null; sortOrder: number };
  courseId: number;
  isDone: boolean;
  modProgress: { evidenceUrl: string | null; evidenceName: string | null; completedAt: Date | null } | undefined;
  onRefetch: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const markComplete = trpc.training.markComplete.useMutation({
    onSuccess: () => { toast.success("¡Módulo completado! 🎉"); onRefetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteEvidence = trpc.training.deleteEvidence.useMutation({
    onSuccess: () => { toast.success("Evidencia eliminada"); onRefetch(); },
    onError: (e) => toast.error(e.message),
  });

  const ytId = mod.externalUrl ? extractYouTubeId(mod.externalUrl) : null;
  const isExternal = mod.externalUrl && !ytId;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("El archivo no puede superar 10 MB"); return; }
    setUploading(true);
    try {
      const base64 = await readFileAsBase64(file);
      await utils.client.training.uploadEvidence.mutate({
        courseId,
        moduleId: mod.id,
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type || "application/octet-stream",
      });
      toast.success("Evidencia guardada en tu perfil ✅");
      onRefetch();
    } catch (err: any) {
      toast.error(err.message || "Error al subir evidencia");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className={`rounded-xl border transition-all ${isDone ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <span className={`text-xl shrink-0 ${isDone ? "text-green-500" : "text-muted-foreground"}`}>
          {isDone ? "✅" : "⭕"}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm ${isDone ? "text-green-800" : "text-foreground"}`}>{mod.title}</p>
          {mod.description && !expanded && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{mod.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {ytId && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">▶ Video</span>}
          {isExternal && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">🔗 Enlace</span>}
          {mod.content && <span className="text-xs bg-gray-100 text-muted-foreground px-2 py-0.5 rounded-full font-medium">📖 Guía</span>}
          <span className="text-muted-foreground text-sm">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-3">
          {mod.description && (
            <p className="text-sm text-muted-foreground">{mod.description}</p>
          )}
          {ytId && <YouTubeEmbed videoId={ytId} title={mod.title} />}
          {isExternal && (
            <a
              href={mod.externalUrl!}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors"
            >
              <span className="text-lg">🔗</span>
              <div className="min-w-0">
                <p className="font-medium text-blue-800 text-sm">Ver material externo</p>
                <p className="text-blue-600 text-xs truncate">{mod.externalUrl}</p>
              </div>
            </a>
          )}
          {mod.content && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">📖 Contenido del módulo</p>
              <SimpleMarkdown text={mod.content} />
            </div>
          )}
          {isDone && modProgress?.evidenceUrl && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
              <span className="text-lg">📎</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-700 font-medium">Evidencia guardada en tu perfil</p>
                <a
                  href={modProgress.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-green-800 text-sm underline truncate block"
                >
                  {modProgress.evidenceName || "Ver archivo"}
                </a>
              </div>
              <button
                onClick={() => deleteEvidence.mutate({ courseId, moduleId: mod.id })}
                disabled={deleteEvidence.isPending}
                className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0 bg-white border border-red-200 px-2 py-1 rounded"
              >
                {deleteEvidence.isPending ? "..." : "🗑 Borrar"}
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {!isDone ? (
              <>
                <Button
                  size="sm"
                  onClick={() => markComplete.mutate({ courseId, moduleId: mod.id })}
                  disabled={markComplete.isPending}
                  className="bg-green-600 hover:bg-green-700 text-foreground text-xs"
                >
                  {markComplete.isPending ? "Guardando..." : "✅ Marcar como completado"}
                </Button>
                <label className="cursor-pointer">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-xs font-medium transition-colors ${uploading ? "bg-orange-300 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"}`}>
                    {uploading ? "⏳ Subiendo..." : "📎 Subir evidencia"}
                  </span>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.mov"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </label>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium bg-green-100 px-3 py-1.5 rounded-md">
                  ✓ Completado
                  {modProgress?.completedAt && (
                    <span className="text-green-500 ml-1">
                      · {new Date(modProgress.completedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </span>
                {!modProgress?.evidenceUrl && (
                  <label className="cursor-pointer">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-orange-700 text-xs font-medium transition-colors ${uploading ? "bg-orange-50 cursor-not-allowed" : "bg-orange-100 hover:bg-orange-200"}`}>
                      {uploading ? "⏳ Subiendo..." : "📎 Agregar evidencia"}
                    </span>
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.mov"
                      onChange={handleUpload}
                      disabled={uploading}
                    />
                  </label>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal de detalle del curso ───────────────────────────────────────────────
function CourseDetailModal({ courseId, onClose }: { courseId: number; onClose: () => void }) {
  const { data, isLoading, refetch, isFetching } = trpc.training.getDetail.useQuery({ id: courseId });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const markComplete = trpc.training.markComplete.useMutation({
    onSuccess: () => { toast.success("¡Curso marcado como completado! 🎉"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteEvidence = trpc.training.deleteEvidence.useMutation({
    onSuccess: () => { toast.success("Evidencia eliminada"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handleCourseEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("El archivo no puede superar 10 MB"); return; }
    setUploading(true);
    try {
      const base64 = await readFileAsBase64(file);
      await utils.client.training.uploadEvidence.mutate({
        courseId,
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type || "application/octet-stream",
      });
      toast.success("Evidencia guardada en tu perfil ✅");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Error al subir evidencia");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (isLoading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-3" />
        <p className="text-muted-foreground">Cargando curso...</p>
      </div>
    </div>
  );
  if (!data) return null;

  const { course, modules, progress } = data;
  const cat = CATEGORIES[course.category] || CATEGORIES.other;
  const courseProgress = progress.find(p => !p.moduleId);
  const isCourseDone = courseProgress?.status === "completed";
  const completedModules = modules.filter(m => progress.some(p => p.moduleId === m.id && p.status === "completed")).length;
  const progressPct = modules.length > 0 ? Math.round((completedModules / modules.length) * 100) : 0;
  const ytId = course.externalUrl ? extractYouTubeId(course.externalUrl) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-gray-900 to-gray-700 rounded-t-2xl p-6 text-white">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {/* Botón de actualizar */}
            <button
              onClick={() => { refetch(); toast.info("Progreso actualizado"); }}
              disabled={isFetching}
              className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              title="Actualizar progreso"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{cat.emoji}</span>
            <div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
              {course.level && <span className="ml-2 text-xs text-white/70">{LEVELS[course.level] || course.level}</span>}
              {course.ownerId === null && (
                <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold">KobraPay</span>
              )}
            </div>
          </div>
          <h2 className="text-xl font-bold text-white">{course.title}</h2>
          {course.description && <p className="text-white/80 text-sm mt-1">{course.description}</p>}
          {course.durationMinutes ? <p className="text-white/60 text-xs mt-1">⏱ {course.durationMinutes} minutos estimados</p> : null}
          {modules.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                <span>Progreso del curso</span>
                <span>{completedModules}/{modules.length} módulos · {progressPct}%</span>
              </div>
              <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-orange-400 h-2 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Estado del curso */}
          {isCourseDone ? (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <span className="text-2xl">🏆</span>
              <div className="flex-1">
                <p className="font-semibold text-green-800">¡Curso completado! Aparece en tu perfil profesional.</p>
                {courseProgress?.completedAt && (
                  <p className="text-green-600 text-sm">
                    Completado el {new Date(courseProgress.completedAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
                {courseProgress?.evidenceUrl && (
                  <div className="flex items-center gap-3 mt-2">
                    <a href={courseProgress.evidenceUrl} target="_blank" rel="noreferrer" className="text-green-700 text-sm underline">
                      📎 {courseProgress.evidenceName || "Ver evidencia"}
                    </a>
                    <button
                      onClick={() => deleteEvidence.mutate({ courseId })}
                      disabled={deleteEvidence.isPending}
                      className="text-xs text-red-500 hover:text-red-700 font-medium bg-white border border-red-200 px-2 py-0.5 rounded"
                    >
                      {deleteEvidence.isPending ? "..." : "🗑 Borrar"}
                    </button>
                  </div>
                )}
                {!courseProgress?.evidenceUrl && (
                  <label className="cursor-pointer mt-2 inline-block">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-orange-700 text-xs font-medium transition-colors ${uploading ? "bg-orange-50 cursor-not-allowed" : "bg-orange-100 hover:bg-orange-200"}`}>
                      {uploading ? "⏳ Subiendo..." : "📎 Agregar evidencia al perfil"}
                    </span>
                    <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleCourseEvidenceUpload} disabled={uploading} />
                  </label>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => markComplete.mutate({ courseId })}
                disabled={markComplete.isPending}
                className="bg-green-600 hover:bg-green-700 text-foreground"
              >
                {markComplete.isPending ? "Guardando..." : "✅ Marcar como completado"}
              </Button>
              <label className="cursor-pointer">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${uploading ? "bg-orange-300 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"}`}>
                  {uploading ? "⏳ Subiendo..." : "📎 Subir evidencia"}
                </span>
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleCourseEvidenceUpload} disabled={uploading} />
              </label>
            </div>
          )}

          {/* Video del curso (nivel curso, no módulo) */}
          {ytId && <YouTubeEmbed videoId={ytId} title={course.title} />}

          {/* Enlace externo (no YouTube) */}
          {course.externalUrl && !ytId && (
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

          {/* Contenido del curso */}
          {course.content && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">📖 Guía del curso</p>
              <SimpleMarkdown text={course.content} />
            </div>
          )}

          {/* Módulos */}
          {modules.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">
                  📋 Módulos del curso
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({completedModules}/{modules.length} completados)</span>
                </h3>
                <button
                  onClick={() => { refetch(); toast.info("Progreso actualizado"); }}
                  disabled={isFetching}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-orange-600 bg-gray-100 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors border border-gray-200"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
                  Actualizar
                </button>
              </div>
              <div className="space-y-2">
                {modules.map((mod) => {
                  const modProgress = progress.find(p => p.moduleId === mod.id);
                  const isDone = modProgress?.status === "completed";
                  return (
                    <ModuleItem
                      key={mod.id}
                      mod={mod}
                      courseId={courseId}
                      isDone={isDone}
                      modProgress={modProgress}
                      onRefetch={refetch}
                    />
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
        ${course.isCompleted ? "border-green-300 bg-green-50" : "border-gray-200 bg-white hover:border-orange-300"}`}
    >
      {/* Imagen de portada si existe */}
      {course.coverImageUrl && (
        <div className="w-full h-28 overflow-hidden">
          <img src={course.coverImageUrl} alt={course.title} className="w-full h-full object-cover" />
        </div>
      )}
      {course.isCompleted && (
        <div className="absolute top-3 right-3 bg-green-500 text-foreground text-xs font-bold px-2 py-0.5 rounded-full">
          ✓ Completado
        </div>
      )}
      {course.ownerId === null && (
        <div className={`absolute ${course.coverImageUrl ? "top-3" : "top-3"} left-3 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
          KobraPay
        </div>
      )}
      <div className={`p-5 ${course.coverImageUrl ? "" : "pt-8"}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-3xl">{cat.emoji}</span>
          <div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
            {course.level && course.level !== "general" && (
              <span className="ml-2 text-xs text-muted-foreground">{LEVELS[course.level] || course.level}</span>
            )}
          </div>
        </div>
        <h3 className="font-bold text-foreground text-base leading-tight mb-1">{course.title}</h3>
        {course.description && (
          <p className="text-muted-foreground text-sm line-clamp-2">{course.description}</p>
        )}
        {course.durationMinutes ? (
          <p className="text-muted-foreground text-xs mt-2">⏱ {course.durationMinutes} min</p>
        ) : null}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-orange-600 text-sm font-medium">Ver curso →</span>
          {course.externalUrl && <span className="text-xs text-muted-foreground">🔗 Enlace externo</span>}
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
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverImageRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const create = trpc.training.create.useMutation({
    onSuccess: () => { toast.success("Curso creado exitosamente"); onCreated(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("La imagen no puede superar 5 MB"); return; }
    setCoverImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("El título es obligatorio"); return; }
    setUploadingCover(true);
    try {
      let coverImageUrl: string | undefined;
      if (coverImageFile) {
        const base64 = await readFileAsBase64(coverImageFile);
        const ext = coverImageFile.name.split('.').pop() || 'jpg';
        const resp = await utils.client.training.uploadCourseCover.mutate({
          fileName: `cover.${ext}`,
          fileBase64: base64,
          mimeType: coverImageFile.type,
        });
        coverImageUrl = resp?.url || undefined;
      }
      await create.mutateAsync({
        ...form,
        externalUrl: form.externalUrl || undefined,
        content: form.content || undefined,
        description: form.description || undefined,
        level: form.level as any,
        category: form.category as any,
        coverImageUrl,
      });
    } finally {
      setUploadingCover(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-foreground">🎓 Nuevo Curso</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground text-2xl leading-none">×</button>
          </div>
          <div className="space-y-4">
            {/* Imagen de portada */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Imagen de portada <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              {coverImagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                  <img src={coverImagePreview} alt="Portada" className="w-full h-32 object-cover" />
                  <button
                    onClick={() => { setCoverImageFile(null); setCoverImagePreview(null); if (coverImageRef.current) coverImageRef.current.value = ""; }}
                    className="absolute top-2 right-2 bg-black/60 text-foreground rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                  <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Haz clic para subir imagen (JPG, PNG · máx 5 MB)</span>
                  <input ref={coverImageRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" onChange={handleCoverImageChange} />
                </label>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Título *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Inglés Básico para Negocios"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Categoría</label>
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
                <label className="block text-sm font-medium text-foreground mb-1">Nivel</label>
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
              <label className="block text-sm font-medium text-foreground mb-1">Descripción</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe brevemente de qué trata el curso..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Enlace externo <span className="text-muted-foreground font-normal">— YouTube, PDF, sitio web (opcional)</span>
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.externalUrl}
                onChange={e => setForm(f => ({ ...f, externalUrl: e.target.value }))}
                placeholder="https://youtube.com/... o https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Contenido interno <span className="text-muted-foreground font-normal">— guía, tips, temario (soporta Markdown)</span>
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none font-mono"
                rows={8}
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder={"## Introducción\n\nEscribe aquí el contenido del curso...\n\n### Tema 1\n- Punto importante\n- **Concepto clave**\n\n> 💡 Consejo útil"}
              />
              <p className="text-xs text-muted-foreground mt-1">Usa ## para títulos, **negrita**, - para listas, &gt; para notas destacadas</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Duración estimada (minutos)</label>
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
              onClick={handleCreate}
              disabled={!form.title.trim() || create.isPending || uploadingCover}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {create.isPending || uploadingCover ? "Creando..." : "Crear Curso"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────────────────
export function TrainingPanel() {
  const { user } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [showGraduation, setShowGraduation] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: courses = [], isLoading, refetch, isFetching } = trpc.training.list.useQuery();
  const isSuperAdmin = user?.isSuperAdmin === true || user?.role === "superadmin";
  const isAdmin = user?.role === "admin" || isSuperAdmin || (user as any)?.staffRole === "asistente";

  const filtered = courses.filter((c: CourseWithProgress) => {
    const matchCat = activeCategory === "all" || c.category === activeCategory;
    const matchSearch = !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()) || (c.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });
  const completedCount = courses.filter((c: CourseWithProgress) => c.isCompleted).length;
  const kobrapayCount = courses.filter((c: CourseWithProgress) => c.ownerId === null).length;

  // Detectar cuando se completan todos los cursos
  const prevCompletedRef = useRef(0);
  const completedCountCurrent = courses.filter((c: CourseWithProgress) => c.isCompleted).length;
  if (courses.length > 0 && completedCountCurrent === courses.length && prevCompletedRef.current < courses.length && completedCountCurrent > 0) {
    prevCompletedRef.current = completedCountCurrent;
    if (!showGraduation) setTimeout(() => setShowGraduation(true), 300);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con logo y botón regresar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <a className="flex items-center gap-2 hover:opacity-80 transition-opacity" title="Ir al Panel Principal">
                <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center shadow">
                  <span className="text-foreground font-black text-sm">K</span>
                </div>
                <span className="hidden sm:block font-bold text-foreground text-sm">KobraPay</span>
              </a>
            </Link>
            <div className="w-px h-8 bg-gray-200" />
            <div>
              <h1 className="text-xl font-bold text-foreground">🎓 Capacitaciones</h1>
              <p className="text-muted-foreground text-xs mt-0.5">Cursos para tu crecimiento profesional y personal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-4 text-center">
              <div className="bg-orange-50 rounded-xl px-4 py-2">
                <p className="text-xl font-bold text-orange-600">{completedCount}</p>
                <p className="text-xs text-orange-500">Completados</p>
              </div>
              <div className="bg-gray-100 rounded-xl px-4 py-2">
                <p className="text-xl font-bold text-foreground">{courses.length}</p>
                <p className="text-xs text-muted-foreground">Total cursos</p>
              </div>
            </div>
            {/* Botón de actualizar progreso */}
            <button
              onClick={() => { refetch(); toast.info("Lista de cursos actualizada"); }}
              disabled={isFetching}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-orange-600 bg-white border border-gray-200 hover:border-orange-300 px-3 py-2 rounded-xl transition-colors"
              title="Actualizar progreso"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            {isAdmin && (
              <Button onClick={() => setShowNewCourse(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                + Nuevo Curso
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white min-w-[220px]"
            placeholder="🔍 Buscar cursos..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === "all" ? "bg-card text-foreground" : "bg-white border border-gray-300 text-muted-foreground hover:border-gray-400"}`}
            >
              Todos
            </button>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setActiveCategory(k)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === k ? "bg-card text-foreground" : "bg-white border border-gray-300 text-muted-foreground hover:border-gray-400"}`}
              >
                {v.emoji} {v.label}
              </button>
            ))}
          </div>
        </div>

        {kobrapayCount > 0 && activeCategory === "all" && !searchQuery && (
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-5 mb-6 text-white flex items-center gap-4">
            <span className="text-4xl">🐍</span>
            <div>
              <p className="font-bold text-lg text-white">Academia KobraPay</p>
              <p className="text-orange-100 text-sm">
                {kobrapayCount} cursos con contenido interno: guías, videos y material completo sin salir de la plataforma.
              </p>
            </div>
          </div>
        )}

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
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-5xl mb-3">📭</p>
            <p className="text-lg font-medium">No hay cursos disponibles</p>
            {isAdmin && <p className="text-sm mt-1">Crea el primer curso con el botón "+ Nuevo Curso"</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((course: CourseWithProgress) => (
              <CourseCard key={course.id} course={course} onOpen={() => setSelectedCourseId(course.id)} />
            ))}
          </div>
        )}

        {courses.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground">📊 Tu progreso general</h3>
              <button
                onClick={() => { refetch(); toast.info("Progreso actualizado"); }}
                disabled={isFetching}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-orange-600 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
                Actualizar
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-orange-500 h-3 rounded-full transition-all"
                  style={{ width: `${courses.length > 0 ? (completedCount / courses.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                {completedCount} / {courses.length} completados
              </span>
            </div>
            {completedCount === courses.length && courses.length > 0 && (
              <p className="text-green-600 text-sm font-medium mt-2">🏆 ¡Has completado todos los cursos disponibles!</p>
            )}
          </div>
        )}
      </div>

      {selectedCourseId !== null && (
        <CourseDetailModal courseId={selectedCourseId} onClose={() => setSelectedCourseId(null)} />
      )}
      {showNewCourse && (
        <NewCourseModal onClose={() => setShowNewCourse(false)} onCreated={refetch} />
      )}

      {/* Modal de Graduación */}
      {showGraduation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="text-7xl mb-4">🎓</div>
            <h2 className="text-2xl font-black text-foreground mb-2">¡Felicidades!</h2>
            <p className="text-lg font-semibold text-orange-600 mb-1">Has completado todos los cursos</p>
            <p className="text-muted-foreground text-sm mb-6">
              ¡Eres un profesional KobraPay! Todos tus logros aparecen en tu perfil profesional.
            </p>
            <div className="flex justify-center gap-2 mb-6 text-4xl">
              🏆 ⭐ 🎉 ⭐ 🏆
            </div>
            <div className="bg-orange-50 rounded-2xl p-4 mb-6">
              <p className="text-orange-800 font-semibold text-sm">📊 {courses.length} cursos completados</p>
              <p className="text-orange-600 text-xs mt-1">Todos aparecen en tu Perfil Profesional</p>
            </div>
            <button
              onClick={() => setShowGraduation(false)}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all"
            >
              ¡Gracias! Ver mi perfil profesional
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página con DashboardLayout ────────────────────────────────────────────────
export default function Training() {
  return (
    <DashboardLayout>
      <TrainingPanel />
    </DashboardLayout>
  );
}
