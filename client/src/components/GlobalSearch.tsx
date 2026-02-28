import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Search, X, CreditCard, Link2, Users, LayoutDashboard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ResultItem = {
  type: "transaction" | "link" | "customer" | "page";
  id: number;
  title: string;
  subtitle: string;
  amount: number | string;
  currency: string;
  status: string;
  href: string;
};

function formatCurrency(amount: number | string, currency: string) {
  if (!amount || !currency) return "";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency || "MXN",
    minimumFractionDigits: 0,
  }).format(Number(amount));
}

const STATUS_COLORS: Record<string, string> = {
  succeeded: "text-emerald-400",
  paid: "text-emerald-400",
  failed: "text-red-400",
  pending: "text-yellow-400",
  active: "text-emerald-400",
};

const TYPE_ICONS = {
  transaction: CreditCard,
  link: Link2,
  customer: Users,
  page: LayoutDashboard,
};

const TYPE_LABELS = {
  transaction: "Venta",
  link: "Enlace",
  customer: "Pagador",
  page: "Página",
};

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce the query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    } else {
      setDebouncedQuery("");
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const { data, isFetching } = trpc.search.global.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  const allResults: ResultItem[] = [
    ...(data?.pages || []),
    ...(data?.transactions || []),
    ...(data?.links || []),
    ...(data?.customers || []),
  ];

  const hasResults = allResults.length > 0;

  const handleSelect = useCallback((href: string) => {
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
    navigate(href);
  }, [navigate]);

  const handleClear = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    inputRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      {/* Search Input */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
        open
          ? "bg-white/10 border-emerald-500/50 ring-1 ring-emerald-500/30"
          : "bg-white/5 border-white/10 hover:border-white/20"
      )}>
        {isFetching ? (
          <Loader2 className="w-4 h-4 text-gray-400 flex-shrink-0 animate-spin" />
        ) : (
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar ventas, clientes, páginas..."
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none min-w-0"
        />
        {query ? (
          <button onClick={handleClear} className="text-gray-500 hover:text-gray-300 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-gray-500 border border-white/10 bg-white/5 flex-shrink-0">
            ⌘K
          </kbd>
        )}
      </div>

      {/* Results Dropdown */}
      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-[200] rounded-xl border border-white/10 shadow-2xl overflow-hidden"
          style={{ background: "#1e2435" }}>
          {!hasResults && !isFetching ? (
            <div className="px-4 py-6 text-center">
              <Search className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Sin resultados para <span className="text-white font-medium">"{query}"</span></p>
            </div>
          ) : (
            <div className="py-1 max-h-[400px] overflow-y-auto">
              {/* Pages */}
              {(data?.pages || []).length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Páginas</p>
                  {(data?.pages || []).map((item, i) => {
                    const Icon = TYPE_ICONS[item.type];
                    return (
                      <button key={`page-${i}`} onClick={() => handleSelect(item.href)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{item.title}</p>
                          <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                        </div>
                        <span className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded flex-shrink-0">
                          {TYPE_LABELS[item.type]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Transactions */}
              {(data?.transactions || []).length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Ventas</p>
                  {(data?.transactions || []).map((item, i) => {
                    const Icon = TYPE_ICONS[item.type];
                    return (
                      <button key={`tx-${i}`} onClick={() => handleSelect(item.href)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                          item.status === "succeeded" ? "bg-emerald-500/20" : item.status === "failed" ? "bg-red-500/20" : "bg-yellow-500/20"
                        )}>
                          <Icon className={cn("w-3.5 h-3.5",
                            item.status === "succeeded" ? "text-emerald-400" : item.status === "failed" ? "text-red-400" : "text-yellow-400"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{item.title}</p>
                          <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn("text-xs font-semibold", STATUS_COLORS[item.status] || "text-gray-400")}>
                            {formatCurrency(item.amount, item.currency)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Links */}
              {(data?.links || []).length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Links de Pago</p>
                  {(data?.links || []).map((item, i) => {
                    const Icon = TYPE_ICONS[item.type];
                    return (
                      <button key={`link-${i}`} onClick={() => handleSelect(item.href)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{item.title}</p>
                          <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-semibold text-cyan-400">
                            {formatCurrency(item.amount, item.currency)}
                          </p>
                          <p className={cn("text-[10px]", STATUS_COLORS[item.status] || "text-gray-500")}>
                            {item.status === "paid" ? "Pagado" : item.status === "pending" ? "Pendiente" : item.status}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Customers */}
              {(data?.customers || []).length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Pagadores</p>
                  {(data?.customers || []).map((item, i) => {
                    const Icon = TYPE_ICONS[item.type];
                    return (
                      <button key={`cust-${i}`} onClick={() => handleSelect(item.href)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{item.title}</p>
                          <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                        </div>
                        {Number(item.amount) > 0 && (
                          <p className="text-xs font-semibold text-purple-400 flex-shrink-0">
                            {formatCurrency(item.amount, "MXN")}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Footer hint */}
              <div className="px-3 py-2 border-t border-white/5 flex items-center gap-2">
                <kbd className="text-[10px] text-gray-600 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">Esc</kbd>
                <span className="text-[10px] text-gray-600">para cerrar</span>
                <span className="text-[10px] text-gray-600 ml-auto">Enter para navegar</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
