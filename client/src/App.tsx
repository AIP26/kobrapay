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
import Clients from "./pages/Clients";
import Widget from "./pages/Widget";
import Recurring from "./pages/Recurring";
import Chargebacks from "./pages/Chargebacks";
import Invoices from "./pages/Invoices";
import Reader from "./pages/Reader";
import SecurityAudit from "./pages/SecurityAudit";
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
      <Route path="/dashboard/payers" component={Payers} />
      <Route path="/dashboard/staff" component={Staff} />
      <Route path="/dashboard/catalog" component={Catalog} />
      <Route path="/dashboard/pos" component={POS} />
      <Route path="/dashboard/registrations" component={Registrations} />
      <Route path="/dashboard/contracts" component={Contracts} />
      <Route path="/dashboard/agents" component={SalesAgents} />
      <Route path="/dashboard/expedientes" component={Expedientes} />
      <Route path="/dashboard/commissions" component={CommissionsPanel} />
      <Route path="/sign-contract/:token" component={SignContract} />
      <Route path="/complete-profile" component={CompleteProfile} />
      <Route path="/dashboard/profile" component={MyProfile} />
      <Route path="/pending">{() => <PendingApproval status="pending" />}</Route>
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
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
