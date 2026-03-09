import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, ArrowLeft, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

const KOBRAPAY_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_v2_52d63331.png";

export default function LoginEmail() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showOAuthHint, setShowOAuthHint] = useState(false);

  const loginMutation = trpc.auth.loginEmail.useMutation({
    onSuccess: () => {
      toast.success("¡Bienvenido de vuelta!");
      window.location.href = "/dashboard";
    },
    onError: (err) => {
      const msg = err.message || "";
      if (msg.includes("contraseña incorrectos")) {
        // Puede ser cuenta OAuth — mostrar sugerencia
        setShowOAuthHint(true);
        toast.error("Correo o contraseña incorrectos", { duration: 4000 });
      } else if (msg.includes("inactiva")) {
        toast.error("Tu cuenta está inactiva. Contacta a soporte@kobrapay.mx", { duration: 6000 });
      } else if (msg.includes("bloqueada")) {
        toast.error("Tu cuenta ha sido bloqueada. Contacta a soporte@kobrapay.mx", { duration: 6000 });
      } else {
        toast.error(msg || "Error al iniciar sesión");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    setShowOAuthHint(false);
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-2">
            <img
              src={KOBRAPAY_LOGO}
              alt="KobraPay"
              className="h-12 w-auto object-contain"
            />
          </div>
          <p className="text-muted-foreground text-sm">Cobra fácil, cobra global</p>
        </div>

        <Card className="shadow-lg border border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-foreground text-xl">Iniciar sesión</CardTitle>
            <CardDescription className="text-muted-foreground">
              Accede a tu cuenta con tu correo y contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Botón Manus OAuth */}
            <a
              href={getLoginUrl("/dashboard")}
              className="w-full flex items-center justify-center gap-2 border border-border rounded-lg py-2.5 px-4 text-sm font-medium text-foreground hover:bg-accent transition-colors mb-4"
            >
              <img src="https://manus.im/favicon.ico" alt="Manus" className="w-4 h-4 object-contain" />
              Continuar con Manus
            </a>

            <div className="flex items-center gap-2 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">o con email y contraseña</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-foreground text-sm">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setShowOAuthHint(false); }}
                    className="pl-9"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-foreground text-sm">Contraseña</Label>
                  <Link href="/forgot-password" className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Sugerencia OAuth si el login falla */}
              {showOAuthHint && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>
                    Si te registraste con tu cuenta Manus, usa el botón <strong>"Continuar con Manus"</strong> de arriba en lugar de email y contraseña.
                  </span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-foreground font-semibold py-2.5 mt-2"
              >
                {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar sesión"}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-border space-y-3">
              <p className="text-center text-muted-foreground text-sm">
                ¿No tienes cuenta?{" "}
                <Link href="/register" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                  Regístrate gratis
                </Link>
              </p>
              <p className="text-center text-muted-foreground text-xs">
                ¿Quieres ser asociado?{" "}
                <Link href="/register-associate" className="text-cyan-600 hover:text-cyan-700 font-medium transition-colors">
                  Únete como asociado →
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
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
