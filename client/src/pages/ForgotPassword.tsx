import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

const KOBRAPAY_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_correct_48f396eb.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      setSent(true);
    },
    onError: (err) => {
      toast.error(err.message || "Error al enviar el correo");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Por favor ingresa tu correo electrónico");
      return;
    }
    forgotMutation.mutate({ email });
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <img src={KOBRAPAY_LOGO} alt="KobraPay" className="h-16 w-auto object-contain mx-auto mb-8" />
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-emerald-100">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-gray-900 text-2xl font-bold mb-2">Correo enviado</h2>
          <p className="text-gray-600 text-sm mb-2">
            Si el correo <strong className="text-gray-900">{email}</strong> está registrado, recibirás instrucciones para restablecer tu contraseña.
          </p>
          <p className="text-gray-500 text-xs mb-2">Revisa también tu carpeta de spam.</p>
          <p className="text-gray-500 text-xs mb-6">Si te registraste con Manus, usa el botón <strong>"Continuar con Manus"</strong> en la página de inicio de sesión.</p>
          <Link href="/login">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold w-full h-12">
              Volver a iniciar sesión
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-2">
            <img
              src={KOBRAPAY_LOGO}
              alt="KobraPay"
              className="h-16 w-auto object-contain"
            />
          </div>
          <p className="text-gray-500 text-sm">Cobra fácil, cobra global</p>
        </div>

        <Card className="shadow-lg border border-gray-200 bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-900 text-xl">Recuperar contraseña</CardTitle>
            <CardDescription className="text-gray-500">
              Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-700 font-medium text-sm">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={forgotMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 mt-2 h-12"
              >
                {forgotMutation.isPending ? "Enviando..." : "Enviar instrucciones"}
              </Button>
            </form>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <strong>Nota:</strong> Si te registraste con tu cuenta Manus, usa el botón <strong>"Continuar con Manus"</strong> en la página de inicio de sesión.
            </div>

            <div className="mt-4 text-center">
              <Link href="/login" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver a iniciar sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
