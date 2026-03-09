import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function LoginEmail() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = trpc.auth.loginEmail.useMutation({
    onSuccess: () => {
      toast.success("¡Bienvenido de vuelta!");
      // Forzar recarga para que el contexto de auth se actualice
      window.location.href = "/dashboard";
    },
    onError: (err) => {
      toast.error(err.message || "Correo o contraseña incorrectos");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    loginMutation.mutate({ email, password });
  };

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
          <p className="text-gray-400 text-sm">Cobra fácil, cobra global</p>
        </div>

        <Card className="bg-gray-800 border-gray-700 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl">Iniciar sesión</CardTitle>
            <CardDescription className="text-gray-400">
              Accede a tu cuenta con tu correo y contraseña
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

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-300 text-sm">Contraseña</Label>
                  <Link href="/forgot-password" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 focus:border-cyan-400 focus:ring-cyan-400"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-cyan-400 hover:bg-cyan-500 text-gray-900 font-semibold py-2.5 mt-2"
              >
                {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar sesión"}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-700">
              <p className="text-center text-gray-400 text-sm">
                ¿No tienes cuenta?{" "}
                <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                  Regístrate gratis
                </Link>
              </p>
            </div>


            <div className="mt-4 text-center">
              <Link href="/" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-400 transition-colors">
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
