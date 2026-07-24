import { useParams, Link } from "wouter"
import { useGetScan, useRunApparelVto } from "@workspace/api-client-react"
import { motion } from "framer-motion"
import { ArrowLeft, Sparkles, Droplets, Flame, Search, AlertCircle, Shirt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export default function ScanDetail() {
  const { scanId } = useParams()
  const { data: scan, isLoading } = useGetScan(Number(scanId), { 
    query: { 
      enabled: !!scanId, 
      queryKey: ["getScan", Number(scanId)] 
    } 
  })

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center bg-background p-6">
        <Skeleton className="w-full h-64 rounded-3xl mt-12 mb-8" />
        <Skeleton className="w-full h-24 rounded-3xl mb-4" />
        <Skeleton className="w-full h-40 rounded-3xl" />
      </div>
    )
  }

  if (!scan) {
    return <div className="p-6 text-center mt-20">Scan non trouvé</div>
  }

  const metrics = scan.skinMetrics
  const colors = scan.colorRecommendation

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-background noise-bg pb-24">
      <div className="w-full max-w-md flex flex-col">
        
        {/* Top Header */}
        <div className="flex items-center justify-between p-6 sticky top-0 bg-background/80 backdrop-blur-md z-20">
          <Button variant="ghost" size="icon" asChild className="rounded-full bg-card shadow-sm border border-border/50">
            <Link href="/dashboard"><ArrowLeft size={20} /></Link>
          </Button>
          <span className="font-serif text-lg">Résultats du Scan</span>
          <div className="w-10"></div>
        </div>

        <div className="px-6 space-y-6">
          
          {/* Main Score Hero */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-[2.5rem] p-8 flex flex-col items-center border border-border/50 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl -ml-10 -mb-10" />
            
            <p className="text-muted-foreground font-medium mb-4 relative z-10">Score Global</p>
            <div className="flex items-start justify-center relative z-10 mb-6">
              <span className="font-serif text-7xl leading-none text-primary">{metrics?.overallScore || 0}</span>
              <span className="text-2xl text-muted-foreground ml-1 mt-2">/100</span>
            </div>

            <div className="w-full bg-muted rounded-2xl p-4 flex gap-4 relative z-10">
              <div className="flex-1 text-center border-r border-border">
                <p className="text-xs text-muted-foreground mb-1">Sous-ton</p>
                <p className="font-semibold text-sm capitalize">{metrics?.undertone || "Chaud"}</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground mb-1">Type de peau</p>
                <p className="font-semibold text-sm capitalize">{metrics?.skinType || "Mixte"}</p>
              </div>
            </div>
          </motion.div>

          {/* AI Advice */}
          {scan.aiAdvice && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="text-primary" size={20} />
                    <h3 className="font-serif text-lg">Le mot de l'IA</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/80">{scan.aiAdvice}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Detailed Metrics */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h3 className="font-serif text-2xl px-2">Analyse Détaillée</h3>
            
            <MetricBar label="Hydratation" icon={<Droplets size={16}/>} score={metrics?.hydrationScore} color="bg-blue-500" />
            <MetricBar label="Éclat" icon={<Sparkles size={16}/>} score={metrics?.radianceScore} color="bg-yellow-500" />
            <MetricBar label="Acné" icon={<AlertCircle size={16}/>} score={metrics?.acneScore} color="bg-red-400" />
            <MetricBar label="Pores" icon={<Search size={16}/>} score={metrics?.poresScore} color="bg-primary" />
            <MetricBar label="Pigmentation" icon={<AlertCircle size={16}/>} score={metrics?.pigmentationScore} color="bg-purple-500" />
            
          </motion.div>

          {/* Color & Style Palette */}
          {colors && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4 pt-4"
            >
              <h3 className="font-serif text-2xl px-2">Votre Colorimétrie</h3>
              
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-4">Couleurs qui subliment votre teint :</p>
                  <div className="flex flex-wrap gap-3 mb-6">
                    {colors.recommendedColors.map((color, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div 
                          className="w-10 h-10 rounded-full border border-border shadow-inner" 
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    ))}
                  </div>

                  {colors.styleAdvice && (
                    <div className="bg-secondary/10 rounded-xl p-4 text-sm text-foreground/80 mb-6">
                      <span className="font-semibold block mb-1 text-secondary-foreground">Style & Coupe</span>
                      {colors.styleAdvice}
                    </div>
                  )}

                  <Button className="w-full rounded-full h-14" variant="default" asChild>
                    <Link href={`/tiktok/${scan.id}`}>
                      <Shirt className="mr-2" size={20} />
                      Générer mon TikTok
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  )
}

function MetricBar({ label, icon, score = 0, color }: { label: string, icon: React.ReactNode, score?: number, color: string }) {
  return (
    <Card className="border-border/50 shadow-none">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${color}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-sm">{label}</span>
            <span className="font-bold text-sm">{score}/100</span>
          </div>
          <Progress value={score} className="h-1.5" indicatorColor={color} />
        </div>
      </CardContent>
    </Card>
  )
}
