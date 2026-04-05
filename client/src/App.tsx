import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CreateLink from "./pages/CreateLink";
import Links from "./pages/Links";
import Transactions from "./pages/Transactions";
import Settings from "./pages/Settings";
import PayPage from "./pages/PayPage";
import PaySuccess from "./pages/PaySuccess";
import Sales from "./pages/Sales";
import SubscriptionDetail from "./pages/SubscriptionDetail";
import Clients from "./pages/Clients";
import Widget from "./pages/Widget";
import Recurring from "./pages/Recurring";
import Chargebacks from "./pages/Chargebacks";
import Invoices from "./pages/Invoices";
import Reader from "./pages/Reader";
import SecurityAudit from "./pages/SecurityAudit";
import Blacklist from "./pages/Blacklist";
import Payers from "./pages/Payers";
import Staff from "./pages/Staff";
import Catalog from "./pages/Catalog";
import POS from "./pages/POS";
import Registrations from "./pages/Registrations";
import Contracts from "./pages/Contracts";
import SalesAgents from "./pages/SalesAgents";
import SignContract from "./pages/SignContract";
import Expedientes from "./pages/Expedientes";
import CommissionsPanel from "./pages/CommissionsPanel";
import Help from "./pages/Help";
import MonthlyReport from "./pages/MonthlyReport";
import CompleteProfile from "./pages/CompleteProfile";
import PendingApproval from "./pages/PendingApproval";
import MyProfile from "./pages/MyProfile";
import Blog from "./pages/Blog";
import Legal from "./pages/Legal";
import Colaboradores from "./pages/Colaboradores";
import LoginEmail from "./pages/LoginEmail";
import RegisterEmail from "./pages/RegisterEmail";
import RegisterAssociate from "./pages/RegisterAssociate";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import HR from "./pages/HR";
import Checador from "./pages/Checador";
import Nomina from "./pages/Nomina";
import MedicalAgenda from "./pages/MedicalAgenda";
import Training from "./pages/Training";
import Proveedores from "./pages/Proveedores";
import Prescriptions from "./pages/Prescriptions";
import Farmacia from "./pages/Farmacia";
import ModuleAccessAdmin from "./pages/ModuleAccessAdmin";
import ModuleAccessManager from "./pages/ModuleAccessManager";
import AssistantPanel from "./pages/AssistantPanel";
import StripeConnect from "./pages/StripeConnect";
import Advisor from "./pages/Advisor";
import AssistantAdvisor from "./pages/AssistantAdvisor";
import AdminAdvisor from "./pages/AdminAdvisor";
import AssociateDashboard from "./pages/AssociateDashboard";
import OnboardingSurvey from "./pages/OnboardingSurvey";
import Welcome from "./pages/Welcome";
import Support from "./pages/Support";
import Brochure from "./pages/Brochure";
import Transfers from "./pages/Transfers";
import AIScoring from "./pages/AIScoring";
import KobraScore from "./pages/KobraScore";
import MyDeposits from "./pages/MyDeposits";
import QuoteLogs from "./pages/QuoteLogs";
import SuperAdminMetrics from "./pages/SuperAdminMetrics";
import AssociateLiquidation from "./pages/AssociateLiquidation";
import PlatformConfig from "./pages/PlatformConfig";
import BusinessProfile from "./pages/BusinessProfile";
import ImpersonateClient from "./pages/ImpersonateClient";
import FailedPayments from "./pages/FailedPayments";
import ImpersonationBar from "./components/ImpersonationBar";
import ApiKeys from "./pages/ApiKeys";
import Webhooks from "./pages/Webhooks";
import PricingAdmin from "./pages/PricingAdmin";
import AISupport from "./pages/AISupport";
import AIMarketing from "./pages/AIMarketing";
import SystemStatus from "./pages/SystemStatus";
import KobraBot from "./components/KobraBot";
import WelcomeOnboarding from "./components/WelcomeOnboarding";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

// Wrapper que muestra KobraBot solo en páginas del dashboard (usuarios autenticados)
function KobraBotWrapper() {
  const [location] = useLocation();
  const showBot = location.startsWith("/dashboard") || location.startsWith("/onboarding");
  if (!showBot) return null;
  return <KobraBot />;
}

