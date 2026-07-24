import { useGetMe, useGetMyStats } from "@workspace/api-client-react"
import { BottomNav } from "@/components/layout/BottomNav"
import { motion } from "framer-motion"
import { Sparkles, ArrowRight, Camera, CreditCard, Flame, Droplets, TrendingUp } from "lucide-react"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"

export default function Dashboard() {
  const { data: user, isLoading: loadingUser } = useGetMe()
  const { data: stats, isLoading: loadingStats } = useGetMyStats()

  const isLoading = loadingUser || loadingStats

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-background noise-bg pb-32">
      <div className="w-full max-w-md flex flex-col px-6 pt-12">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-1">Bonjour,</h2>
            <h1 className="font-serif text-3xl text-foreground capitalize">
              {isLoading ? <Skeleton className="h-8 w-32" /> : user?.displayName || "Beauté"}
            </h1>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden">
             <img src="/logo.svg" alt="Avatar" className="w-full h-full object-cover" />
          </div>
        </motion.div>

        {/* Main Score Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-br from-primary to-orange-600 text-primary-foreground border-0 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Sparkles size={100} />
            </div>
            <CardContent className="p-8 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-primary-foreground/80 font-medium mb-1">Score Peau Actuel</p>
                  {isLoading ? (
                    <Skeleton className="h-16 w-24 bg-white/20" />
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-6xl leading-none">{stats?.latestScore || "--"}</span>
                      <span className="text-xl text-primary-foreground/70">/100</span>
                    </div>
                  )}
                </div>
                {stats?.scoreChange && stats.scoreChange > 0 && (
                  <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <TrendingUp size={14} /> +{stats.scoreChange}
                  </div>
                )}
              </div>
              
              <Button asChild className="w-full bg-white text-primary hover:bg-white/90 rounded-full h-14 font-semibold text-lg border-0">
                <Link href="/scan">
                  <Camera className="mr-2" size={20} />
                  Faire un nouveau scan
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mini Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <Flame size={20} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Série</p>
                  <div className="font-serif text-xl">{isLoading ? <Skeleton className="h-6 w-8 mt-1" /> : `${stats?.streakWeeks || 0} sem.`}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Droplets size={20} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Hydratation</p>
                  <div className="font-serif text-xl">{isLoading ? <Skeleton className="h-6 w-8 mt-1" /> : `${stats?.hydrationTrend || "--"}%`}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Subscription / Credits Status */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-xl text-foreground">Abonnement</h3>
          </div>
          <Card className="border-border/50">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">
                    {user?.subscriptionStatus === 'active' ? 'Plan Premium' : 'Plan Gratuit'}
                  </span>
                  {user?.subscriptionStatus === 'active' && (
                    <span className="bg-secondary text-secondary-foreground text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Pro</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isLoading ? <Skeleton className="h-4 w-20" /> : `${user?.scanCredits || 0} crédits restants`}
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href="/payment">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Recharger
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

      </div>
      <BottomNav />
    </div>
  )
}
