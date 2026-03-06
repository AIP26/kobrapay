import { useRef, useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { getCountryByCode } from "@shared/countries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, Upload, X, FileText, Shield, AlertTriangle, Trash2, Eye } from "lucide-react";

type DocType = "ine" | "passport" | "addressProof" | "rfc" | "curp" | "situacionFiscal";

const DOC_LABELS: Record<DocType, string> = {
  ine: "INE / Credencial de Elector",
  passport: "Pasaporte",
  addressProof: "Comprobante de Domicilio",
  rfc: "Constancia de RFC",
  curp: "CURP",
  situacionFiscal: "Situación Fiscal / Razón Social",
};

const DOC_REQUIRED: Record<DocType, boolean> = {
  ine: true,
  passport: false,
  addressProof: true,
  rfc: false,
  curp: false,
  situacionFiscal: false,
};

export default function SignContract() {
  const [, params] = useRoute("/sign-contract/:token");
  const token = params?.token || "";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [hasSigned, setHasSigned] = useState(false);
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<Partial<Record<DocType, string>>>({});
  const [uploadingDoc, setUploadingDoc] = useState<DocType | null>(null);
  const [step, setStep] = useState<"review" | "sign" | "docs" | "done">("review");

  // Datos adicionales del cliente
  const [razonSocial, setRazonSocial] = useState("");
  const [representanteLegal, setRepresentanteLegal] = useState("");
  const [rfcEmpresa, setRfcEmpresa] = useState("");

  const [lang, setLang] = useState<"es" | "en">("es");
  const { data: contract, isLoading, error } = trpc.contracts.getByToken.useQuery({ token }, { enabled: !!token });

  // Marco legal dinámico según el país del contrato
  const countryCode = (contract as any)?.countryCode || "MX";
  const countryInfo = getCountryByCode(countryCode);
  const legalFramework = countryInfo?.legalFramework;

  const signMutation = trpc.contracts.signContract.useMutation({
    onSuccess: () => setStep("docs"),
    onError: (e) => toast.error(e.message),
  });

  const uploadDocMutation = trpc.contracts.uploadDocument.useMutation({
    onSuccess: (data, vars) => {
      setUploadedDocs(prev => ({ ...prev, [vars.docType]: data.url }));
      setUploadingDoc(null);
      toast.success(`${DOC_LABELS[vars.docType as DocType]} subido correctamente`);
    },
    onError: (e) => { setUploadingDoc(null); toast.error(e.message); },
  });

  // Canvas drawing
  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const pos = getPos(e, canvas);
    setIsDrawing(true);
    setLastPos(pos);
    setHasSigned(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setLastPos(pos);
  };

  const stopDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    setSignatureConfirmed(false);
  };

  const confirmSignature = () => {
    if (!hasSigned) { toast.error("Por favor firma antes de confirmar"); return; }
    setSignatureConfirmed(true);
  };

  const handleSign = () => {
    const canvas = canvasRef.current;
    if (!canvas || !signatureConfirmed) return;
    const signatureData = canvas.toDataURL("image/png");
    signMutation.mutate({ token, signatureData, signerName: contract?.clientName || "" });
  };

  const handleDocUpload = async (docType: DocType, file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error("El archivo no puede superar 10 MB"); return; }
    setUploadingDoc(docType);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
      const base64 = btoa(binary);
      const fileData = `data:${file.type};base64,${base64}`;
      uploadDocMutation.mutate({
        token,
        docType: docType === "situacionFiscal" ? "rfc" : docType, // mapear situacionFiscal a rfc en el backend
        fileData,
        mimeType: file.type,
      });
    } catch {
      setUploadingDoc(null);
      toast.error("Error al procesar el archivo");
    }
  };

  const removeDoc = (docType: DocType) => {
    setUploadedDocs(prev => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });
    toast.success("Documento eliminado. Puedes subir uno nuevo.");
  };

  const finishDocs = () => {
    // Guardar datos de razón social si se ingresaron
    setStep("done");
  };

  if (!token) return <div className="min-h-screen flex items-center justify-center text-gray-500">Enlace inválido</div>;
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full" />
    </div>
  );
  if (error || !contract) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Contrato no disponible</h2>
        <p className="text-gray-500">{error?.message || "Este enlace no es válido o ha expirado."}</p>
      </div>
    </div>
  );

  if (step === "done") return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-cyan-50 to-teal-50">
      <div className="text-center max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-9 h-9 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Contrato firmado!</h2>
        <p className="text-gray-600 mb-4">
          Hola <strong>{contract.clientName}</strong>, tu contrato con KobraPay ha sido firmado exitosamente.
          Recibirás una copia por email.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 text-left text-sm space-y-1">
          <p><span className="text-gray-500">Comisión acordada:</span> <strong className="text-cyan-700">{contract.commissionRate}%</strong></p>
          {Number(contract.contractDurationMonths) > 0 && (
            <p><span className="text-gray-500">Duración:</span> <strong>{contract.contractDurationMonths === 12 ? '1 año (12 meses)' : contract.contractDurationMonths === 24 ? '2 años (24 meses)' : `${contract.contractDurationMonths} meses`}</strong></p>
          )}
          <p><span className="text-gray-500">Fecha de firma:</span> <strong>{new Date().toLocaleDateString("es-MX")}</strong></p>
        </div>
        <p className="text-xs text-gray-400 mt-4">Puedes cerrar esta ventana.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-teal-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-cyan-700 text-white px-4 py-2 rounded-full text-sm font-semibold mb-3">
            <Shield className="w-4 h-4" /> KobraPay — Contrato Digital
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Contrato de Servicios</h1>
          <p className="text-gray-500 text-sm mt-1">Hola <strong>{contract.clientName}</strong>, por favor revisa y firma el contrato</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {["review", "sign", "docs"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? "bg-cyan-700 text-white" : ["review", "sign", "docs"].indexOf(step) > i ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                {["review", "sign", "docs"].indexOf(step) > i ? "✓" : i + 1}
              </div>
              <span className="text-xs text-gray-500 hidden sm:block">{["Revisar", "Firmar", "Documentos"][i]}</span>
              {i < 2 && <div className="w-8 h-px bg-gray-300" />}
            </div>
          ))}
        </div>

        {/* Step: Review */}
        {step === "review" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-700" /> Términos del Contrato
            </h2>

            <div className="prose prose-sm max-w-none text-gray-700 space-y-4 text-sm leading-relaxed">
              <p>En la Ciudad de México, a {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}, comparecen:</p>
              <p><strong>EL PRESTADOR DE SERVICIOS:</strong> KobraPay, plataforma de procesamiento de pagos digitales.</p>
              <p><strong>EL CLIENTE:</strong> {contract.clientName}{contract.businessName ? ` (${contract.businessName})` : ""}, con RFC {contract.clientRfc || "pendiente"}, domicilio en {contract.clientAddress || "pendiente de registrar"}.</p>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="font-semibold text-gray-900 mb-2">CLÁUSULAS PRINCIPALES:</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li><strong>Objeto:</strong> KobraPay prestará al Cliente servicios de procesamiento de pagos en línea mediante enlaces de cobro, punto de venta digital, y herramientas de gestión financiera.</li>
                  <li><strong>Comisión:</strong> El Cliente acepta una comisión del <strong className="text-cyan-700">{contract.commissionRate}% + IVA</strong> sobre cada transacción procesada a través de la plataforma.</li>
                  <li><strong>Comisión no reembolsable:</strong> Las comisiones de procesamiento cobradas por KobraPay son definitivas e irrevocables. En caso de reembolso a un cliente final, la comisión ya cobrada no será devuelta al Cliente. El Cliente es responsable de cubrir el monto total del reembolso con sus propios fondos.</li>
                  {Number(contract.contractDurationMonths) > 0 && (
                    <li><strong>Vigencia:</strong> El presente contrato tendrá una duración de <strong>{contract.contractDurationMonths === 12 ? '1 año (12 meses)' : contract.contractDurationMonths === 24 ? '2 años (24 meses)' : `${contract.contractDurationMonths} meses`}</strong> a partir de la fecha de firma. La terminación anticipada generará una penalización equivalente a 2 meses de comisiones promedio.</li>
                  )}
                  {contract.includeExclusivityClause && (
                    <li><strong>Exclusividad:</strong> Durante la vigencia del contrato, el Cliente se compromete a utilizar únicamente KobraPay como plataforma de procesamiento de pagos digitales para su negocio, absteniéndose de contratar servicios similares con terceros.</li>
                  )}
                  <li><strong>Protección de datos:</strong> KobraPay se compromete a proteger los datos personales del Cliente conforme a la LFPDPPP y su Reglamento.</li>
                  <li><strong>Confidencialidad:</strong> Ambas partes se obligan a mantener la confidencialidad de la información intercambiada durante la prestación de los servicios.</li>
                  <li><strong>Responsabilidad:</strong> KobraPay no será responsable por interrupciones del servicio causadas por terceros o por fuerza mayor.</li>
                  <li><strong>Jurisdicción:</strong> Las partes se someten a la jurisdicción de los tribunales competentes de la Ciudad de México.</li>
                </ol>
              </div>

              {contract.customTerms && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <p className="font-semibold text-amber-800 mb-1">Términos adicionales:</p>
                  <p className="text-amber-700">{contract.customTerms}</p>
                </div>
              )}

              {/* Cláusula legal dinámica por país */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-blue-900 text-sm flex items-center gap-2">
                    ⚖️ {legalFramework ? (lang === "en" ? legalFramework.titleEn : legalFramework.title) : (lang === "en" ? "Legal Validity — Electronic Signature" : "Validez Legal — Firma Electrónica")}
                  </p>
                  <button
                    onClick={() => setLang(l => l === "es" ? "en" : "es")}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-lg font-medium"
                  >
                    {lang === "es" ? "🇺🇸 EN" : "🇲🇽 ES"}
                  </button>
                </div>
                <p className="text-blue-800 text-xs leading-relaxed">
                  {legalFramework
                    ? (lang === "en" ? legalFramework.descriptionEn : legalFramework.description)
                    : (lang === "en"
                      ? "The electronic signature on this contract has full legal validity pursuant to applicable electronic commerce and digital signature laws. The signatory's IP address, date, time and digital evidence are recorded as proof of consent."
                      : "De conformidad con los Artículos 89, 89 Bis, 90 y 93 del Código de Comercio, la firma electrónica tiene plena validez jurídica. La dirección IP, fecha, hora y evidencia digital quedan registrados como prueba de consentimiento."
                    )
                  }
                </p>
                {legalFramework && (
                  <div className="space-y-1">
                    <p className="text-blue-700 text-xs font-semibold">
                      {lang === "en" ? "Legal basis:" : "Fundamento legal:"}
                    </p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {(lang === "en" ? legalFramework.lawsEn : legalFramework.laws).map((law: string, i: number) => (
                        <li key={i} className="text-blue-700 text-xs">{law}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {countryCode === "MX" && (
                  <p className="text-blue-700 text-xs font-semibold">
                    {lang === "en"
                      ? "Standards: Commercial Code Arts. 89–114 · LFEA · NOM-151-SCFI-2016 · LFPDPPP"
                      : "Fundamento: Código de Comercio Arts. 89–114 · LFEA · NOM-151-SCFI-2016 · LFPDPPP"
                    }
                  </p>
                )}
              </div>

              <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                <p className="text-red-700 text-xs font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Al firmar este contrato, el Cliente declara haber leído, entendido y aceptado todos los términos y condiciones aquí establecidos.
                </p>
              </div>
            </div>

            <Button onClick={() => setStep("sign")} className="w-full mt-6 bg-cyan-700 hover:bg-cyan-800 text-white">
              He leído y acepto los términos — Continuar a Firmar
            </Button>
          </div>
        )}

        {/* Step: Sign */}
        {step === "sign" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Firma Digital</h2>
            <p className="text-sm text-gray-500 mb-4">Firma con tu dedo (celular) o mouse (computadora)</p>

            <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
            </div>

            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={clearSignature} className="gap-2">
                <X className="w-4 h-4" /> Limpiar
              </Button>
              {!signatureConfirmed ? (
                <Button onClick={confirmSignature} disabled={!hasSigned} className="flex-1 bg-cyan-700 hover:bg-cyan-800 text-white">
                  Confirmar Firma
                </Button>
              ) : (
                <Button onClick={handleSign} disabled={signMutation.isPending} className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {signMutation.isPending ? "Firmando..." : "Firmar Contrato"}
                </Button>
              )}
            </div>

            {signatureConfirmed && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 text-sm text-green-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Firma confirmada. Haz clic en "Firmar Contrato" para continuar.
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-1">
              <p className="text-xs text-blue-800 font-bold">⚖️ {lang === "en" ? "Legal Validity" : "Validez Jurídica"}</p>
              <p className="text-xs text-blue-700">
                {lang === "en"
                  ? (legalFramework?.descriptionEn || "This electronic signature has full legal validity pursuant to applicable electronic signature laws. Your IP, date and time will be recorded as evidence of consent.")
                  : (legalFramework?.description || "Esta firma electrónica tiene plena validez legal conforme al Art. 89 del Código de Comercio y la Ley de Firma Electrónica Avanzada (LFEA). Se registrarán tu IP, fecha y hora como evidencia de consentimiento.")
                }
              </p>
            </div>
          </div>
        )}

        {/* Step: Documents */}
        {step === "docs" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Documentos e Información Fiscal</h2>
              <p className="text-sm text-gray-500">Completa tu expediente para validar tu identidad y razón social</p>
            </div>

            {/* Datos de empresa (opcional) */}
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-cyan-800">Datos de tu empresa (opcional pero recomendado)</p>
              <div>
                <Label className="text-xs text-gray-600">Razón Social</Label>
                <Input
                  value={razonSocial}
                  onChange={e => setRazonSocial(e.target.value)}
                  placeholder="Ej: Ferretería El Clavo S.A. de C.V."
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">RFC de la empresa</Label>
                  <Input
                    value={rfcEmpresa}
                    onChange={e => setRfcEmpresa(e.target.value)}
                    placeholder="XAXX010101000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Representante Legal</Label>
                  <Input
                    value={representanteLegal}
                    onChange={e => setRepresentanteLegal(e.target.value)}
                    placeholder="Nombre completo"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Documentos */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Documentos de identificación
                <span className="ml-2 text-xs text-gray-400 font-normal">JPG, PNG o PDF — máx. 10 MB</span>
              </p>
              <div className="space-y-2">
                {(["ine", "passport", "addressProof", "situacionFiscal", "rfc", "curp"] as DocType[]).map(docType => {
                  const isUploaded = !!uploadedDocs[docType];
                  const isUploading = uploadingDoc === docType;
                  const isRequired = DOC_REQUIRED[docType];
                  return (
                    <div key={docType} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isUploaded ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isUploaded ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {DOC_LABELS[docType]}
                            {isRequired && <span className="ml-1 text-red-500 text-xs">*</span>}
                          </p>
                          {isUploaded && (
                            <p className="text-xs text-green-600">Subido correctamente ✓</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isUploaded ? (
                          <>
                            <a href={uploadedDocs[docType]} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="ghost" className="text-cyan-600 hover:text-cyan-700 h-7 w-7 p-0" title="Ver documento">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </a>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeDoc(docType)}
                              className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                              title="Eliminar y subir otro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              disabled={isUploading}
                              onChange={e => { if (e.target.files?.[0]) handleDocUpload(docType, e.target.files[0]); }}
                            />
                            {isUploading ? (
                              <span className="text-xs bg-gray-200 text-gray-500 px-3 py-1.5 rounded-lg flex items-center gap-1">
                                <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                Subiendo...
                              </span>
                            ) : (
                              <span className="text-xs bg-cyan-700 text-white px-3 py-1.5 rounded-lg hover:bg-cyan-800 transition-colors">
                                Subir
                              </span>
                            )}
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Los campos marcados con <span className="text-red-500">*</span> son recomendados para completar tu expediente. Todos los documentos son opcionales.
              </p>
            </div>

            <Button onClick={finishDocs} className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
              <CheckCircle className="w-4 h-4" /> Finalizar y Completar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
