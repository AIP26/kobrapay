import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Megaphone, Instagram, MessageCircle, Mail, Package,
  Copy, RefreshCw, Sparkles, Zap, CheckCircle2
} from "lucide-react";

type ContentType = "instagram_post" | "whatsapp_message" | "email_campaign" | "business_kit";

const CONTENT_TYPES: { value: ContentType; label: string; icon: React.ElementType; description: string; color: string }[] = [
  {
    value: "instagram_post",
    label: "Post Instagram",
    icon: Instagram,
    description: "Caption + hashtags para Instagram",
    color: "text-pink-600 bg-pink-50 border-pink-200",
  },
  {
    value: "whatsapp_message",
    label: "Mensaje WhatsApp",
    icon: MessageCircle,
    description: "Mensaje persuasivo para WhatsApp",
    color: "text-green-600 bg-green-50 border-green-200",
  },
  {
    value: "email_campaign",
    label: "Email de Campaña",
    icon: Mail,
    description: "Email profesional de marketing",
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    value: "business_kit",
    label: "Kit Completo",
    icon: Package,
    description: "Post + WhatsApp + Email en un solo click",
    color: "text-violet-600 bg-violet-50 border-violet-200",
  },
];

const BUSINESS_TYPES = [
  "Restaurante", "Tienda de ropa", "Salón de belleza", "Consultorio médico",
  "Farmacia", "Ferretería", "Papelería", "Gimnasio", "Escuela o academia",
  "Taller mecánico", "Veterinaria", "Hotel o hostal", "Agencia de viajes",
  "Inmobiliaria", "Despacho contable", "Otro",
];

