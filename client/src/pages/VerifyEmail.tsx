import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const KOBRAPAY_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_correct_48f396eb.png";

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
      <div className="text-center max-w-md">
        <img src={KOBRAPAY_LOGO} alt="KobraPay" className="h-16 w-auto object-contain mx-auto mb-8" />

        {status === "loading" && (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-gray-100">
              <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
            </div>
            <h2 className="text-gray-900 text-2xl font-bold mb-2">Verificando tu cuenta...</h2>
            <p className="text-gray-500 text-sm">Por favor espera un momento.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-emerald-100">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-gray-900 text-2xl font-bold mb-2">¡Cuenta verificada!</h2>
            <p className="text-gray-600 text-sm mb-6">
              Tu cuenta está activa. Ya puedes iniciar sesión y empezar a cobrar con tarjeta.
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold w-full h-12"
            >
              Iniciar sesión
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-100">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-gray-900 text-2xl font-bold mb-2">Enlace inválido</h2>
            <p className="text-gray-600 text-sm mb-6">{errorMsg}</p>
            <Button
              variant="outline"
              onClick={() => navigate("/register")}
              className="w-full h-12"
            >
              Volver a registrarse
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
