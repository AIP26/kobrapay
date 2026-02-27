import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { CreditCard, Link2, Shield, Zap, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground text-lg">PagaFácil</span>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              isAuthenticated ? (
                <Button asChild>
                  <Link href="/dashboard">Ir al Panel <ArrowRight className="w-4 h-4 ml-1" /></Link>
                </Button>
              ) : (
                <Button asChild>
                  <a href={getLoginUrl("/dashboard")}>Iniciar Sesión</a>
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      <section className="py-20 lg:py-32">
        <div className="container text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Zap className="w-3.5 h-3.5" />
            Cobra a tus clientes en segundos
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Crea enlaces de pago<br />
            <span className="text-primary">profesionales</span> al instante
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Genera enlaces de cobro personalizados, compártelos con tus clientes y recibe pagos con tarjeta de crédito o débito de forma segura.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-base px-8">
              <a href={getLoginUrl("/dashboard")}>Comenzar gratis <ArrowRight className="w-4 h-4 ml-2" /></a>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Link2, title: "Enlace en segundos", desc: "Ingresa el nombre del cliente, monto y descripción. Obtén un enlace único listo para compartir." },
              { icon: CreditCard, title: "Pago seguro con tarjeta", desc: "Tus clientes pagan con tarjeta de crédito o débito. Procesado por Stripe con cifrado SSL." },
              { icon: Shield, title: "Fondos directos a ti", desc: "El dinero llega directamente a tu cuenta bancaria. Sin intermediarios innecesarios." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card rounded-2xl p-6 border border-border">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary">
        <div className="container text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">Empieza a cobrar hoy mismo</h2>
          <p className="text-white/80 mb-8 max-w-lg mx-auto">Crea tu cuenta y genera tu primer enlace de pago en menos de 2 minutos.</p>
          <Button size="lg" variant="secondary" asChild className="text-base px-8">
            <a href={getLoginUrl("/dashboard")}>Crear cuenta gratis <ArrowRight className="w-4 h-4 ml-2" /></a>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <CreditCard className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-foreground text-sm">PagaFácil</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            Pagos procesados con Stripe · SSL cifrado
          </div>
          <p className="text-sm text-muted-foreground">© 2025 PagaFácil</p>
        </div>
      </footer>
    </div>
  );
}
