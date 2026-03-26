import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { TrendingUp, Users, AlertTriangle, Star, ChevronDown, ChevronUp, Info } from "lucide-react";

function ScoreBadge({ score, level, color }: { score: number; level: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-foreground font-bold text-sm shrink-0"
        style={{ backgroundColor: color }}
      >
        {score}
      </div>
      <span className="text-sm font-medium" style={{ color }}>
        {level}
      </span>
    </div>
  );
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-10 text-right">{value}/{max}</span>
    </div>
  );
}

function ScoreDetailPanel({ userId, onClose }: { userId: number; onClose: () => void }) {
  const { data, isLoading } = trpc.kobraScore.getScore.useQuery({ targetUserId: userId });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Detalle KobraScore</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground text-xl leading-none">&times;</button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Calculando score...</div>
        ) : data ? (
          <>
            {/* Score principal */}
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: `${data.color}15` }}>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-foreground font-bold text-2xl shrink-0"
                style={{ backgroundColor: data.color }}
              >
                {data.score}
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: data.color }}>{data.level}</p>
                <p className="text-sm text-muted-foreground">{data.description}</p>
              </div>
            </div>

            {/* Desglose */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground">Desglose del puntaje</p>
              {Object.values(data.breakdown).map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.detail}</span>
                  </div>
                  <ScoreBar value={item.score} max={item.max} color={data.color} />
                </div>
              ))}
            </div>

            {/* Cómo mejorar */}
            <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                El KobraScore se actualiza en tiempo real. Para mejorar el puntaje: aumentar el volumen de ventas mensual, mantener frecuencia constante de cobros y evitar contracargos.
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No se pudo calcular el score.</div>
        )}
      </div>
    </div>
  );
}

export default function KobraScorePage() {
  const { data: scores, isLoading } = trpc.kobraScore.getAllScores.useQuery();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "volume" | "name">("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = [...(scores ?? [])].sort((a, b) => {
    let va: number | string = sortBy === "name" ? a.name || "" : sortBy === "volume" ? a.volume30d : a.score;
    let vb: number | string = sortBy === "name" ? b.name || "" : sortBy === "volume" ? b.volume30d : b.score;
    if (typeof va === "string" && typeof vb === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const avgScore = scores?.length ? Math.round(scores.reduce((s, c) => s + c.score, 0) / scores.length) : 0;
  const excellent = scores?.filter(c => c.score >= 85).length ?? 0;
  const atRisk = scores?.filter(c => c.score < 25).length ?? 0;

  return (
    <DashboardLayout title="KobraScore">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-1">
            <Star className="w-7 h-7 text-white" />
            <h1 className="text-xl font-bold text-white">KobraScore</h1>
          </div>
          <p className="text-blue-100 text-sm">
            Puntaje interno de confianza para cada cliente. Basado en volumen de ventas, frecuencia de cobros, contracargos y antigüedad.
          </p>
        </div>

        {/* Métricas resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Score Promedio</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">{avgScore}</p>
            <p className="text-xs text-muted-foreground mt-0.5">de 100 puntos</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Clientes Excelente</span>
            </div>
            <p className="text-3xl font-bold text-emerald-600">{excellent}</p>
            <p className="text-xs text-muted-foreground mt-0.5">score ≥ 85</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Requieren Atención</span>
            </div>
            <p className="text-3xl font-bold text-orange-500">{atRisk}</p>
            <p className="text-xs text-muted-foreground mt-0.5">score &lt; 25</p>
          </div>
        </div>

        {/* Tabla de clientes */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Clientes y sus KobraScores</h3>
            <span className="text-xs text-muted-foreground">{scores?.length ?? 0} clientes</span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Calculando scores...</div>
          ) : !sorted.length ? (
            <div className="p-8 text-center">
              <Star className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Aún no tienes clientes para evaluar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort("name")}
                    >
                      <span className="flex items-center gap-1">
                        Cliente
                        {sortBy === "name" ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                      </span>
                    </th>
                    <th
                      className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort("score")}
                    >
                      <span className="flex items-center gap-1">
                        KobraScore
                        {sortBy === "score" ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                      </span>
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort("volume")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Vol. 30d
                        {sortBy === "volume" ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                      </span>
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Tx 90d</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Contracargos</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.map((c) => (
                    <tr key={c.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{c.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBadge score={c.score} level={c.level} color={c.color} />
                      </td>
                      <td className="px-4 py-3 text-right text-foreground font-medium">
                        ${c.volume30d.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{c.txCount90d}</td>
                      <td className="px-4 py-3 text-right">
                        {c.chargebackCount > 0 ? (
                          <span className="text-red-600 font-medium">{c.chargebackCount}</span>
                        ) : (
                          <span className="text-emerald-600">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedUserId(c.userId)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Leyenda */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-xs font-semibold text-muted-foreground mb-3">Escala de KobraScore</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
            {[
              { label: "Nuevo", range: "0–24", color: "#6b7280" },
              { label: "Bajo", range: "25–44", color: "#f97316" },
              { label: "Regular", range: "45–64", color: "#f59e0b" },
              { label: "Bueno", range: "65–84", color: "#3b82f6" },
              { label: "Excelente", range: "85–100", color: "#10b981" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: s.color }} />
                <p className="text-xs font-medium" style={{ color: s.color }}>{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.range}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de detalle */}
      {selectedUserId !== null && (
        <ScoreDetailPanel userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </DashboardLayout>
  );
}
