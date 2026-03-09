import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Brain,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Bot,
  Zap,
  TrendingUp,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span
        className={`text-sm font-bold w-8 text-right ${
          score >= 80
            ? "text-emerald-600"
            : score >= 50
            ? "text-amber-600"
            : "text-red-600"
        }`}
      >
        {score}
      </span>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  if (decision === "auto_approved")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
        <CheckCircle2 className="w-3 h-3" /> Auto-aprobado
      </Badge>
    );
  if (decision === "auto_rejected")
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
        <XCircle className="w-3 h-3" /> Auto-rechazado
      </Badge>
    );
  return (
    <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
      <AlertTriangle className="w-3 h-3" /> Revisión manual
    </Badge>
  );
}

function formatDate(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Formulario de evaluación manual ─────────────────────────────────────────
function EvaluateForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    applicantEmail: "",
    applicantName: "",
    businessName: "",
    businessType: "",
    monthlyRevenue: "",
    rfc: "",
    phone: "",
  });
  const [result, setResult] = useState<null | {
    aiScore: number;
    decision: string;
    aiReasoning: string;
    riskFlags: string[];
  }>(null);

  const evaluate = trpc.aiScoring.evaluate.useMutation({
    onSuccess: (data) => {
      setResult(data);
      onDone();
      toast.success("Evaluación completada");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
          <Brain className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Evaluar solicitud manualmente</h3>
          <p className="text-xs text-muted-foreground">
            La IA analizará los datos y asignará un score de riesgo
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Email del solicitante *
          </Label>
          <Input
            type="email"
            placeholder="negocio@ejemplo.com"
            value={form.applicantEmail}
            onChange={(e) => setForm({ ...form, applicantEmail: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Nombre completo
          </Label>
          <Input
            placeholder="Juan García López"
            value={form.applicantName}
            onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Nombre del negocio
          </Label>
          <Input
            placeholder="Restaurante El Buen Sabor"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Tipo de negocio
          </Label>
          <Input
            placeholder="Restaurante / Tienda / Servicios..."
            value={form.businessType}
            onChange={(e) => setForm({ ...form, businessType: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Ingresos mensuales estimados
          </Label>
          <Input
            placeholder="$50,000 - $200,000 MXN"
            value={form.monthlyRevenue}
            onChange={(e) => setForm({ ...form, monthlyRevenue: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            RFC
          </Label>
          <Input
            placeholder="GAGL900101ABC"
            value={form.rfc}
            onChange={(e) => setForm({ ...form, rfc: e.target.value })}
          />
        </div>
      </div>

      <Button
        onClick={() => evaluate.mutate(form)}
        disabled={!form.applicantEmail || evaluate.isPending}
        className="w-full bg-violet-600 hover:bg-violet-700 text-foreground"
      >
        {evaluate.isPending ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Analizando con IA...
          </>
        ) : (
          <>
            <Brain className="w-4 h-4 mr-2" />
            Evaluar con IA
          </>
        )}
      </Button>

      {result && (
        <div
          className={`rounded-xl p-5 border ${
            result.decision === "auto_approved"
              ? "bg-emerald-50 border-emerald-200"
              : result.decision === "auto_rejected"
              ? "bg-red-50 border-red-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <DecisionBadge decision={result.decision} />
            <span className="text-2xl font-black text-foreground">{result.aiScore}/100</span>
          </div>
          <ScoreBar score={result.aiScore} />
          <p className="text-sm text-foreground mt-3">{result.aiReasoning}</p>
          {result.riskFlags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.riskFlags.map((flag, i) => (
                <span
                  key={i}
                  className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full"
                >
                  ⚠ {flag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Fila de score ────────────────────────────────────────────────────────────
function ScoreRow({
  score,
  onReview,
}: {
  score: {
    id: number;
    applicantEmail: string;
    applicantName?: string | null;
    businessName?: string | null;
    aiScore: number;
    decision: string;
    aiReasoning?: string | null;
    riskFlags?: string | null;
    reviewedAt?: number | null;
    reviewerNotes?: string | null;
    createdAt: number;
  };
  onReview: (id: number, decision: "auto_approved" | "auto_rejected") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const flags: string[] = (() => {
    try {
      return JSON.parse(score.riskFlags || "[]");
    } catch {
      return [];
    }
  })();

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div
        className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Score circle */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg ${
            score.aiScore >= 80
              ? "bg-emerald-100 text-emerald-700"
              : score.aiScore >= 50
              ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {score.aiScore}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">
              {score.applicantName || score.applicantEmail}
            </p>
            {score.businessName && (
              <span className="text-xs text-muted-foreground">{score.businessName}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{score.applicantEmail}</p>
        </div>

        {/* Decision */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <DecisionBadge decision={score.decision} />
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 bg-gray-50/30">
          <div className="pt-2">
            <ScoreBar score={score.aiScore} />
          </div>

          {score.aiReasoning && (
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" />
                Razonamiento IA
              </p>
              <p className="text-sm text-foreground">{score.aiReasoning}</p>
            </div>
          )}

          {flags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Señales de riesgo
              </p>
              <div className="flex flex-wrap gap-1.5">
                {flags.map((flag, i) => (
                  <span
                    key={i}
                    className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full"
                  >
                    ⚠ {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              <Clock className="w-3 h-3 inline mr-1" />
              {formatDate(score.createdAt)}
            </p>
            {score.decision === "manual_review" && !score.reviewedAt && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReview(score.id, "auto_rejected");
                  }}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Rechazar
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReview(score.id, "auto_approved");
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Aprobar
                </Button>
              </div>
            )}
            {score.reviewedAt && (
              <span className="text-xs text-muted-foreground">
                Revisado: {formatDate(score.reviewedAt)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AIScoring() {
  const [filter, setFilter] = useState<
    "all" | "auto_approved" | "manual_review" | "auto_rejected"
  >("all");
  const [showForm, setShowForm] = useState(false);

  const { data: scores = [], isLoading, refetch } = trpc.aiScoring.list.useQuery(
    { limit: 100 },
    { refetchInterval: 60_000 }
  );

  const review = trpc.aiScoring.review.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Decisión guardada");
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered =
    filter === "all" ? scores : scores.filter((s) => s.decision === filter);

  const stats = {
    total: scores.length,
    approved: scores.filter((s) => s.decision === "auto_approved").length,
    manual: scores.filter((s) => s.decision === "manual_review").length,
    rejected: scores.filter((s) => s.decision === "auto_rejected").length,
  };

  return (
    <DashboardLayout title="Panel de Scoring IA">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="w-6 h-6 text-violet-600" />
              Motor de Scoring IA
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Evaluación automática de solicitudes de registro. La IA filtra bots,
              duplicados y solicitudes de alto riesgo.
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-violet-600 hover:bg-violet-700 text-foreground"
          >
            <Brain className="w-4 h-4 mr-2" />
            {showForm ? "Ocultar formulario" : "Evaluar solicitud"}
          </Button>
        </div>

        {/* Cómo funciona */}
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl p-5 border border-violet-200">
          <h3 className="font-bold text-violet-900 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            ¿Cómo funciona el sistema?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: ShieldCheck,
                color: "text-emerald-600",
                bg: "bg-emerald-100",
                title: "Score 80-100: Auto-aprobado",
                desc: "Negocio legítimo, datos completos, sin señales de riesgo. Se aprueba automáticamente sin intervención tuya.",
              },
              {
                icon: ShieldAlert,
                color: "text-amber-600",
                bg: "bg-amber-100",
                title: "Score 50-79: Revisión manual",
                desc: "Datos incompletos o señales menores. Solo estos casos llegan a tu bandeja para que tú decidas.",
              },
              {
                icon: ShieldX,
                color: "text-red-600",
                bg: "bg-red-100",
                title: "Score 0-49: Auto-rechazado",
                desc: "Señales claras de fraude, bot, duplicado o datos falsos. Se rechaza automáticamente.",
              },
            ].map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="flex gap-3">
                <div
                  className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`w-4.5 h-4.5 ${color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-violet-200">
            <p className="text-xs text-violet-700">
              <Bot className="w-3.5 h-3.5 inline mr-1" />
              <strong>Anti-bot:</strong> En producción, cada formulario de registro incluirá
              Cloudflare Turnstile para verificar que el solicitante es humano antes de
              llegar al motor de scoring.
            </p>
          </div>
        </div>

        {/* Formulario de evaluación */}
        {showForm && (
          <EvaluateForm onDone={() => { setShowForm(false); refetch(); }} />
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total evaluados", value: stats.total, icon: Users, color: "text-violet-600", bg: "bg-violet-100" },
            { label: "Auto-aprobados", value: stats.approved, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
            { label: "Revisión manual", value: stats.manual, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100" },
            { label: "Auto-rechazados", value: stats.rejected, icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className="text-2xl font-black text-foreground mt-0.5">{value}</p>
                </div>
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "Todos" },
            { key: "manual_review", label: "Revisión manual" },
            { key: "auto_approved", label: "Auto-aprobados" },
            { key: "auto_rejected", label: "Auto-rechazados" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === key
                  ? "bg-violet-600 text-foreground"
                  : "bg-gray-100 text-muted-foreground hover:bg-gray-200"
              }`}
            >
              {label}
              {key === "manual_review" && stats.manual > 0 && (
                <span className="ml-1.5 bg-amber-500 text-foreground text-xs rounded-full px-1.5 py-0.5">
                  {stats.manual}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => refetch()}
            className="ml-auto p-2 text-muted-foreground hover:text-muted-foreground hover:bg-gray-100 rounded-xl transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de scores */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-500" />
              Solicitudes evaluadas
            </h3>
            <span className="text-xs text-muted-foreground">{filtered.length} registros</span>
          </div>

          {isLoading ? (
            <div className="space-y-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
                  <div className="w-12 h-12 bg-gray-100 animate-pulse rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 animate-pulse rounded w-40" />
                    <div className="h-3 bg-gray-100 animate-pulse rounded w-56" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Brain className="w-7 h-7 text-violet-400" />
              </div>
              <p className="text-muted-foreground font-medium mb-1">Sin evaluaciones aún</p>
              <p className="text-sm text-muted-foreground">
                Usa el botón "Evaluar solicitud" para probar el motor de scoring
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((score) => (
                <ScoreRow
                  key={score.id}
                  score={score}
                  onReview={(id, decision) =>
                    review.mutate({ scoreId: id, decision })
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Info de capacidad */}
        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200">
          <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Capacidad y escalabilidad
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-semibold mb-1">Base de datos (MySQL/TiDB)</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                TiDB (el motor de base de datos de esta plataforma) es distribuido y escala
                horizontalmente. No hay límite práctico de clientes: puede manejar millones
                de registros sin degradación de rendimiento.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">Almacenamiento en la nube (S3)</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Las imágenes (selfies, documentos, firmas) se guardan en Amazon S3. El
                almacenamiento es prácticamente ilimitado y se paga por uso. 1 TB de
                imágenes cuesta aproximadamente $23 USD/mes. No hay límite de archivos.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">Procesamiento de pagos (Stripe)</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Stripe no tiene límite de transacciones ni de clientes. Soporta desde 1
                hasta millones de transacciones diarias. El único límite es el volumen
                mensual acordado en tu contrato con Stripe (ajustable).
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">Motor de IA (scoring)</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                El scoring IA puede procesar miles de solicitudes por minuto. Con el
                sistema de auto-aprobación, tú solo revisas los casos ambiguos (score
                50-79). Cuando tengas 10,000 clientes, quizás solo revises 5-10 casos
                por semana.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