export default function AIMarketing() {
  const { user } = useAuth();
  const [contentType, setContentType] = useState<ContentType>("instagram_post");
  const [businessType, setBusinessType] = useState("");
  const [city, setCity] = useState("");
  const [product, setProduct] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [kitContent, setKitContent] = useState<{ instagram?: string; whatsapp?: string; email?: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const generateMutation = trpc.aiAssistant.marketing.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      setKitContent(null);
      toast.success("¡Contenido generado exitosamente!");
    },
    onError: (err) => {
      toast.error("Error al generar contenido: " + err.message);
    },
  });

  // businessKit no existe como procedimiento separado — se usa marketing.generate con type='business_kit'
  const kitMutation = trpc.aiAssistant.marketing.generate.useMutation({
    onSuccess: (data) => {
      // Parsear el kit completo del contenido generado
      const raw = data.content;
      const igMatch = raw.match(/instagram[:\s\n]+([\s\S]*?)(?=whatsapp|email|$)/i);
      const waMatch = raw.match(/whatsapp[:\s\n]+([\s\S]*?)(?=email|instagram|$)/i);
      const emMatch = raw.match(/email[:\s\n]+([\s\S]*?)(?=instagram|whatsapp|$)/i);
      setKitContent({
        instagram: igMatch?.[1]?.trim() || raw,
        whatsapp: waMatch?.[1]?.trim() || "",
        email: emMatch?.[1]?.trim() || "",
      });
      setGeneratedContent(null);
      toast.success("¡Kit de marketing completo generado!");
    },
    onError: (err) => {
      toast.error("Error al generar el kit: " + err.message);
    },
  });

  const isLoading = generateMutation.isPending || kitMutation.isPending;

  const handleGenerate = () => {
    if (!businessType) {
      toast.error("Selecciona el tipo de negocio");
      return;
    }
    const baseInput = {
      type: contentType,
      businessName: businessType, // usamos businessType como nombre del negocio
      businessType,
      city: city || "México",
      product: product || "mis productos/servicios",
      extraContext: customPrompt || undefined,
    };
    if (contentType === "business_kit") {
      kitMutation.mutate(baseInput);
    } else {
      generateMutation.mutate(baseInput);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("¡Copiado al portapapeles!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-600 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Generador de Marketing IA</h1>
              <p className="text-sm text-muted-foreground">Crea contenido profesional para tu negocio en segundos</p>
            </div>
          </div>
          <Badge variant="outline" className="text-violet-600 border-violet-200 bg-violet-50">
            <Zap className="w-3 h-3 mr-1" />
            Powered by ContentAI
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel izquierdo: Configuración */}
          <div className="space-y-5">
            {/* Tipo de contenido */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">¿Qué quieres crear?</Label>
              <div className="grid grid-cols-2 gap-2">
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => setContentType(ct.value)}
                    className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 transition-all text-left ${
                      contentType === ct.value
                        ? ct.color + " border-current"
                        : "bg-card border-border hover:border-muted-foreground"
                    }`}
                  >
                    <ct.icon className={`w-4 h-4 ${contentType === ct.value ? "" : "text-muted-foreground"}`} />
                    <span className="text-xs font-semibold leading-tight">{ct.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{ct.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Datos del negocio */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Datos de tu negocio</Label>
              <div className="space-y-2">
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de negocio *" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((bt) => (
                      <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Ciudad (ej: Monterrey, CDMX)"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <Input
                  placeholder="Producto o servicio a promocionar"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                />
                {contentType !== "business_kit" && (
                  <Textarea
                    placeholder="Instrucción adicional (opcional): ej. 'Menciona que tenemos 20% de descuento esta semana'"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                  />
                )}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isLoading || !businessType}
              className="w-full bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white font-semibold"
              size="lg"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {contentType === "business_kit" ? "Generar Kit Completo" : "Generar Contenido"}
                </>
              )}
            </Button>
          </div>

          {/* Panel derecho: Resultado */}
          <div className="space-y-4">
            {!generatedContent && !kitContent && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] rounded-2xl border-2 border-dashed border-border bg-muted/30 text-center p-8">
                <Sparkles className="w-12 h-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Tu contenido aparecerá aquí</p>
                <p className="text-xs text-muted-foreground mt-1">Completa los datos y haz clic en Generar</p>
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] rounded-2xl border border-border bg-card p-8">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-pink-600 flex items-center justify-center mb-4 animate-pulse">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-medium text-foreground">Generando contenido...</p>
                <p className="text-xs text-muted-foreground mt-1">ContentAI está trabajando para ti</p>
              </div>
            )}

            {/* Resultado único */}
            {generatedContent && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const ct = CONTENT_TYPES.find((c) => c.value === contentType);
                      return ct ? <ct.icon className="w-4 h-4 text-muted-foreground" /> : null;
                    })()}
                    <span className="text-sm font-semibold">
                      {CONTENT_TYPES.find((c) => c.value === contentType)?.label}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(generatedContent, "main")}
                    className="h-7 px-2 text-xs"
                  >
                    {copied === "main" ? (
                      <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />Copiado</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5 mr-1" />Copiar</>
                    )}
                  </Button>
                </div>
                <div className="p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{generatedContent}</p>
                </div>
                <div className="px-4 py-3 border-t border-border bg-muted/20">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="text-xs h-7"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regenerar
                  </Button>
                </div>
              </div>
            )}

            {/* Kit completo */}
            {kitContent && (
              <div className="space-y-3">
                {kitContent.instagram && (
                  <div className="rounded-xl border border-pink-200 bg-pink-50/50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-pink-200">
                      <div className="flex items-center gap-2">
                        <Instagram className="w-4 h-4 text-pink-600" />
                        <span className="text-sm font-semibold text-pink-700">Instagram</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(kitContent.instagram!, "ig")} className="h-6 px-2 text-xs">
                        {copied === "ig" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                    <p className="p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed">{kitContent.instagram}</p>
                  </div>
                )}
                {kitContent.whatsapp && (
                  <div className="rounded-xl border border-green-200 bg-green-50/50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-green-200">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">WhatsApp</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(kitContent.whatsapp!, "wa")} className="h-6 px-2 text-xs">
                        {copied === "wa" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                    <p className="p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed">{kitContent.whatsapp}</p>
                  </div>
                )}
                {kitContent.email && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-blue-200">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-700">Email</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(kitContent.email!, "em")} className="h-6 px-2 text-xs">
                        {copied === "em" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                    <p className="p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed">{kitContent.email}</p>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isLoading} className="text-xs h-7 w-full">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Regenerar Kit
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
