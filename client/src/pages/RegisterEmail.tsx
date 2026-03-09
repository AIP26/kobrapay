import { useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, User, ArrowLeft, CheckCircle } from "lucide-react";

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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="bg-muted border-border shadow-2xl w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-foreground text-xl font-bold mb-2">¡Cuenta creada!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión con tu correo y contraseña.
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="bg-cyan-400 hover:bg-cyan-500 text-foreground font-semibold w-full"
            >
              Ir a iniciar sesión
            </Button>
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
          <div className="inline-flex items-center justify-center mb-2">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_pro_white_fd2cc62e.png"
              alt="KobraPay"
              className="h-12 w-auto object-contain"
            />
          </div>
          <p className="text-muted-foreground text-sm">Cobra fácil, cobra global</p>
        </div>

        <Card className="bg-muted border-border shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-foreground text-xl">Crear cuenta</CardTitle>
            <CardDescription className="text-muted-foreground">
              Regístrate gratis y empieza a cobrar en minutos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-muted-foreground text-sm">Nombre completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 bg-gray-700 border-gray-600 text-foreground placeholder:text-muted-foreground focus:border-cyan-400 focus:ring-cyan-400"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-muted-foreground text-sm">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-gray-700 border-gray-600 text-foreground placeholder:text-muted-foreground focus:border-cyan-400 focus:ring-cyan-400"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-muted-foreground text-sm">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 bg-gray-700 border-gray-600 text-foreground placeholder:text-muted-foreground focus:border-cyan-400 focus:ring-cyan-400"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-muted-foreground text-sm">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 bg-gray-700 border-gray-600 text-foreground placeholder:text-muted-foreground focus:border-cyan-400 focus:ring-cyan-400"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full bg-cyan-400 hover:bg-cyan-500 text-foreground font-semibold py-2.5 mt-2"
              >
                {registerMutation.isPending ? "Creando cuenta..." : "Crear cuenta gratis"}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-center text-muted-foreground text-sm">
                ¿Ya tienes cuenta?{" "}
                <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                  Iniciar sesión
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-muted-foreground transition-colors">
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
