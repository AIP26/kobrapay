import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, Loader2, Link2, CreditCard, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const KOBRAPAY_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_correct_48f396eb.png";

const STEPS = [
  {
    icon: CreditCard,
    step: "1",
    title: "Inicia sesión en tu panel",
    desc: "Accede con tu correo y contraseña para ver tu dashboard de cobros.",
    color: "emerald",
  },
  {
    icon: Link2,
    step: "2",
    title: "Crea tu primer enlace de pago",
    desc: "En 2 minutos genera un enlace único y compártelo por WhatsApp con tu cliente.",
    color: "cyan",
  },
  {
    icon: BarChart3,
    step: "3",
    title: "Recibe el dinero",
    desc: "Tu cliente paga con tarjeta y tú ves el cobro en tiempo real en tu panel.",
    color: "emerald",
  },
];

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const verifyMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => setStatus("success"),
    onError: (err) => {
      setStatus("error");
      setErrorMsg(err.message || "El enlace de verificación es inválido o ha expirado.");
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setErrorMsg("No se encontró el token de verificación en el enlace.");
      return;
    }
    verifyMutation.mutate({ token });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src={KOBRAPAY_LOGO} alt="KobraPay" className="h-12 w-auto object-contain mx-auto" />
        </div>

        {status === "loading" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-gray-100">
              <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
            </div>
            <h2 className="text-gray-900 text-2xl font-bold mb-2">Verificando tu cuenta...</h2>
            <p className="text-gray-500 text-sm">Por favor espera un momento.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            {/* Header de éxito */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 bg-emerald-100">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-gray-900 text-2xl font-bold mb-2">¡Bienvenido a KobraPay!</h2>
              <p className="text-gray-500 text-sm mb-1">
                Tu cuenta está activa y lista para cobrar con tarjeta.
              </p>
              <p className="text-emerald-600 text-sm font-semibold">
                Sin mensualidad · Sin hardware · Solo pagas cuando cobras
              </p>
            </div>

            {/* Guía de primeros pasos */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-gray-900 font-bold text-base mb-4">¿Cómo empezar? Es muy fácil:</h3>
              <div className="space-y-4">
                {STEPS.map((s) => (
                  <div key={s.step} className="flex items-start gap-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      s.color === "emerald" ? "bg-emerald-100" : "bg-cyan-100"
                    }`}>
                      <s.icon className={`w-4 h-4 ${s.color === "emerald" ? "text-emerald-600" : "text-cyan-600"}`} />
                    </div>
                    <div>
                      <p className="text-gray-900 font-semibold text-sm">{s.step}. {s.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={() => navigate("/login")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold w-full h-12 rounded-xl text-base flex items-center justify-center gap-2"
            >
              Entrar a mi panel
              <ArrowRight className="w-4 h-4" />
            </Button>

            <p className="text-center text-xs text-gray-400">
              ¿Tienes dudas? Escríbenos a{" "}
              <a href="mailto:soporte@kobrapay.mx" className="text-emerald-600 hover:underline">
                soporte@kobrapay.mx
              </a>
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-100">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-gray-900 text-2xl font-bold mb-2">Enlace inválido o expirado</h2>
            <p className="text-gray-600 text-sm mb-6">{errorMsg}</p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate("/login")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold w-full h-12"
              >
                Iniciar sesión
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/register")}
                className="w-full h-12"
              >
                Crear nueva cuenta
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
