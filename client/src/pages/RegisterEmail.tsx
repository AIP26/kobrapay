import { useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, User, ArrowLeft, CheckCircle } from "lucide-react";

const KOBRAPAY_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_correct_48f396eb.png";

export default function RegisterEmail() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registered, setRegistered] = useState(false);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      setRegistered(true);
      toast.success("¡Cuenta creada exitosamente!");
    },
    onError: (err) => {
      toast.error(err.message || "Error al crear la cuenta");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    registerMutation.mutate({ name, email, password });
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <img src={KOBRAPAY_LOGO} alt="KobraPay" className="h-16 w-auto object-contain mx-auto mb-8" />
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-emerald-100">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-gray-900 text-2xl font-bold mb-2">¡Revisa tu correo!</h2>
          <p className="text-gray-600 text-sm mb-4">
            Te enviamos un correo a <strong>{email}</strong> con un enlace de verificación.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Haz clic en el botón del correo para activar tu cuenta automáticamente y empezar a cobrar.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-amber-800 text-xs font-medium">¿No ves el correo?</p>
            <p className="text-amber-700 text-xs mt-1">Revisa tu carpeta de spam o correo no deseado. El correo llega en menos de 2 minutos.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/login")}
            className="w-full h-12"
          >
            Ir a iniciar sesión
          </Button>
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

        <Card className="bg-white border border-gray-200 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-900 text-xl">Crear cuenta</CardTitle>
            <CardDescription className="text-gray-500">
              Regístrate gratis y empieza a cobrar en minutos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-gray-700 font-medium text-sm">Nombre completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

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

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-gray-700 font-medium text-sm">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-gray-700 font-medium text-sm">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 mt-2 h-12"
              >
                {registerMutation.isPending ? "Creando cuenta..." : "Crear cuenta gratis"}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-200">
              <p className="text-center text-gray-600 text-sm">
                ¿Ya tienes cuenta?{" "}
                <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                  Iniciar sesión
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link href="/" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                <ArrowLeft className="w-3 h-3" />
                Volver al inicio
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