// Wrapper que muestra el onboarding solo si el usuario no lo ha completado
function OnboardingWrapper() {
  const [location] = useLocation();
  const { data: user } = trpc.auth.me.useQuery();
  const showOnboarding =
    user &&
    !user.onboardingCompleted &&
    (location.startsWith("/dashboard") || location === "/") &&
    !location.includes("/pay/");
  if (!showOnboarding) return null;
  return <WelcomeOnboarding userName={user?.name || undefined} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pay/:token" component={PayPage} />
      <Route path="/pay/:token/success" component={PaySuccess} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/create" component={CreateLink} />
      <Route path="/dashboard/links" component={Links} />
      <Route path="/dashboard/transactions" component={Transactions} />
      <Route path="/dashboard/sales" component={Sales} />
      <Route path="/dashboard/subscriptions/:id" component={SubscriptionDetail} />
      <Route path="/dashboard/clients" component={Clients} />
      <Route path="/dashboard/help" component={Help} />
      <Route path="/dashboard/report" component={MonthlyReport} />
      <Route path="/dashboard/settings" component={Settings} />
      <Route path="/dashboard/widget" component={Widget} />
      <Route path="/dashboard/recurring" component={Recurring} />
      <Route path="/dashboard/chargebacks" component={Chargebacks} />
      <Route path="/dashboard/invoices" component={Invoices} />
      <Route path="/dashboard/reader" component={Reader} />
      <Route path="/dashboard/security" component={SecurityAudit} />
      <Route path="/dashboard/blacklist" component={Blacklist} />
      <Route path="/dashboard/payers" component={Payers} />
      <Route path="/dashboard/staff" component={Staff} />
      <Route path="/dashboard/catalog" component={Catalog} />
      <Route path="/dashboard/pos" component={POS} />
      <Route path="/dashboard/registrations" component={Registrations} />
      <Route path="/dashboard/contracts" component={Contracts} />
      <Route path="/dashboard/agents" component={SalesAgents} />
      <Route path="/dashboard/expedientes" component={Expedientes} />
      <Route path="/dashboard/hr" component={HR} />
      <Route path="/dashboard/checador" component={Checador} />
      <Route path="/dashboard/nomina" component={Nomina} />
      <Route path="/dashboard/commissions" component={CommissionsPanel} />
      <Route path="/dashboard/medical" component={MedicalAgenda} />
      <Route path="/dashboard/training" component={Training} />
      <Route path="/dashboard/proveedores" component={Proveedores} />
      <Route path="/dashboard/prescriptions" component={Prescriptions} />
      <Route path="/dashboard/farmacia" component={Farmacia} />
      <Route path="/dashboard/module-access" component={ModuleAccessAdmin} />
      <Route path="/dashboard/module-manager" component={ModuleAccessManager} />
      <Route path="/dashboard/assistant-panel" component={AssistantPanel} />
      <Route path="/dashboard/stripe-connect" component={StripeConnect} />
      <Route path="/dashboard/connect" component={StripeConnect} />
      <Route path="/onboarding" component={OnboardingSurvey} />
      <Route path="/welcome" component={Welcome} />
      <Route path="/dashboard/advisor" component={Advisor} />
      <Route path="/dashboard/assistant-advisor" component={AssistantAdvisor} />
      <Route path="/dashboard/business-advisor" component={AdminAdvisor} />
      <Route path="/dashboard/associate" component={AssociateDashboard} />
      <Route path="/dashboard/support" component={Support} />
      <Route path="/dashboard/brochure" component={Brochure} />
      <Route path="/dashboard/transfers" component={Transfers} />
      <Route path="/dashboard/ai-scoring" component={AIScoring} />
      <Route path="/dashboard/kobra-score" component={KobraScore} />
      <Route path="/dashboard/my-deposits" component={MyDeposits} />
      <Route path="/dashboard/metrics" component={SuperAdminMetrics} />
      <Route path="/dashboard/associate-liquidation" component={AssociateLiquidation} />
      <Route path="/dashboard/platform-config" component={PlatformConfig} />
      <Route path="/dashboard/quote-logs" component={QuoteLogs} />
      <Route path="/p/:slug" component={BusinessProfile} />
      <Route path="/sign-contract/:token" component={SignContract} />
      <Route path="/complete-profile" component={CompleteProfile} />
      <Route path="/dashboard/profile" component={MyProfile} />
      <Route path="/dashboard/impersonate" component={ImpersonateClient} />
      <Route path="/dashboard/failed-payments" component={FailedPayments} />
      <Route path="/pending">{() => <PendingApproval status="pending" />}</Route>
      <Route path="/dashboard/colaboradores" component={Colaboradores} />
      <Route path="/dashboard/api-keys" component={ApiKeys} />
      <Route path="/dashboard/webhooks" component={Webhooks} />
      <Route path="/dashboard/precios" component={PricingAdmin} />
      <Route path="/dashboard/api-docs" component={ApiKeys} />
      <Route path="/dashboard/ai-support" component={AISupport} />
      <Route path="/dashboard/ai-marketing" component={AIMarketing} />
      <Route path="/dashboard/system-status" component={SystemStatus} />
      <Route path="/login" component={LoginEmail} />
      <Route path="/register" component={RegisterEmail} />
      <Route path="/register-associate" component={RegisterAssociate} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={Blog} />
      <Route path="/legal" component={Legal} />
      <Route path="/terminos" component={Legal} />
      <Route path="/privacidad" component={Legal} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <ImpersonationBar />
          <Toaster />
          <Router />
          <KobraBotWrapper />
          <OnboardingWrapper />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
