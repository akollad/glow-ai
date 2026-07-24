import { Link, useLocation } from "wouter"
import { Home, Scan, History, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const [location] = useLocation()
  
  const navItems = [
    { icon: Home, label: "Accueil", path: "/dashboard" },
    { icon: Scan, label: "Scan", path: "/scan" },
    { icon: History, label: "Historique", path: "/history" },
    { icon: CreditCard, label: "Crédits", path: "/payment" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 px-4 pointer-events-none">
      <div className="bg-card shadow-lg border border-border/40 rounded-full px-6 py-3 flex items-center justify-between gap-8 max-w-md w-full pointer-events-auto">
        {navItems.map((item) => {
          const isActive = location === item.path || (location.startsWith("/scan") && item.path === "/scan")
          const Icon = item.icon
          
          return (
            <Link key={item.path} href={item.path} className="flex flex-col items-center gap-1 group">
              <div className={cn(
                "p-2 rounded-full transition-all duration-300",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
              )}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
