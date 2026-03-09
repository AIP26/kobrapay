import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPassword() {
  const [location, navigate] = useLocation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Extraer el token de la URL: /reset-password?token=xxx
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
  }, []);

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      toast.success("Contraseña actualizada correctamente");
    },
    onError: (err) => {
      toast.error(err.message || "Error al restablecer la contraseña");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (!token) {
      toast.error("Token de recuperación inválido. Solicita un nuevo enlace.");
      return;
    }
    resetMutation.mutate({ token, newPassword });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="bg-muted border-border shadow-2xl w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-foreground text-xl font-bold mb-2">Enlace inválido</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Este enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.
            </p>
            <Link href="/forgot-password">
              <Button className="bg-cyan-400 hover:bg-cyan-500 text-foreground font-semibold w-full">
                Solicitar nuevo enlace
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="bg-muted border-border shadow-2xl w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-foreground text-xl font-bold mb-2">¡Contraseña actualizada!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión.
            </p>
            <Link href="/login">
              <Button className="bg-cyan-400 hover:bg-cyan-500 text-foreground font-semibold w-full">
                Iniciar sesión
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
            <CardTitle className="text-foreground text-xl">Nueva contraseña</CardTitle>
            <CardDescription className="text-muted-foreground">
              Elige una contraseña segura de al menos 8 caracteres
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-muted-foreground text-sm">Nueva contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-9 pr-10 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-cyan-400 focus:ring-cyan-400"
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
                    placeholder="Repite tu nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-cyan-400 focus:ring-cyan-400"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              {/* Indicador de fortaleza */}
              {newPassword.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          newPassword.length >= i * 3
                            ? i <= 1 ? "bg-red-400" : i <= 2 ? "bg-yellow-400" : i <= 3 ? "bg-blue-400" : "bg-green-400"
                            : "bg-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {newPassword.length < 8 ? "Contraseña muy corta" :
                     newPassword.length < 12 ? "Contraseña aceptable" :
                     newPassword.length < 16 ? "Contraseña buena" : "Contraseña muy segura"}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={resetMutation.isPending}
                className="w-full bg-cyan-400 hover:bg-cyan-500 text-foreground font-semibold py-2.5 mt-2"
              >
                {resetMutation.isPending ? "Actualizando..." : "Actualizar contraseña"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors">
                Volver a iniciar sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
