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
      <Route path="/dashboard/settings" component={Settings} />
      <Route path="/dashboard/widget" component={Widget} />
      <Route path="/dashboard/recurring" component={Recurring} />
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
