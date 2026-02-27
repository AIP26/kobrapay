import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Code2,
  Copy,
  CheckCircle2,
  ExternalLink,
  Globe,
  Palette,
  Zap,
  Link2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function Widget() {
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<number | null>(null);
  const [btnText, setBtnText] = useState("Pagar ahora");
  const [btnColor, setBtnColor] = useState("#06b6d4");
  const [btnTextColor, setBtnTextColor] = useState("#ffffff");
  const [btnRadius, setBtnRadius] = useState("8");

  const { data: links } = trpc.paymentLinks.list.useQuery();
  const pendingLinks = links?.filter((l) => l.status === "pending") ?? [];
  const selectedLinkData = pendingLinks.find((l) => l.id === selectedLink);

  const payUrl = selectedLinkData
    ? `${window.location.origin}/pay/${selectedLinkData.token}`
    : `${window.location.origin}/pay/TOKEN_DEL_ENLACE`;

  const widgetCode = useMemo(() => {
    return `<!-- Widget de Pago PagaFácil -->
<a href="${payUrl}" target="_blank" rel="noopener noreferrer"
  style="
    display: inline-block;
    background-color: ${btnColor};
    color: ${btnTextColor};
    padding: 12px 28px;
    border-radius: ${btnRadius}px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 16px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    border: none;
    transition: opacity 0.2s;
  "
  onmouseover="this.style.opacity='0.85'"
  onmouseout="this.style.opacity='1'"
>
  ${btnText}
</a>
<!-- Fin Widget PagaFácil -->`;
  }, [payUrl, btnColor, btnTextColor, btnRadius, btnText]);

  const iframeCode = useMemo(() => {
    return `<!-- Formulario de Pago Embebido PagaFácil -->
<iframe
  src="${payUrl}"
  width="100%"
  height="700"
  frameborder="0"
  style="border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.1);"
  allow="camera; microphone"
  title="Formulario de Pago"
></iframe>
<!-- Fin Formulario PagaFácil -->`;
  }, [payUrl]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Código copiado al portapapeles");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <DashboardLayout title="Widget de Pago">
      <div className="space-y-5 max-w-4xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Widget de Pago Embebible</h2>
              <p className="text-cyan-100 text-sm">Agrega un botón o formulario de pago a cualquier sitio web</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { icon: Zap, text: "Copia y pega" },
              { icon: Globe, text: "Funciona en cualquier sitio" },
              { icon: Palette, text: "Personalizable" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-1.5 text-sm">
                <Icon className="w-3.5 h-3.5" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Seleccionar enlace */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-cyan-500" />
              1. Selecciona un enlace de pago
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {pendingLinks.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tienes enlaces pendientes.</p>
                <p className="text-xs mt-1">Crea un enlace de pago primero.</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {pendingLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => setSelectedLink(link.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedLink === link.id
                        ? "border-cyan-400 bg-cyan-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedLink === link.id ? "bg-cyan-500" : "bg-gray-100"}`}>
                      <Link2 className={`w-4 h-4 ${selectedLink === link.id ? "text-white" : "text-gray-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{link.clientName}</p>
                      <p className="text-xs text-gray-400 truncate">{link.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-700">
                        {new Intl.NumberFormat("es-MX", { style: "currency", currency: link.currency }).format(Number(link.amount))}
                      </p>
                      {selectedLink === link.id && <CheckCircle2 className="w-4 h-4 text-cyan-500 ml-auto mt-0.5" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personalizar botón */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Palette className="w-4 h-4 text-cyan-500" />
              2. Personaliza el botón
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Texto del botón</Label>
                <Input
                  value={btnText}
                  onChange={(e) => setBtnText(e.target.value)}
                  className="h-9 text-sm border-gray-200"
                  placeholder="Pagar ahora"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Color de fondo</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={btnColor}
                    onChange={(e) => setBtnColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <Input
                    value={btnColor}
                    onChange={(e) => setBtnColor(e.target.value)}
                    className="h-9 text-sm border-gray-200 font-mono"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Color del texto</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={btnTextColor}
                    onChange={(e) => setBtnTextColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <Input
                    value={btnTextColor}
                    onChange={(e) => setBtnTextColor(e.target.value)}
                    className="h-9 text-sm border-gray-200 font-mono"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Radio (px)</Label>
                <Input
                  type="number"
                  value={btnRadius}
                  onChange={(e) => setBtnRadius(e.target.value)}
                  className="h-9 text-sm border-gray-200"
                  min="0"
                  max="50"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-xl p-6 flex items-center justify-center border border-gray-200">
              <a
                href={payUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  backgroundColor: btnColor,
                  color: btnTextColor,
                  padding: "12px 28px",
                  borderRadius: `${btnRadius}px`,
                  fontFamily: "system-ui, sans-serif",
                  fontSize: "16px",
                  fontWeight: "600",
                  textDecoration: "none",
                }}
              >
                {btnText}
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Código del botón */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-500" />
                3. Copia el código HTML
              </CardTitle>
              <Badge variant="outline" className="text-xs border-green-300 text-green-700 bg-green-50">
                Botón de enlace
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs overflow-x-auto font-mono leading-relaxed">
                {widgetCode}
              </pre>
              <Button
                size="sm"
                onClick={() => handleCopy(widgetCode, "button")}
                className={`absolute top-3 right-3 h-8 text-xs transition-all ${
                  copied === "button"
                    ? "bg-green-500 hover:bg-green-500 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-white"
                }`}
              >
                {copied === "button" ? (
                  <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Copiado</>
                ) : (
                  <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar</>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Pega este código en el HTML de tu sitio web donde quieras que aparezca el botón de pago.
            </p>
          </CardContent>
        </Card>

        {/* Código del iframe */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-blue-500" />
                Formulario embebido (iframe)
              </CardTitle>
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 bg-blue-50">
                Formulario completo
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs overflow-x-auto font-mono leading-relaxed">
                {iframeCode}
              </pre>
              <Button
                size="sm"
                onClick={() => handleCopy(iframeCode, "iframe")}
                className={`absolute top-3 right-3 h-8 text-xs transition-all ${
                  copied === "iframe"
                    ? "bg-green-500 hover:bg-green-500 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-white"
                }`}
              >
                {copied === "iframe" ? (
                  <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Copiado</>
                ) : (
                  <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar</>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Usa este código para mostrar el formulario de pago completo directamente en tu página, sin redirigir al cliente.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
