import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Globe, Phone, Mail, ExternalLink, ShoppingCart,
  Shield, CheckCircle2, Clock, CreditCard, ArrowRight,
  MapPin, Star,
} from "lucide-react";
import { COUNTRIES } from "../../../shared/countries";

function formatCurrency(amount: number | string, currency = "MXN") {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const country = COUNTRIES.find((c) => c.currency === currency);
  try {
    return new Intl.NumberFormat(country?.locale || "es-MX", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${country?.currencySymbol || "$"}${n.toFixed(2)}`;
  }
}

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function BusinessProfile() {
  const { slug } = useParams<{ slug: string }>();

  const { data: profile, isLoading: loadingProfile } = trpc.vendor.getPublicProfile.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  const { data: links, isLoading: loadingLinks } = trpc.vendor.getPublicLinks.useQuery(
    { userId: profile?.userId ?? 0 },
    { enabled: !!profile?.userId }
  );

  const countryConfig = COUNTRIES.find((c) => c.code === profile?.businessCountry) || COUNTRIES[0];

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-[#0f1420] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0f1420] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Globe className="w-10 h-10 text-gray-600" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Perfil no encontrado</h1>
          <p className="text-gray-400 mb-6">
            El negocio <strong className="text-white">@{slug}</strong> no existe o no tiene perfil público activo.
          </p>
          <Link href="/">
            <Button className="bg-cyan-500 hover:bg-cyan-400 text-white">
              Ir a KobraPay
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1420]">
      {/* Header KobraPay */}
      <header className="border-b border-white/10 bg-[#0f1420]/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 bg-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">K</span>
              </div>
              <span className="font-bold text-white text-sm">KobraPay</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-gray-400">Pagos seguros con SSL</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Perfil del negocio */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Logo / Avatar */}
            <div className="flex-shrink-0">
              {profile.logoUrl ? (
                <img
                  src={profile.logoUrl}
                  alt={profile.businessName || "Logo"}
                  className="w-20 h-20 rounded-2xl object-cover border border-white/20"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center border border-white/20">
                  <span className="text-white font-bold text-3xl">
                    {(profile.businessName || "N")[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold text-white">{profile.businessName}</h1>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Verificado
                </Badge>
              </div>

              {profile.publicBio && (
                <p className="text-gray-300 text-sm mb-3 leading-relaxed">{profile.publicBio}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{countryConfig.flag} {countryConfig.name}</span>
                </div>
                {profile.businessEmail && (
                  <a href={`mailto:${profile.businessEmail}`} className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{profile.businessEmail}</span>
                  </a>
                )}
                {profile.businessPhone && (
                  <a href={`tel:${profile.businessPhone}`} className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{profile.businessPhone}</span>
                  </a>
                )}
                {profile.websiteUrl && (
                  <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Sitio web</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Links de pago activos */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-cyan-400" />
              Cobros disponibles
            </h2>
            {links && links.length > 0 && (
              <Badge variant="outline" className="text-gray-400 border-white/20 text-xs">
                {links.length} activo{links.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {loadingLinks ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : !links || links.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
              <ShoppingCart className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No hay cobros activos en este momento.</p>
              <p className="text-gray-500 text-xs mt-1">Vuelve más tarde o contacta al negocio directamente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-cyan-500/40 hover:bg-white/8 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-white font-semibold text-sm truncate">
                          {link.description || "Cobro de " + profile.businessName}
                        </h3>
                        {link.expiresAt && (
                          <div className="flex items-center gap-1 text-xs text-amber-400">
                            <Clock className="w-3 h-3" />
                            <span>Vence {timeAgo(link.expiresAt)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Tarjeta de crédito / débito</span>
                        </div>
                        <span>·</span>
                        <div className="flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Pago seguro</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      <span className="text-xl font-bold text-white">
                        {formatCurrency(link.amount, link.currency || "MXN")}
                      </span>
                      <Link href={`/pay/${link.token}`}>
                        <Button
                          size="sm"
                          className="bg-cyan-500 hover:bg-cyan-400 text-white text-xs gap-1.5 group-hover:shadow-lg group-hover:shadow-cyan-500/20 transition-all"
                        >
                          Pagar ahora
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/10 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-gray-400">Todos los pagos son procesados de forma segura por</span>
          </div>
          <div className="flex items-center justify-center gap-4">
            <Link href="/">
              <span className="text-xs font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer">KobraPay</span>
            </Link>
            <span className="text-gray-600">·</span>
            <span className="text-xs text-gray-500">Powered by Stripe</span>
            <span className="text-gray-600">·</span>
            <span className="text-xs text-gray-500">SSL 256-bit</span>
          </div>
          <div className="mt-3 flex items-center justify-center gap-3 flex-wrap">
            {["VISA", "MC", "AMEX"].map((brand) => (
              <span key={brand} className="bg-white/10 text-white text-xs font-bold px-2 py-0.5 rounded border border-white/10">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
