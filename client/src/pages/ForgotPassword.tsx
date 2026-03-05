import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="bg-gray-800 border-gray-700 shadow-2xl w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">Correo enviado</h2>
            <p className="text-gray-400 text-sm mb-2">
              Si el correo <strong className="text-gray-300">{email}</strong> está registrado, recibirás instrucciones para restablecer tu contraseña.
            </p>
            <p className="text-gray-500 text-xs mb-6">Revisa también tu carpeta de spam.</p>
            <Link href="/login">
              <Button className="bg-cyan-400 hover:bg-cyan-500 text-gray-900 font-semibold w-full">
                Volver a iniciar sesión
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-cyan-400 rounded-xl flex items-center justify-center">
              <span className="text-gray-900 font-black text-lg">K</span>
            </div>
            <span className="text-white font-bold text-2xl">KobraPay</span>
          </div>
          <p className="text-gray-400 text-sm">Cobra fácil, cobra global</p>
        </div>

        <Card className="bg-gray-800 border-gray-700 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl">Recuperar contraseña</CardTitle>
            <CardDescription className="text-gray-400">
              Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-300 text-sm">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 focus:border-cyan-400 focus:ring-cyan-400"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={forgotMutation.isPending}
                className="w-full bg-cyan-400 hover:bg-cyan-500 text-gray-900 font-semibold py-2.5 mt-2"
              >
                {forgotMutation.isPending ? "Enviando..." : "Enviar instrucciones"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
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
