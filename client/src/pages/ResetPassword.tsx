import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from "lucide-react";

const KOBRAPAY_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_pro_white_6b7b7c3e.png";

export default function ResetPassword() {
  const [location, navigate] = useLocation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <img src={KOBRAPAY_LOGO} alt="KobraPay" className="h-16 w-auto object-contain mx-auto mb-8" />
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-100">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-gray-900 text-2xl font-bold mb-2">Enlace inválido</h2>
          <p className="text-gray-600 text-sm mb-6">
            Este enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.
          </p>
          <Link href="/forgot-password">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold w-full h-12">
              Solicitar nuevo enlace
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <img src={KOBRAPAY_LOGO} alt="KobraPay" className="h-16 w-auto object-contain mx-auto mb-8" />
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-emerald-100">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-gray-900 text-2xl font-bold mb-2">¡Contraseña actualizada!</h2>
          <p className="text-gray-600 text-sm mb-6">
            Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión.
          </p>
          <Link href="/login">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold w-full h-12">
              Iniciar sesión
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

        <Card className="bg-white border border-gray-200 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-900 text-xl">Nueva contraseña</CardTitle>
            <CardDescription className="text-gray-500">
              Elige una contraseña segura de al menos 8 caracteres
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-gray-700 font-medium text-sm">Nueva contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                    placeholder="Repite tu nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500"
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
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          newPassword.length >= i * 3
                            ? i <= 1 ? "bg-red-400" : i <= 2 ? "bg-yellow-400" : i <= 3 ? "bg-blue-400" : "bg-emerald-500"
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {newPassword.length < 8 ? "Contraseña muy corta" :
                     newPassword.length < 12 ? "Contraseña aceptable" :
                     newPassword.length < 16 ? "Contraseña buena" : "Contraseña muy segura"}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={resetMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 mt-2 h-12"
              >
                {resetMutation.isPending ? "Actualizando..." : "Actualizar contraseña"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Volver a iniciar sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
